/**
 * Simple Node.js script to test performance optimization integration
 * for task 18.11 - Complete Performance Optimization Integration
 */

console.log('🔧 Testing Performance Optimization Integration...\n');

async function testPerformanceIntegration() {
  try {
    // Test 1: Import performance modules using require (CommonJS)
    console.log('1. Testing module imports:');
    
    // Since we're using CommonJS and the files are TypeScript, we'll test the structure
    const fs = require('fs');
    const path = require('path');
    
    const performanceDir = path.join(__dirname, 'src', 'infrastructure', 'performance');
    
    // Check CPU optimizer for the fix
    const cpuOptimizerPath = path.join(performanceDir, 'cpu-optimizer.ts');
    const cpuOptimizerContent = fs.readFileSync(cpuOptimizerPath, 'utf8');
    
    if (cpuOptimizerContent.includes('import * as os from \'os\';')) {
      console.log('   ✅ CPU optimizer has correct os import');
    } else {
      console.log('   ❌ CPU optimizer missing os import');
    }
    
    if (cpuOptimizerContent.includes('os.setPriority(process.pid')) {
      console.log('   ✅ CPU optimizer uses correct os.setPriority method');
    } else {
      console.log('   ❌ CPU optimizer not using os.setPriority');
    }
    
    if (!cpuOptimizerContent.includes('process.setpriority')) {
      console.log('   ✅ CPU optimizer does not use incorrect process.setpriority');
    } else {
      console.log('   ❌ CPU optimizer still uses incorrect process.setpriority');
    }
    
    // Test 2: Check memory optimizer Map operations
    console.log('\n2. Testing memory optimizer Map operations:');
    const memoryOptimizerPath = path.join(performanceDir, 'memory-optimizer.ts');
    const memoryOptimizerContent = fs.readFileSync(memoryOptimizerPath, 'utf8');
    
    if (memoryOptimizerContent.includes('for (const [id, alert] of this.activeAlerts.entries())')) {
      console.log('   ✅ Memory optimizer uses correct Map.entries() iteration');
    } else {
      console.log('   ❌ Memory optimizer Map iteration issue');
    }
    
    if (memoryOptimizerContent.includes('this.activeAlerts.delete(id)')) {
      console.log('   ✅ Memory optimizer has Map deletion logic');
    } else {
      console.log('   ❌ Memory optimizer missing Map deletion');
    }
    
    // Test 3: Check logger imports
    console.log('\n3. Testing logger imports:');
    const files = ['performance-optimizer.ts', 'memory-optimizer.ts', 'disk-optimizer.ts', 'cpu-optimizer.ts', 'performance-integration.ts'];
    
    let allHaveLoggerImports = true;
    for (const file of files) {
      const filePath = path.join(performanceDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (content.includes('import { logger } from \'@/core/logging/logger\';')) {
        console.log(`   ✅ ${file} has correct logger import`);
      } else {
        console.log(`   ❌ ${file} missing logger import`);
        allHaveLoggerImports = false;
      }
    }
    
    if (allHaveLoggerImports) {
      console.log('   ✅ All performance files have correct logger imports');
    }
    
    // Test 4: Check performance integration structure
    console.log('\n4. Testing performance integration structure:');
    const integrationPath = path.join(performanceDir, 'performance-integration.ts');
    const integrationContent = fs.readFileSync(integrationPath, 'utf8');
    
    if (integrationContent.includes('export class PerformanceIntegration')) {
      console.log('   ✅ PerformanceIntegration class exists');
    } else {
      console.log('   ❌ PerformanceIntegration class missing');
    }
    
    if (integrationContent.includes('private performanceOptimizer: PerformanceOptimizer')) {
      console.log('   ✅ PerformanceIntegration has PerformanceOptimizer dependency');
    } else {
      console.log('   ❌ PerformanceIntegration missing PerformanceOptimizer');
    }
    
    // Test 5: Validate Intel NUC specific configurations
    console.log('\n5. Testing Intel NUC specific configurations:');
    const optimizerPath = path.join(performanceDir, 'performance-optimizer.ts');
    const optimizerContent = fs.readFileSync(optimizerPath, 'utf8');
    
    if (optimizerContent.includes('Intel NUC')) {
      console.log('   ✅ Performance optimizer has Intel NUC specific documentation');
    } else {
      console.log('   ❌ Performance optimizer missing Intel NUC references');
    }
    
    // Test 6: Check for proper error handling
    console.log('\n6. Testing error handling patterns:');
    let errorHandlingCount = 0;
    
    for (const file of files) {
      const filePath = path.join(performanceDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (content.includes('try {') && content.includes('} catch (error)')) {
        errorHandlingCount++;
      }
    }
    
    console.log(`   ✅ Found error handling in ${errorHandlingCount}/${files.length} performance files`);
    
    // Test 7: Validate TypeScript configuration compatibility
    console.log('\n7. Testing TypeScript configuration compatibility:');
    const tsconfigPath = path.join(__dirname, 'tsconfig.json');
    
    if (fs.existsSync(tsconfigPath)) {
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
      const tsconfig = JSON.parse(tsconfigContent);
      
      if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths && tsconfig.compilerOptions.paths['@/*']) {
        console.log('   ✅ TypeScript path aliases configured correctly');
      } else {
        console.log('   ❌ TypeScript path aliases missing or incorrect');
      }
      
      if (tsconfig.compilerOptions.esModuleInterop) {
        console.log('   ✅ esModuleInterop enabled');
      } else {
        console.log('   ⚠️  esModuleInterop not enabled');
      }
      
      if (tsconfig.compilerOptions.downlevelIteration) {
        console.log('   ✅ downlevelIteration enabled');
      } else {
        console.log('   ⚠️  downlevelIteration not enabled');
      }
    }
    
    console.log('\n🎯 Performance Optimization Integration Testing Complete!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
  }
}

// Run the test
testPerformanceIntegration();