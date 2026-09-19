/**
 * IMD Routes (DISABLED)
 * 
 * IMD authenticated API requires static IP registration.
 * Public IMD endpoints require authentication.
 * All IMD endpoints return unavailable until reliable public source is available.
 */

export function setupIMDRoutes(app) {
  const unavailableResponse = {
    error: 'IMD data is currently unavailable',
    message: 'Live IMD data requires authenticated API access with static IP registration.',
    source: 'IMD',
    available: false
  }

  app.get('/api/imd/warnings', (_req, res) => {
    res.status(503).json(unavailableResponse)
  })

  app.get('/api/imd/nowcast', (_req, res) => {
    res.status(503).json(unavailableResponse)
  })

  app.get('/api/imd/current', (_req, res) => {
    res.status(503).json(unavailableResponse)
  })

  app.get('/api/imd/forecast', (_req, res) => {
    res.status(503).json(unavailableResponse)
  })

  app.get('/api/imd/rainfall', (_req, res) => {
    res.status(503).json(unavailableResponse)
  })

  app.get('/api/imd/rainfall-forecast', (_req, res) => {
    res.status(503).json(unavailableResponse)
  })
}
