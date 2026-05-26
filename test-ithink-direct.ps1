# Direct iThink API Testing
# Tests 3 critical endpoints directly with iThink

param(
    [string]$AccessToken = "a89362fc7868a8f870038149748bb1cf",
    [string]$SecretKey = "f69ad91c689400f2c2e8392753e0ca74",
    [string]$PickupAddressId = "116197",
    [string]$Courier = "delhivery",
    [string]$OrderNumber = "TEST-$(Get-Date -Format 'HHmmss')"
)

$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$BaseURL = "https://my.ithinklogistics.com"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DIRECT iThINK API TESTING" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Base URL: $BaseURL"
Write-Host "  Access Token: $($AccessToken.Substring(0,8))..."
Write-Host "  Pickup Address ID: $PickupAddressId"
Write-Host "  Test Order: $OrderNumber`n"

# ============================================================================
# TEST 1: Verify Pickup Location Exists
# ============================================================================
Write-Host "`n1️⃣  TESTING PICKUP LOCATION VERIFICATION" -ForegroundColor Cyan
Write-Host "   GET /api_v3/pickup/list.json" -ForegroundColor Gray

$auth = @{
    access_token = $AccessToken
    secret_key   = $SecretKey
}

try {
    $response = Invoke-WebRequest `
        -Uri "$BaseURL/api_v3/pickup/list.json" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body (ConvertTo-Json $auth) `
        -ErrorAction Stop

    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Response received" -ForegroundColor Green
    Write-Host "   Status: $($data.status)" -ForegroundColor Gray

    # Check if our pickup address is in the list
    if ($data.data -and $data.data | ConvertTo-Json -Depth 10 | Select-String $PickupAddressId) {
        Write-Host "   ✅ Pickup Address $PickupAddressId FOUND in list" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Pickup Address $PickupAddressId NOT found in list" -ForegroundColor Yellow
        Write-Host "   Available pickup addresses:" -ForegroundColor Yellow
        if ($data.data) {
            $data.data | ConvertTo-Json -Depth 5 | Write-Host
        }
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# ============================================================================
# TEST 2: Create Test Order
# ============================================================================
Write-Host "`n2️⃣  TESTING ORDER CREATION" -ForegroundColor Cyan
Write-Host "   POST /api_v3/order/add.json" -ForegroundColor Gray

$orderPayload = @{
    access_token = $AccessToken
    secret_key   = $SecretKey
    logistics    = $Courier
    s_type       = "standard"
    order_type   = ""
    shipments    = @(
        @{
            waybill              = ""
            order                = $OrderNumber
            sub_order            = ""
            order_date           = (Get-Date -Format "dd-MM-yyyy")
            total_amount         = "500"
            name                 = "Test Customer"
            company_name         = ""
            add                  = "123 Test Street, Test City"
            add2                 = ""
            add3                 = ""
            pin                  = "363641"
            city                 = "Test City"
            state                = "Test State"
            country              = "India"
            phone                = "9876543210"
            alt_phone            = ""
            email                = "test@example.com"
            is_billing_same_as_shipping = "yes"
            products             = @(
                @{
                    product_name       = "Test Product"
                    product_sku        = "TEST-SKU-001"
                    product_quantity   = "1"
                    product_price      = "500"
                    product_tax_rate   = "0"
                    product_hsn_code   = ""
                    product_discount   = "0"
                    product_img_url    = ""
                }
            )
            shipment_length      = "14"
            shipment_width       = "3"
            shipment_height      = "10"
            weight               = "0.50"
            shipping_charges     = "0"
            giftwrap_charges     = "0"
            transaction_charges  = "0"
            total_discount       = "0"
            first_attemp_discount = "0"
            cod_amount           = "500"
            payment_mode         = "COD"
            reseller_name        = ""
            eway_bill_number     = ""
            gst_number           = ""
            what3words           = ""
            pickup_address_id    = $PickupAddressId
            return_address_id    = $PickupAddressId
        }
    )
}

try {
    Write-Host "   Sending order: $OrderNumber"
    $response = Invoke-WebRequest `
        -Uri "$BaseURL/api_v3/order/add.json" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body (ConvertTo-Json $orderPayload -Depth 10) `
        -ErrorAction Stop

    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Response received" -ForegroundColor Green
    Write-Host "   Status: $($data.status)" -ForegroundColor Gray

    # Extract waybill
    $waybill = $null
    $orderResult = $null

    if ($data.data -and $data.data."1") {
        $orderResult = $data.data."1"
        $waybill = $orderResult.waybill -or $orderResult.awb_number -or $orderResult.AWB
    }

    if ($orderResult) {
        Write-Host "   Order Result:" -ForegroundColor Gray
        Write-Host "     Status: $($orderResult.status)" -ForegroundColor Gray
        Write-Host "     Waybill: $waybill" -ForegroundColor Gray
        Write-Host "     Courier: $($orderResult.courier_name)" -ForegroundColor Gray
        Write-Host "     Message: $($orderResult.message -or $orderResult.remark)" -ForegroundColor Gray

        if ($waybill) {
            Write-Host "   ✅ WAYBILL GENERATED: $waybill" -ForegroundColor Green
        } else {
            Write-Host "   ❌ NO WAYBILL GENERATED" -ForegroundColor Red
        }
    }

    Write-Host "   Full Response:" -ForegroundColor Gray
    $data | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Gray
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

# ============================================================================
# TEST 3: Generate Manifest (if waybill exists)
# ============================================================================
if ($waybill) {
    Write-Host "`n3️⃣  TESTING MANIFEST GENERATION" -ForegroundColor Cyan
    Write-Host "   POST /api_v3/manifest/create.json" -ForegroundColor Gray

    $manifestPayload = @{
        access_token = $AccessToken
        secret_key   = $SecretKey
        waybills     = @($waybill)
    }

    try {
        Write-Host "   Generating manifest for waybill: $waybill"
        $response = Invoke-WebRequest `
            -Uri "$BaseURL/api_v3/manifest/create.json" `
            -Method POST `
            -Headers @{"Content-Type" = "application/json"} `
            -Body (ConvertTo-Json $manifestPayload -Depth 10) `
            -ErrorAction Stop

        $data = $response.Content | ConvertFrom-Json
        Write-Host "✅ Response received" -ForegroundColor Green

        $pdfUrl = $data.data.pdf_url -or $data.data.pdfurl -or $data.data.url

        if ($pdfUrl) {
            Write-Host "   ✅ MANIFEST PDF GENERATED!" -ForegroundColor Green
            Write-Host "   PDF URL: $pdfUrl" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  No PDF URL in response" -ForegroundColor Yellow
        }

        Write-Host "   Full Response:" -ForegroundColor Gray
        $data | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Gray
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
} else {
    Write-Host "`n3️⃣  SKIPPING MANIFEST GENERATION (no waybill from order creation)" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TESTING COMPLETE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
