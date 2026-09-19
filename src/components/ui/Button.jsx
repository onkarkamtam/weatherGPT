/**
 * Button — Accessible, touch-friendly button primitive.
 * Variants: primary | secondary | ghost | danger
 */

const VARIANTS = {
  primary:
    'bg-brand text-white shadow-sm hover:bg-brand-dark active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
  secondary:
    'bg-sky-50 text-brand border border-brand/30 hover:bg-sky-100 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2',
  danger:
    'bg-alert-high text-white hover:bg-red-600 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2',
}

const SIZES = {
  sm:  'px-3 py-1.5 text-sm rounded-xl min-h-[36px]',
  md:  'px-5 py-3 text-base rounded-2xl min-h-[48px]',
  lg:  'px-6 py-4 text-lg rounded-2xl min-h-[56px]',
  xl:  'px-8 py-5 text-xl rounded-2xl min-h-[64px]',
  icon:'p-2.5 rounded-2xl min-h-[44px] min-w-[44px]',
}

/**
 * @param {{
 *   variant?: 'primary'|'secondary'|'ghost'|'danger',
 *   size?: 'sm'|'md'|'lg'|'xl'|'icon',
 *   fullWidth?: boolean,
 *   disabled?: boolean,
 *   loading?: boolean,
 *   className?: string,
 *   children: React.ReactNode,
 *   [key: string]: any
 * }} props
 */
export default function Button({
  variant    = 'primary',
  size       = 'md',
  fullWidth  = false,
  disabled   = false,
  loading    = false,
  className  = '',
  children,
  ...rest
}) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold',
        'transition-all duration-150 select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex gap-1 items-center">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </span>
      ) : (
        children
      )}
    </button>
  )
}
