'use client'

import {
  ReactNode,
  useEffect,
  useState,
} from 'react'

import {
  AnimatePresence,
  motion,
  useDragControls,
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
}

export default function GlassSheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: Props) {
  const controls =
    useDragControls()

  const reduceMotion =
    useReducedMotion()

  const [
    crossedThreshold,
    setCrossedThreshold,
  ] =
    useState(false)

  useEffect(() => {
    if (!open) return

    const oldOverflow =
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
        oldOverflow

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
          key="glass-sheet"
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
            fixed inset-0
            z-[210]
            flex
            items-end
            justify-center
          "
        >

          <motion.button
            type="button"
            aria-label="Chiudi"
            onClick={() => {
              haptic('light')
              onClose()
            }}
            className="
              absolute inset-0
              w-full h-full
              bg-black/[0.22]
              backdrop-blur-[10px]
            "
          />

          <motion.div
            role="dialog"
            aria-modal="true"

            drag="y"

            dragControls={
              controls
            }

            dragListener={
              false
            }

            dragConstraints={{
              top: 0,
              bottom: 0,
            }}

            dragElastic={{
              top: 0,
              bottom: 0.7,
            }}

            dragMomentum={
              false
            }

            onDrag={(
              _,
              info
            ) => {
              const crossed =
                info.offset.y >
                105

              if (
                crossed &&
                !crossedThreshold
              ) {
                setCrossedThreshold(
                  true
                )

                haptic('medium')
              }

              if (
                info.offset.y <
                65 &&
                crossedThreshold
              ) {
                setCrossedThreshold(
                  false
                )
              }
            }}

            onDragEnd={(
              _,
              info
            ) => {
              const shouldClose =
                info.offset.y >
                  105 ||
                info.velocity.y >
                  750

              setCrossedThreshold(
                false
              )

              if (shouldClose) {
                haptic('light')
                onClose()
              }
            }}

            initial={
              reduceMotion
                ? false
                : {
                    y: '100%',
                    opacity: 0.8,
                  }
            }

            animate={{
              y: 0,
              opacity: 1,
            }}

            exit={{
              y:
                reduceMotion
                  ? 0
                  : '105%',
              opacity:
                reduceMotion
                  ? 0
                  : 1,
            }}

            transition={{
              type: 'spring',
              stiffness: 330,
              damping: 31,
            }}

            className="
              relative
              z-10
              w-full
              max-w-[680px]
              px-2
              pb-[max(8px,env(safe-area-inset-bottom))]
            "
          >

            <GlassSurface
              strong
              interactive={false}
              className="
                rounded-t-[34px]
                rounded-b-[28px]
                overflow-hidden
                shadow-[0_28px_90px_rgba(0,0,0,0.30)]
              "
            >

              <div
                onPointerDown={(
                  event
                ) =>
                  controls.start(
                    event
                  )
                }
                className="
                  pt-3 pb-2
                  cursor-grab
                  active:cursor-grabbing
                  touch-none
                  select-none
                "
              >
                <div className="
                  w-10 h-[5px]
                  rounded-full
                  bg-black/15
                  dark:bg-white/20
                  mx-auto
                " />
              </div>

              {(title ||
                eyebrow) && (
                <div className="
                  flex
                  items-start
                  justify-between
                  gap-4
                  px-5
                  pb-4
                ">

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
                        text-[25px]
                        font-bold
                        tracking-[-0.04em]
                        mt-1
                      ">
                        {title}
                      </h2>
                    )}

                  </div>

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
                    "
                  >
                    <X size={17} />
                  </button>

                </div>
              )}

              <div className="
                max-h-[78dvh]
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
