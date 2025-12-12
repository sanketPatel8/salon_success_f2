import { 
  users, 
  hourlyRateCalculations, 
  treatments, 
  expenses,
  businesses,
  weeklyIncomes,
  incomeGoals,
  stockPurchases,
  moneyPots,
  teamTargets,
  type TeamTarget,
  type InsertTeamTarget,
  type User, 
  type InsertUser,
  type HourlyRateCalculation,
  type InsertHourlyRateCalculation,
  type Treatment,
  type InsertTreatment,
  type Expense,
  type InsertExpense,
  type Business,
  type InsertBusiness,
  type WeeklyIncome,
  type InsertWeeklyIncome,
  type IncomeGoal,
  type InsertIncomeGoal,
  type StockPurchase,
  type InsertStockPurchase,
  type MoneyPot,
  type InsertMoneyPot
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
  try {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
        instagramLink: insertUser.instagramLink || null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: "inactive", 
        subscriptionEndDate: null,
        emailVerified: false,
        passwordResetToken: null,
        passwordResetExpires: null,
        currency: insertUser.currency || "USD",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
      
      console.log("✅ User created with INACTIVE status (no trial until payment)");
      return user;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;
    
    // Return user without password for security
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId))
      .limit(1);
    return user;
  }

  async updateUserStripeInfo(
    userId: number, 
    stripeCustomerId: string, 
    stripeSubscriptionId?: string
  ): Promise<User | undefined> {
    try {
      if (stripeSubscriptionId) {
        // Update both customer ID and subscription ID
        const [updatedUser] = await db
          .update(users)
          .set({
            stripeCustomerId: stripeCustomerId,
            stripeSubscriptionId: stripeSubscriptionId,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
          .returning();
        
        console.log(`✅ DatabaseStorage: Updated Stripe info for user ${userId}:`, {
          customerId: stripeCustomerId,
          subscriptionId: stripeSubscriptionId,
        });
        
        return updatedUser;
      } else {
        // Update only customer ID
        const [updatedUser] = await db
          .update(users)
          .set({
            stripeCustomerId: stripeCustomerId,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
          .returning();
        
        console.log(`✅ DatabaseStorage: Updated Stripe customer ID for user ${userId}:`, stripeCustomerId);
        
        return updatedUser;
      }
    } catch (error) {
      console.error('❌ Error updating user Stripe info:', error);
      throw error;
    }
  }

  async updateSubscriptionStatus(
    userId: number,
    status: string,
    endDate?: Date
  ): Promise<User | undefined> {
    try {
      console.log(`\n🧩 [updateSubscriptionStatus] Starting for user ${userId}`);
      console.log(`📦 Incoming status →`, status);
      console.log(`⏰ Provided endDate →`, endDate);

      const updateData: any = {
        subscriptionStatus: status,
        subscriptionEndDate: endDate ? new Date(endDate) : undefined,
        updatedAt: new Date(),
      };

      console.log(`📤 Preparing DB update with →`, updateData);

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      console.log(`✅ DB update complete for user ${userId}`);
      console.log(`🧾 Stored values:`, updateData);

      return updatedUser;
    } catch (error: any) {
      console.error(`❌ Error in updateSubscriptionStatus for user ${userId}:`, error);
    }
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    return allUsers;
  }

  async updateSubscriptionEndDate(userId: number, endDate: Date): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionEndDate: endDate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: number): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, userId));
    return result.rowCount > 0;
  }

  // Hourly rate calculation operations
  async createHourlyRateCalculation(calculation: InsertHourlyRateCalculation): Promise<HourlyRateCalculation> {
    const [result] = await db
      .insert(hourlyRateCalculations)
      .values(calculation)
      .returning();

    const allCalculations = await db
      .select()
      .from(hourlyRateCalculations)
      .where(eq(hourlyRateCalculations.userId, calculation.userId))
      .orderBy(desc(hourlyRateCalculations.createdAt));

    if (allCalculations.length > 5) {
      const calculationsToDelete = allCalculations.slice(5);
      const idsToDelete = calculationsToDelete.map(calc => calc.id);
      
      for (const id of idsToDelete) {
        await db
          .delete(hourlyRateCalculations)
          .where(eq(hourlyRateCalculations.id, id));
      }
    }

    return result;
  }

  async getHourlyRateCalculationsByUserId(userId: number): Promise<HourlyRateCalculation[]> {
    return await db
      .select()
      .from(hourlyRateCalculations)
      .where(eq(hourlyRateCalculations.userId, userId))
      .orderBy(desc(hourlyRateCalculations.createdAt))
      .limit(5);
  }

  async getLatestHourlyRateCalculation(userId: number): Promise<HourlyRateCalculation | undefined> {
    const [calculation] = await db
      .select()
      .from(hourlyRateCalculations)
      .where(eq(hourlyRateCalculations.userId, userId))
      .orderBy(desc(hourlyRateCalculations.createdAt))
      .limit(1);
    return calculation;
  }

  // Treatment operations
  async createTreatment(treatment: InsertTreatment): Promise<Treatment> {
    const price = parseFloat(treatment.price.toString());
    const overheadCost = parseFloat(treatment.overheadCost.toString());
    const profit = price - overheadCost;
    const profitMargin = price > 0 ? (profit / price) * 100 : 0;
    
    const treatmentWithMargin = {
      ...treatment,
      profitMargin: profitMargin.toFixed(2)
    };
    
    const [result] = await db
      .insert(treatments)
      .values(treatmentWithMargin)
      .returning();
    return result;
  }

  async getTreatmentsByUserId(userId: number): Promise<Treatment[]> {
    return await db
      .select()
      .from(treatments)
      .where(eq(treatments.userId, userId))
      .orderBy(desc(treatments.createdAt));
  }

  async updateTreatment(id: number, treatment: Partial<InsertTreatment>): Promise<Treatment | undefined> {
    const [result] = await db
      .update(treatments)
      .set(treatment)
      .where(eq(treatments.id, id))
      .returning();
    return result;
  }

  async deleteTreatment(id: number): Promise<boolean> {
    const result = await db
      .delete(treatments)
      .where(eq(treatments.id, id));
    return result.rowCount > 0;
  }

  // Expense operations
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [result] = await db
      .insert(expenses)
      .values(expense)
      .returning();
    return result;
  }

  async getExpensesByUserId(userId: number): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, userId))
      .orderBy(desc(expenses.date));
  }

  async getExpensesByUserIdAndDateRange(userId: number, startDate: Date, endDate: Date): Promise<Expense[]> {
    return await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.date, startDate),
          lte(expenses.date, endDate)
        )
      )
      .orderBy(desc(expenses.date));
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db
      .delete(expenses)
      .where(eq(expenses.id, id));
    return result.rowCount > 0;
  }

  // Business operations
  async createBusiness(business: InsertBusiness): Promise<Business> {
    const [result] = await db
      .insert(businesses)
      .values(business)
      .returning();
    return result;
  }

  async getBusinessesByUserId(userId: number): Promise<Business[]> {
    return await db
      .select()
      .from(businesses)
      .where(eq(businesses.userId, userId))
      .orderBy(desc(businesses.createdAt));
  }

  async updateBusiness(id: number, business: Partial<InsertBusiness>): Promise<Business | undefined> {
    const [result] = await db
      .update(businesses)
      .set(business)
      .where(eq(businesses.id, id))
      .returning();
    return result;
  }

  async deleteBusiness(id: number): Promise<boolean> {
    const result = await db
      .delete(businesses)
      .where(eq(businesses.id, id));
    return result.rowCount > 0;
  }

  // Weekly income operations
  async createOrUpdateWeeklyIncome(weeklyIncome: InsertWeeklyIncome): Promise<WeeklyIncome> {
    const existing = await db
      .select()
      .from(weeklyIncomes)
      .where(
        and(
          eq(weeklyIncomes.businessId, weeklyIncome.businessId),
          eq(weeklyIncomes.weekStartDate, weeklyIncome.weekStartDate)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const [result] = await db
        .update(weeklyIncomes)
        .set({ weeklyTotal: weeklyIncome.weeklyTotal })
        .where(eq(weeklyIncomes.id, existing[0].id))
        .returning();
      return result;
    } else {
      const [result] = await db
        .insert(weeklyIncomes)
        .values(weeklyIncome)
        .returning();
      return result;
    }
  }

  async getWeeklyIncomesByBusinessId(businessId: number): Promise<WeeklyIncome[]> {
    return await db
      .select()
      .from(weeklyIncomes)
      .where(eq(weeklyIncomes.businessId, businessId))
      .orderBy(desc(weeklyIncomes.weekStartDate));
  }

  async getWeeklyIncomesByUserId(userId: number): Promise<WeeklyIncome[]> {
    return await db
      .select({
        id: weeklyIncomes.id,
        businessId: weeklyIncomes.businessId,
        weekStartDate: weeklyIncomes.weekStartDate,
        weeklyTotal: weeklyIncomes.weeklyTotal,
      })
      .from(weeklyIncomes)
      .innerJoin(businesses, eq(weeklyIncomes.businessId, businesses.id))
      .where(eq(businesses.userId, userId))
      .orderBy(desc(weeklyIncomes.weekStartDate));
  }

  async getWeeklyIncomeByWeek(businessId: number, weekStartDate: Date): Promise<WeeklyIncome | undefined> {
    const [result] = await db
      .select()
      .from(weeklyIncomes)
      .where(
        and(
          eq(weeklyIncomes.businessId, businessId),
          eq(weeklyIncomes.weekStartDate, weekStartDate)
        )
      )
      .limit(1);
    return result;
  }

  // Income goal operations
  async createIncomeGoal(goal: InsertIncomeGoal & { userId: number }): Promise<IncomeGoal> {
    const [result] = await db
      .insert(incomeGoals)
      .values(goal)
      .returning();
    return result;
  }

  async getIncomeGoalsByUserId(userId: number): Promise<IncomeGoal[]> {
    return await db
      .select()
      .from(incomeGoals)
      .where(eq(incomeGoals.userId, userId))
      .orderBy(desc(incomeGoals.createdAt));
  }

  async getIncomeGoalsByBusinessId(businessId: number): Promise<IncomeGoal[]> {
    return await db
      .select()
      .from(incomeGoals)
      .where(eq(incomeGoals.businessId, businessId))
      .orderBy(desc(incomeGoals.createdAt));
  }

  async updateIncomeGoal(id: number, goal: Partial<InsertIncomeGoal>): Promise<IncomeGoal | undefined> {
    const [result] = await db
      .update(incomeGoals)
      .set(goal)
      .where(eq(incomeGoals.id, id))
      .returning();
    return result;
  }

  async deleteIncomeGoal(id: number): Promise<boolean> {
    const result = await db
      .delete(incomeGoals)
      .where(eq(incomeGoals.id, id));
    return result.rowCount > 0;
  }

  // Stock purchase operations
  async createStockPurchase(purchase: InsertStockPurchase): Promise<StockPurchase> {
    const purchaseData = {
      ...purchase,
      purchaseDate: new Date(purchase.purchaseDate),
    };
    
    const [result] = await db
      .insert(stockPurchases)
      .values(purchaseData)
      .returning();
    return result;
  }

  async getStockPurchasesByUserId(userId: number): Promise<StockPurchase[]> {
    return await db
      .select()
      .from(stockPurchases)
      .where(eq(stockPurchases.userId, userId))
      .orderBy(desc(stockPurchases.createdAt));
  }

  async getStockPurchasesByUserIdAndDateRange(userId: number, startDate: Date, endDate: Date): Promise<StockPurchase[]> {
    return await db
      .select()
      .from(stockPurchases)
      .where(
        and(
          eq(stockPurchases.userId, userId),
          gte(stockPurchases.purchaseDate, startDate),
          lte(stockPurchases.purchaseDate, endDate)
        )
      )
      .orderBy(desc(stockPurchases.purchaseDate));
  }

  async deleteStockPurchase(id: number): Promise<boolean> {
    const result = await db
      .delete(stockPurchases)
      .where(eq(stockPurchases.id, id));
    return result.rowCount > 0;
  }

  // Password reset operations
  async setPasswordResetToken(userId: number, token: string, expires: Date): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set({
          passwordResetToken: token,
          passwordResetExpires: expires,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      console.error('Error setting password reset token:', error);
      return undefined;
    }
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.passwordResetToken, token),
          gt(users.passwordResetExpires, new Date())
        ));
      return user;
    } catch (error) {
      console.error('Error getting user by reset token:', error);
      return undefined;
    }
  }

  async clearPasswordResetToken(userId: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set({
          passwordResetToken: null,
          passwordResetExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      console.error('Error clearing password reset token:', error);
      return undefined;
    }
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();
      return user;
    } catch (error) {
      console.error('Error updating password:', error);
      return undefined;
    }
  }

  // Money pot operations
  async createMoneyPot(pot: InsertMoneyPot): Promise<MoneyPot> {
    const [result] = await db
      .insert(moneyPots)
      .values({
        ...pot,
        userId: pot.userId,
      })
      .returning();
    return result;
  }

  async getMoneyPotsByUserId(userId: number): Promise<MoneyPot[]> {
    return await db
      .select()
      .from(moneyPots)
      .where(and(eq(moneyPots.userId, userId), eq(moneyPots.isActive, true)))
      .orderBy(moneyPots.sortOrder, moneyPots.name);
  }

  async getMoneyPotsByBusinessId(businessId: number): Promise<MoneyPot[]> {
    return await db
      .select()
      .from(moneyPots)
      .where(and(eq(moneyPots.businessId, businessId), eq(moneyPots.isActive, true)))
      .orderBy(moneyPots.sortOrder, moneyPots.name);
  }

  async updateMoneyPot(id: number, pot: Partial<InsertMoneyPot>): Promise<MoneyPot | undefined> {
    try {
      const [result] = await db
        .update(moneyPots)
        .set({
          ...pot,
          updatedAt: new Date(),
        })
        .where(eq(moneyPots.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating money pot:', error);
      return undefined;
    }
  }

  async deleteMoneyPot(id: number): Promise<boolean> {
    try {
      await db
        .update(moneyPots)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(moneyPots.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting money pot:', error);
      return false;
    }
  }

   // Team target operations
  async createTeamTarget(target: InsertTeamTarget): Promise<TeamTarget> {
    const [result] = await db
      .insert(teamTargets)
      .values(target)
      .returning();
    return result;
  }

  async getTeamTargetsByUserId(userId: number): Promise<TeamTarget[]> {
    return await db
      .select()
      .from(teamTargets)
      .where(eq(teamTargets.userId, userId))
      .orderBy(desc(teamTargets.createdAt));
  }

  async updateTeamTarget(id: number, target: Partial<InsertTeamTarget>): Promise<TeamTarget | undefined> {
    const [result] = await db
      .update(teamTargets)
      .set({
        ...target,
        updatedAt: new Date(),
      })
      .where(eq(teamTargets.id, id))
      .returning();
    return result;
  }

  async deleteTeamTarget(id: number): Promise<boolean> {
    const result = await db
      .delete(teamTargets)
      .where(eq(teamTargets.id, id));
    return result.rowCount > 0;
  }
}