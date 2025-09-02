#!/bin/bash

# AI Crypto Trading Agent - Trading System Functionality Testing Script
# Tests trading bot functionality, dashboard access, and notification delivery

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
TRADING_USER="trading"
TRADING_HOME="/opt/trading-agent"
DASHBOARD_PORT="3000"
DASHBOARD_HOST="0.0.0.0"
TEST_LOG="/tmp/trading-functionality-test-$(date +%Y%m%d_%H%M%S).log"
PAPER_TRADING_MODE=true

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print co