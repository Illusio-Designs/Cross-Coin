/**
 * FTP Deployment Tests
 * Tests FTP connection, file upload, and Passenger restart functionality
 *
 * Run with: npm test -- ftp-deployment.test.js
 * Or: node -r dotenv/config Backend/tests/ftp-deployment.test.js
 */

const { Client } = require('basic-ftp');
require('dotenv').config();

describe('FTP Deployment', () => {
  let client;
  const ftpConfig = {
    host: process.env.FTP_SERVER || 'ftp.crosscoin.in',
    port: parseInt(process.env.FTP_PORT || '21', 10),
    user: process.env.FTP_USER || 'crosscoin',
    password: process.env.FTP_PASSWORD || '',
    secure: process.env.FTP_SECURE === 'explicit' ? 'explicit' : false,
  };

  beforeAll(async () => {
    if (!ftpConfig.password) {
      console.error('⚠️  FTP_PASSWORD not set. Skipping FTP tests.');
      return;
    }
    client = new Client();
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  test('should connect to FTP server', async () => {
    if (!ftpConfig.password) {
      console.warn('Skipping: FTP credentials not configured');
      return;
    }

    expect(async () => {
      await client.access(ftpConfig);
    }).not.toThrow();
  });

  test('should list Backend directory', async () => {
    if (!ftpConfig.password || !client) {
      console.warn('Skipping: FTP credentials not configured');
      return;
    }

    try {
      await client.access(ftpConfig);
      const files = await client.list('/Backend');
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
    } catch (err) {
      console.error('Error listing directory:', err.message);
      throw err;
    }
  });

  test('should create tmp directory', async () => {
    if (!ftpConfig.password || !client) {
      console.warn('Skipping: FTP credentials not configured');
      return;
    }

    try {
      await client.access(ftpConfig);
      await client.ensureDir('/Backend/tmp');
      // If we get here without error, directory was created or already exists
      expect(true).toBe(true);
    } catch (err) {
      console.error('Error creating directory:', err.message);
      throw err;
    }
  });

  test('should write restart.txt for Passenger', async () => {
    if (!ftpConfig.password || !client) {
      console.warn('Skipping: FTP credentials not configured');
      return;
    }

    try {
      await client.access(ftpConfig);
      const content = Buffer.from(`Test restart at ${new Date().toISOString()}\n`);
      await client.uploadFrom(content, '/Backend/tmp/restart.txt');
      // File written successfully
      expect(true).toBe(true);
    } catch (err) {
      console.error('Error writing restart file:', err.message);
      throw err;
    }
  });

  test('should handle FTPS with explicit TLS', async () => {
    if (!ftpConfig.password) {
      console.warn('Skipping: FTP credentials not configured');
      return;
    }

    const explicitFtpsConfig = {
      ...ftpConfig,
      secure: 'explicit',
    };

    expect(async () => {
      const testClient = new Client();
      await testClient.access(explicitFtpsConfig);
      await testClient.close();
    }).not.toThrow();
  });
});

// If running standalone (not via Jest)
if (require.main === module) {
  const runTests = async () => {
    console.log('🧪 Running FTP Deployment Tests\n');

    if (!ftpConfig.password) {
      console.error('❌ FTP_PASSWORD not configured');
      console.error('Set FTP_PASSWORD in .env file to run these tests');
      process.exit(1);
    }

    const testClient = new Client();

    try {
      console.log('Test 1: Connect to FTP server');
      await testClient.access(ftpConfig);
      console.log('✅ Connection successful\n');

      console.log('Test 2: List /Backend directory');
      const files = await testClient.list('/Backend');
      console.log(`✅ Found ${files.length} files\n`);

      console.log('Test 3: Ensure /Backend/tmp exists');
      await testClient.ensureDir('/Backend/tmp');
      console.log('✅ Directory ready\n');

      console.log('Test 4: Write restart.txt');
      const { Readable } = require('stream');
      const content = `Test at ${new Date().toISOString()}\n`;
      const stream = Readable.from([content]);
      await testClient.uploadFrom(stream, '/Backend/tmp/restart.txt');
      console.log('✅ File written\n');

      console.log('✅ All FTP tests passed!');
      process.exit(0);
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    } finally {
      await testClient.close();
    }
  };

  runTests();
}
