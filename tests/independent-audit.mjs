#!/usr/bin/env node
/**
 * Independent Audit Script - Zero-Assumption Verification
 * 
 * This script independently verifies ALL claims made in previous reports
 * without assuming any prior work was correct.
 * 
 * Audit checklist:
 * 1. Location matrix integrity (151 vs 135 discrepancy)
 * 2. Test matrix structure and counts
 * 3. Query generation and city substitution
 * 4. Result file integrity and reconciliation
 * 5. Test categorization accuracy
 * 6. Report calculation verification
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

console.log('╔════════════════════════════════════════════════════════════╗')
console.log('║     INDEPENDENT AUDIT - Zero-Assumption Verification       ║')
console.log('╚════════════════════════════════════════════════════════════╝\n')

const audit = {
  errors: [],
  warnings: [],
  findings: [],
  stats: {}
}

function error(msg) {
  audit.errors.push(msg)
  console.error(`❌ ERROR: ${msg}`)
}

function warning(msg) {
  audit.warnings.push(msg)
  console.warn(`⚠️  WARNING: ${msg}`)
}

function finding(msg) {
  audit.findings.push(msg)
  console.log(`ℹ️  ${msg}`)
}

function pass(msg) {
  console.log(`✓ ${msg}`)
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT 1: Location Matrix Integrity
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n━━━ AUDIT 1: Location Matrix Integrity ━━━\n')

const locations = JSON.parse(fs.readFileSync(path.join(__dirname, 'india-locations.json'), 'utf-8'))

// Count actual locations
let actualCityCount = 0
const cityNames = new Set()
const stateCount = Object.keys(locations.states).length
const utCount = Object.keys(locations.unionTerritories).length

// Verify states
for (const [state, data] of Object.entries(locations.states)) {
  data.cities.forEach(city => {
    actualCityCount++
    if (cityNames.has(city)) {
      warning(`Duplicate city name: ${city}`)
    }
    cityNames.add(city)
  })
}

// Verify UTs
for (const [ut, data] of Object.entries(locations.unionTerritories)) {
  data.cities.forEach(city => {
    actualCityCount++
    if (cityNames.has(city)) {
      warning(`Duplicate city name: ${city}`)
    }
    cityNames.add(city)
  })
}

audit.stats.actualCityCount = actualCityCount
audit.stats.stateCount = stateCount
audit.stats.utCount = utCount
audit.stats.reportedTotal = locations.totalLocations

finding(`Actual cities counted: ${actualCityCount}`)
finding(`States: ${stateCount}, UTs: ${utCount}`)
finding(`Reported in metadata: ${locations.totalLocations}`)

if (actualCityCount !== locations.totalLocations) {
  error(`Location count mismatch: actual ${actualCityCount} vs reported ${locations.totalLocations}`)
} else {
  pass(`Location count verified: ${actualCityCount} cities`)
}

if (stateCount !== 28) {
  error(`Expected 28 states, found ${stateCount}`)
} else {
  pass(`All 28 states present`)
}

if (utCount !== 8) {
  error(`Expected 8 UTs, found ${utCount}`)
} else {
  pass(`All 8 UTs present`)
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT 2: Test Matrix Structure
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n━━━ AUDIT 2: Test Matrix Structure ━━━\n')

const testMatrix = JSON.parse(fs.readFileSync(path.join(__dirname, 'results', 'test-matrix.json'), 'utf-8'))

audit.stats.testMatrixLength = testMatrix.length

finding(`Test matrix contains ${testMatrix.length} tests`)

// Verify test IDs are unique
const testIds = new Set()
const duplicateIds = []
testMatrix.forEach(test => {
  if (testIds.has(test.testId)) {
    duplicateIds.push(test.testId)
  }
  testIds.add(test.testId)
})

if (duplicateIds.length > 0) {
  error(`Found ${duplicateIds.length} duplicate test IDs: ${duplicateIds.slice(0, 5).join(', ')}`)
} else {
  pass(`All test IDs unique (${testIds.size} tests)`)
}

// Verify scenarios per city
const citiesInMatrix = new Set()
const scenariosPerCity = {}

testMatrix.forEach(test => {
  citiesInMatrix.add(test.city)
  if (!scenariosPerCity[test.city]) {
    scenariosPerCity[test.city] = new Set()
  }
  scenariosPerCity[test.city].add(test.scenarioId)
})

audit.stats.citiesInMatrix = citiesInMatrix.size

finding(`Cities in test matrix: ${citiesInMatrix.size}`)

// Check if all cities have 13 scenarios
let citiesMissingScenarios = 0
for (const [city, scenarios] of Object.entries(scenariosPerCity)) {
  if (scenarios.size !== 13) {
    warning(`${city} has ${scenarios.size} scenarios instead of 13`)
    citiesMissingScenarios++
  }
}

if (citiesMissingScenarios === 0) {
  pass(`All cities have exactly 13 scenarios`)
} else {
  error(`${citiesMissingScenarios} cities have incorrect scenario count`)
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT 3: Query Generation and City Substitution
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n━━━ AUDIT 3: Query Generation & City Substitution ━━━\n')

// Check for city name leakage
const leakageErrors = []
const contextIndependentTests = []

testMatrix.forEach(test => {
  // Scenario F should not have city name
  if (test.scenarioId === 'F') {
    contextIndependentTests.push(test)
    if (test.query.toLowerCase().includes(test.city.toLowerCase())) {
      leakageErrors.push(`Scenario F for ${test.city} contains city name: "${test.query}"`)
    }
  } else {
    // Other location-dependent scenarios should have city name
    if (test.scenarioId !== 'J' && !test.query.toLowerCase().includes(test.city.toLowerCase())) {
      // Exception: multilingual queries may have transliterated city names
      if (!['G', 'H', 'I'].includes(test.scenarioId)) {
        warning(`${test.city} - Scenario ${test.scenarioId} missing city name: "${test.query}"`)
      }
    }
  }
})

audit.stats.contextIndependentTests = contextIndependentTests.length

if (leakageErrors.length > 0) {
  leakageErrors.forEach(err => error(err))
} else {
  pass(`No city name leakage in ${contextIndependentTests.length} context-independent tests`)
}

// Check for cross-city leakage
const crossLeakage = []
testMatrix.forEach(test => {
  // Check if query contains OTHER city names
  cityNames.forEach(otherCity => {
    if (otherCity !== test.city && test.query.toLowerCase().includes(otherCity.toLowerCase())) {
      crossLeakage.push(`${test.city} - Scenario ${test.scenarioId} contains "${otherCity}": "${test.query}"`)
    }
  })
})

if (crossLeakage.length > 0) {
  error(`Found ${crossLeakage.length} cross-city leakage instances`)
  crossLeakage.slice(0, 5).forEach(err => error(err))
} else {
  pass(`No cross-city leakage detected`)
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT 4: Result File Integrity
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n━━━ AUDIT 4: Result File Integrity ━━━\n')

const batch1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'results', 'batch1-results.json'), 'utf-8'))
const batch2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'results', 'batch2-results.json'), 'utf-8'))

audit.stats.batch1_reported = { total: batch1.totalTests, completed: batch1.completed }
audit.stats.batch2_reported = { total: batch2.totalTests, completed: batch2.completed }

finding(`Batch 1 reported: ${batch1.completed}/${batch1.totalTests} tests`)
finding(`Batch 2 reported: ${batch2.completed}/${batch2.totalTests} tests`)

// Verify actual test counts
const batch1ActualTests = batch1.tests.length
const batch2ActualTests = batch2.tests.length

audit.stats.batch1_actual = batch1ActualTests
audit.stats.batch2_actual = batch2ActualTests

if (batch1ActualTests !== batch1.completed) {
  error(`Batch 1: Reported ${batch1.completed} but found ${batch1ActualTests} test records`)
} else {
  pass(`Batch 1: Test count matches (${batch1ActualTests})`)
}

if (batch2ActualTests !== batch2.completed) {
  error(`Batch 2: Reported ${batch2.completed} but found ${batch2ActualTests} test records`)
} else {
  pass(`Batch 2: Test count matches (${batch2ActualTests})`)
}

// Check for duplicate test IDs in results
const resultIds = new Set()
const duplicateResultIds = []

const allResults = batch1.tests.concat(batch2.tests)
allResults.forEach(test => {
  if (resultIds.has(test.testId)) {
    duplicateResultIds.push(test.testId)
  }
  resultIds.add(test.testId)
})

if (duplicateResultIds.length > 0) {
  error(`Found ${duplicateResultIds.length} duplicate test IDs in results`)
} else {
  pass(`No duplicate test IDs in result files`)
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT 5: Test Categorization Accuracy
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n━━━ AUDIT 5: Test Categorization Accuracy ━━━\n')

// Recalculate status counts from raw data
const actualCounts = {
  pass: 0,
  partial: 0,
  fail: 0,
  blocked: 0,
  notRun: 0
}

allResults.forEach(test => {
  const status = test.status?.toUpperCase()
  if (status === 'PASS') actualCounts.pass++
  else if (status === 'PARTIAL') actualCounts.partial++
  else if (status === 'FAIL') actualCounts.fail++
  else if (status === 'BLOCKED') actualCounts.blocked++
  else if (status === 'NOT_RUN' || !status) actualCounts.notRun++
  else warning(`Unknown status: ${status} for test ${test.testId}`)
})

const reported = {
  pass: batch1.passed + batch2.passed,
  partial: batch1.partial + batch2.partial,
  fail: batch1.failed + batch2.failed,
  blocked: batch1.blocked + batch2.blocked
}

audit.stats.actualCounts = actualCounts
audit.stats.reportedCounts = reported

finding(`Actual: PASS=${actualCounts.pass}, PARTIAL=${actualCounts.partial}, FAIL=${actualCounts.fail}, BLOCKED=${actualCounts.blocked}`)
finding(`Reported: PASS=${reported.pass}, PARTIAL=${reported.partial}, FAIL=${reported.fail}, BLOCKED=${reported.blocked}`)

if (actualCounts.pass !== reported.pass) {
  error(`PASS count mismatch: actual ${actualCounts.pass} vs reported ${reported.pass}`)
} else {
  pass(`PASS count verified: ${actualCounts.pass}`)
}

if (actualCounts.partial !== reported.partial) {
  error(`PARTIAL count mismatch: actual ${actualCounts.partial} vs reported ${reported.partial}`)
} else {
  pass(`PARTIAL count verified: ${actualCounts.partial}`)
}

if (actualCounts.fail !== reported.fail) {
  error(`FAIL count mismatch: actual ${actualCounts.fail} vs reported ${reported.fail}`)
} else {
  pass(`FAIL count verified: ${actualCounts.fail}`)
}

if (actualCounts.blocked !== reported.blocked) {
  error(`BLOCKED count mismatch: actual ${actualCounts.blocked} vs reported ${reported.blocked}`)
} else {
  pass(`BLOCKED count verified: ${actualCounts.blocked}`)
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT 6: Test Layer Classification
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n━━━ AUDIT 6: Test Layer Classification ━━━\n')

const layers = {
  intentOnly: 0,
  geocodingOnly: 0,
  weatherAPI: 0,
  specializedAPI: 0,
  manualOnly: 0
}

allResults.forEach(test => {
  // Manual only (voice input)
  if (test.requiresVoice || test.scenarioId === 'J') {
    layers.manualOnly++
  }
  // Specialized APIs (historical, NWP, IMD)
  else if (['K', 'L', 'M'].includes(test.scenarioId)) {
    layers.specializedAPI++
  }
  // Weather API tests
  else if (test.weather || test.providers?.includes('Open-Meteo')) {
    layers.weatherAPI++
  }
  // Geocoding only
  else if (test.geocoding && !test.weather) {
    layers.geocodingOnly++
  }
  // Intent only
  else if (test.intentResult && !test.geocoding) {
    layers.intentOnly++
  }
})

audit.stats.layers = layers

finding(`Test layers:`)
finding(`  Intent-only: ${layers.intentOnly}`)
finding(`  Geocoding-only: ${layers.geocodingOnly}`)
finding(`  Weather API: ${layers.weatherAPI}`)
finding(`  Specialized API (deferred): ${layers.specializedAPI}`)
finding(`  Manual-only (voice): ${layers.manualOnly}`)

const endToEndTests = layers.weatherAPI
const totalCompleted = actualCounts.pass + actualCounts.partial + actualCounts.fail + actualCounts.blocked

finding(`\nEnd-to-end weather tests: ${endToEndTests}/${totalCompleted} (${((endToEndTests/totalCompleted)*100).toFixed(1)}%)`)

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════════════════')
console.log('AUDIT SUMMARY')
console.log('═══════════════════════════════════════════════════════════════════════\n')

console.log(`Errors: ${audit.errors.length}`)
console.log(`Warnings: ${audit.warnings.length}`)
console.log(`Findings: ${audit.findings.length}`)

if (audit.errors.length > 0) {
  console.log('\n❌ AUDIT FAILED - Critical issues found:\n')
  audit.errors.forEach((err, i) => console.log(`${i + 1}. ${err}`))
} else {
  console.log('\n✅ AUDIT PASSED - No critical issues found')
}

if (audit.warnings.length > 0) {
  console.log(`\n⚠️  ${audit.warnings.length} warnings:\n`)
  audit.warnings.slice(0, 10).forEach((warn, i) => console.log(`${i + 1}. ${warn}`))
  if (audit.warnings.length > 10) {
    console.log(`... and ${audit.warnings.length - 10} more`)
  }
}

// Save audit report
const auditReport = {
  timestamp: new Date().toISOString(),
  errors: audit.errors,
  warnings: audit.warnings,
  findings: audit.findings,
  stats: audit.stats,
  verdict: audit.errors.length === 0 ? 'PASS' : 'FAIL'
}

fs.writeFileSync(
  path.join(__dirname, 'results', 'audit-report.json'),
  JSON.stringify(auditReport, null, 2)
)

console.log('\n✓ Audit report saved to tests/results/audit-report.json')

process.exit(audit.errors.length > 0 ? 1 : 0)
