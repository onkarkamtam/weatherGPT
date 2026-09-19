/**
 * QuickPrompts — Horizontally scrollable suggestion chips above the input bar.
 * Phase 2+: prompts can be dynamic, personalized, or fetched from backend.
 */
import Chip from '@/components/ui/Chip'
import { Droplets, Bell, Navigation, Sprout } from 'lucide-react'

/** @type {{ label: string, icon: React.ReactNode }[]} */
const PROMPTS = [
  { label: 'Will it rain today?',         icon: <Droplets   size={13} /> },
  { label: 'Are there any weather alerts?', icon: <Bell      size={13} /> },
  { label: 'Is it safe to travel this evening?', icon: <Navigation size={13} /> },
  { label: 'Give me a farmer advisory',   icon: <Sprout     size={13} /> },
]

/**
 * @param {{ onSelect: (prompt: string) => void }} props
 */
export default function QuickPrompts({ onSelect }) {
  return (
    <div
      className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide shrink-0"
      role="region"
      aria-label="Quick prompt suggestions"
    >
      {PROMPTS.map((p) => (
        <Chip
          key={p.label}
          icon={p.icon}
          onClick={() => onSelect(p.label)}
          className="shrink-0"
        >
          {p.label}
        </Chip>
      ))}
    </div>
  )
}
