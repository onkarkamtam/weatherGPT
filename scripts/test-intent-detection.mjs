/**
 * Test intent detection for the routing issue
 */

// Simplified intent detection based on weatherIntent.js
function isIMDWarningIntent(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.toLowerCase().trim();

  const warningKeywords = /\b(warning|alert|advisory|caution|notice|bulletin|imd|india\s+meteorological|official|government)\b/i;
  const weatherKeywords = /\b(weather|storm|rain|cyclone|flood|heat|cold|wind|fog|thunderstorm)\b/i;

  // Direct warning questions
  if (/\b(any|are\s+there|show|check|get)\s+(weather\s+)?(warning|alert|advisory|imd)/i.test(trimmed)) {
    return true;
  }

  return warningKeywords.test(trimmed) && weatherKeywords.test(trimmed);
}

function isWeatherIntent(text) {
  if (!text || typeof text !== 'string') return false;
  
  // Direct weather keywords
  const weatherTerms = /\b(weather|temperature|temp|forecast|rain|raining|sunny|cloudy|hot|cold|humid|wind|windy|climate|mausam|havaaman)/i;
  const locationTerms = /\b(in|at|for|of)\s+[A-Z]/;
  
  return weatherTerms.test(text);
}

// Test queries
const queries = [
  "What's the weather in Pune right now?",
  "What is the latest official IMD weather warning for Pune?",
  "What's the temperature in Mumbai?",
  "Show me IMD warnings",
  "Will it rain tomorrow in Delhi?",
];

console.log('Intent Detection Test\n');
console.log('='.repeat(70));

queries.forEach(query => {
  const isIMD = isIMDWarningIntent(query);
  const isWeather = isWeatherIntent(query);
  
  console.log(`\nQuery: "${query}"`);
  console.log(`  isIMDWarningIntent: ${isIMD}`);
  console.log(`  isWeatherIntent: ${isWeather}`);
  console.log(`  Expected path: ${isIMD ? 'IMD' : 'Normal Weather'}`);
});

console.log('\n' + '='.repeat(70));
