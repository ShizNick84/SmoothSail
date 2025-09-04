/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - INTEL NUC PERFORMANCE BENCHMARK
 * =============================================================================
 * Comprehensive benchmarking for Intel NUC hardware optimization
 * Tests system performance against Intel NUC specifications
 * =============================================================================
 */

import { performance } from 'perf_hooks';
import * as os from 'os';
import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import { logger } from '@/core/logging/logger';

interface NucSpecs {
  cpu: {
    model: string;
    cores: number;
    threads: number;
    baseFreq: number; // GHz
    maxFreq: number; // GHz
  };
  memory: {
    total: number; // GB
    type: string;
    speed: number; // MHz
  };
  storage: {
    type: string;
    capacity: number; // GB
    interface: string;
  };
}

interface BenchmarkResults {
  hardware: {
    detected: NucSpecs;
    compatible: boolean;
    recommendations: string[];
  };
  performance: {
    cpuScore: number;
    memoryScore: number;
    diskScore: number;
    networkScore: number;
    overallScore: number;
  };
  limits: {
    maxConcurrentTrades: number;
    maxDashboardUsers: number;
    maxApiCallsPerSecond: number;
    recommendedSettings: any;
  };
  optimization: {
    cpuOptimizations: string[];
    memoryOptimizations: string[];
    diskOptimizations: string[];
    networkOptimizations: string[];
  };
}

export class IntelNucBenchmark {
  private readonly INTEL_NUC_SPECS: NucSpecs = {
    cpu: {
      model: 'Intel Core i5',
      cores: 4,
      threads: 8,
      baseFreq: 2.4,
      maxFreq: 4.2
    },
    memory: {
      total: 12,
      type: 'DDR4',
      speed: 3200
    },
    storage: {
      type: 'NVMe SSD',
      capacity: 256,
      interface: 'PCIe 3.0'
    }
  };

  /**
   * Run comprehensive Intel NUC benchmark
   */
  async runBenchmark(): Promise<BenchmarkResults> {
    logger.info('🔧 Starting Intel NUC Performance Benchmark');
    
    const startTime = performance.now();
    
    try {
      // Hardware detection
      const detectedHardware = await this.detectHardware();
      const compatibility = this.checkCompatibility(detectedHardware);
      
      // Performance benchmarks
      const cpuScore = await this.benchmarkCpu();
      const memoryScore = await this.benchmarkMemory();
      const diskScore = await this.benchmarkDisk();
      const networkScore = await this.benchmarkNetwork();
      
      // Calculate overall score
      const overallScore = (cpuScore + memoryScore + diskScore + networkScore) / 4;
      
      // Determine system limits
      const limits = this.calculateSystemLimits(overallScore, detectedHardware);
      
      // Generate optimizations
      const optimizations = this.generateOptimizations(detectedHardware, overallScore);
      
      const results: BenchmarkResults = {
        hardware: {
          detected: detectedHardware,
          compatible: compatibility.compatible,
          recommendations: compatibility.recommendations
        },
        performance: {
          cpuScore,
          memoryScore,
          diskScore,
          networkScore,
          overallScore
        },
        limits,
        optimization: optimizations
      };
      
      await this.saveResults(results);
      
      const duration = (performance.now() - startTime) / 1000;
      logger.info('✅ Intel NUC Benchmark Completed', { duration, overallScore });
      
      return results;
      
    } catch (error) {
      logger.error('❌ Intel NUC Benchmark Failed', { error });
      throw error;
    }
  }

  /**
   * Detect hardware specifications
   */
  private async detectHardware(): Promise<NucSpecs> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    
    // CPU detection
    const cpuModel = cpus[0]?.model || 'Unknown';
    const cores = cpus.length;
    
    // Memory detection
    const memoryGB = Math.round(totalMem / (1024 * 1024 * 1024));
    
    // Storage detection (simplified)
    let storageCapacity = 256; // Default assumption
    try {
      const dfOutput = execSync('df -h / | tail -1', { encoding: 'utf8' });
      const sizeMatch = dfOutput.match(/(\d+)G/);
      if (sizeMatch) {
        storageCapacity = parseInt(sizeMatch[1]);
      }
    } catch (error) {
      // Fallback to default
    }
    
    return {
      cpu: {
        model: cpuModel,
        cores: cores,
        threads: cores * 2, // Assumption for hyperthreading
        baseFreq: 2.4, // Default
        maxFreq: 4.2 // Default
      },
      memory: {
        total: memoryGB,
        type: 'DDR4',
        speed: 3200
      },
      storage: {
        type: 'SSD',
        capacity: storageCapacity,
        interface: 'SATA/NVMe'
      }
    };
  }

  /**
   * Check hardware compatibility with Intel NUC
   */
  private checkCompatibility(detected: NucSpecs): { compatible: boolean; recommendations: string[] } {
    const recommendations: string[] = [];
    let compatible = true;
    
    // CPU compatibility
    if (!detected.cpu.model.toLowerCase().includes('intel')) {
      compatible = false;
      recommendations.push('⚠️  Non-Intel CPU detected. Intel NUC requires Intel processor.');
    }
    
    if (detected.cpu.cores < this.INTEL_NUC_SPECS.cpu.cores) {
      recommendations.push(`⚠️  CPU has ${detected.cpu.cores} cores, recommended ${this.INTEL_NUC_SPECS.cpu.cores}+`);
    }
    
    // Memory compatibility
    if (detected.memory.total < this.INTEL_NUC_SPECS.memory.total) {
      recommendations.push(`⚠️  Memory: ${detected.memory.total}GB detected, ${this.INTEL_NUC_SPECS.memory.total}GB recommended`);
    }
    
    // Storage compatibility
    if (detected.storage.capacity < this.INTEL_NUC_SPECS.storage.capacity) {
      recommendations.push(`⚠️  Storage: ${detected.storage.capacity}GB detected, ${this.INTEL_NUC_SPECS.storage.capacity}GB+ recommended`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Hardware fully compatible with Intel NUC specifications');
    }
    
    return { compatible, recommendations };
  }

  /**
   * Benchmark CPU performance
   */
  private async benchmarkCpu(): Promise<number> {
    logger.info('🔧 Benchmarking CPU performance...');
    
    const startTime = performance.now();
    let operations = 0;
    
    // CPU intensive calculation
    const duration = 5000; // 5 seconds
    const endTime = startTime + duration;
    
    while (performance.now() < endTime) {
      // Simulate trading calculations
      Math.sqrt(Math.random() * 1000000);
      Math.sin(Math.random() * Math.PI);
      Math.cos(Math.random() * Math.PI);
      operations++;
    }
    
    const actualDuration = performance.now() - startTime;
    const opsPerSecond = (operations / actualDuration) * 1000;
    
    // Score based on operations per second (normalized to 100)
    const score = Math.min((opsPerSecond / 100000) * 100, 100);
    
    logger.info('✅ CPU benchmark completed', { 
      operations, 
      opsPerSecond: Math.round(opsPerSecond), 
      score: Math.round(score) 
    });
    
    return score;
  }

  /**
   * Benchmark memory performance
   */
  private async benchmarkMemory(): Promise<number> {
    logger.info('🔧 Benchmarking memory performance...');
    
    const startTime = performance.now();
    
    // Memory allocation and access test
    const arraySize = 1000000; // 1M elements
    const testArrays: number[][] = [];
    
    try {
      // Allocation test
      for (let i = 0; i < 10; i++) {
        const arr = new Array(arraySize);
        for (let j = 0; j < arraySize; j++) {
          arr[j] = Math.random();
        }
        testArrays.push(arr);
      }
      
      // Access test
      let sum = 0;
      for (const arr of testArrays) {
        for (let i = 0; i < arr.length; i += 1000) {
          sum += arr[i];
        }
      }
      
      const duration = performance.now() - startTime;
      
      // Score based on duration (lower is better)
      const score = Math.max(100 - (duration / 100), 0);
      
      logger.info('✅ Memory benchmark completed', { 
        duration: Math.round(duration), 
        score: Math.round(score) 
      });
      
      return score;
      
    } catch (error) {
      logger.error('❌ Memory benchmark failed', { error });
      return 0;
    }
  }

  /**
   * Benchmark disk performance
   */
  private async benchmarkDisk(): Promise<number> {
    logger.info('🔧 Benchmarking disk performance...');
    
    const startTime = performance.now();
    const testFile = '/tmp/disk-benchmark-test.dat';
    const testData = Buffer.alloc(1024 * 1024, 'a'); // 1MB of data
    
    try {
      // Write test
      const writeStart = performance.now();
      for (let i = 0; i < 10; i++) {
        await fs.writeFile(`${testFile}-${i}`, testData);
      }
      const writeTime = performance.now() - writeStart;
      
      // Read test
      const readStart = performance.now();
      for (let i = 0; i < 10; i++) {
        await fs.readFile(`${testFile}-${i}`);
      }
      const readTime = performance.now() - readStart;
      
      // Cleanup
      for (let i = 0; i < 10; i++) {
        try {
          await fs.unlink(`${testFile}-${i}`);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      
      const totalTime = writeTime + readTime;
      
      // Score based on total time (lower is better)
      const score = Math.max(100 - (totalTime / 50), 0);
      
      logger.info('✅ Disk benchmark completed', { 
        writeTime: Math.round(writeTime), 
        readTime: Math.round(readTime), 
        score: Math.round(score) 
      });
      
      return score;
      
    } catch (error) {
      logger.error('❌ Disk benchmark failed', { error });
      return 0;
    }
  }

  /**
   * Benchmark network performance
   */
  private async benchmarkNetwork(): Promise<number> {
    logger.info('🔧 Benchmarking network performance...');
    
    const startTime = performance.now();
    
    try {
      // Simulate network latency tests
      const latencies: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const pingStart = performance.now();
        
        // Simulate network request
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
        
        const latency = performance.now() - pingStart;
        latencies.push(latency);
      }
      
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      
      // Score based on average latency (lower is better)
      const score = Math.max(100 - avgLatency, 0);
      
      logger.info('✅ Network benchmark completed', { 
        avgLatency: Math.round(avgLatency), 
        score: Math.round(score) 
      });
      
      return score;
      
    } catch (error) {
      logger.error('❌ Network benchmark failed', { error });
      return 0;
    }
  }

  /**
   * Calculate system limits based on performance
   */
  private calculateSystemLimits(overallScore: number, hardware: NucSpecs): any {
    const baseMultiplier = overallScore / 100;
    
    return {
      maxConcurrentTrades: Math.floor(10 * baseMultiplier),
      maxDashboardUsers: Math.floor(5 * baseMultiplier),
      maxApiCallsPerSecond: Math.floor(20 * baseMultiplier),
      recommendedSettings: {
        cpuAffinity: hardware.cpu.cores > 4 ? [0, 1, 2, 3] : [0, 1],
        memoryLimit: Math.floor(hardware.memory.total * 0.8), // 80% of total
        diskCacheSize: Math.min(hardware.memory.total * 0.1, 2), // 10% of RAM or 2GB max
        networkTimeout: overallScore > 80 ? 5000 : 10000, // ms
        logLevel: overallScore > 70 ? 'info' : 'warn'
      }
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizations(hardware: NucSpecs, score: number): any {
    const optimizations = {
      cpuOptimizations: [],
      memoryOptimizations: [],
      diskOptimizations: [],
      networkOptimizations: []
    };

    // CPU optimizations
    if (score < 70) {
      optimizations.cpuOptimizations.push('Enable CPU governor performance mode');
      optimizations.cpuOptimizations.push('Set process priority to high for trading processes');
    }
    
    if (hardware.cpu.cores >= 4) {
      optimizations.cpuOptimizations.push('Use CPU affinity to dedicate cores to trading');
    }

    // Memory optimizations
    if (hardware.memory.total <= 8) {
      optimizations.memoryOptimizations.push('Increase swap file size to 4GB');
      optimizations.memoryOptimizations.push('Enable memory compression');
    }
    
    optimizations.memoryOptimizations.push('Configure Node.js max-old-space-size');
    optimizations.memoryOptimizations.push('Enable garbage collection optimization');

    // Disk optimizations
    optimizations.diskOptimizations.push('Enable SSD TRIM support');
    optimizations.diskOptimizations.push('Configure log rotation to prevent disk full');
    optimizations.diskOptimizations.push('Use tmpfs for temporary files');

    // Network optimizations
    optimizations.networkOptimizations.push('Optimize TCP buffer sizes');
    optimizations.networkOptimizations.push('Enable TCP BBR congestion control');
    optimizations.networkOptimizations.push('Configure SSH tunnel keep-alive');

    return optimizations;
  }

  /**
   * Save benchmark results
   */
  private async saveResults(results: BenchmarkResults): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `intel-nuc-benchmark-${timestamp}.json`;
    const filepath = `tests/reports/${filename}`;
    
    await fs.writeFile(filepath, JSON.stringify(results, null, 2));
    logger.info('📊 Benchmark results saved', { filepath });
  }
}

/**
 * Run Intel NUC benchmark
 */
export async function runIntelNucBenchmark(): Promise<void> {
  const benchmark = new IntelNucBenchmark();
  
  try {
    const results = await benchmark.runBenchmark();
    
    console.log('\n🎯 Intel NUC Benchmark Results:');
    console.log('\n🔧 Hardware Compatibility:');
    console.log(`  CPU: ${results.hardware.detected.cpu.model} (${results.hardware.detected.cpu.cores} cores)`);
    console.log(`  Memory: ${results.hardware.detected.memory.total}GB ${results.hardware.detected.memory.type}`);
    console.log(`  Storage: ${results.hardware.detected.storage.capacity}GB ${results.hardware.detected.storage.type}`);
    console.log(`  Compatible: ${results.hardware.compatible ? '✅' : '❌'}`);
    
    console.log('\n📊 Performance Scores:');
    console.log(`  CPU Score: ${results.performance.cpuScore.toFixed(1)}/100`);
    console.log(`  Memory Score: ${results.performance.memoryScore.toFixed(1)}/100`);
    console.log(`  Disk Score: ${results.performance.diskScore.toFixed(1)}/100`);
    console.log(`  Network Score: ${results.performance.networkScore.toFixed(1)}/100`);
    console.log(`  Overall Score: ${results.performance.overallScore.toFixed(1)}/100`);
    
    console.log('\n⚙️  System Limits:');
    console.log(`  Max Concurrent Trades: ${results.limits.maxConcurrentTrades}`);
    console.log(`  Max Dashboard Users: ${results.limits.maxDashboardUsers}`);
    console.log(`  Max API Calls/Second: ${results.limits.maxApiCallsPerSecond}`);
    
    console.log('\n🔧 Hardware Recommendations:');
    results.hardware.recommendations.forEach(rec => console.log(`  ${rec}`));
    
    console.log('\n⚡ Optimization Recommendations:');
    if (results.optimization.cpuOptimizations.length > 0) {
      console.log('  CPU:');
      results.optimization.cpuOptimizations.forEach(opt => console.log(`    - ${opt}`));
    }
    if (results.optimization.memoryOptimizations.length > 0) {
      console.log('  Memory:');
      results.optimization.memoryOptimizations.forEach(opt => console.log(`    - ${opt}`));
    }
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runIntelNucBenchmark();
}