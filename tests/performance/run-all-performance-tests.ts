/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - COMPREHENSIVE PERFORMANCE TEST RUNNER
 * =============================================================================
 * Runs all performance tests for task 20.2 Production Performance and Load Testing
 * Validates system performance under production load conditions
 * =============================================================================
 */

import { performance } from 'perf_hooks';
import { promises as fs } from 'fs';
import { logger } from '@/core/logging/logger';
import { ProductionLoadTester } from './production-load-test';
import { IntelNucBenchmark } from './intel-nuc-benchmark';
import { SshTunnelPerformanceTester } from './ssh-tunnel-performance';
import { DatabasePerformanceTester } from './database-performance';

interface ComprehensiveTestResults {
  testSuite: string;
  timestamp: string;
  duration: number;
  results: {
    loadTest: any;
    benchmark: any;
    sshTunnel: any;
    database: any;
  };
  summary: {
    overallScore: number;
    criticalIssues: string[];
    warnings: string[];
    recommendations: string[];
    productionReady: boolean;
  };
}

export class ComprehensivePerformanceTester {
  
  /**
   * Run all performance tests for production validation
   */
  async runAllTests(): Promise<ComprehensiveTestResults> {
    logger.info('🚀 Starting Comprehensive Performance Testing Suite');
    console.log('\n🎯 Production Performance and Load Testing - Task 20.2');
    console.log('=' .repeat(60));
    
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    
    try {
      // Ensure reports directory exists
      await this.ensureReportsDirectory();
      
      console.log('\n📊 Running Intel NUC Hardware Benchmark...');
      const benchmarkTester = new IntelNucBenchmark();
      const benchmarkResults = await benchmarkTester.runBenchmark();
      
      console.log('\n🔗 Running SSH Tunnel Performance Test...');
      const sshTester = new SshTunnelPerformanceTester();
      const sshResults = await sshTester.runPerformanceTest(120); // 2 minutes
      
      console.log('\n💾 Running Database Performance Test...');
      const dbTester = new DatabasePerformanceTester();
      const dbResults = await dbTester.runPerformanceTest();
      
      console.log('\n🚀 Running Production Load Test...');
      const loadTester = new ProductionLoadTester();
      const loadResults = await loadTester.runLoadTest({
        duration: 180, // 3 minutes
        concurrentUsers: 3,
        tradingVolume: 30, // trades per minute
        apiCallsPerSecond: 5,
        notificationRate: 6 // per minute
      });
      
      // Compile comprehensive results
      const results: ComprehensiveTestResults = {
        testSuite: 'Production Performance and Load Testing',
        timestamp,
        duration: (performance.now() - startTime) / 1000,
        results: {
          loadTest: loadResults,
          benchmark: benchmarkResults,
          sshTunnel: sshResults,
          database: dbResults
        },
        summary: this.generateSummary(loadResults, benchmarkResults, sshResults, dbResults)
      };
      
      await this.saveComprehensiveResults(results);
      this.displayResults(results);
      
      logger.info('✅ Comprehensive Performance Testing Completed', {
        duration: results.duration,
        overallScore: results.summary.overallScore,
        productionReady: results.summary.productionReady
      });
      
      return results;
      
    } catch (error) {
      logger.error('❌ Comprehensive Performance Testing Failed', { error });
      throw error;
    }
  }

  /**
   * Ensure reports directory exists
   */
  private async ensureReportsDirectory(): Promise<void> {
    try {
      await fs.mkdir('tests/reports', { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Generate comprehensive summary
   */
  private generateSummary(loadTest: any, benchmark: any, sshTunnel: any, database: any): any {
    const scores = [
      benchmark.performance.overallScore,
      sshTunnel.stabilityScore,
      database.performanceScore,
      (100 - loadTest.summary.errorRate) // Convert error rate to success score
    ];
    
    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    const criticalIssues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze benchmark results
    if (benchmark.performance.overallScore < 70) {
      criticalIssues.push('Hardware performance below recommended threshold');
    }
    if (!benchmark.hardware.compatible) {
      criticalIssues.push('Hardware not fully compatible with Intel NUC specifications');
    }
    
    // Analyze SSH tunnel results
    if (sshTunnel.stabilityScore < 80) {
      criticalIssues.push('SSH tunnel stability issues detected');
    }
    if (sshTunnel.avgLatency > 200) {
      warnings.push('High SSH tunnel latency may affect trading performance');
    }
    
    // Analyze database results
    if (database.performanceScore < 70) {
      criticalIssues.push('Database performance issues detected');
    }
    if (database.avgConnectionTime > 100) {
      warnings.push('Database connection time is high');
    }
    
    // Analyze load test results
    if (loadTest.summary.errorRate > 5) {
      criticalIssues.push('High error rate during load testing');
    }
    if (loadTest.summary.avgCpuUsage > 85) {
      warnings.push('High CPU usage during load testing');
    }
    if (loadTest.summary.maxMemoryUsage > 90) {
      warnings.push('High memory usage during load testing');
    }
    
    // Generate recommendations
    recommendations.push(...benchmark.hardware.recommendations);
    recommendations.push(...sshTunnel.recommendations);
    recommendations.push(...database.recommendations);
    
    // Add Intel NUC specific recommendations
    if (benchmark.hardware.detected.memory.total <= 8) {
      recommendations.push('Consider upgrading to 16GB RAM for better performance');
    }
    
    if (loadTest.summary.avgApiResponseTime > 2000) {
      recommendations.push('Optimize API response times for better trading performance');
    }
    
    const productionReady = criticalIssues.length === 0 && overallScore >= 75;
    
    return {
      overallScore,
      criticalIssues,
      warnings,
      recommendations: [...new Set(recommendations)], // Remove duplicates
      productionReady
    };
  }

  /**
   * Display comprehensive results
   */
  private displayResults(results: ComprehensiveTestResults): void {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 COMPREHENSIVE PERFORMANCE TEST RESULTS');
    console.log('='.repeat(60));
    
    console.log(`\n📊 Overall Performance Score: ${results.summary.overallScore.toFixed(1)}/100`);
    console.log(`⏱️  Total Test Duration: ${results.duration.toFixed(1)} seconds`);
    console.log(`🚀 Production Ready: ${results.summary.productionReady ? '✅ YES' : '❌ NO'}`);
    
    // Hardware Benchmark Results
    console.log('\n🔧 Hardware Benchmark Results:');
    console.log(`  CPU Score: ${results.results.benchmark.performance.cpuScore.toFixed(1)}/100`);
    console.log(`  Memory Score: ${results.results.benchmark.performance.memoryScore.toFixed(1)}/100`);
    console.log(`  Disk Score: ${results.results.benchmark.performance.diskScore.toFixed(1)}/100`);
    console.log(`  Network Score: ${results.results.benchmark.performance.networkScore.toFixed(1)}/100`);
    
    // SSH Tunnel Results
    console.log('\n🔗 SSH Tunnel Performance:');
    console.log(`  Stability Score: ${results.results.sshTunnel.stabilityScore.toFixed(1)}/100`);
    console.log(`  Average Latency: ${results.results.sshTunnel.avgLatency.toFixed(1)}ms`);
    console.log(`  Connection Success: ${results.results.sshTunnel.connectionSuccess.toFixed(1)}%`);
    
    // Database Results
    console.log('\n💾 Database Performance:');
    console.log(`  Performance Score: ${results.results.database.performanceScore.toFixed(1)}/100`);
    console.log(`  Average Query Time: ${results.results.database.avgQueryTime.toFixed(1)}ms`);
    console.log(`  Throughput: ${results.results.database.throughput.toFixed(1)} queries/sec`);
    
    // Load Test Results
    console.log('\n🚀 Production Load Test:');
    console.log(`  Average CPU Usage: ${results.results.loadTest.summary.avgCpuUsage.toFixed(1)}%`);
    console.log(`  Max Memory Usage: ${results.results.loadTest.summary.maxMemoryUsage.toFixed(1)}%`);
    console.log(`  Error Rate: ${results.results.loadTest.summary.errorRate.toFixed(2)}%`);
    console.log(`  API Response Time: ${results.results.loadTest.summary.avgApiResponseTime.toFixed(0)}ms`);
    
    // Critical Issues
    if (results.summary.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      results.summary.criticalIssues.forEach(issue => console.log(`  ❌ ${issue}`));
    }
    
    // Warnings
    if (results.summary.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      results.summary.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
    }
    
    // Recommendations
    if (results.summary.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      results.summary.recommendations.slice(0, 10).forEach(rec => console.log(`  💡 ${rec}`));
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (results.summary.productionReady) {
      console.log('✅ SYSTEM IS READY FOR PRODUCTION DEPLOYMENT');
    } else {
      console.log('❌ SYSTEM REQUIRES OPTIMIZATION BEFORE PRODUCTION');
      console.log('   Please address critical issues and warnings above.');
    }
    
    console.log('='.repeat(60));
  }

  /**
   * Save comprehensive results
   */
  private async saveComprehensiveResults(results: ComprehensiveTestResults): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `comprehensive-performance-test-${timestamp}.json`;
    const filepath = `tests/reports/${filename}`;
    
    await fs.writeFile(filepath, JSON.stringify(results, null, 2));
    
    // Also create a summary report
    const summaryFilename = `performance-summary-${timestamp}.md`;
    const summaryFilepath = `tests/reports/${summaryFilename}`;
    const summaryContent = this.generateMarkdownSummary(results);
    
    await fs.writeFile(summaryFilepath, summaryContent);
    
    logger.info('📊 Comprehensive performance results saved', { 
      jsonReport: filepath,
      summaryReport: summaryFilepath 
    });
  }

  /**
   * Generate markdown summary report
   */
  private generateMarkdownSummary(results: ComprehensiveTestResults): string {
    return `# Production Performance Test Report

## Test Summary
- **Test Suite**: ${results.testSuite}
- **Timestamp**: ${results.timestamp}
- **Duration**: ${results.duration.toFixed(1)} seconds
- **Overall Score**: ${results.summary.overallScore.toFixed(1)}/100
- **Production Ready**: ${results.summary.productionReady ? '✅ YES' : '❌ NO'}

## Performance Scores
- **Hardware Benchmark**: ${results.results.benchmark.performance.overallScore.toFixed(1)}/100
- **SSH Tunnel Stability**: ${results.results.sshTunnel.stabilityScore.toFixed(1)}/100
- **Database Performance**: ${results.results.database.performanceScore.toFixed(1)}/100
- **Load Test Success**: ${(100 - results.results.loadTest.summary.errorRate).toFixed(1)}/100

## Critical Issues
${results.summary.criticalIssues.length > 0 
  ? results.summary.criticalIssues.map(issue => `- ❌ ${issue}`).join('\n')
  : '- ✅ No critical issues detected'
}

## Warnings
${results.summary.warnings.length > 0
  ? results.summary.warnings.map(warning => `- ⚠️ ${warning}`).join('\n')
  : '- ✅ No warnings'
}

## Recommendations
${results.summary.recommendations.slice(0, 10).map(rec => `- 💡 ${rec}`).join('\n')}

## Detailed Results
See the full JSON report for detailed metrics and measurements.
`;
  }
}

/**
 * Run comprehensive performance tests
 */
export async function runComprehensivePerformanceTests(): Promise<void> {
  const tester = new ComprehensivePerformanceTester();
  
  try {
    await tester.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error('❌ Comprehensive performance testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runComprehensivePerformanceTests();
}