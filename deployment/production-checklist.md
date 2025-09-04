# Production Deployment Checklist

## Environment Setup

### Required Environment Variables
```bash
# Security
export MASTER_ENCRYPTION_KEY="your-32-character-encryption-key-here"
export JWT_SECRET="your-jwt-secret-key-here"

# Gate.io API Configuration
export GATEIO_API_KEY="your-gateio-api-key"
export GATEIO_API_SECRET="your-gateio-api-secret"
export GATEIO_SANDBOX="false"  # Set to true for testing

# Database Configuration
export DATABASE_URL="postgresql://user:password@localhost:5432/smoothsail"
export REDIS_URL="redis://localhost:6379"

# SSH Tunnel Configuration (for secure API access)
export SSH_HOST="your-vps-server.com"
export SSH_USER="your-ssh-username"
export SSH_PRIVATE_KEY_PATH="/path/to/your/private/key"
export SSH_LOCAL_PORT="8443"
export SSH_REMOTE_PORT="443"

# Notification Services
export TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
export TELEGRAM_CHAT_ID="your-telegram-chat-id"
export EMAIL_SMTP_HOST="smtp.gmail.com"
export EMAIL_SMTP_PORT="587"
export EMAIL_USER="your-email@gmail.com"
export EMAIL_PASSWORD="your-app-password"

# Application Configuration
export NODE_ENV="production"
export LOG_LEVEL="info"
export PORT="3000"
```

## Pre-Deployment Validation

### 1. Core Component Tests
- [x] Logger functionality
- [ ] Configuration loading
- [ ] Trading Engine initialization
- [ ] Gate.io API client connection
- [ ] Security services initialization

### 2. Infrastructure Requirements
- [ ] Node.js 18+ installed
- [ ] PostgreSQL database running
- [ ] Redis cache running
- [ ] SSH tunnel configured (if using)
- [ ] SSL certificates installed

### 3. Security Checklist
- [ ] All API keys encrypted
- [ ] Environment variables secured
- [ ] SSH keys properly configured
- [ ] Firewall rules configured
- [ ] SSL/TLS certificates valid

### 4. Trading Configuration
- [ ] Risk parameters configured
- [ ] Position sizing limits set
- [ ] Stop-loss mechanisms enabled
- [ ] Portfolio allocation limits set
- [ ] Emergency stop procedures tested

## Deployment Steps

### 1. Environment Preparation
```bash
# Clone repository
git clone <repository-url>
cd SmoothSail

# Install dependencies
npm install

# Set environment variables
source deployment/production.env

# Run database migrations
npm run db:migrate

# Build application
npm run build
```

### 2. Service Configuration
```bash
# Create systemd service (Linux)
sudo cp deployment/smoothsail.service /etc/systemd/system/
sudo systemctl enable smoothsail
sudo systemctl start smoothsail

# Or use PM2 for process management
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 3. Monitoring Setup
```bash
# Start monitoring services
npm run start:monitoring

# Verify health endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/health
```

## Post-Deployment Verification

### 1. System Health Checks
- [ ] Application starts without errors
- [ ] Database connections established
- [ ] API endpoints responding
- [ ] Trading engine initialized
- [ ] Risk management active

### 2. Trading System Validation
- [ ] Market data feeds connected
- [ ] Order placement working (test mode)
- [ ] Balance tracking accurate
- [ ] Risk limits enforced
- [ ] Notifications working

### 3. Security Validation
- [ ] API authentication working
- [ ] Encryption services active
- [ ] Audit logging enabled
- [ ] Access controls enforced
- [ ] Emergency stops functional

## Rollback Procedures

### If Deployment Fails
```bash
# Stop services
sudo systemctl stop smoothsail
# or
pm2 stop all

# Restore previous version
git checkout <previous-stable-tag>
npm install
npm run build

# Restart services
sudo systemctl start smoothsail
# or
pm2 restart all
```

## Monitoring and Maintenance

### Daily Checks
- [ ] System health dashboard
- [ ] Trading performance metrics
- [ ] Error logs review
- [ ] Balance reconciliation
- [ ] Security audit logs

### Weekly Maintenance
- [ ] Database cleanup
- [ ] Log rotation
- [ ] Performance optimization
- [ ] Security updates
- [ ] Backup verification

## Emergency Procedures

### Trading Emergency Stop
```bash
# Immediate stop all trading
curl -X POST http://localhost:3000/api/emergency/stop

# Cancel all open orders
curl -X POST http://localhost:3000/api/orders/cancel-all

# Shutdown system
sudo systemctl stop smoothsail
```

### Security Incident Response
1. Immediately stop all services
2. Rotate all API keys
3. Review audit logs
4. Notify stakeholders
5. Implement fixes
6. Gradual restart with monitoring

## Success Criteria

Deployment is considered successful when:
- [ ] All core services running (>99% uptime)
- [ ] Trading engine operational with <1% error rate
- [ ] API response times <500ms average
- [ ] No critical security vulnerabilities
- [ ] Risk management systems active
- [ ] Monitoring and alerting functional
- [ ] Emergency procedures tested and working