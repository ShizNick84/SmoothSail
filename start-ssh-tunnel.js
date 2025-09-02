#!/usr/bin/env node
/**
 * Simple SSH Tunnel Starter for Gate.io API
 * Establishes SSH tunnel to Oracle Cloud for API routing
 * Linux/Ubuntu Server Compatible
 */

const { spawn } = require('child_process');
const { existsSync, chmodSync, constants } = require('fs');
require('dotenv').config();

console.log('🚀 Starting SSH Tunnel to Oracle Cloud...');
console.log('==========================================');

// SSH Configuration from .env
const SSH_HOST = process.env.ORACLE_SSH_HOST;
const SSH_USERNAME = process.env.ORACLE_SSH_USERNAME;
const SSH_KEY_PATH = process.env.SSH_PRIVATE_KEY_PATH;

// Validate configuration
if (!SSH_HOST || !SSH_USERNAME || !SSH_KEY_PATH) {
  console.error('❌ Missing SSH configuration in .env file:');
  console.error('   ORACLE_SSH_HOST:', SSH_HOST || 'MISSING');
  console.error('   ORACLE_SSH_USERNAME:', SSH_USERNAME || 'MISSING');
  console.error('   SSH_PRIVATE_KEY_PATH:', SSH_KEY_PATH || 'MISSING');
  process.exit(1);
}

// Check if private key exists
if (!existsSync(SSH_KEY_PATH)) {
  console.error(`❌ SSH private key not found: ${SSH_KEY_PATH}`);
  process.exit(1);
}

// Set correct permissions for SSH key (Linux requirement)
try {
  chmodSync(SSH_KEY_PATH, 0o600); // rw-------
  console.log('✅ SSH key permissions set to 600');
} catch (error) {
  console.warn('⚠️  Could not set SSH key permissions:', error.message);
}

console.log('✅ SSH Configuration:');
console.log(`   Host: ${SSH_HOST}`);
console.log(`   Username: ${SSH_USERNAME}`);
console.log(`   Key: ${SSH_KEY_PATH}`);
console.log('');

// SSH tunnel parameters
const LOCAL_PORT = 8443;
const REMOTE_HOST = 'api.gateio.ws';
const REMOTE_PORT = 443;

console.log('🔗 Tunnel Configuration:');
console.log(`   Local Port: ${LOCAL_PORT}`);
console.log(`   Remote: ${REMOTE_HOST}:${REMOTE_PORT}`);
console.log('');

// Build SSH command
const sshArgs = [
  '-N',                                    // No remote command
  '-T',                                    // No pseudo-terminal
  '-o', 'StrictHostKeyChecking=no',        // Accept new host keys
  '-o', 'UserKnownHostsFile=/dev/null',    // Don't save host keys
  '-o', 'ConnectTimeout=30',               // Connection timeout
  '-o', 'ServerAliveInterval=60',          // Keep-alive interval
  '-o', 'ServerAliveCountMax=3',           // Keep-alive max attempts
  '-i', SSH_KEY_PATH,                      // Private key
  '-L', `${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}`, // Port forwarding
  `${SSH_USERNAME}@${SSH_HOST}`            // SSH target
];

console.log('🔧 SSH Command:');
console.log(`   ssh ${sshArgs.join(' ')}`);
console.log('');

console.log('⏳ Establishing SSH tunnel...');

// Start SSH process
const sshProcess = spawn('ssh', sshArgs, {
  stdio: ['pipe', 'pipe', 'pipe']
});

let tunnelReady = false;

// Handle SSH output
sshProcess.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output) {
    console.log(`📤 SSH stdout: ${output}`);
  }
});

sshProcess.stderr.on('data', (data) => {
  const output = data.toString().trim();
  if (output) {
    console.log(`📥 SSH stderr: ${output}`);
    
    // Check for tunnel ready indicators
    if (output.includes('Local forwarding listening') || 
        output.includes('Entering interactive session')) {
      if (!tunnelReady) {
        tunnelReady = true;
        console.log('');
        console.log('✅ SSH Tunnel Established Successfully!');
        console.log('🌐 Gate.io API is now accessible via:');
        console.log(`   http://localhost:${LOCAL_PORT}`);
        console.log('');
        console.log('🧪 You can now test the API with:');
        console.log('   node test-gateio-api.js');
        console.log('');
        console.log('⚠️  Keep this terminal open to maintain the tunnel');
        console.log('   Press Ctrl+C to stop the tunnel');
      }
    }
  }
});

// Handle process events
sshProcess.on('exit', (code, signal) => {
  console.log('');
  if (code === 0) {
    console.log('✅ SSH tunnel closed gracefully');
  } else {
    console.log(`❌ SSH tunnel exited with code: ${code}, signal: ${signal}`);
  }
});

sshProcess.on('error', (error) => {
  console.error('❌ SSH tunnel error:', error.message);
  
  if (error.code === 'ENOENT') {
    console.error('💡 SSH command not found. Please install OpenSSH client.');
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('');
  console.log('⏹️  Shutting down SSH tunnel...');
  sshProcess.kill('SIGTERM');
  
  setTimeout(() => {
    if (!sshProcess.killed) {
      sshProcess.kill('SIGKILL');
    }
    process.exit(0);
  }, 5000);
});

process.on('SIGTERM', () => {
  sshProcess.kill('SIGTERM');
  process.exit(0);
});

// Wait a moment then check if tunnel is working
setTimeout(() => {
  if (!tunnelReady) {
    console.log('⏳ Still establishing connection...');
    console.log('   This may take up to 30 seconds');
  }
}, 5000);