'use client'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Login is a standalone full-screen view — no app chrome.
  if (pathname === '/login') return <>{children}</>
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main id="main-content" className="w-full px-4 py-8 sm:px-6 lg:px-10 lg:py-12 min-w-0">
        <div className="mx-auto max-w-[1480px]">{children}</div>
      </main>
    </div>
  )
}
