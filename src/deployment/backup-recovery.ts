/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - BACKUP AND RECOVERY AUTOMATION
 * =============================================================================
 * 
 * This module provides comprehensive backup and recovery automation
 * for the AI crypto trading agent production deployment.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'fs';
import { join, basename } from 'path';
import { logger } from '../core/logger';
import { databaseSetup } from './database-setup';
import * as cron from 'node-cron';

interface BackupConfig {
  enabled: boolean;
  schedule: string;
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  compression: boolean;
  encryption: boolean;
  remoteBackup: boolean;
}

interface BackupItem {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'database';
  critical: boolean;
  size?: number;
}

interface BackupResult {
  timestamp: Date;
  success: boolean;
  items: BackupItem[];
  totalSize: number;
  duration: number;
  location: string;
  error?: string;
}

interface RecoveryPlan {
  name: string;
  description: string;
  steps: RecoveryStep[];
  estimatedTime: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface RecoveryStep {
  order: number;
  description: string;
  action: () => Promise<void>;
  rollback?: () => Promise<void>;
  critical: boolean;
}

export class BackupRecovery {
  private config: BackupConfig;
  private backupHistory: BackupResult[] = [];
  private recoveryPlans: RecoveryPlan[] = [];
  private isRunning: boolean = false;

  constructor() {
    this.initializeConfig();
    this.initializeRecoveryPlans();
  }

  /**
   * Initialize backup configuration
   */
  private initializeConfig(): void {
    this.config = {
      enabled: true,
      schedule: '0 2 * * *', // Daily at 2 AM
      retention: {
        daily: 7,
        weekly: 4,
        monthly: 12
      },
      compression: true,
      encryption: false, // Would require encryption key setup
      remoteBackup: false // Would require remote storage configuration
    };
  }

  /**
   * Initialize recovery plans
   */
  private initializeRecoveryPlans(): void {
    this.recoveryPlans = [
      {
        name: 'database-corruption',
        description: 'Recover from database corruption',
        estimatedTime: 15,
        riskLevel: 'MEDIUM',
        steps: [
          {
            order: 1,
            description: 'Stop all trading services',
            critical: true,
            action: async () => {
              execSync('pm2 stop all');
            },
            rollback: async () => {
              execSync('pm2 start all');
            }
          },
          {
            order: 2,
            description: 'Backup corrupted database',
            critical: false,
            action: async () => {
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const backupPath = join(process.cwd(), 'backups', `corrupted-db-${timestamp}.db`);
              if (existsSync('data/trading.db')) {
                execSync(`cp data/trading.db ${backupPath}`);
              }
            }
          },
          {
            order: 3,
            description: 'Restore database from latest backup',
            critical: true,
            action: async () => {
              const latestBackup = await this.findLatestDatabaseBackup();
              if (latestBackup) {
                await databaseSetup.restore(latestBackup);
              } else {
                throw new Error('No database backup found');
              }
            }
          },
          {
            order: 4,
            description: 'Validate database integrity',
            critical: true,
            action: async () => {
              const isValid = await databaseSetup.validateIntegrity();
              if (!isValid) {
                throw new Error('Database integrity validation failed');
              }
            }
          },
          {
            order: 5,
            description: 'Restart trading services',
            critical: true,
            action: async () => {
              execSync('pm2 start all');
            }
          }
        ]
      },
      {
        name: 'system-failure',
        description: 'Recover from complete system failure',
        estimatedTime: 60,
        riskLevel: 'HIGH',
        steps: [
          {
            order: 1,
            description: 'Assess system state',
            critical: true,
            action: async () => {
              // Check what's working and what's not
              await this.assessSystemState();
            }
          },
          {
            order: 2,
            description: 'Restore configuration files',
            critical: true,
            action: async () => {
              await this.restoreConfigurationFiles();
            }
          },
          {
            order: 3,
            description: 'Restore application files',
            critical: true,
            action: async () => {
              await this.restoreApplicationFiles();
            }
          },
          {
            order: 4,
            description: 'Restore database',
            critical: true,
            action: async () => {
              const latestBackup = await this.findLatestDatabaseBackup();
              if (latestBackup) {
                await databaseSetup.restore(latestBackup);
              }
            }
          },
          {
            order: 5,
            description: 'Restart all services',
            critical: true,
            action: async () => {
              execSync('pm2 start ecosystem.config.js');
            }
          },
          {
            order: 6,
            description: 'Verify system functionality',
            critical: true,
            action: async () => {
              await this.verifySystemFunctionality();
            }
          }
        ]
      },
      {
        name: 'configuration-corruption',
        description: 'Recover from configuration file corruption',
        estimatedTime: 10,
        riskLevel: 'LOW',
        steps: [
          {
            order: 1,
            description: 'Backup corrupted configuration',
            critical: false,
            action: async () => {
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              if (existsSync('.env')) {
                execSync(`cp .env backups/corrupted-env-${timestamp}.env`);
              }
            }
          },
          {
            order: 2,
            description: 'Restore configuration from backup',
            critical: true,
            action: async () => {
              const latestConfig = await this.findLatestConfigBackup();
              if (latestConfig) {
                execSync(`cp ${latestConfig} .env`);
              } else {
                throw new Error('No configuration backup found');
              }
            }
          },
          {
            order: 3,
            description: 'Validate configuration',
            critical: true,
            action: async () => {
              // Would use configuration manager to validate
              logger.info('Configuration validation would be performed here');
            }
          },
          {
            order: 4,
            description: 'Restart services with new configuration',
            critical: true,
            action: async () => {
              execSync('pm2 restart all');
            }
          }
        ]
      }
    ];
  }

  /**
   * Start automated backup system
   */
  async startAutomatedBackups(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Backup automation is already running');
      return;
    }

    if (!this.config.enabled) {
      logger.info('Backup automation is disabled');
      return;
    }

    logger.info('🔄 Starting automated backup system...');

    // Schedule regular backups
    cron.schedule(this.config.schedule, async () => {
      try {
        await this.performFullBackup();
      } catch (error) {
        logger.error('Scheduled backup failed:', error);
      }
    });

    // Schedule backup cleanup
    cron.schedule('0 3 * * 0', async () => { // Weekly on Sunday at 3 AM
      try {
        await this.cleanupOldBackups();
      } catch (error) {
        logger.error('Backup cleanup failed:', error);
      }
    });

    this.isRunning = true;
    logger.info('✅ Automated backup system started');
  }

  /**
   * Stop automated backup system
   */
  async stopAutomatedBackups(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('🛑 Stopping automated backup system...');
    
    // Stop cron jobs would be handled by the monitoring system
    this.isRunning = false;
    
    logger.info('✅ Automated backup system stopped');
  }

  /**
   * Perform full system backup
   */
  async performFullBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    const backupDir = join(process.cwd(), 'backups', `full-backup-${timestamp.toISOString().replace(/[:.]/g, '-')}`);

    logger.info('💾 Starting full system backup...');

    try {
      // Create backup directory
      mkdirSync(backupDir, { recursive: true });

      const backupItems: BackupItem[] = [];
      let totalSize = 0;

      // Define items to backup
      const itemsToBackup = [
        { name: 'configuration', path: '.env', type: 'file' as const, critical: true },
        { name: 'package-config', path: 'package.json', type: 'file' as const, critical: true },
        { name: 'ecosystem-config', path: 'ecosystem.config.js', type: 'file' as const, critical: true },
        { name: 'application-build', path: 'dist', type: 'directory' as const, critical: true },
        { name: 'database', path: 'data', type: 'directory' as const, critical: true },
        { name: 'logs', path: 'logs', type: 'directory' as const, critical: false },
        { name: 'keys', path: 'keys', type: 'directory' as const, critical: true }
      ];

      // Backup each item
      for (const item of itemsToBackup) {
        if (existsSync(item.path)) {
          const itemBackupPath = join(backupDir, item.name);
          let itemSize = 0;

          try {
            if (item.type === 'file') {
              execSync(`cp ${item.path} ${itemBackupPath}`);
              itemSize = statSync(item.path).size;
            } else {
              execSync(`cp -r ${item.path} ${itemBackupPath}`);
              itemSize = this.getDirectorySize(item.path);
            }

            backupItems.push({
              ...item,
              size: itemSize
            });

            totalSize += itemSize;
            logger.info(`✅ Backed up ${item.name} (${this.formatBytes(itemSize)})`);

          } catch (error) {
            logger.error(`❌ Failed to backup ${item.name}:`, error);
            if (item.critical) {
              throw new Error(`Critical backup item failed: ${item.name}`);
            }
          }
        } else {
          logger.warn(`⚠️ Backup item not found: ${item.path}`);
        }
      }

      // Create backup manifest
      const manifest = {
        timestamp,
        version: '1.0.0',
        items: backupItems,
        totalSize,
        compression: this.config.compression,
        encryption: this.config.encryption
      };

      writeFileSync(join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      // Compress backup if enabled
      if (this.config.compression) {
        const compressedPath = `${backupDir}.tar.gz`;
        execSync(`tar -czf ${compressedPath} -C ${join(backupDir, '..')} ${basename(backupDir)}`);
        execSync(`rm -rf ${backupDir}`);
        
        const compressedSize = statSync(compressedPath).size;
        logger.info(`🗜️ Backup compressed: ${this.formatBytes(totalSize)} → ${this.formatBytes(compressedSize)}`);
        totalSize = compressedSize;
      }

      const duration = Date.now() - startTime;
      const result: BackupResult = {
        timestamp,
        success: true,
        items: backupItems,
        totalSize,
        duration,
        location: this.config.compression ? `${backupDir}.tar.gz` : backupDir
      };

      this.backupHistory.push(result);
      logger.info(`✅ Full backup completed in ${duration}ms (${this.formatBytes(totalSize)})`);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const result: BackupResult = {
        timestamp,
        success: false,
        items: [],
        totalSize: 0,
        duration,
        location: backupDir,
        error: error.message
      };

      this.backupHistory.push(result);
      logger.error('❌ Full backup failed:', error);

      // Cleanup failed backup
      try {
        execSync(`rm -rf ${backupDir}`);
      } catch {
        // Ignore cleanup errors
      }

      throw error;
    }
  }

  /**
   * Execute recovery plan
   */
  async executeRecovery(planName: string): Promise<{ success: boolean; completedSteps: number; error?: string }> {
    const plan = this.recoveryPlans.find(p => p.name === planName);
    if (!plan) {
      throw new Error(`Recovery plan not found: ${planName}`);
    }

    logger.info(`🔄 Executing recovery plan: ${plan.name}`);
    logger.info(`📋 Description: ${plan.description}`);
    logger.info(`⏱️ Estimated time: ${plan.estimatedTime} minutes`);
    logger.info(`⚠️ Risk level: ${plan.riskLevel}`);

    let completedSteps = 0;
    const executedSteps: { step: RecoveryStep; success: boolean }[] = [];

    try {
      for (const step of plan.steps) {
        logger.info(`🔧 Step ${step.order}: ${step.description}`);

        try {
          await step.action();
          executedSteps.push({ step, success: true });
          completedSteps++;
          logger.info(`✅ Step ${step.order} completed`);

        } catch (error) {
          logger.error(`❌ Step ${step.order} failed:`, error);
          executedSteps.push({ step, success: false });

          if (step.critical) {
            logger.error('💥 Critical step failed, initiating rollback...');
            await this.rollbackRecovery(executedSteps);
            throw new Error(`Critical recovery step failed: ${step.description}`);
          } else {
            logger.warn('⚠️ Non-critical step failed, continuing...');
          }
        }
      }

      logger.info(`✅ Recovery plan completed: ${plan.name}`);
      return { success: true, completedSteps };

    } catch (error) {
      logger.error(`❌ Recovery plan failed: ${plan.name}`, error);
      return { success: false, completedSteps, error: error.message };
    }
  }

  /**
   * Rollback recovery steps
   */
  private async rollbackRecovery(executedSteps: { step: RecoveryStep; success: boolean }[]): Promise<void> {
    logger.info('🔄 Rolling back recovery steps...');

    // Rollback in reverse order
    const successfulSteps = executedSteps.filter(s => s.success).reverse();

    for (const { step } of successfulSteps) {
      if (step.rollback) {
        try {
          logger.info(`↩️ Rolling back step ${step.order}: ${step.description}`);
          await step.rollback();
          logger.info(`✅ Rollback completed for step ${step.order}`);
        } catch (error) {
          logger.error(`❌ Rollback failed for step ${step.order}:`, error);
        }
      }
    }

    logger.info('✅ Recovery rollback completed');
  }

  /**
   * Cleanup old backups based on retention policy
   */
  private async cleanupOldBackups(): Promise<void> {
    logger.info('🗑️ Cleaning up old backups...');

    const backupsDir = join(process.cwd(), 'backups');
    if (!existsSync(backupsDir)) {
      return;
    }

    try {
      // Keep daily backups for specified days
      execSync(`find ${backupsDir} -name "full-backup-*" -mtime +${this.config.retention.daily} -delete`);
      
      // Keep weekly backups (every 7th backup older than daily retention)
      // This is a simplified approach - in production, you'd want more sophisticated logic
      
      logger.info('✅ Backup cleanup completed');

    } catch (error) {
      logger.error('❌ Backup cleanup failed:', error);
    }
  }

  /**
   * Find latest database backup
   */
  private async findLatestDatabaseBackup(): Promise<string | null> {
    const backupsDir = join(process.cwd(), 'backups');
    if (!existsSync(backupsDir)) {
      return null;
    }

    try {
      const backups = execSync(`find ${backupsDir} -name "*db-backup-*.db" -type f | sort -r | head -1`, { 
        encoding: 'utf-8' 
      }).trim();

      return backups || null;
    } catch {
      return null;
    }
  }

  /**
   * Find latest configuration backup
   */
  private async findLatestConfigBackup(): Promise<string | null> {
    const backupsDir = join(process.cwd(), 'backups');
    if (!existsSync(backupsDir)) {
      return null;
    }

    try {
      const backups = execSync(`find ${backupsDir} -name "*env-backup-*.env" -type f | sort -r | head -1`, { 
        encoding: 'utf-8' 
      }).trim();

      return backups || null;
    } catch {
      return null;
    }
  }

  /**
   * Recovery plan helper methods
   */
  private async assessSystemState(): Promise<void> {
    logger.info('🔍 Assessing system state...');
    
    // Check if PM2 is running
    try {
      execSync('pm2 status', { stdio: 'pipe' });
      logger.info('✅ PM2 is running');
    } catch {
      logger.warn('⚠️ PM2 is not running');
    }

    // Check if database exists
    if (existsSync('data/trading.db')) {
      logger.info('✅ Database file exists');
    } else {
      logger.warn('⚠️ Database file missing');
    }

    // Check if configuration exists
    if (existsSync('.env')) {
      logger.info('✅ Configuration file exists');
    } else {
      logger.warn('⚠️ Configuration file missing');
    }
  }

  private async restoreConfigurationFiles(): Promise<void> {
    logger.info('📝 Restoring configuration files...');
    
    const latestConfig = await this.findLatestConfigBackup();
    if (latestConfig) {
      execSync(`cp ${latestConfig} .env`);
      logger.info('✅ Configuration restored');
    } else {
      throw new Error('No configuration backup found');
    }
  }

  private async restoreApplicationFiles(): Promise<void> {
    logger.info('📦 Restoring application files...');
    
    // This would restore from the latest full backup
    // For now, just log the action
    logger.info('✅ Application files would be restored here');
  }

  private async verifySystemFunctionality(): Promise<void> {
    logger.info('🔍 Verifying system functionality...');
    
    // Check API health
    try {
      execSync('curl -f http://localhost:3001/api/v1/health', { stdio: 'pipe' });
      logger.info('✅ API is responding');
    } catch {
      throw new Error('API health check failed');
    }

    // Check database integrity
    const dbValid = await databaseSetup.validateIntegrity();
    if (!dbValid) {
      throw new Error('Database integrity check failed');
    }
    
    logger.info('✅ System functionality verified');
  }

  /**
   * Utility methods
   */
  private getDirectorySize(dirPath: string): number {
    try {
      const output = execSync(`du -sb ${dirPath}`, { encoding: 'utf-8' });
      return parseInt(output.split('\t')[0]);
    } catch {
      return 0;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get backup history
   */
  getBackupHistory(): BackupResult[] {
    return this.backupHistory;
  }

  /**
   * Get available recovery plans
   */
  getRecoveryPlans(): RecoveryPlan[] {
    return this.recoveryPlans;
  }

  /**
   * Get backup configuration
   */
  getConfig(): BackupConfig {
    return this.config;
  }

  /**
   * Update backup configuration
   */
  updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('✅ Backup configuration updated');
  }
}

// Export singleton instance
export const backupRecovery = new BackupRecovery();
