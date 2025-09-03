# =============================================================================
# ERROR HANDLING TEST RUNNER (PowerShell)
# =============================================================================
# 
# Comprehensive test runner for all error handling components including
# unit tests, integration tests, performance tests, and validation scenarios.
# 
# Usage: .\scripts\test-error-handling.ps1 [options]
# Options:
#   -Unit          Run unit tests only
#   -Integration   Run integration tests only
#   -Performance   Run performance tests only
#   -All           Run all tests (default)
#   -Coverage      Generate coverage report
#   -Verbose       Verbose output
# 
# =============================================================================

param(
    [switch]$Unit,
    [switch]$Integration,
    [switch]$Performance,
    [switch]$All = $true,
    [switch]$Coverage,
    [switch]$Verbose
)

# Configuration
$TestDir = "src/core/error-handling/__tests__"
$CoverageDir = "coverage/error-handling"
$LogFile = "test-results/error-handling-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# Set test flags if running all
if ($All -and -not ($Unit -or $Integration -or $Performance)) {
    $Unit = $true
    $Integration = $true
    $Performance = $true
}

# Create directories
New-Item -ItemType Directory -Force -Path "test-results" | Out-Null
New-Item -ItemType Directory -Force -Path $CoverageDir | Out-Null

# Logging function
function Write-Log {
    param([string]$Message, [string]$Color = "White")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    
    Write-Host $Message -ForegroundColor $Color
    Add-Content -Path $LogFile -Value $logMessage
}

# Print header
function Write-Header {
    Write-Log "=============================================" "Blue"
    Write-Log "  ERROR HANDLING COMPREHENSIVE TEST SUITE  " "Blue"
    Write-Log "=============================================" "Blue"
    Write-Log ""
    Write-Log "Test Configuration:"
    Write-Log "  Unit Tests: $Unit"
    Write-Log "  Integration Tests: $Integration"
    Write-Log "  Performance Tests: $Performance"
    Write-Log "  Coverage Report: $Coverage"
    Write-Log "  Verbose Output: $Verbose"
    Write-Log ""
}

# Check prerequisites
function Test-Prerequisites {
    Write-Log "Checking prerequisites..." "Yellow"
    
    # Check if Node.js is installed
    try {
        $nodeVersion = node --version
        Write-Log "✓ Node.js version: $nodeVersion" "Green"
    }
    catch {
        Write-Log "✗ Error: Node.js is not installed" "Red"
        exit 1
    }
    
    # Check if npm is installed
    try {
        $npmVersion = npm --version
        Write-Log "✓ npm version: $npmVersion" "Green"
    }
    catch {
        Write-Log "✗ Error: npm is not installed" "Red"
        exit 1
    }
    
    # Check if Jest is available
    try {
        npm list jest | Out-Null
        Write-Log "✓ Jest is available" "Green"
    }
    catch {
        Write-Log "✗ Error: Jest is not installed. Run 'npm install' first." "Red"
        exit 1
    }
    
    Write-Log "✓ Prerequisites check passed" "Green"
    Write-Log ""
}

# Run unit tests
function Invoke-UnitTests {
    if ($Unit) {
        Write-Log "Running unit tests..." "Yellow"
        
        $jestArgs = @("--testPathPattern=error-handling.test.ts")
        
        if ($Verbose) {
            $jestArgs += "--verbose"
        }
        
        if ($Coverage) {
            $jestArgs += "--coverage"
            $jestArgs += "--coverageDirectory=$CoverageDir/unit"
        }
        
        try {
            npm test -- @jestArgs
            Write-Log "✓ Unit tests passed" "Green"
        }
        catch {
            Write-Log "✗ Unit tests failed" "Red"
            return $false
        }
        Write-Log ""
    }
    return $true
}

# Run integration tests
function Invoke-IntegrationTests {
    if ($Integration) {
        Write-Log "Running integration tests..." "Yellow"
        
        $jestArgs = @("--testPathPattern=integration-tests.ts", "--testTimeout=60000")
        
        if ($Verbose) {
            $jestArgs += "--verbose"
        }
        
        if ($Coverage) {
            $jestArgs += "--coverage"
            $jestArgs += "--coverageDirectory=$CoverageDir/integration"
        }
        
        try {
            npm test -- @jestArgs
            Write-Log "✓ Integration tests passed" "Green"
        }
        catch {
            Write-Log "✗ Integration tests failed" "Red"
            return $false
        }
        Write-Log ""
    }
    return $true
}

# Run performance tests
function Invoke-PerformanceTests {
    if ($Performance) {
        Write-Log "Running performance tests..." "Yellow"
        
        # Performance test configuration
        $performanceConfig = @{
            errorHandlingThreshold = 100
            recoveryTimeThreshold = 5000
            concurrentErrorLimit = 100
            memoryUsageLimit = "500MB"
        }
        
        $performanceConfig | ConvertTo-Json | Out-File "test-results/performance-config.json"
        
        $jestArgs = @("--testNamePattern=Performance", "--testTimeout=120000")
        
        if ($Verbose) {
            $jestArgs += "--verbose"
        }
        
        try {
            npm test -- @jestArgs
            Write-Log "✓ Performance tests passed" "Green"
        }
        catch {
            Write-Log "✗ Performance tests failed" "Red"
            return $false
        }
        Write-Log ""
    }
    return $true
}

# Validate error handling documentation
function Test-Documentation {
    Write-Log "Validating error handling documentation..." "Yellow"
    
    $docFiles = @(
        "docs/error-handling/ERROR_HANDLING_GUIDE.md"
    )
    
    foreach ($docFile in $docFiles) {
        if (Test-Path $docFile) {
            Write-Log "  ✓ Found: $docFile" "Green"
        }
        else {
            Write-Log "  ✗ Missing: $docFile" "Red"
        }
    }
    
    # Check if documentation is up to date
    $codeFiles = Get-ChildItem -Path "src/core/error-handling" -Filter "*.ts" -Recurse
    $docFiles = Get-ChildItem -Path "docs/error-handling" -Filter "*.md" -Recurse -ErrorAction SilentlyContinue
    
    if ($docFiles) {
        $lastCodeChange = ($codeFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
        $lastDocChange = ($docFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
        
        if ($lastDocChange -lt $lastCodeChange) {
            Write-Log "  ⚠ Documentation may be outdated" "Yellow"
        }
        else {
            Write-Log "  ✓ Documentation appears up to date" "Green"
        }
    }
    
    Write-Log ""
}

# Generate test report
function New-TestReport {
    Write-Log "Generating test report..." "Yellow"
    
    $reportFile = "test-results/error-handling-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').html"
    $timestamp = Get-Date
    $logContent = Get-Content $LogFile -Raw
    
    $htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>Error Handling Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .pass { color: green; }
        .fail { color: red; }
        .warn { color: orange; }
        pre { background-color: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Error Handling Test Report</h1>
        <p>Generated: $timestamp</p>
        <p>Test Configuration: Unit=$Unit, Integration=$Integration, Performance=$Performance</p>
    </div>
    
    <div class="section">
        <h2>Test Summary</h2>
        <ul>
            <li>Unit Tests: $(if ($Unit) { "Executed" } else { "Skipped" })</li>
            <li>Integration Tests: $(if ($Integration) { "Executed" } else { "Skipped" })</li>
            <li>Performance Tests: $(if ($Performance) { "Executed" } else { "Skipped" })</li>
            <li>Coverage Report: $(if ($Coverage) { "Generated" } else { "Not Generated" })</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>Test Log</h2>
        <pre>$logContent</pre>
    </div>
</body>
</html>
"@
    
    $htmlContent | Out-File -FilePath $reportFile -Encoding UTF8
    
    Write-Log "✓ Test report generated: $reportFile" "Green"
    Write-Log ""
}

# Cleanup function
function Invoke-Cleanup {
    Write-Log "Cleaning up test artifacts..." "Yellow"
    
    # Remove temporary files
    Remove-Item "test-results/performance-config.json" -ErrorAction SilentlyContinue
    
    # Archive old test results (keep last 10)
    if (Test-Path "test-results") {
        $oldLogs = Get-ChildItem "test-results/error-handling-*.log" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 10
        $oldReports = Get-ChildItem "test-results/error-handling-report-*.html" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 10
        
        $oldLogs | Remove-Item -Force -ErrorAction SilentlyContinue
        $oldReports | Remove-Item -Force -ErrorAction SilentlyContinue
    }
    
    Write-Log "✓ Cleanup completed" "Green"
}

# Main execution
function Main {
    try {
        Write-Header
        
        Test-Prerequisites
        
        $exitCode = 0
        
        # Run tests
        if (-not (Invoke-UnitTests)) { $exitCode = 1 }
        if (-not (Invoke-IntegrationTests)) { $exitCode = 1 }
        if (-not (Invoke-PerformanceTests)) { $exitCode = 1 }
        
        # Additional validations
        Test-Documentation
        
        # Generate reports
        if ($Coverage) {
            Write-Log "Coverage reports generated in: $CoverageDir" "Yellow"
        }
        
        New-TestReport
        
        # Final summary
        if ($exitCode -eq 0) {
            Write-Log "=============================================" "Green"
            Write-Log "  ALL ERROR HANDLING TESTS PASSED! ✓      " "Green"
            Write-Log "=============================================" "Green"
        }
        else {
            Write-Log "=============================================" "Red"
            Write-Log "  SOME ERROR HANDLING TESTS FAILED! ✗     " "Red"
            Write-Log "=============================================" "Red"
        }
        
        exit $exitCode
    }
    finally {
        Invoke-Cleanup
    }
}

# Run main function
Main