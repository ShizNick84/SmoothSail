# Configuration Guide

## Overview

The AI Crypto Trading Agent uses environment variables for configuration. All sensitive data is stored in the `.env` file with encryption support.

## Environment Configuration

### Required Environment Variables

Copy `.env.example` to `.env` and configure the following:

```bash
# System Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=sqlite:./data/trading.db

# Gate.io API Configuration
GATEIO_API_KEY=your_api_key_here
GATEIO_API_SECRET=your_api_secret_here
GATEIO_API_PASSPHRASE=your_passphrase_here

# Oracle Free Tier SSH Configuration
ORACLE_HOST=168.138.104.117
ORACLE_USER=ubuntu
ORACLE_SSH_KEY_PATH=/path/to/private/key
ORACLE_SSH_PORT=22

# Security Configuration
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here
SECURITY_SALT=your_security_salt_here

# Notification Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=AI Trading Bot <your_email@gmail.com>

TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Trading Configuration
DEFAULT_RISK_PERCENTAGE=2.5
MAX_POSITIONS=5
MIN_RISK_REWARD_RATIO=1.3
STOP_LOSS_PERCENTAGE=1.0

# AI Configuration
LLM_MODEL_PATH=/path/to/llm/model
LLM_MAX_TOKENS=2048
LLM_TEMPERATURE=0.7

# Sentiment Analysis Configuration
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_USER_AGENT=AI_Trading_Bot/1.0
```

## Configuration Validation

The system validates all configuration on startup:

```typescript
// Environment validation schema
const envSchema = {
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number),
  GATEIO_API_KEY: z.string().min(1),
  GATEIO_API_SECRET: z.string().min(1),
  // ... additional validations
};
```

## Trading Strategy Configuration

Configure trading strategies in `config/strategies.json`:

```json
{
  "movingAverage": {
    "enabled": true,
    "shortPeriod": 20,
    "longPeriod": 50,
    "weight": 0.25
  },
  "rsi": {
    "enabled": true,
    "period": 14,
    "overbought": 70,
    "oversold": 30,
    "weight": 0.25
  },
  "macd": {
    "enabled": true,
    "fastPeriod": 12,
    "slowPeriod": 26,
    "signalPeriod": 9,
    "weight": 0.25
  },
  "fibonacci": {
    "enabled": true,
    "levels": [0.236, 0.382, 0.5, 0.618, 0.786],
    "weight": 0.25
  }
}
```

## Risk Management Configuration

Configure risk parameters in `config/risk.json`:

```json
{
  "positionSizing": {
    "defaultRiskPercentage": 2.5,
    "maxRiskPercentage": 5.0,
    "minRiskPercentage": 1.0
  },
  "stopLoss": {
    "defaultPercentage": 1.0,
    "trailingEnabled": true,
    "trailingDistance": 0.5
  },
  "riskReward": {
    "minimumRatio": 1.3,
    "targetRatio": 2.0
  },
  "portfolio": {
    "maxPositions": 5,
    "maxCorrelation": 0.7,
    "maxDrawdown": 10.0
  }
}
```