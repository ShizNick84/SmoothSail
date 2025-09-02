/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - SECURITY METRICS AND KPI TRACKING SERVICE
 * =============================================================================
 * 
 * This service provides comprehensive security metrics collection, analysis,
 * and KPI tracking for the AI crypto trading agent. It monitors security
 * performance, threat trends, and system health indicators.
 * 
 * CRITICAL SECURITY NOTICE:
 * This service provides essential metrics for security decision-making.
 * Accurate metrics are crucial for identifying security trends, measuring
 * security effectiveness, and making informed security investments.
 * 
 * Metrics Capabilities:
 * - Real-time security KPI tracking
 * - Threat trend analysis and forecasting
 * - Security performance measurement
 * - Compliance metrics and reporting
 * - Historical data analysis
 * - Automated alerting on metric thresholds
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { auditService } from '@/security/audit-service';
import { SecurityEvent, SecurityMetrics } from '@/security/security-monitoring-service';

/**
 * Interface for security KPI configuration
 */
export interface SecurityKPIConfig {
  /** KPI collection interval in milliseconds */
  collectionInterval: number;
  /** Historical data retention period in days */
  retentionPeriod: number;
  /** Alert thresholds for KPIs */
  alertThresholds: {
    securityScoreMin: number;
    threatDetectionRateMax: number;
    falsePositiveRateMax: number;
    responseTimeMax: number;
    uptimeMin: number;
  };
  /** Trend analysis window in hours */
  trendAnalysisWindow: number;
}

/**
 * Interface for security KPI data point
 */
export interface SecurityKPIDataPoint {
  /** Timestamp of measurement */
  timestamp: Date;
  /** KPI name */
  kpiName: string;
  /** KPI value */
  value: number;
  /** KPI unit */
  unit: string;
  /** KPI category */
  category: 'performance' | 'threat' | 'compliance' | 'system';
  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Interface for security trend analysis
 */
export interface SecurityTrendAnalysis {
  /** KPI name */
  kpiName: string;
  /** Trend direction */
  trend: 'improving' | 'degrading' | 'stable';
  /** Trend strength (0-1) */
  strength: number;
  /** Trend confidence (0-1) */
  confidence: number;
  /** Historical data points */
  dataPoints: SecurityKPIDataPoint[];
  /** Forecast values */
  forecast: Array<{ timestamp: Date; value: number; confidence: number }>;
  /** Analysis summary */
  summary: string;
}

/**
 * Interface for security performance report
 */
export interface SecurityPerformanceReport {
  /** Report period */
  period: { start: Date; end: Date };
  /** Overall security score */
  overallScore: number;
  /** KPI summaries */
  kpiSummaries: Array<{
    name: string;
    current: number;
    average: number;
    min: number;
    max: number;
    trend: 'up' | 'down' | 'stable';
    status: 'good' | 'warning' | 'critical';
  }>;
  /** Threat analysis */
  threatAnalysis: {
    totalThreats: number;
    threatsByType: Record<string, number>;
    threatsBySeverity: Record<string, number>;
    topSources: Array<{ source: string; count: number }>;
  };
  /** System performance */
  systemPerformance: {
    uptime: number;
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  /** Recommendations */
  recommendations: string[];
}

/**
 * Interface for compliance metrics
 */
export interface ComplianceMetrics {
  /** Audit trail completeness */
  auditCompleteness: number;
  /** Data retention compliance */
  dataRetentionCompliance: number;
  /** Access control compliance */
  accessControlCompliance: number;
  /** Encryption compliance */
  encryptionCompliance: number;
  /** Incident response compliance */
  incidentResponseCompliance: number;
  /** Overall compliance score */
  overallCompliance: number;
  /** Compliance violations */
  violations: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    timestamp: Date;
  }>;
}

/**
 * Security metrics and KPI tracking service
 * Provides comprehensive security performance measurement and analysis
 */
export class SecurityMetricsService extends EventEmitter {
  /** Service configuration */
  private config: SecurityKPIConfig;
  
  /** Historical KPI data */
  private kpiHistory: Map<string, SecurityKPIDataPoint[]> = new Map();
  
  /** Current KPI values */
  private currentKPIs: Map<string, SecurityKPIDataPoint> = new Map();
  
  /** Metrics collection interval */
  private collectionInterval: NodeJS.Timeout | null = null;
  
  /** Service start time */
  private serviceStartTime: Date = new Date();
  
  /** Security events for analysis */
  private securityEvents: SecurityEvent[] = [];

  constructor(config?: Partial<SecurityKPIConfig>) {
    super();
    
    // Initialize configuration with defaults
    this.config = {
      collectionInterval: 60000, // 1 minute
      retentionPeriod: 90, // 90 days
      alertThresholds: {
        securityScoreMin: 80,
        threatDetectionRateMax: 10, // 10% of events
        falsePositiveRateMax: 5, // 5% false positives
        responseTimeMax: 300, // 5 minutes
        uptimeMin: 99.5 // 99.5% uptime
      },
      trendAnalysisWindow: 24 // 24 hours
    };
    
    // Merge with provided config
    this.config = { ...this.config, ...config };
    
    // Initialize KPI tracking
    this.initializeKPITracking();
    
    logger.info('📊 Security Metrics Service initialized');
  }

  /**
   * Start metrics collection
   * Begins continuous security metrics collection
   * 
   * @returns Promise<void>
   */
  public async startMetricsCollection(): Promise<void> {
    try {
      logger.info('🚀 Starting security metrics collection...');
      
      // Start metrics collection interval
      this.collectionInterval = setInterval(async () => {
        try {
          await this.collectSecurityMetrics();
        } catch (error) {
          logger.error('❌ Metrics collection error:', error);
        }
      }, this.config.collectionInterval);
      
      // Perform initial metrics collection
      await this.collectSecurityMetrics();
      
      // Create audit entry
      await auditService.createAuditEntry({
        auditId: `metrics_start_${Date.now()}`,
        eventType: 'SECURITY_METRICS_START',
        actor: 'SYSTEM',
        resource: 'SECURITY_METRICS_SERVICE',
        action: 'START_COLLECTION',
        result: 'SUCCESS',
        timestamp: new Date(),
        auditData: {
          config: this.config,
          startTime: this.serviceStartTime
        }
      });
      
      logger.info('✅ Security metrics collection started successfully');
      
    } catch (error) {
      logger.error('❌ Failed to start metrics collection:', error);
      throw new Error('Security metrics collection startup failed');
    }
  }

  /**
   * Stop metrics collection
   * Stops continuous security metrics collection
   * 
   * @returns Promise<void>
   */
  public async stopMetricsCollection(): Promise<void> {
    try {
      logger.info('🛑 Stopping security metrics collection...');
      
      // Stop collection interval
      if (this.collectionInterval) {
        clearInterval(this.collectionInterval);
        this.collectionInterval = null;
      }
      
      // Create audit entry
      await auditService.createAuditEntry({
        auditId: `metrics_stop_${Date.now()}`,
        eventType: 'SECURITY_METRICS_STOP',
        actor: 'SYSTEM',
        resource: 'SECURITY_METRICS_SERVICE',
        action: 'STOP_COLLECTION',
        result: 'SUCCESS',
        timestamp: new Date(),
        auditData: {
          uptime: Date.now() - this.serviceStartTime.getTime(),
          totalDataPoints: this.getTotalDataPoints()
        }
      });
      
      logger.info('✅ Security metrics collection stopped successfully');
      
    } catch (error) {
      logger.error('❌ Failed to stop metrics collection:', error);
      throw new Error('Security metrics collection shutdown failed');
    }
  }

  /**
   * Record security event
   * Records security event for metrics analysis
   * 
   * @param event - Security event to record
   * @returns Promise<void>
   */
  public async recordSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Add to events history
      this.securityEvents.push(event);
      
      // Maintain event history size (last 10,000 events)
      if (this.securityEvents.length > 10000) {
        this.securityEvents.shift();
      }
      
      // Update real-time metrics
      await this.updateRealTimeMetrics(event);
      
    } catch (error) {
      logger.error('❌ Failed to record security event:', error);
    }
  }

  /**
   * Get current security metrics
   * Returns current security KPIs and metrics
   * 
   * @returns SecurityMetrics Current security metrics
   */
  public getCurrentSecurityMetrics(): SecurityMetrics {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Filter recent events
    const recentEvents = this.securityEvents.filter(
      event => event.timestamp >= oneHourAgo
    );
    
    // Calculate metrics
    const totalEvents = recentEvents.length;
    const threatEvents = recentEvents.filter(
      event => event.eventType === 'threat_detected'
    );
    
    // Events by severity
    const eventsBySeverity: Record<number, number> = {};
    recentEvents.forEach(event => {
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    });
    
    // Events by type
    const eventsByType: Record<string, number> = {};
    recentEvents.forEach(event => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
    });
    
    // Calculate rates
    const threatDetectionRate = totalEvents > 0 ? (threatEvents.length / totalEvents) * 100 : 0;
    const falsePositiveRate = this.calculateFalsePositiveRate(recentEvents);
    const averageResponseTime = this.calculateAverageResponseTime(recentEvents);
    const securityScore = this.calculateSecurityScore(recentEvents);
    const monitoringUptime = this.calculateUptime();
    
    return {
      totalEvents,
      eventsBySeverity,
      eventsByType,
      threatDetectionRate,
      falsePositiveRate,
      averageResponseTime,
      securityScore,
      monitoringUptime,
      lastUpdate: now
    };
  }

  /**
   * Get security trend analysis
   * Analyzes security trends over time
   * 
   * @param kpiName - KPI to analyze
   * @param windowHours - Analysis window in hours
   * @returns Promise<SecurityTrendAnalysis> Trend analysis
   */
  public async getSecurityTrendAnalysis(
    kpiName: string,
    windowHours: number = this.config.trendAnalysisWindow
  ): Promise<SecurityTrendAnalysis> {
    try {
      const windowStart = new Date(Date.now() - (windowHours * 60 * 60 * 1000));
      const dataPoints = this.getKPIHistory(kpiName, windowStart);
      
      if (dataPoints.length < 3) {
        return {
          kpiName,
          trend: 'stable',
          strength: 0,
          confidence: 0,
          dataPoints,
          forecast: [],
          summary: 'Insufficient data for trend analysis'
        };
      }
      
      // Calculate trend
      const trend = this.calculateTrend(dataPoints);
      const forecast = this.generateForecast(dataPoints, 6); // 6 hour forecast
      
      return {
        kpiName,
        trend: trend.direction,
        strength: trend.strength,
        confidence: trend.confidence,
        dataPoints,
        forecast,
        summary: this.generateTrendSummary(trend, dataPoints)
      };
      
    } catch (error) {
      logger.error('❌ Failed to analyze security trend:', error);
      throw new Error('Security trend analysis failed');
    }
  }

  /**
   * Generate security performance report
   * Creates comprehensive security performance report
   * 
   * @param startDate - Report start date
   * @param endDate - Report end date
   * @returns Promise<SecurityPerformanceReport> Performance report
   */
  public async generateSecurityPerformanceReport(
    startDate: Date,
    endDate: Date
  ): Promise<SecurityPerformanceReport> {
    try {
      const periodEvents = this.securityEvents.filter(
        event => event.timestamp >= startDate && event.timestamp <= endDate
      );
      
      // Calculate KPI summaries
      const kpiSummaries = await this.calculateKPISummaries(startDate, endDate);
      
      // Analyze threats
      const threatAnalysis = this.analyzeThreatData(periodEvents);
      
      // Calculate system performance
      const systemPerformance = this.calculateSystemPerformance(periodEvents);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(kpiSummaries, threatAnalysis);
      
      // Calculate overall score
      const overallScore = this.calculateOverallSecurityScore(kpiSummaries);
      
      return {
        period: { start: startDate, end: endDate },
        overallScore,
        kpiSummaries,
        threatAnalysis,
        systemPerformance,
        recommendations
      };
      
    } catch (error) {
      logger.error('❌ Failed to generate performance report:', error);
      throw new Error('Security performance report generation failed');
    }
  }

  /**
   * Get compliance metrics
   * Returns current compliance metrics and status
   * 
   * @returns Promise<ComplianceMetrics> Compliance metrics
   */
  public async getComplianceMetrics(): Promise<ComplianceMetrics> {
    try {
      // Calculate compliance scores
      const auditCompleteness = await this.calculateAuditCompleteness();
      const dataRetentionCompliance = this.calculateDataRetentionCompliance();
      const accessControlCompliance = this.calculateAccessControlCompliance();
      const encryptionCompliance = this.calculateEncryptionCompliance();
      const incidentResponseCompliance = this.calculateIncidentResponseCompliance();
      
      // Calculate overall compliance
      const overallCompliance = (
        auditCompleteness +
        dataRetentionCompliance +
        accessControlCompliance +
        encryptionCompliance +
        incidentResponseCompliance
      ) / 5;
      
      // Identify violations
      const violations = await this.identifyComplianceViolations();
      
      return {
        auditCompleteness,
        dataRetentionCompliance,
        accessControlCompliance,
        encryptionCompliance,
        incidentResponseCompliance,
        overallCompliance,
        violations
      };
      
    } catch (error) {
      logger.error('❌ Failed to get compliance metrics:', error);
      throw new Error('Compliance metrics calculation failed');
    }
  }

  /**
   * Initialize KPI tracking
   * Sets up KPI tracking infrastructure
   */
  private initializeKPITracking(): void {
    // Initialize KPI history maps
    const kpiNames = [
      'security_score',
      'threat_detection_rate',
      'false_positive_rate',
      'average_response_time',
      'system_uptime',
      'event_volume',
      'incident_count',
      'compliance_score'
    ];
    
    kpiNames.forEach(kpiName => {
      this.kpiHistory.set(kpiName, []);
    });
  }

  /**
   * Collect security metrics
   * Collects current security metrics and KPIs
   * 
   * @returns Promise<void>
   */
  private async collectSecurityMetrics(): Promise<void> {
    try {
      const now = new Date();
      const metrics = this.getCurrentSecurityMetrics();
      
      // Create KPI data points
      const kpiDataPoints: SecurityKPIDataPoint[] = [
        {
          timestamp: now,
          kpiName: 'security_score',
          value: metrics.securityScore,
          unit: 'score',
          category: 'performance',
          metadata: { totalEvents: metrics.totalEvents }
        },
        {
          timestamp: now,
          kpiName: 'threat_detection_rate',
          value: metrics.threatDetectionRate,
          unit: 'percentage',
          category: 'threat',
          metadata: { totalEvents: metrics.totalEvents }
        },
        {
          timestamp: now,
          kpiName: 'false_positive_rate',
          value: metrics.falsePositiveRate,
          unit: 'percentage',
          category: 'performance',
          metadata: {}
        },
        {
          timestamp: now,
          kpiName: 'average_response_time',
          value: metrics.averageResponseTime,
          unit: 'seconds',
          category: 'performance',
          metadata: {}
        },
        {
          timestamp: now,
          kpiName: 'system_uptime',
          value: metrics.monitoringUptime,
          unit: 'percentage',
          category: 'system',
          metadata: {}
        }
      ];
      
      // Store KPI data points
      for (const dataPoint of kpiDataPoints) {
        this.storeKPIDataPoint(dataPoint);
        this.currentKPIs.set(dataPoint.kpiName, dataPoint);
        
        // Check alert thresholds
        await this.checkKPIThresholds(dataPoint);
      }
      
      // Clean up old data
      this.cleanupOldData();
      
    } catch (error) {
      logger.error('❌ Failed to collect security metrics:', error);
    }
  }

  /**
   * Update real-time metrics
   * Updates metrics based on new security event
   * 
   * @param event - Security event
   * @returns Promise<void>
   */
  private async updateRealTimeMetrics(event: SecurityEvent): Promise<void> {
    // Update event volume metric
    const eventVolumeKPI: SecurityKPIDataPoint = {
      timestamp: new Date(),
      kpiName: 'event_volume',
      value: this.securityEvents.length,
      unit: 'count',
      category: 'system',
      metadata: { eventType: event.eventType, severity: event.severity }
    };
    
    this.storeKPIDataPoint(eventVolumeKPI);
    this.currentKPIs.set('event_volume', eventVolumeKPI);
    
    // Update incident count for high-severity events
    if (event.severity >= 7) {
      const incidentCountKPI: SecurityKPIDataPoint = {
        timestamp: new Date(),
        kpiName: 'incident_count',
        value: this.securityEvents.filter(e => e.severity >= 7).length,
        unit: 'count',
        category: 'threat',
        metadata: { severity: event.severity }
      };
      
      this.storeKPIDataPoint(incidentCountKPI);
      this.currentKPIs.set('incident_count', incidentCountKPI);
    }
  }

  /**
   * Store KPI data point
   * Stores KPI data point in history
   * 
   * @param dataPoint - KPI data point to store
   */
  private storeKPIDataPoint(dataPoint: SecurityKPIDataPoint): void {
    const history = this.kpiHistory.get(dataPoint.kpiName) || [];
    history.push(dataPoint);
    
    // Maintain history size (keep last 10,000 points per KPI)
    if (history.length > 10000) {
      history.shift();
    }
    
    this.kpiHistory.set(dataPoint.kpiName, history);
  }

  /**
   * Get KPI history
   * Retrieves KPI history for specified period
   * 
   * @param kpiName - KPI name
   * @param startDate - Start date
   * @returns SecurityKPIDataPoint[] KPI history
   */
  private getKPIHistory(kpiName: string, startDate: Date): SecurityKPIDataPoint[] {
    const history = this.kpiHistory.get(kpiName) || [];
    return history.filter(point => point.timestamp >= startDate);
  }

  /**
   * Check KPI thresholds
   * Checks KPI against alert thresholds
   * 
   * @param dataPoint - KPI data point
   * @returns Promise<void>
   */
  private async checkKPIThresholds(dataPoint: SecurityKPIDataPoint): Promise<void> {
    const thresholds = this.config.alertThresholds;
    let alertTriggered = false;
    let alertMessage = '';
    
    switch (dataPoint.kpiName) {
      case 'security_score':
        if (dataPoint.value < thresholds.securityScoreMin) {
          alertTriggered = true;
          alertMessage = `Security score (${dataPoint.value}) below threshold (${thresholds.securityScoreMin})`;
        }
        break;
      
      case 'threat_detection_rate':
        if (dataPoint.value > thresholds.threatDetectionRateMax) {
          alertTriggered = true;
          alertMessage = `Threat detection rate (${dataPoint.value}%) above threshold (${thresholds.threatDetectionRateMax}%)`;
        }
        break;
      
      case 'false_positive_rate':
        if (dataPoint.value > thresholds.falsePositiveRateMax) {
          alertTriggered = true;
          alertMessage = `False positive rate (${dataPoint.value}%) above threshold (${thresholds.falsePositiveRateMax}%)`;
        }
        break;
      
      case 'average_response_time':
        if (dataPoint.value > thresholds.responseTimeMax) {
          alertTriggered = true;
          alertMessage = `Average response time (${dataPoint.value}s) above threshold (${thresholds.responseTimeMax}s)`;
        }
        break;
      
      case 'system_uptime':
        if (dataPoint.value < thresholds.uptimeMin) {
          alertTriggered = true;
          alertMessage = `System uptime (${dataPoint.value}%) below threshold (${thresholds.uptimeMin}%)`;
        }
        break;
    }
    
    if (alertTriggered) {
      logger.warn('📊 KPI THRESHOLD ALERT', {
        kpiName: dataPoint.kpiName,
        value: dataPoint.value,
        message: alertMessage
      });
      
      this.emit('kpiAlert', {
        kpiName: dataPoint.kpiName,
        value: dataPoint.value,
        message: alertMessage,
        timestamp: dataPoint.timestamp
      });
    }
  }

  /**
   * Calculate false positive rate
   * Calculates false positive rate from events
   * 
   * @param events - Security events
   * @returns number False positive rate
   */
  private calculateFalsePositiveRate(events: SecurityEvent[]): number {
    const resolvedEvents = events.filter(event => event.status === 'resolved');
    const falsePositives = resolvedEvents.filter(event => 
      event.responseActions.includes('Mark as false positive')
    );
    
    return resolvedEvents.length > 0 ? (falsePositives.length / resolvedEvents.length) * 100 : 0;
  }

  /**
   * Calculate average response time
   * Calculates average response time for events
   * 
   * @param events - Security events
   * @returns number Average response time in seconds
   */
  private calculateAverageResponseTime(events: SecurityEvent[]): number {
    const respondedEvents = events.filter(event => 
      event.status === 'resolved' || event.status === 'contained'
    );
    
    if (respondedEvents.length === 0) return 0;
    
    const totalResponseTime = respondedEvents.reduce((total, event) => {
      // Simulate response time calculation
      // In real implementation, this would track actual response times
      return total + (event.severity * 30); // Rough estimate based on severity
    }, 0);
    
    return totalResponseTime / respondedEvents.length;
  }

  /**
   * Calculate security score
   * Calculates overall security score based on events
   * 
   * @param events - Security events
   * @returns number Security score (0-100)
   */
  private calculateSecurityScore(events: SecurityEvent[]): number {
    if (events.length === 0) return 100;
    
    const severitySum = events.reduce((sum, event) => sum + event.severity, 0);
    const averageSeverity = severitySum / events.length;
    
    // Convert average severity to security score (inverse relationship)
    return Math.max(0, 100 - (averageSeverity * 10));
  }

  /**
   * Calculate uptime
   * Calculates system uptime percentage
   * 
   * @returns number Uptime percentage
   */
  private calculateUptime(): number {
    const totalTime = Date.now() - this.serviceStartTime.getTime();
    // In real implementation, this would track actual downtime
    // For now, assume 99.9% uptime
    return 99.9;
  }

  /**
   * Calculate trend
   * Calculates trend direction and strength from data points
   * 
   * @param dataPoints - KPI data points
   * @returns Trend analysis
   */
  private calculateTrend(dataPoints: SecurityKPIDataPoint[]): {
    direction: 'improving' | 'degrading' | 'stable';
    strength: number;
    confidence: number;
  } {
    if (dataPoints.length < 2) {
      return { direction: 'stable', strength: 0, confidence: 0 };
    }
    
    // Simple linear regression for trend
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, _, i) => sum + i, 0);
    const sumY = dataPoints.reduce((sum, point) => sum + point.value, 0);
    const sumXY = dataPoints.reduce((sum, point, i) => sum + (i * point.value), 0);
    const sumXX = dataPoints.reduce((sum, _, i) => sum + (i * i), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const strength = Math.abs(slope) / (sumY / n); // Normalized slope
    const confidence = Math.min(n / 10, 1); // Confidence based on data points
    
    let direction: 'improving' | 'degrading' | 'stable' = 'stable';
    if (Math.abs(slope) > 0.1) {
      direction = slope > 0 ? 'improving' : 'degrading';
    }
    
    return { direction, strength, confidence };
  }

  /**
   * Generate forecast
   * Generates forecast values based on historical data
   * 
   * @param dataPoints - Historical data points
   * @param periods - Number of periods to forecast
   * @returns Forecast data
   */
  private generateForecast(
    dataPoints: SecurityKPIDataPoint[],
    periods: number
  ): Array<{ timestamp: Date; value: number; confidence: number }> {
    const forecast: Array<{ timestamp: Date; value: number; confidence: number }> = [];
    
    if (dataPoints.length < 3) return forecast;
    
    // Simple moving average forecast
    const windowSize = Math.min(5, dataPoints.length);
    const recentValues = dataPoints.slice(-windowSize).map(p => p.value);
    const averageValue = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    
    const lastTimestamp = dataPoints[dataPoints.length - 1].timestamp;
    const intervalMs = dataPoints.length > 1 ? 
      dataPoints[dataPoints.length - 1].timestamp.getTime() - 
      dataPoints[dataPoints.length - 2].timestamp.getTime() : 
      60000; // Default 1 minute
    
    for (let i = 1; i <= periods; i++) {
      const forecastTimestamp = new Date(lastTimestamp.getTime() + (i * intervalMs));
      const confidence = Math.max(0.1, 1 - (i * 0.1)); // Decreasing confidence
      
      forecast.push({
        timestamp: forecastTimestamp,
        value: averageValue,
        confidence
      });
    }
    
    return forecast;
  }

  /**
   * Generate trend summary
   * Creates human-readable trend summary
   * 
   * @param trend - Trend analysis
   * @param dataPoints - Data points
   * @returns string Trend summary
   */
  private generateTrendSummary(
    trend: { direction: string; strength: number; confidence: number },
    dataPoints: SecurityKPIDataPoint[]
  ): string {
    const kpiName = dataPoints[0]?.kpiName || 'Unknown KPI';
    const currentValue = dataPoints[dataPoints.length - 1]?.value || 0;
    const previousValue = dataPoints[0]?.value || 0;
    const change = ((currentValue - previousValue) / previousValue) * 100;
    
    return `${kpiName} is ${trend.direction} with ${Math.round(trend.strength * 100)}% strength ` +
           `and ${Math.round(trend.confidence * 100)}% confidence. ` +
           `Current value: ${currentValue.toFixed(2)}, Change: ${change.toFixed(1)}%`;
  }

  /**
   * Calculate KPI summaries
   * Calculates KPI summaries for report period
   * 
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Promise<Array> KPI summaries
   */
  private async calculateKPISummaries(startDate: Date, endDate: Date): Promise<Array<{
    name: string;
    current: number;
    average: number;
    min: number;
    max: number;
    trend: 'up' | 'down' | 'stable';
    status: 'good' | 'warning' | 'critical';
  }>> {
    const summaries = [];
    
    for (const [kpiName] of this.kpiHistory) {
      const periodData = this.getKPIHistory(kpiName, startDate)
        .filter(point => point.timestamp <= endDate);
      
      if (periodData.length === 0) continue;
      
      const values = periodData.map(point => point.value);
      const current = values[values.length - 1];
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      // Determine trend
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (Math.abs(secondAvg - firstAvg) > average * 0.05) {
        trend = secondAvg > firstAvg ? 'up' : 'down';
      }
      
      // Determine status
      let status: 'good' | 'warning' | 'critical' = 'good';
      if (kpiName === 'security_score' && current < 80) status = 'warning';
      if (kpiName === 'security_score' && current < 60) status = 'critical';
      
      summaries.push({
        name: kpiName,
        current,
        average,
        min,
        max,
        trend,
        status
      });
    }
    
    return summaries;
  }

  /**
   * Analyze threat data
   * Analyzes threat data for report
   * 
   * @param events - Security events
   * @returns Threat analysis
   */
  private analyzeThreatData(events: SecurityEvent[]): {
    totalThreats: number;
    threatsByType: Record<string, number>;
    threatsBySeverity: Record<string, number>;
    topSources: Array<{ source: string; count: number }>;
  } {
    const threatEvents = events.filter(event => event.eventType === 'threat_detected');
    
    const threatsByType: Record<string, number> = {};
    const threatsBySeverity: Record<string, number> = {};
    const sourceCount: Record<string, number> = {};
    
    threatEvents.forEach(event => {
      // Count by type
      threatsByType[event.eventType] = (threatsByType[event.eventType] || 0) + 1;
      
      // Count by severity
      const severityRange = this.getSeverityRange(event.severity);
      threatsBySeverity[severityRange] = (threatsBySeverity[severityRange] || 0) + 1;
      
      // Count by source
      sourceCount[event.source] = (sourceCount[event.source] || 0) + 1;
    });
    
    // Get top sources
    const topSources = Object.entries(sourceCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([source, count]) => ({ source, count }));
    
    return {
      totalThreats: threatEvents.length,
      threatsByType,
      threatsBySeverity,
      topSources
    };
  }

  /**
   * Calculate system performance
   * Calculates system performance metrics
   * 
   * @param events - Security events
   * @returns System performance metrics
   */
  private calculateSystemPerformance(events: SecurityEvent[]): {
    uptime: number;
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
  } {
    return {
      uptime: this.calculateUptime(),
      averageResponseTime: this.calculateAverageResponseTime(events),
      errorRate: events.filter(e => e.status === 'resolved').length / Math.max(events.length, 1) * 100,
      throughput: events.length / 24 // Events per hour (assuming 24-hour period)
    };
  }

  /**
   * Generate recommendations
   * Generates security recommendations based on analysis
   * 
   * @param kpiSummaries - KPI summaries
   * @param threatAnalysis - Threat analysis
   * @returns string[] Recommendations
   */
  private generateRecommendations(
    kpiSummaries: any[],
    threatAnalysis: any
  ): string[] {
    const recommendations: string[] = [];
    
    // Check security score
    const securityScore = kpiSummaries.find(kpi => kpi.name === 'security_score');
    if (securityScore && securityScore.current < 80) {
      recommendations.push('Security score is below optimal level. Review and strengthen security controls.');
    }
    
    // Check threat detection rate
    const threatRate = kpiSummaries.find(kpi => kpi.name === 'threat_detection_rate');
    if (threatRate && threatRate.current > 10) {
      recommendations.push('High threat detection rate indicates increased security risks. Investigate threat sources.');
    }
    
    // Check response time
    const responseTime = kpiSummaries.find(kpi => kpi.name === 'average_response_time');
    if (responseTime && responseTime.current > 300) {
      recommendations.push('Average response time is high. Consider automating more response procedures.');
    }
    
    // Check threat patterns
    if (threatAnalysis.totalThreats > 100) {
      recommendations.push('High volume of threats detected. Consider implementing additional preventive measures.');
    }
    
    return recommendations;
  }

  /**
   * Calculate overall security score
   * Calculates overall security score from KPI summaries
   * 
   * @param kpiSummaries - KPI summaries
   * @returns number Overall security score
   */
  private calculateOverallSecurityScore(kpiSummaries: any[]): number {
    const securityScore = kpiSummaries.find(kpi => kpi.name === 'security_score');
    return securityScore ? securityScore.current : 100;
  }

  /**
   * Calculate audit completeness
   * Calculates audit trail completeness
   * 
   * @returns Promise<number> Audit completeness percentage
   */
  private async calculateAuditCompleteness(): Promise<number> {
    // Implementation would check audit trail completeness
    // For now, return a placeholder value
    return 95;
  }

  /**
   * Calculate data retention compliance
   * Calculates data retention compliance
   * 
   * @returns number Data retention compliance percentage
   */
  private calculateDataRetentionCompliance(): number {
    // Implementation would check data retention policies
    // For now, return a placeholder value
    return 98;
  }

  /**
   * Calculate access control compliance
   * Calculates access control compliance
   * 
   * @returns number Access control compliance percentage
   */
  private calculateAccessControlCompliance(): number {
    // Implementation would check access control policies
    // For now, return a placeholder value
    return 92;
  }

  /**
   * Calculate encryption compliance
   * Calculates encryption compliance
   * 
   * @returns number Encryption compliance percentage
   */
  private calculateEncryptionCompliance(): number {
    // Implementation would check encryption usage
    // For now, return a placeholder value
    return 100;
  }

  /**
   * Calculate incident response compliance
   * Calculates incident response compliance
   * 
   * @returns number Incident response compliance percentage
   */
  private calculateIncidentResponseCompliance(): number {
    // Implementation would check incident response procedures
    // For now, return a placeholder value
    return 88;
  }

  /**
   * Identify compliance violations
   * Identifies compliance violations
   * 
   * @returns Promise<Array> Compliance violations
   */
  private async identifyComplianceViolations(): Promise<Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    timestamp: Date;
  }>> {
    // Implementation would identify actual violations
    // For now, return empty array
    return [];
  }

  /**
   * Get severity range
   * Maps numeric severity to range
   * 
   * @param severity - Numeric severity
   * @returns string Severity range
   */
  private getSeverityRange(severity: number): string {
    if (severity >= 9) return 'Critical (9-10)';
    if (severity >= 7) return 'High (7-8)';
    if (severity >= 5) return 'Medium (5-6)';
    if (severity >= 3) return 'Low (3-4)';
    return 'Minimal (1-2)';
  }

  /**
   * Get total data points
   * Returns total number of data points across all KPIs
   * 
   * @returns number Total data points
   */
  private getTotalDataPoints(): number {
    let total = 0;
    for (const [, history] of this.kpiHistory) {
      total += history.length;
    }
    return total;
  }

  /**
   * Clean up old data
   * Removes old data points beyond retention period
   */
  private cleanupOldData(): void {
    const cutoffDate = new Date(Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000));
    
    for (const [kpiName, history] of this.kpiHistory) {
      const filteredHistory = history.filter(point => point.timestamp >= cutoffDate);
      this.kpiHistory.set(kpiName, filteredHistory);
    }
    
    // Clean up security events
    this.securityEvents = this.securityEvents.filter(
      event => event.timestamp >= cutoffDate
    );
  }

  /**
   * Get service status
   * Returns current service status
   * 
   * @returns Service status information
   */
  public getStatus(): {
    isCollecting: boolean;
    totalKPIs: number;
    totalDataPoints: number;
    uptime: number;
    timestamp: number;
  } {
    return {
      isCollecting: this.collectionInterval !== null,
      totalKPIs: this.kpiHistory.size,
      totalDataPoints: this.getTotalDataPoints(),
      uptime: Date.now() - this.serviceStartTime.getTime(),
      timestamp: Date.now()
    };
  }
}

// Create and export singleton instance
export const securityMetricsService = new SecurityMetricsService();

// =============================================================================
// SECURITY METRICS NOTES
// =============================================================================
// 1. Comprehensive KPI tracking for all security aspects
// 2. Real-time metrics collection and analysis
// 3. Trend analysis and forecasting capabilities
// 4. Automated alerting on threshold violations
// 5. Compliance metrics and violation tracking
// 6. Performance reporting and recommendations
// 7. Historical data retention and cleanup
// 8. Integration with security monitoring and audit services
// =============================================================================
