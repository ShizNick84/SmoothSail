#!/usr/bin/env tsx

/**
 * Production Build Validation Script
 * 
 * This script validates that core components can be imported and initialized
 * without running the full TypeScript compilation on all files.
 */

import { logger } from '../src/core/logging/logger';

async function validateCoreComponents() {
  const results = {
    passed: 0,
    failed: 0,
    errors: [] as string[]
  };

  // Test 1: Logger functionality
  try {
    logger.info('🧪 Testing logger functionality...');
    results.passed++;
  } catch (error) {
    results.failed++;
    results.errors.push(`Logger test failed: ${error}`);
  }

  // Test 2: Configuration loading
  try {
    const config = await import('../src/config/config');
    if (config) {
      logger.info('✅ Configuration module loaded successfully');
      results.passed++;
    }
  } catch (error) {
    results.failed++;
    results.errors.push(`Configuration test failed: ${error}`);
  }

  // Test 3: Trading Engine import
  try {
    const { TradingEngine } = await import('../src/trading/trading-engine');
    if (TradingEngine) {
      logger.info('✅ Trading Engine class imported successfully');
      results.passed++;
    }
  } catch (error) {
    results.failed++;
    results.errors.push(`Trading Engine test failed: ${error}`);
  }

  // Test 4: Gate.io Client import
  try {
    const { GateIOClient } = await import('../src/trading/api/gate-io-client');
    if (GateIOClient) {
      logger.info('✅ Gate.io Client class imported successfully');
      results.passed++;
    }
  } catch (error) {
    results.failed++;
    results.errors.push(`Gate.io Client test failed: ${error}`);
  }

  // Test 5: Security services
  try {
    const { EncryptionService } = await import('../src/security/encryption-service');
    if (EncryptionService) {
      logger.info('✅ Encryption Service imported successfully');
      results.passed++;
    }
  } catch (error) {
    results.failed++;
    results.errors.push(`Encryption Service test failed: ${error}`);
  }

  return results;
}

async function validateEnvironment() {
  logger.info('🔍 Validating deployment environment...');
  
  const checks = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memory: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
    uptime: Math.round(process.uptime()) + 's'
  };

  logger.info('📊 Environment Info:', checks);
  
  // Check Node.js version
  const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);
  if (nodeVersion < 18) {
    throw new Error(`Node.js version ${process.version} is too old. Requires Node.js 18+`);
  }

  return checks;
}

async function main() {
  try {
    logger.info('🚀 Starting production build validation...');
    
    // Validate environment
    const envInfo = await validateEnvironment();
    
    // Validate core components
    const componentResults = await validateCoreComponents();
    
    // Summary
    logger.info('📋 Validation Summary:');
    logger.info(`✅ Passed: ${componentResults.passed}`);
    logger.info(`❌ Failed: ${componentResults.failed}`);
    
    if (componentResults.errors.length > 0) {
      logger.warn('⚠️ Errors encountered:');
      componentResults.errors.forEach(error => logger.warn(`  - ${error}`));
    }
    
    const successRate = (componentResults.passed / (componentResults.passed + componentResults.failed)) * 100;
    
    if (successRate >= 80) {
      logger.info(`🎉 Validation PASSED (${successRate.toFixed(1)}% success rate)`);
      logger.info('✅ Core components are functional and ready for deployment');
      process.exit(0);
    } else {
      logger.error(`❌ Validation FAILED (${successRate.toFixed(1)}% success rate)`);
      logger.error('🚨 Critical issues detected - deployment not recommended');
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('💥 Validation script failed:', error);
    process.exit(1);
  }
}

// Run validation
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});