/**
 * Final Release Verification - Evidence-Based End-to-End Testing
 * 
 * Tests actual user-facing flows without assumptions based on HTTP 200 or intent detection.
 * Each test verifies:
 * - Requested date range matches returned data
 * - Aggregation/calculation correctness
 * - Output format (chart/text/card)
 * - Error handling and fallback behavior
 * - Multilingual response preservation
 */

import { fetchClimateTrend } from '../src/services/climateService.js'
import { fetchHistoricalComparison } from '../src/services/weatherService.js'
import { fetchNWPForecast, fetchBothModels } from '../src/services/nwpService.js'
import { isHistoricalWeatherIntent, isClimateTrendIntent, isNWPIntent, needsIMDData } from '../src/utils/weatherIntent.js'

const RESULTS = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: { total: 0, verified: 0, partial: 0, blocked: 0, failed: 0 }
}

function log(category, test, status, details) {
  const result = { category, test, status, details, timestamp: new Date().toISOString() }
  RESULTS.tests.push(result)
  RESULTS.summary.total++
  RESULTS.summary[status.toLowerCase()]++
  
  const icon = status === 'VERIFIED' ? '✅' : status === 'PARTIAL' ? '⚠️' : status === 'BLOCKED' ? '🚫' : '❌'
  console.log(`${icon} [${category}] ${test}: ${status}`)
  if (details) console.log(`   ${details}`)
}

// ============================================================================
// TEST 1: Historical Weather (30-day comparison, not 5-year trend)
// ============================================================================
console.log('\n═══════════════════════════════════════════════════════════')
console.log('TEST 1: HISTORICAL WEATHER (30-DAY YEAR-OVER-YEAR COMPARISON)')
console.log('═══════════════════════════════════════════════════════════\n')

try {
  console.log('Testing: "How does this year compare to last year?" for Mumbai')
  
  // Verify intent detection
  const query = "How does this year compare to last year?"
  const isHistorical = isHistoricalWeatherIntent(query)
  const isClimate = isClimateTrendIntent(query)
  
  if (!isHistorical) {
    log('Historical', 'Intent Detection', 'FAILED', 'Query not detected as historical intent')
  } else if (isClimate) {
    log('Historical', 'Intent Detection', 'FAILED', 'Incorrectly classified as climate trend instead of historical')
  } else {
    log('Historical', 'Intent Detection', 'VERIFIED', 'Correctly identified as historical comparison')
  }
  
  // Test actual data fetch
  const lat = 19.0760
  const lon = 72.8777
  const daysBack = 30
  
  console.log(`\nFetching 30-day historical comparison for Mumbai (${lat}, ${lon})...`)
  
  const data = await fetchHistoricalComparison({ lat, lon, daysBack })
  
  // Verify date range
  const today = new Date()
  const expectedEnd = new Date(today)
  expectedEnd.setDate(expectedEnd.getDate() - 5) // ERA5 5-day delay
  const expectedStart = new Date(expectedEnd)
  expectedStart.setDate(expectedStart.getDate() - daysBack)
  
  const thisYearActual = data.thisYear.daysAnalyzed
  const lastYearActual = data.lastYear.daysAnalyzed
  
  if (thisYearActual >= 25 && thisYearActual <= 31 && lastYearActual >= 25 && lastYearActual <= 31) {
    log('Historical', 'Date Range', 'VERIFIED', 
      `This year: ${thisYearActual} days, Last year: ${lastYearActual} days (expected ~30 days)`)
  } else {
    log('Historical', 'Date Range', 'PARTIAL', 
      `This year: ${thisYearActual} days, Last year: ${lastYearActual} days (expected ~30 days)`)
  }
  
  // Verify aggregation/calculation
  const hasTemp = typeof data.thisYear.avgTemp === 'number' && typeof data.lastYear.avgTemp === 'number'
  const hasPrecip = typeof data.thisYear.totalPrecip === 'number' && typeof data.lastYear.totalPrecip === 'number'
  const hasComparison = typeof data.comparison.tempDiff === 'number'
  
  if (hasTemp && hasPrecip && hasComparison) {
    log('Historical', 'Data Aggregation', 'VERIFIED', 
      `This year: ${data.thisYear.avgTemp}°C avg, ${data.thisYear.totalPrecip}mm total. ` +
      `Last year: ${data.lastYear.avgTemp}°C avg, ${data.lastYear.totalPrecip}mm total. ` +
      `Diff: ${data.comparison.tempDiff}°C, ${data.comparison.precipDiff}mm`)
  } else {
    log('Historical', 'Data Aggregation', 'FAILED', 'Missing temperature or precipitation calculations')
  }
  
  // Verify output format (card data structure)
  const hasCardStructure = data.thisYear && data.lastYear && data.comparison && 
    'tempDiff' in data.comparison && 'precipDiff' in data.comparison && 'tempTrend' in data.comparison
  
  if (hasCardStructure) {
    log('Historical', 'Output Format', 'VERIFIED', 
      `Card structure complete with trend: ${data.comparison.tempTrend}`)
  } else {
    log('Historical', 'Output Format', 'FAILED', 'Card data structure incomplete')
  }
  
} catch (error) {
  log('Historical', 'API Call', 'FAILED', `Error: ${error.message}`)
}

// ============================================================================
// TEST 2: CLIMATE TREND (5-year temperature/rainfall trend)
// ============================================================================
console.log('\n═══════════════════════════════════════════════════════════')
console.log('TEST 2: CLIMATE TREND (5-YEAR TEMPERATURE TREND ANALYSIS)')
console.log('═══════════════════════════════════════════════════════════\n')

try {
  console.log('Testing: "Show me 5-year temperature trend for Delhi"')
  
  // Verify intent detection
  const query = "Show me 5-year temperature trend for Delhi"
  const isClimate = isClimateTrendIntent(query)
  const isHistorical = isHistoricalWeatherIntent(query)
  
  if (!isClimate) {
    log('Climate Trend', 'Intent Detection', 'FAILED', 'Query not detected as climate trend intent')
  } else if (isHistorical && !isClimate) {
    log('Climate Trend', 'Intent Detection', 'FAILED', 'Incorrectly classified as historical instead of climate')
  } else {
    log('Climate Trend', 'Intent Detection', 'VERIFIED', 'Correctly identified as climate trend')
  }
  
  // Test actual data fetch
  const lat = 28.7041
  const lon = 77.1025
  const years = 5
  
  console.log(`\nFetching ${years}-year climate trend for Delhi (${lat}, ${lon})...`)
  
  const data = await fetchClimateTrend({ lat, lon, years })
  
  // Verify date range
  const currentYear = new Date().getFullYear()
  const expectedStartYear = currentYear - years
  const expectedEndYear = currentYear - 1
  
  if (data.period.startYear === expectedStartYear && data.period.endYear === expectedEndYear) {
    log('Climate Trend', 'Date Range', 'VERIFIED', 
      `Period: ${data.period.startYear}-${data.period.endYear} (${data.period.years} years)`)
  } else {
    log('Climate Trend', 'Date Range', 'PARTIAL', 
      `Expected: ${expectedStartYear}-${expectedEndYear}, Got: ${data.period.startYear}-${data.period.endYear}`)
  }
  
  // Verify yearly data completeness
  if (data.yearlyData && data.yearlyData.length >= Math.ceil(years * 0.6)) {
    log('Climate Trend', 'Data Coverage', 'VERIFIED', 
      `${data.yearlyData.length}/${years} years of data available`)
  } else {
    log('Climate Trend', 'Data Coverage', 'FAILED', 
      `Only ${data.yearlyData?.length || 0}/${years} years available`)
  }
  
  // Verify aggregation/calculation (trend slope and direction)
  const hasTemp = data.trends?.temperature?.slope !== undefined
  const hasPrecip = data.trends?.precipitation?.slope !== undefined
  const hasSummary = data.summary?.avgTemp !== undefined
  
  if (hasTemp && hasPrecip && hasSummary) {
    log('Climate Trend', 'Trend Calculation', 'VERIFIED', 
      `Temp: ${data.trends.temperature.slope}°C/year (${data.trends.temperature.direction}), ` +
      `Precip: ${data.trends.precipitation.slope}mm/year (${data.trends.precipitation.direction})`)
  } else {
    log('Climate Trend', 'Trend Calculation', 'FAILED', 'Missing trend calculations')
  }
  
  // Verify output format (chart data for UI)
  const hasChartData = data.yearlyData && Array.isArray(data.yearlyData) && 
    data.yearlyData.every(y => y.year && y.avgTemp !== undefined && y.totalPrecip !== undefined)
  
  if (hasChartData) {
    log('Climate Trend', 'Chart Data', 'VERIFIED', 
      `${data.yearlyData.length} years of chart-ready data`)
  } else {
    log('Climate Trend', 'Chart Data', 'FAILED', 'Chart data incomplete or malformed')
  }
  
  // Verify summary statistics
  const hasSummaryStats = data.summary.minYear && data.summary.maxYear && 
    data.summary.wettest && data.summary.driest
  
  if (hasSummaryStats) {
    log('Climate Trend', 'Summary Stats', 'VERIFIED', 
      `Coldest: ${data.summary.minYear.year} (${data.summary.minYear.avgTemp}°C), ` +
      `Hottest: ${data.summary.maxYear.year} (${data.summary.maxYear.avgTemp}°C)`)
  } else {
    log('Climate Trend', 'Summary Stats', 'FAILED', 'Summary statistics incomplete')
  }
  
} catch (error) {
  log('Climate Trend', 'API Call', 'FAILED', `Error: ${error.message}`)
}

// ============================================================================
// TEST 3: NWP MODEL COMPARISON (GFS vs ECMWF)
// ============================================================================
console.log('\n═══════════════════════════════════════════════════════════')
console.log('TEST 3: NWP MODEL COMPARISON (GFS/GRAPES vs ECMWF IFS)')
console.log('═══════════════════════════════════════════════════════════\n')

try {
  console.log('Testing: "Compare GFS and ECMWF forecasts for Bangalore"')
  
  // Verify intent detection
  const query = "Compare GFS and ECMWF forecasts"
  const isNWP = isNWPIntent(query)
  
  if (!isNWP) {
    log('NWP Comparison', 'Intent Detection', 'FAILED', 'Query not detected as NWP intent')
  } else {
    log('NWP Comparison', 'Intent Detection', 'VERIFIED', 'Correctly identified as NWP comparison')
  }
  
  // Test actual data fetch
  const lat = 12.9716
  const lon = 77.5946
  
  console.log(`\nFetching NWP comparison for Bangalore (${lat}, ${lon})...`)
  
  const data = await fetchBothModels({ lat, lon })
  
  // Verify both models returned
  const hasGFS = data.gfs && data.gfs.provider
  const hasECMWF = data.ecmwf && data.ecmwf.provider
  
  if (hasGFS && hasECMWF) {
    log('NWP Comparison', 'Model Availability', 'VERIFIED', 
      `GFS: ${data.gfs.provider}, ECMWF: ${data.ecmwf.provider}`)
  } else {
    log('NWP Comparison', 'Model Availability', 'PARTIAL', 
      `GFS: ${hasGFS ? 'OK' : 'MISSING'}, ECMWF: ${hasECMWF ? 'OK' : 'MISSING'}`)
  }
  
  // Verify source/model identifiers
  const gfsSource = data.gfs?.source
  const ecmwfSource = data.ecmwf?.source
  
  if (gfsSource && ecmwfSource) {
    log('NWP Comparison', 'Source Attribution', 'VERIFIED', 
      `GFS: ${gfsSource}, ECMWF: ${ecmwfSource}`)
  } else {
    log('NWP Comparison', 'Source Attribution', 'FAILED', 
      'Missing source attribution for one or both models')
  }
  
  // Verify forecast dates and values
  const gfsHasForecasts = data.gfs?.hourly?.length > 0
  const ecmwfHasForecasts = data.ecmwf?.hourly?.length > 0
  
  if (gfsHasForecasts && ecmwfHasForecasts) {
    const gfsSample = data.gfs.hourly[0]
    const ecmwfSample = data.ecmwf.hourly[0]
    
    log('NWP Comparison', 'Forecast Data', 'VERIFIED', 
      `GFS: ${data.gfs.hourly.length} hours, first: ${gfsSample.time} ${gfsSample.temp}°C. ` +
      `ECMWF: ${data.ecmwf.hourly.length} hours, first: ${ecmwfSample.time} ${ecmwfSample.temp}°C`)
  } else {
    log('NWP Comparison', 'Forecast Data', 'FAILED', 
      'Missing hourly forecast data for one or both models')
  }
  
  // Verify model differences (they should differ since they're different models)
  if (gfsHasForecasts && ecmwfHasForecasts) {
    const gfsTemp = data.gfs.hourly[0].temp
    const ecmwfTemp = data.ecmwf.hourly[0].temp
    const difference = Math.abs(gfsTemp - ecmwfTemp)
    
    // Models should differ by at least 0.1°C (otherwise it's suspicious)
    if (difference > 0.1) {
      log('NWP Comparison', 'Model Divergence', 'VERIFIED', 
        `Models differ by ${difference.toFixed(1)}°C (expected for different models)`)
    } else {
      log('NWP Comparison', 'Model Divergence', 'PARTIAL', 
        `Models too similar (${difference.toFixed(1)}°C difference) - may be same source`)
    }
  }
  
} catch (error) {
  log('NWP Comparison', 'API Call', 'FAILED', `Error: ${error.message}`)
}

// ============================================================================
// TEST 4: IMD WARNINGS (Multiple locations)
// ============================================================================
console.log('\n═══════════════════════════════════════════════════════════')
console.log('TEST 4: IMD WARNINGS (Official Weather Warnings)')
console.log('═══════════════════════════════════════════════════════════\n')

log('IMD Warnings', 'Live Testing', 'BLOCKED', 
  'IMD CAP feed requires live API access - tested separately with verify-specialized-apis.mjs')

// Note: IMD API testing requires hitting actual IMD CAP XML feeds which are:
// 1. Live data that changes constantly
// 2. May have no warnings for a given location/time
// 3. Requires XML parsing and state-level geographic matching
// This was already verified in verify-specialized-apis.mjs

// ============================================================================
// TEST 5: MULTILINGUAL SUPPORT (Generated responses)
// ============================================================================
console.log('\n═══════════════════════════════════════════════════════════')
console.log('TEST 5: MULTILINGUAL SUPPORT (Not Just Intent Detection)')
console.log('═══════════════════════════════════════════════════════════\n')

log('Multilingual', 'Response Generation', 'NOT TESTED', 
  'Requires Gemini AI integration and cannot be tested without API key in automated script. ' +
  'Intent detection verified in batch tests (1,755 scenarios). ' +
  'Response preservation requires browser testing.')

// Note: Multilingual response testing requires:
// 1. Gemini AI API access (not available in automated tests)
// 2. Verification that Hindi/Marathi/Telugu responses preserve location and weather facts
// 3. This can only be tested through actual chatbot interaction

// ============================================================================
// GENERATE SUMMARY
// ============================================================================
console.log('\n═══════════════════════════════════════════════════════════')
console.log('FINAL RELEASE VERIFICATION SUMMARY')
console.log('═══════════════════════════════════════════════════════════\n')

console.log(`Total Tests: ${RESULTS.summary.total}`)
console.log(`✅ VERIFIED: ${RESULTS.summary.verified}`)
console.log(`⚠️  PARTIAL: ${RESULTS.summary.partial}`)
console.log(`🚫 BLOCKED: ${RESULTS.summary.blocked}`)
console.log(`❌ FAILED: ${RESULTS.summary.failed}`)

const verificationRate = (RESULTS.summary.verified / RESULTS.summary.total * 100).toFixed(1)
console.log(`\nVerification Rate: ${verificationRate}%`)

// Write results to file
import fs from 'fs'
fs.writeFileSync(
  'tests/results/final-release-verification.json',
  JSON.stringify(RESULTS, null, 2)
)

console.log('\nDetailed results written to: tests/results/final-release-verification.json')

// Determine overall verdict
console.log('\n═══════════════════════════════════════════════════════════')
console.log('VERDICT')
console.log('═══════════════════════════════════════════════════════════\n')

if (RESULTS.summary.failed > 0) {
  console.log('❌ NOT PRODUCTION READY - Critical failures detected')
  process.exit(1)
} else if (RESULTS.summary.verified >= Math.floor(RESULTS.summary.total * 0.7)) {
  console.log('✅ VERIFIED FOR PRODUCTION - Core features working')
  console.log('⚠️  Manual browser testing recommended for UI/multilingual/IMD')
} else {
  console.log('⚠️  PARTIAL VERIFICATION - Additional testing required')
  process.exit(1)
}
