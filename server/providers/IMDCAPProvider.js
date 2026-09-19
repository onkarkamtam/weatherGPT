/**
 * IMDCAPProvider.js - Fetches real IMD weather alerts from the official
 * IMD CAP (Common Alerting Protocol) RSS feed.
 *
 * Source:  https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml
 * Status:  Public domain, no authentication required, no static IP required.
 *
 * This provider:
 *   1. Fetches the RSS index (lightweight, ~4 KB)
 *   2. Parses all alert items from the feed
 *   3. For each item, fetches the full CAP XML for structured fields
 *   4. Applies 10-minute server-side cache to avoid hammering S3
 *
 * IMPORTANT: Never creates fake/sample data.
 */

import https from 'https'
import http from 'http'

const CAP_RSS_URL    = 'https://cap-sources.s3.amazonaws.com/in-imd-en/rss.xml'
const FETCH_TIMEOUT  = 12000   // 12 seconds
const IMD_CAP_CACHE_TTL_MS = 10 * 60 * 1000  // 10 minutes

let _cachedAlerts = null  // { alerts, fetchedAt, expiresAt }

// --- Minimal XML helpers (no external deps) ---
function extractTag(xml, tag) {
  const patterns = [
    new RegExp('<cap:' + tag + '[^>]*>([\\s\\S]*?)<\\/cap:' + tag + '>', 'i'),
    new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'),
  ]
  for (const re of patterns) {
    const m = xml.match(re)
    if (m) return decodeXMLEntities(m[1].trim())
  }
  return null
}

function extractAllTags(xml, tag) {
  const results = []
  const re = new RegExp('<' + tag + '[\\s>][\\s\\S]*?<\\/' + tag + '>', 'gi')
  const matches = xml.match(re) || []
  for (const m of matches) results.push(m)
  return results
}

function decodeXMLEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    .trim()
}

// --- HTTP fetch helper ---
function fetchUrl(url, timeoutMs = FETCH_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https://') ? https : http
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'WeatherGPT/1.0 (IMD CAP reader)',
        'Accept': 'application/xml, text/xml, */*',
      },
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return fetchUrl(res.headers.location, timeoutMs).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error('HTTP ' + res.statusCode + ' from ' + url))
      }
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
      res.on('error', reject)
    })
    req.setTimeout(timeoutMs, () => {
      req.destroy()
      reject(new Error('Timeout fetching ' + url))
    })
    req.on('error', reject)
  })
}

// --- Parse RSS index ---
function parseRSSItems(rssXml) {
  const items = extractAllTags(rssXml, 'item')
  return items.map((itemXml) => ({
    title:       extractTag(itemXml, 'title'),
    description: extractTag(itemXml, 'description'),
    pubDate:     extractTag(itemXml, 'pubDate'),
    link:        extractTag(itemXml, 'link'),
  })).filter(item => item.link)
}

// --- Parse individual CAP XML ---
function parseCAPAlert(capXml) {
  return {
    event:       extractTag(capXml, 'event')       || null,
    severity:    extractTag(capXml, 'severity')    || null,
    certainty:   extractTag(capXml, 'certainty')   || null,
    urgency:     extractTag(capXml, 'urgency')     || null,
    onset:       extractTag(capXml, 'onset')       || null,
    expires:     extractTag(capXml, 'expires')     || null,
    headline:    extractTag(capXml, 'headline')    || null,
    description: extractTag(capXml, 'description') || null,
    instruction: extractTag(capXml, 'instruction') || null,
    areaDesc:    extractTag(capXml, 'areaDesc')    || null,
    polygon:     extractTag(capXml, 'polygon')     || null,
    senderName:  extractTag(capXml, 'senderName')  || 'NWFC DIVISION, IMD, NEW DELHI',
    sent:        extractTag(capXml, 'sent')        || null,
    status:      extractTag(capXml, 'status')      || null,
  }
}

// --- Main export: fetch all CAP alerts ---
export async function fetchIMDCAPAlerts() {
  const now = Date.now()

  if (_cachedAlerts && now < _cachedAlerts.expiresAt) {
    console.log('[IMD CAP] Using cached data')
    return {
      alerts:       _cachedAlerts.alerts,
      fetchedAt:    _cachedAlerts.fetchedAt,
      sourceStatus: 'CACHED',
      source:       'India Meteorological Department (IMD) CAP',
      sourceUrl:    CAP_RSS_URL,
    }
  }

  console.log('[IMD CAP] Fetching RSS')
  let rssXml
  try {
    rssXml = await fetchUrl(CAP_RSS_URL)
    console.log('[IMD CAP] RSS success (' + rssXml.length + ' bytes)')
  } catch (fetchErr) {
    console.error('[IMD CAP] RSS fetch failed:', fetchErr.message)
    if (_cachedAlerts) {
      console.warn('[IMD CAP] Serving stale cache after fetch failure')
      return {
        alerts:       _cachedAlerts.alerts,
        fetchedAt:    _cachedAlerts.fetchedAt,
        sourceStatus: 'CACHED',
        source:       'India Meteorological Department (IMD) CAP',
        sourceUrl:    CAP_RSS_URL,
        warning:      'Using cached data - live feed temporarily unavailable',
      }
    }
    throw new Error('IMD CAP feed unavailable: ' + fetchErr.message)
  }

  const rssItems = parseRSSItems(rssXml)
  console.log('[IMD CAP] Alerts parsed:', rssItems.length)

  const alerts = []
  await Promise.all(rssItems.map(async (item) => {
    try {
      const capXml = await fetchUrl(item.link)
      const capData = parseCAPAlert(capXml)
      alerts.push({
        ...capData,
        headline:    capData.headline    || item.title,
        description: capData.description || item.description,
        pubDate:     item.pubDate,
        capXmlUrl:   item.link,
      })
    } catch (capErr) {
      console.warn('[IMD CAP] Could not fetch CAP XML:', item.link, '-', capErr.message)
      alerts.push({
        headline:    item.title,
        description: item.description,
        pubDate:     item.pubDate,
        capXmlUrl:   item.link,
        event: null, severity: null, certainty: null, urgency: null,
        onset: null, expires: null, instruction: null, areaDesc: null,
        polygon: null, senderName: 'NWFC DIVISION, IMD, NEW DELHI', sent: null, status: null,
      })
    }
  }))

  const fetchedAt = new Date().toISOString()
  _cachedAlerts = { alerts, fetchedAt, expiresAt: now + IMD_CAP_CACHE_TTL_MS }

  return {
    alerts,
    fetchedAt,
    sourceStatus: 'LIVE',
    source:       'India Meteorological Department (IMD) CAP',
    sourceUrl:    CAP_RSS_URL,
  }
}

// --- Location -> State mapping ---
const CITY_TO_STATE = {
  pune: 'Maharashtra', mumbai: 'Maharashtra', nagpur: 'Maharashtra',
  nashik: 'Maharashtra', aurangabad: 'Maharashtra', solapur: 'Maharashtra',
  kolhapur: 'Maharashtra', satara: 'Maharashtra',
  delhi: 'Delhi', 'new delhi': 'Delhi', noida: 'Delhi', gurgaon: 'Delhi',
  bengaluru: 'Karnataka', bangalore: 'Karnataka', mysuru: 'Karnataka',
  mysore: 'Karnataka', mangaluru: 'Karnataka',
  hyderabad: 'Telangana', warangal: 'Telangana',
  chennai: 'Tamil Nadu', coimbatore: 'Tamil Nadu', madurai: 'Tamil Nadu',
  kolkata: 'West Bengal', calcutta: 'West Bengal', siliguri: 'West Bengal',
  ahmedabad: 'Gujarat', surat: 'Gujarat', vadodara: 'Gujarat', rajkot: 'Gujarat',
  jaipur: 'Rajasthan', jodhpur: 'Rajasthan', udaipur: 'Rajasthan', ajmer: 'Rajasthan',
  lucknow: 'Uttar Pradesh', varanasi: 'Uttar Pradesh', agra: 'Uttar Pradesh',
  kanpur: 'Uttar Pradesh', allahabad: 'Uttar Pradesh', prayagraj: 'Uttar Pradesh',
  meerut: 'Uttar Pradesh',
  bhopal: 'Madhya Pradesh', indore: 'Madhya Pradesh', jabalpur: 'Madhya Pradesh',
  patna: 'Bihar', muzaffarpur: 'Bihar',
  bhubaneswar: 'Odisha', cuttack: 'Odisha', puri: 'Odisha',
  guwahati: 'Assam', dibrugarh: 'Assam', silchar: 'Assam',
  srinagar: 'Jammu and Kashmir', jammu: 'Jammu and Kashmir',
  thiruvananthapuram: 'Kerala', kochi: 'Kerala', kozhikode: 'Kerala', trivandrum: 'Kerala',
  chandigarh: 'Punjab', ludhiana: 'Punjab', amritsar: 'Punjab',
  ambala: 'Haryana', shimla: 'Himachal Pradesh',
  dehradun: 'Uttarakhand', nainital: 'Uttarakhand',
  ranchi: 'Jharkhand', raipur: 'Chhattisgarh',
  visakhapatnam: 'Andhra Pradesh', vijayawada: 'Andhra Pradesh',
  panaji: 'Goa', goa: 'Goa',
}

export function resolveLocationToState(locationLabel) {
  if (!locationLabel) return null
  const key = locationLabel.toLowerCase().trim()
  if (CITY_TO_STATE[key]) return CITY_TO_STATE[key]
  for (const [city, state] of Object.entries(CITY_TO_STATE)) {
    if (key.includes(city)) return state
  }
  return null
}

const STATE_ALIASES = {
  'maharashtra': ['maharashtra', 'konkan', 'vidarbha', 'marathwada'],
  'gujarat':     ['gujarat', 'saurashtra', 'kutch'],
  'rajasthan':   ['rajasthan'],
  'odisha':      ['odisha', 'orissa'],
  'jammu and kashmir': ['jammu', 'kashmir', 'j&k'],
  'tamil nadu':  ['tamil nadu', 'tamilnadu'],
  'andhra pradesh': ['andhra', 'andhra pradesh'],
  'uttar pradesh': ['uttar pradesh', 'up'],
  'madhya pradesh': ['madhya pradesh', 'mp'],
  'west bengal': ['west bengal', 'bengal'],
  'himachal pradesh': ['himachal', 'himachal pradesh'],
}

export function filterAlertsByState(alerts, state) {
  if (!state || !alerts || !alerts.length) return []
  const stateLower = state.toLowerCase()
  const searchTerms = STATE_ALIASES[stateLower] || [stateLower]
  return alerts.filter(alert => {
    const area = ((alert.areaDesc || '') + ' ' + (alert.description || '') + ' ' + (alert.headline || '')).toLowerCase()
    return searchTerms.some(term => area.includes(term))
  })
}
