@echo off
echo Starting deployment preparation...

REM Create deployment directory structure
if not exist "deploy\Website" mkdir "deploy\Website"

REM Copy necessary files to the correct structure
echo Copying files to deployment structure...

REM Copy server.js
copy "frontend1\server.js" "deploy\Website\server.js"

REM Copy package.json
copy "frontend1\package.json" "deploy\Website\package.json"

REM Copy next.config.js
copy "frontend1\next.config.js" "deploy\Website\next.config.js"

REM Copy .env.local if exists
if exist "frontend1\.env.local" copy "frontend1\.env.local" "deploy\Website\.env.local"

REM Copy public folder
if not exist "deploy\Website\public" mkdir "deploy\Website\public"
xcopy "frontend1\public\*" "deploy\Website\public\" /E /Y

REM Copy src folder
if not exist "deploy\Website\src" mkdir "deploy\Website\src"
xcopy "frontend1\src\*" "deploy\Website\src\" /E /Y

REM Copy other necessary files
copy "frontend1\jsconfig.json" "deploy\Website\jsconfig.json"
copy "frontend1\postcss.config.mjs" "deploy\Website\postcss.config.mjs"
copy "frontend1\tailwind.config.mjs" "deploy\Website\tailwind.config.mjs"

REM Copy .htaccess
copy "frontend1\.htaccess" "deploy\Website\.htaccess"

echo Deployment package prepared in deploy\Website\
echo Please upload the contents of deploy\Website\ to your hosting provider
echo Make sure the files are placed in /home/crosscoin/Website/ on your server
pause 