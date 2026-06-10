'use client'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Login is a standalone full-screen view — no app chrome.
  if (pathname === '/login') return <>{children}</>
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 overflow-auto min-w-0">{children}</main>
    </div>
  )
}
