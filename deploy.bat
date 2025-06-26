@echo off
echo ===================================
echo  Copy assets to public before build
echo ===================================
if exist "frontend1\public\assets" (
    echo Removing old assets from public...
    rmdir /s /q "frontend1\public\assets"
)
echo Copying assets from src/assets to public/assets...
powershell -Command "Copy-Item -Path frontend1/src/assets -Destination frontend1/public -Recurse -Force"

echo ===================================
echo  Building Next.js Application...
echo ===================================
cd frontend1
call npm run build
cd ..

echo.
echo ===================================
echo  Preparing Deployment Directory...
echo ===================================

if exist "deploy" (
    echo Deleting old deploy directory...
    rmdir /s /q "deploy"
)

echo Creating new deploy directory...
mkdir "deploy"

echo.
echo ===================================
echo  Copying Files for Deployment...
echo ===================================
powershell -Command "Copy-Item -Path frontend1\\.next, frontend1\\public, frontend1\\package.json, frontend1\\package-lock.json, frontend1\\next.config.js, frontend1\\server.js -Destination deploy -Recurse -Verbose"

echo.
echo ===================================
echo  Deployment package is ready!
echo  The 'deploy' directory contains all the files you need to upload.
echo ===================================
pause 