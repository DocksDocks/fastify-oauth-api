/**
 * Super Admin Initialization Seed
 *
 * One-time seed that runs on first server start to:
 * 1. Generate initial API keys (ios_api_key, android_api_key, admin_panel_api_key)
 * 2. Mark seed as complete to prevent duplicate runs
 *
 * Note: Super admin user promotion happens automatically via OAuth callback
 * when user with SUPER_ADMIN_EMAIL signs in for the first time.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { apiKeys } from '@/db/schema/api-keys';
import { seedStatus } from '@/db/schema/seed-status';
import { users } from '@/db/schema/users';

const SEED_NAME = 'super-admin-init';

/**
 * Generate a secure random API key
 */
function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash API key using bcrypt
 */
async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10);
}

/**
 * Check if seed has already run
 */
async function hasSeedRun(): Promise<boolean> {
  const result = await db
    .select({ id: seedStatus.id })
    .from(seedStatus)
    .where(eq(seedStatus.seedName, SEED_NAME))
    .limit(1);

  return result.length > 0;
}

/**
 * Mark seed as complete
 */
async function markSeedComplete(): Promise<void> {
  await db.insert(seedStatus).values({
    seedName: SEED_NAME,
    success: true,
  });
}

/**
 * Get or create system user for seed operations
 * Returns user ID 1 or creates a system user
 */
async function getSystemUserId(): Promise<number> {
  // Check if user ID 1 exists
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, 1))
    .limit(1);

  if (existingUser.length > 0) {
    return existingUser[0].id;
  }

  // Create system user (for seed operations)
  const [systemUser] = await db
    .insert(users)
    .values({
      email: 'system@internal',
      provider: 'system',
      providerId: 'system-1',
      role: 'superadmin',
      name: 'System',
    })
    .returning({ id: users.id });

  return systemUser.id;
}

/**
 * Generate initial API keys
 */
async function generateInitialApiKeys(createdBy: number): Promise<void> {
  const keyNames = ['ios_api_key', 'android_api_key', 'admin_panel_api_key'] as const;

  console.log('\n🔑 Generating initial API keys...\n');

  for (const name of keyNames) {
    // Check if key already exists
    const existing = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(eq(apiKeys.name, name))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ⚠️  ${name}: Already exists, skipping`);
      continue;
    }

    // Generate new key
    const plainKey = generateApiKey();
    const keyHash = await hashApiKey(plainKey);

    await db.insert(apiKeys).values({
      name,
      keyHash,
      createdBy,
    });

    console.log(`  ✅ ${name}: ${plainKey}`);
    console.log(`     Store this key securely! It will not be shown again.\n`);
  }
}

/**
 * Run super admin initialization seed
 */
export async function runSuperAdminSeed(): Promise<void> {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           Super Admin Initialization Seed                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Check if seed has already run
    const alreadyRun = await hasSeedRun();

    if (alreadyRun) {
      console.log('✅ Seed has already run. Skipping...\n');
      console.log('   To re-run this seed, delete the record from seed_status table:');
      console.log(`   DELETE FROM seed_status WHERE seed_name = '${SEED_NAME}';\n`);
      return;
    }

    console.log('🚀 Running super admin initialization...\n');

    // Get or create system user
    const systemUserId = await getSystemUserId();
    console.log(`  System user ID: ${systemUserId}\n`);

    // Generate initial API keys
    await generateInitialApiKeys(systemUserId);

    // Mark seed as complete
    await markSeedComplete();

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    Seed Completed Successfully!              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('📝 Next Steps:\n');
    console.log('  1. Set SUPER_ADMIN_EMAIL in .env file');
    console.log('  2. Start the application');
    console.log('  3. Sign in with Google/Apple OAuth using super admin email');
    console.log('  4. User will be automatically promoted to superadmin role\n');

    console.log('⚠️  IMPORTANT: Store the API keys above securely!');
    console.log('   They will not be shown again.\n');
    console.log('   Add them to your .env file:\n');
    console.log('   ADMIN_PANEL_API_KEY=<admin_panel_api_key>');
    console.log('   IOS_API_KEY=<ios_api_key>');
    console.log('   ANDROID_API_KEY=<android_api_key>\n');
  } catch (error) {
    console.error('\n❌ Seed failed:', error);

    // Mark seed as failed
    try {
      await db.insert(seedStatus).values({
        seedName: SEED_NAME,
        success: false,
      });
    } catch {
      // Ignore if already exists
    }

    throw error;
  }
}

/**
 * Run seed when file is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runSuperAdminSeed()
    .then(() => {
      console.log('✅ Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}
