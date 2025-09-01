# API Documentation

## Overview

The AI Crypto Trading Agent provides comprehensive REST APIs for system management, trading operations, and monitoring. All APIs are secured with JWT authentication and rate limiting.

## Base URL

```
http://localhost:3001/api/v1
```

## Authentication

All API endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Core APIs

### Trading APIs
- [Trading Engine API](./trading.md) - Core trading operations and position management
- [Risk Management API](./risk.md) - Position sizing, risk assessment, and capital protection
- [Strategy Management API](./strategies.md) - Trading strategy configuration and management
- [Order Management API](./orders.md) - Order placement, tracking, and execution

### System APIs
- [System Monitoring API](./system.md) - Intel NUC hardware monitoring and performance
- [Security API](./security.md) - Military-grade security, threat detection, and incident response
- [Infrastructure API](./infrastructure.md) - SSH tunnel management and system infrastructure
- [Notification API](./notifications.md) - Email and Telegram notification management

### AI & Analytics APIs
- [AI Integration API](./ai.md) - LLM integration, market analysis, and decision explanation
- [Sentiment Analysis API](./sentiment.md) - Twitter, Reddit, and news sentiment monitoring
- [Market Data API](./market-data.md) - Real-time and historical market data
- [Performance Analytics API](./analytics.md) - Trading performance and backtesting analytics

## Rate Limiting

API requests are rate limited to prevent abuse:
- Standard endpoints: 100 requests per minute
- Trading endpoints: 50 requests per minute
- System endpoints: 20 requests per minute

## Error Handling

All APIs return standardized error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {},
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

## Response Format

Successful responses follow this format:

```json
{
  "success": true,
  "data": {},
  "metadata": {
    "timestamp": "2025-01-01T00:00:00Z",
    "version": "1.0.0"
  }
}
```
## We
bSocket APIs

### Real-time Market Data

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/market-data');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Market update:', data);
};
```

### Trading Signals

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/trading-signals');

ws.onmessage = (event) => {
  const signal = JSON.parse(event.data);
  console.log('Trading signal:', signal);
};
```

### System Status

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/system-status');

ws.onmessage = (event) => {
  const status = JSON.parse(event.data);
  console.log('System status:', status);
};
```

## SDK Examples

### Node.js SDK

```javascript
const { TradingClient } = require('ai-crypto-trading-sdk');

const client = new TradingClient({
  apiKey: 'your-api-key',
  baseUrl: 'http://localhost:3001'
});

// Get trading status
const status = await client.trading.getStatus();

// Execute trade
const trade = await client.trading.execute({
  symbol: 'BTC/USDT',
  side: 'BUY',
  quantity: 0.1
});
```

### Python SDK

```python
from ai_crypto_trading import TradingClient

client = TradingClient(
    api_key='your-api-key',
    base_url='http://localhost:3001'
)

# Get positions
positions = client.trading.get_positions()

# Get system metrics
metrics = client.system.get_metrics()
```