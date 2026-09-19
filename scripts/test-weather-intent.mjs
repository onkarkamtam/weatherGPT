/**
 * Routing checks for isWeatherIntent — run: node scripts/test-weather-intent.mjs
 */
import { isWeatherIntent } from '../src/utils/weatherIntent.js'

const shouldMatch = [
  'Will it rain today?',
  "What's the weather?",
  'What is the temperature?',
  'Should I carry a raincoat today?',
  'Is it safe to go outside?',
  'Should I postpone my trip?',
  'Can I play cricket this evening?',
  'Do I need sunscreen today?',
  'Should I wear a jacket?',
  'Is today a good day for travelling?',
  'What dress should I wear today?',
  'What should I wear today?',
  'What clothes should I wear?',
  'Should I carry an umbrella?',
  'Can I go outside?',
  'आज रेनकोट घेऊन जाऊ का?',
  'क्या आज बाहर जाना ठीक रहेगा?',
  'आज पाऊस पडेल का?',
  'क्या आज बारिश होगी?',
  'आज क्या पहनूं?',
]

const shouldNotMatch = [
  'What is the capital of India?',
  'Tell me a joke',
  'How do I cook rice?',
  'Who wrote the Mahabharata?',
  'मेरा नाम क्या है?',
  '2 + 2 किती?',
  'What should I eat for dinner?',
]

let failed = 0
for (const q of shouldMatch) {
  if (!isWeatherIntent(q)) {
    console.error('FAIL expected weather intent:', q)
    failed++
  } else {
    console.log('OK  weather:', q)
  }
}
for (const q of shouldNotMatch) {
  if (isWeatherIntent(q)) {
    console.error('FAIL expected general chat:', q)
    failed++
  } else {
    console.log('OK  general:', q)
  }
}

if (failed) {
  console.error(`\n${failed} check(s) failed`)
  process.exit(1)
}
console.log('\nAll routing checks passed.')
