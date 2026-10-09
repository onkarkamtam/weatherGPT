#!/usr/bin/env node
/**
 * Batch 1: Test Harness Validation
 * Tests Pandharpur, Pune, and Mumbai with all 13 scenarios
 * to validate test infrastructure before full India-wide run
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load test matrix
const matrixPath = path.join(__dirname, 'results', 'test-matrix.json');
const testMatrix = JSON.parse(await fs.readFile(matrixPath, 'utf-8'));

// Filter Batch 1 locations
const BATCH1_CITIES = ['Pandharpur', 'Pune', 'Mumbai'];
const batch1Tests = testMatrix.filter(test => BATCH1_CITIES.includes(test.city));

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║        Batch 1: Test Harness Validation                    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log(`Selected ${batch1Tests.length} test cases for Batch 1:`);
console.log(`  • Pandharpur: ${batch1Tests.filter(t => t.city === 'Pandharpur').length} scenarios`);
console.log(`  • Pune: ${batch1Tests.filter(t => t.city === 'Pune').length} scenarios`);
console.log(`  • Mumbai: ${batch1Tests.filter(t => t.city === 'Mumbai').length} scenarios`);

// Generate test report
const report = {
  batch: 1,
  description: 'Test Harness Validation',
  cities: BATCH1_CITIES,
  totalTests: batch1Tests.length,
  timestamp: new Date().toISOString(),
  tests: batch1Tests.map(test => ({
    testId: test.testId,
    city: test.city,
    scenarioId: test.scenarioId,
    scenarioName: test.scenarioName,
    category: test.scenarioCategory,
    query: test.query,
    language: test.language,
    requiresVoice: test.requiresVoice,
    status: 'PENDING',
    expectedChecks: getExpectedChecks(test)
  }))
};

function getExpectedChecks(test) {
  const checks = [];
  
  switch (test.scenarioCategory) {
    case 'weather':
    case 'forecast':
      checks.push(
        'Intent recognized correctly',
        'Location resolved to correct coordinates',
        'Weather data retrieved from API',
        'Response contains actual weather data (not rejection)',
        'Temperature value present',
        'Loading animation started and stopped'
      );
      break;
    
    case 'recommendation':
      checks.push(
        'Intent recognized correctly',
        'Location context established or requested',
        'Weather data used for recommendation',
        'Clear YES/NO/CAUTION verdict provided',
        'Reasoning based on actual conditions'
      );
      break;
    
    case 'agriculture':
      checks.push(
        'Intent recognized correctly',
        'Current weather data retrieved',
        'Practical agricultural advice given',
        'No fabricated crop-specific facts',
        'Advice appropriately qualified'
      );
      break;
    
    case 'multilingual':
      checks.push(
        `${test.language.toUpperCase()} intent recognized`,
        'Location resolved correctly',
        'Weather data retrieved',
        `Response in ${test.language.toUpperCase()}`,
        'Translation natural and accurate'
      );
      break;
    
    case 'voice':
      checks.push(
        'Microphone permission handled',
        'Speech recognition activated',
        'Transcription accurate',
        'Query submitted correctly',
        'Weather response received'
      );
      break;
    
    case 'historical':
      checks.push(
        'Historical data source identified',
        '5-year date range confirmed',
        'Actual historical/reanalysis data used',
        'No substitution of current weather',
        'Trend analysis provided or clear limitation stated'
      );
      break;
    
    case 'nwp':
      checks.push(
        'Both GFS and ECMWF models requested',
        'Model-specific data retrieved',
        'Forecast periods comparable',
        'Differences explained',
        'Timing: fetch < 12s, AI < 18s, total < 28s',
        'Console timing logs present'
      );
      break;
    
    case 'imd':
      checks.push(
        'IMD data source queried',
        'Official warning status determined',
        'Geographic applicability verified',
        'No fabricated warnings',
        'Clear handling of no-warning case'
      );
      break;
  }
  
  return checks;
}

// Save Batch 1 report
const reportPath = path.join(__dirname, 'results', 'batch1-report.json');
await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

console.log(`\n✓ Batch 1 report generated: ${reportPath}`);
console.log('\n' + '═'.repeat(70));
console.log('MANUAL TESTING REQUIRED');
console.log('═'.repeat(70));

console.log('\nBatch 1 must be executed manually due to:');
console.log('  • Browser automation complexity');
console.log('  • Voice input testing requirements');
console.log('  • Real-time API validation needs');
console.log('  • Screenshot and log capture');

console.log('\n📋 BATCH 1 TESTING INSTRUCTIONS:');
console.log('\n1. Open https://weather-gpt-india.vercel.app');
console.log('2. Open Browser DevTools (F12) → Console tab');
console.log('3. For each test case in batch1-report.json:');
console.log('   a. Enter the query exactly as specified');
console.log('   b. Verify all expected checks');
console.log('   c. Note response time from console logs');
console.log('   d. Screenshot any failures');
console.log('   e. Record status: PASS/FAIL/PARTIAL/BLOCKED');

console.log('\n4. Special instructions:');
console.log('   • Voice tests (scenario J): Use microphone button');
console.log('   • Context tests (scenario C): Establish location first');
console.log('   • No-context tests (scenario F): Start fresh session');
console.log('   • NWP tests (scenario L): Check console for timing logs');

console.log('\n5. Update batch1-report.json with results');
console.log('6. Run: node tests/batch1-analyzer.mjs');

console.log('\n' + '═'.repeat(70));

// Print first 5 test cases as examples
console.log('\nFirst 5 test cases:\n');
report.tests.slice(0, 5).forEach((test, i) => {
  console.log(`${i + 1}. ${test.city} - ${test.scenarioName}`);
  console.log(`   Query: "${test.query}"`);
  console.log(`   Category: ${test.category}`);
  console.log(`   Checks: ${test.expectedChecks.length}`);
  console.log('');
});

console.log(`...and ${report.tests.length - 5} more test cases.\n`);
