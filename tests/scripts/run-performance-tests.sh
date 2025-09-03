#!/bin/bash
# run-performance-tests.sh - Performance and load testing

set -e

echo "⚡ Performance Test Suite"
echo "========================"

# API performance tests
echo "🔌 Testing API performance..."
npm test -- --testPathPattern="api.*performance|performance.*api"

# Database performance tests
echo "💾 Testing database performance..."
npm test -- --testPathPattern="database.*performance|performance.*database"

# Trading engine performance tests
echo "💰 Testing trading engine performance..."
npm test -- --testPathPattern="trading.*performance|performance.*trading"

# Memory usage tests
echo "🧠 Testing memory usage..."
npm test -- --testPathPattern="memory|ram|heap"

# Load testing
echo "📈 Running load tests..."
npm test -- --testPathPattern="load|stress|concurrent"

# AI/LLM performance tests
echo "🤖 Testing AI/LLM performance..."
npm test -- --testPathPattern="ai.*performance|llm.*performance"

# Network latency tests
echo "🌐 Testing network latency..."
npm test -- --testPathPattern="latency|network.*performance"

echo "✅ Performance tests completed"