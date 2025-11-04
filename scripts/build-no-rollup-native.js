#!/usr/bin/env node

// Custom build script that prevents Rollup from loading native modules
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔧 Starting build with native module prevention...');

// Step 1: Backup and replace rollup native.js with a stub
const rollupNativePath = join(projectRoot, 'node_modules/rollup/dist/native.js');
const rollupNativeBackupPath = rollupNativePath + '.backup';

let needsRestore = false;

if (fs.existsSync(rollupNativePath)) {
  try {
    console.log('📦 Backing up and stubbing rollup native.js...');
    
    // Backup original
    if (!fs.existsSync(rollupNativeBackupPath)) {
      fs.copyFileSync(rollupNativePath, rollupNativeBackupPath);
    }
    
    // Replace with stub that always uses JS fallback
    const stubContent = `
// Stubbed native.js - always use JS fallback
console.log('Using Rollup JS fallback (native modules disabled)');
module.exports = {};
`;
    
    fs.writeFileSync(rollupNativePath, stubContent, 'utf8');
    needsRestore = true;
    console.log('✅ Rollup native.js stubbed successfully');
    
  } catch (error) {
    console.warn('⚠️ Could not stub rollup native.js:', error.message);
  }
}

// Step 2: Run vite build
console.log('🚀 Running vite build...');

const viteProcess = spawn('npx', ['vite', 'build'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    ROLLUP_NO_NATIVE: '1',
    NODE_ENV: 'production'
  }
});

viteProcess.on('close', (code) => {
  // Step 3: Restore original native.js
  if (needsRestore && fs.existsSync(rollupNativeBackupPath)) {
    try {
      console.log('🔄 Restoring original rollup native.js...');
      fs.copyFileSync(rollupNativeBackupPath, rollupNativePath);
      fs.unlinkSync(rollupNativeBackupPath);
      console.log('✅ Original rollup native.js restored');
    } catch (error) {
      console.warn('⚠️ Could not restore rollup native.js:', error.message);
    }
  }
  
  if (code === 0) {
    console.log('🎉 Build completed successfully!');
  } else {
    console.error('❌ Build failed with exit code:', code);
    process.exit(code);
  }
});

viteProcess.on('error', (error) => {
  console.error('❌ Failed to start build process:', error);
  process.exit(1);
});
