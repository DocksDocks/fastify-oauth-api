#!/usr/bin/env node

/**
 * API Testing Utility
 * Usage: node test-api.js --user --route "/api/profile"
 * Usage: node test-api.js --coach --method POST --route "/api/workouts" --data '{"name":"Test"}'
 */

import { generateDevToken } from './src/utils/dev-token-generator.js';

const USERS = {
  user: 1,
  coach: 2,
  admin: 3,
  superadmin: 4,
};

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let userId = null;
  let route = '/api/profile';
  let method = 'GET';
  let data = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--user') userId = USERS.user;
    else if (args[i] === '--coach') userId = USERS.coach;
    else if (args[i] === '--admin') userId = USERS.admin;
    else if (args[i] === '--superadmin') userId = USERS.superadmin;
    else if (args[i] === '--route') route = args[++i];
    else if (args[i] === '--method') method = args[++i];
    else if (args[i] === '--data') data = args[++i];
  }

  if (!userId) {
    console.error('❌ Please specify user: --user, --coach, --admin, or --superadmin');
    process.exit(1);
  }

  // Generate token
  console.log(`🔑 Generating token for user ID ${userId}...`);
  const { accessToken, user } = await generateDevToken(userId);
  console.log(`✓ Token generated for ${user.email} (${user.role})\n`);

  // Make request
  const url = `http://localhost:3000${route}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = data;
  }

  console.log(`📡 ${method} ${url}`);
  if (data) console.log(`📦 Data: ${data}`);
  console.log('');

  try {
    const response = await fetch(url, options);
    const text = await response.text();

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log('📄 Response:');

    try {
      const result = JSON.parse(text);
      console.log(JSON.stringify(result, null, 2));
    } catch (jsonError) {
      console.log('Raw response (not valid JSON):');
      console.log(text);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
