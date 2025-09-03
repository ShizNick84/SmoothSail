/**
 * AI CRYPTO TRADING AGENT - DASHBOARD SERVER
 * Express.js server with WebSocket for real-time trading dashboard
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer, Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { Logger } from '../core/logging/logger';

export interface DashboardServerConfig {
  port: number;
  host: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  auth: {
    enabled: boolean;
    secret: string;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

export class DashboardServer {
  private logger: Logger;
  private config: DashboardServerConfig;
  private app: Express;
  private server: Server;
  private io: SocketIOServer;
  private tradingEngine: any = null;
  private aiEngine: any = null;
  private database: any = null;
  private security: any = null;
  private isRunning: boolean = false;

  constructor(config: DashboardServerConfig) {
    this.logger = new Logger('DashboardServer');
    this.config = config;
    
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.cors.origin,
        credentials: config.cors.credentials
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  setTradingEngine(tradingEngine: any): void {
    this.tradingEngine = tradingEngine;
  }

  setAIEngine(aiEngine: any): void {
    this.aiEngine = aiEngine;
  }

  setDatabase(database: any): void {
    this.database = database;
  }

  setSecurity(security: any): void {
    this.security = security;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      await new Promise<void>((resolve, reject) => {
        this.server.listen(this.config.port, this.config.host, () => {
          this.isRunning = true;
          this.logger.info(`Dashboard Server started on http://${this.config.host}:${this.config.port}`);
          resolve();
        });
        this.server.on('error', reject);
      });
    } catch (error) {
      this.logger.error('Failed to start Dashboard Server:', error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.io.close();
    await new Promise<void>((resolve) => {
      this.server.close(() => {
        this.isRunning = false;
        resolve();
      });
    });
  }

  private setupMiddleware(): void {
    // Configure Helmet for local network access
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    // Configure CORS for local network access
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        // Check if origin matches configured patterns
        const allowedOrigins = this.config.cors.origin;
        const isAllowed = allowedOrigins.some(allowedOrigin => {
          if (allowedOrigin === '*') return true;
          if (allowedOrigin === origin) return true;
          
          // Support wildcard patterns for local networks
          if (allowedOrigin.includes('*')) {
            const pattern = allowedOrigin.replace(/\*/g, '.*');
            const regex = new RegExp(`^${pattern}$`);
            return regex.test(origin);
          }
          
          return false;
        });
        
        if (isAllowed) {
          callback(null, true);
        } else {
          this.logger.warn(`CORS blocked origin: ${origin}`);
          callback(null, false);
        }
      },
      credentials: this.config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Add request logging for debugging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      this.logger.debug(`${req.method} ${req.path}`, {
        context: {
          origin: req.get('Origin'),
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        host: this.config.host,
        port: this.config.port
      });
    });

    // System status API
    this.app.get('/api/system/status', async (req: Request, res: Response) => {
      try {
        const status = {
          tradingEngine: this.tradingEngine?.getStatus() || null,
          aiEngine: this.aiEngine?.getStatus() || null,
          database: this.database?.getStatus() || null,
          dashboard: { 
            isRunning: this.isRunning,
            host: this.config.host,
            port: this.config.port,
            corsOrigins: this.config.cors.origin
          },
          network: {
            clientIP: req.ip,
            origin: req.get('Origin'),
            userAgent: req.get('User-Agent')
          }
        };
        res.json({ success: true, data: status });
      } catch (error) {
        this.logger.error('Error getting system status:', error as Error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    });

    // Network info endpoint for debugging
    this.app.get('/api/network/info', (req: Request, res: Response) => {
      const networkInfo = {
        serverHost: this.config.host,
        serverPort: this.config.port,
        clientIP: req.ip,
        origin: req.get('Origin'),
        userAgent: req.get('User-Agent'),
        headers: req.headers,
        corsOrigins: this.config.cors.origin,
        timestamp: new Date().toISOString()
      };
      res.json({ success: true, data: networkInfo });
    });

    // Main dashboard page
    this.app.get('*', (req: Request, res: Response) => {
      const clientIP = req.ip;
      const origin = req.get('Origin') || 'Direct access';
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>AI Crypto Trading Agent - Intel NUC</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              margin: 0; padding: 20px; 
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); 
              color: #e2e8f0; 
              min-height: 100vh;
            }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 40px; }
            .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .status-card { 
              background: rgba(30, 41, 59, 0.8); 
              padding: 24px; 
              border-radius: 12px; 
              border: 1px solid rgba(59, 130, 246, 0.2);
              backdrop-filter: blur(10px);
            }
            .status-card h3 { color: #3b82f6; margin-top: 0; }
            .status-indicator { 
              display: inline-block; 
              width: 12px; 
              height: 12px; 
              border-radius: 50%; 
              background: #10b981; 
              margin-right: 8px;
            }
            .network-info { font-size: 0.9em; opacity: 0.8; }
            .api-links { margin-top: 20px; }
            .api-links a { 
              color: #60a5fa; 
              text-decoration: none; 
              margin-right: 15px;
              padding: 8px 12px;
              background: rgba(59, 130, 246, 0.1);
              border-radius: 6px;
              border: 1px solid rgba(59, 130, 246, 0.2);
            }
            .api-links a:hover { background: rgba(59, 130, 246, 0.2); }
            @media (max-width: 768px) {
              .status-grid { grid-template-columns: 1fr; }
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤖 AI Crypto Trading Agent</h1>
              <p>Intel NUC Deployment - Local Network Dashboard</p>
            </div>
            
            <div class="status-grid">
              <div class="status-card">
                <h3><span class="status-indicator"></span>Dashboard Server</h3>
                <p><strong>Status:</strong> Running</p>
                <p><strong>Host:</strong> ${this.config.host}</p>
                <p><strong>Port:</strong> ${this.config.port}</p>
                <p><strong>Started:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <div class="status-card">
                <h3>🌐 Network Information</h3>
                <p><strong>Your IP:</strong> ${clientIP}</p>
                <p><strong>Origin:</strong> ${origin}</p>
                <p><strong>Access URL:</strong> http://${req.get('host')}</p>
                <div class="network-info">
                  <p>This dashboard is accessible from any device on your local network.</p>
                </div>
              </div>
              
              <div class="status-card">
                <h3>🔗 SSH Tunnel</h3>
                <p><strong>Target:</strong> Oracle Cloud → Gate.io API</p>
                <p><strong>Local Port:</strong> 8443</p>
                <p><strong>Status:</strong> <span id="tunnel-status">Checking...</span></p>
              </div>
              
              <div class="status-card">
                <h3>💾 Database</h3>
                <p><strong>Type:</strong> PostgreSQL</p>
                <p><strong>Host:</strong> localhost:5432</p>
                <p><strong>Status:</strong> <span id="db-status">Checking...</span></p>
              </div>
            </div>
            
            <div class="status-card">
              <h3>🔧 API Endpoints</h3>
              <div class="api-links">
                <a href="/health" target="_blank">Health Check</a>
                <a href="/api/system/status" target="_blank">System Status</a>
                <a href="/api/network/info" target="_blank">Network Info</a>
              </div>
            </div>
          </div>
          
          <script>
            // Auto-refresh status indicators
            async function updateStatus() {
              try {
                const response = await fetch('/api/system/status');
                const data = await response.json();
                
                if (data.success) {
                  document.getElementById('tunnel-status').textContent = 'Connected';
                  document.getElementById('db-status').textContent = 'Connected';
                } else {
                  document.getElementById('tunnel-status').textContent = 'Error';
                  document.getElementById('db-status').textContent = 'Error';
                }
              } catch (error) {
                document.getElementById('tunnel-status').textContent = 'Unknown';
                document.getElementById('db-status').textContent = 'Unknown';
              }
            }
            
            // Update status on load and every 30 seconds
            updateStatus();
            setInterval(updateStatus, 30000);
          </script>
        </body>
        </html>
      `);
    });
  }

  private setupWebSocket(): void {
    this.io.on('connection', (socket) => {
      this.logger.info('WebSocket client connected:', { context: { socketId: socket.id } });
      
      socket.emit('welcome', {
        message: 'Connected to AI Crypto Trading Agent',
        timestamp: new Date().toISOString()
      });

      socket.on('disconnect', () => {
        this.logger.info('WebSocket client disconnected:', { context: { socketId: socket.id } });
      });
    });
  }

  getStatus(): any {
    return {
      isRunning: this.isRunning,
      port: this.config.port,
      timestamp: Date.now()
    };
  }
}

export default DashboardServer;
