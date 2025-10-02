import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import pkg from "pg";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import ws from "ws";
import * as schema from "../shared/schema.ts"; // relative path

const { Pool: PgPool } = pkg;

console.log("📌 DATABASE_URL:", process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check your .env file!");
}

// Detect if using local Postgres
const isLocalPostgres =
  process.env.DATABASE_URL.includes("postgresql://") &&
  !process.env.DATABASE_URL.includes("neon.tech");

console.log("📌 Is local Postgres?", isLocalPostgres);

let pool: any;
let db: any;

async function initDB() {
  if (isLocalPostgres) {
    console.log("📌 Using local PostgreSQL");

    const url = new URL(process.env.DATABASE_URL!);

    // Decode the password
    const password = decodeURIComponent(url.password);

    console.log("Decoded password:", password);

    console.log("📌 Parsed URL:", {
      host: url.hostname,
      port: url.port,
      database: url.pathname.slice(1),
      user: url.username,
      password,
    });

    pool = new PgPool({
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    db = drizzlePg({ client: pool, schema });

    try {
      const res = await pool.query("SELECT NOW()");
      console.log("✅ Local Postgres connected! Time:", res.rows[0]);
    } catch (err) {
      console.error("❌ Local Postgres connection failed:", err);
    }
  } else {
    console.log("📌 Using Neon serverless DB");

    neonConfig.webSocketConstructor = ws;

    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });

    try {
      const res = await pool.query("SELECT NOW()");
      console.log("✅ Neon DB connected! Time:", res.rows[0]);
    } catch (err) {
      console.error("❌ Neon DB connection failed:", err);
    }
  }
}

await initDB();

export { pool, db };
