# Trading Engine API

## Overview

The Trading Engine API provides endpoints for managing trading operations, strategies, and positions.

## Endpoints

### Get Trading Status

```http
GET /api/v1/trading/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ACTIVE",
    "activeStrategies": ["moving-average", "rsi", "macd"],
    "totalPositions": 3,
    "totalPnL": 1250.75,
    "dailyPnL": 125.50,
    "riskExposure": 0.15
  }
}
```

### Start Trading

```http
POST /api/v1/trading/start
```

**Request Body:**
```json
{
  "strategies": ["moving-average", "rsi", "macd"],
  "symbols": ["BTC/USDT", "ETH/USDT"],
  "riskLevel": "MODERATE"
}
```

### Stop Trading

```http
POST /api/v1/trading/stop
```

**Request Body:**
```json
{
  "closePositions": true,
  "reason": "Manual stop"
}
```

### Get Active Positions

```http
GET /api/v1/trading/positions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "id": "pos_123",
        "symbol": "BTC/USDT",
        "side": "LONG",
        "quantity": 0.1,
        "entryPrice": 45000,
        "currentPrice": 46000,
        "unrealizedPnL": 100,
        "stopLoss": 44100,
        "takeProfit": 47250
      }
    ]
  }
}
```

### Execute Manual Trade

```http
POST /api/v1/trading/execute
```

**Request Body:**
```json
{
  "symbol": "BTC/USDT",
  "side": "BUY",
  "quantity": 0.1,
  "type": "MARKET",
  "stopLoss": 44000,
  "takeProfit": 47000
}
```