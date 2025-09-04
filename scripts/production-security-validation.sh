#!/bin/bash

# =============================================================================
# PRODUCTION SECURITY VALIDATION AND COMPLIANCE TESTING SCRIPT
# =============================================================================
# Task: 20.4 Security and Compliance Validation
# Requirements: 3.3, 5.4 - Security audit, compliance validation
# 
# This script performs comprehensive security validation and compliance testing
# for the AI Crypto Trading Agent production deployment on Intel NUC.
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TRADING_AGENT_DIR="/opt/trading-agent"
VALIDATION_LOG="/var/log/trading-agent/security-validation.log"
COMPLIANCE_REPORT="/opt/trading-agent/compliance-report.json"
PENETRATION_TEST_REPORT="/opt/trading-agent/penetration-test-report.json"
SECURITY_AUDIT_REPORT="/opt/trading-agent/security-audit-report.json"

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$VALIDATION_LOG"
}

success() {
    echo -e "${GREEN}[✅ PASS]${NC} $1" | tee -a "$VALIDATION_LOG"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

failure() {
    echo -e "${RED}[❌ FAIL]${NC} $1" | tee -a "$VALIDATION_LOG"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

warning() {
    echo -e "${YELLOW}[⚠️  WARN]${NC} $1" | tee -a "$VALIDATION_LOG"
    ((WARNING_TESTS++))
    ((TOTAL_TESTS++))
}

info() {
    echo -e "${CYAN}[ℹ️  INFO]${NC} $1" | tee -a "$VALIDATION_LOG"
}

# Initialize validation environment
init_validation() {
    log "🔒 Initializing Production Security Validation..."
    
    # Create log directory
    mkdir -p "$(dirname "$VALIDATION_LOG")"
    mkdir -p "$(dirname "$COMPLIANCE_REPORT")"
    
    # Initialize reports
    cat > "$COMPLIANCE_REPORT" << 'EOF'
{
  "validation_timestamp": "",
  "validation_version": "1.0.0",
  "system_info": {},
  "security_tests": [],
  "compliance_checks": [],
  "penetration_tests": [],
  "audit_findings": [],
  "overall_score": 0,
  "compliance_status": "UNKNOWN",
  "recommendations": []
}
EOF
    
    cat > "$PENETRATION_TEST_REPORT" << 'EOF'
{
  "test_timestamp": "",
  "test_version": "1.0.0",
  "target_system": "",
  "test_results": [],
  "vulnerabilities": [],
  "risk_assessment": {},
  "remediation_plan": []
}
EOF
    
    success "Validation environment initialized"
}

# Update compliance report
update_compliance_report() {
    local test_category="$1"
    local test_name="$2"
    local status="$3"
    local severity="${4:-MEDIUM}"
    local details="${5:-No details provided}"
    
    python3 -c "
import json
import sys
from datetime import datetime

try:
    with open('$COMPLIANCE_REPORT', 'r') as f:
        report = json.load(f)
    
    report['validation_timestamp'] = datetime.now().isoformat()
    
    test_result = {
        'category': '$test_category',
        'test_name': '$test_name',
        'status': '$status',
        'severity': '$severity',
        'details': '$details',
        'timestamp': datetime.now().isoformat()
    }
    
    if '$test_category' == 'SECURITY':
        report['security_tests'].append(test_result)
    elif '$test_category' == 'COMPLIANCE':
        report['compliance_checks'].append(test_result)
    elif '$test_category' == 'PENETRATION':
        report['penetration_tests'].append(test_result)
    else:
        report['audit_findings'].append(test_result)
    
    with open('$COMPLIANCE_REPORT', 'w') as f:
        json.dump(report, f, indent=2)
        
except Exception as e:
    print(f'Error updating compliance report: {e}', file=sys.stderr)
" 2>/dev/null || true
}

# Test 1: System Security Configuration
test_system_security() {
    log "🔧 Testing System Security Configuration..."
    
    # Test SSH configuration
    if [[ -f "/etc/ssh/sshd_config" ]]; then
        # Check root login disabled
        if grep -q "^PermitRootLogin no" /etc/ssh/sshd_config; then
            success "SSH root login is disabled"
            update_compliance_report "SECURITY" "SSH_ROOT_LOGIN" "PASS" "HIGH" "Root login disabled"
        else
            failure "SSH root login is not properly disabled"
            update_compliance_report "SECURITY" "SSH_ROOT_LOGIN" "FAIL" "CRITICAL" "Root login enabled"
        fi
        
        # Check password authentication disabled
        if grep -q "^PasswordAuthentication no" /etc/ssh/sshd_config; then
            success "SSH password authentication is disabled"
            update_compliance_report "SECURITY" "SSH_PASSWORD_AUTH" "PASS" "HIGH" "Password auth disabled"
        else
            failure "SSH password authentication is not disabled"
            update_compliance_report "SECURITY" "SSH_PASSWORD_AUTH" "FAIL" "HIGH" "Password auth enabled"
        fi
        
        # Check SSH protocol version
        if ! grep -q "^Protocol 1" /etc/ssh/sshd_config; then
            success "SSH Protocol 2 is enforced"
            update_compliance_report "SECURITY" "SSH_PROTOCOL" "PASS" "MEDIUM" "Protocol 2 enforced"
        else
            failure "SSH Protocol 1 is enabled (security risk)"
            update_compliance_report "SECURITY" "SSH_PROTOCOL" "FAIL" "CRITICAL" "Protocol 1 enabled"
        fi
    else
        failure "SSH configuration file not found"
        update_compliance_report "SECURITY" "SSH_CONFIG" "FAIL" "HIGH" "SSH config missing"
    fi
    
    # Test firewall configuration
    if command -v ufw &> /dev/null; then
        if ufw status | grep -q "Status: active"; then
            success "UFW firewall is active"
            update_compliance_report "SECURITY" "FIREWALL_STATUS" "PASS" "HIGH" "UFW active"
            
            # Check default policies
            if ufw status verbose | grep -q "Default: deny (incoming)"; then
                success "Default incoming policy is deny"
                update_compliance_report "SECURITY" "FIREWALL_DEFAULT_IN" "PASS" "HIGH" "Default deny incoming"
            else
                failure "Default incoming policy is not deny"
                update_compliance_report "SECURITY" "FIREWALL_DEFAULT_IN" "FAIL" "HIGH" "Default allow incoming"
            fi
        else
            failure "UFW firewall is not active"
            update_compliance_report "SECURITY" "FIREWALL_STATUS" "FAIL" "CRITICAL" "UFW inactive"
        fi
    else
        failure "UFW firewall is not installed"
        update_compliance_report "SECURITY" "FIREWALL_INSTALL" "FAIL" "CRITICAL" "UFW not installed"
    fi
    
    # Test fail2ban
    if command -v fail2ban-client &> /dev/null; then
        if systemctl is-active --quiet fail2ban; then
            success "Fail2ban is active"
            update_compliance_report "SECURITY" "FAIL2BAN_STATUS" "PASS" "MEDIUM" "Fail2ban active"
        else
            warning "Fail2ban is installed but not active"
            update_compliance_report "SECURITY" "FAIL2BAN_STATUS" "WARN" "MEDIUM" "Fail2ban inactive"
        fi
    else
        warning "Fail2ban is not installed"
        update_compliance_report "SECURITY" "FAIL2BAN_INSTALL" "WARN" "MEDIUM" "Fail2ban not installed"
    fi
}

# Test 2: File System Security
test_filesystem_security() {
    log "📁 Testing File System Security..."
    
    # Test critical file permissions
    local critical_files=(
        "/etc/passwd:644"
        "/etc/shadow:640"
        "/etc/group:644"
        "/etc/ssh/sshd_config:600"
    )
    
    for file_perm in "${critical_files[@]}"; do
        local file="${file_perm%:*}"
        local expected_perm="${file_perm#*:}"
        
        if [[ -f "$file" ]]; then
            local actual_perm=$(stat -c "%a" "$file")
            if [[ "$actual_perm" == "$expected_perm" ]]; then
                success "File $file has correct permissions ($actual_perm)"
                update_compliance_report "SECURITY" "FILE_PERMISSIONS_$(basename $file)" "PASS" "MEDIUM" "Correct permissions"
            else
                failure "File $file has incorrect permissions: $actual_perm (expected $expected_perm)"
                update_compliance_report "SECURITY" "FILE_PERMISSIONS_$(basename $file)" "FAIL" "HIGH" "Incorrect permissions"
            fi
        else
            warning "File $file not found"
            update_compliance_report "SECURITY" "FILE_EXISTS_$(basename $file)" "WARN" "LOW" "File not found"
        fi
    done
    
    # Test trading agent directory security
    if [[ -d "$TRADING_AGENT_DIR" ]]; then
        local owner=$(stat -c "%U:%G" "$TRADING_AGENT_DIR")
        if [[ "$owner" == "trading:trading" ]]; then
            success "Trading agent directory has correct ownership"
            update_compliance_report "SECURITY" "TRADING_DIR_OWNERSHIP" "PASS" "HIGH" "Correct ownership"
        else
            failure "Trading agent directory ownership: $owner (expected trading:trading)"
            update_compliance_report "SECURITY" "TRADING_DIR_OWNERSHIP" "FAIL" "HIGH" "Incorrect ownership"
        fi
        
        # Test environment file security
        local env_file="$TRADING_AGENT_DIR/.env"
        if [[ -f "$env_file" ]]; then
            local env_perms=$(stat -c "%a" "$env_file")
            if [[ "$env_perms" == "600" ]]; then
                success "Environment file has secure permissions"
                update_compliance_report "SECURITY" "ENV_FILE_PERMISSIONS" "PASS" "CRITICAL" "Secure permissions"
            else
                failure "Environment file permissions: $env_perms (expected 600)"
                update_compliance_report "SECURITY" "ENV_FILE_PERMISSIONS" "FAIL" "CRITICAL" "Insecure permissions"
            fi
        fi
        
        # Test SSH keys security
        local keys_dir="$TRADING_AGENT_DIR/keys"
        if [[ -d "$keys_dir" ]]; then
            local key_perms=$(stat -c "%a" "$keys_dir")
            if [[ "$key_perms" == "700" ]]; then
                success "SSH keys directory has secure permissions"
                update_compliance_report "SECURITY" "SSH_KEYS_PERMISSIONS" "PASS" "CRITICAL" "Secure permissions"
            else
                failure "SSH keys directory permissions: $key_perms (expected 700)"
                update_compliance_report "SECURITY" "SSH_KEYS_PERMISSIONS" "FAIL" "CRITICAL" "Insecure permissions"
            fi
        fi
    else
        failure "Trading agent directory not found"
        update_compliance_report "SECURITY" "TRADING_DIR_EXISTS" "FAIL" "CRITICAL" "Directory missing"
    fi
}

# Test 3: Network Security
test_network_security() {
    log "🌐 Testing Network Security..."
    
    # Test for unnecessary open ports
    local suspicious_ports=("23" "513" "514" "515" "69" "135" "139" "445")
    
    for port in "${suspicious_ports[@]}"; do
        if netstat -tln 2>/dev/null | grep ":$port " || ss -tln 2>/dev/null | grep ":$port "; then
            failure "Suspicious port $port is open"
            update_compliance_report "SECURITY" "SUSPICIOUS_PORT_$port" "FAIL" "HIGH" "Port $port open"
        else
            success "Suspicious port $port is closed"
            update_compliance_report "SECURITY" "SUSPICIOUS_PORT_$port" "PASS" "MEDIUM" "Port $port closed"
        fi
    done
    
    # Test required ports are properly configured
    local required_ports=("22" "3000" "5432")
    
    for port in "${required_ports[@]}"; do
        if netstat -tln 2>/dev/null | grep ":$port " || ss -tln 2>/dev/null | grep ":$port "; then
            success "Required port $port is open"
            update_compliance_report "SECURITY" "REQUIRED_PORT_$port" "PASS" "LOW" "Port $port open"
        else
            warning "Required port $port is not open"
            update_compliance_report "SECURITY" "REQUIRED_PORT_$port" "WARN" "MEDIUM" "Port $port closed"
        fi
    done
    
    # Test kernel network security parameters
    local network_params=(
        "net.ipv4.ip_forward:0"
        "net.ipv4.conf.all.send_redirects:0"
        "net.ipv4.conf.all.accept_redirects:0"
        "net.ipv4.tcp_syncookies:1"
    )
    
    for param in "${network_params[@]}"; do
        local setting="${param%:*}"
        local expected="${param#*:}"
        local current=$(sysctl -n "$setting" 2>/dev/null || echo "unknown")
        
        if [[ "$current" == "$expected" ]]; then
            success "Network parameter $setting = $expected"
            update_compliance_report "SECURITY" "NETWORK_PARAM_$(echo $setting | tr '.' '_')" "PASS" "MEDIUM" "Correct value"
        else
            failure "Network parameter $setting = $current (expected $expected)"
            update_compliance_report "SECURITY" "NETWORK_PARAM_$(echo $setting | tr '.' '_')" "FAIL" "HIGH" "Incorrect value"
        fi
    done
}

# Test 4: Application Security
test_application_security() {
    log "🔒 Testing Application Security..."
    
    # Test Node.js version
    if command -v node &> /dev/null; then
        local node_version=$(node --version | sed 's/v//')
        local major_version=$(echo "$node_version" | cut -d. -f1)
        
        if [[ "$major_version" -ge 18 ]]; then
            success "Node.js version $node_version is supported and secure"
            update_compliance_report "SECURITY" "NODE_VERSION" "PASS" "MEDIUM" "Current version"
        else
            failure "Node.js version $node_version is outdated and potentially vulnerable"
            update_compliance_report "SECURITY" "NODE_VERSION" "FAIL" "HIGH" "Outdated version"
        fi
    else
        failure "Node.js is not installed"
        update_compliance_report "SECURITY" "NODE_INSTALL" "FAIL" "CRITICAL" "Node.js missing"
    fi
    
    # Test npm vulnerabilities
    if [[ -f "$TRADING_AGENT_DIR/package.json" ]]; then
        cd "$TRADING_AGENT_DIR"
        
        info "Running npm security audit..."
        if npm audit --audit-level=moderate --json > /tmp/npm-audit.json 2>/dev/null; then
            local vulnerabilities=$(jq '.metadata.vulnerabilities.total' /tmp/npm-audit.json 2>/dev/null || echo "0")
            if [[ "$vulnerabilities" -eq 0 ]]; then
                success "No npm vulnerabilities found"
                update_compliance_report "SECURITY" "NPM_VULNERABILITIES" "PASS" "HIGH" "No vulnerabilities"
            else
                failure "$vulnerabilities npm vulnerabilities found"
                update_compliance_report "SECURITY" "NPM_VULNERABILITIES" "FAIL" "HIGH" "$vulnerabilities vulnerabilities"
            fi
        else
            warning "Could not run npm audit"
            update_compliance_report "SECURITY" "NPM_AUDIT" "WARN" "MEDIUM" "Audit failed"
        fi
        
        rm -f /tmp/npm-audit.json
    fi
    
    # Test SSL/TLS configuration
    local ssl_cert_dir="$TRADING_AGENT_DIR/ssl/certs"
    if [[ -d "$ssl_cert_dir" ]]; then
        success "SSL certificate directory exists"
        update_compliance_report "SECURITY" "SSL_CERT_DIR" "PASS" "MEDIUM" "Directory exists"
        
        # Check for SSL certificates
        if ls "$ssl_cert_dir"/*.crt &>/dev/null; then
            success "SSL certificates found"
            update_compliance_report "SECURITY" "SSL_CERTIFICATES" "PASS" "HIGH" "Certificates present"
            
            # Check certificate expiry
            for cert in "$ssl_cert_dir"/*.crt; do
                if [[ -f "$cert" ]]; then
                    local expiry_date=$(openssl x509 -in "$cert" -noout -enddate 2>/dev/null | cut -d= -f2)
                    if [[ -n "$expiry_date" ]]; then
                        local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
                        local current_timestamp=$(date +%s)
                        local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                        
                        if [[ $days_until_expiry -gt 30 ]]; then
                            success "SSL certificate $(basename "$cert") valid for $days_until_expiry days"
                            update_compliance_report "SECURITY" "SSL_CERT_EXPIRY_$(basename "$cert")" "PASS" "MEDIUM" "Valid certificate"
                        elif [[ $days_until_expiry -gt 7 ]]; then
                            warning "SSL certificate $(basename "$cert") expires in $days_until_expiry days"
                            update_compliance_report "SECURITY" "SSL_CERT_EXPIRY_$(basename "$cert")" "WARN" "HIGH" "Expires soon"
                        else
                            failure "SSL certificate $(basename "$cert") expires in $days_until_expiry days"
                            update_compliance_report "SECURITY" "SSL_CERT_EXPIRY_$(basename "$cert")" "FAIL" "CRITICAL" "Certificate expired/expiring"
                        fi
                    fi
                fi
            done
        else
            warning "No SSL certificates found"
            update_compliance_report "SECURITY" "SSL_CERTIFICATES" "WARN" "HIGH" "No certificates"
        fi
    else
        warning "SSL certificate directory not found"
        update_compliance_report "SECURITY" "SSL_CERT_DIR" "WARN" "MEDIUM" "Directory missing"
    fi
}

# Test 5: Database Security
test_database_security() {
    log "🗄️  Testing Database Security..."
    
    # Test PostgreSQL configuration
    if systemctl is-active --quiet postgresql; then
        success "PostgreSQL service is running"
        update_compliance_report "SECURITY" "POSTGRESQL_STATUS" "PASS" "HIGH" "Service active"
        
        # Test database connection security
        local pg_hba_conf="/etc/postgresql/*/main/pg_hba.conf"
        if ls $pg_hba_conf &>/dev/null; then
            # Check for md5 or scram-sha-256 authentication
            if grep -q "md5\|scram-sha-256" $pg_hba_conf; then
                success "PostgreSQL uses secure authentication methods"
                update_compliance_report "SECURITY" "POSTGRESQL_AUTH" "PASS" "HIGH" "Secure authentication"
            else
                warning "PostgreSQL authentication method may not be secure"
                update_compliance_report "SECURITY" "POSTGRESQL_AUTH" "WARN" "HIGH" "Insecure authentication"
            fi
            
            # Check for trust authentication (insecure)
            if grep -q "trust" $pg_hba_conf; then
                failure "PostgreSQL uses trust authentication (insecure)"
                update_compliance_report "SECURITY" "POSTGRESQL_TRUST" "FAIL" "CRITICAL" "Trust authentication enabled"
            else
                success "PostgreSQL does not use trust authentication"
                update_compliance_report "SECURITY" "POSTGRESQL_TRUST" "PASS" "HIGH" "No trust authentication"
            fi
        else
            warning "PostgreSQL configuration file not found"
            update_compliance_report "SECURITY" "POSTGRESQL_CONFIG" "WARN" "MEDIUM" "Config file missing"
        fi
    else
        failure "PostgreSQL service is not running"
        update_compliance_report "SECURITY" "POSTGRESQL_STATUS" "FAIL" "CRITICAL" "Service inactive"
    fi
}

# Test 6: Logging and Monitoring Security
test_logging_security() {
    log "📋 Testing Logging and Monitoring Security..."
    
    # Test audit logging
    if command -v auditctl &> /dev/null; then
        if systemctl is-active --quiet auditd; then
            success "Audit daemon is running"
            update_compliance_report "SECURITY" "AUDITD_STATUS" "PASS" "MEDIUM" "Audit daemon active"
            
            # Check audit rules
            local audit_rules=$(auditctl -l | wc -l)
            if [[ $audit_rules -gt 0 ]]; then
                success "$audit_rules audit rules configured"
                update_compliance_report "SECURITY" "AUDIT_RULES" "PASS" "MEDIUM" "$audit_rules rules configured"
            else
                warning "No audit rules configured"
                update_compliance_report "SECURITY" "AUDIT_RULES" "WARN" "MEDIUM" "No audit rules"
            fi
        else
            warning "Audit daemon is not running"
            update_compliance_report "SECURITY" "AUDITD_STATUS" "WARN" "MEDIUM" "Audit daemon inactive"
        fi
    else
        warning "Audit tools not installed"
        update_compliance_report "SECURITY" "AUDITD_INSTALL" "WARN" "MEDIUM" "Audit tools missing"
    fi
    
    # Test log file permissions
    local log_files=("/var/log/auth.log" "/var/log/syslog" "/var/log/trading-agent")
    
    for log_path in "${log_files[@]}"; do
        if [[ -e "$log_path" ]]; then
            local log_perms=$(stat -c "%a" "$log_path")
            if [[ "$log_perms" =~ ^(640|644|750)$ ]]; then
                success "Log file/directory $log_path has secure permissions ($log_perms)"
                update_compliance_report "SECURITY" "LOG_PERMISSIONS_$(basename "$log_path")" "PASS" "MEDIUM" "Secure permissions"
            else
                warning "Log file/directory $log_path permissions: $log_perms"
                update_compliance_report "SECURITY" "LOG_PERMISSIONS_$(basename "$log_path")" "WARN" "MEDIUM" "Questionable permissions"
            fi
        else
            info "Log file/directory $log_path not found"
        fi
    done
}

# Test 7: Compliance with Trading Regulations
test_trading_compliance() {
    log "⚖️  Testing Trading Compliance..."
    
    # Test data retention policies
    if [[ -d "$TRADING_AGENT_DIR/logs" ]]; then
        success "Trading logs directory exists"
        update_compliance_report "COMPLIANCE" "LOG_RETENTION_DIR" "PASS" "HIGH" "Log directory exists"
        
        # Check for log rotation configuration
        if [[ -f "/etc/logrotate.d/trading-agent" ]]; then
            success "Log rotation configured for trading agent"
            update_compliance_report "COMPLIANCE" "LOG_ROTATION" "PASS" "HIGH" "Log rotation configured"
        else
            warning "Log rotation not configured for trading agent"
            update_compliance_report "COMPLIANCE" "LOG_ROTATION" "WARN" "MEDIUM" "No log rotation"
        fi
    else
        warning "Trading logs directory not found"
        update_compliance_report "COMPLIANCE" "LOG_RETENTION_DIR" "WARN" "HIGH" "Log directory missing"
    fi
    
    # Test audit trail for trading decisions
    if [[ -f "$TRADING_AGENT_DIR/.env" ]]; then
        if grep -q "LOG_LEVEL" "$TRADING_AGENT_DIR/.env"; then
            success "Logging configuration found in environment"
            update_compliance_report "COMPLIANCE" "AUDIT_TRAIL_CONFIG" "PASS" "HIGH" "Logging configured"
        else
            warning "Logging configuration not found in environment"
            update_compliance_report "COMPLIANCE" "AUDIT_TRAIL_CONFIG" "WARN" "HIGH" "No logging config"
        fi
    fi
    
    # Test backup and recovery procedures
    if [[ -d "$TRADING_AGENT_DIR/backups" ]]; then
        success "Backup directory exists"
        update_compliance_report "COMPLIANCE" "BACKUP_DIR" "PASS" "HIGH" "Backup directory exists"
        
        # Check for recent backups
        local recent_backups=$(find "$TRADING_AGENT_DIR/backups" -name "*.tar.gz" -o -name "*.gpg" -mtime -7 | wc -l)
        if [[ $recent_backups -gt 0 ]]; then
            success "$recent_backups recent backup(s) found"
            update_compliance_report "COMPLIANCE" "RECENT_BACKUPS" "PASS" "HIGH" "$recent_backups recent backups"
        else
            warning "No recent backups found"
            update_compliance_report "COMPLIANCE" "RECENT_BACKUPS" "WARN" "HIGH" "No recent backups"
        fi
    else
        warning "Backup directory not found"
        update_compliance_report "COMPLIANCE" "BACKUP_DIR" "WARN" "HIGH" "No backup directory"
    fi
    
    # Test position sizing validation
    if [[ -f "$TRADING_AGENT_DIR/src/security/position-sizing-validator.ts" ]]; then
        success "Position sizing validator exists"
        update_compliance_report "COMPLIANCE" "POSITION_SIZING_VALIDATOR" "PASS" "CRITICAL" "Validator exists"
    else
        failure "Position sizing validator not found"
        update_compliance_report "COMPLIANCE" "POSITION_SIZING_VALIDATOR" "FAIL" "CRITICAL" "Validator missing"
    fi
}

# Test 8: Penetration Testing
perform_penetration_testing() {
    log "🎯 Performing Basic Penetration Testing..."
    
    # Test SSH brute force protection
    info "Testing SSH brute force protection..."
    local ssh_attempts=0
    for i in {1..5}; do
        if timeout 5 ssh -o ConnectTimeout=2 -o BatchMode=yes invalid_user@localhost 2>/dev/null; then
            ((ssh_attempts++))
        fi
    done
    
    if [[ $ssh_attempts -eq 0 ]]; then
        success "SSH properly rejects invalid connection attempts"
        update_compliance_report "PENETRATION" "SSH_BRUTE_FORCE" "PASS" "HIGH" "SSH protected"
    else
        warning "SSH accepted $ssh_attempts invalid connection attempts"
        update_compliance_report "PENETRATION" "SSH_BRUTE_FORCE" "WARN" "HIGH" "SSH may be vulnerable"
    fi
    
    # Test web application security (if dashboard is running)
    if netstat -tln 2>/dev/null | grep ":3000 " || ss -tln 2>/dev/null | grep ":3000 "; then
        info "Testing web dashboard security..."
        
        # Test for common web vulnerabilities
        local dashboard_url="http://localhost:3000"
        
        # Test for directory traversal
        if curl -s -o /dev/null -w "%{http_code}" "$dashboard_url/../../../etc/passwd" | grep -q "200"; then
            failure "Dashboard vulnerable to directory traversal"
            update_compliance_report "PENETRATION" "DIRECTORY_TRAVERSAL" "FAIL" "CRITICAL" "Vulnerable to traversal"
        else
            success "Dashboard protected against directory traversal"
            update_compliance_report "PENETRATION" "DIRECTORY_TRAVERSAL" "PASS" "HIGH" "Protected against traversal"
        fi
        
        # Test for XSS protection
        local xss_payload="<script>alert('xss')</script>"
        if curl -s "$dashboard_url" | grep -q "$xss_payload"; then
            failure "Dashboard may be vulnerable to XSS"
            update_compliance_report "PENETRATION" "XSS_PROTECTION" "FAIL" "HIGH" "Potential XSS vulnerability"
        else
            success "Dashboard appears protected against XSS"
            update_compliance_report "PENETRATION" "XSS_PROTECTION" "PASS" "MEDIUM" "XSS protection present"
        fi
    else
        info "Dashboard not running, skipping web security tests"
    fi
    
    # Test network port scanning
    info "Testing network port exposure..."
    local open_ports=$(nmap -sT localhost 2>/dev/null | grep "open" | wc -l)
    if [[ $open_ports -le 5 ]]; then
        success "Minimal network ports exposed ($open_ports ports)"
        update_compliance_report "PENETRATION" "PORT_EXPOSURE" "PASS" "MEDIUM" "$open_ports ports exposed"
    else
        warning "Many network ports exposed ($open_ports ports)"
        update_compliance_report "PENETRATION" "PORT_EXPOSURE" "WARN" "MEDIUM" "$open_ports ports exposed"
    fi
}

# Test 9: Encryption and Data Protection
test_encryption_security() {
    log "🔐 Testing Encryption and Data Protection..."
    
    # Test SSL/TLS configuration
    if [[ -f "$TRADING_AGENT_DIR/ssl/certs/selfsigned.crt" ]] || [[ -f "$TRADING_AGENT_DIR/ssl/certs/letsencrypt.crt" ]]; then
        success "SSL certificates found"
        update_compliance_report "SECURITY" "SSL_CERTIFICATES_PRESENT" "PASS" "HIGH" "SSL certificates available"
        
        # Test SSL configuration strength
        for cert in "$TRADING_AGENT_DIR/ssl/certs"/*.crt; do
            if [[ -f "$cert" ]]; then
                local key_size=$(openssl x509 -in "$cert" -noout -text | grep "Public-Key:" | grep -o "[0-9]*" | head -1)
                if [[ $key_size -ge 2048 ]]; then
                    success "SSL certificate $(basename "$cert") uses strong key size ($key_size bits)"
                    update_compliance_report "SECURITY" "SSL_KEY_STRENGTH_$(basename "$cert")" "PASS" "HIGH" "Strong key size"
                else
                    failure "SSL certificate $(basename "$cert") uses weak key size ($key_size bits)"
                    update_compliance_report "SECURITY" "SSL_KEY_STRENGTH_$(basename "$cert")" "FAIL" "HIGH" "Weak key size"
                fi
            fi
        done
    else
        warning "No SSL certificates found"
        update_compliance_report "SECURITY" "SSL_CERTIFICATES_PRESENT" "WARN" "HIGH" "No SSL certificates"
    fi
    
    # Test environment variable encryption
    if [[ -f "$TRADING_AGENT_DIR/.env" ]]; then
        # Check for encrypted sensitive data
        if grep -q "ENCRYPTION_KEY\|JWT_SECRET" "$TRADING_AGENT_DIR/.env"; then
            success "Encryption configuration found in environment"
            update_compliance_report "SECURITY" "ENCRYPTION_CONFIG" "PASS" "HIGH" "Encryption configured"
        else
            warning "No encryption configuration found in environment"
            update_compliance_report "SECURITY" "ENCRYPTION_CONFIG" "WARN" "HIGH" "No encryption config"
        fi
        
        # Check for plaintext sensitive data
        if grep -i "password.*=.*[^*]" "$TRADING_AGENT_DIR/.env" | grep -v "ENCRYPTED\|HASHED"; then
            warning "Potential plaintext passwords found in environment file"
            update_compliance_report "SECURITY" "PLAINTEXT_PASSWORDS" "WARN" "CRITICAL" "Plaintext passwords detected"
        else
            success "No obvious plaintext passwords in environment file"
            update_compliance_report "SECURITY" "PLAINTEXT_PASSWORDS" "PASS" "HIGH" "No plaintext passwords"
        fi
    fi
}

# Test 10: Access Controls and Authentication
test_access_controls() {
    log "🔑 Testing Access Controls and Authentication..."
    
    # Test user account security
    local trading_user_info=$(getent passwd trading 2>/dev/null || echo "")
    if [[ -n "$trading_user_info" ]]; then
        success "Trading user account exists"
        update_compliance_report "SECURITY" "TRADING_USER_EXISTS" "PASS" "HIGH" "User account exists"
        
        # Check if trading user has shell access
        local user_shell=$(echo "$trading_user_info" | cut -d: -f7)
        if [[ "$user_shell" == "/bin/bash" ]] || [[ "$user_shell" == "/bin/sh" ]]; then
            warning "Trading user has shell access"
            update_compliance_report "SECURITY" "TRADING_USER_SHELL" "WARN" "MEDIUM" "Shell access enabled"
        else
            success "Trading user has restricted shell access"
            update_compliance_report "SECURITY" "TRADING_USER_SHELL" "PASS" "MEDIUM" "Restricted shell"
        fi
        
        # Check sudo privileges
        if sudo -l -U trading 2>/dev/null | grep -q "may run"; then
            warning "Trading user has sudo privileges"
            update_compliance_report "SECURITY" "TRADING_USER_SUDO" "WARN" "HIGH" "Sudo privileges granted"
        else
            success "Trading user has no sudo privileges"
            update_compliance_report "SECURITY" "TRADING_USER_SUDO" "PASS" "HIGH" "No sudo privileges"
        fi
    else
        failure "Trading user account not found"
        update_compliance_report "SECURITY" "TRADING_USER_EXISTS" "FAIL" "CRITICAL" "User account missing"
    fi
    
    # Test password policies
    if [[ -f "/etc/pam.d/common-password" ]]; then
        if grep -q "pam_pwquality" /etc/pam.d/common-password; then
            success "Password quality enforcement configured"
            update_compliance_report "SECURITY" "PASSWORD_POLICY" "PASS" "MEDIUM" "Password quality enforced"
        else
            warning "Password quality enforcement not configured"
            update_compliance_report "SECURITY" "PASSWORD_POLICY" "WARN" "MEDIUM" "No password quality"
        fi
    fi
}

# Generate final compliance score and recommendations
generate_compliance_score() {
    log "📊 Generating Compliance Score and Recommendations..."
    
    python3 -c "
import json
import sys
from datetime import datetime

try:
    with open('$COMPLIANCE_REPORT', 'r') as f:
        report = json.load(f)
    
    # Calculate compliance score
    total_tests = 0
    passed_tests = 0
    critical_failures = 0
    high_failures = 0
    
    all_tests = (report.get('security_tests', []) + 
                report.get('compliance_checks', []) + 
                report.get('penetration_tests', []) + 
                report.get('audit_findings', []))
    
    for test in all_tests:
        total_tests += 1
        if test.get('status') == 'PASS':
            passed_tests += 1
        elif test.get('status') == 'FAIL':
            if test.get('severity') == 'CRITICAL':
                critical_failures += 1
            elif test.get('severity') == 'HIGH':
                high_failures += 1
    
    # Calculate score (0-100)
    if total_tests > 0:
        base_score = (passed_tests / total_tests) * 100
        # Penalize critical and high failures
        penalty = (critical_failures * 20) + (high_failures * 10)
        final_score = max(0, base_score - penalty)
    else:
        final_score = 0
    
    # Determine compliance status
    if final_score >= 90 and critical_failures == 0:
        compliance_status = 'COMPLIANT'
    elif final_score >= 70 and critical_failures == 0:
        compliance_status = 'MOSTLY_COMPLIANT'
    elif final_score >= 50:
        compliance_status = 'PARTIALLY_COMPLIANT'
    else:
        compliance_status = 'NON_COMPLIANT'
    
    # Generate recommendations
    recommendations = []
    
    if critical_failures > 0:
        recommendations.append(f'URGENT: Address {critical_failures} critical security failure(s) immediately')
    
    if high_failures > 0:
        recommendations.append(f'Address {high_failures} high-severity security issue(s)')
    
    recommendations.extend([
        'Implement regular security monitoring and alerting',
        'Conduct monthly security audits and penetration testing',
        'Maintain up-to-date security patches and updates',
        'Implement comprehensive backup and disaster recovery procedures',
        'Establish incident response and forensic analysis capabilities',
        'Regular security awareness training for system administrators',
        'Implement network segmentation and access controls',
        'Regular review and update of security policies and procedures'
    ])
    
    # Update report
    report['overall_score'] = round(final_score, 2)
    report['compliance_status'] = compliance_status
    report['recommendations'] = recommendations
    report['validation_timestamp'] = datetime.now().isoformat()
    
    # Add summary statistics
    report['summary'] = {
        'total_tests': total_tests,
        'passed_tests': passed_tests,
        'failed_tests': total_tests - passed_tests,
        'critical_failures': critical_failures,
        'high_failures': high_failures
    }
    
    with open('$COMPLIANCE_REPORT', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f'Compliance Score: {final_score:.1f}/100')
    print(f'Compliance Status: {compliance_status}')
    print(f'Total Tests: {total_tests}')
    print(f'Passed: {passed_tests}')
    print(f'Failed: {total_tests - passed_tests}')
    print(f'Critical Failures: {critical_failures}')
    print(f'High Failures: {high_failures}')
    
except Exception as e:
    print(f'Error generating compliance score: {e}', file=sys.stderr)
    sys.exit(1)
" | tee -a "$VALIDATION_LOG"
}

# Display final validation summary
display_validation_summary() {
    log "📋 Security Validation Summary"
    echo ""
    echo "=== PRODUCTION SECURITY VALIDATION RESULTS ==="
    echo "Validation completed: $(date)"
    echo "Total tests executed: $TOTAL_TESTS"
    echo "Tests passed: $PASSED_TESTS"
    echo "Tests failed: $FAILED_TESTS"
    echo "Warnings: $WARNING_TESTS"
    echo ""
    
    # Display compliance score
    if [[ -f "$COMPLIANCE_REPORT" ]]; then
        python3 -c "
import json
try:
    with open('$COMPLIANCE_REPORT', 'r') as f:
        report = json.load(f)
    
    print(f'Overall Compliance Score: {report.get(\"overall_score\", 0)}/100')
    print(f'Compliance Status: {report.get(\"compliance_status\", \"UNKNOWN\")}')
    
    summary = report.get('summary', {})
    if summary:
        print(f'Critical Failures: {summary.get(\"critical_failures\", 0)}')
        print(f'High Severity Issues: {summary.get(\"high_failures\", 0)}')
    
except:
    print('Could not read compliance report')
"
    fi
    
    echo ""
    echo "📄 Reports generated:"
    echo "  - Security validation log: $VALIDATION_LOG"
    echo "  - Compliance report: $COMPLIANCE_REPORT"
    echo "  - Penetration test report: $PENETRATION_TEST_REPORT"
    echo ""
    
    if [[ $FAILED_TESTS -gt 0 ]]; then
        echo -e "${RED}⚠️  ATTENTION: $FAILED_TESTS security test(s) failed${NC}"
        echo "Review the reports and address all security issues before production deployment."
    elif [[ $WARNING_TESTS -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  NOTICE: $WARNING_TESTS security warning(s) detected${NC}"
        echo "Consider addressing warnings to improve security posture."
    else
        echo -e "${GREEN}✅ All security tests passed successfully${NC}"
        echo "System appears ready for production deployment."
    fi
    
    echo ""
}

# Main execution function
main() {
    log "🔒 Starting Production Security Validation and Compliance Testing..."
    
    # Initialize validation environment
    init_validation
    
    # Execute security tests
    test_system_security
    test_filesystem_security
    test_network_security
    test_application_security
    test_database_security
    test_logging_security
    test_trading_compliance
    perform_penetration_testing
    test_encryption_security
    test_access_controls
    
    # Generate compliance score and recommendations
    generate_compliance_score
    
    # Display summary
    display_validation_summary
    
    log "✅ Production Security Validation completed!"
    
    # Return appropriate exit code
    if [[ $FAILED_TESTS -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Execute main function
main "$@"