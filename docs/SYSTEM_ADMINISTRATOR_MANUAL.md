# AI Crypto Trading Agent - System Administrator Manual

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Installation and Deployment](#installation-and-deployment)
4. [Configuration](#configuration)
5. [Service Management](#service-management)
6. [API Documentation](#api-documentation)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Error Handling System](#error-handling-system)
9. [Troubleshooting](#troubleshooting)
10. [Security](#security)
11. [Backup and Recovery](#backup-and-recovery)
12. [Performance Optimization](#performance-optimization)
13. [Emergency Procedures](#emergency-procedures)

---

## System Overview

The AI Crypto Trading Agent is a military-grade, security-first cryptocurrency trading system designed to run 24/7 on Intel NUC hardware. The system focuses on capital preservation while maximizing profit potential through sophisticated AI-driven trading strategies, advanced risk management, and comprehensive threat protection.

### Key Features

- 🔒 Military-grade security with threat detection
- 📈 Multi-strategy trading (MA, RSI, MACD, Fibonacci)
- 🤖 AI-powered market analysis and decision making
- 💰 Advanced risk management and capital preservation
- 🌐 SSH tunnel through Oracle Free Tier
- 📱 Modern responsive dashboard with PWA support
- 📧 Comprehensive notification system
- 🔧 Intel NUC hardware optimization
- 📊 Real-time monitoring and analytics
- 🛡️ Automated incident response

### System Components

- **Trading Engine**: Advanced multi-strategy trading with technical indicators
- **AI & LLM Integration**: Market analysis and decision explanation
- **Security Layer**: Military-grade encryption and threat detection
- **Risk Management**: Dynamic position sizing and capital preservation
- **Infrastructure**: Intel NUC optimization and SSH tunnel management
- **Dashboard**: Modern PWA with dark/light theme support
- **Notifications**: Email and Telegram integration

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Crypto Trading Agent                      │
├─────────────────────────────────────────────────────────────────┤
│  Security Layer (Military-Grade Protection)                    │
│  ├── Threat Detection Engine                                   │
│  ├── Intrusion Prevention System                               │
│  ├── Encryption & Key Management                               │
│  └── Incident Response System                                  │
├─────────────────────────────────────────────────────────────────┤
│  Trading Engine Core                                           │
│  ├── Strategy Engine (MA, RSI, MACD, Fibonacci)               │
│  ├── Risk Management System                                    │
│  ├── Position Manager                                          │
│  └── Order Execution Engine                                    │
├─────────────────────────────────────────────────────────────────┤
│  AI & Analytics Layer                                          │
│  ├── LLM Integration (Optimized for i5/12GB)                  │
│  ├── Sentiment Analysis Engine                                 │
│  ├── Market Data Processor                                     │
│  └── Performance Analytics                                     │
├─────────────────────────────────────────────────────────────────┤
│  Communication Layer                                           │
│  ├── SSH Tunnel Manager (Oracle Free Tier)                    │
│  ├── Gate.io API Client                                        │
│  ├── Notification System (Email/Telegram)                      │
│  └── Dashboard API                                             │
├─────────────────────────────────────────────────────────────────┤
│  Infrastructure Layer                                          │
│  ├── System Monitor (Intel NUC)                               │
│  ├── Database Layer                                            │
│  ├── Logging & Audit System                                    │
│  └── Backup & Recovery                                         │
└─────────────────────────────────────────────────────────────────┘
```
##
# Network Architecture

```
┌───────────────────────────────────────────────────────────────────────────── ┐
│                           Home Network (Intel NUC)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Trading Bot   │  │   Web Dashboard │  │   Database   │  │ Telegram/   │ │
│  │   (Node.js)     │  │   (Next.js)     │  │ (PostgreSQL) │  │ Email Bot   │ │
│  │   Port: 3001    │  │   Port: 3000    │  │ Port: 5432   │  │             │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  └─────────────┘ │
│           │                     │                  |                 |       │
│           └─────────────────────┼────────────────────────────────────────────┤
│                                 │                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        SSH Tunnel Manager                               │ │
│  │                     localhost:8443 -> Oracle                            │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────── ┘
                                │
                                ▼ (SSH Tunnel)
                    ┌─────────────────────────┐
                    │    Oracle Cloud Free    │
                    │    Ubuntu Server        │
                    │   168.138.104.117       │
                    └─────────────────────────┘
                                │
                                ▼ (Proxy to Gate.io)
                    ┌─────────────────────────┐
                    │      Gate.io API        │
                    │   api.gateio.ws:443     │
                    └─────────────────────────┘
```

### Core Components

#### 1. Security Layer
- **Threat Detection Engine**: Real-time monitoring and anomaly detection
- **Encryption Service**: AES-256 encryption for sensitive data
- **Key Management**: Secure key storage and rotation
- **Incident Response**: Automated threat containment

#### 2. Trading Engine
- **Strategy Engine**: Multi-indicator trading strategies
- **Risk Manager**: Dynamic position sizing and stop losses
- **Order Manager**: Execution and monitoring
- **Portfolio Manager**: Position tracking and P&L calculation

#### 3. AI & Analytics
- **LLM Engine**: Market analysis and decision explanation
- **Sentiment Analyzer**: Social media and news sentiment
- **Market Analyzer**: Pattern recognition and trend analysis
- **Performance Analytics**: Strategy optimization

#### 4. Infrastructure
- **System Monitor**: Hardware monitoring and optimization
- **SSH Tunnel Manager**: Secure connection to Oracle Free Tier
- **Database**: PostgreSQL for production data storage
- **Logging System**: Comprehensive audit trails

---

## Installation and Deployment

### System Requirements

#### Hardware Requirements (Intel NUC)
- Intel i5 processor or better
- 12GB RAM minimum
- 256GB SSD storage
- Gigabit Ethernet connection
- Ubuntu 22.04 LTS

#### Software Prerequisites
- Ubuntu Server 20.04 LTS or newer
- Node.js 18+ and npm
- PostgreSQL 14+
- SSH client (usually pre-installed)
- Git (for cloning the repository)

### Pre-Deployment Checklist

#### System Requirements
- [ ] Intel NUC with Ubuntu 22.04 LTS
- [ ] Node.js 18.0.0+ installed
- [ ] SSH access to Oracle Free Tier (168.138.104.117)
- [ ] Gate.io API credentials configured
- [ ] Email and Telegram credentials configured

#### Security Requirements
- [ ] Firewall configured (UFW)
- [ ] Fail2Ban installed and configured
- [ ] SSH keys generated and deployed
- [ ] SSL certificates obtained (if using HTTPS)
- [ ] Environment variables encrypted

#### Network Requirements
- [ ] Internet connectivity verified
- [ ] SSH tunnel to Oracle tested
- [ ] Gate.io API connectivity tested
- [ ] Email SMTP connectivity tested
- [ ] Telegram bot connectivity tested

### Installation Steps

#### 1. Install System Dependencies

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install additional tools
sudo apt install -y git openssh-client net-tools fail2ban ufw

# Verify installations
node --version
npm --version
ssh -V
psql --version
```

#### 2. Create System User and Directories

```bash
# Create trading user
sudo useradd -m -s /bin/bash trading
sudo usermod -aG sudo trading

# Create application directory
sudo mkdir -p /opt/trading-agent
sudo chown trading:trading /opt/trading-agent

# Create log directories
sudo mkdir -p /var/log/trading-agent
sudo chown trading:trading /var/log/trading-agent
```

#### 3. Clone and Setup Project

```bash
# Switch to trading user
sudo su - trading

# Clone the repository
cd /opt/trading-agent
git clone <your-repo-url> .

# Install dependencies
npm install

# Make scripts executable
chmod +x scripts/*.sh
chmod +x *.sh
```####
 4. Configure Database

```bash
# Switch to postgres user
sudo su - postgres

# Create database and user
createdb trading_agent
createuser --interactive trading_user

# Set password for trading_user
psql -c "ALTER USER trading_user PASSWORD 'secure_password';"

# Grant privileges
psql -c "GRANT ALL PRIVILEGES ON DATABASE trading_agent TO trading_user;"

# Exit postgres user
exit
```

#### 5. Configure Environment

```bash
# Copy and edit environment file
cp .env.example .env
nano .env
```

Configure these essential settings:
```bash
# System Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database Configuration
DATABASE_URL=postgresql://trading_user:secure_password@localhost:5432/trading_agent

# Oracle SSH Configuration
ORACLE_SSH_HOST=168.138.104.117
ORACLE_SSH_USERNAME=opc
SSH_PRIVATE_KEY_PATH=/opt/trading-agent/keys/oracle_key

# Gate.io API Configuration
GATE_IO_API_KEY=your_api_key
GATE_IO_API_SECRET=your_api_secret
GATE_IO_BASE_URL=http://localhost:8443/api/v4

# Notification Configuration
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

#### 6. Setup SSH Keys

```bash
# Create keys directory
mkdir -p keys

# Copy Oracle Cloud private key
# (Transfer your Oracle Cloud private key to keys/oracle_key)

# Set correct permissions
chmod 600 keys/oracle_key
chown trading:trading keys/oracle_key

# Test SSH connection
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i keys/oracle_key opc@168.138.104.117 "echo 'Connection test successful'"
```

#### 7. Build Application

```bash
# Build the project
npm run build

# Test SSH tunnel
./start-tunnel.sh

# In another terminal, test API connectivity
curl -H "Host: api.gateio.ws" https://localhost:8443/api/v4/spot/currencies

# Stop tunnel
./stop-tunnel.sh
```

---

## Configuration

### Environment Configuration

The system uses environment variables for configuration. All sensitive data is stored in the `.env` file with encryption support.

#### Required Environment Variables

```bash
# System Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
LOG_LEVEL=info

# Database Configuration
DATABASE_URL=postgresql://trading_user:secure_password@localhost:5432/trading_agent

# Gate.io API Configuration
GATEIO_API_KEY=your_api_key_here
GATEIO_API_SECRET=your_api_secret_here
GATE_IO_BASE_URL=http://localhost:8443/api/v4

# Oracle SSH Configuration
ORACLE_SSH_HOST=168.138.104.117
ORACLE_SSH_USERNAME=opc
SSH_PRIVATE_KEY_PATH=/opt/trading-agent/keys/oracle_key

# Security Configuration
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# Notification Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Trading Configuration
DEFAULT_RISK_PERCENTAGE=2.5
MAX_POSITIONS=5
MIN_RISK_REWARD_RATIO=1.3
STOP_LOSS_PERCENTAGE=1.0
```

---

## Service Management

### systemd Services

The system uses systemd services for production deployment on Intel NUC.

#### Service Installation

```bash
# Copy service files
sudo cp systemd/*.service /etc/systemd/system/

# Reload systemd daemon
sudo systemctl daemon-reload

# Enable services for auto-start
sudo systemctl enable ssh-tunnel
sudo systemctl enable trading-agent
sudo systemctl enable trading-dashboard

# Start services
sudo systemctl start ssh-tunnel
sudo systemctl start trading-agent
sudo systemctl start trading-dashboard
```

#### Service Management Commands

```bash
# Check status of all services
sudo systemctl status ssh-tunnel trading-agent trading-dashboard

# Start/stop individual services
sudo systemctl start ssh-tunnel
sudo systemctl stop trading-agent
sudo systemctl restart trading-dashboard

# View logs
sudo journalctl -u ssh-tunnel -f
sudo journalctl -u trading-agent -f
sudo journalctl -u trading-dashboard -f
```

---

## Error Handling System

### Overview

The AI Crypto Trading System includes a comprehensive error handling infrastructure that provides automatic recovery, monitoring, and alerting capabilities across all system components.

### Error Handling Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Trading Error  │────│ System Error    │────│ Error Dashboard │
│  Handler        │    │ Manager         │    │ & Monitoring    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ AI Error        │    │ Network Error   │    │ Notification    │
│ Handler         │    │ Handler         │    │ Service         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Error Types and Codes

#### Trading Errors (TE)
| Code | Description | Severity | Auto-Retry | Action |
|------|-------------|----------|------------|--------|
| TE001 | Order execution failed | HIGH | Yes | Check API connectivity |
| TE002 | API connection lost | CRITICAL | Yes | Restart SSH tunnel |
| TE003 | Insufficient balance | MEDIUM | No | Check account funds |
| TE004 | Position limit exceeded | HIGH | No | Review risk settings |
| TE005 | Rate limit exceeded | LOW | Yes | Reduce frequency |

#### AI Errors (AI)
| Code | Description | Severity | Fallback | Action |
|------|-------------|----------|----------|--------|
| AI001 | Model timeout | MEDIUM | Yes | Check Ollama service |
| AI002 | Service unavailable | HIGH | Yes | Restart AI services |
| AI003 | Context limit exceeded | LOW | Yes | Reduce input size |
| AI004 | Model loading failed | HIGH | Yes | Reinstall model |
| AI005 | Inference failed | MEDIUM | Yes | Check model compatibility |

#### Network Errors (NE)
| Code | Description | Severity | Auto-Recovery | Action |
|------|-------------|----------|---------------|--------|
| NE001 | SSH tunnel disconnected | CRITICAL | Yes | Restart tunnel |
| NE002 | Database connection lost | HIGH | Yes | Restart database |
| NE003 | Network timeout | MEDIUM | Yes | Check connectivity |
| NE004 | DNS resolution failed | MEDIUM | Yes | Check DNS settings |
| NE005 | Service unavailable | HIGH | Yes | Check service status |

#### System Errors (SE)
| Code | Description | Severity | Action |
|------|-------------|----------|--------|
| SE001 | Component init failed | CRITICAL | Check configuration |
| SE002 | Memory exhausted | HIGH | Free memory |
| SE003 | Disk space full | HIGH | Clean disk space |
| SE004 | Permission denied | MEDIUM | Check permissions |
| SE005 | Configuration invalid | HIGH | Verify config files |

### Error Monitoring Commands

#### System Health Check Script
```bash
#!/bin/bash
# Save as: /usr/local/bin/trading-health-check
echo "=== TRADING SYSTEM HEALTH CHECK ==="
echo "Time: $(date)"
echo

# System health
echo "SYSTEM HEALTH:"
health=$(curl -s http://localhost:3001/api/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "$health" | jq -r '"Overall: " + (.overallHealth|tostring) + "%"'
    echo "$health" | jq -r '"Errors: " + (.errorMetrics.totalErrors|tostring) + " (Rate: " + (.errorMetrics.errorRate|tostring) + "/hr)"'
else
    echo "❌ API not responding"
fi

# Service status
echo -e "\nSERVICE STATUS:"
for service in trading-agent ssh-tunnel; do
    if systemctl is-active --quiet $service; then
        echo "✅ $service"
    else
        echo "❌ $service"
    fi
done

# Port status
echo -e "\nPORT STATUS:"
for port in 3001 8443 5432; do
    if netstat -tuln | grep -q ":$port "; then
        echo "✅ Port $port"
    else
        echo "❌ Port $port"
    fi
done

# Resource usage
echo -e "\nRESOURCE USAGE:"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
echo "Disk: $(df -h / | awk 'NR==2{print $5}')"

# Recent errors
echo -e "\nRECENT ERRORS:"
if [ -f "/var/log/trading-agent/error-$(date +%Y-%m-%d).log" ]; then
    tail -5 "/var/log/trading-agent/error-$(date +%Y-%m-%d).log" | grep -E "(ERROR|CRITICAL)" | tail -3
else
    echo "No error log found"
fi
```

#### Error Analysis Script
```bash
#!/bin/bash
# Save as: /usr/local/bin/trading-error-analysis
echo "=== ERROR ANALYSIS ==="

# Error counts by type
echo "ERROR COUNTS (last 24 hours):"
if [ -f "/var/log/trading-agent/error-$(date +%Y-%m-%d).log" ]; then
    grep -oE "(TE|AI|NE|SE)[0-9]{3}" "/var/log/trading-agent/error-$(date +%Y-%m-%d).log" | sort | uniq -c | sort -nr
else
    echo "No error log found"
fi

# Component health
echo -e "\nCOMPONENT HEALTH:"
curl -s http://localhost:3001/api/status 2>/dev/null | jq -r '.components | to_entries[] | .key + ": " + (.value.isHealthy | if . then "✅" else "❌" end)'

# Circuit breaker status
echo -e "\nCIRCUIT BREAKERS:"
curl -s http://localhost:3001/api/errors/dashboard 2>/dev/null | jq -r '.recoveryMetrics.circuitBreakersOpen as $open | if $open > 0 then "❌ " + ($open|tostring) + " open" else "✅ All closed" end'
```

### Recovery Procedures

#### Complete System Recovery
```bash
#!/bin/bash
# Save as: /usr/local/bin/trading-system-recovery
echo "=== COMPLETE SYSTEM RECOVERY ==="

# Phase 1: Emergency stop
echo "Phase 1: Emergency stop..."
curl -X POST http://localhost:3001/api/emergency/stop 2>/dev/null || echo "API not responding"

# Phase 2: Stop services
echo "Phase 2: Stopping services..."
sudo systemctl stop trading-agent

# Phase 3: Restart dependencies
echo "Phase 3: Restarting dependencies..."
sudo systemctl restart postgresql
sudo systemctl restart ssh-tunnel

# Phase 4: Wait for services
echo "Phase 4: Waiting for services to stabilize..."
sleep 30

# Phase 5: Verify dependencies
echo "Phase 5: Verifying dependencies..."

# Check database
if psql -h localhost -U trading_user -d trading_agent -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Database ready"
else
    echo "❌ Database not ready"
    exit 1
fi

# Check SSH tunnel
if curl -s http://localhost:8443/api/v4/spot/time > /dev/null 2>&1; then
    echo "✅ SSH tunnel ready"
else
    echo "❌ SSH tunnel not ready"
    exit 1
fi

# Phase 6: Start trading system
echo "Phase 6: Starting trading system..."
sudo systemctl start trading-agent

# Phase 7: Wait and verify
echo "Phase 7: Verifying system health..."
sleep 30

health=$(curl -s http://localhost:3001/api/health 2>/dev/null | jq -r '.overallHealth // 0')
if [ "$health" -gt 80 ]; then
    echo "✅ System recovery completed successfully (Health: ${health}%)"
else
    echo "❌ System recovery failed (Health: ${health}%)"
    exit 1
fi
```

#### Component-Specific Recovery

**Trading Engine Recovery:**
```bash
#!/bin/bash
echo "Recovering Trading Engine..."

# Stop trading
curl -X POST http://localhost:3001/api/trading/stop

# Check SSH tunnel
if ! curl -s http://localhost:8443/api/v4/spot/time > /dev/null; then
    echo "Restarting SSH tunnel..."
    sudo systemctl restart ssh-tunnel
    sleep 10
fi

# Restart trading engine
curl -X POST http://localhost:3001/api/trading/restart

# Verify
sleep 15
if curl -s http://localhost:3001/api/trading/health | jq -e '.isHealthy' > /dev/null; then
    echo "✅ Trading engine recovered"
else
    echo "❌ Trading engine recovery failed"
fi
```

**SSH Tunnel Recovery:**
```bash
#!/bin/bash
echo "Recovering SSH Tunnel..."

# Kill existing processes
sudo pkill -f "ssh.*8443" || true

# Check SSH key
chmod 600 /opt/trading-agent/keys/oracle_key

# Test SSH connectivity
if ssh -o ConnectTimeout=10 -i /opt/trading-agent/keys/oracle_key opc@168.138.104.117 "echo 'OK'" > /dev/null 2>&1; then
    echo "✅ SSH connectivity working"
else
    echo "❌ SSH connectivity failed"
    exit 1
fi

# Restart tunnel service
sudo systemctl restart ssh-tunnel

# Wait and test
sleep 10
if curl -s http://localhost:8443/api/v4/spot/time > /dev/null; then
    echo "✅ SSH tunnel recovered"
else
    echo "❌ SSH tunnel recovery failed"
fi
```

### Alert Thresholds and Escalation

#### Alert Thresholds
| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| System Health | <85% | <70% | Component restart |
| Error Rate | >5/hr | >10/hr | Investigation required |
| Response Time | >500ms | >2000ms | Performance check |
| Circuit Breakers | 1 open | >2 open | Emergency protocols |
| Disk Usage | >80% | >90% | Cleanup required |
| Memory Usage | >80% | >90% | Process restart |

#### Escalation Matrix
| Severity | Response Time | Contact Method |
|----------|---------------|----------------|
| Critical | 5 minutes | Phone + SMS + Email |
| High | 15 minutes | SMS + Email |
| Medium | 1 hour | Email |
| Low | 4 hours | Dashboard notification |

### Error Handling Configuration

#### Error Handler Configuration
```json
{
  "errorHandling": {
    "maxRetries": 3,
    "retryDelay": 1000,
    "exponentialBackoff": true,
    "circuitBreakerThreshold": 5,
    "autoRecovery": true,
    "notificationChannels": ["email", "telegram"],
    "escalationRules": {
      "critical": {
        "immediateNotification": true,
        "autoRecovery": true,
        "escalationDelay": 300
      },
      "high": {
        "immediateNotification": false,
        "autoRecovery": true,
        "escalationDelay": 900
      }
    }
  }
}
```

#### Log Configuration
```bash
# /etc/rsyslog.d/50-trading-agent.conf
:programname, isequal, "trading-agent" /var/log/trading-agent/application.log
*.error /var/log/trading-agent/error.log

# Log rotation
# /etc/logrotate.d/trading-agent
/var/log/trading-agent/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 trading trading
}
```

---

## Troubleshooting

### Quick Diagnostic Commands

```bash
# System health check
/usr/local/bin/trading-health-check

# Error analysis
/usr/local/bin/trading-error-analysis

# Check all services status
sudo systemctl status ssh-tunnel trading-agent

# Test SSH tunnel
curl -I http://localhost:8443/api/v4/spot/time

# Test API connectivity
curl -f http://localhost:3001/api/health

# Check logs
sudo journalctl -u trading-agent --lines 50
tail -f /var/log/trading-agent/error-$(date +%Y-%m-%d).log
```

### Error-Based Troubleshooting

#### High Error Rate (>10 errors/hour)
```bash
# 1. Check error types
grep -h "$(date +%Y-%m-%d)" /var/log/trading-agent/error-*.log | \
    grep -oE "(TE|AI|NE|SE)[0-9]{3}" | sort | uniq -c | sort -nr

# 2. Check component health
curl -s http://localhost:3001/api/status | jq '.components'

# 3. Most common actions:
# - If TE002 (API connection): sudo systemctl restart ssh-tunnel
# - If NE002 (DB connection): sudo systemctl restart postgresql
# - If multiple types: /usr/local/bin/trading-system-recovery
```

#### System Health <70%
```bash
# 1. Immediate assessment
curl -s http://localhost:3001/api/health | jq '.componentHealth'

# 2. Check failing components
curl -s http://localhost:3001/api/status | jq -r '.components | to_entries[] | select(.value.isHealthy == false) | .key'

# 3. Component-specific recovery
# - Trading Engine: curl -X POST http://localhost:3001/api/trading/restart
# - Database: sudo systemctl restart postgresql
# - Network: sudo systemctl restart ssh-tunnel
```

#### Circuit Breakers Open
```bash
# 1. Check which circuit breakers are open
curl -s http://localhost:3001/api/errors/dashboard | jq '.recoveryMetrics'

# 2. Check recent failures
tail -50 /var/log/trading-agent/error-$(date +%Y-%m-%d).log | grep "circuit.*breaker"

# 3. Reset after fixing underlying issue
curl -X POST http://localhost:3001/api/errors/circuit-breaker/reset

# 4. Monitor for re-opening
watch -n 10 'curl -s http://localhost:3001/api/errors/dashboard | jq -r ".recoveryMetrics.circuitBreakersOpen"'
```

### Common Issues

#### 1. Application Won't Start

**Symptoms:**
- systemd shows service as "failed" or "inactive"
- Error messages in logs
- Port binding failures

**Solutions:**

*Port Already in Use:*
```bash
# Find process using port
sudo lsof -i :3001

# Kill process if needed
sudo kill -9 <PID>
```

*Missing Dependencies:*
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### 2. SSH Tunnel Connection Issues

**Symptoms:**
- "Connection refused" errors
- API calls failing
- TE002 errors in logs

**Solutions:**

*SSH Key Issues:*
```bash
# Check key permissions
ls -la /opt/trading-agent/keys/oracle_key
chmod 600 /opt/trading-agent/keys/oracle_key

# Test SSH connectivity
ssh -o ConnectTimeout=10 -i /opt/trading-agent/keys/oracle_key opc@168.138.104.117 "echo 'OK'"
```

*Network Connectivity:*
```bash
# Test internet connectivity
ping -c 4 8.8.8.8

# Test Oracle connectivity
ping -c 4 168.138.104.117

# Restart tunnel service
sudo systemctl restart ssh-tunnel

# Verify tunnel is working
curl -I http://localhost:8443/api/v4/spot/time
```

#### 3. Database Connection Issues

**Symptoms:**
- NE002 errors in logs
- Database queries failing
- Application unable to store data

**Solutions:**

*Database Service Issues:*
```bash
# Check PostgreSQL service
sudo systemctl status postgresql

# Restart if needed
sudo systemctl restart postgresql

# Test connection
psql -h localhost -U trading_user -d trading_agent -c "SELECT 1;"
```

*Connection Pool Issues:*
```bash
# Check active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections if needed
sudo -u postgres psql -c "
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE state = 'idle' AND query_start < now() - interval '1 hour';"
```

#### 4. Trading Order Failures

**Symptoms:**
- TE001 errors in logs
- Orders consistently failing
- High error rate on dashboard

**Solutions:**

*API Connectivity Issues:*
```bash
# Check SSH tunnel status
curl -I http://localhost:8443/api/v4/spot/time

# Check Gate.io API status
curl http://localhost:8443/api/v4/spot/currencies | jq '.[] | select(.currency == "BTC")'

# Emergency stop if needed
curl -X POST http://localhost:3001/api/emergency/stop
```

*Account Issues:*
```bash
# Check account balance
curl http://localhost:8443/api/v4/spot/accounts

# Check trading permissions
curl http://localhost:8443/api/v4/spot/fee

# Review risk settings in configuration
```

---

## Security

### Security Configuration

#### Firewall Setup

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow application ports (local network only)
sudo ufw allow from 192.168.0.0/16 to any port 3000
sudo ufw allow from 192.168.0.0/16 to any port 3001

# Check firewall status
sudo ufw status verbose
```

#### Fail2Ban Configuration

```bash
# Install and configure Fail2Ban
sudo apt install fail2ban

# Create custom jail for trading agent
sudo tee /etc/fail2ban/jail.d/trading-agent.conf << EOF
[trading-agent]
enabled = true
port = 3000,3001
filter = trading-agent
logpath = /var/log/trading-agent/*.log
maxretry = 5
bantime = 3600
EOF

# Restart Fail2Ban
sudo systemctl restart fail2ban
```

---

## Backup and Recovery

### Backup Strategy

#### Automated Backup Script

```bash
#!/bin/bash
# backup.sh - Comprehensive backup script

BACKUP_DIR="/opt/trading-agent/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_TYPE=${1:-incremental}

echo "🔄 Starting $BACKUP_TYPE backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

case $BACKUP_TYPE in
    "full")
        # Full system backup
        BACKUP_FILE="$BACKUP_DIR/full-backup-$DATE.tar.gz"
        
        # Stop services for consistent backup
        sudo systemctl stop trading-agent trading-dashboard
        
        # Backup database
        sudo -u postgres pg_dump trading_agent > "$BACKUP_DIR/database-$DATE.sql"
        
        # Backup application files
        tar -czf "$BACKUP_FILE" \
            --exclude="node_modules" \
            --exclude="logs/*.log" \
            --exclude="backups" \
            /opt/trading-agent/
        
        # Restart services
        sudo systemctl start ssh-tunnel trading-agent trading-dashboard
        ;;
        
    "incremental")
        # Incremental backup (config and data only)
        BACKUP_FILE="$BACKUP_DIR/incremental-backup-$DATE.tar.gz"
        
        # Backup configuration and data
        tar -czf "$BACKUP_FILE" \
            /opt/trading-agent/.env \
            /opt/trading-agent/config/ \
            /opt/trading-agent/keys/ \
            /opt/trading-agent/data/
        ;;
esac

echo "✅ Backup completed: $BACKUP_FILE"
```

### Recovery Procedures

#### System Recovery Script

```bash
#!/bin/bash
# restore.sh - System recovery script

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

echo "🔄 Starting recovery from $BACKUP_FILE..."

# Stop services
sudo systemctl stop trading-agent trading-dashboard ssh-tunnel

# Extract backup
tar -xzf "$BACKUP_FILE" -C /

# Restore database if available
DATABASE_FILE=$(echo "$BACKUP_FILE" | sed 's/\.tar\.gz$/\.sql/')
if [ -f "$DATABASE_FILE" ]; then
    sudo -u postgres dropdb trading_agent
    sudo -u postgres createdb trading_agent
    sudo -u postgres psql trading_agent < "$DATABASE_FILE"
fi

# Fix permissions
sudo chown -R trading:trading /opt/trading-agent
chmod 600 /opt/trading-agent/keys/oracle_key
chmod 600 /opt/trading-agent/.env

# Restart services
sudo systemctl start ssh-tunnel trading-agent trading-dashboard

echo "✅ Recovery completed successfully"
```

---

## Performance Optimization

### Intel NUC Optimization

#### System Optimization

```bash
#!/bin/bash
# optimize-intel-nuc.sh - Intel NUC performance optimization

echo "🚀 Optimizing for Intel NUC..."

# CPU Governor optimization
echo "performance" | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Memory optimization
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
echo "vm.vfs_cache_pressure=50" | sudo tee -a /etc/sysctl.conf

# Network optimization
echo "net.core.rmem_max=16777216" | sudo tee -a /etc/sysctl.conf
echo "net.core.wmem_max=16777216" | sudo tee -a /etc/sysctl.conf

# Apply changes
sudo sysctl -p

# Node.js optimization
export NODE_OPTIONS="--max-old-space-size=8192 --optimize-for-size"

echo "✅ Intel NUC optimization completed"
```

---

## Emergency Procedures

### System Failure Response

#### Critical System Failure

```bash
#!/bin/bash
# critical-failure-response.sh - Emergency response for critical failures

echo "🚨 CRITICAL SYSTEM FAILURE - EMERGENCY RESPONSE"

# Stop all trading activities immediately
curl -X POST http://localhost:3001/api/emergency/stop

# Cancel all open orders
curl -X POST http://localhost:3001/api/orders/cancel-all

# Stop trading service
sudo systemctl stop trading-agent

# Create emergency backup
sudo -u postgres pg_dump trading_agent > "/tmp/emergency-backup-$(date +%Y%m%d_%H%M%S).sql"

# Collect diagnostic information
/usr/local/bin/trading-health-check > "/tmp/diagnostic-$(date +%Y%m%d_%H%M%S).log"
/usr/local/bin/trading-error-analysis >> "/tmp/diagnostic-$(date +%Y%m%d_%H%M%S).log"

# Send emergency notifications
echo "CRITICAL SYSTEM FAILURE - Trading stopped at $(date)" | \
    mail -s "EMERGENCY: Trading System Failure" admin@yourdomain.com

echo "✅ Emergency response completed"
echo "Diagnostic files created in /tmp/"
echo "Review logs and run /usr/local/bin/trading-system-recovery when ready"
```

#### Error Pattern Emergency Response

```bash
#!/bin/bash
# error-pattern-emergency.sh - Response to error pattern detection

ERROR_RATE=$(curl -s http://localhost:3001/api/errors/dashboard | jq -r '.errorMetrics.errorRate')
CIRCUIT_BREAKERS=$(curl -s http://localhost:3001/api/errors/dashboard | jq -r '.recoveryMetrics.circuitBreakersOpen')

echo "🚨 ERROR PATTERN DETECTED"
echo "Error Rate: $ERROR_RATE/hour"
echo "Circuit Breakers Open: $CIRCUIT_BREAKERS"

if (( $(echo "$ERROR_RATE > 20" | bc -l) )); then
    echo "CRITICAL ERROR RATE - Stopping trading"
    curl -X POST http://localhost:3001/api/emergency/stop
fi

if [ "$CIRCUIT_BREAKERS" -gt 2 ]; then
    echo "MULTIPLE CIRCUIT BREAKERS OPEN - System recovery needed"
    /usr/local/bin/trading-system-recovery
fi

echo "✅ Error pattern response completed"
```

---

## Appendices

### A. File Structure

```
/opt/trading-agent/
├── .env                          # Environment configuration
├── package.json                  # Node.js dependencies
├── src/                          # Source code
├── config/                       # Configuration files
├── scripts/                      # Management scripts
├── systemd/                      # systemd service files
├── keys/                         # SSH keys (secure)
├── logs/                         # Application logs
├── backups/                      # System backups
└── docs/                         # Documentation
```

### B. Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Application port | `3001` |
| `DATABASE_URL` | Database connection | `postgresql://user:pass@localhost:5432/db` |
| `GATE_IO_API_KEY` | Gate.io API key | `your_api_key` |
| `ORACLE_SSH_HOST` | Oracle Cloud IP | `168.138.104.117` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | `your_bot_token` |

### C. Port Reference

| Port | Service | Access |
|------|---------|--------|
| 3000 | Dashboard | Local network |
| 3001 | Trading API | Local only |
| 5432 | PostgreSQL | Local only |
| 8443 | SSH Tunnel | Local only |
| 22 | SSH | Secure access |

---

*This manual is maintained as part of the AI Crypto Trading Agent project. For updates and additional documentation, refer to the project repository.*

**Document Version**: 1.0  
**Last Updated**: $(date +%Y-%m-%d)  
**Maintained By**: System Administrator