import type { Express } from 'express';
import express from 'express';
import Stripe from 'stripe';
import { storage } from './storage';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export function setupStripeWebhooks(app: Express) {
  console.log('🔧 Setting up Stripe webhook endpoint...');
  
  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      console.log('🎯 WEBHOOK RECEIVED! Starting processing...');
      
      const sig = req.headers['stripe-signature'];

      if (!sig) {
        console.error('❌ No Stripe signature found');
        return res.status(400).send('No signature');
      }

      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
        return res.status(500).send('Webhook secret not configured');
      }

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
        console.log('✅ Webhook signature verified!');
        console.log('📧 Event type:', event.type);
        console.log('🆔 Event ID:', event.id);
      } catch (err: any) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      try {
        console.log(`🔄 Processing event: ${event.type}`);
        
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            console.log('🎉 Checkout completed:', session.id);
            
            if (session.subscription) {
              // CRITICAL: Retrieve the full subscription with ALL fields expanded INCLUDING items
              const subscription = await stripe.subscriptions.retrieve(
                session.subscription as string,
                { 
                  expand: ['customer', 'items.data.price']
                }
              );
              console.log('📦 Retrieved subscription with dates:', {
                id: subscription.id,
                current_period_end: subscription.current_period_end,
                current_period_start: subscription.current_period_start,
                items_current_period_end: subscription.items?.data?.[0]?.current_period_end,
                trial_end: subscription.trial_end,
                billing_cycle_anchor: subscription.billing_cycle_anchor,
                status: subscription.status,
              });
              await handleSubscriptionCreated(subscription);
            }
            break;
          }

          case 'customer.subscription.created': {
            const eventSubscription = event.data.object as Stripe.Subscription;
            console.log('🆕 Subscription created:', eventSubscription.id);
            console.log('📅 Event subscription dates (might be incomplete):', {
              current_period_end: eventSubscription.current_period_end,
              trial_end: eventSubscription.trial_end,
            });
            
            // CRITICAL: Always retrieve the full subscription to get all fields
            const subscription = await stripe.subscriptions.retrieve(
              eventSubscription.id,
              { 
                expand: ['customer', 'items.data.price']
              }
            );
            
            console.log('📦 Retrieved full subscription:', {
              id: subscription.id,
              current_period_end: subscription.current_period_end,
              current_period_start: subscription.current_period_start,
              items_current_period_end: subscription.items?.data?.[0]?.current_period_end,
              trial_end: subscription.trial_end,
              billing_cycle_anchor: subscription.billing_cycle_anchor,
              status: subscription.status,
            });
            
            await handleSubscriptionCreated(subscription);
            break;
          }

          case 'customer.subscription.updated': {
            const eventSubscription = event.data.object as Stripe.Subscription;
            console.log('🔄 Subscription updated:', eventSubscription.id);
            console.log('📅 Event subscription dates (might be incomplete):', {
              current_period_end: eventSubscription.current_period_end,
              trial_end: eventSubscription.trial_end,
            });
            
            // CRITICAL: Always retrieve the full subscription to get all fields
            const subscription = await stripe.subscriptions.retrieve(
              eventSubscription.id,
              { 
                expand: ['customer', 'items.data.price']
              }
            );
            
            console.log('📦 Retrieved full subscription:', {
              id: subscription.id,
              current_period_end: subscription.current_period_end,
              current_period_start: subscription.current_period_start,
              items_current_period_end: subscription.items?.data?.[0]?.current_period_end,
              trial_end: subscription.trial_end,
              billing_cycle_anchor: subscription.billing_cycle_anchor,
              status: subscription.status,
            });
            
            await handleSubscriptionUpdated(subscription);
            break;
          }

          case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;
            console.log('❌ Subscription deleted:', subscription.id);
            await handleSubscriptionDeleted(subscription);
            break;
          }

          case 'invoice.payment_succeeded': {
            const invoice = event.data.object as Stripe.Invoice;
            console.log('💰 Payment succeeded:', invoice.id);
            console.log('📅 Invoice period:', {
              period_start: invoice.period_start,
              period_end: invoice.period_end,
            });
            
            if (invoice.subscription) {
              // CRITICAL: Retrieve with expand to get ALL subscription fields
              const subscription = await stripe.subscriptions.retrieve(
                invoice.subscription as string,
                { 
                  expand: ['customer', 'items.data.price']
                }
              );
              
              console.log('📦 Retrieved subscription from invoice:', {
                id: subscription.id,
                current_period_end: subscription.current_period_end,
                current_period_start: subscription.current_period_start,
                items_current_period_end: subscription.items?.data?.[0]?.current_period_end,
                trial_end: subscription.trial_end,
                billing_cycle_anchor: subscription.billing_cycle_anchor,
                status: subscription.status,
              });
              
              await handleSubscriptionUpdated(subscription);
            }
            break;
          }

          case 'invoice.payment_failed': {
            const invoice = event.data.object as Stripe.Invoice;
            console.log('💔 Payment failed:', invoice.id);
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
  
  console.log('✅ Stripe webhook endpoint registered');
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('\n=== HANDLE SUBSCRIPTION CREATED ===');
  console.log('📝 Subscription ID:', subscription.id);
  console.log('📅 Raw dates from Stripe:', {
    current_period_end: subscription.current_period_end,
    current_period_start: subscription.current_period_start,
    items_current_period_end: subscription.items?.data?.[0]?.current_period_end,
    trial_end: subscription.trial_end,
    billing_cycle_anchor: subscription.billing_cycle_anchor,
    status: subscription.status,
  });

  // CRITICAL FIX: Extract customer ID properly
  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer.id;
  
  let user = null;
  
  try {
    const customer = await stripe.customers.retrieve(customerId);
    
    if (customer.deleted) {
      console.error('❌ Customer has been deleted:', customerId);
      return;
    }
    
    const userId = customer.metadata?.userId;
    
    if (userId) {
      console.log('✅ Found userId in metadata:', userId);
      user = await storage.getUser(parseInt(userId));
    }
    
    if (!user && customer.email) {
      console.log('⚠️ No userId in metadata, trying email:', customer.email);
      user = await storage.getUserByEmail(customer.email);
    }
    
  } catch (error) {
    console.error('❌ Failed to retrieve customer:', error);
    return;
  }
  
  if (!user) {
    console.error('❌ No user found for customer:', customerId);
    return;
  }

  console.log('✅ Found user:', user.id, user.email);

  // Calculate end date with proper priority and fallback - SAME AS WORKING ENDPOINT
  let endDateTimestamp: number | undefined;
  let dateSource = 'none';
  
  // Priority order: current_period_end > items[0].current_period_end > trial_end > billing_cycle_anchor+1month
  if (subscription.current_period_end) {
    endDateTimestamp = subscription.current_period_end;
    dateSource = 'current_period_end';
  } else if (subscription.items?.data?.[0]?.current_period_end) {
    endDateTimestamp = subscription.items.data[0].current_period_end;
    dateSource = 'items[0].current_period_end';
    console.log('Using items[0].current_period_end:', endDateTimestamp);
  } else if (subscription.trial_end) {
    endDateTimestamp = subscription.trial_end;
    dateSource = 'trial_end';
  } else if (subscription.billing_cycle_anchor) {
    // WARNING: billing_cycle_anchor is the START date, not end date!
    // Only use this as last resort and add 1 month
    const anchor = subscription.billing_cycle_anchor;
    const anchorDate = new Date(anchor * 1000);
    anchorDate.setMonth(anchorDate.getMonth() + 1);
    endDateTimestamp = Math.floor(anchorDate.getTime() / 1000);
    dateSource = 'billing_cycle_anchor+1month';
    console.warn('⚠️ Using billing_cycle_anchor as fallback - adding 1 month');
  }

  console.log('📅 Date calculation:', {
    timestamp: endDateTimestamp,
    source: dateSource,
    hasValue: !!endDateTimestamp,
    subscriptionHasCurrentPeriodEnd: !!subscription.current_period_end,
    itemsHasCurrentPeriodEnd: !!subscription.items?.data?.[0]?.current_period_end,
  });

  if (!endDateTimestamp) {
    console.error('❌ CRITICAL: No valid timestamp found!');
    console.error('Full subscription object:', JSON.stringify(subscription, null, 2));
    
    await storage.updateUserStripeInfo(user.id, customerId, subscription.id);
    await storage.updateSubscriptionStatus(
      user.id, 
      subscription.status === 'trialing' ? 'trial' : subscription.status
    );
    return;
  }

  const endDate = new Date(endDateTimestamp * 1000);
  
  console.log('📅 Final calculated date:', {
    unix: endDateTimestamp,
    iso: endDate.toISOString(),
    readable: endDate.toLocaleString('en-US', { timeZone: 'UTC' }),
    source: dateSource,
  });

  let status = subscription.status;
  if (subscription.status === 'trialing') {
    status = 'trial';
  }

  await storage.updateUserStripeInfo(user.id, customerId, subscription.id);
  
  console.log('💾 About to update subscription status with:', {
    userId: user.id,
    status,
    endDate: endDate.toISOString(),
  });
  
  await storage.updateSubscriptionStatus(user.id, status, endDate);

  console.log('✅ SUBSCRIPTION CREATED COMPLETE\n');
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('\n=== HANDLE SUBSCRIPTION UPDATED ===');
  console.log('📝 Subscription ID:', subscription.id);
  console.log('📅 Raw dates from Stripe:', {
    current_period_end: subscription.current_period_end,
    current_period_start: subscription.current_period_start,
    items_current_period_end: subscription.items?.data?.[0]?.current_period_end,
    trial_end: subscription.trial_end,
    billing_cycle_anchor: subscription.billing_cycle_anchor,
    status: subscription.status,
  });

  const users = await storage.getAllUsers();
  const user = users.find(u => u.stripeSubscriptionId === subscription.id);

  if (!user) {
    console.error('❌ User not found for subscription:', subscription.id);
    return;
  }

  console.log('✅ Found user:', user.id, user.email);

  // Calculate end date with proper priority and fallback - SAME AS WORKING ENDPOINT
  let endDateTimestamp: number | undefined;
  let dateSource = 'none';
  
  // Priority order: current_period_end > items[0].current_period_end > trial_end > billing_cycle_anchor+1month
  if (subscription.current_period_end) {
    endDateTimestamp = subscription.current_period_end;
    dateSource = 'current_period_end';
  } else if (subscription.items?.data?.[0]?.current_period_end) {
    endDateTimestamp = subscription.items.data[0].current_period_end;
    dateSource = 'items[0].current_period_end';
    console.log('Using items[0].current_period_end:', endDateTimestamp);
  } else if (subscription.trial_end) {
    endDateTimestamp = subscription.trial_end;
    dateSource = 'trial_end';
  } else if (subscription.billing_cycle_anchor) {
    // WARNING: billing_cycle_anchor is the START date, not end date!
    // Only use this as last resort and add 1 month
    const anchor = subscription.billing_cycle_anchor;
    const anchorDate = new Date(anchor * 1000);
    anchorDate.setMonth(anchorDate.getMonth() + 1);
    endDateTimestamp = Math.floor(anchorDate.getTime() / 1000);
    dateSource = 'billing_cycle_anchor+1month';
    console.warn('⚠️ Using billing_cycle_anchor as fallback - adding 1 month');
  }

  console.log('📅 Date calculation:', {
    timestamp: endDateTimestamp,
    source: dateSource,
    hasValue: !!endDateTimestamp,
    subscriptionHasCurrentPeriodEnd: !!subscription.current_period_end,
    itemsHasCurrentPeriodEnd: !!subscription.items?.data?.[0]?.current_period_end,
  });

  if (!endDateTimestamp) {
    console.error('❌ CRITICAL: No valid timestamp found!');
    console.error('Full subscription object:', JSON.stringify(subscription, null, 2));
    return;
  }

  const endDate = new Date(endDateTimestamp * 1000);
  
  console.log('📅 Final calculated date:', {
    unix: endDateTimestamp,
    iso: endDate.toISOString(),
    readable: endDate.toLocaleString('en-US', { timeZone: 'UTC' }),
    source: dateSource,
  });

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

  console.log('💾 About to update subscription status with:', {
    userId: user.id,
    status,
    endDate: endDate.toISOString(),
  });

  await storage.updateSubscriptionStatus(user.id, status, endDate);

  console.log('✅ SUBSCRIPTION UPDATED COMPLETE\n');
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