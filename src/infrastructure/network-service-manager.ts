/**
 * =============================================================================
 * NETWORK SERVICE MANAGER WITH COMPREHENSIVE ERROR HANDLING
 * =============================================================================
 * 
 * Manages all network services including SSH tunnels, database connections,
 * and API endpoints with integrated error handling and auto-recovery.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { Logger } from '../core/logging/logger';
import { NetworkErrorHandler, SSHTunnelConfig, DatabaseConfig } from '../core/error-handling/network-error-handler';
import { SystemErrorManager, SystemComponent } from '../core/error-handling/system-error-manager';

export interface ServiceConfig {
  ssh: {
    gateio: SSHTunnelConfig;
  };
  database: DatabaseConfig;
  monitoring: {
    healthCheckInterval: number;
    reconnectionDelay: number;
    maxReconnectionAttempts: number;
  };
}

export interface ServiceStatus {
  name: string;
  type: string;
  status: 'healthy' | 'unhealthy' | 'recovering' | 'failed';
  lastCheck: Date;
  uptime: number;
  errorCount: number;
  lastError?: string;
}

export class NetworkServiceManager extends EventEmitter {
  private logger: Logger;
  private networkErrorHandler: NetworkErrorHandler;
  private systemErrorManager: SystemErrorManager;
  private config: ServiceConfig;
  private isInitialized: boolean = false;
  private services: Map<string, ServiceStatus> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(config: ServiceConfig) {
    super();
    this.logger = new Logger('NetworkServiceManager');
    this.networkErrorHandler = new NetworkErrorHandler();
    this.systemErrorManager = new SystemErrorManager();
    this.config = config;
    this.setupErrorHandling();
  }

  /**
   * Initialize all network services
   */
  async initialize(): Promise<boolean> {
    try {
      this.logger.info('🌐 Initializing Network Service Manager...');

      // Initialize service status tracking
      this.initializeServiceStatus();

      // Setup SSH tunnels
      const sshSuccess = await this.setupSSHTunnels();
      if (!sshSuccess) {
        throw new Error('Failed to setup SSH tunnels');
      }

      // Initialize database connections
      const dbSuccess = await this.initializeDatabaseConnections();
      if (!dbSuccess) {
        throw new Error('Failed to initialize database connections');
      }

      // Start monitoring
      this.startServiceMonitoring();

      this.isInitialized = true;
      this.logger.info('✅ Network Service Manager initialized successfully');

      return true;

    } catch (error) {
      this.logger.error('❌ Failed to initialize Network Service Manager:', error);
      
      await this.systemErrorManager.handleComponentError(SystemComponent.NETWORK_INFRASTRUCTURE, {
        type: 'INITIALIZATION_FAILED',
        severity: 'CRITICAL',
        message: 'Network Service Manager initialization failed',
        details: { error: error.message }
      });

      return false;
    }
  }

  /**
   * Setup SSH tunnels with error handling
   */
  private async setupSSHTunnels(): Promise<boolean> {
    try {
      this.logger.info('🔐 Setting up SSH tunnels...');

      // Setup Gate.io SSH tunnel
      const gateioTunnelSuccess = await this.networkErrorHandler.setupSSHTunnel(this.config.ssh.gateio);
      
      if (gateioTunnelSuccess) {
        this.updateServiceStatus('gate-io-tunnel', 'healthy');
        this.logger.info('✅ Gate.io SSH tunnel established');
      } else {
        this.updateServiceStatus('gate-io-tunnel', 'failed');
        throw new Error('Failed to establish Gate.io SSH tunnel');
      }

      return true;

    } catch (error) {
      this.logger.error('❌ SSH tunnel setup failed:', error);
      
      await this.systemErrorManager.handleComponentError(SystemComponent.NETWORK_INFRASTRUCTURE, {
        type: 'SSH_TUNNEL_SETUP_FAILED',
        severity: 'CRITICAL',
        message: 'SSH tunnel setup failed',
        details: { error: error.message, config: this.config.ssh }
      });

      return false;
    }
  }

  /**
   * Initialize database connections with error handling
   */
  private async initializeDatabaseConnections(): Promise<boolean> {
    try {
      this.logger.info('🗄️ Initializing database connections...');

      // Test database connectivity
      const dbHealthy = await this.networkErrorHandler.testConnectivity('database');
      
      if (dbHealthy) {
        this.updateServiceStatus('database', 'healthy');
        this.logger.info('✅ Database connection established');
      } else {
        this.updateServiceStatus('database', 'unhealthy');
        
        // Attempt database error recovery
        await this.networkErrorHandler.handleDatabaseError(
          new Error('Database connection test failed'),
          this.config.database
        );
      }

      return dbHealthy;

    } catch (error) {
      this.logger.error('❌ Database initialization failed:', error);
      
      await this.systemErrorManager.handleComponentError(SystemComponent.DATABASE, {
        type: 'DATABASE_INIT_FAILED',
        severity: 'HIGH',
        message: 'Database initialization failed',
        details: { error: error.message, config: this.config.database }
      });

      return false;
    }
  }

  /**
   * Initialize service status tracking
   */
  private initializeServiceStatus(): void {
    const services = [
      { name: 'gate-io-tunnel', type: 'ssh_tunnel' },
      { name: 'database', type: 'database' },
      { name: 'ollama', type: 'api' }
    ];

    services.forEach(service => {
      this.services.set(service.name, {
        name: service.name,
        type: service.type,
        status: 'unhealthy',
        lastCheck: new Date(),
        uptime: 0,
        errorCount: 0
      });
    });
  }

  /**
   * Update service status
   */
  private updateServiceStatus(serviceName: string, status: ServiceStatus['status'], error?: string): void {
    const service = this.services.get(serviceName);
    if (!service) return;

    const wasHealthy = service.status === 'healthy';
    service.status = status;
    service.lastCheck = new Date();

    if (error) {
      service.lastError = error;
      service.errorCount++;
    } else if (status === 'healthy') {
      service.errorCount = 0;
      service.lastError = undefined;
      
      // Update uptime if transitioning to healthy
      if (!wasHealthy) {
        service.uptime = Date.now();
      }
    }

    // Emit status change event
    this.emit('serviceStatusChanged', serviceName, status, error);
  }

  /**
   * Start service monitoring
   */
  private startServiceMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.monitoring.healthCheckInterval);

    this.logger.info('🔍 Network service monitoring started');
  }

  /**
   * Perform health checks on all services
   */
  private async performHealthChecks(): Promise<void> {
    const services = Array.from(this.services.keys());

    for (const serviceName of services) {
      try {
        const isHealthy = await this.networkErrorHandler.testConnectivity(serviceName);
        
        if (isHealthy) {
          this.updateServiceStatus(serviceName, 'healthy');
        } else {
          this.updateServiceStatus(serviceName, 'unhealthy', 'Health check failed');
          
          // Attempt recovery for critical services
          if (serviceName === 'gate-io-tunnel' || serviceName === 'database') {
            await this.attemptServiceRecovery(serviceName);
          }
        }

      } catch (error) {
        this.logger.error(`Health check failed for ${serviceName}:`, error);
        this.updateServiceStatus(serviceName, 'failed', error.message);
      }
    }

    // Check for cascading failures
    await this.checkCascadingFailures();
  }

  /**
   * Attempt service recovery
   */
  private async attemptServiceRecovery(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) return;

    if (service.errorCount >= this.config.monitoring.maxReconnectionAttempts) {
      this.logger.error(`Max reconnection attempts reached for ${serviceName}`);
      return;
    }

    try {
      this.logger.info(`🔄 Attempting recovery for ${serviceName}...`);
      this.updateServiceStatus(serviceName, 'recovering');

      // Wait before retry
      await new Promise(resolve => 
        setTimeout(resolve, this.config.monitoring.reconnectionDelay)
      );

      switch (serviceName) {
        case 'gate-io-tunnel':
          await this.recoverSSHTunnel();
          break;
        case 'database':
          await this.recoverDatabaseConnection();
          break;
        case 'ollama':
          await this.recoverOllamaService();
          break;
      }

      this.logger.info(`✅ Recovery successful for ${serviceName}`);

    } catch (error) {
      this.logger.error(`❌ Recovery failed for ${serviceName}:`, error);
      this.updateServiceStatus(serviceName, 'failed', error.message);
    }
  }

  /**
   * Recover SSH tunnel
   */
  private async recoverSSHTunnel(): Promise<void> {
    const success = await this.networkErrorHandler.setupSSHTunnel(this.config.ssh.gateio);
    if (!success) {
      throw new Error('SSH tunnel recovery failed');
    }
  }

  /**
   * Recover database connection
   */
  private async recoverDatabaseConnection(): Promise<void> {
    // Emit database reconnection event
    this.networkErrorHandler.emit('databaseReconnectionNeeded');
    
    // Test connectivity after a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const isHealthy = await this.networkErrorHandler.testConnectivity('database');
    if (!isHealthy) {
      throw new Error('Database connection recovery failed');
    }
  }

  /**
   * Recover Ollama service
   */
  private async recoverOllamaService(): Promise<void> {
    // Test Ollama connectivity
    const isHealthy = await this.networkErrorHandler.testConnectivity('ollama');
    if (!isHealthy) {
      throw new Error('Ollama service recovery failed - service may need manual restart');
    }
  }

  /**
   * Check for cascading failures
   */
  private async checkCascadingFailures(): Promise<void> {
    const unhealthyServices = Array.from(this.services.values())
      .filter(service => service.status === 'unhealthy' || service.status === 'failed');

    if (unhealthyServices.length >= 2) {
      this.logger.warn('🚨 Cascading failure detected', {
        unhealthyServices: unhealthyServices.map(s => s.name)
      });

      await this.systemErrorManager.handleComponentError(SystemComponent.NETWORK_INFRASTRUCTURE, {
        type: 'CASCADING_FAILURE',
        severity: 'CRITICAL',
        message: 'Multiple network services failing',
        details: { 
          unhealthyServices: unhealthyServices.map(s => ({
            name: s.name,
            status: s.status,
            errorCount: s.errorCount,
            lastError: s.lastError
          }))
        }
      });

      this.emit('cascadingFailure', unhealthyServices);
    }
  }

  /**
   * Setup error handling listeners
   */
  private setupErrorHandling(): void {
    // Listen for network errors
    this.networkErrorHandler.on('networkError', async (error) => {
      this.logger.warn('Network error detected', error);
      
      await this.systemErrorManager.handleComponentError(SystemComponent.NETWORK_INFRASTRUCTURE, {
        type: error.type,
        severity: 'HIGH',
        message: error.error,
        details: { 
          service: error.service,
          errorCount: error.errorCount 
        }
      });
    });

    // Listen for tunnel establishment
    this.networkErrorHandler.on('tunnelEstablished', (serviceName) => {
      this.logger.info(`SSH tunnel established: ${serviceName}`);
      this.updateServiceStatus(serviceName, 'healthy');
    });

    // Listen for tunnel reconnection needs
    this.networkErrorHandler.on('tunnelReconnectionNeeded', async (serviceName) => {
      this.logger.info(`SSH tunnel reconnection needed: ${serviceName}`);
      await this.attemptServiceRecovery(serviceName);
    });

    // Listen for system error manager restart requests
    this.systemErrorManager.on('restartComponent', async (component: SystemComponent) => {
      if (component === SystemComponent.NETWORK_INFRASTRUCTURE) {
        await this.handleInfrastructureRestart();
      }
    });

    // Listen for network reconnection requests
    this.systemErrorManager.on('reconnectNetwork', async () => {
      await this.handleNetworkReconnection();
    });
  }

  /**
   * Handle infrastructure restart
   */
  private async handleInfrastructureRestart(): Promise<void> {
    try {
      this.logger.info('🔄 Handling network infrastructure restart...');
      
      // Shutdown current services
      await this.shutdown();
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Reinitialize
      await this.initialize();
      
      this.logger.info('✅ Network infrastructure restart completed');
      
    } catch (error) {
      this.logger.error('❌ Infrastructure restart failed:', error);
      throw error;
    }
  }

  /**
   * Handle network reconnection
   */
  private async handleNetworkReconnection(): Promise<void> {
    try {
      this.logger.info('🔄 Handling network reconnection...');
      
      // Attempt to recover all unhealthy services
      const unhealthyServices = Array.from(this.services.entries())
        .filter(([, service]) => service.status !== 'healthy')
        .map(([name]) => name);

      for (const serviceName of unhealthyServices) {
        await this.attemptServiceRecovery(serviceName);
      }
      
      this.logger.info('✅ Network reconnection completed');
      
    } catch (error) {
      this.logger.error('❌ Network reconnection failed:', error);
      throw error;
    }
  }

  /**
   * Get network service status
   */
  getServiceStatus(): {
    isInitialized: boolean;
    services: ServiceStatus[];
    healthyServices: number;
    totalServices: number;
    networkHealth: any;
  } {
    const services = Array.from(this.services.values());
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const networkHealth = this.networkErrorHandler.getNetworkStatus();

    return {
      isInitialized: this.isInitialized,
      services,
      healthyServices,
      totalServices: services.length,
      networkHealth
    };
  }

  /**
   * Force service reconnection
   */
  async forceReconnection(serviceName?: string): Promise<boolean> {
    try {
      if (serviceName) {
        this.logger.info(`🔄 Forcing reconnection for ${serviceName}...`);
        await this.attemptServiceRecovery(serviceName);
        return true;
      } else {
        this.logger.info('🔄 Forcing reconnection for all services...');
        await this.handleNetworkReconnection();
        return true;
      }
    } catch (error) {
      this.logger.error('❌ Force reconnection failed:', error);
      return false;
    }
  }

  /**
   * Shutdown network service manager
   */
  async shutdown(): Promise<void> {
    this.logger.info('🛑 Shutting down Network Service Manager...');

    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Shutdown network error handler
    await this.networkErrorHandler.shutdown();

    // Reset service status
    this.services.clear();
    this.isInitialized = false;

    this.logger.info('✅ Network Service Manager shutdown completed');
  }
}