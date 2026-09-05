const VARIANTS = {
  primary: 'bg-accent-500 hover:bg-accent-600 text-white shadow-sm',
  ghost:
    'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  subtle: 'text-accent-600 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/30',
}

const SIZES = {
  sm: 'text-xs px-2.5 py-1.5',
  md: 'text-sm px-3.5 py-2',
  lg: 'text-sm px-5 py-2.5',
}

export default function GlassButton({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  disabled,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
