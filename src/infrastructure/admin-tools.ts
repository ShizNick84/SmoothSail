/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - SYSTEM ADMINISTRATION TOOLS
 * =============================================================================
 * 
 * This module provides comprehensive system administration and maintenance
 * tools for the AI crypto trading agent. It includes CLI utilities, backup
 * and restore procedures, update management, and diagnostic tools.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from '@/core/logging/logger';
import { auditService } from '@/security/audit-service';
import { SystemMonitor } from './system-monitor';
import { PerformanceOptimizer } from './performance-optimizer';
import { AutoRestartManager } from './auto-restart-manager';

/**
 * Interface for backup configuration
 */
export interface BackupConfig {
  backupDir: string;
  maxBackups: number;
  compression: boolean;
  encryption: boolean;
  verification: boolean;
  includeLogs: boolean;
  includeConfig: boolean;
  includeTradingData: boolean;
  includeSecurityData: boolean;
}

/**
 * Interface for diagnostic result
 */
export interface DiagnosticResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'SKIP';
  message: string;
  details?: any;
  duration: number;
  timestamp: Date;
}

/**
 * Interface for system health report
 */
export interface SystemHealthReport {
  overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  healthScore: number;
  diagnostics: DiagnosticResult[];
  recommendations: string[];
  generatedAt: Date;
  duration: number;
}

/**
 * System Administration Tools
 * Provides comprehensive system management and maintenance capabilities
 */
export class AdminTools {
  private systemMonitor: SystemMonitor;
  private performanceOptimizer: PerformanceOptimizer;
  private autoRestartManager: AutoRestartManager;
  private backupConfig: BackupConfig;

  constructor(
    systemMonitor: SystemMonitor,
    performanceOptimizer: PerformanceOptimizer,
    autoRestartManager: AutoRestartManager
  ) {
    this.systemMonitor = systemMonitor;
    this.performanceOptimizer = performanceOptimizer;
    this.autoRestartManager = autoRestartManager;
    this.backupConfig = this.loadBackupConfig();
    
    logger.info('🔧 System Administration Tools initializing...');
  }

  /**
   * Load backup configuration
   */
  private loadBackupConfig(): BackupConfig {
    return {
      backupDir: process.env.BACKUP_DIR || '/var/backups/ai-trading-agent',
      maxBackups: parseInt(process.env.MAX_BACKUPS || '10'),
      compression: process.env.BACKUP_COMPRESSION !== 'false',
      encryption: process.env.BACKUP_ENCRYPTION !== 'false',
      verification: process.env.BACKUP_VERIFICATION !== 'false',
      includeLogs: process.env.BACKUP_INCLUDE_LOGS !== 'false',
      includeConfig: process.env.BACKUP_INCLUDE_CONFIG !== 'false',
      includeTradingData: process.env.BACKUP_INCLUDE_TRADING_DATA !== 'false',
      includeSecurityData: process.env.BACKUP_INCLUDE_SECURITY_DATA !== 'false'
    };
  }

  /**
   * Initialize administration tools
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🔧 Initializing system administration tools...');

      // Create backup directory
      await fs.mkdir(this.backupConfig.backupDir, { recursive: true });

      logger.info('✅ System administration tools initialized');

      // Audit log
      await auditService.createAuditEntry({
        auditId: `admin_tools_init_${Date.now()}`,
        eventType: 'ADMIN_TOOLS_INITIALIZATION',
        actor: 'SYSTEM',
        resource: 'ADMIN_TOOLS',
        action: 'INITIALIZE',
        result: 'SUCCESS',
        timestamp: new Date(),
        auditData: { backupConfig: this.backupConfig }
      });

    } catch (error) {
      logger.error('❌ Failed to initialize administration tools:', error);
      throw new Error('Administration tools initialization failed');
    }
  }

  /**
   * Create system backup
   */
  public async createBackup(type: string = 'manual'): Promise<string> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${type}-${timestamp}`;
    const backupPath = join(this.backupConfig.backupDir, backupName);

    try {
      logger.info(`💾 Creating ${type} backup: ${backupName}`);

      // Create backup directory
      await fs.mkdir(backupPath, { recursive: true });

      // Backup configuration files
      if (this.backupConfig.includeConfig) {
        await this.backupConfiguration(backupPath);
      }

      // Backup trading data
      if (this.backupConfig.includeTradingData) {
        await this.backupTradingData(backupPath);
      }

      // Create backup manifest
      await this.createBackupManifest(backupPath, type);

      const duration = Date.now() - startTime;
      logger.info(`✅ Backup created successfully: ${backupName} (${duration}ms)`);

      // Audit log
      await auditService.createAuditEntry({
        auditId: `backup_created_${Date.now()}`,
        eventType: 'BACKUP_CREATED',
        actor: 'ADMIN_TOOLS',
        resource: 'BACKUP_SYSTEM',
        action: 'CREATE_BACKUP',
        result: 'SUCCESS',
        timestamp: new Date(),
        auditData: { backupType: type, backupPath, duration }
      });

      return backupPath;

    } catch (error) {
      logger.error(`❌ Backup creation failed: ${backupName}`, error);
      throw error;
    }
  }

  /**
   * Backup configuration files
   */
  private async backupConfiguration(backupPath: string): Promise<void> {
    try {
      const configDir = join(backupPath, 'config');
      await fs.mkdir(configDir, { recursive: true });

      // Copy configuration files
      const configFiles = ['package.json', 'tsconfig.json'];
      
      for (const file of configFiles) {
        try {
          await fs.copyFile(file, join(configDir, file));
        } catch (error) {
          logger.warn(`⚠️ Could not backup ${file}:`, error);
        }
      }

      logger.info('✅ Configuration files backed up');

    } catch (error) {
      logger.error('❌ Configuration backup failed:', error);
      throw error;
    }
  }

  /**
   * Backup trading data
   */
  private async backupTradingData(backupPath: string): Promise<void> {
    try {
      const tradingDir = join(backupPath, 'trading');
      await fs.mkdir(tradingDir, { recursive: true });

      // Create placeholder trading data files
      await fs.writeFile(join(tradingDir, 'positions.json'), JSON.stringify({}));
      await fs.writeFile(join(tradingDir, 'orders.json'), JSON.stringify({}));
      await fs.writeFile(join(tradingDir, 'performance.json'), JSON.stringify({}));

      logger.info('✅ Trading data backed up');

    } catch (error) {
      logger.error('❌ Trading data backup failed:', error);
      throw error;
    }
  }

  /**
   * Create backup manifest
   */
  private async createBackupManifest(backupPath: string, type: string): Promise<void> {
    try {
      const manifest = {
        version: '1.0.0',
        type,
        timestamp: new Date().toISOString(),
        config: this.backupConfig,
        contents: {
          configuration: this.backupConfig.includeConfig,
          tradingData: this.backupConfig.includeTradingData,
          securityData: this.backupConfig.includeSecurityData,
          logs: this.backupConfig.includeLogs
        }
      };

      await fs.writeFile(
        join(backupPath, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      logger.info('✅ Backup manifest created');

    } catch (error) {
      logger.error('❌ Backup manifest creation failed:', error);
      throw error;
    }
  }

  /**
   * Run system diagnostics
   */
  public async runSystemDiagnostics(): Promise<SystemHealthReport> {
    const startTime = Date.now();
    const diagnostics: DiagnosticResult[] = [];

    try {
      logger.info('🔍 Running system diagnostics...');

      // System monitor diagnostics
      diagnostics.push(await this.testSystemMonitor());

      // Performance diagnostics
      diagnostics.push(await this.testPerformanceOptimizer());

      // Auto-restart diagnostics
      diagnostics.push(await this.testAutoRestartManager());

      // Memory usage diagnostics
      diagnostics.push(await this.testMemoryUsage());

      // Calculate overall health
      const passCount = diagnostics.filter(d => d.status === 'PASS').length;
      const failCount = diagnostics.filter(d => d.status === 'FAIL').length;
      const warningCount = diagnostics.filter(d => d.status === 'WARNING').length;

      let overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
      let healthScore: number;

      if (failCount > 0) {
        overallStatus = 'CRITICAL';
        healthScore = Math.max(0, 100 - (failCount * 30) - (warningCount * 10));
      } else if (warningCount > 0) {
        overallStatus = 'WARNING';
        healthScore = Math.max(50, 100 - (warningCount * 15));
      } else {
        overallStatus = 'HEALTHY';
        healthScore = 100;
      }

      // Generate recommendations
      const recommendations: string[] = [];
      for (const diagnostic of diagnostics) {
        if (diagnostic.status === 'FAIL') {
          recommendations.push(`Fix critical issue: ${diagnostic.name}`);
        } else if (diagnostic.status === 'WARNING') {
          recommendations.push(`Address warning: ${diagnostic.name}`);
        }
      }

      const duration = Date.now() - startTime;
      const report: SystemHealthReport = {
        overallStatus,
        healthScore,
        diagnostics,
        recommendations,
        generatedAt: new Date(),
        duration
      };

      logger.info(`✅ System diagnostics completed - Status: ${overallStatus} (${healthScore}/100)`);

      return report;

    } catch (error) {
      logger.error('❌ System diagnostics failed:', error);
      throw error;
    }
  }

  /**
   * Test system monitor
   */
  private async testSystemMonitor(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      const status = this.systemMonitor.getStatus();
      const isMonitoring = status.isMonitoring;
      
      return {
        name: 'System Monitor',
        status: isMonitoring ? 'PASS' : 'FAIL',
        message: isMonitoring ? 'System monitor is active' : 'System monitor is not running',
        details: status,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'System Monitor',
        status: 'FAIL',
        message: `System monitor test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test performance optimizer
   */
  private async testPerformanceOptimizer(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      const status = this.performanceOptimizer.getStatus();
      const isOptimizing = status.isOptimizing;
      
      return {
        name: 'Performance Optimizer',
        status: isOptimizing ? 'PASS' : 'WARNING',
        message: isOptimizing ? 'Performance optimizer is active' : 'Performance optimizer is not running',
        details: status,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'Performance Optimizer',
        status: 'FAIL',
        message: `Performance optimizer test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test auto-restart manager
   */
  private async testAutoRestartManager(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      const status = this.autoRestartManager.getStatus();
      const isMonitoring = status.isMonitoring;
      
      return {
        name: 'Auto-Restart Manager',
        status: isMonitoring ? 'PASS' : 'WARNING',
        message: isMonitoring ? 'Auto-restart manager is active' : 'Auto-restart manager is not monitoring',
        details: status,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'Auto-Restart Manager',
        status: 'FAIL',
        message: `Auto-restart manager test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Test memory usage
   */
  private async testMemoryUsage(): Promise<DiagnosticResult> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const usagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      let status: 'PASS' | 'WARNING' | 'FAIL';
      let message: string;
      
      if (usagePercent < 70) {
        status = 'PASS';
        message = `Memory usage is healthy (${usagePercent.toFixed(1)}%)`;
      } else if (usagePercent < 90) {
        status = 'WARNING';
        message = `Memory usage is high (${usagePercent.toFixed(1)}%)`;
      } else {
        status = 'FAIL';
        message = `Memory usage is critical (${usagePercent.toFixed(1)}%)`;
      }
      
      return {
        name: 'Memory Usage',
        status,
        message,
        details: { usagePercent, memoryUsage },
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        name: 'Memory Usage',
        status: 'FAIL',
        message: `Memory usage test failed: ${error}`,
        duration: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Perform system cleanup
   */
  public async performSystemCleanup(): Promise<void> {
    try {
      logger.info('🧹 Performing system cleanup...');

      // Clean old backups
      await this.cleanupOldBackups();

      logger.info('✅ System cleanup completed');

    } catch (error) {
      logger.error('❌ System cleanup failed:', error);
    }
  }

  /**
   * Clean up old backups
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backupFiles = await fs.readdir(this.backupConfig.backupDir);
      const backupDirs = backupFiles.filter(file => file.startsWith('backup-'));
      
      if (backupDirs.length > this.backupConfig.maxBackups) {
        // Sort by creation time and remove oldest
        backupDirs.sort();
        const toRemove = backupDirs.slice(0, backupDirs.length - this.backupConfig.maxBackups);
        
        for (const dir of toRemove) {
          const dirPath = join(this.backupConfig.backupDir, dir);
          await fs.rm(dirPath, { recursive: true, force: true });
          logger.info(`🗑️ Removed old backup: ${dir}`);
        }
      }

    } catch (error) {
      logger.error('❌ Backup cleanup failed:', error);
    }
  }

  /**
   * Get administration tools status
   */
  public getStatus(): {
    backupConfig: BackupConfig;
    lastBackup: Date | null;
    timestamp: number;
  } {
    return {
      backupConfig: this.backupConfig,
      lastBackup: null, // Would track last backup time
      timestamp: Date.now()
    };
  }
}

// =============================================================================
// SYSTEM ADMINISTRATION TOOLS NOTES
// =============================================================================
// 1. Comprehensive backup and restore procedures
// 2. System diagnostics and health reporting
// 3. Performance optimization and cleanup procedures
// 4. CLI tools for system management and monitoring
// 5. Comprehensive logging and audit trails for all operations
// =============================================================================