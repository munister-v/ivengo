'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, type AbGroup } from '@/lib/api'

const STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-tile-blue text-white',
  published: 'bg-tile-teal text-tile-coal',
  pending_review: 'bg-tile-pink text-tile-coal',
  failed: 'bg-tile-rose text-white',
  rejected: 'bg-white/10 text-white/60',
  draft: 'bg-white/10 text-white/60',
}

export default function AbTestsPage() {
  const [groups, setGroups] = useState<AbGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAbGroups().then((res) => setGroups(res.groups)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="page-title">🧪 A/B Тести</h1>
        <Link href="/constructor" className="btn-coal">+ Новий тест</Link>
      </div>
      <p className="page-sub">
        У конструкторі задайте варіант A для основного посту, потім натисніть «Створити варіант B», щоб зробити пару для порівняння. Тут ви побачите статус публікації та кількість успішних публікацій кожного варіанту.
      </p>

      {loading ? (
        <div className="eyebrow animate-pulse">Завантаження…</div>
      ) : groups.length === 0 ? (
        <p className="panel-pad text-sm text-white/40 text-center">A/B тестів ще немає</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.abGroupId} className="panel-pad">
              <p className="text-xs text-white/40 mb-3 font-mono">Група: {g.abGroupId}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {g.variants.map((v) => (
                  <Link key={v.id} href={`/posts/${v.id}`}
                    className="bg-white/5 hover:bg-white/10 p-3 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white">Варіант {v.abVariant ?? '?'}</span>
                      <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 ${STATUS_COLOR[v.status] ?? 'bg-white/10 text-white/60'}`}>{v.status}</span>
                    </div>
                    <p className="text-sm text-white/70 truncate">{v.title || v.type}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-white/40">
                      <span>{v.publishedAt ? `Опубл.: ${new Date(v.publishedAt).toLocaleString('uk-UA')}` : v.scheduledAt ? `Заплан.: ${new Date(v.scheduledAt).toLocaleString('uk-UA')}` : '—'}</span>
                      <span className="font-bold text-tile-teal">{v.publishCount} ✅</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
