'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  House,
  Search,
  Settings,
  ArrowUpRight,
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
    <nav className="fixed left-0 right-0 bottom-0 z-50 md:hidden pointer-events-none">

      <div className="px-3 pb-[calc(10px+env(safe-area-inset-bottom))]">

        <div className="exl-glass-strong rounded-[28px] max-w-[520px] mx-auto px-3 py-2.5 pointer-events-auto">

          <div className="grid grid-cols-5 items-center">

            <Link
              href="/"
              className={
                itemClass('/')
              }
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
                itemClass(
                  '/catalog'
                )
              }
            >
              <Search
                size={22}
              />

              <span className="text-[10px] font-medium">
                Cerca
              </span>
            </Link>

            <div className="flex justify-center relative">

              <Link
                href="/add"
                className="w-[58px] h-[58px] rounded-full bg-black text-white flex items-center justify-center shadow-[0_10px_24px_rgba(0,0,0,0.22)] exl-press -mt-7"
              >
                <ScanBarcode
                  size={27}
                />
              </Link>

            </div>

            <Link
              href="/loans"
              className={
                itemClass(
                  '/loans'
                )
              }
            >
              <ArrowUpRight
                size={22}
              />

              <span className="text-[10px] font-medium">
                Prestiti
              </span>
            </Link>

            <Link
              href="/settings"
              className={
                itemClass(
                  '/settings'
                )
              }
            >
              <Settings
                size={22}
              />

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
