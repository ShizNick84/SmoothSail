# Environment Configuration Guide

## Overview

This guide provides comprehensive instructions for configuring the AI Crypto Trading Agent environment, including all required environment variables, configuration files, and system settings.

## Environment Variables

### Core Configuration

Create a `.env` file in the project root with the following variables:

```bash
# Application Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
APP_NAME=ai-crypto-trading-agent
VERSION=1.0.0

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/crypto-trading
REDIS_URL=redis://localhost:6379
SQLITE_PATH=./data/config.db

# Security Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here
ENCRYPTION_KEY=your-256-bit-encryption-key-here
MASTER_KEY_ID=master-key-001
KEY_ROTATION_INTERVAL=604800000  # 7 days in milliseconds

# Gate.io API Configuration
GATEIO_API_KEY=your-gateio-api-key
GATEIO_API_SECRET=your-gateio-api-secret
GATEIO_PASSPHRASE=your-gateio-passphrase
GATEIO_SANDBOX=false
GATEIO_BASE_URL=https://api.gateio.ws/api/v4

# Oracle Free Tier SSH Tunnel Configuration
ORACLE_HOST=168.138.104.117
ORACLE_PORT=22
ORACLE_USERNAME=ubuntu
ORACLE_PRIVATE_KEY_PATH=./keys/oracle-private-key.pem
SSH_LOCAL_PORT=8080
SSH_REMOTE_PORT=80
SSH_KEEP_ALIVE=true
SSH_COMPRESSION=true

# Trading Configuration
INITIAL_BALANCE=10000
MAX_RISK_PER_TRADE=0.02
MIN_RISK_REWARD_RATIO=1.3
MAX_DRAWDOWN=0.15
STOP_LOSS_PERCENTAGE=0.01
EMERGENCY_STOP_THRESHOLD=0.20

# AI Configuration
LLM_MODEL=llama-3.2-3b-instruct
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=512
LLM_TOP_P=0.9
AI_CONFIDENCE_THRESHOLD=0.75
ENABLE_CONTINUOUS_LEARNING=true

# Sentiment Analysis Configuration
TWITTER_BEARER_TOKEN=your-twitter-bearer-token
REDDIT_CLIENT_ID=your-reddit-client-id
REDDIT_CLIENT_SECRET=your-reddit-client-secret
REDDIT_USER_AGENT=ai-crypto-trading-agent/1.0
NEWS_API_KEY=your-news-api-key
SENTIMENT_UPDATE_INTERVAL=300000  # 5 minutes in milliseconds

# Notification Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=AI Crypto Trading Agent <your-email@gmail.com>

TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
TELEGRAM_ENABLE_NOTIFICATIONS=true

# System Monitoring Configuration
SYSTEM_MONITOR_INTERVAL=60000  # 1 minute in milliseconds
CPU_ALERT_THRESHOLD=80
MEMORY_ALERT_THRESHOLD=85
DISK_ALERT_THRESHOLD=90
TEMPERATURE_ALERT_THRESHOLD=75

# Security Configuration
ENABLE_THREAT_DETECTION=true
SECURITY_SCAN_INTERVAL=3600000  # 1 hour in milliseconds
MAX_LOGIN_ATTEMPTS=3
LOCKOUT_DURATION=900000  # 15 minutes in milliseconds
SESSION_TIMEOUT=3600000  # 1 hour in milliseconds

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_INTERVAL=86400000  # 24 hours in milliseconds
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION=true
BACKUP_LOCATION=./backups

# Development Configuration (only for development)
DEBUG=false
MOCK_TRADING=false
ENABLE_API_DOCS=false
CORS_ORIGIN=http://localhost:3000
```

### Environment Variable Validation

The system validates all environment variables on startup:

```typescript
interface EnvironmentConfig {
  // Required variables that must be present
  required: string[];
  
  // Optional variables with default values
  optional: Record<string, string>;
  
  // Validation rules for each variable
  validation: Record<string, ValidationRule>;
}

interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'url' | 'email';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: string[];
}
```

### Sensitive Data Handling

**Important Security Notes:**

1. **Never commit `.env` files to version control**
2. **Use strong, unique passwords and API keys**
3. **Rotate credentials regularly**
4. **Use environment-specific configurations**
5. **Encrypt sensitive data at rest**

## Configuration Files

### Trading Configuration (`config/trading.json`)

```json
{
  "strategies": {
    "movingAverage": {
      "enabled": true,
      "fastPeriod": 20,
      "slowPeriod": 50,
      "volumeThreshold": 1.5,
      "weight": 0.3
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
      "weight": 0.2
    }
  },
  "riskManagement": {
    "maxRiskPerTrade": 0.02,
    "minRiskRewardRatio": 1.3,
    "maxDrawdown": 0.15,
    "stopLossPercentage": 0.01,
    "trailingStopEnabled": true,
    "emergencyStopThreshold": 0.20
  },
  "symbols": [
    {
      "symbol": "BTC_USDT",
      "enabled": true,
      "minOrderSize": 0.0001,
      "maxPositionSize": 0.1,
      "tickSize": 0.01
    },
    {
      "symbol": "ETH_USDT",
      "enabled": true,
      "minOrderSize": 0.001,
      "maxPositionSize": 1.0,
      "tickSize": 0.01
    }
  ]
}
```

### AI Configuration (`config/ai.json`)

```json
{
  "llm": {
    "model": "llama-3.2-3b-instruct",
    "parameters": {
      "temperature": 0.7,
      "maxTokens": 512,
      "topP": 0.9,
      "frequencyPenalty": 0.0,
      "presencePenalty": 0.0
    },
    "hardwareOptimization": {
      "enableQuantization": true,
      "batchSize": 4,
      "numThreads": 4,
      "memoryLimit": 8192
    }
  },
  "marketAnalysis": {
    "analysisInterval": 300000,
    "confidenceThreshold": 0.75,
    "includeNews": true,
    "includeSentiment": true,
    "analysisDepth": "COMPREHENSIVE"
  },
  "adaptiveLearning": {
    "enabled": true,
    "learningRate": 0.001,
    "adaptationFrequency": "DAILY",
    "performanceThreshold": 0.75,
    "enableContinuousLearning": true
  }
}
```

### Security Configuration (`config/security.json`)

```json
{
  "encryption": {
    "algorithm": "AES-256-GCM",
    "keyDerivation": "PBKDF2-SHA256",
    "saltLength": 32,
    "iterations": 100000,
    "keyRotationInterval": 604800000
  },
  "authentication": {
    "jwtExpiry": 3600,
    "refreshTokenExpiry": 86400,
    "maxLoginAttempts": 3,
    "lockoutDuration": 900000,
    "sessionTimeout": 3600000
  },
  "threatDetection": {
    "enabled": true,
    "scanInterval": 3600000,
    "anomalyThreshold": 0.8,
    "realTimeMonitoring": true,
    "threatIntelligence": true
  },
  "audit": {
    "enabled": true,
    "logLevel": "INFO",
    "retentionDays": 90,
    "integrityChecking": true,
    "tamperDetection": true
  }
}
```

### System Monitoring Configuration (`config/monitoring.json`)

```json
{
  "hardware": {
    "monitoringInterval": 60000,
    "alerts": {
      "cpu": {
        "warning": 70,
        "critical": 85
      },
      "memory": {
        "warning": 75,
        "critical": 90
      },
      "disk": {
        "warning": 80,
        "critical": 95
      },
      "temperature": {
        "warning": 70,
        "critical": 80
      }
    }
  },
  "network": {
    "monitoringInterval": 30000,
    "tunnelHealthCheck": 60000,
    "latencyThreshold": 100,
    "packetLossThreshold": 0.01
  },
  "application": {
    "healthCheckInterval": 30000,
    "performanceMetrics": true,
    "errorTracking": true,
    "memoryLeakDetection": true
  }
}
```

## Database Configuration

### MongoDB Configuration

Create `/etc/mongod.conf`:

```yaml
# mongod.conf
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo

security:
  authorization: enabled

replication:
  replSetName: "rs0"
```

### Redis Configuration

Create `/etc/redis/redis.conf`:

```conf
# Redis configuration
bind 127.0.0.1
port 6379
timeout 0
tcp-keepalive 300

# Memory management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Security
requirepass your-redis-password

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

## SSL/TLS Configuration

### Generate SSL Certificates

```bash
# Generate private key
openssl genrsa -out server.key 4096

# Generate certificate signing request
openssl req -new -key server.key -out server.csr

# Generate self-signed certificate (for development)
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt

# For production, use Let's Encrypt or a trusted CA
```

### SSL Configuration (`config/ssl.json`)

```json
{
  "enabled": true,
  "keyPath": "./certs/server.key",
  "certPath": "./certs/server.crt",
  "caPath": "./certs/ca.crt",
  "protocols": ["TLSv1.2", "TLSv1.3"],
  "ciphers": [
    "ECDHE-RSA-AES256-GCM-SHA384",
    "ECDHE-RSA-AES128-GCM-SHA256",
    "ECDHE-RSA-AES256-SHA384",
    "ECDHE-RSA-AES128-SHA256"
  ],
  "honorCipherOrder": true,
  "secureProtocol": "TLSv1_2_method"
}
```

## Logging Configuration

### Winston Logging Configuration (`config/logging.json`)

```json
{
  "level": "info",
  "format": "json",
  "transports": [
    {
      "type": "console",
      "level": "info",
      "colorize": true
    },
    {
      "type": "file",
      "level": "info",
      "filename": "./logs/application.log",
      "maxsize": 10485760,
      "maxFiles": 10,
      "tailable": true
    },
    {
      "type": "file",
      "level": "error",
      "filename": "./logs/error.log",
      "maxsize": 10485760,
      "maxFiles": 5,
      "tailable": true
    },
    {
      "type": "dailyRotateFile",
      "level": "info",
      "filename": "./logs/trading-%DATE%.log",
      "datePattern": "YYYY-MM-DD",
      "maxSize": "20m",
      "maxFiles": "30d"
    }
  ],
  "exceptionHandlers": [
    {
      "type": "file",
      "filename": "./logs/exceptions.log"
    }
  ],
  "rejectionHandlers": [
    {
      "type": "file",
      "filename": "./logs/rejections.log"
    }
  ]
}
```

## Performance Tuning

### Node.js Performance Configuration

```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"

# Enable V8 optimizations
export NODE_OPTIONS="$NODE_OPTIONS --optimize-for-size"

# Enable garbage collection logging
export NODE_OPTIONS="$NODE_OPTIONS --trace-gc"
```

### System Performance Tuning

```bash
# Increase file descriptor limits
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# Optimize network settings
echo "net.core.somaxconn = 65536" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65536" >> /etc/sysctl.conf

# Apply changes
sysctl -p
```

## Configuration Validation

### Environment Validation Script

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  MONGODB_URI: z.string().url(),
  GATEIO_API_KEY: z.string().min(32),
  GATEIO_API_SECRET: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().length(64),
  ORACLE_HOST: z.string().ip(),
  INITIAL_BALANCE: z.string().transform(Number).pipe(z.number().positive()),
  MAX_RISK_PER_TRADE: z.string().transform(Number).pipe(z.number().min(0.001).max(0.1)),
});

export function validateEnvironment() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('Environment validation failed:', error);
    process.exit(1);
  }
}
```

## Configuration Management

### Configuration Loading Priority

1. **Environment Variables** (highest priority)
2. **Configuration Files** (`.json` files)
3. **Default Values** (lowest priority)

### Dynamic Configuration Updates

```typescript
class ConfigurationManager {
  private config: Configuration;
  private watchers: Map<string, fs.FSWatcher> = new Map();

  constructor() {
    this.loadConfiguration();
    this.watchConfigurationFiles();
  }

  private watchConfigurationFiles(): void {
    const configFiles = [
      'config/trading.json',
      'config/ai.json',
      'config/security.json',
      'config/monitoring.json'
    ];

    configFiles.forEach(file => {
      const watcher = fs.watch(file, (eventType) => {
        if (eventType === 'change') {
          this.reloadConfiguration();
        }
      });
      this.watchers.set(file, watcher);
    });
  }

  private reloadConfiguration(): void {
    console.log('Configuration changed, reloading...');
    this.loadConfiguration();
    this.notifyConfigurationChange();
  }
}
```

## Best Practices

### Security Best Practices

1. **Use Strong Passwords**: Minimum 16 characters with complexity
2. **Rotate Credentials**: Regular rotation of API keys and passwords
3. **Encrypt Sensitive Data**: All sensitive configuration encrypted
4. **Limit Access**: Principle of least privilege for all configurations
5. **Monitor Changes**: Log all configuration changes

### Performance Best Practices

1. **Resource Limits**: Set appropriate memory and CPU limits
2. **Connection Pooling**: Use connection pooling for databases
3. **Caching**: Cache frequently accessed configuration
4. **Monitoring**: Monitor configuration impact on performance
5. **Optimization**: Regular performance tuning and optimization

### Operational Best Practices

1. **Version Control**: Track configuration changes in version control
2. **Documentation**: Document all configuration parameters
3. **Testing**: Test configuration changes in staging environment
4. **Backup**: Regular backup of configuration files
5. **Validation**: Validate configuration before deployment

This comprehensive configuration guide ensures proper setup and optimal performance of the AI Crypto Trading Agent system.