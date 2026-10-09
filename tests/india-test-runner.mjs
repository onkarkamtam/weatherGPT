#!/usr/bin/env node
/**
 * Comprehensive India-Wide WeatherGPT Validation
 * 
 * Tests ~151 locations across 28 states and 8 UTs
 * with 13 test scenarios each (~1,963 test executions)
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load locations
const locationsData = JSON.parse(
  await fs.readFile(path.join(__dirname, 'india-locations.json'), 'utf-8')
);

// Test scenario templates
const TEST_SCENARIOS = {
  CURRENT_WEATHER: {
    id: 'A',
    name: 'Current Weather',
    template: (city) => `What is the weather in ${city} right now?`,
    category: 'weather',
    multilingual: false
  },
  TOMORROW_FORECAST: {
    id: 'B',
    name: 'Tomorrow Forecast',
    template: (city) => `What will the weather be in ${city} tomorrow?`,
    category: 'forecast',
    multilingual: false
  },
  UMBRELLA_CONTEXT: {
    id: 'C',
    name: 'Umbrella with Context',
    template: (city) => `Should I carry an umbrella if I go outside tomorrow?`,
    category: 'recommendation',
    multilingual: false,
    requiresContext: true
  },
  AGRICULTURE: {
    id: 'D',
    name: 'Agriculture Advisory',
    template: (city) => `What should farmers in ${city} do based on today's weather?`,
    category: 'agriculture',
    multilingual: false
  },
  OUTDOOR_ACTIVITY: {
    id: 'E',
    name: 'Outdoor Activity',
    template: (city) => `Is it a good time for an outdoor activity in ${city} today?`,
    category: 'recommendation',
    multilingual: false
  },
  UMBRELLA_NO_CONTEXT: {
    id: 'F',
    name: 'Umbrella without Context',
    template: () => `Should I carry an umbrella?`,
    category: 'recommendation',
    multilingual: false,
    requiresContext: false
  },
  HINDI_QUERY: {
    id: 'G',
    name: 'Hindi Query',
    template: (city) => `${city} में आज मौसम कैसा है?`,
    category: 'multilingual',
    multilingual: true,
    language: 'hi'
  },
  MARATHI_QUERY: {
    id: 'H',
    name: 'Marathi Query',
    template: (city) => `${city}मध्ये आज हवामान कसं आहे?`,
    category: 'multilingual',
    multilingual: true,
    language: 'mr'
  },
  TELUGU_QUERY: {
    id: 'I',
    name: 'Telugu Query',
    template: (city) => `${city}లో ఈరోజు వాతావరణం ఎలా ఉంది?`,
    category: 'multilingual',
    multilingual: true,
    language: 'te'
  },
  VOICE_INPUT: {
    id: 'J',
    name: 'Voice Input',
    template: (city) => `What's the weather in ${city} today?`,
    category: 'voice',
    multilingual: false,
    requiresVoice: true
  },
  HISTORICAL_TREND: {
    id: 'K',
    name: '5-Year Temperature Trend',
    template: (city) => `What is the temperature trend in ${city} over the past 5 years?`,
    category: 'historical',
    multilingual: false
  },
  NWP_COMPARISON: {
    id: 'L',
    name: 'NWP Model Comparison',
    template: (city) => `Compare the GFS GRAPES and ECMWF IFS forecasts for ${city} for the next 3 days.`,
    category: 'nwp',
    multilingual: false
  },
  IMD_WARNING: {
    id: 'M',
    name: 'IMD Official Warning',
    template: (city) => `What is the latest official IMD weather warning for ${city}?`,
    category: 'imd',
    multilingual: false
  }
};

// Build test matrix
function buildTestMatrix() {
  const matrix = [];
  let testId = 1;

  // Process states
  for (const [stateName, stateData] of Object.entries(locationsData.states)) {
    for (const city of stateData.cities) {
      for (const [scenarioKey, scenario] of Object.entries(TEST_SCENARIOS)) {
        matrix.push({
          testId: testId++,
          jurisdiction: stateName,
          jurisdictionType: 'state',
          city,
          geography: stateData.geography,
          supportedLanguages: stateData.languages,
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          scenarioCategory: scenario.category,
          query: scenario.template(city),
          requiresContext: scenario.requiresContext || false,
          requiresVoice: scenario.requiresVoice || false,
          multilingual: scenario.multilingual,
          language: scenario.language || 'en',
          status: 'NOT_RUN',
          result: null,
          responseTime: null,
          error: null,
          timestamp: null
        });
      }
    }
  }

  // Process union territories
  for (const [utName, utData] of Object.entries(locationsData.unionTerritories)) {
    for (const city of utData.cities) {
      for (const [scenarioKey, scenario] of Object.entries(TEST_SCENARIOS)) {
        matrix.push({
          testId: testId++,
          jurisdiction: utName,
          jurisdictionType: 'ut',
          city,
          geography: utData.geography,
          supportedLanguages: utData.languages,
          scenarioId: scenario.id,
          scenarioName: scenario.name,
          scenarioCategory: scenario.category,
          query: scenario.template(city),
          requiresContext: scenario.requiresContext || false,
          requiresVoice: scenario.requiresVoice || false,
          multilingual: scenario.multilingual,
          language: scenario.language || 'en',
          status: 'NOT_RUN',
          result: null,
          responseTime: null,
          error: null,
          timestamp: null
        });
      }
    }
  }

  return matrix;
}

// Validate query substitution
function validateQuerySubstitution(testCase) {
  const query = testCase.query.toLowerCase();
  const city = testCase.city.toLowerCase();
  
  // Skip validation for context-dependent queries that don't need city name
  if (testCase.requiresContext === false && testCase.scenarioId === 'F') {
    return { valid: true };
  }
  
  // Check if the query contains the correct city name
  const containsCorrectCity = query.includes(city);
  
  // Check if query contains any hardcoded test cities
  const hardcodedCities = ['pandharpur', 'pune', 'mumbai'];
  const containsHardcoded = hardcodedCities.some(hc => 
    hc !== city && query.includes(hc)
  );
  
  if (!containsCorrectCity && !testCase.requiresContext) {
    return {
      valid: false,
      reason: `Query does not contain the assigned city: ${testCase.city}`
    };
  }
  
  if (containsHardcoded) {
    return {
      valid: false,
      reason: `Query contains hardcoded city instead of ${testCase.city}`
    };
  }
  
  return { valid: true };
}

// Generate summary statistics
function generateSummary(testMatrix) {
  const summary = {
    totalTests: testMatrix.length,
    byStatus: {},
    byJurisdiction: {},
    byScenario: {},
    byCategory: {},
    performance: {
      medianResponseTime: null,
      p95ResponseTime: null,
      slowestTests: []
    },
    coverage: {
      states: new Set(),
      uts: new Set(),
      cities: new Set()
    },
    failures: []
  };

  testMatrix.forEach(test => {
    // Count by status
    summary.byStatus[test.status] = (summary.byStatus[test.status] || 0) + 1;
    
    // Count by jurisdiction
    if (!summary.byJurisdiction[test.jurisdiction]) {
      summary.byJurisdiction[test.jurisdiction] = {
        total: 0,
        passed: 0,
        failed: 0,
        partial: 0,
        blocked: 0,
        notRun: 0
      };
    }
    summary.byJurisdiction[test.jurisdiction].total++;
    summary.byJurisdiction[test.jurisdiction][test.status.toLowerCase().replace('_', '')]++;
    
    // Count by scenario
    if (!summary.byScenario[test.scenarioName]) {
      summary.byScenario[test.scenarioName] = {
        total: 0,
        passed: 0,
        failed: 0
      };
    }
    summary.byScenario[test.scenarioName].total++;
    if (test.status === 'PASS') summary.byScenario[test.scenarioName].passed++;
    if (test.status === 'FAIL') summary.byScenario[test.scenarioName].failed++;
    
    // Track coverage
    if (test.jurisdictionType === 'state') {
      summary.coverage.states.add(test.jurisdiction);
    } else {
      summary.coverage.uts.add(test.jurisdiction);
    }
    summary.coverage.cities.add(test.city);
    
    // Collect failures
    if (test.status === 'FAIL') {
      summary.failures.push({
        testId: test.testId,
        city: test.city,
        scenario: test.scenarioName,
        error: test.error
      });
    }
  });

  summary.coverage.statesCount = summary.coverage.states.size;
  summary.coverage.utsCount = summary.coverage.uts.size;
  summary.coverage.citiesCount = summary.coverage.cities.size;

  return summary;
}

// Main execution
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   WeatherGPT India-Wide Comprehensive Validation           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Building test matrix...');
  const testMatrix = buildTestMatrix();
  
  console.log(`\n✓ Test matrix created:`);
  console.log(`  • Total test cases: ${testMatrix.length}`);
  console.log(`  • Locations: ${locationsData.totalLocations}`);
  console.log(`  • States: ${locationsData.totalStates}`);
  console.log(`  • Union Territories: ${locationsData.totalUTs}`);
  console.log(`  • Scenarios per location: ${Object.keys(TEST_SCENARIOS).length}`);
  
  // Validate query substitution
  console.log('\nValidating query substitution...');
  const validationErrors = [];
  testMatrix.forEach(test => {
    const validation = validateQuerySubstitution(test);
    if (!validation.valid) {
      validationErrors.push({
        testId: test.testId,
        city: test.city,
        query: test.query,
        reason: validation.reason
      });
    }
  });
  
  if (validationErrors.length > 0) {
    console.error(`\n❌ Query substitution validation failed for ${validationErrors.length} tests:`);
    validationErrors.slice(0, 5).forEach(err => {
      console.error(`   Test ${err.testId}: ${err.reason}`);
      console.error(`     Query: "${err.query}"`);
    });
    if (validationErrors.length > 5) {
      console.error(`   ... and ${validationErrors.length - 5} more errors`);
    }
    process.exit(1);
  }
  
  console.log('✓ Query substitution validated - all queries use correct city names');
  
  // Save test matrix
  const outputDir = path.join(__dirname, 'results');
  await fs.mkdir(outputDir, { recursive: true });
  
  const matrixPath = path.join(outputDir, 'test-matrix.json');
  await fs.writeFile(matrixPath, JSON.stringify(testMatrix, null, 2));
  console.log(`\n✓ Test matrix saved to: ${matrixPath}`);
  
  // Generate initial summary
  const summary = generateSummary(testMatrix);
  const summaryPath = path.join(outputDir, 'test-summary.json');
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`✓ Test summary saved to: ${summaryPath}`);
  
  console.log('\n' + '═'.repeat(70));
  console.log('TEST MATRIX READY - BATCH EXECUTION REQUIRED');
  console.log('═'.repeat(70));
  console.log('\nNext steps:');
  console.log('1. Run Batch 1: Validate test harness (Pandharpur, Pune, Mumbai)');
  console.log('2. Run Batch 2: Execute all state/UT tests');
  console.log('3. Run Batch 3: Fix failures and rerun');
  console.log('4. Run Batch 4: Final deployment verification');
  console.log('\nTest execution requires browser automation.');
  console.log('Use: node tests/batch-executor.mjs');
}

main().catch(console.error);
