#!/bin/bash

# =============================================================================
# COMPREHENSIVE SECURITY VALIDATION ORCHESTRATOR
# =============================================================================
# Task: 20.4 Security and Compliance Validation - Master Script
# Requirements: 3.3, 5.4 - Complete security validation and compliance testing
# 
# This script orchestrates all security validation, penetration testing,
# and compliance certification processes for production deployment.
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
VALIDATION_LOG="/var/log/trading-agent/security-validation-master.log"
FINAL_REPORT="/opt/trading-agent/final-security-validation-report.json"

# Test results tracking
SECURITY_VALIDATION_RESULT=0
PENETRATION_TEST_RESULT=0
COMPLIANCE_CERT_RESULT=0
OVERALL_RESULT=0

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$VALIDATION_LOG"
}

success() {
    echo -e "${GREEN}[✅ SUCCESS]${NC} $1" | tee -a "$VALIDATION_LOG"
}

failure() {
    echo -e "${RED}[❌ FAILURE]${NC} $1" | tee -a "$VALIDATION_LOG"
}

warning() {
    echo -e "${YELLOW}[⚠️  WARNING]${NC} $1" | tee -a "$VALIDATION_LOG"
}

info() {
    echo -e "${CYAN}[ℹ️  INFO]${NC} $1" | tee -a "$VALIDATION_LOG"
}

# Initialize master validation environment
init_master_validation() {
    log "🔒 Initializing Master Security Validation Process..."
    
    # Create log directory
    mkdir -p "$(dirname "$VALIDATION_LOG")"
    mkdir -p "$(dirname "$FINAL_REPORT")"
    
    # Initialize final report
    cat > "$FINAL_REPORT" << 'EOF'
{
  "validation_timestamp": "",
  "validation_version": "1.0.0",
  "system_name": "AI Crypto Trading Agent",
  "deployment_environment": "Intel NUC Production",
  "validation_components": {
    "security_validation": {
      "status": "PENDING",
      "exit_code": null,
      "report_path": null
    },
    "penetration_testing": {
      "status": "PENDING", 
      "exit_code": null,
      "report_path": null
    },
    "compliance_certification": {
      "status": "PENDING",
      "exit_code": null,
      "report_path": null
    }
  },
  "overall_status": "PENDING",
  "security_score": 0,
  "recommendations": [],
  "production_readiness": false
}
EOF
    
    success "Master validation environment initialized"
}

# Update final report
update_final_report() {
    local component="$1"
    local status="$2"
    local exit_code="$3"
    local report_path="${4:-null}"
    
    python3 -c "
import json
import sys
from datetime import datetime

try:
    with open('$FINAL_REPORT', 'r') as f:
        report = json.load(f)
    
    report['validation_timestamp'] = datetime.now().isoformat()
    
    if '$component' in report['validation_components']:
        report['validation_components']['$component']['status'] = '$status'
        report['validation_components']['$component']['exit_code'] = $exit_code
        if '$report_path' != 'null':
            report['validation_components']['$component']['report_path'] = '$report_path'
    
    with open('$FINAL_REPORT', 'w') as f:
        json.dump(report, f, indent=2)
        
except Exception as e:
    print(f'Error updating final report: {e}', file=sys.stderr)
" 2>/dev/null || true
}

# Run security validation
run_security_validation() {
    log "🔧 Running Comprehensive Security Validation..."
    
    local security_script="$SCRIPT_DIR/production-security-validation.sh"
    
    if [[ -f "$security_script" ]]; then
        info "Executing security validation script..."
        
        # Make script executable
        chmod +x "$security_script" 2>/dev/null || true
        
        # Run security validation
        if bash "$security_script"; then
            SECURITY_VALIDATION_RESULT=0
            success "Security validation completed successfully"
            update_final_report "security_validation" "PASSED" "0" "/opt/trading-agent/compliance-report.json"
        else
            SECURITY_VALIDATION_RESULT=$?
            failure "Security validation failed with exit code $SECURITY_VALIDATION_RESULT"
            update_final_report "security_validation" "FAILED" "$SECURITY_VALIDATION_RESULT" "/opt/trading-agent/compliance-report.json"
        fi
    else
        failure "Security validation script not found: $security_script"
        SECURITY_VALIDATION_RESULT=1
        update_final_report "security_validation" "ERROR" "1" "null"
    fi
    
    return $SECURITY_VALIDATION_RESULT
}

# Run penetration testing
run_penetration_testing() {
    log "🎯 Running Comprehensive Penetration Testing..."
    
    local pentest_script="$SCRIPT_DIR/penetration-testing.sh"
    
    if [[ -f "$pentest_script" ]]; then
        info "Executing penetration testing script..."
        
        # Make script executable
        chmod +x "$pentest_script" 2>/dev/null || true
        
        # Run penetration testing
        if bash "$pentest_script"; then
            PENETRATION_TEST_RESULT=0
            success "Penetration testing completed successfully"
            update_final_report "penetration_testing" "PASSED" "0" "/opt/trading-agent/penetration-test-report.json"
        else
            PENETRATION_TEST_RESULT=$?
            if [[ $PENETRATION_TEST_RESULT -eq 2 ]]; then
                failure "High-risk vulnerabilities found in penetration testing"
            elif [[ $PENETRATION_TEST_RESULT -eq 1 ]]; then
                warning "Medium-risk vulnerabilities found in penetration testing"
            else
                failure "Penetration testing failed with exit code $PENETRATION_TEST_RESULT"
            fi
            update_final_report "penetration_testing" "FAILED" "$PENETRATION_TEST_RESULT" "/opt/trading-agent/penetration-test-report.json"
        fi
    else
        failure "Penetration testing script not found: $pentest_script"
        PENETRATION_TEST_RESULT=1
        update_final_report "penetration_testing" "ERROR" "1" "null"
    fi
    
    return $PENETRATION_TEST_RESULT
}

# Run compliance certification
run_compliance_certification() {
    log "📋 Running Compliance Certification..."
    
    local compliance_script="$SCRIPT_DIR/compliance-certification.sh"
    
    if [[ -f "$compliance_script" ]]; then
        info "Executing compliance certification script..."
        
        # Make script executable
        chmod +x "$compliance_script" 2>/dev/null || true
        
        # Run compliance certification
        if bash "$compliance_script"; then
            COMPLIANCE_CERT_RESULT=0
            success "Compliance certification completed successfully"
            update_final_report "compliance_certification" "PASSED" "0" "/opt/trading-agent/compliance-certification-report.json"
        else
            COMPLIANCE_CERT_RESULT=$?
            failure "Compliance certification failed with exit code $COMPLIANCE_CERT_RESULT"
            update_final_report "compliance_certification" "FAILED" "$COMPLIANCE_CERT_RESULT" "/opt/trading-agent/compliance-certification-report.json"
        fi
    else
        failure "Compliance certification script not found: $compliance_script"
        COMPLIANCE_CERT_RESULT=1
        update_final_report "compliance_certification" "ERROR" "1" "null"
    fi
    
    return $COMPLIANCE_CERT_RESULT
}

# Generate overall security assessment
generate_overall_assessment() {
    log "📊 Generating Overall Security Assessment..."
    
    python3 -c "
import json
import sys
from datetime import datetime

try:
    with open('$FINAL_REPORT', 'r') as f:
        report = json.load(f)
    
    # Calculate overall status
    components = report.get('validation_components', {})
    
    passed_components = 0
    total_components = len(components)
    critical_failures = 0
    
    for component, details in components.items():
        status = details.get('status', 'PENDING')
        exit_code = details.get('exit_code', 0)
        
        if status == 'PASSED':
            passed_components += 1
        elif status == 'FAILED' and exit_code > 1:
            critical_failures += 1
    
    # Determine overall status
    if passed_components == total_components:
        overall_status = 'PRODUCTION_READY'
        production_readiness = True
        security_score = 100
    elif critical_failures > 0:
        overall_status = 'CRITICAL_ISSUES'
        production_readiness = False
        security_score = max(0, 50 - (critical_failures * 20))
    elif passed_components >= total_components * 0.8:
        overall_status = 'MINOR_ISSUES'
        production_readiness = True
        security_score = 80 + (passed_components / total_components * 20)
    else:
        overall_status = 'MAJOR_ISSUES'
        production_readiness = False
        security_score = passed_components / total_components * 70
    
    # Generate recommendations
    recommendations = []
    
    for component, details in components.items():
        if details.get('status') == 'FAILED':
            recommendations.append(f'Address failures in {component.replace(\"_\", \" \").title()}')
    
    if overall_status == 'CRITICAL_ISSUES':
        recommendations.insert(0, 'URGENT: Do not deploy to production until critical issues are resolved')
    elif overall_status == 'MAJOR_ISSUES':
        recommendations.insert(0, 'Resolve major security issues before production deployment')
    elif overall_status == 'MINOR_ISSUES':
        recommendations.insert(0, 'Address minor issues and monitor closely in production')
    
    recommendations.extend([
        'Implement continuous security monitoring',
        'Schedule regular security assessments',
        'Maintain incident response procedures',
        'Keep all systems and dependencies updated',
        'Regular backup and recovery testing'
    ])
    
    # Update report
    report['overall_status'] = overall_status
    report['security_score'] = round(security_score, 1)
    report['production_readiness'] = production_readiness
    report['recommendations'] = recommendations
    report['validation_timestamp'] = datetime.now().isoformat()
    
    with open('$FINAL_REPORT', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f'Overall Status: {overall_status}')
    print(f'Security Score: {security_score:.1f}/100')
    print(f'Production Ready: {production_readiness}')
    print(f'Components Passed: {passed_components}/{total_components}')
    print(f'Critical Failures: {critical_failures}')
    
except Exception as e:
    print(f'Error generating overall assessment: {e}', file=sys.stderr)
    sys.exit(1)
" | tee -a "$VALIDATION_LOG"
}

# Generate production readiness certificate
generate_production_certificate() {
    log "📜 Generating Production Readiness Certificate..."
    
    local cert_file="$TRADING_AGENT_DIR/production-readiness-certificate.txt"
    
    cat > "$cert_file" << EOF
================================================================================
                    PRODUCTION READINESS CERTIFICATE
================================================================================

System: AI Crypto Trading Agent
Version: Production v1.0
Environment: Intel NUC Production Deployment
Assessment Date: $(date)
Validation Framework: Comprehensive Security Assessment v1.0

================================================================================
                            VALIDATION SUMMARY
================================================================================

Overall Status: $(python3 -c "
import json
try:
    with open('$FINAL_REPORT', 'r') as f:
        report = json.load(f)
    print(report.get('overall_status', 'UNKNOWN'))
except:
    print('UNKNOWN')
")

Security Score: $(python3 -c "
import json
try:
    with open('$FINAL_REPORT', 'r') as f:
        report = json.load(f)
    print(f\"{report.get('security_score', 0)}/100\")
except:
    print('N/A')
")

Production Ready: $(python3 -c "
import json
try:
    with open('$FINAL_REPORT', 'r') as f:
        report = json.load(f)
    ready = report.get('production_readiness', False)
    print('YES' if ready else 'NO')
except:
    print('UNKNOWN')
")

================================================================================
                        VALIDATION COMPONENT RESULTS
================================================================================

Security Validation: $(python3 -c "
import json
try:
    with open('$FINAL_REPORT', 'r') as f:
        report = json.load(f)
    status = report.get('validation_components', {}).get('security_validation', {}).get('status', 'UNKNOWN')
    print(status)
except:
    print('UNKNOWN')
")

Penetration Testing: $(python3 -c "
import json
try:
    with open('$FINAL_REPORT', 'r') as f:
        report = json.load(f)
    status = report.get('validation_components', {}).get('penetration_testing', {}).get('status', 'UNKNOWN')
    print(status)
except:
    print('UNKNOWN')
")

Compliance Certification: $(python3 -c "
import json
try:
    with open('$FINAL_REPORT', 'r') as f:
        report = json.load(f)
    status = report.get('validation_components', {}).get('compliance_certification', {}).get('status', 'UNKNOWN')
    print(status)
except:
    print('UNKNOWN')
")

================================================================================
                              RECOMMENDATIONS
================================================================================

$(python3 -c "
import json
try:
    with open('$FINAL_REPORT', 'r') as f:
        report = json.load(f)
    recommendations = report.get('recommendations', [])
    for i, rec in enumerate(recommendations[:10], 1):  # Show first 10 recommendations
        print(f'{i}. {rec}')
except:
    print('No recommendations available')
")

================================================================================
                            PRODUCTION DECISION
================================================================================

$(python3 -c "
import json
try:
    with open('$FINAL_REPORT', 'r') as f:
        report = json.load(f)
    
    ready = report.get('production_readiness', False)
    status = report.get('overall_status', 'UNKNOWN')
    
    if ready and status == 'PRODUCTION_READY':
        print('✅ APPROVED FOR PRODUCTION DEPLOYMENT')
        print('')
        print('This system has passed all security validation tests and is')
        print('certified as ready for production deployment.')
    elif ready and status == 'MINOR_ISSUES':
        print('⚠️  CONDITIONALLY APPROVED FOR PRODUCTION')
        print('')
        print('This system has minor security issues but is acceptable for')
        print('production deployment with enhanced monitoring.')
    else:
        print('❌ NOT APPROVED FOR PRODUCTION DEPLOYMENT')
        print('')
        print('This system has significant security issues that must be')
        print('resolved before production deployment.')
except:
    print('❌ UNABLE TO DETERMINE PRODUCTION READINESS')
")

================================================================================
                              AUDIT TRAIL
================================================================================

Validation Reports:
- Security Validation: /opt/trading-agent/compliance-report.json
- Penetration Testing: /opt/trading-agent/penetration-test-report.json
- Compliance Certification: /opt/trading-agent/compliance-certification-report.json
- Final Assessment: $FINAL_REPORT

Log Files:
- Master Validation Log: $VALIDATION_LOG
- Security Validation Log: /var/log/trading-agent/security-validation.log
- Penetration Test Log: /var/log/trading-agent/penetration-test.log
- Compliance Log: /var/log/trading-agent/compliance-certification.log

================================================================================
                                VALIDITY
================================================================================

This certificate is valid for 90 days from the assessment date.
Next assessment required by: $(date -d '+90 days' '+%Y-%m-%d')

Certificate generated: $(date)
Validation system: AI Crypto Trading Agent Security Framework v1.0

================================================================================
EOF
    
    success "Production readiness certificate generated: $cert_file"
}

# Display final validation summary
display_final_summary() {
    log "📋 Final Security Validation Summary"
    echo ""
    echo "=== COMPREHENSIVE SECURITY VALIDATION RESULTS ==="
    echo "Validation completed: $(date)"
    echo "System: AI Crypto Trading Agent (Intel NUC Production)"
    echo ""
    
    echo "Component Results:"
    echo "  Security Validation: $([ $SECURITY_VALIDATION_RESULT -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED ($SECURITY_VALIDATION_RESULT)")"
    echo "  Penetration Testing: $([ $PENETRATION_TEST_RESULT -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED ($PENETRATION_TEST_RESULT)")"
    echo "  Compliance Certification: $([ $COMPLIANCE_CERT_RESULT -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED ($COMPLIANCE_CERT_RESULT)")"
    echo ""
    
    # Display overall assessment
    if [[ -f "$FINAL_REPORT" ]]; then
        python3 -c "
import json
try:
    with open('$FINAL_REPORT', 'r') as f:
        report = json.load(f)
    
    status = report.get('overall_status', 'UNKNOWN')
    score = report.get('security_score', 0)
    ready = report.get('production_readiness', False)
    
    print(f'Overall Status: {status}')
    print(f'Security Score: {score}/100')
    print(f'Production Ready: {\"YES\" if ready else \"NO\"}')
    print('')
    
    if ready:
        print('✅ SYSTEM APPROVED FOR PRODUCTION DEPLOYMENT')
    else:
        print('❌ SYSTEM NOT READY FOR PRODUCTION DEPLOYMENT')
    
except:
    print('Could not read final assessment report')
"
    fi
    
    echo ""
    echo "📄 Generated reports and certificates:"
    echo "  - Final assessment report: $FINAL_REPORT"
    echo "  - Production readiness certificate: $TRADING_AGENT_DIR/production-readiness-certificate.txt"
    echo "  - Master validation log: $VALIDATION_LOG"
    echo ""
    
    # Determine overall result
    if [[ $SECURITY_VALIDATION_RESULT -eq 0 ]] && [[ $PENETRATION_TEST_RESULT -eq 0 ]] && [[ $COMPLIANCE_CERT_RESULT -eq 0 ]]; then
        OVERALL_RESULT=0
        echo -e "${GREEN}🎉 ALL SECURITY VALIDATIONS PASSED SUCCESSFULLY${NC}"
        echo "System is certified as production-ready."
    elif [[ $SECURITY_VALIDATION_RESULT -ne 0 ]] || [[ $PENETRATION_TEST_RESULT -eq 2 ]] || [[ $COMPLIANCE_CERT_RESULT -ne 0 ]]; then
        OVERALL_RESULT=2
        echo -e "${RED}🚨 CRITICAL SECURITY ISSUES DETECTED${NC}"
        echo "System is NOT ready for production deployment."
    else
        OVERALL_RESULT=1
        echo -e "${YELLOW}⚠️  MINOR SECURITY ISSUES DETECTED${NC}"
        echo "System may be deployed with enhanced monitoring."
    fi
    
    echo ""
}

# Main execution function
main() {
    log "🔒 Starting Comprehensive Security Validation Process..."
    
    # Initialize master validation environment
    init_master_validation
    
    # Run all validation components
    info "Executing security validation components..."
    
    # Run security validation (continue on failure to get complete picture)
    run_security_validation || true
    
    # Run penetration testing (continue on failure to get complete picture)
    run_penetration_testing || true
    
    # Run compliance certification (continue on failure to get complete picture)
    run_compliance_certification || true
    
    # Generate overall assessment
    generate_overall_assessment
    
    # Generate production certificate
    generate_production_certificate
    
    # Display final summary
    display_final_summary
    
    log "✅ Comprehensive security validation process completed!"
    
    # Return overall result
    exit $OVERALL_RESULT
}

# Execute main function
main "$@"