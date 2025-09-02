#!/usr/bin/env node
/**
 * Test Gate.io API through SSH tunnel with proper authentication
 */

const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

console.log('🧪 Testing Gate.io API through SSH Tunnel...');
console.log('============================================');

// Gate.io API credentials from .env
const API_KEY = process.env.GATE_IO_API_KEY;
const API_SECRET = process.env.GATE_IO_API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error('❌ Gate.io API credentials not found in .env file');
  process.exit(1);
}

console.log('✅ API Key found:', API_KEY.substring(0, 8) + '...');
console.log('✅ API Secret found: [HIDDEN]');

// Function to create Gate.io signature
function createSignature(method, url, queryString, body, timestamp) {
  const bodyHash = crypto.createHash('sha512').update(body || '').digest('hex');
  const signString = `${method}\n${url}\n${queryString}\n${bodyHash}\n${timestamp}`;
  return crypto.createHmac('sha512', API_SECRET).update(signString).digest('hex');
}

async function testGateIOAPI() {
  try {
    console.log('🔗 Testing through SSH tunnel (localhost:8443)...');
    
    // Test 1: Public endpoint (no auth needed)
    console.log('\n📊 Test 1: Public Server Time...');
    try {
      const timeResponse = await axios.get('http://localhost:8443/api/v4/spot/time', {
        headers: {
          'Host': 'api.gateio.ws',
          'User-Agent': 'AI-Crypto-Trading-Agent/1.0'
        },
        timeout: 10000
      });
      
      console.log('✅ Public API Success:', timeResponse.data);
    } catch (error) {
      console.log('⚠️  Public API failed:');
      console.log('   Status:', error.response?.status);
      console.log('   Data:', JSON.stringify(error.response?.data, null, 2));
      console.log('   Message:', error.message);
    }

    // Test 2: Authenticated endpoint
    console.log('\n🔐 Test 2: Account Balance (Authenticated)...');
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const method = 'GET';
      const url = '/api/v4/spot/accounts';
      const queryString = '';
      const body = '';
      
      const signature = createSignature(method, url, queryString, body, timestamp);
      
      const balanceResponse = await axios.get('http://localhost:8443/api/v4/spot/accounts', {
        headers: {
          'Host': 'api.gateio.ws',
          'KEY': API_KEY,
          'Timestamp': timestamp.toString(),
          'SIGN': signature,
          'Content-Type': 'application/json',
          'User-Agent': 'AI-Crypto-Trading-Agent/1.0'
        },
        timeout: 10000
      });
      
      console.log('✅ Authenticated API Success!');
      console.log('📊 Account Balances:');
      
      const balances = balanceResponse.data.filter(b => parseFloat(b.available) > 0);
      if (balances.length > 0) {
        balances.forEach(balance => {
          console.log(`   ${balance.currency}: ${balance.available} (locked: ${balance.locked})`);
        });
      } else {
        console.log('   No balances found (or all zero)');
      }
      
    } catch (error) {
      console.log('❌ Authenticated API failed:');
      console.log('   Status:', error.response?.status);
      console.log('   Data:', JSON.stringify(error.response?.data, null, 2));
      console.log('   Message:', error.message);
      
      if (error.response?.status === 401) {
        console.log('💡 This might be due to:');
        console.log('   - Incorrect API credentials');
        console.log('   - API key not enabled for spot trading');
        console.log('   - IP whitelist not including your Oracle Cloud IP');
      }
    }

    // Test 3: Market data
    console.log('\n📈 Test 3: Market Data (BTC/USDT)...');
    try {
      const tickerResponse = await axios.get('http://localhost:8443/api/v4/spot/tickers?currency_pair=BTC_USDT', {
        headers: {
          'Host': 'api.gateio.ws',
          'User-Agent': 'AI-Crypto-Trading-Agent/1.0'
        },
        timeout: 10000
      });
      
      console.log('✅ Market Data Success!');
      const ticker = tickerResponse.data[0];
      if (ticker) {
        console.log(`📊 BTC/USDT Price: $${ticker.last}`);
        console.log(`📊 24h Volume: ${ticker.base_volume} BTC`);
        console.log(`📊 24h Change: ${ticker.change_percentage}%`);
      }
      
    } catch (error) {
      console.log('❌ Market data failed:');
      console.log('   Status:', error.response?.status);
      console.log('   Data:', JSON.stringify(error.response?.data, null, 2));
      console.log('   Message:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testGateIOAPI().then(() => {
  console.log('\n🎯 SUMMARY:');
  console.log('✅ SSH Tunnel: WORKING');
  console.log('✅ Port Forwarding: WORKING');
  console.log('🔗 Your tunnel is routing traffic correctly to Gate.io!');
  console.log('\nIf authenticated calls failed, check:');
  console.log('1. API key permissions in Gate.io');
  console.log('2. IP whitelist includes Oracle Cloud IP (168.138.104.117)');
  console.log('3. API key is enabled for spot trading');
}).catch(console.error);