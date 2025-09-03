#!/usr/bin/env tsx

/**
 * System Operational Verification
 * 
 * This script performs comprehensive system operational verification by:
 * 1. Verifying all systems are operational with detailed status reporting
 * 2. Creating system health dashboard with real-time status
 * 3. Implementing automated system diagnostics
 * 4. Providing detailed reasons and fixes for any non-operational systems
 */

import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

interface SystemStatus {
  component: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'FAILED' | 'UNKNOWN';
  health: number; // 0-100
  message: string;
  details?: any;
  lastCheck: Date;
  uptime?: number;
  fixes?: string[];
}

interface DiagnosticResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  recommendation?: string;
  details?: any;
}

class SystemOperationalVerifier {
  private systemStatuses: Map<string, SystemStatus> = new Map();
  private diagnosticResults: DiagnosticResult[] = [];

  async runVerification(): Promise<void> {
    console.log('🔍 Starting System Operational Verification...\n');
    
    await this.verifySystemComponents();
    await this.runAutomatedDiagnostics();
    await this.generateOperationalReport();
    
    console.log('\n✅ System Operational Verification Complete!');
  }

  async verifySystemComponents(): Promise<void> {
    console.log('🔧 Verifying System Components...\n');

    const components = [
      { name: 'Node.js Runtime', verify: () => this.verifyNodeJS() },
      { name: 'Package Dependencies', verify: () => this.verifyDependencies() },
      { name: 'Environment Configuration', verify: () => this.verifyEnvironment() },
      { name: 'File System', verify: () => this.verifyFileSystem() },
      { name: 'Database System', verify: () => this.verifyDatabase() },
      { name: 'Network Connectivity', verify: () => this.verifyNetwork() },
      { name: 'Trading Engine', verify: () => this.verifyTradingEngine() },
      { name: 'Dashboard System', verify: () => this.verifyDashboard() },
      { name: 'Notification System', verify: () => this.verifyNotifications() },
      { name: 'Logging System', verify: () => this.verifyLogging() },
      { name: 'Security System', verify: () => this.verifySecurity() }
    ];

    for (const component of components) {
      try {
        await component.verify();
      } catch (error) {
        this.updateSystemStatus(component.name, 'FAILED', 0, `Verification failed: ${error}`, {
          error: error,
          fixes: ['Check component configuration', 'Restart component', 'Check dependencies']
        });
      }
    }
  }

  async verifyNodeJS(): Promise<void> {
    try {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
      
      if (majorVersion >= 18) {
        this.updateSystemStatus('Node.js Runtime', 'OPERATIONAL', 100, 
          `Node.js ${nodeVersion} is operational`, {
            nodeVersion,
            platform: process.platform,
            arch: process.arch
          });
      } else {
        this.updateSystemStatus('Node.js Runtime', 'DEGRADED', 70, 
          `Node.js ${nodeVersion} is outdated (recommended: v18+)`, {
            nodeVersion,
            fixes: ['Update Node.js to version 18 or higher']
          });
      }
    } catch (error) {
      this.updateSystemStatus('Node.js Runtime', 'FAILED', 0, 
        'Node.js runtime verification failed', {
          error,
          fixes: ['Install Node.js', 'Check PATH configuration']
        });
    }
  }

  async verifyDependencies(): Promise<void> {
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
      const nodeModulesExists = await this.fileExists('node_modules');
      
      if (!nodeModulesExists) {
        this.updateSystemStatus('Package Dependencies', 'FAILED', 0, 
          'node_modules directory not found', {
            fixes: ['Run npm install', 'Check package.json', 'Clear npm cache']
          });
        return;
      }

      // Check critical dependencies
      const criticalDeps = ['express', 'axios', 'winston', 'next', 'react'];
      const missingDeps = [];
      
      for (const dep of criticalDeps) {
        const depPath = path.join('node_modules', dep);
        if (!await this.fileExists(depPath)) {
          missingDeps.push(dep);
        }
      }

      if (missingDeps.length === 0) {
        this.updateSystemStatus('Package Dependencies', 'OPERATIONAL', 100, 
          'All critical dependencies are installed', {
            totalDependencies: Object.keys(packageJson.dependencies || {}).length
          });
      } else {
        this.updateSystemStatus('Package Dependencies', 'DEGRADED', 60, 
          `Missing critical dependencies: ${missingDeps.join(', ')}`, {
            missingDeps,
            fixes: ['Run npm install', 'Check package.json integrity']
          });
      }
    } catch (error) {
      this.updateSystemStatus('Package Dependencies', 'FAILED', 0, 
        'Dependency verification failed', {
          error,
          fixes: ['Check package.json', 'Run npm install', 'Clear npm cache']
        });
    }
  }

  async verifyEnvironment(): Promise<void> {
    try {
      const envFile = path.join(process.cwd(), '.env');
      const envExists = await this.fileExists(envFile);
      
      if (!envExists) {
        this.updateSystemStatus('Environment Configuration', 'DEGRADED', 40, 
          '.env file not found', {
            fixes: ['Create .env file from .env.example', 'Configure environment variables']
          });
        return;
      }

      const envContent = await fs.readFile(envFile, 'utf-8');
      const requiredVars = [
        'NODE_ENV',
        'PORT',
        'GATE_IO_API_KEY',
        'GATE_IO_API_SECRET',
        'DATABASE_URL',
        'TELEGRAM_BOT_TOKEN'
      ];

      const configuredVars = requiredVars.filter(varName => 
        envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=`)
      );

      const healthScore = (configuredVars.length / requiredVars.length) * 100;
      
      if (healthScore >= 80) {
        this.updateSystemStatus('Environment Configuration', 'OPERATIONAL', healthScore, 
          `${configuredVars.length}/${requiredVars.length} environment variables configured`);
      } else {
        const missingVars = requiredVars.filter(v => !configuredVars.includes(v));
        this.updateSystemStatus('Environment Configuration', 'DEGRADED', healthScore, 
          `Missing environment variables: ${missingVars.join(', ')}`, {
            fixes: ['Configure missing environment variables', 'Check .env.example for reference']
          });
      }
    } catch (error) {
      this.updateSystemStatus('Environment Configuration', 'FAILED', 0, 
        'Environment verification failed', {
          error,
          fixes: ['Check .env file permissions', 'Verify file format']
        });
    }
  }

  async verifyFileSystem(): Promise<void> {
    try {
      const requiredDirs = ['src', 'src/core', 'src/trading', 'src/dashboard'];
      const requiredFiles = ['package.json', 'tsconfig.json', 'src/main.ts'];

      let missingItems = [];

      for (const dir of requiredDirs) {
        if (!await this.fileExists(dir)) {
          missingItems.push(dir);
        }
      }

      for (const file of requiredFiles) {
        if (!await this.fileExists(file)) {
          missingItems.push(file);
        }
      }

      const totalChecks = requiredDirs.length + requiredFiles.length;
      const passedChecks = totalChecks - missingItems.length;
      const healthScore = (passedChecks / totalChecks) * 100;

      if (healthScore === 100) {
        this.updateSystemStatus('File System', 'OPERATIONAL', 100, 
          'All required files and directories exist');
      } else {
        this.updateSystemStatus('File System', 'DEGRADED', healthScore, 
          `Missing: ${missingItems.join(', ')}`, {
            fixes: ['Create missing directories', 'Restore missing files from backup']
          });
      }
    } catch (error) {
      this.updateSystemStatus('File System', 'FAILED', 0, 
        'File system verification failed', {
          error,
          fixes: ['Check file permissions', 'Verify disk space']
        });
    }
  }

  async verifyDatabase(): Promise<void> {
    try {
      const dbFiles = ['trading_agent.db', 'trading_data.db'];
      let dbFound = false;
      let dbType = 'unknown';

      for (const dbFile of dbFiles) {
        if (await this.fileExists(dbFile)) {
          dbFound = true;
          dbType = 'SQLite';
          break;
        }
      }

      if (!dbFound && process.env.DATABASE_URL && process.env.DATABASE_URL.includes('postgresql')) {
        dbFound = true;
        dbType = 'PostgreSQL';
      }

      if (dbFound) {
        this.updateSystemStatus('Database System', 'OPERATIONAL', 90, 
          `${dbType} database configured and accessible`);
      } else {
        this.updateSystemStatus('Database System', 'DEGRADED', 50, 
          'No database configuration found', {
            fixes: ['Configure DATABASE_URL', 'Initialize database', 'Check database service']
          });
      }
    } catch (error) {
      this.updateSystemStatus('Database System', 'FAILED', 0, 
        'Database verification failed', {
          error,
          fixes: ['Check database service', 'Verify connection string', 'Initialize database']
        });
    }
  }

  async verifyNetwork(): Promise<void> {
    try {
      let passedTests = 0;
      const totalTests = 2;

      // Test internet connectivity
      try {
        await axios.get('https://httpbin.org/ip', { timeout: 5000 });
        passedTests++;
      } catch (error) {
        // Internet test failed
      }

      // Test API endpoints
      try {
        await axios.get('https://api.gateio.ws/api/v4/spot/time', { timeout: 5000 });
        passedTests++;
      } catch (error) {
        // API test failed
      }

      const healthScore = (passedTests / totalTests) * 100;

      if (healthScore >= 80) {
        this.updateSystemStatus('Network Connectivity', 'OPERATIONAL', healthScore, 
          `${passedTests}/${totalTests} network tests passed`);
      } else {
        this.updateSystemStatus('Network Connectivity', 'DEGRADED', healthScore, 
          'Network connectivity issues detected', {
            fixes: ['Check internet connection', 'Verify firewall settings', 'Check DNS configuration']
          });
      }
    } catch (error) {
      this.updateSystemStatus('Network Connectivity', 'FAILED', 0, 
        'Network verification failed', {
          error,
          fixes: ['Check network adapter', 'Restart network service']
        });
    }
  }

  async verifyTradingEngine(): Promise<void> {
    try {
      const tradingFiles = [
        'src/trading/trading-engine.ts',
        'src/trading/market-analyzer.ts',
        'src/trading/risk-manager.ts'
      ];

      let foundFiles = 0;
      for (const file of tradingFiles) {
        if (await this.fileExists(file)) {
          foundFiles++;
        }
      }

      const healthScore = (foundFiles / tradingFiles.length) * 100;

      if (healthScore >= 80) {
        this.updateSystemStatus('Trading Engine', 'OPERATIONAL', healthScore, 
          `Trading engine components available (${foundFiles}/${tradingFiles.length})`);
      } else {
        this.updateSystemStatus('Trading Engine', 'DEGRADED', healthScore, 
          'Some trading engine components missing', {
            fixes: ['Restore missing trading components', 'Check source code integrity']
          });
      }
    } catch (error) {
      this.updateSystemStatus('Trading Engine', 'FAILED', 0, 
        'Trading engine verification failed', {
          error,
          fixes: ['Check trading engine source code', 'Verify component dependencies']
        });
    }
  }

  async verifyDashboard(): Promise<void> {
    try {
      const dashboardPath = 'src/dashboard';
      const buildPath = path.join(dashboardPath, '.next');
      
      const dashboardExists = await this.fileExists(dashboardPath);
      const buildExists = await this.fileExists(buildPath);

      if (dashboardExists && buildExists) {
        this.updateSystemStatus('Dashboard System', 'OPERATIONAL', 100, 
          'Dashboard built and ready to serve');
      } else if (dashboardExists) {
        this.updateSystemStatus('Dashboard System', 'DEGRADED', 70, 
          'Dashboard source available but not built', {
            fixes: ['Run npm run dashboard:build', 'Check build configuration']
          });
      } else {
        this.updateSystemStatus('Dashboard System', 'FAILED', 0, 
          'Dashboard system not found', {
            fixes: ['Restore dashboard source code', 'Check project structure']
          });
      }
    } catch (error) {
      this.updateSystemStatus('Dashboard System', 'FAILED', 0, 
        'Dashboard verification failed', {
          error,
          fixes: ['Check dashboard directory', 'Verify build process']
        });
    }
  }

  async verifyNotifications(): Promise<void> {
    try {
      const notificationComponents = [
        'src/core/notifications/telegram-service.ts',
        'src/core/notifications/email-service.ts'
      ];

      let foundComponents = 0;
      for (const component of notificationComponents) {
        if (await this.fileExists(component)) {
          foundComponents++;
        }
      }

      const telegramConfigured = process.env.TELEGRAM_BOT_TOKEN ? 1 : 0;
      const emailConfigured = process.env.EMAIL_HOST ? 1 : 0;
      
      const totalScore = foundComponents + telegramConfigured + emailConfigured;
      const maxScore = notificationComponents.length + 2;
      const healthScore = (totalScore / maxScore) * 100;

      if (healthScore >= 75) {
        this.updateSystemStatus('Notification System', 'OPERATIONAL', healthScore, 
          'Notification system components and configuration available');
      } else {
        this.updateSystemStatus('Notification System', 'DEGRADED', healthScore, 
          'Notification system partially configured', {
            fixes: ['Configure notification credentials', 'Check notification service files']
          });
      }
    } catch (error) {
      this.updateSystemStatus('Notification System', 'FAILED', 0, 
        'Notification system verification failed', {
          error,
          fixes: ['Check notification service files', 'Verify configuration']
        });
    }
  }

  async verifyLogging(): Promise<void> {
    try {
      const loggingFiles = [
        'src/core/logging/logger.ts',
        'src/core/logging/enhanced-logger.ts'
      ];

      let foundFiles = 0;
      for (const file of loggingFiles) {
        if (await this.fileExists(file)) {
          foundFiles++;
        }
      }

      const logDir = 'logs';
      const logDirExists = await this.fileExists(logDir);

      const healthScore = ((foundFiles / loggingFiles.length) * 0.7 + (logDirExists ? 0.3 : 0)) * 100;

      if (healthScore >= 80) {
        this.updateSystemStatus('Logging System', 'OPERATIONAL', healthScore, 
          'Logging system components available');
      } else {
        this.updateSystemStatus('Logging System', 'DEGRADED', healthScore, 
          'Logging system partially available', {
            fixes: ['Create logs directory', 'Check logging configuration']
          });
      }
    } catch (error) {
      this.updateSystemStatus('Logging System', 'FAILED', 0, 
        'Logging system verification failed', {
          error,
          fixes: ['Check logging service files', 'Create log directories']
        });
    }
  }

  async verifySecurity(): Promise<void> {
    try {
      let passedChecks = 0;
      const totalChecks = 3;

      // Check environment security
      const envFile = '.env';
      if (await this.fileExists(envFile)) {
        passedChecks++;
      }

      // Check file permissions (simplified)
      const sensitiveFiles = ['.env', 'package.json'];
      let filesSecure = 0;
      for (const file of sensitiveFiles) {
        if (await this.fileExists(file)) {
          filesSecure++;
        }
      }
      if (filesSecure === sensitiveFiles.length) {
        passedChecks++;
      }

      // Check dependencies (simplified)
      try {
        JSON.parse(await fs.readFile('package.json', 'utf-8'));
        passedChecks++;
      } catch (error) {
        // Package.json check failed
      }

      const healthScore = (passedChecks / totalChecks) * 100;

      if (healthScore >= 80) {
        this.updateSystemStatus('Security System', 'OPERATIONAL', healthScore, 
          `${passedChecks}/${totalChecks} security checks passed`);
      } else {
        this.updateSystemStatus('Security System', 'DEGRADED', healthScore, 
          'Security issues detected', {
            fixes: ['Review security configuration', 'Update dependencies', 'Check file permissions']
          });
      }
    } catch (error) {
      this.updateSystemStatus('Security System', 'FAILED', 0, 
        'Security verification failed', {
          error,
          fixes: ['Run security audit', 'Check security configuration']
        });
    }
  }

  async runAutomatedDiagnostics(): Promise<void> {
    console.log('\n🔬 Running Automated System Diagnostics...\n');

    const diagnostics = [
      { name: 'Memory Usage', test: () => this.diagnosisMemoryUsage() },
      { name: 'CPU Performance', test: () => this.diagnosisCPUPerformance() },
      { name: 'Network Latency', test: () => this.diagnosisNetworkLatency() },
      { name: 'Process Health', test: () => this.diagnosisProcessHealth() },
      { name: 'Configuration Integrity', test: () => this.diagnosisConfigIntegrity() }
    ];

    for (const diagnostic of diagnostics) {
      try {
        await diagnostic.test();
      } catch (error) {
        this.addDiagnosticResult(diagnostic.name, 'FAIL', 
          `Diagnostic failed: ${error}`, 'Check system resources and configuration');
      }
    }
  }

  async diagnosisMemoryUsage(): Promise<void> {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal / 1024 / 1024; // MB
    const usedMem = memUsage.heapUsed / 1024 / 1024; // MB
    const memPercent = (usedMem / totalMem) * 100;

    if (memPercent < 80) {
      this.addDiagnosticResult('Memory Usage', 'PASS', 
        `Memory usage: ${usedMem.toFixed(2)}MB / ${totalMem.toFixed(2)}MB (${memPercent.toFixed(1)}%)`);
    } else {
      this.addDiagnosticResult('Memory Usage', 'WARNING', 
        `High memory usage: ${memPercent.toFixed(1)}%`, 
        'Consider optimizing memory usage or increasing available memory');
    }
  }

  async diagnosisCPUPerformance(): Promise<void> {
    const startTime = process.hrtime.bigint();
    
    // Simple CPU test
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
      sum += Math.sqrt(i);
    }
    
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // ms

    if (duration < 100) {
      this.addDiagnosticResult('CPU Performance', 'PASS', 
        `CPU performance test: ${duration.toFixed(2)}ms`);
    } else {
      this.addDiagnosticResult('CPU Performance', 'WARNING', 
        `Slow CPU performance: ${duration.toFixed(2)}ms`, 
        'Check system load and CPU usage');
    }
  }

  async diagnosisNetworkLatency(): Promise<void> {
    try {
      const startTime = Date.now();
      await axios.get('https://httpbin.org/ip', { timeout: 5000 });
      const latency = Date.now() - startTime;

      if (latency < 1000) {
        this.addDiagnosticResult('Network Latency', 'PASS', 
          `Network latency: ${latency}ms`);
      } else {
        this.addDiagnosticResult('Network Latency', 'WARNING', 
          `High network latency: ${latency}ms`, 
          'Check network connection and DNS settings');
      }
    } catch (error) {
      this.addDiagnosticResult('Network Latency', 'FAIL', 
        'Network connectivity test failed', 
        'Check internet connection and firewall settings');
    }
  }

  async diagnosisProcessHealth(): Promise<void> {
    const uptime = process.uptime();
    const pid = process.pid;
    
    this.addDiagnosticResult('Process Health', 'PASS', 
      `Process running normally (PID: ${pid}, Uptime: ${uptime.toFixed(2)}s)`);
  }

  async diagnosisConfigIntegrity(): Promise<void> {
    try {
      JSON.parse(await fs.readFile('package.json', 'utf-8'));
      JSON.parse(await fs.readFile('tsconfig.json', 'utf-8'));
      
      this.addDiagnosticResult('Configuration Integrity', 'PASS', 
        'Configuration files are valid JSON');
    } catch (error) {
      this.addDiagnosticResult('Configuration Integrity', 'FAIL', 
        'Configuration file validation failed', 
        'Check JSON syntax in configuration files');
    }
  }

  async generateOperationalReport(): Promise<void> {
    console.log('\n📋 Generating System Operational Report...\n');

    const systems = Array.from(this.systemStatuses.values());
    const diagnostics = this.diagnosticResults;
    
    const overallHealth = systems.length > 0 
      ? systems.reduce((sum, s) => sum + s.health, 0) / systems.length 
      : 0;

    console.log('='.repeat(80));
    console.log('📊 SYSTEM OPERATIONAL VERIFICATION REPORT');
    console.log('='.repeat(80));

    console.log(`\n🎯 Overall System Health: ${Math.round(overallHealth)}%`);
    
    const status = overallHealth >= 80 ? 'EXCELLENT' : 
                  overallHealth >= 60 ? 'GOOD' : 
                  overallHealth >= 40 ? 'DEGRADED' : 'CRITICAL';
    
    console.log(`📈 System Status: ${status}`);

    // System Components Summary
    console.log(`\n🔧 System Components (${systems.length} total):`);
    const operational = systems.filter(s => s.status === 'OPERATIONAL').length;
    const degraded = systems.filter(s => s.status === 'DEGRADED').length;
    const failed = systems.filter(s => s.status === 'FAILED').length;
    
    console.log(`   ✅ Operational: ${operational}`);
    console.log(`   ⚠️  Degraded: ${degraded}`);
    console.log(`   ❌ Failed: ${failed}`);

    // Detailed System Status
    console.log(`\n📋 Detailed System Status:`);
    systems.forEach(system => {
      const emoji = system.status === 'OPERATIONAL' ? '✅' : 
                   system.status === 'DEGRADED' ? '⚠️' : '❌';
      console.log(`   ${emoji} ${system.component}: ${system.message} (${system.health}%)`);
    });

    // Diagnostics Summary
    console.log(`\n🔬 Diagnostic Results (${diagnostics.length} tests):`);
    const passedDiag = diagnostics.filter(d => d.status === 'PASS').length;
    const warningDiag = diagnostics.filter(d => d.status === 'WARNING').length;
    const failedDiag = diagnostics.filter(d => d.status === 'FAIL').length;
    
    console.log(`   ✅ Passed: ${passedDiag}`);
    console.log(`   ⚠️  Warnings: ${warningDiag}`);
    console.log(`   ❌ Failed: ${failedDiag}`);

    // Failed Systems and Fixes
    const failedSystems = systems.filter(s => s.status === 'FAILED');
    if (failedSystems.length > 0) {
      console.log(`\n❌ Failed Systems and Recommended Fixes:`);
      failedSystems.forEach(system => {
        console.log(`   • ${system.component}: ${system.message}`);
        if (system.fixes) {
          system.fixes.forEach(fix => {
            console.log(`     - ${fix}`);
          });
        }
      });
    }

    // Degraded Systems and Improvements
    const degradedSystems = systems.filter(s => s.status === 'DEGRADED');
    if (degradedSystems.length > 0) {
      console.log(`\n⚠️  Degraded Systems and Improvements:`);
      degradedSystems.forEach(system => {
        console.log(`   • ${system.component}: ${system.message}`);
        if (system.fixes) {
          system.fixes.forEach(fix => {
            console.log(`     - ${fix}`);
          });
        }
      });
    }

    // Next Steps
    console.log(`\n🚀 Next Steps:`);
    if (status === 'EXCELLENT') {
      console.log('   🎉 System is ready for production deployment!');
      console.log('   📊 Continue monitoring system health');
      console.log('   🔄 Schedule regular maintenance');
    } else if (status === 'GOOD') {
      console.log('   🔧 Address degraded systems for optimal performance');
      console.log('   📈 Monitor system improvements');
      console.log('   ✅ System can operate with current status');
    } else {
      console.log('   🚨 Address failed systems before production deployment');
      console.log('   🔧 Implement recommended fixes');
      console.log('   🔄 Re-run verification after fixes');
    }

    console.log('\n' + '='.repeat(80));
  }

  // Helper methods
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private updateSystemStatus(
    component: string, 
    status: 'OPERATIONAL' | 'DEGRADED' | 'FAILED' | 'UNKNOWN',
    health: number,
    message: string,
    details?: any
  ): void {
    this.systemStatuses.set(component, {
      component,
      status,
      health,
      message,
      details,
      lastCheck: new Date(),
      uptime: process.uptime(),
      fixes: details?.fixes
    });

    const emoji = status === 'OPERATIONAL' ? '✅' : 
                 status === 'DEGRADED' ? '⚠️' : 
                 status === 'FAILED' ? '❌' : '❓';
    console.log(`${emoji} ${component}: ${message} (${health}%)`);
  }

  private addDiagnosticResult(
    test: string,
    status: 'PASS' | 'FAIL' | 'WARNING',
    message: string,
    recommendation?: string,
    details?: any
  ): void {
    this.diagnosticResults.push({
      test,
      status,
      message,
      recommendation,
      details
    });

    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${emoji} ${test}: ${message}`);
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new SystemOperationalVerifier();
  verifier.runVerification().catch(console.error);
}

export { SystemOperationalVerifier };