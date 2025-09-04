// Simple test to verify balance manager implementation
const { BalanceManager } = require('../dist/trading/account/balance-manager.js');

// Mock GateIO client
class MockGateIOClient {
  async makeRequest(config) {
    if (config.url === '/spot/accounts') {
      return [
        { currency: 'BTC', available: '0.5', locked: '0.1' },
        { currency: 'ETH', available: '2.0', locked: '0.5' },
        { currency: 'USDT', available: '1000.0', locked: '200.0' }
      ];
    }
    if (config.url === '/spot/tickers') {
      return [{ last: '50000' }]; // Mock price
    }
    return [];
  }
}

async function testBalanceManager() {
  console.log('Testing Balance Manager implementation...');
  
  try {
    const mockClient = new MockGateIOClient();
    const balanceManager = new BalanceManager(mockClient);
    
    // Test initialization
    console.log('1. Testing initialization...');
    const initResult = await balanceManager.initialize();
    console.log('   Initialization result:', initResult);
    
    // Test getTotalBalance
    console.log('2. Testing getTotalBalance...');
    const totalBalance = await balanceManager.getTotalBalance();
    console.log('   Total balance:', totalBalance);
    
    // Test getPositions
    console.log('3. Testing getPositions...');
    const positions = await balanceManager.getPositions();
    console.log('   Positions count:', positions.size);
    console.log('   Positions:', Array.from(positions.keys()));
    
    // Test refreshBalance
    console.log('4. Testing refreshBalance...');
    const refreshResult = await balanceManager.refreshBalance();
    console.log('   Refresh result:', refreshResult);
    
    // Test isHealthy
    console.log('5. Testing isHealthy...');
    const healthResult = await balanceManager.isHealthy();
    console.log('   Health result:', healthResult);
    
    console.log('✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testBalanceManager();
}

module.exports = { testBalanceManager };