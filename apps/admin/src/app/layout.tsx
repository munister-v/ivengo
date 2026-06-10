import type { Metadata } from 'next'
import './globals.css'
import { LayoutWrapper } from '@/components/LayoutWrapper'

export const metadata: Metadata = {
  title: 'Ivengo Admin',
  description: 'Авто-постинг у Telegram-канал',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body className="bg-tile-amber text-tile-coal">
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  )
}
