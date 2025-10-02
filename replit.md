# Salon Success Manager - Replit.md

## Overview

Salon Success Manager is a comprehensive business management platform designed specifically for salon and beauty business owners. The application provides tools for financial planning, expense tracking, profit analysis, and business growth insights. It features a 14-day free trial system with automatic billing through Stripe integration.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Session Management**: Express-session with in-memory store (MemoryStore)
- **Authentication**: Session-based authentication with bcrypt password hashing
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)

### Key Components

#### Database Schema
- **Users**: Core user information with subscription status tracking
- **Sessions**: Session storage for authentication
- **Hourly Rate Calculations**: Business cost and hourly rate calculations
- **Treatments**: Service offerings with profit margin analysis
- **Expenses**: Business expense tracking with categorization
- **Businesses**: Multi-business management support
- **Weekly Incomes**: CEO numbers tracking system
- **Income Goals**: Revenue target setting and tracking
- **Stock Purchases**: Inventory and stock budget management

#### Authentication System
- Simple session-based authentication using express-session
- Password reset functionality with email integration
- Trial period management integrated with user accounts
- Multiple email providers supported (SendGrid, Gmail SMTP, Ionos SMTP)

#### Payment Integration
- Stripe integration for subscription management
- 14-day free trial system with automatic billing
- Webhook handling for subscription status updates
- £23.97/month recurring subscription model

## Data Flow

1. **User Registration**: Creates user account with 14-day trial period
2. **Trial Management**: TrialManager class tracks access permissions
3. **Business Tools**: Authenticated users access calculation and tracking tools
4. **Subscription Flow**: Stripe handles payment processing and subscription management
5. **Data Persistence**: All business data stored in PostgreSQL via Drizzle ORM

## External Dependencies

### Payment Processing
- **Stripe**: Subscription management, payment processing, and webhooks
- **Stripe Elements**: Frontend payment form integration

### Email Services
- **SendGrid**: Primary email service for transactional emails
- **Gmail SMTP**: Alternative email provider
- **Ionos SMTP**: Additional email provider option

### Database
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database operations
- **WebSocket**: Real-time database connections

### Development Tools
- **Replit**: Development environment and deployment platform
- **Vite**: Build tool with hot module replacement
- **TypeScript**: Type safety across frontend and backend

## Deployment Strategy

The application is configured for deployment on Replit's autoscale infrastructure:

- **Build Command**: `npm run build` - Compiles both frontend and backend
- **Start Command**: `npm run start` - Runs production server
- **Development**: `npm run dev` - Runs development server with hot reload
- **Port Configuration**: Internal port 5000, external port 80
- **Database**: Automatic PostgreSQL provisioning through Replit

## Changelog

Changelog:
- September 8, 2025. Enhanced ActiveCampaign integration with automatic tagging for new user signups. Users are now automatically tagged with "salonsuccessmanager" when they register or sign up, in addition to being added to the KG Business Mentor list. The system creates the tag if it doesn't exist and applies it to both new and existing contacts during signup process. Fixed critical list assignment issue where ACTIVECAMPAIGN_LIST_ID environment variable contained a full URL instead of numeric ID, causing 500 errors during list assignment. Successfully resolved session callback issues by moving ActiveCampaign integration to execute immediately after user creation rather than within session save callbacks. The integration now properly tags new users and adds them to the KG Business Mentor list as intended.
- September 2, 2025. Implemented comprehensive developer notification system for new user registrations. Added email notifications to help@salonsuccessmanager.com for all user activities: registration, promo code usage (CLIENT6FREE), subscription creation, and payment success events. Notifications include user details, business type, signup method, and quick action items for follow-up.
- September 2, 2025. Fixed hourly rate calculator number input formatting for Safari and international usage. Added support for comma-separated numbers (10,000), changed inputs from 'number' to 'text' type for Safari compatibility, implemented automatic comma formatting as users type, and updated parsing to handle commas properly when calculating rates. Calculator now works consistently across all browsers.
- August 21, 2025. Fixed CLIENT6FREE promo code authentication flow completely. Resolved race condition where Stripe subscription creation was overriding promo code status by adding free_access check in create-subscription route. Updated frontend to avoid problematic redirects that lose session cookies. CLIENT6FREE users now get immediate dashboard access with 6 months free access to all business tools.
- August 21, 2025. Enhanced registration page with password confirmation and visibility toggles. Added password confirmation field with matching validation, eye/eye-off icons for password visibility, and improved form security. Updated reset password page to use consistent help@salonsuccessmanager.com contact email.
- August 21, 2025. Fixed stock budget calculator "Add Purchase" button not responding. Resolved identical schema validation issue where userId was required in insertStockPurchaseSchema but should be added by server. Updated insertStockPurchaseSchema to exclude userId from validation. Stock purchase creation now works properly with automatic budget calculations and purchase history tracking.
- August 21, 2025. Fixed validation error in profit margin calculator preventing treatment creation. Resolved schema validation issue where userId was required in request body but should be added by server. Updated insertTreatmentSchema to exclude userId from validation. Treatment creation now works properly with automatic profit margin calculations.
- August 20, 2025. Fixed critical payment system issue preventing subscription form loading. Resolved "unable to load payment form" error by implementing Setup Intent approach for payment method collection. Switched from payment intent-based subscriptions to Setup Intent + subscription model, ensuring proper client secret generation for Stripe Elements integration. Payment system now fully functional with proper recurring payment setup.
- August 14, 2025. Updated application branding from "Salon Growth Manager" to "Salon Success Manager" across all pages, titles, and documentation. Added AED (UAE Dirham) currency support for international clients. Completed comprehensive currency context integration ensuring all pages respond to currency selection changes.
- July 6, 2025. Fixed PDF and CSV export functionality in Reports page. Replaced browser print dialog with proper jsPDF library for direct PDF downloads. Removed "opening email client" notifications for cleaner user experience. Export buttons now generate downloadable files immediately without dialog popups.
- June 15, 2025. Updated income goals system to work on individual businesses instead of brand-wide goals. Added business selection field to income goals form, implemented business-specific filtering and progress tracking, and fixed cache invalidation for proper goal updates.
- June 15, 2025. Implemented customizable money pot system to replace fixed VAT/Tax and Profit allocations. Users can now create custom income categories with personalized names, percentages, and colors for flexible business income management.
- June 14, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.