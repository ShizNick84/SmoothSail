import { EventEmitter } from 'events';
import { Logger } from '../core/logging/logger';
import { TunnelConnection, TunnelState } from './ssh-tunnel-manager';

/**
 * Connection state change event
 */
export interface StateChangeEvent {
  connectionId: string;
  previousState: TunnelState;
  currentState: TunnelState;
  timestamp: Date;
  duration: number; // Time spent in previous state (ms)
  metadata?: Record<string, any>;
}

/**
 * Connection state history entry
 */
export interface StateHistoryEntry {
  state: TunnelState;
  timestamp: Date;
  duration: number;
  metadata?: Record<string, any>;
}

/**
 * Connection state statistics
 */
export interface StateStatistics {
  connectionId: string;
  totalUptime: number;
  totalDowntime: number;
  connectionAttempts: number;
  successfulConnections: number;
  failedConnections: number;
  averageConnectionTime: number;
  longestConnection: number;
  shortestConnection: number;
  stateDistribution: Record<TunnelState, number>;
  reliability: number; // Percentage (0-100)
}

/**
 * Tunnel State Tracker
 * Tracks and manages SSH tunnel connection states with comprehensive history and analytics
 */
export class TunnelStateTracker extends EventEmitter {
  private logger: Logger;
  private stateHistory: Map<string, StateHistoryEntry[]>;
  private currentStates: Map<string, TunnelState>;
  private stateTimestamps: Map<string, Date>;
  private statistics: Map<string, StateStatistics>;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    this.stateHistory = new Map();
    this.currentStates = new Map();
    this.stateTimestamps = new Map();
    this.statistics = new Map();

    this.logger.info('Tunnel State Tracker initialized');
  }

  /**
   * Track connection state change
   * Records state transitions and updates statistics
   * 
   * @param connection - Tunnel connection
   * @param previousState - Previous connection state
   * @param currentState - Current connection state
   * @param metadata - Additional metadata for the state change
   */
  trackStateChange(
    connection: TunnelConnection,
    previousState: TunnelState,
    currentState: TunnelState,
    metadata?: Record<string, any>
  ): void {
    const connectionId = connection.id;
    const now = new Date();
    
    // Calculate duration in previous state
    const previousTimestamp = this.stateTimestamps.get(connectionId) || now;
    const duration = now.getTime() - previousTimestamp.getTime();

    // Create state change event
    const stateChangeEvent: StateChangeEvent = {
      connectionId,
      previousState,
      currentState,
      timestamp: now,
      duration,
      metadata
    };

    // Update current state tracking
    this.currentStates.set(connectionId, currentState);
    this.stateTimestamps.set(connectionId, now);

    // Add to history
    this.addToHistory(connectionId, previousState, previousTimestamp, duration, metadata);

    // Update statistics
    this.updateStatistics(connectionId, previousState, currentState, duration);

    // Log state change
    this.logger.info(`Tunnel state changed: ${connectionId}`, {
      from: previousState,
      to: currentState,
      duration: `${duration}ms`,
      metadata
    });

    // Emit state change event
    this.emit('stateChanged', stateChangeEvent);

    // Emit specific state events
    this.emitStateSpecificEvents(connection, currentState, stateChangeEvent);
  }

  /**
   * Get current state of a connection
   * 
   * @param connectionId - Connection identifier
   * @returns Current tunnel state or undefined
   */
  getCurrentState(connectionId: string): TunnelState | undefined {
    return this.currentStates.get(connectionId);
  }

  /**
   * Get state history for a connection
   * 
   * @param connectionId - Connection identifier
   * @param limit - Maximum number of history entries to return
   * @returns Array of state history entries
   */
  getStateHistory(connectionId: string, limit?: number): StateHistoryEntry[] {
    const history = this.stateHistory.get(connectionId) || [];
    return limit ? history.slice(-limit) : [...history];
  }

  /**
   * Get connection statistics
   * 
   * @param connectionId - Connection identifier
   * @returns Connection statistics or undefined
   */
  getStatistics(connectionId: string): StateStatistics | undefined {
    return this.statistics.get(connectionId);
  }

  /**
   * Get all connection statistics
   * 
   * @returns Map of all connection statistics
   */
  getAllStatistics(): Map<string, StateStatistics> {
    return new Map(this.statistics);
  }

  /**
   * Get connections by current state
   * 
   * @param state - Tunnel state to filter by
   * @returns Array of connection IDs in the specified state
   */
  getConnectionsByState(state: TunnelState): string[] {
    const connections: string[] = [];
    
    for (const [connectionId, currentState] of this.currentStates.entries()) {
      if (currentState === state) {
        connections.push(connectionId);
      }
    }
    
    return connections;
  }

  /**
   * Get overall system health metrics
   * 
   * @returns System health metrics
   */
  getSystemHealthMetrics(): {
    totalConnections: number;
    activeConnections: number;
    failedConnections: number;
    averageReliability: number;
    systemUptime: number;
  } {
    const allStats = Array.from(this.statistics.values());
    
    const totalConnections = allStats.length;
    const activeConnections = this.getConnectionsByState(TunnelState.CONNECTED).length;
    const failedConnections = this.getConnectionsByState(TunnelState.FAILED).length;
    
    const averageReliability = totalConnections > 0 
      ? allStats.reduce((sum, stats) => sum + stats.reliability, 0) / totalConnections
      : 0;
    
    const systemUptime = totalConnections > 0
      ? allStats.reduce((sum, stats) => sum + stats.totalUptime, 0) / totalConnections
      : 0;

    return {
      totalConnections,
      activeConnections,
      failedConnections,
      averageReliability,
      systemUptime
    };
  }

  /**
   * Clear history for a connection
   * 
   * @param connectionId - Connection identifier
   */
  clearHistory(connectionId: string): void {
    this.stateHistory.delete(connectionId);
    this.currentStates.delete(connectionId);
    this.stateTimestamps.delete(connectionId);
    this.statistics.delete(connectionId);
    
    this.logger.info(`Cleared state history for connection: ${connectionId}`);
  }

  /**
   * Clear all history
   */
  clearAllHistory(): void {
    this.stateHistory.clear();
    this.currentStates.clear();
    this.stateTimestamps.clear();
    this.statistics.clear();
    
    this.logger.info('Cleared all state history');
  }

  /**
   * Add entry to state history
   * 
   * @param connectionId - Connection identifier
   * @param state - Tunnel state
   * @param timestamp - State timestamp
   * @param duration - Duration in state
   * @param metadata - Additional metadata
   */
  private addToHistory(
    connectionId: string,
    state: TunnelState,
    timestamp: Date,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.stateHistory.has(connectionId)) {
      this.stateHistory.set(connectionId, []);
    }

    const history = this.stateHistory.get(connectionId)!;
    history.push({
      state,
      timestamp,
      duration,
      metadata
    });

    // Limit history size to prevent memory issues
    const maxHistorySize = 1000;
    if (history.length > maxHistorySize) {
      history.splice(0, history.length - maxHistorySize);
    }
  }

  /**
   * Update connection statistics
   * 
   * @param connectionId - Connection identifier
   * @param previousState - Previous state
   * @param currentState - Current state
   * @param duration - Duration in previous state
   */
  private updateStatistics(
    connectionId: string,
    previousState: TunnelState,
    currentState: TunnelState,
    duration: number
  ): void {
    if (!this.statistics.has(connectionId)) {
      this.statistics.set(connectionId, {
        connectionId,
        totalUptime: 0,
        totalDowntime: 0,
        connectionAttempts: 0,
        successfulConnections: 0,
        failedConnections: 0,
        averageConnectionTime: 0,
        longestConnection: 0,
        shortestConnection: Infinity,
        stateDistribution: {
          [TunnelState.DISCONNECTED]: 0,
          [TunnelState.CONNECTING]: 0,
          [TunnelState.CONNECTED]: 0,
          [TunnelState.RECONNECTING]: 0,
          [TunnelState.FAILED]: 0,
          [TunnelState.TERMINATED]: 0
        },
        reliability: 0
      });
    }

    const stats = this.statistics.get(connectionId)!;

    // Update state distribution
    stats.stateDistribution[previousState] += duration;

    // Update uptime/downtime
    if (previousState === TunnelState.CONNECTED) {
      stats.totalUptime += duration;
      
      // Update connection duration statistics
      if (duration > stats.longestConnection) {
        stats.longestConnection = duration;
      }
      if (duration < stats.shortestConnection) {
        stats.shortestConnection = duration;
      }
    } else {
      stats.totalDowntime += duration;
    }

    // Track connection attempts and outcomes
    if (currentState === TunnelState.CONNECTING) {
      stats.connectionAttempts++;
    } else if (currentState === TunnelState.CONNECTED && previousState === TunnelState.CONNECTING) {
      stats.successfulConnections++;
    } else if (currentState === TunnelState.FAILED) {
      stats.failedConnections++;
    }

    // Calculate average connection time
    if (stats.successfulConnections > 0) {
      stats.averageConnectionTime = stats.totalUptime / stats.successfulConnections;
    }

    // Calculate reliability percentage
    const totalTime = stats.totalUptime + stats.totalDowntime;
    if (totalTime > 0) {
      stats.reliability = (stats.totalUptime / totalTime) * 100;
    }

    // Handle edge case for shortest connection
    if (stats.shortestConnection === Infinity) {
      stats.shortestConnection = 0;
    }
  }

  /**
   * Emit state-specific events
   * 
   * @param connection - Tunnel connection
   * @param currentState - Current state
   * @param stateChangeEvent - State change event
   */
  private emitStateSpecificEvents(
    connection: TunnelConnection,
    currentState: TunnelState,
    stateChangeEvent: StateChangeEvent
  ): void {
    switch (currentState) {
      case TunnelState.CONNECTED:
        this.emit('connectionEstablished', connection, stateChangeEvent);
        break;
      
      case TunnelState.DISCONNECTED:
        this.emit('connectionLost', connection, stateChangeEvent);
        break;
      
      case TunnelState.FAILED:
        this.emit('connectionFailed', connection, stateChangeEvent);
        break;
      
      case TunnelState.RECONNECTING:
        this.emit('reconnectionStarted', connection, stateChangeEvent);
        break;
      
      case TunnelState.TERMINATED:
        this.emit('connectionTerminated', connection, stateChangeEvent);
        break;
    }
  }

  /**
   * Generate state report for a connection
   * 
   * @param connectionId - Connection identifier
   * @returns Detailed state report
   */
  generateStateReport(connectionId: string): {
    connectionId: string;
    currentState: TunnelState | undefined;
    statistics: StateStatistics | undefined;
    recentHistory: StateHistoryEntry[];
    healthScore: number;
  } {
    const currentState = this.getCurrentState(connectionId);
    const statistics = this.getStatistics(connectionId);
    const recentHistory = this.getStateHistory(connectionId, 10);
    
    // Calculate health score based on reliability and recent activity
    let healthScore = 0;
    if (statistics) {
      healthScore = statistics.reliability;
      
      // Adjust based on recent failures
      const recentFailures = recentHistory.filter(
        entry => entry.state === TunnelState.FAILED
      ).length;
      
      if (recentFailures > 0) {
        healthScore = Math.max(0, healthScore - (recentFailures * 10));
      }
      
      // Boost score if currently connected
      if (currentState === TunnelState.CONNECTED) {
        healthScore = Math.min(100, healthScore + 10);
      }
    }

    return {
      connectionId,
      currentState,
      statistics,
      recentHistory,
      healthScore
    };
  }
}