'use client'

import {
  motion,
} from 'framer-motion'

import {
  MapPin,
} from 'lucide-react'

import BookCover from '@/components/BookCover'

type Props = {
  title: string
  subtitle?: string | null
  authors?: string[] | null
  publisher?: string | null
  publicationYear?: number | null
  pages?: number | null
  status?: string | null
  coverUrl?: string | null
  locationPath?: string | null
}

function statusLabel(
  status?: string | null
) {
  switch (status) {
    case 'home':
      return 'A casa'
    case 'loaned':
      return 'In prestito'
    default:
      return status || null
  }
}

export default function BookDetailHero({
  title,
  subtitle,
  authors,
  publisher,
  publicationYear,
  pages,
  status,
  coverUrl,
  locationPath,
}: Props) {
  return (
    <section className="relative overflow-hidden rounded-[32px] mt-6">

      <div className="absolute inset-0 bg-[#ECE6DA]" />

      {coverUrl && (
        <>
          <div
            className="absolute inset-[-40px] bg-cover bg-center scale-110 blur-[38px] opacity-35"
            style={{
              backgroundImage:
                `url("${coverUrl}")`,
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/45 to-[#f4f1eb]/95 dark:from-black/10 dark:via-black/40 dark:to-[#1c1c1e]/95" />
        </>
      )}

      <div className="relative px-5 pt-8 pb-6 md:px-8 md:pt-10">

        <motion.div
          initial={{
            opacity: 0,
            y: 18,
            scale: 0.96,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 250,
            damping: 24,
          }}
          className="w-[148px] md:w-[190px] aspect-[2/3] rounded-[18px] overflow-hidden shadow-[0_18px_55px_rgba(0,0,0,0.24)] mx-auto"
        >
          <BookCover
            title={title}
            authors={authors}
            coverUrl={coverUrl}
          />
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            y: 14,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.08,
            duration: 0.38,
          }}
          className="text-center max-w-2xl mx-auto mt-6"
        >

          <h1 className="text-[34px] md:text-[44px] leading-[1.02] font-bold tracking-[-0.045em]">
            {title}
          </h1>

          {subtitle && (
            <p className="text-[#636366] dark:text-[#aeaeb2] text-[17px] mt-2">
              {subtitle}
            </p>
          )}

          {authors?.length ? (
            <p className="text-[19px] md:text-[21px] font-medium mt-4">
              {authors.join(', ')}
            </p>
          ) : null}

          {publisher && (
            <p className="text-[#8e8e93] text-[16px] mt-1">
              {publisher}
            </p>
          )}

          <div className="flex items-center justify-center gap-7 mt-6">

            {publicationYear && (
              <div className="text-center">
                <p className="text-[#8e8e93] text-[11px] uppercase tracking-[0.08em]">
                  Anno
                </p>
                <p className="font-semibold text-[17px] mt-0.5">
                  {publicationYear}
                </p>
              </div>
            )}

            {pages && (
              <div className="text-center">
                <p className="text-[#8e8e93] text-[11px] uppercase tracking-[0.08em]">
                  Pagine
                </p>
                <p className="font-semibold text-[17px] mt-0.5">
                  {pages}
                </p>
              </div>
            )}

          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-6">

            {statusLabel(status) && (
              <span className="bg-white/55 dark:bg-white/10 backdrop-blur-xl rounded-full px-3.5 py-2 text-sm font-medium border border-white/50 dark:border-white/10">
                {statusLabel(status)}
              </span>
            )}

            {locationPath && (
              <span className="bg-white/55 dark:bg-white/10 backdrop-blur-xl rounded-full px-3.5 py-2 text-sm font-medium border border-white/50 dark:border-white/10 flex items-center gap-1.5 max-w-full">
                <MapPin
                  size={15}
                  className="shrink-0"
                />
                <span className="truncate">
                  {locationPath}
                </span>
              </span>
            )}

          </div>

        </motion.div>

      </div>

    </section>
  )
}
