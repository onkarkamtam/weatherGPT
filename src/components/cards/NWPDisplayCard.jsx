/**
 * NWPDisplayCard — Display-only NWP forecast card for chat messages
 * 
 * Unlike NWPForecastCard (which fetches data), this component displays
 * pre-fetched NWP data passed from ChatScreen.
 */
import { Cloud, Droplets, Wind, Thermometer, Calendar, AlertCircle } from 'lucide-react'
import { getModelInfo } from '../../services/nwpService'

/**
 * Single NWP model display
 */
function SingleModelDisplay({ data }) {
  const modelInfo = getModelInfo(data.model.name.toLowerCase().includes('gfs') ? 'gfs' : 'ecmwf')
  
  // Get first 24 hours for summary
  const summary24h = data.forecast.slice(0, 24)
  
  // Calculate summary stats
  const temps = summary24h.map(f => f.temperature).filter(t => t != null)
  const precips = summary24h.map(f => f.precipitation || 0)
  const winds = summary24h.map(f => f.windSpeed).filter(w => w != null)
  const humidities = summary24h.map(f => f.humidity).filter(h => h != null)

  const avgTemp = temps.length > 0 ? Math.round(temps.reduce((a, b) => a + b) / temps.length) : 0
  const minTemp = temps.length > 0 ? Math.round(Math.min(...temps)) : 0
  const maxTemp = temps.length > 0 ? Math.round(Math.max(...temps)) : 0
  const totalPrecip = Math.round(precips.reduce((a, b) => a + b) * 10) / 10
  const rainHours = precips.filter(p => p > 0.1).length
  const avgWind = winds.length > 0 ? Math.round(winds.reduce((a, b) => a + b) / winds.length) : 0
  const maxWind = winds.length > 0 ? Math.round(Math.max(...winds)) : 0
  const avgHumidity = humidities.length > 0 ? Math.round(humidities.reduce((a, b) => a + b) / humidities.length) : 0

  return (
    <div className="w-full max-w-xl rounded-3xl bg-gradient-to-br from-indigo-50 to-blue-50 shadow-card overflow-hidden">
      {/* Model header - compact */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold">{data.model.name}</h3>
            <p className="text-indigo-100 text-xs mt-0.5">{data.model.provider}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-indigo-200">NWP Forecast</p>
            <p className="text-xs text-indigo-200 mt-0.5">{data.location.name}</p>
          </div>
        </div>
        
        <div className="mt-2 flex gap-2 text-xs text-indigo-100 flex-wrap">
          <span className="px-2 py-1 bg-white/20 rounded-md">
            {data.model.resolution}
          </span>
          <span className="px-2 py-1 bg-white/20 rounded-md">
            {data.model.forecastHorizon} day horizon
          </span>
          <span className="px-2 py-1 bg-white/20 rounded-md">
            {data.forecast.length}h forecast
          </span>
        </div>
      </div>

      {/* Summary stats - compact */}
      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-b border-indigo-100">
        <StatBox
          icon={<Thermometer size={16} />}
          label="Avg Temp"
          value={`${avgTemp}°C`}
          subtext={`${minTemp}° - ${maxTemp}°`}
        />
        <StatBox
          icon={<Droplets size={16} />}
          label="Total Rain"
          value={`${totalPrecip}mm`}
          subtext={`${rainHours}h precip`}
        />
        <StatBox
          icon={<Wind size={16} />}
          label="Avg Wind"
          value={`${avgWind} km/h`}
          subtext={`Max ${maxWind}`}
        />
        <StatBox
          icon={<Cloud size={16} />}
          label="Humidity"
          value={`${avgHumidity}%`}
          subtext="Average"
        />
      </div>

      {/* Hourly forecast (first 12 hours) - compact */}
      <div className="px-4 py-3">
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <Calendar size={14} />
          Next 12 Hours
        </h4>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {data.forecast.slice(0, 12).map((forecast, idx) => (
            <HourlyForecastRow key={idx} forecast={forecast} />
          ))}
        </div>
      </div>

      {/* Footer - compact */}
      <div className="px-4 py-2.5 bg-gray-50 text-xs text-gray-600">
        <p>
          <span className="font-medium">Generated:</span>{' '}
          {new Date(data.generatedAt).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
        <p className="mt-1">
          <span className="font-medium">Source:</span> {data.model.fullName} via Open-Meteo.com
        </p>
      </div>
    </div>
  )
}

/**
 * Model comparison display
 */
function ComparisonDisplay({ gfs, ecmwf, errors }) {
  return (
    <div className="w-full max-w-3xl space-y-3">
      <h3 className="text-base font-semibold text-gray-900 px-2">NWP Model Comparison</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {gfs && <SingleModelDisplay data={gfs} />}
        {gfs === null && errors.gfs && (
          <ModelErrorCard model="gfs" error={errors.gfs} />
        )}
        
        {ecmwf && <SingleModelDisplay data={ecmwf} />}
        {ecmwf === null && errors.ecmwf && (
          <ModelErrorCard model="ecmwf" error={errors.ecmwf} />
        )}
      </div>
      <ModelComparisonNotes />
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
          {forecast.temperature != null ? `${Math.round(forecast.temperature)}°C` : '—'}
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
 * Model error card
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
 * Main component
 */
export default function NWPDisplayCard({ data, comparison = false }) {
  if (comparison) {
    // Comparison mode: data = { gfs, ecmwf, errors }
    return <ComparisonDisplay {...data} />
  } else {
    // Single model mode: data = nwp forecast data
    return <SingleModelDisplay data={data} />
  }
}

