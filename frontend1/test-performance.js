// Simple performance test
const http = require('http');
const { performance } = require('perf_hooks');

const testUrl = 'http://localhost:3000';
const testRuns = 5;

async function testPerformance() {
  console.log('🚀 Testing site performance...\n');
  
  const results = [];
  
  for (let i = 0; i < testRuns; i++) {
    const start = performance.now();
    
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(testUrl, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const end = performance.now();
            const loadTime = end - start;
            results.push(loadTime);
            console.log(`Test ${i + 1}: ${loadTime.toFixed(2)}ms`);
            resolve();
          });
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => reject(new Error('Timeout')));
      });
    } catch (error) {
      console.log(`Test ${i + 1}: Failed - ${error.message}`);
    }
  }
  
  if (results.length > 0) {
    const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
    const minTime = Math.min(...results);
    const maxTime = Math.max(...results);
    
    console.log('\n📊 Performance Results:');
    console.log(`Average load time: ${avgTime.toFixed(2)}ms`);
    console.log(`Fastest load time: ${minTime.toFixed(2)}ms`);
    console.log(`Slowest load time: ${maxTime.toFixed(2)}ms`);
    
    if (avgTime < 2000) {
      console.log('✅ EXCELLENT! Site loads in under 2 seconds');
    } else if (avgTime < 5000) {
      console.log('✅ GOOD! Site loads in under 5 seconds');
    } else {
      console.log('⚠️  Site needs more optimization');
    }
  } else {
    console.log('❌ All tests failed. Make sure the server is running.');
  }
}

testPerformance();
