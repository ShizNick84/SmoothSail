/**
 * =============================================================================
 * MODEL MANAGER - LLM MODEL LIFECYCLE AND OPTIMIZATION
 * =============================================================================
 * 
 * This module manages the lifecycle of LLM models, including loading, unloading,
 * optimization, and switching between models based on system resources and
 * performance requirements. Specifically designed for Intel NUC constraints.
 * 
 * Key Features:
 * - Dynamic model loading/unloading based on memory pressure
 * - Model performance monitoring and optimization
 * - Automatic fallback mechanisms for model failures
 * - Resource-aware model selection
 * - Model integrity verification and security
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from '@/core/logging/logger';
import { SystemMonitor } from '@/infrastructure/system-monitor';
import { SecurityManager } from '@/security/security-manager';
import type { LLMModelConfig, ModelMetrics } from './llm-engine';

/**
 * Interface for model download and management
 */
interface ModelDownloadConfig {
  modelName: string;
  downloadUrl: string;
  expectedHash: string;
  fileSize: number; // bytes
  priority: number; // 1-10, higher is more important
}

/**
 * Interface for model performance history
 */
interface ModelPerformanceHistory {
  modelName: string;
  averageInferenceTime: number;
  averageAccuracy: number;
  memoryEfficiency: number;
  cpuEfficiency: number;
  successRate: number;
  lastUsed: Date;
  totalUsageTime: number; // seconds
}

/**
 * Interface for model health status
 */
interface ModelHealthStatus {
  modelName: string;
  isHealthy: boolean;
  lastHealthCheck: Date;
  issues: string[];
  recommendations: string[];
}

/**
 * Model Manager class for handling LLM model lifecycle
 * Optimized for Intel NUC hardware constraints
 */
export class ModelManager extends EventEmitter {
  private systemMonitor: SystemMonitor;
  private securityManager: SecurityManager;
  private modelsDirectory: string;
  private availableModels: Map<string, LLMModelConfig> = new Map();
  private loadedModels: Map<string, any> = new Map();
  private modelPerformanceHistory: Map<string, ModelPerformanceHistory> = new Map();
  private modelHealthStatus: Map<string, ModelHealthStatus> = new Map();
  private currentActiveModel: string | null = null;
  private isInitialized: boolean = false;

  // Model download configurations for Intel NUC optimization
  private readonly MODEL_DOWNLOADS: ModelDownloadConfig[] = [
    {
      modelName: 'phi-3-mini-4k-instruct-q4',
      downloadUrl: 'https://huggingface.co/microsoft/Phi-3-mini-4K-instruct-onnx/resolve/main/cpu_and_mobile/cpu-int4-rtn-block-32-acc-level-4/phi-3-mini-4k-instruct-cpu-int4-rtn-block-32-acc-level-4.onnx',
      expectedHash: 'sha256:abc123...', // Would be actual hash in production
      fileSize: 2147483648, // 2GB
      priority: 9
    },
    {
      modelName: 'llama-3.2-1b-instruct-q8',
      downloadUrl: 'https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct-onnx/resolve/main/onnx/model_quantized.onnx',
      expectedHash: 'sha256:def456...', // Would be actual hash in production
      fileSize: 1610612736, // 1.5GB
      priority: 8
    },
    {
      modelName: 'tinyllama-1.1b-chat-q4',
      downloadUrl: 'https://huggingface.co/TinyLlama/TinyLlama-1.1B-Chat-v1.0-onnx/resolve/main/onnx/model_quantized.onnx',
      expectedHash: 'sha256:ghi789...', // Would be actual hash in production
      fileSize: 805306368, // 768MB
      priority: 7
    }
  ];

  constructor(
    systemMonitor: SystemMonitor, 
    securityManager: SecurityManager,
    modelsDirectory: string = './models'
  ) {
    super();
    this.systemMonitor = systemMonitor;
    this.securityManager = securityManager;
    this.modelsDirectory = modelsDirectory;

    logger.info('🗂️ Model Manager initialized');
  }

  /**
   * Initialize the model manager
   * Sets up model directory and discovers available models
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🚀 Initializing Model Manager...');

      // Create models directory if it doesn't exist
      await this.ensureModelsDirectory();

      // Discover existing models
      await this.discoverAvailableModels();

      // Load model performance history
      await this.loadPerformanceHistory();

      // Perform initial health checks
      await this.performHealthChecks();

      // Download missing high-priority models
      await this.downloadMissingModels();

      this.isInitialized = true;
      logger.info('✅ Model Manager initialized successfully');

      this.emit('initialized');

    } catch (error) {
      logger.error('❌ Failed to initialize Model Manager:', error);
      throw new Error(`Model Manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Ensure models directory exists with proper permissions
   */
  private async ensureModelsDirectory(): Promise<void> {
    try {
      await fs.access(this.modelsDirectory);
      logger.info(`📁 Models directory exists: ${this.modelsDirectory}`);
    } catch {
      logger.info(`📁 Creating models directory: ${this.modelsDirectory}`);
      await fs.mkdir(this.modelsDirectory, { recursive: true, mode: 0o755 });
    }
  }

  /**
   * Discover available models in the models directory
   */
  private async discoverAvailableModels(): Promise<void> {
    try {
      logger.info('🔍 Discovering available models...');

      const files = await fs.readdir(this.modelsDirectory);
      const modelFiles = files.filter(file => file.endsWith('.onnx'));

      for (const modelFile of modelFiles) {
        const modelPath = join(this.modelsDirectory, modelFile);
        const modelName = modelFile.replace('.onnx', '');

        // Get model configuration based on filename
        const modelConfig = this.getModelConfigByName(modelName);
        
        if (modelConfig) {
          modelConfig.modelPath = modelPath;
          this.availableModels.set(modelName, modelConfig);
          logger.info(`📦 Discovered model: ${modelName}`);
        }
      }

      logger.info(`✅ Discovered ${this.availableModels.size} available models`);

    } catch (error) {
      logger.error('❌ Error discovering models:', error);
      throw error;
    }
  }

  /**
   * Get model configuration by name
   * Returns predefined configuration for known models
   */
  private getModelConfigByName(modelName: string): LLMModelConfig | null {
    const configs: Record<string, Partial<LLMModelConfig>> = {
      'phi-3-mini-4k-instruct-q4': {
        quantization: '4bit',
        maxTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        memoryRequirement: 2048,
        cpuThreads: 4,
        contextWindow: 4096,
        batchSize: 1
      },
      'llama-3.2-1b-instruct-q8': {
        quantization: '8bit',
        maxTokens: 2048,
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        memoryRequirement: 1536,
        cpuThreads: 4,
        contextWindow: 2048,
        batchSize: 1
      },
      'tinyllama-1.1b-chat-q4': {
        quantization: '4bit',
        maxTokens: 1024,
        temperature: 0.8,
        topP: 0.95,
        topK: 50,
        memoryRequirement: 768,
        cpuThreads: 2,
        contextWindow: 2048,
        batchSize: 1
      }
    };

    const baseConfig = configs[modelName];
    if (!baseConfig) return null;

    return {
      modelName,
      modelPath: '',
      ...baseConfig
    } as LLMModelConfig;
  }

  /**
   * Load model performance history from disk
   */
  private async loadPerformanceHistory(): Promise<void> {
    try {
      const historyPath = join(this.modelsDirectory, 'performance_history.json');
      
      try {
        const historyData = await fs.readFile(historyPath, 'utf-8');
        const history = JSON.parse(historyData);
        
        for (const [modelName, data] of Object.entries(history)) {
          this.modelPerformanceHistory.set(modelName, data as ModelPerformanceHistory);
        }
        
        logger.info(`📊 Loaded performance history for ${this.modelPerformanceHistory.size} models`);
        
      } catch {
        logger.info('📊 No existing performance history found, starting fresh');
      }
      
    } catch (error) {
      logger.error('❌ Error loading performance history:', error);
    }
  }

  /**
   * Perform health checks on all available models
   */
  private async performHealthChecks(): Promise<void> {
    logger.info('🏥 Performing model health checks...');

    for (const [modelName, config] of this.availableModels) {
      try {
        const healthStatus = await this.checkModelHealth(modelName, config);
        this.modelHealthStatus.set(modelName, healthStatus);
        
        if (healthStatus.isHealthy) {
          logger.info(`✅ Model ${modelName} is healthy`);
        } else {
          logger.warn(`⚠️ Model ${modelName} has issues:`, healthStatus.issues);
        }
        
      } catch (error) {
        logger.error(`❌ Health check failed for model ${modelName}:`, error);
        
        this.modelHealthStatus.set(modelName, {
          modelName,
          isHealthy: false,
          lastHealthCheck: new Date(),
          issues: [`Health check failed: ${error.message}`],
          recommendations: ['Consider re-downloading the model']
        });
      }
    }
  }

  /**
   * Check health of a specific model
   */
  private async checkModelHealth(modelName: string, config: LLMModelConfig): Promise<ModelHealthStatus> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check if model file exists and is readable
      await fs.access(config.modelPath, fs.constants.R_OK);
      
      // Check file size (basic integrity check)
      const stats = await fs.stat(config.modelPath);
      if (stats.size < 1024 * 1024) { // Less than 1MB is suspicious
        issues.push('Model file size is suspiciously small');
        recommendations.push('Re-download the model');
      }
      
      // Check if model fits in available memory
      const systemResources = await this.systemMonitor.getCurrentResources();
      if (config.memoryRequirement > systemResources.memory.available) {
        issues.push('Model requires more memory than available');
        recommendations.push('Free up memory or use a smaller model');
      }
      
      // Verify model integrity (in production, this would check cryptographic hashes)
      const isIntegrityValid = await this.verifyModelIntegrity(config.modelPath);
      if (!isIntegrityValid) {
        issues.push('Model integrity verification failed');
        recommendations.push('Re-download the model from trusted source');
      }
      
    } catch (error) {
      issues.push(`File access error: ${error.message}`);
      recommendations.push('Check file permissions and path');
    }

    return {
      modelName,
      isHealthy: issues.length === 0,
      lastHealthCheck: new Date(),
      issues,
      recommendations
    };
  }

  /**
   * Verify model file integrity
   * In production, this would use cryptographic hashes
   */
  private async verifyModelIntegrity(modelPath: string): Promise<boolean> {
    try {
      // Mock integrity check - in production, use actual hash verification
      const stats = await fs.stat(modelPath);
      return stats.size > 0; // Basic check that file exists and has content
      
    } catch (error) {
      logger.error('❌ Model integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Download missing high-priority models
   */
  private async downloadMissingModels(): Promise<void> {
    logger.info('📥 Checking for missing models to download...');

    // Sort by priority (highest first)
    const sortedDownloads = this.MODEL_DOWNLOADS.sort((a, b) => b.priority - a.priority);

    for (const downloadConfig of sortedDownloads) {
      if (!this.availableModels.has(downloadConfig.modelName)) {
        logger.info(`📥 Model ${downloadConfig.modelName} not found, adding to download queue`);
        
        // Check if we have enough disk space
        const systemResources = await this.systemMonitor.getCurrentResources();
        if (systemResources.disk.available < downloadConfig.fileSize * 1.2) { // 20% buffer
          logger.warn(`⚠️ Insufficient disk space for ${downloadConfig.modelName}`);
          continue;
        }
        
        // In production, this would actually download the model
        // For now, we'll just log the intention
        logger.info(`📥 Would download ${downloadConfig.modelName} from ${downloadConfig.downloadUrl}`);
        
        // Create placeholder model config for now
        const modelConfig = this.getModelConfigByName(downloadConfig.modelName);
        if (modelConfig) {
          modelConfig.modelPath = join(this.modelsDirectory, `${downloadConfig.modelName}.onnx`);
          // Don't add to available models until actually downloaded
        }
      }
    }
  }

  /**
   * Select the best model based on current system resources and requirements
   */
  public async selectOptimalModel(requirements?: {
    maxMemory?: number;
    maxInferenceTime?: number;
    minAccuracy?: number;
  }): Promise<string | null> {
    try {
      logger.info('🎯 Selecting optimal model...');

      const systemResources = await this.systemMonitor.getCurrentResources();
      const availableMemory = systemResources.memory.available;

      // Filter healthy models that fit in memory
      const viableModels = Array.from(this.availableModels.entries())
        .filter(([modelName, config]) => {
          const healthStatus = this.modelHealthStatus.get(modelName);
          return healthStatus?.isHealthy && 
                 config.memoryRequirement <= (availableMemory - 1024); // 1GB buffer
        });

      if (viableModels.length === 0) {
        logger.warn('⚠️ No viable models found');
        return null;
      }

      // Score models based on performance history and requirements
      const scoredModels = viableModels.map(([modelName, config]) => {
        const performance = this.modelPerformanceHistory.get(modelName);
        let score = 0;

        // Base score from model capability (larger models generally better)
        score += config.memoryRequirement / 1000; // Normalize to 0-3 range

        // Performance history bonus
        if (performance) {
          score += (performance.averageAccuracy / 100) * 2; // 0-2 bonus
          score += (1 / (performance.averageInferenceTime / 1000)) * 1; // Speed bonus
          score += performance.successRate * 1; // Reliability bonus
        }

        // Apply requirements filters
        if (requirements?.maxMemory && config.memoryRequirement > requirements.maxMemory) {
          score *= 0.5; // Penalty for exceeding memory requirement
        }

        if (requirements?.maxInferenceTime && performance?.averageInferenceTime > requirements.maxInferenceTime) {
          score *= 0.7; // Penalty for being too slow
        }

        if (requirements?.minAccuracy && performance?.averageAccuracy < requirements.minAccuracy) {
          score *= 0.3; // Heavy penalty for insufficient accuracy
        }

        return { modelName, config, score };
      });

      // Sort by score (highest first)
      scoredModels.sort((a, b) => b.score - a.score);

      const selectedModel = scoredModels[0];
      logger.info(`🎯 Selected optimal model: ${selectedModel.modelName} (score: ${selectedModel.score.toFixed(2)})`);

      return selectedModel.modelName;

    } catch (error) {
      logger.error('❌ Error selecting optimal model:', error);
      return null;
    }
  }

  /**
   * Load a specific model into memory
   */
  public async loadModel(modelName: string): Promise<any> {
    try {
      logger.info(`📥 Loading model: ${modelName}...`);

      // Check if already loaded
      if (this.loadedModels.has(modelName)) {
        logger.info(`✅ Model ${modelName} already loaded`);
        return this.loadedModels.get(modelName);
      }

      // Get model configuration
      const config = this.availableModels.get(modelName);
      if (!config) {
        throw new Error(`Model ${modelName} not found in available models`);
      }

      // Check health status
      const healthStatus = this.modelHealthStatus.get(modelName);
      if (!healthStatus?.isHealthy) {
        throw new Error(`Model ${modelName} is not healthy: ${healthStatus?.issues.join(', ')}`);
      }

      // Check system resources
      const systemResources = await this.systemMonitor.getCurrentResources();
      if (config.memoryRequirement > systemResources.memory.available) {
        throw new Error(`Insufficient memory to load ${modelName}`);
      }

      // Load the model (mock implementation)
      const modelInstance = await this.loadModelInstance(config);
      
      // Cache the loaded model
      this.loadedModels.set(modelName, modelInstance);
      this.currentActiveModel = modelName;

      logger.info(`✅ Model ${modelName} loaded successfully`);
      
      this.emit('modelLoaded', { modelName, config });
      
      return modelInstance;

    } catch (error) {
      logger.error(`❌ Failed to load model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Load model instance (mock implementation)
   * In production, this would use actual ONNX Runtime
   */
  private async loadModelInstance(config: LLMModelConfig): Promise<any> {
    // Mock model instance
    return {
      config,
      predict: async (input: string): Promise<string> => {
        const startTime = Date.now();
        
        // Simulate inference time based on model complexity
        const inferenceTime = config.memoryRequirement / 2000; // Rough simulation
        await new Promise(resolve => setTimeout(resolve, inferenceTime));
        
        const endTime = Date.now();
        
        // Update performance metrics
        this.updatePerformanceMetrics(config.modelName, endTime - startTime, 0.85); // Mock 85% accuracy
        
        return `Analysis from ${config.modelName}: ${input}`;
      }
    };
  }

  /**
   * Update performance metrics for a model
   */
  private updatePerformanceMetrics(modelName: string, inferenceTime: number, accuracy: number): void {
    let performance = this.modelPerformanceHistory.get(modelName);
    
    if (!performance) {
      performance = {
        modelName,
        averageInferenceTime: inferenceTime,
        averageAccuracy: accuracy,
        memoryEfficiency: 0,
        cpuEfficiency: 0,
        successRate: 1.0,
        lastUsed: new Date(),
        totalUsageTime: 0
      };
    } else {
      // Update running averages
      performance.averageInferenceTime = (performance.averageInferenceTime + inferenceTime) / 2;
      performance.averageAccuracy = (performance.averageAccuracy + accuracy) / 2;
      performance.lastUsed = new Date();
      performance.totalUsageTime += inferenceTime / 1000; // Convert to seconds
    }
    
    this.modelPerformanceHistory.set(modelName, performance);
  }

  /**
   * Unload a model from memory
   */
  public async unloadModel(modelName: string): Promise<void> {
    try {
      if (this.loadedModels.has(modelName)) {
        this.loadedModels.delete(modelName);
        
        if (this.currentActiveModel === modelName) {
          this.currentActiveModel = null;
        }
        
        logger.info(`📤 Model ${modelName} unloaded from memory`);
        
        this.emit('modelUnloaded', { modelName });
      }
      
    } catch (error) {
      logger.error(`❌ Error unloading model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Get list of available models
   */
  public getAvailableModels(): string[] {
    return Array.from(this.availableModels.keys());
  }

  /**
   * Get list of loaded models
   */
  public getLoadedModels(): string[] {
    return Array.from(this.loadedModels.keys());
  }

  /**
   * Get current active model
   */
  public getCurrentActiveModel(): string | null {
    return this.currentActiveModel;
  }

  /**
   * Get model performance history
   */
  public getModelPerformanceHistory(modelName?: string): ModelPerformanceHistory[] {
    if (modelName) {
      const performance = this.modelPerformanceHistory.get(modelName);
      return performance ? [performance] : [];
    }
    
    return Array.from(this.modelPerformanceHistory.values());
  }

  /**
   * Get model health status
   */
  public getModelHealthStatus(modelName?: string): ModelHealthStatus[] {
    if (modelName) {
      const health = this.modelHealthStatus.get(modelName);
      return health ? [health] : [];
    }
    
    return Array.from(this.modelHealthStatus.values());
  }

  /**
   * Save performance history to disk
   */
  public async savePerformanceHistory(): Promise<void> {
    try {
      const historyPath = join(this.modelsDirectory, 'performance_history.json');
      const historyData = Object.fromEntries(this.modelPerformanceHistory);
      
      await fs.writeFile(historyPath, JSON.stringify(historyData, null, 2));
      
      logger.info('💾 Performance history saved to disk');
      
    } catch (error) {
      logger.error('❌ Error saving performance history:', error);
    }
  }

  /**
   * Shutdown the model manager gracefully
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('🛑 Shutting down Model Manager...');

      // Save performance history
      await this.savePerformanceHistory();

      // Unload all models
      for (const modelName of this.loadedModels.keys()) {
        await this.unloadModel(modelName);
      }

      // Clear caches
      this.availableModels.clear();
      this.modelPerformanceHistory.clear();
      this.modelHealthStatus.clear();

      this.isInitialized = false;
      
      logger.info('✅ Model Manager shutdown completed');

    } catch (error) {
      logger.error('❌ Error during Model Manager shutdown:', error);
      throw error;
    }
  }
}

// Export types
export type {
  ModelDownloadConfig,
  ModelPerformanceHistory,
  ModelHealthStatus
};