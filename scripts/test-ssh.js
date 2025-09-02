#!/usr/bin/env node
/**
 * Simple SSH Connection Test
 * Tests SSH connectivity to Oracle Cloud before starting the main application
 */

const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔗 Testing SSH Connection to Oracle Cloud...');
console.log('=====================================');

const sshConfig = {
  host: process.env.ORACLE_SSH_HOST || '168.138.104.117',
  port: 22,
  username: process.env.ORACLE_SSH_USERNAME || 'opc',
};

// Try to get private key from environment or file
let privateKey;
let keySource;

// Try default locations first (most reliable)
const defaultPaths = [
  './keys/oracle_key',
  './keys/id_rsa',
  path.join(require('os').homedir(), '.ssh', 'id_rsa'),
  path.join(require('os').homedir(), '.ssh', 'id_ed25519')
];

for (const keyPath of defaultPaths) {
  if (fs.existsSync(keyPath)) {
    try {
      privateKey = fs.readFileSync(keyPath, 'utf8');
      keySource = keyPath;
      console.log('📋 Using private key from file:', keyPath);
      break;
    } catch (error) {
      console.warn('⚠️  Could not read key file:', keyPath, error.message);
    }
  }
}

// If no file found, try environment variable path
if (!privateKey && process.env.SSH_PRIVATE_KEY_PATH) {
  const keyPath = process.env.SSH_PRIVATE_KEY_PATH.replace('~', require('os').homedir());
  if (fs.existsSync(keyPath)) {
    try {
      privateKey = fs.readFileSync(keyPath, 'utf8');
      keySource = keyPath;
      console.log('📋 Using private key from env path:', keyPath);
    } catch (error) {
      console.error('❌ Could not read private key file:', keyPath, error.message);
    }
  } else {
    console.error('❌ Private key file not found:', keyPath);
  }
}

// Last resort: try environment variable (usually problematic)
if (!privateKey && process.env.ORACLE_SSH_PRIVATE_KEY) {
  const envKey = process.env.ORACLE_SSH_PRIVATE_KEY;
  if (envKey && envKey !== '"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"') {
    try {
      privateKey = envKey.replace(/\\n/g, '\n');
      keySource = 'environment variable';
      console.log('📋 Using private key from environment variable');
    } catch (error) {
      console.warn('⚠️  Could not parse private key from environment:', error.message);
    }
  }
}

if (!privateKey) {
  console.error('❌ No valid private key found!');
  console.error('');
  console.error('Please do one of the following:');
  console.error('1. Run: scripts\\setup-ssh-key.bat');
  console.error('2. Copy your Oracle Cloud private key to: ./keys/oracle_key');
  console.error('3. Set SSH_PRIVATE_KEY_PATH in .env to point to your key file');
  console.error('');
  console.error('Tried locations:', defaultPaths.join(', '));
  process.exit(1);
}

sshConfig.privateKey = privateKey;

console.log('📋 SSH Configuration:');
console.log('   Host:', sshConfig.host);
console.log('   Port:', sshConfig.port);
console.log('   Username:', sshConfig.username);
console.log('   Private Key:', privateKey ? 'Loaded ✅' : 'Missing ❌');
console.log('');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connection successful!');
  console.log('🔗 Testing port forwarding capability...');
  
  // Test port forwarding
  conn.forwardOut('127.0.0.1', 8443, 'api.gateio.ws', 443, (err, stream) => {
    if (err) {
      console.error('❌ Port forwarding test failed:', err.message);
      conn.end();
      process.exit(1);
    }
    
    console.log('✅ Port forwarding test successful!');
    console.log('🎉 SSH tunnel setup is working correctly');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: npm run build');
    console.log('2. Run: npm start');
    console.log('3. Access dashboard at: http://localhost:3000');
    
    stream.end();
    conn.end();
    process.exit(0);
  });
}).on('error', (err) => {
  console.error('❌ SSH Connection failed:', err.message);
  console.error('');
  console.error('Troubleshooting:');
  console.error('1. Check if ORACLE_SSH_HOST is correct:', sshConfig.host);
  console.error('2. Check if ORACLE_SSH_USERNAME is correct:', sshConfig.username);
  console.error('3. Verify your private key is correct and has proper permissions');
  console.error('4. Test manual SSH: ssh -i /path/to/key', sshConfig.username + '@' + sshConfig.host);
  console.error('5. Check if Oracle Cloud firewall allows SSH connections');
  process.exit(1);
});

console.log('🔗 Connecting to SSH server...');
conn.connect(sshConfig);