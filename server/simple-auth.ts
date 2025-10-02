import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import bcrypt from "bcryptjs";
import { storage } from "./storage.ts";
import { setupActiveCampaignTest } from "./auth.ts";

const MemStoreSession = MemoryStore(session);

// Simple, secure session configuration
export const sessionConfig = session({
  store: new MemStoreSession({
    checkPeriod: 86400000, // prune expired entries every 24h
  }),
  secret: process.env.SESSION_SECRET || "fallback-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  name: "sessionId",
});

// Authentication middleware - simple and secure
export const requireAuth = async (req: any, res: any, next: any) => {
  const userId = req.session?.userId;
  console.log(
    `SIMPLE AUTH: Checking auth for session ${req.sessionID}, userId: ${userId}`
  );

  if (!userId) {
    console.log(`SIMPLE AUTH: No userId in session - authentication failed`);
    return res.status(401).json({ message: "Please log in to continue" });
  }

  try {
    const user = await storage.getUser(userId);
    if (!user) {
      console.log(`SIMPLE AUTH: User ${userId} not found in storage`);
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    console.log(`SIMPLE AUTH: Authentication successful for user ${userId}`);
    next();
  } catch (error) {
    console.error(`SIMPLE AUTH: Error checking user ${userId}:`, error);
    return res.status(401).json({ message: "Authentication error" });
  }
};

// Register routes with simple auth
export function setupSimpleAuth(app: express.Application) {
  console.log("SIMPLE AUTH: Setting up authentication routes");

  // Setup ActiveCampaign test endpoint
  setupActiveCampaignTest(app);

  // Login endpoint
  app.post("/api/v2/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log(`SIMPLE AUTH: Login attempt for email: ${email}`);

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      const user = await storage.verifyPassword(email, password);
      if (!user) {
        console.log(`SIMPLE AUTH: Invalid credentials for ${email}`);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Create new session
      req.session.userId = user.id;
      req.session.save((err: any) => {
        if (err) {
          console.error(`SIMPLE AUTH: Session save error:`, err);
          return res.status(500).json({ message: "Session creation failed" });
        }

        console.log(
          `SIMPLE AUTH: Login successful for user ${user.id}, session: ${req.sessionID}`
        );
        res.json({
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            businessType: user.businessType,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionEndDate: user.subscriptionEndDate,
          },
        });
      });
    } catch (error) {
      console.error("SIMPLE AUTH: Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Register endpoint (legacy)
  // app.post('/api/auth/register', async (req, res) => {
  //   try {
  //     const { email, password, name, businessType, promoCode } = req.body;
  //     console.log(`SIMPLE AUTH: Registration attempt for email: ${email}`);

  //     if (!email || !password || !name || !businessType) {
  //       return res.status(400).json({ message: 'All fields are required' });
  //     }

  //     // Check if user already exists
  //     const existingUser = await storage.getUserByEmail(email);
  //     if (existingUser) {
  //       return res.status(400).json({ message: 'User already exists with this email' });
  //     }

  //     console.log(existingUser , "existingUser")

  //     // Create new user
  //     const newUser = await storage.createUser({
  //       email,
  //       password,
  //       name,
  //       businessType
  //     });

  //     // Set trial period subscription status
  //     await storage.updateSubscriptionStatus(newUser.id, 'trial');

  //     // Create session
  //     req.session.userId = newUser.id;
  //     req.session.save((err: any) => {
  //       if (err) {
  //         console.error(`SIMPLE AUTH: Session save error:`, err);
  //         return res.status(500).json({ message: 'Session creation failed' });
  //       }

  //       console.log(`SIMPLE AUTH: Registration successful for user ${newUser.id}, session: ${req.sessionID}`);
  //       res.status(201).json({
  //         id: newUser.id,
  //         email: newUser.email,
  //         name: newUser.name,
  //         businessType: newUser.businessType,
  //         subscriptionStatus: 'trial',
  //         subscriptionEndDate: newUser.subscriptionEndDate
  //       });
  //     });
  //   } catch (error) {
  //     console.error('SIMPLE AUTH: Registration error:', error);
  //     res.status(500).json({ message: 'Registration failed' });
  //   }
  // });

  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log("📌 /api/auth/register called");

      const { email, password, name, businessType, promoCode } = req.body;
      console.log("📌 Received body:", { email, name, businessType });

      if (!email || !password || !name || !businessType) {
        console.log("❌ Missing required fields");
        return res.status(400).json({ message: "All fields are required" });
      }

      console.log("📌 Connecting to DB...");
      const existingUser = await storage.getUserByEmail(email);
      console.log("📌 DB returned existing user:", existingUser);

      if (existingUser) {
        console.log("❌ User already exists");
        return res
          .status(400)
          .json({ message: "User already exists with this email" });
      }

      console.log("📌 Creating new user...");
      const newUser = await storage.createUser({
        email,
        password,
        name,
        businessType,
      });
      console.log("📌 New user created:", newUser);

      console.log("📌 Updating subscription status...");
      await storage.updateSubscriptionStatus(newUser.id, "trial");

      console.log("📌 Creating session...");
      req.session.userId = newUser.id;
      req.session.save((err: any) => {
        if (err) {
          console.error("❌ Session save error:", err);
          return res.status(500).json({ message: "Session creation failed" });
        }

        console.log(`✅ Registration successful, sessionID: ${req.sessionID}`);
        res.status(201).json({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          businessType: newUser.businessType,
          subscriptionStatus: "trial",
          subscriptionEndDate: newUser.subscriptionEndDate,
        });
      });
    } catch (error: unknown) {
      console.error("❌ Registration error:", error);

      // Check if error is an object with 'code'
      if (typeof error === "object" && error !== null && "code" in error) {
        const errObj = error as { code: string };
        if (errObj.code === "28P01") {
          console.error(
            "❌ Postgres authentication failed for user 'postgres'. Check DATABASE_URL and password."
          );
        }
      }

      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Register endpoint (v2)
  app.post("/api/v2/auth/register", async (req, res) => {
    try {
      const { email, password, name, businessType, promoCode } = req.body;
      console.log(`SIMPLE AUTH: Registration attempt for email: ${email}`);

      if (!email || !password || !name || !businessType) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "User already exists with this email" });
      }

      // Create new user
      const newUser = await storage.createUser({
        email,
        password,
        name,
        businessType,
      });

      // Create session
      req.session.userId = newUser.id;
      req.session.save((err: any) => {
        if (err) {
          console.error(`SIMPLE AUTH: Session save error:`, err);
          return res.status(500).json({ message: "Session creation failed" });
        }

        console.log(
          `SIMPLE AUTH: Registration successful for user ${newUser.id}, session: ${req.sessionID}`
        );
        res.json({
          message: "Registration successful",
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            businessType: newUser.businessType,
            subscriptionStatus: newUser.subscriptionStatus,
            subscriptionEndDate: newUser.subscriptionEndDate,
          },
        });
      });
    } catch (error) {
      console.error("SIMPLE AUTH: Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Get current user
  app.get("/api/v2/auth/user", requireAuth, async (req: any, res) => {
    try {
      console.log(`SIMPLE AUTH: Getting user data for user ${req.user.id}`);
      res.json({
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        businessType: req.user.businessType,
        subscriptionStatus: req.user.subscriptionStatus,
        subscriptionEndDate: req.user.subscriptionEndDate,
      });
    } catch (error) {
      console.error("SIMPLE AUTH: Get user error:", error);
      res.status(500).json({ message: "Failed to get user data" });
    }
  });
 
  // Logout endpoint
  app.post("/api/v2/auth/logout", (req: any, res) => {
    const sessionId = req.sessionID;
    const userId = req.session?.userId;

    req.session.destroy((err: any) => {
      if (err) {
        console.error(
          `SIMPLE AUTH: Logout error for session ${sessionId}:`,
          err
        );
        return res.status(500).json({ message: "Logout failed" });
      }

      console.log(
        `SIMPLE AUTH: Logout successful for user ${userId}, session ${sessionId} destroyed`
      );
      res.clearCookie("sessionId");
      res.json({ message: "Logout successful" });
    });
  });

  // Admin authentication middleware
  const requireAdmin = async (req: any, res: any, next: any) => {
    const adminPassword = req.headers["x-admin-password"];
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin123"; // Default for development

    if (adminPassword !== expectedPassword) {
      return res.status(401).json({ message: "Admin access required" });
    }
    next();
  };

  // Admin endpoints for user management
  app.get("/api/admin/users", requireAdmin, async (req: any, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const search = req.query.search || "";

      const users = await storage.getAllUsers();

      // Filter users by search term
      let filteredUsers = users;
      if (search) {
        filteredUsers = users.filter(
          (user) =>
            user.email.toLowerCase().includes(search.toLowerCase()) ||
            user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.businessType.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Paginate results
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

      res.json({
        users: paginatedUsers,
        total: filteredUsers.length,
        page,
        totalPages: Math.ceil(filteredUsers.length / limit),
      });
    } catch (error) {
      console.error("Admin get users error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  // Get user statistics
  app.get("/api/admin/stats", requireAdmin, async (req: any, res) => {
    interface User {
      id: number;
      email: string;
      name: string;
      subscriptionStatus: "active" | "trial" | "inactive" | "free";
      createdAt: string; // or Date if you convert it
      businessType: string;
    }
    try {
      const users: User[] = await storage.getAllUsers();

      const stats = {
        totalUsers: users.length,
        activeSubscriptions: users.filter(
          (u: User) => u.subscriptionStatus === "active"
        ).length,
        trialUsers: users.filter((u: User) => u.subscriptionStatus === "trial")
          .length,
        inactiveUsers: users.filter(
          (u: User) => u.subscriptionStatus === "inactive"
        ).length,
        freeUsers: users.filter((u: User) => u.subscriptionStatus === "free")
          .length,
        recentUsers: users.filter((u: User) => {
          const createdAt = new Date(u.createdAt || 0);
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return createdAt > weekAgo;
        }).length,
        businessTypes: users.reduce(
          (acc: Record<string, number>, user: User) => {
            acc[user.businessType] = (acc[user.businessType] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      };

      res.json(stats);
    } catch (error) {
      console.error("Admin get stats error:", error);
      res.status(500).json({ message: "Failed to get statistics" });
    }
  });

  // Update user subscription status (for support)
  app.put(
    "/api/admin/users/:userId/subscription",
    requireAdmin,
    async (req: any, res) => {
      try {
        const { userId } = req.params;
        const { status, endDate } = req.body;

        await storage.updateSubscriptionStatus(parseInt(userId), status);
        if (endDate) {
          await storage.updateSubscriptionEndDate(
            parseInt(userId),
            new Date(endDate)
          );
        }

        const updatedUser = await storage.getUser(parseInt(userId));
        res.json({ user: updatedUser });
      } catch (error) {
        console.error("Admin update user error:", error);
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  );

  // Get individual user details
  app.get("/api/admin/users/:userId", requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(parseInt(userId));

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user });
    } catch (error) {
      console.error("Admin get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Delete user (admin only)
  app.delete(
    "/api/admin/users/:userId",
    requireAdmin,
    async (req: any, res) => {
      try {
        const { userId } = req.params;

        // Check if user exists first
        const user = await storage.getUser(parseInt(userId));
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Delete the user (this will cascade delete all related data in database)
        const success = await storage.deleteUser(parseInt(userId));

        if (!success) {
          return res.status(500).json({ message: "Failed to delete user" });
        }

        res.json({ message: "User deleted successfully" });
      } catch (error) {
        console.error("Admin delete user error:", error);
        res.status(500).json({ message: "Failed to delete user" });
      }
    }
  );
}
