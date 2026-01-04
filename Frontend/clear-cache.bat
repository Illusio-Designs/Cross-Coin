@echo off
echo Clearing Next.js cache and build files...

echo Stopping any running development servers...
taskkill /f /im node.exe 2>nul

if exist .next (
    rmdir /s /q .next
    echo Removed .next directory
) else (
    echo .next directory not found
)

if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo Removed node_modules cache
) else (
    echo node_modules cache not found
)

if exist .next\cache (
    rmdir /s /q .next\cache
    echo Removed .next cache
) else (
    echo .next cache not found
)

echo.
echo Cache cleared successfully!
echo.
echo Please also clear your browser cache:
echo 1. Press F12 to open Developer Tools
echo 2. Right-click the refresh button
echo 3. Select "Empty Cache and Hard Reload"
echo.
echo Then restart your development server with: npm run dev
echo.
pause