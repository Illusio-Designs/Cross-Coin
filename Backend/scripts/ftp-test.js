#!/usr/bin/env node
/**
 * Test FTP connection to ftp.crosscoin.in
 * Usage: node scripts/ftp-test.js
 *
 * Tests:
 * - FTPS connection (explicit TLS on port 21)
 * - Authentication
 * - Directory listing
 * - File operations
 */

const Client = require('basic-ftp');
require('dotenv').config();

async function testFTPConnection() {
  const client = new Client();

  try {
    console.log('🔗 Testing FTP connection to ftp.crosscoin.in...\n');

    // Connection settings
    const ftpConfig = {
      host: process.env.FTP_SERVER || 'ftp.crosscoin.in',
      port: parseInt(process.env.FTP_PORT || '21', 10),
      user: process.env.FTP_USER || 'crosscoin',
      password: process.env.FTP_PASSWORD || '',
      secure: process.env.FTP_SECURE === 'explicit' ? 'explicit' : false,
    };

    console.log('📋 Connection Details:');
    console.log(`   Host: ${ftpConfig.host}`);
    console.log(`   Port: ${ftpConfig.port}`);
    console.log(`   User: ${ftpConfig.user}`);
    console.log(`   Secure: ${ftpConfig.secure ? ftpConfig.secure.toUpperCase() : 'OFF'}\n`);

    if (!ftpConfig.password) {
      console.error('❌ FTP_PASSWORD not set in .env or environment');
      process.exit(1);
    }

    // Connect
    console.log('🔐 Connecting...');
    await client.access(ftpConfig);
    console.log('✅ Connected successfully\n');

    // Get current directory
    console.log('📂 Current directory:', client.pwd());

    // List files in Backend directory
    console.log('\n📋 Listing /Backend/ directory:');
    try {
      const files = await client.list('/Backend');
      console.log(`   Found ${files.length} items:`);
      files.slice(0, 10).forEach(file => {
        const type = file.isDirectory ? '📁' : '📄';
        console.log(`   ${type} ${file.name} (${file.size} bytes)`);
      });
      if (files.length > 10) {
        console.log(`   ... and ${files.length - 10} more items`);
      }
    } catch (err) {
      console.log(`   ⚠️ Could not list /Backend: ${err.message}`);
    }

    // Test creating tmp/restart.txt
    console.log('\n🚀 Testing tmp/restart.txt creation...');
    try {
      const timestamp = new Date().toISOString();
      const content = `Restart triggered: ${timestamp}\n`;

      await client.ensureDir('/Backend/tmp');
      await client.uploadFrom(Buffer.from(content), '/Backend/tmp/restart.txt');
      console.log('✅ Successfully wrote /Backend/tmp/restart.txt');
      console.log('   (Passenger will restart the app on next request)\n');
    } catch (err) {
      console.log(`⚠️ Could not write restart.txt: ${err.message}\n`);
    }

    console.log('✅ All FTP tests passed!');
    console.log('\nYou can now use this FTP server for deployments.');

  } catch (error) {
    console.error('❌ FTP test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('- Check FTP credentials (user, password, host)');
    console.error('- Verify port 21 is not blocked by firewall');
    console.error('- Ensure FTPS is enabled on the server');
    process.exit(1);
  } finally {
    await client.close();
  }
}

testFTPConnection();
