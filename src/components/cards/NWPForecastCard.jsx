/**
 * NWPForecastCard — Displays explicit NWP model forecasts
 * 
 * Shows forecasts from numerical weather prediction models:
 * - CMA GFS GRAPES
 * - ECMWF IFS
 * 
 * Clearly labels the model name and provider to distinguish from
 * generic weather forecasts.
 */
import { useState, useEffect } from 'react'
import { Cloud, Droplets, Wind, Thermometer, Calendar, AlertCircle } from 'lucide-react'
import { fetchNWPForecast, fetchBothModels, getModelInfo, NWP_MODELS, NWPServiceError } from '../../services/nwpService'
import Spinner from '../ui/Spinner'

/**
 * @typedef {Object} NWPForecastCardProps
 * @property {Object} location - Location object with lat, lon, label
 * @property {number} location.lat
 * @property {number} location.lon
 * @property {string} location.label
 * @property {string} [initialModel] - Initial model: 'gfs' or 'ecmwf'
 * @property {boolean} [showComparison] - Show both models side-by-side
 * @property {number} [days] - Forecast days (default: 7)
 */

/** @param {NWPForecastCardProps} */
export default function NWPForecastCard({ 
  location, 
  initialModel = NWP_MODELS.ECMWF_IFS,
  showComparison = false,
  days = 7 
}) {
  const [selectedModel, setSelectedModel] = useState(initialModel)
  const [forecastData, setForecastData] = useState(null)
  const [comparisonData, setComparisonData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!location?.lat || !location?.lon) {
      setError('Location coordinates not available')
      setLoading(false)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        if (showComparison) {
          // Fetch both models
          const results = await fetchBothModels({
            lat: location.lat,
            lon: location.lon,
            days,
          })

          if (!results.gfs && !results.ecmwf) {
            throw new NWPServiceError('Failed to fetch both models. Please try again.')
          }

          setComparisonData(results)
          setForecastData(null)
        } else {
          // Fetch single model
          const data = await fetchNWPForecast({
            lat: location.lat,
            lon: location.lon,
            model: selectedModel,
            days,
          })

          setForecastData(data)
          setComparisonData(null)
        }
      } catch (err) {
        console.error('[NWP Card] Error:', err)
        setError(err.message || 'Failed to load NWP forecast')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [location, selectedModel, showComparison, days])

  if (loading) {
    return (
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-card p-6">
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Spinner />
          <p className="text-sm text-gray-600">Loading NWP forecast...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-card p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-gray-900">Unable to load NWP forecast</p>
            <p className="text-sm text-gray-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (showComparison && comparisonData) {
    return (
      <div className="w-full max-w-4xl space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 px-2">NWP Model Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {comparisonData.gfs && (
            <SingleModelCard data={comparisonData.gfs} location={location} />
          )}
          {comparisonData.gfs === null && comparisonData.errors.gfs && (
            <ModelErrorCard model="gfs" error={comparisonData.errors.gfs} />
          )}
          
          {comparisonData.ecmwf && (
            <SingleModelCard data={comparisonData.ecmwf} location={location} />
          )}
          {comparisonData.ecmwf === null && comparisonData.errors.ecmwf && (
            <ModelErrorCard model="ecmwf" error={comparisonData.errors.ecmwf} />
          )}
        </div>
        <ModelComparisonNotes />
      </div>
    )
  }

  if (forecastData) {
    return (
      <div className="w-full max-w-2xl space-y-3">
        {!showComparison && (
          <ModelSelector
            selectedModel={selectedModel}
            onSelect={setSelectedModel}
          />
        )}
        <SingleModelCard data={forecastData} location={location} showFull />
      </div>
    )
  }

  return null
}

/**
 * Model selector buttons
 */
function ModelSelector({ selectedModel, onSelect }) {
  const models = [
    { key: NWP_MODELS.ECMWF_IFS, ...getModelInfo(NWP_MODELS.ECMWF_IFS) },
    { key: NWP_MODELS.GFS_GRAPES, ...getModelInfo(NWP_MODELS.GFS_GRAPES) },
  ]

  return (
    <div className="flex gap-2 flex-wrap">
      {models.map((model) => (
        <button
          key={model.key}
          onClick={() => onSelect(model.key)}
          className={`
            px-4 py-2 rounded-xl font-medium text-sm transition-all
            ${selectedModel === model.key
              ? 'bg-sky-500 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          {model.name}
        </button>
      ))}
    </div>
  )
}

/**
 * Single model forecast card
 */
function SingleModelCard({ data, location, showFull = false }) {
  const modelInfo = getModelInfo(data.model.name.toLowerCase().includes('gfs') ? 'gfs' : 'ecmwf')
  
  // Get key forecast points (next 24-48 hours)
  const keyForecasts = showFull 
    ? getKeyForecasts(data.forecast, 48) 
    : getKeyForecasts(data.forecast, 24)

  // Calculate summary stats
  const stats = calculateSummaryStats(data.forecast.slice(0, 24))

  return (
    <div className="w-full rounded-3xl bg-gradient-to-br from-indigo-50 to-blue-50 shadow-card overflow-hidden">
      {/* Model header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-5 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold">{data.model.name}</h3>
            <p className="text-indigo-100 text-sm mt-0.5">{data.model.provider}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-indigo-200">NWP Forecast</p>
            <p className="text-xs text-indigo-200 mt-0.5">{location.label}</p>
          </div>
        </div>
        
        <div className="mt-3 flex gap-2 text-xs text-indigo-100">
          <span className="px-2 py-1 bg-white/20 rounded-md">
            {data.model.resolution}
          </span>
          <span className="px-2 py-1 bg-white/20 rounded-md">
            {data.model.forecastHorizon} day horizon
          </span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-indigo-100">
        <StatBox
          icon={<Thermometer size={16} />}
          label="Avg Temp"
          value={`${stats.avgTemp}°C`}
          subtext={`${stats.minTemp}° - ${stats.maxTemp}°`}
        />
        <StatBox
          icon={<Droplets size={16} />}
          label="Total Rain"
          value={`${stats.totalPrecip}mm`}
          subtext={`${stats.rainHours}h precipitation`}
        />
        <StatBox
          icon={<Wind size={16} />}
          label="Avg Wind"
          value={`${stats.avgWind} km/h`}
          subtext={`Max ${stats.maxWind} km/h`}
        />
        <StatBox
          icon={<Cloud size={16} />}
          label="Humidity"
          value={`${stats.avgHumidity}%`}
          subtext={`${stats.minHumidity}% - ${stats.maxHumidity}%`}
        />
      </div>

      {/* Hourly forecast timeline */}
      <div className="px-5 py-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Calendar size={14} />
          Next {keyForecasts.length} Hours
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {keyForecasts.map((forecast, idx) => (
            <HourlyForecastRow key={idx} forecast={forecast} />
          ))}
        </div>
      </div>

      {/* Footer with model info */}
      <div className="px-5 py-3 bg-gray-50 text-xs text-gray-600">
        <p>
          <span className="font-medium">Generated:</span>{' '}
          {new Date(data.generatedAt).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
        <p className="mt-1">
          <span className="font-medium">Data source:</span> {data.model.fullName} via Open-Meteo.com
        </p>
      </div>
    </div>
  )
}

/**
 * Stat box component
 */
function StatBox({ icon, label, value, subtext }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1.5 text-indigo-600 mb-1">
        {icon}
        <span className="text-xs font-medium text-gray-600">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {subtext && <p className="text-xs text-gray-500 mt-0.5">{subtext}</p>}
    </div>
  )
}

/**
 * Hourly forecast row
 */
function HourlyForecastRow({ forecast }) {
  const time = new Date(forecast.time)
  const timeStr = time.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-white/60 rounded-lg text-sm">
      <span className="text-gray-700 font-medium min-w-[120px]">{timeStr}</span>
      <div className="flex items-center gap-4 text-gray-600">
        <span className="flex items-center gap-1">
          <Thermometer size={14} />
          {forecast.temperature ? `${Math.round(forecast.temperature)}°C` : '—'}
        </span>
        <span className="flex items-center gap-1">
          <Droplets size={14} />
          {forecast.precipitation != null ? `${forecast.precipitation.toFixed(1)}mm` : '—'}
        </span>
        <span className="flex items-center gap-1">
          <Wind size={14} />
          {forecast.windSpeed ? `${Math.round(forecast.windSpeed)} km/h` : '—'}
        </span>
      </div>
    </div>
  )
}

/**
 * Model error card (for comparison view)
 */
function ModelErrorCard({ model, error }) {
  const modelInfo = getModelInfo(model)

  return (
    <div className="w-full rounded-3xl bg-gray-50 shadow-card p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={20} />
        <div>
          <p className="font-semibold text-gray-900">{modelInfo.name} Unavailable</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Model comparison notes
 */
function ModelComparisonNotes() {
  return (
    <div className="px-4 py-3 bg-blue-50 rounded-xl text-sm text-gray-700">
      <p className="font-medium text-gray-900 mb-1">About Model Differences</p>
      <p className="text-xs text-gray-600 leading-relaxed">
        Different NWP models may show varying predictions due to different resolutions, 
        initialization data, and physics parameterizations. Differences are normal and 
        represent forecast uncertainty. Neither model is definitively "correct" — both 
        provide valuable insights into possible weather developments.
      </p>
    </div>
  )
}

/**
 * Helper: Get key forecast points (every N hours)
 */
function getKeyForecasts(allForecasts, hours = 24) {
  if (!allForecasts || allForecasts.length === 0) return []
  
  // Take hourly data up to specified hours
  return allForecasts.slice(0, Math.min(hours, allForecasts.length))
}

/**
 * Helper: Calculate summary statistics for first 24 hours
 */
function calculateSummaryStats(forecasts) {
  if (!forecasts || forecasts.length === 0) {
    return {
      avgTemp: 0,
      minTemp: 0,
      maxTemp: 0,
      totalPrecip: 0,
      rainHours: 0,
      avgWind: 0,
      maxWind: 0,
      avgHumidity: 0,
      minHumidity: 0,
      maxHumidity: 0,
    }
  }

  const temps = forecasts.map(f => f.temperature).filter(t => t != null)
  const precips = forecasts.map(f => f.precipitation || 0)
  const winds = forecasts.map(f => f.windSpeed).filter(w => w != null)
  const humidities = forecasts.map(f => f.humidity).filter(h => h != null)

  return {
    avgTemp: temps.length > 0 ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : 0,
    minTemp: temps.length > 0 ? Math.round(Math.min(...temps)) : 0,
    maxTemp: temps.length > 0 ? Math.round(Math.max(...temps)) : 0,
    totalPrecip: Math.round(precips.reduce((a, b) => a + b, 0) * 10) / 10,
    rainHours: precips.filter(p => p > 0.1).length,
    avgWind: winds.length > 0 ? Math.round(winds.reduce((a, b) => a + b, 0) / winds.length) : 0,
    maxWind: winds.length > 0 ? Math.round(Math.max(...winds)) : 0,
    avgHumidity: humidities.length > 0 ? Math.round(humidities.reduce((a, b) => a + b, 0) / humidities.length) : 0,
    minHumidity: humidities.length > 0 ? Math.round(Math.min(...humidities)) : 0,
    maxHumidity: humidities.length > 0 ? Math.round(Math.max(...humidities)) : 0,
  }
}

