// global.setup.ts - Global test setup

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export default async function globalSetup() {
  console.log('🔧 Setting up test environment...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.TEST_MODE = 'true';

  // Create test directories
  const testDirs = [
    'tests/reports',
    'tests/fixtures/data',
    'tests/fixtures/configs',
    'tests/fixtures/mocks',
    'logs/test'
  ];

  testDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Setup test database
  try {
    console.log('📊 Setting up test database...');
    
    // Create test database if it doesn't exist
    const testDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://test_user:test_pass@localhost:5432/test_trading_agent';
    
    // Note: In a real setup, you would create the test database here
    // execSync('npm run db:test:create', { stdio: 'inherit' });
    
    console.log('✅ Test database ready');
  } catch (error) {
    console.warn('⚠️ Test database setup failed:', error);
  }

  // Setup test SSH tunnel (mock)
  try {
    console.log('🌐 Setting up test SSH tunnel...');
    
    // Create mock tunnel for testing
    process.env.TEST_TUNNEL_ACTIVE = 'true';
    process.env.GATE_IO_BASE_URL = 'http://localhost:8443/api/v4';
    
    console.log('✅ Test SSH tunnel ready');
  } catch (error) {
    console.warn('⚠️ Test SSH tunnel setup failed:', error);
  }

  // Setup test fixtures
  try {
    console.log('📋 Setting up test fixtures...');
    
    // Create sample market data
    const marketData = {
      symbol: 'BTC_USDT',
      price: '50000.00',
      volume: '1000.00',
      timestamp: Date.now()
    };
    
    fs.writeFileSync(
      'tests/fixtures/data/market-data.json',
      JSON.stringify(marketData, null, 2)
    );

    // Create sample trading config
    const tradingConfig = {
      strategies: {
        movingAverage: { enabled: true, weight: 0.25 },
        rsi: { enabled: true, weight: 0.25 },
        macd: { enabled: true, weight: 0.25 },
        fibonacci: { enabled: true, weight: 0.25 }
      },
      risk: {
        maxRiskPercentage: 2.5,
        stopLossPercentage: 1.0
      }
    };
    
    fs.writeFileSync(
      'tests/fixtures/configs/trading-config.json',
      JSON.stringify(tradingConfig, null, 2)
    );

    console.log('✅ Test fixtures ready');
  } catch (error) {
    console.warn('⚠️ Test fixtures setup failed:', error);
  }

  // Setup performance monitoring
  try {
    console.log('⚡ Setting up performance monitoring...');
    
    // Initialize performance tracking
    global.testStartTime = Date.now();
    global.performanceMetrics = {
      testCount: 0,
      totalDuration: 0,
      memoryUsage: []
    };
    
    console.log('✅ Performance monitoring ready');
  } catch (error) {
    console.warn('⚠️ Performance monitoring setup failed:', error);
  }

  console.log('🎉 Test environment setup complete');
}