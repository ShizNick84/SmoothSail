/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - DEPENDENCY MANAGER
 * =============================================================================
 * 
 * This module provides comprehensive dependency management for system components.
 * It handles dependency resolution, injection, and lifecycle coordination to
 * ensure proper component initialization order and runtime dependencies.
 * 
 * CRITICAL SYSTEM NOTICE:
 * Proper dependency management is essential for system stability. Components
 * must be initialized in the correct order to prevent runtime errors and
 * ensure financial system safety.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { logger } from '@/core/logging/logger';
import { auditService } from '@/security/audit-service';

/**
 * Dependency injection token
 */
export type DependencyToken = string | symbol;

/**
 * Dependency factory function
 */
export type DependencyFactory<T = any> = () => T | Promise<T>;

/**
 * Dependency configuration
 */
export interface DependencyConfig<T = any> {
  /** Dependency token */
  token: DependencyToken;
  /** Factory function */
  factory: DependencyFactory<T>;
  /** Singleton instance */
  singleton: boolean;
  /** Dependencies required by this dependency */
  dependencies: DependencyToken[];
  /** Initialization priority (lower = higher priority) */
  priority: number;
  /** Optional tags for categorization */
  tags: string[];
}

/**
 * Dependency metadata
 */
export interface DependencyMetadata {
  /** When dependency was registered */
  registeredAt: Date;
  /** When dependency was first resolved */
  resolvedAt?: Date;
  /** Number of times resolved */
  resolutionCount: number;
  /** Whether dependency is singleton */
  singleton: boolean;
  /** Current instance (for singletons) */
  instance?: any;
  /** Dependency status */
  status: DependencyStatus;
}

/**
 * Dependency status enumeration
 */
export enum DependencyStatus {
  REGISTERED = 'REGISTERED',
  RESOLVING = 'RESOLVING',
  RESOLVED = 'RESOLVED',
  ERROR = 'ERROR'
}

/**
 * Dependency resolution context
 */
export interface ResolutionContext {
  /** Current resolution path */
  path: DependencyToken[];
  /** Resolution depth */
  depth: number;
  /** Start time */
  startTime: Date;
  /** Parent context */
  parent?: ResolutionContext;
}

/**
 * Dependency manager class
 */
export class DependencyManager {
  private dependencies: Map<DependencyToken, DependencyConfig> = new Map();
  private metadata: Map<DependencyToken, DependencyMetadata> = new Map();
  private resolutionCache: Map<DependencyToken, any> = new Map();
  private isShuttingDown: boolean = false;

  /**
   * Register a dependency
   * 
   * @param config Dependency configuration
   */
  public register<T>(config: DependencyConfig<T>): void {
    logger.info(`📋 Registering dependency: ${String(config.token)}`);

    // Validate configuration
    this.validateDependencyConfig(config);

    // Check for circular dependencies
    this.checkCircularDependencies(config);

    // Register dependency
    this.dependencies.set(config.token, config);
    this.metadata.set(config.token, {
      registeredAt: new Date(),
      resolutionCount: 0,
      singleton: config.singleton,
      status: DependencyStatus.REGISTERED
    });

    logger.info(`✅ Dependency registered: ${String(config.token)}`);
  }

  /**
   * Resolve a dependency
   * 
   * @param token Dependency token
   * @param context Resolution context
   * @returns Resolved dependency instance
   */
  public async resolve<T>(token: DependencyToken, context?: ResolutionContext): T {
    if (this.isShuttingDown) {
      throw new Error('Cannot resolve dependencies during shutdown');
    }

    const resolveContext: ResolutionContext = context || {
      path: [],
      depth: 0,
      startTime: new Date(),
      parent: undefined
    };

    // Check for circular dependencies in resolution path
    if (resolveContext.path.includes(token)) {
      const circularPath = [...resolveContext.path, token].map(String).join(' → ');
      throw new Error(`Circular dependency detected: ${circularPath}`);
    }

    // Get dependency configuration
    const config = this.dependencies.get(token);
    if (!config) {
      throw new Error(`Dependency not registered: ${String(token)}`);
    }

    const metadata = this.metadata.get(token)!;

    try {
      // Update resolution context
      const newContext: ResolutionContext = {
        path: [...resolveContext.path, token],
        depth: resolveContext.depth + 1,
        startTime: resolveContext.startTime,
        parent: resolveContext
      };

      // Check if singleton and already resolved
      if (config.singleton && metadata.instance) {
        metadata.resolutionCount++;
        return metadata.instance;
      }

      // Update status
      metadata.status = DependencyStatus.RESOLVING;

      logger.debug(`🔍 Resolving dependency: ${String(token)} (depth: ${newContext.depth})`);

      // Resolve dependencies first
      const resolvedDependencies = await this.resolveDependencies(config.dependencies, newContext);

      // Create instance
      const instance = await this.createInstance(config, resolvedDependencies);

      // Cache singleton instance
      if (config.singleton) {
        metadata.instance = instance;
        this.resolutionCache.set(token, instance);
      }

      // Update metadata
      metadata.status = DependencyStatus.RESOLVED;
      metadata.resolutionCount++;
      if (!metadata.resolvedAt) {
        metadata.resolvedAt = new Date();
      }

      logger.debug(`✅ Dependency resolved: ${String(token)}`);

      return instance;

    } catch (error) {
      metadata.status = DependencyStatus.ERROR;
      logger.error(`❌ Failed to resolve dependency ${String(token)}:`, error);
      throw error;
    }
  }

  /**
   * Check if dependency is registered
   * 
   * @param token Dependency token
   * @returns True if registered
   */
  public isRegistered(token: DependencyToken): boolean {
    return this.dependencies.has(token);
  }

  /**
   * Get dependency metadata
   * 
   * @param token Dependency token
   * @returns Dependency metadata or undefined
   */
  public getMetadata(token: DependencyToken): DependencyMetadata | undefined {
    return this.metadata.get(token);
  }

  /**
   * Get all registered dependencies
   * 
   * @returns Array of dependency tokens
   */
  public getRegisteredDependencies(): DependencyToken[] {
    return Array.from(this.dependencies.keys());
  }

  /**
   * Get dependencies by tag
   * 
   * @param tag Tag to filter by
   * @returns Array of dependency tokens
   */
  public getDependenciesByTag(tag: string): DependencyToken[] {
    const result: DependencyToken[] = [];
    
    for (const [token, config] of this.dependencies) {
      if (config.tags.includes(tag)) {
        result.push(token);
      }
    }

    return result;
  }

  /**
   * Clear all dependencies (for testing)
   */
  public clear(): void {
    logger.info('🧹 Clearing all dependencies...');
    
    this.dependencies.clear();
    this.metadata.clear();
    this.resolutionCache.clear();
    
    logger.info('✅ All dependencies cleared');
  }

  /**
   * Shutdown dependency manager
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down dependency manager...');
    
    this.isShuttingDown = true;

    // Shutdown singleton instances that have shutdown methods
    for (const [token, instance] of this.resolutionCache) {
      if (instance && typeof instance.shutdown === 'function') {
        try {
          logger.info(`🛑 Shutting down dependency: ${String(token)}`);
          await instance.shutdown();
        } catch (error) {
          logger.error(`❌ Failed to shutdown dependency ${String(token)}:`, error);
        }
      }
    }

    // Clear caches
    this.resolutionCache.clear();

    logger.info('✅ Dependency manager shutdown completed');
  }

  /**
   * Get dependency resolution statistics
   * 
   * @returns Resolution statistics
   */
  public getStatistics(): {
    totalDependencies: number;
    resolvedDependencies: number;
    singletonDependencies: number;
    totalResolutions: number;
    averageResolutionTime: number;
  } {
    const totalDependencies = this.dependencies.size;
    let resolvedDependencies = 0;
    let singletonDependencies = 0;
    let totalResolutions = 0;

    for (const metadata of this.metadata.values()) {
      if (metadata.status === DependencyStatus.RESOLVED) {
        resolvedDependencies++;
      }
      if (metadata.singleton) {
        singletonDependencies++;
      }
      totalResolutions += metadata.resolutionCount;
    }

    return {
      totalDependencies,
      resolvedDependencies,
      singletonDependencies,
      totalResolutions,
      averageResolutionTime: 0 // Would need to track timing
    };
  }

  /**
   * Validate dependency configuration
   * 
   * @param config Dependency configuration
   */
  private validateDependencyConfig<T>(config: DependencyConfig<T>): void {
    if (!config.token) {
      throw new Error('Dependency token is required');
    }

    if (this.dependencies.has(config.token)) {
      throw new Error(`Dependency already registered: ${String(config.token)}`);
    }

    if (typeof config.factory !== 'function') {
      throw new Error(`Dependency factory must be a function: ${String(config.token)}`);
    }

    if (typeof config.singleton !== 'boolean') {
      throw new Error(`Dependency singleton must be a boolean: ${String(config.token)}`);
    }

    if (!Array.isArray(config.dependencies)) {
      throw new Error(`Dependency dependencies must be an array: ${String(config.token)}`);
    }

    if (typeof config.priority !== 'number') {
      throw new Error(`Dependency priority must be a number: ${String(config.token)}`);
    }

    if (!Array.isArray(config.tags)) {
      throw new Error(`Dependency tags must be an array: ${String(config.token)}`);
    }
  }

  /**
   * Check for circular dependencies
   * 
   * @param config Dependency configuration
   */
  private checkCircularDependencies<T>(config: DependencyConfig<T>): void {
    const visited = new Set<DependencyToken>();
    const visiting = new Set<DependencyToken>();

    const visit = (token: DependencyToken): void => {
      if (visiting.has(token)) {
        throw new Error(`Circular dependency detected involving: ${String(token)}`);
      }

      if (visited.has(token)) {
        return;
      }

      visiting.add(token);

      const depConfig = this.dependencies.get(token);
      if (depConfig) {
        for (const dependency of depConfig.dependencies) {
          visit(dependency);
        }
      }

      visiting.delete(token);
      visited.add(token);
    };

    // Check the new dependency
    for (const dependency of config.dependencies) {
      visit(dependency);
    }

    // Check if adding this dependency creates a cycle
    visit(config.token);
  }

  /**
   * Resolve multiple dependencies
   * 
   * @param tokens Dependency tokens
   * @param context Resolution context
   * @returns Array of resolved dependencies
   */
  private async resolveDependencies(
    tokens: DependencyToken[],
    context: ResolutionContext
  ): Promise<any[]> {
    const resolved: any[] = [];

    for (const token of tokens) {
      const dependency = await this.resolve(token, context);
      resolved.push(dependency);
    }

    return resolved;
  }

  /**
   * Create instance from factory
   * 
   * @param config Dependency configuration
   * @param dependencies Resolved dependencies
   * @returns Created instance
   */
  private async createInstance<T>(
    config: DependencyConfig<T>,
    dependencies: any[]
  ): Promise<T> {
    try {
      // Call factory function with dependencies
      const instance = await config.factory.apply(null, dependencies);
      
      // Validate instance
      if (instance === undefined || instance === null) {
        throw new Error(`Factory returned null/undefined for: ${String(config.token)}`);
      }

      return instance;

    } catch (error) {
      throw new Error(`Failed to create instance for ${String(config.token)}: ${error}`);
    }
  }
}

/**
 * Dependency tokens for system components
 */
export const DependencyTokens = {
  // Core services
  LOGGER: Symbol('LOGGER'),
  AUDIT_SERVICE: Symbol('AUDIT_SERVICE'),
  CONFIG_SERVICE: Symbol('CONFIG_SERVICE'),
  
  // Security services
  SECURITY_MANAGER: Symbol('SECURITY_MANAGER'),
  ENCRYPTION_SERVICE: Symbol('ENCRYPTION_SERVICE'),
  THREAT_DETECTION: Symbol('THREAT_DETECTION'),
  
  // Infrastructure services
  SYSTEM_MONITOR: Symbol('SYSTEM_MONITOR'),
  TUNNEL_MANAGER: Symbol('TUNNEL_MANAGER'),
  DATABASE_SERVICE: Symbol('DATABASE_SERVICE'),
  
  // Trading services
  TRADING_ENGINE: Symbol('TRADING_ENGINE'),
  RISK_MANAGER: Symbol('RISK_MANAGER'),
  STRATEGY_ENGINE: Symbol('STRATEGY_ENGINE'),
  ORDER_MANAGER: Symbol('ORDER_MANAGER'),
  
  // AI services
  LLM_ENGINE: Symbol('LLM_ENGINE'),
  SENTIMENT_ANALYZER: Symbol('SENTIMENT_ANALYZER'),
  MARKET_ANALYZER: Symbol('MARKET_ANALYZER'),
  
  // Communication services
  NOTIFICATION_MANAGER: Symbol('NOTIFICATION_MANAGER'),
  EMAIL_SERVICE: Symbol('EMAIL_SERVICE'),
  TELEGRAM_SERVICE: Symbol('TELEGRAM_SERVICE'),
  
  // API services
  GATE_IO_CLIENT: Symbol('GATE_IO_CLIENT'),
  TUNNEL_ROUTER: Symbol('TUNNEL_ROUTER')
} as const;

/**
 * Global dependency manager instance
 */
export const dependencyManager = new DependencyManager();

/**
 * Decorator for dependency injection
 * 
 * @param token Dependency token
 * @returns Property decorator
 */
export function Inject(token: DependencyToken) {
  return function (target: any, propertyKey: string | symbol) {
    // Store dependency metadata for later injection
    if (!target._dependencies) {
      target._dependencies = [];
    }
    target._dependencies.push({ token, propertyKey });
  };
}

/**
 * Helper function to register a singleton dependency
 * 
 * @param token Dependency token
 * @param factory Factory function
 * @param dependencies Dependencies
 * @param tags Tags
 * @param priority Priority
 */
export function registerSingleton<T>(
  token: DependencyToken,
  factory: DependencyFactory<T>,
  dependencies: DependencyToken[] = [],
  tags: string[] = [],
  priority: number = 100
): void {
  dependencyManager.register({
    token,
    factory,
    singleton: true,
    dependencies,
    priority,
    tags
  });
}

/**
 * Helper function to register a transient dependency
 * 
 * @param token Dependency token
 * @param factory Factory function
 * @param dependencies Dependencies
 * @param tags Tags
 * @param priority Priority
 */
export function registerTransient<T>(
  token: DependencyToken,
  factory: DependencyFactory<T>,
  dependencies: DependencyToken[] = [],
  tags: string[] = [],
  priority: number = 100
): void {
  dependencyManager.register({
    token,
    factory,
    singleton: false,
    dependencies,
    priority,
    tags
  });
}

// =============================================================================
// DEPENDENCY MANAGEMENT NOTES
// =============================================================================
// 1. Comprehensive dependency injection with circular dependency detection
// 2. Singleton and transient dependency lifecycle management
// 3. Dependency resolution with proper error handling and logging
// 4. Metadata tracking for monitoring and debugging
// 5. Tag-based dependency categorization and filtering
// 6. Graceful shutdown with proper cleanup of singleton instances
// 7. Resolution context tracking for debugging complex dependency chains
// 8. Factory-based dependency creation with parameter injection
// =============================================================================
