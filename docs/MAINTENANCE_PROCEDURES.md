# AI Crypto Trading Agent - Maintenance Procedures

## Overview

This document outlines comprehensive maintenance procedures for the AI Crypto Trading Agent running on Intel NUC hardware. Regular maintenance ensures optimal performance, security, and reliability of the trading system.

## Table of Contents

1. [Daily Maintenance](#daily-maintenance)
2. [Weekly Maintenance](#weekly-maintenance)
3. [Monthly Maintenance](#monthly-maintenance)
4. [Quarterly Maintenance](#quarterly-maintenance)
5. [Emergency Procedures](#emergency-procedures)
6. [Error Handling Maintenance](#error-handling-maintenance)
7. [Update Procedures](#update-procedures)
8. [Monitoring and Alerting](#monitoring-and-alerting)
9. [Backup and Recovery](#backup-and-recovery)

---

## Daily Maintenance

### Automated Daily Tasks

These tasks are automated and run via cron jobs:

```bash
# Daily maintenance cron jobs (runs at 2 AM)
0 2 * * * /opt/trading-agent/scripts/daily-maintenance.sh
```

#### 1. System Health Check

**Script**: `scripts/daily-health-check.sh`

```bash
#!/bin/bash
# Daily system health verification

echo "🔍 Daily Health Check - $(date)"
echo "================================"

# Check system resources
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)

echo "💻 System Resources:"
echo "  CPU Usage: ${CPU_USAGE}%"
echo "  Memory Usage: ${MEMORY_USAGE}%"
echo "  Disk Usage: ${DISK_USAGE}%"

# Alert if thresholds exceeded
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    echo "⚠️ HIGH CPU USAGE: ${CPU_USAGE}%"
    ./scripts/send-alert.sh "High CPU usage detected: ${CPU_USAGE}%"
fi

if (( $(echo "$MEMORY_USAGE > 85" | bc -l) )); then
    echo "⚠️ HIGH MEMORY USAGE: ${MEMORY_USAGE}%"
    ./scripts/send-alert.sh "High memory usage detected: ${MEMORY_USAGE}%"
fi

if (( DISK_USAGE > 80 )); then
    echo "⚠️ HIGH DISK USAGE: ${DISK_USAGE}%"
    ./scripts/send-alert.sh "High disk usage detected: ${DISK_USAGE}%"
fi
```

#### 2. Service Status Verification

```bash
# Check all critical services
SERVICES=("ssh-tunnel" "trading-agent" "trading-dashboard" "postgresql")

for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo "✅ $service: Active"
    else
        echo "❌ $service: Inactive"
        ./scripts/send-alert.sh "Service $service is not running"
        # Attempt restart
        sudo systemctl restart "$service"
    fi
done
```

#### 3. Trading Performance Check

```bash
# Check trading performance metrics
TRADES_TODAY=$(grep "TRADE_EXECUTED" /var/log/trading-agent/trading-$(date +%Y-%m-%d).log | wc -l)
PROFIT_TODAY=$(grep "PROFIT" /var/log/trading-agent/trading-$(date +%Y-%m-%d).log | awk '{sum+=$NF} END {print sum}')

echo "💰 Trading Performance:"
echo "  Trades Today: $TRADES_TODAY"
echo "  Profit Today: $PROFIT_TODAY USDT"

# Alert on unusual activity
if [ "$TRADES_TODAY" -eq 0 ]; then
    ./scripts/send-alert.sh "No trades executed today - check system"
fi
```

#### 4. Log Rotation and Cleanup

```bash
# Rotate logs daily
sudo logrotate -f /etc/logrotate.d/trading-agent

# Clean temporary files
find /tmp -name "trading-*" -mtime +1 -delete
find /opt/trading-agent/logs -name "*.log" -mtime +7 -delete

# Clean old backups (keep 30 days)
find /opt/trading-agent/backups -name "*.tar.gz" -mtime +30 -delete
```

### Manual Daily Checks

#### 1. Dashboard Verification

```bash
# Verify dashboard accessibility
curl -f http://localhost:3000 > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Dashboard accessible"
else
    echo "❌ Dashboard not accessible"
    sudo systemctl restart trading-dashboard
fi
```

#### 2. SSH Tunnel Health

```bash
# Test SSH tunnel connectivity
./scripts/tunnel-manager.sh test
if [ $? -eq 0 ]; then
    echo "✅ SSH tunnel healthy"
else
    echo "❌ SSH tunnel issues detected"
    ./scripts/tunnel-manager.sh restart
fi
```

#### 3. API Connectivity Test

```bash
# Test Gate.io API connectivity
curl -H "Host: api.gateio.ws" https://localhost:8443/api/v4/spot/currencies > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ API connectivity OK"
else
    echo "❌ API connectivity issues"
    ./scripts/send-alert.sh "Gate.io API connectivity issues detected"
fi
```

---

## Weekly Maintenance

### Automated Weekly Tasks

```bash
# Weekly maintenance cron job (runs Sunday at 3 AM)
0 3 * * 0 /opt/trading-agent/scripts/weekly-maintenance.sh
```

#### 1. Full System Backup

```bash
#!/bin/bash
# Weekly full system backup

echo "🔄 Weekly Full Backup - $(date)"
echo "==============================="

# Stop services for consistent backup
sudo systemctl stop trading-agent trading-dashboard

# Create full backup
BACKUP_FILE="/opt/trading-agent/backups/weekly-backup-$(date +%Y%m%d).tar.gz"

tar -czf "$BACKUP_FILE" \
    --exclude="node_modules" \
    --exclude="logs/*.log" \
    --exclude="backups" \
    /opt/trading-agent/

# Backup database
sudo -u postgres pg_dump trading_agent > "/opt/trading-agent/backups/database-$(date +%Y%m%d).sql"

# Restart services
sudo systemctl start ssh-tunnel trading-agent trading-dashboard

echo "✅ Weekly backup completed: $BACKUP_FILE"
```

#### 2. Database Maintenance

```bash
# PostgreSQL maintenance
sudo -u postgres psql -d trading_agent -c "VACUUM ANALYZE;"
sudo -u postgres psql -d trading_agent -c "REINDEX DATABASE trading_agent;"

# Check database size and performance
DB_SIZE=$(sudo -u postgres psql -d trading_agent -t -c "SELECT pg_size_pretty(pg_database_size('trading_agent'));")
echo "📊 Database size: $DB_SIZE"

# Cleanup old data (keep 90 days)
sudo -u postgres psql -d trading_agent -c "DELETE FROM trades WHERE created_at < NOW() - INTERVAL '90 days';"
sudo -u postgres psql -d trading_agent -c "DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days';"
```

#### 3. Security Updates

```bash
# Update system packages
sudo apt update
sudo apt list --upgradable

# Install security updates only
sudo apt upgrade -y --only-upgrade $(apt list --upgradable 2>/dev/null | grep -i security | cut -d'/' -f1)

# Update Node.js dependencies (security only)
npm audit fix --only=prod

# Check for security vulnerabilities
npm audit --audit-level moderate
```

#### 4. Performance Analysis

```bash
# Generate weekly performance report
./scripts/generate-performance-report.sh weekly

# Analyze trading performance
WEEKLY_TRADES=$(grep "TRADE_EXECUTED" /var/log/trading-agent/trading-*.log | grep "$(date -d '7 days ago' +%Y-%m-%d)" | wc -l)
WEEKLY_PROFIT=$(grep "PROFIT" /var/log/trading-agent/trading-*.log | grep "$(date -d '7 days ago' +%Y-%m-%d)" | awk '{sum+=$NF} END {print sum}')

echo "📈 Weekly Performance:"
echo "  Total Trades: $WEEKLY_TRADES"
echo "  Total Profit: $WEEKLY_PROFIT USDT"
echo "  Average per Trade: $(echo "scale=2; $WEEKLY_PROFIT / $WEEKLY_TRADES" | bc) USDT"
```

### Manual Weekly Checks

#### 1. Strategy Performance Review

```bash
# Review strategy performance
./scripts/strategy-performance-analysis.sh

# Check strategy weights and adjustments
cat config/strategies.json | jq '.strategies[] | {name: .name, enabled: .enabled, weight: .weight, performance: .performance}'
```

#### 2. Security Audit

```bash
# Run security audit
./scripts/security-audit.sh

# Check failed login attempts
sudo grep "Failed password" /var/log/auth.log | tail -20

# Review Fail2Ban status
sudo fail2ban-client status
sudo fail2ban-client status ssh-tunnel
```

#### 3. System Optimization

```bash
# Check for system optimization opportunities
./scripts/system-optimizer.sh

# Review memory usage patterns
free -h
cat /proc/meminfo | grep -E "(MemTotal|MemFree|MemAvailable|Cached)"

# Check disk I/O performance
iostat -x 1 5
```

---

## Monthly Maintenance

### Automated Monthly Tasks

```bash
# Monthly maintenance cron job (runs 1st of month at 4 AM)
0 4 1 * * /opt/trading-agent/scripts/monthly-maintenance.sh
```

#### 1. Comprehensive System Review

```bash
#!/bin/bash
# Monthly comprehensive system review

echo "🔍 Monthly System Review - $(date)"
echo "=================================="

# Generate comprehensive system report
./scripts/generate-system-report.sh monthly

# Review system logs for patterns
./scripts/log-analysis.sh monthly

# Check system stability metrics
uptime
systemctl --failed
journalctl --since "30 days ago" --priority=err --no-pager
```

#### 2. Performance Benchmarking

```bash
# Run performance benchmarks
./scripts/performance-benchmark.sh

# Compare with baseline metrics
./scripts/compare-performance-metrics.sh

# Generate performance trend analysis
./scripts/performance-trend-analysis.sh
```

#### 3. Security Penetration Testing

```bash
# Run automated security tests
./scripts/security-penetration-test.sh

# Update security configurations
./scripts/update-security-config.sh

# Review and update SSL certificates
./scripts/ssl-certificate-check.sh
```

#### 4. Backup Verification and Testing

```bash
# Test backup restoration process
./scripts/test-backup-restoration.sh

# Verify backup integrity
./scripts/verify-backup-integrity.sh

# Update backup retention policies
./scripts/update-backup-policies.sh
```

### Manual Monthly Tasks

#### 1. Trading Strategy Optimization

```bash
# Analyze strategy performance over the month
./scripts/monthly-strategy-analysis.sh

# Optimize strategy parameters based on performance
./scripts/optimize-strategy-parameters.sh

# Backtest new strategy configurations
./scripts/backtest-strategies.sh
```

#### 2. System Configuration Review

```bash
# Review and update system configurations
nano /opt/trading-agent/.env
nano config/strategies.json
nano config/risk.json

# Update API keys if needed (rotate quarterly)
./scripts/update-api-keys.sh

# Review and update notification settings
./scripts/update-notification-config.sh
```

#### 3. Documentation Updates

```bash
# Update system documentation
./scripts/update-documentation.sh

# Review and update operational procedures
./scripts/review-procedures.sh

# Update system architecture diagrams
./scripts/update-architecture-docs.sh
```

---

## Quarterly Maintenance

### Major System Updates

#### 1. Software Updates

```bash
# Major Node.js version updates
./scripts/update-nodejs.sh

# Update all npm dependencies
npm update
npm audit fix

# Update system packages
sudo apt full-upgrade -y

# Update AI/LLM models
./scripts/update-ai-models.sh
```

#### 2. Hardware Maintenance

```bash
# Check Intel NUC hardware health
./scripts/hardware-health-check.sh

# Clean system (dust removal, thermal paste check)
# This requires physical access to the Intel NUC

# Check SSD health and performance
sudo smartctl -a /dev/sda
sudo hdparm -tT /dev/sda
```

#### 3. Security Review

```bash
# Comprehensive security audit
./scripts/comprehensive-security-audit.sh

# Update security policies and procedures
./scripts/update-security-policies.sh

# Rotate all API keys and secrets
./scripts/rotate-all-secrets.sh

# Update SSL certificates
./scripts/update-ssl-certificates.sh
```

---

## Emergency Procedures

### System Failure Response

#### 1. Critical System Failure

```bash
#!/bin/bash
# Emergency response for critical system failure

echo "🚨 EMERGENCY RESPONSE ACTIVATED"
echo "==============================="

# Stop all trading activities immediately
sudo systemctl stop trading-agent

# Secure current positions (if possible)
curl -X POST http://localhost:3001/api/v1/emergency/close-all-positions

# Create emergency backup
./scripts/emergency-backup.sh

# Send emergency notifications
./scripts/send-emergency-alert.sh "CRITICAL SYSTEM FAILURE - Trading stopped"

# Collect diagnostic information
./scripts/collect-diagnostics.sh

# Attempt automatic recovery
./scripts/emergency-recovery.sh
```

#### 2. Network Failure Response

```bash
# Network connectivity issues
if ! ping -c 3 8.8.8.8 &>/dev/null; then
    echo "❌ Internet connectivity lost"
    
    # Switch to offline mode
    export TRADING_MODE=offline
    
    # Stop SSH tunnel
    sudo systemctl stop ssh-tunnel
    
    # Log network failure
    echo "$(date): Network failure detected" >> /var/log/trading-agent/network-failures.log
    
    # Send local notification (if possible)
    ./scripts/send-local-alert.sh "Network connectivity lost"
fi
```

#### 3. Security Breach Response

```bash
# Security incident response
if ./scripts/detect-security-breach.sh; then
    echo "🔒 SECURITY BREACH DETECTED"
    
    # Immediately stop all services
    sudo systemctl stop trading-agent trading-dashboard
    
    # Secure the system
    sudo ufw deny all
    
    # Create forensic backup
    ./scripts/forensic-backup.sh
    
    # Send security alert
    ./scripts/send-security-alert.sh "SECURITY BREACH DETECTED - System secured"
    
    # Begin incident response
    ./scripts/security-incident-response.sh
fi
```

---

## Error Handling Maintenance

### Daily Error Handling Checks

#### 1. Error Rate Monitoring

```bash
#!/bin/bash
# Daily error rate check

echo "🔍 Daily Error Rate Check - $(date)"
echo "================================="

# Check current error rate
ERROR_RATE=$(curl -s http://localhost:3001/api/errors/dashboard | jq -r '.errorMetrics.errorRate')
CRITICAL_ERRORS=$(curl -s http://localhost:3001/api/errors/dashboard | jq -r '.errorMetrics.criticalErrors')
SYSTEM_HEALTH=$(curl -s http://localhost:3001/api/health | jq -r '.overallHealth')

echo "📊 Error Metrics:"
echo "  Error Rate: $ERROR_RATE/hour"
echo "  Critical Errors: $CRITICAL_ERRORS"
echo "  System Health: $SYSTEM_HEALTH%"

# Alert on high error rates
if (( $(echo "$ERROR_RATE > 10" | bc -l) )); then
    echo "⚠️ HIGH ERROR RATE: $ERROR_RATE/hour"
    /usr/local/bin/trading-error-analysis
    ./scripts/send-alert.sh "High error rate detected: $ERROR_RATE/hour"
fi

# Alert on low system health
if (( $(echo "$SYSTEM_HEALTH < 80" | bc -l) )); then
    echo "⚠️ LOW SYSTEM HEALTH: $SYSTEM_HEALTH%"
    /usr/local/bin/trading-health-check
    ./scripts/send-alert.sh "Low system health: $SYSTEM_HEALTH%"
fi
```

#### 2. Circuit Breaker Status Check

```bash
# Check circuit breaker status
CIRCUIT_BREAKERS=$(curl -s http://localhost:3001/api/errors/dashboard | jq -r '.recoveryMetrics.circuitBreakersOpen')

echo "🔌 Circuit Breaker Status:"
echo "  Open Circuit Breakers: $CIRCUIT_BREAKERS"

if [ "$CIRCUIT_BREAKERS" -gt 0 ]; then
    echo "⚠️ CIRCUIT BREAKERS OPEN: $CIRCUIT_BREAKERS"
    
    # Get details of open circuit breakers
    curl -s http://localhost:3001/api/errors/dashboard | jq '.recoveryMetrics.circuitBreakerDetails'
    
    # Send alert
    ./scripts/send-alert.sh "$CIRCUIT_BREAKERS circuit breakers are open"
fi
```

#### 3. Error Log Analysis

```bash
# Analyze error patterns in logs
echo "📋 Error Log Analysis:"

# Count errors by type today
if [ -f "/var/log/trading-agent/error-$(date +%Y-%m-%d).log" ]; then
    echo "Error counts by type:"
    grep -oE "(TE|AI|NE|SE)[0-9]{3}" "/var/log/trading-agent/error-$(date +%Y-%m-%d).log" | \
        sort | uniq -c | sort -nr | head -10
    
    # Check for new error types
    NEW_ERRORS=$(grep -oE "(TE|AI|NE|SE)[0-9]{3}" "/var/log/trading-agent/error-$(date +%Y-%m-%d).log" | \
        sort -u | comm -23 - /opt/trading-agent/config/known-errors.txt)
    
    if [ -n "$NEW_ERRORS" ]; then
        echo "⚠️ NEW ERROR TYPES DETECTED:"
        echo "$NEW_ERRORS"
        ./scripts/send-alert.sh "New error types detected: $NEW_ERRORS"
    fi
fi
```

### Weekly Error Handling Maintenance

#### 1. Error Pattern Analysis

```bash
#!/bin/bash
# Weekly error pattern analysis

echo "📈 Weekly Error Pattern Analysis - $(date)"
echo "========================================="

# Analyze error trends over the week
for i in {0..6}; do
    DATE=$(date -d "$i days ago" +%Y-%m-%d)
    if [ -f "/var/log/trading-agent/error-$DATE.log" ]; then
        ERROR_COUNT=$(wc -l < "/var/log/trading-agent/error-$DATE.log")
        echo "$DATE: $ERROR_COUNT errors"
    fi
done

# Generate error pattern report
/usr/local/bin/trading-error-analysis > "/tmp/weekly-error-report-$(date +%Y%m%d).txt"

# Check for error pattern escalation
PATTERN_COUNT=$(curl -s http://localhost:3001/api/errors/dashboard | jq '.activePatterns | length')
echo "Active Error Patterns: $PATTERN_COUNT"

if [ "$PATTERN_COUNT" -gt 5 ]; then
    echo "⚠️ HIGH NUMBER OF ERROR PATTERNS: $PATTERN_COUNT"
    ./scripts/send-alert.sh "High number of error patterns detected: $PATTERN_COUNT"
fi
```

#### 2. Recovery Success Rate Review

```bash
# Review auto-recovery success rates
RECOVERY_RATE=$(curl -s http://localhost:3001/api/errors/dashboard | jq -r '.recoveryMetrics.autoRecoverySuccessRate')
MANUAL_INTERVENTIONS=$(curl -s http://localhost:3001/api/errors/dashboard | jq -r '.recoveryMetrics.manualInterventionsRequired')

echo "🔄 Recovery Metrics:"
echo "  Auto-Recovery Success Rate: $RECOVERY_RATE%"
echo "  Manual Interventions Required: $MANUAL_INTERVENTIONS"

# Alert on low recovery success rate
if (( $(echo "$RECOVERY_RATE < 70" | bc -l) )); then
    echo "⚠️ LOW RECOVERY SUCCESS RATE: $RECOVERY_RATE%"
    ./scripts/send-alert.sh "Low auto-recovery success rate: $RECOVERY_RATE%"
    
    # Analyze failed recovery attempts
    grep "recovery.*failed" /var/log/trading-agent/error-*.log | tail -10
fi
```

#### 3. Error Handling Configuration Optimization

```bash
# Review and optimize error handling configuration
echo "⚙️ Error Handling Configuration Review:"

# Check retry configurations
curl -s http://localhost:3001/api/errors/config | jq '.retryConfigurations'

# Check alert rule effectiveness
curl -s http://localhost:3001/api/errors/alert-rules | jq '.rules[] | select(.triggered > 0)'

# Update thresholds based on recent performance
./scripts/optimize-error-thresholds.sh
```

### Monthly Error Handling Maintenance

#### 1. Comprehensive Error Analysis

```bash
#!/bin/bash
# Monthly comprehensive error analysis

echo "📊 Monthly Error Analysis - $(date)"
echo "================================="

# Generate monthly error report
START_DATE=$(date -d "1 month ago" +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)

echo "Analysis Period: $START_DATE to $END_DATE"

# Error statistics
TOTAL_ERRORS=$(find /var/log/trading-agent/ -name "error-*.log" -newermt "$START_DATE" | \
    xargs cat | wc -l)
CRITICAL_ERRORS=$(find /var/log/trading-agent/ -name "error-*.log" -newermt "$START_DATE" | \
    xargs grep "CRITICAL" | wc -l)

echo "Total Errors: $TOTAL_ERRORS"
echo "Critical Errors: $CRITICAL_ERRORS"
echo "Critical Error Rate: $(echo "scale=2; $CRITICAL_ERRORS * 100 / $TOTAL_ERRORS" | bc)%"

# Top error types
echo -e "\nTop Error Types:"
find /var/log/trading-agent/ -name "error-*.log" -newermt "$START_DATE" | \
    xargs grep -oE "(TE|AI|NE|SE)[0-9]{3}" | sort | uniq -c | sort -nr | head -10

# Error trend analysis
./scripts/generate-error-trend-report.sh "$START_DATE" "$END_DATE"
```

#### 2. Error Handling System Health Check

```bash
# Check error handling system components
echo "🔧 Error Handling System Health:"

# Check error handler services
for handler in trading-error-handler ai-error-handler network-error-handler system-error-manager; do
    if pgrep -f "$handler" > /dev/null; then
        echo "✅ $handler: Running"
    else
        echo "❌ $handler: Not running"
    fi
done

# Check error monitoring dashboard
if curl -s http://localhost:3001/api/errors/dashboard > /dev/null; then
    echo "✅ Error monitoring dashboard: Accessible"
else
    echo "❌ Error monitoring dashboard: Not accessible"
fi

# Check notification system
./scripts/test-notification-system.sh
```

#### 3. Error Handling Performance Optimization

```bash
# Optimize error handling performance
echo "🚀 Error Handling Performance Optimization:"

# Analyze error handling response times
curl -s http://localhost:3001/api/errors/performance-metrics | jq '.responseTime'

# Check memory usage of error handling components
ps aux | grep -E "(error-handler|error-manager)" | awk '{print $1, $2, $4, $11}'

# Optimize error log storage
./scripts/optimize-error-log-storage.sh

# Update error handling algorithms based on patterns
./scripts/update-error-handling-algorithms.sh
```

### Error Handling Emergency Procedures

#### 1. Error Storm Response

```bash
#!/bin/bash
# Response to error storm (>50 errors/hour)

ERROR_RATE=$(curl -s http://localhost:3001/api/errors/dashboard | jq -r '.errorMetrics.errorRate')

if (( $(echo "$ERROR_RATE > 50" | bc -l) )); then
    echo "🚨 ERROR STORM DETECTED: $ERROR_RATE errors/hour"
    
    # Immediate actions
    echo "Taking immediate action..."
    
    # Enable emergency mode
    curl -X POST http://localhost:3001/api/errors/emergency-mode/enable
    
    # Stop non-critical operations
    curl -X POST http://localhost:3001/api/trading/pause-non-critical
    
    # Increase logging verbosity temporarily
    curl -X POST http://localhost:3001/api/logging/increase-verbosity
    
    # Send critical alert
    ./scripts/send-critical-alert.sh "ERROR STORM: $ERROR_RATE errors/hour - Emergency mode activated"
    
    # Start intensive monitoring
    ./scripts/start-intensive-monitoring.sh
fi
```

#### 2. Circuit Breaker Cascade Response

```bash
# Response to multiple circuit breakers opening
OPEN_BREAKERS=$(curl -s http://localhost:3001/api/errors/dashboard | jq -r '.recoveryMetrics.circuitBreakersOpen')

if [ "$OPEN_BREAKERS" -gt 3 ]; then
    echo "🚨 CIRCUIT BREAKER CASCADE: $OPEN_BREAKERS breakers open"
    
    # Emergency system recovery
    /usr/local/bin/trading-system-recovery
    
    # If recovery fails, initiate emergency shutdown
    sleep 60
    HEALTH=$(curl -s http://localhost:3001/api/health | jq -r '.overallHealth')
    if (( $(echo "$HEALTH < 50" | bc -l) )); then
        echo "🚨 EMERGENCY SHUTDOWN INITIATED"
        curl -X POST http://localhost:3001/api/emergency/shutdown
        ./scripts/send-critical-alert.sh "EMERGENCY SHUTDOWN: System health critical"
    fi
fi
```

#### 3. Error Handling System Failure Response

```bash
# Response when error handling system itself fails
if ! curl -s http://localhost:3001/api/errors/dashboard > /dev/null; then
    echo "🚨 ERROR HANDLING SYSTEM FAILURE"
    
    # Switch to basic error logging
    export ERROR_HANDLING_MODE=basic
    
    # Restart error handling components
    sudo systemctl restart trading-agent
    
    # Enable fallback monitoring
    ./scripts/enable-fallback-monitoring.sh
    
    # Send alert via alternative channel
    echo "Error handling system failure at $(date)" | \
        mail -s "CRITICAL: Error Handling System Down" admin@yourdomain.com
fi
```

---

## Update Procedures

### Application Updates

#### 1. Minor Updates (Bug fixes, patches)

```bash
#!/bin/bash
# Minor update procedure

echo "🔄 Applying Minor Update"
echo "======================="

# Create backup before update
./scripts/backup.sh config

# Pull latest changes
git fetch origin
git checkout main
git pull origin main

# Install updated dependencies
npm install

# Run tests
npm test

# Build application
npm run build

# Restart services
sudo systemctl restart trading-agent trading-dashboard

# Verify update
./scripts/verify-update.sh

echo "✅ Minor update completed"
```

#### 2. Major Updates (New features, breaking changes)

```bash
#!/bin/bash
# Major update procedure

echo "🚀 Applying Major Update"
echo "======================="

# Stop all services
sudo systemctl stop trading-agent trading-dashboard ssh-tunnel

# Create full backup
./scripts/backup.sh full

# Update application
git fetch origin
git checkout v2.0.0  # Example version
npm install
npm run build

# Run migration scripts if needed
./scripts/migrate-database.sh
./scripts/migrate-config.sh

# Update systemd services if needed
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload

# Start services
sudo systemctl start ssh-tunnel trading-agent trading-dashboard

# Run comprehensive tests
./scripts/run-all-tests.sh

# Verify update
./scripts/verify-major-update.sh

echo "✅ Major update completed"
```

### System Updates

#### 1. Operating System Updates

```bash
# Ubuntu system updates
sudo apt update
sudo apt list --upgradable

# Install updates (excluding kernel updates during trading hours)
sudo apt upgrade -y --exclude=linux-*

# Reboot if required (schedule during maintenance window)
if [ -f /var/run/reboot-required ]; then
    echo "⚠️ Reboot required - schedule during maintenance window"
    ./scripts/schedule-reboot.sh
fi
```

#### 2. Node.js Updates

```bash
# Update Node.js to latest LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify version
node --version
npm --version

# Rebuild native modules
npm rebuild

# Test application
npm test
```

---

## Monitoring and Alerting

### Monitoring Configuration

#### 1. System Metrics Monitoring

```bash
# CPU, Memory, Disk monitoring
./scripts/setup-system-monitoring.sh

# Configure thresholds
cat > config/monitoring-thresholds.json << EOF
{
  "cpu": {
    "warning": 70,
    "critical": 85
  },
  "memory": {
    "warning": 80,
    "critical": 90
  },
  "disk": {
    "warning": 75,
    "critical": 85
  },
  "network": {
    "latency_warning": 500,
    "latency_critical": 1000
  }
}
EOF
```

#### 2. Application Monitoring

```bash
# Trading performance monitoring
./scripts/setup-trading-monitoring.sh

# API response time monitoring
./scripts/setup-api-monitoring.sh

# Database performance monitoring
./scripts/setup-db-monitoring.sh
```

### Alert Configuration

#### 1. Telegram Alerts

```bash
# Configure Telegram alerts
cat > config/telegram-alerts.json << EOF
{
  "critical": {
    "enabled": true,
    "chat_id": "${TELEGRAM_CHAT_ID}",
    "template": "🚨 CRITICAL: {message}"
  },
  "warning": {
    "enabled": true,
    "chat_id": "${TELEGRAM_CHAT_ID}",
    "template": "⚠️ WARNING: {message}"
  },
  "info": {
    "enabled": true,
    "chat_id": "${TELEGRAM_CHAT_ID}",
    "template": "ℹ️ INFO: {message}"
  }
}
EOF
```

#### 2. Email Alerts

```bash
# Configure email alerts
cat > config/email-alerts.json << EOF
{
  "smtp": {
    "host": "${EMAIL_HOST}",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "${EMAIL_USER}",
      "pass": "${EMAIL_PASS}"
    }
  },
  "templates": {
    "critical": "templates/email-critical.html",
    "warning": "templates/email-warning.html",
    "daily_report": "templates/email-daily-report.html"
  }
}
EOF
```

---

## Backup and Recovery

### Backup Strategy

#### 1. Automated Backups

```bash
# Daily incremental backups
0 2 * * * /opt/trading-agent/scripts/backup.sh incremental

# Weekly full backups
0 3 * * 0 /opt/trading-agent/scripts/backup.sh full

# Monthly archive backups
0 4 1 * * /opt/trading-agent/scripts/backup.sh archive
```

#### 2. Backup Verification

```bash
#!/bin/bash
# Verify backup integrity

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

# Test backup file integrity
if tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
    echo "✅ Backup file integrity OK"
else
    echo "❌ Backup file corrupted"
    exit 1
fi

# Test database backup
if [ -f "${BACKUP_FILE%.tar.gz}.sql" ]; then
    if pg_restore --list "${BACKUP_FILE%.tar.gz}.sql" > /dev/null 2>&1; then
        echo "✅ Database backup integrity OK"
    else
        echo "❌ Database backup corrupted"
        exit 1
    fi
fi

echo "✅ Backup verification completed"
```

### Recovery Procedures

#### 1. Configuration Recovery

```bash
#!/bin/bash
# Recover configuration from backup

BACKUP_FILE=$1

# Extract configuration files
tar -xzf "$BACKUP_FILE" -C /tmp/ opt/trading-agent/.env opt/trading-agent/config/

# Restore configuration
cp /tmp/opt/trading-agent/.env /opt/trading-agent/
cp -r /tmp/opt/trading-agent/config/* /opt/trading-agent/config/

# Fix permissions
chown trading:trading /opt/trading-agent/.env
chown -R trading:trading /opt/trading-agent/config/

# Restart services to reload configuration
sudo systemctl restart trading-agent trading-dashboard

echo "✅ Configuration recovery completed"
```

#### 2. Full System Recovery

```bash
#!/bin/bash
# Full system recovery from backup

BACKUP_FILE=$1

# Stop all services
sudo systemctl stop trading-agent trading-dashboard ssh-tunnel

# Restore application files
tar -xzf "$BACKUP_FILE" -C /

# Restore database
DATABASE_FILE="${BACKUP_FILE%.tar.gz}.sql"
if [ -f "$DATABASE_FILE" ]; then
    sudo -u postgres dropdb trading_agent
    sudo -u postgres createdb trading_agent
    sudo -u postgres psql trading_agent < "$DATABASE_FILE"
fi

# Fix permissions
sudo chown -R trading:trading /opt/trading-agent
chmod 600 /opt/trading-agent/keys/oracle_key
chmod 600 /opt/trading-agent/.env

# Start services
sudo systemctl start ssh-tunnel trading-agent trading-dashboard

# Verify recovery
sleep 30
./scripts/health-check.sh

echo "✅ Full system recovery completed"
```

---

## Maintenance Schedule Summary

### Daily (Automated)
- ✅ System health checks
- ✅ Service status verification
- ✅ Log rotation and cleanup
- ✅ Basic performance monitoring

### Weekly (Automated + Manual)
- ✅ Full system backup
- ✅ Database maintenance
- ✅ Security updates
- ✅ Performance analysis
- 👤 Strategy performance review
- 👤 Security audit

### Monthly (Mixed)
- ✅ Comprehensive system review
- ✅ Performance benchmarking
- ✅ Security penetration testing
- ✅ Backup verification
- 👤 Trading strategy optimization
- 👤 Configuration review
- 👤 Documentation updates

### Quarterly (Manual)
- 👤 Major software updates
- 👤 Hardware maintenance
- 👤 Comprehensive security review
- 👤 API key rotation

### Emergency (As Needed)
- 🚨 System failure response
- 🚨 Network failure response
- 🚨 Security breach response

---

*This maintenance guide ensures the AI Crypto Trading Agent remains secure, performant, and reliable. Follow these procedures regularly to maintain optimal system operation.*