# Troubleshooting Guide

## Overview

This troubleshooting guide covers common application issues and diagnostic procedures. 

**For comprehensive error handling and system administration**: See the [System Administrator Manual](../SYSTEM_ADMINISTRATOR_MANUAL.md)

**For maintenance procedures**: See [Maintenance Procedures](../MAINTENANCE_PROCEDURES.md)

## Quick Diagnostic Commands

```bash
# System health check
npm run system:monitor

# Check all services status
pm2 status

# Test SSH tunnel
npm run tunnel:status

# Test API connectivity
npm run test:api

# Check logs
pm2 logs --lines 50

# Security scan
npm run security:scan
```

## Common Issues

### 1. Application Won't Start

#### Symptoms
- PM2 shows app as "errored" or "stopped"
- Error messages in logs
- Port binding failures

#### Diagnostic Steps
```bash
# Check PM2 status
pm2 status

# View error logs
pm2 logs --err

# Check port availability
netstat -tulpn | grep :3001
netstat -tulpn | grep :3002

# Verify Node.js version
node --version

# Check environment variables
npm run config:validate
```

#### Solutions

**Port Already in Use:**
```bash
# Find process using port
sudo lsof -i :3001
sudo lsof -i :3002

# Kill process if needed
sudo kill -9 <PID>

# Or change port in .env
PORT=3003
DASHBOARD_PORT=3004
```

**Missing Dependencies:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild native modules
npm rebuild
```

**Environment Configuration:**
```bash
# Validate .env file
npm run config:validate

# Check required variables
grep -E "^[A-Z_]+=.+" .env | wc -l

# Restore from backup
cp .env.backup .env
```

### 2. SSH Tunnel Connection Issues

#### Symptoms
- "Connection refused" errors
- API calls failing
- Tunnel status shows "DISCONNECTED"

#### Diagnostic Steps
```bash
# Test direct SSH connection
ssh -i ~/.ssh/oracle_key ubuntu@168.138.104.117

# Check tunnel status
npm run tunnel:status

# Test tunnel manually
ssh -i ~/.ssh/oracle_key -L 8080:api.gateio.ws:443 ubuntu@168.138.104.117 -N &

# Test through tunnel
curl -H "Host: api.gateio.ws" https://localhost:8080/api/v4/spot/currencies
```

#### Solutions

**SSH Key Issues:**
```bash
# Check key permissions
ls -la ~/.ssh/oracle_key
chmod 600 ~/.ssh/oracle_key

# Test key authentication
ssh-add ~/.ssh/oracle_key
ssh-add -l

# Regenerate key if needed
ssh-keygen -t rsa -b 4096 -f ~/.ssh/oracle_key_new
```

**Oracle Instance Issues:**
```bash
# Check Oracle instance status (from Oracle Console)
# Verify security list rules allow SSH (port 22)
# Check instance public IP hasn't changed

# Update IP in .env if changed
ORACLE_HOST=new.ip.address.here
```

**Network Connectivity:**
```bash
# Test internet connectivity
ping -c 4 8.8.8.8

# Test Oracle connectivity
ping -c 4 168.138.104.117

# Check local firewall
sudo ufw status
```

### 3. Trading System Issues

#### Symptoms
- No trades being executed
- Strategy signals not generating
- Risk management errors

#### Diagnostic Steps
```bash
# Check trading status
curl http://localhost:3001/api/v1/trading/status

# View trading logs
tail -f logs/trading-*.log

# Check strategy performance
npm run strategies:status

# Verify market data
curl http://localhost:3001/api/v1/market/btc-usdt
```

#### Solutions

**No Trading Signals:**
```bash
# Check strategy configuration
cat config/strategies.json

# Verify market data feed
npm run test:market-data

# Check indicator calculations
npm run test:indicators

# Reset strategy state
npm run strategies:reset
```

**API Rate Limiting:**
```bash
# Check rate limit status
npm run api:rate-limit-status

# Reduce request frequency
# Edit config/api-config.json
{
  "requestInterval": 2000,
  "maxConcurrent": 5
}
```

**Risk Management Blocking Trades:**
```bash
# Check risk parameters
cat config/risk.json

# View risk assessment logs
grep "RISK_BLOCKED" logs/trading-*.log

# Adjust risk settings if needed
{
  "maxRiskPercentage": 5.0,
  "minRiskRewardRatio": 1.2
}
```

### 4. Dashboard Access Issues

#### Symptoms
- Dashboard not loading
- 404 errors
- Blank white screen

#### Diagnostic Steps
```bash
# Check dashboard service
pm2 status ai-crypto-dashboard

# Test dashboard port
curl http://localhost:3002

# Check dashboard logs
pm2 logs ai-crypto-dashboard

# Verify build files
ls -la src/dashboard/.next
```

#### Solutions

**Dashboard Not Built:**
```bash
# Build dashboard
cd src/dashboard
npm run build
cd ../..

# Restart dashboard service
pm2 restart ai-crypto-dashboard
```

**Port Conflicts:**
```bash
# Check port usage
netstat -tulpn | grep :3002

# Change dashboard port
# Edit ecosystem.config.js
env: {
  PORT: 3003
}
```

**Missing Dependencies:**
```bash
# Install dashboard dependencies
cd src/dashboard
npm install
cd ../..

# Rebuild and restart
npm run dashboard:build
pm2 restart ai-crypto-dashboard
```

### 5. Database Issues

#### Symptoms
- "Database locked" errors
- Data not persisting
- Slow query performance

#### Diagnostic Steps
```bash
# Check database file
ls -la data/trading.db

# Test database connection
sqlite3 data/trading.db ".tables"

# Check database size
du -h data/trading.db

# Verify database integrity
sqlite3 data/trading.db "PRAGMA integrity_check;"
```

#### Solutions

**Database Locked:**
```bash
# Find processes using database
lsof data/trading.db

# Kill blocking processes
sudo kill -9 <PID>

# Restart application
pm2 restart all
```

**Database Corruption:**
```bash
# Backup current database
cp data/trading.db data/trading.db.backup

# Repair database
sqlite3 data/trading.db ".recover" > data/trading_recovered.sql
sqlite3 data/trading_new.db < data/trading_recovered.sql
mv data/trading_new.db data/trading.db

# Restart application
pm2 restart all
```

**Performance Issues:**
```bash
# Analyze database
sqlite3 data/trading.db "ANALYZE;"

# Vacuum database
sqlite3 data/trading.db "VACUUM;"

# Check indexes
sqlite3 data/trading.db ".schema" | grep INDEX
```

### 6. Memory and Performance Issues

#### Symptoms
- High memory usage
- Slow response times
- System freezing

#### Diagnostic Steps
```bash
# Check system resources
htop

# Check memory usage by process
ps aux --sort=-%mem | head -10

# Check disk usage
df -h

# Monitor I/O
iotop

# Check network usage
nethogs
```

#### Solutions

**High Memory Usage:**
```bash
# Restart PM2 processes
pm2 restart all

# Check for memory leaks
npm run test:memory-leak

# Adjust PM2 memory limits
pm2 start ecosystem.config.js --max-memory-restart 1G
```

**Disk Space Issues:**
```bash
# Clean old logs
find logs/ -name "*.log" -mtime +30 -delete

# Clean old backups
find backups/ -name "*.tar.gz" -mtime +7 -delete

# Clean npm cache
npm cache clean --force

# Clean PM2 logs
pm2 flush
```

**CPU Performance:**
```bash
# Check CPU usage
top -p $(pgrep -d',' node)

# Reduce AI model complexity
# Edit config/ai-config.json
{
  "modelSize": "small",
  "maxTokens": 1024
}

# Optimize strategy calculations
npm run strategies:optimize
```

## Advanced Diagnostics

### System Health Check Script

```bash
#!/bin/bash
# health-check.sh - Comprehensive system health check

echo "🔍 AI Crypto Trading Agent - Health Check"
echo "========================================"

# Check system resources
echo "💻 System Resources:"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
echo "Disk Usage: $(df -h / | awk 'NR==2{printf "%s", $5}')"

# Check services
echo -e "\n🔧 Services Status:"
pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status)"'

# Check network connectivity
echo -e "\n🌐 Network Connectivity:"
if ping -c 1 8.8.8.8 &> /dev/null; then
    echo "Internet: ✅ Connected"
else
    echo "Internet: ❌ Disconnected"
fi

if ssh -i ~/.ssh/oracle_key -o ConnectTimeout=5 ubuntu@168.138.104.117 echo "test" &> /dev/null; then
    echo "Oracle SSH: ✅ Connected"
else
    echo "Oracle SSH: ❌ Disconnected"
fi

# Check API endpoints
echo -e "\n🔌 API Endpoints:"
if curl -s -f http://localhost:3001/api/v1/health &> /dev/null; then
    echo "Trading API: ✅ Healthy"
else
    echo "Trading API: ❌ Unhealthy"
fi

if curl -s -f http://localhost:3002 &> /dev/null; then
    echo "Dashboard: ✅ Healthy"
else
    echo "Dashboard: ❌ Unhealthy"
fi

# Check database
echo -e "\n💾 Database Status:"
if sqlite3 data/trading.db "SELECT 1;" &> /dev/null; then
    echo "Database: ✅ Accessible"
    echo "Database Size: $(du -h data/trading.db | cut -f1)"
else
    echo "Database: ❌ Inaccessible"
fi

# Check logs for errors
echo -e "\n📋 Recent Errors:"
ERROR_COUNT=$(grep -c "ERROR\|FATAL" logs/*.log 2>/dev/null || echo "0")
echo "Error Count (last 24h): $ERROR_COUNT"

if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "Recent Errors:"
    grep "ERROR\|FATAL" logs/*.log | tail -5
fi

echo -e "\n✅ Health check completed"
```

### Log Analysis Script

```bash
#!/bin/bash
# analyze-logs.sh - Log analysis and error detection

echo "📊 Log Analysis Report"
echo "===================="

LOG_DIR="logs"
DATE=$(date +%Y-%m-%d)

# Error summary
echo "🚨 Error Summary:"
for level in ERROR FATAL WARN; do
    count=$(grep -c "$level" $LOG_DIR/*.log 2>/dev/null || echo "0")
    echo "$level: $count"
done

# Top errors
echo -e "\n🔍 Top Error Messages:"
grep "ERROR\|FATAL" $LOG_DIR/*.log 2>/dev/null | \
    sed 's/.*ERROR\|FATAL//' | \
    sort | uniq -c | sort -nr | head -5

# Performance metrics
echo -e "\n⚡ Performance Metrics:"
echo "API Response Times:"
grep "API_RESPONSE_TIME" $LOG_DIR/*.log 2>/dev/null | \
    awk '{print $NF}' | \
    awk '{sum+=$1; count++} END {if(count>0) printf "Average: %.2fms\n", sum/count}'

# Trading activity
echo -e "\n💰 Trading Activity:"
TRADES_TODAY=$(grep "TRADE_EXECUTED" $LOG_DIR/*$DATE*.log 2>/dev/null | wc -l)
echo "Trades Today: $TRADES_TODAY"

PROFIT_TODAY=$(grep "TRADE_EXECUTED.*profit" $LOG_DIR/*$DATE*.log 2>/dev/null | \
    awk '{print $NF}' | awk '{sum+=$1} END {printf "%.2f", sum}')
echo "Profit Today: $PROFIT_TODAY USDT"

echo -e "\n✅ Log analysis completed"
```

## Maintenance Procedures

### Daily Maintenance

```bash
#!/bin/bash
# daily-maintenance.sh

echo "🔧 Daily Maintenance Started"

# Check system health
./scripts/health-check.sh

# Rotate logs
pm2 flush

# Clean temporary files
find /tmp -name "ai-crypto-*" -mtime +1 -delete

# Update system packages (if needed)
sudo apt update && sudo apt list --upgradable

# Backup configuration
npm run backup:create

echo "✅ Daily maintenance completed"
```

### Weekly Maintenance

```bash
#!/bin/bash
# weekly-maintenance.sh

echo "🔧 Weekly Maintenance Started"

# Full system backup
npm run backup:full

# Database maintenance
sqlite3 data/trading.db "VACUUM;"
sqlite3 data/trading.db "ANALYZE;"

# Clean old logs and backups
find logs/ -name "*.log" -mtime +7 -delete
find backups/ -name "*.tar.gz" -mtime +14 -delete

# Security scan
npm run security:scan

# Performance optimization
npm run optimize:performance

echo "✅ Weekly maintenance completed"
```

## Emergency Procedures

### System Recovery

```bash
#!/bin/bash
# emergency-recovery.sh

echo "🚨 Emergency Recovery Procedure"

# Stop all services
pm2 stop all

# Check system resources
df -h
free -h

# Restore from latest backup
LATEST_BACKUP=$(ls -t backups/full-backup-*.tar.gz | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    echo "Restoring from: $LATEST_BACKUP"
    tar -xzf "$LATEST_BACKUP" -C /tmp/recovery/
    cp -r /tmp/recovery/* .
fi

# Restart services
pm2 start ecosystem.config.js

# Verify recovery
sleep 10
npm run test:health

echo "✅ Emergency recovery completed"
```

## Getting Help

### Support Channels

1. **Documentation**: Check relevant guides in `/docs`
2. **Logs**: Always check logs first: `pm2 logs`
3. **Health Check**: Run `./scripts/health-check.sh`
4. **Community**: Check GitHub issues and discussions

### Reporting Issues

When reporting issues, include:

1. **System Information**:
   ```bash
   uname -a
   node --version
   npm --version
   pm2 --version
   ```

2. **Error Logs**:
   ```bash
   pm2 logs --lines 100 > error-report.log
   ```

3. **System Status**:
   ```bash
   ./scripts/health-check.sh > system-status.txt
   ```

4. **Configuration** (sanitized):
   ```bash
   cat .env | sed 's/=.*/=***REDACTED***/' > config-sanitized.txt
   ```