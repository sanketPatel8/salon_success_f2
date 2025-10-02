import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { activeCampaign } from "./activecampaign";
import { sendDeveloperNotification } from "./sendgrid";
import { insertUserSchema, loginSchema } from "@shared/schema";
import { z } from "zod";

const pgStore = connectPg(session);

export function setupActiveCampaignTest(app: express.Application) {
  // Test endpoint for ActiveCampaign
  app.post("/api/test-activecampaign", async (req, res) => {
    try {
      console.log('🧪 Testing ActiveCampaign integration...');
      await activeCampaign.sendNotificationEmail(
        'test@example.com',
        'Test User',
        'Test Business',
        false
      );
      console.log('🧪 ActiveCampaign test SUCCESSFUL!');
      res.json({ success: true, message: 'ActiveCampaign test completed' });
    } catch (error) {
      console.error('🧪 ActiveCampaign test FAILED:', error);
      res.status(500).json({ error: error.message });
    }
  });
}

export function setupSession(app: express.Application) {
  app.use(session({
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    name: 'sessionId', // Explicit session name
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax', // Prevent cross-site issues
    },
  }));
}

export function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  console.log('requireAuth called - Session exists:', !!req.session, 'Session data:', req.session);
  if (!req.session?.userId) {
    console.log('No userId in session - rejecting');
    return res.status(401).json({ message: "Authentication required" });
  }
  console.log('requireAuth - User ID from session:', req.session.userId, 'Session ID:', req.sessionID);
  next();
}

export async function requireActiveSubscription(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check if user has active subscription
    if (user.subscriptionStatus === 'active') {
      return next();
    }

    // Check if user has free access (CLIENT6FREE code)
    if (user.subscriptionStatus === 'free_access' && user.subscriptionEndDate) {
      const now = new Date();
      const freeAccessEnd = new Date(user.subscriptionEndDate);
      
      if (now <= freeAccessEnd) {
        return next(); // Free access still active
      } else {
        // Free access expired, update status
        await storage.updateSubscriptionStatus(user.id, 'expired');
        return res.status(402).json({ 
          message: "Your 6-month free access has expired. Please subscribe to continue.",
          freeAccessExpired: true 
        });
      }
    }

    // No valid subscription - redirect to payment
    return res.status(402).json({ 
      message: "Please subscribe to access business tools.",
      subscriptionRequired: true 
    });

  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({ message: "Server error" });
  }
}

export function setupAuthRoutes(app: express.Application) {
  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      console.log(storage , "storage")
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);
      console.log('🔍 User created successfully, now updating subscription status...');
      
      // Set inactive status - users need to subscribe to access business tools
      try {
        await storage.updateSubscriptionStatus(user.id, 'inactive');
        console.log('🔍 Successfully updated subscription status, now starting ActiveCampaign...');
      } catch (error) {
        console.error('❌ Failed to update subscription status:', error);
        // Continue with ActiveCampaign integration anyway
      }
      
      // Send ActiveCampaign notification immediately after user creation
      console.log('🔍 About to start ActiveCampaign integration...');
      console.log(`✅ Starting ActiveCampaign integration for: ${user.email}`);
      try {
        console.log('🔍 Calling activeCampaign.sendNotificationEmail...');
        await activeCampaign.sendNotificationEmail(
          user.email,
          user.name,
          user.businessType,
          false
        );
        console.log(`✅ ActiveCampaign integration completed successfully for: ${user.email}`);
        
        console.log('🔍 Calling sendDeveloperNotification...');
        // Send developer notification
        await sendDeveloperNotification(
          user.email,
          user.name,
          user.businessType,
          'registration',
          'New user registered'
        );
        console.log(`✅ Developer notification sent for: ${user.email}`);
      } catch (error) {
        console.error('❌ ActiveCampaign integration failed:', error);
        // Don't fail registration if notification fails
      }
      
      // Regenerate session for new user
      req.session.regenerate(async (err) => {
        if (err) {
          console.error('Session regeneration error during registration:', err);
          return res.status(500).json({ message: "Registration failed" });
        }
        
        req.session.userId = user.id;
        console.log('Registration successful - User ID:', user.id, 'Session ID:', req.sessionID, 'Email:', user.email);
        
        req.session.save(async (err) => {
          if (err) {
            console.error('Session save error during registration:', err);
            return res.status(500).json({ message: "Registration failed" });
          }
          
          // Get updated user data with subscription status
          const updatedUser = await storage.getUser(user.id);
          if (!updatedUser) {
            return res.status(500).json({ message: "Failed to retrieve user data" });
          }
          
          res.status(201).json({
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            businessType: updatedUser.businessType,
            subscriptionStatus: updatedUser.subscriptionStatus,
            subscriptionEndDate: updatedUser.subscriptionEndDate,
          });
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Login user
  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log('Login attempt received:', req.body);
      const { email, password } = loginSchema.parse(req.body);
      console.log('Parsed credentials - Email:', email, 'Password length:', password.length);
      
      const user = await storage.verifyPassword(email, password);
      console.log('Password verification result:', user ? `User found: ${user.id}` : 'No user found');
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Store user ID directly in session
      req.session.userId = user.id;
      console.log('LOGIN SUCCESS - User ID:', user.id, 'Session ID:', req.sessionID, 'Email:', user.email);
      
      // Force session save and verify
      req.session.save((err) => {
        if (err) {
          console.error('Session save failed:', err);
          return res.status(500).json({ message: "Session save failed" });
        }
        
        console.log('Session saved - Verifying userId stored:', req.session.userId);
        
        // Verify session was saved correctly
        if (!req.session.userId) {
          console.error('CRITICAL: Session userId not stored after save!');
          return res.status(500).json({ message: "Session storage failed" });
        }
        
        res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          businessType: user.businessType,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionEndDate: user.subscriptionEndDate,
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout user
  app.post("/api/auth/logout", (req, res) => {
    console.log('Logout request - User ID:', req.session?.userId, 'Session ID:', req.sessionID);
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ message: "Could not log out" });
      }
      res.clearCookie('sessionId'); // Match the session name we set
      res.clearCookie('connect.sid'); // Clear default cookie too
      console.log('Logout successful - session destroyed');
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/user", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        businessType: user.businessType,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}