# Oracle Free Tier Setup Guide

## Overview

This guide covers the complete setup of Oracle Free Tier instance for SSH tunnel connectivity.

## Step 1: Create Oracle Cloud Account

1. Visit [Oracle Cloud](https://cloud.oracle.com)
2. Sign up for free tier account
3. Complete identity verification
4. Access Oracle Cloud Console

## Step 2: Create Compute Instance

### Instance Configuration

1. Navigate to **Compute** > **Instances**
2. Click **Create Instance**
3. Configure instance:
   - **Name**: `ai-crypto-trading-tunnel`
   - **Image**: Ubuntu 22.04 LTS
   - **Shape**: VM.Standard.E2.1.Micro (Always Free)
   - **Boot Volume**: 50GB (Always Free)

### Network Configuration

1. **Virtual Cloud Network**: Create new VCN
   - **Name**: `ai-crypto-trading-vcn`
   - **CIDR Block**: `10.0.0.0/16`

2. **Subnet Configuration**:
   - **Name**: `public-subnet`
   - **CIDR Block**: `10.0.1.0/24`
   - **Route Table**: Default Route Table
   - **Security List**: Default Security List

3. **SSH Key Configuration**:
   - Upload your public SSH key
   - Or generate new key pair

### Security List Configuration

1. Navigate to **Networking** > **Virtual Cloud Networks**
2. Select your VCN > **Security Lists** > **Default Security List**
3. Add Ingress Rules:

```
Source: 0.0.0.0/0
Protocol: TCP
Port Range: 22
Description: SSH access

Source: 0.0.0.0/0
Protocol: TCP
Port Range: 80
Description: HTTP (optional)

Source: 0.0.0.0/0
Protocol: TCP
Port Range: 443
Description: HTTPS (optional)
```

## Step 3: Instance Setup

### Connect to Instance

```bash
# Get public IP from Oracle Console
ORACLE_IP="168.138.104.117"  # Replace with your actual IP

# Connect via SSH
ssh -i ~/.ssh/oracle_key ubuntu@$ORACLE_IP
```

### Update System

```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y \
  curl \
  wget \
  htop \
  fail2ban \
  ufw \
  unattended-upgrades
```

### Configure Security

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Configure fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configure automatic security updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Configure SSH

```bash
# Backup SSH config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Edit SSH configuration
sudo nano /etc/ssh/sshd_config
```

**SSH Configuration:**
```
# Disable root login
PermitRootLogin no

# Use key-based authentication only
PasswordAuthentication no
PubkeyAuthentication yes

# Change default port (optional)
Port 22

# Limit login attempts
MaxAuthTries 3
MaxStartups 3

# Enable keep-alive
ClientAliveInterval 300
ClientAliveCountMax 2
```

```bash
# Restart SSH service
sudo systemctl restart sshd
```

## Step 4: SSH Tunnel Configuration

### Create Tunnel User

```bash
# Create dedicated tunnel user
sudo useradd -m -s /bin/bash tunnel
sudo mkdir -p /home/tunnel/.ssh
sudo chmod 700 /home/tunnel/.ssh

# Add your public key
sudo nano /home/tunnel/.ssh/authorized_keys
# Paste your public key here

# Set permissions
sudo chmod 600 /home/tunnel/.ssh/authorized_keys
sudo chown -R tunnel:tunnel /home/tunnel/.ssh
```

### Configure Tunnel Restrictions

```bash
# Edit authorized_keys with restrictions
sudo nano /home/tunnel/.ssh/authorized_keys
```

**Restricted Key Format:**
```
command="echo 'Tunnel only'",no-agent-forwarding,no-X11-forwarding,no-pty ssh-rsa AAAAB3NzaC1yc2E... your-key-here
```

### Test Tunnel Connection

From your Intel NUC:

```bash
# Test basic SSH connection
ssh -i ~/.ssh/oracle_key tunnel@168.138.104.117

# Test tunnel creation
ssh -i ~/.ssh/oracle_key -L 8080:api.gateio.ws:443 tunnel@168.138.104.117 -N &

# Test tunnel functionality
curl -H "Host: api.gateio.ws" https://localhost:8080/api/v4/spot/currencies

# Kill test tunnel
pkill -f "ssh.*168.138.104.117"
```

## Step 5: Monitoring and Maintenance

### Install Monitoring Tools

```bash
# Install system monitoring
sudo apt install -y \
  htop \
  iotop \
  nethogs \
  vnstat \
  logwatch

# Configure vnstat for network monitoring
sudo systemctl enable vnstat
sudo systemctl start vnstat
```

### Create Monitoring Script

```bash
# Create monitoring script
sudo tee /usr/local/bin/tunnel-monitor.sh << 'EOF'
#!/bin/bash

# Log file
LOG_FILE="/var/log/tunnel-monitor.log"

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Check system resources
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEM_USAGE=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
DISK_USAGE=$(df -h / | awk 'NR==2{printf "%s", $5}' | sed 's/%//')

log "System Status - CPU: ${CPU_USAGE}%, Memory: ${MEM_USAGE}%, Disk: ${DISK_USAGE}%"

# Check for high resource usage
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    log "WARNING: High CPU usage detected: ${CPU_USAGE}%"
fi

if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
    log "WARNING: High memory usage detected: ${MEM_USAGE}%"
fi

if [ "$DISK_USAGE" -gt 80 ]; then
    log "WARNING: High disk usage detected: ${DISK_USAGE}%"
fi

# Check active connections
CONNECTIONS=$(ss -tuln | wc -l)
log "Active connections: $CONNECTIONS"

# Check for suspicious activity
FAILED_LOGINS=$(grep "Failed password" /var/log/auth.log | tail -10 | wc -l)
if [ "$FAILED_LOGINS" -gt 5 ]; then
    log "WARNING: Multiple failed login attempts detected: $FAILED_LOGINS"
fi
EOF

# Make executable
sudo chmod +x /usr/local/bin/tunnel-monitor.sh

# Add to crontab
echo "*/5 * * * * /usr/local/bin/tunnel-monitor.sh" | sudo crontab -
```

### Log Rotation

```bash
# Configure log rotation
sudo tee /etc/logrotate.d/tunnel-monitor << EOF
/var/log/tunnel-monitor.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF
```

## Step 6: Backup and Recovery

### Create Backup Script

```bash
# Create backup script
sudo tee /usr/local/bin/backup-config.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup configurations
tar -czf $BACKUP_DIR/config_backup_$DATE.tar.gz \
    /etc/ssh/sshd_config \
    /etc/ufw/ \
    /etc/fail2ban/ \
    /home/tunnel/.ssh/

# Keep only last 7 backups
find $BACKUP_DIR -name "config_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: config_backup_$DATE.tar.gz"
EOF

# Make executable and schedule
sudo chmod +x /usr/local/bin/backup-config.sh
echo "0 2 * * * /usr/local/bin/backup-config.sh" | sudo crontab -
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check security list rules
   - Verify SSH service is running
   - Check firewall settings

2. **Authentication Failed**
   - Verify SSH key permissions
   - Check authorized_keys file
   - Ensure correct username

3. **Tunnel Drops**
   - Check network stability
   - Verify keep-alive settings
   - Monitor system resources

### Diagnostic Commands

```bash
# Check SSH service
sudo systemctl status sshd

# Check firewall rules
sudo ufw status verbose

# Check active connections
sudo ss -tuln

# Check system resources
htop

# Check logs
sudo tail -f /var/log/auth.log
sudo tail -f /var/log/tunnel-monitor.log
```

## Security Best Practices

1. **Regular Updates**: Keep system updated
2. **Key Rotation**: Rotate SSH keys regularly
3. **Monitoring**: Monitor logs and system resources
4. **Backup**: Regular configuration backups
5. **Access Control**: Limit SSH access to specific IPs
6. **Fail2Ban**: Configure aggressive fail2ban rules
7. **Firewall**: Minimal open ports
8. **Audit**: Regular security audits