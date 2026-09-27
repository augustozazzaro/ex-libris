import type { Metadata, Viewport } from 'next'
import './globals.css'

import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = {
  title: {
    default: 'Ex Libris',
    template: '%s · Ex Libris',
  },

  description: 'La biblioteca di famiglia',

  applicationName: 'Ex Libris',

  manifest: '/manifest.webmanifest',

  appleWebApp: {
    capable: true,
    title: 'Ex Libris',
    statusBarStyle: 'default',
  },

  icons: {
    icon: [
      {
        url: '/icons/icon-512.png',
        type: 'image/png',
      },
    ],

    apple: [
      {
        url: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  },

  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#f2f2f7',
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
