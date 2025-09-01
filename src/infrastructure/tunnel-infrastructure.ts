import { EventEmitter } from 'events';
import { Logger } from '../core/logging/logger';
import { EncryptionService } from '../security/encryption-service';
import { SSHTunnelManager, TunnelConfig } from './ssh-tunnel-manager';
import { TunnelHealthMonitor, HealthMonitorConfig } from './tunnel-health-monitor';
import { TunnelStateTracker } from './tunnel-state-tracker';
import { TunnelAutoReconnect, ReconnectionConfig } from './tunnel-auto-reconnect';
import { TunnelLoadBalancer, TunnelPoolConfig, LoadBalancingStrategy } from './tunnel-load-balancer';
import { TunnelFailoverManager, FailoverConfig } from './tunnel-failover-manager';
import { TunnelSecurityMonitor, SecurityMonitorConfig } from './tunnel-security-monitor';
import { TunnelPerformanceAnalytics, AnalyticsConfig } from './tunnel-performance-analytics';

/**
 * Tunnel infrastructure configuration
 */
export interface TunnelInfrastructureConfig {
  /** SSH tunnel configurations */
  tunnelConfigs: Partial<TunnelConfig>[];
  /** Health monitoring configuration */
  healthMonitor?: Partial<HealthMonitorConfig>;
  /** Auto-reconnection configuration */
  autoReconnect?: Partial<ReconnectionConfig>;
  /** Load balancing configuration */
  loadBalancer?: Partial<TunnelPoolConfig>;
  /** Failover configuration */
  failover?: Partial<FailoverConfig>;
  /** Security monitoring configuration */
  security?: Partial<SecurityMonitorConfig>;
  /** Performance analytics configuration */
  analytics?: Partial<AnalyticsConfig>;
  /** Enable all monitoring by default */
  enableMonitoring?: boolean;
}

/**
 * Tunnel Infrastructure Manager
 * Orchestrates all SSH tunnel components for Oracle Free Tier integration
 */
export class TunnelInfrastructure extends EventEmitter {
  private logger: Logger;
  private encryptionService: EncryptionService;
  private config: TunnelInfrastructureConfig;

  // Core components
  private tunnelManager: SSHTunnelManager;
  private healthMonitor: TunnelHealthMonitor;
  private stateTracker: TunnelStateTracker;
  private autoReconnect: TunnelAutoReconnect;
  private loadBalancer: TunnelLoadBalancer;
  private failoverManager: TunnelFailoverManager;
  private securityMonitor: TunnelSecurityMonitor;
  private performanceAnalytics: TunnelPerformanceAnalytics;

  private isInitialized: boolean = false;
  private isRunning: boolean = false;

  constructor(
    logger: Logger,
    encryptionService: EncryptionService,
    config: TunnelInfrastructureConfig
  ) {
    super();
    this.logger = logger;
    this.encryptionService = encryptionService;
    this.config = {
      enableMonitoring: true,
      ...config
    };

    this.initializeComponents();
    this.logger.info('Tunnel Infrastructure Manager created');
  }

  /**
   * Initialize all tunnel infrastructure components
   */
  private initializeComponents(): void {
    // Core tunnel manager
    this.tunnelManager = new SSHTunnelManager(this.logger, this.encryptionService);

    // State tracking
    this.stateTracker = new TunnelStateTracker(this.logger);

    // Health monitoring
    this.healthMonitor = new TunnelHealthMonitor(
      this.logger,
      this.tunnelManager,
      this.stateTracker,
      this.config.healthMonitor
    );

    // Auto-reconnection
    this.autoReconnect = new TunnelAutoReconnect(
      this.logger,
      this.tunnelManager,
      this.healthMonitor,
      this.stateTracker,
      this.config.autoReconnect
    );

    // Load balancing
    this.loadBalancer = new TunnelLoadBalancer(
      this.logger,
      this.tunnelManager,
      this.healthMonitor,
      this.stateTracker,
      this.config.loadBalancer
    );

    // Failover management
    this.failoverManager = new TunnelFailoverManager(
      this.logger,
      this.tunnelManager,
      this.healthMonitor,
      this.loadBalancer,
      this.autoReconnect,
      this.config.failover
    );

    // Security monitoring
    this.securityMonitor = new TunnelSecurityMonitor(
      this.logger,
      this.tunnelManager,
      this.encryptionService,
      this.config.security
    );

    // Performance analytics
    this.performanceAnalytics = new TunnelPerformanceAnalytics(
      this.logger,
      this.tunnelManager,
      this.healthMonitor,
      this.stateTracker,
      this.config.analytics
    );

    this.setupEventForwarding();
    this.isInitialized = true;
    this.logger.info('All tunnel infrastructure components initialized');
  }

  /**
   * Start the tunnel infrastructure
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Tunnel infrastructure not initialized');
    }

    if (this.isRunning) {
      this.logger.warn('Tunnel infrastructure is already running');
      return;
    }

    try {
      this.logger.info('Starting tunnel infrastructure...');

      // Create and establish tunnel connections
      await this.createTunnelConnections();

      // Start monitoring components if enabled
      if (this.config.enableMonitoring) {
        await this.startMonitoring();
      }

      // Enable load balancing and failover
      this.loadBalancer.enable();
      await this.failoverManager.enable();

      // Enable auto-reconnection
      this.autoReconnect.enable();

      this.isRunning = true;
      this.logger.info('Tunnel infrastructure started successfully');
      this.emit('infrastructureStarted');

    } catch (error) {
      this.logger.error('Failed to start tunnel infrastructure', error);
      throw error;
    }
  }

  /**
   * Stop the tunnel infrastructure
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Tunnel infrastructure is not running');
      return;
    }

    try {
      this.logger.info('Stopping tunnel infrastructure...');

      // Disable auto-reconnection
      this.autoReconnect.disable();

      // Disable load balancing and failover
      this.loadBalancer.disable();
      await this.failoverManager.disable();

      // Stop monitoring components
      if (this.config.enableMonitoring) {
        await this.stopMonitoring();
      }

      // Cleanup tunnel connections
      await this.tunnelManager.cleanup();

      this.isRunning = false;
      this.logger.info('Tunnel infrastructure stopped successfully');
      this.emit('infrastructureStopped');

    } catch (error) {
      this.logger.error('Failed to stop tunnel infrastructure', error);
      throw error;
    }
  }

  /**
   * Get tunnel manager instance
   */
  getTunnelManager(): SSHTunnelManager {
    return this.tunnelManager;
  }

  /**
   * Get health monitor instance
   */
  getHealthMonitor(): TunnelHealthMonitor {
    return this.healthMonitor;
  }

  /**
   * Get state tracker instance
   */
  getStateTracker(): TunnelStateTracker {
    return this.stateTracker;
  }

  /**
   * Get auto-reconnect instance
   */
  getAutoReconnect(): TunnelAutoReconnect {
    return this.autoReconnect;
  }

  /**
   * Get load balancer instance
   */
  getLoadBalancer(): TunnelLoadBalancer {
    return this.loadBalancer;
  }

  /**
   * Get failover manager instance
   */
  getFailoverManager(): TunnelFailoverManager {
    return this.failoverManager;
  }

  /**
   * Get security monitor instance
   */
  getSecurityMonitor(): TunnelSecurityMonitor {
    return this.securityMonitor;
  }

  /**
   * Get performance analytics instance
   */
  getPerformanceAnalytics(): TunnelPerformanceAnalytics {
    return this.performanceAnalytics;
  }

  /**
   * Get infrastructure status
   */
  getStatus(): {
    isInitialized: boolean;
    isRunning: boolean;
    tunnelCount: number;
    activeTunnels: number;
    systemHealth: any;
    securityMetrics: any;
  } {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      tunnelCount: this.tunnelManager.getAllConnections().length,
      activeTunnels: this.tunnelManager.getActiveConnections().length,
      systemHealth: this.healthMonitor.getSystemHealthStatus(),
      securityMetrics: this.securityMonitor.getSecurityMetrics()
    };
  }

  /**
   * Create tunnel connections from configuration
   */
  private async createTunnelConnections(): Promise<void> {
    this.logger.info(`Creating ${this.config.tunnelConfigs.length} tunnel connections`);

    const connectionPromises = this.config.tunnelConfigs.map(async (tunnelConfig, index) => {
      try {
        // Create tunnel connection
        const connection = await this.tunnelManager.createTunnel(tunnelConfig);
        
        // Establish connection
        await this.tunnelManager.establishTunnel(connection.id);
        
        // Add to failover management as primary tunnel
        this.failoverManager.addPrimaryTunnel(connection.id);

        this.logger.info(`Tunnel connection ${index + 1} established: ${connection.id}`);
        return connection;

      } catch (error) {
        this.logger.error(`Failed to create tunnel connection ${index + 1}`, error);
        throw error;
      }
    });

    await Promise.all(connectionPromises);
    this.logger.info('All tunnel connections established successfully');
  }

  /**
   * Start monitoring components
   */
  private async startMonitoring(): Promise<void> {
    this.logger.info('Starting monitoring components...');

    // Start health monitoring
    this.healthMonitor.startMonitoring();

    // Start security monitoring
    this.securityMonitor.startMonitoring();

    // Start performance analytics
    this.performanceAnalytics.startCollection();

    this.logger.info('All monitoring components started');
  }

  /**
   * Stop monitoring components
   */
  private async stopMonitoring(): Promise<void> {
    this.logger.info('Stopping monitoring components...');

    // Stop performance analytics
    this.performanceAnalytics.stopCollection();

    // Stop security monitoring
    this.securityMonitor.stopMonitoring();

    // Stop health monitoring
    this.healthMonitor.stopMonitoring();

    this.logger.info('All monitoring components stopped');
  }

  /**
   * Setup event forwarding from components
   */
  private setupEventForwarding(): void {
    // Forward tunnel manager events
    this.tunnelManager.on('tunnelConnected', (connection) => {
      this.emit('tunnelConnected', connection);
    });

    this.tunnelManager.on('tunnelDisconnected', (connection) => {
      this.emit('tunnelDisconnected', connection);
    });

    this.tunnelManager.on('tunnelError', (connection, error) => {
      this.emit('tunnelError', connection, error);
    });

    // Forward health monitor events
    this.healthMonitor.on('connectionUnhealthy', (connection, metrics) => {
      this.emit('connectionUnhealthy', connection, metrics);
    });

    this.healthMonitor.on('connectionHealthy', (connection, metrics) => {
      this.emit('connectionHealthy', connection, metrics);
    });

    // Forward security monitor events
    this.securityMonitor.on('securityEvent', (event) => {
      this.emit('securityEvent', event);
    });

    this.securityMonitor.on('highThreatDetected', (event) => {
      this.emit('highThreatDetected', event);
    });

    // Forward failover events
    this.failoverManager.on('failoverSuccessful', (event, selection) => {
      this.emit('failoverSuccessful', event, selection);
    });

    this.failoverManager.on('failoverFailed', (event) => {
      this.emit('failoverFailed', event);
    });

    // Forward performance analytics events
    this.performanceAnalytics.on('performanceAlert', (alert) => {
      this.emit('performanceAlert', alert);
    });

    this.performanceAnalytics.on('reportGenerated', (report) => {
      this.emit('reportGenerated', report);
    });
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.isRunning) {
        await this.stop();
      }

      // Cleanup all components
      await this.tunnelManager.cleanup();
      this.healthMonitor.cleanup();
      this.stateTracker.clearAllHistory();
      this.autoReconnect.cleanup();
      this.loadBalancer.cleanup();
      await this.failoverManager.cleanup();
      this.securityMonitor.cleanup();
      this.performanceAnalytics.cleanup();

      this.logger.info('Tunnel infrastructure cleanup completed');

    } catch (error) {
      this.logger.error('Error during tunnel infrastructure cleanup', error);
      throw error;
    }
  }
}

/**
 * Factory function to create tunnel infrastructure with Oracle Free Tier defaults
 */
export function createOracleTunnelInfrastructure(
  logger: Logger,
  encryptionService: EncryptionService,
  customConfig?: Partial<TunnelInfrastructureConfig>
): TunnelInfrastructure {
  const defaultConfig: TunnelInfrastructureConfig = {
    tunnelConfigs: [
      {
        oracleIP: '168.138.104.117',
        sshPort: 22,
        username: process.env.ORACLE_SSH_USERNAME || 'ubuntu',
        privateKeyPath: process.env.ORACLE_SSH_KEY_PATH || '~/.ssh/oracle_key',
        localPort: 8080,
        remotePort: 3000,
        keepAlive: true,
        compression: true,
        connectionTimeout: 30,
        serverAliveInterval: 60,
        serverAliveCountMax: 3
      }
    ],
    healthMonitor: {
      checkInterval: 30000,
      maxLatency: 1000,
      maxPacketLoss: 5,
      minThroughput: 1024,
      failureThreshold: 3
    },
    autoReconnect: {
      enabled: true,
      initialRetryDelay: 5000,
      maxRetryDelay: 300000,
      maxRetryAttempts: 10,
      backoffMultiplier: 2
    },
    loadBalancer: {
      minActiveTunnels: 1,
      maxActiveTunnels: 3,
      strategy: LoadBalancingStrategy.HEALTH_BASED,
      enableFailover: true,
      enableDynamicWeights: true
    },
    failover: {
      enabled: true,
      minBackupTunnels: 1,
      maxFailoverAttempts: 3,
      enableProactiveBackups: true
    },
    security: {
      enableTrafficMonitoring: true,
      enableIntrusionDetection: true,
      enableDataIntegrityChecking: true,
      enableAutoResponse: true
    },
    analytics: {
      collectionInterval: 60000,
      enableTrendAnalysis: true,
      enablePerformanceAlerts: true,
      enableAutoReporting: true
    },
    enableMonitoring: true
  };

  const mergedConfig = {
    ...defaultConfig,
    ...customConfig,
    tunnelConfigs: customConfig?.tunnelConfigs || defaultConfig.tunnelConfigs
  };

  return new TunnelInfrastructure(logger, encryptionService, mergedConfig);
}