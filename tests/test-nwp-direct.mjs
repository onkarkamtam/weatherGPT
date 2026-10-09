/**
 * Direct NWP Model Test
 */

import { fetchNWPForecast, fetchBothModels } from '../src/services/nwpService.js'

console.log('Testing NWP Models for Bangalore...\n')

const lat = 12.9716
const lon = 77.5946

try {
  console.log('1. Testing GFS/GRAPES model...')
  const gfs = await fetchNWPForecast({ lat, lon, model: 'gfs' })
  console.log('✅ GFS Success')
  console.log('   Provider:', gfs.provider)
  console.log('   Source:', gfs.source)
  console.log('   Hourly forecasts:', gfs.hourly?.length || 0)
  if (gfs.hourly?.length > 0) {
    console.log('   First forecast:', gfs.hourly[0].time, gfs.hourly[0].temp + '°C')
  }
} catch (error) {
  console.log('❌ GFS Failed:', error.message)
}

console.log()

try {
  console.log('2. Testing ECMWF IFS model...')
  const ecmwf = await fetchNWPForecast({ lat, lon, model: 'ecmwf' })
  console.log('✅ ECMWF Success')
  console.log('   Provider:', ecmwf.provider)
  console.log('   Source:', ecmwf.source)
  console.log('   Hourly forecasts:', ecmwf.hourly?.length || 0)
  if (ecmwf.hourly?.length > 0) {
    console.log('   First forecast:', ecmwf.hourly[0].time, ecmwf.hourly[0].temp + '°C')
  }
} catch (error) {
  console.log('❌ ECMWF Failed:', error.message)
}

console.log()

try {
  console.log('3. Testing both models comparison...')
  const both = await fetchBothModels({ lat, lon })
  console.log('✅ Both Models Success')
  console.log('   GFS available:', !!both.gfs)
  console.log('   ECMWF available:', !!both.ecmwf)
  
  if (both.gfs && both.ecmwf) {
    console.log('\n   Comparison:')
    console.log('   GFS first forecast:', both.gfs.hourly?.[0]?.temp + '°C')
    console.log('   ECMWF first forecast:', both.ecmwf.hourly?.[0]?.temp + '°C')
    
    if (both.gfs.hourly?.[0] && both.ecmwf.hourly?.[0]) {
      const diff = Math.abs(both.gfs.hourly[0].temp - both.ecmwf.hourly[0].temp)
      console.log('   Temperature difference:', diff.toFixed(1) + '°C')
    }
  }
} catch (error) {
  console.log('❌ Both Models Failed:', error.message)
  console.error(error)
}
