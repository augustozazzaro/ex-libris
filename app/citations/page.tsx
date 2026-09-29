'use client'

import ExLibrisLoader from '@/components/ExLibrisLoader'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import Link from 'next/link'
import {
  useRouter,
} from 'next/navigation'

import {
  AnimatePresence,
  motion,
} from 'framer-motion'

import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Quote,
  Search,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'

import {
  createClient,
} from '@/utils/supabase/client'

import {
  haptic,
} from '@/utils/haptics'

import {
  readCache,
  writeCache,
} from '@/utils/exlibris-cache'

import BookCover from '@/components/BookCover'

type Citation = {
  id: string
  quote_text: string
  page: number | null
  note: string | null
  created_at: string
  edition_key: string
}

type Book = {
  id: string
  edition_key: string | null
  title: string
  authors: string[] | null
  cover_url: string | null
  custom_cover_url: string | null
}

type CitationWithBook =
  Citation & {
    book: Book | null
  }

type CitationsSnapshot = {
  citations: Citation[]
  books: Book[]
}

type SortMode =
  | 'recent'
  | 'oldest'
  | 'page'

export default function CitationsPage() {
  const supabase =
    createClient()

  const router =
    useRouter()

  const [
    citations,
    setCitations,
  ] =
    useState<Citation[]>([])

  const [books, setBooks] =
    useState<Book[]>([])

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [error, setError] =
    useState('')

  const [search, setSearch] =
    useState('')

  const [
    selectedEdition,
    setSelectedEdition,
  ] =
    useState('all')

  const [sort, setSort] =
    useState<SortMode>(
      'recent'
    )

  const [
    showFilters,
    setShowFilters,
  ] =
    useState(false)

  const [
    copiedId,
    setCopiedId,
  ] =
    useState<string | null>(
      null
    )

  const [
    surprise,
    setSurprise,
  ] =
    useState<CitationWithBook | null>(
      null
    )

  async function loadData() {
    setError('')

    const {
      data: { session },
    } =
      await supabase.auth
        .getSession()

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
      `citations:${user.id}`

    const cached =
      readCache<CitationsSnapshot>(
        cacheKey
      )

    if (cached) {
      setCitations(
        cached.citations
      )

      setBooks(
        cached.books
      )

      setLoading(false)
    } else {
      setLoading(true)
    }

    const {
      data: membership,
    } =
      await supabase
        .from(
          'family_members'
        )
        .select('family_id')
        .eq(
          'user_id',
          user.id
        )
        .maybeSingle()

    if (!membership) {
      if (!cached) {
        setError(
          'Biblioteca non trovata.'
        )
      }

      setLoading(false)
      return
    }

    const [
      citationResult,
      bookResult,
    ] =
      await Promise.all([
        supabase
          .from(
            'book_citations'
          )
          .select(`
            id,
            quote_text,
            page,
            note,
            created_at,
            edition_key
          `)
          .eq(
            'user_id',
            user.id
          )
          .eq(
            'family_id',
            membership.family_id
          )
          .order(
            'created_at',
            {
              ascending: false,
            }
          ),

        supabase
          .from('books')
          .select(`
            id,
            edition_key,
            title,
            authors,
            cover_url,
            custom_cover_url
          `)
          .eq(
            'family_id',
            membership.family_id
          ),
      ])

    if (
      citationResult.error
    ) {
      if (!cached) {
        setError(
          citationResult
            .error
            .message
        )
      }

      setLoading(false)
      return
    }

    const snapshot:
      CitationsSnapshot = {
        citations:
          (
            citationResult.data ??
            []
          ) as Citation[],

        books:
          (
            bookResult.data ??
            []
          ) as Book[],
      }

    setCitations(
      snapshot.citations
    )

    setBooks(
      snapshot.books
    )

    writeCache(
      cacheKey,
      snapshot
    )

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const bookByEdition =
    useMemo(() => {
      const map =
        new Map<
          string,
          Book
        >()

      for (
        const book of books
      ) {
        if (
          !book.edition_key
        ) {
          continue
        }

        if (
          !map.has(
            book.edition_key
          )
        ) {
          map.set(
            book.edition_key,
            book
          )
        }
      }

      return map
    }, [books])

  const items =
    useMemo<
      CitationWithBook[]
    >(
      () =>
        citations.map(
          citation => ({
            ...citation,

            book:
              bookByEdition.get(
                citation.edition_key
              ) ?? null,
          })
        ),
      [
        citations,
        bookByEdition,
      ]
    )

  const editions =
    useMemo(() => {
      const map =
        new Map<
          string,
          Book
        >()

      for (
        const item of items
      ) {
        if (
          item.book &&
          !map.has(
            item.edition_key
          )
        ) {
          map.set(
            item.edition_key,
            item.book
          )
        }
      }

      return [
        ...map.entries(),
      ].sort(
        (a, b) =>
          a[1].title
            .localeCompare(
              b[1].title,
              'it'
            )
      )
    }, [items])

  const visibleItems =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase()

      let next =
        items.filter(
          item => {
            if (
              selectedEdition !==
                'all' &&
              item.edition_key !==
                selectedEdition
            ) {
              return false
            }

            if (!query) {
              return true
            }

            const haystack =
              [
                item.quote_text,
                item.note ?? '',
                item.book?.title ??
                  '',
                (
                  item.book
                    ?.authors ??
                  []
                ).join(' '),
              ]
                .join(' ')
                .toLowerCase()

            return haystack
              .includes(query)
          }
        )

      next =
        [...next].sort(
          (a, b) => {
            if (
              sort ===
              'oldest'
            ) {
              return (
                new Date(
                  a.created_at
                ).getTime() -
                new Date(
                  b.created_at
                ).getTime()
              )
            }

            if (
              sort ===
              'page'
            ) {
              return (
                (
                  a.page ??
                  Number.MAX_SAFE_INTEGER
                ) -
                (
                  b.page ??
                  Number.MAX_SAFE_INTEGER
                )
              )
            }

            return (
              new Date(
                b.created_at
              ).getTime() -
              new Date(
                a.created_at
              ).getTime()
            )
          }
        )

      return next
    }, [
      items,
      search,
      selectedEdition,
      sort,
    ])

  async function copyCitation(
    item: CitationWithBook
  ) {
    await navigator
      .clipboard
      .writeText(
        item.quote_text
      )

    setCopiedId(
      item.id
    )

    haptic('light')

    setTimeout(
      () =>
        setCopiedId(
          null
        ),
      1400
    )
  }

  function surpriseMe() {
    if (!items.length) {
      return
    }

    let pool =
      items

    if (
      items.length > 1 &&
      surprise
    ) {
      pool =
        items.filter(
          item =>
            item.id !==
            surprise.id
        )
    }

    const next =
      pool[
        Math.floor(
          Math.random() *
            pool.length
        )
      ]

    setSurprise(next)

    haptic('medium')
  }

  function clearFilters() {
    setSearch('')
    setSelectedEdition(
      'all'
    )
    setSort('recent')
    setShowFilters(false)

    haptic('light')
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <ExLibrisLoader />
      </main>
    )
  }

  return (
    <main className="exl-page">

      <div className="max-w-5xl mx-auto px-5 pt-[calc(16px+env(safe-area-inset-top))] md:pt-10">

        <div className="flex items-center justify-between">

          <button
            onClick={() =>
              router.back()
            }
            className="exl-glass w-11 h-11 rounded-full flex items-center justify-center exl-press"
          >
            <ArrowLeft
              size={20}
            />
          </button>

          <motion.button
            whileTap={{
              scale: 0.94,
            }}
            onClick={
              surpriseMe
            }
            disabled={
              !items.length
            }
            className="exl-glass h-11 px-4 rounded-full flex items-center gap-2 text-sm font-semibold exl-press disabled:opacity-40"
          >
            <Shuffle
              size={16}
            />

            Sorprendimi
          </motion.button>

        </div>

        <motion.header
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.36,
            ease: [
              0.22,
              1,
              0.36,
              1,
            ],
          }}
          className="mt-8"
        >
          <div className="flex items-center gap-2 text-[#5E7FA3]">

            <Quote
              size={18}
            />

            <p className="text-sm font-semibold">
              Commonplace book
            </p>

          </div>

          <h1 className="text-[42px] md:text-[54px] leading-none font-bold tracking-[-0.05em] mt-2">
            Le mie citazioni
          </h1>

          <p className="text-[#8e8e93] mt-3">
            {items.length === 1
              ? '1 frase da ricordare'
              : `${items.length} frasi da ricordare`}
          </p>

        </motion.header>

        {items.length >
          0 && (
          <>
            <motion.section
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.05,
              }}
              className="mt-7 flex gap-2"
            >
              <div className="exl-glass exl-card flex-1 flex items-center gap-3 px-4 py-3.5">

                <Search
                  size={18}
                  className="text-[#8e8e93] shrink-0"
                />

                <input
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Cerca una frase, un libro, un autore…"
                  className="w-full bg-transparent outline-none text-[15px]"
                />

                {search && (
                  <button
                    onClick={() =>
                      setSearch(
                        ''
                      )
                    }
                    className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center"
                  >
                    <X
                      size={13}
                    />
                  </button>
                )}

              </div>

              <button
                onClick={() => {
                  setShowFilters(
                    current =>
                      !current
                  )

                  haptic(
                    'light'
                  )
                }}
                className={`w-[52px] rounded-[20px] flex items-center justify-center exl-press ${
                  showFilters ||
                  selectedEdition !==
                    'all' ||
                  sort !==
                    'recent'
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'exl-glass'
                }`}
              >
                <SlidersHorizontal
                  size={19}
                />
              </button>

            </motion.section>

            <AnimatePresence>
              {showFilters && (
                <motion.section
                  initial={{
                    opacity: 0,
                    height: 0,
                    y: -6,
                  }}
                  animate={{
                    opacity: 1,
                    height:
                      'auto',
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    height: 0,
                    y: -6,
                  }}
                  className="overflow-hidden"
                >
                  <div className="exl-glass exl-card p-4 mt-3">

                    <p className="text-[#8e8e93] text-[11px] uppercase tracking-[0.08em]">
                      Libro
                    </p>

                    <select
                      value={
                        selectedEdition
                      }
                      onChange={(
                        event
                      ) =>
                        setSelectedEdition(
                          event
                            .target
                            .value
                        )
                      }
                      className="w-full bg-black/[0.035] dark:bg-white/[0.07] rounded-[16px] px-3 py-3 mt-2 outline-none"
                    >
                      <option value="all">
                        Tutti i libri
                      </option>

                      {editions.map(
                        ([
                          key,
                          book,
                        ]) => (
                          <option
                            key={
                              key
                            }
                            value={
                              key
                            }
                          >
                            {
                              book.title
                            }
                          </option>
                        )
                      )}
                    </select>

                    <p className="text-[#8e8e93] text-[11px] uppercase tracking-[0.08em] mt-4">
                      Ordina
                    </p>

                    <div className="grid grid-cols-3 gap-2 mt-2">

                      {[
                        [
                          'recent',
                          'Recenti',
                        ],
                        [
                          'oldest',
                          'Più vecchie',
                        ],
                        [
                          'page',
                          'Pagina',
                        ],
                      ].map(
                        ([
                          value,
                          label,
                        ]) => (
                          <button
                            key={
                              value
                            }
                            onClick={() => {
                              setSort(
                                value as SortMode
                              )

                              haptic(
                                'light'
                              )
                            }}
                            className={`rounded-[15px] py-2.5 text-[12px] font-semibold exl-press ${
                              sort ===
                              value
                                ? 'bg-black text-white dark:bg-white dark:text-black'
                                : 'bg-black/5 dark:bg-white/10'
                            }`}
                          >
                            {
                              label
                            }
                          </button>
                        )
                      )}

                    </div>

                    <button
                      onClick={
                        clearFilters
                      }
                      className="w-full text-[#5E7FA3] text-sm font-semibold py-3 mt-2 exl-press"
                    >
                      Azzera filtri
                    </button>

                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </>
        )}

        <AnimatePresence>
          {surprise && (
            <motion.section
              initial={{
                opacity: 0,
                y: 16,
                scale: 0.97,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: -10,
                scale: 0.98,
              }}
              transition={{
                type: 'spring',
                stiffness: 320,
                damping: 26,
              }}
              className="mt-5 relative overflow-hidden rounded-[30px] bg-[#5E7FA3] text-white shadow-[0_18px_55px_rgba(0,0,0,0.14)]"
            >
              <div className="absolute -right-8 -top-8 opacity-[0.10]">
                <Quote
                  size={150}
                  fill="currentColor"
                />
              </div>

              <div className="relative p-6 md:p-7">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2 text-white/75 text-sm font-semibold">

                    <Sparkles
                      size={16}
                    />

                    Una frase per te

                  </div>

                  <button
                    onClick={() =>
                      setSurprise(
                        null
                      )
                    }
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center exl-press"
                  >
                    <X
                      size={15}
                    />
                  </button>

                </div>

                <p className="text-[22px] md:text-[27px] leading-[1.42] tracking-[-0.025em] font-medium mt-6 max-w-3xl">
                  “{surprise.quote_text}”
                </p>

                <div className="flex items-end justify-between gap-4 mt-6">

                  <div>

                    {surprise.book && (
                      <p className="font-semibold">
                        {
                          surprise
                            .book
                            .title
                        }
                      </p>
                    )}

                    <p className="text-white/65 text-sm mt-0.5">
                      {[
                        surprise.book
                          ?.authors
                          ?.[0],
                        surprise.page
                          ? `p. ${surprise.page}`
                          : null,
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          ' · '
                        )}
                    </p>

                  </div>

                  <button
                    onClick={
                      surpriseMe
                    }
                    className="w-11 h-11 rounded-full bg-white text-[#5E7FA3] flex items-center justify-center shadow-sm exl-press"
                  >
                    <Shuffle
                      size={18}
                    />
                  </button>

                </div>

              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {error && (
          <div className="exl-glass exl-card p-4 mt-6 text-[#ff3b30]">
            {error}
          </div>
        )}

        {items.length ===
        0 ? (
          <motion.section
            initial={{
              opacity: 0,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            className="mt-16 text-center max-w-sm mx-auto"
          >
            <motion.div
              animate={{
                y: [
                  0,
                  -4,
                  0,
                ],
              }}
              transition={{
                duration: 3,
                repeat:
                  Infinity,
                ease:
                  'easeInOut',
              }}
              className="w-20 h-20 rounded-[26px] bg-[#5E7FA3]/10 text-[#5E7FA3] flex items-center justify-center mx-auto"
            >
              <Quote
                size={33}
              />
            </motion.div>

            <h2 className="text-[26px] font-bold tracking-[-0.035em] mt-6">
              Il tuo commonplace book è ancora vuoto
            </h2>

            <p className="text-[#8e8e93] leading-relaxed mt-2">
              Quando trovi una frase che vuoi ricordare, salvala dalla scheda del libro.
            </p>

            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 bg-black text-white dark:bg-white dark:text-black rounded-full px-5 py-3 mt-6 font-semibold exl-press"
            >
              <BookOpen
                size={17}
              />
              Esplora la biblioteca
            </Link>

          </motion.section>
        ) : visibleItems.length ===
          0 ? (
          <motion.section
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="mt-12 text-center"
          >
            <Search
              size={28}
              className="mx-auto text-[#8e8e93]"
            />

            <p className="font-semibold mt-4">
              Nessuna citazione trovata
            </p>

            <p className="text-[#8e8e93] text-sm mt-1">
              Prova con un’altra ricerca o azzera i filtri.
            </p>

            <button
              onClick={
                clearFilters
              }
              className="text-[#5E7FA3] font-semibold text-sm mt-4 exl-press"
            >
              Azzera ricerca e filtri
            </button>

          </motion.section>
        ) : (
          <section className="mt-7 pb-10">

            <div className="flex items-center justify-between px-1 mb-3">

              <p className="text-[#8e8e93] text-sm">
                {visibleItems.length ===
                1
                  ? '1 risultato'
                  : `${visibleItems.length} risultati`}
              </p>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              <AnimatePresence
                initial={false}
              >
                {visibleItems.map(
                  (
                    item,
                    index
                  ) => {
                    const cover =
                      item.book
                        ?.custom_cover_url ||
                      item.book
                        ?.cover_url

                    return (
                      <motion.article
                        layout
                        key={
                          item.id
                        }
                        initial={{
                          opacity: 0,
                          y: 12,
                          scale:
                            0.985,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                        }}
                        exit={{
                          opacity: 0,
                          scale:
                            0.98,
                        }}
                        transition={{
                          delay:
                            Math.min(
                              index *
                                0.025,
                              0.18
                            ),
                          type:
                            'spring',
                          stiffness:
                            320,
                          damping:
                            28,
                        }}
                        className="exl-glass exl-card overflow-hidden"
                      >
                        <div className="p-5">

                          <Quote
                            size={26}
                            fill="currentColor"
                            className="text-[#5E7FA3]/40"
                          />

                          <p className="text-[17px] leading-[1.55] tracking-[-0.012em] mt-3 whitespace-pre-wrap">
                            “{item.quote_text}”
                          </p>

                          {item.note && (
                            <p className="text-[#8e8e93] text-sm leading-relaxed mt-4 pt-4 border-t border-black/5 dark:border-white/10">
                              {item.note}
                            </p>
                          )}

                        </div>

                        {item.book && (
                          <div className="px-5 pb-4">

                            <Link
                              href={`/books/${item.book.id}`}
                              className="flex items-center gap-3 rounded-[18px] bg-black/[0.035] dark:bg-white/[0.06] p-2.5 exl-press"
                            >
                              <div className="w-9 h-[54px] rounded-[7px] overflow-hidden bg-[#d1d1d6] shrink-0 shadow-sm">

                                <BookCover
                                  title={
                                    item
                                      .book
                                      .title
                                  }
                                  authors={
                                    item
                                      .book
                                      .authors
                                  }
                                  coverUrl={
                                    cover
                                  }
                                />

                              </div>

                              <div className="min-w-0 flex-1">

                                <p className="font-semibold text-[13px] truncate">
                                  {
                                    item
                                      .book
                                      .title
                                  }
                                </p>

                                <p className="text-[#8e8e93] text-[11px] mt-0.5 truncate">
                                  {[
                                    item
                                      .book
                                      .authors
                                      ?.[0],
                                    item.page
                                      ? `p. ${item.page}`
                                      : null,
                                  ]
                                    .filter(
                                      Boolean
                                    )
                                    .join(
                                      ' · '
                                    )}
                                </p>

                              </div>

                              <ChevronRight
                                size={16}
                                className="text-[#c7c7cc]"
                              />

                            </Link>

                          </div>
                        )}

                        <button
                          onClick={() =>
                            copyCitation(
                              item
                            )
                          }
                          className="w-full min-h-[46px] border-t border-black/5 dark:border-white/10 flex items-center justify-center gap-2 text-[12px] font-semibold exl-press"
                        >
                          {copiedId ===
                          item.id ? (
                            <>
                              <Check
                                size={14}
                              />
                              Copiata
                            </>
                          ) : (
                            <>
                              <Copy
                                size={14}
                              />
                              Copia citazione
                            </>
                          )}
                        </button>

                      </motion.article>
                    )
                  }
                )}
              </AnimatePresence>

            </div>

          </section>
        )}

      </div>

    </main>
  )
}
