#!/usr/bin/env node

/**
 * Deployment Build Script
 * Creates a clean, optimized build for production deployment
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🚀 Starting Deployment Build...\n");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Function to run commands
function runCommand(command, description) {
  log(`📦 ${description}...`, colors.blue);
  try {
    execSync(command, { stdio: "inherit" });
    log(`✅ ${description} completed`, colors.green);
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Function to clean up files
function cleanupFiles() {
  log("🧹 Cleaning up unnecessary files...", colors.cyan);

  const filesToClean = [
    "performance-report.md",
    "tsconfig.tsbuildinfo",
    ".eslintcache",
    "npm-debug.log*",
    "yarn-debug.log*",
    "yarn-error.log*",
  ];

  filesToClean.forEach((pattern) => {
    try {
      if (process.platform === "win32") {
        execSync(`del /f /q ${pattern} 2>nul`, { stdio: "ignore" });
      } else {
        execSync(`rm -f ${pattern}`, { stdio: "ignore" });
      }
    } catch (error) {
      // Ignore errors for cleanup
    }
  });

  log("✅ Cleanup completed", colors.green);
}

// Function to create deployment package
function createDeploymentPackage() {
  log("📦 Creating deployment package...", colors.cyan);

  const deployDir = path.join(__dirname, "..", "deploy");

  // Remove existing deploy directory
  if (fs.existsSync(deployDir)) {
    fs.rmSync(deployDir, { recursive: true, force: true });
  }

  // Create deploy directory
  fs.mkdirSync(deployDir, { recursive: true });

  // Copy necessary files
  const filesToCopy = [
    ".next",
    "public",
    "package.json",
    "package-lock.json",
    "next.config.js",
    "server.js",
    "tsconfig.json",
  ];

  filesToCopy.forEach((file) => {
    const sourcePath = path.join(__dirname, "..", file);
    const destPath = path.join(deployDir, file);

    if (fs.existsSync(sourcePath)) {
      if (fs.statSync(sourcePath).isDirectory()) {
        // Use Windows-compatible copy command
        if (process.platform === "win32") {
          execSync(`xcopy "${sourcePath}" "${destPath}" /E /I /H /Y`, {
            stdio: "ignore",
          });
        } else {
          execSync(`cp -r "${sourcePath}" "${destPath}"`, { stdio: "ignore" });
        }
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
      log(`  ✅ Copied ${file}`, colors.green);
    }
  });

  // Create production package.json
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
  );

  // Remove dev dependencies and scripts
  delete packageJson.devDependencies;
  packageJson.scripts = {
    start: "NODE_ENV=production node server.js",
  };

  fs.writeFileSync(
    path.join(deployDir, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );

  log("✅ Deployment package created", colors.green);
}

// Main deployment build process
async function deployBuild() {
  const startTime = Date.now();

  try {
    log("🎯 Deployment Build Started", colors.bright);

    // 1. Clean previous builds
    runCommand("npm run clean", "Cleaning previous builds");

    // 2. Install dependencies
    runCommand("npm install", "Installing dependencies");

    // 3. Build the application
    runCommand("npm run build", "Building application");

    // 4. Clean up unnecessary files
    cleanupFiles();

    // 5. Create deployment package
    createDeploymentPackage();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    log("\n🎉 Deployment build completed successfully!", colors.bright);
    log(`⏱️  Total time: ${duration} seconds`, colors.cyan);

    log("\n📊 Deployment package includes:", colors.bright);
    log("  ✅ Optimized Next.js build (.next folder)", colors.green);
    log("  ✅ Static assets (public folder)", colors.green);
    log("  ✅ Production server (server.js)", colors.green);
    log("  ✅ Production package.json", colors.green);
    log("  ✅ Next.js configuration", colors.green);

    log("\n🚀 Ready for deployment!", colors.bright);
    log('📁 Deployment files are in the "deploy" folder', colors.cyan);

    log("\n💡 Deployment instructions:", colors.cyan);
    log(
      '  1. Upload the contents of the "deploy" folder to your server',
      colors.yellow
    );
    log('  2. Run "npm install --production" on the server', colors.yellow);
    log('  3. Run "npm start" to start the production server', colors.yellow);
    log(
      "  4. Configure your web server (nginx/apache) to proxy to port 3000",
      colors.yellow
    );
  } catch (error) {
    log(`❌ Deployment build failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Run deployment build
deployBuild();
