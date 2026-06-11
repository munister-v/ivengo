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
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    api.getAbGroups()
      .then((res) => {
        setGroups(res.groups)
        if (res.groups.length === 0) setShowGuide(true)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="page-title">🧪 A/B Тести</h1>
        <Link href="/constructor" className="btn-coal">+ Новий тест</Link>
      </div>

      {/* ── Detailed, collapsible explanation ───────────────────────── */}
      <div className="panel-pad space-y-2">
        <button type="button" onClick={() => setShowGuide((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
          <h2 className="panel-label !mb-0">📖 Як працює A/B тест — детально</h2>
          <span className="text-white/40 text-xs font-mono">{showGuide ? '▲ згорнути' : '▼ розгорнути'}</span>
        </button>
        {showGuide && (
          <div className="space-y-4 text-sm text-white/70">
            <p>
              A/B тест — це коли ви публікуєте <strong className="text-white">два варіанти одного посту</strong> (A і B),
              щоб побачити, який працює краще: більше переходів, реакцій, утримання підписників. Перемагає той варіант,
              який дав кращий результат — його стиль і використовуєте далі.
            </p>

            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-tile-pink mb-2">Як створити пару A/B</p>
              <ol className="space-y-1.5 list-decimal list-inside">
                <li>Відкрийте <Link href="/constructor" className="text-tile-teal hover:underline">Конструктор</Link> і зберіть перший пост.</li>
                <li>Внизу, у блоці <strong className="text-white">«🧪 A/B тест»</strong>, оберіть варіант <span className="font-mono text-tile-pink">A</span>. Поле «ID групи» залиште порожнім — створиться нова група.</li>
                <li>Збережіть пост — це <strong className="text-white">варіант A</strong>.</li>
                <li>Тут, на цій сторінці, у картці групи натисніть <strong className="text-white">«+ Додати варіант B»</strong> — відкриється Конструктор із тим самим текстом-основою і вже прив&apos;язаною групою.</li>
                <li>Змініть у варіанті B те, що тестуєте (заголовок, перші рядки, емодзі, кнопку), оберіть варіант <span className="font-mono text-tile-pink">B</span> і збережіть.</li>
              </ol>
            </div>

            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-tile-pink mb-2">Що варто тестувати (по черзі, по одному)</p>
              <ul className="space-y-1 list-disc list-inside text-white/60">
                <li><strong className="text-white">Перший рядок / гачок</strong> — питання проти заклику, емодзі проти без.</li>
                <li><strong className="text-white">Текст кнопки</strong> — «ЗАБРАТИ БОНУС» проти «ОТРИМАТИ КОД».</li>
                <li><strong className="text-white">Тон</strong> — хайп проти спокійного.</li>
                <li><strong className="text-white">Зображення</strong> — з картинкою проти без.</li>
              </ul>
              <p className="mt-2 text-white/50">Змінюйте <strong className="text-white">лише одну річ</strong> за раз — інакше не зрозумієте, що саме спрацювало.</p>
            </div>

            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-tile-pink mb-2">Як читати результат</p>
              <p className="text-white/60">
                У картці групи показано статус кожного варіанта і число <span className="text-tile-teal font-bold">✅ успішних публікацій</span> по каналах.
                Коли обидва варіанти опубліковані, той, що набрав більше успіхів, позначається міткою{' '}
                <span className="bg-tile-teal text-tile-coal font-bold px-1.5 py-0.5 text-[10px] uppercase">Лідирує</span>.
                Детальнішу залученість (перегляди, реакції) дивіться у <Link href="/analytics" className="text-tile-teal hover:underline">Аналітиці</Link>.
              </p>
            </div>

            <p className="text-xs text-white/40 bg-white/5 px-3 py-2">
              💡 Порада: запускайте обидва варіанти в схожий час доби й на ту саму аудиторію — інакше різниця може бути через час, а не через текст.
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="eyebrow animate-pulse">Завантаження…</div>
      ) : groups.length === 0 ? (
        <div className="panel-pad text-center space-y-3">
          <p className="text-sm text-white/50">A/B тестів ще немає.</p>
          <Link href="/constructor" className="btn inline-block">Створити перший варіант A →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const published = g.variants.filter((v) => v.status === 'published')
            const maxCount = Math.max(...g.variants.map((v) => v.publishCount), 0)
            // A clear leader only when ≥2 variants are published and one strictly leads.
            const leaderId =
              published.length >= 2 && maxCount > 0 &&
              published.filter((v) => v.publishCount === maxCount).length === 1
                ? published.find((v) => v.publishCount === maxCount)?.id
                : undefined
            const variantA = g.variants.find((v) => v.abVariant === 'A') ?? g.variants[0]
            const hasA = g.variants.some((v) => v.abVariant === 'A')
            const hasB = g.variants.some((v) => v.abVariant === 'B')
            const missing = !hasB ? 'B' : !hasA ? 'A' : null

            return (
              <div key={g.abGroupId} className="panel-pad">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-xs text-white/40 font-mono truncate">Група: {g.abGroupId}</p>
                  {missing && variantA && (
                    <Link
                      href={`/constructor?from=${variantA.id}&abGroupId=${encodeURIComponent(g.abGroupId)}&abVariant=${missing}`}
                      className="text-xs text-tile-pink hover:text-tile-teal font-bold whitespace-nowrap"
                    >
                      + Додати варіант {missing}
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {g.variants.map((v) => {
                    const isLeader = v.id === leaderId
                    return (
                      <Link key={v.id} href={`/posts/${v.id}`}
                        className={`p-3 transition-colors ${isLeader ? 'bg-tile-teal/15 ring-1 ring-tile-teal' : 'bg-white/5 hover:bg-white/10'}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">Варіант {v.abVariant ?? '?'}</span>
                            {isLeader && <span className="bg-tile-teal text-tile-coal font-bold px-1.5 py-0.5 text-[10px] uppercase tracking-wider">🏆 Лідирує</span>}
                          </div>
                          <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 ${STATUS_COLOR[v.status] ?? 'bg-white/10 text-white/60'}`}>{v.status}</span>
                        </div>
                        <p className="text-sm text-white/70 truncate">{v.title || v.type}</p>
                        <div className="flex items-center justify-between mt-2 text-xs text-white/40">
                          <span>{v.publishedAt ? `Опубл.: ${new Date(v.publishedAt).toLocaleString('uk-UA')}` : v.scheduledAt ? `Заплан.: ${new Date(v.scheduledAt).toLocaleString('uk-UA')}` : '—'}</span>
                          <span className={`font-bold ${isLeader ? 'text-tile-teal' : 'text-white/50'}`}>{v.publishCount} ✅</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
