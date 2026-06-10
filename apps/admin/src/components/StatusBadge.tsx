const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:            { label: 'Чернетка',     cls: 'bg-tile-amber text-tile-coal' },
  pending_review:   { label: 'На ревʼю',     cls: 'bg-tile-pink text-tile-coal' },
  approved:         { label: 'Схвалено',     cls: 'bg-tile-teal text-tile-coal' },
  scheduled:        { label: 'Заплановано',  cls: 'bg-tile-blue text-white' },
  published:        { label: 'Опубліковано', cls: 'bg-emerald-500 text-white' },
  failed:           { label: 'Помилка',      cls: 'bg-tile-rose text-white' },
  rejected:         { label: 'Відхилено',    cls: 'bg-tile-coal text-white/70' },
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-tile-amber text-tile-coal' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider font-bold ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}
