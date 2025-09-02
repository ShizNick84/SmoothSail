#!/usr/bin/env tsx

/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - BACKUP CREATION CLI SCRIPT
 * =============================================================================
 * 
 * CLI script for creating system backups with comprehensive data preservation.
 * Supports manual and automated backup creation with encryption and verification.
 * 
 * Usage:
 *   npm run backup:create
 *   tsx src/scripts/backup-create.ts [type]
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { config } from 'dotenv';
import { SystemMonitor } from '@/infrastructure/system-monitor';
import { PerformanceOptimizer } from '@/infrastructure/performance-optimizer';
import { AdminTools } from '@/infrastructure/admin-tools';
import { AutoRestartManager } from '@/infrastructure/auto-restart-manager';
import { logger } from '@/core/logging/logger';

// Load environment variables
config();

/**
 * Main function for backup creation CLI
 */
async function main(): Promise<void> {
  try {
    const backupType = process.argv[2] || 'manual';
    
    console.log('💾 AI Crypto Trading Agent - Backup Creation');
    console.log('='.repeat(50));
    console.log(`Backup Type: ${backupType}`);

    // Initialize components
    const systemMonitor = new SystemMonitor();
    const performanceOptimizer = new PerformanceOptimizer(systemMonitor);
    const autoRestartManager = new AutoRestartManager();
    const adminTools = new AdminTools(systemMonitor, performanceOptimizer, autoRestartManager);

    // Initialize admin tools
    await adminTools.initialize();

    console.log('\n🔍 Pre-backup system check...');
    
    // Run quick diagnostics before backup
    const diagnostics = await adminTools.runSystemDiagnostics();
    console.log(`System Health: ${diagnostics.overallStatus} (${diagnostics.healthScore}/100)`);

    if (diagnostics.overallStatus === 'CRITICAL') {
      console.log('⚠️ Warning: System is in critical state. Backup may be incomplete.');
      console.log('Consider fixing critical issues before creating backup.');
    }

    console.log('\n💾 Creating backup...');
    const startTime = Date.now();

    // Create backup
    const backupPath = await adminTools.createBackup(backupType);
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Backup created successfully!`);
    console.log(`Backup Path: ${backupPath}`);
    console.log(`Duration: ${duration}ms`);

    // Show backup status
    const adminStatus = adminTools.getStatus();
    console.log(`\n📊 Backup Configuration:`);
    console.log(`Backup Directory: ${adminStatus.backupConfig.backupDir}`);
    console.log(`Max Backups: ${adminStatus.backupConfig.maxBackups}`);
    console.log(`Compression: ${adminStatus.backupConfig.compression ? 'Enabled' : 'Disabled'}`);
    console.log(`Encryption: ${adminStatus.backupConfig.encryption ? 'Enabled' : 'Disabled'}`);
    console.log(`Verification: ${adminStatus.backupConfig.verification ? 'Enabled' : 'Disabled'}`);

    console.log(`\n📁 Backup Contents:`);
    console.log(`Configuration: ${adminStatus.backupConfig.includeConfig ? 'Included' : 'Excluded'}`);
    console.log(`Trading Data: ${adminStatus.backupConfig.includeTradingData ? 'Included' : 'Excluded'}`);
    console.log(`Security Data: ${adminStatus.backupConfig.includeSecurityData ? 'Included' : 'Excluded'}`);
    console.log(`Logs: ${adminStatus.backupConfig.includeLogs ? 'Included' : 'Excluded'}`);

    // Perform cleanup
    console.log('\n🧹 Performing backup cleanup...');
    await adminTools.performSystemCleanup();

    console.log('\n✅ Backup process completed successfully');

  } catch (error) {
    console.error('❌ Backup creation failed:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
