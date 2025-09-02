#!/usr/bin/env node
/**
 * Main entry point for the AI Crypto Trading Agent
 * Handles SSH tunnel setup, dashboard startup, and trading engine initialization
 */

import { SSHTunnelManager, TunnelConfig } from './infrastructure/ssh-tunnel-manager';
import { DashboardServer } from './dashboard/dashboard-server';
import { TradingEngine } from './trading/trading-engine';
import { AIEngine } from './ai/ai-engine';
import { SecurityManager } from './security/security-manager';
import { DatabaseManager } from './core/database/database-manager';
import { Logger } from './core/logging/logger';
import { gracefulShutdown } from './core/shutdown/graceful-shutdown';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const logger = new Logger('MainApplication');

class TradingApplication {
  private sshTunnelManager: SSHTunnelManager;
  private dashboardServer: DashboardServer;
  private tradingEngine: TradingEngine;
  private aiEngine: AIEngine;
  private securityManager: SecurityManager;
  private database: DatabaseManager;
  private shutdownHandlers: Map<string, () => Promise<void>>;
  private isRunning: boolean = false;

  constructor() {
    // Initialize SSH Tunnel Manager first
    this.sshTunnelManager = new SSHTunnelManager();
    
    // Initialize other components
    this.securityManager = new SecurityManager();
    this.database = new DatabaseManager({
      type: 'postgresql',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME || 'trading_agent',
      username: process.env.DATABASE_USER || 'trading',
      password: process.env.DATABASE_PASSWORD || 'trading_secure_password_2024',
      ssl: process.env.DATABASE_SSL === 'true',
      maxConnections: parseInt(process.env.DATABASE_POOL_MAX || '10'),
      idleTimeout: parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT || '30000'),
      connectionTimeout: parseInt(process.env.DATABASE_POOL_CONNECTION_TIMEOUT || '60000')
    });
    
    this.aiEngine = new AIEngine({
      llmProvider: 'google' as any,
      modelName: process.env.GOOGLE_AI_MODEL || 'gemini-pro',
      apiKey: process.env.GOOGLE_AI_API_KEY || '',
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
      enableLearning: process.env.ENABLE_LEARNING === 'true',
      enableAnomalyDetection: process.env.ENABLE_ANOMALY_DETECTION === 'true',
      resourceLimits: {
        maxMemoryMB: parseInt(process.env.MAX_MEMORY_MB || '1024'),
        maxCpuPercent: parseInt(process.env.MAX_CPU_PERCENT || '80')
      }
    });
    
    this.tradingEngine = new TradingEngine({
      exchange: 'gateio',
      apiKey: process.env.GATE_IO_API_KEY || '',
      apiSecret: process.env.GATE_IO_API_SECRET || '',
      passphrase: process.env.GATE_IO_API_PASSPHRASE || '',
      testnet: process.env.GATE_IO_SANDBOX === 'true',
      baseUrl: 'http://localhost:8443', // This will route through SSH tunnel
      defaultStrategy: process.env.DEFAULT_STRATEGY || 'moving-average',
      riskSettings: {
        maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '1000'),
        maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS || '0.02'),
        stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENTAGE || '1'),
        takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENTAGE || '3')
      }
    });
    
    this.dashboardServer = new DashboardServer({
      port: parseInt(process.env.DASHBOARD_PORT || process.env.PORT || '3000'),
      host: process.env.DASHBOARD_HOST || process.env.HOST || '0.0.0.0',
      cors: {
        origin: this.buildCorsOrigins(),
        credentials: process.env.DASHBOARD_CORS_CREDENTIALS !== 'false'
      },
      auth: {
        enabled: process.env.DASHBOARD_AUTH_ENABLED === 'true',
        secret: process.env.JWT_SECRET || 'your-secret-key'
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
      }
    });
    
    this.shutdownHandlers = new Map();
    this.setupShutdownHandlers();
  }

  /**
   * Start the application with proper initialization order
   */
  async start(): Promise<void> {
    try {
      logger.info('🚀 Starting AI Crypto Trading Agent...');
      
      // Step 1: Initialize Security Manager
      logger.info('🔐 Initializing Security Manager...');
      await this.securityManager.initializeEncryption();
      await this.securityManager.initializeAuditLogging();
      
      // Step 2: Initialize Database
      logger.info('💾 Initializing Database...');
      await this.database.initialize();
      
      // Step 3: Setup SSH Tunnel FIRST (before any exchange connections)
      logger.info('🔗 Setting up SSH Tunnel to Gate.io...');
      await this.setupSSHTunnel();
      
      // Step 4: Initialize AI Engine
      logger.info('🤖 Initializing AI Engine...');
      await this.aiEngine.initialize();
      
      // Step 5: Initialize Trading Engine (will use SSH tunnel)
      logger.info('📈 Initializing Trading Engine...');
      await this.tradingEngine.initialize();
      
      // Step 6: Setup Dashboard with all components
      logger.info('🖥️  Starting Dashboard Server...');
      this.dashboardServer.setTradingEngine(this.tradingEngine);
      this.dashboardServer.setAIEngine(this.aiEngine);
      this.dashboardServer.setDatabase(this.database);
      this.dashboardServer.setSecurity(this.securityManager);
      
      await this.startDashboard();
      
      // Step 7: Start Trading Engine
      logger.info('▶️  Starting Trading Operations...');
      await this.tradingEngine.start();
      
      this.isRunning = true;
      logger.info('✅ AI Crypto Trading Agent is now running!');
      logger.info(`📊 Dashboard available at: http://${process.env.HOST || 'localhost'}:${process.env.PORT || '3000'}`);
      logger.info('🔗 SSH Tunnel Status:', await this.sshTunnelManager.getConnectionStatus());
      
    } catch (error) {
      logger.error('❌ Failed to start application:', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Setup SSH Tunnel to Gate.io through Oracle Cloud
   */
  private async setupSSHTunnel(): Promise<void> {
    const tunnelConfig: TunnelConfig = {
      name: 'gate-io-tunnel',
      remoteHost: 'api.gateio.ws',
      remotePort: 443,
      localPort: parseInt(process.env.SSH_TUNNEL_LOCAL_PORT || '8443'),
      sshHost: process.env.ORACLE_SSH_HOST || '168.138.104.117',
      sshPort: parseInt(process.env.ORACLE_SSH_PORT || '22'),
      sshUsername: process.env.ORACLE_SSH_USERNAME || 'opc',
      privateKeyPath: process.env.SSH_PRIVATE_KEY_PATH || '/opt/trading-agent/keys/oracle_key',
      privateKey: process.env.ORACLE_SSH_PRIVATE_KEY,
      maxRetries: parseInt(process.env.SSH_TUNNEL_MAX_RETRIES || '5'),
      retryDelay: parseInt(process.env.SSH_TUNNEL_RETRY_DELAY || '10000'),
      healthCheckInterval: parseInt(process.env.SSH_TUNNEL_HEALTH_CHECK_INTERVAL || '60000'),
      compression: process.env.SSH_TUNNEL_COMPRESSION !== 'false',
      keepAlive: process.env.SSH_TUNNEL_KEEP_ALIVE !== 'false'
    };

    logger.info('🔗 Establishing SSH tunnel...', {
      context: {
        remoteHost: tunnelConfig.remoteHost,
        remotePort: tunnelConfig.remotePort,
        localPort: tunnelConfig.localPort,
        sshHost: tunnelConfig.sshHost
      }
    });

    const connection = await this.sshTunnelManager.establishTunnel(tunnelConfig);
    
    logger.info('✅ SSH Tunnel established successfully!', {
      context: {
        connectionId: connection.id,
        localEndpoint: `localhost:${tunnelConfig.localPort}`,
        remoteEndpoint: `${tunnelConfig.remoteHost}:${tunnelConfig.remotePort}`
      }
    });

    // Set up tunnel monitoring
    this.sshTunnelManager.on('tunnelConnected', (conn) => {
      logger.info('🔗 SSH Tunnel connected:', conn.id);
    });

    this.sshTunnelManager.on('tunnelDisconnected', (conn) => {
      logger.warn('⚠️  SSH Tunnel disconnected:', conn.id);
    });

    this.sshTunnelManager.on('tunnelError', (conn, error) => {
      logger.error(`❌ SSH Tunnel error: ${conn.id}`, error);
    });
  }

  /**
   * Start the dashboard server
   */
  private async startDashboard(): Promise<void> {
    logger.info('🖥️  Starting Dashboard Server...');
    await this.dashboardServer.start();
    logger.info(`📊 Dashboard server started on http://${process.env.HOST || 'localhost'}:${process.env.PORT || '3000'}`);
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    this.shutdownHandlers.set('ssh-tunnel', async () => {
      logger.info('🔗 Closing SSH tunnels...');
      await this.sshTunnelManager.cleanup();
    });

    this.shutdownHandlers.set('trading-engine', async () => {
      logger.info('📈 Stopping trading engine...');
      await this.tradingEngine.shutdown();
    });

    this.shutdownHandlers.set('ai-engine', async () => {
      logger.info('🤖 Stopping AI engine...');
      await this.aiEngine.shutdown();
    });

    this.shutdownHandlers.set('dashboard', async () => {
      logger.info('🖥️  Stopping dashboard server...');
      await this.dashboardServer.stop();
    });

    this.shutdownHandlers.set('database', async () => {
      logger.info('💾 Closing database connection...');
      await this.database.disconnect();
    });
  }

  /**
   * Shutdown the application gracefully
   */
  async shutdown(): Promise<void> {
    if (!this.isRunning) return;
    
    logger.info('🛑 Shutting down AI Crypto Trading Agent...');
    this.isRunning = false;
    
    // Execute shutdown handlers
    for (const [name, handler] of this.shutdownHandlers) {
      try {
        await handler();
      } catch (error) {
        logger.error(`Error in shutdown handler ${name}:`, error);
      }
    }
    logger.info('✅ Application shutdown complete');
  }

  /**
   * Build CORS origins for local network access
   */
  private buildCorsOrigins(): string[] {
    const origins = [];
    
    // Add configured origins
    if (process.env.CORS_ORIGINS) {
      origins.push(...process.env.CORS_ORIGINS.split(','));
    }
    
    // Add default localhost origins
    const port = process.env.DASHBOARD_PORT || process.env.PORT || '3000';
    origins.push(`http://localhost:${port}`);
    origins.push(`http://127.0.0.1:${port}`);
    
    // Add local network patterns for Intel NUC deployment
    if (process.env.NODE_ENV === 'production') {
      // Common private network ranges
      const privateRanges = [
        '192.168.*.*',
        '10.*.*.*',
        '172.16.*.*',
        '172.17.*.*',
        '172.18.*.*',
        '172.19.*.*',
        '172.20.*.*',
        '172.21.*.*',
        '172.22.*.*',
        '172.23.*.*',
        '172.24.*.*',
        '172.25.*.*',
        '172.26.*.*',
        '172.27.*.*',
        '172.28.*.*',
        '172.29.*.*',
        '172.30.*.*',
        '172.31.*.*'
      ];
      
      for (const range of privateRanges) {
        origins.push(`http://${range}:${port}`);
        origins.push(`https://${range}:${port}`);
      }
    }
    
    return origins;
  }

  /**
   * Get application status
   */
  async getStatus(): Promise<any> {
    return {
      isRunning: this.isRunning,
      sshTunnel: await this.sshTunnelManager.getConnectionStatus(),
      tradingEngine: await this.tradingEngine.getSystemHealth(),
      aiEngine: await this.aiEngine.getSystemHealth(),
      database: await this.database.getHealth(),
      uptime: process.uptime()
    };
  }
}

// Main execution
if (require.main === module) {
  const app = new TradingApplication();
  
  // Handle process signals
  process.on('SIGINT', async () => {
    logger.info('\n🛑 Received SIGINT, shutting down gracefully...');
    await app.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    logger.info('\n🛑 Received SIGTERM, shutting down gracefully...');
    await app.shutdown();
    process.exit(0);
  });
  
  // Start the application
  app.start().catch((error) => {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  });
}

export { TradingApplication };
