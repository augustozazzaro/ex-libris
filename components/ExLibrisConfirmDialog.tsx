'use client'

import {
  AlertTriangle,
  Check,
  Trash2,
} from 'lucide-react'

import {
  motion,
} from 'framer-motion'

import AdaptiveGlassModal from '@/components/glass/AdaptiveGlassModal'

import {
  haptic,
} from '@/utils/haptics'

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
  function cancel() {
    haptic('light')
    onCancel()
  }

  function confirm() {
    haptic(
      destructive
        ? 'medium'
        : 'success'
    )

    onConfirm()
  }

  return (
    <AdaptiveGlassModal
      open={open}
      onClose={cancel}
      eyebrow={
        destructive
          ? 'Attenzione'
          : 'Ex Libris'
      }
      title={title}
      maxWidth="420px"
    >
      <div className="px-5 pb-5">

        <motion.div
          initial={{
            opacity: 0,
            y: 6,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="pt-1"
        >

          <div
            className={`w-12 h-12 rounded-[16px] flex items-center justify-center ${
              destructive
                ? 'bg-[#ff3b30]/10 text-[#ff3b30]'
                : 'bg-[#5E7FA3]/12 text-[#5E7FA3]'
            }`}
          >
            {destructive ? (
              <AlertTriangle
                size={22}
                strokeWidth={1.9}
              />
            ) : (
              <Check
                size={21}
                strokeWidth={2}
              />
            )}
          </div>

          <p className="text-[#6e6e73] dark:text-[#aeaeb2] text-[15px] leading-relaxed mt-4">
            {message}
          </p>

        </motion.div>

        <div className="grid grid-cols-2 gap-2 mt-6">

          <button
            type="button"
            onClick={cancel}
            className="min-h-[50px] rounded-[18px] bg-black/[0.045] dark:bg-white/[0.09] font-semibold exl-press"
          >
            {cancelLabel}
          </button>

          <motion.button
            type="button"
            whileTap={{
              scale: 0.975,
            }}
            onClick={confirm}
            className={`min-h-[50px] rounded-[18px] font-semibold flex items-center justify-center gap-2 shadow-[0_7px_20px_rgba(0,0,0,0.10)] ${
              destructive
                ? 'bg-[#ff3b30] text-white'
                : 'bg-black text-white dark:bg-white dark:text-black'
            }`}
          >
            {destructive && (
              <Trash2
                size={17}
              />
            )}

            {confirmLabel}
          </motion.button>

        </div>

      </div>
    </AdaptiveGlassModal>
  )
}
