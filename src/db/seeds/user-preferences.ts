/**
 * User Preferences Seed
 *
 * Creates default preferences for existing users who don't have preferences yet
 */

import { db } from '@/db/client';
import { users, userPreferences } from '@/db/schema';
import { sql } from 'drizzle-orm';

async function seedUserPreferences(): Promise<void> {
  console.log('[Seed] Starting user preferences seed...');

  // Get all users
  const allUsers = await db.select({ id: users.id }).from(users);

  console.log(`[Seed] Found ${allUsers.length} users`);

  let createdCount = 0;
  let skippedCount = 0;

  // Check which users already have preferences
  for (const user of allUsers) {
    const [existing] = await db
      .select()
      .from(userPreferences)
      .where(sql`${userPreferences.userId} = ${user.id}`)
      .limit(1);

    if (existing) {
      skippedCount++;
      continue;
    }

    // Create default preferences for this user
    await db.insert(userPreferences).values({
      userId: user.id,
      locale: 'pt-BR',
      theme: 'system',
      timezone: 'America/Sao_Paulo',
      currency: 'USD',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
      compactMode: false,
      showAvatars: true,
    });

    createdCount++;
    console.log(`[Seed] Created preferences for user #${user.id}`);
  }

  console.log(`[Seed] User preferences seed completed:`);
  console.log(`  - Created: ${createdCount}`);
  console.log(`  - Skipped (already exists): ${skippedCount}`);
  console.log(`  - Total users: ${allUsers.length}`);
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedUserPreferences()
    .then(() => {
      console.log('[Seed] Success!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Seed] Error:', error);
      process.exit(1);
    });
}

export default seedUserPreferences;
