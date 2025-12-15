'use client'

interface CompileStatusBadgeProps {
  status: 'idle' | 'compiling' | 'success' | 'error' | 'warning'
  warningCount?: number
  errorCount?: number
  size?: 'sm' | 'md'
}

export function CompileStatusBadge({
  status,
  warningCount = 0,
  errorCount = 0,
  size = 'md',
}: CompileStatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  if (status === 'idle') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 ${sizeClasses}`}>
        <span className={`${iconSize} rounded-full bg-slate-400`} />
        Not compiled
      </span>
    )
  }

  if (status === 'compiling') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 ${sizeClasses}`}>
        <svg className={`${iconSize} animate-spin`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Compiling...
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 ${sizeClasses}`}>
        <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        {errorCount > 0 ? `${errorCount} error${errorCount > 1 ? 's' : ''}` : 'Compile failed'}
      </span>
    )
  }

  if (status === 'warning' || (status === 'success' && warningCount > 0)) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-700 ${sizeClasses}`}>
        <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        {warningCount} warning{warningCount > 1 ? 's' : ''}
      </span>
    )
  }

  // Success
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 ${sizeClasses}`}>
      <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      Compiled
    </span>
  )
}
