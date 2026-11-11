import { forwardRef, ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { BookOpen, AlertCircle, AlertTriangle, CheckCircle2, Clock, X } from 'lucide-react'

// ============================================================================
// 1. BUTTON
// ============================================================================
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  loadingText?: string
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      icon,
      children,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
      md: 'px-4 py-2 text-sm rounded-xl gap-2',
      lg: 'px-6 py-3 text-base rounded-xl gap-2.5 font-semibold',
    }[size]

    const variantClasses = {
      primary:
        'bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white shadow-sm shadow-brand-500/20 focus:ring-brand-500',
      secondary:
        'bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200/60 focus:ring-brand-500',
      gold:
        'bg-gold-500 hover:bg-gold-600 active:bg-gold-700 text-slate-900 font-semibold shadow-sm shadow-gold-500/20 focus:ring-gold-500',
      outline:
        'border-2 border-brand-500 text-brand-700 hover:bg-brand-50 active:bg-brand-100 focus:ring-brand-500',
      ghost:
        'text-slate-600 hover:text-brand-700 hover:bg-brand-50/60 active:bg-brand-100 focus:ring-brand-500',
      danger:
        'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm shadow-red-500/20 focus:ring-red-500',
    }[variant]

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              ></path>
            </svg>
            <span>{loadingText ?? children}</span>
          </>
        ) : (
          <>
            {icon && <span className="inline-flex shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'

// ============================================================================
// 2. INPUT
// ============================================================================
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: ReactNode
  rightElement?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, rightElement, className = '', id, ...props }, ref) => {
    const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            {label}
          </label>
        )}
        <div className="relative rounded-xl shadow-xs">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full bg-white text-slate-900 text-sm rounded-xl border transition-colors duration-150 py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-offset-1 placeholder:text-slate-400 ${
              icon ? 'pl-10' : ''
            } ${rightElement ? 'pr-10' : ''} ${
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 text-red-900 placeholder:text-red-300'
                : 'border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-brand-500/20'
            } ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error ? (
          <p className="flex items-center gap-1 text-xs text-red-600 font-medium pt-0.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="text-xs text-slate-500 pt-0.5">{helperText}</p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ============================================================================
// 3. CARD
// ============================================================================
export interface CardProps {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({
  title,
  subtitle,
  action,
  footer,
  children,
  className = '',
  padding = 'md',
}: CardProps) {
  const padClass = {
    none: 'p-0',
    sm: 'p-3.5 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  }[padding]

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow ${padClass} ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
          <div>
            {title && (
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-500">
          {footer}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 4. BADGE
// ============================================================================
export interface BadgeProps {
  children: ReactNode
  variant?: 'green' | 'gold' | 'red' | 'gray'
  className?: string
}

export function Badge({ children, variant = 'green', className = '' }: BadgeProps) {
  const styles = {
    green: 'bg-emerald-50 text-emerald-800 border-emerald-200 dot-emerald-500',
    gold: 'bg-gold-50 text-gold-900 border-gold-200 dot-gold-500',
    red: 'bg-red-50 text-red-800 border-red-200 dot-red-500',
    gray: 'bg-slate-100 text-slate-700 border-slate-200 dot-slate-400',
  }[variant]

  const dotColors = {
    green: 'bg-emerald-500',
    gold: 'bg-gold-500',
    red: 'bg-red-500',
    gray: 'bg-slate-400',
  }[variant]

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors}`} />
      <span>{children}</span>
    </span>
  )
}

// ============================================================================
// 5. BANNER (Due-date and penalty reminders)
// ============================================================================
export interface BannerProps {
  variant?: 'gold' | 'red' | 'green' | 'gray'
  title: string
  message: ReactNode
  icon?: ReactNode
  action?: ReactNode
  onClose?: () => void
  className?: string
}

export function Banner({
  variant = 'gold',
  title,
  message,
  icon,
  action,
  onClose,
  className = '',
}: BannerProps) {
  const styles = {
    gold: {
      wrap: 'bg-gold-50 border-gold-200/80 text-gold-950',
      iconBox: 'bg-gold-100 text-gold-700',
      defaultIcon: <Clock className="w-5 h-5" />,
    },
    red: {
      wrap: 'bg-red-50 border-red-200/80 text-red-950',
      iconBox: 'bg-red-100 text-red-700',
      defaultIcon: <AlertTriangle className="w-5 h-5" />,
    },
    green: {
      wrap: 'bg-brand-50 border-brand-200/80 text-brand-950',
      iconBox: 'bg-brand-100 text-brand-700',
      defaultIcon: <CheckCircle2 className="w-5 h-5" />,
    },
    gray: {
      wrap: 'bg-slate-50 border-slate-200 text-slate-900',
      iconBox: 'bg-slate-200 text-slate-600',
      defaultIcon: <AlertCircle className="w-5 h-5" />,
    },
  }[variant]

  return (
    <div
      className={`relative rounded-2xl border p-4 sm:p-4.5 flex items-start gap-3.5 shadow-xs ${styles.wrap} ${className}`}
    >
      <div className={`p-2 rounded-xl shrink-0 ${styles.iconBox}`}>
        {icon ?? styles.defaultIcon}
      </div>
      <div className="flex-1 min-w-0 pr-6">
        <h4 className="text-sm font-bold tracking-tight">{title}</h4>
        <div className="text-xs sm:text-sm mt-0.5 leading-relaxed opacity-90">{message}</div>
        {action && <div className="mt-2.5 flex items-center gap-2">{action}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// ============================================================================
// 6. LOGO
// ============================================================================
export interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showSubtitle?: boolean
  className?: string
  light?: boolean
}

export function Logo({
  size = 'md',
  showSubtitle = true,
  className = '',
  light = false,
}: LogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  }[size]

  const titleSizes = {
    sm: 'text-base font-bold',
    md: 'text-lg sm:text-xl font-extrabold',
    lg: 'text-2xl sm:text-3xl font-extrabold tracking-tight',
  }[size]

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className={`${iconSizes} rounded-xl bg-gradient-to-tr from-brand-600 to-brand-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20 relative shrink-0`}
      >
        <BookOpen className="w-5 h-5 text-white" />
        {/* Subtle gold crown/dot accent */}
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gold-400 rounded-full border-2 border-white ring-1 ring-gold-500" />
      </div>
      <div>
        <h1 className={`${titleSizes} ${light ? 'text-white' : 'text-brand-900'} leading-none`}>
          Community Library
        </h1>
        {showSubtitle && (
          <p
            className={`text-xs mt-1 ${
              light ? 'text-brand-200' : 'text-slate-500'
            } font-medium tracking-wide`}
          >
            Lending Hub & Resource Center
          </p>
        )}
      </div>
    </div>
  )
}
