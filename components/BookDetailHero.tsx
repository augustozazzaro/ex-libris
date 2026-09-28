'use client'

import {
  motion,
} from 'framer-motion'

import {
  ArrowUpRight,
  House,
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
  const loaned =
    status === 'loaned'

  return (
    <section className="relative overflow-hidden rounded-[32px] mt-6">

      <div className="absolute inset-0 bg-[#ECE6DA]" />

      {coverUrl && (
        <>
          <div
            className="absolute inset-[-45px] bg-cover bg-center scale-110 blur-[42px] opacity-35"
            style={{
              backgroundImage:
                `url("${coverUrl}")`,
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/50 to-[#f4f1eb]/95 dark:from-black/5 dark:via-black/40 dark:to-[#1c1c1e]/95" />
        </>
      )}

      <div className="relative px-5 pt-7 pb-6 md:px-8 md:pt-9">

        <div className="absolute top-4 right-4">

          <div
            className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/25 backdrop-blur-xl border border-white/50 dark:border-white/10 flex items-center justify-center shadow-sm"
            title={
              loaned
                ? 'In prestito'
                : 'A casa'
            }
          >
            {loaned ? (
              <ArrowUpRight
                size={18}
              />
            ) : (
              <House
                size={18}
              />
            )}
          </div>

        </div>

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
          className="w-[145px] md:w-[188px] aspect-[2/3] rounded-[18px] overflow-hidden shadow-[0_18px_55px_rgba(0,0,0,0.24)] mx-auto"
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
            <p className="text-[#636366] dark:text-[#aeaeb2] text-[16px] mt-2">
              {subtitle}
            </p>
          )}

          {authors?.length ? (
            <p className="text-[19px] md:text-[21px] font-medium mt-4">
              {authors.join(', ')}
            </p>
          ) : null}

          {publisher && (
            <p className="text-[#8e8e93] text-[15px] mt-1">
              {publisher}
            </p>
          )}

          <div className="flex items-center justify-center gap-8 mt-5">

            {publicationYear && (
              <div className="text-center">
                <p className="text-[#8e8e93] text-[10px] uppercase tracking-[0.08em]">
                  Anno
                </p>

                <p className="font-semibold text-[17px] mt-0.5">
                  {publicationYear}
                </p>
              </div>
            )}

            {pages && (
              <div className="text-center">
                <p className="text-[#8e8e93] text-[10px] uppercase tracking-[0.08em]">
                  Pagine
                </p>

                <p className="font-semibold text-[17px] mt-0.5">
                  {pages}
                </p>
              </div>
            )}

          </div>

          {locationPath && (
            <div className="mt-5 flex items-center justify-center gap-1.5 text-[#636366] dark:text-[#c7c7cc] text-[13px]">

              <MapPin
                size={14}
                className="shrink-0"
              />

              <span className="truncate">
                {locationPath}
              </span>

            </div>
          )}

        </motion.div>

      </div>

    </section>
  )
}
