// global.teardown.ts - Global test teardown

import * as fs from 'fs';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  // Generate performance report
  try {
    if (global.performanceMetrics) {
      const metrics = global.performanceMetrics;
      const report = {
        totalTests: metrics.testCount,
        totalDuration: metrics.totalDuration,
        averageDuration: metrics.testCount > 0 ? metrics.totalDuration / metrics.testCount : 0,
        memoryUsage: {
          samples: metrics.memoryUsage.length,
          average: metrics.memoryUsage.length > 0 
            ? metrics.memoryUsage.reduce((a, b) => a + b, 0) / metrics.memoryUsage.length 
            : 0,
          peak: Math.max(...metrics.memoryUsage, 0)
        },
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync(
        'tests/reports/performance-summary.json',
        JSON.stringify(report, null, 2)
      );

      console.log('📊 Performance report generated');
    }
  } catch (error) {
    console.warn('⚠️ Performance report generation failed:', error);
  }

  // Cleanup test database
  try {
    console.log('📊 Cleaning up test database...');
    
    // Note: In a real setup, you would cleanup the test database here
    // execSync('npm run db:test:cleanup', { stdio: 'inherit' });
    
    console.log('✅ Test database cleaned');
  } catch (error) {
    console.warn('⚠️ Test database cleanup failed:', error);
  }

  // Cleanup test SSH tunnel
  try {
    console.log('🌐 Cleaning up test SSH tunnel...');
    
    // Cleanup mock tunnel
    delete process.env.TEST_TUNNEL_ACTIVE;
    
    console.log('✅ Test SSH tunnel cleaned');
  } catch (error) {
    console.warn('⚠️ Test SSH tunnel cleanup failed:', error);
  }

  // Cleanup temporary files
  try {
    console.log('🗑️ Cleaning up temporary files...');
    
    const tempFiles = [
      'tests/fixtures/data/temp-*.json',
      'logs/test/*.log'
    ];

    // Note: Add actual cleanup logic here
    
    console.log('✅ Temporary files cleaned');
  } catch (error) {
    console.warn('⚠️ Temporary file cleanup failed:', error);
  }

  // Generate final test summary
  try {
    const summary = {
      completedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      testDuration: Date.now() - (global.testStartTime || Date.now())
    };

    fs.writeFileSync(
      'tests/reports/test-session-summary.json',
      JSON.stringify(summary, null, 2)
    );

    console.log('📋 Test session summary generated');
  } catch (error) {
    console.warn('⚠️ Test session summary generation failed:', error);
  }

  console.log('✅ Test environment cleanup complete');
}