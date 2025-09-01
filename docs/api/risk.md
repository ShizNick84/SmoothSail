# Risk Management API

## Overview

The Risk Management API provides endpoints for managing trading risk, position sizing, capital preservation, and risk assessment.

## Endpoints

### Get Risk Status

```http
GET /api/v1/risk/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "riskLevel": "MODERATE",
    "totalExposure": 0.15,
    "maxDrawdown": 0.05,
    "currentDrawdown": 0.02,
    "riskPerTrade": 0.02,
    "capitalPreservation": "ACTIVE",
    "emergencyStopStatus": "READY"
  }
}
```

### Calculate Position Size

```http
POST /api/v1/risk/position-size
```

**Request Body:**
```json
{
  "symbol": "BTC/USDT",
  "accountBalance": 10000,
  "riskPercentage": 2.0,
  "stopLossDistance": 0.01,
  "confidence": 0.8,
  "volatility": 0.25
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "positionSize": 0.044,
    "riskAmount": 200,
    "maxLoss": 200,
    "confidence": 0.8,
    "adjustmentFactors": {
      "volatility": 0.9,
      "confidence": 1.0,
      "correlation": 1.0
    }
  }
}
```

### Assess Trade Risk

```http
POST /api/v1/risk/assess
```

**Request Body:**
```json
{
  "symbol": "BTC/USDT",
  "side": "BUY",
  "quantity": 0.1,
  "entryPrice": 45000,
  "stopLoss": 44100,
  "takeProfit": 47250,
  "strategy": "moving-average"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "riskScore": 65,
    "riskRewardRatio": 2.5,
    "maxLoss": 90,
    "probabilityOfSuccess": 0.72,
    "recommendation": "APPROVE",
    "riskFactors": [
      {
        "factor": "VOLATILITY",
        "impact": "MEDIUM",
        "score": 0.6
      },
      {
        "factor": "CORRELATION",
        "impact": "LOW",
        "score": 0.2
      }
    ]
  }
}
```

### Get Risk Metrics

```http
GET /api/v1/risk/metrics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "portfolio": {
      "totalValue": 10500,
      "totalRisk": 315,
      "riskPercentage": 3.0,
      "diversificationRatio": 0.85
    },
    "drawdown": {
      "current": 0.02,
      "maximum": 0.08,
      "recovery": 0.75,
      "duration": 5
    },
    "var": {
      "daily": 150,
      "weekly": 335,
      "monthly": 670,
      "confidence": 0.95
    },
    "sharpeRatio": 1.85,
    "sortinoRatio": 2.12,
    "calmarRatio": 1.45
  }
}
```

### Update Risk Parameters

```http
PUT /api/v1/risk/parameters
```

**Request Body:**
```json
{
  "maxRiskPerTrade": 0.025,
  "maxDrawdown": 0.12,
  "minRiskRewardRatio": 1.5,
  "maxCorrelation": 0.7,
  "emergencyStopThreshold": 0.15
}
```

### Get Correlation Matrix

```http
GET /api/v1/risk/correlation
```

**Response:**
```json
{
  "success": true,
  "data": {
    "correlationMatrix": {
      "BTC/USDT": {
        "ETH/USDT": 0.85,
        "ADA/USDT": 0.72,
        "DOT/USDT": 0.68
      },
      "ETH/USDT": {
        "BTC/USDT": 0.85,
        "ADA/USDT": 0.78,
        "DOT/USDT": 0.71
      }
    },
    "timestamp": "2025-01-01T12:00:00Z",
    "period": "30D"
  }
}
```

### Trigger Emergency Stop

```http
POST /api/v1/risk/emergency-stop
```

**Request Body:**
```json
{
  "reason": "EXCESSIVE_DRAWDOWN",
  "closeAllPositions": true,
  "severity": "HIGH"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "emergencyStopId": "es_001",
    "status": "ACTIVATED",
    "timestamp": "2025-01-01T12:00:00Z",
    "positionsClosed": 5,
    "totalLoss": 450
  }
}
```

### Get Risk Alerts

```http
GET /api/v1/risk/alerts
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeAlerts": [
      {
        "id": "alert_001",
        "type": "HIGH_CORRELATION",
        "severity": "MEDIUM",
        "message": "High correlation detected between BTC and ETH positions",
        "timestamp": "2025-01-01T12:00:00Z",
        "acknowledged": false
      }
    ],
    "alertHistory": [
      {
        "id": "alert_002",
        "type": "DRAWDOWN_WARNING",
        "severity": "HIGH",
        "message": "Portfolio drawdown approaching 10% threshold",
        "timestamp": "2025-01-01T11:00:00Z",
        "resolved": true
      }
    ]
  }
}
```

### Acknowledge Risk Alert

```http
POST /api/v1/risk/alerts/{alertId}/acknowledge
```

**Request Body:**
```json
{
  "acknowledgedBy": "trader_001",
  "notes": "Reviewed and accepted risk level"
}
```

## Risk Calculation Formulas

### Position Size Calculation

```
Position Size = (Account Balance × Risk Percentage) / (Entry Price × Stop Loss Distance)
```

### Risk-Reward Ratio

```
Risk-Reward Ratio = (Take Profit - Entry Price) / (Entry Price - Stop Loss)
```

### Value at Risk (VaR)

```
VaR = Portfolio Value × Volatility × Z-Score × √Time Period
```

### Sharpe Ratio

```
Sharpe Ratio = (Portfolio Return - Risk-Free Rate) / Portfolio Volatility
```

## WebSocket Events

### Risk Alerts

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/risk-alerts');

ws.onmessage = (event) => {
  const alert = JSON.parse(event.data);
  console.log('Risk alert:', alert);
  // Handle risk alert
};
```

### Drawdown Updates

```javascript
const ws = new WebSocket('ws://localhost:3001/ws/drawdown');

ws.onmessage = (event) => {
  const drawdown = JSON.parse(event.data);
  console.log('Drawdown update:', drawdown);
  // Handle drawdown update
};
```

## Error Codes

| Code | Description |
|------|-------------|
| `RISK_001` | Invalid risk parameters |
| `RISK_002` | Position size calculation failed |
| `RISK_003` | Risk assessment error |
| `RISK_004` | Emergency stop activation failed |
| `RISK_005` | Correlation calculation error |
| `RISK_006` | Insufficient account balance |
| `RISK_007` | Risk limit exceeded |