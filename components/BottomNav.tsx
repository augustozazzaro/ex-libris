'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  House,
  Search,
  Settings,
  Shuffle,
  ScanBarcode,
} from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  const isActive = (
    path: string
  ) => {
    if (path === '/') {
      return pathname === '/'
    }

    return pathname.startsWith(
      path
    )
  }

  const itemClass = (
    path: string
  ) =>
    `flex flex-col items-center justify-center gap-1 min-w-0 exl-press ${
      isActive(path)
        ? 'text-black'
        : 'text-[#8e8e93]'
    }`

  return (
    <nav
      className="fixed inset-x-0 z-50 md:hidden pointer-events-none [transform:translate3d(0,0,0)] [backface-visibility:hidden] [will-change:transform]"
      style={{
        bottom:
          'max(8px, env(safe-area-inset-bottom))',
      }}
    >

      <div className="px-2.5">

        <div className="exl-glass-strong max-w-[520px] mx-auto h-[64px] px-3 pointer-events-auto rounded-[30px] border border-white/50 dark:border-white/10 bg-white/[0.76] dark:bg-[#1c1c1e]/[0.76] backdrop-blur-[28px] shadow-[0_10px_35px_rgba(0,0,0,0.14)]">

          <div className="grid grid-cols-5 items-center h-full">

            <Link
              href="/"
              className={itemClass('/')}
            >
              <House
                size={22}
                strokeWidth={
                  isActive('/')
                    ? 2.4
                    : 2
                }
              />

              <span className="text-[10px] font-medium">
                Home
              </span>
            </Link>

            <Link
              href="/catalog"
              className={
                itemClass('/catalog')
              }
            >
              <Search size={22} />

              <span className="text-[10px] font-medium">
                Cerca
              </span>
            </Link>

            <div className="flex justify-center relative">

              <Link
                href="/add"
                className="w-[50px] h-[50px] rounded-full bg-black text-white flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.20)] exl-press"
              >
                <ScanBarcode size={27} />
              </Link>

            </div>

            <Link
              href="/shuffle"
              className={
                itemClass('/shuffle')
              }
            >
              <Shuffle size={22} />

              <span className="text-[10px] font-medium">
                Shuffle
              </span>
            </Link>

            <Link
              href="/settings"
              className={
                itemClass('/settings')
              }
            >
              <Settings size={22} />

              <span className="text-[10px] font-medium">
                Impostazioni
              </span>
            </Link>

          </div>

        </div>

      </div>

    </nav>
  )
}
