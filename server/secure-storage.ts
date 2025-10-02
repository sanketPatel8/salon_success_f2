import bcrypt from 'bcryptjs';
import type { 
  User, 
  InsertUser, 
  HourlyRateCalculation, 
  InsertHourlyRateCalculation,
  Treatment,
  InsertTreatment,
  Expense,
  InsertExpense,
  Business,
  InsertBusiness,
  WeeklyIncome,
  InsertWeeklyIncome,
  IncomeGoal,
  InsertIncomeGoal,
  StockPurchase,
  InsertStockPurchase
} from "@shared/schema";
import type { IStorage } from "./storage";

export class SecureStorage implements IStorage {
  private users: Map<number, User>;
  private hourlyRateCalculations: Map<number, HourlyRateCalculation>;
  private treatments: Map<number, Treatment>;
  private expenses: Map<number, Expense>;
  private businesses: Map<number, Business>;
  private weeklyIncomes: Map<number, WeeklyIncome>;
  private incomeGoals: Map<number, IncomeGoal>;
  private stockPurchases: Map<number, StockPurchase>;
  private currentUserId: number;
  private currentHourlyRateId: number;
  private currentTreatmentId: number;
  private currentExpenseId: number;
  private currentBusinessId: number;
  private currentWeeklyIncomeId: number;
  private currentIncomeGoalId: number;
  private currentStockPurchaseId: number;

  constructor() {
    this.users = new Map();
    this.hourlyRateCalculations = new Map();
    this.treatments = new Map();
    this.expenses = new Map();
    this.businesses = new Map();
    this.weeklyIncomes = new Map();
    this.incomeGoals = new Map();
    this.stockPurchases = new Map();
    this.currentUserId = 1;
    this.currentHourlyRateId = 1;
    this.currentTreatmentId = 1;
    this.currentExpenseId = 1;
    this.currentBusinessId = 1;
    this.currentWeeklyIncomeId = 1;
    this.currentIncomeGoalId = 1;
    this.currentStockPurchaseId = 1;
  }

  // User operations with proper security
  async getUser(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    // Always exclude password from returned user data
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const usersArray = Array.from(this.users.values());
    for (const user of usersArray) {
      if (user.email === email) {
        // Always exclude password from returned user data
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      }
    }
    return undefined;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const user: User = {
      ...userData,
      id,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: "trial",
      subscriptionEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
      emailVerified: false,
      passwordResetToken: null,
      passwordResetExpires: null,
    };
    
    this.users.set(id, user);
    console.log(`SECURE STORAGE: Created user ${id} with email ${user.email}`);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const usersArray = Array.from(this.users.values());
    for (const user of usersArray) {
      if (user.email === email) {
        const isValid = await bcrypt.compare(password, user.password);
        if (isValid) {
          console.log(`SECURE STORAGE: Password verified for user ${user.id}`);
          // Return user without password
          const { password: _, ...userWithoutPassword } = user;
          return userWithoutPassword as User;
        }
      }
    }
    console.log(`SECURE STORAGE: Password verification failed for email ${email}`);
    return null;
  }

  async updateUserStripeInfo(userId: number, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updated: User = {
      ...user,
      stripeCustomerId,
      stripeSubscriptionId: stripeSubscriptionId || user.stripeSubscriptionId,
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updated);
    const { password: _, ...userWithoutPassword } = updated;
    return userWithoutPassword as User;
  }

  async updateSubscriptionStatus(userId: number, status: string, endDate?: Date): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updated: User = {
      ...user,
      subscriptionStatus: status,
      subscriptionEndDate: endDate || user.subscriptionEndDate,
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updated);
    console.log(`SECURE STORAGE: Updated subscription for user ${userId} to ${status}`);
    const { password: _, ...userWithoutPassword } = updated;
    return userWithoutPassword as User;
  }

  // Hourly rate calculations - USER ISOLATED
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
    console.log(`SECURE STORAGE: Created hourly rate calculation for user ${calculation.userId}`);
    return hourlyRateCalculation;
  }

  async getHourlyRateCalculationsByUserId(userId: number): Promise<HourlyRateCalculation[]> {
    const calculations = Array.from(this.hourlyRateCalculations.values())
      .filter(calc => calc.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);
    console.log(`SECURE STORAGE: Retrieved ${calculations.length} calculations for user ${userId}`);
    return calculations;
  }

  async getLatestHourlyRateCalculation(userId: number): Promise<HourlyRateCalculation | undefined> {
    const calculations = await this.getHourlyRateCalculationsByUserId(userId);
    return calculations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  // Treatments - USER ISOLATED
  async createTreatment(treatment: InsertTreatment): Promise<Treatment> {
    const id = this.currentTreatmentId++;
    const price = parseFloat(treatment.price.toString());
    const productCost = parseFloat(treatment.productCost.toString());
    const overheadCost = parseFloat(treatment.overheadCost.toString());
    const totalCosts = productCost + overheadCost;
    const profit = price - totalCosts;
    const profitMargin = price > 0 ? (profit / price) * 100 : 0;
    
    const treatmentRecord: Treatment = {
      ...treatment,
      id,
      profitMargin: profitMargin.toString(),
      createdAt: new Date(),
    };
    this.treatments.set(id, treatmentRecord);
    console.log(`SECURE STORAGE: Created treatment for user ${treatment.userId}`);
    return treatmentRecord;
  }

  async getTreatmentsByUserId(userId: number): Promise<Treatment[]> {
    const treatments = Array.from(this.treatments.values())
      .filter(treatment => treatment.userId === userId);
    console.log(`SECURE STORAGE: Retrieved ${treatments.length} treatments for user ${userId}`);
    return treatments;
  }

  async updateTreatment(id: number, treatment: Partial<InsertTreatment>): Promise<Treatment | undefined> {
    const existing = this.treatments.get(id);
    if (!existing) return undefined;

    const updated: Treatment = {
      ...existing,
      ...treatment,
    };
    this.treatments.set(id, updated);
    return updated;
  }

  async deleteTreatment(id: number): Promise<boolean> {
    return this.treatments.delete(id);
  }

  // Expenses - USER ISOLATED
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = this.currentExpenseId++;
    const expenseRecord: Expense = {
      ...expense,
      id,
      createdAt: new Date(),
    };
    this.expenses.set(id, expenseRecord);
    console.log(`SECURE STORAGE: Created expense for user ${expense.userId}`);
    return expenseRecord;
  }

  async getExpensesByUserId(userId: number): Promise<Expense[]> {
    const expenses = Array.from(this.expenses.values())
      .filter(expense => expense.userId === userId);
    console.log(`SECURE STORAGE: Retrieved ${expenses.length} expenses for user ${userId}`);
    return expenses;
  }

  async getExpensesByUserIdAndDateRange(userId: number, startDate: Date, endDate: Date): Promise<Expense[]> {
    return Array.from(this.expenses.values())
      .filter(expense => 
        expense.userId === userId &&
        expense.date >= startDate &&
        expense.date <= endDate
      );
  }

  async deleteExpense(id: number): Promise<boolean> {
    return this.expenses.delete(id);
  }

  // Businesses - USER ISOLATED
  async createBusiness(business: InsertBusiness): Promise<Business> {
    const id = this.currentBusinessId++;
    const businessRecord: Business = {
      ...business,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.businesses.set(id, businessRecord);
    console.log(`SECURE STORAGE: Created business for user ${business.userId}`);
    return businessRecord;
  }

  async getBusinessesByUserId(userId: number): Promise<Business[]> {
    const businesses = Array.from(this.businesses.values())
      .filter(business => business.userId === userId);
    console.log(`SECURE STORAGE: Retrieved ${businesses.length} businesses for user ${userId}`);
    return businesses;
  }

  async updateBusiness(id: number, business: Partial<InsertBusiness>): Promise<Business | undefined> {
    const existing = this.businesses.get(id);
    if (!existing) return undefined;

    const updated: Business = {
      ...existing,
      ...business,
      updatedAt: new Date(),
    };
    this.businesses.set(id, updated);
    return updated;
  }

  async deleteBusiness(id: number): Promise<boolean> {
    return this.businesses.delete(id);
  }

  // Weekly incomes - USER ISOLATED
  async createOrUpdateWeeklyIncome(weeklyIncome: InsertWeeklyIncome): Promise<WeeklyIncome> {
    // Check if exists for this business and week
    const existing = Array.from(this.weeklyIncomes.values())
      .find(wi => 
        wi.businessId === weeklyIncome.businessId &&
        wi.weekStartDate.getTime() === weeklyIncome.weekStartDate.getTime()
      );

    if (existing) {
      const updated: WeeklyIncome = {
        ...existing,
        weeklyTotal: weeklyIncome.weeklyTotal,
        updatedAt: new Date(),
      };
      this.weeklyIncomes.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentWeeklyIncomeId++;
      const record: WeeklyIncome = {
        ...weeklyIncome,
        id,
        userId: 0, // Will be set by caller
        vatAmount: "0",
        profitAmount: "0",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.weeklyIncomes.set(id, record);
      return record;
    }
  }

  async getWeeklyIncomesByBusinessId(businessId: number): Promise<WeeklyIncome[]> {
    return Array.from(this.weeklyIncomes.values())
      .filter(wi => wi.businessId === businessId);
  }

  async getWeeklyIncomesByUserId(userId: number): Promise<WeeklyIncome[]> {
    const weeklyIncomes = Array.from(this.weeklyIncomes.values())
      .filter(wi => wi.userId === userId);
    console.log(`SECURE STORAGE: Retrieved ${weeklyIncomes.length} weekly incomes for user ${userId}`);
    return weeklyIncomes;
  }

  async getWeeklyIncomeByWeek(businessId: number, weekStartDate: Date): Promise<WeeklyIncome | undefined> {
    return Array.from(this.weeklyIncomes.values())
      .find(wi => 
        wi.businessId === businessId &&
        wi.weekStartDate.getTime() === weekStartDate.getTime()
      );
  }

  // Income goals - USER ISOLATED
  async createIncomeGoal(goal: InsertIncomeGoal): Promise<IncomeGoal> {
    const id = this.currentIncomeGoalId++;
    const goalRecord: IncomeGoal = {
      ...goal,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.incomeGoals.set(id, goalRecord);
    console.log(`SECURE STORAGE: Created income goal for user ${goal.userId}`);
    return goalRecord;
  }

  async getIncomeGoalsByUserId(userId: number): Promise<IncomeGoal[]> {
    const goals = Array.from(this.incomeGoals.values())
      .filter(goal => goal.userId === userId);
    console.log(`SECURE STORAGE: Retrieved ${goals.length} income goals for user ${userId}`);
    return goals;
  }

  async getIncomeGoalsByBusinessId(businessId: number): Promise<IncomeGoal[]> {
    return Array.from(this.incomeGoals.values())
      .filter(goal => goal.businessId === businessId);
  }

  async updateIncomeGoal(id: number, goal: Partial<InsertIncomeGoal>): Promise<IncomeGoal | undefined> {
    const existing = this.incomeGoals.get(id);
    if (!existing) return undefined;

    const updated: IncomeGoal = {
      ...existing,
      ...goal,
      updatedAt: new Date(),
    };
    this.incomeGoals.set(id, updated);
    return updated;
  }

  async deleteIncomeGoal(id: number): Promise<boolean> {
    return this.incomeGoals.delete(id);
  }

  // Stock purchases - USER ISOLATED
  async createStockPurchase(purchase: InsertStockPurchase): Promise<StockPurchase> {
    const id = this.currentStockPurchaseId++;
    const stockPurchase: StockPurchase = {
      ...purchase,
      id,
      createdAt: new Date(),
    };
    this.stockPurchases.set(id, stockPurchase);
    console.log(`SECURE STORAGE: Created stock purchase for user ${purchase.userId}`);
    return stockPurchase;
  }

  async getStockPurchasesByUserId(userId: number): Promise<StockPurchase[]> {
    const purchases = Array.from(this.stockPurchases.values())
      .filter(purchase => purchase.userId === userId);
    console.log(`SECURE STORAGE: Retrieved ${purchases.length} stock purchases for user ${userId}`);
    return purchases;
  }

  async getStockPurchasesByUserIdAndDateRange(userId: number, startDate: Date, endDate: Date): Promise<StockPurchase[]> {
    return Array.from(this.stockPurchases.values())
      .filter(purchase => 
        purchase.userId === userId &&
        new Date(purchase.purchaseDate) >= startDate &&
        new Date(purchase.purchaseDate) <= endDate
      );
  }

  async deleteStockPurchase(id: number): Promise<boolean> {
    return this.stockPurchases.delete(id);
  }

  // Password reset operations
  async setPasswordResetToken(userId: number, token: string, expires: Date): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updated: User = {
      ...user,
      passwordResetToken: token,
      passwordResetExpires: expires,
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updated);
    const { password: _, ...userWithoutPassword } = updated;
    return userWithoutPassword as User;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.passwordResetToken === token && 
          user.passwordResetExpires && 
          user.passwordResetExpires > new Date()) {
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      }
    }
    return undefined;
  }

  async clearPasswordResetToken(userId: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updated: User = {
      ...user,
      passwordResetToken: null,
      passwordResetExpires: null,
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updated);
    const { password: _, ...userWithoutPassword } = updated;
    return userWithoutPassword as User;
  }
}