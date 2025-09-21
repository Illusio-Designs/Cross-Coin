@echo off
echo 🚀 Starting Deployment Build Process...
echo.

REM Set colors for better output
color 0A

echo 📋 Deployment Process Steps:
echo   1. Clean previous builds
echo   2. Build optimized application
echo   3. Create deployment package
echo   4. Clean up unnecessary files
echo.

REM Step 1: Clean previous builds
echo 🧹 Step 1: Cleaning previous builds...
call npm run clean
if %ERRORLEVEL% neq 0 (
    echo ❌ Clean failed!
    pause
    exit /b 1
)

echo.
echo 🏗️  Step 2: Building application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo 📦 Step 3: Creating deployment package...
call npm run deploy
if %ERRORLEVEL% neq 0 (
    echo ❌ Deployment package creation failed!
    pause
    exit /b 1
)

echo.
echo 🎉 Deployment build completed successfully!
echo.
echo 📊 Deployment package includes:
echo   ✅ Optimized Next.js build (.next folder)
echo   ✅ Static assets (public folder)
echo   ✅ Production server (server.js)
echo   ✅ Production package.json
echo   ✅ Next.js configuration
echo.
echo 🚀 Ready for deployment!
echo 📁 Deployment files are in the "deploy" folder
echo.
echo 💡 Next steps:
echo   1. Upload the contents of the "deploy" folder to your server
echo   2. Run "npm install --production" on the server
echo   3. Run "npm start" to start the production server
echo   4. Configure your web server to proxy to port 3000
echo.
pause
