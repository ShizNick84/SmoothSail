import { EventEmitter } from 'events';
import { createHash, createHmac } from 'crypto';
import { Logger } from '../core/logging/logger';
import { SSHTunnelManager, TunnelConnection } from './ssh-tunnel-manager';
import { EncryptionService } from '../security/encryption-service';

/**
 * Security threat levels
 */
export enum ThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Security event types
 */
export enum SecurityEventType {
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SUSPICIOUS_TRAFFIC = 'SUSPICIOUS_TRAFFIC',
  TUNNEL_HIJACK_ATTEMPT = 'TUNNEL_HIJACK_ATTEMPT',
  DATA_INTEGRITY_VIOLATION = 'DATA_INTEGRITY_VIOLATION',
  ENCRYPTION_FAILURE = 'ENCRYPTION_FAILURE',
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  TRAFFIC_ANOMALY = 'TRAFFIC_ANOMALY',
  CONNECTION_TAMPERING = 'CONNECTION_TAMPERING'
}

/**
 * Security event information
 */
export interface SecurityEvent {
  id: string;
  timestamp: Date;
  connectionId: string;
  type: SecurityEventType;
  threatLevel: ThreatLevel;
  description: string;
  sourceIP?: string;
  targetIP?: string;
  dataSize?: number;
  metadata: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  responseActions: string[];
}

/**
 * Traffic analysis result
 */
export interface TrafficAnalysis {
  connectionId: string;
  timestamp: Date;
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  suspiciousPatterns: string[];
  anomalyScore: number; // 0-100
  encryptionIntegrity: boolean;
  dataIntegrityHash: string;
}

/**
 * Security monitoring configuration
 */
export interface SecurityMonitorConfig {
  /** Enable traffic monitoring */
  enableTrafficMonitoring: boolean;
  /** Enable intrusion detection */
  enableIntrusionDetection: boolean;
  /** Enable data integrity checking */
  enableDataIntegrityChecking: boolean;
  /** Traffic analysis interval in milliseconds */
  trafficAnalysisInterval: number;
  /** Maximum allowed traffic anomaly score */
  maxAnomalyScore: number;
  /** Enable automatic threat response */
  enableAutoResponse: boolean;
  /** Threat response timeout in milliseconds */
  threatResponseTimeout: number;
  /** Security event retention period in milliseconds */
  eventRetentionPeriod: number;
}

/**
 * Intrusion detection patterns
 */
export interface IntrusionPattern {
  name: string;
  pattern: RegExp;
  threatLevel: ThreatLevel;
  description: string;
  responseAction: string;
}

/**
 * Security metrics
 */
export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Map<SecurityEventType, number>;
  eventsByThreatLevel: Map<ThreatLevel, number>;
  averageAnomalyScore: number;
  integrityViolations: number;
  resolvedEvents: number;
  activeThreats: number;
  lastSecurityScan: Date;
  systemSecurityScore: number; // 0-100
}

/**
 * Tunnel Security Monitor
 * Monitors SSH tunnel security with traffic analysis, intrusion detection, and integrity checking
 */
export class TunnelSecurityMonitor extends EventEmitter {
  private logger: Logger;
  private tunnelManager: SSHTunnelManager;
  private encryptionService: EncryptionService;
  private config: SecurityMonitorConfig;
  private securityEvents: Map<string, SecurityEvent>;
  private trafficAnalysis: Map<string, TrafficAnalysis[]>;
  private intrusionPatterns: IntrusionPattern[];
  private securityMetrics: SecurityMetrics;
  private monitoringIntervals: Map<string, NodeJS.Timeout>;
  private isMonitoring: boolean;

  constructor(
    logger: Logger,
    tunnelManager: SSHTunnelManager,
    encryptionService: EncryptionService,
    config?: Partial<SecurityMonitorConfig>
  ) {
    super();
    this.logger = logger;
    this.tunnelManager = tunnelManager;
    this.encryptionService = encryptionService;
    this.securityEvents = new Map();
    this.trafficAnalysis = new Map();
    this.monitoringIntervals = new Map();
    this.isMonitoring = false;

    // Default configuration
    this.config = {
      enableTrafficMonitoring: true,
      enableIntrusionDetection: true,
      enableDataIntegrityChecking: true,
      trafficAnalysisInterval: 30000, // 30 seconds
      maxAnomalyScore: 70,
      enableAutoResponse: true,
      threatResponseTimeout: 10000,
      eventRetentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      ...config
    };

    // Initialize security metrics
    this.securityMetrics = {
      totalEvents: 0,
      eventsByType: new Map(),
      eventsByThreatLevel: new Map(),
      averageAnomalyScore: 0,
      integrityViolations: 0,
      resolvedEvents: 0,
      activeThreats: 0,
      lastSecurityScan: new Date(),
      systemSecurityScore: 100
    };

    // Initialize intrusion detection patterns
    this.initializeIntrusionPatterns();

    this.setupEventListeners();
    this.logger.info('Tunnel Security Monitor initialized', this.config);
  }

  /**
   * Start security monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      this.logger.warn('Security monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.logger.info('Starting tunnel security monitoring');

    // Monitor existing connections
    const connections = this.tunnelManager.getAllConnections();
    for (const connection of connections) {
      this.startMonitoringConnection(connection.id);
    }

    // Start periodic security scans
    this.startPeriodicSecurityScans();

    this.emit('securityMonitoringStarted');
  }

  /**
   * Stop security monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      this.logger.warn('Security monitoring is not running');
      return;
    }

    this.isMonitoring = false;
    this.logger.info('Stopping tunnel security monitoring');

    // Clear all monitoring intervals
    for (const [connectionId, interval] of this.monitoringIntervals.entries()) {
      clearInterval(interval);
      this.monitoringIntervals.delete(connectionId);
    }

    this.emit('securityMonitoringStopped');
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

    this.logger.info(`Starting security monitoring for connection: ${connectionId}`);

    // Initialize traffic analysis history
    this.trafficAnalysis.set(connectionId, []);

    // Start periodic traffic analysis
    if (this.config.enableTrafficMonitoring) {
      const interval = setInterval(async () => {
        try {
          await this.analyzeTraffic(connectionId);
        } catch (error) {
          this.logger.error(`Traffic analysis failed for connection ${connectionId}`, error);
        }
      }, this.config.trafficAnalysisInterval);

      this.monitoringIntervals.set(connectionId, interval);
    }

    // Perform initial security scan
    setTimeout(() => this.performSecurityScan(connectionId), 1000);
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
      this.logger.info(`Stopped security monitoring for connection: ${connectionId}`);
    }

    // Clean up traffic analysis data
    this.trafficAnalysis.delete(connectionId);
  }

  /**
   * Report security event
   * 
   * @param connectionId - Connection identifier
   * @param type - Security event type
   * @param threatLevel - Threat level
   * @param description - Event description
   * @param metadata - Additional metadata
   */
  reportSecurityEvent(
    connectionId: string,
    type: SecurityEventType,
    threatLevel: ThreatLevel,
    description: string,
    metadata: Record<string, any> = {}
  ): SecurityEvent {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      connectionId,
      type,
      threatLevel,
      description,
      metadata,
      resolved: false,
      responseActions: []
    };

    // Store event
    this.securityEvents.set(event.id, event);

    // Update metrics
    this.updateSecurityMetrics(event);

    // Log event
    this.logger.warn(`Security event detected: ${event.id}`, {
      connectionId,
      type,
      threatLevel,
      description
    });

    // Emit event
    this.emit('securityEvent', event);

    // Trigger automatic response if enabled
    if (this.config.enableAutoResponse) {
      this.triggerAutomaticResponse(event);
    }

    return event;
  }

  /**
   * Resolve security event
   * 
   * @param eventId - Event identifier
   * @param responseActions - Actions taken to resolve the event
   */
  resolveSecurityEvent(eventId: string, responseActions: string[]): void {
    const event = this.securityEvents.get(eventId);
    if (!event) {
      this.logger.warn(`Security event not found: ${eventId}`);
      return;
    }

    event.resolved = true;
    event.resolvedAt = new Date();
    event.responseActions = responseActions;

    this.securityMetrics.resolvedEvents++;
    this.securityMetrics.activeThreats = Math.max(0, this.securityMetrics.activeThreats - 1);

    this.logger.info(`Security event resolved: ${eventId}`, { responseActions });
    this.emit('securityEventResolved', event);
  }

  /**
   * Get security events
   * 
   * @param connectionId - Optional connection filter
   * @param threatLevel - Optional threat level filter
   * @param limit - Maximum number of events to return
   * @returns Array of security events
   */
  getSecurityEvents(
    connectionId?: string,
    threatLevel?: ThreatLevel,
    limit?: number
  ): SecurityEvent[] {
    let events = Array.from(this.securityEvents.values());

    // Apply filters
    if (connectionId) {
      events = events.filter(event => event.connectionId === connectionId);
    }

    if (threatLevel) {
      events = events.filter(event => event.threatLevel === threatLevel);
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (limit) {
      events = events.slice(0, limit);
    }

    return events;
  }

  /**
   * Get traffic analysis data
   * 
   * @param connectionId - Connection identifier
   * @param limit - Maximum number of analysis entries to return
   * @returns Array of traffic analysis results
   */
  getTrafficAnalysis(connectionId: string, limit?: number): TrafficAnalysis[] {
    const analysis = this.trafficAnalysis.get(connectionId) || [];
    return limit ? analysis.slice(-limit) : [...analysis];
  }

  /**
   * Get security metrics
   * 
   * @returns Current security metrics
   */
  getSecurityMetrics(): SecurityMetrics {
    return { ...this.securityMetrics };
  }

  /**
   * Perform comprehensive security scan
   * 
   * @param connectionId - Connection identifier
   */
  async performSecurityScan(connectionId: string): Promise<void> {
    const connection = this.tunnelManager.getConnection(connectionId);
    if (!connection) {
      this.logger.warn(`Connection not found for security scan: ${connectionId}`);
      return;
    }

    try {
      this.logger.debug(`Performing security scan for connection: ${connectionId}`);

      // Check connection integrity
      await this.checkConnectionIntegrity(connection);

      // Analyze traffic patterns
      if (this.config.enableTrafficMonitoring) {
        await this.analyzeTraffic(connectionId);
      }

      // Check for intrusion attempts
      if (this.config.enableIntrusionDetection) {
        await this.detectIntrusions(connection);
      }

      // Verify data integrity
      if (this.config.enableDataIntegrityChecking) {
        await this.checkDataIntegrity(connection);
      }

      this.securityMetrics.lastSecurityScan = new Date();

    } catch (error) {
      this.logger.error(`Security scan failed for connection ${connectionId}`, error);
      
      this.reportSecurityEvent(
        connectionId,
        SecurityEventType.ENCRYPTION_FAILURE,
        ThreatLevel.HIGH,
        `Security scan failed: ${error instanceof Error ? error.message : String(error)}`,
        { error: error instanceof Error ? error.stack : String(error) }
      );
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for new tunnel connections
    this.tunnelManager.on('tunnelConnected', (connection) => {
      if (this.isMonitoring) {
        this.startMonitoringConnection(connection.id);
      }
    });

    // Listen for tunnel disconnections
    this.tunnelManager.on('tunnelDisconnected', (connection) => {
      this.stopMonitoringConnection(connection.id);
    });

    // Listen for tunnel errors (potential security issues)
    this.tunnelManager.on('tunnelError', (connection, error) => {
      this.reportSecurityEvent(
        connection.id,
        SecurityEventType.CONNECTION_TAMPERING,
        ThreatLevel.MEDIUM,
        `Tunnel error detected: ${error.message}`,
        { error: error.stack }
      );
    });
  }

  /**
   * Initialize intrusion detection patterns
   */
  private initializeIntrusionPatterns(): void {
    this.intrusionPatterns = [
      {
        name: 'Port Scanning',
        pattern: /(?:nmap|masscan|zmap)/i,
        threatLevel: ThreatLevel.MEDIUM,
        description: 'Port scanning activity detected',
        responseAction: 'Block source IP'
      },
      {
        name: 'SQL Injection',
        pattern: /(?:union|select|insert|update|delete|drop|create|alter)\s+/i,
        threatLevel: ThreatLevel.HIGH,
        description: 'SQL injection attempt detected',
        responseAction: 'Block connection and alert'
      },
      {
        name: 'SSH Brute Force',
        pattern: /(?:ssh|sshd).*(?:failed|invalid|authentication)/i,
        threatLevel: ThreatLevel.HIGH,
        description: 'SSH brute force attack detected',
        responseAction: 'Implement rate limiting'
      },
      {
        name: 'Malware Signature',
        pattern: /(?:malware|virus|trojan|backdoor|rootkit)/i,
        threatLevel: ThreatLevel.CRITICAL,
        description: 'Malware signature detected',
        responseAction: 'Immediate connection termination'
      },
      {
        name: 'Data Exfiltration',
        pattern: /(?:wget|curl|nc|netcat).*(?:http|ftp|tcp)/i,
        threatLevel: ThreatLevel.HIGH,
        description: 'Potential data exfiltration detected',
        responseAction: 'Monitor and analyze traffic'
      }
    ];
  }

  /**
   * Analyze traffic for security threats
   * 
   * @param connectionId - Connection identifier
   */
  private async analyzeTraffic(connectionId: string): Promise<void> {
    const connection = this.tunnelManager.getConnection(connectionId);
    if (!connection) return;

    try {
      // Simulate traffic analysis (in real implementation, this would analyze actual network traffic)
      const analysis: TrafficAnalysis = {
        connectionId,
        timestamp: new Date(),
        bytesIn: Math.floor(Math.random() * 10000),
        bytesOut: Math.floor(Math.random() * 10000),
        packetsIn: Math.floor(Math.random() * 100),
        packetsOut: Math.floor(Math.random() * 100),
        suspiciousPatterns: [],
        anomalyScore: Math.floor(Math.random() * 100),
        encryptionIntegrity: true,
        dataIntegrityHash: this.calculateDataIntegrityHash(connectionId)
      };

      // Check for suspicious patterns
      analysis.suspiciousPatterns = this.detectSuspiciousPatterns(analysis);

      // Check anomaly score
      if (analysis.anomalyScore > this.config.maxAnomalyScore) {
        this.reportSecurityEvent(
          connectionId,
          SecurityEventType.TRAFFIC_ANOMALY,
          analysis.anomalyScore > 90 ? ThreatLevel.HIGH : ThreatLevel.MEDIUM,
          `High traffic anomaly score: ${analysis.anomalyScore}`,
          { analysis }
        );
      }

      // Store analysis
      const analysisHistory = this.trafficAnalysis.get(connectionId) || [];
      analysisHistory.push(analysis);

      // Limit history size
      const maxHistorySize = 1000;
      if (analysisHistory.length > maxHistorySize) {
        analysisHistory.splice(0, analysisHistory.length - maxHistorySize);
      }

      this.trafficAnalysis.set(connectionId, analysisHistory);

      // Update metrics
      this.updateAnomalyMetrics(analysis);

    } catch (error) {
      this.logger.error(`Traffic analysis failed for connection ${connectionId}`, error);
    }
  }

  /**
   * Check connection integrity
   * 
   * @param connection - Tunnel connection
   */
  private async checkConnectionIntegrity(connection: TunnelConnection): Promise<void> {
    try {
      // Verify connection state
      if (connection.process && connection.process.killed) {
        this.reportSecurityEvent(
          connection.id,
          SecurityEventType.CONNECTION_TAMPERING,
          ThreatLevel.HIGH,
          'Connection process was terminated unexpectedly',
          { processKilled: true }
        );
      }

      // Check for unusual connection parameters
      if (connection.config.localPort < 1024 && process.getuid && process.getuid() !== 0) {
        this.reportSecurityEvent(
          connection.id,
          SecurityEventType.UNAUTHORIZED_ACCESS,
          ThreatLevel.MEDIUM,
          'Privileged port usage without root access',
          { localPort: connection.config.localPort }
        );
      }

    } catch (error) {
      this.logger.error(`Connection integrity check failed for ${connection.id}`, error);
    }
  }

  /**
   * Detect intrusion attempts
   * 
   * @param connection - Tunnel connection
   */
  private async detectIntrusions(connection: TunnelConnection): Promise<void> {
    try {
      // Simulate log analysis (in real implementation, this would analyze actual logs)
      const logEntries = this.getRecentLogEntries(connection.id);

      for (const logEntry of logEntries) {
        for (const pattern of this.intrusionPatterns) {
          if (pattern.pattern.test(logEntry)) {
            this.reportSecurityEvent(
              connection.id,
              SecurityEventType.SUSPICIOUS_TRAFFIC,
              pattern.threatLevel,
              pattern.description,
              {
                pattern: pattern.name,
                logEntry,
                responseAction: pattern.responseAction
              }
            );
          }
        }
      }

    } catch (error) {
      this.logger.error(`Intrusion detection failed for connection ${connection.id}`, error);
    }
  }

  /**
   * Check data integrity
   * 
   * @param connection - Tunnel connection
   */
  private async checkDataIntegrity(connection: TunnelConnection): Promise<void> {
    try {
      // Calculate current data integrity hash
      const currentHash = this.calculateDataIntegrityHash(connection.id);
      
      // Get previous hash from traffic analysis
      const analysisHistory = this.trafficAnalysis.get(connection.id) || [];
      const previousAnalysis = analysisHistory[analysisHistory.length - 1];

      if (previousAnalysis && previousAnalysis.dataIntegrityHash !== currentHash) {
        // Check if the difference is significant
        const hashDifference = this.calculateHashDifference(previousAnalysis.dataIntegrityHash, currentHash);
        
        if (hashDifference > 0.1) { // 10% threshold
          this.reportSecurityEvent(
            connection.id,
            SecurityEventType.DATA_INTEGRITY_VIOLATION,
            ThreatLevel.HIGH,
            'Data integrity violation detected',
            {
              previousHash: previousAnalysis.dataIntegrityHash,
              currentHash,
              difference: hashDifference
            }
          );

          this.securityMetrics.integrityViolations++;
        }
      }

    } catch (error) {
      this.logger.error(`Data integrity check failed for connection ${connection.id}`, error);
    }
  }

  /**
   * Detect suspicious patterns in traffic analysis
   * 
   * @param analysis - Traffic analysis data
   * @returns Array of suspicious pattern names
   */
  private detectSuspiciousPatterns(analysis: TrafficAnalysis): string[] {
    const patterns: string[] = [];

    // Check for unusual traffic volume
    if (analysis.bytesIn > 100000 || analysis.bytesOut > 100000) {
      patterns.push('High traffic volume');
    }

    // Check for packet ratio anomalies
    const packetRatio = analysis.packetsIn / Math.max(analysis.packetsOut, 1);
    if (packetRatio > 10 || packetRatio < 0.1) {
      patterns.push('Unusual packet ratio');
    }

    // Check for potential data exfiltration
    if (analysis.bytesOut > analysis.bytesIn * 2) {
      patterns.push('Potential data exfiltration');
    }

    return patterns;
  }

  /**
   * Calculate data integrity hash
   * 
   * @param connectionId - Connection identifier
   * @returns Data integrity hash
   */
  private calculateDataIntegrityHash(connectionId: string): string {
    const connection = this.tunnelManager.getConnection(connectionId);
    if (!connection) return '';

    const data = JSON.stringify({
      connectionId,
      config: connection.config,
      state: connection.state,
      timestamp: Date.now()
    });

    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Calculate hash difference percentage
   * 
   * @param hash1 - First hash
   * @param hash2 - Second hash
   * @returns Difference percentage (0-1)
   */
  private calculateHashDifference(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) return 1;

    let differences = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        differences++;
      }
    }

    return differences / hash1.length;
  }

  /**
   * Get recent log entries for analysis
   * 
   * @param connectionId - Connection identifier
   * @returns Array of log entries
   */
  private getRecentLogEntries(connectionId: string): string[] {
    // Simulate log entries (in real implementation, this would read actual logs)
    return [
      `SSH connection established for ${connectionId}`,
      `Data transfer initiated for ${connectionId}`,
      `Normal operation for ${connectionId}`,
      // Add some potentially suspicious entries for testing
      ...(Math.random() > 0.8 ? ['SSH authentication failed for user admin'] : []),
      ...(Math.random() > 0.9 ? ['Port scan detected from 192.168.1.100'] : [])
    ];
  }

  /**
   * Trigger automatic response to security event
   * 
   * @param event - Security event
   */
  private async triggerAutomaticResponse(event: SecurityEvent): Promise<void> {
    try {
      const responseActions: string[] = [];

      switch (event.threatLevel) {
        case ThreatLevel.CRITICAL:
          // Immediate connection termination
          await this.tunnelManager.disconnectTunnel(event.connectionId);
          responseActions.push('Connection terminated');
          break;

        case ThreatLevel.HIGH:
          // Enhanced monitoring and alerting
          responseActions.push('Enhanced monitoring enabled');
          this.emit('highThreatDetected', event);
          break;

        case ThreatLevel.MEDIUM:
          // Increased logging and monitoring
          responseActions.push('Increased monitoring');
          break;

        case ThreatLevel.LOW:
          // Log and continue monitoring
          responseActions.push('Logged for analysis');
          break;
      }

      // Update event with response actions
      event.responseActions = responseActions;

      this.logger.info(`Automatic response triggered for event ${event.id}`, { responseActions });

    } catch (error) {
      this.logger.error(`Automatic response failed for event ${event.id}`, error);
    }
  }

  /**
   * Start periodic security scans
   */
  private startPeriodicSecurityScans(): void {
    // Perform security scans every 5 minutes
    setInterval(() => {
      const connections = this.tunnelManager.getAllConnections();
      for (const connection of connections) {
        this.performSecurityScan(connection.id);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Update security metrics
   * 
   * @param event - Security event
   */
  private updateSecurityMetrics(event: SecurityEvent): void {
    this.securityMetrics.totalEvents++;
    this.securityMetrics.activeThreats++;

    // Update event type counts
    const typeCount = this.securityMetrics.eventsByType.get(event.type) || 0;
    this.securityMetrics.eventsByType.set(event.type, typeCount + 1);

    // Update threat level counts
    const threatCount = this.securityMetrics.eventsByThreatLevel.get(event.threatLevel) || 0;
    this.securityMetrics.eventsByThreatLevel.set(event.threatLevel, threatCount + 1);

    // Calculate system security score
    this.calculateSystemSecurityScore();
  }

  /**
   * Update anomaly metrics
   * 
   * @param analysis - Traffic analysis
   */
  private updateAnomalyMetrics(analysis: TrafficAnalysis): void {
    // Calculate running average of anomaly scores
    const allAnalysis = Array.from(this.trafficAnalysis.values()).flat();
    const totalScore = allAnalysis.reduce((sum, a) => sum + a.anomalyScore, 0);
    this.securityMetrics.averageAnomalyScore = allAnalysis.length > 0 ? totalScore / allAnalysis.length : 0;
  }

  /**
   * Calculate system security score
   */
  private calculateSystemSecurityScore(): void {
    let score = 100;

    // Deduct points for active threats
    score -= this.securityMetrics.activeThreats * 10;

    // Deduct points for high anomaly scores
    if (this.securityMetrics.averageAnomalyScore > 70) {
      score -= (this.securityMetrics.averageAnomalyScore - 70) * 0.5;
    }

    // Deduct points for integrity violations
    score -= this.securityMetrics.integrityViolations * 5;

    // Deduct points for critical events
    const criticalEvents = this.securityMetrics.eventsByThreatLevel.get(ThreatLevel.CRITICAL) || 0;
    score -= criticalEvents * 20;

    this.securityMetrics.systemSecurityScore = Math.max(0, Math.min(100, score));
  }

  /**
   * Generate unique event ID
   * 
   * @returns Unique event identifier
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup security monitor resources
   */
  cleanup(): void {
    this.stopMonitoring();
    
    // Clean up old events
    const cutoffTime = Date.now() - this.config.eventRetentionPeriod;
    for (const [eventId, event] of this.securityEvents.entries()) {
      if (event.timestamp.getTime() < cutoffTime) {
        this.securityEvents.delete(eventId);
      }
    }

    this.trafficAnalysis.clear();
    this.logger.info('Tunnel security monitor cleanup completed');
  }
}