# Intel NUC Setup Guide for AI Crypto Trading Agent

## Overview

This comprehensive guide covers the complete setup of Intel NUC hardware for optimal performance with the AI Crypto Trading Agent. The guide includes hardware configuration, Ubuntu installation, performance optimization, and security hardening specifically tailored for 24/7 cryptocurrency trading operations.

## Hardware Requirements

### Recommended Intel NUC Specifications

**Minimum Requirements:**
- **CPU**: Intel Core i5-1135G7 (11th Gen) or newer
- **RAM**: 12GB DDR4-3200 (8GB minimum)
- **Storage**: 256GB M.2 NVMe SSD (minimum)
- **Network**: Gigabit Ethernet + Wi-Fi 6
- **Power**: 65W external adapter

**Optimal Configuration:**
- **CPU**: Intel Core i7-1165G7 (11th Gen) or newer
- **RAM**: 16GB DDR4-3200 (dual channel)
- **Storage**: 512GB M.2 NVMe SSD (Samsung 980 PRO recommended)
- **Network**: Gigabit Ethernet + Wi-Fi 6E
- **Power**: 90W external adapter with UPS backup

### Hardware Assembly

#### Step 1: Prepare Components

```bash
# Required components checklist:
- [ ] Intel NUC barebone kit
- [ ] DDR4 SO-DIMM memory modules
- [ ] M.2 NVMe SSD
- [ ] Wi-Fi antenna (if not included)
- [ ] Power adapter
- [ ] HDMI cable (for initial setup)
- [ ] USB keyboard and mouse
- [ ] Ethernet cable
```

#### Step 2: Install Memory

1. **Power off** and unplug the NUC
2. **Remove bottom cover** (usually 4 screws)
3. **Install RAM modules**:
   - Insert at 45-degree angle
   - Press down until clips engage
   - For dual-channel, use both slots
4. **Verify installation** - modules should be flush and secure

#### Step 3: Install M.2 SSD

1. **Locate M.2 slot** (usually marked M.2_1)
2. **Remove mounting screw** at far end
3. **Insert SSD** at 45-degree angle
4. **Press down** and secure with screw
5. **Verify connection** - SSD should be flat against board

#### Step 4: Connect Antennas

1. **Attach Wi-Fi antennas** to designated connectors
2. **Route cables** through designated channels
3. **Secure antennas** to case mounting points

#### Step 5: Final Assembly

1. **Replace bottom cover**
2. **Connect power adapter**
3. **Connect Ethernet cable**
4. **Connect HDMI for initial setup**

## Ubuntu Installation

### Step 1: Create Installation Media

```bash
# Download Ubuntu 22.04 LTS Server
wget https://releases.ubuntu.com/22.04/ubuntu-22.04.3-live-server-amd64.iso

# Create bootable USB (Linux)
sudo dd if=ubuntu-22.04.3-live-server-amd64.iso of=/dev/sdX bs=4M status=progress

# Create bootable USB (Windows - use Rufus or similar tool)
```

### Step 2: BIOS Configuration

1. **Power on NUC** and press F2 during boot
2. **Configure BIOS settings**:
   - **Boot Order**: USB first, then SSD
   - **Secure Boot**: Disabled (for compatibility)
   - **Legacy Boot**: Disabled (UEFI only)
   - **Intel VT-x**: Enabled
   - **Intel VT-d**: Enabled
   - **Hyper-Threading**: Enabled
   - **Turbo Boost**: Enabled
   - **Power Management**: Balanced

3. **Advanced Settings**:
   - **Memory**: Enable XMP Profile 1
   - **Graphics**: Set to 1GB (minimum for headless)
   - **Audio**: Disable if not needed
   - **USB**: Enable all ports
   - **Network**: Enable Wake-on-LAN

4. **Save and Exit**

### Step 3: Ubuntu Installation

1. **Boot from USB** and select "Install Ubuntu Server"

2. **Network Configuration**:
   - Configure Ethernet with static IP (recommended)
   - Example configuration:
     ```
     IP Address: 192.168.1.100/24
     Gateway: 192.168.1.1
     DNS: 8.8.8.8, 1.1.1.1
     ```

3. **Storage Configuration**:
   - Use entire disk with LVM
   - Enable encryption (recommended for security)
   - Partition scheme:
     ```
     /boot: 1GB (ext4)
     /: 50GB (ext4)
     /home: 20GB (ext4)
     /opt: 30GB (ext4) - for trading application
     /var/log: 10GB (ext4) - for logs
     swap: 4GB
     ```

4. **User Configuration**:
   - Create user: `trader` (or preferred username)
   - Enable SSH server
   - Import SSH keys if available

5. **Software Selection**:
   - Install OpenSSH server
   - No additional snaps needed

### Step 4: Post-Installation Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y \
    curl \
    wget \
    git \
    htop \
    iotop \
    nethogs \
    tree \
    vim \
    tmux \
    fail2ban \
    ufw \
    unattended-upgrades \
    build-essential \
    software-properties-common

# Configure automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Performance Optimization

### CPU Optimization

```bash
# Install CPU frequency utilities
sudo apt install -y cpufrequtils

# Set CPU governor to performance
echo 'GOVERNOR="performance"' | sudo tee /etc/default/cpufrequtils

# Apply immediately
sudo systemctl restart cpufrequtils

# Verify CPU frequency
cpufreq-info

# Enable Intel Turbo Boost (if available)
echo 0 | sudo tee /sys/devices/system/cpu/intel_pstate/no_turbo
```

### Memory Optimization

```bash
# Configure swappiness (reduce swap usage)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

# Configure memory overcommit
echo 'vm.overcommit_memory=1' | sudo tee -a /etc/sysctl.conf

# Configure dirty page writeback
echo 'vm.dirty_ratio=15' | sudo tee -a /etc/sysctl.conf
echo 'vm.dirty_background_ratio=5' | sudo tee -a /etc/sysctl.conf

# Apply changes
sudo sysctl -p
```

### Storage Optimization

```bash
# Enable SSD TRIM
sudo systemctl enable fstrim.timer

# Configure I/O scheduler for SSD
echo 'ACTION=="add|change", KERNEL=="nvme[0-9]*", ATTR{queue/scheduler}="none"' | \
    sudo tee /etc/udev/rules.d/60-ioschedulers.rules

# Optimize mount options for SSD
sudo cp /etc/fstab /etc/fstab.backup

# Add noatime,discard options to SSD mounts
sudo sed -i 's/errors=remount-ro/noatime,discard,errors=remount-ro/' /etc/fstab
```

### Network Optimization

```bash
# Optimize network settings for trading
sudo tee -a /etc/sysctl.conf << EOF

# Network optimizations for trading
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 65536 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_tw_reuse = 1
EOF

# Apply network optimizations
sudo sysctl -p
```

## Security Hardening

### Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if needed)
sudo ufw allow 22/tcp

# Allow trading application ports
sudo ufw allow 3001/tcp comment "AI Trading API"
sudo ufw allow 3002/tcp comment "AI Trading Dashboard"

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status verbose
```

### SSH Hardening

```bash
# Backup SSH configuration
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Create hardened SSH configuration
sudo tee /etc/ssh/sshd_config << EOF
# AI Crypto Trading Agent - Hardened SSH Configuration

# Network
Port 22
AddressFamily inet
ListenAddress 0.0.0.0

# Authentication
PermitRootLogin no
MaxAuthTries 3
MaxSessions 2
PubkeyAuthentication yes
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes

# Security
Protocol 2
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key

# Ciphers and algorithms
KexAlgorithms curve25519-sha256@libssh.org,ecdh-sha2-nistp521,ecdh-sha2-nistp384,ecdh-sha2-nistp256,diffie-hellman-group16-sha512
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,hmac-sha2-256,hmac-sha2-512

# Connection settings
ClientAliveInterval 300
ClientAliveCountMax 2
TCPKeepAlive yes
Compression no

# Logging
SyslogFacility AUTH
LogLevel VERBOSE

# Restrictions
AllowUsers trader
DenyUsers root
MaxStartups 3:30:10
LoginGraceTime 30

# Disable unused features
AllowAgentForwarding no
AllowTcpForwarding no
GatewayPorts no
PermitTunnel no
X11Forwarding no
PrintMotd no
PrintLastLog yes
Banner none
EOF

# Restart SSH service
sudo systemctl restart sshd

# Test SSH configuration
sudo sshd -t
```

### Fail2Ban Configuration

```bash
# Configure fail2ban for SSH and trading application
sudo tee /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

[ai-crypto-trading]
enabled = true
port = 3001,3002
logpath = /opt/ai-crypto-trading/logs/security.log
maxretry = 5
bantime = 1800
filter = ai-crypto-trading

[nginx-http-auth]
enabled = false

[nginx-limit-req]
enabled = false
EOF

# Create custom filter for trading application
sudo tee /etc/fail2ban/filter.d/ai-crypto-trading.conf << EOF
[Definition]
failregex = ^.*\[security\].*Failed login attempt from <HOST>.*$
            ^.*\[security\].*Suspicious activity from <HOST>.*$
            ^.*\[security\].*Rate limit exceeded from <HOST>.*$
ignoreregex =
EOF

# Restart fail2ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

## System Monitoring Setup

### Install Monitoring Tools

```bash
# Install system monitoring tools
sudo apt install -y \
    htop \
    iotop \
    nethogs \
    vnstat \
    smartmontools \
    lm-sensors \
    stress-ng

# Configure sensors
sudo sensors-detect --auto

# Initialize vnstat
sudo systemctl enable vnstat
sudo systemctl start vnstat
```

### Create Monitoring Scripts

```bash
# Create system monitoring script
sudo tee /usr/local/bin/nuc-monitor.sh << 'EOF'
#!/bin/bash

# Intel NUC System Monitor for AI Crypto Trading Agent
LOG_FILE="/var/log/nuc-monitor.log"

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> $LOG_FILE
}

# Get system metrics
CPU_TEMP=$(sensors | grep "Core 0" | awk '{print $3}' | sed 's/+//;s/°C//')
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEM_USAGE=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
DISK_USAGE=$(df -h / | awk 'NR==2{printf "%s", $5}' | sed 's/%//')
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')

# Log metrics
log "CPU: ${CPU_USAGE}%, Temp: ${CPU_TEMP}°C, Memory: ${MEM_USAGE}%, Disk: ${DISK_USAGE}%, Load: ${LOAD_AVG}"

# Check for alerts
if (( $(echo "$CPU_TEMP > 75" | bc -l) )); then
    log "ALERT: High CPU temperature: ${CPU_TEMP}°C"
fi

if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    log "ALERT: High CPU usage: ${CPU_USAGE}%"
fi

if (( $(echo "$MEM_USAGE > 85" | bc -l) )); then
    log "ALERT: High memory usage: ${MEM_USAGE}%"
fi

if [ "$DISK_USAGE" -gt 90 ]; then
    log "ALERT: High disk usage: ${DISK_USAGE}%"
fi

# Check SSD health
SSD_HEALTH=$(sudo smartctl -A /dev/nvme0n1 | grep "Percentage Used" | awk '{print $3}' | sed 's/%//')
if [ ! -z "$SSD_HEALTH" ] && [ "$SSD_HEALTH" -gt 80 ]; then
    log "ALERT: SSD wear level high: ${SSD_HEALTH}%"
fi

# Check network connectivity
if ! ping -c 1 -W 5 8.8.8.8 &> /dev/null; then
    log "ALERT: Internet connectivity lost"
fi
EOF

# Make executable
sudo chmod +x /usr/local/bin/nuc-monitor.sh

# Add to crontab (run every 5 minutes)
echo "*/5 * * * * /usr/local/bin/nuc-monitor.sh" | sudo crontab -
```

### Configure Log Rotation

```bash
# Configure log rotation for monitoring
sudo tee /etc/logrotate.d/nuc-monitor << EOF
/var/log/nuc-monitor.log {
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

## Power Management

### Configure Power Settings

```bash
# Install power management tools
sudo apt install -y powertop tlp tlp-rdw

# Configure TLP for performance
sudo tee /etc/tlp.conf << EOF
# TLP Configuration for AI Crypto Trading Agent

# CPU settings
CPU_SCALING_GOVERNOR_ON_AC=performance
CPU_SCALING_GOVERNOR_ON_BAT=performance
CPU_MIN_PERF_ON_AC=0
CPU_MAX_PERF_ON_AC=100
CPU_MIN_PERF_ON_BAT=0
CPU_MAX_PERF_ON_BAT=100
CPU_BOOST_ON_AC=1
CPU_BOOST_ON_BAT=1

# Platform settings
PLATFORM_PROFILE_ON_AC=performance
PLATFORM_PROFILE_ON_BAT=performance

# Processor settings
CPU_ENERGY_PERF_POLICY_ON_AC=performance
CPU_ENERGY_PERF_POLICY_ON_BAT=performance

# Network settings
WIFI_PWR_ON_AC=off
WIFI_PWR_ON_BAT=off

# USB settings
USB_AUTOSUSPEND=0

# PCIe settings
PCIE_ASPM_ON_AC=default
PCIE_ASPM_ON_BAT=default

# Disable wake on LAN (security)
WOL_DISABLE=Y
EOF

# Enable TLP
sudo systemctl enable tlp
sudo systemctl start tlp
```

### UPS Configuration (Recommended)

```bash
# Install UPS monitoring (if UPS is connected)
sudo apt install -y nut

# Configure UPS (example for APC UPS via USB)
sudo tee /etc/nut/ups.conf << EOF
[apc]
    driver = usbhid-ups
    port = auto
    desc = "APC UPS"
EOF

# Configure UPS daemon
sudo tee /etc/nut/upsd.conf << EOF
LISTEN 127.0.0.1 3493
EOF

# Configure UPS monitoring
sudo tee /etc/nut/upsmon.conf << EOF
MONITOR apc@localhost 1 upsmon password master
SHUTDOWNCMD "/sbin/shutdown -h +0"
NOTIFYCMD /usr/sbin/upssched
POLLFREQ 5
POLLFREQALERT 5
HOSTSYNC 15
DEADTIME 15
POWERDOWNFLAG /etc/killpower
NOTIFYFLAG ONBATT SYSLOG+WALL+EXEC
NOTIFYFLAG LOWBATT SYSLOG+WALL+EXEC
NOTIFYFLAG ONLINE SYSLOG+WALL+EXEC
RBWARNTIME 43200
NOCOMMWARNTIME 300
FINALDELAY 5
EOF

# Enable NUT services
sudo systemctl enable nut-server
sudo systemctl enable nut-client
```

## Backup and Recovery

### Create System Backup Script

```bash
# Create comprehensive backup script
sudo tee /usr/local/bin/nuc-backup.sh << 'EOF'
#!/bin/bash

# Intel NUC System Backup Script
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/nuc-backup.log"

# Create backup directory
mkdir -p $BACKUP_DIR

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a $LOG_FILE
}

log "Starting system backup..."

# Backup system configuration
tar -czf $BACKUP_DIR/system_config_$DATE.tar.gz \
    /etc/ssh/ \
    /etc/ufw/ \
    /etc/fail2ban/ \
    /etc/fstab \
    /etc/sysctl.conf \
    /etc/crontab \
    /var/spool/cron/crontabs/ \
    2>/dev/null

# Backup trading application
if [ -d "/opt/ai-crypto-trading" ]; then
    tar -czf $BACKUP_DIR/trading_app_$DATE.tar.gz \
        --exclude=node_modules \
        --exclude=logs \
        --exclude=data \
        /opt/ai-crypto-trading/
fi

# Backup user configurations
tar -czf $BACKUP_DIR/user_config_$DATE.tar.gz \
    $HOME/.ssh/ \
    $HOME/.bashrc \
    $HOME/.profile \
    2>/dev/null

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

log "Backup completed successfully"
EOF

# Make executable and schedule
sudo chmod +x /usr/local/bin/nuc-backup.sh
echo "0 2 * * * /usr/local/bin/nuc-backup.sh" | sudo crontab -
```

## Troubleshooting

### Common Issues

#### High CPU Temperature
```bash
# Check thermal throttling
dmesg | grep -i thermal

# Monitor CPU frequency
watch -n 1 "cat /proc/cpuinfo | grep MHz"

# Clean dust from NUC (physical maintenance required)
# Ensure proper ventilation
# Consider undervolting if temperatures persist
```

#### Memory Issues
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Check for memory leaks
valgrind --tool=memcheck --leak-check=full your_application

# Monitor memory over time
sar -r 1 60
```

#### Storage Issues
```bash
# Check SSD health
sudo smartctl -a /dev/nvme0n1

# Check disk usage
du -sh /* | sort -hr

# Check I/O performance
sudo iotop -o

# Test SSD speed
sudo hdparm -tT /dev/nvme0n1
```

#### Network Issues
```bash
# Check network interfaces
ip addr show

# Test network speed
speedtest-cli

# Check network statistics
vnstat -i eth0

# Monitor network usage
nethogs
```

### Performance Tuning

#### CPU Performance
```bash
# Check CPU scaling
cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Set performance mode
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Check CPU features
lscpu | grep -E "(Flags|Features)"
```

#### Memory Performance
```bash
# Check memory bandwidth
sudo apt install -y mbw
mbw 1024

# Check memory latency
sudo apt install -y lat_mem_rd
lat_mem_rd 1024 128
```

#### Storage Performance
```bash
# Test sequential read/write
dd if=/dev/zero of=/tmp/testfile bs=1G count=1 oflag=direct
dd if=/tmp/testfile of=/dev/null bs=1G count=1 iflag=direct

# Test random I/O
sudo apt install -y fio
fio --name=random-write --ioengine=posixaio --rw=randwrite --bs=4k --size=4g --numjobs=1 --iodepth=1 --runtime=60 --time_based --end_fsync=1
```

## Maintenance Schedule

### Daily Tasks
- [ ] Check system logs: `journalctl -f`
- [ ] Monitor resource usage: `htop`
- [ ] Check trading application status: `pm2 status`
- [ ] Verify network connectivity: `ping 8.8.8.8`

### Weekly Tasks
- [ ] Update system packages: `sudo apt update && sudo apt upgrade`
- [ ] Check SSD health: `sudo smartctl -a /dev/nvme0n1`
- [ ] Review security logs: `sudo fail2ban-client status`
- [ ] Clean temporary files: `sudo apt autoremove && sudo apt autoclean`

### Monthly Tasks
- [ ] Full system backup
- [ ] Security audit: `sudo lynis audit system`
- [ ] Performance review: analyze monitoring logs
- [ ] Update trading application
- [ ] Review and rotate logs

### Quarterly Tasks
- [ ] Hardware inspection (dust cleaning)
- [ ] Thermal paste replacement (if needed)
- [ ] Security configuration review
- [ ] Disaster recovery test
- [ ] Performance benchmarking

This comprehensive Intel NUC setup guide ensures optimal performance, security, and reliability for the AI Crypto Trading Agent's 24/7 operation.