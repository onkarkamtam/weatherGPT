/**
 * Chip — Compact interactive label / tag / suggestion chip.
 * Used for quick prompt suggestions, location tags, severity badges.
 */

const VARIANTS = {
  default:  'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100',
  active:   'bg-brand text-white border border-brand',
  warning:  'bg-amber-50 text-amber-700 border border-amber-200',
  danger:   'bg-red-50 text-red-700 border border-red-200',
  success:  'bg-green-50 text-green-700 border border-green-200',
  muted:    'bg-slate-100 text-slate-500 border border-slate-200',
}

/**
 * @param {{
 *   variant?: keyof VARIANTS,
 *   icon?: React.ReactNode,
 *   onClick?: () => void,
 *   className?: string,
 *   children: React.ReactNode
 * }} props
 */
export default function Chip({
  variant   = 'default',
  icon      = null,
  onClick   = null,
  className = '',
  children,
}) {
  const Tag = onClick ? 'button' : 'span'

  return (
    <Tag
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
        'transition-all duration-150 whitespace-nowrap',
        onClick ? 'cursor-pointer active:scale-95 min-h-[36px]' : '',
        VARIANTS[variant],
        className,
      ].join(' ')}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </Tag>
  )
}
