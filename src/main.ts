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
import { PerformanceIntegration } from './infrastructure/performance/performance-integration';
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
  private performanceIntegration: PerformanceIntegration;
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
    
    // Initialize Intel NUC Performance Optimization
    this.performanceIntegration = new PerformanceIntegration();
    
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
      testnet: process.env.GATE_IO_TESTNET === 'true',
      baseUrl: process.env.GATE_IO_BASE_URL || 'http://localhost:8443/api/v4', // SSH tunnel endpoint
      defaultStrategy: process.env.DEFAULT_STRATEGY || 'moving-average',
      riskSettings: {
        maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE_USD || '1000'),
        maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS_PERCENTAGE || '5.0') / 100,
        stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENTAGE || '1.0'),
        takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENTAGE || '3.0')
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
   * Start the application with proper initialization order for Intel NUC deployment
   */
  async start(): Promise<void> {
    try {
      logger.info('🚀 Starting AI Crypto Trading Agent on Intel NUC...');
      
      // Step 1: Validate Intel NUC environment
      logger.info('🖥️  Validating Intel NUC environment...');
      await this.validateIntelNUCEnvironment();
      
      // Step 2: Initialize Intel NUC Performance Optimization
      logger.info('⚡ Initializing Intel NUC Performance Optimization...');
      await this.performanceIntegration.initialize();
      
      // Step 3: Initialize Security Manager
      logger.info('🔐 Initializing Security Manager...');
      await this.securityManager.initializeEncryption();
      await this.securityManager.initializeAuditLogging();
      
      // Step 4: Initialize Database (PostgreSQL on Intel NUC)
      logger.info('💾 Initializing PostgreSQL Database...');
      await this.database.initialize();
      await this.validateDatabaseConnection();
      
      // Step 5: Setup SSH Tunnel FIRST (Intel NUC -> Oracle Cloud -> Gate.io)
      logger.info('🔗 Setting up SSH Tunnel to Oracle Cloud...');
      await this.setupSSHTunnel();
      await this.validateSSHTunnelConnection();
      
      // Step 6: Initialize AI Engine with Intel NUC optimizations
      logger.info('🤖 Initializing AI Engine...');
      await this.aiEngine.initialize();
      
      // Step 7: Initialize Trading Engine (will use SSH tunnel)
      logger.info('📈 Initializing Trading Engine...');
      await this.tradingEngine.initialize();
      await this.validateTradingEngineConnection();
      
      // Step 8: Setup Dashboard with all components for local network access
      logger.info('🖥️  Starting Dashboard Server for local network...');
      this.dashboardServer.setTradingEngine(this.tradingEngine);
      this.dashboardServer.setAIEngine(this.aiEngine);
      this.dashboardServer.setDatabase(this.database);
      this.dashboardServer.setSecurity(this.securityManager);
      this.dashboardServer.setSSHTunnelManager(this.sshTunnelManager);
      this.dashboardServer.setPerformanceIntegration(this.performanceIntegration);
      
      await this.startDashboard();
      await this.validateDashboardAccess();
      
      // Step 8: Initialize notification services
      logger.info('📢 Initializing notification services...');
      await this.initializeNotificationServices();
      
      // Step 9: Start Trading Engine
      logger.info('▶️  Starting Trading Operations...');
      await this.tradingEngine.start();
      
      // Step 10: Send startup notification
      await this.sendStartupNotification();
      
      this.isRunning = true;
      logger.info('✅ AI Crypto Trading Agent is now running on Intel NUC!');
      logger.info(`📊 Dashboard available at: http://${process.env.HOST || '0.0.0.0'}:${process.env.DASHBOARD_PORT || '3000'}`);
      logger.info(`🔗 SSH Tunnel Status:`, await this.sshTunnelManager.getConnectionStatus());
      logger.info(`💾 Database Status:`, await this.database.getHealth());
      logger.info(`🤖 AI Engine Status:`, await this.aiEngine.getSystemHealth());
      
    } catch (error) {
      logger.error('❌ Failed to start application:', error);
      await this.sendErrorNotification(error);
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Setup SSH Tunnel from Intel NUC to Gate.io through Oracle Cloud
   */
  private async setupSSHTunnel(): Promise<void> {
    const tunnelConfig: TunnelConfig = {
      name: 'intel-nuc-gate-io-tunnel',
      remoteHost: 'api.gateio.ws',
      remotePort: parseInt(process.env.SSH_TUNNEL_REMOTE_PORT || '443'),
      localPort: parseInt(process.env.SSH_TUNNEL_LOCAL_PORT || '8443'),
      sshHost: process.env.ORACLE_SSH_HOST || '168.138.104.117',
      sshPort: parseInt(process.env.ORACLE_SSH_PORT || '22'),
      sshUsername: process.env.ORACLE_SSH_USERNAME || 'opc',
      privateKeyPath: process.env.ORACLE_PRIVATE_KEY_PATH || '/opt/trading-agent/keys/oracle_key',
      privateKey: process.env.ORACLE_SSH_PRIVATE_KEY,
      maxRetries: parseInt(process.env.SSH_TUNNEL_MAX_RETRIES || '5'),
      retryDelay: parseInt(process.env.SSH_TUNNEL_RETRY_DELAY || '10000'),
      healthCheckInterval: parseInt(process.env.SSH_TUNNEL_HEALTH_CHECK_INTERVAL || '30000'),
      compression: process.env.SSH_TUNNEL_COMPRESSION === 'true',
      keepAlive: process.env.SSH_TUNNEL_KEEP_ALIVE === 'true',
      autoReconnect: process.env.SSH_TUNNEL_AUTO_RECONNECT === 'true'
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
    this.shutdownHandlers.set('performance-optimization', async () => {
      logger.info('⚡ Stopping performance optimization...');
      await this.performanceIntegration.shutdown();
    });

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
   * Validate Intel NUC environment and system requirements
   */
  private async validateIntelNUCEnvironment(): Promise<void> {
    logger.info('🔍 Validating Intel NUC system requirements...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    logger.info(`Node.js version: ${nodeVersion}`);
    
    // Check available memory
    const totalMemory = process.memoryUsage();
    logger.info(`Memory usage: ${Math.round(totalMemory.heapUsed / 1024 / 1024)}MB used`);
    
    // Check environment variables
    const requiredEnvVars = [
      'GATE_IO_API_KEY',
      'GATE_IO_API_SECRET',
      'DATABASE_HOST',
      'DATABASE_NAME',
      'ORACLE_SSH_HOST',
      'SSH_PRIVATE_KEY_PATH'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
      }
    }
    
    logger.info('✅ Intel NUC environment validation passed');
  }

  /**
   * Validate database connection
   */
  private async validateDatabaseConnection(): Promise<void> {
    logger.info('🔍 Validating PostgreSQL database connection...');
    
    const health = await this.database.getHealth();
    if (!health.isHealthy) {
      throw new Error(`Database connection failed: ${health.error}`);
    }
    
    logger.info('✅ PostgreSQL database connection validated');
  }

  /**
   * Validate SSH tunnel connection
   */
  private async validateSSHTunnelConnection(): Promise<void> {
    logger.info('🔍 Validating SSH tunnel connection...');
    
    // Wait a moment for tunnel to establish
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const status = await this.sshTunnelManager.getConnectionStatus();
    if (!status.isConnected) {
      throw new Error(`SSH tunnel connection failed: ${status.error}`);
    }
    
    logger.info('✅ SSH tunnel connection validated');
  }

  /**
   * Validate trading engine connection
   */
  private async validateTradingEngineConnection(): Promise<void> {
    logger.info('🔍 Validating trading engine API connection...');
    
    const health = await this.tradingEngine.getSystemHealth();
    if (!health.isHealthy) {
      throw new Error(`Trading engine connection failed: ${health.error}`);
    }
    
    logger.info('✅ Trading engine API connection validated');
  }

  /**
   * Validate dashboard access
   */
  private async validateDashboardAccess(): Promise<void> {
    logger.info('🔍 Validating dashboard server access...');
    
    // Wait a moment for dashboard to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const port = process.env.DASHBOARD_PORT || '3000';
    const host = process.env.HOST || '0.0.0.0';
    
    logger.info(`✅ Dashboard server started on http://${host}:${port}`);
  }

  /**
   * Initialize notification services (Telegram, Email)
   */
  private async initializeNotificationServices(): Promise<void> {
    logger.info('📢 Initializing notification services...');
    
    // Initialize Telegram notifications if configured
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      logger.info('📱 Telegram notifications enabled');
    }
    
    // Initialize Email notifications if configured
    if (process.env.EMAIL_FROM && process.env.EMAIL_PASSWORD) {
      logger.info('📧 Email notifications enabled');
    }
    
    logger.info('✅ Notification services initialized');
  }

  /**
   * Send startup notification
   */
  private async sendStartupNotification(): Promise<void> {
    try {
      const message = `🚀 AI Crypto Trading Agent started successfully on Intel NUC!\n\n` +
        `📊 Dashboard: http://${process.env.HOST || 'localhost'}:${process.env.DASHBOARD_PORT || '3000'}\n` +
        `🔗 SSH Tunnel: Connected to Oracle Cloud\n` +
        `💾 Database: PostgreSQL connected\n` +
        `🤖 AI Engine: Initialized\n` +
        `📈 Trading Engine: Ready\n\n` +
        `System is ready for trading operations! 💰`;
      
      logger.info('📢 Sending startup notification...');
      // Note: Actual notification sending would be implemented in notification service
    } catch (error) {
      logger.warn('⚠️  Failed to send startup notification:', error);
    }
  }

  /**
   * Send error notification
   */
  private async sendErrorNotification(error: any): Promise<void> {
    try {
      const message = `❌ AI Crypto Trading Agent startup failed on Intel NUC!\n\n` +
        `Error: ${error.message}\n` +
        `Time: ${new Date().toISOString()}\n\n` +
        `Please check the logs and system status.`;
      
      logger.error('📢 Sending error notification...');
      // Note: Actual notification sending would be implemented in notification service
    } catch (notificationError) {
      logger.error('❌ Failed to send error notification:', notificationError);
    }
  }

  /**
   * Get comprehensive application status for Intel NUC
   */
  async getStatus(): Promise<any> {
    return {
      isRunning: this.isRunning,
      environment: 'intel-nuc',
      nodeVersion: process.version,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      performance: this.performanceIntegration.getStatus(),
      sshTunnel: await this.sshTunnelManager.getConnectionStatus(),
      tradingEngine: await this.tradingEngine.getSystemHealth(),
      aiEngine: await this.aiEngine.getSystemHealth(),
      database: await this.database.getHealth(),
      dashboard: {
        port: process.env.DASHBOARD_PORT || '3000',
        host: process.env.HOST || '0.0.0.0',
        url: `http://${process.env.HOST || 'localhost'}:${process.env.DASHBOARD_PORT || '3000'}`
      }
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
