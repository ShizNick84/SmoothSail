/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - PERFORMANCE OPTIMIZATION MODULE
 * =============================================================================
 * 
 * This module exports all performance optimization components for Intel NUC
 * systems. It provides comprehensive memory, disk, and CPU optimization
 * capabilities designed for 24/7 trading operations.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

// Main performance optimizer
export { 
  PerformanceOptimizer,
  type SystemPerformanceMetrics,
  type PerformanceOptimizerConfig,
  type SystemPerformanceAlert,
  type OptimizationReport
} from './performance-optimizer';

// Memory optimization
export { 
  MemoryOptimizer,
  type MemoryMetrics,
  type MemoryOptimizerConfig,
  type MemoryAlert
} from './memory-optimizer';

// Disk optimization
export { 
  DiskOptimizer,
  type DiskMetrics,
  type DiskOptimizerConfig,
  type DiskAlert,
  type DirectoryUsage
} from './disk-optimizer';

// CPU optimization
export { 
  CPUOptimizer,
  type CPUMetrics,
  type CPUOptimizerConfig,
  type CPUAlert,
  type ProcessPriority,
  type WorkerTask
} from './cpu-optimizer';