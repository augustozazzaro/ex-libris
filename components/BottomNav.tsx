'use client'

import Link from 'next/link'
import {
  usePathname,
} from 'next/navigation'

import {
  motion,
} from 'framer-motion'

import {
  House,
  Search,
  Settings,
  Shuffle,
  ScanBarcode,
} from 'lucide-react'

import {
  haptic,
} from '@/utils/haptics'
import GlassDock from '@/components/glass/GlassDock'

export default function BottomNav() {
  const pathname =
    usePathname()

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

  function navItem(
    path: string,
    label: string,
    Icon: typeof House
  ) {
    const active =
      isActive(path)

    return (
      <Link
        href={path}
        onClick={() =>
          haptic('light')
        }
        className="relative flex flex-col items-center justify-center gap-1 min-w-0 h-[54px] exl-press"
      >

        {active && (
          <motion.div
            layoutId="bottom-nav-active"
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 32,
            }}
            className="absolute inset-x-2 top-1 bottom-1 rounded-[20px] bg-white/[0.22] dark:bg-white/[0.08] border border-white/30 dark:border-white/10 backdrop-blur-[14px] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_4px_16px_rgba(0,0,0,0.05)]"
          />
        )}

        <motion.div
          animate={{
            y: active
              ? -1
              : 0,
            scale: active
              ? 1.06
              : 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 450,
            damping: 30,
          }}
          className={`relative z-10 ${
            active
              ? 'text-black dark:text-white'
              : 'text-[#8e8e93]'
          }`}
        >
          <Icon
            size={22}
            strokeWidth={
              active
                ? 2.35
                : 2
            }
          />
        </motion.div>

        <span
          className={`relative z-10 text-[10px] font-medium transition-colors ${
            active
              ? 'text-black dark:text-white'
              : 'text-[#8e8e93]'
          }`}
        >
          {label}
        </span>

      </Link>
    )
  }

  return (
    <nav
      className="fixed left-0 right-0 bottom-0 z-[500] md:hidden pointer-events-none exl-fixed-nav"
    >

      <div
        className="px-2.5"
        style={{
          paddingBottom:
            'max(8px, env(safe-area-inset-bottom))',
        }}
      >

        <GlassDock
          className="max-w-[520px] mx-auto pointer-events-auto"
        >
          <div className="h-[64px] px-3">
            <div className="grid grid-cols-5 items-center h-full">

            {navItem(
              '/',
              'Home',
              House
            )}

            {navItem(
              '/catalog',
              'Cerca',
              Search
            )}

            <div className="flex justify-center relative">

              <motion.div
                whileTap={{
                  scale: 0.9,
                }}
                whileHover={{
                  scale: 1.04,
                }}
              >

                <Link
                  href="/add"
                  onClick={() =>
                    haptic('medium')
                  }
                  className="relative w-[50px] h-[50px] rounded-full bg-black text-white flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.24)] exl-press before:absolute before:inset-[-5px] before:rounded-full before:bg-white/[0.16] before:blur-md before:-z-10"
                >
                  <ScanBarcode
                    size={27}
                  />
                </Link>

              </motion.div>

            </div>

            {navItem(
              '/shuffle',
              'Shuffle',
              Shuffle
            )}

            {navItem(
              '/settings',
              'Impostazioni',
              Settings
            )}

            </div>
          </div>
        </GlassDock>

      </div>

    </nav>
  )
}
