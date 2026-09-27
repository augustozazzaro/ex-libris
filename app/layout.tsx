import type { Metadata } from 'next'
import './globals.css'

import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: 'La nostra biblioteca',
  description: 'La biblioteca di famiglia',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="it">
      <body>
        <div className="pb-24 md:pb-0">
          {children}
        </div>

        <BottomNav />
      </body>
    </html>
  )
}
