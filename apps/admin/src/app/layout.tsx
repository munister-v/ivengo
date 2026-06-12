import type { Metadata } from 'next'
import './globals.css'
import { LayoutWrapper } from '@/components/LayoutWrapper'

export const metadata: Metadata = {
  title: 'Ivengo Studio',
  description: 'Редакційна система для Telegram-каналів',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  )
}
