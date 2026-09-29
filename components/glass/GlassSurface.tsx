'use client'

import {
  CSSProperties,
  PointerEvent,
  ReactNode,
  useRef,
} from 'react'

import {
  motion,
} from 'framer-motion'

import GlassHighlight from './GlassHighlight'

type Props = {
  children: ReactNode
  className?: string
  interactive?: boolean
  strong?: boolean
}

export default function GlassSurface({
  children,
  className = '',
  interactive = true,
  strong = false,
}: Props) {
  const ref =
    useRef<HTMLDivElement | null>(
      null
    )

  function updatePointer(
    event:
      PointerEvent<HTMLDivElement>
  ) {
    if (
      !interactive ||
      !ref.current
    ) {
      return
    }

    const rect =
      ref.current
        .getBoundingClientRect()

    const x =
      event.clientX -
      rect.left

    const y =
      event.clientY -
      rect.top

    ref.current.style.setProperty(
      '--glass-x',
      `${x}px`
    )

    ref.current.style.setProperty(
      '--glass-y',
      `${y}px`
    )
  }

  function resetPointer() {
    if (!ref.current) {
      return
    }

    ref.current.style.setProperty(
      '--glass-x',
      '50%'
    )

    ref.current.style.setProperty(
      '--glass-y',
      '0%'
    )
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={
        updatePointer
      }
      onPointerLeave={
        resetPointer
      }
      whileTap={
        interactive
          ? {
              scale: 0.985,
            }
          : undefined
      }
      transition={{
        type: 'spring',
        stiffness: 420,
        damping: 30,
      }}
      className={`
        relative
        isolate
        overflow-hidden
        border
        border-white/40
        dark:border-white/10
        ${
          strong
            ? 'bg-white/[0.66] dark:bg-[#2c2c2e]/[0.68]'
            : 'bg-white/[0.48] dark:bg-[#2c2c2e]/[0.48]'
        }
        backdrop-blur-[26px]
        backdrop-saturate-[180%]
        shadow-[0_12px_40px_rgba(0,0,0,0.10)]
        ${className}
      `}
      style={
        {
          '--glass-x':
            '50%',
          '--glass-y':
            '0%',
        } as CSSProperties
      }
    >
      <GlassHighlight />

      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}
