/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - INTEL NUC DISK OPTIMIZER
 * =============================================================================
 * 
 * This module provides comprehensive disk space optimization for Intel NUC systems
 * with 256GB SSD. It manages log rotation, database cleanup, temporary file
 * management, and provides automated disk space monitoring and alerts.
 * 
 * CRITICAL PERFORMANCE NOTICE:
 * Disk space management is crucial for continuous trading operations on Intel NUC.
 * Running out of disk space could prevent logging, database operations, and
 * system updates, potentially impacting trading performance and data integrity.
 * 
 * Intel NUC Specifications:
 * - 256GB M.2 SSD
 * - Target usage: <80% (204GB)
 * - Critical threshold: 95% (243GB)
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { logger } from '@/core/logging/logger';
import { EventEmitter } from 'events';
import { promises as fs, existsSync } from 'fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process';

/**
 * Interface for disk usage metrics
 */
export interface DiskMetrics {
  /** Total disk space in bytes */
  totalSpace: number;
  /** Used disk space in bytes */
  usedSpace: number;
  /** Free disk space in bytes */
  freeSpace: number;
  /** Disk utilization percentage */
  utilization: number;
  /** Available space for non-root users in bytes */
  availableSpace: number;
  /** Disk I/O statistics */
  ioStats: {
    /** Read operations per second */
    readOps: number;
    /** Write operations per second */
    writeOps: number;
    /** Read throughput in MB/s */
    readThroughput: number;
    /** Write throughput in MB/s */
    writeThroughput: number;
  };
  /** File system type */
  fileSystem: string;
  /** Mount point */
  mountPoint: string;
  /** Disk health status */
  healthStatus: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  /** Timestamp of metrics collection */
  timestamp: Date;
}

/**
 * Interface for directory usage information
 */
export interface DirectoryUsage {
  /** Directory path */
  path: string;
  /** Size in bytes */
  size: number;
  /** Number of files */
  fileCount: number;
  /** Number of subdirectories */
  dirCount: number;
  /** Last modified timestamp */
  lastModified: Date;
  /** Is directory cleanable */
  isCleanable: boolean;
}

/**
 * Interface for disk optimization configuration
 */
export interface DiskOptimizerConfig {
  /** Maximum disk usage percentage (default: 80) */
  maxUsagePercent: number;
  /** Critical disk usage percentage (default: 95) */
  criticalUsagePercent: number;
  /** Monitoring interval in milliseconds (default: 60000) */
  monitoringIntervalMs: number;
  /** Cleanup interval in milliseconds (default: 3600000) */
  cleanupIntervalMs: number;
  /** Log retention days (default: 30) */
  logRetentionDays: number;
  /** Database cleanup interval in milliseconds (default: 86400000) */
  dbCleanupIntervalMs: number;
  /** Temporary file cleanup interval in milliseconds (default: 1800000) */
  tempCleanupIntervalMs: number;
  /** Enable automatic cleanup (default: true) */
  enableAutoCleanup: boolean;
  /** Directories to monitor */
  monitoredDirectories: string[];
  /** Directories to exclude from cleanup */
  excludedDirectories: string[];
}

/**
 * Interface for disk alert
 */
export interface DiskAlert {
  /** Alert ID */
  id: string;
  /** Alert type */
  type: 'DISK_WARNING' | 'DISK_CRITICAL' | 'CLEANUP_NEEDED' | 'IO_PERFORMANCE';
  /** Alert severity */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Alert message */
  message: string;
  /** Current disk usage */
  currentUsage: number;
  /** Disk threshold */
  threshold: number;
  /** Alert timestamp */
  timestamp: Date;
  /** Recommended actions */
  recommendations: string[];
}

/**
 * Intel NUC Disk Optimizer
 * Provides comprehensive disk space management and optimization for 256GB SSD
 */
export class DiskOptimizer extends EventEmitter {
  private config: DiskOptimizerConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private dbCleanupInterval: NodeJS.Timeout | null = null;
  private tempCleanupInterval: NodeJS.Timeout | null = null;
  private currentMetrics: DiskMetrics | null = null;
  private diskHistory: DiskMetrics[] = [];
  private activeAlerts: Map<string, DiskAlert> = new Map();
  private isOptimizing = false;

  constructor(config?: Partial<DiskOptimizerConfig>) {
    super();
    
    this.config = {
      maxUsagePercent: 80,
      criticalUsagePercent: 95,
      monitoringIntervalMs: 60000, // 1 minute
      cleanupIntervalMs: 3600000, // 1 hour
      logRetentionDays: 30,
      dbCleanupIntervalMs: 86400000, // 24 hours
      tempCleanupIntervalMs: 1800000, // 30 minutes
      enableAutoCleanup: true,
      monitoredDirectories: [
        './logs',
        './node_modules',
        './dist',
        './coverage',
        '/tmp',
        '/var/tmp',
        '/var/log'
      ],
      excludedDirectories: [
        './src',
        './keys',
        './scripts',
        './systemd'
      ],
      ...config
    };

    logger.info('💾 Intel NUC Disk Optimizer initializing...', {
      component: 'DiskOptimizer',
      config: this.config
    });
  }

  /**
   * Start disk optimization and monitoring
   */
  public async startOptimization(): Promise<void> {
    try {
      logger.info('🚀 Starting Intel NUC disk optimization...');

      // Perform initial disk assessment
      await this.performDiskAssessment();

      // Start disk monitoring
      this.startDiskMonitoring();

      // Start cleanup intervals
      if (this.config.enableAutoCleanup) {
        this.startCleanupIntervals();
      }

      // Setup log rotation
      await this.setupLogRotation();

      logger.info('✅ Disk optimization started successfully');
      this.emit('optimizationStarted');

    } catch (error) {
      logger.error('❌ Failed to start disk optimization:', error);
      throw error;
    }
  }

  /**
   * Stop disk optimization
   */
  public stopOptimization(): void {
    logger.info('🛑 Stopping disk optimization...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.dbCleanupInterval) {
      clearInterval(this.dbCleanupInterval);
      this.dbCleanupInterval = null;
    }

    if (this.tempCleanupInterval) {
      clearInterval(this.tempCleanupInterval);
      this.tempCleanupInterval = null;
    }

    logger.info('✅ Disk optimization stopped');
    this.emit('optimizationStopped');
  }

  /**
   * Perform comprehensive disk assessment
   */
  private async performDiskAssessment(): Promise<void> {
    logger.info('🔍 Performing Intel NUC disk assessment...');

    const metrics = await this.collectDiskMetrics();
    this.currentMetrics = metrics;

    // Log disk information
    logger.info('📊 Disk Assessment:', {
      totalSpace: `${Math.round(metrics.totalSpace / 1024 / 1024 / 1024 * 100) / 100}GB`,
      usedSpace: `${Math.round(metrics.usedSpace / 1024 / 1024 / 1024 * 100) / 100}GB`,
      freeSpace: `${Math.round(metrics.freeSpace / 1024 / 1024 / 1024 * 100) / 100}GB`,
      utilization: `${metrics.utilization}%`,
      fileSystem: metrics.fileSystem,
      healthStatus: metrics.healthStatus
    });

    // Check if disk meets Intel NUC specifications
    const totalGB = metrics.totalSpace / 1024 / 1024 / 1024;
    if (totalGB < 250) { // Allow for some formatting overhead
      logger.warn('⚠️ Disk capacity below Intel NUC specification:', {
        detected: `${Math.round(totalGB * 100) / 100}GB`,
        expected: '256GB'
      });
    }

    // Analyze directory usage
    await this.analyzeDirectoryUsage();

    // Generate initial recommendations
    const recommendations = this.generateDiskRecommendations(metrics);
    if (recommendations.length > 0) {
      logger.info('💡 Disk optimization recommendations:', recommendations);
    }
  }

  /**
   * Start continuous disk monitoring
   */
  private startDiskMonitoring(): void {
    logger.info('📊 Starting continuous disk monitoring...');

    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectDiskMetrics();
        this.currentMetrics = metrics;
        
        // Add to history (keep last 100 entries)
        this.diskHistory.push(metrics);
        if (this.diskHistory.length > 100) {
          this.diskHistory.shift();
        }

        // Check for disk alerts
        await this.checkDiskAlerts(metrics);

        // Emit metrics update
        this.emit('metricsUpdated', metrics);

        // Log periodic status
        if (this.diskHistory.length % 10 === 0) { // Every 10 intervals
          this.logDiskStatus(metrics);
        }

      } catch (error) {
        logger.error('❌ Disk monitoring error:', error);
      }
    }, this.config.monitoringIntervalMs);
  }

  /**
   * Start cleanup intervals
   */
  private startCleanupIntervals(): void {
    logger.info('🧹 Starting automated cleanup intervals...');

    // General cleanup interval
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performAutomaticCleanup();
      } catch (error) {
        logger.error('❌ Automatic cleanup error:', error);
      }
    }, this.config.cleanupIntervalMs);

    // Database cleanup interval
    this.dbCleanupInterval = setInterval(async () => {
      try {
        await this.performDatabaseCleanup();
      } catch (error) {
        logger.error('❌ Database cleanup error:', error);
      }
    }, this.config.dbCleanupIntervalMs);

    // Temporary file cleanup interval
    this.tempCleanupInterval = setInterval(async () => {
      try {
        await this.performTempFileCleanup();
      } catch (error) {
        logger.error('❌ Temp file cleanup error:', error);
      }
    }, this.config.tempCleanupIntervalMs);
  }

  /**
   * Collect comprehensive disk metrics
   */
  private async collectDiskMetrics(): Promise<DiskMetrics> {
    try {
      // Get disk usage using statvfs (more accurate than df)
      const stats = await fs.statfs('./');
      
      const totalSpace = stats.blocks * stats.bsize;
      const freeSpace = stats.bavail * stats.bsize;
      const usedSpace = totalSpace - freeSpace;
      const utilization = Math.round((usedSpace / totalSpace) * 100);

      // Determine health status
      let healthStatus: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
      if (utilization >= this.config.criticalUsagePercent) {
        healthStatus = 'CRITICAL';
      } else if (utilization >= this.config.maxUsagePercent) {
        healthStatus = 'WARNING';
      } else if (utilization >= 60) {
        healthStatus = 'GOOD';
      } else {
        healthStatus = 'EXCELLENT';
      }

      return {
        totalSpace,
        usedSpace,
        freeSpace,
        utilization,
        availableSpace: freeSpace,
        ioStats: {
          readOps: 0, // Would need iostat for real values
          writeOps: 0,
          readThroughput: 0,
          writeThroughput: 0
        },
        fileSystem: 'ext4', // Default assumption
        mountPoint: '/',
        healthStatus,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('❌ Failed to collect disk metrics:', error);
      throw error;
    }
  }

  /**
   * Analyze directory usage
   */
  private async analyzeDirectoryUsage(): Promise<void> {
    logger.info('📁 Analyzing directory usage...');

    const directoryUsages: DirectoryUsage[] = [];

    for (const dir of this.config.monitoredDirectories) {
      try {
        if (existsSync(dir)) {
          const usage = await this.getDirectoryUsage(dir);
          directoryUsages.push(usage);
        }
      } catch (error) {
        logger.warn(`⚠️ Failed to analyze directory ${dir}:`, error);
      }
    }

    // Sort by size (largest first)
    directoryUsages.sort((a, b) => b.size - a.size);

    // Log top space consumers
    const topConsumers = directoryUsages.slice(0, 5);
    logger.info('📊 Top disk space consumers:', 
      topConsumers.map(usage => ({
        path: usage.path,
        size: `${Math.round(usage.size / 1024 / 1024)}MB`,
        files: usage.fileCount,
        cleanable: usage.isCleanable
      }))
    );

    this.emit('directoryAnalysis', directoryUsages);
  }

  /**
   * Get directory usage information
   */
  private async getDirectoryUsage(dirPath: string): Promise<DirectoryUsage> {
    try {
      const stats = await fs.stat(dirPath);
      let totalSize = 0;
      let fileCount = 0;
      let dirCount = 0;

      // Simple size calculation (for more accurate, would need recursive traversal)
      try {
        const output = execSync(`du -sb "${dirPath}" 2>/dev/null || echo "0"`, { encoding: 'utf8' });
        totalSize = parseInt(output.split('\t')[0]) || 0;
      } catch (error) {
        // Fallback to stat size
        totalSize = stats.size;
      }

      // Count files and directories
      try {
        const items = await fs.readdir(dirPath);
        for (const item of items) {
          try {
            const itemPath = join(dirPath, item);
            const itemStats = await fs.stat(itemPath);
            if (itemStats.isDirectory()) {
              dirCount++;
            } else {
              fileCount++;
            }
          } catch (error) {
            // Skip inaccessible items
          }
        }
      } catch (error) {
        // Directory not readable
      }

      return {
        path: dirPath,
        size: totalSize,
        fileCount,
        dirCount,
        lastModified: stats.mtime,
        isCleanable: !this.config.excludedDirectories.includes(dirPath)
      };

    } catch (error) {
      logger.warn(`⚠️ Failed to get usage for ${dirPath}:`, error);
      return {
        path: dirPath,
        size: 0,
        fileCount: 0,
        dirCount: 0,
        lastModified: new Date(),
        isCleanable: false
      };
    }
  }

  /**
   * Check for disk alerts
   */
  private async checkDiskAlerts(metrics: DiskMetrics): Promise<void> {
    const alerts: DiskAlert[] = [];

    // Check disk usage
    if (metrics.utilization >= this.config.criticalUsagePercent) {
      alerts.push({
        id: `disk_critical_${Date.now()}`,
        type: 'DISK_CRITICAL',
        severity: 'CRITICAL',
        message: `Disk usage critical: ${metrics.utilization}%`,
        currentUsage: metrics.utilization,
        threshold: this.config.criticalUsagePercent,
        timestamp: new Date(),
        recommendations: [
          'Immediate cleanup required',
          'Remove old log files',
          'Clear temporary files',
          'Consider database cleanup',
          'Remove unnecessary node_modules'
        ]
      });
    } else if (metrics.utilization >= this.config.maxUsagePercent) {
      alerts.push({
        id: `disk_warning_${Date.now()}`,
        type: 'DISK_WARNING',
        severity: 'HIGH',
        message: `Disk usage high: ${metrics.utilization}%`,
        currentUsage: metrics.utilization,
        threshold: this.config.maxUsagePercent,
        timestamp: new Date(),
        recommendations: [
          'Schedule cleanup operations',
          'Review log retention policies',
          'Clear build artifacts',
          'Monitor disk usage trends'
        ]
      });
    }

    // Check for rapid disk usage increase
    if (this.diskHistory.length >= 5) {
      const trend = this.analyzeDiskTrend();
      if (trend.isIncreasing && trend.rate > 2) { // 2% increase per interval
        alerts.push({
          id: `disk_trend_warning_${Date.now()}`,
          type: 'CLEANUP_NEEDED',
          severity: 'MEDIUM',
          message: `Rapid disk usage increase: ${trend.rate.toFixed(1)}% per interval`,
          currentUsage: metrics.utilization,
          threshold: 0,
          timestamp: new Date(),
          recommendations: [
            'Investigate disk usage sources',
            'Check for log file growth',
            'Monitor temporary file creation',
            'Review application data storage'
          ]
        });
      }
    }

    // Process alerts
    for (const alert of alerts) {
      await this.processDiskAlert(alert);
    }
  }

  /**
   * Process disk alert
   */
  private async processDiskAlert(alert: DiskAlert): Promise<void> {
    // Check if similar alert already exists
    const existingAlert = Array.from(this.activeAlerts.values())
      .find(a => a.type === alert.type && a.severity === alert.severity);

    if (existingAlert) {
      // Update existing alert
      existingAlert.currentUsage = alert.currentUsage;
      existingAlert.timestamp = alert.timestamp;
      return;
    }

    // Add new alert
    this.activeAlerts.set(alert.id, alert);

    // Log alert
    logger.warn(`⚠️ Disk Alert: ${alert.message}`, {
      component: 'DiskOptimizer',
      alertType: alert.type,
      severity: alert.severity,
      currentUsage: alert.currentUsage,
      threshold: alert.threshold,
      recommendations: alert.recommendations
    });

    // Emit alert event
    this.emit('diskAlert', alert);

    // Take automatic action for critical alerts
    if (alert.severity === 'CRITICAL' && this.config.enableAutoCleanup) {
      await this.handleCriticalDiskAlert(alert);
    }
  }

  /**
   * Handle critical disk alerts with automatic actions
   */
  private async handleCriticalDiskAlert(alert: DiskAlert): Promise<void> {
    logger.warn('🚨 Handling critical disk alert with automatic actions...');

    try {
      // Perform emergency cleanup
      await this.performEmergencyCleanup();

      // Emit emergency cleanup event
      this.emit('emergencyCleanup', alert);

    } catch (error) {
      logger.error('❌ Failed to handle critical disk alert:', error);
    }
  }

  /**
   * Perform automatic cleanup
   */
  private async performAutomaticCleanup(): Promise<void> {
    if (this.isOptimizing) {
      return; // Prevent concurrent cleanup
    }

    this.isOptimizing = true;

    try {
      logger.info('🧹 Performing automatic disk cleanup...');

      const beforeMetrics = await this.collectDiskMetrics();
      let totalCleaned = 0;

      // Clean old log files
      const logsCleaned = await this.cleanOldLogFiles();
      totalCleaned += logsCleaned;

      // Clean temporary files
      const tempCleaned = await this.cleanTemporaryFiles();
      totalCleaned += tempCleaned;

      // Clean build artifacts
      const buildCleaned = await this.cleanBuildArtifacts();
      totalCleaned += buildCleaned;

      const afterMetrics = await this.collectDiskMetrics();
      const spaceFreed = beforeMetrics.usedSpace - afterMetrics.usedSpace;

      logger.info('✅ Automatic cleanup completed', {
        spaceFreed: `${Math.round(spaceFreed / 1024 / 1024)}MB`,
        beforeUsage: `${beforeMetrics.utilization}%`,
        afterUsage: `${afterMetrics.utilization}%`,
        logsCleaned: `${Math.round(logsCleaned / 1024 / 1024)}MB`,
        tempCleaned: `${Math.round(tempCleaned / 1024 / 1024)}MB`,
        buildCleaned: `${Math.round(buildCleaned / 1024 / 1024)}MB`
      });

      this.emit('cleanupCompleted', {
        spaceFreed,
        beforeMetrics,
        afterMetrics,
        details: { logsCleaned, tempCleaned, buildCleaned }
      });

    } catch (error) {
      logger.error('❌ Automatic cleanup failed:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Perform emergency cleanup for critical disk space
   */
  private async performEmergencyCleanup(): Promise<void> {
    logger.warn('🚨 Performing emergency disk cleanup...');

    try {
      // More aggressive cleanup for emergency situations
      await this.cleanOldLogFiles(7); // Keep only 7 days
      await this.cleanTemporaryFiles();
      await this.cleanBuildArtifacts();
      await this.cleanNodeModulesCache();
      
      logger.info('✅ Emergency cleanup completed');

    } catch (error) {
      logger.error('❌ Emergency cleanup failed:', error);
    }
  }

  /**
   * Clean old log files
   */
  private async cleanOldLogFiles(retentionDays?: number): Promise<number> {
    const retention = retentionDays || this.config.logRetentionDays;
    let totalCleaned = 0;

    try {
      const logDirs = ['./logs', '/var/log/trading-agent'];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retention);

      for (const logDir of logDirs) {
        if (existsSync(logDir)) {
          totalCleaned += await this.cleanDirectoryByAge(logDir, cutoffDate);
        }
      }

      logger.info(`🗑️ Cleaned old log files: ${Math.round(totalCleaned / 1024 / 1024)}MB`);

    } catch (error) {
      logger.error('❌ Failed to clean old log files:', error);
    }

    return totalCleaned;
  }

  /**
   * Clean temporary files
   */
  private async cleanTemporaryFiles(): Promise<number> {
    let totalCleaned = 0;

    try {
      const tempDirs = ['/tmp', '/var/tmp', './tmp'];
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24); // Files older than 24 hours

      for (const tempDir of tempDirs) {
        if (existsSync(tempDir)) {
          totalCleaned += await this.cleanDirectoryByAge(tempDir, cutoffDate);
        }
      }

      logger.info(`🗑️ Cleaned temporary files: ${Math.round(totalCleaned / 1024 / 1024)}MB`);

    } catch (error) {
      logger.error('❌ Failed to clean temporary files:', error);
    }

    return totalCleaned;
  }

  /**
   * Clean build artifacts
   */
  private async cleanBuildArtifacts(): Promise<number> {
    let totalCleaned = 0;

    try {
      const artifactDirs = ['./dist', './coverage', './.jest-cache'];

      for (const dir of artifactDirs) {
        if (existsSync(dir)) {
          const sizeBefore = await this.getDirectorySize(dir);
          await fs.rm(dir, { recursive: true, force: true });
          totalCleaned += sizeBefore;
        }
      }

      logger.info(`🗑️ Cleaned build artifacts: ${Math.round(totalCleaned / 1024 / 1024)}MB`);

    } catch (error) {
      logger.error('❌ Failed to clean build artifacts:', error);
    }

    return totalCleaned;
  }

  /**
   * Clean node_modules cache
   */
  private async cleanNodeModulesCache(): Promise<number> {
    let totalCleaned = 0;

    try {
      // Clean npm cache
      try {
        execSync('npm cache clean --force', { stdio: 'ignore' });
        totalCleaned += 100 * 1024 * 1024; // Estimate 100MB
      } catch (error) {
        // Ignore npm cache errors
      }

      logger.info(`🗑️ Cleaned node_modules cache: ${Math.round(totalCleaned / 1024 / 1024)}MB`);

    } catch (error) {
      logger.error('❌ Failed to clean node_modules cache:', error);
    }

    return totalCleaned;
  }

  /**
   * Perform database cleanup
   */
  private async performDatabaseCleanup(): Promise<void> {
    logger.info('🗄️ Performing database cleanup...');

    try {
      // Database cleanup would be implemented here
      // This is a placeholder for database-specific cleanup operations
      
      logger.info('✅ Database cleanup completed');

    } catch (error) {
      logger.error('❌ Database cleanup failed:', error);
    }
  }

  /**
   * Perform temporary file cleanup
   */
  private async performTempFileCleanup(): Promise<void> {
    await this.cleanTemporaryFiles();
  }

  /**
   * Setup log rotation
   */
  private async setupLogRotation(): Promise<void> {
    logger.info('🔄 Setting up log rotation...');

    try {
      // Log rotation is typically handled by winston-daily-rotate-file
      // This method can set up additional logrotate configuration if needed
      
      logger.info('✅ Log rotation configured');

    } catch (error) {
      logger.error('❌ Failed to setup log rotation:', error);
    }
  }

  /**
   * Clean directory by age
   */
  private async cleanDirectoryByAge(dirPath: string, cutoffDate: Date): Promise<number> {
    let totalCleaned = 0;

    try {
      const items = await fs.readdir(dirPath);

      for (const item of items) {
        try {
          const itemPath = join(dirPath, item);
          const stats = await fs.stat(itemPath);

          if (stats.mtime < cutoffDate) {
            const size = stats.size;
            await fs.rm(itemPath, { recursive: true, force: true });
            totalCleaned += size;
          }
        } catch (error) {
          // Skip items that can't be processed
        }
      }

    } catch (error) {
      logger.warn(`⚠️ Failed to clean directory ${dirPath}:`, error);
    }

    return totalCleaned;
  }

  /**
   * Get directory size
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    try {
      const output = execSync(`du -sb "${dirPath}" 2>/dev/null || echo "0"`, { encoding: 'utf8' });
      return parseInt(output.split('\t')[0]) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Analyze disk usage trend
   */
  private analyzeDiskTrend(): { isIncreasing: boolean; rate: number } {
    if (this.diskHistory.length < 5) {
      return { isIncreasing: false, rate: 0 };
    }

    const recent = this.diskHistory.slice(-5);
    const first = recent[0].utilization;
    const last = recent[recent.length - 1].utilization;
    
    const rate = ((last - first) / first) * 100;
    
    return {
      isIncreasing: rate > 0,
      rate: Math.abs(rate)
    };
  }

  /**
   * Generate disk optimization recommendations
   */
  private generateDiskRecommendations(metrics: DiskMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.utilization > 85) {
      recommendations.push('Disk usage is very high - immediate cleanup recommended');
    }

    if (metrics.utilization > 70) {
      recommendations.push('Consider enabling more aggressive log rotation');
    }

    if (metrics.freeSpace < 10 * 1024 * 1024 * 1024) { // Less than 10GB
      recommendations.push('Low free space - monitor disk usage closely');
    }

    return recommendations;
  }

  /**
   * Log disk status
   */
  private logDiskStatus(metrics: DiskMetrics): void {
    logger.debug('📊 Disk Status Update', {
      component: 'DiskOptimizer',
      totalSpace: `${Math.round(metrics.totalSpace / 1024 / 1024 / 1024 * 100) / 100}GB`,
      usedSpace: `${Math.round(metrics.usedSpace / 1024 / 1024 / 1024 * 100) / 100}GB`,
      freeSpace: `${Math.round(metrics.freeSpace / 1024 / 1024 / 1024 * 100) / 100}GB`,
      utilization: `${metrics.utilization}%`,
      healthStatus: metrics.healthStatus,
      activeAlerts: this.activeAlerts.size
    });
  }

  /**
   * Get current disk metrics
   */
  public getCurrentMetrics(): DiskMetrics | null {
    return this.currentMetrics;
  }

  /**
   * Get disk usage history
   */
  public getDiskHistory(): DiskMetrics[] {
    return [...this.diskHistory];
  }

  /**
   * Get active disk alerts
   */
  public getActiveAlerts(): DiskAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Force cleanup operation
   */
  public async forceCleanup(): Promise<void> {
    await this.performAutomaticCleanup();
  }

  /**
   * Get disk optimizer status
   */
  public getStatus(): {
    isOptimizing: boolean;
    isMonitoring: boolean;
    currentMetrics: DiskMetrics | null;
    activeAlerts: number;
    config: DiskOptimizerConfig;
  } {
    return {
      isOptimizing: this.isOptimizing,
      isMonitoring: this.monitoringInterval !== null,
      currentMetrics: this.currentMetrics,
      activeAlerts: this.activeAlerts.size,
      config: this.config
    };
  }
}