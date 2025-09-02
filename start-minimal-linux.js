#!/usr/bin/env node
/**
 * Minimal Linux-compatible startup script for AI Crypto Trading Agent
 * Establishes SSH tunnel and starts basic dashboard
 */

const { spawn, exec } = require('child_process');
const { existsSync, chmodSync } = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🚀 AI Crypto Trading Agent - Linux Minimal Start');
console.log('================================================');

// Configuration
const SSH_HOST = process.env.ORACLE_SSH_HOST;
const SSH_USERNAME = process.env.ORACLE_SSH_USERNAME;
const SSH_KEY_PATH = process.env.SSH_PRIVATE_KEY_PATH;
const LOCAL_PORT = 8443;
const REMOTE_HOST = 'api.gateio.ws';
const REMOTE_PORT = 443;

// Validate configuration
if (!SSH_HOST || !SSH_USERNAME || !SSH_KEY_PATH) {
  console.error('❌ Missing SSH configuration in .env file');
  process.exit(1);
}

if (!existsSync(SSH_KEY_PATH)) {
  console.error(`❌ SSH private key not found: ${SSH_KEY_PATH}`);
  process.exit(1);
}

// Set SSH key permissions (Linux requirement)
try {
  chmodSync(SSH_KEY_PATH, 0o600);
  console.log('✅ SSH key permissions set to 600');
} catch (error) {
  console.warn('⚠️  Could not set SSH key permissions:', error.message);
}

let sshProcess = null;
let dashboardProcess = null;

// Cleanup function
function cleanup() {
  console.log('\n⏹️  Shutting down...');
  
  if (sshProcess) {
    console.log('   Stopping SSH tunnel...');
    sshProcess.kill('SIGTERM');
  }
  
  if (dashboardProcess) {
    console.log('   Stopping dashboard...');
    dashboardProcess.kill('SIGTERM');
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 2000);
}

// Handle shutdown signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

async function startSSHTunnel() {
  return new Promise((resolve, reject) => {
    console.log('🔗 Starting SSH tunnel...');
    
    const sshArgs = [
      '-N', '-T',
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'UserKnownHostsFile=/dev/null',
      '-o', 'ConnectTimeout=30',
      '-o', 'ServerAliveInterval=60',
      '-o', 'ServerAliveCountMax=3',
      '-o', 'ExitOnForwardFailure=yes',
      '-i', SSH_KEY_PATH,
      '-L', `${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}`,
      `${SSH_USERNAME}@${SSH_HOST}`
    ];

    sshProcess = spawn('ssh', sshArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let tunnelReady = false;

    sshProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output && !output.includes('Warning: Permanently added')) {
        console.log(`   SSH: ${output}`);
      }
      
      // Check for connection success
      if ((output.includes('Local forwarding listening') || 
           output.includes('Entering interactive session')) && !tunnelReady) {
        tunnelReady = true;
        console.log('✅ SSH tunnel established');
        resolve();
      }
    });

    sshProcess.on('exit', (code, signal) => {
      if (!tunnelReady) {
        reject(new Error(`SSH tunnel failed to start (code: ${code}, signal: ${signal})`));
      } else {
        console.log('⚠️  SSH tunnel disconnected');
      }
    });

    sshProcess.on('error', (error) => {
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!tunnelReady) {
        reject(new Error('SSH tunnel connection timeout'));
      }
    }, 30000);
  });
}

function checkPortListening(port) {
  return new Promise((resolve) => {
    exec(`netstat -tuln | grep :${port}`, (error, stdout) => {
      resolve(!error && stdout.trim().length > 0);
    });
  });
}

async function startDashboard() {
  console.log('🌐 Starting dashboard...');
  
  // Check if Next.js dashboard exists
  const dashboardPath = path.join(__dirname, 'src', 'dashboard');
  if (existsSync(dashboardPath)) {
    dashboardProcess = spawn('npm', ['run', 'dashboard:dev'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });

    dashboardProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output.includes('Ready') || output.includes('started server')) {
        console.log('✅ Dashboard started at http://localhost:3000');
      }
    });

    dashboardProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output && !output.includes('warn')) {
        console.log(`   Dashboard: ${output}`);
      }
    });
  } else {
    console.log('⚠️  Dashboard not found, starting simple HTTP server...');
    
    // Create simple HTTP server
    const http = require('http');
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>AI Crypto Trading Agent</title></head>
          <body style="font-family: Arial, sans-serif; margin: 40px;">
            <h1>🤖 AI Crypto Trading Agent</h1>
            <h2>Status Dashboard</h2>
            <div style="background: #f0f0f0; padding: 20px; border-radius: 8px;">
              <p><strong>✅ SSH Tunnel:</strong> Active (localhost:${LOCAL_PORT})</p>
              <p><strong>🔗 Target:</strong> ${REMOTE_HOST}:${REMOTE_PORT}</p>
              <p><strong>🌐 Dashboard:</strong> Running on port 3000</p>
              <p><strong>⏰ Started:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <h3>API Test</h3>
            <button onclick="testAPI()" style="padding: 10px 20px; font-size: 16px;">Test Gate.io API</button>
            <div id="result" style="margin-top: 20px; padding: 10px; background: #f9f9f9;"></div>
            <script>
              async function testAPI() {
                const result = document.getElementById('result');
                result.innerHTML = 'Testing API...';
                try {
                  const response = await fetch('/api/test');
                  const data = await response.text();
                  result.innerHTML = '<pre>' + data + '</pre>';
                } catch (error) {
                  result.innerHTML = 'Error: ' + error.message;
                }
              }
            </script>
          </body>
        </html>
      `);
    });

    server.listen(3000, () => {
      console.log('✅ Simple dashboard started at http://localhost:3000');
    });
  }
}

async function main() {
  try {
    // Start SSH tunnel
    await startSSHTunnel();
    
    // Wait a moment for tunnel to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify tunnel is working
    const isListening = await checkPortListening(LOCAL_PORT);
    if (!isListening) {
      throw new Error(`Port ${LOCAL_PORT} is not listening`);
    }
    
    console.log(`✅ Tunnel verified - port ${LOCAL_PORT} is listening`);
    
    // Start dashboard
    await startDashboard();
    
    console.log('\n🎉 System Ready!');
    console.log('================');
    console.log(`🔗 SSH Tunnel: localhost:${LOCAL_PORT} -> ${REMOTE_HOST}:${REMOTE_PORT}`);
    console.log('🌐 Dashboard: http://localhost:3000');
    console.log('🧪 Test API: node test-gateio-api.js');
    console.log('\n⚠️  Keep this process running to maintain the tunnel');
    console.log('   Press Ctrl+C to stop');
    
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    cleanup();
    process.exit(1);
  }
}

// Start the application
main().catch(console.error);