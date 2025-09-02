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
      this.logger.error('Failed to start Dashboard Server:', error);
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
    this.app.use(helmet());
    this.app.use(cors({
      origin: this.config.cors.origin,
      credentials: this.config.cors.credentials
    }));
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    this.app.get('/api/system/status', async (req: Request, res: Response) => {
      const status = {
        tradingEngine: this.tradingEngine?.getStatus() || null,
        aiEngine: this.aiEngine?.getStatus() || null,
        database: this.database?.getStatus() || null,
        dashboard: { isRunning: this.isRunning }
      };
      res.json({ success: true, data: status });
    });

    this.app.get('*', (req: Request, res: Response) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>AI Crypto Trading Agent</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #0f172a; color: #e2e8f0; }
            .container { max-width: 800px; margin: 0 auto; }
            .status { background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0; }
            h1 { color: #3b82f6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🤖 AI Crypto Trading Agent Dashboard</h1>
            <div class="status">
              <h3>✅ Server Running</h3>
              <p>Port: ${this.config.port}</p>
              <p>Status: Active</p>
            </div>
          </div>
        </body>
        </html>
      `);
    });
  }

  private setupWebSocket(): void {
    this.io.on('connection', (socket) => {
      this.logger.info('WebSocket client connected:', socket.id);
      
      socket.emit('welcome', {
        message: 'Connected to AI Crypto Trading Agent',
        timestamp: new Date().toISOString()
      });

      socket.on('disconnect', () => {
        this.logger.info('WebSocket client disconnected:', socket.id);
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
