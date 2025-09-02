# Ubuntu Server Deployment Guide

This guide covers deploying the AI Crypto Trading Agent on Ubuntu Server with SSH tunnel to Oracle Cloud.

## Prerequisites

### 1. System Requirements
- Ubuntu Server 20.04 LTS or newer
- Node.js 18+ and npm
- SSH client (usually pre-installed)
- Git (for cloning the repository)

### 2. Install Dependencies

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install additional tools
sudo apt install -y git openssh-client net-tools

# Verify installations
node --version
npm --version
ssh -V
```

## Deployment Steps

### 1. Clone and Setup Project

```bash
# Clone the repository
git clone <your-repo-url> SmoothSail
cd SmoothSail

# Install dependencies
npm install

# Make scripts executable
chmod +x start-tunnel.sh stop-tunnel.sh start-ssh-tunnel.js
chmod +x scripts/start-with-tunnel.sh
```

### 2. Configure Environment

```bash
# Copy and edit environment file
cp .env.example .env
nano .env
```

Ensure these Linux-specific settings in `.env`:
```bash
# Oracle SSH Configuration (Linux paths)
ORACLE_SSH_HOST=168.138.104.117
ORACLE_SSH_USERNAME=opc
SSH_PRIVATE_KEY_PATH=./keys/oracle_key

# Application settings
NODE_ENV=production
HOST=0.0.0.0
PORT=3001
```

### 3. Setup SSH Key

```bash
# Create keys directory
mkdir -p keys

# Copy your Oracle Cloud private key to keys/oracle_key
# Make sure it has correct permissions
chmod 600 keys/oracle_key

# Test SSH connection
ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -i keys/oracle_key opc@168.138.104.117 "echo 'Connection test successful'"
```

### 4. Build and Test

```bash
# Build the project
npm run build

# Test SSH tunnel
./start-tunnel.sh

# In another terminal, test API
node test-gateio-api.js

# Stop tunnel
./stop-tunnel.sh
```

## Running the Application

### Option 1: Direct Start
```bash
# Start with tunnel
./scripts/start-with-tunnel.sh
```

### Option 2: Manual Steps
```bash
# 1. Start SSH tunnel
./start-tunnel.sh

# 2. Start application
npm start

# 3. Stop tunnel when done
./stop-tunnel.sh
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

## Monitoring and Troubleshooting

### Check SSH Tunnel Status
```bash
# Check if tunnel is running
ps aux | grep ssh | grep 8443

# Check port is listening
netstat -tuln | grep :8443

# Check tunnel process
cat tunnel.pid
```

### View Logs
```bash
# Application logs
tail -f logs/trading.log

# SSH logs
sudo tail -f /var/log/auth.log | grep ssh

# PM2 logs (if using PM2)
pm2 logs crypto-trading-agent
```

### Common Issues

#### SSH Key Permissions
```bash
# Fix SSH key permissions
chmod 600 keys/oracle_key
chown $USER:$USER keys/oracle_key
```

#### Port Already in Use
```bash
# Find what's using port 8443
sudo netstat -tulpn | grep :8443

# Kill existing tunnel
./stop-tunnel.sh
```

#### Firewall Issues
```bash
# Check firewall status
sudo ufw status

# Allow necessary ports (if firewall is enabled)
sudo ufw allow 3000/tcp  # Dashboard
sudo ufw allow 3001/tcp  # API
sudo ufw allow 22/tcp    # SSH
```

## Security Considerations

### 1. SSH Key Security
```bash
# Ensure SSH key is secure
chmod 600 keys/oracle_key
# Never commit SSH keys to version control
echo "keys/" >> .gitignore
```

### 2. Environment Variables
```bash
# Secure .env file
chmod 600 .env
# Never commit .env to version control
echo ".env" >> .gitignore
```

### 3. Firewall Configuration
```bash
# Enable firewall
sudo ufw enable

# Allow only necessary ports
sudo ufw allow ssh
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
```

## Systemd Service (Optional)

Create a systemd service for automatic startup:

```bash
# Create service file
sudo nano /etc/systemd/system/crypto-trading-agent.service
```

Service file content:
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

Enable and start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable crypto-trading-agent
sudo systemctl start crypto-trading-agent
sudo systemctl status crypto-trading-agent
```

## Performance Optimization

### 1. Node.js Optimization
```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"
```

### 2. System Optimization
```bash
# Increase file descriptor limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
```

## Backup and Recovery

### 1. Backup Configuration
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "backup_${DATE}.tar.gz" .env keys/ data/ logs/
echo "Backup created: backup_${DATE}.tar.gz"
EOF

chmod +x backup.sh
```

### 2. Automated Backups
```bash
# Add to crontab for daily backups
crontab -e
# Add line: 0 2 * * * /home/ubuntu/SmoothSail/backup.sh
```

## Support

For issues specific to Ubuntu deployment:
1. Check system logs: `journalctl -u crypto-trading-agent`
2. Verify network connectivity: `ping api.gateio.ws`
3. Test SSH connection: `ssh -i keys/oracle_key opc@168.138.104.117`
4. Check application logs: `tail -f logs/trading.log`