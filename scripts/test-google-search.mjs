/**
 * Test Google Search grounding with @google/genai 2.19.0
 */

import { GoogleGenAI } from '@google/genai'
import 'dotenv/config'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
  console.error('❌ GEMINI_API_KEY not configured')
  process.exit(1)
}

console.log('========== TESTING GOOGLE SEARCH GROUNDING ==========\n')
console.log('API Key:', GEMINI_API_KEY.substring(0, 15) + '...')
console.log('SDK Version: @google/genai 2.19.0\n')

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

async function testGoogleSearch() {
  const query = 'Find the latest official IMD weather warning for Pune, India. Use official IMD sources like mausam.imd.gov.in'
  
  console.log('[TEST] Query:', query)
  console.log('[TEST] Model: gemini-2.5-flash')
  console.log('[TEST] Google Search: ENABLED\n')

  try {
    // Attempt 1: tools outside config
    console.log('[ATTEMPT 1] tools: [{ type: "google_search" }] (outside config)\n')
    
    const response1 = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: query }] }],
      config: {
        systemInstruction: 'You are a helpful assistant. Search for and provide current information from official sources.',
        maxOutputTokens: 300,
        temperature: 0.3,
      },
      tools: [{ type: 'google_search' }]
    })

    console.log('[RESULT] Success!')
    console.log('[RESULT] Response:', response1.text?.substring(0, 200) + '...')
    console.log('[RESULT] Usage:', response1.usageMetadata)
    
    // Check for grounding metadata
    if (response1.candidates?.[0]?.groundingMetadata) {
      console.log('[RESULT] ✅ Grounding metadata present')
      console.log('[RESULT] Search queries:', response1.candidates[0].groundingMetadata.searchQueries)
    } else {
      console.log('[RESULT] ⚠️ No grounding metadata found')
    }
    
    console.log('\n✅ TEST PASSED - Syntax works!')
    return true
    
  } catch (error1) {
    console.log('[ATTEMPT 1] ❌ Failed:', error1.message)
    
    try {
      // Attempt 2: googleSearch inside config.tools
      console.log('\n[ATTEMPT 2] config: { tools: [{ googleSearch: {} }] } (inside config)\n')
      
      const response2 = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: query }] }],
        config: {
          systemInstruction: 'You are a helpful assistant. Search for and provide current information from official sources.',
          maxOutputTokens: 300,
          temperature: 0.3,
          tools: [{ googleSearch: {} }]
        },
      })

      console.log('[RESULT] Success!')
      console.log('[RESULT] Response:', response2.text?.substring(0, 200) + '...')
      console.log('\n✅ TEST PASSED - Alternative syntax works!')
      return true
      
    } catch (error2) {
      console.log('[ATTEMPT 2] ❌ Failed:', error2.message)
      
      console.log('\n❌ BOTH ATTEMPTS FAILED')
      console.log('Error details:')
      console.log('  Attempt 1:', error1.message)
      console.log('  Attempt 2:', error2.message)
      
      console.log('\n⚠️ Google Search may not be available for this API key/region')
      console.log('OR the syntax has changed in version 2.19.0')
      
      return false
    }
  }
}

testGoogleSearch().catch(error => {
  console.error('\n❌ UNEXPECTED ERROR:', error)
  process.exit(1)
})
