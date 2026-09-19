/**
 * Vercel Serverless Function Entry Point for WeatherGPT
 * 
 * This file adapts the existing Express application to work with Vercel's
 * serverless function environment. It imports and exports the existing
 * Express app without modification.
 * 
 * Environment variables are provided by Vercel directly, so no dotenv loading
 * is needed here.
 * 
 * Local development continues to use: node server/loader.js
 * Vercel deployment uses this file automatically.
 */

// Import the existing Express application
// Note: We skip loader.js because Vercel provides environment variables directly
import app from '../server/index.js'

// Export for Vercel serverless functions
export default app
