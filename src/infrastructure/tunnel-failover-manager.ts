import { EventEmitter } from 'events';
import { Logger } from '../core/logging/logger';
import { SSHTunnelManager, TunnelConnection, TunnelState, TunnelConfig } from './ssh-tunnel-manager';
import { TunnelHealthMonitor } from './tunnel-health-monitor';
import { TunnelLoadBalancer, TunnelSelection } from './tunnel-load-balancer';
import { TunnelAutoReconnect } from './tunnel-auto-reconnect';

/**
 * Failover configuration
 */
export interface FailoverConfig {
  /** Enable automatic failover */
  enabled: boolean;
  /** Minimum number of backup tunnels to maintain */
  minBackupTunnels: number;
  /** Maximum failover attempts per connection */
  maxFailoverAttempts: number;
  /** Failover timeout in milliseconds */
  failoverTimeout: number;
  /** Health check interval for backup tunnels */
  backupHealthCheckInterval: number;
  /** Enable proactive backup tunnel creation */
  enableProactiveBackups: boolean;
  /** Backup tunnel configurations */
  backupConfigs: Partial<TunnelConfig>[];
  /** Failover priority order */
  failoverPriority: string[];
}

/**
 * Failover event information
 */
export interface FailoverEvent {
  id: string;
  timestamp: Date;
  primaryConnectionId: string;
  backupConnectionId: string | null;
  reason: string;
  success: boolean;
  duration: number;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * Failover statistics
 */
export interface FailoverStats {
  totalFailovers: number;
  successfulFailovers: number;
  failedFailovers: number;
  averageFailoverTime: number;
  longestFailoverTime: number;
  shortestFailoverTime: number;
  failoversByConnection: Map<string, number>;
  lastFailoverEvent: FailoverEvent | null;
  currentBackupCount: number;
  backupUtilization: number;
}

/**
 * Backup tunnel status
 */
export interface BackupTunnelStatus {
  connectionId: string;
  isActive: boolean;
  isHealthy: boolean;
  priority: number;
  createdAt: Date;
  lastUsed: Date | null;
  usageCount: number;
  config: Partial<TunnelConfig>;
}

/**
 * Tunnel Failover Manager
 * Manages automatic failover between primary and backup SSH tunnels
 */
export class TunnelFailoverManager extends EventEmitter {
  private logger: Logger;
  private tunnelManager: SSHTunnelManager;
  private healthMonitor: TunnelHealthMonitor;
  private loadBalancer: TunnelLoadBalancer;
  private autoReconnect: TunnelAutoReconnect;
  private config: FailoverConfig;
  private failoverStats: FailoverStats;
  private failoverHistory: FailoverEvent[];
  private backupTunnels: Map<string, BackupTunnelStatus>;
  private primaryTunnels: Set<string>;
  private failoverInProgress: Map<string, Promise<TunnelSelection | null>>;
  private backupHealthCheckTimer: NodeJS.Timeout | null;
  private isEnabled: boolean;

  constructor(
    logger: Logger,
    tunnelManager: SSHTunnelManager,
    healthMonitor: TunnelHealthMonitor,
    loadBalancer: TunnelLoadBalancer,
    autoReconnect: TunnelAutoReconnect,
    config?: Partial<FailoverConfig>
  ) {
    super();
    this.logger = logger;
    this.tunnelManager = tunnelManager;
    this.healthMonitor = healthMonitor;
    this.loadBalancer = loadBalancer;
    this.autoReconnect = autoReconnect;
    this.failoverHistory = [];
    this.backupTunnels = new Map();
    this.primaryTunnels = new Set();
    this.failoverInProgress = new Map();
    this.backupHealthCheckTimer = null;
    this.isEnabled = false;

    // Default configuration
    this.config = {
      enabled: true,
      minBackupTunnels: 1,
      maxFailoverAttempts: 3,
      failoverTimeout: 30000,
      backupHealthCheckInterval: 60000,
      enableProactiveBackups: true,
      backupConfigs: [],
      failoverPriority: [],
      ...config
    };

    // Initialize statistics
    this.failoverStats = {
      totalFailovers: 0,
      successfulFailovers: 0,
      failedFailovers: 0,
      averageFailoverTime: 0,
      longestFailoverTime: 0,
      shortestFailoverTime: Infinity,
      failoversByConnection: new Map(),
      lastFailoverEvent: null,
      currentBackupCount: 0,
      backupUtilization: 0
    };

    this.setupEventListeners();
    this.logger.info('Tunnel Failover Manager initialized', this.config);
  }

  /**
   * Enable failover management
   */
  async enable(): Promise<void> {
    if (this.isEnabled) {
      this.logger.warn('Failover management is already enabled');
      return;
    }

    this.isEnabled = true;
    this.logger.info('Enabling failover management');

    // Create backup tunnels if configured
    if (this.config.enableProactiveBackups) {
      await this.createBackupTunnels();
    }

    // Start backup health monitoring
    this.startBackupHealthMonitoring();

    this.emit('failoverEnabled');
  }

  /**
   * Disable failover management
   */
  async disable(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn('Failover management is already disabled');
      return;
    }

    this.isEnabled = false;
    this.logger.info('Disabling failover management');

    // Stop backup health monitoring
    if (this.backupHealthCheckTimer) {
      clearInterval(this.backupHealthCheckTimer);
      this.backupHealthCheckTimer = null;
    }

    // Disconnect backup tunnels
    await this.disconnectBackupTunnels();

    this.emit('failoverDisabled');
  }

  /**
   * Perform failover from primary to backup tunnel
   * 
   * @param primaryConnectionId - Primary connection that failed
   * @param reason - Reason for failover
   * @returns Backup tunnel selection or null if failed
   */
  async performFailover(primaryConnectionId: string, reason: string): Promise<TunnelSelection | null> {
    if (!this.isEnabled) {
      this.logger.warn('Failover is disabled');
      return null;
    }

    // Check if failover is already in progress for this connection
    if (this.failoverInProgress.has(primaryConnectionId)) {
      this.logger.info(`Failover already in progress for connection: ${primaryConnectionId}`);
      return this.failoverInProgress.get(primaryConnectionId)!;
    }

    const failoverPromise = this.executeFailover(primaryConnectionId, reason);
    this.failoverInProgress.set(primaryConnectionId, failoverPromise);

    try {
      const result = await failoverPromise;
      return result;
    } finally {
      this.failoverInProgress.delete(primaryConnectionId);
    }
  }

  /**
   * Add primary tunnel to failover management
   * 
   * @param connectionId - Primary connection ID
   */
  addPrimaryTunnel(connectionId: string): void {
    this.primaryTunnels.add(connectionId);
    this.logger.info(`Added primary tunnel to failover management: ${connectionId}`);
  }

  /**
   * Remove primary tunnel from failover management
   * 
   * @param connectionId - Primary connection ID
   */
  removePrimaryTunnel(connectionId: string): void {
    this.primaryTunnels.delete(connectionId);
    this.logger.info(`Removed primary tunnel from failover management: ${connectionId}`);
  }

  /**
   * Create backup tunnel with specified configuration
   * 
   * @param backupConfig - Backup tunnel configuration
   * @returns Created backup tunnel connection
   */
  async createBackupTunnel(backupConfig: Partial<TunnelConfig>): Promise<TunnelConnection> {
    this.logger.info('Creating backup tunnel', { config: backupConfig });

    // Create tunnel connection
    const connection = await this.tunnelManager.createTunnel(backupConfig);

    // Register as backup tunnel
    const backupStatus: BackupTunnelStatus = {
      connectionId: connection.id,
      isActive: false,
      isHealthy: false,
      priority: this.getBackupPriority(connection.id),
      createdAt: new Date(),
      lastUsed: null,
      usageCount: 0,
      config: backupConfig
    };

    this.backupTunnels.set(connection.id, backupStatus);
    this.updateBackupStats();

    this.logger.info(`Backup tunnel created: ${connection.id}`);
    this.emit('backupTunnelCreated', connection, backupStatus);

    return connection;
  }

  /**
   * Activate backup tunnel
   * 
   * @param connectionId - Backup connection ID
   */
  async activateBackupTunnel(connectionId: string): Promise<void> {
    const backupStatus = this.backupTunnels.get(connectionId);
    if (!backupStatus) {
      throw new Error(`Backup tunnel not found: ${connectionId}`);
    }

    if (backupStatus.isActive) {
      this.logger.warn(`Backup tunnel already active: ${connectionId}`);
      return;
    }

    try {
      this.logger.info(`Activating backup tunnel: ${connectionId}`);

      // Establish tunnel connection
      await this.tunnelManager.establishTunnel(connectionId);

      // Update status
      backupStatus.isActive = true;
      backupStatus.lastUsed = new Date();
      backupStatus.usageCount++;

      this.updateBackupStats();

      this.logger.info(`Backup tunnel activated: ${connectionId}`);
      this.emit('backupTunnelActivated', connectionId, backupStatus);

    } catch (error) {
      this.logger.error(`Failed to activate backup tunnel: ${connectionId}`, error);
      throw error;
    }
  }

  /**
   * Deactivate backup tunnel
   * 
   * @param connectionId - Backup connection ID
   */
  async deactivateBackupTunnel(connectionId: string): Promise<void> {
    const backupStatus = this.backupTunnels.get(connectionId);
    if (!backupStatus) {
      throw new Error(`Backup tunnel not found: ${connectionId}`);
    }

    if (!backupStatus.isActive) {
      this.logger.warn(`Backup tunnel already inactive: ${connectionId}`);
      return;
    }

    try {
      this.logger.info(`Deactivating backup tunnel: ${connectionId}`);

      // Disconnect tunnel
      await this.tunnelManager.disconnectTunnel(connectionId);

      // Update status
      backupStatus.isActive = false;

      this.updateBackupStats();

      this.logger.info(`Backup tunnel deactivated: ${connectionId}`);
      this.emit('backupTunnelDeactivated', connectionId, backupStatus);

    } catch (error) {
      this.logger.error(`Failed to deactivate backup tunnel: ${connectionId}`, error);
      throw error;
    }
  }

  /**
   * Get failover statistics
   * 
   * @returns Current failover statistics
   */
  getFailoverStats(): FailoverStats {
    return { ...this.failoverStats };
  }

  /**
   * Get failover history
   * 
   * @param limit - Maximum number of events to return
   * @returns Array of failover events
   */
  getFailoverHistory(limit?: number): FailoverEvent[] {
    return limit ? this.failoverHistory.slice(-limit) : [...this.failoverHistory];
  }

  /**
   * Get backup tunnel status
   * 
   * @returns Map of backup tunnel statuses
   */
  getBackupTunnelStatus(): Map<string, BackupTunnelStatus> {
    return new Map(this.backupTunnels);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for tunnel failures
    this.tunnelManager.on('tunnelError', (connection, error) => {
      if (this.primaryTunnels.has(connection.id)) {
        this.performFailover(connection.id, `Tunnel error: ${error.message}`);
      }
    });

    // Listen for tunnel disconnections
    this.tunnelManager.on('tunnelDisconnected', (connection) => {
      if (this.primaryTunnels.has(connection.id)) {
        this.performFailover(connection.id, 'Tunnel disconnected');
      }
    });

    // Listen for health issues
    this.healthMonitor.on('connectionUnhealthy', (connection) => {
      if (this.primaryTunnels.has(connection.id)) {
        this.performFailover(connection.id, 'Connection unhealthy');
      }
    });

    // Listen for backup tunnel connections
    this.tunnelManager.on('tunnelConnected', (connection) => {
      const backupStatus = this.backupTunnels.get(connection.id);
      if (backupStatus) {
        backupStatus.isHealthy = true;
        this.updateBackupStats();
      }
    });

    // Listen for backup tunnel disconnections
    this.tunnelManager.on('tunnelDisconnected', (connection) => {
      const backupStatus = this.backupTunnels.get(connection.id);
      if (backupStatus) {
        backupStatus.isActive = false;
        backupStatus.isHealthy = false;
        this.updateBackupStats();
      }
    });
  }

  /**
   * Execute failover process
   * 
   * @param primaryConnectionId - Primary connection ID
   * @param reason - Reason for failover
   * @returns Backup tunnel selection or null
   */
  private async executeFailover(primaryConnectionId: string, reason: string): Promise<TunnelSelection | null> {
    const startTime = Date.now();
    const failoverEvent: FailoverEvent = {
      id: `failover_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      primaryConnectionId,
      backupConnectionId: null,
      reason,
      success: false,
      duration: 0
    };

    try {
      this.logger.warn(`Starting failover for connection: ${primaryConnectionId}`, { reason });

      // Find best backup tunnel
      const backupTunnel = await this.selectBestBackupTunnel(primaryConnectionId);
      
      if (!backupTunnel) {
        throw new Error('No suitable backup tunnel available');
      }

      failoverEvent.backupConnectionId = backupTunnel.connection.id;

      // Activate backup tunnel if not already active
      const backupStatus = this.backupTunnels.get(backupTunnel.connection.id);
      if (backupStatus && !backupStatus.isActive) {
        await this.activateBackupTunnel(backupTunnel.connection.id);
      }

      // Wait for backup tunnel to be ready
      await this.waitForTunnelReady(backupTunnel.connection.id);

      // Mark failover as successful
      failoverEvent.success = true;
      failoverEvent.duration = Date.now() - startTime;

      // Update statistics
      this.updateFailoverStats(failoverEvent);

      this.logger.info(`Failover successful: ${primaryConnectionId} -> ${backupTunnel.connection.id}`, {
        duration: `${failoverEvent.duration}ms`
      });

      this.emit('failoverSuccessful', failoverEvent, backupTunnel);
      return backupTunnel;

    } catch (error) {
      failoverEvent.success = false;
      failoverEvent.error = error instanceof Error ? error : new Error(String(error));
      failoverEvent.duration = Date.now() - startTime;

      // Update statistics
      this.updateFailoverStats(failoverEvent);

      this.logger.error(`Failover failed for connection: ${primaryConnectionId}`, error);
      this.emit('failoverFailed', failoverEvent);

      return null;

    } finally {
      // Store failover event in history
      this.storeFailoverEvent(failoverEvent);
    }
  }

  /**
   * Select best backup tunnel for failover
   * 
   * @param excludeConnectionId - Connection ID to exclude
   * @returns Best backup tunnel selection or null
   */
  private async selectBestBackupTunnel(excludeConnectionId: string): Promise<TunnelSelection | null> {
    // Get available backup tunnels
    const availableBackups = Array.from(this.backupTunnels.values())
      .filter(backup => {
        return backup.connectionId !== excludeConnectionId &&
               (backup.isActive || this.config.enableProactiveBackups);
      })
      .sort((a, b) => a.priority - b.priority); // Sort by priority

    if (availableBackups.length === 0) {
      // Try to create emergency backup if no backups available
      if (this.config.backupConfigs.length > 0) {
        return this.createEmergencyBackup();
      }
      return null;
    }

    // Select best backup based on health and priority
    for (const backup of availableBackups) {
      const connection = this.tunnelManager.getConnection(backup.connectionId);
      if (!connection) continue;

      const healthMetrics = this.healthMonitor.getHealthMetrics(backup.connectionId);
      
      // Check if backup is healthy enough
      if (healthMetrics && healthMetrics.healthScore >= 50) {
        return {
          connection,
          reason: 'Backup tunnel selection',
          weight: 1,
          healthScore: healthMetrics.healthScore,
          latency: healthMetrics.latency,
          selectionTime: new Date()
        };
      }
    }

    // If no healthy backup found, use the highest priority one
    const fallbackBackup = availableBackups[0];
    const connection = this.tunnelManager.getConnection(fallbackBackup.connectionId);
    
    if (connection) {
      return {
        connection,
        reason: 'Fallback backup tunnel selection',
        weight: 1,
        healthScore: 0,
        latency: 0,
        selectionTime: new Date()
      };
    }

    return null;
  }

  /**
   * Create emergency backup tunnel
   * 
   * @returns Emergency backup tunnel selection or null
   */
  private async createEmergencyBackup(): Promise<TunnelSelection | null> {
    if (this.config.backupConfigs.length === 0) {
      return null;
    }

    try {
      this.logger.warn('Creating emergency backup tunnel');

      // Use first backup configuration
      const backupConfig = this.config.backupConfigs[0];
      const connection = await this.createBackupTunnel(backupConfig);
      
      // Activate immediately
      await this.activateBackupTunnel(connection.id);

      return {
        connection,
        reason: 'Emergency backup tunnel creation',
        weight: 1,
        healthScore: 50, // Assume moderate health for new tunnel
        latency: 0,
        selectionTime: new Date()
      };

    } catch (error) {
      this.logger.error('Failed to create emergency backup tunnel', error);
      return null;
    }
  }

  /**
   * Wait for tunnel to be ready
   * 
   * @param connectionId - Connection ID
   * @param timeoutMs - Timeout in milliseconds
   */
  private async waitForTunnelReady(connectionId: string, timeoutMs: number = this.config.failoverTimeout): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const connection = this.tunnelManager.getConnection(connectionId);
      
      if (connection && connection.state === TunnelState.CONNECTED) {
        // Additional health check
        const healthMetrics = this.healthMonitor.getHealthMetrics(connectionId);
        if (healthMetrics && healthMetrics.isHealthy) {
          return;
        }
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Tunnel not ready within timeout: ${connectionId}`);
  }

  /**
   * Create backup tunnels from configuration
   */
  private async createBackupTunnels(): Promise<void> {
    const targetBackupCount = Math.max(this.config.minBackupTunnels, this.config.backupConfigs.length);
    const currentBackupCount = this.backupTunnels.size;

    if (currentBackupCount >= targetBackupCount) {
      this.logger.debug('Sufficient backup tunnels already exist');
      return;
    }

    const tunnelsToCreate = targetBackupCount - currentBackupCount;
    this.logger.info(`Creating ${tunnelsToCreate} backup tunnels`);

    const createPromises = [];
    for (let i = 0; i < tunnelsToCreate && i < this.config.backupConfigs.length; i++) {
      const backupConfig = this.config.backupConfigs[i];
      createPromises.push(this.createBackupTunnel(backupConfig));
    }

    try {
      await Promise.all(createPromises);
      this.logger.info(`Successfully created ${tunnelsToCreate} backup tunnels`);
    } catch (error) {
      this.logger.error('Failed to create some backup tunnels', error);
    }
  }

  /**
   * Disconnect all backup tunnels
   */
  private async disconnectBackupTunnels(): Promise<void> {
    const disconnectPromises = Array.from(this.backupTunnels.keys()).map(
      connectionId => this.deactivateBackupTunnel(connectionId).catch(error =>
        this.logger.error(`Error deactivating backup tunnel ${connectionId}`, error)
      )
    );

    await Promise.all(disconnectPromises);
    this.backupTunnels.clear();
    this.updateBackupStats();
  }

  /**
   * Start backup health monitoring
   */
  private startBackupHealthMonitoring(): void {
    if (this.backupHealthCheckTimer) {
      clearInterval(this.backupHealthCheckTimer);
    }

    this.backupHealthCheckTimer = setInterval(() => {
      this.checkBackupHealth();
    }, this.config.backupHealthCheckInterval);

    this.logger.info('Started backup health monitoring');
  }

  /**
   * Check health of backup tunnels
   */
  private async checkBackupHealth(): Promise<void> {
    for (const [connectionId, backupStatus] of this.backupTunnels.entries()) {
      try {
        const healthMetrics = this.healthMonitor.getHealthMetrics(connectionId);
        backupStatus.isHealthy = healthMetrics ? healthMetrics.isHealthy : false;

        // If backup is unhealthy and active, try to reconnect
        if (!backupStatus.isHealthy && backupStatus.isActive) {
          this.logger.warn(`Backup tunnel unhealthy, attempting reconnection: ${connectionId}`);
          await this.autoReconnect.forceReconnection(connectionId, 'Backup health check failure');
        }

      } catch (error) {
        this.logger.error(`Backup health check failed for ${connectionId}`, error);
        backupStatus.isHealthy = false;
      }
    }

    this.updateBackupStats();
  }

  /**
   * Get backup priority for connection
   * 
   * @param connectionId - Connection ID
   * @returns Priority number (lower = higher priority)
   */
  private getBackupPriority(connectionId: string): number {
    const index = this.config.failoverPriority.indexOf(connectionId);
    return index >= 0 ? index : 999; // Default low priority
  }

  /**
   * Update failover statistics
   * 
   * @param failoverEvent - Failover event
   */
  private updateFailoverStats(failoverEvent: FailoverEvent): void {
    this.failoverStats.totalFailovers++;
    
    if (failoverEvent.success) {
      this.failoverStats.successfulFailovers++;
    } else {
      this.failedFailovers++;
    }

    // Update timing statistics
    if (failoverEvent.success) {
      if (failoverEvent.duration > this.failoverStats.longestFailoverTime) {
        this.failoverStats.longestFailoverTime = failoverEvent.duration;
      }
      
      if (failoverEvent.duration < this.failoverStats.shortestFailoverTime) {
        this.failoverStats.shortestFailoverTime = failoverEvent.duration;
      }

      // Calculate average
      const totalTime = this.failoverHistory
        .filter(e => e.success)
        .reduce((sum, e) => sum + e.duration, 0);
      this.failoverStats.averageFailoverTime = totalTime / this.failoverStats.successfulFailovers;
    }

    // Update per-connection statistics
    const connectionFailovers = this.failoverStats.failoversByConnection.get(failoverEvent.primaryConnectionId) || 0;
    this.failoverStats.failoversByConnection.set(failoverEvent.primaryConnectionId, connectionFailovers + 1);

    this.failoverStats.lastFailoverEvent = failoverEvent;
  }

  /**
   * Update backup statistics
   */
  private updateBackupStats(): void {
    this.failoverStats.currentBackupCount = this.backupTunnels.size;
    
    const activeBackups = Array.from(this.backupTunnels.values()).filter(b => b.isActive).length;
    this.failoverStats.backupUtilization = this.backupTunnels.size > 0 
      ? (activeBackups / this.backupTunnels.size) * 100 
      : 0;
  }

  /**
   * Store failover event in history
   * 
   * @param failoverEvent - Failover event to store
   */
  private storeFailoverEvent(failoverEvent: FailoverEvent): void {
    this.failoverHistory.push(failoverEvent);

    // Limit history size
    const maxHistorySize = 1000;
    if (this.failoverHistory.length > maxHistorySize) {
      this.failoverHistory.splice(0, this.failoverHistory.length - maxHistorySize);
    }
  }

  /**
   * Cleanup failover manager resources
   */
  async cleanup(): Promise<void> {
    await this.disable();
    this.failoverHistory = [];
    this.primaryTunnels.clear();
    this.failoverInProgress.clear();
    this.logger.info('Tunnel failover manager cleanup completed');
  }
}