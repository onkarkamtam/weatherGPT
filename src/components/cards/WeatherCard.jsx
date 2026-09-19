/**
 * WeatherCard — Displays current weather conditions inside the chat.
 * Designed to be clear and actionable for non-technical users.
 */
import { Droplets, Wind, Thermometer, CloudRain } from 'lucide-react'

const CONDITION_EMOJI = {
  'sunny':         '☀️',
  'clear':         '🌙',
  'partly-cloudy': '⛅',
  'cloudy':        '☁️',
  'rain':          '🌧️',
  'heavy-rain':    '⛈️',
  'thunderstorm':  '🌩️',
  'fog':           '🌫️',
  'snow':          '❄️',
  'windy':         '💨',
}

/** @param {{ data: import('@/data/mockResponses').WeatherData, isPeriod?: boolean }} */
export default function WeatherCard({ data, isPeriod = false }) {
  const emoji = CONDITION_EMOJI[data.conditionCode] ?? '🌤️'

  return (
    <div className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-card-hover overflow-hidden animate-slide-up">
      {/* Period label if this is a time-period forecast */}
      {isPeriod && data.period && (
        <div className="px-5 pt-4 pb-2">
          <p className="text-sm font-semibold text-sky-100 uppercase tracking-wide">
            {data.period}
          </p>
        </div>
      )}
      
      {/* Main temp row */}
      <div className={`px-5 ${isPeriod ? 'pt-2' : 'pt-5'} pb-3 flex items-start justify-between`}>
        <div>
          {isPeriod && data.minTemperature !== undefined && data.maxTemperature !== undefined ? (
            <>
              <p className="text-5xl font-bold tracking-tight">{data.temperature}°</p>
              <p className="text-sky-100 text-sm mt-1">{data.minTemperature}° - {data.maxTemperature}°</p>
              <p className="text-sky-100 font-medium mt-1">{data.condition}</p>
            </>
          ) : (
            <>
              <p className="text-5xl font-bold tracking-tight">{data.temp}°</p>
              <p className="text-sky-100 font-medium mt-1">{data.condition}</p>
            </>
          )}
        </div>
        <span className="text-6xl leading-none">{emoji}</span>
      </div>

      {/* Stats row */}
      <div className="px-5 pb-4 grid grid-cols-3 gap-2">
        {!isPeriod && <Stat icon={<Thermometer size={15} />} label="Feels like" value={`${data.feelsLike}°`} />}
        {isPeriod && <Stat icon={<Thermometer size={15} />} label="Avg temp" value={`${data.temperature}°`} />}
        <Stat icon={<Droplets size={15} />}    label="Humidity"   value={`${data.humidity}%`} />
        <Stat icon={<Wind size={15} />}        label="Wind"       value={`${data.wind || data.windSpeed} km/h`} />
      </div>

      {/* Rain chance banner */}
      {(data.rainChance !== undefined || data.precipitationProbability !== undefined) && (
        <div className="mx-3 mb-3 rounded-2xl bg-white/15 px-4 py-2.5 flex items-center gap-2.5">
          <CloudRain size={18} className="text-sky-200 shrink-0" />
          <p className="text-sm font-medium text-sky-50">
            <span className="font-bold text-white">{data.rainChance || data.precipitationProbability}% chance of rain</span>
          </p>
        </div>
      )}

      {/* Summary */}
      {data.summary && (
        <div className="mx-3 mb-4 rounded-2xl bg-sky-900/30 px-4 py-3">
          <p className="text-sm text-sky-100 leading-relaxed">{data.summary}</p>
        </div>
      )}
    </div>
  )
}

function Stat({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 px-2 py-2 flex flex-col items-center gap-1">
      <span className="text-sky-200">{icon}</span>
      <p className="text-xs text-sky-200">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  )
}
