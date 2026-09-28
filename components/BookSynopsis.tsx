'use client'

import {
  useState,
} from 'react'

import {
  motion,
} from 'framer-motion'

import {
  AlignLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

type Props = {
  text: string
}

export default function BookSynopsis({
  text,
}: Props) {
  const [expanded, setExpanded] =
    useState(false)

  const long =
    text.length > 420

  return (
    <section className="exl-glass exl-card p-5 md:p-6 mt-5 overflow-hidden">

      <div className="flex items-center gap-2">

        <div className="w-8 h-8 rounded-[11px] bg-[#5E7FA3]/12 flex items-center justify-center">
          <AlignLeft
            size={17}
            className="text-[#5E7FA3]"
          />
        </div>

        <div>
          <p className="text-[#8e8e93] text-xs">
            Il libro
          </p>

          <h2 className="font-bold text-[19px] tracking-[-0.02em]">
            Trama
          </h2>
        </div>

      </div>

      <motion.div
        animate={{
          height: 'auto',
        }}
        className="relative mt-4"
      >

        <p
          className={`text-[#48484a] dark:text-[#d1d1d6] leading-[1.58] text-[15px] ${
            !expanded && long
              ? 'line-clamp-6'
              : ''
          }`}
        >
          {text}
        </p>

        {!expanded && long && (
          <div className="absolute left-0 right-0 bottom-0 h-12 bg-gradient-to-t from-[#f4f1eb] dark:from-[#242426] to-transparent pointer-events-none" />
        )}

      </motion.div>

      {long && (
        <button
          type="button"
          onClick={() =>
            setExpanded(
              !expanded
            )
          }
          className="mt-4 font-semibold text-[#5E7FA3] text-sm flex items-center gap-1.5 exl-press"
        >
          {expanded
            ? 'Mostra meno'
            : 'Leggi tutto'}

          {expanded ? (
            <ChevronUp
              size={16}
            />
          ) : (
            <ChevronDown
              size={16}
            />
          )}
        </button>
      )}

    </section>
  )
}
