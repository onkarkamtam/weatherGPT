# Browser Test Plan - Final Release Verification

## Deployment URL
https://weather-gpt-india.vercel.app

## Test Requirements
- **Browsers:** Chrome, Firefox, Safari, Edge
- **Devices:** Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
- **Network:** Test on 3G, 4G, WiFi
- **Authentication:** Supabase account required

---

## TEST 1: Current Weather Query

### Steps
1. Open https://weather-gpt-india.vercel.app
2. Log in with Supabase credentials
3. Select location: "Mumbai"
4. Type query: "What's the weather like?"
5. Press Enter or Send

### Expected Results
- ✓ Loading animation appears
- ✓ WeatherCard displays with:
  - Temperature in °C
  - Weather condition (sunny/cloudy/rainy)
  - Humidity percentage
  - Wind speed
  - Location label "Mumbai"
- ✓ AI response in English (2-3 sentences)
- ✓ Response completes within 3 seconds

### Failure Scenarios
- Error message: Record exact text
- No loading animation: Record behavior
- Wrong location: Record displayed location
- Timeout: Record time elapsed

---

## TEST 2: Tomorrow's Forecast

### Steps
1. Continue from TEST 1
2. Type query: "How will the weather be tomorrow?"
3. Press Enter

### Expected Results
- ✓ Loading animation appears
- ✓ WeatherCard displays tomorrow's forecast
- ✓ Date label shows tomorrow's date
- ✓ AI response mentions "tomorrow"
- ✓ Temperature values differ from today (unless genuinely same)

### Verify
- Compare forecast date with system date + 1 day
- Verify temperature is plausible for the season

---

## TEST 3: Historical Weather Comparison (30-day)

### Steps
1. Continue conversation
2. Type query: "How does this month compare to last year?"
3. Press Enter

### Expected Results
- ✓ Loading message: "Analyzing historical weather data..."
- ✓ HistoricalComparisonCard displays with:
  - "This Year" section: Average temp, rainfall, rainy days
  - "Last Year" section: Same metrics
  - "Comparison" section: Temperature difference, trend (warmer/cooler/similar)
- ✓ AI response interprets the comparison
- ✓ Card shows ~30 days of data

### Record
- This year average temperature: ____ °C
- Last year average temperature: ____ °C
- Temperature difference: ____ °C
- Trend: _________
- Days analyzed: ____

---

## TEST 4: Climate Trend (5-year)

### Steps
1. Start new conversation
2. Select location: "Delhi"
3. Type query: "Show me 5-year temperature trend"
4. Press Enter

### Expected Results
- ✓ Loading message: "Analyzing 5-year climate trends for Delhi..."
- ✓ ClimateTrendCard displays with:
  - Chart showing 5 years of data (2021-2025)
  - Temperature trend line
  - Precipitation data
  - Summary statistics (coldest year, hottest year)
- ✓ AI response describes the trend
- ✓ No causal climate change claims (only observable trends)

### Record
- Years displayed: ____ to ____
- Temperature trend: increasing / decreasing / stable
- Temperature slope: ____ °C/year
- Coldest year: ____
- Hottest year: ____

---

## TEST 5: NWP Model Comparison

### Steps
1. Start new conversation
2. Select location: "Bangalore"
3. Type query: "Compare GFS and ECMWF forecasts"
4. Press Enter

### Expected Results
- ✓ Loading message: "Fetching GFS & ECMWF forecast for Bangalore..."
- ✓ NWPDisplayCard shows comparison with:
  - GFS/GRAPES section: Provider "CMA", model name, forecast values
  - ECMWF IFS section: Provider "ECMWF", model name, forecast values
  - Side-by-side hourly comparison (at least 24 hours)
  - Temperature differences between models
- ✓ AI response explains model differences
- ✓ Models show different values (they're independent forecasts)

### Record
- GFS provider: ________
- GFS first hour temp: ____ °C
- ECMWF provider: ________
- ECMWF first hour temp: ____ °C
- Temperature difference: ____ °C
- Forecast hours displayed: ____

---

## TEST 6: IMD Official Warnings

### Steps
1. Start new conversation
2. Select location: "Pune"
3. Type query: "Are there any weather warnings?"
4. Press Enter

### Expected Results (if warning exists)
- ✓ Loading message: "Searching for latest public IMD information..."
- ✓ IMDWarningCard displays with:
  - Warning headline
  - Severity level
  - Geographic area (state/district)
  - Issue time
  - Validity period
  - Warning description
- ✓ AI response summarizes the warning

### Expected Results (if no warning)
- ✓ AI response: "No active weather warnings for Pune"
- ✓ No warning card displayed
- ✓ Response is informative, not an error

### Record
- Warning present: Yes / No
- If yes:
  - Headline: ________________
  - Severity: ________________
  - Geographic area: ________________
  - Issue time: ________________

---

## TEST 7: Multilingual Support - Hindi

### Steps
1. Start new conversation
2. Select location: "Delhi"
3. Type query in Hindi: "मौसम कैसा है?"
4. Press Enter

### Expected Results
- ✓ Intent detected as weather query
- ✓ WeatherCard displays (same as English)
- ✓ AI response in Hindi
- ✓ Location "Delhi" preserved in response
- ✓ Temperature values match card data
- ✓ No English mixed in (unless technical terms)

### Record
- Response language: ________
- Contains location "Delhi": Yes / No
- Temperature mentioned: ____ °C
- Response natural and grammatically correct: Yes / No

---

## TEST 8: Multilingual Support - Marathi

### Steps
1. Start new conversation
2. Select location: "Pune"
3. Type query in Marathi: "हवामान कसे आहे?"
4. Press Enter

### Expected Results
- ✓ Intent detected as weather query
- ✓ WeatherCard displays
- ✓ AI response in Marathi
- ✓ Location "Pune" preserved
- ✓ Temperature values accurate

### Record
- Response language: ________
- Contains location: Yes / No
- Response quality: ________

---

## TEST 9: Multilingual Support - Telugu

### Steps
1. Start new conversation
2. Select location: "Hyderabad"
3. Type query in Telugu: "వాతావరణం ఎలా ఉంది?"
4. Press Enter

### Expected Results
- ✓ Intent detected as weather query
- ✓ WeatherCard displays
- ✓ AI response in Telugu
- ✓ Location "Hyderabad" preserved
- ✓ Temperature values accurate

### Record
- Response language: ________
- Contains location: Yes / No
- Response quality: ________

---

## TEST 10: Voice Input (if available)

### Steps
1. Start new conversation
2. Click microphone icon
3. Allow microphone permissions if prompted
4. Speak: "What's the weather in Mumbai?"
5. Wait for transcription
6. Verify query appears in input field
7. Press Enter

### Expected Results
- ✓ Microphone permission requested (first time)
- ✓ Recording indicator appears
- ✓ Speech transcribed to text
- ✓ Transcription accurate
- ✓ Query processed normally

### If BLOCKED
- Record reason: No microphone / Browser doesn't support / Permission denied / Feature disabled

---

## TEST 11: Error Handling - Invalid Location

### Steps
1. Start new conversation
2. Type query: "What's the weather in Atlantis?" (non-existent city)
3. Press Enter

### Expected Results
- ✓ Geocoding fails gracefully
- ✓ Error message: "I couldn't find that location. Please try a different city."
- ✓ No crash or blank screen
- ✓ User can retry with different query

---

## TEST 12: Error Handling - Network Timeout

### Steps
1. Start new conversation
2. Open browser DevTools > Network tab
3. Set throttling to "Slow 3G"
4. Type query: "What's the weather?"
5. Press Enter
6. Observe behavior

### Expected Results
- ✓ Loading animation shows for extended time
- ✓ Eventually either:
  - Success: Weather card displays
  - Timeout: Error message "Request timed out. Please try again."
- ✓ No infinite loading
- ✓ App remains responsive

---

## TEST 13: Loading States

### Steps
1. Test each query type and record loading message:
   - Current weather: "Fetching weather data for [location]..."
   - Historical: "Analyzing historical weather data..."
   - Climate trend: "Analyzing 5-year climate trends for [location]..."
   - NWP: "Fetching GFS & ECMWF forecast for [location]..."
   - IMD: "Searching for latest public IMD information for [location]..."

### Expected Results
- ✓ Loading message appears immediately after sending query
- ✓ Loading message matches query type
- ✓ Location name appears in loading message (when applicable)
- ✓ Loading animation visible during API call
- ✓ Loading message disappears when response ready

---

## TEST 14: Responsive Design

### Steps
1. Open site on desktop (1920x1080)
2. Verify layout, cards, chat interface
3. Resize browser to tablet (768x1024)
4. Verify layout adapts, no horizontal scroll
5. Resize to mobile (375x667)
6. Verify layout stacks vertically, all features accessible
7. Test query on mobile
8. Verify keyboard doesn't obscure input field

### Expected Results
- ✓ Desktop: Full layout, cards side-by-side
- ✓ Tablet: Adjusted layout, readable text
- ✓ Mobile: Stacked layout, vertical scroll only
- ✓ All features accessible on all screen sizes
- ✓ Touch targets > 44x44px on mobile

---

## TEST 15: Conversation Persistence

### Steps
1. Log in to account
2. Start conversation, ask 3 queries
3. Close browser tab
4. Reopen https://weather-gpt-india.vercel.app
5. Log in again
6. Check if conversation history is present

### Expected Results
- ✓ Previous conversation visible in sidebar/history
- ✓ Can load previous conversation
- ✓ All messages and cards preserved
- ✓ Can continue conversation from where left off

---

## Completion Checklist

### Core Features
- [ ] TEST 1: Current Weather
- [ ] TEST 2: Tomorrow's Forecast
- [ ] TEST 3: Historical Comparison (30-day)
- [ ] TEST 4: Climate Trend (5-year)
- [ ] TEST 5: NWP Model Comparison
- [ ] TEST 6: IMD Warnings

### Multilingual
- [ ] TEST 7: Hindi
- [ ] TEST 8: Marathi
- [ ] TEST 9: Telugu

### Advanced
- [ ] TEST 10: Voice Input (or mark BLOCKED)
- [ ] TEST 11: Error - Invalid Location
- [ ] TEST 12: Error - Network Timeout
- [ ] TEST 13: Loading States
- [ ] TEST 14: Responsive Design
- [ ] TEST 15: Conversation Persistence

---

## Report Template

```
BROWSER TEST RESULTS
Date: ___________
Tester: ___________
Browser: Chrome ___ / Firefox ___ / Safari ___ / Edge ___

VERIFIED: ___ / 15 tests
PARTIAL: ___ / 15 tests
BLOCKED: ___ / 15 tests
FAILED: ___ / 15 tests

Critical Issues Found:
1. ___________
2. ___________

Non-Critical Issues:
1. ___________
2. ___________

Overall Verdict: PASS / CONDITIONAL PASS / FAIL
```

---

## Notes

- Tests assume Supabase authentication is working
- Voice input may not be available in all browsers
- IMD warnings depend on actual weather conditions
- NWP comparison requires backend server running
- Some features may require API keys (Gemini, Open-Meteo)
