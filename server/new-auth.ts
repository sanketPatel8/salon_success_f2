import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "./storage";
import { activeCampaign } from "./activecampaign";
import { insertUserSchema, loginSchema } from "@shared/schema";
import { z } from "zod";

const pgStore = connectPg(session);

export function setupNewSession(app: express.Application) {
  app.use(session({
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: 'user_sessions',
    }),
    secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    name: 'salon_growth_sid',
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
    },
    genid: function(req) {
      return require('crypto').randomBytes(32).toString('hex');
    },
  }));
}

export function newRequireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  console.log('NEW AUTH CHECK - Session:', req.sessionID, 'User ID:', req.session?.userId);
  
  if (!req.session?.userId) {
    console.log('Authentication failed - no userId in session');
    return res.status(401).json({ message: "Please log in to continue" });
  }
  
  console.log('Authentication successful for user:', req.session.userId);
  next();
}

export async function newRequireActiveSubscription(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Please log in to continue" });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check subscription status
    if (user.subscriptionStatus === 'active') {
      return next();
    }

    // Check for free access with valid end date
    if (user.subscriptionStatus === 'free_access' && user.subscriptionEndDate) {
      if (new Date() <= new Date(user.subscriptionEndDate)) {
        return next();
      } else {
        await storage.updateSubscriptionStatus(user.id, 'expired');
        return res.status(402).json({ 
          message: "Your free access has expired. Please subscribe to continue.",
          subscriptionRequired: true 
        });
      }
    }

    return res.status(402).json({ 
      message: "Please subscribe to access business tools.",
      subscriptionRequired: true 
    });

  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({ message: "Server error" });
  }
}

export function setupNewAuthRoutes(app: express.Application) {
  // Register new user
  app.post("/api/v2/auth/register", async (req, res) => {
    try {
      console.log('NEW REGISTRATION REQUEST:', req.body);
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const user = await storage.createUser(userData);
      await storage.updateSubscriptionStatus(user.id, 'inactive');
      
      // Create new session
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration failed:', err);
          return res.status(500).json({ message: "Registration failed" });
        }
        
        req.session.userId = user.id;
        console.log('NEW REGISTRATION SUCCESS - User:', user.id, 'Session:', req.sessionID);
        
        req.session.save((err) => {
          if (err) {
            console.error('Session save failed:', err);
            return res.status(500).json({ message: "Registration failed" });
          }
          
          console.log('Session saved successfully, sending response');
          
          // Send response immediately
          res.status(201).json({
            message: "Registration successful",
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              businessType: user.businessType,
              subscriptionStatus: 'inactive',
              subscriptionEndDate: null,
            }
          });
        });
      });
      
      // Send ActiveCampaign notification outside of session callbacks to avoid blocking
      setImmediate(async () => {
        try {
          console.log(`Sending ActiveCampaign notification for: ${user.email}`);
          await activeCampaign.sendNotificationEmail(
            user.email,
            user.name,
            user.businessType,
            false
          );
          console.log(`ActiveCampaign notification completed for: ${user.email}`);
        } catch (error) {
          console.error('ActiveCampaign notification failed:', error);
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login user
  app.post("/api/v2/auth/login", async (req, res) => {
    try {
      console.log('NEW LOGIN REQUEST:', req.body);
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.verifyPassword(email, password);
      console.log('Password verification:', user ? `User ${user.id} found` : 'Invalid credentials');
      
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Create fresh session
      req.session.regenerate((err) => {
        if (err) {
          console.error('Login session regeneration failed:', err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        req.session.userId = user.id;
        console.log('NEW LOGIN SUCCESS - User:', user.id, 'Session:', req.sessionID);
        
        req.session.save((err) => {
          if (err) {
            console.error('Login session save failed:', err);
            return res.status(500).json({ message: "Login failed" });
          }
          
          console.log('Login session saved successfully');
          res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            businessType: user.businessType,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionEndDate: user.subscriptionEndDate,
          });
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout user
  app.post("/api/v2/auth/logout", (req, res) => {
    console.log('LOGOUT REQUEST - User:', req.session?.userId, 'Session:', req.sessionID);
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout failed:', err);
        return res.status(500).json({ message: "Logout failed" });
      }
      
      res.clearCookie('salon_session');
      console.log('Logout successful');
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/v2/auth/user", newRequireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
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
      console.error('Get user error:', error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Password reset request
  app.post("/api/v2/auth/reset-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        return res.json({ message: "If that email exists, you'll receive reset instructions" });
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      // Store reset token (you'll need to add these fields to user schema)
      // await storage.setPasswordResetToken(user.id, resetToken, resetExpires);
      
      // For now, just return success (implement email sending later)
      console.log('Password reset requested for:', email, 'Token:', resetToken);
      res.json({ message: "If that email exists, you'll receive reset instructions" });
      
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });
}