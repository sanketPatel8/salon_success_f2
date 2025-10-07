import 'dotenv/config';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

async function testStripeIntegration() {
  console.log('🧪 Testing Stripe Integration...\n');

  // Test 1: API Key
  console.log('1️⃣ Testing API Keys...');
  try {
    const balance = await stripe.balance.retrieve();
    console.log('✅ API Key valid');
    console.log(`   Mode: ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_test') ? 'TEST' : 'LIVE'}`);
    console.log(`   Available balance: ${Object.entries(balance.available).map(([curr, amounts]) => 
      amounts.map(a => `${a.amount/100} ${curr.toUpperCase()}`).join(', ')
    ).join(', ')}\n`);
  } catch (error: any) {
    console.log('❌ API Key invalid:', error.message);
    process.exit(1);
  }

  // Test 2: Price ID
  console.log('2️⃣ Testing Price ID...');
  if (process.env.STRIPE_PRICE_ID) {
    try {
      const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID);
      console.log('✅ Price found');
      console.log(`   Amount: ${price.unit_amount ? price.unit_amount/100 : 0} ${price.currency.toUpperCase()}`);
      console.log(`   Interval: ${price.recurring?.interval}`);
      console.log(`   Trial days: ${price.recurring?.trial_period_days || 'None'}\n`);
      
      if (price.unit_amount !== 2397) {
        console.log('⚠️  Warning: Price is not £23.97 (2397 pence)');
      }
      if (price.currency !== 'gbp') {
        console.log('⚠️  Warning: Currency is not GBP');
      }
      if (price.recurring?.trial_period_days !== 15) {
        console.log('⚠️  Warning: Trial period is not 15 days');
      }
    } catch (error: any) {
      console.log('❌ Price not found:', error.message);
      console.log('   Run the app once to auto-generate the price\n');
    }
  } else {
    console.log('⚠️  STRIPE_PRICE_ID not set - will be auto-generated\n');
  }

  // Test 3: Webhook Secret
  console.log('3️⃣ Testing Webhook Secret...');
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    console.log('✅ Webhook secret configured');
    console.log(`   Secret: ${process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10)}...\n`);
  } else {
    console.log('⚠️  STRIPE_WEBHOOK_SECRET not set');
    console.log('   For local testing: stripe listen --forward-to localhost:8080/api/stripe/webhook');
    console.log('   For production: Create webhook in Stripe Dashboard\n');
  }

  // Test 4: List existing products
  console.log('4️⃣ Listing Products...');
  try {
    const products = await stripe.products.list({ limit: 10 });
    console.log(`✅ Found ${products.data.length} product(s)`);
    products.data.forEach(product => {
      console.log(`   - ${product.name} (${product.id})`);
    });
    console.log();
  } catch (error: any) {
    console.log('❌ Could not list products:', error.message);
  }

  // Test 5: List prices
  console.log('5️⃣ Listing Prices...');
  try {
    const prices = await stripe.prices.list({ limit: 10 });
    console.log(`✅ Found ${prices.data.length} price(s)`);
    prices.data.forEach(price => {
      console.log(`   - ${price.id}: ${price.unit_amount ? price.unit_amount/100 : 0} ${price.currency.toUpperCase()} per ${price.recurring?.interval || 'one-time'}`);
    });
    console.log();
  } catch (error: any) {
    console.log('❌ Could not list prices:', error.message);
  }

  // Test 6: Test customer creation
  console.log('6️⃣ Testing Customer Creation...');
  try {
    const testCustomer = await stripe.customers.create({
      email: 'test@example.com',
      name: 'Test Customer',
      metadata: {
        test: 'true',
      },
    });
    console.log('✅ Customer created successfully');
    console.log(`   Customer ID: ${testCustomer.id}`);
    
    // Clean up
    await stripe.customers.del(testCustomer.id);
    console.log('✅ Test customer deleted\n');
  } catch (error: any) {
    console.log('❌ Could not create customer:', error.message);
  }

  // Summary
  console.log('📊 Integration Status Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const checks = [
    { name: 'API Key', status: !!process.env.STRIPE_SECRET_KEY },
    { name: 'Public Key', status: !!process.env.VITE_STRIPE_PUBLIC_KEY },
    { name: 'Price ID', status: !!process.env.STRIPE_PRICE_ID },
    { name: 'Webhook Secret', status: !!process.env.STRIPE_WEBHOOK_SECRET },
  ];

  checks.forEach(check => {
    console.log(`${check.status ? '✅' : '❌'} ${check.name}`);
  });

  console.log('\n🎯 Next Steps:');
  if (!process.env.STRIPE_PRICE_ID) {
    console.log('   1. Start your server to auto-generate price ID');
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.log('   2. Setup webhooks:');
    console.log('      Local: stripe listen --forward-to localhost:8080/api/stripe/webhook');
    console.log('      Production: Add webhook in Stripe Dashboard');
  }
  console.log('   3. Test checkout flow at http://localhost:8080/subscription');
  console.log('   4. Use test card: 4242 4242 4242 4242\n');

  console.log('✨ Integration test complete!\n');
}

// Run tests
testStripeIntegration().catch(console.error);