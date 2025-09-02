#!/usr/bin/env tsx

/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - SYSTEM MONITOR CLI SCRIPT
 * =============================================================================
 * 
 * CLI script for monitoring Intel NUC system performance and health.
 * Provides real-time monitoring and diagnostic capabilities.
 * 
 * Usage:
 *   npm run system:monitor
 *   tsx src/scripts/system-monitor.ts
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
 * Main function for system monitoring CLI
 */
async function main(): Promise<void> {
  try {
    console.log('🖥️ AI Crypto Trading Agent - System Monitor');
    console.log('='.repeat(50));

    // Initialize components
    const systemMonitor = new SystemMonitor();
    const performanceOptimizer = new PerformanceOptimizer(systemMonitor);
    const autoRestartManager = new AutoRestartManager();
    const adminTools = new AdminTools(systemMonitor, performanceOptimizer, autoRestartManager);

    // Initialize system monitor
    await systemMonitor.startHardwareMonitoring();

    // Get system health status
    const healthStatus = await systemMonitor.getSystemHealthStatus();
    
    console.log('\n📊 System Health Status:');
    console.log(`Overall Health: ${healthStatus.overallHealth}/100`);
    console.log(`CPU Health: ${healthStatus.components.cpu.status} (${healthStatus.components.cpu.score}/100)`);
    console.log(`RAM Health: ${healthStatus.components.ram.status} (${healthStatus.components.ram.score}/100)`);
    console.log(`SSD Health: ${healthStatus.components.ssd.status} (${healthStatus.components.ssd.score}/100)`);
    console.log(`Network Health: ${healthStatus.components.network.status} (${healthStatus.components.network.score}/100)`);
    console.log(`Thermal Health: ${healthStatus.components.thermal.status} (${healthStatus.components.thermal.score}/100)`);

    // Get current metrics
    const metrics = systemMonitor.getCurrentMetrics();
    
    if (metrics.cpu) {
      console.log('\n🔥 CPU Metrics:');
      console.log(`Utilization: ${metrics.cpu.utilization}%`);
      console.log(`Temperature: ${metrics.cpu.temperature}°C`);
      console.log(`Frequency: ${metrics.cpu.frequency}MHz`);
      console.log(`Cores: ${metrics.cpu.cores.physical} physical, ${metrics.cpu.cores.logical} logical`);
    }

    if (metrics.ram) {
      console.log('\n💾 Memory Metrics:');
      console.log(`Utilization: ${metrics.ram.utilization}%`);
      console.log(`Used: ${Math.round(metrics.ram.used / 1024 / 1024 / 1024 * 100) / 100}GB`);
      console.log(`Total: ${Math.round(metrics.ram.total / 1024 / 1024 / 1024 * 100) / 100}GB`);
      console.log(`Available: ${Math.round(metrics.ram.available / 1024 / 1024 / 1024 * 100) / 100}GB`);
    }

    if (metrics.ssd) {
      console.log('\n💿 Storage Metrics:');
      console.log(`Utilization: ${metrics.ssd.utilization}%`);
      console.log(`Used: ${Math.round(metrics.ssd.used / 1024 / 1024 / 1024 * 100) / 100}GB`);
      console.log(`Total: ${Math.round(metrics.ssd.total / 1024 / 1024 / 1024 * 100) / 100}GB`);
      console.log(`Health: ${metrics.ssd.health}%`);
    }

    if (metrics.network) {
      console.log('\n🌐 Network Metrics:');
      console.log(`Active Interfaces: ${metrics.network.interfaces.filter(i => i.isUp).length}`);
      console.log(`Download Speed: ${metrics.network.downloadSpeed.toFixed(2)} Mbps`);
      console.log(`Upload Speed: ${metrics.network.uploadSpeed.toFixed(2)} Mbps`);
    }

    // Show alerts if any
    if (healthStatus.alerts.length > 0) {
      console.log('\n⚠️ Active Alerts:');
      for (const alert of healthStatus.alerts) {
        console.log(`- ${alert.severity}: ${alert.message}`);
      }
    }

    // Show recommendations if any
    if (healthStatus.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      for (const recommendation of healthStatus.recommendations) {
        console.log(`- ${recommendation}`);
      }
    }

    // Run system diagnostics
    console.log('\n🔍 Running System Diagnostics...');
    const diagnostics = await adminTools.runSystemDiagnostics();
    
    console.log(`\n📋 Diagnostic Results (${diagnostics.overallStatus}):`);
    for (const diagnostic of diagnostics.diagnostics) {
      const statusIcon = diagnostic.status === 'PASS' ? '✅' : 
                        diagnostic.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`${statusIcon} ${diagnostic.name}: ${diagnostic.message}`);
    }

    console.log(`\nOverall Health Score: ${diagnostics.healthScore}/100`);

    // Stop monitoring
    systemMonitor.stopHardwareMonitoring();

    console.log('\n✅ System monitoring completed');

  } catch (error) {
    console.error('❌ System monitoring failed:', error);
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
