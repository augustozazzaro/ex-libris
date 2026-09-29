'use client'

import {
  ReactNode,
} from 'react'

import {
  motion,
} from 'framer-motion'

import GlassSurface from './GlassSurface'

type Props = {
  children: ReactNode
  className?: string
}

export default function GlassDock({
  children,
  className = '',
}: Props) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 14,
        scale: 0.98,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 28,
      }}
      className={
        className
      }
    >
      <GlassSurface
        strong
        className="
          rounded-[30px]
          shadow-[0_12px_45px_rgba(0,0,0,0.14)]
        "
      >
        {children}
      </GlassSurface>
    </motion.div>
  )
}
