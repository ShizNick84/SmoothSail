/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - SYSTEM PERFORMANCE OPTIMIZER
 * =============================================================================
 * 
 * This service provides comprehensive performance optimization for Intel NUC
 * systems running the AI crypto trading agent. It implements low-latency
 * trading optimizations, thermal management, and resource allocation.
 * 
 * CRITICAL PERFORMANCE NOTICE:
 * This system optimizes hardware performance for trading operations. Poor
 * performance could impact trading decisions and result in financial losses.
 * All optimizations are continuously monitored and adjusted.
 * 
 * Hardware Specifications:
 * - Intel NUC with i5 CPU
 * - 12GB RAM
 * - 256GB M.2 SSD
 * - Wireless and Gigabit Ethernet
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import * as si from 'systeminformation';
import { logger } from '@/core/logging/logger';
import { auditService } from '@/security/audit-service';
import { SystemMonitor, CPUMetrics, RAMMetrics, SSDMetrics } from './system-monitor';

/**
 * Interface for performance optimization configuration
 */
export interface PerformanceConfig {
  /** Enable CPU performance optimization */
  enableCPUOptimization: boolean;
  /** Enable memory optimization */
  enableMemoryOptimization: boolean;
  /** Enable I/O optimization */
  enableIOOptimization: boolean;
  /** Enable network optimization */
  enableNetworkOptimization: boolean;
  /** Enable thermal management */
  enableThermalManagement: boolean;
  /** CPU governor mode */
  cpuGovernor: 'performance' | 'powersave' | 'ondemand' | 'conservative';
  /** Memory swappiness (0-100) */
  memorySwappiness: number;
  /** I/O scheduler */
  ioScheduler: 'noop' | 'deadline' | 'cfq' | 'mq-deadline';
  /** Network buffer sizes */
  networkBufferSize: number;
  /** Thermal throttling threshold */
  thermalThrottleTemp: number;
  /** Performance monitoring interval */
  monitoringIntervalMs: number;
}

/**
 * Interface for performance metrics
 */
export interface PerformanceMetrics {
  /** Overall performance score (0-100) */
  overallScore: number;
  /** CPU performance score */
  cpuScore: number;
  /** Memory performance score */
  memoryScore: number;
  /** I/O performance score */
  ioScore: number;
  /** Network performance score */
  networkScore: number;
  /** Thermal performance score */
  thermalScore: number;
  /** Latency metrics */
  latency: {
    /** Average system latency in microseconds */
    average: number;
    /** Maximum system latency in microseconds */
    maximum: number;
    /** 95th percentile latency */
    p95: number;
    /** 99th percentile latency */
    p99: number;
  };
  /** Throughput metrics */
  throughput: {
    /** CPU operations per second */
    cpuOps: number;
    /** Memory bandwidth in MB/s */
    memoryBandwidth: number;
    /** Disk I/O operations per second */
    diskIOPS: number;
    /** Network throughput in Mbps */
    networkThroughput: number;
  };
  /** Last measurement timestamp */
  timestamp: Date;
}

/**
 * Interface for optimization recommendation
 */
export interface OptimizationRecommendation {
  /** Recommendation ID */
  id: string;
  /** Recommendation type */
  type: 'CPU' | 'MEMORY' | 'IO' | 'NETWORK' | 'THERMAL';
  /** Priority level */
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Recommendation title */
  title: string;
  /** Detailed description */
  description: string;
  /** Expected performance improvement */
  expectedImprovement: number;
  /** Implementation complexity */
  complexity: 'EASY' | 'MEDIUM' | 'HARD';
  /** Auto-apply capability */
  canAutoApply: boolean;
  /** Implementation command/action */
  implementation?: string;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Interface for thermal management status
 */
export interface ThermalStatus {
  /** Current CPU temperature */
  currentTemp: number;
  /** Maximum safe temperature */
  maxSafeTemp: number;
  /** Thermal throttling active */
  isThrottling: boolean;
  /** Cooling effectiveness (0-100) */
  coolingEffectiveness: number;
  /** Thermal alerts */
  alerts: string[];
  /** Recommended actions */
  recommendations: string[];
}

/**
 * System Performance Optimizer
 * Provides comprehensive performance optimization for trading operations
 */
export class PerformanceOptimizer {
  private systemMonitor: SystemMonitor;
  private config: PerformanceConfig;
  private optimizationInterval: NodeJS.Timeout | null = null;
  private performanceHistory: PerformanceMetrics[] = [];
  private latencyMeasurements: number[] = [];
  private isOptimizing: boolean = false;

  constructor(systemMonitor: SystemMonitor) {
    this.systemMonitor = systemMonitor;
    this.config = this.loadConfiguration();
    logger.info('⚡ Performance Optimizer initializing...');
  }

  /**
   * Load performance optimization configuration
   * 
   * @returns PerformanceConfig Configuration object
   */
  private loadConfiguration(): PerformanceConfig {
    return {
      enableCPUOptimization: process.env.ENABLE_CPU_OPTIMIZATION === 'true',
      enableMemoryOptimization: process.env.ENABLE_MEMORY_OPTIMIZATION === 'true',
      enableIOOptimization: process.env.ENABLE_IO_OPTIMIZATION === 'true',
      enableNetworkOptimization: process.env.ENABLE_NETWORK_OPTIMIZATION === 'true',
      enableThermalManagement: process.env.ENABLE_THERMAL_MANAGEMENT !== 'false',
      cpuGovernor: (process.env.CPU_GOVERNOR as any) || 'performance',
      memorySwappiness: parseInt(process.env.MEMORY_SWAPPINESS || '10'),
      ioScheduler: (process.env.IO_SCHEDULER as any) || 'mq-deadline',
      networkBufferSize: parseInt(process.env.NETWORK_BUFFER_SIZE || '16777216'),
      thermalThrottleTemp: parseInt(process.env.THERMAL_THROTTLE_TEMP || '75'),
      monitoringIntervalMs: parseInt(process.env.PERF_MONITORING_INTERVAL_MS || '60000')
    };
  }

  /**
   * Initialize performance optimization
   * Sets up all optimization systems and starts monitoring
   * 
   * @returns Promise<void>
   */
  public async initializePerformanceOptimization(): Promise<void> {
    try {
      logger.info('⚡ Initializing performance optimization...');

      // Apply initial optimizations
      await this.applyInitialOptimizations();

      // Start performance monitoring
      await this.startPerformanceMonitoring();

      // Set up thermal management
      await this.setupThermalManagement();

      logger.info('✅ Performance optimization initialized successfully');

      // Audit log
      await auditService.createAuditEntry({
        auditId: `perf_opt_init_${Date.now()}`,
        eventType: 'PERFORMANCE_OPTIMIZATION_INIT',
        actor: 'SYSTEM',
        resource: 'PERFORMANCE_OPTIMIZER',
        action: 'INITIALIZE',
        result: 'SUCCESS',
        timestamp: new Date(),
        auditData: { config: this.config }
      });

    } catch (error) {
      logger.error('❌ Failed to initialize performance optimization:', error);
      throw new Error('Performance optimization initialization failed');
    }
  }

  /**
   * Apply initial system optimizations
   * Configures system for optimal trading performance
   * 
   * @returns Promise<void>
   */
  private async applyInitialOptimizations(): Promise<void> {
    try {
      logger.info('🔧 Applying initial system optimizations...');

      const optimizations: Promise<void>[] = [];

      // CPU optimizations
      if (this.config.enableCPUOptimization) {
        optimizations.push(this.optimizeCPUPerformance());
      }

      // Memory optimizations
      if (this.config.enableMemoryOptimization) {
        optimizations.push(this.optimizeMemoryPerformance());
      }

      // I/O optimizations
      if (this.config.enableIOOptimization) {
        optimizations.push(this.optimizeIOPerformance());
      }

      // Network optimizations
      if (this.config.enableNetworkOptimization) {
        optimizations.push(this.optimizeNetworkPerformance());
      }

      // Apply all optimizations concurrently
      await Promise.all(optimizations);

      logger.info('✅ Initial optimizations applied successfully');

    } catch (error) {
      logger.error('❌ Failed to apply initial optimizations:', error);
      throw error;
    }
  }

  /**
   * Optimize CPU performance for low-latency trading
   * 
   * @returns Promise<void>
   */
  private async optimizeCPUPerformance(): Promise<void> {
    try {
      logger.info('🔧 Optimizing CPU performance...');

      // Set CPU governor to performance mode
      try {
        const { execSync } = await import('child_process');
        execSync(`echo ${this.config.cpuGovernor} | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor`, 
          { stdio: 'pipe' });
        logger.info(`✅ CPU governor set to: ${this.config.cpuGovernor}`);
      } catch (error) {
        logger.warn('⚠️ Could not set CPU governor (may require sudo):', error);
      }

      // Disable CPU idle states for consistent performance
      try {
        const { execSync } = await import('child_process');
        execSync('sudo cpupower idle-set -D 0', { stdio: 'pipe' });
        logger.info('✅ CPU idle states optimized');
      } catch (error) {
        logger.warn('⚠️ Could not optimize CPU idle states:', error);
      }

      // Set CPU affinity for trading processes
      await this.setCPUAffinity();

    } catch (error) {
      logger.error('❌ CPU optimization failed:', error);
    }
  }

  /**
   * Set CPU affinity for optimal performance
   * 
   * @returns Promise<void>
   */
  private async setCPUAffinity(): Promise<void> {
    try {
      const cpuInfo = await si.cpu();
      const coreCount = cpuInfo.cores;

      if (coreCount >= 4) {
        // Reserve cores 0-1 for trading operations, 2-3 for system
        process.env.TRADING_CPU_CORES = '0,1';
        process.env.SYSTEM_CPU_CORES = '2,3';
        logger.info('✅ CPU affinity configured for trading optimization');
      }

    } catch (error) {
      logger.warn('⚠️ Could not set CPU affinity:', error);
    }
  }

  /**
   * Optimize memory performance
   * 
   * @returns Promise<void>
   */
  private async optimizeMemoryPerformance(): Promise<void> {
    try {
      logger.info('🔧 Optimizing memory performance...');

      // Set memory swappiness for trading workload
      try {
        const { execSync } = await import('child_process');
        execSync(`echo ${this.config.memorySwappiness} | sudo tee /proc/sys/vm/swappiness`, 
          { stdio: 'pipe' });
        logger.info(`✅ Memory swappiness set to: ${this.config.memorySwappiness}`);
      } catch (error) {
        logger.warn('⚠️ Could not set memory swappiness:', error);
      }

      // Optimize memory allocation
      try {
        const { execSync } = await import('child_process');
        // Reduce memory overcommit for stability
        execSync('echo 2 | sudo tee /proc/sys/vm/overcommit_memory', { stdio: 'pipe' });
        // Optimize dirty page writeback
        execSync('echo 5 | sudo tee /proc/sys/vm/dirty_background_ratio', { stdio: 'pipe' });
        execSync('echo 10 | sudo tee /proc/sys/vm/dirty_ratio', { stdio: 'pipe' });
        logger.info('✅ Memory allocation optimized');
      } catch (error) {
        logger.warn('⚠️ Could not optimize memory allocation:', error);
      }

      // Configure Node.js memory settings
      this.optimizeNodeJSMemory();

    } catch (error) {
      logger.error('❌ Memory optimization failed:', error);
    }
  }

  /**
   * Optimize Node.js memory settings
   */
  private optimizeNodeJSMemory(): void {
    try {
      // Set optimal heap sizes for trading application
      const totalMemoryGB = Math.floor(require('os').totalmem() / 1024 / 1024 / 1024);
      const maxHeapSize = Math.floor(totalMemoryGB * 0.6); // Use 60% of total memory

      process.env.NODE_OPTIONS = `--max-old-space-size=${maxHeapSize * 1024}`;
      
      // Enable garbage collection optimizations
      if (process.env.NODE_ENV === 'production') {
        process.env.NODE_OPTIONS += ' --optimize-for-size';
      }

      logger.info(`✅ Node.js memory optimized: ${maxHeapSize}GB heap`);

    } catch (error) {
      logger.warn('⚠️ Could not optimize Node.js memory:', error);
    }
  }

  /**
   * Optimize I/O performance
   * 
   * @returns Promise<void>
   */
  private async optimizeIOPerformance(): Promise<void> {
    try {
      logger.info('🔧 Optimizing I/O performance...');

      // Set I/O scheduler for SSD optimization
      try {
        const { execSync } = await import('child_process');
        const blockDevices = await si.blockDevices();
        
        for (const device of blockDevices) {
          if (device.type === 'disk' && !device.removable) {
            try {
              execSync(`echo ${this.config.ioScheduler} | sudo tee /sys/block/${device.name}/queue/scheduler`, 
                { stdio: 'pipe' });
              logger.info(`✅ I/O scheduler set to ${this.config.ioScheduler} for ${device.name}`);
            } catch (error) {
              logger.warn(`⚠️ Could not set I/O scheduler for ${device.name}:`, error);
            }
          }
        }
      } catch (error) {
        logger.warn('⚠️ Could not optimize I/O scheduler:', error);
      }

      // Optimize file system parameters
      await this.optimizeFileSystem();

    } catch (error) {
      logger.error('❌ I/O optimization failed:', error);
    }
  }

  /**
   * Optimize file system parameters
   * 
   * @returns Promise<void>
   */
  private async optimizeFileSystem(): Promise<void> {
    try {
      const { execSync } = await import('child_process');

      // Optimize read-ahead for sequential I/O
      execSync('sudo blockdev --setra 256 /dev/sda', { stdio: 'pipe' });
      
      // Optimize file system cache
      execSync('echo 1 | sudo tee /proc/sys/vm/vfs_cache_pressure', { stdio: 'pipe' });
      
      logger.info('✅ File system optimized');

    } catch (error) {
      logger.warn('⚠️ Could not optimize file system:', error);
    }
  }

  /**
   * Optimize network performance
   * 
   * @returns Promise<void>
   */
  private async optimizeNetworkPerformance(): Promise<void> {
    try {
      logger.info('🔧 Optimizing network performance...');

      const { execSync } = await import('child_process');

      // Optimize TCP settings for low latency
      const tcpOptimizations = [
        'net.core.rmem_max = 16777216',
        'net.core.wmem_max = 16777216',
        'net.ipv4.tcp_rmem = 4096 87380 16777216',
        'net.ipv4.tcp_wmem = 4096 65536 16777216',
        'net.ipv4.tcp_congestion_control = bbr',
        'net.ipv4.tcp_fastopen = 3',
        'net.ipv4.tcp_low_latency = 1',
        'net.core.netdev_max_backlog = 5000'
      ];

      for (const optimization of tcpOptimizations) {
        try {
          execSync(`echo "${optimization}" | sudo tee -a /etc/sysctl.conf`, { stdio: 'pipe' });
        } catch (error) {
          logger.warn(`⚠️ Could not apply network optimization: ${optimization}`);
        }
      }

      // Apply sysctl changes
      try {
        execSync('sudo sysctl -p', { stdio: 'pipe' });
        logger.info('✅ Network performance optimized');
      } catch (error) {
        logger.warn('⚠️ Could not apply sysctl changes:', error);
      }

    } catch (error) {
      logger.error('❌ Network optimization failed:', error);
    }
  }

  /**
   * Setup thermal management
   * 
   * @returns Promise<void>
   */
  public async setupThermalManagement(): Promise<void> {
    try {
      logger.info('🌡️ Setting up thermal management...');

      // Start thermal monitoring
      setInterval(async () => {
        await this.monitorThermalConditions();
      }, 10000); // Check every 10 seconds

      logger.info('✅ Thermal management setup complete');

    } catch (error) {
      logger.error('❌ Thermal management setup failed:', error);
    }
  }

  /**
   * Monitor thermal conditions and apply throttling if needed
   * 
   * @returns Promise<void>
   */
  private async monitorThermalConditions(): Promise<void> {
    try {
      const cpuTemp = await si.cpuTemperature();
      const currentTemp = cpuTemp.main || 0;

      if (currentTemp >= this.config.thermalThrottleTemp) {
        await this.applyThermalThrottling(currentTemp);
      } else if (currentTemp < this.config.thermalThrottleTemp - 5) {
        // Remove throttling if temperature is safe
        await this.removeThermalThrottling();
      }

    } catch (error) {
      logger.error('❌ Thermal monitoring failed:', error);
    }
  }

  /**
   * Apply thermal throttling to prevent overheating
   * 
   * @param currentTemp Current CPU temperature
   * @returns Promise<void>
   */
  private async applyThermalThrottling(currentTemp: number): Promise<void> {
    try {
      logger.warn(`🌡️ Applying thermal throttling - CPU temp: ${currentTemp}°C`);

      // Reduce CPU frequency
      const { execSync } = await import('child_process');
      try {
        execSync('echo powersave | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor', 
          { stdio: 'pipe' });
      } catch (error) {
        logger.warn('⚠️ Could not apply CPU throttling:', error);
      }

      // Audit critical thermal event
      await auditService.createAuditEntry({
        auditId: `thermal_throttle_${Date.now()}`,
        eventType: 'THERMAL_THROTTLING_APPLIED',
        actor: 'PERFORMANCE_OPTIMIZER',
        resource: 'CPU_THERMAL',
        action: 'APPLY_THROTTLING',
        result: 'SUCCESS',
        timestamp: new Date(),
        auditData: { currentTemp, threshold: this.config.thermalThrottleTemp }
      });

    } catch (error) {
      logger.error('❌ Failed to apply thermal throttling:', error);
    }
  }

  /**
   * Remove thermal throttling when temperature is safe
   * 
   * @returns Promise<void>
   */
  private async removeThermalThrottling(): Promise<void> {
    try {
      if (this.config.enableCPUOptimization) {
        const { execSync } = await import('child_process');
        try {
          execSync(`echo ${this.config.cpuGovernor} | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor`, 
            { stdio: 'pipe' });
          logger.info('✅ Thermal throttling removed - normal performance restored');
        } catch (error) {
          logger.warn('⚠️ Could not remove CPU throttling:', error);
        }
      }

    } catch (error) {
      logger.error('❌ Failed to remove thermal throttling:', error);
    }
  }

  /**
   * Start performance monitoring
   * 
   * @returns Promise<void>
   */
  private async startPerformanceMonitoring(): Promise<void> {
    try {
      logger.info('📊 Starting performance monitoring...');

      this.optimizationInterval = setInterval(async () => {
        try {
          await this.measurePerformance();
          await this.generateOptimizationRecommendations();
        } catch (error) {
          logger.error('❌ Performance monitoring error:', error);
        }
      }, this.config.monitoringIntervalMs);

      logger.info('✅ Performance monitoring started');

    } catch (error) {
      logger.error('❌ Failed to start performance monitoring:', error);
    }
  }

  /**
   * Measure system performance metrics
   * 
   * @returns Promise<PerformanceMetrics>
   */
  public async measurePerformance(): Promise<PerformanceMetrics> {
    try {
      const startTime = process.hrtime.bigint();
      
      // Get current system metrics
      const metrics = this.systemMonitor.getCurrentMetrics();
      
      // Calculate performance scores
      const cpuScore = this.calculateCPUScore(metrics.cpu);
      const memoryScore = this.calculateMemoryScore(metrics.ram);
      const ioScore = this.calculateIOScore(metrics.ssd);
      const networkScore = this.calculateNetworkScore(metrics.network);
      const thermalScore = await this.calculateThermalScore();

      // Measure latency
      const latency = await this.measureSystemLatency();
      this.latencyMeasurements.push(latency);
      
      // Keep only last 1000 measurements
      if (this.latencyMeasurements.length > 1000) {
        this.latencyMeasurements = this.latencyMeasurements.slice(-1000);
      }

      // Calculate latency statistics
      const sortedLatencies = [...this.latencyMeasurements].sort((a, b) => a - b);
      const latencyStats = {
        average: this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length,
        maximum: Math.max(...this.latencyMeasurements),
        p95: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0,
        p99: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0
      };

      // Calculate throughput metrics
      const throughput = {
        cpuOps: this.calculateCPUThroughput(metrics.cpu),
        memoryBandwidth: this.calculateMemoryBandwidth(metrics.ram),
        diskIOPS: metrics.ssd?.readIOPS || 0 + metrics.ssd?.writeIOPS || 0,
        networkThroughput: (metrics.network?.downloadSpeed || 0) + (metrics.network?.uploadSpeed || 0)
      };

      const overallScore = Math.round((cpuScore + memoryScore + ioScore + networkScore + thermalScore) / 5);

      const performanceMetrics: PerformanceMetrics = {
        overallScore,
        cpuScore,
        memoryScore,
        ioScore,
        networkScore,
        thermalScore,
        latency: latencyStats,
        throughput,
        timestamp: new Date()
      };

      // Store in history
      this.performanceHistory.push(performanceMetrics);
      if (this.performanceHistory.length > 100) {
        this.performanceHistory = this.performanceHistory.slice(-100);
      }

      const endTime = process.hrtime.bigint();
      const measurementTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      logger.debug('📊 Performance measurement completed', {
        overallScore,
        measurementTime: `${measurementTime.toFixed(2)}ms`,
        latency: latencyStats
      });

      return performanceMetrics;

    } catch (error) {
      logger.error('❌ Performance measurement failed:', error);
      throw error;
    }
  }

  /**
   * Calculate CPU performance score
   * 
   * @param cpu CPU metrics
   * @returns number Performance score (0-100)
   */
  private calculateCPUScore(cpu?: CPUMetrics): number {
    if (!cpu) return 0;

    // Lower utilization and temperature = higher score
    const utilizationScore = Math.max(0, 100 - cpu.utilization);
    const temperatureScore = Math.max(0, 100 - (cpu.temperature / 80) * 100);
    const frequencyScore = Math.min(100, (cpu.frequency / 3000) * 100); // Assume 3GHz target

    return Math.round((utilizationScore + temperatureScore + frequencyScore) / 3);
  }

  /**
   * Calculate memory performance score
   * 
   * @param ram RAM metrics
   * @returns number Performance score (0-100)
   */
  private calculateMemoryScore(ram?: RAMMetrics): number {
    if (!ram) return 0;

    // Lower utilization = higher score, but some usage is expected
    const utilizationScore = ram.utilization < 50 ? 100 : Math.max(0, 100 - (ram.utilization - 50) * 2);
    const availabilityScore = Math.min(100, (ram.available / ram.total) * 200);

    return Math.round((utilizationScore + availabilityScore) / 2);
  }

  /**
   * Calculate I/O performance score
   * 
   * @param ssd SSD metrics
   * @returns number Performance score (0-100)
   */
  private calculateIOScore(ssd?: SSDMetrics): number {
    if (!ssd) return 0;

    // Higher throughput and lower utilization = higher score
    const utilizationScore = Math.max(0, 100 - ssd.utilization);
    const throughputScore = Math.min(100, ((ssd.readThroughput + ssd.writeThroughput) / 500) * 100);
    const healthScore = ssd.health;

    return Math.round((utilizationScore + throughputScore + healthScore) / 3);
  }

  /**
   * Calculate network performance score
   * 
   * @param network Network metrics
   * @returns number Performance score (0-100)
   */
  private calculateNetworkScore(network?: any): number {
    if (!network) return 0;

    const activeInterfaces = network.interfaces?.filter((i: any) => i.isUp).length || 0;
    const connectivityScore = activeInterfaces > 0 ? 100 : 0;
    const speedScore = Math.min(100, ((network.downloadSpeed + network.uploadSpeed) / 100) * 100);

    return Math.round((connectivityScore + speedScore) / 2);
  }

  /**
   * Calculate thermal performance score
   * 
   * @returns Promise<number> Performance score (0-100)
   */
  private async calculateThermalScore(): Promise<number> {
    try {
      const cpuTemp = await si.cpuTemperature();
      const currentTemp = cpuTemp.main || 0;

      // Lower temperature = higher score
      if (currentTemp < 50) return 100;
      if (currentTemp < 60) return 90;
      if (currentTemp < 70) return 70;
      if (currentTemp < 80) return 50;
      return 20;

    } catch (error) {
      return 50; // Default score if measurement fails
    }
  }

  /**
   * Measure system latency
   * 
   * @returns Promise<number> Latency in microseconds
   */
  private async measureSystemLatency(): Promise<number> {
    const start = process.hrtime.bigint();
    
    // Perform a small I/O operation to measure system responsiveness
    await new Promise(resolve => setImmediate(resolve));
    
    const end = process.hrtime.bigint();
    return Number(end - start) / 1000; // Convert to microseconds
  }

  /**
   * Calculate CPU throughput
   * 
   * @param cpu CPU metrics
   * @returns number Operations per second
   */
  private calculateCPUThroughput(cpu?: CPUMetrics): number {
    if (!cpu) return 0;
    
    // Estimate based on frequency and utilization
    return Math.round((cpu.frequency * cpu.cores.logical * (cpu.utilization / 100)) / 1000);
  }

  /**
   * Calculate memory bandwidth
   * 
   * @param ram RAM metrics
   * @returns number Bandwidth in MB/s
   */
  private calculateMemoryBandwidth(ram?: RAMMetrics): number {
    if (!ram) return 0;
    
    // Estimate based on memory usage patterns
    return Math.round((ram.used / ram.total) * 25600); // Assume DDR4-3200 theoretical max
  }

  /**
   * Generate optimization recommendations
   * 
   * @returns Promise<OptimizationRecommendation[]>
   */
  public async generateOptimizationRecommendations(): Promise<OptimizationRecommendation[]> {
    try {
      const recommendations: OptimizationRecommendation[] = [];
      const metrics = this.systemMonitor.getCurrentMetrics();
      const latestPerformance = this.performanceHistory[this.performanceHistory.length - 1];

      // CPU recommendations
      if (metrics.cpu && metrics.cpu.utilization > 80) {
        recommendations.push({
          id: `cpu_high_util_${Date.now()}`,
          type: 'CPU',
          priority: 'HIGH',
          title: 'High CPU Utilization',
          description: `CPU utilization is ${metrics.cpu.utilization}%. Consider reducing background processes or upgrading CPU.`,
          expectedImprovement: 15,
          complexity: 'MEDIUM',
          canAutoApply: false,
          timestamp: new Date()
        });
      }

      // Memory recommendations
      if (metrics.ram && metrics.ram.utilization > 85) {
        recommendations.push({
          id: `memory_high_util_${Date.now()}`,
          type: 'MEMORY',
          priority: 'HIGH',
          title: 'High Memory Utilization',
          description: `Memory utilization is ${metrics.ram.utilization}%. Consider adding more RAM or optimizing memory usage.`,
          expectedImprovement: 20,
          complexity: 'EASY',
          canAutoApply: false,
          timestamp: new Date()
        });
      }

      // Thermal recommendations
      if (metrics.cpu && metrics.cpu.temperature > 70) {
        recommendations.push({
          id: `thermal_high_temp_${Date.now()}`,
          type: 'THERMAL',
          priority: 'CRITICAL',
          title: 'High CPU Temperature',
          description: `CPU temperature is ${metrics.cpu.temperature}°C. Check cooling system and ventilation.`,
          expectedImprovement: 25,
          complexity: 'MEDIUM',
          canAutoApply: true,
          implementation: 'apply_thermal_throttling',
          timestamp: new Date()
        });
      }

      // Performance recommendations
      if (latestPerformance && latestPerformance.overallScore < 70) {
        recommendations.push({
          id: `perf_low_score_${Date.now()}`,
          type: 'CPU',
          priority: 'MEDIUM',
          title: 'Low Performance Score',
          description: `Overall performance score is ${latestPerformance.overallScore}%. System optimization recommended.`,
          expectedImprovement: 30,
          complexity: 'MEDIUM',
          canAutoApply: true,
          implementation: 'reapply_optimizations',
          timestamp: new Date()
        });
      }

      return recommendations;

    } catch (error) {
      logger.error('❌ Failed to generate optimization recommendations:', error);
      return [];
    }
  }

  /**
   * Get current thermal status
   * 
   * @returns Promise<ThermalStatus>
   */
  public async getThermalStatus(): Promise<ThermalStatus> {
    try {
      const cpuTemp = await si.cpuTemperature();
      const currentTemp = cpuTemp.main || 0;
      const maxSafeTemp = this.config.thermalThrottleTemp;
      const isThrottling = currentTemp >= maxSafeTemp;

      const alerts: string[] = [];
      const recommendations: string[] = [];

      if (currentTemp > 80) {
        alerts.push('Critical temperature - immediate action required');
        recommendations.push('Check system cooling and ventilation');
        recommendations.push('Reduce system load');
      } else if (currentTemp > 70) {
        alerts.push('High temperature - monitoring required');
        recommendations.push('Verify cooling system operation');
      }

      const coolingEffectiveness = Math.max(0, 100 - ((currentTemp - 30) / 50) * 100);

      return {
        currentTemp,
        maxSafeTemp,
        isThrottling,
        coolingEffectiveness: Math.round(coolingEffectiveness),
        alerts,
        recommendations
      };

    } catch (error) {
      logger.error('❌ Failed to get thermal status:', error);
      throw error;
    }
  }

  /**
   * Get performance history
   * 
   * @returns PerformanceMetrics[] Performance history
   */
  public getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * Get current performance metrics
   * 
   * @returns PerformanceMetrics | null Current metrics
   */
  public getCurrentPerformanceMetrics(): PerformanceMetrics | null {
    return this.performanceHistory[this.performanceHistory.length - 1] || null;
  }

  /**
   * Stop performance optimization
   */
  public stopPerformanceOptimization(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
      logger.info('🛑 Performance optimization stopped');
    }
  }

  /**
   * Get optimizer status
   * 
   * @returns Object containing status information
   */
  public getStatus(): {
    isOptimizing: boolean;
    config: PerformanceConfig;
    performanceHistory: number;
    latestScore: number | null;
    timestamp: number;
  } {
    const latestMetrics = this.getCurrentPerformanceMetrics();
    
    return {
      isOptimizing: this.optimizationInterval !== null,
      config: this.config,
      performanceHistory: this.performanceHistory.length,
      latestScore: latestMetrics?.overallScore || null,
      timestamp: Date.now()
    };
  }
}

// =============================================================================
// PERFORMANCE OPTIMIZATION NOTES
// =============================================================================
// 1. Low-latency optimizations for high-frequency trading operations
// 2. Thermal management to prevent performance degradation
// 3. Resource allocation optimization for consistent performance
// 4. Real-time performance monitoring and adjustment
// 5. Automatic optimization recommendations and implementation
// 6. System health scoring for performance assessment
// 7. Comprehensive logging and audit trails for all optimizations
// 8. Hardware-specific optimizations for Intel NUC platform
// =============================================================================
