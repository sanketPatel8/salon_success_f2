-- Salon Success Manager - Database Initialization Script
-- This script runs when the PostgreSQL container starts for the first time

-- Create the main database if it doesn't exist
-- (This is handled by POSTGRES_DB environment variable)

-- Set up extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE salon_success_manager TO salon_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO salon_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO salon_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO salon_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO salon_user;
