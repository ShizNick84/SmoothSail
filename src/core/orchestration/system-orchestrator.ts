/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - SYSTEM ORCHESTRATOR
 * =============================================================================
 * 
 * This module provides comprehensive system orchestration for the AI crypto
 * trading agent. It manages component lifecycle, dependency resolution,
 * startup/shutdown sequencing, and inter-component communication.
 * 
 * CRITICAL SYSTEM NOTICE:
 * This orchestrator manages the entire trading system lifecycle. Proper
 * initialization order and dependency management are essential for system
 * stability and financial safety.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { auditService } from '@/security/audit-service';
import { gracefulShutdown, ShutdownableComponent } from '@/core/shutdown/graceful-shutdown';

/**
 * System component interface with lifecycle management
 */
export interface SystemComponent extends ShutdownableComponent {
  /** Component identifier */
  id: string;
  /** Component dependencies */
  dependencies: string[];
  /** Component priority (lower = higher priority) */
  priority: number;
  /** Component status */
  status: ComponentStatus;
  /** Initialize component */
  initialize(): Promise<void>;
  /** Health check */
  healthCheck(): Promise<ComponentHealth>;
  /** Get component metrics */
  getMetrics?(): ComponentMetrics;
}

/**
 * Component status enumeration
 */
export enum ComponentStatus {
  UNINITIALIZED = 'UNINITIALIZED',
  INITIALIZING = 'INITIALIZING',
  RUNNING = 'RUNNING',
  STOPPING = 'STOPPING',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR',
  MAINTENANCE = 'MAINTENANCE'
}

/**
 * Component health interface
 */
export interface ComponentHealth {
  /** Overall health status */
  healthy: boolean;
  /** Health score (0-100) */
  score: number;
  /** Health details */
  details: Record<string, any>;
  /** Last health check timestamp */
  lastCheck: Date;
  /** Issues found */
  issues: string[];
  /** Recommendations */
  recommendations: string[];
}

/**
 * Component metrics interface
 */
export interface ComponentMetrics {
  /** CPU usage percentage */
  cpuUsage: number;
  /** Memory usage in MB */
  memoryUsage: number;
  /** Uptime in milliseconds */
  uptime: number;
  /** Request count */
  requestCount: number;
  /** Error count */
  errorCount: number;
  /** Custom metrics */
  custom: Record<string, number>;
}

/**
 * System orchestration configuration
 */
export interface OrchestrationConfig {
  /** Startup timeout per component (ms) */
  startupTimeout: number;
  /** Health check interval (ms) */
  healthCheckInterval: number;
  /** Dependency resolution timeout (ms) */
  dependencyTimeout: number;
  /** Maximum startup retries */
  maxStartupRetries: number;
  /** Enable automatic recovery */
  autoRecovery: boolean;
  /** Recovery cooldown period (ms) */
  recoveryCooldown: number;
}

/**
 * System orchestration events
 */
export interface OrchestrationEvents {
  'component:initialized': (component: SystemComponent) => void;
  'component:started': (component: SystemComponent) => void;
  'component:stopped': (component: SystemComponent) => void;
  'component:error': (component: SystemComponent, error: Error) => void;
  'component:health-changed': (component: SystemComponent, health: ComponentHealth) => void;
  'system:ready': () => void;
  'system:shutdown': () => void;
  'system:error': (error: Error) => void;
}

/**
 * System orchestrator class
 */
export class SystemOrchestrator extends EventEmitter {
  private components: Map<string, SystemComponent> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private isShuttingDown: boolean = false;
  private startupRetries: Map<string, number> = new Map();
  private lastRecoveryAttempt: Map<string, number> = new Map();

  constructor(private config: OrchestrationConfig) {
    super();
    this.setupEventHandlers();
  }

  /**
   * Register a system component
   * 
   * @param component System component to register
   */
  public registerComponent(component: SystemComponent): void {
    logger.info(`📋 Registering component: ${component.id}`);
    
    // Validate component
    this.validateComponent(component);
    
    // Register component
    this.components.set(component.id, component);
    
    // Build dependency graph
    this.buildDependencyGraph(component);
    
    // Initialize retry counter
    this.startupRetries.set(component.id, 0);
    
    logger.info(`✅ Component registered: ${component.id}`);
  }

  /**
   * Start all system components in dependency order
   * 
   * @returns Promise<void>
   */
  public async startSystem(): Promise<void> {
    try {
      logger.info('🚀 Starting system orchestration...');
      
      // Create audit entry
      await auditService.createAuditEntry({
        auditId: `system_start_${Date.now()}`,
        eventType: 'SYSTEM_STARTUP_INITIATED',
        actor: 'SYSTEM_ORCHESTRATOR',
        resource: 'SYSTEM',
        action: 'START_SYSTEM',
        result: 'SUCCESS',
        timestamp: new Date(),
        auditData: { componentCount: this.components.size }
      });

      // Resolve startup order
      const startupOrder = this.resolveStartupOrder();
      logger.info(`📋 Startup order resolved: ${startupOrder.join(' → ')}`);

      // Start components in order
      for (const componentId of startupOrder) {
        await this.startComponent(componentId);
      }

      // Start health monitoring
      this.startHealthMonitoring();

      // System is ready
      this.emit('system:ready');
      logger.info('✅ System orchestration completed - all components running');

    } catch (error) {
      logger.error('❌ System startup failed:', error);
      this.emit('system:error', error as Error);
      throw error;
    }
  }

  /**
   * Stop all system components gracefully
   * 
   * @returns Promise<void>
   */
  public async stopSystem(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('⚠️ System shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    logger.info('🛑 Initiating system shutdown...');

    try {
      // Stop health monitoring
      this.stopHealthMonitoring();

      // Create shutdown context
      const shutdownContext: Record<string, ShutdownableComponent> = {};
      for (const [id, component] of this.components) {
        shutdownContext[id] = component;
      }

      // Perform graceful shutdown
      const shutdownResult = await gracefulShutdown(shutdownContext, {
        timeout: 60000, // 60 seconds
        closePositions: true,
        backupData: true,
        sendNotifications: true,
        emergencyOnTimeout: true
      });

      // Update component statuses
      for (const componentId of shutdownResult.successfulComponents) {
        const component = this.components.get(componentId);
        if (component) {
          component.status = ComponentStatus.STOPPED;
        }
      }

      // Emit shutdown event
      this.emit('system:shutdown');
      
      if (shutdownResult.success) {
        logger.info('✅ System shutdown completed successfully');
      } else {
        logger.error('❌ System shutdown completed with errors:', shutdownResult.errors);
      }

    } catch (error) {
      logger.error('❌ System shutdown failed:', error);
      this.emit('system:error', error as Error);
      throw error;
    }
  }

  /**
   * Get system status
   * 
   * @returns System status information
   */
  public getSystemStatus(): {
    totalComponents: number;
    runningComponents: number;
    errorComponents: number;
    systemHealth: number;
    uptime: number;
  } {
    const totalComponents = this.components.size;
    let runningComponents = 0;
    let errorComponents = 0;
    let totalHealthScore = 0;

    for (const component of this.components.values()) {
      if (component.status === ComponentStatus.RUNNING) {
        runningComponents++;
      } else if (component.status === ComponentStatus.ERROR) {
        errorComponents++;
      }
    }

    const systemHealth = totalComponents > 0 ? totalHealthScore / totalComponents : 0;
    const uptime = process.uptime() * 1000;

    return {
      totalComponents,
      runningComponents,
      errorComponents,
      systemHealth,
      uptime
    };
  }

  /**
   * Get component status
   * 
   * @param componentId Component identifier
   * @returns Component status or undefined if not found
   */
  public getComponentStatus(componentId: string): SystemComponent | undefined {
    return this.components.get(componentId);
  }

  /**
   * Restart a specific component
   * 
   * @param componentId Component identifier
   * @returns Promise<void>
   */
  public async restartComponent(componentId: string): Promise<void> {
    const component = this.components.get(componentId);
    if (!component) {
      throw new Error(`Component not found: ${componentId}`);
    }

    logger.info(`🔄 Restarting component: ${componentId}`);

    try {
      // Stop component
      component.status = ComponentStatus.STOPPING;
      await component.shutdown();
      component.status = ComponentStatus.STOPPED;

      // Start component
      await this.startComponent(componentId);

      logger.info(`✅ Component restarted successfully: ${componentId}`);

    } catch (error) {
      logger.error(`❌ Failed to restart component ${componentId}:`, error);
      component.status = ComponentStatus.ERROR;
      this.emit('component:error', component, error as Error);
      throw error;
    }
  }

  /**
   * Validate component configuration
   * 
   * @param component Component to validate
   */
  private validateComponent(component: SystemComponent): void {
    if (!component.id) {
      throw new Error('Component must have an ID');
    }

    if (this.components.has(component.id)) {
      throw new Error(`Component already registered: ${component.id}`);
    }

    if (!Array.isArray(component.dependencies)) {
      throw new Error(`Component dependencies must be an array: ${component.id}`);
    }

    if (typeof component.priority !== 'number') {
      throw new Error(`Component priority must be a number: ${component.id}`);
    }
  }

  /**
   * Build dependency graph for component
   * 
   * @param component Component to build graph for
   */
  private buildDependencyGraph(component: SystemComponent): void {
    if (!this.dependencyGraph.has(component.id)) {
      this.dependencyGraph.set(component.id, new Set());
    }

    for (const dependency of component.dependencies) {
      this.dependencyGraph.get(component.id)!.add(dependency);
    }
  }

  /**
   * Resolve startup order based on dependencies and priorities
   * 
   * @returns Array of component IDs in startup order
   */
  private resolveStartupOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (componentId: string): void => {
      if (visiting.has(componentId)) {
        throw new Error(`Circular dependency detected: ${componentId}`);
      }

      if (visited.has(componentId)) {
        return;
      }

      visiting.add(componentId);

      const dependencies = this.dependencyGraph.get(componentId) || new Set();
      for (const dependency of dependencies) {
        if (!this.components.has(dependency)) {
          throw new Error(`Missing dependency: ${dependency} for component: ${componentId}`);
        }
        visit(dependency);
      }

      visiting.delete(componentId);
      visited.add(componentId);
      order.push(componentId);
    };

    // Sort components by priority first
    const sortedComponents = Array.from(this.components.values())
      .sort((a, b) => a.priority - b.priority);

    for (const component of sortedComponents) {
      visit(component.id);
    }

    return order;
  }

  /**
   * Start a specific component
   * 
   * @param componentId Component identifier
   * @returns Promise<void>
   */
  private async startComponent(componentId: string): Promise<void> {
    const component = this.components.get(componentId);
    if (!component) {
      throw new Error(`Component not found: ${componentId}`);
    }

    const retryCount = this.startupRetries.get(componentId) || 0;
    
    try {
      logger.info(`🚀 Starting component: ${componentId} (attempt ${retryCount + 1})`);
      
      component.status = ComponentStatus.INITIALIZING;
      this.emit('component:initialized', component);

      // Wait for dependencies
      await this.waitForDependencies(component);

      // Initialize component with timeout
      const initPromise = component.initialize();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Component initialization timeout: ${componentId}`));
        }, this.config.startupTimeout);
      });

      await Promise.race([initPromise, timeoutPromise]);

      // Update status
      component.status = ComponentStatus.RUNNING;
      this.emit('component:started', component);

      // Reset retry counter
      this.startupRetries.set(componentId, 0);

      logger.info(`✅ Component started successfully: ${componentId}`);

    } catch (error) {
      logger.error(`❌ Failed to start component ${componentId}:`, error);
      
      component.status = ComponentStatus.ERROR;
      this.emit('component:error', component, error as Error);

      // Handle retries
      if (retryCount < this.config.maxStartupRetries) {
        this.startupRetries.set(componentId, retryCount + 1);
        logger.info(`🔄 Retrying component startup: ${componentId} (${retryCount + 1}/${this.config.maxStartupRetries})`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
        
        return this.startComponent(componentId);
      } else {
        throw new Error(`Component startup failed after ${this.config.maxStartupRetries} retries: ${componentId}`);
      }
    }
  }

  /**
   * Wait for component dependencies to be ready
   * 
   * @param component Component to wait for dependencies
   * @returns Promise<void>
   */
  private async waitForDependencies(component: SystemComponent): Promise<void> {
    const dependencies = component.dependencies;
    if (dependencies.length === 0) {
      return;
    }

    logger.info(`⏳ Waiting for dependencies: ${dependencies.join(', ')}`);

    const startTime = Date.now();
    const timeout = this.config.dependencyTimeout;

    while (Date.now() - startTime < timeout) {
      let allReady = true;

      for (const dependencyId of dependencies) {
        const dependency = this.components.get(dependencyId);
        if (!dependency || dependency.status !== ComponentStatus.RUNNING) {
          allReady = false;
          break;
        }
      }

      if (allReady) {
        logger.info(`✅ All dependencies ready for: ${component.id}`);
        return;
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Dependency timeout for component: ${component.id}`);
  }

  /**
   * Start health monitoring for all components
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      return;
    }

    logger.info('🏥 Starting system health monitoring...');

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop health monitoring
   */
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      logger.info('🏥 Health monitoring stopped');
    }
  }

  /**
   * Perform health checks on all components
   */
  private async performHealthChecks(): Promise<void> {
    for (const component of this.components.values()) {
      if (component.status === ComponentStatus.RUNNING) {
        try {
          const health = await component.healthCheck();
          this.emit('component:health-changed', component, health);

          // Handle unhealthy components
          if (!health.healthy && this.config.autoRecovery) {
            await this.handleUnhealthyComponent(component, health);
          }

        } catch (error) {
          logger.error(`❌ Health check failed for ${component.id}:`, error);
          component.status = ComponentStatus.ERROR;
          this.emit('component:error', component, error as Error);
        }
      }
    }
  }

  /**
   * Handle unhealthy component with recovery attempts
   * 
   * @param component Unhealthy component
   * @param health Health status
   */
  private async handleUnhealthyComponent(
    component: SystemComponent,
    health: ComponentHealth
  ): Promise<void> {
    const lastRecovery = this.lastRecoveryAttempt.get(component.id) || 0;
    const now = Date.now();

    // Check cooldown period
    if (now - lastRecovery < this.config.recoveryCooldown) {
      return;
    }

    logger.warn(`⚠️ Component unhealthy, attempting recovery: ${component.id}`);
    logger.warn(`Health issues: ${health.issues.join(', ')}`);

    try {
      this.lastRecoveryAttempt.set(component.id, now);
      await this.restartComponent(component.id);
      logger.info(`✅ Component recovery successful: ${component.id}`);

    } catch (error) {
      logger.error(`❌ Component recovery failed: ${component.id}`, error);
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('component:error', (component, error) => {
      logger.error(`Component error: ${component.id}`, error);
    });

    this.on('component:health-changed', (component, health) => {
      if (!health.healthy) {
        logger.warn(`Component health degraded: ${component.id} (score: ${health.score})`);
      }
    });
  }
}

/**
 * Default orchestration configuration
 */
export const defaultOrchestrationConfig: OrchestrationConfig = {
  startupTimeout: 30000,        // 30 seconds
  healthCheckInterval: 30000,   // 30 seconds
  dependencyTimeout: 60000,     // 60 seconds
  maxStartupRetries: 3,
  autoRecovery: true,
  recoveryCooldown: 300000      // 5 minutes
};

// =============================================================================
// SYSTEM ORCHESTRATION NOTES
// =============================================================================
// 1. Dependency-aware component startup sequencing
// 2. Comprehensive health monitoring and auto-recovery
// 3. Graceful shutdown with proper cleanup procedures
// 4. Event-driven architecture for system coordination
// 5. Retry logic with exponential backoff for resilience
// 6. Audit logging for all orchestration activities
// 7. Timeout handling for startup and dependency resolution
// 8. Component lifecycle management with status tracking
// =============================================================================
