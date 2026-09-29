'use client'

import {
  useEffect,
} from 'react'

import {
  AnimatePresence,
  motion,
} from 'framer-motion'

type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ExLibrisConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () =>
      window.removeEventListener(
        'keydown',
        handleKeyDown
      )
  }, [open, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-black/25 backdrop-blur-[8px] px-3 pb-[max(12px,env(safe-area-inset-bottom))] md:p-6"
          onClick={onCancel}
        >
          <motion.div
            initial={{
              y: 24,
              scale: 0.97,
              opacity: 0,
            }}
            animate={{
              y: 0,
              scale: 1,
              opacity: 1,
            }}
            exit={{
              y: 20,
              scale: 0.98,
              opacity: 0,
            }}
            transition={{
              type: 'spring',
              stiffness: 360,
              damping: 30,
            }}
            onClick={(event) =>
              event.stopPropagation()
            }
            className="w-full max-w-[420px] bg-white/92 dark:bg-[#2c2c2e]/94 backdrop-blur-[32px] rounded-[30px] border border-white/70 dark:border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.24)] p-5"
          >
            <h2 className="text-[22px] font-bold tracking-[-0.03em]">
              {title}
            </h2>

            <p className="text-[#6e6e73] dark:text-[#aeaeb2] leading-relaxed mt-2">
              {message}
            </p>

            <div className="grid grid-cols-2 gap-2 mt-6">
              <button
                onClick={onCancel}
                className="rounded-[18px] py-3.5 bg-black/5 dark:bg-white/10 font-semibold exl-press"
              >
                {cancelLabel}
              </button>

              <button
                onClick={onConfirm}
                className={`rounded-[18px] py-3.5 font-semibold text-white exl-press ${
                  destructive
                    ? 'bg-[#ff3b30]'
                    : 'bg-black dark:bg-white dark:text-black'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
