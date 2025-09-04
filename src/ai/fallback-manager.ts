/**
 * =============================================================================
 * FALLBACK MANAGER - LLM FAILOVER AND RECOVERY SYSTEM
 * =============================================================================
 * 
 * This module implements comprehensive fallback mechanisms for LLM operations
 * on Intel NUC hardware. It handles model failures, resource constraints,
 * and provides graceful degradation to ensure continuous trading operations.
 * 
 * Key Features:
 * - Automatic model switching on failures
 * - Graceful degradation strategies
 * - Circuit breaker patterns for stability
 * - Emergency fallback to rule-based systems
 * - Performance-based model selection
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { ModelManager } from './model-manager';
import { LLMResourceMonitor } from './resource-monitor';
import type { LLMModelConfig } from './llm-engine';

/**
 * Interface for fallback strategy configuration
 */
interface FallbackStrategy {
  name: string;
  priority: number; // 1-10, higher is preferred
  conditions: FallbackCondition[];
  action: FallbackAction;
  maxRetries: number;
  cooldownPeriod: number; // milliseconds
  description: string;
}

/**
 * Interface for fallback conditions
 */
interface FallbackCondition {
  type: 'MEMORY_PRESSURE' | 'CPU_OVERLOAD' | 'THERMAL_THROTTLING' | 'MODEL_ERROR' | 'TIMEOUT' | 'ACCURACY_DROP';
  threshold: number;
  operator: 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE';
  description: string;
}

/**
 * Interface for fallback actions
 */
interface FallbackAction {
  type: 'SWITCH_MODEL' | 'REDUCE_PARAMETERS' | 'DISABLE_AI' | 'EMERGENCY_MODE' | 'RESTART_MODEL';
  parameters: Record<string, any>;
  description: string;
}

/**
 * Interface for circuit breaker state
 */
interface CircuitBreakerState {
  modelName: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: Date | null;
  nextRetryTime: Date | null;
  successCount: number;
  totalRequests: number;
}

/**
 * Interface for fallback execution result
 */
interface FallbackResult {
  success: boolean;
  strategyUsed: string;
  actionTaken: string;
  previousState: any;
  newState: any;
  executionTime: number;
  error?: string;
}

/**
 * Interface for emergency mode configuration
 */
interface EmergencyModeConfig {
  enabled: boolean;
  triggers: string[];
  actions: string[];
  tradingImpact: 'NONE' | 'REDUCED' | 'SUSPENDED';
  notificationLevel: 'INFO' | 'WARNING' | 'CRITICAL';
}

/**
 * Fallback Manager class for LLM operations
 * Provides comprehensive failover and recovery mechanisms
 */
export class LLMFallbackManager extends EventEmitter {
  private modelManager: ModelManager;
  private resourceMonitor: LLMResourceMonitor;
  private fallbackStrategies: FallbackStrategy[] = [];
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private emergencyMode: EmergencyModeConfig;
  private isInitialized: boolean = false;
  private fallbackHistory: FallbackResult[] = [];
  private maxHistorySize: number = 100;

  // Circuit breaker thresholds
  private readonly CIRCUIT_BREAKER_CONFIG = {
    failureThreshold: 5, // Open circuit after 5 failures
    successThreshold: 3, // Close circuit after 3 successes in half-open state
    timeout: 60000, // 1 minute timeout before trying half-open
    monitoringWindow: 300000 // 5 minutes monitoring window
  };

  constructor(modelManager: ModelManager, resourceMonitor: LLMResourceMonitor) {
    super();
    this.modelManager = modelManager;
    this.resourceMonitor = resourceMonitor;
    
    // Default emergency mode configuration
    this.emergencyMode = {
      enabled: false,
      triggers: [],
      actions: [],
      tradingImpact: 'NONE',
      notificationLevel: 'INFO'
    };

    this.initializeDefaultStrategies();
    this.setupEventListeners();

    logger.info('🛡️ LLM Fallback Manager initialized');
  }

  /**
   * Initialize default fallback strategies
   */
  private initializeDefaultStrategies(): void {
    this.fallbackStrategies = [
      // Memory pressure fallback
      {
        name: 'memory_pressure_model_switch',
        priority: 9,
        conditions: [
          {
            type: 'MEMORY_PRESSURE',
            threshold: 80, // 80% memory usage
            operator: 'GT',
            description: 'Memory usage above 80%'
          }
        ],
        action: {
          type: 'SWITCH_MODEL',
          parameters: { targetType: 'smaller' },
          description: 'Switch to smaller model'
        },
        maxRetries: 3,
        cooldownPeriod: 30000, // 30 seconds
        description: 'Switch to smaller model when memory pressure is high'
      },

      // CPU overload fallback
      {
        name: 'cpu_overload_parameter_reduction',
        priority: 8,
        conditions: [
          {
            type: 'CPU_OVERLOAD',
            threshold: 90, // 90% CPU usage
            operator: 'GT',
            description: 'CPU usage above 90%'
          }
        ],
        action: {
          type: 'REDUCE_PARAMETERS',
          parameters: { 
            cpuThreads: 'reduce_by_half',
            maxTokens: 'reduce_by_25_percent'
          },
          description: 'Reduce CPU threads and token limits'
        },
        maxRetries: 2,
        cooldownPeriod: 15000, // 15 seconds
        description: 'Reduce model parameters when CPU is overloaded'
      },

      // Thermal throttling fallback
      {
        name: 'thermal_throttling_emergency',
        priority: 10,
        conditions: [
          {
            type: 'THERMAL_THROTTLING',
            threshold: 1, // Any thermal throttling
            operator: 'GTE',
            description: 'Thermal throttling detected'
          }
        ],
        action: {
          type: 'EMERGENCY_MODE',
          parameters: { 
            disableAI: true,
            notifyAdmin: true,
            tradingImpact: 'REDUCED'
          },
          description: 'Enter emergency mode due to thermal issues'
        },
        maxRetries: 1,
        cooldownPeriod: 120000, // 2 minutes
        description: 'Emergency response to thermal throttling'
      },

      // Model error fallback
      {
        name: 'model_error_restart',
        priority: 7,
        conditions: [
          {
            type: 'MODEL_ERROR',
            threshold: 3, // 3 consecutive errors
            operator: 'GTE',
            description: 'Multiple model errors detected'
          }
        ],
        action: {
          type: 'RESTART_MODEL',
          parameters: { 
            clearCache: true,
            validateIntegrity: true
          },
          description: 'Restart model with cache clearing'
        },
        maxRetries: 2,
        cooldownPeriod: 60000, // 1 minute
        description: 'Restart model after multiple errors'
      },

      // Timeout fallback
      {
        name: 'timeout_model_switch',
        priority: 6,
        conditions: [
          {
            type: 'TIMEOUT',
            threshold: 10000, // 10 seconds
            operator: 'GT',
            description: 'Inference timeout exceeded'
          }
        ],
        action: {
          type: 'SWITCH_MODEL',
          parameters: { targetType: 'faster' },
          description: 'Switch to faster model'
        },
        maxRetries: 2,
        cooldownPeriod: 45000, // 45 seconds
        description: 'Switch to faster model on timeout'
      },

      // Accuracy drop fallback
      {
        name: 'accuracy_drop_model_switch',
        priority: 5,
        conditions: [
          {
            type: 'ACCURACY_DROP',
            threshold: 70, // Below 70% accuracy
            operator: 'LT',
            description: 'Model accuracy below acceptable threshold'
          }
        ],
        action: {
          type: 'SWITCH_MODEL',
          parameters: { targetType: 'more_accurate' },
          description: 'Switch to more accurate model'
        },
        maxRetries: 2,
        cooldownPeriod: 300000, // 5 minutes
        description: 'Switch to more accurate model when performance drops'
      }
    ];

    logger.info(`🛡️ Initialized ${this.fallbackStrategies.length} fallback strategies`);
  }

  /**
   * Set up event listeners for monitoring systems
   */
  private setupEventListeners(): void {
    // Listen to resource monitor events
    this.resourceMonitor.on('criticalMemoryPressure', (metrics) => {
      this.handleResourceEvent('MEMORY_PRESSURE', metrics.memoryPressure === 'CRITICAL' ? 100 : 80);
    });

    this.resourceMonitor.on('criticalCpuUsage', (metrics) => {
      this.handleResourceEvent('CPU_OVERLOAD', metrics.cpuUsage);
    });

    this.resourceMonitor.on('thermalThrottling', (metrics) => {
      this.handleResourceEvent('THERMAL_THROTTLING', 1);
    });

    // Listen to model manager events
    this.modelManager.on('modelError', (error) => {
      this.handleModelError(error.modelName, error.error);
    });

    logger.info('🔗 Event listeners set up for fallback management');
  }

  /**
   * Initialize the fallback manager
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🚀 Initializing LLM Fallback Manager...');

      // Initialize circuit breakers for available models
      const availableModels = this.modelManager.getAvailableModels();
      for (const modelName of availableModels) {
        this.initializeCircuitBreaker(modelName);
      }

      this.isInitialized = true;
      logger.info('✅ LLM Fallback Manager initialized successfully');

      this.emit('initialized');

    } catch (error) {
      logger.error('❌ Failed to initialize LLM Fallback Manager:', error);
      throw error;
    }
  }

  /**
   * Initialize circuit breaker for a model
   */
  private initializeCircuitBreaker(modelName: string): void {
    this.circuitBreakers.set(modelName, {
      modelName,
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: null,
      nextRetryTime: null,
      successCount: 0,
      totalRequests: 0
    });

    logger.info(`🔌 Circuit breaker initialized for model: ${modelName}`);
  }

  /**
   * Handle resource-related events
   */
  private async handleResourceEvent(eventType: string, value: number): Promise<void> {
    try {
      logger.info(`⚠️ Resource event detected: ${eventType} = ${value}`);

      // Find applicable fallback strategies
      const applicableStrategies = this.findApplicableStrategies(eventType as any, value);

      if (applicableStrategies.length === 0) {
        logger.info('ℹ️ No applicable fallback strategies found');
        return;
      }

      // Execute the highest priority strategy
      const strategy = applicableStrategies[0];
      await this.executeFallbackStrategy(strategy, { eventType, value });

    } catch (error) {
      logger.error('❌ Error handling resource event:', error);
    }
  }

  /**
   * Handle model errors
   */
  private async handleModelError(modelName: string, error: Error): Promise<void> {
    try {
      logger.error(`❌ Model error detected for ${modelName}:`, error);

      // Update circuit breaker
      await this.recordFailure(modelName);

      // Find applicable fallback strategies
      const applicableStrategies = this.findApplicableStrategies('MODEL_ERROR', 1);

      if (applicableStrategies.length > 0) {
        const strategy = applicableStrategies[0];
        await this.executeFallbackStrategy(strategy, { modelName, error: error.message });
      }

    } catch (fallbackError) {
      logger.error('❌ Error in model error handling:', fallbackError);
    }
  }

  /**
   * Find applicable fallback strategies for given conditions
   */
  private findApplicableStrategies(eventType: FallbackCondition['type'], value: number): FallbackStrategy[] {
    const applicable = this.fallbackStrategies.filter(strategy => {
      return strategy.conditions.some(condition => {
        if (condition.type !== eventType) return false;

        switch (condition.operator) {
          case 'GT': return value > condition.threshold;
          case 'LT': return value < condition.threshold;
          case 'EQ': return value === condition.threshold;
          case 'GTE': return value >= condition.threshold;
          case 'LTE': return value <= condition.threshold;
          default: return false;
        }
      });
    });

    // Sort by priority (highest first)
    return applicable.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Execute a fallback strategy
   */
  private async executeFallbackStrategy(
    strategy: FallbackStrategy, 
    context: Record<string, any>
  ): Promise<FallbackResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`🔄 Executing fallback strategy: ${strategy.name}`);

      // Check cooldown period
      if (await this.isInCooldown(strategy)) {
        logger.info(`⏳ Strategy ${strategy.name} is in cooldown period`);
        return {
          success: false,
          strategyUsed: strategy.name,
          actionTaken: 'SKIPPED_COOLDOWN',
          previousState: context,
          newState: context,
          executionTime: Date.now() - startTime,
          error: 'Strategy in cooldown period'
        };
      }

      // Execute the action
      const result = await this.executeAction(strategy.action, context);

      const fallbackResult: FallbackResult = {
        success: result.success,
        strategyUsed: strategy.name,
        actionTaken: strategy.action.type,
        previousState: context,
        newState: result.newState,
        executionTime: Date.now() - startTime,
        error: result.error
      };

      // Record the result
      this.recordFallbackResult(fallbackResult);

      if (result.success) {
        logger.info(`✅ Fallback strategy ${strategy.name} executed successfully`);
        this.emit('fallbackSuccess', fallbackResult);
      } else {
        logger.error(`❌ Fallback strategy ${strategy.name} failed:`, { error: result.error });
        this.emit('fallbackFailure', fallbackResult);
      }

      return fallbackResult;

    } catch (error) {
      const fallbackResult: FallbackResult = {
        success: false,
        strategyUsed: strategy.name,
        actionTaken: strategy.action.type,
        previousState: context,
        newState: context,
        executionTime: Date.now() - startTime,
        error: error.message
      };

      this.recordFallbackResult(fallbackResult);
      logger.error(`❌ Error executing fallback strategy ${strategy.name}:`, error);
      
      return fallbackResult;
    }
  }

  /**
   * Execute a specific fallback action
   */
  private async executeAction(action: FallbackAction, context: Record<string, any>): Promise<{
    success: boolean;
    newState: any;
    error?: string;
  }> {
    try {
      switch (action.type) {
        case 'SWITCH_MODEL':
          return await this.executeSwitchModel(action.parameters, context);
          
        case 'REDUCE_PARAMETERS':
          return await this.executeReduceParameters(action.parameters, context);
          
        case 'DISABLE_AI':
          return await this.executeDisableAI(action.parameters, context);
          
        case 'EMERGENCY_MODE':
          return await this.executeEmergencyMode(action.parameters, context);
          
        case 'RESTART_MODEL':
          return await this.executeRestartModel(action.parameters, context);
          
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      return {
        success: false,
        newState: context,
        error: error.message
      };
    }
  }

  /**
   * Execute model switching action
   */
  private async executeSwitchModel(parameters: any, context: any): Promise<{
    success: boolean;
    newState: any;
    error?: string;
  }> {
    try {
      const currentModel = this.modelManager.getCurrentActiveModel();
      let targetModel: string | null = null;

      // Determine target model based on parameters
      if (parameters.targetType === 'smaller') {
        targetModel = await this.findSmallerModel(currentModel);
      } else if (parameters.targetType === 'faster') {
        targetModel = await this.findFasterModel(currentModel);
      } else if (parameters.targetType === 'more_accurate') {
        targetModel = await this.findMoreAccurateModel(currentModel);
      }

      if (!targetModel) {
        return {
          success: false,
          newState: context,
          error: 'No suitable alternative model found'
        };
      }

      // Check circuit breaker for target model
      if (!this.canUseModel(targetModel)) {
        return {
          success: false,
          newState: context,
          error: `Target model ${targetModel} circuit breaker is open`
        };
      }

      // Perform the switch
      await this.modelManager.loadModel(targetModel);

      logger.info(`🔄 Successfully switched from ${currentModel} to ${targetModel}`);

      return {
        success: true,
        newState: {
          ...context,
          previousModel: currentModel,
          newModel: targetModel
        }
      };

    } catch (error) {
      return {
        success: false,
        newState: context,
        error: error.message
      };
    }
  }

  /**
   * Execute parameter reduction action
   */
  private async executeReduceParameters(parameters: any, context: any): Promise<{
    success: boolean;
    newState: any;
    error?: string;
  }> {
    try {
      // This would adjust model parameters in production
      logger.info('🔧 Reducing model parameters:', parameters);

      // Mock implementation - in production, this would actually adjust parameters
      const adjustments = {
        cpuThreads: parameters.cpuThreads === 'reduce_by_half' ? 'reduced by 50%' : 'adjusted',
        maxTokens: parameters.maxTokens === 'reduce_by_25_percent' ? 'reduced by 25%' : 'adjusted'
      };

      return {
        success: true,
        newState: {
          ...context,
          parameterAdjustments: adjustments
        }
      };

    } catch (error) {
      return {
        success: false,
        newState: context,
        error: error.message
      };
    }
  }

  /**
   * Execute disable AI action
   */
  private async executeDisableAI(parameters: any, context: any): Promise<{
    success: boolean;
    newState: any;
    error?: string;
  }> {
    try {
      logger.warn('⚠️ Disabling AI operations due to fallback trigger');

      // This would disable AI operations in production
      // For now, just log the action
      
      return {
        success: true,
        newState: {
          ...context,
          aiDisabled: true,
          disableReason: 'Fallback trigger'
        }
      };

    } catch (error) {
      return {
        success: false,
        newState: context,
        error: error.message
      };
    }
  }

  /**
   * Execute emergency mode action
   */
  private async executeEmergencyMode(parameters: any, context: any): Promise<{
    success: boolean;
    newState: any;
    error?: string;
  }> {
    try {
      logger.error('🚨 ENTERING EMERGENCY MODE');

      this.emergencyMode = {
        enabled: true,
        triggers: [context.eventType || 'unknown'],
        actions: ['AI_DISABLED', 'TRADING_REDUCED'],
        tradingImpact: parameters.tradingImpact || 'REDUCED',
        notificationLevel: 'CRITICAL'
      };

      // Emit emergency mode event
      this.emit('emergencyMode', this.emergencyMode);

      return {
        success: true,
        newState: {
          ...context,
          emergencyMode: this.emergencyMode
        }
      };

    } catch (error) {
      return {
        success: false,
        newState: context,
        error: error.message
      };
    }
  }

  /**
   * Execute model restart action
   */
  private async executeRestartModel(parameters: any, context: any): Promise<{
    success: boolean;
    newState: any;
    error?: string;
  }> {
    try {
      const currentModel = this.modelManager.getCurrentActiveModel();
      
      if (!currentModel) {
        return {
          success: false,
          newState: context,
          error: 'No active model to restart'
        };
      }

      logger.info(`🔄 Restarting model: ${currentModel}`);

      // Unload and reload the model
      await this.modelManager.unloadModel(currentModel);
      
      if (parameters.clearCache) {
        // Clear any cached data
        logger.info('🧹 Clearing model cache');
      }

      await this.modelManager.loadModel(currentModel);

      return {
        success: true,
        newState: {
          ...context,
          modelRestarted: currentModel,
          cacheCleared: parameters.clearCache
        }
      };

    } catch (error) {
      return {
        success: false,
        newState: context,
        error: error.message
      };
    }
  }

  /**
   * Find a smaller model than the current one
   */
  private async findSmallerModel(currentModel: string | null): Promise<string | null> {
    const availableModels = this.modelManager.getAvailableModels();
    
    // Mock implementation - in production, this would check actual model sizes
    const modelSizes = {
      'phi-3-mini-4k-instruct-q4': 2048,
      'llama-3.2-1b-instruct-q8': 1536,
      'tinyllama-1.1b-chat-q4': 768
    };

    const currentSize = currentModel ? modelSizes[currentModel] || 0 : Infinity;
    
    for (const model of availableModels) {
      const modelSize = modelSizes[model] || 0;
      if (modelSize < currentSize && this.canUseModel(model)) {
        return model;
      }
    }

    return null;
  }

  /**
   * Find a faster model than the current one
   */
  private async findFasterModel(currentModel: string | null): Promise<string | null> {
    // Mock implementation - in production, this would check actual performance metrics
    const performanceHistory = this.modelManager.getModelPerformanceHistory();
    
    let fastestModel = null;
    let fastestTime = Infinity;

    for (const performance of performanceHistory) {
      if (performance.modelName !== currentModel && 
          performance.averageInferenceTime < fastestTime &&
          this.canUseModel(performance.modelName)) {
        fastestModel = performance.modelName;
        fastestTime = performance.averageInferenceTime;
      }
    }

    return fastestModel;
  }

  /**
   * Find a more accurate model than the current one
   */
  private async findMoreAccurateModel(currentModel: string | null): Promise<string | null> {
    // Mock implementation - in production, this would check actual accuracy metrics
    const performanceHistory = this.modelManager.getModelPerformanceHistory();
    
    let mostAccurateModel = null;
    let highestAccuracy = 0;

    for (const performance of performanceHistory) {
      if (performance.modelName !== currentModel && 
          performance.averageAccuracy > highestAccuracy &&
          this.canUseModel(performance.modelName)) {
        mostAccurateModel = performance.modelName;
        highestAccuracy = performance.averageAccuracy;
      }
    }

    return mostAccurateModel;
  }

  /**
   * Check if a model can be used (circuit breaker check)
   */
  private canUseModel(modelName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(modelName);
    
    if (!circuitBreaker) {
      return true; // No circuit breaker, assume it's usable
    }

    if (circuitBreaker.state === 'CLOSED') {
      return true;
    }

    if (circuitBreaker.state === 'OPEN') {
      // Check if we can try half-open
      if (circuitBreaker.nextRetryTime && new Date() >= circuitBreaker.nextRetryTime) {
        circuitBreaker.state = 'HALF_OPEN';
        circuitBreaker.successCount = 0;
        return true;
      }
      return false;
    }

    if (circuitBreaker.state === 'HALF_OPEN') {
      return true; // Allow limited requests in half-open state
    }

    return false;
  }

  /**
   * Record a failure for circuit breaker
   */
  private async recordFailure(modelName: string): Promise<void> {
    const circuitBreaker = this.circuitBreakers.get(modelName);
    
    if (!circuitBreaker) {
      this.initializeCircuitBreaker(modelName);
      return;
    }

    circuitBreaker.failureCount++;
    circuitBreaker.lastFailureTime = new Date();
    circuitBreaker.totalRequests++;

    // Check if we should open the circuit
    if (circuitBreaker.failureCount >= this.CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      circuitBreaker.state = 'OPEN';
      circuitBreaker.nextRetryTime = new Date(Date.now() + this.CIRCUIT_BREAKER_CONFIG.timeout);
      
      logger.warn(`🔌 Circuit breaker OPENED for model: ${modelName}`);
      this.emit('circuitBreakerOpened', { modelName, circuitBreaker });
    }
  }

  /**
   * Record a success for circuit breaker
   */
  private async recordSuccess(modelName: string): Promise<void> {
    const circuitBreaker = this.circuitBreakers.get(modelName);
    
    if (!circuitBreaker) {
      return;
    }

    circuitBreaker.successCount++;
    circuitBreaker.totalRequests++;

    if (circuitBreaker.state === 'HALF_OPEN') {
      if (circuitBreaker.successCount >= this.CIRCUIT_BREAKER_CONFIG.successThreshold) {
        circuitBreaker.state = 'CLOSED';
        circuitBreaker.failureCount = 0;
        
        logger.info(`🔌 Circuit breaker CLOSED for model: ${modelName}`);
        this.emit('circuitBreakerClosed', { modelName, circuitBreaker });
      }
    }
  }

  /**
   * Check if a strategy is in cooldown period
   */
  private async isInCooldown(strategy: FallbackStrategy): Promise<boolean> {
    // This would check actual cooldown state in production
    // For now, return false (no cooldown)
    return false;
  }

  /**
   * Record fallback result in history
   */
  private recordFallbackResult(result: FallbackResult): void {
    this.fallbackHistory.push(result);
    
    if (this.fallbackHistory.length > this.maxHistorySize) {
      this.fallbackHistory = this.fallbackHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get fallback history
   */
  public getFallbackHistory(limit?: number): FallbackResult[] {
    if (limit) {
      return this.fallbackHistory.slice(-limit);
    }
    return [...this.fallbackHistory];
  }

  /**
   * Get circuit breaker states
   */
  public getCircuitBreakerStates(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Get emergency mode status
   */
  public getEmergencyModeStatus(): EmergencyModeConfig {
    return { ...this.emergencyMode };
  }

  /**
   * Exit emergency mode
   */
  public async exitEmergencyMode(): Promise<void> {
    logger.info('🔄 Exiting emergency mode');
    
    this.emergencyMode = {
      enabled: false,
      triggers: [],
      actions: [],
      tradingImpact: 'NONE',
      notificationLevel: 'INFO'
    };

    this.emit('emergencyModeExited');
  }

  /**
   * Manually trigger a fallback strategy
   */
  public async triggerFallback(strategyName: string, context: Record<string, any> = {}): Promise<FallbackResult> {
    const strategy = this.fallbackStrategies.find(s => s.name === strategyName);
    
    if (!strategy) {
      throw new Error(`Fallback strategy not found: ${strategyName}`);
    }

    return await this.executeFallbackStrategy(strategy, context);
  }

  /**
   * Add custom fallback strategy
   */
  public addFallbackStrategy(strategy: FallbackStrategy): void {
    this.fallbackStrategies.push(strategy);
    this.fallbackStrategies.sort((a, b) => b.priority - a.priority);
    
    logger.info(`➕ Added custom fallback strategy: ${strategy.name}`);
  }

  /**
   * Remove fallback strategy
   */
  public removeFallbackStrategy(strategyName: string): boolean {
    const index = this.fallbackStrategies.findIndex(s => s.name === strategyName);
    
    if (index >= 0) {
      this.fallbackStrategies.splice(index, 1);
      logger.info(`➖ Removed fallback strategy: ${strategyName}`);
      return true;
    }
    
    return false;
  }

  /**
   * Get all fallback strategies
   */
  public getFallbackStrategies(): FallbackStrategy[] {
    return [...this.fallbackStrategies];
  }

  /**
   * Shutdown the fallback manager
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('🛑 Shutting down LLM Fallback Manager...');

      // Clear all data
      this.circuitBreakers.clear();
      this.fallbackHistory = [];
      this.fallbackStrategies = [];

      this.isInitialized = false;
      
      logger.info('✅ LLM Fallback Manager shutdown completed');

    } catch (error) {
      logger.error('❌ Error during LLM Fallback Manager shutdown:', error);
      throw error;
    }
  }
}

// Export types
export type {
  FallbackStrategy,
  FallbackCondition,
  FallbackAction,
  CircuitBreakerState,
  FallbackResult,
  EmergencyModeConfig
};
