import { EventEmitter } from 'events';
import { Logger } from '../core/logging/logger';
import { TunnelConnection, TunnelState, SSHTunnelManager } from './ssh-tunnel-manager';
import { TunnelStateTracker } from './tunnel-state-tracker';

/**
 * Tunnel health metrics
 */
export interface TunnelHealthMetrics {
  connectionId: string;
  isHealthy: boolean;
  latency: number; // ms
  throughput: number; // bytes/sec
  packetLoss: number; // percentage
  uptime: number; // ms
  lastHealthCheck: Date;
  consecutiveFailures: number;
  healthScore: number; // 0-100
  issues: HealthIssue[];
}

/**
 * Health issue types
 */
export interface HealthIssue {
  type: 'HIGH_LATENCY' | 'PACKET_LOSS' | 'LOW_THROUGHPUT' | 'CONNECTION_UNSTABLE' | 'AUTHENTICATION_FAILURE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Health monitoring configuration
 */
export interface HealthMonitorConfig {
  /** Health check interval in milliseconds */
  checkInterval: number;
  /** Maximum acceptable latency in milliseconds */
  maxLatency: number;
  /** Maximum acceptable packet loss percentage */
  maxPacketLoss: number;
  /** Minimum acceptable throughput in bytes/sec */
  minThroughput: number;
  /** Number of consecutive failures before marking unhealthy */
  failureThreshold: number;
  /** Health check timeout in milliseconds */
  healthCheckTimeout: number;
  /** Enable detailed performance monitoring */
  enablePerformanceMonitoring: boolean;
}

/**
 * Performance metrics for tunnel monitoring
 */
export interface PerformanceMetrics {
  timestamp: Date;
  latency: number;
  throughput: number;
  packetLoss: number;
  cpuUsage: number;
  memoryUsage: number;
  networkUtilization: number;
}

/**
 * Tunnel Health Monitor
 * Monitors SSH tunnel health with real-time metrics collection and alerting
 */
export class TunnelHealthMonitor extends EventEmitter {
  private logger: Logger;
  private tunnelManager: SSHTunnelManager;
  private stateTracker: TunnelStateTracker;
  private config: HealthMonitorConfig;
  private healthMetrics: Map<string, TunnelHealthMetrics>;
  private performanceHistory: Map<string, PerformanceMetrics[]>;
  private monitoringIntervals: Map<string, NodeJS.Timeout>;
  private isMonitoring: boolean;

  constructor(
    logger: Logger,
    tunnelManager: SSHTunnelManager,
    stateTracker: TunnelStateTracker,
    config?: Partial<HealthMonitorConfig>
  ) {
    super();
    this.logger = logger;
    this.tunnelManager = tunnelManager;
    this.stateTracker = stateTracker;
    this.healthMetrics = new Map();
    this.performanceHistory = new Map();
    this.monitoringIntervals = new Map();
    this.isMonitoring = false;

    // Default configuration
    this.config = {
      checkInterval: 30000, // 30 seconds
      maxLatency: 1000, // 1 second
      maxPacketLoss: 5, // 5%
      minThroughput: 1024, // 1 KB/s
      failureThreshold: 3,
      healthCheckTimeout: 10000, // 10 seconds
      enablePerformanceMonitoring: true,
      ...config
    };

    this.logger.info('Tunnel Health Monitor initialized', this.config);
  }

  /**
   * Start monitoring all tunnel connections
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      this.logger.warn('Health monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.logger.info('Starting tunnel health monitoring');

    // Monitor existing connections
    const connections = this.tunnelManager.getAllConnections();
    for (const connection of connections) {
      this.startMonitoringConnection(connection.id);
    }

    // Listen for new connections
    this.tunnelManager.on('tunnelConnected', (connection) => {
      this.startMonitoringConnection(connection.id);
    });

    // Listen for disconnections
    this.tunnelManager.on('tunnelDisconnected', (connection) => {
      this.stopMonitoringConnection(connection.id);
    });

    this.emit('monitoringStarted');
  }

  /**
   * Stop monitoring all tunnel connections
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      this.logger.warn('Health monitoring is not running');
      return;
    }

    this.isMonitoring = false;
    this.logger.info('Stopping tunnel health monitoring');

    // Clear all monitoring intervals
    for (const [connectionId, interval] of this.monitoringIntervals.entries()) {
      clearInterval(interval);
      this.monitoringIntervals.delete(connectionId);
    }

    this.emit('monitoringStopped');
  }

  /**
   * Start monitoring a specific connection
   * 
   * @param connectionId - Connection identifier
   */
  startMonitoringConnection(connectionId: string): void {
    if (this.monitoringIntervals.has(connectionId)) {
      this.logger.debug(`Already monitoring connection: ${connectionId}`);
      return;
    }

    this.logger.info(`Starting health monitoring for connection: ${connectionId}`);

    // Initialize health metrics
    this.initializeHealthMetrics(connectionId);

    // Start periodic health checks
    const interval = setInterval(async () => {
      try {
        await this.performHealthCheck(connectionId);
      } catch (error) {
        this.logger.error(`Health check failed for connection ${connectionId}`, error);
      }
    }, this.config.checkInterval);

    this.monitoringIntervals.set(connectionId, interval);

    // Perform initial health check
    setTimeout(() => this.performHealthCheck(connectionId), 1000);
  }

  /**
   * Stop monitoring a specific connection
   * 
   * @param connectionId - Connection identifier
   */
  stopMonitoringConnection(connectionId: string): void {
    const interval = this.monitoringIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(connectionId);
      this.logger.info(`Stopped health monitoring for connection: ${connectionId}`);
    }
  }

  /**
   * Get health metrics for a connection
   * 
   * @param connectionId - Connection identifier
   * @returns Health metrics or undefined
   */
  getHealthMetrics(connectionId: string): TunnelHealthMetrics | undefined {
    return this.healthMetrics.get(connectionId);
  }

  /**
   * Get health metrics for all connections
   * 
   * @returns Map of all health metrics
   */
  getAllHealthMetrics(): Map<string, TunnelHealthMetrics> {
    return new Map(this.healthMetrics);
  }

  /**
   * Get performance history for a connection
   * 
   * @param connectionId - Connection identifier
   * @param limit - Maximum number of history entries
   * @returns Array of performance metrics
   */
  getPerformanceHistory(connectionId: string, limit?: number): PerformanceMetrics[] {
    const history = this.performanceHistory.get(connectionId) || [];
    return limit ? history.slice(-limit) : [...history];
  }

  /**
   * Get overall system health status
   * 
   * @returns System health summary
   */
  getSystemHealthStatus(): {
    totalConnections: number;
    healthyConnections: number;
    unhealthyConnections: number;
    averageHealthScore: number;
    criticalIssues: number;
    systemHealthScore: number;
  } {
    const allMetrics = Array.from(this.healthMetrics.values());
    const totalConnections = allMetrics.length;
    const healthyConnections = allMetrics.filter(m => m.isHealthy).length;
    const unhealthyConnections = totalConnections - healthyConnections;
    
    const averageHealthScore = totalConnections > 0
      ? allMetrics.reduce((sum, m) => sum + m.healthScore, 0) / totalConnections
      : 0;

    const criticalIssues = allMetrics.reduce(
      (sum, m) => sum + m.issues.filter(i => i.severity === 'CRITICAL').length,
      0
    );

    const systemHealthScore = Math.max(0, averageHealthScore - (criticalIssues * 10));

    return {
      totalConnections,
      healthyConnections,
      unhealthyConnections,
      averageHealthScore,
      criticalIssues,
      systemHealthScore
    };
  }

  /**
   * Force health check for a connection
   * 
   * @param connectionId - Connection identifier
   * @returns Health check results
   */
  async forceHealthCheck(connectionId: string): Promise<TunnelHealthMetrics | null> {
    try {
      await this.performHealthCheck(connectionId);
      return this.getHealthMetrics(connectionId) || null;
    } catch (error) {
      this.logger.error(`Forced health check failed for connection ${connectionId}`, error);
      return null;
    }
  }

  /**
   * Initialize health metrics for a connection
   * 
   * @param connectionId - Connection identifier
   */
  private initializeHealthMetrics(connectionId: string): void {
    const metrics: TunnelHealthMetrics = {
      connectionId,
      isHealthy: false,
      latency: 0,
      throughput: 0,
      packetLoss: 0,
      uptime: 0,
      lastHealthCheck: new Date(),
      consecutiveFailures: 0,
      healthScore: 0,
      issues: []
    };

    this.healthMetrics.set(connectionId, metrics);
    this.performanceHistory.set(connectionId, []);
  }

  /**
   * Perform comprehensive health check for a connection
   * 
   * @param connectionId - Connection identifier
   */
  private async performHealthCheck(connectionId: string): Promise<void> {
    const connection = this.tunnelManager.getConnection(connectionId);
    if (!connection) {
      this.logger.warn(`Connection not found for health check: ${connectionId}`);
      return;
    }

    const metrics = this.healthMetrics.get(connectionId);
    if (!metrics) {
      this.logger.warn(`Health metrics not found for connection: ${connectionId}`);
      return;
    }

    try {
      // Update last health check timestamp
      metrics.lastHealthCheck = new Date();

      // Check connection state
      if (connection.state !== TunnelState.CONNECTED) {
        this.markConnectionUnhealthy(metrics, 'Connection not in CONNECTED state');
        return;
      }

      // Perform latency test
      const latency = await this.measureLatency(connection);
      metrics.latency = latency;

      // Perform throughput test
      const throughput = await this.measureThroughput(connection);
      metrics.throughput = throughput;

      // Measure packet loss
      const packetLoss = await this.measurePacketLoss(connection);
      metrics.packetLoss = packetLoss;

      // Calculate uptime
      if (connection.connectedAt) {
        metrics.uptime = Date.now() - connection.connectedAt.getTime();
      }

      // Analyze health issues
      const issues = this.analyzeHealthIssues(metrics);
      metrics.issues = issues;

      // Calculate health score
      metrics.healthScore = this.calculateHealthScore(metrics);

      // Determine overall health status
      const wasHealthy = metrics.isHealthy;
      metrics.isHealthy = this.determineHealthStatus(metrics);

      // Handle health status changes
      if (metrics.isHealthy) {
        metrics.consecutiveFailures = 0;
        if (!wasHealthy) {
          this.logger.info(`Connection health restored: ${connectionId}`);
          this.emit('connectionHealthy', connection, metrics);
        }
      } else {
        metrics.consecutiveFailures++;
        if (wasHealthy) {
          this.logger.warn(`Connection health degraded: ${connectionId}`, {
            issues: issues.map(i => i.message)
          });
          this.emit('connectionUnhealthy', connection, metrics);
        }
      }

      // Store performance metrics
      if (this.config.enablePerformanceMonitoring) {
        this.storePerformanceMetrics(connectionId, {
          timestamp: new Date(),
          latency,
          throughput,
          packetLoss,
          cpuUsage: await this.getCPUUsage(),
          memoryUsage: await this.getMemoryUsage(),
          networkUtilization: await this.getNetworkUtilization()
        });
      }

      // Emit health check completed event
      this.emit('healthCheckCompleted', connection, metrics);

    } catch (error) {
      this.logger.error(`Health check failed for connection ${connectionId}`, error);
      this.markConnectionUnhealthy(metrics, `Health check error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Measure connection latency using ping-like test
   * 
   * @param connection - Tunnel connection
   * @returns Latency in milliseconds
   */
  private async measureLatency(connection: TunnelConnection): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Simple TCP connection test to local tunnel port
      const net = await import('net');
      
      return new Promise<number>((resolve, reject) => {
        const socket = new net.Socket();
        const timeout = setTimeout(() => {
          socket.destroy();
          reject(new Error('Latency measurement timeout'));
        }, this.config.healthCheckTimeout);

        socket.connect(connection.config.localPort, 'localhost', () => {
          const latency = Date.now() - startTime;
          clearTimeout(timeout);
          socket.destroy();
          resolve(latency);
        });

        socket.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error) {
      this.logger.debug(`Latency measurement failed for ${connection.id}`, error);
      return 9999; // High latency indicates problem
    }
  }

  /**
   * Measure connection throughput
   * 
   * @param connection - Tunnel connection
   * @returns Throughput in bytes per second
   */
  private async measureThroughput(connection: TunnelConnection): Promise<number> {
    try {
      // Simple throughput test by sending small data packet
      const net = await import('net');
      const testData = Buffer.alloc(1024, 'A'); // 1KB test data
      const startTime = Date.now();

      return new Promise<number>((resolve, reject) => {
        const socket = new net.Socket();
        const timeout = setTimeout(() => {
          socket.destroy();
          reject(new Error('Throughput measurement timeout'));
        }, this.config.healthCheckTimeout);

        let bytesReceived = 0;

        socket.connect(connection.config.localPort, 'localhost', () => {
          socket.write(testData);
        });

        socket.on('data', (data) => {
          bytesReceived += data.length;
          const duration = (Date.now() - startTime) / 1000; // seconds
          const throughput = bytesReceived / duration;
          
          clearTimeout(timeout);
          socket.destroy();
          resolve(throughput);
        });

        socket.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error) {
      this.logger.debug(`Throughput measurement failed for ${connection.id}`, error);
      return 0; // No throughput indicates problem
    }
  }

  /**
   * Measure packet loss percentage
   * 
   * @param connection - Tunnel connection
   * @returns Packet loss percentage
   */
  private async measurePacketLoss(connection: TunnelConnection): Promise<number> {
    try {
      // Simple packet loss test by sending multiple small packets
      const net = await import('net');
      const packetCount = 10;
      let packetsReceived = 0;

      for (let i = 0; i < packetCount; i++) {
        try {
          await new Promise<void>((resolve, reject) => {
            const socket = new net.Socket();
            const timeout = setTimeout(() => {
              socket.destroy();
              resolve(); // Count as lost packet
            }, 1000);

            socket.connect(connection.config.localPort, 'localhost', () => {
              packetsReceived++;
              clearTimeout(timeout);
              socket.destroy();
              resolve();
            });

            socket.on('error', () => {
              clearTimeout(timeout);
              resolve(); // Count as lost packet
            });
          });
        } catch {
          // Packet lost
        }
      }

      const packetLoss = ((packetCount - packetsReceived) / packetCount) * 100;
      return Math.max(0, Math.min(100, packetLoss));

    } catch (error) {
      this.logger.debug(`Packet loss measurement failed for ${connection.id}`, error);
      return 100; // Assume 100% loss on error
    }
  }

  /**
   * Analyze health issues based on metrics
   * 
   * @param metrics - Health metrics
   * @returns Array of health issues
   */
  private analyzeHealthIssues(metrics: TunnelHealthMetrics): HealthIssue[] {
    const issues: HealthIssue[] = [];
    const now = new Date();

    // Check latency
    if (metrics.latency > this.config.maxLatency) {
      issues.push({
        type: 'HIGH_LATENCY',
        severity: metrics.latency > this.config.maxLatency * 2 ? 'HIGH' : 'MEDIUM',
        message: `High latency detected: ${metrics.latency}ms (max: ${this.config.maxLatency}ms)`,
        timestamp: now
      });
    }

    // Check packet loss
    if (metrics.packetLoss > this.config.maxPacketLoss) {
      issues.push({
        type: 'PACKET_LOSS',
        severity: metrics.packetLoss > this.config.maxPacketLoss * 2 ? 'HIGH' : 'MEDIUM',
        message: `High packet loss detected: ${metrics.packetLoss}% (max: ${this.config.maxPacketLoss}%)`,
        timestamp: now
      });
    }

    // Check throughput
    if (metrics.throughput < this.config.minThroughput) {
      issues.push({
        type: 'LOW_THROUGHPUT',
        severity: metrics.throughput < this.config.minThroughput / 2 ? 'HIGH' : 'MEDIUM',
        message: `Low throughput detected: ${metrics.throughput} bytes/s (min: ${this.config.minThroughput} bytes/s)`,
        timestamp: now
      });
    }

    // Check connection stability
    if (metrics.consecutiveFailures >= this.config.failureThreshold) {
      issues.push({
        type: 'CONNECTION_UNSTABLE',
        severity: 'CRITICAL',
        message: `Connection unstable: ${metrics.consecutiveFailures} consecutive failures`,
        timestamp: now
      });
    }

    return issues;
  }

  /**
   * Calculate health score based on metrics
   * 
   * @param metrics - Health metrics
   * @returns Health score (0-100)
   */
  private calculateHealthScore(metrics: TunnelHealthMetrics): number {
    let score = 100;

    // Deduct points for high latency
    if (metrics.latency > this.config.maxLatency) {
      const latencyPenalty = Math.min(30, (metrics.latency / this.config.maxLatency - 1) * 20);
      score -= latencyPenalty;
    }

    // Deduct points for packet loss
    if (metrics.packetLoss > this.config.maxPacketLoss) {
      const packetLossPenalty = Math.min(40, metrics.packetLoss * 2);
      score -= packetLossPenalty;
    }

    // Deduct points for low throughput
    if (metrics.throughput < this.config.minThroughput) {
      const throughputPenalty = Math.min(20, (1 - metrics.throughput / this.config.minThroughput) * 20);
      score -= throughputPenalty;
    }

    // Deduct points for consecutive failures
    score -= metrics.consecutiveFailures * 10;

    // Deduct points for critical issues
    const criticalIssues = metrics.issues.filter(i => i.severity === 'CRITICAL').length;
    score -= criticalIssues * 20;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine overall health status
   * 
   * @param metrics - Health metrics
   * @returns True if connection is healthy
   */
  private determineHealthStatus(metrics: TunnelHealthMetrics): boolean {
    // Connection is unhealthy if there are critical issues
    const hasCriticalIssues = metrics.issues.some(i => i.severity === 'CRITICAL');
    if (hasCriticalIssues) {
      return false;
    }

    // Connection is unhealthy if health score is too low
    if (metrics.healthScore < 50) {
      return false;
    }

    // Connection is unhealthy if too many consecutive failures
    if (metrics.consecutiveFailures >= this.config.failureThreshold) {
      return false;
    }

    return true;
  }

  /**
   * Mark connection as unhealthy
   * 
   * @param metrics - Health metrics
   * @param reason - Reason for marking unhealthy
   */
  private markConnectionUnhealthy(metrics: TunnelHealthMetrics, reason: string): void {
    metrics.isHealthy = false;
    metrics.consecutiveFailures++;
    metrics.healthScore = 0;
    metrics.issues = [{
      type: 'CONNECTION_UNSTABLE',
      severity: 'CRITICAL',
      message: reason,
      timestamp: new Date()
    }];
  }

  /**
   * Store performance metrics in history
   * 
   * @param connectionId - Connection identifier
   * @param performanceMetrics - Performance metrics to store
   */
  private storePerformanceMetrics(connectionId: string, performanceMetrics: PerformanceMetrics): void {
    if (!this.performanceHistory.has(connectionId)) {
      this.performanceHistory.set(connectionId, []);
    }

    const history = this.performanceHistory.get(connectionId)!;
    history.push(performanceMetrics);

    // Limit history size to prevent memory issues
    const maxHistorySize = 1000;
    if (history.length > maxHistorySize) {
      history.splice(0, history.length - maxHistorySize);
    }
  }

  /**
   * Get current CPU usage
   * 
   * @returns CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    try {
      const os = await import('os');
      const cpus = os.cpus();
      
      let totalIdle = 0;
      let totalTick = 0;
      
      for (const cpu of cpus) {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      }
      
      return 100 - (totalIdle / totalTick * 100);
    } catch {
      return 0;
    }
  }

  /**
   * Get current memory usage
   * 
   * @returns Memory usage percentage
   */
  private async getMemoryUsage(): Promise<number> {
    try {
      const os = await import('os');
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      return ((totalMem - freeMem) / totalMem) * 100;
    } catch {
      return 0;
    }
  }

  /**
   * Get current network utilization
   * 
   * @returns Network utilization percentage
   */
  private async getNetworkUtilization(): Promise<number> {
    // Simplified network utilization calculation
    // In a real implementation, this would measure actual network traffic
    return Math.random() * 10; // Placeholder
  }

  /**
   * Cleanup monitoring resources
   */
  cleanup(): void {
    this.stopMonitoring();
    this.healthMetrics.clear();
    this.performanceHistory.clear();
    this.logger.info('Tunnel health monitor cleanup completed');
  }
}
