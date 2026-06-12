const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:            { label: 'Чернетка',     cls: 'border-tile-coal/35 text-tile-coal' },
  pending_review:   { label: 'На ревʼю',     cls: 'border-tile-pink bg-tile-pink/30 text-tile-coal' },
  approved:         { label: 'Схвалено',     cls: 'border-tile-teal bg-tile-teal/40 text-tile-coal' },
  scheduled:        { label: 'Заплановано',  cls: 'border-tile-blue text-tile-blue' },
  published:        { label: 'Опубліковано', cls: 'border-tile-coal bg-tile-coal text-tile-amber' },
  failed:           { label: 'Помилка',      cls: 'border-tile-rose bg-tile-rose/10 text-tile-rose' },
  rejected:         { label: 'Відхилено',    cls: 'border-tile-coal/30 text-tile-coal/60' },
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'border-tile-coal/35 text-tile-coal' }
  return (
    <span className={`inline-flex items-center border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}
