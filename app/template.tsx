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
        opacity: 0.96,
      }}
      animate={{
        opacity: 1,
      }}
      transition={{
        duration: 0.10,
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  )
}
