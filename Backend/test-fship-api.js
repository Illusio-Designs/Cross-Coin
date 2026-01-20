const axios = require('axios');
require('dotenv').config();

// FShip API Test Script
class FShipAPITester {
    constructor() {
        this.apiKey = process.env.FSHIP_API_KEY;
        this.environment = process.env.FSHIP_ENVIRONMENT || 'production';
        this.baseURL = this.environment === 'production' 
            ? process.env.FSHIP_PRODUCTION_URL 
            : process.env.FSHIP_STAGING_URL;
        
        console.log('=== FShip API Test Configuration ===');
        console.log('Environment:', this.environment);
        console.log('Base URL:', this.baseURL);
        console.log('API Key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'NOT SET');
        console.log('=====================================\n');
    }

    async testAPIKey() {
        console.log('🔑 Testing API Key Authentication...');
        
        if (!this.apiKey) {
            console.error('❌ FSHIP_API_KEY is not set in environment variables');
            return false;
        }

        // Test different authentication methods
        const authMethods = [
            { name: 'signature header', headers: { 'Content-Type': 'application/json', 'signature': this.apiKey } },
            { name: 'Authorization Bearer', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` } },
            { name: 'Authorization Basic', headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}` } },
            { name: 'X-API-Key header', headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey } },
            { name: 'api-key header', headers: { 'Content-Type': 'application/json', 'api-key': this.apiKey } }
        ];

        for (const method of authMethods) {
            try {
                console.log(`\n🔍 Trying authentication method: ${method.name}`);
                console.log('Headers:', JSON.stringify(method.headers, null, 2));
                
                const response = await axios.get(`${this.baseURL}/api/getallcourier`, {
                    headers: method.headers,
                    timeout: 10000
                });

                console.log(`✅ API Key Authentication (${method.name}): SUCCESS`);
                console.log('Response Status:', response.status);
                console.log('Available Couriers:', response.data.length);
                console.log('Sample Couriers:', response.data.slice(0, 3).map(c => c.courierName || c.name || c));
                return true;

            } catch (error) {
                console.log(`❌ Authentication method "${method.name}": FAILED`);
                
                if (error.response) {
                    console.log(`   Status: ${error.response.status} - ${error.response.statusText}`);
                    if (error.response.data) {
                        console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
                    }
                } else {
                    console.log(`   Error: ${error.message}`);
                }
            }
        }

        console.error('\n🚨 ALL AUTHENTICATION METHODS FAILED');
        console.error('This indicates either:');
        console.error('1. The API key is invalid or expired');
        console.error('2. The API endpoint URL is incorrect');
        console.error('3. The FShip API requires different authentication');
        console.error('4. Your IP address is not whitelisted');
        
        return false;
    }

    async testFShipEndpoints() {
        console.log('\n🔍 Testing FShip API Endpoints...');
        
        const endpoints = [
            { path: '/api/getallcourier', method: 'GET', name: 'Get All Couriers' },
            { path: '/api/pincodeserviceability', method: 'POST', name: 'Pincode Serviceability', 
              data: { source_Pincode: '110001', destination_Pincode: '400001' } },
            { path: '/api/ratecalculator', method: 'POST', name: 'Rate Calculator',
              data: { 
                source_Pincode: '110001', 
                destination_Pincode: '400001',
                payment_Mode: 'P',
                amount: 1000,
                express_Type: 'surface',
                shipment_Weight: 1,
                shipment_Length: 10,
                shipment_Width: 10,
                shipment_Height: 10,
                volumetric_Weight: 0.02
              } 
            }
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`Testing: ${endpoint.name} (${endpoint.method} ${endpoint.path})`);
                
                let response;
                if (endpoint.method === 'GET') {
                    response = await axios.get(`${this.baseURL}${endpoint.path}`, {
                        headers: {
                            'Content-Type': 'application/json',
                            'signature': this.apiKey
                        },
                        timeout: 10000
                    });
                } else {
                    response = await axios.post(`${this.baseURL}${endpoint.path}`, endpoint.data, {
                        headers: {
                            'Content-Type': 'application/json',
                            'signature': this.apiKey
                        },
                        timeout: 10000
                    });
                }

                console.log(`✅ ${endpoint.name}: SUCCESS (${response.status})`);
                
                // Show sample response data
                if (response.data) {
                    if (Array.isArray(response.data)) {
                        console.log(`   Response: Array with ${response.data.length} items`);
                        if (response.data.length > 0) {
                            console.log(`   Sample:`, JSON.stringify(response.data[0], null, 2));
                        }
                    } else {
                        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
                    }
                }
                
            } catch (error) {
                if (error.response) {
                    console.log(`❌ ${endpoint.name}: ${error.response.status} - ${error.response.statusText}`);
                    if (error.response.data) {
                        console.log(`   Error Data:`, JSON.stringify(error.response.data, null, 2));
                    }
                } else {
                    console.log(`❌ ${endpoint.name}: Network/Request Error - ${error.message}`);
                }
            }
        }
    }

    async testConnectivity() {
        console.log('\n🌐 Testing Basic Connectivity...');
        
        try {
            // Test base URL
            const response = await axios.get(this.baseURL, {
                timeout: 10000,
                validateStatus: () => true // Accept any status code
            });

            console.log('✅ Server Connectivity: SUCCESS');
            console.log('Status:', response.status);
            console.log('Server:', response.headers.server || 'Unknown');
            
            // Test specific API endpoint without authentication
            try {
                const apiResponse = await axios.get(`${this.baseURL}/api/getallcourier`, {
                    timeout: 10000,
                    validateStatus: () => true
                });
                
                console.log('\n📡 API Endpoint Test:');
                console.log('Endpoint Status:', apiResponse.status);
                console.log('Content-Type:', apiResponse.headers['content-type'] || 'Unknown');
                
                if (apiResponse.status === 401) {
                    console.log('✅ Endpoint exists but requires authentication (expected)');
                } else if (apiResponse.status === 404) {
                    console.log('❌ API endpoint not found - URL may be incorrect');
                } else {
                    console.log('Response Headers:', JSON.stringify(apiResponse.headers, null, 2));
                    if (apiResponse.data) {
                        console.log('Response Data:', JSON.stringify(apiResponse.data, null, 2));
                    }
                }
                
            } catch (apiError) {
                console.log('❌ API Endpoint Test Failed:', apiError.message);
            }
            
        } catch (error) {
            console.error('❌ Server Connectivity: FAILED');
            console.error('Error:', error.message);
            
            if (error.code === 'ENOTFOUND') {
                console.error('🚨 DNS Resolution Failed: Check if the FShip URL is correct');
            } else if (error.code === 'ECONNREFUSED') {
                console.error('🚨 Connection Refused: FShip server may be down');
            } else if (error.code === 'ETIMEDOUT') {
                console.error('🚨 Connection Timeout: Network or firewall issues');
            }
        }
    }

    async runAllTests() {
        console.log('🚀 Starting FShip API Tests...\n');
        
        // Test basic connectivity first
        await this.testConnectivity();
        
        // Test API key authentication
        const authSuccess = await this.testAPIKey();
        
        if (authSuccess) {
            // If auth succeeds, test other endpoints
            await this.testFShipEndpoints();
        }
        
        console.log('\n📋 Test Summary:');
        console.log('- Check the results above for specific error details');
        console.log('- If authentication succeeds, your API key is working correctly');
        console.log('- If specific endpoints fail, check the request format');
        console.log('- Contact FShip support if authentication issues persist');
        
        if (authSuccess) {
            console.log('\n✅ RESULT: Your FShip API key is WORKING correctly!');
            console.log('The API key can successfully authenticate with FShip production servers.');
        } else {
            console.log('\n❌ RESULT: Your FShip API key has ISSUES!');
            console.log('Please check the API key or contact FShip support.');
        }
    }
}

// Run the tests
const tester = new FShipAPITester();
tester.runAllTests().catch(console.error);