#!/usr/bin/env node

// Simple startup script that bypasses TypeScript compilation issues
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting SmoothSail Trading Agent...');
console.log('📍 Working directory:', process.cwd());

// Check if we have the basic files
const requiredFiles = [
  'src/main-simple.ts',
  'src/main.ts', 
  'package.json'
];

console.log('🔍 Checking required files...');
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ Found: ${file}`);
  } else {
    console.log(`❌ Missing: ${file}`);
  }
}

// Try to start with ts-node
console.log('🔄 Attempting to start with ts-node...');

const { spawn } = require('child_process');

// Try different startup methods
const startupMethods = [
  ['npx', ['ts-node', '--transpile-only', 'src/main-simple.ts']],
  ['npx', ['ts-node', '--transpile-only', 'src/main.ts']],
  ['npx', ['ts-node', 'src/main-simple.ts']],
  ['node', ['dist/main-simple.js']],
  ['node', ['dist/main.js']]
];

let currentMethod = 0;

function tryNextMethod() {
  if (currentMethod >= startupMethods.length) {
    console.log('❌ All startup methods failed');
    console.log('💡 Try running: npm install && npm run build');
    process.exit(1);
  }

  const [command, args] = startupMethods[currentMethod];
  console.log(`🔄 Trying method ${currentMethod + 1}: ${command} ${args.join(' ')}`);
  
  const child = spawn(command, args, { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  child.on('error', (error) => {
    console.log(`❌ Method ${currentMethod + 1} failed:`, error.message);
    currentMethod++;
    setTimeout(tryNextMethod, 1000);
  });

  child.on('exit', (code) => {
    if (code === 0) {
      console.log('✅ Application started successfully!');
    } else {
      console.log(`❌ Method ${currentMethod + 1} exited with code ${code}`);
      currentMethod++;
      setTimeout(tryNextMethod, 1000);
    }
  });
}

tryNextMethod();