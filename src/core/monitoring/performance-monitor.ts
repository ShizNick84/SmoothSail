/**
 * =============================================================================
 * INTEL NUC PERFORMANCE MONITORING SERVICE
 * =============================================================================
 * 
 * This service monitors Intel NUC hardware performance, network connectivity,
 * database performance, and application metrics with comprehensive logging.
 * 
 * Features:
 * - Intel NUC hardware monitoring (CPU, RAM, temperature)
 * - Network latency and SSH tunnel performance
 * - Database performance and query timing
 * - Application resource usage tracking
 * - Automated alerting and threshold management
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { tradingLogger, SystemPerformanceContext } from '../logging/trading-logger';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs/promises';
import { performance } from 'perf_hooks';

const execAsync = promisify(exec);

/**
 * Performance thresholds interface
 */
interface PerformanceThresholds {
  cpu: { warning: number; critical: number };
  memory: { warning: number; critical: number };
  disk: { warning: number; critical: number };
  temperature: { warning: number; critical: number };
  network: { warning: number; critical: number };
  database: { warning: number; critical: number };
}

/**
 * Hardware information interface
 */
interface HardwareInfo {
  cpu: {
    model: string;
    cores: number;
    threads: number;
    baseFrequency: number;
    maxFrequency: number;
  };
  memory: {
    total: number;
    type: string;
    speed: number;
  };
  storage: {
    type: string;
    capacity: number;
    interface: string;
  };
  network: {
    interfaces: string[];
    wifiCapable: boolean;
  };
}

/**
 * Performance monitoring service for Intel NUC
 */
export class PerformanceMonitor extends EventEmitter {
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring: boolean = false;
  private thresholds: PerformanceThresholds;
  private hardwareInfo?: HardwareInfo;
  private performanceHistory: Map<string, number[]> = new Map();

  constructor() {
    super();
    
    // Default thresholds for Intel NUC
    this.thresholds = {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 80, critical: 95 },
      disk: { warning: 85, critical: 95 },
      temperature: { warning: 70, critical: 85 },
      network: { warning: 100, critical: 500 },
      database: { warning: 100, critical: 500 }
    };
  }

  /**
   * Start performance monitoring
   */
  public async startMonitoring(intervalMs: number = 30000): Promise<void> {
    if (this.isMonitoring) {
      tradingLogger.warn('Performance monitoring is already running');
      return;
    }

    try {
      // Initialize hardware information
      await this.initializeHardwareInfo();
      
      this.isMonitoring = true;
      
      // Initial performance check
      await this.performComprehensiveCheck();
      
      // Start periodic monitoring
      this.monitoringInterval = setInterval(async () => {
        try {
          await this.performComprehensiveCheck();
        } catch (error) {
          tradingLogger.error('Error during performance monitoring cycle', error as Error);
        }
      }, intervalMs);

      tradingLogger.logApplicationLifecycle('startup', 'PerformanceMonitor', {
        interval: intervalMs,
        thresholds: this.thresholds
      });

      this.emit('monitoring_started');
      
    } catch (error) {
      tradingLogger.error('Failed to start performance monitoring', error as Error);
      throw error;
    }
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.isMonitoring = false;
    
    tradingLogger.logApplicationLifecycle('shutdown', 'PerformanceMonitor');
    this.emit('monitoring_stopped');
  }

  /**
   * Initialize hardware information
   */
  private async initializeHardwareInfo(): Promise<void> {
    try {
      const cpuInfo = os.cpus();
      const totalMem = os.totalmem();
      
      // Get detailed CPU information
      let cpuModel = cpuInfo[0]?.model || 'Unknown';
      let baseFreq = 0;
      let maxFreq = 0;
      
      try {
        const cpuFreqInfo = await execAsync('cat /proc/cpuinfo | grep "cpu MHz" | head -1');
        const freqMatch = cpuFreqInfo.stdout.match(/cpu MHz\s*:\s*([0-9.]+)/);
        if (freqMatch) {
          baseFreq = parseFloat(freqMatch[1]);
        }
      } catch (error) {
        // Ignore if can't get frequency info
      }

      // Get memory information
      let memType = 'Unknown';
      let memSpeed = 0;
      
      try {
        const memInfo = await execAsync('sudo dmidecode -t memory | grep -E "Type:|Speed:" | head -2');
        const typeMatch = memInfo.stdout.match(/Type:\s*([^\n]+)/);
        const speedMatch = memInfo.stdout.match(/Speed:\s*([0-9]+)/);
        
        if (typeMatch) memType = typeMatch[1].trim();
        if (speedMatch) memSpeed = parseInt(speedMatch[1]);
      } catch (error) {
        // Ignore if can't get memory details
      }

      // Get storage information
      let storageType = 'Unknown';
      let storageCapacity = 0;
      let storageInterface = 'Unknown';
      
      try {
        const storageInfo = await execAsync('lsblk -d -o NAME,SIZE,ROTA | grep -v loop');
        const lines = storageInfo.stdout.trim().split('\n').slice(1);
        
        if (lines.length > 0) {
          const mainDisk = lines[0].split(/\s+/);
          const sizeStr = mainDisk[1];
          const isRotational = mainDisk[2] === '1';
          
          storageType = isRotational ? 'HDD' : 'SSD';
          storageCapacity = this.parseStorageSize(sizeStr);
          storageInterface = 'SATA'; // Default assumption
        }
      } catch (error) {
        // Ignore if can't get storage info
      }

      // Get network interfaces
      const networkInterfaces = Object.keys(os.networkInterfaces());
      const wifiCapable = networkInterfaces.some(iface => 
        iface.includes('wlan') || iface.includes('wifi')
      );

      this.hardwareInfo = {
        cpu: {
          model: cpuModel,
          cores: cpuInfo.length,
          threads: cpuInfo.length, // Simplified
          baseFrequency: baseFreq,
          maxFrequency: maxFreq || baseFreq
        },
        memory: {
          total: totalMem,
          type: memType,
          speed: memSpeed
        },
        storage: {
          type: storageType,
          capacity: storageCapacity,
          interface: storageInterface
        },
        network: {
          interfaces: networkInterfaces,
          wifiCapable
        }
      };

      tradingLogger.info('Hardware information initialized', {
        component: 'PerformanceMonitor',
        hardwareInfo: this.hardwareInfo
      });

    } catch (error) {
      tradingLogger.error('Failed to initialize hardware information', error as Error);
    }
  }

  /**
   * Perform comprehensive performance check
   */
  private async performComprehensiveCheck(): Promise<void> {
    const timestamp = new Date();
    
    // Check Intel NUC hardware
    await this.checkIntelNUCPerformance(timestamp);
    
    // Check network performance
    await this.checkNetworkPerformance(timestamp);
    
    // Check database performance
    await this.checkDatabasePerformance(timestamp);
    
    // Check application performance
    await this.checkApplicationPerformance(timestamp);
  }

  /**
   * Check Intel NUC hardware performance
   */
  private async checkIntelNUCPerformance(timestamp: Date): Promise<void> {
    try {
      // Get CPU usage
      const cpuUsage = await this.getCPUUsage();
      
      // Get memory usage
      const memoryUsage = await this.getMemoryUsage();
      
      // Get disk usage
      const diskUsage = await this.getDiskUsage();
      
      // Get CPU temperature (if available)
      const temperature = await this.getCPUTemperature();
      
      // Determine overall status
      const status = this.determineSystemStatus({
        cpu: cpuUsage,
        memory: memoryUsage.percentage,
        disk: diskUsage.percentage,
        temperature
      });

      const context: SystemPerformanceContext = {
        component: 'intel_nuc',
        metrics: {
          cpu: {
            usage: cpuUsage,
            temperature,
            frequency: this.hardwareInfo?.cpu.baseFrequency
          },
          memory: memoryUsage,
          disk: diskUsage
        },
        thresholds: this.thresholds,
        status,
        timestamp
      };

      tradingLogger.logSystemPerformance(context);
      
      // Store performance history
      this.storePerformanceMetric('cpu_usage', cpuUsage);
      this.storePerformanceMetric('memory_usage', memoryUsage.percentage);
      this.storePerformanceMetric('disk_usage', diskUsage.percentage);
      
      if (temperature > 0) {
        this.storePerformanceMetric('cpu_temperature', temperature);
      }

      // Emit events for critical conditions
      if (status === 'critical') {
        this.emit('critical_performance', context);
      } else if (status === 'warning') {
        this.emit('performance_warning', context);
      }

    } catch (error) {
      tradingLogger.error('Failed to check Intel NUC performance', error as Error);
    }
  }

  /**
   * Check network performance including SSH tunnel
   */
  private async checkNetworkPerformance(timestamp: Date): Promise<void> {
    try {
      // Check SSH tunnel latency
      const tunnelLatency = await this.checkSSHTunnelLatency();
      
      // Check API connectivity latency
      const apiLatency = await this.checkAPILatency();
      
      // Get network interface statistics
      const networkStats = await this.getNetworkStatistics();
      
      const avgLatency = (tunnelLatency + apiLatency) / 2;
      const status = avgLatency > this.thresholds.network.critical ? 'critical' :
                    avgLatency > this.thresholds.network.warning ? 'warning' : 'healthy';

      const context: SystemPerformanceContext = {
        component: 'network',
        metrics: {
          network: {
            latency: avgLatency,
            bandwidth: networkStats.bandwidth,
            packetLoss: networkStats.packetLoss,
            connections: networkStats.connections
          }
        },
        thresholds: this.thresholds,
        status,
        timestamp
      };

      tradingLogger.logSystemPerformance(context);
      
      // Store network performance history
      this.storePerformanceMetric('network_latency', avgLatency);
      this.storePerformanceMetric('ssh_tunnel_latency', tunnelLatency);
      this.storePerformanceMetric('api_latency', apiLatency);

      if (status !== 'healthy') {
        this.emit('network_performance_issue', context);
      }

    } catch (error) {
      tradingLogger.error('Failed to check network performance', error as Error);
    }
  }

  /**
   * Check database performance
   */
  private async checkDatabasePerformance(timestamp: Date): Promise<void> {
    try {
      // Check database connection count
      const connections = await this.getDatabaseConnections();
      
      // Check query performance
      const queryTime = await this.measureDatabaseQueryTime();
      
      // Check cache hit ratio (if available)
      const cacheHitRatio = await this.getDatabaseCacheHitRatio();
      
      const status = queryTime > this.thresholds.database.critical ? 'critical' :
                    queryTime > this.thresholds.database.warning ? 'warning' : 'healthy';

      const context: SystemPerformanceContext = {
        component: 'database',
        metrics: {
          database: {
            connections,
            queryTime,
            cacheHitRatio
          }
        },
        thresholds: this.thresholds,
        status,
        timestamp
      };

      tradingLogger.logSystemPerformance(context);
      
      // Store database performance history
      this.storePerformanceMetric('db_query_time', queryTime);
      this.storePerformanceMetric('db_connections', connections);
      
      if (cacheHitRatio > 0) {
        this.storePerformanceMetric('db_cache_hit_ratio', cacheHitRatio);
      }

      if (status !== 'healthy') {
        this.emit('database_performance_issue', context);
      }

    } catch (error) {
      tradingLogger.error('Failed to check database performance', error as Error);
    }
  }

  /**
   * Check application performance
   */
  private async checkApplicationPerformance(timestamp: Date): Promise<void> {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Calculate application-specific metrics
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;
      
      const status = heapUsagePercent > 90 ? 'critical' :
                    heapUsagePercent > 75 ? 'warning' : 'healthy';

      const context: SystemPerformanceContext = {
        component: 'application',
        metrics: {
          memory: {
            used: memUsage.heapUsed,
            total: memUsage.heapTotal,
            percentage: heapUsagePercent
          }
        },
        thresholds: this.thresholds,
        status,
        timestamp
      };

      tradingLogger.logSystemPerformance(context);
      
      // Store application performance history
      this.storePerformanceMetric('app_heap_usage', heapUsagePercent);
      this.storePerformanceMetric('app_memory_rss', memUsage.rss / 1024 / 1024);

      if (status !== 'healthy') {
        this.emit('application_performance_issue', context);
      }

    } catch (error) {
      tradingLogger.error('Failed to check application performance', error as Error);
    }
  }

  /**
   * Get CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = performance.now();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = performance.now();
        const timeDiff = endTime - startTime;

        const userPercent = (endUsage.user / 1000) / timeDiff * 100;
        const systemPercent = (endUsage.system / 1000) / timeDiff * 100;
        
        resolve(Math.min(userPercent + systemPercent, 100));
      }, 100);
    });
  }

  /**
   * Get memory usage information
   */
  private async getMemoryUsage(): Promise<{
    used: number;
    total: number;
    percentage: number;
    swap?: number;
  }> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    let swapUsed = 0;
    try {
      const swapInfo = await execAsync('free | grep Swap');
      const swapMatch = swapInfo.stdout.match(/Swap:\s+\d+\s+(\d+)/);
      if (swapMatch) {
        swapUsed = parseInt(swapMatch[1]) * 1024; // Convert from KB to bytes
      }
    } catch (error) {
      // Ignore if can't get swap info
    }

    return {
      used: usedMem,
      total: totalMem,
      percentage: (usedMem / totalMem) * 100,
      swap: swapUsed
    };
  }

  /**
   * Get disk usage information
   */
  private async getDiskUsage(): Promise<{
    used: number;
    total: number;
    percentage: number;
    iops?: number;
  }> {
    try {
      const diskInfo = await execAsync('df -h / | tail -1');
      const parts = diskInfo.stdout.trim().split(/\s+/);
      
      const total = this.parseStorageSize(parts[1]);
      const used = this.parseStorageSize(parts[2]);
      const percentage = parseFloat(parts[4].replace('%', ''));

      // Try to get IOPS if available
      let iops = 0;
      try {
        const iostat = await execAsync('iostat -x 1 1 | tail -n +4 | head -1');
        const ioMatch = iostat.stdout.match(/\s+([0-9.]+)\s+([0-9.]+)$/);
        if (ioMatch) {
          iops = parseFloat(ioMatch[1]) + parseFloat(ioMatch[2]);
        }
      } catch (error) {
        // Ignore if iostat not available
      }

      return { used, total, percentage, iops };
    } catch (error) {
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Get CPU temperature
   */
  private async getCPUTemperature(): Promise<number> {
    try {
      // Try different methods to get CPU temperature
      const methods = [
        'cat /sys/class/thermal/thermal_zone0/temp',
        'sensors | grep "Core 0" | awk \'{print $3}\' | sed \'s/+//\' | sed \'s/°C//\'',
        'cat /sys/devices/platform/coretemp.0/hwmon/hwmon*/temp1_input'
      ];

      for (const method of methods) {
        try {
          const result = await execAsync(method);
          const temp = parseFloat(result.stdout.trim());
          
          // Convert from millidegrees if necessary
          if (temp > 1000) {
            return temp / 1000;
          }
          
          if (temp > 0 && temp < 150) {
            return temp;
          }
        } catch (error) {
          continue;
        }
      }
      
      return 0; // Temperature not available
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check SSH tunnel latency
   */
  private async checkSSHTunnelLatency(): Promise<number> {
    try {
      const startTime = performance.now();
      await execAsync('curl -s --max-time 5 http://localhost:8443/api/v4/spot/time');
      const endTime = performance.now();
      
      return endTime - startTime;
    } catch (error) {
      return 999; // High latency indicates connection issues
    }
  }

  /**
   * Check API latency
   */
  private async checkAPILatency(): Promise<number> {
    try {
      const startTime = performance.now();
      // This would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 10));
      const endTime = performance.now();
      
      return endTime - startTime;
    } catch (error) {
      return 999;
    }
  }

  /**
   * Get network statistics
   */
  private async getNetworkStatistics(): Promise<{
    bandwidth: number;
    packetLoss: number;
    connections: number;
  }> {
    try {
      // Get active connections
      const netstat = await execAsync('netstat -an | grep ESTABLISHED | wc -l');
      const connections = parseInt(netstat.stdout.trim()) || 0;

      // Simplified bandwidth and packet loss (would need more sophisticated monitoring)
      return {
        bandwidth: 1000000, // 1MB/s default
        packetLoss: 0,
        connections
      };
    } catch (error) {
      return { bandwidth: 0, packetLoss: 0, connections: 0 };
    }
  }

  /**
   * Get database connections
   */
  private async getDatabaseConnections(): Promise<number> {
    try {
      // This would be replaced with actual database query
      return 5; // Default connection count
    } catch (error) {
      return 0;
    }
  }

  /**
   * Measure database query time
   */
  private async measureDatabaseQueryTime(): Promise<number> {
    try {
      const startTime = performance.now();
      // This would be replaced with actual database query
      await new Promise(resolve => setTimeout(resolve, 5));
      const endTime = performance.now();
      
      return endTime - startTime;
    } catch (error) {
      return 999;
    }
  }

  /**
   * Get database cache hit ratio
   */
  private async getDatabaseCacheHitRatio(): Promise<number> {
    try {
      // This would be replaced with actual database query
      return 95.5; // Default cache hit ratio
    } catch (error) {
      return 0;
    }
  }

  /**
   * Parse storage size string to bytes
   */
  private parseStorageSize(sizeStr: string): number {
    const units = { K: 1024, M: 1024**2, G: 1024**3, T: 1024**4 };
    const match = sizeStr.match(/^([0-9.]+)([KMGT]?)$/);
    
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2] as keyof typeof units;
    
    return value * (units[unit] || 1);
  }

  /**
   * Determine system status based on metrics
   */
  private determineSystemStatus(metrics: {
    cpu: number;
    memory: number;
    disk: number;
    temperature: number;
  }): 'healthy' | 'warning' | 'critical' {
    const { cpu, memory, disk, temperature } = metrics;
    
    if (cpu > this.thresholds.cpu.critical ||
        memory > this.thresholds.memory.critical ||
        disk > this.thresholds.disk.critical ||
        temperature > this.thresholds.temperature.critical) {
      return 'critical';
    }
    
    if (cpu > this.thresholds.cpu.warning ||
        memory > this.thresholds.memory.warning ||
        disk > this.thresholds.disk.warning ||
        temperature > this.thresholds.temperature.warning) {
      return 'warning';
    }
    
    return 'healthy';
  }

  /**
   * Store performance metric in history
   */
  private storePerformanceMetric(metric: string, value: number): void {
    const history = this.performanceHistory.get(metric) || [];
    history.push(value);
    
    // Keep only last 100 values
    if (history.length > 100) {
      history.shift();
    }
    
    this.performanceHistory.set(metric, history);
  }

  /**
   * Get performance history
   */
  public getPerformanceHistory(): Record<string, number[]> {
    return Object.fromEntries(this.performanceHistory);
  }

  /**
   * Update performance thresholds
   */
  public updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    
    tradingLogger.info('Performance thresholds updated', {
      component: 'PerformanceMonitor',
      thresholds: this.thresholds
    });
  }

  /**
   * Get current hardware information
   */
  public getHardwareInfo(): HardwareInfo | undefined {
    return this.hardwareInfo;
  }

  /**
   * Get monitoring status
   */
  public isMonitoringActive(): boolean {
    return this.isMonitoring;
  }
}

// Create and export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export types
export type { PerformanceThresholds, HardwareInfo };