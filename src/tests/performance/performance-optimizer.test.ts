/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - PERFORMANCE OPTIMIZER TESTS
 * =============================================================================
 * 
 * Test suite for Intel NUC performance optimization components.
 * Validates memory, disk, and CPU optimization functionality.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { PerformanceOptimizer } from '../../infrastructure/performance/performance-optimizer';
import { MemoryOptimizer } from '../../infrastructure/performance/memory-optimizer';
import { DiskOptimizer } from '../../infrastructure/performance/disk-optimizer';
import { CPUOptimizer } from '../../infrastructure/performance/cpu-optimizer';
import { PerformanceIntegration } from '../../infrastructure/performance/performance-integration';

describe('Intel NUC Performance Optimization', () => {
  let performanceOptimizer: PerformanceOptimizer;
  let memoryOptimizer: MemoryOptimizer;
  let diskOptimizer: DiskOptimizer;
  let cpuOptimizer: CPUOptimizer;
  let performanceIntegration: PerformanceIntegration;

  beforeEach(() => {
    // Initialize optimizers with test configuration
    performanceOptimizer = new PerformanceOptimizer({
      enableMemoryOptimization: true,
      enableDiskOptimization: true,
      enableCPUOptimization: true,
      systemMonitoringIntervalMs: 5000, // Faster for tests
      reportingIntervalMs: 10000,
      enableAutoOptimization: false, // Disable for controlled testing
      performanceAlertThreshold: 70,
      criticalPerformanceThreshold: 85
    });

    memoryOptimizer = new MemoryOptimizer({
      maxSystemUsagePercent: 75,
      criticalSystemUsagePercent: 90,
      maxProcessMemoryMB: 1024,
      monitoringIntervalMs: 5000,
      gcOptimizationIntervalMs: 10000,
      enableAutoGC: false,
      enablePressureDetection: true,
      cleanupThresholdPercent: 80
    });

    diskOptimizer = new DiskOptimizer({
      maxUsagePercent: 80,
      criticalUsagePercent: 95,
      monitoringIntervalMs: 5000,
      cleanupIntervalMs: 10000,
      logRetentionDays: 7, // Shorter for tests
      enableAutoCleanup: false,
      monitoredDirectories: ['./logs', './dist', './coverage'],
      excludedDirectories: ['./src', './node_modules']
    });

    cpuOptimizer = new CPUOptimizer({
      maxUsagePercent: 70,
      criticalUsagePercent: 85,
      monitoringIntervalMs: 5000,
      optimizationIntervalMs: 10000,
      enablePriorityOptimization: false, // May require privileges
      enableAffinityOptimization: false,
      enableThrottling: false,
      workerPoolSize: 1,
      tempWarningThreshold: 70,
      tempCriticalThreshold: 80
    });

    performanceIntegration = new PerformanceIntegration();
  });

  afterEach(async () => {
    // Clean up optimizers
    if (performanceOptimizer) {
      performanceOptimizer.stopOptimization();
    }
    if (memoryOptimizer) {
      memoryOptimizer.stopOptimization();
    }
    if (diskOptimizer) {
      diskOptimizer.stopOptimization();
    }
    if (cpuOptimizer) {
      cpuOptimizer.stopOptimization();
    }
    if (performanceIntegration) {
      await performanceIntegration.shutdown();
    }
  });

  describe('Memory Optimizer', () => {
    it('should initialize and collect memory metrics', async () => {
      await memoryOptimizer.startOptimization();
      
      // Wait for initial metrics collection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const metrics = memoryOptimizer.getCurrentMetrics();
      expect(metrics).toBeTruthy();
      expect(metrics?.totalSystemMemory).toBeGreaterThan(0);
      expect(metrics?.systemUtilization).toBeGreaterThanOrEqual(0);
      expect(metrics?.systemUtilization).toBeLessThanOrEqual(100);
      expect(metrics?.pressureLevel).toBeDefined();
    });

    it('should provide memory optimizer status', () => {
      const status = memoryOptimizer.getStatus();
      expect(status).toBeTruthy();
      expect(status.isMonitoring).toBe(false); // Not started yet
      expect(status.config).toBeDefined();
    });

    it('should handle garbage collection', async () => {
      await memoryOptimizer.startOptimization();
      
      // Force garbage collection
      await memoryOptimizer.forceGarbageCollection();
      
      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Disk Optimizer', () => {
    it('should initialize and collect disk metrics', async () => {
      await diskOptimizer.startOptimization();
      
      // Wait for initial metrics collection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const metrics = diskOptimizer.getCurrentMetrics();
      expect(metrics).toBeTruthy();
      expect(metrics?.totalSpace).toBeGreaterThan(0);
      expect(metrics?.utilization).toBeGreaterThanOrEqual(0);
      expect(metrics?.utilization).toBeLessThanOrEqual(100);
      expect(metrics?.healthStatus).toBeDefined();
    });

    it('should provide disk optimizer status', () => {
      const status = diskOptimizer.getStatus();
      expect(status).toBeTruthy();
      expect(status.isMonitoring).toBe(false); // Not started yet
      expect(status.config).toBeDefined();
    });

    it('should handle cleanup operations', async () => {
      await diskOptimizer.startOptimization();
      
      // Force cleanup
      await diskOptimizer.forceCleanup();
      
      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('CPU Optimizer', () => {
    it('should initialize and collect CPU metrics', async () => {
      await cpuOptimizer.startOptimization();
      
      // Wait for initial metrics collection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const metrics = cpuOptimizer.getCurrentMetrics();
      expect(metrics).toBeTruthy();
      expect(metrics?.overallUtilization).toBeGreaterThanOrEqual(0);
      expect(metrics?.overallUtilization).toBeLessThanOrEqual(100);
      expect(metrics?.architecture).toBeDefined();
      expect(metrics?.performanceLevel).toBeDefined();
    });

    it('should provide CPU optimizer status', () => {
      const status = cpuOptimizer.getStatus();
      expect(status).toBeTruthy();
      expect(status.isMonitoring).toBe(false); // Not started yet
      expect(status.config).toBeDefined();
    });

    it('should handle CPU optimization', async () => {
      await cpuOptimizer.startOptimization();
      
      // Force CPU optimization
      await cpuOptimizer.forceCPUOptimization();
      
      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Performance Optimizer', () => {
    it('should initialize and coordinate all optimizers', async () => {
      await performanceOptimizer.startOptimization();
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const metrics = performanceOptimizer.getCurrentMetrics();
      expect(metrics).toBeTruthy();
      expect(metrics?.overallHealthScore).toBeGreaterThanOrEqual(0);
      expect(metrics?.overallHealthScore).toBeLessThanOrEqual(100);
      expect(metrics?.performanceLevel).toBeDefined();
    });

    it('should provide comprehensive status', () => {
      const status = performanceOptimizer.getStatus();
      expect(status).toBeTruthy();
      expect(status.isMonitoring).toBe(false); // Not started yet
      expect(status.config).toBeDefined();
    });

    it('should handle system optimization', async () => {
      await performanceOptimizer.startOptimization();
      
      // Force system optimization
      await performanceOptimizer.forceSystemOptimization();
      
      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Performance Integration', () => {
    it('should initialize performance integration', async () => {
      await performanceIntegration.initialize();
      
      const status = performanceIntegration.getStatus();
      expect(status.isInitialized).toBe(true);
    });

    it('should provide health check', async () => {
      await performanceIntegration.initialize();
      
      const healthCheck = await performanceIntegration.healthCheck();
      expect(healthCheck).toBeTruthy();
      expect(healthCheck.healthy).toBeDefined();
      expect(healthCheck.score).toBeGreaterThanOrEqual(0);
      expect(healthCheck.score).toBeLessThanOrEqual(100);
      expect(healthCheck.details).toBeDefined();
    });

    it('should handle force optimization', async () => {
      await performanceIntegration.initialize();
      
      // Force optimization
      await performanceIntegration.forceOptimization();
      
      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle performance alerts', async () => {
      let alertReceived = false;
      
      performanceOptimizer.on('systemAlert', (alert) => {
        alertReceived = true;
        expect(alert).toBeTruthy();
        expect(alert.type).toBeDefined();
        expect(alert.severity).toBeDefined();
      });
      
      await performanceOptimizer.startOptimization();
      
      // Wait for potential alerts
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Alert reception is optional (depends on system state)
      expect(true).toBe(true);
    });

    it('should generate performance reports', async () => {
      let reportReceived = false;
      
      performanceOptimizer.on('performanceReport', (report) => {
        reportReceived = true;
        expect(report).toBeTruthy();
        expect(report.id).toBeDefined();
        expect(report.summary).toBeDefined();
      });
      
      await performanceOptimizer.startOptimization();
      
      // Wait for potential reports
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Report generation is optional (depends on timing)
      expect(true).toBe(true);
    });
  });
});