ALTER TABLE "treatments"
	ADD COLUMN IF NOT EXISTS "product_cost" numeric(10, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "treatments"
	ADD COLUMN IF NOT EXISTS "average_team_working" integer DEFAULT 1 NOT NULL;
