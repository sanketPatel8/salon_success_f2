// Simple test to verify Stripe key
import Stripe from 'stripe';

console.log('Testing Stripe connection...');
console.log('Secret key starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 8) + '...');
console.log('Public key starts with:', process.env.VITE_STRIPE_PUBLIC_KEY?.substring(0, 8) + '...');
console.log('Price ID:', process.env.STRIPE_PRICE_ID);

if (!process.env.STRIPE_SECRET_KEY) {
  console.log('❌ STRIPE_SECRET_KEY not found');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

try {
  const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID);
  console.log('✅ Stripe connection successful!');
  console.log('Price:', price.unit_amount / 100, price.currency);
} catch (error) {
  console.log('❌ Stripe error:', error.message);
}