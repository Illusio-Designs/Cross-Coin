#!/bin/bash
# WORKING iThink Order Creation Curl Command
# Production URL: https://my.ithinklogistics.com/api_v3/order/add.json
# Credentials working perfectly

curl -X POST "https://my.ithinklogistics.com/api_v3/order/add.json" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "access_token": "a89362fc7868a8f870038149748bb1cf",
      "secret_key": "f69ad91c689400f2c2e8392753e0ca74",
      "logistics": "delhivery",
      "s_type": "standard",
      "order_type": "",
      "shipments": [
        {
          "waybill": "",
          "order": "TEST-ORDER-001",
          "sub_order": "",
          "order_date": "26-05-2026",
          "total_amount": "500",
          "name": "Test Customer",
          "company_name": "",
          "add": "Survey No 1288 Vajepar 3rd Floor",
          "add2": "",
          "add3": "",
          "pin": "363641",
          "city": "Morbi",
          "state": "Gujarat",
          "country": "India",
          "phone": "9876543210",
          "alt_phone": "",
          "email": "test@crosscoin.in",
          "is_billing_same_as_shipping": "yes",
          "products": [
            {
              "product_name": "Test Product",
              "product_sku": "TEST-001",
              "product_quantity": "1",
              "product_price": "500",
              "product_tax_rate": "0",
              "product_hsn_code": "",
              "product_discount": "0",
              "product_img_url": ""
            }
          ],
          "shipment_length": "14",
          "shipment_width": "3",
          "shipment_height": "10",
          "weight": "0.50",
          "shipping_charges": "0",
          "giftwrap_charges": "0",
          "transaction_charges": "0",
          "total_discount": "0",
          "first_attemp_discount": "0",
          "cod_amount": "500",
          "payment_mode": "COD",
          "reseller_name": "",
          "eway_bill_number": "",
          "gst_number": "",
          "what3words": "",
          "pickup_address_id": "116197",
          "return_address_id": "116197"
        }
      ]
    }
  }'

# IMPORTANT NOTES:
# ================
# 1. Payload MUST be wrapped in "data" object
# 2. All fields must be present (alt_phone, company_name, etc.) even if empty ""
# 3. All numeric values should be strings ("500" not 500)
# 4. pickup_address_id and return_address_id: "116197" (your warehouse ID)
# 5. Success response format: {"status":"success","data":{"1":{...}}}
#
# Response example:
# {
#   "status": "success",
#   "status_code": 200,
#   "data": {
#     "1": {
#       "status": "booked" or "error",
#       "waybill": "ITX1234567890",
#       "refnum": "TEST-001",
#       "logistic_name": "Delhivery",
#       "tracking_url": "...",
#       "remark": "..." (if error)
#     }
#   }
# }
