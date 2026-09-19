/**
 * ClimateTrendCard — Displays long-term climate trend analysis
 *
 * Shows temperature and rainfall trends over 5 or 10 years.
 * Compact version optimised for 1366x768 / 1440x900 desktop viewports.
 * All data preserved; padding, chart height, and section spacing reduced.
 *
 * IMPORTANT: Does NOT make causal climate change claims.
 */
import { TrendingUp, TrendingDown, Minus, Droplets, Thermometer, Calendar } from 'lucide-react'

function SimpleLineChart({ data, label, unit, color = 'blue' }) {
  if (!data || data.length === 0) return null

  const values = data.map(d => d.value)
  const years  = data.map(d => d.year)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range  = maxVal - minVal || 1

  const W = 100, H = 40, P = 5
  const pw = W - P * 2, ph = H - P * 2

  const points = data.map((d, i) => {
    const x = P + (i / (data.length - 1)) * pw
    const y = P + (ph - ((d.value - minVal) / range) * ph)
    return `${x},${y}`
  }).join(' ')

  const stroke = { blue: 'stroke-blue-500', orange: 'stroke-orange-500', green: 'stroke-green-500', purple: 'stroke-purple-500' }

  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-gray-700">{label}</p>
      <div className="bg-white rounded-lg p-2 border border-gray-200">
        <div className="w-full" style={{ height: '68px' }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <line x1={P} y1={H/2} x2={W-P} y2={H/2} stroke="#e5e7eb" strokeWidth="0.5" />
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className={stroke[color]} />
            {data.map((d, i) => {
              const x = P + (i / (data.length - 1)) * pw
              const y = P + (ph - ((d.value - minVal) / range) * ph)
              return <circle key={i} cx={x} cy={y} r="2.5" fill="currentColor" className={stroke[color]} />
            })}
          </svg>
        </div>
        <div className="flex justify-between mt-0.5 text-xs text-gray-500 px-0.5">
          <span>{years[0]}</span>
          {years.length > 5 && <span className="hidden sm:inline">{years[Math.floor(years.length / 2)]}</span>}
          <span>{years[years.length - 1]}</span>
        </div>
        <div className="text-xs text-gray-500 text-center">
          Range: {minVal.toFixed(1)}–{maxVal.toFixed(1)} {unit}
        </div>
      </div>
    </div>
  )
}

function TrendIcon({ direction }) {
  if (direction === 'increasing') return <TrendingUp size={13} className="text-red-500" />
  if (direction === 'decreasing') return <TrendingDown size={13} className="text-blue-500" />
  return <Minus size={13} className="text-gray-500" />
}

export default function ClimateTrendCard({ data, location }) {
  const { period, yearlyData, trends, summary } = data

  const tempData   = yearlyData.map(d => ({ year: d.year, value: d.avgTemp }))
  const precipData = yearlyData.map(d => ({ year: d.year, value: d.totalPrecip }))

  return (
    <div className="w-full max-w-2xl rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 shadow-card overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold">Climate Trend Analysis</h3>
            <p className="text-emerald-100 text-xs mt-0.5">{location}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-emerald-200">Historical Data</p>
            <p className="text-xs text-emerald-200">{period.years}-Year Analysis</p>
          </div>
        </div>
        <div className="mt-1.5 flex gap-1.5">
          <span className="px-2 py-0.5 bg-white/20 rounded-md text-xs text-emerald-100 flex items-center gap-1">
            <Calendar size={11} />
            {period.startYear}–{period.endYear}
          </span>
        </div>
      </div>

      {/* Observed Trends */}
      <div className="px-4 py-2 border-b border-emerald-100">
        <h4 className="text-xs font-semibold text-gray-700 mb-1.5">Observed Trends</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-lg p-2 border border-gray-200">
            <div className="flex items-center gap-1.5 mb-1">
              <Thermometer size={13} className="text-orange-500" />
              <span className="text-xs font-medium text-gray-700">Temperature</span>
              <TrendIcon direction={trends.temperature.direction} />
            </div>
            <p className="text-lg font-bold text-gray-900 leading-none">{summary.avgTemp}°C</p>
            <p className="text-xs text-gray-500 mt-0.5">{period.years}-yr avg</p>
            {trends.temperature.change !== 0 && (
              <p className="text-xs text-gray-500">{trends.temperature.change > 0 ? '+' : ''}{trends.temperature.change}°C change</p>
            )}
          </div>
          <div className="bg-white rounded-lg p-2 border border-gray-200">
            <div className="flex items-center gap-1.5 mb-1">
              <Droplets size={13} className="text-blue-500" />
              <span className="text-xs font-medium text-gray-700">Rainfall</span>
              <TrendIcon direction={trends.precipitation.direction} />
            </div>
            <p className="text-lg font-bold text-gray-900 leading-none">{summary.avgPrecip}mm</p>
            <p className="text-xs text-gray-500 mt-0.5">{period.years}-yr avg</p>
            {trends.precipitation.change !== 0 && (
              <p className="text-xs text-gray-500">{trends.precipitation.change > 0 ? '+' : ''}{trends.precipitation.change}mm change</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="px-4 py-2 space-y-2">
        <SimpleLineChart data={tempData}   label="Annual Average Temperature" unit="°C" color="orange" />
        <SimpleLineChart data={precipData} label="Annual Total Rainfall"       unit="mm" color="blue"   />
      </div>

      {/* Notable Years */}
      <div className="px-4 py-2 bg-gray-50 border-t border-emerald-100">
        <h4 className="text-xs font-semibold text-gray-700 mb-1.5">Notable Years</h4>
        <div className="grid grid-cols-4 gap-1.5 text-xs">
          <div>
            <p className="text-gray-500">Warmest</p>
            <p className="font-semibold text-gray-900">{summary.maxYear.year}: {summary.maxYear.avgTemp}°C</p>
          </div>
          <div>
            <p className="text-gray-500">Coolest</p>
            <p className="font-semibold text-gray-900">{summary.minYear.year}: {summary.minYear.avgTemp}°C</p>
          </div>
          <div>
            <p className="text-gray-500">Wettest</p>
            <p className="font-semibold text-gray-900">{summary.wettest.year}: {summary.wettest.totalPrecip}mm</p>
          </div>
          <div>
            <p className="text-gray-500">Driest</p>
            <p className="font-semibold text-gray-900">{summary.driest.year}: {summary.driest.totalPrecip}mm</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 bg-gray-50 text-xs text-gray-500 border-t border-emerald-100">
        <span className="font-medium">Source:</span> ERA5 Historical Weather via Open-Meteo · Trends without causal attribution.
      </div>
    </div>
  )
}
