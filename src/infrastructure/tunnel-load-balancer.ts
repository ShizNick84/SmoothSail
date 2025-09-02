import { EventEmitter } from 'events';
import { Logger } from '../core/logging/logger';
import { SSHTunnelManager, TunnelConnection, TunnelState } from './ssh-tunnel-manager';
import { TunnelHealthMonitor, TunnelHealthMetrics } from './tunnel-health-monitor';
import { TunnelStateTracker } from './tunnel-state-tracker';

/**
 * Load balancing strategy types
 */
export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'ROUND_ROBIN',
  LEAST_CONNECTIONS = 'LEAST_CONNECTIONS',
  WEIGHTED_ROUND_ROBIN = 'WEIGHTED_ROUND_ROBIN',
  HEALTH_BASED = 'HEALTH_BASED',
  LATENCY_BASED = 'LATENCY_BASED',
  RANDOM = 'RANDOM'
}

/**
 * Tunnel pool configuration
 */
export interface TunnelPoolConfig {
  /** Minimum number of active tunnels */
  minActiveTunnels: number;
  /** Maximum number of active tunnels */
  maxActiveTunnels: number;
  /** Load balancing strategy */
  strategy: LoadBalancingStrategy;
  /** Health check threshold for tunnel selection */
  healthThreshold: number;
  /** Maximum latency threshold for tunnel selection */
  maxLatencyThreshold: number;
  /** Enable automatic failover */
  enableFailover: boolean;
  /** Failover timeout in milliseconds */
  failoverTimeout: number;
  /** Enable tunnel weight adjustment based on performance */
  enableDynamicWeights: boolean;
  /** Weight adjustment interval in milliseconds */
  weightAdjustmentInterval: number;
}

/**
 * Tunnel weight information
 */
export interface TunnelWeight {
  connectionId: string;
  weight: number;
  baseWeight: number;
  performanceMultiplier: number;
  healthMultiplier: number;
  lastUpdated: Date;
}

/**
 * Load balancing statistics
 */
export interface LoadBalancingStats {
  totalRequests: number;
  requestsPerTunnel: Map<string, number>;
  averageResponseTime: number;
  failoverCount: number;
  lastFailover: Date | null;
  activeStrategy: LoadBalancingStrategy;
  tunnelUtilization: Map<string, number>;
}

/**
 * Tunnel selection result
 */
export interface TunnelSelection {
  connection: TunnelConnection;
  reason: string;
  weight: number;
  healthScore: number;
  latency: number;
  selectionTime: Date;
}

/**
 * Tunnel Load Balancer
 * Implements intelligent load balancing and failover for multiple SSH tunnels
 */
export class TunnelLoadBalancer extends EventEmitter {
  private logger: Logger;
  private tunnelManager: SSHTunnelManager;
  private healthMonitor: TunnelHealthMonitor;
  private stateTracker: TunnelStateTracker;
  private config: TunnelPoolConfig;
  private tunnelWeights: Map<string, TunnelWeight>;
  private loadBalancingStats: LoadBalancingStats;
  private roundRobinIndex: number;
  private weightAdjustmentTimer: NodeJS.Timeout | null;
  private isEnabled: boolean;

  constructor(
    logger: Logger,
    tunnelManager: SSHTunnelManager,
    healthMonitor: TunnelHealthMonitor,
    stateTracker: TunnelStateTracker,
    config?: Partial<TunnelPoolConfig>
  ) {
    super();
    this.logger = logger;
    this.tunnelManager = tunnelManager;
    this.healthMonitor = healthMonitor;
    this.stateTracker = stateTracker;
    this.tunnelWeights = new Map();
    this.roundRobinIndex = 0;
    this.weightAdjustmentTimer = null;
    this.isEnabled = false;

    // Default configuration
    this.config = {
      minActiveTunnels: 1,
      maxActiveTunnels: 3,
      strategy: LoadBalancingStrategy.HEALTH_BASED,
      healthThreshold: 70,
      maxLatencyThreshold: 1000,
      enableFailover: true,
      failoverTimeout: 30000,
      enableDynamicWeights: true,
      weightAdjustmentInterval: 60000,
      ...config
    };

    // Initialize statistics
    this.loadBalancingStats = {
      totalRequests: 0,
      requestsPerTunnel: new Map(),
      averageResponseTime: 0,
      failoverCount: 0,
      lastFailover: null,
      activeStrategy: this.config.strategy,
      tunnelUtilization: new Map()
    };

    this.setupEventListeners();
    this.logger.info('Tunnel Load Balancer initialized', this.config);
  }

  /**
   * Enable load balancing
   */
  enable(): void {
    if (this.isEnabled) {
      this.logger.warn('Load balancing is already enabled');
      return;
    }

    this.isEnabled = true;
    this.logger.info('Load balancing enabled');

    // Initialize tunnel weights
    this.initializeTunnelWeights();

    // Start dynamic weight adjustment if enabled
    if (this.config.enableDynamicWeights) {
      this.startWeightAdjustment();
    }

    this.emit('loadBalancingEnabled');
  }

  /**
   * Disable load balancing
   */
  disable(): void {
    if (!this.isEnabled) {
      this.logger.warn('Load balancing is already disabled');
      return;
    }

    this.isEnabled = false;
    this.logger.info('Load balancing disabled');

    // Stop weight adjustment
    if (this.weightAdjustmentTimer) {
      clearInterval(this.weightAdjustmentTimer);
      this.weightAdjustmentTimer = null;
    }

    this.emit('loadBalancingDisabled');
  }

  /**
   * Select the best tunnel for a request
   * 
   * @param excludeConnections - Connection IDs to exclude from selection
   * @returns Selected tunnel or null if none available
   */
  selectTunnel(excludeConnections: string[] = []): TunnelSelection | null {
    if (!this.isEnabled) {
      throw new Error('Load balancing is not enabled');
    }

    const availableTunnels = this.getAvailableTunnels(excludeConnections);
    
    if (availableTunnels.length === 0) {
      this.logger.warn('No available tunnels for selection');
      return null;
    }

    let selectedConnection: TunnelConnection;
    let selectionReason: string;

    switch (this.config.strategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        selectedConnection = this.selectRoundRobin(availableTunnels);
        selectionReason = 'Round robin selection';
        break;

      case LoadBalancingStrategy.LEAST_CONNECTIONS:
        selectedConnection = this.selectLeastConnections(availableTunnels);
        selectionReason = 'Least connections selection';
        break;

      case LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN:
        selectedConnection = this.selectWeightedRoundRobin(availableTunnels);
        selectionReason = 'Weighted round robin selection';
        break;

      case LoadBalancingStrategy.HEALTH_BASED:
        selectedConnection = this.selectHealthBased(availableTunnels);
        selectionReason = 'Health-based selection';
        break;

      case LoadBalancingStrategy.LATENCY_BASED:
        selectedConnection = this.selectLatencyBased(availableTunnels);
        selectionReason = 'Latency-based selection';
        break;

      case LoadBalancingStrategy.RANDOM:
        selectedConnection = this.selectRandom(availableTunnels);
        selectionReason = 'Random selection';
        break;

      default:
        selectedConnection = availableTunnels[0];
        selectionReason = 'Default selection';
    }

    // Get additional metrics for the selection
    const healthMetrics = this.healthMonitor.getHealthMetrics(selectedConnection.id);
    const tunnelWeight = this.tunnelWeights.get(selectedConnection.id);

    const selection: TunnelSelection = {
      connection: selectedConnection,
      reason: selectionReason,
      weight: tunnelWeight?.weight || 1,
      healthScore: healthMetrics?.healthScore || 0,
      latency: healthMetrics?.latency || 0,
      selectionTime: new Date()
    };

    // Update statistics
    this.updateSelectionStats(selectedConnection.id);

    this.logger.debug(`Tunnel selected: ${selectedConnection.id}`, {
      strategy: this.config.strategy,
      reason: selectionReason,
      healthScore: selection.healthScore,
      latency: selection.latency
    });

    this.emit('tunnelSelected', selection);
    return selection;
  }

  /**
   * Get available tunnels for load balancing
   * 
   * @param excludeConnections - Connection IDs to exclude
   * @returns Array of available tunnel connections
   */
  getAvailableTunnels(excludeConnections: string[] = []): TunnelConnection[] {
    const allConnections = this.tunnelManager.getAllConnections();
    
    return allConnections.filter(connection => {
      // Exclude specified connections
      if (excludeConnections.includes(connection.id)) {
        return false;
      }

      // Must be connected
      if (connection.state !== TunnelState.CONNECTED) {
        return false;
      }

      // Check health threshold
      const healthMetrics = this.healthMonitor.getHealthMetrics(connection.id);
      if (healthMetrics && healthMetrics.healthScore < this.config.healthThreshold) {
        return false;
      }

      // Check latency threshold
      if (healthMetrics && healthMetrics.latency > this.config.maxLatencyThreshold) {
        return false;
      }

      return true;
    });
  }

  /**
   * Perform failover to backup tunnels
   * 
   * @param failedConnectionId - ID of the failed connection
   * @returns New tunnel selection or null if no alternatives
   */
  async performFailover(failedConnectionId: string): Promise<TunnelSelection | null> {
    if (!this.config.enableFailover) {
      this.logger.warn('Failover is disabled');
      return null;
    }

    this.logger.warn(`Performing failover from connection: ${failedConnectionId}`);

    // Update failover statistics
    this.loadBalancingStats.failoverCount++;
    this.loadBalancingStats.lastFailover = new Date();

    // Select alternative tunnel
    const alternativeTunnel = this.selectTunnel([failedConnectionId]);
    
    if (!alternativeTunnel) {
      this.logger.error('No alternative tunnels available for failover');
      this.emit('failoverFailed', failedConnectionId);
      return null;
    }

    this.logger.info(`Failover successful: ${failedConnectionId} -> ${alternativeTunnel.connection.id}`);
    this.emit('failoverSuccessful', failedConnectionId, alternativeTunnel);

    return alternativeTunnel;
  }

  /**
   * Get load balancing statistics
   * 
   * @returns Current load balancing statistics
   */
  getLoadBalancingStats(): LoadBalancingStats {
    return { ...this.loadBalancingStats };
  }

  /**
   * Get tunnel weights
   * 
   * @returns Map of tunnel weights
   */
  getTunnelWeights(): Map<string, TunnelWeight> {
    return new Map(this.tunnelWeights);
  }

  /**
   * Update tunnel weight manually
   * 
   * @param connectionId - Connection identifier
   * @param weight - New weight value
   */
  updateTunnelWeight(connectionId: string, weight: number): void {
    const tunnelWeight = this.tunnelWeights.get(connectionId);
    if (!tunnelWeight) {
      this.logger.warn(`Tunnel weight not found: ${connectionId}`);
      return;
    }

    tunnelWeight.weight = Math.max(0.1, Math.min(10, weight)); // Clamp between 0.1 and 10
    tunnelWeight.lastUpdated = new Date();

    this.logger.info(`Updated tunnel weight: ${connectionId}`, { weight: tunnelWeight.weight });
    this.emit('tunnelWeightUpdated', connectionId, tunnelWeight);
  }

  /**
   * Update load balancing strategy
   * 
   * @param strategy - New load balancing strategy
   */
  updateStrategy(strategy: LoadBalancingStrategy): void {
    const oldStrategy = this.config.strategy;
    this.config.strategy = strategy;
    this.loadBalancingStats.activeStrategy = strategy;

    // Reset round robin index when changing strategy
    if (strategy === LoadBalancingStrategy.ROUND_ROBIN || strategy === LoadBalancingStrategy.WEIGHTED_ROUND_ROBIN) {
      this.roundRobinIndex = 0;
    }

    this.logger.info(`Load balancing strategy updated: ${oldStrategy} -> ${strategy}`);
    this.emit('strategyUpdated', oldStrategy, strategy);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for tunnel connections
    this.tunnelManager.on('tunnelConnected', (connection) => {
      this.initializeTunnelWeight(connection.id);
    });

    // Listen for tunnel disconnections
    this.tunnelManager.on('tunnelDisconnected', (connection) => {
      this.tunnelWeights.delete(connection.id);
    });

    // Listen for health changes
    this.healthMonitor.on('connectionUnhealthy', (connection) => {
      if (this.config.enableFailover) {
        this.performFailover(connection.id);
      }
    });
  }

  /**
   * Initialize tunnel weights for all connections
   */
  private initializeTunnelWeights(): void {
    const connections = this.tunnelManager.getAllConnections();
    
    for (const connection of connections) {
      this.initializeTunnelWeight(connection.id);
    }
  }

  /**
   * Initialize weight for a specific tunnel
   * 
   * @param connectionId - Connection identifier
   */
  private initializeTunnelWeight(connectionId: string): void {
    if (this.tunnelWeights.has(connectionId)) {
      return;
    }

    const weight: TunnelWeight = {
      connectionId,
      weight: 1.0,
      baseWeight: 1.0,
      performanceMultiplier: 1.0,
      healthMultiplier: 1.0,
      lastUpdated: new Date()
    };

    this.tunnelWeights.set(connectionId, weight);
    this.loadBalancingStats.requestsPerTunnel.set(connectionId, 0);
    this.loadBalancingStats.tunnelUtilization.set(connectionId, 0);

    this.logger.debug(`Initialized tunnel weight: ${connectionId}`);
  }

  /**
   * Start dynamic weight adjustment
   */
  private startWeightAdjustment(): void {
    if (this.weightAdjustmentTimer) {
      clearInterval(this.weightAdjustmentTimer);
    }

    this.weightAdjustmentTimer = setInterval(() => {
      this.adjustTunnelWeights();
    }, this.config.weightAdjustmentInterval);

    this.logger.info('Started dynamic weight adjustment');
  }

  /**
   * Adjust tunnel weights based on performance
   */
  private adjustTunnelWeights(): void {
    for (const [connectionId, weight] of this.tunnelWeights.entries()) {
      const healthMetrics = this.healthMonitor.getHealthMetrics(connectionId);
      if (!healthMetrics) continue;

      // Calculate performance multiplier based on latency and health
      const latencyMultiplier = Math.max(0.1, 1 - (healthMetrics.latency / this.config.maxLatencyThreshold));
      const healthMultiplier = Math.max(0.1, healthMetrics.healthScore / 100);

      weight.performanceMultiplier = latencyMultiplier;
      weight.healthMultiplier = healthMultiplier;
      weight.weight = weight.baseWeight * weight.performanceMultiplier * weight.healthMultiplier;
      weight.lastUpdated = new Date();

      this.logger.debug(`Adjusted tunnel weight: ${connectionId}`, {
        weight: weight.weight,
        latencyMultiplier,
        healthMultiplier
      });
    }

    this.emit('weightsAdjusted', this.tunnelWeights);
  }

  /**
   * Select tunnel using round robin strategy
   * 
   * @param availableTunnels - Available tunnel connections
   * @returns Selected tunnel connection
   */
  private selectRoundRobin(availableTunnels: TunnelConnection[]): TunnelConnection {
    const selected = availableTunnels[this.roundRobinIndex % availableTunnels.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % availableTunnels.length;
    return selected;
  }

  /**
   * Select tunnel using least connections strategy
   * 
   * @param availableTunnels - Available tunnel connections
   * @returns Selected tunnel connection
   */
  private selectLeastConnections(availableTunnels: TunnelConnection[]): TunnelConnection {
    return availableTunnels.reduce((least, current) => {
      const leastRequests = this.loadBalancingStats.requestsPerTunnel.get(least.id) || 0;
      const currentRequests = this.loadBalancingStats.requestsPerTunnel.get(current.id) || 0;
      return currentRequests < leastRequests ? current : least;
    });
  }

  /**
   * Select tunnel using weighted round robin strategy
   * 
   * @param availableTunnels - Available tunnel connections
   * @returns Selected tunnel connection
   */
  private selectWeightedRoundRobin(availableTunnels: TunnelConnection[]): TunnelConnection {
    // Calculate total weight
    const totalWeight = availableTunnels.reduce((sum, tunnel) => {
      const weight = this.tunnelWeights.get(tunnel.id)?.weight || 1;
      return sum + weight;
    }, 0);

    // Generate random number
    let random = Math.random() * totalWeight;

    // Select based on weight
    for (const tunnel of availableTunnels) {
      const weight = this.tunnelWeights.get(tunnel.id)?.weight || 1;
      random -= weight;
      if (random <= 0) {
        return tunnel;
      }
    }

    // Fallback to first tunnel
    return availableTunnels[0];
  }

  /**
   * Select tunnel using health-based strategy
   * 
   * @param availableTunnels - Available tunnel connections
   * @returns Selected tunnel connection
   */
  private selectHealthBased(availableTunnels: TunnelConnection[]): TunnelConnection {
    return availableTunnels.reduce((best, current) => {
      const bestHealth = this.healthMonitor.getHealthMetrics(best.id)?.healthScore || 0;
      const currentHealth = this.healthMonitor.getHealthMetrics(current.id)?.healthScore || 0;
      return currentHealth > bestHealth ? current : best;
    });
  }

  /**
   * Select tunnel using latency-based strategy
   * 
   * @param availableTunnels - Available tunnel connections
   * @returns Selected tunnel connection
   */
  private selectLatencyBased(availableTunnels: TunnelConnection[]): TunnelConnection {
    return availableTunnels.reduce((best, current) => {
      const bestLatency = this.healthMonitor.getHealthMetrics(best.id)?.latency || Infinity;
      const currentLatency = this.healthMonitor.getHealthMetrics(current.id)?.latency || Infinity;
      return currentLatency < bestLatency ? current : best;
    });
  }

  /**
   * Select tunnel using random strategy
   * 
   * @param availableTunnels - Available tunnel connections
   * @returns Selected tunnel connection
   */
  private selectRandom(availableTunnels: TunnelConnection[]): TunnelConnection {
    const randomIndex = Math.floor(Math.random() * availableTunnels.length);
    return availableTunnels[randomIndex];
  }

  /**
   * Update selection statistics
   * 
   * @param connectionId - Selected connection ID
   */
  private updateSelectionStats(connectionId: string): void {
    this.loadBalancingStats.totalRequests++;
    
    const currentRequests = this.loadBalancingStats.requestsPerTunnel.get(connectionId) || 0;
    this.loadBalancingStats.requestsPerTunnel.set(connectionId, currentRequests + 1);

    // Update utilization
    const totalRequests = this.loadBalancingStats.totalRequests;
    for (const [tunnelId, requests] of this.loadBalancingStats.requestsPerTunnel.entries()) {
      const utilization = (requests / totalRequests) * 100;
      this.loadBalancingStats.tunnelUtilization.set(tunnelId, utilization);
    }
  }

  /**
   * Cleanup load balancer resources
   */
  cleanup(): void {
    this.disable();
    this.tunnelWeights.clear();
    this.loadBalancingStats.requestsPerTunnel.clear();
    this.loadBalancingStats.tunnelUtilization.clear();
    this.logger.info('Tunnel load balancer cleanup completed');
  }
}
