import { EventEmitter } from 'events';
import { Logger } from '../core/logging/logger';
import { SSHTunnelManager, TunnelConnection, TunnelState } from './ssh-tunnel-manager';
import { TunnelHealthMonitor, TunnelHealthMetrics } from './tunnel-health-monitor';
import { TunnelStateTracker } from './tunnel-state-tracker';

/**
 * Reconnection strategy configuration
 */
export interface ReconnectionConfig {
  /** Enable automatic reconnection */
  enabled: boolean;
  /** Initial retry delay in milliseconds */
  initialRetryDelay: number;
  /** Maximum retry delay in milliseconds */
  maxRetryDelay: number;
  /** Exponential backoff multiplier */
  backoffMultiplier: number;
  /** Maximum number of retry attempts */
  maxRetryAttempts: number;
  /** Reset retry count after successful connection duration (ms) */
  resetRetryCountAfter: number;
  /** Health check threshold for triggering reconnection */
  healthThreshold: number;
  /** Consecutive failure threshold for triggering reconnection */
  failureThreshold: number;
  /** Jitter factor for retry delays (0-1) */
  jitterFactor: number;
}

/**
 * Reconnection attempt information
 */
export interface ReconnectionAttempt {
  connectionId: string;
  attemptNumber: number;
  timestamp: Date;
  reason: string;
  success: boolean;
  error?: Error;
  duration: number;
  nextRetryDelay?: number;
}

/**
 * Reconnection statistics
 */
export interface ReconnectionStats {
  connectionId: string;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  averageReconnectionTime: number;
  longestDowntime: number;
  shortestDowntime: number;
  lastReconnectionAttempt: Date | null;
  currentRetryCount: number;
  isReconnecting: boolean;
}

/**
 * Tunnel Auto-Reconnection Manager
 * Implements intelligent auto-reconnection with exponential backoff and failure detection
 */
export class TunnelAutoReconnect extends EventEmitter {
  private logger: Logger;
  private tunnelManager: SSHTunnelManager;
  private healthMonitor: TunnelHealthMonitor;
  private stateTracker: TunnelStateTracker;
  private config: ReconnectionConfig;
  private reconnectionStats: Map<string, ReconnectionStats>;
  private reconnectionTimers: Map<string, NodeJS.Timeout>;
  private reconnectionAttempts: Map<string, ReconnectionAttempt[]>;
  private isEnabled: boolean;

  constructor(
    logger: Logger,
    tunnelManager: SSHTunnelManager,
    healthMonitor: TunnelHealthMonitor,
    stateTracker: TunnelStateTracker,
    config?: Partial<ReconnectionConfig>
  ) {
    super();
    this.logger = logger;
    this.tunnelManager = tunnelManager;
    this.healthMonitor = healthMonitor;
    this.stateTracker = stateTracker;
    this.reconnectionStats = new Map();
    this.reconnectionTimers = new Map();
    this.reconnectionAttempts = new Map();
    this.isEnabled = false;

    // Default configuration
    this.config = {
      enabled: true,
      initialRetryDelay: 5000, // 5 seconds
      maxRetryDelay: 300000, // 5 minutes
      backoffMultiplier: 2,
      maxRetryAttempts: 10,
      resetRetryCountAfter: 300000, // 5 minutes
      healthThreshold: 30,
      failureThreshold: 3,
      jitterFactor: 0.1,
      ...config
    };

    this.setupEventListeners();
    this.logger.info('Tunnel Auto-Reconnection Manager initialized', this.config);
  }

  /**
   * Enable auto-reconnection
   */
  enable(): void {
    if (this.isEnabled) {
      this.logger.warn('Auto-reconnection is already enabled');
      return;
    }

    this.isEnabled = true;
    this.logger.info('Auto-reconnection enabled');

    // Check existing connections for health issues
    this.checkExistingConnections();

    this.emit('autoReconnectEnabled');
  }

  /**
   * Disable auto-reconnection
   */
  disable(): void {
    if (!this.isEnabled) {
      this.logger.warn('Auto-reconnection is already disabled');
      return;
    }

    this.isEnabled = false;
    this.logger.info('Auto-reconnection disabled');

    // Cancel all pending reconnection attempts
    this.cancelAllReconnectionAttempts();

    this.emit('autoReconnectDisabled');
  }

  /**
   * Get reconnection statistics for a connection
   * 
   * @param connectionId - Connection identifier
   * @returns Reconnection statistics or undefined
   */
  getReconnectionStats(connectionId: string): ReconnectionStats | undefined {
    return this.reconnectionStats.get(connectionId);
  }

  /**
   * Get all reconnection statistics
   * 
   * @returns Map of all reconnection statistics
   */
  getAllReconnectionStats(): Map<string, ReconnectionStats> {
    return new Map(this.reconnectionStats);
  }

  /**
   * Get reconnection attempt history for a connection
   * 
   * @param connectionId - Connection identifier
   * @param limit - Maximum number of attempts to return
   * @returns Array of reconnection attempts
   */
  getReconnectionHistory(connectionId: string, limit?: number): ReconnectionAttempt[] {
    const attempts = this.reconnectionAttempts.get(connectionId) || [];
    return limit ? attempts.slice(-limit) : [...attempts];
  }

  /**
   * Force reconnection for a specific connection
   * 
   * @param connectionId - Connection identifier
   * @param reason - Reason for forced reconnection
   * @returns Promise resolving when reconnection is complete
   */
  async forceReconnection(connectionId: string, reason: string = 'Manual reconnection'): Promise<void> {
    const connection = this.tunnelManager.getConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    this.logger.info(`Forcing reconnection for connection: ${connectionId}`, { reason });

    // Cancel any pending reconnection
    this.cancelReconnectionAttempt(connectionId);

    // Perform immediate reconnection
    await this.performReconnection(connectionId, reason, 0);
  }

  /**
   * Update reconnection configuration
   * 
   * @param newConfig - New configuration parameters
   */
  updateConfig(newConfig: Partial<ReconnectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Auto-reconnection configuration updated', this.config);
    this.emit('configUpdated', this.config);
  }

  /**
   * Setup event listeners for tunnel events
   */
  private setupEventListeners(): void {
    // Listen for tunnel disconnections
    this.tunnelManager.on('tunnelDisconnected', (connection) => {
      if (this.isEnabled) {
        this.handleConnectionLoss(connection, 'Tunnel disconnected');
      }
    });

    // Listen for tunnel errors
    this.tunnelManager.on('tunnelError', (connection, error) => {
      if (this.isEnabled) {
        this.handleConnectionLoss(connection, `Tunnel error: ${error.message}`);
      }
    });

    // Listen for health issues
    this.healthMonitor.on('connectionUnhealthy', (connection, metrics) => {
      if (this.isEnabled) {
        this.handleHealthIssue(connection, metrics);
      }
    });

    // Listen for successful connections to reset retry counts
    this.tunnelManager.on('tunnelConnected', (connection) => {
      this.handleSuccessfulConnection(connection);
    });

    // Listen for state changes
    this.stateTracker.on('connectionFailed', (connection, stateChangeEvent) => {
      if (this.isEnabled) {
        this.handleConnectionFailure(connection, 'Connection failed');
      }
    });
  }

  /**
   * Check existing connections for health issues
   */
  private checkExistingConnections(): void {
    const connections = this.tunnelManager.getAllConnections();
    
    for (const connection of connections) {
      // Initialize stats if not exists
      this.initializeReconnectionStats(connection.id);

      // Check if connection needs reconnection
      if (connection.state === TunnelState.FAILED || connection.state === TunnelState.DISCONNECTED) {
        this.handleConnectionLoss(connection, 'Connection check on enable');
      } else {
        // Check health metrics
        const healthMetrics = this.healthMonitor.getHealthMetrics(connection.id);
        if (healthMetrics && !healthMetrics.isHealthy) {
          this.handleHealthIssue(connection, healthMetrics);
        }
      }
    }
  }

  /**
   * Handle connection loss event
   * 
   * @param connection - Lost connection
   * @param reason - Reason for connection loss
   */
  private handleConnectionLoss(connection: TunnelConnection, reason: string): void {
    if (!this.config.enabled) return;

    this.logger.warn(`Connection lost: ${connection.id}`, { reason });

    // Initialize stats if not exists
    this.initializeReconnectionStats(connection.id);

    // Schedule reconnection
    this.scheduleReconnection(connection.id, reason);
  }

  /**
   * Handle health issue event
   * 
   * @param connection - Connection with health issues
   * @param metrics - Health metrics
   */
  private handleHealthIssue(connection: TunnelConnection, metrics: TunnelHealthMetrics): void {
    if (!this.config.enabled) return;

    // Check if health is below threshold
    if (metrics.healthScore < this.config.healthThreshold) {
      this.logger.warn(`Connection health below threshold: ${connection.id}`, {
        healthScore: metrics.healthScore,
        threshold: this.config.healthThreshold
      });

      this.scheduleReconnection(connection.id, `Health score below threshold: ${metrics.healthScore}`);
    }

    // Check for consecutive failures
    if (metrics.consecutiveFailures >= this.config.failureThreshold) {
      this.logger.warn(`Connection has too many consecutive failures: ${connection.id}`, {
        failures: metrics.consecutiveFailures,
        threshold: this.config.failureThreshold
      });

      this.scheduleReconnection(connection.id, `Too many consecutive failures: ${metrics.consecutiveFailures}`);
    }
  }

  /**
   * Handle connection failure event
   * 
   * @param connection - Failed connection
   * @param reason - Reason for failure
   */
  private handleConnectionFailure(connection: TunnelConnection, reason: string): void {
    if (!this.config.enabled) return;

    this.logger.error(`Connection failed: ${connection.id}`, { reason });
    this.scheduleReconnection(connection.id, reason);
  }

  /**
   * Handle successful connection event
   * 
   * @param connection - Successfully connected tunnel
   */
  private handleSuccessfulConnection(connection: TunnelConnection): void {
    const stats = this.reconnectionStats.get(connection.id);
    if (!stats) return;

    // Cancel any pending reconnection
    this.cancelReconnectionAttempt(connection.id);

    // Update stats
    stats.isReconnecting = false;
    stats.successfulAttempts++;

    // Reset retry count after successful connection
    setTimeout(() => {
      if (stats.currentRetryCount > 0) {
        this.logger.info(`Resetting retry count for connection: ${connection.id}`);
        stats.currentRetryCount = 0;
      }
    }, this.config.resetRetryCountAfter);

    this.logger.info(`Connection successfully established: ${connection.id}`);
    this.emit('reconnectionSuccessful', connection, stats);
  }

  /**
   * Schedule reconnection attempt
   * 
   * @param connectionId - Connection identifier
   * @param reason - Reason for reconnection
   */
  private scheduleReconnection(connectionId: string, reason: string): void {
    // Cancel any existing reconnection timer
    this.cancelReconnectionAttempt(connectionId);

    const stats = this.reconnectionStats.get(connectionId);
    if (!stats) {
      this.initializeReconnectionStats(connectionId);
      return this.scheduleReconnection(connectionId, reason);
    }

    // Check if max attempts reached
    if (stats.currentRetryCount >= this.config.maxRetryAttempts) {
      this.logger.error(`Max reconnection attempts reached for connection: ${connectionId}`, {
        attempts: stats.currentRetryCount,
        maxAttempts: this.config.maxRetryAttempts
      });
      
      stats.isReconnecting = false;
      this.emit('reconnectionFailed', connectionId, stats, 'Max attempts reached');
      return;
    }

    // Calculate retry delay with exponential backoff and jitter
    const baseDelay = Math.min(
      this.config.initialRetryDelay * Math.pow(this.config.backoffMultiplier, stats.currentRetryCount),
      this.config.maxRetryDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = baseDelay * this.config.jitterFactor * (Math.random() - 0.5);
    const retryDelay = Math.max(1000, baseDelay + jitter); // Minimum 1 second

    this.logger.info(`Scheduling reconnection for connection: ${connectionId}`, {
      reason,
      attempt: stats.currentRetryCount + 1,
      delay: `${retryDelay}ms`
    });

    // Update stats
    stats.isReconnecting = true;
    stats.currentRetryCount++;

    // Schedule reconnection
    const timer = setTimeout(async () => {
      try {
        await this.performReconnection(connectionId, reason, stats.currentRetryCount);
      } catch (error) {
        this.logger.error(`Reconnection attempt failed: ${connectionId}`, error);
        
        // Schedule next attempt if not at max
        if (stats.currentRetryCount < this.config.maxRetryAttempts) {
          this.scheduleReconnection(connectionId, `Retry after failure: ${error instanceof Error ? error.message : String(error)}`);
        } else {
          stats.isReconnecting = false;
          this.emit('reconnectionFailed', connectionId, stats, 'All attempts exhausted');
        }
      }
    }, retryDelay);

    this.reconnectionTimers.set(connectionId, timer);
    this.emit('reconnectionScheduled', connectionId, stats, retryDelay);
  }

  /**
   * Perform actual reconnection attempt
   * 
   * @param connectionId - Connection identifier
   * @param reason - Reason for reconnection
   * @param attemptNumber - Current attempt number
   */
  private async performReconnection(connectionId: string, reason: string, attemptNumber: number): Promise<void> {
    const connection = this.tunnelManager.getConnection(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    const stats = this.reconnectionStats.get(connectionId);
    if (!stats) {
      throw new Error(`Reconnection stats not found: ${connectionId}`);
    }

    const startTime = Date.now();
    const attempt: ReconnectionAttempt = {
      connectionId,
      attemptNumber,
      timestamp: new Date(),
      reason,
      success: false,
      duration: 0
    };

    try {
      this.logger.info(`Attempting reconnection: ${connectionId}`, {
        attempt: attemptNumber,
        reason
      });

      // Disconnect existing connection if still connected
      if (connection.state === TunnelState.CONNECTED) {
        await this.tunnelManager.disconnectTunnel(connectionId);
      }

      // Wait a moment before reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Attempt to establish new connection
      await this.tunnelManager.establishTunnel(connectionId);

      // Success
      attempt.success = true;
      attempt.duration = Date.now() - startTime;

      // Update stats
      stats.totalAttempts++;
      stats.successfulAttempts++;
      stats.lastReconnectionAttempt = new Date();
      stats.isReconnecting = false;

      // Calculate average reconnection time
      if (stats.successfulAttempts > 0) {
        const totalTime = this.getReconnectionHistory(connectionId)
          .filter(a => a.success)
          .reduce((sum, a) => sum + a.duration, 0);
        stats.averageReconnectionTime = totalTime / stats.successfulAttempts;
      }

      this.logger.info(`Reconnection successful: ${connectionId}`, {
        attempt: attemptNumber,
        duration: `${attempt.duration}ms`
      });

      this.emit('reconnectionAttemptSuccessful', connection, attempt, stats);

    } catch (error) {
      // Failure
      attempt.success = false;
      attempt.error = error instanceof Error ? error : new Error(String(error));
      attempt.duration = Date.now() - startTime;

      // Update stats
      stats.totalAttempts++;
      stats.failedAttempts++;
      stats.lastReconnectionAttempt = new Date();

      this.logger.error(`Reconnection attempt failed: ${connectionId}`, {
        attempt: attemptNumber,
        error: attempt.error.message,
        duration: `${attempt.duration}ms`
      });

      this.emit('reconnectionAttemptFailed', connection, attempt, stats);
      throw attempt.error;

    } finally {
      // Store attempt in history
      this.storeReconnectionAttempt(connectionId, attempt);
    }
  }

  /**
   * Cancel reconnection attempt for a connection
   * 
   * @param connectionId - Connection identifier
   */
  private cancelReconnectionAttempt(connectionId: string): void {
    const timer = this.reconnectionTimers.get(connectionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectionTimers.delete(connectionId);
      
      const stats = this.reconnectionStats.get(connectionId);
      if (stats) {
        stats.isReconnecting = false;
      }

      this.logger.debug(`Cancelled reconnection attempt for connection: ${connectionId}`);
    }
  }

  /**
   * Cancel all pending reconnection attempts
   */
  private cancelAllReconnectionAttempts(): void {
    for (const [connectionId, timer] of this.reconnectionTimers.entries()) {
      clearTimeout(timer);
      
      const stats = this.reconnectionStats.get(connectionId);
      if (stats) {
        stats.isReconnecting = false;
      }
    }

    this.reconnectionTimers.clear();
    this.logger.info('Cancelled all pending reconnection attempts');
  }

  /**
   * Initialize reconnection statistics for a connection
   * 
   * @param connectionId - Connection identifier
   */
  private initializeReconnectionStats(connectionId: string): void {
    if (this.reconnectionStats.has(connectionId)) {
      return;
    }

    const stats: ReconnectionStats = {
      connectionId,
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      averageReconnectionTime: 0,
      longestDowntime: 0,
      shortestDowntime: Infinity,
      lastReconnectionAttempt: null,
      currentRetryCount: 0,
      isReconnecting: false
    };

    this.reconnectionStats.set(connectionId, stats);
    this.reconnectionAttempts.set(connectionId, []);
  }

  /**
   * Store reconnection attempt in history
   * 
   * @param connectionId - Connection identifier
   * @param attempt - Reconnection attempt to store
   */
  private storeReconnectionAttempt(connectionId: string, attempt: ReconnectionAttempt): void {
    if (!this.reconnectionAttempts.has(connectionId)) {
      this.reconnectionAttempts.set(connectionId, []);
    }

    const attempts = this.reconnectionAttempts.get(connectionId)!;
    attempts.push(attempt);

    // Limit history size
    const maxHistorySize = 100;
    if (attempts.length > maxHistorySize) {
      attempts.splice(0, attempts.length - maxHistorySize);
    }
  }

  /**
   * Cleanup auto-reconnection resources
   */
  cleanup(): void {
    this.disable();
    this.reconnectionStats.clear();
    this.reconnectionAttempts.clear();
    this.logger.info('Tunnel auto-reconnection cleanup completed');
  }
}
