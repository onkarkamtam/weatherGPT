# WeatherGPT

**Ask anything about the weather. Hyperlocal impact intelligence for everyone.**

WeatherGPT is an AI-powered weather assistant that combines real-time meteorological data with natural language understanding to provide personalized, conversational weather insights. Built with React, Express, and Google Gemini AI.

---

## Overview

WeatherGPT transforms how users interact with weather data by enabling natural language queries like "Should I carry an umbrella today?" or "What's the weather like tomorrow morning?" instead of navigating complex weather apps. The system integrates multiple weather data sources and uses AI to provide contextual, decision-focused responses.

---

## Key Features

### 🤖 **AI-Powered Conversational Interface**
- Natural language weather queries in English and Hindi
- Context-aware follow-up questions
- Personalized recommendations based on weather conditions
- Multi-language support with auto-detection

### 🌍 **Comprehensive Weather Data**
- **Current Weather**: Real-time temperature, conditions, humidity, wind, and precipitation
- **Hourly Forecasts**: Detailed forecasts for specific time periods (morning, afternoon, evening, night)
- **Extended Forecasts**: Up to 7-day weather outlook
- **NWP Models**: Access to GFS GRAPES and ECMWF IFS numerical weather prediction models
- **Climate Trends**: Long-term climate analysis (15, 30, or 60-year trends)
- **Historical Comparisons**: Short-term historical weather data analysis

### 📍 **Location Intelligence**
- Geocoding for city/location search
- Explicit location extraction from queries
- Conversation context memory for follow-up questions
- Support for multiple locations in a single conversation

### 🎨 **Modern User Experience**
- Clean, responsive Material Design-inspired UI
- Interactive weather cards with rich visualizations
- Real-time typing indicators and loading states
- Conversation history with persistence
- Dark mode optimized interface

### 🔐 **User Authentication & Persistence**
- Secure user authentication (email/password)
- Conversation history saved to cloud database
- Multi-device synchronization
- Protected routes and user-specific data isolation

---

## Technology Stack

### Frontend
- **React 18** - UI framework
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **Vite** - Build tool and dev server

### Backend
- **Node.js** - Runtime environment
- **Express 5** - Web framework
- **Google Gemini AI** - Large language model for natural language processing
- **Supabase** - PostgreSQL database and authentication
- **Open-Meteo API** - Weather data source

### External APIs
- **Open-Meteo**: Current weather, forecasts, historical data, NWP models
- **Nominatim (OpenStreetMap)**: Geocoding and reverse geocoding
- **Google Gemini**: AI-powered response generation with grounded prompts

---

## Architecture

### High-Level Workflow

```
User Query → Intent Detection → Location Resolution → Data Fetch → AI Processing → Response
```

1. **Intent Detection**: Classify query type (weather, NWP, climate, historical, time period, general)
2. **Location Extraction**: Resolve location from query, conversation context, or UI selection
3. **Data Fetching**: Retrieve relevant weather data from appropriate APIs
4. **AI Grounding**: Build context-rich system prompt with actual weather data
5. **Response Generation**: Use Gemini AI to generate natural, helpful responses
6. **UI Rendering**: Display response with appropriate weather cards

### Key Components

- **Intent Detection** (`src/utils/weatherIntent.js`): Pattern-based classification of user queries
- **Weather Services** (`src/services/`): API integration for weather, location, and AI
- **NWP Providers** (`server/providers/`): Structured data fetching for numerical weather models
- **Chat Screen** (`src/screens/ChatScreen.jsx`): Main conversation interface and orchestration
- **Conversation Hooks** (`src/hooks/`): State management for conversations and location context
- **Auth System** (`server/routes/auth.js`, `src/contexts/AuthContext.jsx`): User authentication and session management

---

## Project Structure

```
weathergpt/
├── src/
│   ├── components/
│   │   ├── cards/          # Weather visualization cards
│   │   ├── chat/           # Chat UI components
│   │   ├── layout/         # Layout components
│   │   └── ui/             # Reusable UI elements
│   ├── contexts/           # React contexts (Auth)
│   ├── hooks/              # Custom React hooks
│   ├── screens/            # Main app screens
│   ├── services/           # API integration services
│   ├── utils/              # Utility functions (intent detection, date/time)
│   ├── App.jsx             # Root router
│   └── main.jsx            # React entry point
├── server/
│   ├── database/           # Supabase client and schema
│   ├── middleware/         # Express middleware (auth)
│   ├── providers/          # Weather data providers (NWP models)
│   ├── routes/             # API route handlers
│   ├── cache.js            # In-memory caching layer
│   ├── index.js            # Express app and API endpoints
│   └── loader.js           # Environment variable loader
├── scripts/                # Testing and verification scripts
├── public/                 # Static assets
├── dist/                   # Production build output
├── index.html              # HTML entry point
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── package.json            # Dependencies and scripts
```

---

## Installation & Setup

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase account** (free tier available)
- **Google Gemini API key** (free tier available)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd weathergpt
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

#### Frontend Environment (`.env`)

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

#### Backend Environment (`server/.env`)

Create a `server/.env` file:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Optional
PORT=3001
```

> ⚠️ **Never commit `.env` files to version control.** Use `.env.example` as a template.

### 4. Set Up Database

Run the SQL schema in your Supabase project:

```sql
-- Located in server/database/schema.sql
-- Creates tables: users, conversations, messages
-- Creates indexes and RLS policies
```

1. Go to your Supabase dashboard → SQL Editor
2. Copy and execute the contents of `server/database/schema.sql`

### 5. API Keys

#### Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Create a new API key
3. Add to `server/.env` as `GEMINI_API_KEY`

#### Supabase Keys
1. Go to Supabase Dashboard → Settings → API
2. Copy `Project URL` → `SUPABASE_URL` (both `.env` files)
3. Copy `anon/public` key → `VITE_SUPABASE_ANON_KEY` (root `.env`)
4. Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (`server/.env`)

---

## Running Locally

### Development Mode

Run both frontend and backend concurrently:

```bash
npm run dev
```

This starts:
- **Vite dev server** on `http://localhost:5173`
- **Express API server** on `http://localhost:3001`

The frontend proxies API requests to the backend automatically.

### Production Build

Build the frontend:

```bash
npm run build
```

Run the production server (serves both API and static files):

```bash
npm run server
```

The app will be available at `http://localhost:3001`

---

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

### Conversations
- `GET /api/conversations` - List user's conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get conversation with messages
- `PATCH /api/conversations/:id` - Update conversation title
- `DELETE /api/conversations/:id` - Delete conversation

### Weather & AI
- `POST /api/chat` - Main chat endpoint (Gemini AI with weather grounding)
- `GET /api/nwp-forecast` - Fetch NWP model forecasts (GFS GRAPES, ECMWF IFS)
- `GET /api/climate-trend` - Climate trend analysis (15/30/60 years)

### Health
- `GET /api/health` - Server health check

---

## Testing & Verification

### Manual Testing

Test the deployed application with these sample queries:

**Basic Weather Queries:**
- "What's the weather in Mumbai right now?"
- "Will it rain tomorrow in Delhi?"
- "Should I carry an umbrella today?"

**Time-Specific Queries:**
- "What about tomorrow morning?"
- "What's the weather like this evening?"

**Location Context:**
- Ask about one city, then follow up with "What about tomorrow?" (should remember location)
- "Compare weather in Pune and Bangalore"

**Advanced Features:**
- "Show me the GFS forecast for Kolkata"
- "What's the 30-year climate trend for Chennai?"

### Automated Scripts

```bash
# Test weather intent detection
node scripts/test-weather-intent.mjs "Should I carry a raincoat?"

# Verify chat API
node scripts/verify-chat.mjs
```

---

## Known Limitations

- **IMD Data**: Official India Meteorological Department API requires IP whitelisting and is currently unavailable. The app uses public CAP RSS feeds for basic alerts only.
- **Geocoding Rate Limits**: OpenStreetMap Nominatim has usage limits. Consider using a commercial geocoding service for production.
- **Model Quota**: Gemini API has rate limits. The app includes fallback models (3.5-flash, 3.1-flash) but may hit quota in high-traffic scenarios.
- **Cache**: In-memory cache is lost on server restart. Consider Redis for production deployments.
- **Historical Data**: Limited to Open-Meteo's historical archive (varies by location).

---

## Future Improvements

- [ ] Redis-based persistent caching layer
- [ ] Weather alerts and notifications
- [ ] Voice input and audio responses
- [ ] Weather map visualizations
- [ ] Export conversation history
- [ ] Multi-user collaboration on weather planning
- [ ] Mobile app (React Native)
- [ ] Advanced weather widgets and embeds
- [ ] Integration with calendar apps for weather-aware scheduling
- [ ] ML-based personalized weather insights

---

## Environment Variables Reference

### Frontend (`.env`)
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Yes |

### Backend (`server/.env`)
| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | Yes | - |
| `SUPABASE_URL` | Supabase project URL | Yes | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes | - |
| `PORT` | Server port | No | 3001 |

---

## Contributing

Contributions are welcome! Please ensure:
- Code follows existing style conventions
- All new features include appropriate error handling
- API changes are documented
- Tests pass before submitting PR

---

## License

This project's license is not specified. Please contact the author for licensing information.

---

## Support

For issues, questions, or feature requests, please open an issue on the project repository.

---

