/**
 * HistoricalComparisonCard — Displays historical weather comparison analysis.
 * 
 * Shows climate data comparing current period with same period last year.
 * Uses real ERA5 reanalysis data from Open-Meteo Historical Weather API.
 * 
 * Phase 6 Final: SIH 2026 enhancement
 */
import { TrendingUp, TrendingDown, Minus, Calendar, Droplets, Thermometer } from 'lucide-react'

/**
 * Format number to 1 decimal place, handling floating-point precision issues
 */
function formatDecimal(value, decimals = 1) {
  return Number(value.toFixed(decimals))
}

/**
 * @param {{
 *   data: {
 *     thisYear: { avgTemp, avgMax, avgMin, totalPrecip, rainyDays, year, period },
 *     lastYear: { avgTemp, avgMax, avgMin, totalPrecip, rainyDays, year, period },
 *     comparison: { tempDiff, tempTrend, precipDiff, precipTrend, summary }
 *   }
 * }} props
 */
export default function HistoricalComparisonCard({ data }) {
  if (!data) return null

  const { thisYear, lastYear, comparison } = data

  // Trend icon helper
  const TrendIcon = ({ diff, threshold = 0 }) => {
    if (diff > threshold) return <TrendingUp size={16} className="text-red-500" />
    if (diff < -threshold) return <TrendingDown size={16} className="text-blue-500" />
    return <Minus size={16} className="text-slate-400" />
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card max-w-md">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <Calendar size={20} />
          <h3 className="font-semibold text-base">Climate Comparison</h3>
        </div>
        <p className="text-xs text-indigo-100 mt-1">
          Historical weather analysis using ERA5 data
        </p>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
        <p className="text-sm text-indigo-900 leading-relaxed">
          <span className="font-semibold">Past {thisYear.daysAnalyzed} days:</span> {comparison.summary}
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="p-4 space-y-3">
        {/* Temperature Comparison */}
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer size={16} className="text-slate-600" />
            <h4 className="font-semibold text-sm text-slate-700">Temperature</h4>
            <TrendIcon diff={comparison.tempDiff} threshold={0.5} />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">This Year ({thisYear.year})</p>
              <div className="space-y-0.5">
                <p className="text-sm">
                  <span className="font-semibold text-slate-800">{thisYear.avgTemp}°C</span>
                  <span className="text-xs text-slate-500"> avg</span>
                </p>
                <p className="text-xs text-slate-600">
                  {thisYear.avgMin}°C – {thisYear.avgMax}°C range
                </p>
              </div>
            </div>
            
            <div>
              <p className="text-xs text-slate-500 mb-1">Last Year ({lastYear.year})</p>
              <div className="space-y-0.5">
                <p className="text-sm">
                  <span className="font-semibold text-slate-800">{lastYear.avgTemp}°C</span>
                  <span className="text-xs text-slate-500"> avg</span>
                </p>
                <p className="text-xs text-slate-600">
                  {lastYear.avgMin}°C – {lastYear.avgMax}°C range
                </p>
              </div>
            </div>
          </div>

          {Math.abs(comparison.tempDiff) >= 0.5 && (
            <div className={`mt-2 px-2 py-1 rounded text-xs font-medium ${
              comparison.tempDiff > 0 
                ? 'bg-red-100 text-red-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {comparison.tempDiff > 0 ? '↑' : '↓'} {formatDecimal(Math.abs(comparison.tempDiff))}°C {comparison.tempTrend}
            </div>
          )}
        </div>

        {/* Precipitation Comparison */}
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Droplets size={16} className="text-slate-600" />
            <h4 className="font-semibold text-sm text-slate-700">Rainfall</h4>
            <TrendIcon diff={comparison.precipDiff} threshold={10} />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">This Year ({thisYear.year})</p>
              <div className="space-y-0.5">
                <p className="text-sm">
                  <span className="font-semibold text-slate-800">{thisYear.totalPrecip}mm</span>
                  <span className="text-xs text-slate-500"> total</span>
                </p>
                <p className="text-xs text-slate-600">
                  {thisYear.rainyDays} rainy days
                </p>
              </div>
            </div>
            
            <div>
              <p className="text-xs text-slate-500 mb-1">Last Year ({lastYear.year})</p>
              <div className="space-y-0.5">
                <p className="text-sm">
                  <span className="font-semibold text-slate-800">{lastYear.totalPrecip}mm</span>
                  <span className="text-xs text-slate-500"> total</span>
                </p>
                <p className="text-xs text-slate-600">
                  {lastYear.rainyDays} rainy days
                </p>
              </div>
            </div>
          </div>

          {Math.abs(comparison.precipDiff) >= 10 && (
            <div className={`mt-2 px-2 py-1 rounded text-xs font-medium ${
              comparison.precipDiff > 0 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              {comparison.precipDiff > 0 ? '↑' : '↓'} {formatDecimal(Math.abs(comparison.precipDiff))}mm {comparison.precipTrend}
            </div>
          )}
        </div>

        {/* Most Common Conditions */}
        <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
          <div>
            <span className="text-slate-500">Most common:</span>{' '}
            <span className="font-medium">{thisYear.mostCommonCondition}</span>
          </div>
          <div className="text-slate-400">
            ERA5 reanalysis
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          Data source: Open-Meteo Historical Weather API using ERA5 reanalysis from ECMWF. 
          Compares the past {thisYear.daysAnalyzed} days with the same period last year.
        </p>
      </div>
    </div>
  )
}
