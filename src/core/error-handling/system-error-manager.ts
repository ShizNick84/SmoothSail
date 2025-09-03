/**
 * =============================================================================
 * SYSTEM-WIDE ERROR RECOVERY AND MONITORING
 * =============================================================================
 * 
 * Centralized error handling and logging system that coordinates all error
 * handling components and provides system-wide error recovery capabilities.
 * 
 * Features:
 * - Centralized error handling and logging
 * - Automatic error recovery and system healing
 * - Error pattern detection and prevention
 * - Comprehensive error dashboard and monitoring
 * - Error-based system optimization and learning
 * - Critical error escalation to multiple notification channels
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { Logger } from '../logging/logger';
import { NotificationService } from '../notifications/notification-service';
import { TradingErrorHandler, TradingErrorType } from './trading-error-handler';
import { AIErrorHandler, AIErrorType } from './ai-error-handler';
import { NetworkErrorHandler, NetworkErrorType } from './network-error-handler';

export enum SystemErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
  FATAL = 'FATAL'
}

export enum SystemComponent {
  TRADING_ENGINE = 'TRADING_ENGINE',
  AI_SYSTEM = 'AI_SYSTEM',
  NETWORK_INFRASTRUCTURE = 'NETWORK_INFRASTRUCTURE',
  DATABASE = 'DATABASE',
  MONITORING = 'MONITORING',
  SECURITY = 'SECURITY',
  API_GATEWAY = 'API_GATEWAY'
}

export interface SystemError {
  id: string;
  timestamp: Date;
  component: SystemComponent;
  severity: SystemErrorSeverity;
  type: string;
  message: string;
  details: any;
  stackTrace?: string;
  context: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    operation?: string;
    metadata?: Record<string, any>;
  };
  resolution?: {
    status: 'pending' | 'resolved' | 'escalated' | 'ignored';
    resolvedAt?: Date;
    resolvedBy?: string;
    resolution?: string;
    preventionMeasures?: string[];
  };
}

export interface ErrorPattern {
  id: string;
  pattern: string;
  component: SystemComponent;
  frequency: number;
  lastOccurrence: Date;
  severity: SystemErrorSeverity;
  autoResolution?: {
    enabled: boolean;
    action: string;
    successRate: number;
  };
}

export interface SystemHealthMetrics {
  overallHealth: number; // 0-100
  componentHealth: Record<SystemComponent, number>;
  errorRates: Record<SystemComponent, number>;
  recoveryTimes: Record<SystemComponent, number>;
  uptime: number;
  lastIncident: Date | null;
  activeErrors: number;
  resolvedErrors: number;
  escalatedErrors: number;
}

export class SystemErrorManager extends EventEmitter {
  private logger: Logger;
  private notificationService: NotificationService;
  private tradingErrorHandler: TradingErrorHandler;
  private aiErrorHandler: AIErrorHandler;
  private networkErrorHandler: NetworkErrorHandler;
  
  private errors: Map<string, SystemError> = new Map();
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private componentStatus: Map<SystemComponent, boolean> = new Map();
  private healthMetrics: SystemHealthMetrics;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private patternAnalysisInterval: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly maxStoredErrors = 10000;
  private readonly patternDetectionWindow = 3600000; // 1 hour
  private readonly autoRecoveryEnabled = true;
  private readonly escalationThresholds = {
    [SystemErrorSeverity.CRITICAL]: 1,
    [SystemErrorSeverity.ERROR]: 5,
    [SystemErrorSeverity.WARNING]: 20
  };

  constructor() {
    super();
    this.logger = new Logger('SystemErrorManager');
    this.notificationService = new NotificationService();
    
    // Initialize error handlers
    this.tradingErrorHandler = new TradingErrorHandler();
    this.aiErrorHandler = new AIErrorHandler();
    this.networkErrorHandler = new NetworkErrorHandler();
    
    // Initialize system state
    this.initializeSystemState();
    this.setupErrorHandlerListeners();
    this.startMonitoring();
  }

  /**
   * Initialize system state and health metrics
   */
  private initializeSystemState(): void {
    // Initialize component status
    Object.values(SystemComponent).forEach(component => {
      this.componentStatus.set(component, true);
    });

    // Initialize health metrics
    this.healthMetrics = {
      overallHealth: 100,
      componentHealth: {} as Record<SystemComponent, number>,
      errorRates: {} as Record<SystemComponent, number>,
      recoveryTimes: {} as Record<SystemComponent, number>,
      uptime: Date.now(),
      lastIncident: null,
      activeErrors: 0,
      resolvedErrors: 0,
      escalatedErrors: 0
    };

    Object.values(SystemComponent).forEach(component => {
      this.healthMetrics.componentHealth[component] = 100;
      this.healthMetrics.errorRates[component] = 0;
      this.healthMetrics.recoveryTimes[component] = 0;
    });
  }

  /**
   * Setup listeners for component error handlers
   */
  private setupErrorHandlerListeners(): void {
    // Trading error handler events
    this.tradingErrorHandler.on('errorEscalated', (error) => {
      this.handleComponentError(SystemComponent.TRADING_ENGINE, error);
    });

    // AI error handler events
    this.aiErrorHandler.on('modelError', (error) => {
      this.handleComponentError(SystemComponent.AI_SYSTEM, error);
    });

    // Network error handler events
    this.networkErrorHandler.on('networkError', (error) => {
      this.handleComponentError(SystemComponent.NETWORK_INFRASTRUCTURE, error);
    });

    this.networkErrorHandler.on('cascadingFailureRisk', (services) => {
      this.handleCascadingFailure(services);
    });
  }

  /**
   * Handle error from system component
   */
  async handleComponentError(component: SystemComponent, error: any): Promise<void> {
    const systemError = this.createSystemError(component, error);
    
    // Store error
    this.errors.set(systemError.id, systemError);
    this.pruneOldErrors();

    // Update health metrics
    this.updateHealthMetrics(component, systemError);

    // Log error
    this.logSystemError(systemError);

    // Detect patterns
    await this.detectErrorPatterns(systemError);

    // Attempt auto-recovery
    if (this.autoRecoveryEnabled) {
      await this.attemptAutoRecovery(systemError);
    }

    // Check escalation criteria
    await this.checkEscalationCriteria(systemError);

    // Emit system error event
    this.emit('systemError', systemError);
  }

  /**
   * Create standardized system error
   */
  private createSystemError(component: SystemComponent, error: any): SystemError {
    return {
      id: this.generateErrorId(),
      timestamp: new Date(),
      component,
      severity: this.mapSeverity(error.severity || 'ERROR'),
      type: error.type || 'UNKNOWN_ERROR',
      message: error.message || 'Unknown system error',
      details: error.details || error,
      stackTrace: error.stack,
      context: {
        userId: error.userId,
        sessionId: error.sessionId,
        requestId: error.requestId,
        operation: error.operation,
        metadata: error.metadata
      },
      resolution: {
        status: 'pending'
      }
    };
  }

  /**
   * Map error severity to system severity
   */
  private mapSeverity(severity: string): SystemErrorSeverity {
    const severityMap: Record<string, SystemErrorSeverity> = {
      'LOW': SystemErrorSeverity.INFO,
      'MEDIUM': SystemErrorSeverity.WARNING,
      'HIGH': SystemErrorSeverity.ERROR,
      'CRITICAL': SystemErrorSeverity.CRITICAL,
      'FATAL': SystemErrorSeverity.FATAL
    };

    return severityMap[severity.toUpperCase()] || SystemErrorSeverity.ERROR;
  }

  /**
   * Update health metrics based on error
   */
  private updateHealthMetrics(component: SystemComponent, error: SystemError): void {
    // Increment active errors
    this.healthMetrics.activeErrors++;

    // Update component health
    const currentHealth = this.healthMetrics.componentHealth[component];
    const healthImpact = this.calculateHealthImpact(error.severity);
    this.healthMetrics.componentHealth[component] = Math.max(0, currentHealth - healthImpact);

    // Update error rates (errors per hour)
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const recentErrors = Array.from(this.errors.values())
      .filter(e => e.component === component && e.timestamp.getTime() > oneHourAgo);
    this.healthMetrics.errorRates[component] = recentErrors.length;

    // Update overall health
    const componentHealthValues = Object.values(this.healthMetrics.componentHealth);
    this.healthMetrics.overallHealth = componentHealthValues.reduce((sum, health) => sum + health, 0) / componentHealthValues.length;

    // Update last incident
    if (error.severity === SystemErrorSeverity.CRITICAL || error.severity === SystemErrorSeverity.FATAL) {
      this.healthMetrics.lastIncident = error.timestamp;
    }
  }

  /**
   * Calculate health impact based on error severity
   */
  private calculateHealthImpact(severity: SystemErrorSeverity): number {
    const impactMap = {
      [SystemErrorSeverity.INFO]: 0,
      [SystemErrorSeverity.WARNING]: 2,
      [SystemErrorSeverity.ERROR]: 5,
      [SystemErrorSeverity.CRITICAL]: 15,
      [SystemErrorSeverity.FATAL]: 30
    };

    return impactMap[severity] || 5;
  }

  /**
   * Detect error patterns for prevention
   */
  private async detectErrorPatterns(error: SystemError): Promise<void> {
    const patternKey = `${error.component}_${error.type}`;
    const now = Date.now();
    const windowStart = now - this.patternDetectionWindow;

    // Count similar errors in time window
    const similarErrors = Array.from(this.errors.values())
      .filter(e => 
        e.component === error.component &&
        e.type === error.type &&
        e.timestamp.getTime() > windowStart
      );

    let pattern = this.errorPatterns.get(patternKey);
    if (!pattern) {
      pattern = {
        id: patternKey,
        pattern: `${error.component}: ${error.type}`,
        component: error.component,
        frequency: 0,
        lastOccurrence: error.timestamp,
        severity: error.severity,
        autoResolution: {
          enabled: false,
          action: '',
          successRate: 0
        }
      };
      this.errorPatterns.set(patternKey, pattern);
    }

    pattern.frequency = similarErrors.length;
    pattern.lastOccurrence = error.timestamp;

    // Check if pattern requires attention
    if (pattern.frequency >= 5) {
      this.logger.warn(`Error pattern detected: ${pattern.pattern}`, {
        frequency: pattern.frequency,
        timeWindow: this.patternDetectionWindow / 60000 // minutes
      });

      await this.notificationService.sendAlert({
        title: 'Error Pattern Detected',
        message: `Pattern "${pattern.pattern}" occurred ${pattern.frequency} times in the last hour`,
        details: { pattern, recentErrors: similarErrors.slice(-3) }
      });

      // Enable auto-resolution if pattern is frequent
      if (pattern.frequency >= 10 && !pattern.autoResolution?.enabled) {
        pattern.autoResolution = {
          enabled: true,
          action: this.determineAutoResolutionAction(error),
          successRate: 0
        };
      }
    }
  }

  /**
   * Determine auto-resolution action for error pattern
   */
  private determineAutoResolutionAction(error: SystemError): string {
    const actionMap = {
      [SystemComponent.TRADING_ENGINE]: 'restart_trading_component',
      [SystemComponent.AI_SYSTEM]: 'restart_ai_service',
      [SystemComponent.NETWORK_INFRASTRUCTURE]: 'reconnect_network_services',
      [SystemComponent.DATABASE]: 'restart_database_connection',
      [SystemComponent.API_GATEWAY]: 'restart_api_gateway'
    };

    return actionMap[error.component] || 'manual_intervention_required';
  }

  /**
   * Attempt automatic error recovery
   */
  private async attemptAutoRecovery(error: SystemError): Promise<void> {
    const patternKey = `${error.component}_${error.type}`;
    const pattern = this.errorPatterns.get(patternKey);

    if (pattern?.autoResolution?.enabled) {
      try {
        this.logger.info(`Attempting auto-recovery for error: ${error.id}`, {
          action: pattern.autoResolution.action,
          component: error.component
        });

        const success = await this.executeRecoveryAction(pattern.autoResolution.action, error);
        
        if (success) {
          error.resolution = {
            status: 'resolved',
            resolvedAt: new Date(),
            resolvedBy: 'auto-recovery',
            resolution: `Auto-resolved using action: ${pattern.autoResolution.action}`
          };

          // Update success rate
          pattern.autoResolution.successRate = Math.min(100, pattern.autoResolution.successRate + 10);
          
          this.healthMetrics.resolvedErrors++;
          this.healthMetrics.activeErrors--;

          this.logger.info(`Auto-recovery successful for error: ${error.id}`);
        } else {
          this.logger.warn(`Auto-recovery failed for error: ${error.id}`);
          // Reduce success rate
          pattern.autoResolution.successRate = Math.max(0, pattern.autoResolution.successRate - 5);
        }

      } catch (recoveryError) {
        this.logger.error(`Auto-recovery error for ${error.id}:`, recoveryError);
      }
    }
  }

  /**
   * Execute recovery action
   */
  private async executeRecoveryAction(action: string, error: SystemError): Promise<boolean> {
    try {
      switch (action) {
        case 'restart_trading_component':
          // Emit event for trading system restart
          this.emit('restartComponent', SystemComponent.TRADING_ENGINE);
          return true;

        case 'restart_ai_service':
          // Emit event for AI service restart
          this.emit('restartComponent', SystemComponent.AI_SYSTEM);
          return true;

        case 'reconnect_network_services':
          // Emit event for network reconnection
          this.emit('reconnectNetwork');
          return true;

        case 'restart_database_connection':
          // Emit event for database reconnection
          this.emit('restartComponent', SystemComponent.DATABASE);
          return true;

        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if error meets escalation criteria
   */
  private async checkEscalationCriteria(error: SystemError): Promise<void> {
    const threshold = this.escalationThresholds[error.severity];
    if (!threshold) return;

    const recentSimilarErrors = Array.from(this.errors.values())
      .filter(e => 
        e.component === error.component &&
        e.severity === error.severity &&
        Date.now() - e.timestamp.getTime() < 3600000 // Last hour
      );

    if (recentSimilarErrors.length >= threshold) {
      await this.escalateError(error, recentSimilarErrors);
    }
  }

  /**
   * Escalate error to appropriate channels
   */
  private async escalateError(error: SystemError, relatedErrors: SystemError[]): Promise<void> {
    error.resolution = {
      status: 'escalated',
      resolvedAt: new Date(),
      resolvedBy: 'system',
      resolution: 'Escalated due to frequency threshold'
    };

    this.healthMetrics.escalatedErrors++;

    this.logger.error(`Escalating error: ${error.id}`, {
      severity: error.severity,
      component: error.component,
      relatedErrorsCount: relatedErrors.length
    });

    // Send appropriate notification based on severity
    switch (error.severity) {
      case SystemErrorSeverity.FATAL:
      case SystemErrorSeverity.CRITICAL:
        await this.notificationService.sendCriticalAlert({
          title: `${error.severity} System Error`,
          message: error.message,
          details: {
            component: error.component,
            errorId: error.id,
            relatedErrors: relatedErrors.length,
            systemHealth: this.healthMetrics.overallHealth
          }
        });
        break;

      case SystemErrorSeverity.ERROR:
        await this.notificationService.sendHighPriorityAlert({
          title: 'System Error Escalation',
          message: `Multiple ${error.severity} errors in ${error.component}`,
          details: { errorCount: relatedErrors.length, errorId: error.id }
        });
        break;

      default:
        await this.notificationService.sendAlert({
          title: 'Error Pattern Alert',
          message: `Frequent ${error.severity} errors detected`,
          details: { component: error.component, count: relatedErrors.length }
        });
    }

    this.emit('errorEscalated', error, relatedErrors);
  }

  /**
   * Handle cascading failure scenario
   */
  private async handleCascadingFailure(failedServices: any[]): Promise<void> {
    const cascadingError = this.createSystemError(SystemComponent.NETWORK_INFRASTRUCTURE, {
      type: 'CASCADING_FAILURE',
      severity: 'CRITICAL',
      message: 'Multiple system components failing simultaneously',
      details: { failedServices }
    });

    this.logger.error('Cascading failure detected', {
      failedServices: failedServices.length,
      services: failedServices.map(s => s.name)
    });

    // Immediate critical alert
    await this.notificationService.sendCriticalAlert({
      title: 'CASCADING FAILURE DETECTED',
      message: `${failedServices.length} services are failing simultaneously`,
      details: { 
        services: failedServices,
        systemHealth: this.healthMetrics.overallHealth,
        recommendedAction: 'Immediate manual intervention required'
      }
    });

    // Trigger emergency protocols
    this.emit('cascadingFailure', cascadingError, failedServices);
  }

  /**
   * Start system monitoring
   */
  private startMonitoring(): void {
    // Health metrics update
    this.monitoringInterval = setInterval(() => {
      this.updateSystemHealth();
    }, 30000); // Every 30 seconds

    // Pattern analysis
    this.patternAnalysisInterval = setInterval(() => {
      this.analyzeErrorPatterns();
    }, 300000); // Every 5 minutes

    this.logger.info('System error monitoring started');
  }

  /**
   * Update system health metrics
   */
  private updateSystemHealth(): void {
    // Gradually recover component health if no recent errors
    const now = Date.now();
    const recoveryWindow = 300000; // 5 minutes

    Object.keys(this.healthMetrics.componentHealth).forEach(component => {
      const comp = component as SystemComponent;
      const recentErrors = Array.from(this.errors.values())
        .filter(e => e.component === comp && now - e.timestamp.getTime() < recoveryWindow);

      if (recentErrors.length === 0) {
        // Gradually recover health
        this.healthMetrics.componentHealth[comp] = Math.min(100, this.healthMetrics.componentHealth[comp] + 2);
      }
    });

    // Update overall health
    const componentHealthValues = Object.values(this.healthMetrics.componentHealth);
    this.healthMetrics.overallHealth = componentHealthValues.reduce((sum, health) => sum + health, 0) / componentHealthValues.length;
  }

  /**
   * Analyze error patterns for optimization
   */
  private analyzeErrorPatterns(): void {
    // Clean up old patterns
    const now = Date.now();
    const patternExpiry = 86400000; // 24 hours

    for (const [key, pattern] of this.errorPatterns) {
      if (now - pattern.lastOccurrence.getTime() > patternExpiry) {
        this.errorPatterns.delete(key);
      }
    }

    // Log pattern analysis
    this.logger.debug('Error pattern analysis completed', {
      activePatterns: this.errorPatterns.size,
      autoResolutionEnabled: Array.from(this.errorPatterns.values())
        .filter(p => p.autoResolution?.enabled).length
    });
  }

  /**
   * Prune old errors to maintain memory limits
   */
  private pruneOldErrors(): void {
    if (this.errors.size > this.maxStoredErrors) {
      const sortedErrors = Array.from(this.errors.entries())
        .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());

      const toRemove = sortedErrors.slice(0, this.errors.size - this.maxStoredErrors);
      toRemove.forEach(([id]) => this.errors.delete(id));
    }
  }

  /**
   * Log system error
   */
  private logSystemError(error: SystemError): void {
    const logMethod = this.getLogMethod(error.severity);
    
    logMethod.call(this.logger, `System error: ${error.type}`, {
      errorId: error.id,
      component: error.component,
      severity: error.severity,
      message: error.message,
      context: error.context
    });
  }

  /**
   * Get appropriate log method for severity
   */
  private getLogMethod(severity: SystemErrorSeverity): Function {
    switch (severity) {
      case SystemErrorSeverity.FATAL:
      case SystemErrorSeverity.CRITICAL:
        return this.logger.error;
      case SystemErrorSeverity.ERROR:
        return this.logger.error;
      case SystemErrorSeverity.WARNING:
        return this.logger.warn;
      default:
        return this.logger.info;
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `sys_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get system error dashboard data
   */
  getErrorDashboard(): any {
    const recentErrors = Array.from(this.errors.values())
      .filter(e => Date.now() - e.timestamp.getTime() < 86400000) // Last 24 hours
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const errorsBySeverity = recentErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByComponent = recentErrors.reduce((acc, error) => {
      acc[error.component] = (acc[error.component] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      healthMetrics: this.healthMetrics,
      recentErrors: recentErrors.slice(0, 50),
      errorsBySeverity,
      errorsByComponent,
      activePatterns: Array.from(this.errorPatterns.values()),
      componentStatus: Object.fromEntries(this.componentStatus),
      systemUptime: Date.now() - this.healthMetrics.uptime
    };
  }

  /**
   * Shutdown system error manager
   */
  shutdown(): void {
    this.logger.info('Shutting down system error manager...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    if (this.patternAnalysisInterval) {
      clearInterval(this.patternAnalysisInterval);
    }

    // Shutdown component handlers
    this.aiErrorHandler.shutdown();
    this.networkErrorHandler.shutdown();

    this.logger.info('System error manager shutdown completed');
  }
}