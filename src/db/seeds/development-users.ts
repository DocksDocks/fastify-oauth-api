import { db } from '@/db/client';
import { users } from '@/db/schema/users';
import { eq } from 'drizzle-orm';

/**
 * Development User Seed
 * Creates test users for different roles to test RBAC
 *
 * NOTE: These users are for DEVELOPMENT ONLY
 * They won't have real OAuth credentials, but we can generate JWT tokens for them
 */

const developmentUsers = [
  {
    email: 'user@test.com',
    name: 'Test User',
    role: 'user' as const,
    provider: 'google' as const,
    providerId: 'test-user-google-id',
    avatar: null,
  },
  {
    email: 'coach@test.com',
    name: 'Test Coach',
    role: 'coach' as const,
    provider: 'google' as const,
    providerId: 'test-coach-google-id',
    avatar: null,
  },
  {
    email: 'admin@test.com',
    name: 'Test Admin',
    role: 'admin' as const,
    provider: 'google' as const,
    providerId: 'test-admin-google-id',
    avatar: null,
  },
  {
    email: 'superadmin@test.com',
    name: 'Test Superadmin',
    role: 'superadmin' as const,
    provider: 'apple' as const,
    providerId: 'test-superadmin-apple-id',
    avatar: null,
  },
  {
    email: 'owner@test.com',
    name: 'Exercise Owner',
    role: 'user' as const,
    provider: 'google' as const,
    providerId: 'test-owner-google-id',
    avatar: null,
  },
];

export async function seedDevelopmentUsers(): Promise<void> {
  console.log('\n👥 Seeding development test users...');

  const createdUsers = [];

  for (const userData of developmentUsers) {
    // Check if user already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (existing) {
      console.log(`   ⚠️  User ${userData.email} (${userData.role}) already exists`);
      createdUsers.push(existing);
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          ...userData,
          lastLoginAt: new Date(),
        })
        .returning();

      console.log(`   ✅ Created ${userData.email} (${userData.role}) - ID: ${newUser!.id}`);
      createdUsers.push(newUser);
    }
  }

  console.log('\n📋 Development Users Summary:');
  console.log('─────────────────────────────────────────────────────');
  createdUsers.forEach(user => {
    console.log(`   ${user!.role.padEnd(12)} | ID: ${user!.id.toString().padEnd(3)} | ${user!.email}`);
  });
  console.log('─────────────────────────────────────────────────────');
  console.log('\n💡 To generate JWT tokens for testing, run:');
  console.log('   npm run dev:token <user-id>');
  console.log('   Example: npm run dev:token 1\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDevelopmentUsers()
    .then(() => {
      console.log('\n✅ Development users seeded successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Development user seeding failed:', error);
      process.exit(1);
    });
}
