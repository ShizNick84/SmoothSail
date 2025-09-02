# PowerShell script to start SSH tunnel in background
Write-Host "🚀 Starting SSH Tunnel to Oracle Cloud..." -ForegroundColor Green
Write-Host "=========================================="

# SSH Configuration
$SSH_HOST = "168.138.104.117"
$SSH_USERNAME = "opc"
$SSH_KEY_PATH = "keys/oracle_key"
$LOCAL_PORT = 8443
$REMOTE_HOST = "api.gateio.ws"
$REMOTE_PORT = 443

Write-Host "✅ Configuration:" -ForegroundColor Green
Write-Host "   Local Port: $LOCAL_PORT"
Write-Host "   Remote: $REMOTE_HOST`:$REMOTE_PORT"
Write-Host "   SSH: $SSH_USERNAME@$SSH_HOST"
Write-Host ""

# Build SSH command
$sshArgs = @(
    "-N",
    "-T", 
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    "-o", "ConnectTimeout=30",
    "-o", "ServerAliveInterval=60",
    "-o", "ServerAliveCountMax=3",
    "-i", $SSH_KEY_PATH,
    "-L", "$LOCAL_PORT`:$REMOTE_HOST`:$REMOTE_PORT",
    "$SSH_USERNAME@$SSH_HOST"
)

Write-Host "🔧 Starting tunnel..." -ForegroundColor Yellow
Write-Host "ssh $($sshArgs -join ' ')"
Write-Host ""

# Start SSH process in background
$process = Start-Process -FilePath "ssh" -ArgumentList $sshArgs -NoNewWindow -PassThru

# Wait a moment for tunnel to establish
Start-Sleep -Seconds 3

# Check if process is still running
if ($process.HasExited) {
    Write-Host "❌ SSH tunnel failed to start" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ SSH tunnel started successfully!" -ForegroundColor Green
    Write-Host "🌐 Process ID: $($process.Id)" -ForegroundColor Cyan
    Write-Host "🔗 Gate.io API accessible at: http://localhost:$LOCAL_PORT" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🧪 Test the API with: node test-gateio-api.js" -ForegroundColor Yellow
    Write-Host "⚠️  To stop the tunnel, run: Stop-Process -Id $($process.Id)" -ForegroundColor Yellow
    Write-Host ""
    
    # Save process ID for later cleanup
    $process.Id | Out-File -FilePath "tunnel.pid" -Encoding ASCII
    Write-Host "📝 Process ID saved to tunnel.pid" -ForegroundColor Gray
}