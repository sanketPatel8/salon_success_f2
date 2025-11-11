import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import bcrypt from "bcryptjs";
import nodemailer from 'nodemailer';
import { storage } from "./storage.ts";
import { setupActiveCampaignTest } from "./auth.ts";
import { activeCampaign } from "./activecampaign.ts";

const MemStoreSession = MemoryStore(session);

// Extend session data type
declare module 'express-session' {
  interface SessionData {
    createdAt?: number;
    userId?: number;
  }
}

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
    maxAge: 30 * 24 * 60 * 60 * 1000, 
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

  // Add session expiration check middleware AFTER session middleware
  app.use(sessionConfig);

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

    // Create new session with timestamp
    req.session.userId = user.id;
    req.session.createdAt = Date.now();
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
          currency: user.currency, // ADD THIS LINE
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

  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log("📌 /auth/register called");

      const { email, password, name, businessType, currency } = req.body;
      console.log("📌 Received body:", { email, name, businessType, currency });

      if (!email || !password || !name || !businessType || !currency) {
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
        currency,
      });
      console.log("📌 New user created:", newUser);

      console.log("📌 Updating subscription status...");
      await storage.updateSubscriptionStatus(newUser.id, "inactive");

      console.log("📌 Creating session...");
      req.session.userId = newUser.id;
      req.session.createdAt = Date.now();
      
      req.session.save(async (err: any) => {
        if (err) {
          console.error("❌ Session save error:", err);
          return res.status(500).json({ message: "Session creation failed" });
        }

        console.log(`✅ Registration successful, sessionID: ${req.sessionID}`);

        // Send notification email after successful registration
        try {
          console.log('🔍 Calling activeCampaign.sendNotificationEmail...');
          await activeCampaign.sendNotificationEmail(
            newUser.email,
            newUser.name,
            newUser.businessType,
            false
          );
          console.log(`✅ ActiveCampaign integration completed successfully for: ${newUser.email}`);
        } catch (emailError) {
          console.error("❌ Failed to send notification email:", emailError);
          // Don't fail the registration if email fails
        }

        const emailConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    };

    const transporter = nodemailer.createTransport(emailConfig);

    try {
      await transporter.verify();
      console.log('✓ SMTP connection verified for registration emails');
    } catch (verifyError) {
      console.error('✗ SMTP verification failed:', verifyError);
    }

    const userEmailOptions = {
      from: `"Salon Success Manager" <${emailConfig.auth.user}>`,
      to: email,
      subject: 'Welcome to Salon Success Manager! 🎉',
      html: `
        <!DOCTYPE html>
        <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <style>
            body { 
              margin: 0 !important;
              padding: 0 !important;
              -webkit-text-size-adjust: 100% !important;
              -ms-text-size-adjust: 100% !important;
            }
            table { border-collapse: collapse !important; }
            @media only screen and (max-width: 600px) {
              .content-padding { padding: 20px 15px !important; }
              .button-td { padding: 12px 30px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f5f5f5">
            <tr>
              <td align="center" style="padding: 20px 0;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="max-width: 600px; width: 100%;">
                  
                  <!-- Header -->
                  <tr>
                    <td align="center" style="padding: 40px 20px 20px; background-color: #fce7f3;">
                      <h1 style="margin: 0; color: #ff8f9f; font-size: 28px; font-weight: 700;">
                        🎉 Welcome to Salon Success Manager!
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Main content -->
                  <tr>
                    <td class="content-padding" style="padding: 40px 30px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding-bottom: 15px;">
                            <p style="margin: 0; font-size: 16px; color: #333333; line-height: 1.6;">
                              Hello <strong>${name}</strong>,
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 15px;">
                            <p style="margin: 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
                              Thank you for registering with Salon Success Manager! We're excited to help you grow your ${businessType} business.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 25px;">
                            <p style="margin: 0; font-size: 15px; color: #4b5563; line-height: 1.6;">
                              Your account has been successfully created with the following details:
                            </p>
                          </td>
                        </tr>
                        
                        <!-- Account details box -->
                        <tr>
                          <td style="padding: 20px 0;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9fafb" style="border-radius: 8px;">
                              <tr>
                                <td style="padding: 20px;">
                                  <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
                                    <strong>Email:</strong> ${email}
                                  </p>
                                  <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
                                    <strong>Business Type:</strong> ${businessType}
                                  </p>
                                  <p style="margin: 0; font-size: 14px; color: #6b7280;">
                                    <strong>Currency:</strong> ${currency}
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        
                        <!-- CTA Button -->
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <table border="0" cellspacing="0" cellpadding="0">
                              <tr>
                                <td align="center" bgcolor="#ff8f9f" style="border-radius: 8px;">
                                  <a href="https://salonsuccessmanager.com/help" target="_blank" style="display: inline-block; padding: 14px 40px; font-size: 16px; color: #ffffff; text-decoration: none; font-weight: 600;">
                                    Get Started Now
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        
                        <!-- What's next section -->
                        <tr>
                          <td style="padding-top: 25px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333; font-weight: 600;">
                              What's Next?
                            </p>
                            <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                              <li>Complete your subscription to unlock all features</li>
                              <li>Set up your staff and services</li>
                              <li>Manage your daily operations easily</li>
                              <li>Track your business growth</li>
                              <li>And many more...</li>
                            </ul>
                          </td>
                        </tr>
                        
                        <tr>
                          <td style="padding-top: 20px;">
                            <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                              If you have any questions, feel free to reach out to our support team.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding: 30px 20px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 5px 0; font-size: 13px; color: #6b7280;">
                        © ${new Date().getFullYear()} Salon Success Manager
                      </p>
                      <p style="margin: 5px 0 0 0; font-size: 13px; color: #6b7280;">
                        Need help? Contact us at 
                        <a href="mailto:help@salonsuccessmanager.com" style="color: #ec4899; text-decoration: none;">help@salonsuccessmanager.com</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Welcome to Salon Success Manager!

Hello ${name},

Thank you for registering with Salon Success Manager! We're excited to help you grow your ${businessType} business.

Your account details:
- Email: ${email}
- Business Type: ${businessType}
- Currency: ${currency}

What's Next?
• Complete your subscription to unlock all features
• Set up your staff and services
• Start booking appointments
• Track your business growth

Get started: https://salonsuccessmanager.com/help

If you have any questions, feel free to reach out to our support team.

© ${new Date().getFullYear()} Salon Success Manager
Need help? Contact us at help@salonsuccessmanager.com
      `
    };

    const adminEmailOptions = {
      from: `"Salon Success Manager" <${emailConfig.auth.user}>`,
      to: 'help@salonsuccessmanager.com',
      subject: '🎉 New User Registration - Salon Success Manager',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
            }
            .header {
              background-color: #10b981;
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .content {
              padding: 30px;
            }
            .info-box {
              background-color: #f9fafb;
              border-left: 4px solid #10b981;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info-row {
              margin: 8px 0;
              font-size: 14px;
              color: #4b5563;
            }
            .label {
              font-weight: 600;
              color: #1f2937;
            }
            .footer {
              background-color: #f9fafb;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">🎉 New User Registration</h1>
            </div>
            
            <div class="content">
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #333333;">
                A new user has registered on Salon Success Manager!
              </p>
              
              <div class="info-box">
                <div class="info-row">
                  <span class="label">Name:</span> ${name}
                </div>
                <div class="info-row">
                  <span class="label">Email:</span> ${email}
                </div>
                <div class="info-row">
                  <span class="label">Business Type:</span> ${businessType}
                </div>
                <div class="info-row">
                  <span class="label">Currency:</span> ${currency}
                </div>
                <div class="info-row">
                  <span class="label">Registration Date:</span> ${new Date().toLocaleString()}
                </div>
              </div>
              
              <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
                The user will be redirected to complete their subscription.
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0;">
                This is an automated notification from Salon Success Manager
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
New User Registration - Salon Success Manager

A new user has registered!

User Details:
- Name: ${name}
- Email: ${email}
- Business Type: ${businessType}
- Currency: ${currency}
- Registration Date: ${new Date().toLocaleString()}

This is an automated notification from Salon Success Manager.
      `
    };

    Promise.all([
      transporter.sendMail(userEmailOptions).then(info => {
        console.log('✓ Welcome email sent to user:', email);
      }).catch(err => {
        console.error('✗ Failed to send welcome email to user:', err.message);
      }),
      transporter.sendMail(adminEmailOptions).then(info => {
        console.log('✓ Registration notification sent to admin');
      }).catch(err => {
        console.error('✗ Failed to send notification to admin:', err.message);
      })
    ]);
                
        res.status(201).json({
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          businessType: newUser.businessType,
          subscriptionStatus: "inactive",
          subscriptionEndDate: newUser.subscriptionEndDate,
        });
      });
    } catch (error: unknown) {
      console.error("❌ Registration error:", error);

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
    const { email, password, name, businessType, currency } = req.body; // Add currency here
    console.log(`SIMPLE AUTH: Registration attempt for email: ${email}`);

    if (!email || !password || !name || !businessType) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    const newUser = await storage.createUser({
      email,
      password,
      name,
      businessType,
      currency: currency || "USD", // Add currency with default
    });

    req.session.userId = newUser.id;
    req.session.createdAt = Date.now();
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
          currency: newUser.currency, // ADD THIS LINE
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
      currency: req.user.currency, // ADD THIS LINE
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
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";

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

      let filteredUsers = users;
      if (search) {
        filteredUsers = users.filter(
          (user) =>
            user.email.toLowerCase().includes(search.toLowerCase()) ||
            user.name.toLowerCase().includes(search.toLowerCase()) ||
            user.businessType.toLowerCase().includes(search.toLowerCase())
        );
      }

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

  app.get("/api/admin/stats", requireAdmin, async (req: any, res) => {
    interface User {
      id: number;
      email: string;
      name: string;
      subscriptionStatus: "active" | "trialing" | "inactive" | "free_access";
      createdAt: string;
      businessType: string;
      currency: string;
    }
    try {
      const users: User[] = await storage.getAllUsers();

      const stats = {
        totalUsers: users.length,
        activeSubscriptions: users.filter(
          (u: User) => u.subscriptionStatus === "active"
        ).length,
        trialUsers: users.filter((u: User) => u.subscriptionStatus === "trialing")
          .length,
        inactiveUsers: users.filter(
          (u: User) => u.subscriptionStatus === "inactive"
        ).length,
        freeUsers: users.filter((u: User) => u.subscriptionStatus === "free_access")
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

  app.post("/api/auth/verify-registration", async (req, res) => {
  try {
    const { token } = req.body;
    console.log("🔍 /api/auth/verify-registration called with token:", token?.substring(0, 20) + "...");

    if (!token) {
      console.log("❌ No token provided");
      return res.status(400).json({ 
        success: false, 
        message: "Token is required" 
      });
    }

    // Validate token format (timestamp-random)
    const tokenParts = token.split('-');
    if (tokenParts.length < 2) {
      console.log("❌ Invalid token format");
      return res.status(400).json({ 
        success: false, 
        message: "Invalid token format" 
      });
    }

    const timestamp = parseInt(tokenParts[0]);
    
    // Check if token timestamp is valid (not older than 24 hours)
    const currentTime = Date.now();
    const tokenAge = currentTime - timestamp;
    const maxTokenAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (isNaN(timestamp)) {
      console.log("❌ Invalid timestamp in token");
      return res.status(400).json({ 
        success: false, 
        message: "Invalid token" 
      });
    }

    if (tokenAge > maxTokenAge) {
      console.log(`❌ Token expired: ${tokenAge}ms old (max: ${maxTokenAge}ms)`);
      return res.status(400).json({ 
        success: false, 
        message: "Token has expired. Please register again.",
        expired: true
      });
    }

    // Token is valid
    console.log(`✅ Token verified successfully. Age: ${tokenAge}ms`);
    res.json({ 
      success: true, 
      message: "Registration verified successfully" 
    });

  } catch (error) {
    console.error("❌ Token verification error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Token verification failed" 
    });
  }
});

  app.delete(
    "/api/admin/users/:userId",
    requireAdmin,
    async (req: any, res) => {
      try {
        const { userId } = req.params;

        const user = await storage.getUser(parseInt(userId));
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

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