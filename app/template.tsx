'use client'

import {
  motion,
  useReducedMotion,
} from 'framer-motion'

export default function Template({
  children,
}: {
  children: React.ReactNode
}) {
  const reduceMotion =
    useReducedMotion()

  if (reduceMotion) {
    return children
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 7,
        scale: 0.997,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        duration: 0.24,
        ease: [
          0.22,
          1,
          0.36,
          1,
        ],
      }}
    >
      {children}
    </motion.div>
  )
}
