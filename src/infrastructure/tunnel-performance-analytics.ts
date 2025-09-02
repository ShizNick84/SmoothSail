import { EventEmitter } from 'events';
import { Logger } from '../core/logging/logger';
import { SSHTunnelManager, TunnelConnection } from './ssh-tunnel-manager';
import { TunnelHealthMonitor, TunnelHealthMetrics } from './tunnel-health-monitor';
import { TunnelStateTracker } from './tunnel-state-tracker';

/**
 * Performance metric types
 */
export enum MetricType {
  LATENCY = 'LATENCY',
  THROUGHPUT = 'THROUGHPUT',
  PACKET_LOSS = 'PACKET_LOSS',
  CONNECTION_TIME = 'CONNECTION_TIME',
  UPTIME = 'UPTIME',
  ERROR_RATE = 'ERROR_RATE',
  BANDWIDTH_UTILIZATION = 'BANDWIDTH_UTILIZATION'
}

/**
 * Performance data point
 */
export interface PerformanceDataPoint {
  timestamp: Date;
  connectionId: string;
  metricType: MetricType;
  value: number;
  unit: string;
  metadata?: Record<string, any>;
}

/**
 * Performance trend analysis
 */
export interface PerformanceTrend {
  metricType: MetricType;
  connectionId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  trend: 'IMPROVING' | 'DEGRADING' | 'STABLE';
  changePercentage: number;
  confidence: number; // 0-100
  dataPoints: number;
  averageValue: number;
  minValue: number;
  maxValue: number;
  standardDeviation: number;
}

/**
 * Performance benchmark
 */
export interface PerformanceBenchmark {
  metricType: MetricType;
  excellent: number;
  good: number;
  acceptable: number;
  poor: number;
  unit: string;
  description: string;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  connectionId: string;
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  overallScore: number; // 0-100
  metrics: {
    [key in MetricType]?: {
      current: number;
      average: number;
      trend: PerformanceTrend;
      benchmark: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'POOR';
      recommendations: string[];
    };
  };
  summary: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /** Data collection interval in milliseconds */
  collectionInterval: number;
  /** Data retention period in milliseconds */
  retentionPeriod: number;
  /** Enable trend analysis */
  enableTrendAnalysis: boolean;
  /** Trend analysis window in milliseconds */
  trendAnalysisWindow: number;
  /** Enable performance alerts */
  enablePerformanceAlerts: boolean;
  /** Performance alert thresholds */
  alertThresholds: {
    [key in MetricType]?: number;
  };
  /** Enable automatic reporting */
  enableAutoReporting: boolean;
  /** Report generation interval in milliseconds */
  reportInterval: number;
}

/**
 * Tunnel Performance Analytics
 * Collects, analyzes, and reports on SSH tunnel performance metrics
 */
export class TunnelPerformanceAnalytics extends EventEmitter {
  private logger: Logger;
  private tunnelManager: SSHTunnelManager;
  private healthMonitor: TunnelHealthMonitor;
  private stateTracker: TunnelStateTracker;
  private config: AnalyticsConfig;
  private performanceData: Map<string, PerformanceDataPoint[]>;
  private benchmarks: Map<MetricType, PerformanceBenchmark>;
  private collectionIntervals: Map<string, NodeJS.Timeout>;
  private reportingTimer: NodeJS.Timeout | null;
  private isCollecting: boolean;

  constructor(
    logger: Logger,
    tunnelManager: SSHTunnelManager,
    healthMonitor: TunnelHealthMonitor,
    stateTracker: TunnelStateTracker,
    config?: Partial<AnalyticsConfig>
  ) {
    super();
    this.logger = logger;
    this.tunnelManager = tunnelManager;
    this.healthMonitor = healthMonitor;
    this.stateTracker = stateTracker;
    this.performanceData = new Map();
    this.collectionIntervals = new Map();
    this.reportingTimer = null;
    this.isCollecting = false;

    // Default configuration
    this.config = {
      collectionInterval: 60000, // 1 minute
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      enableTrendAnalysis: true,
      trendAnalysisWindow: 24 * 60 * 60 * 1000, // 24 hours
      enablePerformanceAlerts: true,
      alertThresholds: {
        [MetricType.LATENCY]: 1000, // 1 second
        [MetricType.PACKET_LOSS]: 5, // 5%
        [MetricType.ERROR_RATE]: 10, // 10%
        [MetricType.THROUGHPUT]: 1024 // 1 KB/s minimum
      },
      enableAutoReporting: true,
      reportInterval: 24 * 60 * 60 * 1000, // 24 hours
      ...config
    };

    // Initialize performance benchmarks
    this.initializeBenchmarks();

    this.setupEventListeners();
    this.logger.info('Tunnel Performance Analytics initialized', this.config);
  }

  /**
   * Start performance data collection
   */
  startCollection(): void {
    if (this.isCollecting) {
      this.logger.warn('Performance data collection is already running');
      return;
    }

    this.isCollecting = true;
    this.logger.info('Starting performance data collection');

    // Start collecting for existing connections
    const connections = this.tunnelManager.getAllConnections();
    for (const connection of connections) {
      this.startCollectionForConnection(connection.id);
    }

    // Start automatic reporting if enabled
    if (this.config.enableAutoReporting) {
      this.startAutoReporting();
    }

    this.emit('collectionStarted');
  }

  /**
   * Stop performance data collection
   */
  stopCollection(): void {
    if (!this.isCollecting) {
      this.logger.warn('Performance data collection is not running');
      return;
    }

    this.isCollecting = false;
    this.logger.info('Stopping performance data collection');

    // Clear all collection intervals
    for (const [connectionId, interval] of this.collectionIntervals.entries()) {
      clearInterval(interval);
      this.collectionIntervals.delete(connectionId);
    }

    // Stop automatic reporting
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = null;
    }

    this.emit('collectionStopped');
  }

  /**
   * Start data collection for a specific connection
   * 
   * @param connectionId - Connection identifier
   */
  startCollectionForConnection(connectionId: string): void {
    if (this.collectionIntervals.has(connectionId)) {
      this.logger.debug(`Already collecting data for connection: ${connectionId}`);
      return;
    }

    this.logger.info(`Starting performance data collection for connection: ${connectionId}`);

    // Initialize data storage
    this.performanceData.set(connectionId, []);

    // Start periodic data collection
    const interval = setInterval(async () => {
      try {
        await this.collectPerformanceData(connectionId);
      } catch (error) {
        this.logger.error(`Performance data collection failed for connection ${connectionId}`, error);
      }
    }, this.config.collectionInterval);

    this.collectionIntervals.set(connectionId, interval);

    // Perform initial data collection
    setTimeout(() => this.collectPerformanceData(connectionId), 1000);
  }

  /**
   * Stop data collection for a specific connection
   * 
   * @param connectionId - Connection identifier
   */
  stopCollectionForConnection(connectionId: string): void {
    const interval = this.collectionIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.collectionIntervals.delete(connectionId);
      this.logger.info(`Stopped performance data collection for connection: ${connectionId}`);
    }
  }

  /**
   * Get performance data for a connection
   * 
   * @param connectionId - Connection identifier
   * @param metricType - Optional metric type filter
   * @param timeRange - Optional time range filter
   * @returns Array of performance data points
   */
  getPerformanceData(
    connectionId: string,
    metricType?: MetricType,
    timeRange?: { start: Date; end: Date }
  ): PerformanceDataPoint[] {
    let data = this.performanceData.get(connectionId) || [];

    // Apply metric type filter
    if (metricType) {
      data = data.filter(point => point.metricType === metricType);
    }

    // Apply time range filter
    if (timeRange) {
      data = data.filter(point => 
        point.timestamp >= timeRange.start && point.timestamp <= timeRange.end
      );
    }

    return [...data];
  }

  /**
   * Analyze performance trends
   * 
   * @param connectionId - Connection identifier
   * @param metricType - Metric type to analyze
   * @param timeRange - Optional time range (defaults to trend analysis window)
   * @returns Performance trend analysis
   */
  analyzeTrend(
    connectionId: string,
    metricType: MetricType,
    timeRange?: { start: Date; end: Date }
  ): PerformanceTrend | null {
    if (!this.config.enableTrendAnalysis) {
      return null;
    }

    const now = new Date();
    const defaultTimeRange = {
      start: new Date(now.getTime() - this.config.trendAnalysisWindow),
      end: now
    };

    const range = timeRange || defaultTimeRange;
    const data = this.getPerformanceData(connectionId, metricType, range);

    if (data.length < 2) {
      return null;
    }

    // Calculate trend statistics
    const values = data.map(point => point.value);
    const timestamps = data.map(point => point.timestamp.getTime());

    const trend = this.calculateTrend(values, timestamps);
    const stats = this.calculateStatistics(values);

    return {
      metricType,
      connectionId,
      timeRange: range,
      trend: trend.direction,
      changePercentage: trend.changePercentage,
      confidence: trend.confidence,
      dataPoints: data.length,
      averageValue: stats.mean,
      minValue: stats.min,
      maxValue: stats.max,
      standardDeviation: stats.standardDeviation
    };
  }

  /**
   * Generate performance report
   * 
   * @param connectionId - Connection identifier
   * @param timeRange - Optional time range
   * @returns Performance report
   */
  generateReport(
    connectionId: string,
    timeRange?: { start: Date; end: Date }
  ): PerformanceReport {
    const now = new Date();
    const defaultTimeRange = {
      start: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: now
    };

    const range = timeRange || defaultTimeRange;
    const report: PerformanceReport = {
      connectionId,
      generatedAt: now,
      timeRange: range,
      overallScore: 0,
      metrics: {},
      summary: {
        strengths: [],
        weaknesses: [],
        recommendations: []
      }
    };

    let totalScore = 0;
    let metricCount = 0;

    // Analyze each metric type
    for (const metricType of Object.values(MetricType)) {
      const data = this.getPerformanceData(connectionId, metricType, range);
      if (data.length === 0) continue;

      const trend = this.analyzeTrend(connectionId, metricType, range);
      const currentValue = data[data.length - 1].value;
      const averageValue = data.reduce((sum, point) => sum + point.value, 0) / data.length;
      const benchmark = this.getBenchmarkRating(metricType, currentValue);
      const recommendations = this.generateRecommendations(metricType, currentValue, trend);

      report.metrics[metricType] = {
        current: currentValue,
        average: averageValue,
        trend: trend!,
        benchmark,
        recommendations
      };

      // Calculate metric score
      const metricScore = this.calculateMetricScore(metricType, currentValue);
      totalScore += metricScore;
      metricCount++;

      // Add to summary
      if (benchmark === 'EXCELLENT' || benchmark === 'GOOD') {
        report.summary.strengths.push(`${metricType}: ${benchmark.toLowerCase()}`);
      } else {
        report.summary.weaknesses.push(`${metricType}: ${benchmark.toLowerCase()}`);
      }

      report.summary.recommendations.push(...recommendations);
    }

    // Calculate overall score
    report.overallScore = metricCount > 0 ? totalScore / metricCount : 0;

    this.logger.info(`Generated performance report for connection: ${connectionId}`, {
      overallScore: report.overallScore,
      timeRange: range
    });

    this.emit('reportGenerated', report);
    return report;
  }

  /**
   * Get performance benchmarks
   * 
   * @returns Map of performance benchmarks
   */
  getBenchmarks(): Map<MetricType, PerformanceBenchmark> {
    return new Map(this.benchmarks);
  }

  /**
   * Update performance benchmark
   * 
   * @param metricType - Metric type
   * @param benchmark - New benchmark values
   */
  updateBenchmark(metricType: MetricType, benchmark: PerformanceBenchmark): void {
    this.benchmarks.set(metricType, benchmark);
    this.logger.info(`Updated performance benchmark for ${metricType}`, benchmark);
    this.emit('benchmarkUpdated', metricType, benchmark);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for new tunnel connections
    this.tunnelManager.on('tunnelConnected', (connection) => {
      if (this.isCollecting) {
        this.startCollectionForConnection(connection.id);
      }
    });

    // Listen for tunnel disconnections
    this.tunnelManager.on('tunnelDisconnected', (connection) => {
      this.stopCollectionForConnection(connection.id);
    });
  }

  /**
   * Initialize performance benchmarks
   */
  private initializeBenchmarks(): void {
    this.benchmarks = new Map([
      [MetricType.LATENCY, {
        metricType: MetricType.LATENCY,
        excellent: 50,
        good: 100,
        acceptable: 500,
        poor: 1000,
        unit: 'ms',
        description: 'Connection latency'
      }],
      [MetricType.THROUGHPUT, {
        metricType: MetricType.THROUGHPUT,
        excellent: 10240, // 10 KB/s
        good: 5120,       // 5 KB/s
        acceptable: 1024, // 1 KB/s
        poor: 512,        // 512 B/s
        unit: 'bytes/s',
        description: 'Data throughput'
      }],
      [MetricType.PACKET_LOSS, {
        metricType: MetricType.PACKET_LOSS,
        excellent: 0,
        good: 1,
        acceptable: 5,
        poor: 10,
        unit: '%',
        description: 'Packet loss percentage'
      }],
      [MetricType.CONNECTION_TIME, {
        metricType: MetricType.CONNECTION_TIME,
        excellent: 1000,  // 1 second
        good: 3000,       // 3 seconds
        acceptable: 10000, // 10 seconds
        poor: 30000,      // 30 seconds
        unit: 'ms',
        description: 'Time to establish connection'
      }],
      [MetricType.UPTIME, {
        metricType: MetricType.UPTIME,
        excellent: 99.9,
        good: 99.5,
        acceptable: 99.0,
        poor: 95.0,
        unit: '%',
        description: 'Connection uptime percentage'
      }],
      [MetricType.ERROR_RATE, {
        metricType: MetricType.ERROR_RATE,
        excellent: 0,
        good: 1,
        acceptable: 5,
        poor: 10,
        unit: '%',
        description: 'Error rate percentage'
      }]
    ]);
  }

  /**
   * Collect performance data for a connection
   * 
   * @param connectionId - Connection identifier
   */
  private async collectPerformanceData(connectionId: string): Promise<void> {
    const connection = this.tunnelManager.getConnection(connectionId);
    if (!connection) return;

    const timestamp = new Date();
    const dataPoints: PerformanceDataPoint[] = [];

    try {
      // Get health metrics
      const healthMetrics = this.healthMonitor.getHealthMetrics(connectionId);
      if (healthMetrics) {
        dataPoints.push(
          {
            timestamp,
            connectionId,
            metricType: MetricType.LATENCY,
            value: healthMetrics.latency,
            unit: 'ms'
          },
          {
            timestamp,
            connectionId,
            metricType: MetricType.THROUGHPUT,
            value: healthMetrics.throughput,
            unit: 'bytes/s'
          },
          {
            timestamp,
            connectionId,
            metricType: MetricType.PACKET_LOSS,
            value: healthMetrics.packetLoss,
            unit: '%'
          }
        );
      }

      // Get state statistics
      const stateStats = this.stateTracker.getStatistics(connectionId);
      if (stateStats) {
        dataPoints.push(
          {
            timestamp,
            connectionId,
            metricType: MetricType.UPTIME,
            value: stateStats.reliability,
            unit: '%'
          },
          {
            timestamp,
            connectionId,
            metricType: MetricType.CONNECTION_TIME,
            value: stateStats.averageConnectionTime,
            unit: 'ms'
          }
        );

        // Calculate error rate
        const totalAttempts = stateStats.connectionAttempts;
        const errorRate = totalAttempts > 0 
          ? (stateStats.failedConnections / totalAttempts) * 100 
          : 0;

        dataPoints.push({
          timestamp,
          connectionId,
          metricType: MetricType.ERROR_RATE,
          value: errorRate,
          unit: '%'
        });
      }

      // Store data points
      const connectionData = this.performanceData.get(connectionId) || [];
      connectionData.push(...dataPoints);

      // Clean up old data
      this.cleanupOldData(connectionId);

      // Check for performance alerts
      if (this.config.enablePerformanceAlerts) {
        this.checkPerformanceAlerts(dataPoints);
      }

    } catch (error) {
      this.logger.error(`Failed to collect performance data for connection ${connectionId}`, error);
    }
  }

  /**
   * Clean up old performance data
   * 
   * @param connectionId - Connection identifier
   */
  private cleanupOldData(connectionId: string): void {
    const data = this.performanceData.get(connectionId);
    if (!data) return;

    const cutoffTime = Date.now() - this.config.retentionPeriod;
    const filteredData = data.filter(point => point.timestamp.getTime() > cutoffTime);

    this.performanceData.set(connectionId, filteredData);
  }

  /**
   * Check for performance alerts
   * 
   * @param dataPoints - Performance data points to check
   */
  private checkPerformanceAlerts(dataPoints: PerformanceDataPoint[]): void {
    for (const dataPoint of dataPoints) {
      const threshold = this.config.alertThresholds[dataPoint.metricType];
      if (threshold === undefined) continue;

      let alertTriggered = false;
      let alertMessage = '';

      switch (dataPoint.metricType) {
        case MetricType.LATENCY:
        case MetricType.CONNECTION_TIME:
          if (dataPoint.value > threshold) {
            alertTriggered = true;
            alertMessage = `High ${dataPoint.metricType.toLowerCase()}: ${dataPoint.value}${dataPoint.unit}`;
          }
          break;

        case MetricType.PACKET_LOSS:
        case MetricType.ERROR_RATE:
          if (dataPoint.value > threshold) {
            alertTriggered = true;
            alertMessage = `High ${dataPoint.metricType.toLowerCase()}: ${dataPoint.value}${dataPoint.unit}`;
          }
          break;

        case MetricType.THROUGHPUT:
          if (dataPoint.value < threshold) {
            alertTriggered = true;
            alertMessage = `Low ${dataPoint.metricType.toLowerCase()}: ${dataPoint.value}${dataPoint.unit}`;
          }
          break;

        case MetricType.UPTIME:
          if (dataPoint.value < threshold) {
            alertTriggered = true;
            alertMessage = `Low ${dataPoint.metricType.toLowerCase()}: ${dataPoint.value}${dataPoint.unit}`;
          }
          break;
      }

      if (alertTriggered) {
        this.logger.warn(`Performance alert: ${alertMessage}`, {
          connectionId: dataPoint.connectionId,
          metricType: dataPoint.metricType,
          value: dataPoint.value,
          threshold
        });

        this.emit('performanceAlert', {
          connectionId: dataPoint.connectionId,
          metricType: dataPoint.metricType,
          value: dataPoint.value,
          threshold,
          message: alertMessage,
          timestamp: dataPoint.timestamp
        });
      }
    }
  }

  /**
   * Calculate trend direction and statistics
   * 
   * @param values - Array of values
   * @param timestamps - Array of timestamps
   * @returns Trend analysis
   */
  private calculateTrend(values: number[], timestamps: number[]): {
    direction: 'IMPROVING' | 'DEGRADING' | 'STABLE';
    changePercentage: number;
    confidence: number;
  } {
    if (values.length < 2) {
      return { direction: 'STABLE', changePercentage: 0, confidence: 0 };
    }

    // Calculate linear regression
    const n = values.length;
    const sumX = timestamps.reduce((sum, t) => sum + t, 0);
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = timestamps.reduce((sum, t, i) => sum + t * values[i], 0);
    const sumXX = timestamps.reduce((sum, t) => sum + t * t, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for confidence
    const meanY = sumY / n;
    const ssRes = values.reduce((sum, v, i) => {
      const predicted = slope * timestamps[i] + intercept;
      return sum + Math.pow(v - predicted, 2);
    }, 0);
    const ssTot = values.reduce((sum, v) => sum + Math.pow(v - meanY, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    // Determine trend direction
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const changePercentage = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

    let direction: 'IMPROVING' | 'DEGRADING' | 'STABLE';
    if (Math.abs(changePercentage) < 5) {
      direction = 'STABLE';
    } else if (changePercentage > 0) {
      direction = 'IMPROVING';
    } else {
      direction = 'DEGRADING';
    }

    return {
      direction,
      changePercentage: Math.abs(changePercentage),
      confidence: Math.max(0, Math.min(100, rSquared * 100))
    };
  }

  /**
   * Calculate basic statistics
   * 
   * @param values - Array of values
   * @returns Statistical measures
   */
  private calculateStatistics(values: number[]): {
    mean: number;
    min: number;
    max: number;
    standardDeviation: number;
  } {
    if (values.length === 0) {
      return { mean: 0, min: 0, max: 0, standardDeviation: 0 };
    }

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    return { mean, min, max, standardDeviation };
  }

  /**
   * Get benchmark rating for a metric value
   * 
   * @param metricType - Metric type
   * @param value - Metric value
   * @returns Benchmark rating
   */
  private getBenchmarkRating(metricType: MetricType, value: number): 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'POOR' {
    const benchmark = this.benchmarks.get(metricType);
    if (!benchmark) return 'ACCEPTABLE';

    // For metrics where lower is better (latency, packet loss, error rate)
    const lowerIsBetter = [MetricType.LATENCY, MetricType.PACKET_LOSS, MetricType.ERROR_RATE, MetricType.CONNECTION_TIME];
    
    if (lowerIsBetter.includes(metricType)) {
      if (value <= benchmark.excellent) return 'EXCELLENT';
      if (value <= benchmark.good) return 'GOOD';
      if (value <= benchmark.acceptable) return 'ACCEPTABLE';
      return 'POOR';
    } else {
      // For metrics where higher is better (throughput, uptime)
      if (value >= benchmark.excellent) return 'EXCELLENT';
      if (value >= benchmark.good) return 'GOOD';
      if (value >= benchmark.acceptable) return 'ACCEPTABLE';
      return 'POOR';
    }
  }

  /**
   * Calculate metric score (0-100)
   * 
   * @param metricType - Metric type
   * @param value - Metric value
   * @returns Score (0-100)
   */
  private calculateMetricScore(metricType: MetricType, value: number): number {
    const rating = this.getBenchmarkRating(metricType, value);
    
    switch (rating) {
      case 'EXCELLENT': return 100;
      case 'GOOD': return 80;
      case 'ACCEPTABLE': return 60;
      case 'POOR': return 30;
      default: return 50;
    }
  }

  /**
   * Generate recommendations based on metric performance
   * 
   * @param metricType - Metric type
   * @param value - Current value
   * @param trend - Performance trend
   * @returns Array of recommendations
   */
  private generateRecommendations(metricType: MetricType, value: number, trend: PerformanceTrend | null): string[] {
    const recommendations: string[] = [];
    const rating = this.getBenchmarkRating(metricType, value);

    if (rating === 'POOR' || rating === 'ACCEPTABLE') {
      switch (metricType) {
        case MetricType.LATENCY:
          recommendations.push('Consider optimizing network routing or switching to a closer server');
          break;
        case MetricType.THROUGHPUT:
          recommendations.push('Check for bandwidth limitations or network congestion');
          break;
        case MetricType.PACKET_LOSS:
          recommendations.push('Investigate network stability and consider alternative routing');
          break;
        case MetricType.CONNECTION_TIME:
          recommendations.push('Optimize SSH configuration or check server responsiveness');
          break;
        case MetricType.UPTIME:
          recommendations.push('Implement better connection monitoring and auto-reconnection');
          break;
        case MetricType.ERROR_RATE:
          recommendations.push('Review error logs and implement better error handling');
          break;
      }
    }

    if (trend && trend.trend === 'DEGRADING' && trend.confidence > 70) {
      recommendations.push(`Performance is degrading (${trend.changePercentage.toFixed(1)}% decline)`);
    }

    return recommendations;
  }

  /**
   * Start automatic report generation
   */
  private startAutoReporting(): void {
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
    }

    this.reportingTimer = setInterval(() => {
      const connections = this.tunnelManager.getAllConnections();
      for (const connection of connections) {
        try {
          const report = this.generateReport(connection.id);
          this.emit('automaticReport', report);
        } catch (error) {
          this.logger.error(`Failed to generate automatic report for connection ${connection.id}`, error);
        }
      }
    }, this.config.reportInterval);

    this.logger.info('Started automatic performance reporting');
  }

  /**
   * Cleanup analytics resources
   */
  cleanup(): void {
    this.stopCollection();
    this.performanceData.clear();
    this.logger.info('Tunnel performance analytics cleanup completed');
  }
}
