# Test iThink Order Sync with Courier Selection
# USAGE: ./test-curl.ps1 -OrderId 1 -AuthToken "your_token" -Courier "delhivery"

param(
    [string]$OrderId = "1",
    [string]$AuthToken = "your_token_here",
    [string]$Courier = "delhivery",
    [string]$ApiUrl = "http://localhost:3000/api"
)

$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "`n=== Testing iThink Order Sync with Courier ===" -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl" -ForegroundColor Gray
Write-Host "Order ID: $OrderId" -ForegroundColor Gray
Write-Host "Courier: $Courier" -ForegroundColor Gray
Write-Host "`n"

# Headers
$headers = @{
    "Authorization" = "Bearer $AuthToken"
    "Content-Type"  = "application/json"
}

# Test 1: Check order details
Write-Host "1️⃣ Checking order details..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$ApiUrl/orders/$OrderId" `
        -Headers $headers `
        -Method GET `
        -ErrorAction Stop
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Order found:" -ForegroundColor Green
    Write-Host "   Order Number: $($data.order_number)" -ForegroundColor Gray
    Write-Host "   Status: $($data.status)" -ForegroundColor Gray
    Write-Host "   Brand ID: $($data.brand_id)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Error fetching order: $_" -ForegroundColor Red
}

Write-Host "`n"

# Test 2: Sync with selected courier
Write-Host "2️⃣ Syncing with selected courier ($Courier)..." -ForegroundColor Yellow
$body = @{
    logistics = $Courier
    s_type    = "standard"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$ApiUrl/orders/$OrderId/sync-with-courier" `
        -Headers $headers `
        -Method POST `
        -Body $body `
        -ErrorAction Stop

    $syncData = $response.Content | ConvertFrom-Json
    Write-Host "✅ Sync successful:" -ForegroundColor Green

    if ($syncData.success) {
        Write-Host "   Provider: $($syncData.data.provider)" -ForegroundColor Gray
        Write-Host "   Waybill: $($syncData.data.order.waybill)" -ForegroundColor Gray
        Write-Host "   Courier: $($syncData.data.order.courier_name)" -ForegroundColor Gray

        if ($syncData.data.manifest) {
            Write-Host "   📑 Manifest generated!" -ForegroundColor Green
            Write-Host "   Manifest ID: $($syncData.data.manifest.manifestId)" -ForegroundColor Gray
            Write-Host "   PDF URL: $($syncData.data.manifest.downloadUrl)" -ForegroundColor Gray
        } else {
            Write-Host "   ⚠️  No manifest generated" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Sync failed: $($syncData.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error during sync: $_" -ForegroundColor Red
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse) {
        Write-Host "Server error: $($errorResponse.message)" -ForegroundColor Red
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
Write-Host "Check the server logs for detailed debug output:" -ForegroundColor Gray
Write-Host "  - 📍 Warehouse ID values (pickup, return)" -ForegroundColor Gray
Write-Host "  - 📝 Order format with logistics" -ForegroundColor Gray
Write-Host "  - 🚀 iThink API request/response details" -ForegroundColor Gray
Write-Host "  - 📑 Manifest generation success/failure" -ForegroundColor Gray
