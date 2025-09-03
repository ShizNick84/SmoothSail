#!/bin/bash

# =============================================================================
# OLLAMA SETUP SCRIPT FOR INTEL NUC - UBUNTU DEPLOYMENT
# =============================================================================
# 
# This script installs and configures Ollama with optimized LLM models
# for Intel NUC hardware constraints (i5 CPU, 12GB RAM, 256GB SSD).
# 
# Models to install:
# - Llama 3.1 8B: Primary trading decision model
# - Mistral 7B: Fast sentiment analysis and confluence scoring  
# - CodeLlama 7B: Strategy code generation and optimization
# 
# Hardware Optimizations:
# - CPU-only inference (no GPU)
# - Memory management for 12GB constraint
# - Disk space optimization for 256GB SSD
# - Performance tuning for Intel i5
# 
# @author AI Crypto Trading System
# @version 1.0.0
# @license PROPRIETARY
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OLLAMA_VERSION="0.3.12"
OLLAMA_USER="trading"
OLLAMA_HOME="/opt/trading-agent"
OLLAMA_DATA_DIR="/opt/trading-agent/ollama"
OLLAMA_MODELS_DIR="${OLLAMA_DATA_DIR}/models"
OLLAMA_HOST="127.0.0.1"
OLLAMA_PORT="11434"

# System requirements
MIN_RAM_GB=12
MIN_DISK_GB=50
REQUIRED_CPU_CORES=4

# Models to install (optimized for Intel NUC)
declare -A MODELS=(
    ["llama3.1:8b"]="Primary trading decision model - 6GB RAM"
    ["mistral:7b"]="Fast sentiment analysis - 4.5GB RAM" 
    ["codellama:7b"]="Strategy code generation - 4.5GB RAM"
)

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root"
        log "Please run as the trading user or with sudo for specific commands"
        exit 1
    fi
}

# Check system requirements
check_system_requirements() {
    log "🔍 Checking system requirements for Intel NUC..."
    
    # Check RAM
    local ram_gb=$(free -g | awk '/^Mem:/{print $2}')
    if [[ $ram_gb -lt $MIN_RAM_GB ]]; then
        log_error "Insufficient RAM: ${ram_gb}GB (minimum: ${MIN_RAM_GB}GB)"
        exit 1
    fi
    log_success "RAM check passed: ${ram_gb}GB available"
    
    # Check disk space
    local disk_gb=$(df -BG /opt | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ $disk_gb -lt $MIN_DISK_GB ]]; then
        log_error "Insufficient disk space: ${disk_gb}GB (minimum: ${MIN_DISK_GB}GB)"
        exit 1
    fi
    log_success "Disk space check passed: ${disk_gb}GB available"
    
    # Check CPU cores
    local cpu_cores=$(nproc)
    if [[ $cpu_cores -lt $REQUIRED_CPU_CORES ]]; then
        log_warning "CPU cores: ${cpu_cores} (recommended: ${REQUIRED_CPU_CORES})"
    else
        log_success "CPU cores check passed: ${cpu_cores} cores"
    fi
    
    # Check architecture
    local arch=$(uname -m)
    if [[ "$arch" != "x86_64" ]]; then
        log_error "Unsupported architecture: $arch (required: x86_64)"
        exit 1
    fi
    log_success "Architecture check passed: $arch"
}

# Install system dependencies
install_dependencies() {
    log "📦 Installing system dependencies..."
    
    sudo apt-get update
    sudo apt-get install -y \
        curl \
        wget \
        gnupg \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        lsb-release \
        jq \
        htop \
        iotop \
        nethogs
    
    log_success "System dependencies installed"
}

# Download and install Ollama
install_ollama() {
    log "📥 Installing Ollama ${OLLAMA_VERSION}..."
    
    # Download Ollama installer
    curl -fsSL https://ollama.com/install.sh | sh
    
    # Verify installation
    if command -v ollama &> /dev/null; then
        local version=$(ollama --version 2>/dev/null || echo "unknown")
        log_success "Ollama installed successfully: $version"
    else
        log_error "Ollama installation failed"
        exit 1
    fi
}

# Configure Ollama for Intel NUC
configure_ollama() {
    log "⚙️ Configuring Ollama for Intel NUC..."
    
    # Create Ollama data directory
    sudo mkdir -p "$OLLAMA_DATA_DIR"
    sudo mkdir -p "$OLLAMA_MODELS_DIR"
    sudo chown -R $OLLAMA_USER:$OLLAMA_USER "$OLLAMA_DATA_DIR"
    
    # Create Ollama configuration
    sudo tee /etc/systemd/system/ollama.service > /dev/null <<EOF
[Unit]
Description=Ollama Service for AI Trading Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=exec
User=$OLLAMA_USER
Group=$OLLAMA_USER
WorkingDirectory=$OLLAMA_HOME
Environment="OLLAMA_HOST=$OLLAMA_HOST:$OLLAMA_PORT"
Environment="OLLAMA_MODELS=$OLLAMA_MODELS_DIR"
Environment="OLLAMA_NUM_PARALLEL=1"
Environment="OLLAMA_MAX_LOADED_MODELS=1"
Environment="OLLAMA_FLASH_ATTENTION=0"
Environment="OLLAMA_NUM_GPU=0"
Environment="OLLAMA_CPU_TARGET=intel"
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ollama

# Resource limits for Intel NUC
MemoryMax=8G
CPUQuota=300%
TasksMax=1024

[Install]
WantedBy=multi-user.target
EOF

    # Create Ollama environment file
    sudo tee /etc/default/ollama > /dev/null <<EOF
# Ollama Configuration for Intel NUC
OLLAMA_HOST=$OLLAMA_HOST:$OLLAMA_PORT
OLLAMA_MODELS=$OLLAMA_MODELS_DIR
OLLAMA_NUM_PARALLEL=1
OLLAMA_MAX_LOADED_MODELS=1
OLLAMA_FLASH_ATTENTION=0
OLLAMA_NUM_GPU=0
OLLAMA_CPU_TARGET=intel
OLLAMA_KEEP_ALIVE=5m
OLLAMA_MAX_QUEUE=10
EOF

    # Set proper permissions
    sudo chown root:root /etc/systemd/system/ollama.service
    sudo chmod 644 /etc/systemd/system/ollama.service
    sudo chown root:root /etc/default/ollama
    sudo chmod 644 /etc/default/ollama
    
    log_success "Ollama configuration completed"
}

# Start Ollama service
start_ollama_service() {
    log "🚀 Starting Ollama service..."
    
    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable ollama
    sudo systemctl start ollama
    
    # Wait for service to start
    sleep 5
    
    # Check service status
    if sudo systemctl is-active --quiet ollama; then
        log_success "Ollama service started successfully"
    else
        log_error "Failed to start Ollama service"
        sudo systemctl status ollama
        exit 1
    fi
    
    # Wait for Ollama to be ready
    log "⏳ Waiting for Ollama to be ready..."
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -s "http://$OLLAMA_HOST:$OLLAMA_PORT/api/tags" > /dev/null 2>&1; then
            log_success "Ollama is ready and responding"
            break
        fi
        
        ((attempt++))
        log "Attempt $attempt/$max_attempts - waiting for Ollama..."
        sleep 2
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        log_error "Ollama failed to start within timeout"
        exit 1
    fi
}

# Pull and configure models
install_models() {
    log "📥 Installing optimized models for Intel NUC..."
    
    # Check available disk space before each model
    for model in "${!MODELS[@]}"; do
        local description="${MODELS[$model]}"
        log "📥 Installing $model - $description"
        
        # Check disk space (each model needs ~5-8GB)
        local available_gb=$(df -BG "$OLLAMA_MODELS_DIR" | awk 'NR==2 {print $4}' | sed 's/G//')
        if [[ $available_gb -lt 10 ]]; then
            log_warning "Low disk space: ${available_gb}GB - skipping $model"
            continue
        fi
        
        # Pull model with progress
        log "📥 Pulling $model (this may take several minutes)..."
        if ollama pull "$model"; then
            log_success "Successfully installed $model"
            
            # Test model
            log "🧪 Testing $model..."
            local test_response=$(ollama run "$model" "Hello, respond with OK if working" --verbose=false 2>/dev/null | head -1)
            if [[ "$test_response" == *"OK"* ]] || [[ "$test_response" == *"ok"* ]]; then
                log_success "$model test passed"
            else
                log_warning "$model test inconclusive: $test_response"
            fi
        else
            log_error "Failed to install $model"
        fi
        
        # Small delay between models to prevent overload
        sleep 2
    done
}

# Optimize models for Intel NUC
optimize_models() {
    log "⚡ Optimizing models for Intel NUC performance..."
    
    # Create model optimization script
    cat > "$OLLAMA_HOME/optimize-models.sh" <<'EOF'
#!/bin/bash

# Model optimization for Intel NUC
# This script configures model parameters for optimal performance

OLLAMA_HOST="127.0.0.1:11434"

# Function to create optimized modelfile
create_optimized_modelfile() {
    local base_model="$1"
    local optimized_name="$2"
    local purpose="$3"
    
    case "$purpose" in
        "trading")
            cat > "/tmp/${optimized_name}.modelfile" <<MODELFILE
FROM $base_model

# Trading-optimized parameters
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_ctx 4096
PARAMETER num_predict 2048
PARAMETER repeat_penalty 1.1
PARAMETER stop "</s>"
PARAMETER stop "<|end|>"
PARAMETER stop "<|eot_id|>"

# System prompt for trading analysis
SYSTEM """You are an expert cryptocurrency trading analyst. Provide clear, concise analysis with specific recommendations. Always include:
1. Market assessment (bullish/bearish/neutral)
2. Key factors influencing the decision
3. Risk assessment
4. Confidence score (0-100)
5. Specific entry/exit recommendations when applicable

Be direct and actionable in your responses."""
MODELFILE
            ;;
        "sentiment")
            cat > "/tmp/${optimized_name}.modelfile" <<MODELFILE
FROM $base_model

# Sentiment analysis optimized parameters
PARAMETER temperature 0.8
PARAMETER top_p 0.95
PARAMETER top_k 50
PARAMETER num_ctx 2048
PARAMETER num_predict 1024
PARAMETER repeat_penalty 1.05
PARAMETER stop "</s>"
PARAMETER stop "<|end|>"

# System prompt for sentiment analysis
SYSTEM """You are a market sentiment analysis expert. Analyze the provided information and provide:
1. Overall sentiment score (0-100, where 0=very bearish, 50=neutral, 100=very bullish)
2. Key sentiment drivers
3. Market mood assessment
4. Confidence in the analysis

Be concise and focus on actionable sentiment insights."""
MODELFILE
            ;;
        "code")
            cat > "/tmp/${optimized_name}.modelfile" <<MODELFILE
FROM $base_model

# Code generation optimized parameters
PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER top_k 30
PARAMETER num_ctx 2048
PARAMETER num_predict 1024
PARAMETER repeat_penalty 1.1
PARAMETER stop "</s>"
PARAMETER stop "<|end|>"
PARAMETER stop "\`\`\`"

# System prompt for code generation
SYSTEM """You are an expert trading strategy developer. Generate clean, efficient, and well-documented code. Always include:
1. Clear code structure and comments
2. Error handling
3. Performance considerations
4. Risk management features
5. Testing recommendations

Focus on production-ready, maintainable code."""
MODELFILE
            ;;
    esac
    
    # Create the optimized model
    ollama create "$optimized_name" -f "/tmp/${optimized_name}.modelfile"
    rm "/tmp/${optimized_name}.modelfile"
}

# Create optimized versions of models
echo "Creating optimized model variants..."

if ollama list | grep -q "llama3.1:8b"; then
    create_optimized_modelfile "llama3.1:8b" "llama3.1-trading" "trading"
    echo "✅ Created llama3.1-trading"
fi

if ollama list | grep -q "mistral:7b"; then
    create_optimized_modelfile "mistral:7b" "mistral-sentiment" "sentiment"
    echo "✅ Created mistral-sentiment"
fi

if ollama list | grep -q "codellama:7b"; then
    create_optimized_modelfile "codellama:7b" "codellama-strategy" "code"
    echo "✅ Created codellama-strategy"
fi

echo "Model optimization completed"
EOF

    chmod +x "$OLLAMA_HOME/optimize-models.sh"
    
    # Run optimization
    if "$OLLAMA_HOME/optimize-models.sh"; then
        log_success "Model optimization completed"
    else
        log_warning "Model optimization had issues, but continuing..."
    fi
}

# Create monitoring and management scripts
create_management_scripts() {
    log "📝 Creating Ollama management scripts..."
    
    # Ollama status script
    cat > "$OLLAMA_HOME/ollama-status.sh" <<'EOF'
#!/bin/bash

# Ollama Status and Monitoring Script

echo "🤖 Ollama Service Status"
echo "======================="

# Service status
echo "Service Status:"
systemctl is-active ollama && echo "✅ Running" || echo "❌ Stopped"

# API status
echo -e "\nAPI Status:"
if curl -s http://127.0.0.1:11434/api/tags > /dev/null; then
    echo "✅ API Responding"
else
    echo "❌ API Not Responding"
fi

# Resource usage
echo -e "\nResource Usage:"
echo "Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Disk: $(df -h /opt/trading-agent | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"

# Loaded models
echo -e "\nLoaded Models:"
curl -s http://127.0.0.1:11434/api/ps | jq -r '.models[]? | "- " + .name + " (" + (.size_vram/1024/1024/1024|floor|tostring) + "GB)"' 2>/dev/null || echo "No models currently loaded"

# Available models
echo -e "\nAvailable Models:"
ollama list 2>/dev/null | tail -n +2 | while read line; do
    echo "- $line"
done

# Recent logs
echo -e "\nRecent Logs (last 5 lines):"
journalctl -u ollama --no-pager -n 5 --since "1 hour ago" | tail -5
EOF

    # Ollama restart script
    cat > "$OLLAMA_HOME/ollama-restart.sh" <<'EOF'
#!/bin/bash

echo "🔄 Restarting Ollama service..."

sudo systemctl stop ollama
sleep 3
sudo systemctl start ollama
sleep 5

if systemctl is-active --quiet ollama; then
    echo "✅ Ollama restarted successfully"
else
    echo "❌ Failed to restart Ollama"
    sudo systemctl status ollama
fi
EOF

    # Ollama cleanup script
    cat > "$OLLAMA_HOME/ollama-cleanup.sh" <<'EOF'
#!/bin/bash

echo "🧹 Cleaning up Ollama resources..."

# Stop service
sudo systemctl stop ollama

# Clean up temporary files
sudo find /tmp -name "ollama*" -type f -delete 2>/dev/null || true

# Clean up logs older than 7 days
sudo journalctl --vacuum-time=7d

# Restart service
sudo systemctl start ollama

echo "✅ Cleanup completed"
EOF

    # Make scripts executable
    chmod +x "$OLLAMA_HOME/ollama-status.sh"
    chmod +x "$OLLAMA_HOME/ollama-restart.sh"
    chmod +x "$OLLAMA_HOME/ollama-cleanup.sh"
    
    log_success "Management scripts created"
}

# Verify installation
verify_installation() {
    log "🔍 Verifying Ollama installation..."
    
    # Check service status
    if ! systemctl is-active --quiet ollama; then
        log_error "Ollama service is not running"
        return 1
    fi
    
    # Check API connectivity
    if ! curl -s "http://$OLLAMA_HOST:$OLLAMA_PORT/api/tags" > /dev/null; then
        log_error "Ollama API is not responding"
        return 1
    fi
    
    # Check installed models
    local model_count=$(ollama list | tail -n +2 | wc -l)
    if [[ $model_count -eq 0 ]]; then
        log_warning "No models installed"
    else
        log_success "$model_count models installed"
    fi
    
    # Test a model if available
    local test_model=$(ollama list | tail -n +2 | head -1 | awk '{print $1}')
    if [[ -n "$test_model" ]]; then
        log "🧪 Testing model: $test_model"
        local response=$(echo "Hello" | ollama run "$test_model" 2>/dev/null | head -1)
        if [[ -n "$response" ]]; then
            log_success "Model test passed: $test_model"
        else
            log_warning "Model test failed: $test_model"
        fi
    fi
    
    log_success "Ollama installation verification completed"
}

# Print usage information
print_usage() {
    log "📋 Ollama Setup Complete!"
    echo
    echo "Management Commands:"
    echo "  Status:  $OLLAMA_HOME/ollama-status.sh"
    echo "  Restart: $OLLAMA_HOME/ollama-restart.sh"
    echo "  Cleanup: $OLLAMA_HOME/ollama-cleanup.sh"
    echo
    echo "Service Commands:"
    echo "  sudo systemctl start ollama"
    echo "  sudo systemctl stop ollama"
    echo "  sudo systemctl restart ollama"
    echo "  sudo systemctl status ollama"
    echo
    echo "Model Commands:"
    echo "  ollama list                    # List installed models"
    echo "  ollama run <model>            # Run a model interactively"
    echo "  ollama pull <model>           # Install a new model"
    echo "  ollama rm <model>             # Remove a model"
    echo
    echo "API Endpoint: http://$OLLAMA_HOST:$OLLAMA_PORT"
    echo "Models Directory: $OLLAMA_MODELS_DIR"
    echo "Configuration: /etc/systemd/system/ollama.service"
    echo
    echo "🎯 Ready for AI-powered trading analysis!"
}

# Main installation function
main() {
    log "🚀 Starting Ollama setup for Intel NUC..."
    
    check_root
    check_system_requirements
    install_dependencies
    install_ollama
    configure_ollama
    start_ollama_service
    install_models
    optimize_models
    create_management_scripts
    verify_installation
    print_usage
    
    log_success "🎉 Ollama setup completed successfully!"
}

# Run main function
main "$@"