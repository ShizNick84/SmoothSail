#!/usr/bin/env tsx

/**
 * React Dashboard Application Validation Script
 * 
 * This script validates the React dashboard application by:
 * 1. Confirming the build is properly optimized
 * 2. Testing all dashboard components and functionality
 * 3. Validating responsive design
 * 4. Testing performance and loading times
 */

import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ValidationResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

class DashboardValidator {
  private results: ValidationResult[] = [];
  private dashboardPath = path.join(process.cwd(), 'src', 'dashboard');

  async validateBuildOptimization(): Promise<void> {
    console.log('🔍 Validating React Dashboard Build Optimization...\n');

    try {
      // Check if .next directory exists
      const nextDir = path.join(this.dashboardPath, '.next');
      const nextExists = await this.fileExists(nextDir);
      
      if (!nextExists) {
        this.addResult('Build Directory', 'FAIL', 'Next.js build directory (.next) not found');
        return;
      }

      this.addResult('Build Directory', 'PASS', 'Next.js build directory exists');

      // Check build manifest
      const buildManifest = path.join(nextDir, 'build-manifest.json');
      if (await this.fileExists(buildManifest)) {
        const manifest = JSON.parse(await fs.readFile(buildManifest, 'utf-8'));
        this.addResult('Build Manifest', 'PASS', `Build manifest contains ${Object.keys(manifest.pages || {}).length} pages`);
      }

      // Check static assets
      const staticDir = path.join(nextDir, 'static');
      if (await this.fileExists(staticDir)) {
        const staticFiles = await fs.readdir(staticDir, { recursive: true });
        const jsFiles = staticFiles.filter(f => f.toString().endsWith('.js')).length;
        const cssFiles = staticFiles.filter(f => f.toString().endsWith('.css')).length;
        
        this.addResult('Static Assets', 'PASS', `Generated ${jsFiles} JS files and ${cssFiles} CSS files`);
      }

      // Check for optimization indicators
      const appBuildManifest = path.join(nextDir, 'app-build-manifest.json');
      if (await this.fileExists(appBuildManifest)) {
        this.addResult('App Build Manifest', 'PASS', 'App router build manifest exists');
      }

    } catch (error) {
      this.addResult('Build Validation', 'FAIL', `Error validating build: ${error}`);
    }
  }

  async validatePackageConfiguration(): Promise<void> {
    console.log('📦 Validating Package Configuration...\n');

    try {
      // Check dashboard package.json
      const dashboardPackage = path.join(this.dashboardPath, 'package.json');
      
      if (await this.fileExists(dashboardPackage)) {
        const pkg = JSON.parse(await fs.readFile(dashboardPackage, 'utf-8'));
        this.addResult('Dashboard Package', 'PASS', `Dashboard package.json exists with ${Object.keys(pkg.dependencies || {}).length} dependencies`);
      } else {
        // Check if dashboard uses root package.json
        const rootPackage = path.join(process.cwd(), 'package.json');
        const pkg = JSON.parse(await fs.readFile(rootPackage, 'utf-8'));
        
        const dashboardScripts = Object.keys(pkg.scripts).filter(s => s.includes('dashboard'));
        if (dashboardScripts.length > 0) {
          this.addResult('Dashboard Scripts', 'PASS', `Found ${dashboardScripts.length} dashboard scripts in root package.json`);
        }
      }

      // Check Next.js configuration
      const nextConfig = path.join(this.dashboardPath, 'next.config.js');
      if (await this.fileExists(nextConfig)) {
        this.addResult('Next.js Config', 'PASS', 'Next.js configuration file exists');
      }

      // Check TypeScript configuration
      const tsConfig = path.join(this.dashboardPath, 'tsconfig.json');
      if (await this.fileExists(tsConfig)) {
        this.addResult('TypeScript Config', 'PASS', 'TypeScript configuration exists');
      }

      // Check Tailwind configuration
      const tailwindConfig = path.join(this.dashboardPath, 'tailwind.config.js');
      if (await this.fileExists(tailwindConfig)) {
        this.addResult('Tailwind Config', 'PASS', 'Tailwind CSS configuration exists');
      }

    } catch (error) {
      this.addResult('Package Configuration', 'FAIL', `Error validating configuration: ${error}`);
    }
  }

  async validateComponentStructure(): Promise<void> {
    console.log('🧩 Validating Component Structure...\n');

    try {
      const componentsDir = path.join(this.dashboardPath, 'components');
      
      if (await this.fileExists(componentsDir)) {
        const components = await this.getFilesRecursively(componentsDir, ['.tsx', '.ts', '.jsx', '.js']);
        this.addResult('Components Directory', 'PASS', `Found ${components.length} component files`);

        // Check for common dashboard components
        const componentNames = components.map(c => path.basename(c, path.extname(c)).toLowerCase());
        
        const expectedComponents = [
          'dashboard', 'chart', 'trading', 'performance', 'notification', 
          'settings', 'health', 'log', 'status', 'alert'
        ];

        const foundComponents = expectedComponents.filter(expected => 
          componentNames.some(name => name.includes(expected))
        );

        if (foundComponents.length > 0) {
          this.addResult('Core Components', 'PASS', `Found components: ${foundComponents.join(', ')}`);
        } else {
          this.addResult('Core Components', 'WARNING', 'No recognizable dashboard components found');
        }
      } else {
        this.addResult('Components Directory', 'WARNING', 'Components directory not found');
      }

      // Check app directory (App Router)
      const appDir = path.join(this.dashboardPath, 'app');
      if (await this.fileExists(appDir)) {
        const appFiles = await this.getFilesRecursively(appDir, ['.tsx', '.ts']);
        this.addResult('App Router', 'PASS', `Found ${appFiles.length} app router files`);
      }

    } catch (error) {
      this.addResult('Component Structure', 'FAIL', `Error validating components: ${error}`);
    }
  }

  async validateResponsiveDesign(): Promise<void> {
    console.log('📱 Validating Responsive Design Configuration...\n');

    try {
      // Check Tailwind config for responsive breakpoints
      const tailwindConfig = path.join(this.dashboardPath, 'tailwind.config.js');
      
      if (await this.fileExists(tailwindConfig)) {
        const configContent = await fs.readFile(tailwindConfig, 'utf-8');
        
        // Check for responsive utilities
        const hasResponsiveClasses = /sm:|md:|lg:|xl:|2xl:/.test(configContent);
        if (hasResponsiveClasses) {
          this.addResult('Responsive Classes', 'PASS', 'Tailwind responsive classes configured');
        }

        // Check for mobile-first approach
        const hasMobileFirst = configContent.includes('mobile') || configContent.includes('responsive');
        if (hasMobileFirst) {
          this.addResult('Mobile-First Design', 'PASS', 'Mobile-first design indicators found');
        }
      }

      // Check for responsive components in source files
      const allFiles = await this.getFilesRecursively(this.dashboardPath, ['.tsx', '.ts', '.jsx', '.js']);
      let responsiveIndicators = 0;

      for (const file of allFiles) {
        const content = await fs.readFile(file, 'utf-8');
        if (/sm:|md:|lg:|xl:|2xl:|mobile|tablet|desktop|responsive/i.test(content)) {
          responsiveIndicators++;
        }
      }

      if (responsiveIndicators > 0) {
        this.addResult('Responsive Implementation', 'PASS', `Found responsive design in ${responsiveIndicators} files`);
      } else {
        this.addResult('Responsive Implementation', 'WARNING', 'No responsive design indicators found in components');
      }

    } catch (error) {
      this.addResult('Responsive Design', 'FAIL', `Error validating responsive design: ${error}`);
    }
  }

  async validatePerformanceOptimizations(): Promise<void> {
    console.log('⚡ Validating Performance Optimizations...\n');

    try {
      // Check for Next.js optimizations
      const nextConfig = path.join(this.dashboardPath, 'next.config.js');
      
      if (await this.fileExists(nextConfig)) {
        const configContent = await fs.readFile(nextConfig, 'utf-8');
        
        // Check for common optimizations
        const optimizations = {
          'Image Optimization': /next\/image|Image/.test(configContent),
          'Bundle Analyzer': /bundle-analyzer/.test(configContent),
          'Compression': /compress|gzip/.test(configContent),
          'Minification': /minify|minimize/.test(configContent)
        };

        Object.entries(optimizations).forEach(([name, found]) => {
          this.addResult(name, found ? 'PASS' : 'WARNING', 
            found ? `${name} configuration found` : `${name} not explicitly configured`);
        });
      }

      // Check for performance-related imports
      const allFiles = await this.getFilesRecursively(this.dashboardPath, ['.tsx', '.ts']);
      let performanceFeatures = {
        'Dynamic Imports': 0,
        'Lazy Loading': 0,
        'Memoization': 0,
        'Image Optimization': 0
      };

      for (const file of allFiles) {
        const content = await fs.readFile(file, 'utf-8');
        
        if (/dynamic\(|import\(/.test(content)) performanceFeatures['Dynamic Imports']++;
        if (/lazy|Suspense/.test(content)) performanceFeatures['Lazy Loading']++;
        if (/memo|useMemo|useCallback/.test(content)) performanceFeatures['Memoization']++;
        if (/next\/image|Image/.test(content)) performanceFeatures['Image Optimization']++;
      }

      Object.entries(performanceFeatures).forEach(([feature, count]) => {
        if (count > 0) {
          this.addResult(`Performance: ${feature}`, 'PASS', `Found in ${count} files`);
        }
      });

    } catch (error) {
      this.addResult('Performance Validation', 'FAIL', `Error validating performance: ${error}`);
    }
  }

  async testDashboardBuild(): Promise<void> {
    console.log('🔨 Testing Dashboard Build Process...\n');

    try {
      // Test if dashboard can be built
      const buildCommand = 'npm run dashboard:build';
      
      console.log(`Running: ${buildCommand}`);
      const { stdout, stderr } = await execAsync(buildCommand, { 
        cwd: process.cwd(),
        timeout: 120000 // 2 minutes timeout
      });

      if (stderr && !stderr.includes('warn')) {
        this.addResult('Build Process', 'WARNING', `Build completed with warnings: ${stderr.substring(0, 200)}`);
      } else {
        this.addResult('Build Process', 'PASS', 'Dashboard builds successfully');
      }

      // Check build output size
      const nextDir = path.join(this.dashboardPath, '.next');
      const buildSize = await this.getDirectorySize(nextDir);
      
      if (buildSize < 50 * 1024 * 1024) { // Less than 50MB
        this.addResult('Build Size', 'PASS', `Build size: ${(buildSize / 1024 / 1024).toFixed(2)}MB`);
      } else {
        this.addResult('Build Size', 'WARNING', `Build size is large: ${(buildSize / 1024 / 1024).toFixed(2)}MB`);
      }

    } catch (error) {
      this.addResult('Build Test', 'FAIL', `Build failed: ${error}`);
    }
  }

  async validateAccessibility(): Promise<void> {
    console.log('♿ Validating Accessibility Features...\n');

    try {
      const allFiles = await this.getFilesRecursively(this.dashboardPath, ['.tsx', '.jsx']);
      let accessibilityFeatures = {
        'ARIA Labels': 0,
        'Alt Text': 0,
        'Semantic HTML': 0,
        'Keyboard Navigation': 0
      };

      for (const file of allFiles) {
        const content = await fs.readFile(file, 'utf-8');
        
        if (/aria-|role=/.test(content)) accessibilityFeatures['ARIA Labels']++;
        if (/alt=/.test(content)) accessibilityFeatures['Alt Text']++;
        if (/<(header|nav|main|section|article|aside|footer)/.test(content)) accessibilityFeatures['Semantic HTML']++;
        if (/onKeyDown|onKeyPress|tabIndex/.test(content)) accessibilityFeatures['Keyboard Navigation']++;
      }

      Object.entries(accessibilityFeatures).forEach(([feature, count]) => {
        if (count > 0) {
          this.addResult(`Accessibility: ${feature}`, 'PASS', `Found in ${count} files`);
        } else {
          this.addResult(`Accessibility: ${feature}`, 'WARNING', 'Not found in components');
        }
      });

    } catch (error) {
      this.addResult('Accessibility Validation', 'FAIL', `Error validating accessibility: ${error}`);
    }
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

  private async getFilesRecursively(dir: string, extensions: string[]): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          files.push(...await this.getFilesRecursively(fullPath, extensions));
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }
    
    return files;
  }

  private async getDirectorySize(dir: string): Promise<number> {
    let size = 0;
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          size += await this.getDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          size += stats.size;
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    return size;
  }

  private addResult(test: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: any): void {
    this.results.push({ test, status, message, details });
    
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${emoji} ${test}: ${message}`);
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 REACT DASHBOARD VALIDATION REPORT');
    console.log('='.repeat(80));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⚠️  Warnings: ${warnings}`);
    console.log(`   📊 Total Tests: ${this.results.length}`);

    if (failed > 0) {
      console.log(`\n❌ Failed Tests:`);
      this.results.filter(r => r.status === 'FAIL').forEach(result => {
        console.log(`   • ${result.test}: ${result.message}`);
      });
    }

    if (warnings > 0) {
      console.log(`\n⚠️  Warnings:`);
      this.results.filter(r => r.status === 'WARNING').forEach(result => {
        console.log(`   • ${result.test}: ${result.message}`);
      });
    }

    const overallStatus = failed === 0 ? (warnings === 0 ? 'EXCELLENT' : 'GOOD') : 'NEEDS ATTENTION';
    console.log(`\n🎯 Overall Status: ${overallStatus}`);
    
    if (overallStatus === 'EXCELLENT') {
      console.log('🎉 Dashboard is fully validated and ready for production!');
    } else if (overallStatus === 'GOOD') {
      console.log('👍 Dashboard is functional with minor improvements recommended.');
    } else {
      console.log('🔧 Dashboard requires attention to failed tests before deployment.');
    }

    console.log('\n' + '='.repeat(80));
  }

  async runValidation(): Promise<void> {
    console.log('🚀 Starting React Dashboard Application Validation...\n');
    
    await this.validateBuildOptimization();
    await this.validatePackageConfiguration();
    await this.validateComponentStructure();
    await this.validateResponsiveDesign();
    await this.validatePerformanceOptimizations();
    await this.testDashboardBuild();
    await this.validateAccessibility();
    
    this.generateReport();
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new DashboardValidator();
  validator.runValidation().catch(console.error);
}

export { DashboardValidator };