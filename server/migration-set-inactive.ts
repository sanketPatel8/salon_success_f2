// migration-set-inactive.ts
// Run this to update existing users without subscriptions to "inactive" status

import { storage } from './storage';

async function migrateUsersToInactive() {
  console.log('🔄 Migrating users to inactive status...\n');
  
  const allUsers = await storage.getAllUsers();
  
  for (const user of allUsers) {
    // Skip users who already have active subscriptions or free access
    if (user.subscriptionStatus === 'active' || 
        user.subscriptionStatus === 'free_access' ||
        user.stripeSubscriptionId) {
      console.log(`⏭️  Skipping user ${user.email} - already has subscription`);
      continue;
    }
    
    // Update users with "trial" status but no Stripe subscription to "inactive"
    if (user.subscriptionStatus === 'trial' && !user.stripeSubscriptionId) {
      await storage.updateSubscriptionStatus(user.id, 'inactive');
      console.log(`✅ Updated ${user.email}: trial → inactive`);
    }
  }
  
  console.log('\n✅ Migration complete!');
}

// Run the migration
migrateUsersToInactive().catch(console.error);