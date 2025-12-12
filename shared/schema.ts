import { pgTable, text, serial, integer, decimal, timestamp, varchar, jsonb, index, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);


export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  businessType: text("business_type").notNull(),
  instagramLink: text("instagram_link"), 
  currency: varchar("currency", { length: 10 }).default("USD"),
  currencyCurrentPrice: decimal("currency_current_price", { precision: 10, scale: 2 }), // Optional: if you want to store exchange rates
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("inactive"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  emailVerified: boolean("email_verified").default(false),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const hourlyRateCalculations = pgTable("hourly_rate_calculations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  monthlyExpenses: decimal("monthly_expenses", { precision: 10, scale: 2 }).notNull(),
  desiredProfit: decimal("desired_profit", { precision: 5, scale: 2 }).notNull(),
  weeklyHours: integer("weekly_hours").notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  staffCount: integer("staff_count").notNull().default(0),
  calculatedRate: decimal("calculated_rate", { precision: 10, scale: 2 }).notNull(),
  staffTargetPerPerson: decimal("staff_target_per_person", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const treatments = pgTable("treatments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(), // in minutes
  overheadCost: decimal("overhead_cost", { precision: 10, scale: 2 }).notNull(),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  location: text("location"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const weeklyIncomes = pgTable("weekly_incomes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  businessId: integer("business_id").notNull(),
  weekStartDate: timestamp("week_start_date").notNull(),
  weeklyTotal: decimal("weekly_total", { precision: 10, scale: 2 }).notNull().default("0"),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  profitAmount: decimal("profit_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const incomeGoals = pgTable("income_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  businessId: integer("business_id"),
  goalType: text("goal_type").notNull(), // 'weekly', 'monthly', 'yearly'
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }).notNull(),
  year: integer("year").notNull(),
  month: integer("month"), // null for yearly goals
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stockPurchases = pgTable("stock_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  supplier: text("supplier").notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  category: text("category").notNull(), // Hair Products, Skincare, Equipment, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const moneyPots = pgTable("money_pots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  businessId: integer("business_id"),
  name: text("name").notNull(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(),
  color: text("color").default("#3b82f6"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});



export const insertUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  businessType: z.string().min(1, "Business type is required"),
  instagramLink: z.string().url("Please enter a valid Instagram URL").min(1, "Instagram link is required"), 
  currency: z.string().min(1, "currency type is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const insertHourlyRateCalculationSchema = createInsertSchema(hourlyRateCalculations).omit({
  id: true,
  createdAt: true,
});

export const insertTreatmentSchema = createInsertSchema(treatments).omit({
  id: true,
  createdAt: true,
  profitMargin: true,
  userId: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
});

export const insertWeeklyIncomeSchema = createInsertSchema(weeklyIncomes)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    vatAmount: true,
    profitAmount: true,
  })
  .extend({
    weekStartDate: z.string().transform((str) => new Date(str)),
  });

export const insertIncomeGoalSchema = createInsertSchema(incomeGoals).omit({
  id: true,
  createdAt: true,
  userId: true,
}).extend({
  businessId: z.number().optional(),
});

export const insertStockPurchaseSchema = createInsertSchema(stockPurchases).omit({
  id: true,
  createdAt: true,
  userId: true,
}).extend({
  purchaseDate: z.string().min(1, "Purchase date is required"),
});

export const insertMoneyPotSchema = createInsertSchema(moneyPots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const teamTargets = pgTable("team_target", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  staffName: text("staff_name").notNull(),
  role: text("role"), // nullable by default
  monthlySalary: numeric("monthly_salary", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertHourlyRateCalculation = z.infer<typeof insertHourlyRateCalculationSchema>;
export type HourlyRateCalculation = typeof hourlyRateCalculations.$inferSelect;
export type InsertTreatment = z.infer<typeof insertTreatmentSchema>;
export type Treatment = typeof treatments.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertWeeklyIncome = z.infer<typeof insertWeeklyIncomeSchema>;
export type WeeklyIncome = typeof weeklyIncomes.$inferSelect;
export type InsertIncomeGoal = z.infer<typeof insertIncomeGoalSchema>;
export type IncomeGoal = typeof incomeGoals.$inferSelect;
export type InsertStockPurchase = z.infer<typeof insertStockPurchaseSchema>;
export type StockPurchase = typeof stockPurchases.$inferSelect;
export type InsertMoneyPot = z.infer<typeof insertMoneyPotSchema>;
export type MoneyPot = typeof moneyPots.$inferSelect;
export type TeamTarget = typeof teamTargets.$inferSelect;
export type InsertTeamTarget = typeof teamTargets.$inferInsert;
