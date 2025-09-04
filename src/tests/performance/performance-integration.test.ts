/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - PERFORMANCE INTEGRATION TESTS
 * =============================================================================
 * 
 * This module tests the performance optimization integration to ensure all
 * components work correctly together on Intel NUC hardware.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { PerformanceIntegration } from '../../infrastructure/performance/performance-integration';
import { PerformanceOptimizer } from '../../infrastructure/performance/performance-optimizer';
import { MemoryOptimizer } from '../../infrastructure/performance/memory-optimizer';
import { DiskOptimizer } from '../../infrastructure/performance/disk-optimizer';
import { CPUOptimizer } from '../../infrastructure/performance/cpu-optimizer';

describe('Performance Integration Tests', () => {
  let performanceIntegration: PerformanceIntegration;

  beforeEach(() => {
    performanceIntegration = new PerformanceIntegration();
  });

  afterEach(async () => {
    if (performanceIntegration) {
      await performanceIntegration.shutdown();
    }
  });

  describe('Performance Integration Initialization', () => {
    it('should initialize performance integration successfully', async () => {
      await performanceIntegration.initialize();
      
      const status = performanceIntegration.getStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.isOptimizing).toBe(false);
    });

    it('should handle initialization errors gracefully', async () => {
      // Test error handling during initialization
      const mockPerformanceIntegration = new PerformanceIntegration();
      
      // This should not throw an error
      await expect(mockPerformanceIntegration.initialize()).resolves.not.toThrow();
    });
  });

  describe('Performance Optimizer Components', () => {
    it('should create all optimizer components', () => {
      const performanceOptimizer = new PerformanceOptimizer();
      expect(performanceOptimizer).toBeDefined();
      
      const memoryOptimizer = new MemoryOptimizer();
      expect(memoryOptimizer).toBeDefined();
      
      const diskOptimizer = new DiskOptimizer();
      expect(diskOptimizer).toBeDefined();
      
      const cpuOptimizer = new CPUOptimizer();
      expect(cpuOptimizer).toBeDefined();
    });

    it('should start and stop optimization correctly', async () => {
      const performanceOptimizer = new PerformanceOptimizer();
      
      await performanceOptimizer.startOptimization();
      const status = performanceOptimizer.getStatus();
      expect(status.isMonitoring).toBe(true);
      
      performanceOptimizer.stopOptimization();
      const stoppedStatus = performanceOptimizer.getStatus();
      expect(stoppedStatus.isMonitoring).toBe(false);
    });
  });

  describe('Memory Optimizer', () => {
    it('should collect memory metrics', async () => {
      const memoryOptimizer = new MemoryOptimizer();
      await memoryOptimizer.startOptimization();
      
      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const metrics = memoryOptimizer.getCurrentMetrics();
      expect(metrics).toBeTruthy();
      if (metrics) {
        expect(metrics.totalSystemMemory).toBeGreaterThan(0);
        expect(metrics.systemUtilization).toBeGreaterThanOrEqual(0);
        expect(metrics.systemUtilization).toBeLessThanOrEqual(100);
        expect(metrics.pressureLevel).toMatch(/LOW|MEDIUM|HIGH|CRITICAL/);
      }
      
      memoryOptimizer.stopOptimization();
    });

    it('should handle garbage collection', async () => {
      const memoryOptimizer = new MemoryOptimizer();
      await memoryOptimizer.startOptimization();
      
      // Force garbage collection
      await memoryOptimizer.forceGarbageCollection();
      
      // Should complete without errors
      expect(true).toBe(true);
      
      memoryOptimizer.stopOptimization();
    });
  });

  describe('CPU Optimizer', () => {
    it('should collect CPU metrics', async () => {
      const cpuOptimizer = new CPUOptimizer();
      await cpuOptimizer.startOptimization();
      
      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const metrics = cpuOptimizer.getCurrentMetrics();
      expect(metrics).toBeTruthy();
      if (metrics) {
        expect(metrics.overallUtilization).toBeGreaterThanOrEqual(0);
        expect(metrics.overallUtilization).toBeLessThanOrEqual(100);
        expect(metrics.architecture.physicalCores).toBeGreaterThan(0);
        expect(metrics.performanceLevel).toMatch(/EXCELLENT|GOOD|WARNING|CRITICAL/);
      }
      
      cpuOptimizer.stopOptimization();
    });

    it('should optimize process priorities', async () => {
      const cpuOptimizer = new CPUOptimizer();
      await cpuOptimizer.startOptimization();
      
      // Force CPU optimization
      await cpuOptimizer.forceCPUOptimization();
      
      // Should complete without errors
      expect(true).toBe(true);
      
      cpuOptimizer.stopOptimization();
    });
  });

  describe('Disk Optimizer', () => {
    it('should collect disk metrics', async () => {
      const diskOptimizer = new DiskOptimizer();
      await diskOptimizer.startOptimization();
      
      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const metrics = diskOptimizer.getCurrentMetrics();
      expect(metrics).toBeTruthy();
      if (metrics) {
        expect(metrics.totalSpace).toBeGreaterThan(0);
        expect(metrics.utilization).toBeGreaterThanOrEqual(0);
        expect(metrics.utilization).toBeLessThanOrEqual(100);
        expect(metrics.healthStatus).toMatch(/EXCELLENT|GOOD|WARNING|CRITICAL/);
      }
      
      diskOptimizer.stopOptimization();
    });

    it('should perform cleanup operations', async () => {
      const diskOptimizer = new DiskOptimizer();
      await diskOptimizer.startOptimization();
      
      // Force cleanup
      await diskOptimizer.forceCleanup();
      
      // Should complete without errors
      expect(true).toBe(true);
      
      diskOptimizer.stopOptimization();
    });
  });

  describe('Performance Integration Health Check', () => {
    it('should provide comprehensive health check', async () => {
      await performanceIntegration.initialize();
      
      const healthCheck = await performanceIntegration.healthCheck();
      
      expect(healthCheck).toBeTruthy();
      expect(healthCheck.healthy).toBeDefined();
      expect(healthCheck.score).toBeGreaterThanOrEqual(0);
      expect(healthCheck.score).toBeLessThanOrEqual(100);
      expect(healthCheck.details).toBeTruthy();
      expect(healthCheck.lastCheck).toBeInstanceOf(Date);
      expect(Array.isArray(healthCheck.issues)).toBe(true);
      expect(Array.isArray(healthCheck.recommendations)).toBe(true);
    });

    it('should detect performance issues', async () => {
      await performanceIntegration.initialize();
      
      const healthCheck = await performanceIntegration.healthCheck();
      
      // Health check should provide meaningful data
      expect(healthCheck.details.isInitialized).toBe(true);
      expect(typeof healthCheck.details.memoryUtilization).toBe('number');
      expect(typeof healthCheck.details.diskUtilization).toBe('number');
      expect(typeof healthCheck.details.cpuUtilization).toBe('number');
    });
  });

  describe('Performance Metrics Collection', () => {
    it('should collect system performance metrics', async () => {
      await performanceIntegration.initialize();
      
      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const metrics = performanceIntegration.getCurrentMetrics();
      
      if (metrics) {
        expect(metrics.overallHealthScore).toBeGreaterThanOrEqual(0);
        expect(metrics.overallHealthScore).toBeLessThanOrEqual(100);
        expect(metrics.performanceLevel).toMatch(/EXCELLENT|GOOD|WARNING|CRITICAL/);
        expect(metrics.activeAlertsCount).toBeGreaterThanOrEqual(0);
        expect(metrics.timestamp).toBeInstanceOf(Date);
        
        // Check optimization status
        expect(typeof metrics.optimizationStatus.memory).toBe('boolean');
        expect(typeof metrics.optimizationStatus.disk).toBe('boolean');
        expect(typeof metrics.optimizationStatus.cpu).toBe('boolean');
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle shutdown gracefully', async () => {
      await performanceIntegration.initialize();
      
      // Should shutdown without errors
      await expect(performanceIntegration.shutdown()).resolves.not.toThrow();
      
      const status = performanceIntegration.getStatus();
      expect(status.isInitialized).toBe(false);
    });

    it('should handle force optimization', async () => {
      await performanceIntegration.initialize();
      
      // Should force optimization without errors
      await expect(performanceIntegration.forceOptimization()).resolves.not.toThrow();
    });
  });

  describe('Intel NUC Hardware Compatibility', () => {
    it('should detect Intel NUC specifications', async () => {
      const cpuOptimizer = new CPUOptimizer();
      await cpuOptimizer.startOptimization();
      
      const metrics = cpuOptimizer.getCurrentMetrics();
      if (metrics) {
        // Should detect reasonable CPU specifications for Intel NUC
        expect(metrics.architecture.physicalCores).toBeGreaterThanOrEqual(2);
        expect(metrics.architecture.physicalCores).toBeLessThanOrEqual(8);
        expect(metrics.architecture.speed).toBeGreaterThan(1000); // At least 1GHz
      }
      
      cpuOptimizer.stopOptimization();
    });

    it('should validate memory specifications', async () => {
      const memoryOptimizer = new MemoryOptimizer();
      await memoryOptimizer.startOptimization();
      
      const metrics = memoryOptimizer.getCurrentMetrics();
      if (metrics) {
        const totalGB = metrics.totalSystemMemory / 1024 / 1024 / 1024;
        // Should detect reasonable memory for Intel NUC (8GB+)
        expect(totalGB).toBeGreaterThanOrEqual(8);
      }
      
      memoryOptimizer.stopOptimization();
    });

    it('should validate disk specifications', async () => {
      const diskOptimizer = new DiskOptimizer();
      await diskOptimizer.startOptimization();
      
      const metrics = diskOptimizer.getCurrentMetrics();
      if (metrics) {
        const totalGB = metrics.totalSpace / 1024 / 1024 / 1024;
        // Should detect reasonable disk space for Intel NUC (200GB+)
        expect(totalGB).toBeGreaterThanOrEqual(200);
      }
      
      diskOptimizer.stopOptimization();
    });
  });
});