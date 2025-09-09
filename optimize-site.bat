@echo off
echo 🚀 Cross-Coin Performance Optimization Script
echo ============================================
echo.

echo 📦 Installing dependencies...
cd frontend1
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo 🧹 Cleaning previous builds...
call npm run clean
if %errorlevel% neq 0 (
    echo ❌ Failed to clean builds
    pause
    exit /b 1
)

echo.
echo 🔨 Building optimized application...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Failed to build application
    pause
    exit /b 1
)

echo.
echo 🎉 Optimization completed successfully!
echo.
echo 📊 Performance improvements applied:
echo   ✅ Image optimization enabled
echo   ✅ Compression enabled  
echo   ✅ Caching headers configured
echo   ✅ Bundle splitting optimized
echo   ✅ SWC minification enabled
echo   ✅ CSS optimization enabled
echo.
echo 🚀 Your site should now load significantly faster!
echo.
echo 💡 To start the optimized server, run:
echo    cd frontend1
echo    npm start
echo.
pause
