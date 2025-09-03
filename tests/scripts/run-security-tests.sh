#!/bin/bash
# run-security-tests.sh - Comprehensive security test suite

set -e

echo "🔒 Security Test Suite"
echo "====================="

# Authentication and authorization tests
echo "🔐 Testing authentication and authorization..."
npm test -- --testPathPattern="auth|jwt|security"

# Encryption and data protection tests
echo "🛡️ Testing encryption and data protection..."
npm test -- --testPathPattern="encrypt|crypto|protection"

# Network security tests
echo "🌐 Testing network security..."
npm test -- --testPathPattern="network|firewall|tunnel"

# Input validation and sanitization tests
echo "🧹 Testing input validation..."
npm test -- --testPathPattern="validation|sanitize|input"

# Threat detection tests
echo "👁️ Testing threat detection..."
npm test -- --testPathPattern="threat|intrusion|detection"

# Compliance tests
echo "📋 Testing security compliance..."
npm test -- --testPathPattern="compliance|audit|standard"

# Penetration tests
echo "🎯 Running penetration tests..."
npm test -- --testPathPattern="penetration|pentest|vulnerability"

echo "✅ Security tests completed"