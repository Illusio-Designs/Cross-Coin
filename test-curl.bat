@echo off
REM Test iThink Order Sync with Courier Selection
REM Replace these values with your actual data:

set API_URL=http://localhost:3000/api
set ORDER_ID=1
set AUTH_TOKEN=your_token_here
set COURIER=delhivery

echo.
echo === Testing iThink Order Sync with Courier ===
echo API URL: %API_URL%
echo Order ID: %ORDER_ID%
echo Courier: %COURIER%
echo.

echo 1. Checking order details...
curl -X GET "%API_URL%/orders/%ORDER_ID%" ^
  -H "Authorization: Bearer %AUTH_TOKEN%" ^
  -H "Content-Type: application/json"

echo.
echo.
echo 2. Syncing with selected courier...
curl -X POST "%API_URL%/orders/%ORDER_ID%/sync-with-courier" ^
  -H "Authorization: Bearer %AUTH_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"logistics\": \"%COURIER%\", \"s_type\": \"standard\"}"

echo.
echo.
echo === Test Complete ===
echo Check the server logs (terminal where npm start runs) for:
echo - 📍 Warehouse ID values (pickup, return)
echo - 📝 Order format with logistics
echo - 🚀 iThink API request/response details
echo - 📑 Manifest generation success/failure
pause
