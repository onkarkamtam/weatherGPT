/**
 * Test script to verify Pune IMD warnings are fetched correctly
 * Tests the district extraction and API call flow
 */

const IMD_API_BASE = 'http://localhost:3001/api/imd'

async function testPuneWarnings() {
  console.log('\n🧪 Testing Pune IMD Warnings\n')
  console.log('=' .repeat(60))
  
  try {
    // Test 1: Call with district parameter (NEW BEHAVIOR)
    console.log('\n📍 Test 1: Fetching warnings with district="Pune", state="Maharashtra"')
    const params = new URLSearchParams({
      lat: '18.5204',
      lon: '73.8567',
      district: 'Pune',
      state: 'Maharashtra'
    })
    
    const url = `${IMD_API_BASE}/warnings?${params.toString()}`
    console.log(`   URL: ${url}`)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.log(`   ❌ FAIL: HTTP ${response.status}`)
      console.log(`   Error: ${error.error || JSON.stringify(error)}`)
      return
    }
    
    const data = await response.json()
    
    console.log(`   ✅ SUCCESS: HTTP ${response.status}`)
    console.log(`   District returned: "${data.district}"`)
    console.log(`   Has active warnings: ${data.hasActiveWarnings}`)
    console.log(`   Number of warnings: ${data.warnings?.length || 0}`)
    
    if (data.warnings && data.warnings.length > 0) {
      console.log(`   Top warning: ${data.warnings[0].event} (${data.warnings[0].severity})`)
    }
    
    // Verify district match
    const requestedDistrict = 'Pune'.toUpperCase()
    const returnedDistrict = data.district.toUpperCase()
    
    if (requestedDistrict === returnedDistrict) {
      console.log(`   ✅ DISTRICT MATCH: Requested "${requestedDistrict}" = Returned "${returnedDistrict}"`)
    } else {
      console.log(`   ❌ DISTRICT MISMATCH: Requested "${requestedDistrict}" ≠ Returned "${returnedDistrict}"`)
      console.log(`   THIS IS THE BUG WE FIXED!`)
    }
    
    // Test 2: Call without district (OLD BEHAVIOR - should fail now)
    console.log('\n📍 Test 2: Fetching warnings WITHOUT district parameter (should fail safely)')
    const params2 = new URLSearchParams({
      lat: '18.5204',
      lon: '73.8567'
    })
    
    const url2 = `${IMD_API_BASE}/warnings?${params2.toString()}`
    console.log(`   URL: ${url2}`)
    
    const response2 = await fetch(url2)
    
    if (!response2.ok) {
      const error2 = await response2.json().catch(() => ({ error: 'Unknown error' }))
      console.log(`   ✅ EXPECTED FAILURE: HTTP ${response2.status}`)
      console.log(`   Error: ${error2.error}`)
      console.log(`   This is correct - provider now fails safely without district ID`)
    } else {
      const data2 = await response2.json()
      console.log(`   ⚠️  UNEXPECTED SUCCESS: Got data for "${data2.district}"`)
      console.log(`   This might be sample data or the provider accepted undefined district`)
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Test complete\n')
    
  } catch (error) {
    console.error('\n❌ Test failed with exception:')
    console.error(error)
  }
}

// Run test
testPuneWarnings()
