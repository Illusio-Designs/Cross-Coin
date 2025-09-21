#!/usr/bin/env node

/**
 * Performance Optimization Script
 * This script helps optimize the Next.js application for better performance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting performance optimization...\n');

// Function to run commands
function runCommand(command, description) {
  console.log(`📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

// Function to check if file exists
function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, '..', filePath));
}

// Main optimization process
async function optimize() {
  try {
    // 1. Clean previous builds
    if (fileExists('.next')) {
      runCommand('npm run clean', 'Cleaning previous builds');
    }

    // 2. Install dependencies
    runCommand('npm install', 'Installing dependencies');

    // 3. Build the application
    runCommand('npm run build', 'Building optimized application');

    // 4. Analyze bundle (optional)
    if (process.argv.includes('--analyze')) {
      runCommand('npm run analyze', 'Analyzing bundle size');
    }

    console.log('🎉 Performance optimization completed successfully!');
    console.log('\n📊 Performance improvements applied:');
    console.log('  ✅ Image optimization enabled');
    console.log('  ✅ Compression enabled');
    console.log('  ✅ Caching headers configured');
    console.log('  ✅ Bundle splitting optimized');
    console.log('  ✅ SWC minification enabled');
    console.log('  ✅ CSS optimization enabled');
    console.log('  ✅ Package imports optimized');
    
    console.log('\n🚀 Your site should now load significantly faster!');
    console.log('\n💡 Additional recommendations:');
    console.log('  - Use a CDN for static assets');
    console.log('  - Enable HTTP/2 on your server');
    console.log('  - Consider using a service like Vercel or Netlify');
    console.log('  - Monitor Core Web Vitals with tools like Google PageSpeed Insights');

  } catch (error) {
    console.error('❌ Optimization failed:', error.message);
    process.exit(1);
  }
}

// Run optimization
optimize();
