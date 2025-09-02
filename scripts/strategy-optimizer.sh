#!/bin/bash

# Trading Strategy Optimization System for Intel NUC
# Backtesting, parameter optimization, and strategy analysis

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPTIMIZATION_DIR="/opt/trading-agent/optimization"
BACKTEST_DATA_DIR="$OPTIMIZATION_DIR/data"
RESULTS_DIR="$OPTIMIZATION_DIR/results"
STRATEGIES_DIR="$OPTIMIZATION_DIR/strategies"
LOG_FILE="/var/log/trading-agent/strategy-optimization.log"

# Database configuration
DB_NAME="trading_agent"
DB_USER="postgres"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

status_ok() {
    echo -e "${GREEN}✅ $1${NC}"
    log "OK: $1"
}

status_error() {
    echo -e "${RED}❌ $1${NC}"
    log "ERROR: $1"
}

status_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    log "INFO: $1"
}

status_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    log "WARNING: $1"
}

# Initialize optimization environment
init_optimization() {
    status_info "Initializing strategy optimization environment..."
    
    # Create directories
    mkdir -p "$OPTIMIZATION_DIR" "$BACKTEST_DATA_DIR" "$RESULTS_DIR" "$STRATEGIES_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Create database tables for optimization if they don't exist
    sudo -u postgres psql -d "$DB_NAME" << 'EOF'
CREATE TABLE IF NOT EXISTS strategy_backtests (
    id SERIAL PRIMARY KEY,
    strategy_name VARCHAR(100) NOT NULL,
    parameters JSONB NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    initial_balance DECIMAL(15,8) NOT NULL,
    final_balance DECIMAL(15,8) NOT NULL,
    total_return DECIMAL(10,4) NOT NULL,
    max_drawdown DECIMAL(10,4) NOT NULL,
    sharpe_ratio DECIMAL(10,4),
    win_rate DECIMAL(10,4),
    total_trades INTEGER NOT NULL,
    profitable_trades INTEGER NOT NULL,
    avg_trade_return DECIMAL(10,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strategy_optimization_runs (
    id SERIAL PRIMARY KEY,
    optimization_name VARCHAR(100) NOT NULL,
    strategy_name VARCHAR(100) NOT NULL,
    parameter_space JSONB NOT NULL,
    best_parameters JSONB,
    best_return DECIMAL(10,4),
    best_sharpe DECIMAL(10,4),
    total_combinations INTEGER NOT NULL,
    completed_combinations INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'running',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS market_data_cache (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    open_price DECIMAL(15,8) NOT NULL,
    high_price DECIMAL(15,8) NOT NULL,
    low_price DECIMAL(15,8) NOT NULL,
    close_price DECIMAL(15,8) NOT NULL,
    volume DECIMAL(20,8) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, timeframe, timestamp)
);
EOF
    
    status_ok "Optimization environment initialized"
}# Downloa
d and cache market data for backtesting
fetch_market_data() {
    local symbol="$1"
    local timeframe="${2:-1h}"
    local days="${3:-30}"
    
    status_info "Fetching market data for $symbol ($timeframe, ${days} days)..."
    
    # Calculate start timestamp (days ago)
    local start_timestamp=$(date -d "$days days ago" +%s)
    
    # Create Python script for data fetching
    local fetch_script="$OPTIMIZATION_DIR/fetch_data.py"
    cat > "$fetch_script" << EOF
#!/usr/bin/env python3
import requests
import json
import time
import psycopg2
from datetime import datetime, timedelta
import sys

def fetch_gate_data(symbol, timeframe, start_time):
    """Fetch historical data from Gate.io API"""
    url = "http://localhost:8443/api/v4/spot/candlesticks"
    
    params = {
        'currency_pair': symbol,
        'interval': timeframe,
        'from': int(start_time),
        'to': int(time.time())
    }
    
    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching data: {e}")
        return []

def store_market_data(symbol, timeframe, data):
    """Store market data in database"""
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="$DB_NAME",
            user="$DB_USER"
        )
        cur = conn.cursor()
        
        for candle in data:
            timestamp = datetime.fromtimestamp(float(candle[0]))
            
            cur.execute("""
                INSERT INTO market_data_cache 
                (symbol, timeframe, timestamp, open_price, high_price, low_price, close_price, volume)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (symbol, timeframe, timestamp) DO NOTHING
            """, (
                symbol, timeframe, timestamp,
                float(candle[5]), float(candle[3]), float(candle[4]), 
                float(candle[2]), float(candle[1])
            ))
        
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"Stored {len(data)} candles for {symbol}")
        return True
        
    except Exception as e:
        print(f"Database error: {e}")
        return False

if __name__ == "__main__":
    symbol = sys.argv[1] if len(sys.argv) > 1 else "BTC_USDT"
    timeframe = sys.argv[2] if len(sys.argv) > 2 else "1h"
    start_time = float(sys.argv[3]) if len(sys.argv) > 3 else time.time() - 30*24*3600
    
    print(f"Fetching {symbol} data ({timeframe}) from {datetime.fromtimestamp(start_time)}")
    
    data = fetch_gate_data(symbol, timeframe, start_time)
    if data:
        if store_market_data(symbol, timeframe, data):
            print("✅ Data fetch completed successfully")
        else:
            print("❌ Failed to store data")
            sys.exit(1)
    else:
        print("❌ Failed to fetch data")
        sys.exit(1)
EOF
    
    chmod +x "$fetch_script"
    
    # Run data fetch
    if python3 "$fetch_script" "$symbol" "$timeframe" "$start_timestamp"; then
        status_ok "Market data fetched and cached for $symbol"
    else
        status_error "Failed to fetch market data for $symbol"
        return 1
    fi
}

# List available strategies and optimizations
list_strategies() {
    status_info "Available trading strategies:"
    
    echo "📈 Built-in Strategies:"
    echo "  1. sma_crossover      - Simple Moving Average Crossover"
    echo "  2. rsi_mean_reversion - RSI Mean Reversion"
    echo "  3. macd_momentum      - MACD Momentum"
    echo "  4. bollinger_bands    - Bollinger Bands"
    echo "  5. multi_indicator    - Multi-Indicator Strategy"
    
    echo ""
    echo "🗄️ Recent Optimizations:"
    
    # Query database for recent optimizations
    if command -v psql >/dev/null 2>&1; then
        sudo -u postgres psql -d "$DB_NAME" -c "
            SELECT optimization_name, strategy_name, status, 
                   best_return, completed_combinations, total_combinations,
                   created_at
            FROM strategy_optimization_runs 
            ORDER BY created_at DESC 
            LIMIT 10;
        " 2>/dev/null || echo "  No optimization history available"
    fi
}

# Main function
main() {
    echo "🧠 Trading Strategy Optimization System"
    echo "======================================="
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    case "${1:-}" in
        "init")
            init_optimization
            status_ok "Strategy optimization system initialized"
            ;;
        "fetch-data")
            local symbol="${2:-BTC_USDT}"
            local timeframe="${3:-1h}"
            local days="${4:-30}"
            fetch_market_data "$symbol" "$timeframe" "$days"
            ;;
        "list")
            list_strategies
            ;;
        *)
            echo "Usage: $0 [init|fetch-data|list]"
            echo ""
            echo "Commands:"
            echo "  init                                    - Initialize optimization system"
            echo "  fetch-data [symbol] [timeframe] [days] - Fetch market data for backtesting"
            echo "  list                                    - List available strategies"
            echo ""
            echo "Examples:"
            echo "  $0 init"
            echo "  $0 fetch-data BTC_USDT 1h 30"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"