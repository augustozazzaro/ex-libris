'use client'

import ExLibrisLoader from '@/components/ExLibrisLoader'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import Link from 'next/link'

import {
  ArrowLeft,
  BookOpen,
  BookmarkPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Shuffle,
} from 'lucide-react'

import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from 'framer-motion'

import { createClient } from '@/utils/supabase/client'
import BookCover from '@/components/BookCover'

import {
  haptic,
} from '@/utils/haptics'
import {
  readCache,
  writeCache,
} from '@/utils/exlibris-cache'

type Book = {
  id: string
  title: string
  subtitle: string | null
  authors: string[] | null
  cover_url: string | null
  custom_cover_url: string | null
  description: string | null
  pages: number | null
  location_id: string | null
}

type Location = {
  id: string
  name: string
  parent_id: string | null
}

type ShuffleSnapshot = {
  books: Book[]
  locations: Location[]
}

export default function ShufflePage() {
  const supabase = createClient()

  const [books, setBooks] =
    useState<Book[]>([])

  const [locations, setLocations] =
    useState<Location[]>([])

  const [currentIndex, setCurrentIndex] =
    useState(0)

  const [direction, setDirection] =
    useState(1)

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [saved, setSaved] =
    useState(false)

  const [error, setError] =
    useState('')

  const dragX =
    useMotionValue(0)

  const dragProgress =
    useTransform(
      dragX,
      [-140, 0, 140],
      [1, 0, 1]
    )

  const nextCardScale =
    useTransform(
      dragProgress,
      [0, 1],
      [0.958, 0.99]
    )

  const nextCardY =
    useTransform(
      dragProgress,
      [0, 1],
      [10, 3]
    )

  const nextCardOpacity =
    useTransform(
      dragProgress,
      [0, 1],
      [0.76, 0.96]
    )

  const dragThresholdRef =
    useRef(false)

  useEffect(() => {
    if (
      typeof window ===
        'undefined' ||
      books.length === 0
    ) {
      return
    }

    const indexes = [
      currentIndex,
      (
        currentIndex +
        1
      ) % books.length,
      (
        currentIndex +
        2
      ) % books.length,
      (
        currentIndex -
        1 +
        books.length
      ) % books.length,
    ]

    for (
      const index of
      indexes
    ) {
      const item =
        books[index]

      if (!item) continue

      const url =
        item.custom_cover_url ||
        item.cover_url

      if (!url) continue

      const image =
        new Image()

      image.decoding =
        'async'

      image.src =
        url
    }
  }, [
    books,
    currentIndex,
  ])

  useEffect(() => {
    loadBooks()
  }, [])

  async function loadBooks() {
    setError('')

    const {
      data: { session },
    } =
      await supabase.auth.getSession()

    const user =
      session?.user

    if (!user) {
      setError(
        'Sessione non disponibile.'
      )
      setLoading(false)
      return
    }

    const cacheKey =
      `shuffle:${user.id}`

    const cached =
      readCache<ShuffleSnapshot>(
        cacheKey
      )

    if (cached) {
      setBooks(
        cached.books
      )

      setLocations(
        cached.locations
      )

      setCurrentIndex(0)
      setLoading(false)
    } else {
      setLoading(true)
    }

    const {
      data: membership,
      error: membershipError,
    } =
      await supabase
        .from('family_members')
        .select('family_id')
        .eq(
          'user_id',
          user.id
        )
        .maybeSingle()

    if (
      membershipError ||
      !membership
    ) {
      if (!cached) {
        setError(
          'Biblioteca non trovata.'
        )
      }

      setLoading(false)
      return
    }

    const [
      booksResult,
      locationsResult,
      statesResult,
    ] =
      await Promise.all([
        supabase
          .from('books')
          .select(`
            id,
            title,
            subtitle,
            authors,
            cover_url,
            custom_cover_url,
            description,
            pages,
            location_id
          `)
          .eq(
            'family_id',
            membership.family_id
          ),

        supabase
          .from('locations')
          .select(`
            id,
            name,
            parent_id
          `)
          .eq(
            'family_id',
            membership.family_id
          ),

        supabase
          .from('user_book_state')
          .select(`
            book_id,
            reading_status
          `)
          .eq(
            'user_id',
            user.id
          ),
      ])

    if (
      booksResult.error
    ) {
      if (!cached) {
        setError(
          booksResult.error.message
        )
      }

      setLoading(false)
      return
    }

    const readIds =
      new Set(
        (
          statesResult.data ??
          []
        )
          .filter(
            (
              row: {
                book_id: string
                reading_status:
                  string | null
              }
            ) =>
              row.reading_status ===
              'read'
          )
          .map(
            (
              row: {
                book_id: string
                reading_status:
                  string | null
              }
            ) =>
              row.book_id
          )
      )

    const available =
      (
        booksResult.data ??
        []
      ).filter(
        (
          book: Book
        ) =>
          !readIds.has(
            book.id
          )
      ) as Book[]

    const shuffled =
      [...available].sort(
        () =>
          Math.random() -
          0.5
      )

    const snapshot:
      ShuffleSnapshot = {
        books:
          shuffled,

        locations:
          (
            locationsResult.data ??
            []
          ) as Location[],
      }

    setBooks(
      snapshot.books
    )

    setLocations(
      snapshot.locations
    )

    setCurrentIndex(0)

    writeCache(
      cacheKey,
      snapshot
    )

    setLoading(false)
  }

  const currentBook =
    books[currentIndex]

  const nextBookData =
    books.length > 1
      ? books[
          (currentIndex + 1) %
            books.length
        ]
      : undefined


  /*
   * Tutte queste animazioni avvengono
   * fuori dal ciclo di rendering React.
   *
   * Risultato: la card segue il dito
   * direttamente sul layer composito.
   */
  const cardRotate =
    useTransform(
      dragX,
      [-160, 0, 160],
      [-5, 0, 5]
    )

  const nextScale =
    useTransform(
      dragX,
      [-140, 0, 140],
      [0.99, 0.955, 0.99]
    )

  const nextY =
    useTransform(
      dragX,
      [-140, 0, 140],
      [4, 12, 4]
    )

  const nextOpacity =
    useTransform(
      dragX,
      [-140, 0, 140],
      [0.9, 0.68, 0.9]
    )

  const previousOpacity =
    useTransform(
      dragX,
      [0, 18, 100],
      [0, 0, 0.9]
    )

  const previousX =
    useTransform(
      dragX,
      [0, 18, 100],
      [-8, -8, 0]
    )

  const nextOpacityHint =
    useTransform(
      dragX,
      [-100, -18, 0],
      [0.9, 0, 0]
    )

  const nextXHint =
    useTransform(
      dragX,
      [-100, -18, 0],
      [0, 8, 8]
    )

  const coverScale =
    useTransform(
      dragX,
      [-140, 0, 140],
      [1.012, 1, 1.012]
    )

  const coverY =
    useTransform(
      dragX,
      [-140, 0, 140],
      [-2, 0, -2]
    )

  const locationMap =
    useMemo(() => {
      return new Map(
        locations.map(
          (location) => [
            location.id,
            location,
          ]
        )
      )
    }, [locations])

  function buildLocationPath(
    locationId: string | null
  ) {
    if (!locationId) {
      return 'Posizione non indicata'
    }

    const parts: string[] = []

    let current =
      locationMap.get(locationId)

    let safety = 0

    while (
      current &&
      safety < 10
    ) {
      parts.unshift(current.name)

      current =
        current.parent_id
          ? locationMap.get(
              current.parent_id
            )
          : undefined

      safety += 1
    }

    return parts.join(' · ')
  }

  function goNext(
    feedback = true
  ) {
    if (books.length <= 1) return

    if (feedback) {
      haptic('light')
    }

    setDirection(1)
    setSaved(false)

    setCurrentIndex(
      (prev) =>
        (prev + 1) %
        books.length
    )
  }

  function goPrevious(
    feedback = true
  ) {
    if (books.length <= 1) return

    if (feedback) {
      haptic('light')
    }

    setDirection(-1)
    setSaved(false)

    setCurrentIndex(
      (prev) =>
        (
          prev - 1 +
          books.length
        ) %
        books.length
    )
  }

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      const target =
        event.target as HTMLElement | null

      if (
        target?.closest(
          'input, textarea, select, button, a, [contenteditable="true"]'
        )
      ) {
        return
      }

      if (
        event.key ===
        'ArrowRight'
      ) {
        event.preventDefault()
        goNext()
        return
      }

      if (
        event.key ===
        'ArrowLeft'
      ) {
        event.preventDefault()
        goPrevious()
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      )
    }
  }, [books.length])

  async function saveToRead() {
    if (!currentBook) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    setSaving(true)
    setSaved(false)

    const { error } = await supabase
      .from('user_book_state')
      .upsert(
        {
          user_id: user.id,
          book_id: currentBook.id,
          reading_status: 'to_read',
        },
        {
          onConflict:
            'user_id,book_id',
        }
      )

    if (!error) {
      setSaved(true)
      haptic('success')
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <ExLibrisLoader />
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen px-5 pt-[calc(16px+env(safe-area-inset-top))]">
        <div className="max-w-md mx-auto">
          <Link
            href="/"
            className="exl-glass w-11 h-11 rounded-full flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </Link>

          <div className="exl-glass exl-card p-5 mt-6 text-red-500">
            {error}
          </div>
        </div>
      </main>
    )
  }

  if (!currentBook) {
    return (
      <main className="min-h-screen px-5 pt-[calc(16px+env(safe-area-inset-top))]">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-[20px] bg-black text-white mx-auto flex items-center justify-center mt-16">
            <Shuffle size={28} />
          </div>

          <h1 className="text-[30px] font-bold mt-5">
            Hai letto tutto?
          </h1>

          <p className="text-[#8e8e93] mt-2">
            Non trovo altri libri non letti da proporti.
          </p>
        </div>
      </main>
    )
  }

  const cover =
    currentBook.custom_cover_url ||
    currentBook.cover_url

  const location =
    buildLocationPath(
      currentBook.location_id
    )

  const hasDescription =
    Boolean(
      currentBook.description
        ?.trim()
    )

  const nextCover =
    nextBookData
      ? (
          nextBookData.custom_cover_url ||
          nextBookData.cover_url
        )
      : null

  const nextLocation =
    nextBookData
      ? buildLocationPath(
          nextBookData.location_id
        )
      : ''

  return (
    <main className="exl-page overflow-x-hidden">

      <div className="max-w-xl mx-auto px-4 sm:px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-32">

        <div className="flex items-center justify-between">

          <Link
            href="/"
            className="exl-glass w-11 h-11 rounded-full flex items-center justify-center exl-press"
          >
            <ArrowLeft size={20} />
          </Link>

          <div className="flex items-center gap-2">

            <div className="h-9 px-3 rounded-full bg-black/[0.045] dark:bg-white/[0.08] flex items-center gap-2 text-[#8e8e93] text-xs font-medium">
              <Shuffle size={14} />

              <span className="tabular-nums">
                {currentIndex + 1}
              </span>

              <span className="opacity-40">
                /
              </span>

              <span className="tabular-nums">
                {books.length}
              </span>
            </div>

          </div>

        </div>

        <header className="mt-6 px-1">

          <p className="text-[#5E7FA3] text-[13px] font-semibold">
            Cosa leggo?
          </p>

          <div className="flex items-end justify-between gap-4 mt-0.5">

            <h1 className="text-[38px] font-bold tracking-[-0.05em] leading-none">
              Shuffle
            </h1>

            <p className="text-[#8e8e93] text-[11px] text-right md:hidden">
              Trascina la scheda
            </p>

          </div>

        </header>

        <section className="mt-5 relative">

          {/* FRECCE SOLO DESKTOP */}
          {books.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  goPrevious()
                }
                aria-label="Libro precedente"
                className="hidden md:flex absolute left-[-56px] top-[42%] -translate-y-1/2 z-40 w-11 h-11 rounded-full exl-glass items-center justify-center exl-press"
              >
                <ChevronLeft
                  size={21}
                />
              </button>

              <button
                type="button"
                onClick={() =>
                  goNext()
                }
                aria-label="Libro successivo"
                className="hidden md:flex absolute right-[-56px] top-[42%] -translate-y-1/2 z-40 w-11 h-11 rounded-full exl-glass items-center justify-center exl-press"
              >
                <ChevronRight
                  size={21}
                />
              </button>
            </>
          )}

          {/* CARD SUCCESSIVA: solo profondità, niente contenuto visibile */}
          {nextBookData && (
            <motion.div
              aria-hidden
              style={{
                scale: nextCardScale,
                y: nextCardY,
                opacity: nextCardOpacity,
                willChange:
                  'transform, opacity',
              }}
              className="absolute inset-x-2 top-2 bottom-5 rounded-[34px] overflow-hidden bg-black/[0.035] dark:bg-white/[0.06] border border-white/35 dark:border-white/10 shadow-[0_10px_28px_rgba(0,0,0,0.06)] transform-gpu"
            />
          )}

          <AnimatePresence
            initial={false}
            custom={direction}
            mode="sync"
          >
            <motion.article
              key={currentBook.id}
              custom={direction}
              initial={{
                x:
                  direction > 0
                    ? 6
                    : -6,
                opacity: 1,
                scale: 0.998,
              }}
              animate={{
                x: 0,
                opacity: 1,
                scale: 1,
              }}
              exit={{
                x:
                  direction > 0
                    ? -160
                    : 160,
                opacity: 0,
                scale: 0.975,
              }}
              transition={{
                type: 'spring',
                stiffness: 430,
                damping: 36,
                mass: 0.55,
              }}

              drag={
                books.length > 1
                  ? 'x'
                  : false
              }

              dragConstraints={{
                left: 0,
                right: 0,
              }}

              dragElastic={0.38}

              dragTransition={{
                bounceStiffness: 520,
                bounceDamping: 38,
              }}

              dragMomentum={false}

              onDragStart={() => {
                dragX.stop()
              }}

              onDrag={(
                _,
                info
              ) => {
                const x =
                  info.offset.x

                dragX.set(x)

                const crossed =
                  Math.abs(x) >
                  88

                if (
                  crossed &&
                  !dragThresholdRef.current
                ) {
                  dragThresholdRef.current =
                    true

                  haptic('medium')
                }

                if (
                  Math.abs(x) <
                  58
                ) {
                  dragThresholdRef.current =
                    false
                }
              }}

              onDragEnd={(
                _,
                info
              ) => {
                const shouldNext =
                  info.offset.x <
                    -88 ||
                  info.velocity.x <
                    -650

                const shouldPrevious =
                  info.offset.x >
                    88 ||
                  info.velocity.x >
                    650

                dragThresholdRef.current =
                  false

                animate(
                  dragX,
                  0,
                  {
                    type: 'spring',
                    stiffness: 560,
                    damping: 42,
                    mass: 0.55,
                  }
                )

                if (shouldNext) {
                  goNext(false)
                  return
                }

                if (
                  shouldPrevious
                ) {
                  goPrevious(false)
                }
              }}

              style={{
                rotate:
                  cardRotate,
                willChange:
                  'transform',
              }}

              className="relative overflow-hidden rounded-[34px] shadow-[0_16px_42px_rgba(0,0,0,0.13)] cursor-grab active:cursor-grabbing touch-pan-y select-none transform-gpu [backface-visibility:hidden] [contain:paint]"
            >

              {/* ATMOSFERA DALLA COPERTINA */}
              <div className="absolute inset-0 bg-[#ECE6DA] dark:bg-[#272727]" />

              {cover && (
                <>
                  <div
                    className="absolute inset-[-50px] bg-cover bg-center blur-[42px] scale-110 opacity-[0.58] dark:opacity-[0.42]"
                    style={{
                      backgroundImage:
                        `url("${cover}")`,
                    }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-[#f5f1e9]/70 to-[#f5f1e9]/95 dark:from-black/15 dark:via-[#242426]/75 dark:to-[#242426]/95" />
                </>
              )}

              {!cover && (
                <>
                  <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-[#5E7FA3]/20 blur-[65px]" />
                  <div className="absolute bottom-[-70px] left-[-50px] w-60 h-60 rounded-full bg-[#DDB342]/15 blur-[65px]" />
                </>
              )}

              <div className="absolute inset-0 rounded-[34px] border border-white/45 dark:border-white/10 pointer-events-none" />

              {/* INDICATORI DI SWIPE */}
              <motion.div
                aria-hidden
                style={{
                  opacity:
                    previousOpacity,
                  x:
                    previousX,
                }}
                className="absolute left-5 top-5 z-30 rounded-full bg-white/55 dark:bg-black/35 backdrop-blur-md border border-white/40 dark:border-white/10 px-3 py-1.5 text-[11px] font-semibold"
              >
                ← Indietro
              </motion.div>

              <motion.div
                aria-hidden
                style={{
                  opacity:
                    nextOpacityHint,
                  x:
                    nextXHint,
                }}
                className="absolute right-5 top-5 z-30 rounded-full bg-white/55 dark:bg-black/35 backdrop-blur-md border border-white/40 dark:border-white/10 px-3 py-1.5 text-[11px] font-semibold"
              >
                Prossimo →
              </motion.div>

              <div
                className={`relative ${
                  hasDescription
                    ? 'p-5 sm:p-6'
                    : 'p-5 sm:p-7'
                }`}
              >

                {/* COPERTINA */}
                <motion.div
                  style={{
                    y:
                      coverY,
                    scale:
                      coverScale,
                    willChange:
                      'transform',
                  }}
                  className="flex justify-center pt-2"
                >
                  <div
                    className={`${
                      hasDescription
                        ? 'w-[52%] max-w-[215px]'
                        : 'w-[60%] max-w-[245px]'
                    } aspect-[2/3] rounded-[20px] overflow-hidden bg-white/45 shadow-[0_18px_45px_rgba(0,0,0,0.22)] ring-1 ring-white/30`}
                  >
                    <BookCover
                      title={
                        currentBook.title
                      }
                      authors={
                        currentBook.authors
                      }
                      coverUrl={
                        cover
                      }
                      priority
                    />
                  </div>
                </motion.div>

                {/* TITOLO */}
                <div
                  className={`text-center ${
                    hasDescription
                      ? 'mt-5'
                      : 'mt-6'
                  }`}
                >
                  <h2 className="text-[27px] sm:text-[30px] font-bold tracking-[-0.045em] leading-[1.05]">
                    {currentBook.title}
                  </h2>

                  {currentBook.subtitle && (
                    <p className="text-[#636366] dark:text-[#aeaeb2] text-[13px] mt-2 line-clamp-2">
                      {
                        currentBook.subtitle
                      }
                    </p>
                  )}

                  {currentBook.authors?.length ? (
                    <p className="text-[#59595e] dark:text-[#c7c7cc] text-[15px] font-medium mt-2">
                      {currentBook.authors.join(
                        ', '
                      )}
                    </p>
                  ) : null}
                </div>

                {/* METADATI */}
                <div className="flex justify-center gap-2 flex-wrap mt-4">

                  {currentBook.pages && (
                    <span className="bg-white/48 dark:bg-black/25 backdrop-blur-md border border-white/35 dark:border-white/10 rounded-full px-3 py-2 text-[11px] font-semibold">
                      {currentBook.pages}{' '}
                      pagine
                    </span>
                  )}

                  <span className="max-w-full bg-white/48 dark:bg-black/25 backdrop-blur-md border border-white/35 dark:border-white/10 rounded-full px-3 py-2 text-[11px] font-semibold flex items-center gap-1.5">
                    <MapPin
                      size={12}
                      className="shrink-0"
                    />

                    <span className="truncate">
                      {location}
                    </span>
                  </span>

                </div>

                {/* TRAMA SOLO QUANDO ESISTE */}
                {hasDescription && (
                  <div className="mt-5 rounded-[22px] bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/35 dark:border-white/10 px-4 py-4">

                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen
                        size={14}
                        className="text-[#5E7FA3]"
                      />

                      <span className="text-[11px] uppercase tracking-[0.08em] text-[#8e8e93] font-semibold">
                        In breve
                      </span>
                    </div>

                    <p className="text-[#3a3a3c] dark:text-[#d1d1d6] text-[14px] leading-[1.55] line-clamp-4">
                      {
                        currentBook.description
                      }
                    </p>

                  </div>
                )}

                {/* CTA */}
                <div
                  className={
                    hasDescription
                      ? 'mt-5'
                      : 'mt-7'
                  }
                >

                  <button
                    onPointerDown={(
                      event
                    ) =>
                      event
                        .stopPropagation()
                    }
                    onClick={
                      saveToRead
                    }
                    disabled={
                      saving
                    }
                    className={`w-full rounded-[19px] py-4 px-4 font-semibold flex items-center justify-center gap-2 exl-press shadow-[0_8px_24px_rgba(0,0,0,0.12)] ${
                      saved
                        ? 'bg-[#34c759] text-white'
                        : 'bg-black text-white dark:bg-white dark:text-black'
                    }`}
                  >
                    {saved ? (
                      <>
                        <Check
                          size={19}
                        />
                        Salvato tra i libri da leggere
                      </>
                    ) : (
                      <>
                        <BookmarkPlus
                          size={19}
                        />
                        Aggiungi a “Da leggere”
                      </>
                    )}
                  </button>

                  <Link
                    href={`/books/${currentBook.id}`}
                    onPointerDown={(
                      event
                    ) =>
                      event
                        .stopPropagation()
                    }
                    className="mt-2.5 min-h-[44px] flex items-center justify-center gap-1.5 text-[#5E7FA3] dark:text-[#86a6c8] text-[13px] font-semibold exl-press"
                  >
                    Apri scheda

                    <ChevronRight
                      size={15}
                    />
                  </Link>

                </div>

              </div>

            </motion.article>
          </AnimatePresence>

          <div className="mt-4 flex items-center justify-center gap-3 text-[#8e8e93]">

            <div className="w-7 h-px bg-black/10 dark:bg-white/10" />

            <p className="text-[11px]">
              <span className="md:hidden">
                Scorri a sinistra o a destra
              </span>

              <span className="hidden md:inline">
                Trascina la scheda oppure usa ← →
              </span>
            </p>

            <div className="w-7 h-px bg-black/10 dark:bg-white/10" />

          </div>

        </section>

      </div>

    </main>
  )
}
