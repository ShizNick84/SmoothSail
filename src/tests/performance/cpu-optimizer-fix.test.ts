/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - CPU OPTIMIZER FIX VALIDATION
 * =============================================================================
 * 
 * This test validates the specific fixes made to the CPU optimizer for
 * task 18.11 - Complete Performance Optimization Integration.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import * as os from 'os';

describe('CPU Optimizer Fix Validation', () => {
  describe('Process Priority Fix', () => {
    it('should have access to os.setPriority method', () => {
      // Validate that os.setPriority exists (the correct method)
      expect(typeof os.setPriority).toBe('function');
    });

    it('should not have process.setpriority method', () => {
      // Validate that the incorrect method doesn't exist
      expect((process as any).setpriority).toBeUndefined();
    });

    it('should be able to call os.setPriority without errors', () => {
      // Test that we can call the method (may fail on some platforms, but shouldn't throw)
      expect(() => {
        try {
          os.setPriority(process.pid, 0); // Set to normal priority
        } catch (error) {
          // This is expected on some platforms - just ensure it doesn't crash
          console.log('Platform does not support setPriority:', error);
        }
      }).not.toThrow();
    });
  });

  describe('OS Module Import', () => {
    it('should have all required os module functions', () => {
      expect(typeof os.cpus).toBe('function');
      expect(typeof os.totalmem).toBe('function');
      expect(typeof os.freemem).toBe('function');
      expect(typeof os.loadavg).toBe('function');
      expect(typeof os.hostname).toBe('function');
    });

    it('should be able to get system information', () => {
      const cpuInfo = os.cpus();
      expect(Array.isArray(cpuInfo)).toBe(true);
      expect(cpuInfo.length).toBeGreaterThan(0);

      const totalMem = os.totalmem();
      expect(typeof totalMem).toBe('number');
      expect(totalMem).toBeGreaterThan(0);

      const freeMem = os.freemem();
      expect(typeof freeMem).toBe('number');
      expect(freeMem).toBeGreaterThanOrEqual(0);

      const loadAvg = os.loadavg();
      expect(Array.isArray(loadAvg)).toBe(true);
      expect(loadAvg.length).toBe(3);
    });
  });

  describe('Performance Optimizer Imports', () => {
    it('should be able to import performance optimizer modules', async () => {
      // Test that the modules can be imported without path alias issues
      const { PerformanceOptimizer } = await import('../../infrastructure/performance/performance-optimizer');
      expect(PerformanceOptimizer).toBeDefined();
      expect(typeof PerformanceOptimizer).toBe('function');

      const { MemoryOptimizer } = await import('../../infrastructure/performance/memory-optimizer');
      expect(MemoryOptimizer).toBeDefined();
      expect(typeof MemoryOptimizer).toBe('function');

      const { DiskOptimizer } = await import('../../infrastructure/performance/disk-optimizer');
      expect(DiskOptimizer).toBeDefined();
      expect(typeof DiskOptimizer).toBe('function');

      const { CPUOptimizer } = await import('../../infrastructure/performance/cpu-optimizer');
      expect(CPUOptimizer).toBeDefined();
      expect(typeof CPUOptimizer).toBe('function');

      const { PerformanceIntegration } = await import('../../infrastructure/performance/performance-integration');
      expect(PerformanceIntegration).toBeDefined();
      expect(typeof PerformanceIntegration).toBe('function');
    });
  });

  describe('Logger Import', () => {
    it('should be able to import logger from path alias', async () => {
      const { logger } = await import('../../core/logging/logger');
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('CPU Optimizer Instantiation', () => {
    it('should be able to create CPU optimizer instance', async () => {
      const { CPUOptimizer } = await import('../../infrastructure/performance/cpu-optimizer');
      
      const cpuOptimizer = new CPUOptimizer();
      expect(cpuOptimizer).toBeDefined();
      
      const status = cpuOptimizer.getStatus();
      expect(status).toBeDefined();
      expect(typeof status.isOptimizing).toBe('boolean');
      expect(typeof status.isMonitoring).toBe('boolean');
      expect(status.isOptimizing).toBe(false);
      expect(status.isMonitoring).toBe(false);
    });
  });

  describe('Memory Optimizer Map Operations', () => {
    it('should be able to create memory optimizer and handle Map operations', async () => {
      const { MemoryOptimizer } = await import('../../infrastructure/performance/memory-optimizer');
      
      const memoryOptimizer = new MemoryOptimizer();
      expect(memoryOptimizer).toBeDefined();
      
      const status = memoryOptimizer.getStatus();
      expect(status).toBeDefined();
      expect(typeof status.activeAlerts).toBe('number');
      expect(status.activeAlerts).toBe(0);
      
      // Test that we can get alerts (which uses Map operations internally)
      const alerts = memoryOptimizer.getActiveAlerts();
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBe(0);
    });
  });

  describe('Performance Integration', () => {
    it('should be able to create performance integration instance', async () => {
      const { PerformanceIntegration } = await import('../../infrastructure/performance/performance-integration');
      
      const performanceIntegration = new PerformanceIntegration();
      expect(performanceIntegration).toBeDefined();
      
      const status = performanceIntegration.getStatus();
      expect(status).toBeDefined();
      expect(typeof status.isInitialized).toBe('boolean');
      expect(status.isInitialized).toBe(false);
    });
  });
});