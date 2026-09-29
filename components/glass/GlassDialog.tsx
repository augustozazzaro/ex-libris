'use client'

import {
  ReactNode,
  useEffect,
} from 'react'

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'framer-motion'

import {
  X,
} from 'lucide-react'

import GlassSurface from './GlassSurface'

import {
  haptic,
} from '@/utils/haptics'

type Props = {
  open: boolean
  onClose: () => void

  title?: string
  eyebrow?: string

  children: ReactNode

  maxWidth?: string

  showClose?: boolean
}

export default function GlassDialog({
  open,
  onClose,
  title,
  eyebrow,
  children,
  maxWidth = '560px',
  showClose = true,
}: Props) {
  const reduceMotion =
    useReducedMotion()

  useEffect(() => {
    if (!open) return

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow =
      'hidden'

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        'Escape'
      ) {
        haptic('light')
        onClose()
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {
      document.body.style.overflow =
        previousOverflow

      window.removeEventListener(
        'keydown',
        handleKeyDown
      )
    }
  }, [
    open,
    onClose,
  ])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="glass-dialog"
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          transition={{
            duration:
              reduceMotion
                ? 0
                : 0.2,
          }}
          className="
            fixed inset-0
            z-[200]
            flex
            items-end
            md:items-center
            justify-center
            px-3
            pb-[max(12px,env(safe-area-inset-bottom))]
            md:p-6
          "
          role="presentation"
        >

          <motion.button
            type="button"
            aria-label="Chiudi"
            onClick={() => {
              haptic('light')
              onClose()
            }}
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="
              absolute inset-0
              w-full h-full
              bg-black/[0.22]
              backdrop-blur-[10px]
              cursor-default
            "
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={
              reduceMotion
                ? false
                : {
                    opacity: 0,
                    y: 32,
                    scale: 0.965,
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={
              reduceMotion
                ? {
                    opacity: 0,
                  }
                : {
                    opacity: 0,
                    y: 22,
                    scale: 0.98,
                  }
            }
            transition={{
              type: 'spring',
              stiffness: 340,
              damping: 30,
            }}
            className="
              relative z-10
              w-full
              max-h-[88dvh]
            "
            style={{
              maxWidth,
            }}
          >

            <GlassSurface
              strong
              interactive={false}
              className="
                rounded-[30px]
                overflow-hidden
                shadow-[0_30px_100px_rgba(0,0,0,0.30)]
              "
            >

              {(title ||
                eyebrow ||
                showClose) && (
                <div className="flex items-start justify-between gap-4 px-5 pt-5">

                  <div>

                    {eyebrow && (
                      <p className="
                        text-[#8e8e93]
                        text-[11px]
                        uppercase
                        tracking-[0.09em]
                      ">
                        {eyebrow}
                      </p>
                    )}

                    {title && (
                      <h2 className="
                        text-[24px]
                        font-bold
                        tracking-[-0.035em]
                        mt-1
                      ">
                        {title}
                      </h2>
                    )}

                  </div>

                  {showClose && (
                    <button
                      type="button"
                      onClick={() => {
                        haptic('light')
                        onClose()
                      }}
                      className="
                        w-9 h-9
                        rounded-full
                        bg-black/5
                        dark:bg-white/10
                        flex
                        items-center
                        justify-center
                        exl-press
                        shrink-0
                      "
                    >
                      <X size={17} />
                    </button>
                  )}

                </div>
              )}

              <div className="
                max-h-[calc(88dvh-70px)]
                overflow-y-auto
                overscroll-contain
              ">
                {children}
              </div>

            </GlassSurface>

          </motion.div>

        </motion.div>
      )}
    </AnimatePresence>
  )
}
