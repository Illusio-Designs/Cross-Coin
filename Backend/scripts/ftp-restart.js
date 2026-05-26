#!/usr/bin/env node
/**
 * Trigger Node.js app restart on production server via Phusion Passenger
 * Usage: node scripts/ftp-restart.js
 *
 * How it works:
 * - Touches /Backend/tmp/restart.txt on the FTP server
 * - cPanel's Phusion Passenger watches this file
 * - Next HTTP request triggers a graceful worker recycle
 * - No manual restart needed; auto-scales with traffic
 */

const Client = require('basic-ftp');
require('dotenv').config();

async function triggerPassengerRestart() {
  const client = new Client();

  try {
    console.log('🚀 Triggering Passenger restart...\n');

    const ftpConfig = {
      host: process.env.FTP_HOST || process.env.FTP_SERVER || 'ftp.crosscoin.in',
      port: parseInt(process.env.FTP_PORT || '21', 10),
      user: process.env.FTP_USER || 'crosscoin',
      password: process.env.FTP_PASSWORD || '',
      secure: process.env.FTP_SECURE === 'explicit' ? 'explicit' : false,
    };

    if (!ftpConfig.password) {
      console.error('❌ FTP_PASSWORD environment variable not set');
      process.exit(1);
    }

    // Connect to FTP
    console.log(`📡 Connecting to ${ftpConfig.host}:${ftpConfig.port}...`);
    await client.access(ftpConfig);
    console.log('✅ Connected\n');

    // Ensure tmp directory exists
    const baseDir = process.env.FTP_BASE_DIR || '/Backend/';
    const tmpDir = `${baseDir}tmp`;

    console.log(`📁 Ensuring ${tmpDir}/ exists...`);
    try {
      await client.ensureDir(tmpDir);
      console.log(`✅ Directory ready\n`);
    } catch (err) {
      console.log(`⚠️ Could not ensure directory: ${err.message}\n`);
    }

    // Write restart.txt with current timestamp
    // Passenger watches the file's modification time
    const restartFile = `${baseDir}tmp/restart.txt`;
    const timestamp = new Date().toISOString();
    const content = `Restart triggered at ${timestamp}\n`;

    console.log(`📝 Writing ${restartFile}...`);
    await client.uploadFrom(Buffer.from(content), restartFile);
    console.log(`✅ File written\n`);

    console.log('🎯 Passenger restart triggered!');
    console.log('   Next HTTP request will recycle the Node.js process');
    console.log(`   Restart time: ${timestamp}`);

  } catch (error) {
    console.error('❌ Failed to trigger restart:', error.message);
    console.error('\nMake sure:');
    console.error('- FTP credentials are correct');
    console.error('- /Backend/tmp/ directory exists or is writable');
    console.error('- FTP_PASSWORD environment variable is set');
    process.exit(1);
  } finally {
    await client.close();
  }
}

triggerPassengerRestart();
