#!/bin/bash
# run-nuc-tests.sh - Intel NUC specific tests

set -e

echo "🖥️ Intel NUC Specific Test Suite"
echo "================================"

# Test Intel NUC hardware optimization
echo "🔧 Testing Intel NUC hardware optimization..."
npm test -- --testPathPattern="nuc|intel|hardware"

# Test memory usage (12GB limit)
echo "🧠 Testing memory usage optimization..."
npm test -- --testPathPattern="memory|ram"

# Test disk space optimization (256GB SSD)
echo "💾 Testing disk space optimization..."
npm test -- --testPathPattern="disk|storage|ssd"

# Test CPU optimization (Intel i5)
echo "⚡ Testing CPU optimization..."
npm test -- --testPathPattern="cpu|processor|i5"

# Test SSH tunnel performance
echo "🌐 Testing SSH tunnel performance..."
npm test -- --testPathPattern="tunnel|ssh|oracle"

# Test system resource monitoring
echo "📊 Testing system resource monitoring..."
npm test -- --testPathPattern="monitor|resource|system"

echo "✅ Intel NUC tests completed"