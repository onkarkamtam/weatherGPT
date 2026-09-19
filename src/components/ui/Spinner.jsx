/**
 * Spinner — Accessible loading indicator.
 * Sizes: sm | md | lg
 */

const SIZES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-7 h-7 border-[3px]',
  lg: 'w-10 h-10 border-4',
}

/**
 * @param {{ size?: 'sm'|'md'|'lg', className?: string, label?: string }} props
 */
export default function Spinner({ size = 'md', className = '', label = 'Loading…' }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block rounded-full border-sky-200 border-t-brand animate-spin ${SIZES[size]} ${className}`}
    />
  )
}
