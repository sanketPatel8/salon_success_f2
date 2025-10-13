import 'dotenv/config';
import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import nodemailer from 'nodemailer';
import crypto from 'crypto';
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
  apiVersion: "2025-09-30.clover",
});

export async function registerRoutes(app: Express): Promise<Server> {


  // In your Express server (e.g., server/index.ts or routes file)
  app.get('/api/config/price-id', (req, res) => {
    res.json({ priceId: process.env.VITE_PRICE_ID });
  });
  

  app.post('/api/stripe/create-checkout-session', async (req, res) => {
    try {
      const { priceId } = req.body;

      console.log('=== Create Checkout Session Called ===');
      console.log('Request body:', req.body);
      console.log('Price ID:', priceId);

      // Validate priceId
      if (!priceId) {
        console.error('❌ No priceId provided');
        return res.status(400).json({ error: 'Price ID is required' });
      }

      // Get user from session if authenticated
      const userId = req.session?.userId;
      const user = userId ? await storage.getUser(userId) : null;

      console.log('✅ Using Stripe Payment Link');
      console.log('User ID:', userId || 'Guest');

      // Your Stripe Payment Link (with trial configured in Stripe Dashboard)
      let paymentLinkUrl = process.env.NEXT_PUBLIC_PAYMENT_LINK;

      // ✅ METHOD 1: Add client_reference_id as URL parameter
      // This will be passed to the checkout session
      if (user) {
        const params = new URLSearchParams({
          client_reference_id: userId.toString(),
          prefilled_email: user.email,
        });
        
        paymentLinkUrl = `${paymentLinkUrl}?${params.toString()}`;
        
        console.log('✅ Payment link with user tracking:', paymentLinkUrl);
      }

      return res.status(200).json({ 
        url: paymentLinkUrl
      });

    } catch (error: any) {
      console.error('=== Stripe Checkout Error ===');
      console.error('Error type:', error.type);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      
      return res.status(500).json({ 
        error: error.message || 'Failed to create checkout session',
        details: error.type || 'unknown_error'
      });
    }
  });

  app.post('/api/stripe/create-session', async (req, res) => {
    try {
      const { priceId } = req.body;

      console.log('=== Create Checkout Session Called ===');
      console.log('Request body:', req.body);
      console.log('Price ID:', priceId);

      // Validate priceId
      if (!priceId) {
        console.error('❌ No priceId provided');
        return res.status(400).json({ error: 'Price ID is required' });
      }

      // Get user from session if authenticated
      const userId = req.session?.userId;
      const user = userId ? await storage.getUser(userId) : null;

      console.log('✅ Creating Stripe Checkout Session');
      console.log('User ID:', userId || 'Guest');

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.BASE_URL}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BASE_URL}/cancel`,
        client_reference_id: userId?.toString(),
        customer_email: user?.email,
      });

      console.log('✅ Checkout session created:', session.id);
      console.log('Session URL:', session.url);

      return res.status(200).json({ 
        url: session.url
      });

    } catch (error: any) {
      console.error('=== Stripe Checkout Error ===');
      console.error('Error type:', error.type);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      
      return res.status(500).json({ 
        error: error.message || 'Failed to create checkout session',
        details: error.type || 'unknown_error'
      });
    }
  });

  // Test route for Stripe checkout
  app.get('/api/stripe/test', (req, res) => {
    res.json({ 
      message: 'Stripe routes are working!',
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/stripe/verify-session/:sessionId', requireAuth, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (!user) return res.status(404).json({ message: 'User not found' });

      console.log(`\n🧩 [verify-session] Starting for user ${userId}, session ${sessionId}`);
      console.log('👤 User:', { id: user.id, email: user.email, stripeCustomerId: user.stripeCustomerId });

      // 🔹 Retrieve Stripe checkout session
      let session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
      console.log('📡 Stripe session retrieved:', session);

      // 🔹 Normalize subscription object
      let subscription: any = session.subscription;
      if (typeof subscription === 'string') {
        subscription = await stripe.subscriptions.retrieve(subscription);
        console.log('🔄 Fetched subscription object from Stripe:', subscription);
      }

      // 🔹 Update Stripe info if missing
      if (!user.stripeCustomerId || !user.stripeSubscriptionId) {
        console.log('🔧 Updating Stripe info in DB');
        await storage.updateUserStripeInfo(user.id, subscription.customer, subscription.id);
      }

      // 🔹 Define now for date calculations
      const now = new Date();

      // 🔹 Handle free access
      if (user.subscriptionStatus === 'free_access') {
        console.log('🎁 User has free_access status');
        return res.json({
          status: 'free_access',
          hasAccess: true,
          isTrial: false,
        });
      }

      // 🔹 If user has trial status but no subscription ID yet, check with Stripe
      if (!user.stripeSubscriptionId && user.stripeCustomerId) {
        console.log('⏳ No subscription ID, checking Stripe for customer subscriptions...');
        try {
          const subscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            limit: 1,
            status: 'all',
          });

          if (subscriptions.data.length > 0) {
            const subscription = subscriptions.data[0];
            console.log('✅ Found subscription in Stripe:', subscription.id);

            // Update database with the subscription ID
            await storage.updateUserStripeInfo(
              user.id,
              user.stripeCustomerId,
              subscription.id
            );

            // Normalize status
            const statusMap: Record<string, string> = {
              trialing: 'trial',
              active: 'active',
              past_due: 'past_due',
              canceled: 'canceled',
              incomplete: 'incomplete',
              incomplete_expired: 'incomplete',
            };
            const normalizedStatus = statusMap[subscription.status] || 'inactive';
            console.log('📊 Stripe status → normalizedStatus:', subscription.status, '→', normalizedStatus);
            
            const stripeEndUnix = subscription.trial_end ?? subscription.current_period_end;
            
            // Validate timestamp
            if (!stripeEndUnix || typeof stripeEndUnix !== 'number') {
              console.error('❌ Invalid timestamp from Stripe in subscription list:', stripeEndUnix);
              // Fallback to a default trial period
              const endDate = new Date(now);
              endDate.setDate(endDate.getDate() + 15);
              const daysLeft = 15;
              
              await storage.updateSubscriptionStatus(user.id, normalizedStatus, endDate.toISOString());

              const isTrial = normalizedStatus === 'trial';

              return res.json({
                status: normalizedStatus,
                hasAccess: ['active', 'trial'].includes(normalizedStatus),
                endDate: endDate,
                isTrial: isTrial,
                daysLeft: daysLeft,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                amount: subscription.items.data[0]?.price.unit_amount,
                currency: subscription.items.data[0]?.price.currency,
              });
            }
            
            const endDate = new Date(stripeEndUnix * 1000);
            
            // Validate the resulting date
            if (isNaN(endDate.getTime())) {
              console.error('❌ Invalid date from timestamp:', stripeEndUnix);
              const fallbackEndDate = new Date(now);
              fallbackEndDate.setDate(fallbackEndDate.getDate() + 15);
              
              await storage.updateSubscriptionStatus(user.id, normalizedStatus, fallbackEndDate.toISOString());

              return res.json({
                status: normalizedStatus,
                hasAccess: ['active', 'trial'].includes(normalizedStatus),
                endDate: fallbackEndDate,
                isTrial: normalizedStatus === 'trial',
                daysLeft: 15,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                amount: subscription.items.data[0]?.price.unit_amount,
                currency: subscription.items.data[0]?.price.currency,
              });
            }
            
            const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            await storage.updateSubscriptionStatus(user.id, normalizedStatus, endDate.toISOString());

            const isTrial = normalizedStatus === 'trial';

            return res.json({
              status: normalizedStatus,
              hasAccess: ['active', 'trial'].includes(normalizedStatus),
              endDate: endDate,
              isTrial: isTrial,
              daysLeft: daysLeft,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              amount: subscription.items.data[0]?.price.unit_amount,
              currency: subscription.items.data[0]?.price.currency,
            });
          }
        } catch (stripeError) {
          console.error('❌ Error fetching subscriptions from Stripe:', stripeError);
        }
      }

      // 🔹 If status is trial but no subscription found, calculate trial end date
      if (user.subscriptionStatus === 'trial') {
        console.log('⚠️ Trial status in DB but no Stripe subscription found, granting access');
        
        // Calculate trial end date (15 days from creation)
        const createdAt = user.createdAt ? new Date(user.createdAt) : now;
        const trialEndDate = new Date(createdAt);
        trialEndDate.setDate(trialEndDate.getDate() + 15);
        const daysLeft = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        
        return res.json({
          status: 'trial',
          hasAccess: true,
          endDate: trialEndDate,
          isTrial: true,
          daysLeft: daysLeft,
        });
      }

      // 🔹 If no subscription ID exists
      if (!user.stripeSubscriptionId) {
        console.log('❌ No subscription ID found');
        return res.json({
          status: user.subscriptionStatus || 'none',
          hasAccess: false,
          endDate: null,
          isTrial: false,
          daysLeft: null,
        });
      }

      // 🔹 Get subscription from Stripe
      console.log('🔍 Fetching subscription from Stripe:', user.stripeSubscriptionId);

      // Normalize status
      const statusMap: Record<string, string> = {
        trialing: 'trial',
        active: 'active',
        past_due: 'past_due',
        canceled: 'canceled',
        incomplete: 'incomplete',
        incomplete_expired: 'incomplete',
      };
      const normalizedStatus = statusMap[subscription.status] || 'inactive';
      console.log('📊 Stripe status → normalizedStatus:', subscription.status, '→', normalizedStatus);

      const isTrial = normalizedStatus === 'trial';

      // Calculate end date from Stripe subscription with validation
      const stripeEndUnix = subscription.trial_end ?? subscription.current_period_end;
      
      // Validate the timestamp before creating Date
      if (!stripeEndUnix || typeof stripeEndUnix !== 'number') {
        console.error('❌ Invalid timestamp from Stripe:', stripeEndUnix);
        return res.status(500).json({
          message: 'Invalid subscription date from Stripe',
          error: 'Missing or invalid end date'
        });
      }

      const endDate = new Date(stripeEndUnix * 1000);
      
      // Validate the resulting date
      if (isNaN(endDate.getTime())) {
        console.error('❌ Invalid date created from timestamp:', stripeEndUnix);
        return res.status(500).json({
          message: 'Failed to parse subscription date',
          error: 'Invalid time value'
        });
      }

      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      console.log("💾 Ending Date full", subscription.trial_end);
      console.log("💾 End Date calculated:", endDate.toISOString());

      // 🔹 Update local database
      console.log('💾 Updating subscription in DB...');
      await storage.updateSubscriptionStatus(user.id, normalizedStatus, endDate.toISOString());

      console.log(`✅ Subscription retrieved for user ${user.email}: status=${normalizedStatus}, endDate=${endDate.toISOString()}`);

      res.json({
        status: normalizedStatus,
        hasAccess: ['active', 'trial'].includes(normalizedStatus),
        endDate: endDate,
        isTrial: isTrial,
        daysLeft: daysLeft,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        amount: subscription.items.data[0]?.price.unit_amount,
        currency: subscription.items.data[0]?.price.currency,
      });

    } catch (error: any) {
      console.error('❌ [verify-session] Fatal error:', error);
      res.status(500).json({
        message: 'Failed to verify session',
        error: error.message
      });
    }
  });

  app.get('/api/stripe/subscription', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ 
          hasAccess: false,
          status: 'not_found',
          isTrial: false,
          daysLeft: null
        });
      }

      // Check for free access (promo code)
      if (user.subscriptionStatus === 'free_access') {
        const daysLeft = user.subscriptionEndDate 
          ? Math.ceil((new Date(user.subscriptionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;
        
        return res.json({
          hasAccess: true,
          status: 'free_access',
          isTrial: false,
          daysLeft: daysLeft
        });
      }

      // Check for active paid subscription
      if (user.subscriptionStatus === 'active') {
        return res.json({
          hasAccess: true,
          status: 'active',
          isTrial: false,
          daysLeft: null
        });
      }

      // Check for trial subscription
      if (user.subscriptionStatus === 'trial' && user.subscriptionEndDate) {
        const now = new Date();
        const trialEnd = new Date(user.subscriptionEndDate);
        
        if (now <= trialEnd) {
          const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return res.json({
            hasAccess: true,
            status: 'trial',
            isTrial: true,
            daysLeft: daysLeft
          });
        } else {
          // Trial expired
          await storage.updateSubscriptionStatus(user.id, 'expired');
          return res.json({
            hasAccess: false,
            status: 'expired',
            isTrial: false,
            daysLeft: 0
          });
        }
      }

      // No valid subscription
      return res.json({
        hasAccess: false,
        status: user.subscriptionStatus || 'none',
        isTrial: false,
        daysLeft: null
      });

    } catch (error) {
      console.error('Subscription check error:', error);
      return res.status(500).json({ 
        hasAccess: false,
        status: 'error',
        isTrial: false,
        daysLeft: null
      });
    }
  });

  app.get('/subscription-status', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ 
          hasAccess: false,
          status: 'not_found',
          isTrial: false,
          daysLeft: null,
          cancelAtPeriodEnd: false
        });
      }

      // Check for free access (promo code)
      if (user.subscriptionStatus === 'free_access') {
        const daysLeft = user.subscriptionEndDate 
          ? Math.ceil((new Date(user.subscriptionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;
        
        return res.json({
          hasAccess: true,
          status: 'free_access',
          isTrial: false,
          daysLeft: daysLeft,
          endDate: user.subscriptionEndDate,
          cancelAtPeriodEnd: false
        });
      }

      // Check for active paid subscription with Stripe - ALWAYS check Stripe first if ID exists
      if (user.stripeSubscriptionId) {
        try {
          // CRITICAL FIX: Expand subscription to get ALL fields including current_period_end
          const subscription = await stripe.subscriptions.retrieve(
            user.stripeSubscriptionId,
            { 
              expand: ['customer', 'items.data.price', 'latest_invoice']
            }
          );
          
          console.log('📦 Subscription retrieved with full data:', {
            id: subscription.id,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
            current_period_start: subscription.current_period_start,
            trial_end: subscription.trial_end,
            billing_cycle_anchor: subscription.billing_cycle_anchor,
          });
          
          // Calculate end date with proper fallback
          let endDateTimestamp: number | undefined;
          
          // Priority order: current_period_end > items[0].current_period_end > trial_end > billing_cycle_anchor+1month
          if (subscription.current_period_end) {
            endDateTimestamp = subscription.current_period_end;
          } else if (subscription.items?.data?.[0]?.current_period_end) {
            endDateTimestamp = subscription.items.data[0].current_period_end;
            console.log('Using items[0].current_period_end:', endDateTimestamp);
          } else if (subscription.trial_end) {
            endDateTimestamp = subscription.trial_end;
          } else if (subscription.billing_cycle_anchor) {
            // WARNING: billing_cycle_anchor is START date, add 1 month for end date
            const anchor = subscription.billing_cycle_anchor;
            const anchorDate = new Date(anchor * 1000);
            anchorDate.setMonth(anchorDate.getMonth() + 1);
            endDateTimestamp = Math.floor(anchorDate.getTime() / 1000);
            console.warn('⚠️ Using billing_cycle_anchor as fallback - adding 1 month');
          }
          
          if (!endDateTimestamp) {
            console.error('❌ No valid timestamp found in subscription');
            throw new Error('Invalid subscription data: no end date');
          }
          
          const endDate = new Date(endDateTimestamp * 1000);
          
          console.log('📅 Calculated end date:', {
            timestamp: endDateTimestamp,
            iso: endDate.toISOString(),
            readable: endDate.toLocaleString('en-US', { timeZone: 'UTC' }),
          });
          
          // Update local storage with current Stripe status
          await storage.updateSubscriptionStatus(user.id, subscription.status, endDate);
          
          console.log('✓ Stripe subscription retrieved:', {
            id: subscription.id,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            endDate: endDate.toISOString()
          });
          
          return res.json({
            hasAccess: subscription.status === 'active' || subscription.status === 'trialing',
            status: subscription.status,
            isTrial: subscription.status === 'trialing',
            daysLeft: subscription.status === 'trialing' 
              ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null,
            endDate: endDate.toISOString(),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            amount: subscription.items.data[0]?.price?.unit_amount,
            currency: subscription.items.data[0]?.price?.currency,
            subscriptionId: subscription.id
          });
        } catch (stripeError) {
          console.error('Error fetching Stripe subscription:', stripeError);
          // Fall through to local status check only if Stripe fails
        }
      }

      // Check for trial subscription (local only)
      if (user.subscriptionStatus === 'trial' && user.subscriptionEndDate) {
        const now = new Date();
        const trialEnd = new Date(user.subscriptionEndDate);
        
        if (now <= trialEnd) {
          const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return res.json({
            hasAccess: true,
            status: 'trial',
            isTrial: true,
            daysLeft: daysLeft,
            endDate: trialEnd.toISOString(),
            cancelAtPeriodEnd: false
          });
        } else {
          // Trial expired
          await storage.updateSubscriptionStatus(user.id, 'expired');
          return res.json({
            hasAccess: false,
            status: 'expired',
            isTrial: false,
            daysLeft: 0,
            endDate: trialEnd.toISOString(),
            cancelAtPeriodEnd: false
          });
        }
      }

      // Check for active subscription (backward compatibility)
      if (user.subscriptionStatus === 'active') {
        return res.json({
          hasAccess: true,
          status: 'active',
          isTrial: false,
          daysLeft: null,
          endDate: user.subscriptionEndDate,
          cancelAtPeriodEnd: false
        });
      }

      // No valid subscription
      return res.json({
        hasAccess: false,
        status: user.subscriptionStatus || 'none',
        isTrial: false,
        daysLeft: null,
        endDate: null,
        cancelAtPeriodEnd: false
      });

    } catch (error) {
      console.error('Subscription status check error:', error);
      return res.status(500).json({ 
        hasAccess: false,
        status: 'error',
        isTrial: false,
        daysLeft: null,
        endDate: null,
        cancelAtPeriodEnd: false
      });
    }
  });

  // Cancel subscription endpoint
  app.post('/cancel-subscription', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Get subscriptionId from database
    const subscriptionId = user.stripeSubscriptionId;
    
    if (!subscriptionId) {
      return res.status(400).json({ 
        success: false,
        message: 'No active subscription found' 
      });
    }

    // Cancel the subscription at period end (don't immediately revoke access)
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    // Update local status
    const stripeEndUnix = subscription.current_period_end != null 
  ? subscription.current_period_end 
  : subscription.trial_end;
    const endDate = new Date(stripeEndUnix * 1000);

    console.log(`✓ Subscription ${subscriptionId} cancelled at period end for user: ${user.email}`);

    res.json({ 
      success: true,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      endDate: endDate.toISOString(),
      message: 'Subscription will be cancelled at the end of the billing period'
    });

  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to cancel subscription'
    });
  }
});

  // Reactivate subscription endpoint
  app.post('/reactivate-subscription', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      

      const user = await storage.getUser(userId);
      
      if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Get subscriptionId from database
    const subscriptionId = user.stripeSubscriptionId;
    
    if (!subscriptionId) {
      return res.status(400).json({ 
        success: false,
        message: 'No active subscription found' 
      });
    }

      // Reactivate the subscription (remove cancel_at_period_end)
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
      });

      // Update local status
      const stripeEndUnix = subscription.current_period_end != null 
  ? subscription.current_period_end 
  : subscription.trial_end;
      const endDate = new Date(stripeEndUnix * 1000);
     

      console.log(`✓ Subscription ${subscriptionId} reactivated for user: ${user.email}`);

      res.json({ 
        success: true,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        endDate: endDate.toISOString(),
        message: 'Subscription reactivated successfully'
      });

    } catch (error: any) {
      console.error('Reactivate subscription error:', error);
      res.status(500).json({ 
        success: false,
        message: error.message || 'Failed to reactivate subscription'
      });
    }
  });


  

  // Password reset request
  app.post("/api/v2/auth/reset-password", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: "Email is required" 
      });
    }
    
    const user = await storage.getUserByEmail(email);
    
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Store reset token in database
    await storage.setPasswordResetToken(user.id, resetToken, resetExpires);
    
    // Create reset URL
    
    const resetUrl = `salonsuccessmanager.com/reset-password?token=${resetToken}`;

    console.log('🔍 Checking environment variables:', {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD ? '***set***' : 'MISSING',
});
    
    // Email configuration for Ionos
    const emailConfig = {
      host: process.env.SMTP_HOST ,
      port: parseInt(process.env.SMTP_PORT ),
      secure: false, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER ,
        pass: process.env.SMTP_PASSWORD 
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    };
    
    console.log('📧 Attempting to send email with config:', {
      host: emailConfig.host,
      port: emailConfig.port,
      user: emailConfig.auth.user,
      to: email
    });
    
    const transporter = nodemailer.createTransport(emailConfig);
    
    // Verify transporter configuration
    try {
      await transporter.verify();
      console.log('✓ SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('✗ SMTP verification failed:', verifyError);
      return res.json({ 
        success: true, // Still return success for security
        message: "Password reset processed",
        emailSent: false,
        error: process.env.NODE_ENV === 'development' ? verifyError.message : undefined
      });
    }
    
    // Email template
    const mailOptions = {
      from: `"Katie Godfrey Business Coach" <${emailConfig.auth.user}>`,
      to: email,
      subject: 'Reset Your Password - Katie Godfrey Business Coach',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: white;
            }
            .header { 
              text-align: center; 
              padding: 40px 20px 20px; 
              background: linear-gradient(135deg, #fce7f3 0%, #f3e8ff 100%);
            }
            .header h1 {
              color: #ec4899;
              margin: 0;
              font-size: 28px;
            }
            .content { 
              padding: 40px 30px; 
            }
            .button-container {
              text-align: center;
              margin: 30px 0;
            }
            .button { 
              display: inline-block; 
              padding: 14px 40px; 
              background: #ec4899; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 8px; 
              font-weight: 600;
              font-size: 16px;
            }
            .footer { 
              text-align: center; 
              padding: 30px 20px; 
              font-size: 13px; 
              color: #6b7280;
              background: #f9fafb;
              border-top: 1px solid #e5e7eb;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 12px 15px;
              margin: 20px 0;
              border-radius: 4px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <p style="font-size: 16px; margin-bottom: 10px;">Hello,</p>
              <p style="font-size: 15px; color: #4b5563;">
                You requested to reset your password for your Katie Godfrey Business Coach account.
              </p>
              <p style="font-size: 15px; color: #4b5563;">
                Click the button below to create a new password:
              </p>
              <div class="button-container">
                <a href="${resetUrl}" class="button">Reset My Password</a>
              </div>
              <div class="warning">
                <strong>⏰ Important:</strong> This link will expire in 1 hour for security reasons.
              </div>
              <p style="font-size: 14px; color: #6b7280; margin-top: 25px;">
                If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 5px 0;">© ${new Date().getFullYear()} Katie Godfrey Business Coach</p>
              <p style="margin: 5px 0;">
                Need help? Contact us at 
                <a href="mailto:help@salonsuccessmanager.com" style="color: #ec4899; text-decoration: none;">
                  help@salonsuccessmanager.com
                </a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Password Reset Request

Hello,

You requested to reset your password for your Katie Godfrey Business Coach account.

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email.

© ${new Date().getFullYear()} Katie Godfrey Business Coach
Need help? Contact us at help@salonsuccessmanager.com
      `
    };
    
    // Send email with detailed error handling
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✓ Password reset email sent successfully:', {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
        to: email
      });
      
      // Return detailed success response
      res.json({ 
        success: true,
        message: "Password reset link sent successfully",
        emailSent: true
      });
      
    } catch (emailError) {
      console.error('✗ Failed to send email:', {
        error: emailError.message,
        code: emailError.code,
        command: emailError.command,
        response: emailError.response
      });
      
      // Still return success for security, but flag that email wasn't sent
      return res.json({ 
        success: true,
        message: "Password reset processed",
        emailSent: false
      });
    }
    
  } catch (error) {
    console.error('✗ Password reset error:', error);
    res.status(500).json({ 
      success: false,
      message: "Password reset failed",
      emailSent: false
    });
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
        apiVersion: "2025-09-30.clover",
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
        apiVersion: "2025-09-30.clover",
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

  

  // Email report endpoint
  app.post('/api/email-report', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { currencySymbol } = req.body; // Get currency symbol from request body with fallback
      
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

      // Generate HTML email content with dynamic currency
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
              <div class="metric-value">${currencySymbol}${hourlyRateCalc?.calculatedRate || '0'}/hr</div>
              <div class="metric-label">Current Hourly Rate</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${currencySymbol}${totalMonthlyRevenue.toFixed(2)}</div>
              <div class="metric-label">Monthly Revenue</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${currencySymbol}${totalExpenses.toFixed(2)}</div>
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
                    <td>${currencySymbol}${parseFloat(t.price?.toString() || '0').toFixed(2)}</td>
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
                    <td>${currencySymbol}${parseFloat(e.amount.toString()).toFixed(2)}</td>
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
              body: `Please find your business performance report below:\n\nKey Metrics:\n- Current Hourly Rate: ${currencySymbol}${hourlyRateCalc?.calculatedRate || '0'}/hr\n- Monthly Revenue: ${currencySymbol}${totalMonthlyRevenue.toFixed(2)}\n- Total Treatments: ${treatments.length}\n- Total Expenses: ${currencySymbol}${totalExpenses.toFixed(2)}\n\nGenerated on ${new Date().toLocaleDateString()}`
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
            body: `Please find your business performance report below:\n\nKey Metrics:\n- Current Hourly Rate: ${currencySymbol}${hourlyRateCalc?.calculatedRate || '0'}/hr\n- Monthly Revenue: ${currencySymbol}${totalMonthlyRevenue.toFixed(2)}\n- Total Treatments: ${treatments.length}\n- Total Expenses: ${currencySymbol}${totalExpenses.toFixed(2)}\n\nGenerated on ${new Date().toLocaleDateString()}`
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
