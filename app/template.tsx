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
        opacity: 0.985,
        y: 3,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.16,
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
