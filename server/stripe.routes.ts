import type { Express } from 'express';
import { stripe, getOrCreatePriceId, STRIPE_CONFIG } from './stripe.config.ts';
import { storage } from './storage';
import { requireAuth } from './simple-auth';

export function setupStripeRoutes(app: Express) {

  // ✅ Verify checkout session - Fully Safe & Updated Version
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
            const endDate = new Date(stripeEndUnix * 1000);
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

      // Calculate end date from Stripe subscription
      const stripeEndUnix = subscription.trial_end ?? subscription.current_period_end;
      const endDate = new Date(stripeEndUnix * 1000);
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      console.log("💾 Ending Date full", subscription.trial_end);

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

  // Get subscription details - FIXED VERSION
  app.get('/api/stripe/subscription', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      console.log('\n📊 [subscription] Checking subscription for user:', {
        id: user.id,
        email: user.email,
        status: user.subscriptionStatus,
        customerId: user.stripeCustomerId,
        subscriptionId: user.stripeSubscriptionId,
        createdAt: user.createdAt
      });

      // 🔹 Calculate endDate based on creation date with safety check
      const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();
      const now = new Date();
      
      // Validate the date
      if (isNaN(createdAt.getTime())) {
        console.error('❌ Invalid createdAt date, using current date as fallback');
        createdAt.setTime(now.getTime());
      }
      
      console.log('📅 User createdAt:', createdAt.toISOString());
      console.log('⏰ Current time:', now.toISOString());

      // 🔹 Handle free access
      if (user.subscriptionStatus === 'free_access') {
        console.log('🎁 User has free_access status');
        return res.json({
          success: true,
          status: 'free_access',
          hasAccess: true,
          isTrial: false,
        });
      }

      // 🔹 If no Stripe customer ID, return current status
      if (!user.stripeCustomerId) {
        console.log('⚠️ No Stripe customer ID found');
        
        // Calculate trial end date if user has trial status
        let trialEndDate = null;
        let daysLeft = null;
        
        if (user.subscriptionStatus === 'trial') {
          trialEndDate = new Date(createdAt);
          trialEndDate.setDate(trialEndDate.getDate() + 15);
          daysLeft = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }
        
        return res.json({
          success: true,
          status: user.subscriptionStatus || 'inactive',
          hasAccess: user.subscriptionStatus === 'trial',
          endDate: trialEndDate,
          isTrial: user.subscriptionStatus === 'trial',
          daysLeft: daysLeft,
        });
      }

      // 🔹 If user has trial status but no subscription ID yet, check with Stripe
      if (!user.stripeSubscriptionId) {
        console.log('⏳ No subscription ID, checking Stripe for customer subscriptions...');
        try {
          const subscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            limit: 1,
            status: 'all',
          });

          if (subscriptions.data.length > 0) {
            const subscription = subscriptions.data[0];
            console.log("✅ all data for subscription", subscription)
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

            // Calculate proper endDate from Stripe
            const stripeEndUnix = subscription.trial_end ?? subscription.current_period_end;
            const endDate = new Date(stripeEndUnix * 1000);

            const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            console.log("days left in end subscription", daysLeft);
            console.log("📊 Stripe end date :", endDate);
            
            await storage.updateSubscriptionStatus(user.id, normalizedStatus, endDate.toISOString());

            const isTrial = normalizedStatus === 'trial';

            return res.json({
              success: true,
              status: normalizedStatus,
              subscriptionId: subscription.id,
              hasAccess: ['active', 'trial'].includes(normalizedStatus),
              endDate: endDate,
              isTrial: isTrial,
              daysLeft: daysLeft,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              amount: subscription.items.data[0]?.price.unit_amount,
              currency: subscription.items.data[0]?.price.currency,
            });
          } else {
            console.log('⚠️ No subscriptions found in Stripe');
            // Return trial status if user has it
            if (user.subscriptionStatus === 'trial') {
              const trialEndDate = new Date(createdAt);
              trialEndDate.setDate(trialEndDate.getDate() + 15);
              const daysLeft = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
              
              return res.json({
                success: true,
                status: 'trial',
                hasAccess: true,
                endDate: trialEndDate,
                isTrial: true,
                daysLeft: daysLeft,
              });
            }
            
            return res.json({
              success: true,
              status: user.subscriptionStatus || 'inactive',
              hasAccess: false,
              endDate: null,
              isTrial: false,
              daysLeft: null,
            });
          }
        } catch (stripeError) {
          console.error('❌ Error fetching subscriptions from Stripe:', stripeError);
          
          // Calculate trial dates for fallback
          let trialEndDate = null;
          let daysLeft = null;
          
          if (user.subscriptionStatus === 'trial') {
            trialEndDate = new Date(createdAt);
            trialEndDate.setDate(trialEndDate.getDate() + 15);
            daysLeft = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          }
          
          // Return current status on error
          return res.json({
            success: true,
            status: user.subscriptionStatus || 'inactive',
            hasAccess: user.subscriptionStatus === 'trial',
            endDate: trialEndDate,
            isTrial: user.subscriptionStatus === 'trial',
            daysLeft: daysLeft,
          });
        }
      }

      // 🔹 Get subscription from Stripe using subscriptionId
      console.log('🔍 Fetching subscription from Stripe:', user.stripeSubscriptionId);
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      console.log('📡 Stripe subscription retrieved:', subscription);

      // 🔹 Normalize status
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

      // Calculate proper endDate from Stripe
      const stripeEndUnix = subscription.trial_end ?? subscription.current_period_end;
      const endDate = new Date(stripeEndUnix * 1000);
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      console.log("💾 Ending Date full", subscription.trial_end);

      // 🔹 Update subscription in DB
      console.log('💾 Updating subscription in DB...');
      await storage.updateSubscriptionStatus(user.id, normalizedStatus, endDate.toISOString());

      console.log(`✅ Subscription updated for user ${user.email}: status=${normalizedStatus}, endDate=${endDate.toISOString()}`);

      const isTrial = normalizedStatus === 'trial';

      return res.json({
        success: true,
        status: normalizedStatus,
        subscriptionId: subscription.id,
        hasAccess: ['active', 'trial'].includes(normalizedStatus),
        endDate: endDate,
        isTrial: isTrial,
        daysLeft: daysLeft,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        amount: subscription.items.data[0]?.price.unit_amount,
        currency: subscription.items.data[0]?.price.currency,
      });

    } catch (error: any) {
      console.error('❌ [subscription] Fatal error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to get subscription details', 
        error: error.message 
      });
    }
  });

  // Create customer portal session
  app.post('/api/stripe/create-portal-session', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ 
          message: 'No Stripe customer found' 
        });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${process.env.BASE_URL || req.headers.origin}/subscription`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Portal session error:', error);
      res.status(500).json({ 
        message: 'Failed to create portal session',
        error: error.message 
      });
    }
  });

  // Cancel subscription
  app.post('/api/stripe/cancel-subscription', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (!user || !user.stripeSubscriptionId) {
        return res.status(400).json({ 
          message: 'No active subscription found' 
        });
      }

      const subscription = await stripe.subscriptions.update(
        user.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );

      const stripeEndUnix = subscription.trial_end ?? subscription.current_period_end;
      const endDate = new Date(stripeEndUnix * 1000);

      res.json({
        message: 'Subscription will be cancelled at period end',
        cancelAt: endDate,
      });
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({ 
        message: 'Failed to cancel subscription',
        error: error.message 
      });
    }
  });

  // Reactivate subscription
  app.post('/api/stripe/reactivate-subscription', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (!user || !user.stripeSubscriptionId) {
        return res.status(400).json({ 
          message: 'No subscription found' 
        });
      }

      const subscription = await stripe.subscriptions.update(
        user.stripeSubscriptionId,
        {
          cancel_at_period_end: false,
        }
      );

      res.json({
        message: 'Subscription reactivated successfully',
        status: subscription.status,
      });
    } catch (error: any) {
      console.error('Reactivate subscription error:', error);
      res.status(500).json({ 
        message: 'Failed to reactivate subscription',
        error: error.message 
      });
    }
  });

  // Manually sync subscription from Stripe
  app.post('/api/stripe/sync-subscription', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.stripeCustomerId) {
        return res.status(400).json({ 
          message: 'No Stripe customer ID found' 
        });
      }

      console.log('🔄 Manually syncing subscription for user:', user.email);

      // Get all subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        limit: 10,
        status: 'all',
      });

      if (subscriptions.data.length === 0) {
        return res.status(404).json({ 
          message: 'No subscriptions found for this customer' 
        });
      }

      // Get the most recent active or trialing subscription
      const activeSubscription = subscriptions.data.find(
        sub => ['active', 'trialing'].includes(sub.status)
      ) || subscriptions.data[0];

      console.log('✅ Found subscription:', {
        id: activeSubscription.id,
        status: activeSubscription.status,
      });

      // Update database
      await storage.updateUserStripeInfo(
        user.id,
        user.stripeCustomerId,
        activeSubscription.id
      );

      const stripeEndUnix = activeSubscription.trial_end ?? activeSubscription.current_period_end;
      const endDate = new Date(stripeEndUnix * 1000);
      const status = activeSubscription.status === 'trialing' ? 'trial' : activeSubscription.status;
      
      await storage.updateSubscriptionStatus(user.id, status, endDate.toISOString());

      res.json({
        success: true,
        subscription: {
          id: activeSubscription.id,
          status: activeSubscription.status,
          endDate: endDate,
        },
      });
    } catch (error: any) {
      console.error('Sync subscription error:', error);
      res.status(500).json({ 
        message: 'Failed to sync subscription',
        error: error.message 
      });
    }
  });

  // Fixed checkout session creation endpoint
  app.post('/api/stripe/create-checkout-session', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user already has active subscription
      if (user.subscriptionStatus === 'active' && user.stripeSubscriptionId) {
        return res.status(400).json({ 
          message: 'You already have an active subscription' 
        });
      }

      // Check if user has free access
      if (user.subscriptionStatus === 'free_access') {
        return res.status(400).json({ 
          message: 'You have free access, no subscription needed' 
        });
      }

      // Get or create customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: {
            userId: user.id.toString(),
            businessType: user.businessType,
          },
        });
        customerId = customer.id;
        await storage.updateUserStripeInfo(user.id, customerId);
      }

      // Get price ID
      const priceId = await getOrCreatePriceId();

      // Determine the base URL
      const baseUrl = process.env.BASE_URL || 
                      req.headers.origin || 
                      `${req.protocol}://${req.get('host')}`;

      console.log('Creating checkout session with base URL:', baseUrl);

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          trial_period_days: STRIPE_CONFIG.TRIAL_DAYS,
          metadata: {
            userId: user.id.toString(),
          },
        },
        success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/subscription`,
        customer_update: {
          address: 'auto',
        },
        client_reference_id: user.id.toString(),
      });

      console.log('✅ Checkout session created:', {
        sessionId: session.id,
        successUrl: session.success_url,
        customerId: session.customer,
      });

      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      res.status(500).json({ 
        message: 'Failed to create checkout session',
        error: error.message 
      });
    }
  });
}