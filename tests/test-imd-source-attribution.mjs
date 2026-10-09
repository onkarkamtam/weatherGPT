/**
 * Regression Tests for IMD Source Attribution
 * 
 * Verifies that technical terms like "CAP feed" are not exposed to users
 * and that proper user-friendly attributions are provided.
 * 
 * Tests:
 * 1. Backend API error messages
 * 2. System prompts for Gemini (no "CAP feed" in instructions)
 * 3. User-facing attribution (should be "India Meteorological Department (IMD)")
 * 4. Official website link presence (https://mausam.imd.gov.in/)
 * 5. No technical jargon in fallback messages
 */

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const RESULTS = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: { total: 0, passed: 0, failed: 0 }
}

function test(name, condition, details) {
  const passed = condition
  RESULTS.tests.push({
    name,
    passed,
    details,
    timestamp: new Date().toISOString()
  })
  RESULTS.summary.total++
  if (passed) {
    RESULTS.summary.passed++
    console.log(`✅ PASS: ${name}`)
  } else {
    RESULTS.summary.failed++
    console.log(`❌ FAIL: ${name}`)
  }
  if (details) console.log(`   ${details}`)
}

console.log('═══════════════════════════════════════════════════════════')
console.log('IMD SOURCE ATTRIBUTION REGRESSION TESTS')
console.log('═══════════════════════════════════════════════════════════\n')

// ============================================================================
// TEST 1: Backend API Error Message
// ============================================================================
console.log('TEST 1: Backend API Error Message\n')

const serverCode = readFileSync(
  join(__dirname, '../server/index.js'),
  'utf-8'
)

const hasOldErrorMessage = serverCode.includes('IMD CAP feed is currently unavailable')
const hasNewErrorMessage = serverCode.includes('IMD weather warning service is currently unavailable')

test(
  'Backend error message user-friendly',
  !hasOldErrorMessage && hasNewErrorMessage,
  hasOldErrorMessage 
    ? 'Found technical "IMD CAP feed" in error message' 
    : 'Error message is user-friendly'
)

// ============================================================================
// TEST 2: System Prompts - No "CAP feed" Exposure
// ============================================================================
console.log('\nTEST 2: System Prompts - No Technical Terms\n')

const chatScreenCode = readFileSync(
  join(__dirname, '../src/screens/ChatScreen.jsx'),
  'utf-8'
)

// Check for "CAP feed" in user-facing instructions that would expose the term
// (Not counting instructions that say "Do NOT mention CAP feed")
const capFeedExposure = chatScreenCode.match(
  /Clearly state:.*CAP feed[^}]*[^NOT]/
) || (chatScreenCode.match(/Source:.*CAP feed/) && !chatScreenCode.match(/Do NOT mention.*CAP feed/))

test(
  'No "CAP feed" exposure in instructions',
  !capFeedExposure,
  capFeedExposure 
    ? 'Found instruction that would expose "CAP feed" to users' 
    : 'System prompts properly instruct AI to avoid technical jargon'
)

// Check for "CAP feed" in source attribution instructions
const capFeedInSourceInstruction = chatScreenCode.match(
  /Source:.*CAP feed/
) || chatScreenCode.match(
  /End with:.*CAP feed/
)

test(
  'No "CAP feed" in source attribution instruction',
  !capFeedInSourceInstruction,
  capFeedInSourceInstruction 
    ? 'Found "CAP feed" in source attribution instruction' 
    : 'Source attribution instruction is user-friendly'
)

// ============================================================================
// TEST 3: User-Friendly Attribution Present
// ============================================================================
console.log('\nTEST 3: User-Friendly Attribution\n')

const hasIMDAttribution = chatScreenCode.includes(
  'Source: India Meteorological Department (IMD)'
)

test(
  'User-friendly IMD attribution present',
  hasIMDAttribution,
  hasIMDAttribution 
    ? 'Found proper "Source: India Meteorological Department (IMD)"' 
    : 'Missing user-friendly attribution'
)

// ============================================================================
// TEST 4: Official Website Link
// ============================================================================
console.log('\nTEST 4: Official Website Link\n')

const hasOfficialWebsite = chatScreenCode.includes('https://mausam.imd.gov.in/')

test(
  'Official IMD website link present',
  hasOfficialWebsite,
  hasOfficialWebsite 
    ? 'Found https://mausam.imd.gov.in/ in attribution' 
    : 'Missing official website link'
)

// ============================================================================
// TEST 5: "No Warning Available" Message Quality
// ============================================================================
console.log('\nTEST 5: "No Warning" Message Quality\n')

// Old problematic text: "No active IMD warning...is currently visible in the available CAP feed"
const hasOldNoWarningText = chatScreenCode.includes(
  'currently visible in the available CAP feed'
)

// New better text: "currently available in the warning data we could retrieve"
const hasNewNoWarningText = chatScreenCode.includes(
  'currently available in the warning data we could retrieve'
)

test(
  'No technical terms in "no warning" message',
  !hasOldNoWarningText,
  hasOldNoWarningText 
    ? 'Still using "CAP feed" in no-warning message' 
    : 'No-warning message is user-friendly'
)

test(
  'Appropriate uncertainty language',
  hasNewNoWarningText,
  hasNewNoWarningText 
    ? 'Uses "warning data we could retrieve" (appropriate uncertainty)' 
    : 'Missing appropriate uncertainty language'
)

// ============================================================================
// TEST 6: Technical Terms in Comments Only (Not User-Facing)
// ============================================================================
console.log('\nTEST 6: Technical Terms Isolated to Comments\n')

// CAP should only appear in comments (starting with //) or console.log, or as part of function names
// OR in instructions that explicitly say "Do NOT mention CAP feed" (which is good!)
const capInCode = chatScreenCode.split('\n').filter(line => {
  const trimmed = line.trim()
  // Skip comments and console.log lines
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || 
      trimmed.includes('console.log') || trimmed.includes('console.error') ||
      trimmed.includes('console.warn')) {
    return false
  }
  // Skip function names and imports
  if (line.includes('fetchIMDCAPWarnings') || line.includes('formatCAPAlertForAI') ||
      line.includes('import')) {
    return false
  }
  // Skip lines that say "Do NOT mention CAP feed" (these are instructions to AVOID the term)
  if (/Do NOT mention.*CAP feed|Do NOT apologize.*CAP feed/.test(line)) {
    return false
  }
  // Check if line contains "CAP feed" in a way that would expose it to users
  return /['"`].*CAP feed.*['"`]/.test(line) && !/Do NOT/.test(line)
})

test(
  'No user-facing "CAP feed" exposure',
  capInCode.length === 0,
  capInCode.length === 0 
    ? 'CAP references properly isolated (only in instructions to AVOID the term)' 
    : `Found ${capInCode.length} problematic CAP references: ${capInCode.slice(0, 2).join('; ')}`
)

// ============================================================================
// TEST 7: Fallback Message Quality
// ============================================================================
console.log('\nTEST 7: Fallback Message Quality\n')

// Check ultimate fallback messages
const hasFallbackWithMausam = chatScreenCode.includes(
  'mausam.imd.gov.in'
) && chatScreenCode.includes(
  'No active IMD weather advisory'
)

test(
  'Fallback includes official website',
  hasFallbackWithMausam,
  hasFallbackWithMausam 
    ? 'Fallback message includes mausam.imd.gov.in reference' 
    : 'Fallback missing official website reference'
)

// ============================================================================
// TEST 8: Geographic Scope Preservation
// ============================================================================
console.log('\nTEST 8: Geographic Scope Language\n')

// Should NOT say "no warnings everywhere"
const hasGlobalNoWarning = chatScreenCode.includes(
  'no warnings' // without qualification
) && !chatScreenCode.includes('Do NOT say there are definitely no warnings')

test(
  'No unqualified "no warnings" claims',
  !hasGlobalNoWarning,
  !hasGlobalNoWarning 
    ? 'All "no warning" statements are properly qualified' 
    : 'Found unqualified "no warnings" claim'
)

// Should preserve location-specific scope
const hasLocationScope = chatScreenCode.includes(
  'No active IMD warning for ${location.label}'
) || chatScreenCode.includes(
  'No active IMD weather advisory for ${location.label}'
)

test(
  'Warning scope is location-specific',
  hasLocationScope,
  hasLocationScope 
    ? 'Warning messages are properly scoped to requested location' 
    : 'Missing location-specific scope'
)

// ============================================================================
// TEST 9: No Fabrication Warning Present
// ============================================================================
console.log('\nTEST 9: No Fabrication Safeguards\n')

const hasNoFabricationWarning = chatScreenCode.includes(
  'Do NOT invent alert details'
) || chatScreenCode.includes(
  'NEVER fabricate'
)

test(
  'No-fabrication instruction present',
  hasNoFabricationWarning,
  hasNoFabricationWarning 
    ? 'AI instructed not to fabricate warning details' 
    : 'Missing no-fabrication instruction'
)

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n═══════════════════════════════════════════════════════════')
console.log('TEST SUMMARY')
console.log('═══════════════════════════════════════════════════════════\n')

console.log(`Total Tests: ${RESULTS.summary.total}`)
console.log(`✅ Passed: ${RESULTS.summary.passed}`)
console.log(`❌ Failed: ${RESULTS.summary.failed}`)

const passRate = (RESULTS.summary.passed / RESULTS.summary.total * 100).toFixed(1)
console.log(`\nPass Rate: ${passRate}%`)

// Write results
import { writeFileSync } from 'fs'
writeFileSync(
  join(__dirname, 'results/imd-source-attribution-tests.json'),
  JSON.stringify(RESULTS, null, 2)
)

console.log('\nResults written to: tests/results/imd-source-attribution-tests.json')

// Exit with appropriate code
if (RESULTS.summary.failed > 0) {
  console.log('\n❌ TESTS FAILED')
  process.exit(1)
} else {
  console.log('\n✅ ALL TESTS PASSED')
  process.exit(0)
}
