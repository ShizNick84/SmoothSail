#!/usr/bin/env node

/**
 * Test Fixing Script
 * Runs tests in smaller batches to identify and fix issues systematically
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test categories to run separately
const testCategories = [
  {
    name: 'Security Tests',
    pattern: 'src/tests/security',
    timeout: 60000
  },
  {
    name: 'Trading Risk Tests', 
    pattern: 'src/trading/risk/__tests__',
    timeout: 30000
  },
  {
    name: 'Trading API Tests',
    pattern: 'src/trading/api/__tests__',
    timeout: 60000
  },
  {
    name: 'Infrastructure Tests',
    pattern: 'src/infrastructure/__tests__',
    timeout: 60000
  },
  {
    name: 'Trading Strategy Tests',
    pattern: 'src/trading/strategies/__tests__',
    timeout: 30000
  }
];

async function runTestCategory(category) {
  console.log(`\n🧪 Running ${category.name}...`);
  
  try {
    const command = `npm test -- --testPathPattern="${category.pattern}" --testTimeout=${category.timeout} --maxWorkers=1 --forceExit`;
    console.log(`Command: ${command}`);
    
    const result = execSync(command, { 
      stdio: 'inherit',
      timeout: category.timeout + 10000 // Add buffer
    });
    
    console.log(`✅ ${category.name} completed successfully`);
    return true;
  } catch (error) {
    console.log(`❌ ${category.name} failed with exit code: ${error.status}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting systematic test fixing...\n');
  
  const results = [];
  
  for (const category of testCategories) {
    const success = await runTestCategory(category);
    results.push({ category: category.name, success });
    
    // Add delay between test runs to prevent resource issues
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.category}`);
  });
  
  const passCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n🎯 Overall: ${passCount}/${totalCount} test categories passing`);
  
  if (passCount === totalCount) {
    console.log('🎉 All test categories are now passing!');
    process.exit(0);
  } else {
    console.log('🔧 Some test categories still need fixes');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});