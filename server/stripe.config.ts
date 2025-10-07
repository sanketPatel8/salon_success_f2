import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
});

// Stripe configuration constants
export const STRIPE_CONFIG = {
  // £23.97 per month in pence (2397 pence)
  SUBSCRIPTION_AMOUNT: 2397,
  CURRENCY: 'gbp',
  TRIAL_DAYS: 15,
  PRODUCT_NAME: 'Salon Success Manager Pro',
  PRODUCT_DESCRIPTION: 'Complete business management tools for salon professionals',
};

// Create or get the price ID
export async function getOrCreatePriceId(): Promise<string> {
  if (process.env.STRIPE_PRICE_ID) {
    return process.env.STRIPE_PRICE_ID;
  }

  try {
    // Check if product exists
    const products = await stripe.products.list({ limit: 1 });
    let product = products.data.find(p => p.name === STRIPE_CONFIG.PRODUCT_NAME);

    if (!product) {
      // Create product
      product = await stripe.products.create({
        name: STRIPE_CONFIG.PRODUCT_NAME,
        description: STRIPE_CONFIG.PRODUCT_DESCRIPTION,
      });
    }

    // Create price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: STRIPE_CONFIG.SUBSCRIPTION_AMOUNT,
      currency: STRIPE_CONFIG.CURRENCY,
      recurring: {
        interval: 'month',
        trial_period_days: STRIPE_CONFIG.TRIAL_DAYS,
      },
    });

    console.log(`✅ Created Stripe price: ${price.id}`);
    console.log(`💡 Add this to your .env file: STRIPE_PRICE_ID=${price.id}`);

    return price.id;
  } catch (error) {
    console.error('Error creating Stripe price:', error);
    throw error;
  }
}