# AI Crypto Trading Agent - User Manual

## Table of Contents

1. [Getting Started](#getting-started)
2. [System Setup](#system-setup)
3. [Configuration](#configuration)
4. [Dashboard Overview](#dashboard-overview)
5. [Trading Operations](#trading-operations)
6. [Risk Management](#risk-management)
7. [Monitoring and Alerts](#monitoring-and-alerts)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [Support](#support)

## Getting Started

### Welcome to AI Crypto Trading Agent

Congratulations on your purchase of the AI Crypto Trading Agent! This comprehensive system is designed to help you generate consistent profits from cryptocurrency trading while preserving your capital through sophisticated risk management.

### What You'll Need

Before starting, ensure you have:
- ✅ Intel NUC with i5 CPU, 12GB RAM, 256GB M.2 SSD
- ✅ Stable internet connection (wireless and/or ethernet)
- ✅ Gate.io exchange account with API access
- ✅ Oracle Free Tier account (free)
- ✅ Email account for notifications
- ✅ Telegram account (optional but recommended)

### Quick Start Checklist

- [ ] Complete hardware setup
- [ ] Install Ubuntu OS and dependencies
- [ ] Configure Oracle Free Tier SSH tunnel
- [ ] Set up Gate.io API credentials
- [ ] Configure notification preferences
- [ ] Run initial system tests
- [ ] Start with small capital for testing
- [ ] Monitor first 24 hours closely

## System Setup

### 1. Hardware Preparation

#### Intel NUC Setup
1. **Unbox and Connect**
   - Connect power adapter
   - Connect monitor via HDMI
   - Connect keyboard and mouse
   - Connect ethernet cable (recommended)

2. **BIOS Configuration**
   - Press F2 during boot to enter BIOS
   - Enable "Wake on LAN" for remote management
   - Set power options to "Always On"
   - Save and exit

#### Ubuntu Installation
1. **Download Ubuntu**
   - Get latest Ubuntu LTS from ubuntu.com
   - Create bootable USB drive

2. **Install Ubuntu**
   - Boot from USB drive
   - Follow installation wizard
   - Create user account: `trader`
   - Enable automatic login for 24/7 operation

### 2. Software Installation

#### System Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install additional dependencies
sudo apt-get install -y git curl wget unzip
```

#### AI Crypto Trading Agent
```bash
# Clone repository (provided after purchase)
git clone https://github.com/your-repo/ai-crypto-trading-agent.git
cd ai-crypto-trading-agent

# Install dependencies
npm install

# Build application
npm run build
```

### 3. Oracle Free Tier Setup

#### Create Oracle Account
1. Visit cloud.oracle.com
2. Sign up for free tier account
3. Complete identity verification
4. Note your instance IP: `168.138.104.117`

#### SSH Key Configuration
```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -f ~/.ssh/oracle_key

# Copy public key to Oracle instance
# (Follow Oracle documentation for key upload)
```

### 4. Gate.io API Setup

#### Create API Credentials
1. Log into Gate.io account
2. Navigate to API Management
3. Create new API key with trading permissions
4. Note API Key and Secret (keep secure!)
5. Whitelist your Oracle IP: `168.138.104.117`

#### Security Settings
- Enable IP whitelist restriction
- Set trading permissions only (no withdrawal)
- Use strong passphrase
- Enable 2FA for API access

## Configuration

### 1. Environment Variables

Create `.env` file in project root:

```bash
# Gate.io API Configuration
GATEIO_API_KEY=your_api_key_here
GATEIO_API_SECRET=your_api_secret_here
GATEIO_PASSPHRASE=your_passphrase_here

# Oracle SSH Tunnel
ORACLE_HOST=168.138.104.117
ORACLE_USER=ubuntu
ORACLE_SSH_KEY_PATH=/home/trader/.ssh/oracle_key

# Trading Configuration
INITIAL_BALANCE=10000
MAX_RISK_PER_TRADE=0.02
STOP_LOSS_PERCENTAGE=0.01
MIN_RISK_REWARD_RATIO=1.3

# Notification Settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Security Settings
ENCRYPTION_KEY=generate_strong_32_char_key_here
JWT_SECRET=generate_jwt_secret_here
```

### 2. Trading Parameters

#### Risk Management Settings
```javascript
// config/trading.js
module.exports = {
  riskManagement: {
    maxRiskPerTrade: 0.02,        // 2% max risk per trade
    stopLossPercentage: 0.01,     // 1% stop loss
    minRiskRewardRatio: 1.3,      // Minimum 1.3:1 RR
    maxDrawdown: 0.10,            // 10% max drawdown
    maxPositions: 3,              // Max concurrent positions
  },
  
  strategies: {
    movingAverage: {
      enabled: true,
      fastPeriod: 20,
      slowPeriod: 50,
      weight: 0.25
    },
    rsi: {
      enabled: true,
      period: 14,
      overbought: 70,
      oversold: 30,
      weight: 0.25
    },
    macd: {
      enabled: true,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      weight: 0.25
    },
    fibonacci: {
      enabled: true,
      levels: [0.236, 0.382, 0.5, 0.618, 0.786],
      weight: 0.25
    }
  }
};
```

### 3. Notification Setup

#### Email Configuration
1. **Gmail Setup**
   - Enable 2-factor authentication
   - Generate app-specific password
   - Use app password in EMAIL_PASS

2. **Test Email**
   ```bash
   npm run test:email
   ```

#### Telegram Setup
1. **Create Bot**
   - Message @BotFather on Telegram
   - Create new bot with `/newbot`
   - Save bot token

2. **Get Chat ID**
   - Message your bot
   - Visit: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Find your chat ID in response

3. **Test Telegram**
   ```bash
   npm run test:telegram
   ```

## Dashboard Overview

### 1. Accessing the Dashboard

#### Local Access
- URL: `http://localhost:3000`
- Default login: `admin` / `your_secure_password`

#### Remote Access
- Configure port forwarding on router
- Use VPN for secure remote access
- Enable HTTPS for production use

### 2. Dashboard Layout

#### Header Section
- 🌙/☀️ **Theme Toggle**: Switch between dark and light modes
- 🔔 **Notifications**: Recent alerts and messages
- ⚙️ **Settings**: System configuration access
- 👤 **Profile**: User account and preferences

#### Main Dashboard
- 💰 **Portfolio Balance**: Real-time account value
- 📈 **P&L Display**: Daily, weekly, monthly performance
- 📊 **Active Positions**: Current open trades
- 🎯 **Performance Metrics**: Win rate, Sharpe ratio, drawdown

#### Trading Section
- 📉 **Charts**: Interactive TradingView-style charts
- 🤖 **AI Insights**: LLM-generated market analysis
- 📱 **Sentiment Score**: Real-time sentiment (-100 to +100)
- ⚡ **Strategy Signals**: Current indicator status

#### System Health
- 🖥️ **Hardware Metrics**: CPU, RAM, storage usage
- 🌐 **Network Status**: SSH tunnel and API connectivity
- 🔒 **Security Status**: Threat detection and alerts
- 📋 **System Logs**: Recent system events

### 3. Theme Customization

#### Dark Theme Features
- Deep black backgrounds with neon accents
- High contrast for night trading
- Reduced eye strain during extended use
- Professional appearance

#### Light Theme Features
- Clean white backgrounds
- Optimal for daytime use
- Print-friendly layouts
- Classic professional look

#### Auto Theme
- Follows system preference
- Automatic switching at sunset/sunrise
- Customizable time-based switching

## Trading Operations

### 1. Starting the Trading System

#### Initial Startup
```bash
# Start all services
npm run start:production

# Check system status
npm run status

# View logs
npm run logs:follow
```

#### Verification Steps
1. ✅ SSH tunnel established
2. ✅ Gate.io API connected
3. ✅ Market data streaming
4. ✅ AI engine loaded
5. ✅ Risk management active
6. ✅ Notifications working

### 2. Trading Strategies

#### Moving Average Crossover
- **Signal**: Fast EMA crosses above/below slow EMA
- **Confirmation**: Volume increase and momentum
- **Entry**: Market order on confirmed signal
- **Exit**: Opposite signal or stop loss/take profit

#### RSI Momentum
- **Overbought**: RSI > 70 (potential sell signal)
- **Oversold**: RSI < 30 (potential buy signal)
- **Divergence**: Price vs RSI divergence signals
- **Confirmation**: Combined with other indicators

#### MACD Trend Following
- **Signal**: MACD line crosses signal line
- **Histogram**: Momentum confirmation
- **Divergence**: Early trend reversal signals
- **Zero Line**: Trend direction confirmation

#### Fibonacci Retracements
- **Levels**: 23.6%, 38.2%, 50%, 61.8%, 78.6%
- **Support/Resistance**: Key price levels
- **Entry Points**: Bounce from Fibonacci levels
- **Target Setting**: Next Fibonacci level

### 3. AI Decision Making

#### Market Analysis
- **Trend Detection**: AI identifies market trends
- **Pattern Recognition**: Chart pattern analysis
- **Anomaly Detection**: Unusual market behavior
- **Sentiment Integration**: Social media sentiment impact

#### Trade Reasoning
- **Decision Explanation**: Why trades are taken
- **Confidence Scoring**: AI confidence in decisions
- **Risk Assessment**: Trade risk evaluation
- **Market Context**: Current market conditions

### 4. Position Management

#### Entry Process
1. **Signal Generation**: Multiple indicators align
2. **Risk Calculation**: Position size determination
3. **Order Placement**: Market or limit order
4. **Confirmation**: Trade execution verification
5. **Monitoring**: Continuous position tracking

#### Exit Process
1. **Profit Target**: 1.3:1 minimum risk-reward
2. **Stop Loss**: 1% maximum loss per trade
3. **Trailing Stop**: Dynamic stop adjustment
4. **Signal Reversal**: Opposite signal exit
5. **Emergency Exit**: Risk management override

## Risk Management

### 1. Position Sizing

#### Dynamic Sizing Formula
```
Position Size = (Account Balance × Risk %) / Stop Loss Distance
```

#### Example Calculation
- Account Balance: $10,000
- Risk per Trade: 2% ($200)
- Stop Loss Distance: 1% ($100 per $10,000)
- Position Size: $200 / $100 = 2% of balance

#### Confidence Adjustment
- High Confidence (>80%): Full position size
- Medium Confidence (60-80%): 75% position size
- Low Confidence (<60%): 50% position size

### 2. Stop Loss Management

#### Initial Stop Loss
- **Fixed Percentage**: 1% below entry price
- **ATR-Based**: 2x Average True Range
- **Support/Resistance**: Technical level stop
- **Volatility Adjusted**: Based on recent volatility

#### Trailing Stop Loss
- **Percentage Trailing**: 1% trailing distance
- **ATR Trailing**: Dynamic based on volatility
- **Breakeven Stop**: Move to breakeven at 1:1 RR
- **Profit Protection**: Protect 50% of profits

### 3. Portfolio Risk

#### Correlation Management
- **Maximum Correlation**: 0.7 between positions
- **Diversification**: Spread risk across strategies
- **Exposure Limits**: Maximum 10% in single asset
- **Time Diversification**: Stagger entry times

#### Drawdown Protection
- **Daily Limit**: 3% maximum daily loss
- **Weekly Limit**: 5% maximum weekly loss
- **Monthly Limit**: 10% maximum monthly loss
- **Recovery Mode**: Reduced risk after drawdown

## Monitoring and Alerts

### 1. Real-Time Monitoring

#### System Health Dashboard
- **CPU Usage**: Target <70% average
- **Memory Usage**: Target <80% utilization
- **Disk Space**: Alert at 80% full
- **Network Latency**: Monitor API response times

#### Trading Performance
- **Win Rate**: Track percentage of profitable trades
- **Average RR**: Monitor risk-reward ratios
- **Drawdown**: Current and maximum drawdown
- **Sharpe Ratio**: Risk-adjusted returns

### 2. Alert Configuration

#### Critical Alerts (Immediate)
- 🚨 **System Failure**: Trading system down
- 🔒 **Security Breach**: Unauthorized access detected
- 💸 **Large Loss**: Single trade loss >2%
- 📉 **Drawdown**: Portfolio drawdown >5%

#### Important Alerts (Within 1 hour)
- 📈 **Trade Executed**: New position opened/closed
- 🎯 **Profit Target**: Take profit level reached
- ⚠️ **Stop Loss**: Stop loss triggered
- 🔧 **System Warning**: Performance degradation

#### Informational Alerts (Daily summary)
- 📊 **Daily Performance**: P&L summary
- 📈 **Weekly Summary**: Performance metrics
- 🤖 **AI Insights**: Market analysis summary
- 📱 **Sentiment Report**: Sentiment trend analysis

### 3. Notification Channels

#### Email Notifications
- **HTML Formatting**: Rich formatted emails
- **Charts Included**: Performance charts embedded
- **Action Items**: Clear next steps
- **Mobile Optimized**: Readable on mobile devices

#### Telegram Notifications
- **Instant Delivery**: Real-time alerts
- **Emoji Rich**: Visual status indicators
- **Interactive**: Buttons for quick actions
- **Group Support**: Team notifications

## Troubleshooting

### 1. Common Issues

#### SSH Tunnel Problems
**Symptom**: Cannot connect to Gate.io API
**Solution**:
```bash
# Check tunnel status
ssh -T ubuntu@168.138.104.117

# Restart tunnel service
sudo systemctl restart ssh-tunnel

# Check logs
journalctl -u ssh-tunnel -f
```

#### API Connection Issues
**Symptom**: API authentication failures
**Solution**:
1. Verify API credentials in .env file
2. Check IP whitelist on Gate.io
3. Confirm API permissions
4. Test with curl command

#### High CPU Usage
**Symptom**: System running slowly
**Solution**:
1. Check running processes: `htop`
2. Restart AI engine: `npm run restart:ai`
3. Clear cache: `npm run cache:clear`
4. Monitor temperature: `sensors`

#### Memory Leaks
**Symptom**: Increasing memory usage
**Solution**:
1. Restart application: `npm run restart`
2. Check for memory leaks: `npm run debug:memory`
3. Update to latest version
4. Contact support if persistent

### 2. Log Analysis

#### Log Locations
- **Application Logs**: `/var/log/ai-crypto-trading/`
- **System Logs**: `/var/log/syslog`
- **Error Logs**: `/var/log/ai-crypto-trading/error.log`
- **Trading Logs**: `/var/log/ai-crypto-trading/trading.log`

#### Log Analysis Commands
```bash
# View recent errors
tail -f /var/log/ai-crypto-trading/error.log

# Search for specific issues
grep "ERROR" /var/log/ai-crypto-trading/*.log

# Analyze trading performance
grep "TRADE_EXECUTED" /var/log/ai-crypto-trading/trading.log | tail -20
```

### 3. Performance Optimization

#### System Optimization
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Clean package cache
sudo apt autoremove && sudo apt autoclean

# Optimize SSD
sudo fstrim -av

# Check disk health
sudo smartctl -a /dev/sda
```

#### Application Optimization
```bash
# Clear application cache
npm run cache:clear

# Rebuild with optimizations
npm run build:production

# Restart with performance monitoring
npm run start:performance
```

## Best Practices

### 1. Security Best Practices

#### Credential Management
- ✅ Use strong, unique passwords
- ✅ Enable 2FA on all accounts
- ✅ Regularly rotate API keys
- ✅ Never share credentials
- ✅ Use encrypted storage only

#### System Security
- ✅ Keep Ubuntu updated
- ✅ Use firewall (ufw)
- ✅ Regular security scans
- ✅ Monitor access logs
- ✅ Backup encryption keys

#### Network Security
- ✅ Use VPN for remote access
- ✅ Enable SSH key authentication
- ✅ Disable password authentication
- ✅ Monitor network traffic
- ✅ Use HTTPS for web interface

### 2. Trading Best Practices

#### Risk Management
- ✅ Never risk more than 2% per trade
- ✅ Maintain 1.3:1 minimum risk-reward
- ✅ Use stop losses on every trade
- ✅ Monitor correlation between positions
- ✅ Keep detailed trading records

#### Performance Monitoring
- ✅ Review daily performance reports
- ✅ Analyze losing trades for patterns
- ✅ Track key performance metrics
- ✅ Adjust strategies based on results
- ✅ Maintain realistic expectations

#### System Maintenance
- ✅ Monitor system health daily
- ✅ Perform weekly system checks
- ✅ Update software regularly
- ✅ Test backup procedures monthly
- ✅ Review and optimize quarterly

### 3. Operational Best Practices

#### Daily Routine
1. **Morning Check** (5 minutes)
   - Review overnight performance
   - Check system health status
   - Verify SSH tunnel connectivity
   - Review any alerts or notifications

2. **Midday Review** (10 minutes)
   - Analyze current positions
   - Review AI insights and sentiment
   - Check for any system warnings
   - Verify trading performance

3. **Evening Summary** (15 minutes)
   - Review daily P&L and trades
   - Analyze strategy performance
   - Check system resource usage
   - Plan any needed adjustments

#### Weekly Routine
1. **Performance Analysis**
   - Calculate weekly returns
   - Analyze win rate and RR ratios
   - Review drawdown periods
   - Compare to benchmarks

2. **System Maintenance**
   - Update system packages
   - Clear logs and cache
   - Check disk space usage
   - Verify backup integrity

3. **Strategy Review**
   - Analyze indicator performance
   - Review AI decision accuracy
   - Adjust parameters if needed
   - Document any changes

#### Monthly Routine
1. **Comprehensive Review**
   - Full performance analysis
   - Strategy effectiveness review
   - Risk management assessment
   - System optimization

2. **Security Audit**
   - Review access logs
   - Update passwords and keys
   - Check for security updates
   - Verify backup procedures

3. **Planning and Optimization**
   - Set goals for next month
   - Plan system improvements
   - Review market conditions
   - Adjust risk parameters

## Support

### 1. Self-Service Resources

#### Documentation
- **User Manual**: This comprehensive guide
- **API Reference**: Technical API documentation
- **Video Tutorials**: Step-by-step video guides
- **FAQ**: Frequently asked questions
- **Community Forum**: User community discussions

#### Diagnostic Tools
```bash
# System health check
npm run health:check

# Performance diagnostics
npm run diagnostics:performance

# Security scan
npm run security:scan

# Generate support report
npm run support:report
```

### 2. Support Channels

#### Email Support
- **Email**: support@ai-crypto-trading.com
- **Response Time**: 24-48 hours
- **Include**: System info, error logs, steps to reproduce

#### Community Support
- **Forum**: https://community.ai-crypto-trading.com
- **Discord**: https://discord.gg/ai-crypto-trading
- **Reddit**: r/AICryptoTradingAgent

#### Premium Support (Optional)
- **Phone Support**: Direct phone assistance
- **Priority Response**: 2-4 hour response time
- **Screen Sharing**: Remote assistance sessions
- **Custom Configuration**: Personalized setup help

### 3. Escalation Process

#### Level 1: Self-Service
1. Check this user manual
2. Search FAQ and community forum
3. Run diagnostic tools
4. Try basic troubleshooting steps

#### Level 2: Email Support
1. Submit detailed support request
2. Include system diagnostics report
3. Provide error logs and screenshots
4. Wait for response within 24-48 hours

#### Level 3: Premium Support
1. Upgrade to premium support plan
2. Schedule phone or video call
3. Get direct assistance from experts
4. Receive custom solutions

### 4. Feedback and Improvements

#### Feature Requests
- **Email**: features@ai-crypto-trading.com
- **Forum**: Feature request section
- **Voting**: Community voting on features

#### Bug Reports
- **Email**: bugs@ai-crypto-trading.com
- **Include**: Detailed reproduction steps
- **Logs**: Relevant error logs and diagnostics
- **Priority**: Critical bugs get immediate attention

---

*This user manual is regularly updated. Check for the latest version at: https://docs.ai-crypto-trading.com*

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Next Review**: March 2025