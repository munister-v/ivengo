import type { ReactNode } from 'react'

type AlertTone = 'error' | 'warning' | 'success' | 'info'

const toneStyles: Record<AlertTone, string> = {
  error: 'border-tile-rose bg-tile-rose/10 text-tile-rose',
  warning: 'border-[#a76b22] bg-[#a76b22]/10 text-[#744714]',
  success: 'border-[#668075] bg-tile-teal/25 text-tile-coal',
  info: 'border-tile-blue bg-tile-blue/10 text-tile-coal',
}

const labels: Record<AlertTone, string> = {
  error: 'Error',
  warning: 'Attention',
  success: 'Success',
  info: 'Information',
}

export function SystemAlert({
  tone,
  title,
  children,
  actions,
}: {
  tone: AlertTone
  title?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={`grid gap-4 border-l-[6px] border-y border-r p-4 sm:grid-cols-[1fr_auto] sm:items-center ${toneStyles[tone]}`}
    >
      <div>
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] opacity-60">{labels[tone]}</p>
        {title && <p className="mt-1 text-lg font-bold leading-snug">{title}</p>}
        <div className="mt-1 text-sm leading-relaxed opacity-85">{children}</div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
