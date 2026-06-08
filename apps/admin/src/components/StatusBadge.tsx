const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft:            { label: 'Чернетка',   cls: 'bg-slate-100 text-slate-600' },
  pending_review:   { label: 'На ревʼю',   cls: 'bg-yellow-100 text-yellow-700' },
  approved:         { label: 'Схвалено',   cls: 'bg-green-100 text-green-700' },
  scheduled:        { label: 'Заплановано', cls: 'bg-blue-100 text-blue-700' },
  published:        { label: 'Опубліковано', cls: 'bg-emerald-100 text-emerald-700' },
  failed:           { label: 'Помилка',     cls: 'bg-red-100 text-red-700' },
  rejected:         { label: 'Відхилено',   cls: 'bg-rose-100 text-rose-700' },
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}
