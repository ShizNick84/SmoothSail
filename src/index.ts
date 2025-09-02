#!/usr/bin/env node

/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - MAIN ENTRY POINT
 * =============================================================================
 * 
 * This is the main entry point for the AI-powered cryptocurrency trading agent.
 * The system is designed with security-first principles, focusing on capital
 * preservation and profit maximization through sophisticated trading strategies.
 * 
 * CRITICAL SECURITY NOTICE:
 * This system handles real financial assets and trading operations.
 * All security measures must be maintained and regularly audited.
 * 
 * Hardware Requirements:
 * - Intel NUC with i5 CPU
 * - 12GB RAM minimum
 * - 256GB M.2 SSD
 * - Stable internet connection (wireless + ethernet)
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { logger } from '@/core/logging/logger';
import { SecurityManager } from '@/security/security-manager';
import { SystemMonitor } from '@/infrastructure/system-monitor';
import { TradingEngine } from '@/trading/trading-engine';
import { TunnelManager } from '@/infrastructure/tunnel/tunnel-manager';
import { validateEnvironment } from '@/config/environment-validator';
import { gracefulShutdown } from '@/core/shutdown/graceful-shutdown';
import { 
  SystemOrchestrator, 
  SystemHealthMonitor,
  dependencyManager,
  communicationBus,
  defaultOrchestrationConfig,
  defaultHealthMonitorConfig,
  DependencyTokens,
  registerSingleton
} from '@/core/orchestration';

/**
 * Main application class that orchestrates all system components
 * Implements security-first initialization and proper error handling
 */
class AITradingAgent {
  private orchestrator: SystemOrchestrator;
  private healthMonitor: SystemHealthMonitor;
  private isShuttingDown: boolean = false;

  constructor() {
    // Initialize orchestration components
    this.orchestrator = new SystemOrchestrator(defaultOrchestrationConfig);
    this.healthMonitor = new SystemHealthMonitor(defaultHealthMonitorConfig);
    
    // Register dependencies
    this.registerDependencies();
    
    // Register components with orchestrator
    this.registerComponents();
  }

  /**
   * Initialize the trading agent with comprehensive security checks
   * This method performs all necessary startup procedures in the correct order
   * 
   * @returns Promise<void> Resolves when initialization is complete
   * @throws Error if any critical initialization step fails
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🚀 Starting AI Crypto Trading Agent initialization...');
      
      // Step 1: Load and validate environment configuration
      await this.loadConfiguration();
      
      // Step 2: Start system orchestration
      await this.orchestrator.startSystem();
      
      // Step 3: Start health monitoring
      await this.healthMonitor.startMonitoring();
      
      // Step 4: Set up graceful shutdown handlers
      this.setupShutdownHandlers();
      
      logger.info('✅ AI Crypto Trading Agent initialized successfully');
      logger.info('🎯 System ready for 24/7 trading operations');
      
    } catch (error) {
      logger.error('❌ Failed to initialize AI Crypto Trading Agent:', error);
      await this.emergencyShutdown();
      throw error;
    }
  }

  /**
   * Register system dependencies with the dependency manager
   */
  private registerDependencies(): void {
    logger.info('📋 Registering system dependencies...');

    // Register core services
    registerSingleton(
      DependencyTokens.SECURITY_MANAGER,
      () => new SecurityManager(),
      [],
      ['core', 'security'],
      1 // Highest priority
    );

    registerSingleton(
      DependencyTokens.SYSTEM_MONITOR,
      () => new SystemMonitor(),
      [],
      ['core', 'infrastructure'],
      2
    );

    registerSingleton(
      DependencyTokens.TUNNEL_MANAGER,
      () => new TunnelManager(),
      [DependencyTokens.SECURITY_MANAGER],
      ['core', 'infrastructure'],
      3
    );

    registerSingleton(
      DependencyTokens.TRADING_ENGINE,
      () => new TradingEngine(),
      [DependencyTokens.SECURITY_MANAGER, DependencyTokens.TUNNEL_MANAGER],
      ['core', 'trading'],
      4
    );

    logger.info('✅ System dependencies registered');
  }

  /**
   * Register system components with the orchestrator
   */
  private registerComponents(): void {
    logger.info('📋 Registering system components...');

    // Create component wrappers that implement SystemComponent interface
    const securityComponent = this.createComponentWrapper(
      'security-manager',
      DependencyTokens.SECURITY_MANAGER,
      [],
      1
    );

    const systemMonitorComponent = this.createComponentWrapper(
      'system-monitor',
      DependencyTokens.SYSTEM_MONITOR,
      ['security-manager'],
      2
    );

    const tunnelComponent = this.createComponentWrapper(
      'tunnel-manager',
      DependencyTokens.TUNNEL_MANAGER,
      ['security-manager'],
      3
    );

    const tradingComponent = this.createComponentWrapper(
      'trading-engine',
      DependencyTokens.TRADING_ENGINE,
      ['security-manager', 'tunnel-manager'],
      4
    );

    // Register components
    this.orchestrator.registerComponent(securityComponent);
    this.orchestrator.registerComponent(systemMonitorComponent);
    this.orchestrator.registerComponent(tunnelComponent);
    this.orchestrator.registerComponent(tradingComponent);

    // Register components for health monitoring
    this.healthMonitor.registerComponent(securityComponent);
    this.healthMonitor.registerComponent(systemMonitorComponent);
    this.healthMonitor.registerComponent(tunnelComponent);
    this.healthMonitor.registerComponent(tradingComponent);

    logger.info('✅ System components registered');
  }

  /**
   * Create a component wrapper that implements SystemComponent interface
   */
  private createComponentWrapper(
    id: string,
    dependencyToken: any,
    dependencies: string[],
    priority: number
  ): any {
    return {
      id,
      dependencies,
      priority,
      status: 'UNINITIALIZED' as any,
      name: id,
      
      async initialize(): Promise<void> {
        const instance = await dependencyManager.resolve(dependencyToken);
        if (instance && typeof instance.initialize === 'function') {
          await instance.initialize();
        }
        this.status = 'RUNNING';
      },

      async shutdown(): Promise<void> {
        const instance = await dependencyManager.resolve(dependencyToken);
        if (instance && typeof instance.shutdown === 'function') {
          await instance.shutdown();
        }
        this.status = 'STOPPED';
      },

      async healthCheck(): Promise<any> {
        const instance = await dependencyManager.resolve(dependencyToken);
        if (instance && typeof instance.healthCheck === 'function') {
          return await instance.healthCheck();
        }
        return {
          healthy: true,
          score: 100,
          details: {},
          lastCheck: new Date(),
          issues: [],
          recommendations: []
        };
      }
    };
  }

  /**
   * Load and validate environment configuration
   * Ensures all required environment variables are present and valid
   */
  private async loadConfiguration(): Promise<void> {
    logger.info('📋 Loading configuration...');
    
    // Load environment variables from .env file
    config({ path: resolve(process.cwd(), '.env') });
    
    // Validate all required environment variables
    const validationResult = await validateEnvironment();
    
    if (!validationResult.isValid) {
      logger.error('❌ Environment validation failed:', validationResult.errors);
      throw new Error('Invalid environment configuration');
    }
    
    logger.info('✅ Configuration loaded and validated successfully');
  }



  /**
   * Set up graceful shutdown handlers for clean system termination
   * Ensures all positions are safely closed and data is preserved
   */
  private setupShutdownHandlers(): void {
    // Handle various shutdown signals
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
    process.on('SIGHUP', () => this.handleShutdown('SIGHUP'));
    
    // Handle uncaught exceptions and rejections
    process.on('uncaughtException', (error) => {
      logger.error('❌ Uncaught exception:', error);
      this.handleShutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
      this.handleShutdown('UNHANDLED_REJECTION');
    });
  }

  /**
   * Handle shutdown signals with proper cleanup
   * Ensures safe termination of all trading operations
   * 
   * @param signal - The shutdown signal received
   */
  private async handleShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('⚠️ Shutdown already in progress, ignoring signal:', signal);
      return;
    }
    
    this.isShuttingDown = true;
    logger.info(`🛑 Received shutdown signal: ${signal}`);
    
    try {
      // Stop health monitoring
      await this.healthMonitor.stopMonitoring();
      
      // Stop system orchestration
      await this.orchestrator.stopSystem();
      
      // Shutdown communication bus
      await communicationBus.shutdown();
      
      // Shutdown dependency manager
      await dependencyManager.shutdown();
      
      logger.info('✅ Graceful shutdown completed successfully');
      process.exit(0);
      
    } catch (error) {
      logger.error('❌ Error during graceful shutdown:', error);
      await this.emergencyShutdown();
      process.exit(1);
    }
  }

  /**
   * Emergency shutdown procedure for critical failures
   * Immediately stops all operations and secures assets
   */
  private async emergencyShutdown(): Promise<void> {
    logger.error('🚨 EMERGENCY SHUTDOWN INITIATED');
    
    try {
      // Stop all orchestration immediately
      await this.orchestrator.stopSystem();
      
      // Send emergency notifications via communication bus
      await communicationBus.publish('system.emergency.shutdown', {
        timestamp: new Date(),
        reason: 'EMERGENCY_SHUTDOWN'
      }, {
        priority: 4, // EMERGENCY priority
        source: 'ai-trading-agent'
      });
      
    } catch (error) {
      logger.error('❌ Error during emergency shutdown:', error);
    }
  }

  /**
   * Start the main trading loop
   * Begins continuous trading operations with monitoring
   */
  public async start(): Promise<void> {
    logger.info('🎯 Starting AI Crypto Trading Agent main loop...');
    
    // The orchestrator has already started all components
    // Just wait for system ready event
    await new Promise<void>((resolve) => {
      this.orchestrator.once('system:ready', () => {
        resolve();
      });
    });
    
    logger.info('🚀 AI Crypto Trading Agent is now running 24/7');
    logger.info('💰 Focus: Capital preservation and profit maximization');
    logger.info('🎯 Goal: Building generational wealth through compound returns');
  }
}

/**
 * Main execution function
 * Entry point for the entire trading system
 */
async function main(): Promise<void> {
  try {
    // Create and initialize the trading agent
    const tradingAgent = new AITradingAgent();
    await tradingAgent.initialize();
    
    // Start trading operations
    await tradingAgent.start();
    
  } catch (error) {
    logger.error('❌ Fatal error in main execution:', error);
    process.exit(1);
  }
}

// Start the application if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal startup error:', error);
    process.exit(1);
  });
}

export { AITradingAgent };

// =============================================================================
// SECURITY AND OPERATIONAL NOTES
// =============================================================================
// 1. This system handles real financial assets - security is paramount
// 2. All errors are logged and monitored for security analysis
// 3. Graceful shutdown ensures no trading positions are left unmanaged
// 4. Emergency shutdown procedures protect capital in critical situations
// 5. System is designed for 24/7 operation with automatic recovery
// 6. Regular security audits and updates are essential
// 7. Monitor system logs continuously for any suspicious activity
// =============================================================================
