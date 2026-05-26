#!/usr/bin/env node
/**
 * iThink API Test Runner for Windows / macOS / Linux.
 *
 * Loads credentials from Backend/.env.test (if present), then runs the
 * standalone iThink API tester at Backend/tests/iThink.test.js.
 *
 * Usage:
 *   node run-ithink-tests.js
 *   ITHINK_ACCESS_TOKEN=xxx ITHINK_SECRET_KEY=yyy node run-ithink-tests.js
 *
 * To also POST a real test order (creates a shipment!), set:
 *   TEST_CREATE_ORDER=true node run-ithink-tests.js
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const backendDir = path.join(__dirname, 'Backend');
const envTestPath = path.join(backendDir, '.env.test');
const testFile = path.join(backendDir, 'tests', 'iThink.test.js');

// Load Backend/.env.test if present. Existing process.env vars take precedence
// so you can still override per-run from the command line.
const envOverrides = {};
if (fs.existsSync(envTestPath)) {
  console.log('📋 Loading credentials from Backend/.env.test');
  const envContent = fs.readFileSync(envTestPath, 'utf8');
  for (const rawLine of envContent.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && value && process.env[key] === undefined) {
      envOverrides[key] = value;
    }
  }
}

if (!fs.existsSync(testFile)) {
  console.error(`❌ Test file not found: ${testFile}`);
  process.exit(1);
}

console.log('🚀 Starting iThink API tests...');

// Spawn the test as a child process with cwd=Backend so Node resolves modules
// (axios etc.) from Backend/node_modules. This is what makes the runner work
// from the repo root even though dependencies live one level deeper.
const child = spawn(process.execPath, [testFile], {
  cwd: backendDir,
  stdio: 'inherit',
  env: { ...process.env, ...envOverrides },
});

child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', (err) => {
  console.error('Failed to launch test process:', err.message);
  process.exit(1);
});
