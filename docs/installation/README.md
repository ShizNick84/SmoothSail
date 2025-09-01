# Installation Guide

## Overview

This guide covers the complete installation of the AI Crypto Trading Agent on Intel NUC hardware running Ubuntu OS.

## Prerequisites

### Hardware Requirements
- Intel NUC with i5 CPU (minimum)
- 12GB RAM (minimum)
- 256GB M.2 SSD (minimum)
- Wireless and Gigabit Ethernet connectivity
- Stable internet connection

### Software Requirements
- Ubuntu 22.04 LTS or later
- Node.js 18.0.0 or later
- npm 9.0.0 or later
- Git
- SSH client

## Step 1: System Preparation

### Update Ubuntu System

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential
```

### Install Node.js and npm

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be v18.x.x or later
npm --version   # Should be 9.x.x or later
```

### Install System Dependencies

```bash
# Install required system packages
sudo apt install -y \
  sqlite3 \
  libsqlite3-dev \
  python3 \
  python3-pip \
  openssh-client \
  htop \
  iotop \
  nethogs \
  fail2ban \
  ufw

# Install PM2 for process management
sudo npm install -g pm2
```

## Step 2: Security Setup

### Configure Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH (if needed)
sudo ufw allow ssh

# Allow application ports
sudo ufw allow 3001/tcp  # API server
sudo ufw allow 3002/tcp  # Dashboard

# Check status
sudo ufw status
```

### Configure Fail2Ban

```bash
# Create jail configuration
sudo tee /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
EOF

# Restart fail2ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

## Step 3: Application Installation

### Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/ai-crypto-trading
sudo chown $USER:$USER /opt/ai-crypto-trading
cd /opt/ai-crypto-trading

# Clone the repository (replace with actual repo URL)
git clone https://github.com/your-org/ai-crypto-trading-agent.git .
```

### Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install development dependencies
npm install --only=dev
```

### Build Application

```bash
# Build TypeScript to JavaScript
npm run build

# Build dashboard
npm run dashboard:build
```

## Step 4: Configuration

### Create Environment File

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration (see Configuration Guide)
nano .env
```

### Create Data Directories

```bash
# Create required directories
mkdir -p data logs backups
chmod 755 data logs backups

# Create log rotation configuration
sudo tee /etc/logrotate.d/ai-crypto-trading << EOF
/opt/ai-crypto-trading/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 $USER $USER
}
EOF
```

## Step 5: SSH Tunnel Setup

### Generate SSH Key Pair

```bash
# Generate SSH key for Oracle connection
ssh-keygen -t rsa -b 4096 -f ~/.ssh/oracle_key -N ""

# Set proper permissions
chmod 600 ~/.ssh/oracle_key
chmod 644 ~/.ssh/oracle_key.pub
```

### Configure Oracle Free Tier

1. Copy public key to Oracle instance:
```bash
ssh-copy-id -i ~/.ssh/oracle_key.pub ubuntu@168.138.104.117
```

2. Test connection:
```bash
ssh -i ~/.ssh/oracle_key ubuntu@168.138.104.117
```

3. Update .env file with key path:
```bash
ORACLE_SSH_KEY_PATH=/home/$USER/.ssh/oracle_key
```

## Step 6: Service Configuration

### Create Systemd Service

```bash
# Create service file
sudo tee /etc/systemd/system/ai-crypto-trading.service << EOF
[Unit]
Description=AI Crypto Trading Agent
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/ai-crypto-trading
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=ai-crypto-trading

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable ai-crypto-trading
```

### Create PM2 Ecosystem File

```bash
# Create PM2 configuration
tee ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'ai-crypto-trading',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'ai-crypto-dashboard',
      script: 'npm',
      args: 'run dashboard:start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    }
  ]
};
EOF
```

## Step 7: Initial Testing

### Run Tests

```bash
# Run unit tests
npm test

# Run security tests
npm run test:security

# Run integration tests
npm run test:integration
```

### Start Application

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs
```

### Verify Installation

```bash
# Check API health
curl http://localhost:3001/api/v1/health

# Check dashboard
curl http://localhost:3002

# Check system status
npm run system:monitor
```

## Step 8: Production Deployment

### Enable Auto-Start

```bash
# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions provided by PM2
```

### Configure Monitoring

```bash
# Install PM2 monitoring (optional)
pm2 install pm2-server-monit

# Set up log monitoring
pm2 install pm2-logrotate
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Check if ports 3001/3002 are available
2. **Permission errors**: Ensure proper file permissions
3. **SSH tunnel issues**: Verify Oracle Free Tier connectivity
4. **Memory issues**: Monitor RAM usage with `htop`

### Log Locations

- Application logs: `/opt/ai-crypto-trading/logs/`
- PM2 logs: `~/.pm2/logs/`
- System logs: `/var/log/syslog`

### Support Commands

```bash
# Check system resources
npm run system:monitor

# Test SSH tunnel
npm run tunnel:status

# Backup configuration
npm run backup:create

# Security scan
npm run security:scan
```