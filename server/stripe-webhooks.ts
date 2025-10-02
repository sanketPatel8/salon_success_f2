import type { Express } from "express";
import Stripe from "stripe";
import { storage } from "./storage";
import { sendDeveloperNotification } from "./sendgrid";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export function setupStripeWebhooks(app: Express) {
  // Stripe webhook to handle subscription events
  app.post('/api/stripe-webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).send('Webhook signature missing');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id);
  
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if ('deleted' in customer) return;
  
  // Find user by email or customer ID
  const user = await storage.getUserByEmail(customer.email!);
  if (!user) return;

  // Update user subscription status
  await storage.updateUserStripeInfo(
    user.id, 
    customer.id, 
    subscription.id
  );

  // Set status based on trial
  const status = subscription.status === 'trialing' ? 'trial' : 'active';
  const endDate = subscription.status === 'trialing' 
    ? new Date(subscription.trial_end! * 1000)
    : new Date(subscription.current_period_end * 1000);

  await storage.updateSubscriptionStatus(user.id, status, endDate);
  
  // Send developer notification for new subscription
  try {
    await sendDeveloperNotification(
      user.email,
      user.name,
      user.businessType,
      'subscription',
      `New subscription created - Status: ${status}`
    );
  } catch (error) {
    console.error('Failed to send subscription creation notification:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if ('deleted' in customer) return;
  
  const user = await storage.getUserByEmail(customer.email!);
  if (!user) return;

  let status = 'inactive';
  let endDate: Date | undefined;

  switch (subscription.status) {
    case 'trialing':
      status = 'trial';
      endDate = new Date(subscription.trial_end! * 1000);
      break;
    case 'active':
      status = 'active';
      endDate = new Date(subscription.current_period_end * 1000);
      break;
    case 'past_due':
      status = 'past_due';
      endDate = new Date(subscription.current_period_end * 1000);
      break;
    case 'canceled':
    case 'unpaid':
      status = 'inactive';
      break;
  }

  await storage.updateSubscriptionStatus(user.id, status, endDate);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  if ('deleted' in customer) return;
  
  const user = await storage.getUserByEmail(customer.email!);
  if (!user) return;

  await storage.updateSubscriptionStatus(user.id, 'inactive');
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded for invoice:', invoice.id);
  
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    await handleSubscriptionUpdated(subscription);
    
    // Send developer notification for successful payment
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    if (!('deleted' in customer) && customer.email) {
      const user = await storage.getUserByEmail(customer.email);
      if (user) {
        try {
          await sendDeveloperNotification(
            user.email,
            user.name,
            user.businessType,
            'subscription',
            `Payment succeeded - £${(invoice.amount_paid / 100).toFixed(2)}`
          );
        } catch (error) {
          console.error('Failed to send payment success notification:', error);
        }
      }
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed for invoice:', invoice.id);
  
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    await handleSubscriptionUpdated(subscription);
  }
}