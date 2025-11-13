import type { Express } from 'express';
import express from 'express';
import Stripe from 'stripe';
import axios from 'axios';
import { storage } from './storage';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

// ActiveCampaign Configuration
const AC_API_URL = process.env.ACTIVECAMPAIGN_API_URL!;
const AC_API_KEY = process.env.ACTIVECAMPAIGN_API_KEY!;
const AC_MANAGE_TAG_ID = process.env.ACTIVECAMPAIGN_MANAGE_TAG_ID!; // The tag ID to check for management

// Tag Names
const TAGS = {
  TRIAL_STARTED: 'trial-started',
  PAID_MEMBER: 'paid-member',
  INACTIVE_USER: 'inactive-user',
};

/**
 * Find existing contact in ActiveCampaign by email
 * Returns contact ID if found, null if not found
 */
async function findACContact(email: string): Promise<string | null> {
  try {
    console.log(`🔍 Looking for contact with email: ${email}`);

    const searchResponse = await axios.get(`${AC_API_URL}/api/3/contacts`, {
      headers: { 'Api-Token': AC_API_KEY },
      params: { email },
    });

    if (searchResponse.data.contacts && searchResponse.data.contacts.length > 0) {
      const existingContact = searchResponse.data.contacts[0];
      console.log(`✅ Found existing contact: ${existingContact.id}`);
      return existingContact.id;
    }

    console.log(`ℹ️ No existing contact found for email: ${email}`);
    return null;
  } catch (error: any) {
    console.error('❌ Error finding AC contact:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Check if contact has a specific tag
 * Returns true if contact has the tag, false otherwise
 */
async function contactHasTag(contactId: string, tagId: string): Promise<boolean> {
  try {
    console.log(`🏷️ Checking if contact ${contactId} has tag ${tagId}`);

    const response = await axios.get(
      `${AC_API_URL}/api/3/contacts/${contactId}/contactTags`,
      { headers: { 'Api-Token': AC_API_KEY } }
    );

    const contactTags = response.data.contactTags || [];
    const hasTag = contactTags.some(
      (ct: any) => ct.tag === tagId || ct.tag === tagId.toString()
    );

    if (hasTag) {
      console.log(`✅ Contact ${contactId} has tag ${tagId}`);
    } else {
      console.log(`❌ Contact ${contactId} does NOT have tag ${tagId}`);
    }

    return hasTag;
  } catch (error: any) {
    console.error('❌ Error checking contact tag:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Get tag ID by name, create if doesn't exist
 */
async function getOrCreateTag(tagName: string): Promise<string> {
  try {
    console.log(`🔍 Looking for tag: ${tagName}`);

    // Search for existing tag
    const searchResponse = await axios.get(`${AC_API_URL}/api/3/tags`, {
      headers: { 'Api-Token': AC_API_KEY },
      params: { search: tagName },
    });

    if (searchResponse.data.tags && searchResponse.data.tags.length > 0) {
      const tagId = searchResponse.data.tags[0].id;
      console.log(`✅ Found existing tag: ${tagName} (ID: ${tagId})`);
      return tagId;
    }

    // Create new tag if not found
    console.log(`➕ Creating new tag: ${tagName}`);
    const createResponse = await axios.post(
      `${AC_API_URL}/api/3/tags`,
      {
        tag: {
          tag: tagName,
          tagType: 'contact',
        },
      },
      { headers: { 'Api-Token': AC_API_KEY } }
    );

    const newTagId = createResponse.data.tag.id;
    console.log(`✅ Created new tag: ${tagName} (ID: ${newTagId})`);
    return newTagId;
  } catch (error: any) {
    console.error('❌ Error getting/creating tag:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Add tag to contact
 */
async function addTagToContact(contactId: string, tagName: string) {
  try {
    console.log(`📌 Adding tag "${tagName}" to contact ${contactId}`);

    const tagId = await getOrCreateTag(tagName);

    await axios.post(
      `${AC_API_URL}/api/3/contactTags`,
      {
        contactTag: {
          contact: contactId,
          tag: tagId,
        },
      },
      { headers: { 'Api-Token': AC_API_KEY } }
    );

    console.log(`✅ Tag "${tagName}" added to contact ${contactId}`);
  } catch (error: any) {
    // Tag might already exist on contact
    if (error.response?.status === 422 || error.response?.status === 409) {
      console.log(`ℹ️ Tag "${tagName}" already on contact ${contactId}`);
    } else {
      console.error(`❌ Error adding tag:`, error.response?.data || error.message);
      throw error;
    }
  }
}

/**
 * Remove tag from contact
 */
async function removeTagFromContact(contactId: string, tagName: string) {
  try {
    console.log(`🗑️ Removing tag "${tagName}" from contact ${contactId}`);

    const tagId = await getOrCreateTag(tagName);

    // Get contact tags to find the relationship
    const contactTagsResponse = await axios.get(
      `${AC_API_URL}/api/3/contacts/${contactId}/contactTags`,
      { headers: { 'Api-Token': AC_API_KEY } }
    );

    const contactTag = contactTagsResponse.data.contactTags?.find(
      (ct: any) => ct.tag === tagId.toString() || parseInt(ct.tag) === parseInt(tagId)
    );

    if (contactTag) {
      await axios.delete(`${AC_API_URL}/api/3/contactTags/${contactTag.id}`, {
        headers: { 'Api-Token': AC_API_KEY },
      });
      console.log(`✅ Tag "${tagName}" removed from contact ${contactId}`);
    } else {
      console.log(`ℹ️ Tag "${tagName}" not found on contact ${contactId}, skipping removal`);
    }
  } catch (error: any) {
    console.warn(`⚠️ Could not remove tag:`, error.response?.data?.message || error.message);
  }
}

/**
 * Update tags for trial started status
 * Only updates if contact exists in ActiveCampaign AND has the management tag
 */
async function handleTrialStarted(user: any, subscription: Stripe.Subscription) {
  console.log('\n=== TRIAL STARTED - TAG UPDATE ===');
  console.log(`👤 User: ${user.email}`);

  try {
    const contactId = await findACContact(user.email);
    
    if (!contactId) {
      console.log(`⏭️ Contact not found in ActiveCampaign - skipping tag update`);
      return;
    }

    // Check if contact has the management tag
    const hasManagementTag = await contactHasTag(contactId, AC_MANAGE_TAG_ID);
    if (!hasManagementTag) {
      console.log(`⏭️ Contact does not have management tag ${AC_MANAGE_TAG_ID} - skipping tag update`);
      return;
    }

    // Add trial-started tag
    await addTagToContact(contactId, TAGS.TRIAL_STARTED);
    
    // Remove other status tags
    await removeTagFromContact(contactId, TAGS.PAID_MEMBER);
    await removeTagFromContact(contactId, TAGS.INACTIVE_USER);
    
    console.log('✅ TRIAL TAGS UPDATED\n');
  } catch (error) {
    console.error('❌ TRIAL TAG UPDATE FAILED:', error);
  }
}

/**
 * Update tags for successful payment / active subscription
 * Only updates if contact exists in ActiveCampaign AND has the management tag
 */
async function handleSuccessfulPayment(user: any, subscription: Stripe.Subscription) {
  console.log('\n=== SUCCESSFUL PAYMENT - TAG UPDATE ===');
  console.log(`👤 User: ${user.email}`);

  try {
    const contactId = await findACContact(user.email);
    
    if (!contactId) {
      console.log(`⏭️ Contact not found in ActiveCampaign - skipping tag update`);
      return;
    }

    // Check if contact has the management tag
    const hasManagementTag = await contactHasTag(contactId, AC_MANAGE_TAG_ID);
    if (!hasManagementTag) {
      console.log(`⏭️ Contact does not have management tag ${AC_MANAGE_TAG_ID} - skipping tag update`);
      return;
    }

    // Remove trial-started tag
    await removeTagFromContact(contactId, TAGS.TRIAL_STARTED);
    
    // Remove inactive-user tag
    await removeTagFromContact(contactId, TAGS.INACTIVE_USER);

    // Add paid-member tag
    await addTagToContact(contactId, TAGS.PAID_MEMBER);

    console.log('✅ PAYMENT TAGS UPDATED\n');
  } catch (error) {
    console.error('❌ PAYMENT TAG UPDATE FAILED:', error);
  }
}

/**
 * Update tags for inactive user (failed payment, trial expired, or canceled)
 * Only updates if contact exists in ActiveCampaign AND has the management tag
 */
async function handleInactiveUser(user: any, subscription: Stripe.Subscription | null = null) {
  console.log('\n=== INACTIVE USER - TAG UPDATE ===');
  console.log(`👤 User: ${user.email}`);

  try {
    const contactId = await findACContact(user.email);
    
    if (!contactId) {
      console.log(`⏭️ Contact not found in ActiveCampaign - skipping tag update`);
      return;
    }

    // Check if contact has the management tag
    const hasManagementTag = await contactHasTag(contactId, AC_MANAGE_TAG_ID);
    if (!hasManagementTag) {
      console.log(`⏭️ Contact does not have management tag ${AC_MANAGE_TAG_ID} - skipping tag update`);
      return;
    }

    // Remove paid-member tag
    await removeTagFromContact(contactId, TAGS.PAID_MEMBER);
    
    // Remove trial-started tag
    await removeTagFromContact(contactId, TAGS.TRIAL_STARTED);

    // Add inactive-user tag
    await addTagToContact(contactId, TAGS.INACTIVE_USER);

    console.log('✅ INACTIVE USER TAGS UPDATED\n');
  } catch (error) {
    console.error('❌ INACTIVE TAG UPDATE FAILED:', error);
  }
}

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
              const subscription = await stripe.subscriptions.retrieve(
                session.subscription as string,
                {
                  expand: ['customer', 'items.data.price'],
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

            const subscription = await stripe.subscriptions.retrieve(
              eventSubscription.id,
              {
                expand: ['customer', 'items.data.price'],
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

            const subscription = await stripe.subscriptions.retrieve(
              eventSubscription.id,
              {
                expand: ['customer', 'items.data.price'],
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
              const subscription = await stripe.subscriptions.retrieve(
                invoice.subscription as string,
                {
                  expand: ['customer', 'items.data.price'],
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

  const customerId =
    typeof subscription.customer === 'string'
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

  // Calculate end date with proper priority and fallback
  let endDateTimestamp: number | undefined;
  let dateSource = 'none';

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

  // ===== ACTIVE CAMPAIGN TAG UPDATES (Only for contacts with management tag) =====
  if (subscription.status === 'trialing') {
    await handleTrialStarted(user, subscription);
  } else if (subscription.status === 'active') {
    await handleSuccessfulPayment(user, subscription);
  }

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

  // Calculate end date with proper priority and fallback
  let endDateTimestamp: number | undefined;
  let dateSource = 'none';

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

  // ===== ACTIVE CAMPAIGN TAG UPDATES (Only for contacts with management tag) =====
  if (subscription.status === 'trialing') {
    await handleTrialStarted(user, subscription);
  } else if (subscription.status === 'active') {
    await handleSuccessfulPayment(user, subscription);
  } else if (subscription.status === 'past_due' || subscription.status === 'canceled') {
    await handleInactiveUser(user, subscription);
  }

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

  // ===== ACTIVE CAMPAIGN TAG UPDATES (Only for contacts with management tag) =====
  await handleInactiveUser(user, subscription);
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

  // ===== ACTIVE CAMPAIGN TAG UPDATES (Only for contacts with management tag) =====
  await handleInactiveUser(user);
}