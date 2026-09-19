/**
 * Test script to discover IMD API response structure
 * Tests calling districtwarning without ID parameter
 */

// Load environment variables first
import 'dotenv/config'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '..', 'server', '.env')

config({ path: envPath })

import { IMDProvider } from '../server/providers/IMDProvider.js'

async function testIMDStructure() {
  console.log('\n🔍 Testing IMD API Response Structure\n')
  console.log('=' .repeat(70))
  
  const provider = new IMDProvider()
  
  // Test 1: Call districtwarning without ID to see all districts
  console.log('\n📡 Test 1: Calling /districtwarning WITHOUT id parameter')
  console.log('   Purpose: Discover if API returns multiple districts\n')
  
  try {
    // Temporarily modify provider to allow no-ID call for testing
    const IMD_API_BASE = 'https://api.imd.gov.in/api/v1'
    const url = `${IMD_API_BASE}/districtwarning`
    
    console.log(`   URL: ${url}`)
    console.log('   Authenticating...')
    
    const response = await provider._authenticatedFetch(url)
    
    if (!response.ok) {
      console.log(`   ❌ HTTP ${response.status}`)
      const text = await response.text()
      console.log(`   Response: ${text.substring(0, 200)}`)
      return
    }
    
    const data = await response.json()
    
    console.log(`   ✅ HTTP ${response.status}`)
    console.log(`   Response is array: ${Array.isArray(data)}`)
    
    if (Array.isArray(data)) {
      console.log(`   Number of records: ${data.length}`)
      
      if (data.length > 0) {
        console.log('\n   📋 First 5 district records:')
        data.slice(0, 5).forEach((record, i) => {
          console.log(`      ${i + 1}. District: "${record.District || record.district || 'N/A'}"`)
          console.log(`         Fields: ${Object.keys(record).join(', ')}`)
        })
        
        // Search for specific districts
        console.log('\n   🔍 Searching for known districts:')
        const searchDistricts = ['PUNE', 'MUMBAI', 'NEW DELHI', 'BANGALORE', 'CHENNAI']
        
        searchDistricts.forEach(districtName => {
          const found = data.find(r => 
            (r.District || r.district || '').toUpperCase() === districtName
          )
          if (found) {
            console.log(`      ✅ Found "${districtName}"`)
          } else {
            console.log(`      ❌ Not found "${districtName}"`)
          }
        })
        
        // Check if PUNE exists with different spelling
        console.log('\n   🔍 Searching for PUNE variations:')
        const puneVariations = data.filter(r => 
          (r.District || r.district || '').toUpperCase().includes('PUN')
        )
        if (puneVariations.length > 0) {
          puneVariations.forEach(v => {
            console.log(`      Found: "${v.District || v.district}"`)
          })
        } else {
          console.log('      No PUNE variations found')
        }
      }
    } else {
      console.log('   Response is single object')
      console.log(`   District: ${data.District || data.district || 'N/A'}`)
      console.log(`   Fields: ${Object.keys(data).join(', ')}`)
    }
    
  } catch (error) {
    console.error(`\n   ❌ Error: ${error.message}`)
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('✅ Test complete\n')
}

// Run test
testIMDStructure().catch(console.error)
