/**
 * Test script to verify historical weather date calculations
 * Run: node scripts/test-historical-dates.mjs
 */

// Simulate the date calculation logic
function calculateDateRanges(daysBack = 30) {
  const today = new Date()
  const thisYearEnd = new Date(today)
  thisYearEnd.setHours(0, 0, 0, 0)
  // Subtract 5 days to account for ERA5 data availability delay
  thisYearEnd.setDate(thisYearEnd.getDate() - 5)
  
  const thisYearStart = new Date(thisYearEnd)
  thisYearStart.setDate(thisYearStart.getDate() - daysBack)

  const lastYearEnd = new Date(thisYearEnd)
  lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1)
  const lastYearStart = new Date(thisYearStart)
  lastYearStart.setFullYear(lastYearStart.getFullYear() - 1)

  const formatDate = (date) => date.toISOString().split('T')[0]

  return {
    today: formatDate(today),
    thisYear: {
      start: formatDate(thisYearStart),
      end: formatDate(thisYearEnd),
      year: thisYearEnd.getFullYear(),
    },
    lastYear: {
      start: formatDate(lastYearStart),
      end: formatDate(lastYearEnd),
      year: lastYearEnd.getFullYear(),
    },
  }
}

console.log('Historical Weather Date Calculation Test\n')
console.log('=' .repeat(60))

const dates = calculateDateRanges(30)

console.log('\n📅 Today:', dates.today)
console.log('\n📊 This Year Comparison:')
console.log('  Period:', `${dates.thisYear.start} to ${dates.thisYear.end}`)
console.log('  Year:', dates.thisYear.year)
console.log('  Days:', 30)

console.log('\n📊 Last Year Comparison:')
console.log('  Period:', `${dates.lastYear.start} to ${dates.lastYear.end}`)
console.log('  Year:', dates.lastYear.year)
console.log('  Days:', 30)

console.log('\n✅ Verification:')
const todayDate = new Date(dates.today)
const thisEndDate = new Date(dates.thisYear.end)
const daysDiff = Math.floor((todayDate - thisEndDate) / (1000 * 60 * 60 * 24))
console.log(`  Days between today and comparison end: ${daysDiff} days`)
console.log(`  Expected: 5 days (ERA5 delay) - ${daysDiff === 5 ? '✅ PASS' : '❌ FAIL'}`)

const yearDiff = dates.thisYear.year - dates.lastYear.year
console.log(`  Year difference: ${yearDiff} year(s) - ${yearDiff === 1 ? '✅ PASS' : '❌ FAIL'}`)

console.log('\n🔗 Sample API URLs:')
const lat = 19.0760 // Mumbai
const lon = 72.8777

const thisYearUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dates.thisYear.start}&end_date=${dates.thisYear.end}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,rain_sum,weather_code&timezone=auto`

const lastYearUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dates.lastYear.start}&end_date=${dates.lastYear.end}&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,rain_sum,weather_code&timezone=auto`

console.log('\n  This Year:')
console.log(`  ${thisYearUrl}`)
console.log('\n  Last Year:')
console.log(`  ${lastYearUrl}`)

console.log('\n' + '='.repeat(60))
console.log('\n💡 To test manually:')
console.log('  1. Copy one of the URLs above')
console.log('  2. Paste into browser')
console.log('  3. Verify JSON response has "daily" object')
console.log('  4. Check arrays have ~30 data points')
console.log('  5. Verify no error messages\n')
