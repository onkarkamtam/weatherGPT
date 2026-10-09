#!/usr/bin/env node
/**
 * Batch 2 Automated Executor - Full India Coverage
 * 
 * Tests all 135 cities across 28 states + 8 UTs
 * Executes 1,755 test scenarios with resumable progress
 * 
 * Features:
 * - Bounded concurrency (5 simultaneous tests)
 * - Rate-limit awareness (500ms delay between batches)
 * - Resumable execution (saves after every 10 tests)
 * - Progress tracking
 * - Detailed result logging
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Configuration
const RESULTS_DIR = path.join(__dirname, 'results')
const LOCATIONS_PATH = path.join(__dirname, 'india-locations.json')
const TEST_MATRIX_PATH = path.join(RESULTS_DIR, 'test-matrix.json')
const BATCH2_RESULTS_PATH = path.join(RESULTS_DIR, 'batch2-results.json')

const CONCURRENCY = 5 // Run 5 tests in parallel
const BATCH_DELAY = 500 // 500ms delay between batches
const SAVE_INTERVAL = 10 // Save results every 10 tests

console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║     Batch 2: Full India Coverage Test Executor             ║')
console.log('╚════════════════════════════════════════════════════════════╝')

// Load test matrix (it's a flat array)
const allTests = JSON.parse(fs.readFileSync(TEST_MATRIX_PATH, 'utf-8'))

console.log(`Total tests in matrix: ${allTests.length}`)
console.log(`Concurrency: ${CONCURRENCY}`)
console.log(`Batch delay: ${BATCH_DELAY}ms`)
console.log('')

// Initialize or load existing results
let results = {
  batch: 2,
  timestamp: new Date().toISOString(),
  totalTests: allTests.length,
  completed: 0,
  passed: 0,
  failed: 0,
  partial: 0,
  blocked: 0,
  notRun: 0,
  tests: []
}

// Check for existing results (resumable)
if (fs.existsSync(BATCH2_RESULTS_PATH)) {
  const existing = JSON.parse(fs.readFileSync(BATCH2_RESULTS_PATH, 'utf-8'))
  console.log(`\n⚠️  Found existing results with ${existing.completed} completed tests`)
  console.log(`Resume from test ${existing.completed + 1}? (Ctrl+C to cancel, Enter to continue)`)
  
  // For automated execution, always resume
  results = existing
  console.log(`✓ Resuming from test ${results.completed + 1}\n`)
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Test intent detection locally (no API call needed)
 */
async function testIntentDetection(message, expectedCategory) {
  const startTime = Date.now()
  
  try {
    // Dynamic import to test intent detection
    const { isWeatherIntent, isHistoricalWeatherIntent, isNWPIntent, isIMDWarningIntent, needsIMDData } = 
      await import('../src/utils/weatherIntent.js')
    
    const isWeather = isWeatherIntent(message)
    const isHistorical = isHistoricalWeatherIntent(message)
    const isNWP = isNWPIntent(message)
    const isIMDWarning = isIMDWarningIntent(message)
    const needsIMD = needsIMDData(message)
    
    const responseTime = Date.now() - startTime
    
    // Determine detected intent
    let detectedIntent = 'none'
    if (isHistorical) detectedIntent = 'historical'
    else if (isNWP) detectedIntent = 'nwp'
    else if (needsIMD || isIMDWarning) detectedIntent = 'imd'
    else if (isWeather) detectedIntent = 'weather'
    
    return {
      success: true,
      detectedIntent,
      expectedIntent: expectedCategory,
      matches: detectedIntent === expectedCategory || 
               (expectedCategory === 'weather' && isWeather) ||
               (expectedCategory === 'forecast' && isWeather) ||
               (expectedCategory === 'recommendation' && isWeather) ||
               (expectedCategory === 'agriculture' && isWeather) ||
               (expectedCategory === 'multilingual' && isWeather),
      responseTime,
      details: { isWeather, isHistorical, isNWP, needsIMD, isIMDWarning }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      success: false,
      error: error.message,
      responseTime
    }
  }
}

/**
 * Test geocoding via Open-Meteo geocoding API
 */
async function testGeocoding(cityName) {
  const startTime = Date.now()
  
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
    )
    
    const responseTime = Date.now() - startTime
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
        responseTime
      }
    }
    
    const data = await response.json()
    
    if (!data.results || data.results.length === 0) {
      return {
        success: false,
        error: 'No results found',
        responseTime
      }
    }
    
    const result = data.results[0]
    return {
      success: true,
      coordinates: {
        latitude: result.latitude,
        longitude: result.longitude
      },
      location: {
        name: result.name,
        country: result.country,
        admin1: result.admin1
      },
      responseTime
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      success: false,
      error: error.message,
      responseTime
    }
  }
}

/**
 * Test weather API via Open-Meteo
 */
async function testWeatherAPI(latitude, longitude) {
  const startTime = Date.now()
  
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`
    )
    
    const responseTime = Date.now() - startTime
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
        responseTime
      }
    }
    
    const data = await response.json()
    
    return {
      success: true,
      data: {
        temperature: data.current?.temperature_2m,
        humidity: data.current?.relative_humidity_2m,
        weatherCode: data.current?.weather_code
      },
      responseTime
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      success: false,
      error: error.message,
      responseTime
    }
  }
}

/**
 * Validate test results
 */
function validateTest(testCase, intentResult, geocodingResult, weatherResult) {
  const checks = {
    intentDetected: false,
    locationResolved: false,
    dataRetrieved: false,
    actualData: false,
    temperaturePresent: false,
    correctProvider: false
  }
  
  const issues = []
  const providers = []
  
  // Check 1: Intent detection
  if (intentResult?.success) {
    const isMultilingualWeather = testCase.scenarioCategory === 'multilingual' && intentResult.detectedIntent === 'weather'
    const isRecommendationWeather = testCase.scenarioCategory === 'recommendation' && intentResult.detectedIntent === 'weather'
    const isAgricultureWeather = testCase.scenarioCategory === 'agriculture' && intentResult.detectedIntent === 'weather'
    
    if (intentResult.matches || isMultilingualWeather || isRecommendationWeather || isAgricultureWeather) {
      checks.intentDetected = true
    } else {
      issues.push(`Intent mismatch: detected "${intentResult.detectedIntent}", expected "${intentResult.expectedIntent}"`)
    }
  } else {
    issues.push(`Intent detection failed: ${intentResult?.error || 'unknown error'}`)
  }
  
  // Check 2: Location resolution
  if (geocodingResult?.success) {
    checks.locationResolved = true
    
    if (geocodingResult.location.country !== 'India') {
      issues.push(`Wrong country: ${geocodingResult.location.country} (expected India)`)
    }
  } else if (geocodingResult) {
    issues.push(`Geocoding failed: ${geocodingResult.error}`)
  }
  
  // Check 3: Weather data retrieval
  if (weatherResult?.success) {
    checks.dataRetrieved = true
    checks.actualData = true
    providers.push('Open-Meteo')
    
    if (weatherResult.data?.temperature !== undefined) {
      checks.temperaturePresent = true
    } else {
      issues.push('Weather data missing temperature')
    }
  } else if (weatherResult) {
    issues.push(`Weather API failed: ${weatherResult.error}`)
  }
  
  // Scenario-specific validation
  if (testCase.scenarioId === 'K') {
    checks.correctProvider = false
    issues.push('Historical data provider not tested (requires climate API)')
  } else if (testCase.scenarioId === 'L') {
    checks.correctProvider = false
    issues.push('NWP provider not tested (requires /api/nwp-forecast)')
  } else if (testCase.scenarioId === 'M') {
    checks.correctProvider = false
    issues.push('IMD provider not tested (requires /api/imd-alerts)')
  } else if (checks.dataRetrieved) {
    checks.correctProvider = true
  }
  
  return { checks, issues, providers }
}

/**
 * Determine test status
 */
function determineStatus(checks, issues) {
  const checksArray = Object.values(checks)
  const passedChecks = checksArray.filter(c => c).length
  const totalChecks = checksArray.length
  
  const realIssues = issues.filter(i => !i.includes('not tested'))
  
  if (realIssues.length > 2) {
    return 'FAIL'
  } else if (realIssues.length > 0) {
    return 'PARTIAL'
  } else if (passedChecks >= totalChecks * 0.7) {
    return 'PASS'
  } else if (passedChecks > 0) {
    return 'PARTIAL'
  } else {
    return 'FAIL'
  }
}

/**
 * Execute a single test case
 */
async function executeTest(testCase, index) {
  // Voice tests cannot be automated
  if (testCase.requiresVoice) {
    return {
      ...testCase,
      status: 'BLOCKED',
      reason: 'Voice input requires microphone and cannot be automated',
      responseTime: null,
      checks: {},
      issues: ['Requires manual testing with microphone'],
      providers: []
    }
  }
  
  let intentResult = null
  let geocodingResult = null
  let weatherResult = null
  let totalTime = 0
  
  try {
    // Test 1: Intent detection
    intentResult = await testIntentDetection(testCase.query, testCase.scenarioCategory)
    totalTime += intentResult.responseTime
    
    // Test 2: Geocoding (unless context-independent)
    if (testCase.scenarioId !== 'F') {
      geocodingResult = await testGeocoding(testCase.city)
      totalTime += geocodingResult.responseTime
      
      // Test 3: Weather API (for basic weather scenarios)
      if (geocodingResult.success && ['A', 'B', 'C', 'D', 'E', 'G', 'H', 'I'].includes(testCase.scenarioId)) {
        weatherResult = await testWeatherAPI(
          geocodingResult.coordinates.latitude,
          geocodingResult.coordinates.longitude
        )
        totalTime += weatherResult.responseTime
      }
    }
  } catch (error) {
    return {
      ...testCase,
      status: 'FAIL',
      error: error.message,
      responseTime: totalTime,
      checks: {},
      issues: [error.message],
      providers: []
    }
  }
  
  // Validate results
  const validation = validateTest(testCase, intentResult, geocodingResult, weatherResult)
  const status = determineStatus(validation.checks, validation.issues)
  
  return {
    ...testCase,
    status,
    responseTime: totalTime,
    checks: validation.checks,
    issues: validation.issues,
    providers: validation.providers,
    intentResult: intentResult?.detectedIntent,
    geocoding: geocodingResult?.success ? {
      coordinates: geocodingResult.coordinates,
      location: geocodingResult.location
    } : null,
    weather: weatherResult?.data || null
  }
}

/**
 * Execute tests in batches with concurrency control
 */
async function executeBatch(tests, startIndex, concurrency) {
  const batch = []
  
  for (let i = 0; i < concurrency && (startIndex + i) < tests.length; i++) {
    const testIndex = startIndex + i
    batch.push(executeTest(tests[testIndex], testIndex))
  }
  
  return await Promise.all(batch)
}

/**
 * Main execution
 */
async function runBatch2() {
  console.log('══════════════════════════════════════════════════════════════════════')
  console.log('STARTING BATCH 2 EXECUTION')
  console.log('══════════════════════════════════════════════════════════════════════\n')
  
  const startIndex = results.completed
  const remainingTests = allTests.slice(startIndex)
  
  console.log(`Starting from test ${startIndex + 1}/${allTests.length}`)
  console.log(`Remaining: ${remainingTests.length} tests\n`)
  
  for (let i = 0; i < remainingTests.length; i += CONCURRENCY) {
    const batchStart = startIndex + i
    const batchTests = remainingTests.slice(i, i + CONCURRENCY)
    
    console.log(`[Batch ${Math.floor(i / CONCURRENCY) + 1}] Tests ${batchStart + 1}-${batchStart + batchTests.length}/${allTests.length}`)
    
    const batchResults = await executeBatch(allTests, batchStart, batchTests.length)
    
    // Process results
    for (const result of batchResults) {
      results.tests.push(result)
      results.completed++
      
      if (result.status === 'PASS') results.passed++
      else if (result.status === 'FAIL') results.failed++
      else if (result.status === 'PARTIAL') results.partial++
      else if (result.status === 'BLOCKED') results.blocked++
      
      const emoji = { 'PASS': '✓', 'PARTIAL': '◐', 'FAIL': '✗', 'BLOCKED': '⚠' }[result.status]
      console.log(`  ${emoji} ${result.city} - ${result.scenarioName}: ${result.status} (${result.responseTime || 0}ms)`)
    }
    
    // Save periodically
    if (results.completed % SAVE_INTERVAL === 0) {
      fs.writeFileSync(BATCH2_RESULTS_PATH, JSON.stringify(results, null, 2))
      console.log(`  💾 Progress saved (${results.completed}/${allTests.length})\n`)
    }
    
    // Delay between batches to avoid rate limiting
    if (i + CONCURRENCY < remainingTests.length) {
      await sleep(BATCH_DELAY)
    }
  }
  
  // Final save
  fs.writeFileSync(BATCH2_RESULTS_PATH, JSON.stringify(results, null, 2))
  
  // Summary
  console.log('\n══════════════════════════════════════════════════════════════════════')
  console.log('BATCH 2 EXECUTION COMPLETE')
  console.log('══════════════════════════════════════════════════════════════════════')
  console.log(`Total tests:    ${results.totalTests}`)
  console.log(`Completed:      ${results.completed}`)
  console.log(`✓ Passed:       ${results.passed}`)
  console.log(`◐ Partial:      ${results.partial}`)
  console.log(`✗ Failed:       ${results.failed}`)
  console.log(`⚠ Blocked:      ${results.blocked}`)
  console.log('')
  console.log(`Pass rate:      ${((results.passed / results.completed) * 100).toFixed(1)}%`)
  console.log(`Success rate:   ${(((results.passed + results.partial) / results.completed) * 100).toFixed(1)}%`)
  console.log('')
  console.log(`Results saved to: ${BATCH2_RESULTS_PATH}`)
  console.log('══════════════════════════════════════════════════════════════════════')
}

// Execute
runBatch2().catch(error => {
  console.error('\n❌ Fatal error:', error)
  // Save partial results even on error
  fs.writeFileSync(BATCH2_RESULTS_PATH, JSON.stringify(results, null, 2))
  process.exit(1)
})
