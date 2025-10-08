import type { Express } from 'express';
import express from 'express';
import Stripe from 'stripe';
import { storage } from './storage';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export function setupStripeWebhooks(app: Express) {
  console.log('🔧 Setting up Stripe webhook endpoint...');
  
  // Stripe webhook endpoint - MUST use raw body
  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      console.log('🎯 WEBHOOK RECEIVED! Starting processing...');
      console.log('📦 Request headers:', JSON.stringify(req.headers, null, 2));
      console.log('📦 Body type:', typeof req.body);
      console.log('📦 Body length:', req.body?.length || 0);
      
      const sig = req.headers['stripe-signature'];

      if (!sig) {
        console.error('❌ No Stripe signature found');
        return res.status(400).send('No signature');
      }

      console.log('✓ Stripe signature present:', sig.substring(0, 20) + '...');

      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
        return res.status(500).send('Webhook secret not configured');
      }

      console.log('✓ Webhook secret configured');

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
        console.log('✅ Webhook signature verified successfully!');
        console.log('📧 Event type:', event.type);
        console.log('🆔 Event ID:', event.id);
      } catch (err: any) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle the event
      try {
        console.log(`🔄 Processing event: ${event.type}`);
        
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            console.log('🎉 Checkout completed:', session.id);
            
            // IMPORTANT: Handle subscription creation immediately
            if (session.subscription) {
              const subscription = await stripe.subscriptions.retrieve(
                session.subscription as string,
                { expand: ['customer'] }
              );
              await handleSubscriptionCreated(subscription);
            } else if (session.mode === 'subscription') {
              // If subscription isn't attached yet, wait and retry
              console.log('⏳ Subscription not attached yet, will be handled by subscription.created event');
            }
            break;
          }

          case 'customer.subscription.created': {
            const subscription = event.data.object as Stripe.Subscription;
            console.log('🆕 Subscription created:', subscription.id, subscription.status);
            await handleSubscriptionCreated(subscription);
            break;
          }

          case 'customer.subscription.updated': {
            const subscription = event.data.object as Stripe.Subscription;
            console.log('🔄 Subscription updated:', subscription.id, subscription.status);
            await handleSubscriptionUpdated(subscription);
            break;
          }

          case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;
            console.log('❌ Subscription deleted:', subscription.id);
            await handleSubscriptionDeleted(subscription);
            break;
          }

          case 'customer.subscription.trial_will_end': {
            const subscription = event.data.object as Stripe.Subscription;
            console.log('⏰ Trial ending soon:', subscription.id);
            await handleTrialWillEnd(subscription);
            break;
          }

          case 'invoice.payment_succeeded': {
            const invoice = event.data.object as Stripe.Invoice;
            console.log('💰 Payment succeeded:', invoice.id);
            if (invoice.subscription) {
              const subscription = await stripe.subscriptions.retrieve(
                invoice.subscription as string
              );
              await handleSubscriptionUpdated(subscription);
            }
            break;
          }

          case 'invoice.payment_failed': {
            const invoice = event.data.object as Stripe.Invoice;
            console.log(' Payment failed:', invoice.id);
            if (invoice.subscription) {
              await handlePaymentFailed(invoice);
            }
            break;
          }

          default:
            console.log('ℹ️ Unhandled event type:', event.type);
        }

        console.log('✅ Event processed successfully');
        res.json({ received: true });
      } catch (error) {
        console.error('❌ Error handling webhook:', error);
        res.status(500).json({ error: 'Webhook handler failed' });
      }
    }
  );
  
  console.log('✅ Stripe webhook endpoint registered at /api/stripe/webhook');
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('📝 Processing subscription creation:', subscription.id);
  
  // Get the checkout session to access client_reference_id
  const checkoutSessionId = subscription.metadata?.checkout_session_id;
  
  if (!checkoutSessionId) {
    console.error('❌ No checkout_session_id found in subscription metadata:', subscription.id);
    return;
  }
  
  let userId: string | null = null;
  
  try {
    // Retrieve the checkout session to get client_reference_id
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    userId = session.client_reference_id;
    
    console.log('✅ Retrieved checkout session:', {
      sessionId: checkoutSessionId,
      clientReferenceId: userId
    });
  } catch (error) {
    console.error('❌ Failed to retrieve checkout session:', error);
    return;
  }
  
  if (!userId) {
    console.error('❌ No client_reference_id found in checkout session:', checkoutSessionId);
    return;
  }
  
  const user = await storage.getUser(parseInt(userId));
  
  if (!user) {
    console.error('❌ No user found for userId:', userId);
    return;
  }
  
  console.log('👤 Found user from client_reference_id:', user.email);
  
  const stripeEndUnix = subscription.trial_end ?? subscription.current_period_end;
  const endDate = new Date(stripeEndUnix * 1000);
  const status = subscription.status === 'trialing' ? 'trial' : subscription.status;
  
  // Update Stripe info if not already set
  if (!user.stripeSubscriptionId) {
    await storage.updateUserStripeInfo(
      user.id,
      subscription.customer as string,
      subscription.id
    );
  }
  
  // Update subscription status
  await storage.updateSubscriptionStatus(user.id, status, endDate);
  
  console.log(`✅ Subscription created for user ${user.email}:`, {
    status,
    endDate: endDate.toISOString(),
    subscriptionId: subscription.id,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const users = await storage.getAllUsers();
  const user = users.find(u => u.stripeSubscriptionId === subscription.id);

  if (!user) {
    console.error('User not found for subscription:', subscription.id);
    return;
  }

  const stripeEndUnix = subscription.trial_end ?? subscription.current_period_end;
  const endDate = new Date(stripeEndUnix * 1000);
  let status = subscription.status;

  if (subscription.status === 'trialing') {
    status = 'trial';
  } else if (subscription.status === 'active') {
    status = 'active';
  } else if (subscription.status === 'past_due') {
    status = 'past_due';
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    status = 'inactive';
  }

  await storage.updateSubscriptionStatus(user.id, status, endDate);

  console.log(`✅ Subscription updated for user ${user.email}:`, {
    status,
    endDate: endDate.toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const users = await storage.getAllUsers();
  const user = users.find(u => u.stripeSubscriptionId === subscription.id);

  if (!user) {
    console.error('User not found for subscription:', subscription.id);
    return;
  }

  await storage.updateSubscriptionStatus(user.id, 'inactive');

  console.log(`✅ Subscription deleted for user ${user.email}`);
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const users = await storage.getAllUsers();
  const user = users.find(u => u.stripeSubscriptionId === subscription.id);

  if (!user) {
    console.error('User not found for subscription:', subscription.id);
    return;
  }

  console.log(`⏰ Trial ending soon for user ${user.email}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const users = await storage.getAllUsers();
  const user = users.find(u => u.stripeSubscriptionId === invoice.subscription);

  if (!user) {
    console.error('User not found for invoice:', invoice.id);
    return;
  }

  await storage.updateSubscriptionStatus(user.id, 'past_due');

  console.log(`💔 Payment failed for user ${user.email}`);
}