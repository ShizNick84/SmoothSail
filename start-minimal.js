#!/usr/bin/env node
/**
 * Minimal AI Crypto Trading Agent Starter
 * Bypasses TypeScript compilation issues and gets core functionality running
 */

const express = require('express');
const { Client } = require('ssh2');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🚀 Starting Minimal AI Crypto Trading Agent...');
console.log('===============================================');

class MinimalTradingAgent {
  constructor() {
    this.app = express();
    this.sshConnection = null;
    this.tunnelEstablished = false;
    this.port = process.env.PORT || 3000;
    
    this.setupExpress();
    this.setupRoutes();
  }

  setupExpress() {
    this.app.use(express.json());
    this.app.use(express.static('public'));
    
    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        sshTunnel: this.tunnelEstablished,
        uptime: process.uptime()
      });
    });

    // Dashboard
    this.app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>AI Crypto Trading Agent</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0; padding: 20px; background: #0f172a; color: #e2e8f0; 
            }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 40px; }
            .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .status-card { 
              background: #1e293b; border-radius: 12px; padding: 24px; 
              border: 1px solid #334155; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .status-indicator { 
              display: inline-block; width: 12px; height: 12px; border-radius: 50%; 
              margin-right: 8px; 
            }
            .status-online { background: #10b981; }
            .status-offline { background: #ef4444; }
            .status-warning { background: #f59e0b; }
            h1 { color: #3b82f6; margin: 0; }
            h2 { color: #e2e8f0; margin: 0 0 16px 0; font-size: 18px; }
            .metric { margin: 8px 0; }
            .metric-label { color: #94a3b8; }
            .metric-value { color: #e2e8f0; font-weight: 600; }
            .refresh-btn { 
              background: #3b82f6; color: white; border: none; padding: 8px 16px; 
              border-radius: 6px; cursor: pointer; margin-top: 16px;
            }
            .refresh-btn:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤖 AI Crypto Trading Agent</h1>
              <p>Minimal Version - Core Systems Status</p>
            </div>
            
            <div class="status-grid">
              <div class="status-card">
                <h2>
                  <span class="status-indicator ${this.tunnelEstablished ? 'status-online' : 'status-offline'}"></span>
                  SSH Tunnel
                </h2>
                <div class="metric">
                  <span class="metric-label">Status:</span>
                  <span class="metric-value">${this.tunnelEstablished ? 'Connected' : 'Disconnected'}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Target:</span>
                  <span class="metric-value">api.gateio.ws:443</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Local Port:</span>
                  <span class="metric-value">8443</span>
                </div>
              </div>

              <div class="status-card">
                <h2>
                  <span class="status-indicator status-online"></span>
                  Dashboard Server
                </h2>
                <div class="metric">
                  <span class="metric-label">Status:</span>
                  <span class="metric-value">Running</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Port:</span>
                  <span class="metric-value">${this.port}</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Uptime:</span>
                  <span class="metric-value">${Math.floor(process.uptime())}s</span>
                </div>
              </div>

              <div class="status-card">
                <h2>
                  <span class="status-indicator status-warning"></span>
                  Gate.io API
                </h2>
                <div class="metric">
                  <span class="metric-label">Status:</span>
                  <span class="metric-value">Ready to Test</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Endpoint:</span>
                  <span class="metric-value">localhost:8443</span>
                </div>
                <button class="refresh-btn" onclick="testAPI()">Test API Connection</button>
              </div>

              <div class="status-card">
                <h2>
                  <span class="status-indicator status-warning"></span>
                  Trading Engine
                </h2>
                <div class="metric">
                  <span class="metric-label">Status:</span>
                  <span class="metric-value">Minimal Mode</span>
                </div>
                <div class="metric">
                  <span class="metric-label">Features:</span>
                  <span class="metric-value">SSH Tunnel, Dashboard</span>
                </div>
              </div>
            </div>

            <div style="margin-top: 40px; text-align: center; color: #64748b;">
              <p>🎉 Congratulations! Your SSH tunnel is working and the dashboard is running!</p>
              <p>Next steps: Test Gate.io API connection and gradually add trading features.</p>
            </div>
          </div>

          <script>
            async function testAPI() {
              try {
                const response = await fetch('/api/test-gateio');
                const result = await response.json();
                alert('API Test Result: ' + JSON.stringify(result, null, 2));
              } catch (error) {
                alert('API Test Failed: ' + error.message);
              }
            }

            // Auto-refresh every 30 seconds
            setTimeout(() => location.reload(), 30000);
          </script>
        </body>
        </html>
      `);
    });

    // API test endpoint
    this.app.get('/api/test-gateio', async (req, res) => {
      try {
        if (!this.tunnelEstablished) {
          return res.json({ 
            success: false, 
            error: 'SSH tunnel not established',
            message: 'Please establish SSH tunnel first'
          });
        }

        // Test Gate.io API through tunnel
        const response = await axios.get('http://localhost:8443/api/v4/spot/time', {
          headers: {
            'Host': 'api.gateio.ws',
            'User-Agent': 'AI-Crypto-Trading-Agent/1.0'
          },
          timeout: 10000
        });

        res.json({
          success: true,
          message: 'Gate.io API connection successful!',
          serverTime: response.data,
          tunnelWorking: true
        });

      } catch (error) {
        res.json({
          success: false,
          error: error.message,
          message: 'Gate.io API connection failed',
          tunnelWorking: this.tunnelEstablished
        });
      }
    });

    // System status API
    this.app.get('/api/status', (req, res) => {
      res.json({
        sshTunnel: this.tunnelEstablished,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      });
    });
  }

  async establishSSHTunnel() {
    return new Promise((resolve, reject) => {
      console.log('🔗 Establishing SSH tunnel to Oracle Cloud...');
      
      const sshConfig = {
        host: process.env.ORACLE_SSH_HOST || '168.138.104.117',
        port: 22,
        username: process.env.ORACLE_SSH_USERNAME || 'opc',
        privateKey: fs.readFileSync(process.env.SSH_PRIVATE_KEY_PATH || './keys/oracle_key', 'utf8')
      };

      this.sshConnection = new Client();
      
      this.sshConnection.on('ready', () => {
        console.log('✅ SSH connection established');
        
        // Create port forwarding
        this.sshConnection.forwardOut(
          '127.0.0.1', 8443,  // Local
          'api.gateio.ws', 443,  // Remote
          (err, stream) => {
            if (err) {
              console.error('❌ Port forwarding failed:', err.message);
              return reject(err);
            }
            
            console.log('✅ SSH tunnel established: localhost:8443 -> api.gateio.ws:443');
            this.tunnelEstablished = true;
            resolve();
          }
        );
      });

      this.sshConnection.on('error', (err) => {
        console.error('❌ SSH connection error:', err.message);
        reject(err);
      });

      console.log('🔗 Connecting to SSH server...');
      this.sshConnection.connect(sshConfig);
    });
  }

  async start() {
    try {
      // Step 1: Establish SSH tunnel
      await this.establishSSHTunnel();
      
      // Step 2: Start dashboard server
      this.app.listen(this.port, () => {
        console.log('✅ Dashboard server started');
        console.log('');
        console.log('🎉 AI Crypto Trading Agent is running!');
        console.log('📊 Dashboard: http://localhost:' + this.port);
        console.log('🔗 SSH Tunnel: localhost:8443 -> api.gateio.ws:443');
        console.log('');
        console.log('Next steps:');
        console.log('1. Open http://localhost:' + this.port + ' in your browser');
        console.log('2. Test the Gate.io API connection');
        console.log('3. Verify everything is working');
        console.log('');
      });

    } catch (error) {
      console.error('❌ Failed to start:', error.message);
      process.exit(1);
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down...');
    if (this.sshConnection) {
      this.sshConnection.end();
    }
    process.exit(0);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the minimal trading agent
const agent = new MinimalTradingAgent();
agent.start().catch(console.error);