import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { activeCampaign } from "./activecampaign";
import { TrialManager } from "./trial-manager";
import { requireAuth } from "./simple-auth";
import { sendDeveloperNotification } from "./sendgrid";
import { 
  insertHourlyRateCalculationSchema, 
  insertTreatmentSchema, 
  insertExpenseSchema,
  insertBusinessSchema,
  insertWeeklyIncomeSchema,
  insertIncomeGoalSchema,
  insertStockPurchaseSchema,
  insertMoneyPotSchema
} from "@shared/schema";
import { z } from "zod";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-05-28.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Remove old auth setup completely
  // setupSession(app);
  // setupAuthRoutes(app);

  // Password reset request
  app.post("/api/v2/auth/reset-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ message: "If that email exists, you'll receive reset instructions" });
      }
      
      // Generate reset token
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      // Store reset token in database
      await storage.setPasswordResetToken(user.id, resetToken, resetExpires);
      
      // Send automated password reset email via Gmail
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      // Ionos email configuration
      const gmailConfig = {
        email: process.env.GMAIL_EMAIL || 'Info@kgbusinessmentor.com', // Your Ionos email address
        password: process.env.GMAIL_PASSWORD || 'Katielola15!' // Your Ionos email password
      };
      
      // Log reset request for monitoring
      console.log(`✓ Password reset requested for: ${email}`);
      
      // Return reset link directly for immediate use
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
      res.json({ 
        message: "Password reset link generated", 
        resetLink: resetUrl,
        expires: resetExpires.toISOString()
      });
      
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  // Handle password reset form submission
  app.post("/api/v2/auth/confirm-reset", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      // Update password
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password and clear reset token
      await storage.updatePassword(user.id, hashedPassword);
      await storage.clearPasswordResetToken(user.id);
      
      console.log(`✓ Password successfully reset for user: ${user.email}`);
      res.json({ message: "Password reset successful" });
      
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  // Force redirect all auth requests to new v2 system
  app.get("/api/auth/user", (req, res) => {
    res.redirect(301, "/api/v2/auth/user");
  });

  app.post("/api/auth/login", (req, res) => {
    res.redirect(307, "/api/v2/auth/login");
  });

  app.post("/api/auth/logout", (req, res) => {
    res.redirect(307, "/api/v2/auth/logout");
  });

  // Test endpoint to verify trial enforcement without session auth
  app.get("/api/test-trial-enforcement", async (req, res) => {
    try {
      const user = await storage.getUser(1); // Demo user
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has active subscription
      if (user.subscriptionStatus === 'active') {
        return res.json({ 
          status: 'allowed', 
          reason: 'Active subscription',
          subscriptionStatus: user.subscriptionStatus,
          subscriptionEndDate: user.subscriptionEndDate
        });
      }

      // Check if user has free access
      if (user.subscriptionStatus === 'free_access') {
        return res.json({ 
          status: 'allowed', 
          reason: 'Free access (CLIENT6FREE)',
          subscriptionStatus: user.subscriptionStatus 
        });
      }

      // Check if trial is still active
      if (user.subscriptionStatus === 'trial' && user.subscriptionEndDate) {
        const now = new Date();
        const trialEnd = new Date(user.subscriptionEndDate);
        
        if (now <= trialEnd) {
          const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return res.json({ 
            status: 'allowed', 
            reason: 'Trial still active',
            subscriptionStatus: user.subscriptionStatus,
            daysLeft: daysLeft,
            trialEnd: trialEnd
          });
        } else {
          // Trial expired
          await storage.updateSubscriptionStatus(user.id, 'expired');
          return res.status(402).json({ 
            status: 'blocked',
            reason: "Trial period has expired. Please subscribe to continue.",
            trialExpired: true,
            subscriptionStatus: 'expired'
          });
        }
      }

      // No valid subscription or trial
      return res.status(402).json({ 
        status: 'blocked',
        reason: "Subscription required to access this feature.",
        subscriptionRequired: true,
        subscriptionStatus: user.subscriptionStatus || 'none'
      });

    } catch (error) {
      console.error('Trial enforcement test error:', error);
      return res.status(500).json({ message: "Server error", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Apply promo code endpoint
  app.post('/api/apply-promo-code', requireAuth, async (req, res) => {
    try {
      const { code } = req.body;
      const userId = req.session.userId!;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'Please enter a valid promo code.' 
        });
      }
      
      // Check for CLIENT6FREE promo code
      if (code.toUpperCase() === 'CLIENT6FREE') {
        // Grant 6 months free access
        const sixMonthsEndDate = new Date();
        sixMonthsEndDate.setMonth(sixMonthsEndDate.getMonth() + 6);
        
        await storage.updateSubscriptionStatus(userId, 'free_access', sixMonthsEndDate);
        
        const user = await storage.getUser(userId);
        console.log(`CLIENT6FREE promo code used by user: ${user?.email} - 6 months free access until ${sixMonthsEndDate}`);
        
        // Send notifications about promo code usage
        if (user) {
          try {
            // Send to ActiveCampaign
            await activeCampaign.sendNotificationEmail(
              user.email,
              user.name,
              user.businessType,
              true
            );
            
            // Send developer notification
            await sendDeveloperNotification(
              user.email,
              user.name,
              user.businessType,
              'promo_code',
              'CLIENT6FREE - 6 months free access'
            );
          } catch (error) {
            console.error('Failed to send promo code notification:', error);
          }
        }
        
        return res.json({
          success: true,
          message: 'Congratulations! You now have 6 months of free access to all business tools.'
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid promo code. Please check your code and try again.'
        });
      }
    } catch (error) {
      console.error('Error applying promo code:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while applying the promo code. Please try again.'
      });
    }
  });

  // Test endpoint to update user status for testing trial enforcement
  app.post("/api/test-update-user-status", async (req, res) => {
    try {
      const { subscriptionStatus, subscriptionEndDate } = req.body;
      const user = await storage.updateSubscriptionStatus(1, subscriptionStatus, subscriptionEndDate ? new Date(subscriptionEndDate) : undefined);
      res.json({ message: "User status updated", user });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ message: "Error updating user status", error: (error as Error).message });
    }
  });

  // Get user trial status
  app.get("/api/user/trial-status", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const trialStatus = TrialManager.getAccessStatus(user);
    res.json(trialStatus);
  });

  // Hourly rate calculations - NEW AUTH
  app.post("/api/hourly-rate-calculations", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      console.log('NEW AUTH: Creating hourly rate calculation for user ID:', userId);
      const data = insertHourlyRateCalculationSchema.parse({
        ...req.body,
        userId: userId
      });
      const calculation = await storage.createHourlyRateCalculation(data);
      res.json(calculation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/hourly-rate-calculations", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      console.log('GET hourly-rate-calculations for user ID:', userId);
      const calculations = await storage.getHourlyRateCalculationsByUserId(userId);
      console.log('Found calculations:', calculations.length, 'for user:', userId);
      res.json(calculations);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/hourly-rate-calculations/latest", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const calculation = await storage.getLatestHourlyRateCalculation(userId);
      res.json(calculation || null);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Treatments
  app.post("/api/treatments", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      console.log('Creating treatment for user:', userId);
      console.log('Request body:', req.body);
      
      const validation = insertTreatmentSchema.safeParse(req.body);
      if (!validation.success) {
        console.log('Validation errors:', validation.error.errors);
        console.log('Request body structure:', JSON.stringify(req.body, null, 2));
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validation.error.errors 
        });
      }

      const treatment = await storage.createTreatment({
        ...validation.data,
        userId: userId,
        profitMargin: "0"
      } as any);
      console.log('Created treatment:', treatment);
      res.json(treatment);
    } catch (error) {
      console.error('Error creating treatment:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error", error: (error as Error).message });
    }
  });

  app.get("/api/treatments", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const treatments = await storage.getTreatmentsByUserId(userId);
      res.json(treatments);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/treatments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertTreatmentSchema.partial().parse(req.body);
      const treatment = await storage.updateTreatment(id, data);
      if (!treatment) {
        return res.status(404).json({ message: "Treatment not found" });
      }
      res.json(treatment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/treatments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTreatment(id);
      if (!deleted) {
        return res.status(404).json({ message: "Treatment not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Expenses
  app.post("/api/expenses", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const data = insertExpenseSchema.parse({
        ...req.body,
        userId: userId,
        date: new Date(req.body.date)
      });
      const expense = await storage.createExpense(data);
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/expenses", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { startDate, endDate } = req.query;
      let expenses;
      
      if (startDate && endDate) {
        expenses = await storage.getExpensesByUserIdAndDateRange(
          userId,
          new Date(startDate as string),
          new Date(endDate as string)
        );
      } else {
        expenses = await storage.getExpensesByUserId(userId);
      }
      
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteExpense(id);
      if (!deleted) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Business metrics
  app.get("/api/metrics", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const treatments = await storage.getTreatmentsByUserId(userId);
      const expenses = await storage.getExpensesByUserId(userId);
      const latestHourlyRate = await storage.getLatestHourlyRateCalculation(userId);

      // Calculate metrics
      const totalTreatments = treatments.length;
      const avgProfitMargin = treatments.length > 0 
        ? treatments.reduce((sum, t) => sum + parseFloat(t.profitMargin), 0) / treatments.length 
        : 0;
      
      const currentMonth = new Date();
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthlyExpenses = await storage.getExpensesByUserIdAndDateRange(userId, firstDayOfMonth, currentMonth);
      const totalMonthlyExpenses = monthlyExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
      
      // Calculate monthly revenue based on user's actual treatments
      const estimatedMonthlyRevenue = treatments.length > 0 
        ? treatments.reduce((sum, t) => sum + parseFloat(t.price.toString()), 0) * 0.7 // Assuming 70% booking rate
        : 0;

      const metrics = {
        hourlyRate: latestHourlyRate?.calculatedRate || "0",
        avgProfitMargin: avgProfitMargin.toFixed(1),
        monthlyRevenue: estimatedMonthlyRevenue.toFixed(2),
        activeTreatments: totalTreatments,
        monthlyExpenses: totalMonthlyExpenses.toFixed(2)
      };

      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Business routes
  app.get("/api/businesses", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const businesses = await storage.getBusinessesByUserId(userId);
      res.json(businesses);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      res.status(500).json({ message: "Failed to fetch businesses" });
    }
  });

  app.post("/api/businesses", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validation = insertBusinessSchema.safeParse({
        ...req.body,
        userId: userId
      });
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid business data", 
          errors: validation.error.errors 
        });
      }

      const business = await storage.createBusiness(validation.data);
      res.json(business);
    } catch (error) {
      console.error("Error creating business:", error);
      res.status(500).json({ message: "Failed to create business" });
    }
  });

  app.put("/api/businesses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validation = insertBusinessSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid business data", 
          errors: validation.error.errors 
        });
      }

      const business = await storage.updateBusiness(id, validation.data);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      res.json(business);
    } catch (error) {
      console.error("Error updating business:", error);
      res.status(500).json({ message: "Failed to update business" });
    }
  });

  app.delete("/api/businesses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteBusiness(id);
      
      if (!success) {
        return res.status(404).json({ message: "Business not found" });
      }
      
      res.json({ message: "Business deleted successfully" });
    } catch (error) {
      console.error("Error deleting business:", error);
      res.status(500).json({ message: "Failed to delete business" });
    }
  });

  // Stock purchase routes
  app.post("/api/stock-purchases", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validation = insertStockPurchaseSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validation.error.errors 
        });
      }

      const stockPurchase = await storage.createStockPurchase({
        ...validation.data,
        userId: userId
      });
      res.json(stockPurchase);
    } catch (error) {
      console.error("Error creating stock purchase:", error);
      res.status(500).json({ message: "Failed to create stock purchase" });
    }
  });

  app.get("/api/stock-purchases", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const stockPurchases = await storage.getStockPurchasesByUserId(userId);
      res.json(stockPurchases);
    } catch (error) {
      console.error("Error fetching stock purchases:", error);
      res.status(500).json({ message: "Failed to fetch stock purchases" });
    }
  });

  app.delete("/api/stock-purchases/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteStockPurchase(id);
      
      if (!success) {
        return res.status(404).json({ message: "Stock purchase not found" });
      }
      
      res.json({ message: "Stock purchase deleted successfully" });
    } catch (error) {
      console.error("Error deleting stock purchase:", error);
      res.status(500).json({ message: "Failed to delete stock purchase" });
    }
  });

  // Weekly income routes
  app.get("/api/weekly-incomes", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const businessId = req.query.businessId ? parseInt(req.query.businessId as string) : undefined;
      
      let weeklyIncomes;
      if (businessId) {
        weeklyIncomes = await storage.getWeeklyIncomesByBusinessId(businessId);
      } else {
        weeklyIncomes = await storage.getWeeklyIncomesByUserId(userId);
      }
      
      res.json(weeklyIncomes);
    } catch (error) {
      console.error("Error fetching weekly incomes:", error);
      res.status(500).json({ message: "Failed to fetch weekly incomes" });
    }
  });

  app.post("/api/weekly-incomes", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validation = insertWeeklyIncomeSchema.safeParse({
        ...req.body,
        userId: userId
      });
      if (!validation.success) {
        console.error("Weekly income validation failed:", validation.error.errors);
        console.error("Request body:", req.body);
        return res.status(400).json({ 
          message: "Invalid weekly income data", 
          errors: validation.error.errors 
        });
      }

      const weeklyIncome = await storage.createOrUpdateWeeklyIncome(validation.data);
      res.json(weeklyIncome);
    } catch (error) {
      console.error("Error creating/updating weekly income:", error);
      res.status(500).json({ message: "Failed to save weekly income" });
    }
  });

  // Income goal routes
  app.get("/api/income-goals", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const businessId = req.query.businessId ? parseInt(req.query.businessId as string) : undefined;
      
      let goals;
      if (businessId) {
        goals = await storage.getIncomeGoalsByBusinessId(businessId);
      } else {
        goals = await storage.getIncomeGoalsByUserId(userId);
      }
      
      res.json(goals);
    } catch (error) {
      console.error("Error fetching income goals:", error);
      res.status(500).json({ message: "Failed to fetch income goals" });
    }
  });

  app.post("/api/income-goals", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validation = insertIncomeGoalSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid income goal data", 
          errors: validation.error.errors 
        });
      }

      const goal = await storage.createIncomeGoal({
        ...validation.data,
        userId: userId
      });
      res.json(goal);
    } catch (error) {
      console.error("Error creating income goal:", error);
      res.status(500).json({ message: "Failed to create income goal" });
    }
  });

  app.put("/api/income-goals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validation = insertIncomeGoalSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid income goal data", 
          errors: validation.error.errors 
        });
      }

      const goal = await storage.updateIncomeGoal(id, validation.data);
      if (!goal) {
        return res.status(404).json({ message: "Income goal not found" });
      }
      
      res.json(goal);
    } catch (error) {
      console.error("Error updating income goal:", error);
      res.status(500).json({ message: "Failed to update income goal" });
    }
  });

  app.delete("/api/income-goals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteIncomeGoal(id);
      
      if (!success) {
        return res.status(404).json({ message: "Income goal not found" });
      }
      
      res.json({ message: "Income goal deleted successfully" });
    } catch (error) {
      console.error("Error deleting income goal:", error);
      res.status(500).json({ message: "Failed to delete income goal" });
    }
  });

  // Money pot routes
  app.get("/api/money-pots", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const businessId = req.query.businessId ? parseInt(req.query.businessId as string) : undefined;
      
      let moneyPots;
      if (businessId) {
        moneyPots = await storage.getMoneyPotsByBusinessId(businessId);
      } else {
        moneyPots = await storage.getMoneyPotsByUserId(userId);
      }
      
      res.json(moneyPots);
    } catch (error) {
      console.error("Error fetching money pots:", error);
      res.status(500).json({ message: "Failed to fetch money pots" });
    }
  });

  app.post("/api/money-pots", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const validation = insertMoneyPotSchema.safeParse({
        ...req.body,
        userId: userId
      });
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid money pot data", 
          errors: validation.error.errors 
        });
      }

      const moneyPot = await storage.createMoneyPot(validation.data);
      res.json(moneyPot);
    } catch (error) {
      console.error("Error creating money pot:", error);
      res.status(500).json({ message: "Failed to create money pot" });
    }
  });

  app.put("/api/money-pots/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validation = insertMoneyPotSchema.partial().safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid money pot data", 
          errors: validation.error.errors 
        });
      }

      const moneyPot = await storage.updateMoneyPot(id, validation.data);
      
      if (!moneyPot) {
        return res.status(404).json({ message: "Money pot not found" });
      }
      
      res.json(moneyPot);
    } catch (error) {
      console.error("Error updating money pot:", error);
      res.status(500).json({ message: "Failed to update money pot" });
    }
  });

  app.delete("/api/money-pots/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMoneyPot(id);
      
      if (!success) {
        return res.status(404).json({ message: "Money pot not found" });
      }
      
      res.json({ message: "Money pot deleted successfully" });
    } catch (error) {
      console.error("Error deleting money pot:", error);
      res.status(500).json({ message: "Failed to delete money pot" });
    }
  });

  // Test endpoint to verify Stripe keys
  app.get('/api/stripe-test', async (req, res) => {
    try {
      console.log('Testing Stripe with keys:');
      console.log('Secret key starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 8));
      console.log('Public key starts with:', process.env.VITE_STRIPE_PUBLIC_KEY?.substring(0, 8));
      console.log('Price ID:', process.env.STRIPE_PRICE_ID);
      
      const testStripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-05-28.basil",
      });
      
      const price = await testStripe.prices.retrieve(process.env.STRIPE_PRICE_ID!);
      res.json({ 
        success: true, 
        price: price.unit_amount ? price.unit_amount / 100 : 0, 
        currency: price.currency,
        message: 'Stripe connection successful'
      });
    } catch (error: any) {
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Stripe subscription routes
  app.post('/api/create-subscription', requireAuth, async (req, res) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ message: "Stripe configuration missing" });
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-05-28.basil",
      });

      const userId = req.session.userId!;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has free access from promo code - no subscription needed
      if (user.subscriptionStatus === 'free_access') {
        return res.json({
          subscriptionId: 'free_access',
          clientSecret: null,
          status: 'active'
        });
      }

      // Check if user already has an active subscription
      if (user.stripeSubscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            return res.json({
              subscriptionId: subscription.id,
              clientSecret: null, // No payment needed for active subscription
            });
          }
        } catch (err) {
          console.log('Existing subscription not found, creating new one');
        }
      }

      // Create or retrieve Stripe customer
      let customer;
      if (user.stripeCustomerId) {
        try {
          customer = await stripe.customers.retrieve(user.stripeCustomerId);
        } catch (err) {
          customer = null;
        }
      }
      
      if (!customer) {
        customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: {
            userId: user.id.toString(),
          }
        });
        await storage.updateUserStripeInfo(user.id, customer.id);
      }

      // Create subscription
      if (!process.env.STRIPE_PRICE_ID) {
        return res.status(500).json({ message: "Stripe price ID not configured" });
      }

      // Create setup intent for payment method
      const setupIntent = await stripe.setupIntents.create({
        customer: customer.id,
        payment_method_types: ['card'],
        usage: 'off_session'
      });

      // Create subscription without immediate payment
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: process.env.STRIPE_PRICE_ID,
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(user.id, customer.id, subscription.id);
      await storage.updateSubscriptionStatus(user.id, 'pending');

      console.log('Setup Intent created:', {
        id: setupIntent.id,
        status: setupIntent.status,
        client_secret: setupIntent.client_secret ? 'exists' : 'null'
      });

      console.log('Subscription created:', {
        id: subscription.id,
        status: subscription.status,
        latest_invoice: subscription.latest_invoice ? 'exists' : 'null'
      });

      res.json({
        subscriptionId: subscription.id,
        clientSecret: setupIntent.client_secret,
        status: subscription.status
      });
    } catch (error: any) {
      console.error('Stripe subscription error:', error);
      return res.status(400).json({ error: { message: error.message || 'Subscription creation failed. Please check Stripe configuration.' } });
    }
  });

  // Check subscription status
  app.get('/api/subscription-status', async (req, res) => {
    try {
      const user = await storage.getUser(1); // Demo user
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let subscriptionStatus = {
        active: true,
        status: user.subscriptionStatus,
        endDate: user.subscriptionEndDate
      };

      if (user.stripeSubscriptionId) {
        try {
          const testStripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2025-05-28.basil",
          });
          
          const subscription = await testStripe.subscriptions.retrieve(user.stripeSubscriptionId);
          subscriptionStatus.active = subscription.status === 'active' || subscription.status === 'trialing';
          subscriptionStatus.status = subscription.status;
          const endDate = new Date((subscription as any).current_period_end * 1000);
          subscriptionStatus.endDate = endDate;
          
          // Update local storage only if date is valid
          if (!isNaN(endDate.getTime())) {
            await storage.updateSubscriptionStatus(
              user.id, 
              subscription.status, 
              endDate
            );
          } else {
            console.error('Invalid subscription end date:', (subscription as any).current_period_end);
            await storage.updateSubscriptionStatus(
              user.id, 
              subscription.status
            );
          }
        } catch (err) {
          console.log('Error checking subscription status:', err);
        }
      }

      res.json(subscriptionStatus);
    } catch (error: any) {
      console.error('Subscription status error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reset demo user for testing
  app.post('/api/reset-demo-user', async (req, res) => {
    try {
      const user = await storage.getUser(1);
      if (user) {
        await storage.updateUserStripeInfo(user.id, "", "");
        await storage.updateSubscriptionStatus(user.id, "");
      }
      res.json({ success: true, message: 'Demo user reset successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Create promotional code for 6 months free
  app.post('/api/create-promo-code', async (req, res) => {
    try {
      const testStripe = new Stripe('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', {
        apiVersion: "2025-05-28.basil",
      });

      // First create a coupon for 100% off for 6 months
      const coupon = await testStripe.coupons.create({
        percent_off: 100,
        duration: 'repeating',
        duration_in_months: 6,
        name: '6 Months Free for Clients',
      });

      // Then create a promotion code
      const promotionCode = await testStripe.promotionCodes.create({
        coupon: coupon.id,
        code: 'CLIENT6FREE',
        active: true,
        max_redemptions: 100, // Limit to 100 uses
      });

      res.json({
        success: true,
        couponId: coupon.id,
        promotionCodeId: promotionCode.id,
        code: promotionCode.code,
        message: 'Promo code CLIENT6FREE created successfully - 6 months free!'
      });
    } catch (error: any) {
      console.error('Promo code creation error:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  app.post('/api/subscription-status', async (req, res) => {
    try {
      const { subscriptionId, status } = req.body;
      const user = await storage.getUser(1); // Demo user
      
      if (!user || user.stripeSubscriptionId !== subscriptionId) {
        return res.status(404).json({ message: "Subscription not found" });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const endDate = new Date((subscription as any).current_period_end * 1000);
      
      await storage.updateSubscriptionStatus(user.id, status, endDate);
      
      res.json({ message: "Subscription status updated" });
    } catch (error: any) {
      console.error('Subscription status update error:', error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  app.get('/api/subscription', async (req, res) => {
    try {
      const user = await storage.getUser(1); // Demo user
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.stripeSubscriptionId) {
        return res.json({ subscriptionStatus: 'inactive' });
      }

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      res.json({
        subscriptionStatus: subscription.status,
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    } catch (error: any) {
      console.error('Get subscription error:', error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  // Email report endpoint
  app.post('/api/email-report', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get user's business data
      const treatments = await storage.getTreatmentsByUserId(userId);
      const expenses = await storage.getExpensesByUserId(userId);
      const hourlyRateCalc = await storage.getLatestHourlyRateCalculation(userId);
      const businesses = await storage.getBusinessesByUserId(userId);
      const weeklyIncomes = await storage.getWeeklyIncomesByUserId(userId);

      // Calculate metrics
      const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
      const avgTreatmentPrice = treatments.length > 0 
        ? treatments.reduce((sum, t) => sum + parseFloat(t.price?.toString() || '0'), 0) / treatments.length 
        : 0;
      const totalMonthlyRevenue = weeklyIncomes.reduce((sum, w) => sum + parseFloat(w.weeklyTotal.toString()), 0) * 4.33;

      // Generate HTML email content
      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Business Report - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e91e63; padding-bottom: 15px; }
            .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .metric-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: #f8f9fa; }
            .metric-value { font-size: 24px; font-weight: bold; color: #e91e63; }
            .metric-label { font-size: 14px; color: #666; margin-top: 5px; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Business Performance Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="metrics">
            <div class="metric-card">
              <div class="metric-value">£${hourlyRateCalc?.calculatedRate || '0'}/hr</div>
              <div class="metric-label">Current Hourly Rate</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">£${totalMonthlyRevenue.toFixed(2)}</div>
              <div class="metric-label">Monthly Revenue</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">£${totalExpenses.toFixed(2)}</div>
              <div class="metric-label">Total Expenses</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${treatments.length}</div>
              <div class="metric-label">Active Treatments</div>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Treatment Summary</h2>
            <table>
              <thead>
                <tr>
                  <th>Treatment</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Profit Margin</th>
                </tr>
              </thead>
              <tbody>
                ${treatments.map(t => `
                  <tr>
                    <td>${t.name}</td>
                    <td>£${parseFloat(t.price?.toString() || '0').toFixed(2)}</td>
                    <td>${t.duration || 0} min</td>
                    <td>${parseFloat(t.profitMargin?.toString() || '0').toFixed(1)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2 class="section-title">Recent Expenses</h2>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                ${expenses.slice(0, 10).map(e => `
                  <tr>
                    <td>${e.category}</td>
                    <td>£${parseFloat(e.amount.toString()).toFixed(2)}</td>
                    <td>${new Date(e.date).toLocaleDateString()}</td>
                    <td>${e.description || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;

      // Try to send email using SendGrid, fallback to mailto if it fails
      try {
        const { sendEmail } = await import('./sendgrid');
        const emailSent = await sendEmail({
          to: user.email,
          from: user.email, // Use user's own email as sender to avoid verification issues
          subject: `Business Report - ${new Date().toLocaleDateString()}`,
          html: emailHTML
        });

        if (emailSent) {
          res.json({ success: true, message: 'Report emailed successfully' });
        } else {
          // Fallback to mailto approach
          res.json({ 
            success: true, 
            message: 'Email service unavailable. Opening your email client instead.',
            fallback: true,
            emailData: {
              subject: `Business Report - ${new Date().toLocaleDateString()}`,
              body: `Please find your business performance report below:\n\nKey Metrics:\n- Current Hourly Rate: £${hourlyRateCalc?.calculatedRate || '0'}/hr\n- Monthly Revenue: £${totalMonthlyRevenue.toFixed(2)}\n- Total Treatments: ${treatments.length}\n- Total Expenses: £${totalExpenses.toFixed(2)}\n\nGenerated on ${new Date().toLocaleDateString()}`
            }
          });
        }
      } catch (emailError) {
        console.log('SendGrid error, using fallback:', emailError);
        // Fallback to mailto approach
        res.json({ 
          success: true, 
          message: 'Email service unavailable. Opening your email client instead.',
          fallback: true,
          emailData: {
            subject: `Business Report - ${new Date().toLocaleDateString()}`,
            body: `Please find your business performance report below:\n\nKey Metrics:\n- Current Hourly Rate: £${hourlyRateCalc?.calculatedRate || '0'}/hr\n- Monthly Revenue: £${totalMonthlyRevenue.toFixed(2)}\n- Total Treatments: ${treatments.length}\n- Total Expenses: £${totalExpenses.toFixed(2)}\n\nGenerated on ${new Date().toLocaleDateString()}`
          }
        });
      }

    } catch (error: any) {
      console.error('Email report error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate email report' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
