import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { users } from '@/db/schema/users';
import env from '@/config/env';
import { seedExercises } from './exercises';

/**
 * Database Seed Script
 *
 * Seeds the database with:
 * - System exercises (gym exercise library)
 * - Admin users (promotes users to admin role based on .env)
 *
 * Usage:
 *   npm run db:seed
 *
 * Environment Variables Required:
 *   - ADMIN_EMAIL: Primary admin email
 *   - ADMIN_EMAILS_ADDITIONAL: Comma-separated list of additional admin emails (optional)
 */

async function seedAdmins(): Promise<void> {
  try {
    console.log('🌱 Starting admin seed...\n');

    // Get admin emails from environment
    const primaryAdminEmail = env.ADMIN_EMAIL;
    const additionalEmails = env.ADMIN_EMAILS_ADDITIONAL.split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    const allAdminEmails = [primaryAdminEmail, ...additionalEmails];

    console.log(`📧 Admin emails to promote: ${allAdminEmails.length}`);
    allAdminEmails.forEach((email, index) => {
      console.log(`   ${index + 1}. ${email}`);
    });
    console.log('');

    let promoted = 0;
    let alreadyAdmin = 0;
    let notFound = 0;

    // Process each admin email
    for (const email of allAdminEmails) {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (!user) {
        console.log(`⚠️  User not found: ${email}`);
        notFound++;
        continue;
      }

      if (user.role === 'admin' || user.role === 'superadmin') {
        console.log(`✓  Already admin: ${email} (${user.role})`);
        alreadyAdmin++;
        continue;
      }

      // Promote to admin
      await db
        .update(users)
        .set({
          role: 'admin',
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      console.log(`✅ Promoted to admin: ${email}`);
      promoted++;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Seed Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Promoted:       ${promoted}`);
    console.log(`✓  Already admin:  ${alreadyAdmin}`);
    console.log(`⚠️  Not found:      ${notFound}`);
    console.log('='.repeat(50));

    if (notFound > 0) {
      console.log('\n💡 Tip: Users not found must sign in via OAuth first.');
      console.log('   After their first login, run this seed script again.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run all seeds
async function runSeeds(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🌱 FASTIFY OAUTH API - DATABASE SEEDING');
  console.log('='.repeat(60) + '\n');

  // Seed exercises first (independent of users)
  await seedExercises();

  console.log('\n');

  // Then seed admins (requires existing users from OAuth)
  await seedAdmins();
}

runSeeds();
