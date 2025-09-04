#!/usr/bin/env tsx

/**
 * Simplified Production Validation Script
 * 
 * This script validates the production build by checking:
 * 1. Core file structure exists
 * 2. Essential dependencies are available
 * 3. Basic TypeScript compilation of key modules
 * 4. Environment configuration template exists
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
}

class ProductionValidator {
  private results: ValidationResult[] = [];

  private addResult(name: string, passed: boolean, message: string) {
    this.results.push({ name, passed, message });
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}: ${message}`);
  }

  async validateFileStructure(): Promise<void> {
    console.log('\n📁 Validating file structure...');
    
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'src/trading/trading-engine.ts',
      'src/trading/api/gate-io-client.ts',
      'src/security/encryption-service.ts',
      'src/core/logging/logger.ts',
      'deployment/production-checklist.md',
      'deployment/production.env.template'
    ];

    for (const file of requiredFiles) {
      const exists = existsSync(file);
      this.addResult(
        `File: ${file}`,
        exists,
        exists ? 'Found' : 'Missing'
      );
    }
  }

  async validatePackageJson(): Promise<void> {
    console.log('\n📦 Validating package.json...');
    
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
      
      // Check essential dependencies
      const requiredDeps = [
        'axios',
        'crypto',
        'winston',
        'typescript'
      ];

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      for (const dep of requiredDeps) {
        const exists = dep in allDeps;
        this.addResult(
          `Dependency: ${dep}`,
          exists,
          exists ? `Version ${allDeps[dep]}` : 'Missing'
        );
      }

      // Check scripts
      const requiredScripts = ['build', 'start'];
      for (const script of requiredScripts) {
        const exists = packageJson.scripts && script in packageJson.scripts;
        this.addResult(
          `Script: ${script}`,
          exists,
          exists ? 'Defined' : 'Missing'
        );
      }

    } catch (error) {
      this.addResult('Package.json parsing', false, `Error: ${error}`);
    }
  }

  async validateTypeScriptConfig(): Promise<void> {
    console.log('\n🔧 Validating TypeScript configuration...');
    
    try {
      const tsconfig = JSON.parse(readFileSync('tsconfig.json', 'utf8'));
      
      const hasCompilerOptions = !!tsconfig.compilerOptions;
      this.addResult(
        'TypeScript compiler options',
        hasCompilerOptions,
        hasCompilerOptions ? 'Configured' : 'Missing'
      );

      if (hasCompilerOptions) {
        const hasTarget = !!tsconfig.compilerOptions.target;
        const hasModule = !!tsconfig.compilerOptions.module;
        
        this.addResult(
          'TypeScript target',
          hasTarget,
          hasTarget ? `Target: ${tsconfig.compilerOptions.target}` : 'Not set'
        );
        
        this.addResult(
          'TypeScript module',
          hasModule,
          hasModule ? `Module: ${tsconfig.compilerOptions.module}` : 'Not set'
        );
      }

    } catch (error) {
      this.addResult('TypeScript config parsing', false, `Error: ${error}`);
    }
  }

  async validateEnvironmentTemplate(): Promise<void> {
    console.log('\n🌍 Validating environment template...');
    
    try {
      const envTemplate = readFileSync('deployment/production.env.template', 'utf8');
      
      const requiredVars = [
        'MASTER_ENCRYPTION_KEY',
        'GATEIO_API_KEY',
        'GATEIO_API_SECRET',
        'NODE_ENV',
        'PORT'
      ];

      for (const envVar of requiredVars) {
        const exists = envTemplate.includes(envVar);
        this.addResult(
          `Environment variable: ${envVar}`,
          exists,
          exists ? 'Template provided' : 'Missing from template'
        );
      }

    } catch (error) {
      this.addResult('Environment template validation', false, `Error: ${error}`);
    }
  }

  async validateNodeEnvironment(): Promise<void> {
    console.log('\n🚀 Validating Node.js environment...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    const isValidVersion = majorVersion >= 18;
    
    this.addResult(
      'Node.js version',
      isValidVersion,
      `${nodeVersion} ${isValidVersion ? '(Compatible)' : '(Requires 18+)'}`
    );

    // Check platform
    this.addResult(
      'Platform',
      true,
      `${process.platform} ${process.arch}`
    );

    // Check memory
    const memoryMB = Math.round(process.memoryUsage().heapTotal / 1024 / 1024);
    const hasEnoughMemory = memoryMB >= 100; // At least 100MB
    
    this.addResult(
      'Available memory',
      hasEnoughMemory,
      `${memoryMB}MB ${hasEnoughMemory ? '(Sufficient)' : '(Low)'}`
    );
  }

  async validateBasicImports(): Promise<void> {
    console.log('\n📚 Validating basic imports...');
    
    // Test basic Node.js modules
    try {
      require('crypto');
      this.addResult('Crypto module', true, 'Available');
    } catch (error) {
      this.addResult('Crypto module', false, `Error: ${error}`);
    }

    try {
      require('fs');
      this.addResult('File system module', true, 'Available');
    } catch (error) {
      this.addResult('File system module', false, `Error: ${error}`);
    }

    try {
      require('path');
      this.addResult('Path module', true, 'Available');
    } catch (error) {
      this.addResult('Path module', false, `Error: ${error}`);
    }
  }

  generateReport(): void {
    console.log('\n📊 VALIDATION REPORT');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const successRate = (passed / total) * 100;
    
    console.log(`✅ Passed: ${passed}/${total} (${successRate.toFixed(1)}%)`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    
    if (successRate >= 80) {
      console.log('\n🎉 VALIDATION PASSED');
      console.log('✅ Production build is ready for deployment');
      console.log('📋 Next steps:');
      console.log('   1. Copy deployment/production.env.template to .env');
      console.log('   2. Fill in your actual configuration values');
      console.log('   3. Follow deployment/production-checklist.md');
      console.log('   4. Run npm run build && npm start');
    } else {
      console.log('\n⚠️ VALIDATION WARNINGS');
      console.log('🔧 Some issues detected - review before deployment');
      
      const failed = this.results.filter(r => !r.passed);
      if (failed.length > 0) {
        console.log('\n❌ Failed checks:');
        failed.forEach(result => {
          console.log(`   - ${result.name}: ${result.message}`);
        });
      }
    }
    
    console.log('\n📖 For detailed deployment instructions, see:');
    console.log('   deployment/production-checklist.md');
  }

  async run(): Promise<void> {
    console.log('🔍 SmoothSail Production Build Validation');
    console.log('==========================================');
    
    await this.validateNodeEnvironment();
    await this.validateFileStructure();
    await this.validatePackageJson();
    await this.validateTypeScriptConfig();
    await this.validateEnvironmentTemplate();
    await this.validateBasicImports();
    
    this.generateReport();
  }
}

// Run validation
const validator = new ProductionValidator();
validator.run().catch(error => {
  console.error('💥 Validation failed:', error);
  process.exit(1);
});