'use client'

import {
  motion,
  useReducedMotion,
} from 'framer-motion'

import {
  BookOpen,
} from 'lucide-react'

export default function ExLibrisLoader() {
  const reduceMotion =
    useReducedMotion()

  return (
    <div className="flex flex-col items-center justify-center gap-3">

      <motion.div
        animate={
          reduceMotion
            ? undefined
            : {
                y: [0, -4, 0],
                scale: [1, 1.035, 1],
              }
        }
        transition={{
          duration: 1.25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="w-12 h-12 rounded-[17px] exl-glass flex items-center justify-center shadow-sm"
      >
        <BookOpen
          size={22}
          strokeWidth={1.7}
        />
      </motion.div>

      <motion.div
        animate={
          reduceMotion
            ? undefined
            : {
                opacity: [
                  0.35,
                  0.75,
                  0.35,
                ],
              }
        }
        transition={{
          duration: 1.25,
          repeat: Infinity,
        }}
        className="w-12 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden"
      >
        <div className="w-full h-full bg-black/20 dark:bg-white/20" />
      </motion.div>

    </div>
  )
}
