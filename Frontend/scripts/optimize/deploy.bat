@echo off
REM Minimal Next.js production deployment script (no node_modules, no Website folder)
echo Preparing production deployment...

REM Clean previous deploy
if exist "deploy\.next" rmdir /S /Q "deploy\.next"
if exist "deploy\public" rmdir /S /Q "deploy\public"
if exist "deploy\next.config.js" del "deploy\next.config.js"
if exist "deploy\package.json" del "deploy\package.json"
if exist "deploy\package-lock.json" del "deploy\package-lock.json"
if exist "deploy\server.js" del "deploy\server.js"

REM Build the app
cd frontend1
call npm install
call npm run build
cd ..

REM Copy only necessary files/folders
xcopy "frontend1\.next" "deploy\.next" /E /Y /I
xcopy "frontend1\public" "deploy\public" /E /Y /I
copy "frontend1\next.config.js" "deploy\next.config.js"
copy "frontend1\package.json" "deploy\package.json"
copy "frontend1\package-lock.json" "deploy\package-lock.json"
copy "frontend1\server.js" "deploy\server.js"

echo Deployment package is ready in the deploy folder!
pause 