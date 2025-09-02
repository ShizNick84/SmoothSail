# Intel NUC Deployment Testing Guide

This document describes the comprehensive testing suite for validating the Intel NUC Ubuntu deployment of the AI Crypto Trading Agent.

## Overview

The deployment testing suite consists of multiple test scripts that validate different aspects of the Intel NUC deployment:

1. **System Deployment Tests** - Validates basic system setup and configuration
2. **Startup Sequence Tests** - Tests service dependencies and startup order
3. **SSH Tunnel Connectivity Tests** - Validates SSH tunnel to Oracle Cloud and API access
4. **Complete Test Runner** - Runs all tests and generates comprehensive reports

## Test Scripts

### 1. Complete Test Runner (Recommended)

**Script:** `scripts/run-deployment-tests.sh`

This is the main test runner that executes all deployment tests and generates a comprehensive report.

```bash
# Run all deployment tests
sudo ./scripts/run-deployment-tests.sh
```

**Features:**
- Runs all test suites in sequence
- Generates detailed test reports
- Creates timestamped results directory
- Provides troubleshooting recommendations
- Shows overall pass/fail status

### 2. Individual Test Scripts

#### System Deployment Tests

**Script:** `scripts/test-deployment.sh`

Tests the basic system deployment and configuration:

```bash
sudo ./scripts/test-deployment.sh
```

**What it tests:**
- System dependencies (Node.js, PostgreSQL, system packages)
- User and directory structure
- SSH keys configuration
- Database setup and connectivity
- Systemd service files
- Security configuration (UFW, fail2ban)
- Scripts and monitoring setup
- Basic SSH connectivity to Oracle Cloud

#### Startup Sequence Tests

**Script:** `scripts/test-startup-sequence.sh`

Tests service startup order and dependencies:

```bash
sudo ./scripts/test-startup-sequence.sh
```

**What it tests:**
- Service enablement and recognition
- Service dependencies and startup order
- Restart behavior and policies
- User permissions and security settings
- Environment configuration
- Logging configuration
- Resource limits
- Auto-start after reboot simulation

#### SSH Tunnel Connectivity Tests

**Script:** `scripts/test-ssh-tunnel-connectivity.sh`

Tests SSH tunnel establishment and API connectivity:

```bash
sudo ./scripts/test-ssh-tunnel-connectivity.sh
```

**What it tests:**
- SSH prerequisites and key configuration
- Network connectivity to Oracle Cloud
- SSH connection establishment
- SSH tunnel creation and port forwarding
- API connectivity through tunnel
- Health monitoring scripts
- Network requirements

## Prerequisites

Before running the tests, ensure:

1. **Deployment Completed**: Run the deployment script first:
   ```bash
   sudo ./scripts/deploy-ubuntu-nuc.sh
   ```

2. **Oracle Cloud Access**: SSH key should be configured for Oracle Cloud access

3. **Network Connectivity**: Ensure network access to Oracle Cloud (168.138.104.117)

4. **Root Access**: All test scripts must be run with sudo

## Test Results

### Results Directory

Each test run creates a timestamped results directory:
```
/tmp/deployment-test-results-YYYYMMDD_HHMMSS/
├── overall-test-results.log
├── system_deployment-results.log
├── startup_sequence-results.log
├── ssh_tunnel_connectivity-results.log
└── deployment-test-report.md
```

### Test Report

The main test report (`deployment-test-report.md`) includes:
- Test summary with pass/fail counts
- Individual test suite results
- Detailed logs and error messages
- Troubleshooting recommendations
- Next steps based on results

## Understanding Test Results

### Success Indicators

- ✅ **All tests passed**: System is ready for application deployment
- 🟡 **Some warnings**: System functional but may need attention
- ❌ **Tests failed**: Issues must be resolved before proceeding

### Common Test Failures

#### SSH Connection Failures
**Symptoms:**
- SSH connection to Oracle Cloud fails
- SSH tunnel establishment fails

**Solutions:**
1. Verify SSH key is added to Oracle Cloud:
   ```bash
   ssh-copy-id -i /opt/trading-agent/keys/oracle_key.pub opc@168.138.104.117
   ```
2. Test manual SSH connection:
   ```bash
   ssh -i /opt/trading-agent/keys/oracle_key opc@168.138.104.117
   ```
3. Check Oracle Cloud security list allows SSH (port 22)

#### Service Configuration Errors
**Symptoms:**
- Systemd service syntax validation fails
- Service dependencies not configured correctly

**Solutions:**
1. Check service file syntax:
   ```bash
   systemd-analyze verify /etc/systemd/system/SERVICE_NAME.service
   ```
2. Reload systemd daemon:
   ```bash
   sudo systemctl daemon-reload
   ```

#### Database Connection Issues
**Symptoms:**
- PostgreSQL connection tests fail
- Database user authentication fails

**Solutions:**
1. Check PostgreSQL status:
   ```bash
   sudo systemctl status postgresql
   ```
2. Test database connection:
   ```bash
   PGPASSWORD='trading_secure_password_2024' psql -h localhost -U trading -d trading_agent -c 'SELECT 1;'
   ```

#### Permission Issues
**Symptoms:**
- File ownership or permission tests fail
- Scripts not executable

**Solutions:**
1. Fix ownership:
   ```bash
   sudo chown -R trading:trading /opt/trading-agent
   ```
2. Fix permissions:
   ```bash
   sudo chmod 700 /opt/trading-agent/keys
   sudo chmod 600 /opt/trading-agent/keys/oracle_key
   ```

## Manual Testing Procedures

### 1. Manual Service Testing

After deployment tests pass, test actual service startup:

```bash
# Enable services
sudo systemctl enable ssh-tunnel trading-agent trading-dashboard

# Start services in order
sudo systemctl start ssh-tunnel
sleep 10
sudo systemctl start trading-agent
sleep 10
sudo systemctl start trading-dashboard

# Check service status
sudo systemctl status ssh-tunnel trading-agent trading-dashboard
```

### 2. Manual SSH Tunnel Testing

Test SSH tunnel manually:

```bash
# Start tunnel manually
sudo -u trading ssh -N -L 8443:api.gateio.ws:443 \
  -i /opt/trading-agent/keys/oracle_key \
  opc@168.138.104.117 &

# Test tunnel connectivity
curl -k https://localhost:8443/api/v4/spot/currencies

# Stop tunnel
sudo pkill -f "ssh.*8443:api.gateio.ws:443"
```

### 3. Manual Reboot Testing

Test automatic startup after reboot:

```bash
# Enable all services
sudo systemctl enable ssh-tunnel trading-agent trading-dashboard

# Reboot system
sudo reboot

# After reboot, check services started automatically
sudo systemctl status ssh-tunnel trading-agent trading-dashboard
```

## Continuous Testing

### Automated Testing Schedule

Set up regular testing with cron:

```bash
# Add to root crontab
sudo crontab -e

# Run deployment tests weekly
0 2 * * 0 /opt/trading-agent/scripts/run-deployment-tests.sh > /var/log/trading-agent/weekly-deployment-test.log 2>&1
```

### Health Monitoring

The deployment includes health monitoring scripts:

- **Health Check**: `/opt/trading-agent/scripts/health-check.sh` (runs every 5 minutes)
- **Tunnel Health**: `/opt/trading-agent/scripts/tunnel-health-check.sh` (runs with service)

## Troubleshooting

### Test Script Issues

If test scripts fail to run:

1. **Permission Issues**:
   ```bash
   sudo chmod +x scripts/test-*.sh scripts/run-deployment-tests.sh
   ```

2. **Missing Dependencies**:
   ```bash
   sudo apt update && sudo apt install -y netcat-openbsd curl openssl
   ```

3. **Systemd Issues**:
   ```bash
   sudo systemctl daemon-reload
   ```

### Network Issues

If network connectivity tests fail:

1. **Check DNS Resolution**:
   ```bash
   nslookup 168.138.104.117
   nslookup api.gateio.ws
   ```

2. **Check Firewall**:
   ```bash
   sudo ufw status
   sudo ufw allow out 22
   sudo ufw allow out 443
   ```

3. **Test Direct Connectivity**:
   ```bash
   ping -c 3 168.138.104.117
   nc -z 168.138.104.117 22
   ```

## Next Steps After Testing

Once all tests pass:

1. **Deploy Application Code**:
   - Copy application files to `/opt/trading-agent`
   - Install dependencies: `npm install`
   - Build application: `npm run build`

2. **Configure Environment**:
   - Create `.env` file with API keys and configuration
   - Set up Telegram bot and email notifications

3. **Start Production Services**:
   ```bash
   sudo systemctl start ssh-tunnel trading-agent trading-dashboard
   sudo systemctl enable ssh-tunnel trading-agent trading-dashboard
   ```

4. **Validate End-to-End Functionality**:
   - Test trading bot functionality
   - Verify dashboard access
   - Test notification delivery
   - Monitor logs for errors

5. **Set Up Monitoring and Backups**:
   - Configure log monitoring
   - Set up automated backups
   - Configure alerting for system issues

## Support

For issues with deployment testing:

1. Check the detailed test logs in the results directory
2. Review the troubleshooting section above
3. Verify all prerequisites are met
4. Test individual components manually
5. Check system logs: `sudo journalctl -u SERVICE_NAME`