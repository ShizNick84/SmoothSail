# Linux Deployment Checklist

Complete checklist for deploying the AI Crypto Trading Agent on Ubuntu Server.

## ✅ Pre-Deployment Checklist

### System Requirements
- [ ] Ubuntu Server 20.04 LTS or newer
- [ ] Minimum 2GB RAM, 20GB storage
- [ ] Internet connectivity
- [ ] SSH access to the server

### Dependencies Installation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install additional tools
sudo apt install -y git openssh-client net-tools curl wget

# Verify installations
node --version  # Should be 18+
npm --version   # Should be 9+
ssh -V         # Should show OpenSSH version
```

## ✅ Project Setup

### 1. Clone Repository
```bash
git clone <your-repo-url> SmoothSail
cd SmoothSail
```

### 2. Make Scripts Executable
```bash
chmod +x start-tunnel.sh
chmod +x stop-tunnel.sh
chmod +x start-ssh-tunnel.js
chmod +x start-minimal-linux.js
chmod +x scripts/start-with-tunnel.sh
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

**Required Environment Variables:**
```bash
# Oracle SSH Configuration
ORACLE_SSH_HOST=168.138.104.117
ORACLE_SSH_USERNAME=opc
SSH_PRIVATE_KEY_PATH=./keys/oracle_key

# Gate.io API
GATE_IO_API_KEY=your_api_key_here
GATE_IO_API_SECRET=your_api_secret_here

# Application
NODE_ENV=production
HOST=0.0.0.0
PORT=3001
```

### 5. SSH Key Setup
```bash
# Create keys directory
mkdir -p keys

# Copy your Oracle Cloud private key
# (Upload via scp, rsync, or copy-paste)
nano keys/oracle_key

# Set correct permissions
chmod 600 keys/oracle_key
chown $USER:$USER keys/oracle_key
```

## ✅ Testing Phase

### 1. Test SSH Connection
```bash
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i keys/oracle_key opc@168.138.104.117 "echo 'SSH test successful'"
```
**Expected:** "SSH test successful"

### 2. Test SSH Tunnel
```bash
# Start tunnel
./start-tunnel.sh

# Check if running (in another terminal)
ps aux | grep ssh | grep 8443
netstat -tuln | grep :8443

# Stop tunnel
./stop-tunnel.sh
```

### 3. Build Project
```bash
npm run build
```
**Expected:** No errors, `dist/` directory created

### 4. Test API Connection
```bash
# Start tunnel
./start-tunnel.sh

# Test API (in another terminal)
node test-gateio-api.js

# Stop tunnel
./stop-tunnel.sh
```

## ✅ Deployment Options

### Option 1: Simple Start (Development)
```bash
# Start with minimal setup
node start-minimal-linux.js
```

### Option 2: Full Application
```bash
# Start complete system
./scripts/start-with-tunnel.sh
```

### Option 3: Production with PM2
```bash
# Install PM2
npm install -g pm2

# Start tunnel
./start-tunnel.sh

# Start application with PM2
pm2 start dist/main.js --name "crypto-trading-agent"

# Save PM2 configuration
pm2 save
pm2 startup
```

### Option 4: Systemd Service
```bash
# Create service file
sudo nano /etc/systemd/system/crypto-trading-agent.service
```

**Service Configuration:**
```ini
[Unit]
Description=AI Crypto Trading Agent
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/SmoothSail
ExecStartPre=/home/ubuntu/SmoothSail/start-tunnel.sh
ExecStart=/usr/bin/node dist/main.js
ExecStop=/home/ubuntu/SmoothSail/stop-tunnel.sh
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable crypto-trading-agent
sudo systemctl start crypto-trading-agent
sudo systemctl status crypto-trading-agent
```

## ✅ Verification Steps

### 1. Check Services Running
```bash
# Check SSH tunnel
ps aux | grep ssh | grep 8443

# Check application
ps aux | grep node

# Check ports
netstat -tuln | grep -E ':(3000|3001|8443)'
```

### 2. Test Web Access
```bash
# Test dashboard (if accessible)
curl -I http://localhost:3000

# Test API endpoint
curl -I http://localhost:3001
```

### 3. Test API Functionality
```bash
node test-gateio-api.js
```

### 4. Check Logs
```bash
# Application logs
tail -f logs/trading.log

# System logs
sudo journalctl -u crypto-trading-agent -f

# SSH logs
sudo tail -f /var/log/auth.log | grep ssh
```

## ✅ Security Hardening

### 1. Firewall Configuration
```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow application ports (adjust as needed)
sudo ufw allow 3000/tcp  # Dashboard
sudo ufw allow 3001/tcp  # API

# Check status
sudo ufw status
```

### 2. File Permissions
```bash
# Secure sensitive files
chmod 600 .env
chmod 600 keys/oracle_key
chmod 755 *.sh

# Set ownership
chown -R $USER:$USER .
```

### 3. System Updates
```bash
# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## ✅ Monitoring Setup

### 1. Log Rotation
```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/crypto-trading-agent
```

**Logrotate Configuration:**
```
/home/ubuntu/SmoothSail/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        systemctl reload crypto-trading-agent || true
    endscript
}
```

### 2. Health Check Script
```bash
# Create health check
cat > health-check.sh << 'EOF'
#!/bin/bash
echo "=== Health Check $(date) ==="

# Check SSH tunnel
if pgrep -f "ssh.*8443:api.gateio.ws:443" > /dev/null; then
    echo "✅ SSH Tunnel: Running"
else
    echo "❌ SSH Tunnel: Not running"
fi

# Check application
if pgrep -f "node.*main.js" > /dev/null; then
    echo "✅ Application: Running"
else
    echo "❌ Application: Not running"
fi

# Check ports
if netstat -tuln | grep :8443 > /dev/null; then
    echo "✅ Port 8443: Listening"
else
    echo "❌ Port 8443: Not listening"
fi

# Test API
if curl -s http://localhost:8443 > /dev/null; then
    echo "✅ API: Responding"
else
    echo "❌ API: Not responding"
fi
EOF

chmod +x health-check.sh
```

### 3. Automated Monitoring
```bash
# Add to crontab for regular health checks
crontab -e
# Add: */5 * * * * /home/ubuntu/SmoothSail/health-check.sh >> /home/ubuntu/SmoothSail/logs/health.log 2>&1
```

## ✅ Backup Strategy

### 1. Configuration Backup
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR

# Backup configuration and data
tar -czf "$BACKUP_DIR/config_${DATE}.tar.gz" .env keys/ data/ logs/

# Keep only last 7 backups
find $BACKUP_DIR -name "config_*.tar.gz" -mtime +7 -delete

echo "Backup created: $BACKUP_DIR/config_${DATE}.tar.gz"
EOF

chmod +x backup.sh
```

### 2. Automated Backups
```bash
# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /home/ubuntu/SmoothSail/backup.sh
```

## ✅ Troubleshooting Guide

### Common Issues

#### SSH Connection Failed
```bash
# Check SSH key permissions
ls -la keys/oracle_key  # Should be -rw-------

# Test SSH connection
ssh -vvv -i keys/oracle_key opc@168.138.104.117

# Check firewall
sudo ufw status
```

#### Port Already in Use
```bash
# Find what's using the port
sudo netstat -tulpn | grep :8443

# Kill existing processes
./stop-tunnel.sh
pkill -f "ssh.*8443"
```

#### Application Won't Start
```bash
# Check Node.js version
node --version  # Should be 18+

# Check dependencies
npm install

# Check build
npm run build

# Check logs
tail -f logs/trading.log
```

#### API Calls Failing
```bash
# Check tunnel status
netstat -tuln | grep :8443

# Test tunnel connectivity
curl -I http://localhost:8443

# Check API credentials in .env
grep GATE_IO .env
```

## ✅ Performance Optimization

### 1. System Limits
```bash
# Increase file descriptor limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
```

### 2. Node.js Optimization
```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"
echo 'export NODE_OPTIONS="--max-old-space-size=2048"' >> ~/.bashrc
```

### 3. System Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs

# Monitor system resources
htop
iotop
nethogs
```

## ✅ Final Verification

After completing all steps, verify:

- [ ] SSH tunnel connects successfully
- [ ] Application starts without errors
- [ ] API tests pass
- [ ] Dashboard is accessible
- [ ] Logs are being written
- [ ] Services restart automatically
- [ ] Backups are working
- [ ] Monitoring is active
- [ ] Security measures are in place

## 🎉 Deployment Complete!

Your AI Crypto Trading Agent is now deployed and running on Ubuntu Server with:
- ✅ SSH tunnel to Oracle Cloud
- ✅ Gate.io API connectivity
- ✅ Web dashboard
- ✅ Automated monitoring
- ✅ Security hardening
- ✅ Backup strategy

**Next Steps:**
1. Monitor logs for any issues
2. Test trading functionality
3. Set up alerts and notifications
4. Configure trading parameters
5. Enable production trading (when ready)