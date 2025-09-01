# Gate.io API Setup and Security Guide

## Overview

This guide covers the secure setup of Gate.io API credentials and security procedures for the AI Crypto Trading Agent.

## Step 1: Create Gate.io Account

### Account Registration

1. Visit [Gate.io](https://www.gate.io)
2. Click **Sign Up** and create account
3. Complete email verification
4. Enable 2FA (Two-Factor Authentication)
5. Complete KYC verification (recommended)

### Security Setup

1. **Enable 2FA**:
   - Go to **Security** > **2FA Authentication**
   - Use Google Authenticator or similar app
   - Save backup codes securely

2. **Set Trading Password**:
   - Go to **Security** > **Trading Password**
   - Create strong trading password
   - Different from login password

3. **Enable Anti-Phishing Code**:
   - Go to **Security** > **Anti-Phishing Code**
   - Set unique code for email verification

## Step 2: API Key Creation

### Create API Key

1. Navigate to **API Management** > **Create API Key**
2. Configure API permissions:
   - ✅ **Spot Trading**: Enable
   - ✅ **Read Only**: Enable
   - ❌ **Futures Trading**: Disable (unless needed)
   - ❌ **Withdrawal**: Disable (security)
   - ❌ **Transfer**: Disable (security)

3. **IP Whitelist Configuration**:
   - Add Oracle Free Tier IP: `168.138.104.117`
   - Add backup IPs if needed
   - Never use `0.0.0.0/0` (security risk)

4. **API Key Details**:
   - **API Key**: Copy and save securely
   - **Secret Key**: Copy and save securely
   - **Passphrase**: Create strong passphrase

### API Key Security

```bash
# Store API credentials securely in .env
GATEIO_API_KEY="your_api_key_here"
GATEIO_API_SECRET="your_secret_key_here"
GATEIO_API_PASSPHRASE="your_passphrase_here"

# Encrypt sensitive environment variables
npm run encrypt:env
```

## Step 3: API Testing

### Test API Connectivity

```bash
# Test basic connectivity
curl -X GET "https://api.gateio.ws/api/v4/spot/currencies" \
  -H "Accept: application/json"

# Test authenticated endpoint
npm run test:api-connection
```

### Verify API Permissions

```javascript
// Test script: test-gateio-api.js
const { GateIOClient } = require('./src/trading/api/gate-io-client');

async function testAPI() {
  const client = new GateIOClient();
  
  try {
    // Test account info
    const account = await client.getAccountBalance();
    console.log('✅ Account access successful');
    
    // Test market data
    const ticker = await client.getMarketData('BTC_USDT');
    console.log('✅ Market data access successful');
    
    // Test order placement (dry run)
    const testOrder = await client.validateOrder({
      symbol: 'BTC_USDT',
      side: 'buy',
      amount: '0.001',
      price: '40000'
    });
    console.log('✅ Order validation successful');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testAPI();
```

## Step 4: Rate Limiting Configuration

### Gate.io Rate Limits

- **Public endpoints**: 100 requests per 10 seconds
- **Private endpoints**: 100 requests per 10 seconds
- **Order placement**: 100 orders per 10 seconds
- **Order cancellation**: 100 cancellations per 10 seconds

### Configure Rate Limiting

```typescript
// Rate limiting configuration
const rateLimitConfig = {
  public: {
    requests: 100,
    window: 10000, // 10 seconds
    strategy: 'sliding-window'
  },
  private: {
    requests: 100,
    window: 10000,
    strategy: 'sliding-window'
  },
  trading: {
    requests: 50,
    window: 10000,
    strategy: 'token-bucket'
  }
};
```

## Step 5: Security Monitoring

### API Usage Monitoring

```typescript
// API monitoring service
class APIMonitor {
  private requestCounts = new Map();
  private errorCounts = new Map();
  
  logRequest(endpoint: string, method: string) {
    const key = `${method}:${endpoint}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) || 0) + 1);
  }
  
  logError(endpoint: string, error: any) {
    const key = endpoint;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    
    // Alert on high error rates
    if (this.errorCounts.get(key) > 10) {
      this.sendAlert(`High error rate on ${endpoint}: ${error.message}`);
    }
  }
  
  generateReport() {
    return {
      requests: Object.fromEntries(this.requestCounts),
      errors: Object.fromEntries(this.errorCounts),
      timestamp: new Date().toISOString()
    };
  }
}
```

### Suspicious Activity Detection

```typescript
// Security monitoring for API usage
class APISecurityMonitor {
  private suspiciousPatterns = [
    'rapid_requests',
    'unusual_endpoints',
    'failed_auth',
    'rate_limit_exceeded'
  ];
  
  detectSuspiciousActivity(apiCall: APICall) {
    // Check for rapid requests
    if (this.isRapidRequests(apiCall)) {
      this.triggerAlert('RAPID_REQUESTS', apiCall);
    }
    
    // Check for unusual endpoints
    if (this.isUnusualEndpoint(apiCall)) {
      this.triggerAlert('UNUSUAL_ENDPOINT', apiCall);
    }
    
    // Check for authentication failures
    if (apiCall.status === 401) {
      this.triggerAlert('AUTH_FAILURE', apiCall);
    }
  }
  
  private triggerAlert(type: string, apiCall: APICall) {
    const alert = {
      type,
      timestamp: new Date(),
      details: apiCall,
      severity: this.getSeverity(type)
    };
    
    // Send to security monitoring system
    this.securityService.reportThreat(alert);
  }
}
```

## Step 6: Backup and Recovery

### API Key Backup

```bash
# Create encrypted backup of API credentials
#!/bin/bash

BACKUP_DIR="/secure/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup encrypted .env file
cp .env.encrypted $BACKUP_DIR/env_backup_$DATE.enc

# Backup API configuration
tar -czf $BACKUP_DIR/api_config_$DATE.tar.gz \
    config/api-config.json \
    config/rate-limits.json

echo "API configuration backed up: $DATE"
```

### Recovery Procedures

```bash
# API key recovery script
#!/bin/bash

echo "🔄 Starting API key recovery..."

# Stop trading to prevent issues
npm run trading:stop

# Restore from backup
BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Decrypt and restore
cp $BACKUP_FILE .env.encrypted
npm run decrypt:env

# Validate API keys
npm run test:api-connection

if [ $? -eq 0 ]; then
    echo "✅ API keys restored successfully"
    npm run trading:start
else
    echo "❌ API key validation failed"
    exit 1
fi
```

## Step 7: Advanced Security

### API Key Rotation

```typescript
// Automated API key rotation
class APIKeyRotation {
  async rotateKeys() {
    try {
      // Generate new API key via Gate.io API (if supported)
      const newKeys = await this.generateNewAPIKey();
      
      // Test new keys
      await this.testAPIKeys(newKeys);
      
      // Update configuration
      await this.updateConfiguration(newKeys);
      
      // Revoke old keys
      await this.revokeOldKeys();
      
      console.log('✅ API key rotation completed');
    } catch (error) {
      console.error('❌ API key rotation failed:', error);
      await this.rollbackRotation();
    }
  }
  
  private async testAPIKeys(keys: APIKeys) {
    const testClient = new GateIOClient(keys);
    await testClient.getAccountBalance();
  }
}
```

### Multi-Key Strategy

```typescript
// Multiple API key management for redundancy
class MultiKeyManager {
  private keys: APIKey[] = [];
  private currentKeyIndex = 0;
  
  async executeWithFailover<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < this.keys.length; i++) {
      try {
        const key = this.keys[this.currentKeyIndex];
        this.setActiveKey(key);
        
        const result = await operation();
        return result;
        
      } catch (error) {
        lastError = error;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
        
        // Log key failure
        console.warn(`API key ${this.currentKeyIndex} failed, trying next...`);
      }
    }
    
    throw new Error(`All API keys failed. Last error: ${lastError.message}`);
  }
}
```

## Troubleshooting

### Common Issues

1. **Authentication Errors (401)**
   - Verify API key and secret
   - Check IP whitelist
   - Ensure correct timestamp

2. **Rate Limit Exceeded (429)**
   - Implement exponential backoff
   - Reduce request frequency
   - Use request queuing

3. **Invalid Signature**
   - Check signature generation
   - Verify timestamp synchronization
   - Ensure correct encoding

### Diagnostic Tools

```bash
# Test API connectivity
npm run test:api

# Check rate limit status
npm run api:rate-limit-status

# Validate API signatures
npm run api:validate-signature

# Monitor API usage
npm run api:monitor
```

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 401 | Unauthorized | Check API credentials |
| 403 | Forbidden | Verify IP whitelist |
| 429 | Rate Limited | Implement backoff |
| 500 | Server Error | Retry with exponential backoff |

## Security Checklist

- [ ] API keys stored encrypted
- [ ] IP whitelist configured
- [ ] Rate limiting implemented
- [ ] Error monitoring active
- [ ] Backup procedures tested
- [ ] Key rotation scheduled
- [ ] Suspicious activity detection enabled
- [ ] Multi-key failover configured
- [ ] Regular security audits scheduled