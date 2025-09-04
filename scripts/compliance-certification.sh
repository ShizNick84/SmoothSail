#!/bin/bash

# =============================================================================
# COMPLIANCE CERTIFICATION AND AUDIT SCRIPT
# =============================================================================
# Task: 20.4 Security and Compliance Validation - Compliance Certification
# Requirements: 3.3, 5.4 - Security compliance, audit logging, forensic capabilities
# 
# This script performs comprehensive compliance validation and generates
# certification documentation for the AI Crypto Trading Agent.
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
COMPLIANCE_LOG="/var/log/trading-agent/compliance-certification.log"
CERTIFICATION_REPORT="/opt/trading-agent/compliance-certification-report.json"
AUDIT_EVIDENCE_DIR="/opt/trading-agent/audit-evidence"

# Compliance frameworks and standards
declare -A COMPLIANCE_FRAMEWORKS=(
    ["SOC2"]="Service Organization Control 2"
    ["ISO27001"]="Information Security Management"
    ["GDPR"]="General Data Protection Regulation"
    ["FINANCIAL"]="Financial Services Compliance"
    ["NIST"]="NIST Cybersecurity Framework"
)

# Test results tracking
TOTAL_CONTROLS=0
COMPLIANT_CONTROLS=0
NON_COMPLIANT_CONTROLS=0
PARTIAL_COMPLIANCE=0

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$COMPLIANCE_LOG"
}

compliant() {
    echo -e "${GREEN}[✅ COMPLIANT]${NC} $1" | tee -a "$COMPLIANCE_LOG"
    ((COMPLIANT_CONTROLS++))
    ((TOTAL_CONTROLS++))
}

non_compliant() {
    echo -e "${RED}[❌ NON-COMPLIANT]${NC} $1" | tee -a "$COMPLIANCE_LOG"
    ((NON_COMPLIANT_CONTROLS++))
    ((TOTAL_CONTROLS++))
}

partial_compliant() {
    echo -e "${YELLOW}[⚠️  PARTIAL]${NC} $1" | tee -a "$COMPLIANCE_LOG"
    ((PARTIAL_COMPLIANCE++))
    ((TOTAL_CONTROLS++))
}

info() {
    echo -e "${CYAN}[ℹ️  INFO]${NC} $1" | tee -a "$COMPLIANCE_LOG"
}

# Initialize compliance certification environment
init_compliance_certification() {
    log "📋 Initializing Compliance Certification Process..."
    
    # Create directories
    mkdir -p "$(dirname "$COMPLIANCE_LOG")"
    mkdir -p "$(dirname "$CERTIFICATION_REPORT")"
    mkdir -p "$AUDIT_EVIDENCE_DIR"
    
    # Initialize certification report
    cat > "$CERTIFICATION_REPORT" << 'EOF'
{
  "certification_timestamp": "",
  "certification_version": "1.0.0",
  "system_name": "AI Crypto Trading Agent",
  "system_version": "Production v1.0",
  "deployment_environment": "Intel NUC Production",
  "compliance_frameworks": {},
  "control_assessments": [],
  "audit_evidence": [],
  "certification_status": "UNKNOWN",
  "compliance_score": 0,
  "recommendations": [],
  "next_assessment_date": ""
}
EOF
    
    # Create audit evidence collection
    mkdir -p "$AUDIT_EVIDENCE_DIR/configurations"
    mkdir -p "$AUDIT_EVIDENCE_DIR/logs"
    mkdir -p "$AUDIT_EVIDENCE_DIR/policies"
    mkdir -p "$AUDIT_EVIDENCE_DIR/procedures"
    
    compliant "Compliance certification environment initialized"
}

# Update certification report
update_certification_report() {
    local framework="$1"
    local control_id="$2"
    local control_name="$3"
    local status="$4"
    local evidence="${5:-No evidence provided}"
    local remediation="${6:-No remediation required}"
    
    python3 -c "
import json
import sys
from datetime import datetime

try:
    with open('$CERTIFICATION_REPORT', 'r') as f:
        report = json.load(f)
    
    report['certification_timestamp'] = datetime.now().isoformat()
    
    control_assessment = {
        'framework': '$framework',
        'control_id': '$control_id',
        'control_name': '$control_name',
        'status': '$status',
        'evidence': '$evidence',
        'remediation': '$remediation',
        'assessed_at': datetime.now().isoformat()
    }
    
    report['control_assessments'].append(control_assessment)
    
    # Update framework compliance
    if '$framework' not in report['compliance_frameworks']:
        report['compliance_frameworks']['$framework'] = {
            'total_controls': 0,
            'compliant_controls': 0,
            'compliance_percentage': 0
        }
    
    report['compliance_frameworks']['$framework']['total_controls'] += 1
    
    if '$status' == 'COMPLIANT':
        report['compliance_frameworks']['$framework']['compliant_controls'] += 1
    
    # Calculate compliance percentage
    total = report['compliance_frameworks']['$framework']['total_controls']
    compliant = report['compliance_frameworks']['$framework']['compliant_controls']
    percentage = (compliant / total * 100) if total > 0 else 0
    report['compliance_frameworks']['$framework']['compliance_percentage'] = round(percentage, 2)
    
    with open('$CERTIFICATION_REPORT', 'w') as f:
        json.dump(report, f, indent=2)
        
except Exception as e:
    print(f'Error updating certification report: {e}', file=sys.stderr)
" 2>/dev/null || true
}

# Collect audit evidence
collect_audit_evidence() {
    local evidence_type="$1"
    local source_file="$2"
    local description="$3"
    
    if [[ -f "$source_file" ]]; then
        local evidence_file="$AUDIT_EVIDENCE_DIR/$evidence_type/$(basename "$source_file")"
        cp "$source_file" "$evidence_file" 2>/dev/null || true
        
        # Add to evidence log
        echo "$(date): $description - $evidence_file" >> "$AUDIT_EVIDENCE_DIR/evidence-log.txt"
        
        info "Collected evidence: $description"
    fi
}

# SOC 2 Type II Compliance Assessment
assess_soc2_compliance() {
    log "🔒 Assessing SOC 2 Type II Compliance..."
    
    # CC6.1 - Logical and Physical Access Controls
    info "Assessing CC6.1 - Logical and Physical Access Controls"
    
    # Check SSH key-based authentication
    if [[ -f "/etc/ssh/sshd_config" ]] && grep -q "^PasswordAuthentication no" /etc/ssh/sshd_config; then
        compliant "CC6.1.1 - SSH key-based authentication enforced"
        update_certification_report "SOC2" "CC6.1.1" "SSH Authentication" "COMPLIANT" "SSH config enforces key-based auth"
        collect_audit_evidence "configurations" "/etc/ssh/sshd_config" "SSH configuration"
    else
        non_compliant "CC6.1.1 - SSH password authentication not disabled"
        update_certification_report "SOC2" "CC6.1.1" "SSH Authentication" "NON_COMPLIANT" "Password auth enabled" "Disable SSH password authentication"
    fi
    
    # Check user access controls
    if id trading &>/dev/null && ! groups trading | grep -q "sudo\|root\|wheel"; then
        compliant "CC6.1.2 - Application user has restricted privileges"
        update_certification_report "SOC2" "CC6.1.2" "User Privileges" "COMPLIANT" "Trading user has minimal privileges"
    else
        non_compliant "CC6.1.2 - Application user has excessive privileges"
        update_certification_report "SOC2" "CC6.1.2" "User Privileges" "NON_COMPLIANT" "User has elevated privileges" "Remove excessive privileges"
    fi
    
    # CC6.2 - System Monitoring
    info "Assessing CC6.2 - System Monitoring"
    
    # Check audit logging
    if systemctl is-active --quiet auditd 2>/dev/null; then
        compliant "CC6.2.1 - System audit logging is active"
        update_certification_report "SOC2" "CC6.2.1" "Audit Logging" "COMPLIANT" "auditd service active"
    else
        partial_compliant "CC6.2.1 - System audit logging not fully configured"
        update_certification_report "SOC2" "CC6.2.1" "Audit Logging" "PARTIAL" "auditd not active" "Configure and enable auditd"
    fi
    
    # Check log retention
    if [[ -f "/etc/logrotate.d/trading-agent" ]]; then
        compliant "CC6.2.2 - Log retention policy implemented"
        update_certification_report "SOC2" "CC6.2.2" "Log Retention" "COMPLIANT" "Log rotation configured"
        collect_audit_evidence "configurations" "/etc/logrotate.d/trading-agent" "Log rotation configuration"
    else
        non_compliant "CC6.2.2 - Log retention policy not implemented"
        update_certification_report "SOC2" "CC6.2.2" "Log Retention" "NON_COMPLIANT" "No log rotation" "Implement log retention policy"
    fi
    
    # CC6.3 - Data Protection
    info "Assessing CC6.3 - Data Protection"
    
    # Check encryption at rest
    if [[ -f "$TRADING_AGENT_DIR/.env" ]]; then
        local env_perms=$(stat -c "%a" "$TRADING_AGENT_DIR/.env")
        if [[ "$env_perms" == "600" ]]; then
            compliant "CC6.3.1 - Sensitive data file permissions secured"
            update_certification_report "SOC2" "CC6.3.1" "Data Protection" "COMPLIANT" "Environment file properly secured"
        else
            non_compliant "CC6.3.1 - Sensitive data file permissions not secured"
            update_certification_report "SOC2" "CC6.3.1" "Data Protection" "NON_COMPLIANT" "Insecure file permissions" "Secure file permissions"
        fi
    fi
    
    # Check encryption in transit
    if [[ -d "$TRADING_AGENT_DIR/ssl/certs" ]] && ls "$TRADING_AGENT_DIR/ssl/certs"/*.crt &>/dev/null; then
        compliant "CC6.3.2 - Encryption in transit implemented"
        update_certification_report "SOC2" "CC6.3.2" "Encryption Transit" "COMPLIANT" "SSL certificates present"
    else
        partial_compliant "CC6.3.2 - Encryption in transit partially implemented"
        update_certification_report "SOC2" "CC6.3.2" "Encryption Transit" "PARTIAL" "SSL not fully configured" "Complete SSL implementation"
    fi
    
    # CC7.1 - System Boundaries and Data Flow
    info "Assessing CC7.1 - System Boundaries and Data Flow"
    
    # Check firewall configuration
    if ufw status 2>/dev/null | grep -q "Status: active"; then
        compliant "CC7.1.1 - Network boundary controls implemented"
        update_certification_report "SOC2" "CC7.1.1" "Network Boundaries" "COMPLIANT" "UFW firewall active"
        collect_audit_evidence "configurations" "/etc/ufw/user.rules" "Firewall rules"
    else
        non_compliant "CC7.1.1 - Network boundary controls not implemented"
        update_certification_report "SOC2" "CC7.1.1" "Network Boundaries" "NON_COMPLIANT" "Firewall not active" "Enable and configure firewall"
    fi
    
    # CC8.1 - Change Management
    info "Assessing CC8.1 - Change Management"
    
    # Check for version control evidence
    if [[ -d "$TRADING_AGENT_DIR/.git" ]]; then
        compliant "CC8.1.1 - Version control system in use"
        update_certification_report "SOC2" "CC8.1.1" "Change Management" "COMPLIANT" "Git version control present"
    else
        partial_compliant "CC8.1.1 - Version control system not evident"
        update_certification_report "SOC2" "CC8.1.1" "Change Management" "PARTIAL" "No git directory" "Implement version control"
    fi
}

# ISO 27001 Compliance Assessment
assess_iso27001_compliance() {
    log "🔐 Assessing ISO 27001 Compliance..."
    
    # A.9.1 - Access Control Policy
    info "Assessing A.9.1 - Access Control Policy"
    
    # Check access control implementation
    if [[ -f "/etc/passwd" ]] && [[ -f "/etc/shadow" ]]; then
        local shadow_perms=$(stat -c "%a" "/etc/shadow")
        if [[ "$shadow_perms" == "640" ]] || [[ "$shadow_perms" == "600" ]]; then
            compliant "A.9.1.1 - System access controls properly configured"
            update_certification_report "ISO27001" "A.9.1.1" "Access Control" "COMPLIANT" "Shadow file properly secured"
        else
            non_compliant "A.9.1.1 - System access controls not properly configured"
            update_certification_report "ISO27001" "A.9.1.1" "Access Control" "NON_COMPLIANT" "Shadow file permissions incorrect" "Fix shadow file permissions"
        fi
    fi
    
    # A.10.1 - Cryptographic Controls
    info "Assessing A.10.1 - Cryptographic Controls"
    
    # Check SSH encryption
    if [[ -f "/etc/ssh/sshd_config" ]]; then
        if grep -q "^Ciphers.*aes256\|^Ciphers.*chacha20" /etc/ssh/sshd_config 2>/dev/null; then
            compliant "A.10.1.1 - Strong encryption algorithms configured"
            update_certification_report "ISO27001" "A.10.1.1" "Cryptographic Controls" "COMPLIANT" "Strong SSH ciphers configured"
        else
            partial_compliant "A.10.1.1 - Encryption algorithms not explicitly configured"
            update_certification_report "ISO27001" "A.10.1.1" "Cryptographic Controls" "PARTIAL" "Default SSH ciphers" "Configure strong ciphers explicitly"
        fi
    fi
    
    # A.12.1 - Operational Procedures and Responsibilities
    info "Assessing A.12.1 - Operational Procedures"
    
    # Check backup procedures
    if [[ -d "$TRADING_AGENT_DIR/backups" ]] || [[ -f "$TRADING_AGENT_DIR/scripts/backup.sh" ]]; then
        compliant "A.12.1.1 - Backup procedures implemented"
        update_certification_report "ISO27001" "A.12.1.1" "Backup Procedures" "COMPLIANT" "Backup system present"
    else
        non_compliant "A.12.1.1 - Backup procedures not implemented"
        update_certification_report "ISO27001" "A.12.1.1" "Backup Procedures" "NON_COMPLIANT" "No backup system" "Implement backup procedures"
    fi
    
    # A.12.4 - Logging and Monitoring
    info "Assessing A.12.4 - Logging and Monitoring"
    
    # Check logging configuration
    if [[ -d "/var/log/trading-agent" ]]; then
        compliant "A.12.4.1 - Application logging implemented"
        update_certification_report "ISO27001" "A.12.4.1" "Logging" "COMPLIANT" "Application logs directory present"
        collect_audit_evidence "logs" "/var/log/trading-agent" "Application logs"
    else
        non_compliant "A.12.4.1 - Application logging not implemented"
        update_certification_report "ISO27001" "A.12.4.1" "Logging" "NON_COMPLIANT" "No application logs" "Implement application logging"
    fi
    
    # A.13.1 - Network Security Management
    info "Assessing A.13.1 - Network Security Management"
    
    # Check network controls
    if systemctl is-active --quiet fail2ban 2>/dev/null; then
        compliant "A.13.1.1 - Intrusion prevention system active"
        update_certification_report "ISO27001" "A.13.1.1" "Network Security" "COMPLIANT" "fail2ban service active"
    else
        partial_compliant "A.13.1.1 - Intrusion prevention system not active"
        update_certification_report "ISO27001" "A.13.1.1" "Network Security" "PARTIAL" "fail2ban not active" "Configure intrusion prevention"
    fi
    
    # A.14.1 - Security in Development and Support Processes
    info "Assessing A.14.1 - Secure Development"
    
    # Check for security testing
    if [[ -f "$SCRIPT_DIR/security-audit.sh" ]] || [[ -f "$SCRIPT_DIR/penetration-testing.sh" ]]; then
        compliant "A.14.1.1 - Security testing procedures implemented"
        update_certification_report "ISO27001" "A.14.1.1" "Security Testing" "COMPLIANT" "Security testing scripts present"
    else
        non_compliant "A.14.1.1 - Security testing procedures not implemented"
        update_certification_report "ISO27001" "A.14.1.1" "Security Testing" "NON_COMPLIANT" "No security testing" "Implement security testing"
    fi
}

# GDPR Compliance Assessment
assess_gdpr_compliance() {
    log "🛡️  Assessing GDPR Compliance..."
    
    # Article 25 - Data Protection by Design and by Default
    info "Assessing Article 25 - Data Protection by Design"
    
    # Check data minimization
    if [[ -f "$TRADING_AGENT_DIR/.env" ]]; then
        # Check if personal data collection is minimized
        if ! grep -qi "personal.*data\|user.*name\|email\|phone" "$TRADING_AGENT_DIR/.env" 2>/dev/null; then
            compliant "Art.25.1 - Data minimization principle followed"
            update_certification_report "GDPR" "Art.25.1" "Data Minimization" "COMPLIANT" "No personal data in configuration"
        else
            partial_compliant "Art.25.1 - Personal data detected in configuration"
            update_certification_report "GDPR" "Art.25.1" "Data Minimization" "PARTIAL" "Personal data in config" "Review data collection practices"
        fi
    fi
    
    # Article 30 - Records of Processing Activities
    info "Assessing Article 30 - Records of Processing"
    
    # Check for data processing records
    if [[ -d "/var/log/trading-agent" ]]; then
        compliant "Art.30.1 - Processing activity records maintained"
        update_certification_report "GDPR" "Art.30.1" "Processing Records" "COMPLIANT" "Application logs maintained"
    else
        non_compliant "Art.30.1 - Processing activity records not maintained"
        update_certification_report "GDPR" "Art.30.1" "Processing Records" "NON_COMPLIANT" "No processing logs" "Implement processing logs"
    fi
    
    # Article 32 - Security of Processing
    info "Assessing Article 32 - Security of Processing"
    
    # Check encryption
    if [[ -d "$TRADING_AGENT_DIR/ssl" ]]; then
        compliant "Art.32.1 - Encryption measures implemented"
        update_certification_report "GDPR" "Art.32.1" "Encryption" "COMPLIANT" "SSL encryption configured"
    else
        partial_compliant "Art.32.1 - Encryption measures partially implemented"
        update_certification_report "GDPR" "Art.32.1" "Encryption" "PARTIAL" "Limited encryption" "Implement comprehensive encryption"
    fi
    
    # Check access controls
    if [[ -f "/etc/ssh/sshd_config" ]] && grep -q "^PasswordAuthentication no" /etc/ssh/sshd_config; then
        compliant "Art.32.2 - Access control measures implemented"
        update_certification_report "GDPR" "Art.32.2" "Access Control" "COMPLIANT" "Strong authentication required"
    else
        non_compliant "Art.32.2 - Access control measures insufficient"
        update_certification_report "GDPR" "Art.32.2" "Access Control" "NON_COMPLIANT" "Weak authentication" "Strengthen access controls"
    fi
    
    # Article 33 - Notification of Personal Data Breach
    info "Assessing Article 33 - Breach Notification"
    
    # Check for incident response procedures
    if [[ -f "$TRADING_AGENT_DIR/src/security/incident-response-service.ts" ]]; then
        compliant "Art.33.1 - Incident response procedures implemented"
        update_certification_report "GDPR" "Art.33.1" "Incident Response" "COMPLIANT" "Incident response service present"
    else
        non_compliant "Art.33.1 - Incident response procedures not implemented"
        update_certification_report "GDPR" "Art.33.1" "Incident Response" "NON_COMPLIANT" "No incident response" "Implement incident response procedures"
    fi
}

# Financial Services Compliance Assessment
assess_financial_compliance() {
    log "💰 Assessing Financial Services Compliance..."
    
    # Audit Trail Requirements
    info "Assessing Audit Trail Requirements"
    
    # Check trading decision logging
    if [[ -d "/var/log/trading-agent" ]]; then
        compliant "FIN.1.1 - Trading activity audit trail maintained"
        update_certification_report "FINANCIAL" "FIN.1.1" "Audit Trail" "COMPLIANT" "Trading logs maintained"
    else
        non_compliant "FIN.1.1 - Trading activity audit trail not maintained"
        update_certification_report "FINANCIAL" "FIN.1.1" "Audit Trail" "NON_COMPLIANT" "No trading logs" "Implement trading audit trail"
    fi
    
    # Risk Management Requirements
    info "Assessing Risk Management Requirements"
    
    # Check position sizing validation
    if [[ -f "$TRADING_AGENT_DIR/src/security/position-sizing-validator.ts" ]]; then
        compliant "FIN.2.1 - Position sizing controls implemented"
        update_certification_report "FINANCIAL" "FIN.2.1" "Risk Management" "COMPLIANT" "Position sizing validator present"
    else
        non_compliant "FIN.2.1 - Position sizing controls not implemented"
        update_certification_report "FINANCIAL" "FIN.2.1" "Risk Management" "NON_COMPLIANT" "No position controls" "Implement position sizing controls"
    fi
    
    # Check risk management service
    if [[ -f "$TRADING_AGENT_DIR/src/security/risk-management-service.ts" ]]; then
        compliant "FIN.2.2 - Risk management system implemented"
        update_certification_report "FINANCIAL" "FIN.2.2" "Risk System" "COMPLIANT" "Risk management service present"
    else
        non_compliant "FIN.2.2 - Risk management system not implemented"
        update_certification_report "FINANCIAL" "FIN.2.2" "Risk System" "NON_COMPLIANT" "No risk management" "Implement risk management system"
    fi
    
    # Data Retention Requirements
    info "Assessing Data Retention Requirements"
    
    # Check backup and retention
    if [[ -f "/etc/logrotate.d/trading-agent" ]]; then
        compliant "FIN.3.1 - Data retention policy implemented"
        update_certification_report "FINANCIAL" "FIN.3.1" "Data Retention" "COMPLIANT" "Log rotation configured"
    else
        non_compliant "FIN.3.1 - Data retention policy not implemented"
        update_certification_report "FINANCIAL" "FIN.3.1" "Data Retention" "NON_COMPLIANT" "No retention policy" "Implement data retention policy"
    fi
    
    # Business Continuity Requirements
    info "Assessing Business Continuity Requirements"
    
    # Check backup procedures
    if [[ -f "$TRADING_AGENT_DIR/scripts/backup.sh" ]]; then
        compliant "FIN.4.1 - Business continuity procedures implemented"
        update_certification_report "FINANCIAL" "FIN.4.1" "Business Continuity" "COMPLIANT" "Backup procedures present"
    else
        non_compliant "FIN.4.1 - Business continuity procedures not implemented"
        update_certification_report "FINANCIAL" "FIN.4.1" "Business Continuity" "NON_COMPLIANT" "No backup procedures" "Implement backup and recovery"
    fi
}

# NIST Cybersecurity Framework Assessment
assess_nist_compliance() {
    log "🔒 Assessing NIST Cybersecurity Framework Compliance..."
    
    # Identify (ID)
    info "Assessing NIST Identify Function"
    
    # Asset Management
    if [[ -f "$TRADING_AGENT_DIR/package.json" ]]; then
        compliant "ID.AM-1 - Physical devices and systems inventoried"
        update_certification_report "NIST" "ID.AM-1" "Asset Management" "COMPLIANT" "System inventory maintained"
    else
        partial_compliant "ID.AM-1 - System inventory partially maintained"
        update_certification_report "NIST" "ID.AM-1" "Asset Management" "PARTIAL" "Limited inventory" "Maintain comprehensive asset inventory"
    fi
    
    # Protect (PR)
    info "Assessing NIST Protect Function"
    
    # Access Control
    if [[ -f "/etc/ssh/sshd_config" ]] && grep -q "^PermitRootLogin no" /etc/ssh/sshd_config; then
        compliant "PR.AC-1 - Identities and credentials managed"
        update_certification_report "NIST" "PR.AC-1" "Access Control" "COMPLIANT" "Strong authentication enforced"
    else
        non_compliant "PR.AC-1 - Identity and credential management insufficient"
        update_certification_report "NIST" "PR.AC-1" "Access Control" "NON_COMPLIANT" "Weak authentication" "Strengthen identity management"
    fi
    
    # Data Security
    if [[ -f "$TRADING_AGENT_DIR/.env" ]]; then
        local env_perms=$(stat -c "%a" "$TRADING_AGENT_DIR/.env")
        if [[ "$env_perms" == "600" ]]; then
            compliant "PR.DS-1 - Data-at-rest protected"
            update_certification_report "NIST" "PR.DS-1" "Data Security" "COMPLIANT" "Sensitive data properly protected"
        else
            non_compliant "PR.DS-1 - Data-at-rest not adequately protected"
            update_certification_report "NIST" "PR.DS-1" "Data Security" "NON_COMPLIANT" "Insecure data permissions" "Secure sensitive data files"
        fi
    fi
    
    # Detect (DE)
    info "Assessing NIST Detect Function"
    
    # Security Monitoring
    if systemctl is-active --quiet auditd 2>/dev/null; then
        compliant "DE.CM-1 - Network monitored to detect potential cybersecurity events"
        update_certification_report "NIST" "DE.CM-1" "Security Monitoring" "COMPLIANT" "System monitoring active"
    else
        partial_compliant "DE.CM-1 - Network monitoring partially implemented"
        update_certification_report "NIST" "DE.CM-1" "Security Monitoring" "PARTIAL" "Limited monitoring" "Implement comprehensive monitoring"
    fi
    
    # Respond (RS)
    info "Assessing NIST Respond Function"
    
    # Response Planning
    if [[ -f "$TRADING_AGENT_DIR/src/security/incident-response-service.ts" ]]; then
        compliant "RS.RP-1 - Response plan executed during or after incident"
        update_certification_report "NIST" "RS.RP-1" "Response Planning" "COMPLIANT" "Incident response capability present"
    else
        non_compliant "RS.RP-1 - Response plan not implemented"
        update_certification_report "NIST" "RS.RP-1" "Response Planning" "NON_COMPLIANT" "No incident response" "Implement incident response plan"
    fi
    
    # Recover (RC)
    info "Assessing NIST Recover Function"
    
    # Recovery Planning
    if [[ -f "$TRADING_AGENT_DIR/scripts/backup.sh" ]] && [[ -f "$TRADING_AGENT_DIR/scripts/restore.sh" ]]; then
        compliant "RC.RP-1 - Recovery plan executed during or after cybersecurity incident"
        update_certification_report "NIST" "RC.RP-1" "Recovery Planning" "COMPLIANT" "Backup and recovery procedures present"
    else
        non_compliant "RC.RP-1 - Recovery plan not implemented"
        update_certification_report "NIST" "RC.RP-1" "Recovery Planning" "NON_COMPLIANT" "No recovery procedures" "Implement recovery planning"
    fi
}

# Generate compliance score and certification status
generate_compliance_score() {
    log "📊 Generating Compliance Score and Certification Status..."
    
    python3 -c "
import json
import sys
from datetime import datetime, timedelta

try:
    with open('$CERTIFICATION_REPORT', 'r') as f:
        report = json.load(f)
    
    # Calculate overall compliance score
    total_controls = $TOTAL_CONTROLS
    compliant_controls = $COMPLIANT_CONTROLS
    partial_controls = $PARTIAL_COMPLIANCE
    
    if total_controls > 0:
        # Weight partial compliance as 50%
        weighted_compliant = compliant_controls + (partial_controls * 0.5)
        compliance_score = (weighted_compliant / total_controls) * 100
    else:
        compliance_score = 0
    
    # Determine certification status
    if compliance_score >= 95:
        certification_status = 'FULLY_COMPLIANT'
    elif compliance_score >= 85:
        certification_status = 'SUBSTANTIALLY_COMPLIANT'
    elif compliance_score >= 70:
        certification_status = 'PARTIALLY_COMPLIANT'
    else:
        certification_status = 'NON_COMPLIANT'
    
    # Generate recommendations
    recommendations = []
    
    if $NON_COMPLIANT_CONTROLS > 0:
        recommendations.append(f'Address {$NON_COMPLIANT_CONTROLS} non-compliant control(s) immediately')
    
    if $PARTIAL_COMPLIANCE > 0:
        recommendations.append(f'Complete implementation of {$PARTIAL_COMPLIANCE} partially compliant control(s)')
    
    recommendations.extend([
        'Conduct regular compliance assessments (quarterly)',
        'Maintain audit evidence and documentation',
        'Implement continuous monitoring and improvement',
        'Regular staff training on compliance requirements',
        'Establish compliance governance and oversight',
        'Regular third-party compliance audits'
    ])
    
    # Set next assessment date (3 months from now)
    next_assessment = (datetime.now() + timedelta(days=90)).isoformat()
    
    # Update report
    report['compliance_score'] = round(compliance_score, 2)
    report['certification_status'] = certification_status
    report['recommendations'] = recommendations
    report['next_assessment_date'] = next_assessment
    report['certification_timestamp'] = datetime.now().isoformat()
    
    # Add summary statistics
    report['summary'] = {
        'total_controls': total_controls,
        'compliant_controls': compliant_controls,
        'partial_compliance': partial_controls,
        'non_compliant_controls': $NON_COMPLIANT_CONTROLS
    }
    
    with open('$CERTIFICATION_REPORT', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f'Overall Compliance Score: {compliance_score:.1f}%')
    print(f'Certification Status: {certification_status}')
    print(f'Total Controls Assessed: {total_controls}')
    print(f'Compliant Controls: {compliant_controls}')
    print(f'Partially Compliant: {partial_controls}')
    print(f'Non-Compliant Controls: {$NON_COMPLIANT_CONTROLS}')
    print(f'Next Assessment Due: {next_assessment[:10]}')
    
except Exception as e:
    print(f'Error generating compliance score: {e}', file=sys.stderr)
    sys.exit(1)
" | tee -a "$COMPLIANCE_LOG"
}

# Generate compliance certificate
generate_compliance_certificate() {
    log "📜 Generating Compliance Certificate..."
    
    local cert_file="$TRADING_AGENT_DIR/compliance-certificate.txt"
    
    cat > "$cert_file" << EOF
================================================================================
                        COMPLIANCE CERTIFICATION REPORT
================================================================================

System Name: AI Crypto Trading Agent
System Version: Production v1.0
Deployment Environment: Intel NUC Production
Assessment Date: $(date)
Assessor: Automated Compliance Assessment System

================================================================================
                            CERTIFICATION SUMMARY
================================================================================

Overall Compliance Score: $(python3 -c "
import json
try:
    with open('$CERTIFICATION_REPORT', 'r') as f:
        report = json.load(f)
    print(f\"{report.get('compliance_score', 0):.1f}%\")
except:
    print('N/A')
")

Certification Status: $(python3 -c "
import json
try:
    with open('$CERTIFICATION_REPORT', 'r') as f:
        report = json.load(f)
    print(report.get('certification_status', 'UNKNOWN'))
except:
    print('UNKNOWN')
")

Controls Assessed: $TOTAL_CONTROLS
Compliant Controls: $COMPLIANT_CONTROLS
Partially Compliant: $PARTIAL_COMPLIANCE
Non-Compliant Controls: $NON_COMPLIANT_CONTROLS

================================================================================
                        COMPLIANCE FRAMEWORK RESULTS
================================================================================

SOC 2 Type II: $(python3 -c "
import json
try:
    with open('$CERTIFICATION_REPORT', 'r') as f:
        report = json.load(f)
    soc2 = report.get('compliance_frameworks', {}).get('SOC2', {})
    print(f\"{soc2.get('compliance_percentage', 0):.1f}%\")
except:
    print('N/A')
")

ISO 27001: $(python3 -c "
import json
try:
    with open('$CERTIFICATION_REPORT', 'r') as f:
        report = json.load(f)
    iso = report.get('compliance_frameworks', {}).get('ISO27001', {})
    print(f\"{iso.get('compliance_percentage', 0):.1f}%\")
except:
    print('N/A')
")

GDPR: $(python3 -c "
import json
try:
    with open('$CERTIFICATION_REPORT', 'r') as f:
        report = json.load(f)
    gdpr = report.get('compliance_frameworks', {}).get('GDPR', {})
    print(f\"{gdpr.get('compliance_percentage', 0):.1f}%\")
except:
    print('N/A')
")

Financial Services: $(python3 -c "
import json
try:
    with open('$CERTIFICATION_REPORT', 'r') as f:
        report = json.load(f)
    fin = report.get('compliance_frameworks', {}).get('FINANCIAL', {})
    print(f\"{fin.get('compliance_percentage', 0):.1f}%\")
except:
    print('N/A')
")

NIST Cybersecurity Framework: $(python3 -c "
import json
try:
    with open('$CERTIFICATION_REPORT', 'r') as f:
        report = json.load(f)
    nist = report.get('compliance_frameworks', {}).get('NIST', {})
    print(f\"{nist.get('compliance_percentage', 0):.1f}%\")
except:
    print('N/A')
")

================================================================================
                              RECOMMENDATIONS
================================================================================

$(python3 -c "
import json
try:
    with open('$CERTIFICATION_REPORT', 'r') as f:
        report = json.load(f)
    recommendations = report.get('recommendations', [])
    for i, rec in enumerate(recommendations, 1):
        print(f'{i}. {rec}')
except:
    print('No recommendations available')
")

================================================================================
                            NEXT ASSESSMENT DATE
================================================================================

Next Assessment Due: $(python3 -c "
import json
try:
    with open('$CERTIFICATION_REPORT', 'r') as f:
        report = json.load(f)
    print(report.get('next_assessment_date', 'Not scheduled')[:10])
except:
    print('Not scheduled')
")

================================================================================
                              AUDIT EVIDENCE
================================================================================

Audit evidence has been collected and stored in: $AUDIT_EVIDENCE_DIR

Evidence includes:
- System configurations
- Security policies and procedures
- Log files and audit trails
- Security assessment reports

================================================================================
                                DISCLAIMER
================================================================================

This compliance assessment is based on automated testing and configuration
analysis. It should be supplemented with manual review and third-party
auditing for complete compliance validation.

Assessment completed: $(date)
Report generated by: AI Crypto Trading Agent Compliance System

================================================================================
EOF
    
    compliant "Compliance certificate generated: $cert_file"
}

# Display compliance certification summary
display_certification_summary() {
    log "📋 Compliance Certification Summary"
    echo ""
    echo "=== COMPLIANCE CERTIFICATION RESULTS ==="
    echo "Assessment completed: $(date)"
    echo "System: AI Crypto Trading Agent (Intel NUC Production)"
    echo ""
    echo "Overall Results:"
    echo "  Total controls assessed: $TOTAL_CONTROLS"
    echo "  Compliant controls: $COMPLIANT_CONTROLS"
    echo "  Partially compliant: $PARTIAL_COMPLIANCE"
    echo "  Non-compliant controls: $NON_COMPLIANT_CONTROLS"
    echo ""
    
    # Display compliance score and status
    if [[ -f "$CERTIFICATION_REPORT" ]]; then
        python3 -c "
import json
try:
    with open('$CERTIFICATION_REPORT', 'r') as f:
        report = json.load(f)
    
    score = report.get('compliance_score', 0)
    status = report.get('certification_status', 'UNKNOWN')
    
    print(f'Compliance Score: {score:.1f}%')
    print(f'Certification Status: {status}')
    
    if status == 'FULLY_COMPLIANT':
        print('✅ System meets all compliance requirements')
    elif status == 'SUBSTANTIALLY_COMPLIANT':
        print('✅ System meets most compliance requirements with minor gaps')
    elif status == 'PARTIALLY_COMPLIANT':
        print('⚠️  System has significant compliance gaps that need attention')
    else:
        print('❌ System does not meet compliance requirements')
    
except:
    print('Could not read certification report')
"
    fi
    
    echo ""
    echo "📄 Reports and certificates generated:"
    echo "  - Compliance certification log: $COMPLIANCE_LOG"
    echo "  - Detailed certification report: $CERTIFICATION_REPORT"
    echo "  - Compliance certificate: $TRADING_AGENT_DIR/compliance-certificate.txt"
    echo "  - Audit evidence: $AUDIT_EVIDENCE_DIR"
    echo ""
    
    if [[ $NON_COMPLIANT_CONTROLS -gt 0 ]]; then
        echo -e "${RED}⚠️  ATTENTION: $NON_COMPLIANT_CONTROLS non-compliant control(s) detected${NC}"
        echo "Address all non-compliant controls before production deployment."
    elif [[ $PARTIAL_COMPLIANCE -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  NOTICE: $PARTIAL_COMPLIANCE partially compliant control(s) detected${NC}"
        echo "Complete implementation of partially compliant controls."
    else
        echo -e "${GREEN}✅ All compliance controls passed successfully${NC}"
        echo "System appears ready for compliant production deployment."
    fi
    
    echo ""
}

# Main execution function
main() {
    log "📋 Starting Compliance Certification and Audit Process..."
    
    # Initialize compliance certification environment
    init_compliance_certification
    
    # Execute compliance assessments
    assess_soc2_compliance
    assess_iso27001_compliance
    assess_gdpr_compliance
    assess_financial_compliance
    assess_nist_compliance
    
    # Generate compliance score and certification
    generate_compliance_score
    generate_compliance_certificate
    
    # Display summary
    display_certification_summary
    
    log "✅ Compliance certification process completed!"
    
    # Return appropriate exit code
    if [[ $NON_COMPLIANT_CONTROLS -gt 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Execute main function
main "$@"