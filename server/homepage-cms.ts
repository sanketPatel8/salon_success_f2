import { desc } from "drizzle-orm";
import type { Express } from "express";
import { homepageCmsContent } from "../shared/schema.js";
import {
  buildDefaultHomepageCmsContent,
  homepageCmsInputSchema,
  type HomepageCmsInput,
} from "../shared/homepage-cms.js";
import { db } from "./db.js";

type HydratedHomepageCmsRecord = {
  id: number;
  content: HomepageCmsInput;
  createdAt: Date;
  updatedAt: Date;
};

let memoryHomepageCms: HydratedHomepageCmsRecord | null = null;

function isMissingHomepageCmsTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("homepage_cms_content") || message.includes("does not exist");
}

function getMemoryHomepageCms(): HydratedHomepageCmsRecord {
  if (!memoryHomepageCms) {
    const now = new Date();
    memoryHomepageCms = {
      id: 1,
      content: buildDefaultHomepageCmsContent(),
      createdAt: now,
      updatedAt: now,
    };
  }

  return memoryHomepageCms;
}

function hydrateHomepageCmsRecord(raw?: Partial<HydratedHomepageCmsRecord> | null) {
  const now = new Date();
  const parsed = homepageCmsInputSchema.safeParse(raw?.content);

  return {
    id: raw?.id ?? 1,
    content: parsed.success ? parsed.data : buildDefaultHomepageCmsContent(),
    createdAt: raw?.createdAt ? new Date(raw.createdAt) : now,
    updatedAt: raw?.updatedAt ? new Date(raw.updatedAt) : now,
  } satisfies HydratedHomepageCmsRecord;
}

async function getHomepageCms(): Promise<{
  record: HydratedHomepageCmsRecord;
  storageMode: "database" | "memory";
}> {
  try {
    const [existing] = await db
      .select()
      .from(homepageCmsContent)
      .orderBy(desc(homepageCmsContent.updatedAt))
      .limit(1);

    if (existing) {
      return {
        record: hydrateHomepageCmsRecord(existing),
        storageMode: "database",
      };
    }

    const now = new Date();
    const defaults = {
      content: buildDefaultHomepageCmsContent(),
      createdAt: now,
      updatedAt: now,
    };
    const [created] = await db.insert(homepageCmsContent).values(defaults).returning();
    return {
      record: hydrateHomepageCmsRecord(created),
      storageMode: "database",
    };
  } catch (error) {
    if (!isMissingHomepageCmsTable(error)) {
      console.error("Homepage CMS: failed to load content:", error);
    }

    return { record: getMemoryHomepageCms(), storageMode: "memory" };
  }
}

async function saveHomepageCms(
  content: HomepageCmsInput,
): Promise<{
  record: HydratedHomepageCmsRecord;
  storageMode: "database" | "memory";
}> {
  const current = await getHomepageCms();
  const next = hydrateHomepageCmsRecord({
    ...current.record,
    content,
    updatedAt: new Date(),
  });

  try {
    const [saved] = await db
      .insert(homepageCmsContent)
      .values({
        id: next.id,
        content: next.content,
        createdAt: next.createdAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: homepageCmsContent.id,
        set: {
          content: next.content,
          updatedAt: new Date(),
        },
      })
      .returning();

    return {
      record: hydrateHomepageCmsRecord(saved),
      storageMode: "database",
    };
  } catch (error) {
    if (!isMissingHomepageCmsTable(error)) {
      console.error("Homepage CMS: failed to save content:", error);
    }

    memoryHomepageCms = next;
    return { record: next, storageMode: "memory" };
  }
}

export function registerHomepageCmsRoutes(app: Express) {
  const requireAdmin = async (req: any, res: any, next: any) => {
    const adminPassword = req.headers["x-admin-password"];
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (adminPassword !== expectedPassword) {
      return res.status(401).json({ message: "Admin access required" });
    }

    return next();
  };

  app.get("/api/homepage-content", async (_req, res) => {
    try {
      const { record, storageMode } = await getHomepageCms();
      res.json({
        content: record.content,
        storageMode,
      });
    } catch (error) {
      console.error("Homepage CMS: failed to return public content:", error);
      res.status(500).json({ message: "Failed to load homepage content" });
    }
  });

  app.get("/api/admin/homepage-content", requireAdmin, async (_req, res) => {
    try {
      const { record, storageMode } = await getHomepageCms();
      res.json({
        content: record.content,
        storageMode,
        updatedAt: record.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("Homepage CMS: failed to load admin content:", error);
      res.status(500).json({ message: "Failed to load homepage content" });
    }
  });

  app.put("/api/admin/homepage-content", requireAdmin, async (req, res) => {
    try {
      const parsed = homepageCmsInputSchema.parse(req.body);
      const { record, storageMode } = await saveHomepageCms(parsed);
      res.json({
        content: record.content,
        storageMode,
        updatedAt: record.updatedAt.toISOString(),
      });
    } catch (error: any) {
      console.error("Homepage CMS: failed to save content:", error);
      res.status(400).json({
        message: error?.message || "Failed to save homepage content",
      });
    }
  });
}
