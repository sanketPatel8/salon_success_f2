CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hourly_rate_calculations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"monthly_expenses" numeric(10, 2) NOT NULL,
	"desired_profit" numeric(5, 2) NOT NULL,
	"weekly_hours" integer NOT NULL,
	"tax_rate" numeric(5, 2) NOT NULL,
	"staff_count" integer DEFAULT 0 NOT NULL,
	"calculated_rate" numeric(10, 2) NOT NULL,
	"staff_target_per_person" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "income_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"business_id" integer,
	"goal_type" text NOT NULL,
	"target_amount" numeric(10, 2) NOT NULL,
	"year" integer NOT NULL,
	"month" integer,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_pots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"business_id" integer,
	"name" text NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"color" text DEFAULT '#3b82f6',
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"supplier" text NOT NULL,
	"purchase_date" timestamp NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"duration" integer NOT NULL,
	"overhead_cost" numeric(10, 2) NOT NULL,
	"profit_margin" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"business_type" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"subscription_status" text DEFAULT 'trial',
	"subscription_end_date" timestamp,
	"email_verified" boolean DEFAULT false,
	"password_reset_token" text,
	"password_reset_expires" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "weekly_incomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"business_id" integer NOT NULL,
	"week_start_date" timestamp NOT NULL,
	"weekly_total" numeric(10, 2) DEFAULT '0' NOT NULL,
	"vat_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"profit_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");