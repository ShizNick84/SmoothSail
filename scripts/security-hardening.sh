#!/bin/bash

# =============================================================================
# Security Hardening Script for Intel NUC Production Deployment
# =============================================================================
# This script implements comprehensive security hardening measures
# for the AI Crypto Trading Agent production environment
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TRADING_AGENT_DIR="/opt/trading-agent"
TRADING_USER="trading"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    
    apt-get update
    apt-get upgrade -y
    apt-get autoremove -y
    apt-get autoclean
    
    success "System packages updated"
}

# Configure SSH security
configure_ssh_security() {
    log "Configuring SSH security..."
    
    # Backup original SSH config
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    
    # SSH security configuration
    cat > /etc/ssh/sshd_config.d/99-security.conf << 'EOF'
# SSH Security Configuration for Trading Agent

# Disable root login
PermitRootLogin no

# Use key-based authentication only
PasswordAuthentication no
PubkeyAuthentication yes
AuthenticationMethods publickey

# Disable empty passwords
PermitEmptyPasswords no

# Disable X11 forwarding
X11Forwarding no

# Disable agent forwarding
AllowAgentForwarding no

# Disable TCP forwarding
AllowTcpForwarding no

# Use strong ciphers and MACs
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-256-etm@openssh.com,hmac-sha2-512-etm@openssh.com,hmac-sha2-256,hmac-sha2-512

# Use strong key exchange algorithms
KexAlgorithms curve25519-sha256@libssh.org,diffie-hellman-group16-sha512,diffie-hellman-group18-sha512

# Limit login attempts
MaxAuthTries 3
MaxSessions 2

# Set login grace time
LoginGraceTime 30

# Client alive settings
ClientAliveInterval 300
ClientAliveCountMax 2

# Banner
Banner /etc/ssh/banner

# Log level
LogLevel VERBOSE
EOF
    
    # Create SSH banner
    cat > /etc/ssh/banner << 'EOF'
***************************************************************************
                    AUTHORIZED ACCESS ONLY
***************************************************************************
This system is for authorized users only. All activities are monitored
and logged. Unauthorized access is strictly prohibited and will be
prosecuted to the full extent of the law.
***************************************************************************
EOF
    
    # Restart SSH service
    systemctl restart sshd
    
    success "SSH security configured"
}

# Configure system security settings
configure_system_security() {
    log "Configuring system security settings..."
    
    # Kernel security parameters
    cat > /etc/sysctl.d/99-security.conf << 'EOF'
# Network security
net.ipv4.ip_forward = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# IPv6 security (disable if not needed)
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1

# Memory protection
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
kernel.yama.ptrace_scope = 1

# File system security
fs.suid_dumpable = 0
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
EOF
    
    # Apply sysctl settings
    sysctl -p /etc/sysctl.d/99-security.conf
    
    success "System security settings configured"
}

# Configure file permissions and ownership
configure_file_security() {
    log "Configuring file permissions and ownership..."
    
    # Create trading user if it doesn't exist
    if ! id "${TRADING_USER}" &>/dev/null; then
        useradd -r -s /bin/bash -d "${TRADING_AGENT_DIR}" "${TRADING_USER}"
        success "Trading user created"
    fi
    
    # Set ownership and permissions for trading agent directory
    chown -R "${TRADING_USER}:${TRADING_USER}" "${TRADING_AGENT_DIR}"
    
    # Secure configuration files
    find "${TRADING_AGENT_DIR}" -name "*.env*" -exec chmod 600 {} \;
    find "${TRADING_AGENT_DIR}" -name "*.key" -exec chmod 600 {} \;
    find "${TRADING_AGENT_DIR}" -name "*.pem" -exec chmod 600 {} \;
    
    # Secure SSH keys
    if [[ -d "${TRADING_AGENT_DIR}/keys" ]]; then
        chmod 700 "${TRADING_AGENT_DIR}/keys"
        find "${TRADING_AGENT_DIR}/keys" -type f -exec chmod 600 {} \;
    fi
    
    # Secure log directories
    if [[ -d "/var/log/trading-agent" ]]; then
        chown -R "${TRADING_USER}:${TRADING_USER}" "/var/log/trading-agent"
        chmod 750 "/var/log/trading-agent"
    fi
    
    # Secure sensitive system files
    chmod 600 /etc/ssh/sshd_config
    chmod 644 /etc/passwd
    chmod 640 /etc/shadow
    chown root:shadow /etc/shadow
    
    success "File permissions and ownership configured"
}

# Install and configure security tools
install_security_tools() {
    log "Installing security tools..."
    
    apt-get install -y \
        rkhunter \
        chkrootkit \
        lynis \
        aide \
        logwatch \
        psad \
        clamav \
        clamav-daemon \
        unattended-upgrades \
        apt-listchanges
    
    # Configure automatic security updates
    cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::SyslogEnable "true";
EOF
    
    # Enable automatic updates
    echo 'APT::Periodic::Update-Package-Lists "1";' > /etc/apt/apt.conf.d/20auto-upgrades
    echo 'APT::Periodic::Unattended-Upgrade "1";' >> /etc/apt/apt.conf.d/20auto-upgrades
    
    # Initialize AIDE database
    aideinit
    mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
    
    # Update ClamAV database
    freshclam
    
    success "Security tools installed and configured"
}

# Configure audit logging
configure_audit_logging() {
    log "Configuring audit logging..."
    
    apt-get install -y auditd audispd-plugins
    
    # Audit rules for trading agent
    cat > /etc/audit/rules.d/trading-agent.rules << EOF
# Trading Agent Audit Rules

# Monitor trading agent directory
-w ${TRADING_AGENT_DIR} -p wa -k trading_agent_access

# Monitor configuration files
-w ${TRADING_AGENT_DIR}/.env -p wa -k config_changes
-w ${TRADING_AGENT_DIR}/keys/ -p wa -k key_access

# Monitor log files
-w /var/log/trading-agent/ -p wa -k log_access

# Monitor system configuration
-w /etc/ssh/sshd_config -p wa -k ssh_config
-w /etc/passwd -p wa -k user_changes
-w /etc/group -p wa -k group_changes
-w /etc/shadow -p wa -k password_changes

# Monitor network configuration
-w /etc/network/ -p wa -k network_config
-w /etc/hosts -p wa -k hosts_changes

# Monitor systemd services
-w /etc/systemd/system/ -p wa -k systemd_changes

# Monitor sudo usage
-w /var/log/sudo.log -p wa -k sudo_usage

# Monitor failed login attempts
-w /var/log/auth.log -p wa -k auth_failures
EOF
    
    # Restart auditd
    systemctl restart auditd
    systemctl enable auditd
    
    success "Audit logging configured"
}

# Configure log monitoring
configure_log_monitoring() {
    log "Configuring log monitoring..."
    
    # Create logwatch configuration for trading agent
    mkdir -p /etc/logwatch/conf/services
    cat > /etc/logwatch/conf/services/trading-agent.conf << 'EOF'
Title = "Trading Agent Logs"
LogFile = /var/log/trading-agent/*.log
*OnlyService = trading-agent
*RemoveHeaders
EOF
    
    # Create logwatch script for trading agent
    mkdir -p /etc/logwatch/scripts/services
    cat > /etc/logwatch/scripts/services/trading-agent << 'EOF'
#!/usr/bin/perl
# Trading Agent Log Analysis Script

use strict;
use warnings;

my %errors = ();
my %warnings = ();
my %trades = ();
my $total_lines = 0;

while (defined(my $line = <STDIN>)) {
    chomp $line;
    $total_lines++;
    
    if ($line =~ /ERROR/i) {
        $errors{$line}++;
    } elsif ($line =~ /WARNING/i) {
        $warnings{$line}++;
    } elsif ($line =~ /TRADE/i) {
        $trades{$line}++;
    }
}

print "Trading Agent Log Summary:\n";
print "Total log lines processed: $total_lines\n\n";

if (keys %errors) {
    print "ERRORS:\n";
    foreach my $error (sort keys %errors) {
        print "  [$errors{$error}x] $error\n";
    }
    print "\n";
}

if (keys %warnings) {
    print "WARNINGS:\n";
    foreach my $warning (sort keys %warnings) {
        print "  [$warnings{$warning}x] $warning\n";
    }
    print "\n";
}

if (keys %trades) {
    print "TRADING ACTIVITY:\n";
    foreach my $trade (sort keys %trades) {
        print "  [$trades{$trade}x] $trade\n";
    }
    print "\n";
}
EOF
    
    chmod +x /etc/logwatch/scripts/services/trading-agent
    
    success "Log monitoring configured"
}

# Configure intrusion detection
configure_intrusion_detection() {
    log "Configuring intrusion detection..."
    
    # Configure PSAD (Port Scan Attack Detector)
    cat > /etc/psad/psad.conf << 'EOF'
EMAIL_ADDRESSES             root@localhost;
HOSTNAME                    trading-agent;
ENABLE_AUTO_IDS             Y;
ENABLE_AUTO_IDS_EMAILS      Y;
AUTO_IDS_DANGER_LEVEL       3;
AUTO_BLOCK_TIMEOUT          3600;
ENABLE_PSADWATCHD           Y;
PSADWATCHD_CHECK_INTERVAL   15;
ENABLE_SYSLOG_FILE          Y;
SYSLOG_DAEMON               syslog;
EOF
    
    # Start and enable PSAD
    systemctl start psad
    systemctl enable psad
    
    success "Intrusion detection configured"
}

# Create security monitoring script
create_security_monitoring() {
    log "Creating security monitoring script..."
    
    mkdir -p "${TRADING_AGENT_DIR}/scripts"
    cat > "${TRADING_AGENT_DIR}/scripts/security-monitor.sh" << 'EOF'
#!/bin/bash
# Security Monitoring Script for Trading Agent

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔒 Trading Agent Security Status Report"
echo "Generated: $(date)"
echo "========================================"

# Check system updates
echo -e "\n📦 System Updates:"
UPDATES=$(apt list --upgradable 2>/dev/null | grep -c upgradable)
if [[ $UPDATES -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  $UPDATES package(s) available for update${NC}"
else
    echo -e "${GREEN}✅ System is up to date${NC}"
fi

# Check failed login attempts
echo -e "\n🔐 Authentication:"
FAILED_LOGINS=$(grep "Failed password" /var/log/auth.log | wc -l)
if [[ $FAILED_LOGINS -gt 10 ]]; then
    echo -e "${RED}❌ $FAILED_LOGINS failed login attempts detected${NC}"
elif [[ $FAILED_LOGINS -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  $FAILED_LOGINS failed login attempts${NC}"
else
    echo -e "${GREEN}✅ No failed login attempts${NC}"
fi

# Check firewall status
echo -e "\n🛡️  Firewall:"
if ufw status | grep -q "Status: active"; then
    echo -e "${GREEN}✅ UFW firewall is active${NC}"
else
    echo -e "${RED}❌ UFW firewall is inactive${NC}"
fi

# Check fail2ban status
echo -e "\n🚫 Fail2Ban:"
if systemctl is-active --quiet fail2ban; then
    BANNED_IPS=$(fail2ban-client status | grep "Jail list" | cut -d: -f2 | wc -w)
    echo -e "${GREEN}✅ Fail2Ban is active${NC}"
    echo "   Banned IPs: $BANNED_IPS"
else
    echo -e "${RED}❌ Fail2Ban is inactive${NC}"
fi

# Check SSL certificate
echo -e "\n🔒 SSL Certificate:"
SSL_CERT="/opt/trading-agent/ssl/certs/letsencrypt.crt"
if [[ ! -f "$SSL_CERT" ]]; then
    SSL_CERT="/opt/trading-agent/ssl/certs/selfsigned.crt"
fi

if [[ -f "$SSL_CERT" ]]; then
    EXPIRY_DATE=$(openssl x509 -in "$SSL_CERT" -noout -enddate | cut -d= -f2)
    EXPIRY_TIMESTAMP=$(date -d "$EXPIRY_DATE" +%s)
    CURRENT_TIMESTAMP=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))
    
    if [[ $DAYS_UNTIL_EXPIRY -lt 7 ]]; then
        echo -e "${RED}❌ SSL certificate expires in $DAYS_UNTIL_EXPIRY days${NC}"
    elif [[ $DAYS_UNTIL_EXPIRY -lt 30 ]]; then
        echo -e "${YELLOW}⚠️  SSL certificate expires in $DAYS_UNTIL_EXPIRY days${NC}"
    else
        echo -e "${GREEN}✅ SSL certificate valid for $DAYS_UNTIL_EXPIRY days${NC}"
    fi
else
    echo -e "${RED}❌ No SSL certificate found${NC}"
fi

# Check disk usage
echo -e "\n💾 Disk Usage:"
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [[ $DISK_USAGE -gt 90 ]]; then
    echo -e "${RED}❌ Disk usage: ${DISK_USAGE}%${NC}"
elif [[ $DISK_USAGE -gt 80 ]]; then
    echo -e "${YELLOW}⚠️  Disk usage: ${DISK_USAGE}%${NC}"
else
    echo -e "${GREEN}✅ Disk usage: ${DISK_USAGE}%${NC}"
fi

# Check memory usage
echo -e "\n🧠 Memory Usage:"
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [[ $MEMORY_USAGE -gt 90 ]]; then
    echo -e "${RED}❌ Memory usage: ${MEMORY_USAGE}%${NC}"
elif [[ $MEMORY_USAGE -gt 80 ]]; then
    echo -e "${YELLOW}⚠️  Memory usage: ${MEMORY_USAGE}%${NC}"
else
    echo -e "${GREEN}✅ Memory usage: ${MEMORY_USAGE}%${NC}"
fi

# Check running services
echo -e "\n🔧 Critical Services:"
SERVICES=("nginx" "postgresql" "ssh" "fail2ban" "ufw")
for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo -e "${GREEN}✅ $service is running${NC}"
    else
        echo -e "${RED}❌ $service is not running${NC}"
    fi
done

echo -e "\n========================================"
echo "Security monitoring completed."
EOF
    
    chmod +x "${TRADING_AGENT_DIR}/scripts/security-monitor.sh"
    
    # Create cron job for daily security monitoring
    cat > /etc/cron.daily/security-monitor << EOF
#!/bin/bash
${TRADING_AGENT_DIR}/scripts/security-monitor.sh | mail -s "Trading Agent Security Report" root
EOF
    
    chmod +x /etc/cron.daily/security-monitor
    
    success "Security monitoring script created"
}

# Configure backup security
configure_backup_security() {
    log "Configuring backup security..."
    
    # Create secure backup directory
    BACKUP_DIR="${TRADING_AGENT_DIR}/backups"
    mkdir -p "$BACKUP_DIR"
    chown "${TRADING_USER}:${TRADING_USER}" "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"
    
    # Create backup encryption script
    cat > "${TRADING_AGENT_DIR}/scripts/secure-backup.sh" << 'EOF'
#!/bin/bash
# Secure Backup Script with Encryption

BACKUP_DIR="/opt/trading-agent/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="trading_agent_backup_${DATE}.tar.gz"
ENCRYPTED_FILE="${BACKUP_FILE}.gpg"

# Create backup
tar -czf "${BACKUP_DIR}/${BACKUP_FILE}" \
    --exclude="*.log" \
    --exclude="node_modules" \
    --exclude="backups" \
    /opt/trading-agent/

# Encrypt backup
gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
    --s2k-digest-algo SHA512 --s2k-count 65536 --force-mdc \
    --output "${BACKUP_DIR}/${ENCRYPTED_FILE}" \
    "${BACKUP_DIR}/${BACKUP_FILE}"

# Remove unencrypted backup
rm "${BACKUP_DIR}/${BACKUP_FILE}"

# Keep only last 7 encrypted backups
find "${BACKUP_DIR}" -name "*.gpg" -type f -mtime +7 -delete

echo "Secure backup created: ${ENCRYPTED_FILE}"
EOF
    
    chmod +x "${TRADING_AGENT_DIR}/scripts/secure-backup.sh"
    
    success "Backup security configured"
}

# Display security summary
display_security_summary() {
    log "Security Hardening Summary:"
    echo ""
    echo "🔒 Security Measures Implemented:"
    echo "   ✅ System packages updated"
    echo "   ✅ SSH security hardened"
    echo "   ✅ System security parameters configured"
    echo "   ✅ File permissions secured"
    echo "   ✅ Security tools installed"
    echo "   ✅ Audit logging configured"
    echo "   ✅ Log monitoring setup"
    echo "   ✅ Intrusion detection enabled"
    echo "   ✅ Security monitoring script created"
    echo "   ✅ Backup security configured"
    echo ""
    echo "🛡️  Active Security Services:"
    systemctl is-active auditd && echo "   ✅ Audit daemon" || echo "   ❌ Audit daemon"
    systemctl is-active fail2ban && echo "   ✅ Fail2Ban" || echo "   ❌ Fail2Ban"
    systemctl is-active psad && echo "   ✅ PSAD" || echo "   ❌ PSAD"
    systemctl is-active clamav-daemon && echo "   ✅ ClamAV" || echo "   ❌ ClamAV"
    echo ""
    echo "📋 Security Recommendations:"
    echo "   1. Regularly run security monitoring: ${TRADING_AGENT_DIR}/scripts/security-monitor.sh"
    echo "   2. Review audit logs: ausearch -ts today"
    echo "   3. Check for rootkits: rkhunter --check"
    echo "   4. Run system scan: lynis audit system"
    echo "   5. Update virus definitions: freshclam"
    echo "   6. Create secure backups: ${TRADING_AGENT_DIR}/scripts/secure-backup.sh"
    echo ""
}

# Main execution
main() {
    log "Starting Security Hardening for Intel NUC Production Deployment..."
    
    check_root
    update_system
    configure_ssh_security
    configure_system_security
    configure_file_security
    install_security_tools
    configure_audit_logging
    configure_log_monitoring
    configure_intrusion_detection
    create_security_monitoring
    configure_backup_security
    
    display_security_summary
    success "Security hardening completed successfully!"
    
    warning "IMPORTANT: Reboot the system to ensure all security settings take effect"
    warning "After reboot, test SSH access before closing this session"
}

# Run main function
main "$@"