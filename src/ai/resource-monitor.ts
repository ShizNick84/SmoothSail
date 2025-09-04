/**
 * =============================================================================
 * RESOURCE MONITOR - LLM RESOURCE MANAGEMENT FOR INTEL NUC
 * =============================================================================
 * 
 * This module monitors system resources specifically for LLM operations on
 * Intel NUC hardware. It provides real-time monitoring, optimization
 * recommendations, and automatic resource management to ensure optimal
 * performance within hardware constraints.
 * 
 * Key Features:
 * - Real-time CPU, memory, and thermal monitoring
 * - LLM-specific resource optimization
 * - Automatic throttling and scaling
 * - Performance prediction and recommendations
 * - Resource allocation for trading vs AI operations
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { SystemMonitor } from '@/infrastructure/system-monitor';

/**
 * Interface for LLM-specific resource metrics
 */
interface LLMResourceMetrics {
  // Memory metrics
  totalMemory: number; // MB
  availableMemory: number; // MB
  llmMemoryUsage: number; // MB
  memoryPressure: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // CPU metrics
  cpuUsage: number; // percentage
  cpuTemperature: number; // Celsius
  availableCores: number;
  llmCpuUsage: number; // percentage
  
  // Performance metrics
  inferenceLatency: number; // milliseconds
  throughput: number; // tokens per second
  queueLength: number; // pending requests
  
  // System health
  thermalThrottling: boolean;
  swapUsage: number; // MB
  diskIOWait: number; // percentage
  
  timestamp: Date;
}

/**
 * Interface for resource optimization recommendations
 */
interface OptimizationRecommendation {
  type: 'MODEL_SWITCH' | 'PARAMETER_ADJUST' | 'RESOURCE_ALLOCATION' | 'THERMAL_MANAGEMENT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  expectedImpact: string;
  implementation: string;
  estimatedBenefit: number; // 0-100 percentage improvement
}

/**
 * Interface for resource allocation strategy
 */
interface ResourceAllocationStrategy {
  tradingPriority: number; // 0-100, higher means more resources for trading
  aiPriority: number; // 0-100, higher means more resources for AI
  memoryAllocation: {
    trading: number; // MB
    ai: number; // MB
    system: number; // MB
  };
  cpuAllocation: {
    trading: number; // percentage
    ai: number; // percentage
    system: number; // percentage
  };
}

/**
 * Interface for performance prediction
 */
interface PerformancePrediction {
  expectedInferenceTime: number; // milliseconds
  expectedAccuracy: number; // 0-100
  resourceRequirement: number; // MB
  confidence: number; // 0-100
  factors: string[];
}

/**
 * Resource Monitor class for LLM operations on Intel NUC
 */
export class LLMResourceMonitor extends EventEmitter {
  private systemMonitor: SystemMonitor;
  private isInitialized: boolean = false;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private currentMetrics: LLMResourceMetrics | null = null;
  private metricsHistory: LLMResourceMetrics[] = [];
  private maxHistorySize: number = 1000; // Keep last 1000 measurements
  private currentAllocationStrategy: ResourceAllocationStrategy;
  
  // Intel NUC specific thresholds
  private readonly THRESHOLDS = {
    memory: {
      low: 2048, // 2GB available
      medium: 1024, // 1GB available
      high: 512, // 512MB available
      critical: 256 // 256MB available
    },
    cpu: {
      normal: 70, // 70% usage
      high: 85, // 85% usage
      critical: 95 // 95% usage
    },
    temperature: {
      normal: 70, // 70°C
      warning: 80, // 80°C
      critical: 90 // 90°C
    }
  };

  constructor(systemMonitor: SystemMonitor) {
    super();
    this.systemMonitor = systemMonitor;
    
    // Default resource allocation strategy
    this.currentAllocationStrategy = {
      tradingPriority: 70, // Trading gets priority
      aiPriority: 30,
      memoryAllocation: {
        trading: 4096, // 4GB for trading
        ai: 6144, // 6GB for AI
        system: 1856 // ~1.8GB for system
      },
      cpuAllocation: {
        trading: 60, // 60% for trading
        ai: 30, // 30% for AI
        system: 10 // 10% for system
      }
    };

    logger.info('📊 LLM Resource Monitor initialized for Intel NUC');
  }

  /**
   * Start resource monitoring
   * Begins continuous monitoring of system resources for LLM operations
   */
  public async startMonitoring(intervalMs: number = 5000): Promise<void> {
    try {
      if (this.isMonitoring) {
        logger.warn('⚠️ Resource monitoring already running');
        return;
      }

      logger.info('🚀 Starting LLM resource monitoring...');

      // Initial metrics collection
      await this.collectMetrics();

      // Start periodic monitoring
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.collectMetrics();
          await this.analyzeMetrics();
          await this.generateRecommendations();
        } catch (error) {
          logger.error('❌ Error in resource monitoring cycle:', error);
        }
      }, intervalMs);

      this.isMonitoring = true;
      this.isInitialized = true;
      logger.info('✅ LLM resource monitoring started');

      this.emit('monitoringStarted');

    } catch (error) {
      logger.error('❌ Failed to start resource monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop resource monitoring
   */
  public async stopMonitoring(): Promise<void> {
    try {
      if (!this.isMonitoring) {
        logger.warn('⚠️ Resource monitoring not running');
        return;
      }

      logger.info('🛑 Stopping LLM resource monitoring...');

      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }

      this.isMonitoring = false;
      logger.info('✅ LLM resource monitoring stopped');

      this.emit('monitoringStopped');

    } catch (error) {
      logger.error('❌ Error stopping resource monitoring:', error);
      throw error;
    }
  }

  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const systemResources = await this.systemMonitor.getCurrentResources();
      
      // Calculate LLM-specific metrics
      const metrics: LLMResourceMetrics = {
        totalMemory: 12288, // 12GB Intel NUC
        availableMemory: systemResources.ram?.available || 0,
        llmMemoryUsage: this.estimateLLMMemoryUsage(),
        memoryPressure: this.calculateMemoryPressure(systemResources.ram?.available || 0),
        
        cpuUsage: systemResources.cpu?.utilization || 0,
        cpuTemperature: systemResources.cpu.temperature || 0,
        availableCores: systemResources.cpu?.cores?.logical || 0,
        llmCpuUsage: this.estimateLLMCpuUsage(),
        
        inferenceLatency: this.getAverageInferenceLatency(),
        throughput: this.calculateThroughput(),
        queueLength: this.getQueueLength(),
        
        thermalThrottling: systemResources.cpu.temperature > this.THRESHOLDS.temperature.warning,
        swapUsage: systemResources.ram?.swap?.used || 0,
        diskIOWait: 0, // SSD metrics don't have ioWait in our interface
        
        timestamp: new Date()
      };

      this.currentMetrics = metrics;
      this.addToHistory(metrics);

      // Emit metrics for other components
      this.emit('metricsUpdated', metrics);

    } catch (error) {
      logger.error('❌ Error collecting metrics:', error);
      throw error;
    }
  }

  /**
   * Estimate current LLM memory usage
   */
  private estimateLLMMemoryUsage(): number {
    // This would track actual LLM memory usage in production
    // For now, return estimated usage based on loaded models
    return 2048; // Mock 2GB usage
  }

  /**
   * Estimate current LLM CPU usage
   */
  private estimateLLMCpuUsage(): number {
    // This would track actual LLM CPU usage in production
    // For now, return estimated usage
    return 25; // Mock 25% CPU usage
  }

  /**
   * Calculate memory pressure level
   */
  private calculateMemoryPressure(availableMemory: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (availableMemory >= this.THRESHOLDS.memory.low) return 'LOW';
    if (availableMemory >= this.THRESHOLDS.memory.medium) return 'MEDIUM';
    if (availableMemory >= this.THRESHOLDS.memory.high) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Get average inference latency from recent history
   */
  private getAverageInferenceLatency(): number {
    if (this.metricsHistory.length === 0) return 0;
    
    const recentMetrics = this.metricsHistory.slice(-10); // Last 10 measurements
    const totalLatency = recentMetrics.reduce((sum, m) => sum + m.inferenceLatency, 0);
    
    return totalLatency / recentMetrics.length;
  }

  /**
   * Calculate current throughput (tokens per second)
   */
  private calculateThroughput(): number {
    // Mock calculation - in production, this would track actual token generation
    const avgLatency = this.getAverageInferenceLatency();
    if (avgLatency === 0) return 0;
    
    const avgTokensPerInference = 100; // Estimated average tokens
    return (avgTokensPerInference / avgLatency) * 1000; // Convert to per second
  }

  /**
   * Get current queue length for pending LLM requests
   */
  private getQueueLength(): number {
    // Mock implementation - in production, this would track actual queue
    return 0;
  }

  /**
   * Add metrics to history and maintain size limit
   */
  private addToHistory(metrics: LLMResourceMetrics): void {
    this.metricsHistory.push(metrics);
    
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Analyze current metrics and detect issues
   */
  private async analyzeMetrics(): Promise<void> {
    if (!this.currentMetrics) return;

    const metrics = this.currentMetrics;
    const issues: string[] = [];

    // Check memory pressure
    if (metrics.memoryPressure === 'CRITICAL') {
      issues.push('Critical memory pressure detected');
      this.emit('criticalMemoryPressure', metrics);
    } else if (metrics.memoryPressure === 'HIGH') {
      issues.push('High memory pressure detected');
      this.emit('highMemoryPressure', metrics);
    }

    // Check CPU usage
    if (metrics.cpuUsage > this.THRESHOLDS.cpu.critical) {
      issues.push('Critical CPU usage detected');
      this.emit('criticalCpuUsage', metrics);
    } else if (metrics.cpuUsage > this.THRESHOLDS.cpu.high) {
      issues.push('High CPU usage detected');
      this.emit('highCpuUsage', metrics);
    }

    // Check thermal throttling
    if (metrics.thermalThrottling) {
      issues.push('Thermal throttling detected');
      this.emit('thermalThrottling', metrics);
    }

    // Check inference performance
    if (metrics.inferenceLatency > 5000) { // 5 seconds is too slow for trading
      issues.push('Slow inference performance detected');
      this.emit('slowInference', metrics);
    }

    // Check swap usage
    if (metrics.swapUsage > 1024) { // More than 1GB swap usage
      issues.push('High swap usage detected');
      this.emit('highSwapUsage', metrics);
    }

    if (issues.length > 0) {
      logger.warn('⚠️ Resource issues detected:', issues);
    }
  }

  /**
   * Generate optimization recommendations based on current metrics
   */
  private async generateRecommendations(): Promise<OptimizationRecommendation[]> {
    if (!this.currentMetrics) return [];

    const recommendations: OptimizationRecommendation[] = [];
    const metrics = this.currentMetrics;

    // Memory optimization recommendations
    if (metrics.memoryPressure === 'CRITICAL' || metrics.memoryPressure === 'HIGH') {
      recommendations.push({
        type: 'MODEL_SWITCH',
        priority: 'HIGH',
        description: 'Switch to a smaller, more memory-efficient model',
        expectedImpact: 'Reduce memory usage by 30-50%',
        implementation: 'Load TinyLlama model instead of current model',
        estimatedBenefit: 40
      });

      recommendations.push({
        type: 'RESOURCE_ALLOCATION',
        priority: 'MEDIUM',
        description: 'Reduce AI memory allocation in favor of trading operations',
        expectedImpact: 'Free up 1-2GB for critical trading operations',
        implementation: 'Adjust memory allocation strategy',
        estimatedBenefit: 25
      });
    }

    // CPU optimization recommendations
    if (metrics.cpuUsage > this.THRESHOLDS.cpu.high) {
      recommendations.push({
        type: 'PARAMETER_ADJUST',
        priority: 'MEDIUM',
        description: 'Reduce CPU threads used by LLM inference',
        expectedImpact: 'Reduce CPU usage by 10-20%',
        implementation: 'Decrease cpuThreads parameter from 4 to 2',
        estimatedBenefit: 15
      });
    }

    // Thermal management recommendations
    if (metrics.thermalThrottling) {
      recommendations.push({
        type: 'THERMAL_MANAGEMENT',
        priority: 'CRITICAL',
        description: 'Implement aggressive thermal throttling',
        expectedImpact: 'Prevent hardware damage and maintain stability',
        implementation: 'Reduce inference frequency and CPU usage',
        estimatedBenefit: 60
      });
    }

    // Performance optimization recommendations
    if (metrics.inferenceLatency > 3000) {
      recommendations.push({
        type: 'PARAMETER_ADJUST',
        priority: 'MEDIUM',
        description: 'Optimize model parameters for faster inference',
        expectedImpact: 'Reduce inference time by 20-30%',
        implementation: 'Reduce max_tokens and adjust temperature',
        estimatedBenefit: 25
      });
    }

    // Emit recommendations
    if (recommendations.length > 0) {
      this.emit('optimizationRecommendations', recommendations);
      logger.info(`💡 Generated ${recommendations.length} optimization recommendations`);
    }

    return recommendations;
  }

  /**
   * Predict performance for a given model configuration
   */
  public predictPerformance(
    modelName: string,
    memoryRequirement: number,
    cpuThreads: number
  ): PerformancePrediction {
    if (!this.currentMetrics) {
      return {
        expectedInferenceTime: 0,
        expectedAccuracy: 0,
        resourceRequirement: memoryRequirement,
        confidence: 0,
        factors: ['No current metrics available']
      };
    }

    const metrics = this.currentMetrics;
    const factors: string[] = [];
    
    // Base inference time estimation
    let expectedInferenceTime = 1000; // Base 1 second
    
    // Adjust for model size
    expectedInferenceTime *= (memoryRequirement / 1000); // Scale with memory requirement
    factors.push(`Model size: ${memoryRequirement}MB`);
    
    // Adjust for available CPU
    const cpuLoadFactor = metrics.cpuUsage / 100;
    expectedInferenceTime *= (1 + cpuLoadFactor);
    factors.push(`CPU usage: ${metrics.cpuUsage}%`);
    
    // Adjust for memory pressure
    if (metrics.memoryPressure === 'HIGH') {
      expectedInferenceTime *= 1.5;
      factors.push('High memory pressure');
    } else if (metrics.memoryPressure === 'CRITICAL') {
      expectedInferenceTime *= 2.0;
      factors.push('Critical memory pressure');
    }
    
    // Adjust for thermal throttling
    if (metrics.thermalThrottling) {
      expectedInferenceTime *= 1.3;
      factors.push('Thermal throttling active');
    }
    
    // Estimate accuracy based on model size (larger models generally more accurate)
    const expectedAccuracy = Math.min(95, 60 + (memoryRequirement / 100));
    
    // Calculate confidence based on available data
    const confidence = Math.min(100, this.metricsHistory.length * 2);
    
    return {
      expectedInferenceTime: Math.round(expectedInferenceTime),
      expectedAccuracy: Math.round(expectedAccuracy),
      resourceRequirement: memoryRequirement,
      confidence,
      factors
    };
  }

  /**
   * Update resource allocation strategy
   */
  public updateAllocationStrategy(strategy: Partial<ResourceAllocationStrategy>): void {
    this.currentAllocationStrategy = {
      ...this.currentAllocationStrategy,
      ...strategy
    };
    
    logger.info('🔧 Resource allocation strategy updated:', this.currentAllocationStrategy);
    this.emit('allocationStrategyUpdated', this.currentAllocationStrategy);
  }

  /**
   * Get current metrics
   */
  public getCurrentMetrics(): LLMResourceMetrics | null {
    return this.currentMetrics;
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(limit?: number): LLMResourceMetrics[] {
    if (limit) {
      return this.metricsHistory.slice(-limit);
    }
    return [...this.metricsHistory];
  }

  /**
   * Get current resource allocation strategy
   */
  public getAllocationStrategy(): ResourceAllocationStrategy {
    return { ...this.currentAllocationStrategy };
  }

  /**
   * Check if system can handle a specific model
   */
  public canHandleModel(memoryRequirement: number, cpuThreads: number): boolean {
    if (!this.currentMetrics) return false;
    
    const availableMemory = this.currentMetrics.availableMemory;
    const currentCpuUsage = this.currentMetrics.cpuUsage;
    
    // Check memory availability (leave 1GB buffer)
    if (memoryRequirement > (availableMemory - 1024)) {
      return false;
    }
    
    // Check CPU availability (don't exceed 90% total usage)
    const estimatedCpuIncrease = (cpuThreads / this.currentMetrics.availableCores) * 100;
    if ((currentCpuUsage + estimatedCpuIncrease) > 90) {
      return false;
    }
    
    return true;
  }

  /**
   * Get system health score (0-100)
   */
  public getSystemHealthScore(): number {
    if (!this.currentMetrics) return 0;
    
    const metrics = this.currentMetrics;
    let score = 100;
    
    // Memory pressure penalty
    switch (metrics.memoryPressure) {
      case 'MEDIUM': score -= 10; break;
      case 'HIGH': score -= 25; break;
      case 'CRITICAL': score -= 50; break;
    }
    
    // CPU usage penalty
    if (metrics.cpuUsage > 70) score -= (metrics.cpuUsage - 70);
    
    // Thermal throttling penalty
    if (metrics.thermalThrottling) score -= 30;
    
    // Swap usage penalty
    if (metrics.swapUsage > 512) score -= 20;
    
    // Inference performance penalty
    if (metrics.inferenceLatency > 2000) score -= 15;
    
    return Math.max(0, Math.round(score));
  }

  /**
   * Check if the resource monitor is healthy and functioning properly
   */
  public isHealthy(): boolean {
    try {
      // Check if monitor is initialized
      if (!this.isInitialized) {
        return false;
      }

      // Check if system monitor is available
      if (!this.systemMonitor) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('❌ Error checking LLM Resource Monitor health:', error);
      return false;
    }
  }

  /**
   * Get current resource metrics
   */
  public async getResourceMetrics(): Promise<LLMResourceMetrics> {
    try {
      if (!this.isInitialized) {
        throw new Error('Resource monitor not initialized');
      }

      return this.currentMetrics || {
        totalMemory: 12288, // 12GB Intel NUC
        availableMemory: 8192, // Default fallback
        llmMemoryUsage: 0,
        memoryPressure: 0,
        cpuUsage: 0,
        cpuTemperature: 0,
        availableCores: 8,
        thermalThrottling: false,
        swapUsage: 0,
        diskIOWait: 0,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('❌ Error getting resource metrics:', error);
      throw error;
    }
  }

  /**
   * Get current resource statistics
   */
  public async getStats(): Promise<any> {
    try {
      if (!this.isInitialized) {
        throw new Error('Resource monitor not initialized');
      }

      const systemResources = await this.systemMonitor.getCurrentResources();
      const metrics = await this.getResourceMetrics();

      return {
        systemResources,
        metrics,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('❌ Error getting resource stats:', error);
      throw error;
    }
  }

  /**
   * Shutdown the resource monitor
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('🛑 Shutting down LLM Resource Monitor...');
      
      await this.stopMonitoring();
      
      // Clear history
      this.metricsHistory = [];
      this.currentMetrics = null;
      
      logger.info('✅ LLM Resource Monitor shutdown completed');
      
    } catch (error) {
      logger.error('❌ Error during LLM Resource Monitor shutdown:', error);
      throw error;
    }
  }
}

// Export types
export type {
  LLMResourceMetrics,
  OptimizationRecommendation,
  ResourceAllocationStrategy,
  PerformancePrediction
};
