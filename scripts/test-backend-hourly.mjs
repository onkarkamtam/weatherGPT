/**
 * Test: Backend /api/chat with hourly period data
 * Tests the complete frontend→backend flow
 */

import http from 'http';
import https from 'https';

const SERVER_URL = 'http://localhost:3001';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SERVER_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    
    const data = JSON.stringify(body);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 15000
    };

    const req = protocol.request(options, (res) => {
      let responseData = '';
      
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: json });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testHourlyBackend() {
  console.log('='.repeat(60));
  console.log('TEST: Backend /api/chat with hourly period data');
  console.log('='.repeat(60));

  // Simulate frontend hourly period data
  const periodContext = `
VERIFIED HOURLY FORECAST DATA FOR TOMORROW MORNING IN MUMBAI:

Temperature: 25°C - 28°C (avg 27°C)
Condition: Partly cloudy
Precipitation probability: 83%
Humidity: 75%
Wind speed: 15 km/h
Period: Tomorrow Morning

IMPORTANT: This is tomorrow morning forecast data, NOT current weather. The user specifically asked about "tomorrow morning". Reference this exact period in your response.
`.trim();

  const requestBody = {
    userMessage: "What about tomorrow morning?",
    history: [{
      role: 'user',
      parts: [{ text: 'What will the weather be in Mumbai tomorrow?' }]
    }, {
      role: 'model',
      parts: [{ text: 'Tomorrow in Mumbai will be partly cloudy with temperatures around 26-29°C. Rain is possible with 80% probability.' }]
    }],
    systemPrompt: `You are WeatherGPT, a helpful Indian weather assistant.

${periodContext}

USE ONLY THESE EXACT VALUES in your response.`,
    conversationId: null,
    enableGoogleSearch: false
  };

  console.log('\n[REQUEST]');
  console.log(`  userMessage: ${requestBody.userMessage}`);
  console.log(`  history length: ${requestBody.history.length} turns`);
  console.log(`  systemPrompt length: ${requestBody.systemPrompt.length} chars`);
  console.log(`  grounded marker: ${requestBody.systemPrompt.includes('VERIFIED HOURLY FORECAST DATA')}`);
  console.log(`  enableGoogleSearch: ${requestBody.enableGoogleSearch}`);

  try {
    const response = await post('/api/chat', requestBody);
    
    console.log('\n[RESPONSE]');
    console.log(`  status: ${response.status}`);
    console.log(`  success: ${response.status === 200}`);
    
    if (response.status === 200) {
      console.log(`  text length: ${response.data.text?.length || 0} chars`);
      console.log(`  conversationId: ${response.data.conversationId || 'null'}`);
      console.log(`  text preview: ${response.data.text?.substring(0, 100)}...`);
      console.log('\n✅ SUCCESS: Backend accepted hourly grounded request');
    } else {
      console.log(`  error: ${response.data.error || 'Unknown error'}`);
      console.log('\n❌ FAIL: Backend returned error');
    }
  } catch (error) {
    console.log('\n❌ FAIL: Request failed');
    console.log(`  error: ${error.message}`);
    console.error(error);
  }
}

// Run test
testHourlyBackend().catch(error => {
  console.error('❌ TEST ERROR:', error.message);
  console.error(error.stack);
});
