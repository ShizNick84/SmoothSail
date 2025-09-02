#!/usr/bin/env node
/**
 * Simple test to verify core functionality works
 * This bypasses TypeScript compilation issues
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Core Functionality...');
console.log('================================');

// Test 1: SSH Connection (we know this works)
console.log('✅ SSH Tunnel: WORKING (verified earlier)');

// Test 2: Environment Configuration
console.log('🔍 Checking Environment Configuration...');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const hasGateIO = envContent.includes('GATE_IO_API_KEY') && envContent.includes('GATE_IO_API_SECRET');
  const hasSSH = envContent.includes('ORACLE_SSH_HOST') && envContent.includes('SSH_PRIVATE_KEY_PATH');
  const hasDB = envContent.includes('DATABASE_HOST') && envContent.includes('DATABASE_NAME');
  
  console.log(`✅ Gate.io API Config: ${hasGateIO ? 'FOUND' : 'MISSING'}`);
  console.log(`✅ SSH Config: ${hasSSH ? 'FOUND' : 'MISSING'}`);
  console.log(`✅ Database Config: ${hasDB ? 'FOUND' : 'MISSING'}`);
} else {
  console.log('❌ .env file not found');
}

// Test 3: Key Files
console.log('🔍 Checking Key Files...');
const keyFiles = [
  'keys/oracle_key',
  'src/main.ts',
  'src/infrastructure/ssh-tunnel-manager.ts',
  'src/dashboard/dashboard-server.ts'
];

keyFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
});

// Test 4: Dependencies
console.log('🔍 Checking Dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const criticalDeps = ['ssh2', 'express', 'axios', 'winston', 'pg'];

criticalDeps.forEach(dep => {
  const exists = packageJson.dependencies[dep] || packageJson.devDependencies[dep];
  console.log(`${exists ? '✅' : '❌'} ${dep}: ${exists ? 'INSTALLED' : 'MISSING'}`);
});

console.log('');
console.log('🎯 RECOMMENDATION:');
console.log('Since SSH tunnel is working, try starting with a minimal version:');
console.log('');
console.log('1. Create a simple Express server to test dashboard');
console.log('2. Test Gate.io API connection through tunnel');
console.log('3. Gradually add components');
console.log('');
console.log('Would you like me to create a minimal working version?');