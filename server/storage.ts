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
import { eq, and, gte, lte, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  verifyPassword(email: string, password: string): Promise<User | null>;
  updateUserStripeInfo(userId: number, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User | undefined>;
  updateSubscriptionStatus(userId: number, status: string, endDate?: Date): Promise<User | undefined>;
  updateSubscriptionEndDate(userId: number, endDate: Date): Promise<User | undefined>;
  deleteUser(userId: number): Promise<boolean>;

  // Password reset operations
  setPasswordResetToken(userId: number, token: string, expires: Date): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(userId: number): Promise<User | undefined>;
  updatePassword(userId: number, hashedPassword: string): Promise<User | undefined>;

  // Hourly rate calculation operations
  createHourlyRateCalculation(calculation: InsertHourlyRateCalculation): Promise<HourlyRateCalculation>;
  getHourlyRateCalculationsByUserId(userId: number): Promise<HourlyRateCalculation[]>;
  getLatestHourlyRateCalculation(userId: number): Promise<HourlyRateCalculation | undefined>;

  // Treatment operations
  createTreatment(treatment: InsertTreatment): Promise<Treatment>;
  getTreatmentsByUserId(userId: number): Promise<Treatment[]>;
  updateTreatment(id: number, treatment: Partial<InsertTreatment>): Promise<Treatment | undefined>;
  deleteTreatment(id: number): Promise<boolean>;

  // Expense operations
  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpensesByUserId(userId: number): Promise<Expense[]>;
  getExpensesByUserIdAndDateRange(userId: number, startDate: Date, endDate: Date): Promise<Expense[]>;
  deleteExpense(id: number): Promise<boolean>;

  // Business operations
  createBusiness(business: InsertBusiness): Promise<Business>;
  getBusinessesByUserId(userId: number): Promise<Business[]>;
  updateBusiness(id: number, business: Partial<InsertBusiness>): Promise<Business | undefined>;
  deleteBusiness(id: number): Promise<boolean>;

  // Weekly income operations
  createOrUpdateWeeklyIncome(weeklyIncome: InsertWeeklyIncome): Promise<WeeklyIncome>;
  getWeeklyIncomesByBusinessId(businessId: number): Promise<WeeklyIncome[]>;
  getWeeklyIncomesByUserId(userId: number): Promise<WeeklyIncome[]>;
  getWeeklyIncomeByWeek(businessId: number, weekStartDate: Date): Promise<WeeklyIncome | undefined>;

  // Income goal operations
  createIncomeGoal(goal: InsertIncomeGoal & { userId: number }): Promise<IncomeGoal>;
  getIncomeGoalsByUserId(userId: number): Promise<IncomeGoal[]>;
  getIncomeGoalsByBusinessId(businessId: number): Promise<IncomeGoal[]>;
  updateIncomeGoal(id: number, goal: Partial<InsertIncomeGoal>): Promise<IncomeGoal | undefined>;
  deleteIncomeGoal(id: number): Promise<boolean>;

  // Stock purchase operations
  createStockPurchase(purchase: InsertStockPurchase): Promise<StockPurchase>;
  getStockPurchasesByUserId(userId: number): Promise<StockPurchase[]>;
  getStockPurchasesByUserIdAndDateRange(userId: number, startDate: Date, endDate: Date): Promise<StockPurchase[]>;
  deleteStockPurchase(id: number): Promise<boolean>;

  // Money pot operations
  createMoneyPot(pot: InsertMoneyPot): Promise<MoneyPot>;
  getMoneyPotsByUserId(userId: number): Promise<MoneyPot[]>;
  getMoneyPotsByBusinessId(businessId: number): Promise<MoneyPot[]>;
  updateMoneyPot(id: number, pot: Partial<InsertMoneyPot>): Promise<MoneyPot | undefined>;
  deleteMoneyPot(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private hourlyRateCalculations: Map<number, HourlyRateCalculation>;
  private treatments: Map<number, Treatment>;
  private expenses: Map<number, Expense>;
  private businesses: Map<number, Business>;
  private weeklyIncomes: Map<number, WeeklyIncome>;
  private incomeGoals: Map<number, IncomeGoal>;
  private stockPurchases: Map<number, StockPurchase>;
  private moneyPots: Map<number, MoneyPot>;
  private currentUserId: number;
  private currentHourlyRateId: number;
  private currentTreatmentId: number;
  private currentExpenseId: number;
  private currentBusinessId: number;
  private currentWeeklyIncomeId: number;
  private currentIncomeGoalId: number;
  private currentStockPurchaseId: number;
  private currentMoneyPotId: number;

  constructor() {
    this.users = new Map();
    this.hourlyRateCalculations = new Map();
    this.treatments = new Map();
    this.expenses = new Map();
    this.businesses = new Map();
    this.weeklyIncomes = new Map();
    this.incomeGoals = new Map();
    this.stockPurchases = new Map();
    this.moneyPots = new Map();
    this.currentUserId = 1;
    this.currentHourlyRateId = 1;
    this.currentTreatmentId = 1;
    this.currentExpenseId = 1;
    this.currentBusinessId = 1;
    this.currentWeeklyIncomeId = 1;
    this.currentIncomeGoalId = 1;
    this.currentStockPurchaseId = 1;
    this.currentMoneyPotId = 1;

    // Add a demo user
    this.users.set(1, {
      id: 1,
      email: "katie@kgsalon.com",
      password: "$2a$10$PjOv2qGk7Q8QV4K9G0K9Pezr9PmxQ8QZPjOv2qGk7Q8QV4K9G0K9Pe", // "Test123!"
      name: "Katie Godfrey",
      businessType: "Hair Salon",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: "trial",
      subscriptionEndDate: null,
      emailVerified: true,
      passwordResetToken: null,
      passwordResetExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.currentUserId = 2;

    // Add a demo business
    this.businesses.set(1, {
      id: 1,
      userId: 1,
      name: "Main Salon",
      location: "City Center",
      isActive: 1,
      createdAt: new Date(),
    });
    this.currentBusinessId = 2;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async setPasswordResetToken(userId: number, token: string, expires: Date): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      passwordResetToken: token,
      passwordResetExpires: expires,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.passwordResetToken === token && 
                user.passwordResetExpires && 
                user.passwordResetExpires > new Date()
    );
  }

  async clearPasswordResetToken(userId: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      passwordResetToken: null,
      passwordResetExpires: null,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      password: hashedPassword,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserStripeInfo(userId: number, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      stripeCustomerId,
      stripeSubscriptionId: stripeSubscriptionId || user.stripeSubscriptionId,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateSubscriptionStatus(userId: number, status: string, endDate?: Date): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      subscriptionStatus: status,
      subscriptionEndDate: endDate || user.subscriptionEndDate,
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateSubscriptionEndDate(userId: number, endDate: Date): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      subscriptionEndDate: endDate,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async deleteUser(userId: number): Promise<boolean> {
    return this.users.delete(userId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const user: User = { 
      ...insertUser, 
      id,
      password: hashedPassword,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: "trial",
      subscriptionEndDate: null,
      emailVerified: false,
      passwordResetToken: null,
      passwordResetExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async createHourlyRateCalculation(calculation: InsertHourlyRateCalculation): Promise<HourlyRateCalculation> {
    const id = this.currentHourlyRateId++;
    const hourlyRateCalculation: HourlyRateCalculation = {
      ...calculation,
      id,
      staffCount: calculation.staffCount || 0,
      staffTargetPerPerson: calculation.staffTargetPerPerson || null,
      createdAt: new Date(),
    };
    this.hourlyRateCalculations.set(id, hourlyRateCalculation);
    return hourlyRateCalculation;
  }

  async getHourlyRateCalculationsByUserId(userId: number): Promise<HourlyRateCalculation[]> {
    return Array.from(this.hourlyRateCalculations.values())
      .filter(calc => calc.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);
  }

  async getLatestHourlyRateCalculation(userId: number): Promise<HourlyRateCalculation | undefined> {
    const calculations = await this.getHourlyRateCalculationsByUserId(userId);
    return calculations[0];
  }

  async createTreatment(treatment: InsertTreatment & { userId: number, profitMargin: string }): Promise<Treatment> {
    const id = this.currentTreatmentId++;
    const price = parseFloat(treatment.price.toString());
    const overheadCost = parseFloat(treatment.overheadCost.toString());
    const totalCosts = overheadCost;
    const profit = price - totalCosts;
    const profitMargin = price > 0 ? (profit / price) * 100 : 0;
    
    const treatmentRecord: Treatment = {
      ...treatment,
      id,
      profitMargin: profitMargin.toString(),
      createdAt: new Date(),
    };
    this.treatments.set(id, treatmentRecord);
    return treatmentRecord;
  }

  async getTreatmentsByUserId(userId: number): Promise<Treatment[]> {
    return Array.from(this.treatments.values())
      .filter(treatment => treatment.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateTreatment(id: number, treatment: Partial<InsertTreatment>): Promise<Treatment | undefined> {
    const existing = this.treatments.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...treatment };
    
    if (treatment.price || treatment.overheadCost) {
      const price = parseFloat(updated.price.toString());
      const overheadCost = parseFloat(updated.overheadCost.toString());
      const totalCosts = overheadCost;
      const profit = price - totalCosts;
      const profitMargin = price > 0 ? (profit / price) * 100 : 0;
      updated.profitMargin = profitMargin.toString();
    }

    this.treatments.set(id, updated);
    return updated;
  }

  async deleteTreatment(id: number): Promise<boolean> {
    return this.treatments.delete(id);
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = this.currentExpenseId++;
    const expenseRecord: Expense = {
      ...expense,
      id,
      createdAt: new Date(),
    };
    this.expenses.set(id, expenseRecord);
    return expenseRecord;
  }

  async getExpensesByUserId(userId: number): Promise<Expense[]> {
    return Array.from(this.expenses.values())
      .filter(expense => expense.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getExpensesByUserIdAndDateRange(userId: number, startDate: Date, endDate: Date): Promise<Expense[]> {
    return Array.from(this.expenses.values())
      .filter(expense => 
        expense.userId === userId && 
        expense.date >= startDate && 
        expense.date <= endDate
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async deleteExpense(id: number): Promise<boolean> {
    return this.expenses.delete(id);
  }

  // Business operations
  async createBusiness(business: InsertBusiness): Promise<Business> {
    const id = this.currentBusinessId++;
    const businessRecord: Business = {
      id,
      name: business.name,
      location: business.location || null,
      userId: 1, // Hardcoded for now
      isActive: 1,
      createdAt: new Date(),
    };
    this.businesses.set(id, businessRecord);
    return businessRecord;
  }

  async getBusinessesByUserId(userId: number): Promise<Business[]> {
    return Array.from(this.businesses.values())
      .filter(business => business.userId === userId && business.isActive === 1)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateBusiness(id: number, business: Partial<InsertBusiness>): Promise<Business | undefined> {
    const existing = this.businesses.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...business };
    this.businesses.set(id, updated);
    return updated;
  }

  async deleteBusiness(id: number): Promise<boolean> {
    const business = this.businesses.get(id);
    if (!business) return false;
    
    // Soft delete
    business.isActive = 0;
    this.businesses.set(id, business);
    return true;
  }

  // Weekly income operations
  async createOrUpdateWeeklyIncome(weeklyIncome: InsertWeeklyIncome): Promise<WeeklyIncome> {
    // Check if record exists for this business and week
    const existing = Array.from(this.weeklyIncomes.values()).find(
      income => income.businessId === weeklyIncome.businessId &&
                income.weekStartDate.getTime() === weeklyIncome.weekStartDate.getTime()
    );

    const weeklyTotal = parseFloat((weeklyIncome.weeklyTotal || "0").toString());
    const vatAmount = weeklyTotal * 0.20; // 20% VAT
    const profitAmount = weeklyTotal * 0.05; // 5% profit

    if (existing) {
      // Update existing record
      const updated: WeeklyIncome = {
        ...existing,
        ...weeklyIncome,
        weeklyTotal: weeklyTotal.toString(),
        vatAmount: vatAmount.toString(),
        profitAmount: profitAmount.toString(),
        updatedAt: new Date(),
      };
      this.weeklyIncomes.set(existing.id, updated);
      return updated;
    } else {
      // Create new record
      const id = this.currentWeeklyIncomeId++;
      const record: WeeklyIncome = {
        ...weeklyIncome,
        id,
        userId: weeklyIncome.userId,
        weeklyTotal: weeklyTotal.toString(),
        vatAmount: vatAmount.toString(),
        profitAmount: profitAmount.toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.weeklyIncomes.set(id, record);
      return record;
    }
  }

  async getWeeklyIncomesByBusinessId(businessId: number): Promise<WeeklyIncome[]> {
    return Array.from(this.weeklyIncomes.values())
      .filter(income => income.businessId === businessId)
      .sort((a, b) => b.weekStartDate.getTime() - a.weekStartDate.getTime());
  }

  async getWeeklyIncomesByUserId(userId: number): Promise<WeeklyIncome[]> {
    const userBusinesses = await this.getBusinessesByUserId(userId);
    const businessIds = userBusinesses.map(b => b.id);
    
    return Array.from(this.weeklyIncomes.values())
      .filter(income => businessIds.includes(income.businessId))
      .sort((a, b) => b.weekStartDate.getTime() - a.weekStartDate.getTime());
  }

  async getWeeklyIncomeByWeek(businessId: number, weekStartDate: Date): Promise<WeeklyIncome | undefined> {
    return Array.from(this.weeklyIncomes.values()).find(
      income => income.businessId === businessId &&
                income.weekStartDate.getTime() === weekStartDate.getTime()
    );
  }

  // Income goal operations
  async createIncomeGoal(goal: InsertIncomeGoal): Promise<IncomeGoal> {
    const id = this.currentIncomeGoalId++;
    const goalRecord: IncomeGoal = {
      id,
      userId: 1, // Hardcoded for now
      businessId: goal.businessId || null,
      goalType: goal.goalType,
      targetAmount: goal.targetAmount,
      year: goal.year,
      month: goal.month || null,
      isActive: 1,
      createdAt: new Date(),
    };
    this.incomeGoals.set(id, goalRecord);
    return goalRecord;
  }

  async getIncomeGoalsByUserId(userId: number): Promise<IncomeGoal[]> {
    return Array.from(this.incomeGoals.values())
      .filter(goal => goal.userId === userId && goal.isActive === 1)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getIncomeGoalsByBusinessId(businessId: number): Promise<IncomeGoal[]> {
    return Array.from(this.incomeGoals.values())
      .filter(goal => goal.businessId === businessId && goal.isActive === 1)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateIncomeGoal(id: number, goal: Partial<InsertIncomeGoal>): Promise<IncomeGoal | undefined> {
    const existing = this.incomeGoals.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...goal };
    this.incomeGoals.set(id, updated);
    return updated;
  }

  async deleteIncomeGoal(id: number): Promise<boolean> {
    const goal = this.incomeGoals.get(id);
    if (!goal) return false;
    
    // Soft delete
    goal.isActive = 0;
    this.incomeGoals.set(id, goal);
    return true;
  }

  // Stock purchase operations
  async createStockPurchase(purchase: InsertStockPurchase & { userId: number }): Promise<StockPurchase> {
    const stockPurchase: StockPurchase = {
      id: this.currentStockPurchaseId++,
      userId: purchase.userId,
      supplier: purchase.supplier,
      purchaseDate: new Date(purchase.purchaseDate),
      totalAmount: purchase.totalAmount,
      description: purchase.description || null,
      category: purchase.category,
      createdAt: new Date(),
    };
    this.stockPurchases.set(stockPurchase.id, stockPurchase);
    return stockPurchase;
  }

  async getStockPurchasesByUserId(userId: number): Promise<StockPurchase[]> {
    return Array.from(this.stockPurchases.values())
      .filter(purchase => purchase.userId === userId)
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }

  async getStockPurchasesByUserIdAndDateRange(userId: number, startDate: Date, endDate: Date): Promise<StockPurchase[]> {
    return Array.from(this.stockPurchases.values())
      .filter(purchase => 
        purchase.userId === userId &&
        purchase.purchaseDate >= startDate &&
        purchase.purchaseDate <= endDate
      )
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }

  async deleteStockPurchase(id: number): Promise<boolean> {
    return this.stockPurchases.delete(id);
  }

  // Money pot operations
  async createMoneyPot(pot: InsertMoneyPot): Promise<MoneyPot> {
    const moneyPot: MoneyPot = {
      id: this.currentMoneyPotId++,
      ...pot,
      businessId: pot.businessId || null,
      isActive: pot.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.moneyPots.set(moneyPot.id, moneyPot);
    return moneyPot;
  }

  async getMoneyPotsByUserId(userId: number): Promise<MoneyPot[]> {
    return Array.from(this.moneyPots.values())
      .filter(pot => pot.userId === userId && pot.isActive)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  async getMoneyPotsByBusinessId(businessId: number): Promise<MoneyPot[]> {
    return Array.from(this.moneyPots.values())
      .filter(pot => pot.businessId === businessId && pot.isActive)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  async updateMoneyPot(id: number, pot: Partial<InsertMoneyPot>): Promise<MoneyPot | undefined> {
    const existing = this.moneyPots.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...pot, 
      updatedAt: new Date() 
    };
    this.moneyPots.set(id, updated);
    return updated;
  }

  async deleteMoneyPot(id: number): Promise<boolean> {
    const pot = this.moneyPots.get(id);
    if (!pot) return false;
    
    pot.isActive = false;
    pot.updatedAt = new Date();
    this.moneyPots.set(id, pot);
    return true;
  }


}

import { DatabaseStorage } from "./database-storage";

export const storage = new DatabaseStorage();
