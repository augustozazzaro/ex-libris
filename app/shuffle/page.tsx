'use client'

import {
  useEffect,
  useMemo,
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
  RefreshCw,
  Shuffle,
} from 'lucide-react'

import {
  AnimatePresence,
  motion,
} from 'framer-motion'

import { createClient } from '@/utils/supabase/client'
import BookCover from '@/components/BookCover'

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

  useEffect(() => {
    loadBooks()
  }, [])

  async function loadBooks() {
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Sessione non disponibile.')
      setLoading(false)
      return
    }

    const { data: membership } =
      await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!membership) {
      setError('Biblioteca non trovata.')
      setLoading(false)
      return
    }

    const [
      booksResult,
      locationsResult,
      statesResult,
    ] = await Promise.all([
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
        .eq('family_id', membership.family_id),

      supabase
        .from('locations')
        .select(`
          id,
          name,
          parent_id
        `)
        .eq('family_id', membership.family_id),

      supabase
        .from('user_book_state')
        .select(`
          book_id,
          reading_status
        `)
        .eq('user_id', user.id),
    ])

    if (booksResult.error) {
      setError(booksResult.error.message)
      setLoading(false)
      return
    }

    const readIds = new Set(
      (statesResult.data ?? [])
        .filter(
          (row) =>
            row.reading_status === 'read'
        )
        .map(
          (row) =>
            row.book_id
        )
    )

    const available =
      (booksResult.data ?? [])
        .filter(
          (book) =>
            !readIds.has(book.id)
        ) as Book[]

    const shuffled =
      [...available].sort(
        () => Math.random() - 0.5
      )

    setBooks(shuffled)

    setLocations(
      (locationsResult.data ?? []) as Location[]
    )

    setCurrentIndex(0)
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

  function goNext() {
    if (books.length <= 1) return

    setDirection(1)
    setSaved(false)

    setCurrentIndex(
      (prev) =>
        (prev + 1) %
        books.length
    )
  }

  function goPrevious() {
    if (books.length <= 1) return

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
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-black/15 border-t-black rounded-full animate-spin" />
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

  return (
    <main className="exl-page">

      <div className="max-w-xl mx-auto px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-32">

        <div className="flex items-center justify-between">

          <Link
            href="/"
            className="exl-glass w-11 h-11 rounded-full flex items-center justify-center exl-press"
          >
            <ArrowLeft size={20} />
          </Link>

          <div className="flex items-center gap-2 text-[#8e8e93] text-sm">
            <Shuffle size={16} />

            <span>
              {currentIndex + 1} / {books.length}
            </span>
          </div>

        </div>

        <header className="mt-7">

          <p className="text-[#5E7FA3] text-sm font-semibold">
            Cosa leggo?
          </p>

          <h1 className="text-[38px] font-bold tracking-[-0.045em] mt-1">
            Shuffle
          </h1>

        </header>

        <section className="mt-6 relative min-h-[650px]">

          {books.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrevious}
                aria-label="Libro precedente"
                className="hidden md:flex absolute left-[-54px] top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full exl-glass items-center justify-center exl-press"
              >
                <ChevronLeft
                  size={22}
                />
              </button>

              <button
                type="button"
                onClick={goNext}
                aria-label="Libro successivo"
                className="hidden md:flex absolute right-[-54px] top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full exl-glass items-center justify-center exl-press"
              >
                <ChevronRight
                  size={22}
                />
              </button>
            </>
          )}

          {nextBookData && (
            <div className="absolute inset-x-3 top-3 bottom-0 rounded-[34px] bg-black/5 scale-[0.96] opacity-50" />
          )}

          <AnimatePresence
            initial={false}
            custom={direction}
            mode="popLayout"
          >
            <motion.div
              key={currentBook.id}
              custom={direction}
              initial={{
                x:
                  direction > 0
                    ? 70
                    : -70,
                opacity: 0,
                scale: 0.97,
              }}
              animate={{
                x: 0,
                opacity: 1,
                scale: 1,
              }}
              exit={{
                x:
                  direction > 0
                    ? -120
                    : 120,
                opacity: 0,
                rotate:
                  direction > 0
                    ? -3
                    : 3,
              }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 30,
              }}
              drag="x"
              dragConstraints={{
                left: 0,
                right: 0,
              }}
              dragElastic={0.18}
              onDragEnd={(
                _,
                info
              ) => {
                if (
                  info.offset.x < -80 ||
                  info.velocity.x < -500
                ) {
                  goNext()
                  return
                }

                if (
                  info.offset.x > 80 ||
                  info.velocity.x > 500
                ) {
                  goPrevious()
                }
              }}
              className="relative overflow-hidden rounded-[34px] shadow-[0_20px_60px_rgba(0,0,0,0.14)] cursor-grab active:cursor-grabbing"
            >

              <div className="absolute inset-0 bg-[#ECE6DA]" />


              <div className="relative p-6">

                <div className="flex justify-center">

                  <div className="w-[58%] max-w-[250px] aspect-[2/3] rounded-[20px] overflow-hidden bg-white/50 shadow-[0_16px_40px_rgba(0,0,0,0.20)]">

                    <BookCover
                      title={currentBook.title}
                      authors={currentBook.authors}
                      coverUrl={cover}
                    />

                  </div>

                </div>

                <div className="mt-6 text-center">

                  <h2 className="text-[28px] font-bold tracking-[-0.04em] leading-tight">
                    {currentBook.title}
                  </h2>

                  {currentBook.authors?.[0] && (
                    <p className="text-[#6e6e73] text-[16px] mt-2">
                      {currentBook.authors.join(', ')}
                    </p>
                  )}

                </div>

                <div className="flex justify-center gap-2 flex-wrap mt-5">

                  {currentBook.pages && (
                    <span className="bg-white/65 backdrop-blur-md rounded-full px-3 py-2 text-xs font-medium">
                      {currentBook.pages} pagine
                    </span>
                  )}

                  <span className="bg-white/65 backdrop-blur-md rounded-full px-3 py-2 text-xs font-medium flex items-center gap-1.5">
                    <MapPin size={13} />
                    {location}
                  </span>

                </div>

                {currentBook.description && (
                  <p className="text-[#3a3a3c] text-[15px] leading-relaxed mt-6 line-clamp-5">
                    {currentBook.description}
                  </p>
                )}

                <div className="grid grid-cols-[1fr_auto] gap-3 mt-6">

                  <button
                    onPointerDown={(e) =>
                      e.stopPropagation()
                    }
                    onClick={saveToRead}
                    disabled={saving}
                    className={`rounded-[18px] py-4 px-4 font-semibold flex items-center justify-center gap-2 exl-press ${
                      saved
                        ? 'bg-[#34c759] text-white'
                        : 'bg-black text-white'
                    }`}
                  >

                    {saved ? (
                      <>
                        <Check size={19} />
                        Salvato
                      </>
                    ) : (
                      <>
                        <BookmarkPlus size={19} />
                        Da leggere
                      </>
                    )}

                  </button>

                  <button
                    onPointerDown={(e) =>
                      e.stopPropagation()
                    }
                    onClick={goNext}
                    className="w-14 h-14 rounded-[18px] bg-white/70 backdrop-blur-md flex items-center justify-center exl-press"
                    aria-label="Prossimo libro"
                  >
                    <RefreshCw size={20} />
                  </button>

                </div>

                <Link
                  href={`/books/${currentBook.id}`}
                  onPointerDown={(e) =>
                    e.stopPropagation()
                  }
                  className="mt-3 py-3 flex items-center justify-center gap-1 text-[#5E7FA3] text-sm font-semibold"
                >
                  Apri scheda
                  <ChevronRight size={16} />
                </Link>

              </div>

            </motion.div>
          </AnimatePresence>

          <p className="text-center text-[#8e8e93] text-xs mt-5">
            Scorri ← o → per cambiare libro
          </p>

        </section>

      </div>

    </main>
  )
}
