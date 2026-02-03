@echo off
REM Minimal Next.js production deployment script (no node_modules, no Website folder)
echo Preparing production deployment...

REM Create deploy directory if it doesn't exist
if not exist "deploy" mkdir "deploy"

REM Clean previous deploy
if exist "deploy\.next" rmdir /S /Q "deploy\.next"
if exist "deploy\public" rmdir /S /Q "deploy\public"
if exist "deploy\next.config.js" del "deploy\next.config.js"
if exist "deploy\package.json" del "deploy\package.json"
if exist "deploy\package-lock.json" del "deploy\package-lock.json"
if exist "deploy\server.js" del "deploy\server.js"

REM Build the app (we're already in the Frontend directory)
call npm install
call npm run build

REM Copy only necessary files/folders
xcopy ".next" "deploy\.next" /E /Y /I
xcopy "public" "deploy\public" /E /Y /I
copy "next.config.js" "deploy\next.config.js"
copy "package.json" "deploy\package.json"
copy "package-lock.json" "deploy\package-lock.json"
copy "server.js" "deploy\server.js"

echo Deployment package is ready in the deploy folder!
pause 