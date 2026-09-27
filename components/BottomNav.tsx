'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  function active(path: string) {
    if (path === '/') return pathname === '/'
    return pathname.startsWith(path)
  }

  const itemClass = (path: string) =>
    `flex flex-col items-center justify-center gap-1 min-w-14 text-[11px] ${
      active(path)
        ? 'text-black font-semibold'
        : 'text-gray-400'
    }`

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="mx-auto max-w-lg bg-white/95 backdrop-blur-xl border-t border-gray-200 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">

        <div className="grid grid-cols-5 items-end">

          <Link
            href="/"
            className={itemClass('/')}
          >
            <span className="text-xl">▦</span>
            <span>Biblioteca</span>
          </Link>

          <Link
            href="/catalog"
            className={itemClass('/catalog')}
          >
            <span className="text-xl">⌕</span>
            <span>Cerca</span>
          </Link>

          <Link
            href="/add"
            className="flex flex-col items-center justify-center -mt-5"
          >
            <span className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center text-3xl shadow-lg">
              +
            </span>

            <span className="text-[11px] font-semibold mt-1">
              Aggiungi
            </span>
          </Link>

          <Link
            href="/locations"
            className={itemClass('/locations')}
          >
            <span className="text-xl">⌂</span>
            <span>Posizioni</span>
          </Link>

          <Link
            href="/loans"
            className={itemClass('/loans')}
          >
            <span className="text-xl">↗</span>
            <span>Prestiti</span>
          </Link>

        </div>

      </div>
    </nav>
  )
}
