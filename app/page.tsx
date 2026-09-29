'use client'

import ExLibrisLoader from '@/components/ExLibrisLoader'

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
  motion,
} from 'framer-motion'

import {
  BookCheck,
  Target,
  BookOpen,
  ChevronRight,
  Heart,
  House,
  Bookmark,
  Search,
  ArrowUpRight,
  Plus,
  Quote,
  Shuffle,
  Sparkles,
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'
import {
  readCache,
  writeCache,
} from '@/utils/exlibris-cache'
import BookCover from '@/components/BookCover'
import ProfileButton from '@/components/ProfileButton'

type Book = {
  id: string
  title: string
  authors: string[] | null
  cover_url: string | null
  custom_cover_url: string | null
  status: string
  location_id: string | null
  pages: number | null
}

type HomeReadingState = {
  book_id: string
  favorite: boolean
  reading_status: string | null
  read_at: string | null
  bookmark_page: number | null
  bookmark_updated_at: string | null
}

type HomeLocation = {
  id: string
  name: string
  location_type: string
  parent_id: string | null
}

type HomeSnapshot = {
  books: Book[]
  locations: HomeLocation[]
  favoriteCount: number
  toReadCount: number
  citationCount: number
  readingStates: HomeReadingState[]
  readingGoal: number
}

export default function Home() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [books, setBooks] = useState<Book[]>([])
  const [locations, setLocations] =
    useState<HomeLocation[]>([])

  const [
    activeLibraryIndex,
    setActiveLibraryIndex,
  ] = useState(0)

  const libraryRailRef =
    useRef<HTMLDivElement | null>(
      null
    )
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [toReadCount, setToReadCount] = useState(0)
  const [citationCount, setCitationCount] = useState(0)

  const [
    readingStates,
    setReadingStates,
  ] =
    useState<HomeReadingState[]>([])

  const [
    readingGoal,
    setReadingGoal,
  ] = useState(12)

  const [authenticated, setAuthenticated] =
    useState<boolean | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadLibrary() {
    setError('')

    const {
      data: { session },
    } =
      await supabase.auth.getSession()

    const user =
      session?.user

    if (!user) {
      setAuthenticated(false)
      setBooks([])
      setLocations([])
      setFavoriteCount(0)
      setLoading(false)
      return
    }

    setAuthenticated(true)

    const cacheKey =
      `home:${user.id}`

    const cached =
      readCache<HomeSnapshot>(
        cacheKey
      )

    if (cached) {
      setBooks(
        cached.books
      )

      setLocations(
        cached.locations ?? []
      )

      setFavoriteCount(
        cached.favoriteCount ?? 0
      )

      setToReadCount(
        cached.toReadCount ?? 0
      )

      setCitationCount(
        cached.citationCount ?? 0
      )

      setReadingStates(
        cached.readingStates ??
        []
      )

      setReadingGoal(
        cached.readingGoal ??
        12
      )

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
        .single()

    if (
      membershipError ||
      !membership
    ) {
      if (!cached) {
        setError(
          'Non riesco a trovare la biblioteca associata al tuo account.'
        )
      }

      setLoading(false)
      return
    }

    const [
      booksResult,
      locationsResult,
      favoriteResult,
      toReadResult,
      citationResult,
      readingResult,
      profileResult,
    ] = await Promise.all([
      supabase
        .from('books')
        .select(`
          id,
          title,
          authors,
          cover_url,
          custom_cover_url,
          status,
          location_id,
          pages
        `)
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
        .from('locations')
        .select(`
          id,
          name,
          location_type,
          parent_id
        `)
        .eq(
          'family_id',
          membership.family_id
        )
        .order('name'),

      supabase
        .from(
          'user_book_state'
        )
        .select(
          'book_id',
          {
            count: 'exact',
            head: true,
          }
        )
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'favorite',
          true
        ),

      supabase
        .from(
          'user_book_state'
        )
        .select(
          'book_id',
          {
            count: 'exact',
            head: true,
          }
        )
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'reading_status',
          'to_read'
        ),

      supabase
        .from(
          'book_citations'
        )
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          }
        )
        .eq(
          'user_id',
          user.id
        ),

      supabase
        .from(
          'user_book_state'
        )
        .select(`
          book_id,
          favorite,
          reading_status,
          read_at,
          bookmark_page,
          bookmark_updated_at
        `)
        .eq(
          'user_id',
          user.id
        ),

      supabase
        .from('profiles')
        .select(
          'reading_goal'
        )
        .eq(
          'id',
          user.id
        )
        .maybeSingle(),
    ])

    if (
      booksResult.error
    ) {
      if (!cached) {
        setError(
          'Errore durante il caricamento della biblioteca.'
        )
      }

      setLoading(false)
      return
    }

    const snapshot:
      HomeSnapshot = {
        books:
          booksResult.data ??
          [],

        locations:
          (
            locationsResult.data ??
            []
          ) as HomeLocation[],

        favoriteCount:
          favoriteResult.count ??
          cached?.favoriteCount ??
          0,

        toReadCount:
          toReadResult.count ??
          cached?.toReadCount ??
          0,

        citationCount:
          citationResult.count ??
          cached?.citationCount ??
          0,

        readingStates:
          (
            readingResult.data ??
            []
          ) as HomeReadingState[],

        readingGoal:
          profileResult.data
            ?.reading_goal ??
          cached?.readingGoal ??
          12,
      }

    setBooks(
      snapshot.books
    )

    setLocations(
      snapshot.locations
    )

    setFavoriteCount(
      snapshot.favoriteCount
    )

    setToReadCount(
      snapshot.toReadCount
    )

    setCitationCount(
      snapshot.citationCount
    )

    setReadingStates(
      snapshot.readingStates
    )

    setReadingGoal(
      snapshot.readingGoal
    )

    writeCache(
      cacheKey,
      snapshot
    )

    setLoading(false)
  }

  useEffect(() => {
    loadLibrary()

    const routes = [
      '/catalog',
      '/favorites',
      '/my-books',
      '/loans',
      '/shuffle',
      '/profile',
      '/citations',
      '/family',
      '/locations',
      '/settings',
      '/add',
    ]

    routes.forEach(
      route =>
        router.prefetch(route)
    )
  }, [])

  async function handleLogin(
    event: FormEvent
  ) {
    event.preventDefault()

    setLoading(true)
    setError('')

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (loginError) {
      setError(
        'Email o password non corrette.'
      )
      setLoading(false)
      return
    }

    const pendingInvite =
      localStorage.getItem(
        'exlibris_pending_invite'
      )

    if (pendingInvite) {
      const { error: inviteError } =
        await supabase.rpc(
          'accept_family_invite',
          {
            p_code: pendingInvite,
          }
        )

      if (!inviteError) {
        localStorage.removeItem(
          'exlibris_pending_invite'
        )
      }
    }

    await loadLibrary()
  }

  if (loading || authenticated === null) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <ExLibrisLoader />
      </main>
    )
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen px-5 flex items-center justify-center">

        <div className="w-full max-w-sm">

          <div className="text-center mb-10">

            <div className="w-20 h-20 rounded-[24px] bg-black text-white mx-auto flex items-center justify-center shadow-xl mb-6">
              <BookOpen
                size={38}
                strokeWidth={1.8}
              />
            </div>

            <h1 className="text-[42px] leading-none font-bold tracking-[-0.04em]">
              Ex Libris
            </h1>

          </div>

          <form
            onSubmit={handleLogin}
            className="exl-glass exl-card p-5 space-y-3"
          >

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Email"
              className="w-full bg-white/65 rounded-2xl px-4 py-4 outline-none"
              required
            />

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Password"
              className="w-full bg-white/65 rounded-2xl px-4 py-4 outline-none"
              required
            />

            {error && (
              <p className="text-red-500 text-sm px-1">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-black text-white rounded-2xl py-4 font-semibold exl-press"
            >
              Accedi
            </button>

            <Link
              href="/recover"
              className="block text-center text-[#8e8e93] text-sm py-1"
            >
              Password dimenticata?
            </Link>

            <Link
              href="/join"
              className="block text-center text-[#5E7FA3] font-medium py-2"
            >
              Hai ricevuto un invito? Crea il tuo account
            </Link>

          </form>

        </div>

      </main>
    )
  }

  const libraryWidgets =
    (() => {
      const childrenMap =
        new Map<
          string,
          string[]
        >()

      for (
        const location of
        locations
      ) {
        if (
          !location.parent_id
        ) {
          continue
        }

        const existing =
          childrenMap.get(
            location.parent_id
          ) ?? []

        existing.push(
          location.id
        )

        childrenMap.set(
          location.parent_id,
          existing
        )
      }

      function descendantIds(
        rootId: string
      ) {
        const ids =
          new Set<string>([
            rootId,
          ])

        const stack =
          [rootId]

        while (
          stack.length
        ) {
          const current =
            stack.pop()!

          const children =
            childrenMap.get(
              current
            ) ?? []

          for (
            const child of
            children
          ) {
            if (
              ids.has(child)
            ) {
              continue
            }

            ids.add(child)
            stack.push(child)
          }
        }

        return ids
      }

      const houses =
        locations
          .filter(
            location =>
              location.location_type ===
              'house'
          )
          .map(
            location => {
              const ids =
                descendantIds(
                  location.id
                )

              const count =
                books.filter(
                  book =>
                    Boolean(
                      book.location_id &&
                      ids.has(
                        book.location_id
                      )
                    )
                ).length

              return {
                id:
                  location.id,
                name:
                  location.name,
                count,
                href:
                  `/catalog?location=${location.id}`,
                all:
                  false,
              }
            }
          )

      if (
        houses.length > 1
      ) {
        return [
          {
            id: 'all',
            name:
              'Tutte le biblioteche',
            count:
              books.length,
            href:
              '/catalog',
            all:
              true,
          },
          ...houses,
        ]
      }

      if (
        houses.length === 1
      ) {
        return houses
      }

      return [
        {
          id: 'all',
          name:
            'La tua biblioteca',
          count:
            books.length,
          href:
            '/catalog',
          all:
            true,
        },
      ]
    })()

  const readingRows =
    readingStates.filter(
      row =>
        row.reading_status ===
        'reading'
    )

  const toReadRows =
    readingStates.filter(
      row =>
        row.reading_status ===
        'to_read'
    )

  const readRows =
    readingStates.filter(
      row =>
        row.reading_status ===
        'read'
    )

  const currentYear =
    new Date()
      .getFullYear()

  const readThisYear =
    readRows.filter(
      row =>
        row.read_at &&
        new Date(
          row.read_at
        ).getFullYear() ===
          currentYear
    )

  const currentReadingState =
    [...readingRows]
      .sort(
        (
          a,
          b
        ) =>
          new Date(
            b.bookmark_updated_at ??
              0
          ).getTime() -
          new Date(
            a.bookmark_updated_at ??
              0
          ).getTime()
      )[0]

  const currentReadingBook =
    currentReadingState
      ? books.find(
          book =>
            book.id ===
            currentReadingState
              .book_id
        )
      : undefined

  const currentReadingPage =
    currentReadingState
      ?.bookmark_page ??
    0

  const currentReadingProgress =
    currentReadingBook?.pages
      ? Math.min(
          100,
          Math.round(
            (
              currentReadingPage /
              currentReadingBook.pages
            ) *
              100
          )
        )
      : 0

  const readingGoalProgress =
    readingGoal > 0
      ? Math.min(
          100,
          Math.round(
            (
              readThisYear.length /
              readingGoal
            ) *
              100
          )
        )
      : 0

  const loanedCount =
    books.filter(
      book =>
        book.status ===
        'loaned'
    ).length

  const recentBooks =
    books.slice(0, 10)

  const featuredBook =
    recentBooks[0]

  const featuredCover =
    featuredBook
      ? (
          featuredBook.custom_cover_url ||
          featuredBook.cover_url
        )
      : null

  return (
    <main className="exl-page">

      <div className="max-w-5xl mx-auto px-5 pt-[calc(18px+env(safe-area-inset-top))] md:pt-10">

        {/* HEADER */}
        <header className="flex items-center justify-between gap-4">

          <div>

            <p className="text-[#8e8e93] text-[12px] uppercase tracking-[0.10em] font-medium">
              La tua biblioteca
            </p>

            <h1 className="text-[38px] sm:text-[46px] leading-none font-bold tracking-[-0.05em] mt-1">
              Ex Libris
            </h1>

          </div>

          <ProfileButton />

        </header>


        {/* BIBLIOTECHE */}
        <section className="mt-7">

          <div
            ref={libraryRailRef}
            onScroll={(event) => {
              const rail =
                event.currentTarget

              const step =
                rail.clientWidth +
                12

              if (!step) return

              const index =
                Math.round(
                  rail.scrollLeft /
                    step
                )

              setActiveLibraryIndex(
                Math.max(
                  0,
                  Math.min(
                    index,
                    libraryWidgets.length -
                      1
                  )
                )
              )
            }}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory exl-scrollbar-none -mx-5 px-5"
          >

            {libraryWidgets.map(
              (
                library,
                index
              ) => (
                <motion.div
                  key={
                    library.id
                  }
                  initial={{
                    opacity: 0,
                    y: 7,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration:
                      0.28,
                    delay:
                      Math.min(
                        index *
                          0.035,
                        0.12
                      ),
                    ease: [
                      0.22,
                      1,
                      0.36,
                      1,
                    ],
                  }}
                  whileTap={{
                    scale:
                      0.982,
                  }}
                  className="min-w-full snap-center"
                >

                  <Link
                    href={
                      library.href
                    }
                    className="group relative block overflow-hidden min-h-[190px] rounded-[32px] bg-white/58 dark:bg-white/[0.065] backdrop-blur-xl border border-white/70 dark:border-white/[0.08] shadow-[0_16px_45px_rgba(0,0,0,0.075)] exl-press"
                  >

                    {/* luce molto discreta */}
                    <div className="absolute -right-20 -top-24 w-64 h-64 rounded-full bg-[#5E7FA3]/[0.10] blur-[65px] pointer-events-none" />

                    <div className="absolute -left-20 -bottom-24 w-60 h-60 rounded-full bg-[#DDB342]/[0.07] blur-[70px] pointer-events-none" />

                    <div className="relative p-5 sm:p-6 min-h-[190px] flex flex-col justify-between">

                      <div className="flex items-start justify-between gap-4">

                        <div className="w-11 h-11 rounded-[15px] bg-black/[0.045] dark:bg-white/[0.09] flex items-center justify-center">

                          {library.all ? (
                            <BookOpen
                              size={21}
                              strokeWidth={
                                1.9
                              }
                            />
                          ) : (
                            <House
                              size={21}
                              strokeWidth={
                                1.9
                              }
                            />
                          )}

                        </div>

                        <motion.div
                          className="w-10 h-10 rounded-full bg-black/[0.04] dark:bg-white/[0.08] flex items-center justify-center"
                          whileHover={{
                            x: 2,
                          }}
                        >
                          <ChevronRight
                            size={18}
                            className="text-[#8e8e93] transition-transform duration-200 group-hover:translate-x-0.5"
                          />
                        </motion.div>

                      </div>


                      <div className="mt-7">

                        <p className="text-[#8e8e93] text-[10px] uppercase tracking-[0.10em] font-semibold">
                          {library.all
                            ? 'Collezione'
                            : 'Biblioteca'}
                        </p>

                        <div className="flex items-end justify-between gap-4 mt-1">

                          <div className="min-w-0">

                            <h2 className="text-[29px] sm:text-[32px] leading-[1.02] font-bold tracking-[-0.045em] truncate">
                              {library.name}
                            </h2>

                            <p className="text-[#8e8e93] text-[13px] mt-2">
                              Tocca per esplorare
                            </p>

                          </div>

                          <div className="text-right shrink-0">

                            <p className="text-[35px] leading-none font-bold tracking-[-0.055em] tabular-nums">
                              {library.count}
                            </p>

                            <p className="text-[#8e8e93] text-[11px] mt-1">
                              {library.count ===
                              1
                                ? 'libro'
                                : 'libri'}
                            </p>

                          </div>

                        </div>

                      </div>

                    </div>

                  </Link>

                </motion.div>
              )
            )}

          </div>


          {libraryWidgets.length >
            1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">

              {libraryWidgets.map(
                (
                  library,
                  index
                ) => (
                  <button
                    key={
                      library.id
                    }
                    type="button"
                    aria-label={`Vai a ${library.name}`}
                    onClick={() => {
                      const rail =
                        libraryRailRef.current

                      if (!rail) {
                        return
                      }

                      rail.scrollTo({
                        left:
                          index *
                          (
                            rail.clientWidth +
                            12
                          ),
                        behavior:
                          'smooth',
                      })
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index ===
                      activeLibraryIndex
                        ? 'w-5 bg-black dark:bg-white'
                        : 'w-1.5 bg-black/15 dark:bg-white/20'
                    }`}
                  />
                )
              )}

            </div>
          )}

        </section>


        {/* SEARCH */}
        <Link
          href="/catalog"
          className="exl-glass mt-4 h-[60px] rounded-[23px] flex items-center gap-3 px-3.5 exl-press border border-white/45 dark:border-white/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.045)]"
        >

          <div className="w-9 h-9 rounded-[12px] bg-black/[0.045] dark:bg-white/[0.08] flex items-center justify-center shrink-0">
            <Search
              size={18}
              className="text-[#5E7FA3]"
            />
          </div>

          <span className="text-[#8e8e93] flex-1">
            Cerca titolo, autore, ISBN…
          </span>

          <ChevronRight
            size={17}
            className="text-[#c7c7cc]"
          />

        </Link>


        {/* DISCOVERY / SHUFFLE */}
        {books.length > 1 && (
          <motion.div
            whileTap={{
              scale: 0.985,
            }}
            className="mt-7"
          >
            <Link
              href="/shuffle"
              className="relative overflow-hidden rounded-[28px] min-h-[150px] bg-[#171719] text-white p-5 flex items-end exl-press"
            >

              <div className="absolute inset-0 bg-gradient-to-br from-[#5E7FA3]/55 via-transparent to-[#DDB342]/20" />

              <div className="absolute right-4 top-3 opacity-[0.12]">
                <Shuffle
                  size={112}
                  strokeWidth={1.3}
                />
              </div>

              <div className="relative w-full">

                <div className="flex items-center gap-2 text-white/60 text-[11px] uppercase tracking-[0.08em]">
                  <Sparkles
                    size={14}
                  />
                  Lasciati sorprendere
                </div>

                <div className="flex items-end justify-between gap-5 mt-3">

                  <div>
                    <h2 className="text-[25px] font-bold tracking-[-0.035em] leading-tight">
                      Cosa leggo adesso?
                    </h2>

                    <p className="text-white/55 text-sm mt-1">
                      Scorri la tua biblioteca e trova il prossimo libro.
                    </p>
                  </div>

                  <div className="w-10 h-10 rounded-full bg-white/12 flex items-center justify-center shrink-0">
                    <ChevronRight
                      size={20}
                    />
                  </div>

                </div>

              </div>

            </Link>
          </motion.div>
        )}


        {/* READING HUB */}
        <section className="mt-8">

          <div className="flex items-end justify-between gap-4 px-1 mb-3">

            <div>

              <p className="text-[#8e8e93] text-[10px] uppercase tracking-[0.09em] font-semibold">
                La tua lettura
              </p>

              <h2 className="text-[22px] font-bold tracking-[-0.03em] mt-0.5">
                Il tuo percorso
              </h2>

            </div>

            <Link
              href="/profile"
              className="text-[#5E7FA3] text-[12px] font-semibold flex items-center gap-0.5"
            >
              Profilo
              <ChevronRight
                size={14}
              />
            </Link>

          </div>


          {currentReadingBook && (
            <motion.div
              whileTap={{
                scale: 0.985,
              }}
            >
              <Link
                href={`/books/${currentReadingBook.id}`}
                className="relative overflow-hidden block rounded-[28px] bg-[#5E7FA3] text-white p-4 shadow-[0_13px_35px_rgba(0,0,0,0.11)] exl-press"
              >

                <div className="flex items-center gap-4">

                  <div className="w-[66px] aspect-[2/3] rounded-[11px] overflow-hidden bg-white/15 shadow-md shrink-0">

                    <BookCover
                      title={
                        currentReadingBook.title
                      }
                      authors={
                        currentReadingBook.authors
                      }
                      coverUrl={
                        currentReadingBook.custom_cover_url ||
                        currentReadingBook.cover_url
                      }
                      priority
                    />

                  </div>

                  <div className="min-w-0 flex-1">

                    <div className="flex items-center gap-1.5 text-white/65 text-[9px] uppercase tracking-[0.09em] font-semibold">

                      <BookOpen
                        size={12}
                      />

                      Sto leggendo

                    </div>

                    <p className="font-bold text-[19px] tracking-[-0.025em] leading-tight line-clamp-2 mt-1.5">
                      {currentReadingBook.title}
                    </p>

                    {currentReadingBook.authors?.[0] && (
                      <p className="text-white/65 text-[12px] truncate mt-1">
                        {currentReadingBook.authors[0]}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-white/65 mt-4">

                      <span>
                        {currentReadingPage > 0
                          ? `Pagina ${currentReadingPage}`
                          : 'Segnalibro non impostato'}
                      </span>

                      {currentReadingBook.pages && (
                        <span className="tabular-nums">
                          {currentReadingProgress}%
                        </span>
                      )}

                    </div>

                    {currentReadingBook.pages && (
                      <div className="h-1.5 rounded-full bg-white/16 overflow-hidden mt-2">

                        <motion.div
                          initial={false}
                          animate={{
                            width:
                              `${currentReadingProgress}%`,
                          }}
                          className="h-full rounded-full bg-white"
                        />

                      </div>
                    )}

                  </div>

                  <ChevronRight
                    size={18}
                    className="text-white/60 shrink-0"
                  />

                </div>

              </Link>
            </motion.div>
          )}


          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory exl-scrollbar-none -mx-5 px-5 mt-3 pb-1">

            <ReadingHomeTile
              href="/my-books?filter=reading"
              title="In lettura"
              value={readingRows.length}
              icon={BookOpen}
              subtitle={
                readingRows.length === 1
                  ? 'libro adesso'
                  : 'libri adesso'
              }
            />

            <ReadingHomeTile
              href="/my-books?filter=to_read"
              title="Da leggere"
              value={toReadRows.length}
              icon={Bookmark}
              subtitle="nella tua lista"
            />

            <ReadingHomeTile
              href="/my-books?filter=read"
              title="Letti"
              value={readRows.length}
              icon={BookCheck}
              subtitle="in totale"
            />

            <ReadingHomeTile
              href="/profile"
              title={`Obiettivo ${currentYear}`}
              value={`${readThisYear.length}/${readingGoal}`}
              icon={Target}
              subtitle={`${readingGoalProgress}% completato`}
            />

          </div>

        </section>


        {/* RACCOLTE PERSONALI */}
        <section className="mt-8">

          <div className="px-1 mb-3">

            <p className="text-[#8e8e93] text-[11px] uppercase tracking-[0.08em]">
              Per te
            </p>

            <h2 className="text-[22px] font-bold tracking-[-0.03em] mt-0.5">
              Le tue raccolte
            </h2>

          </div>

          <div className="grid grid-cols-2 gap-3">

            <HomeStatCard
              href="/favorites"
              label="Preferiti"
              subtitle="La tua selezione"
              value={favoriteCount}
              icon={Heart}
              accent="#DDB342"
            />

            <HomeStatCard
              href="/my-books?filter=to_read"
              label="Da leggere"
              subtitle="La tua lista"
              value={toReadCount}
              icon={Bookmark}
              accent="#5E7FA3"
            />

            <HomeStatCard
              href="/citations"
              label="Citazioni"
              subtitle="Frasi da ricordare"
              value={citationCount}
              icon={Quote}
              accent="#76678A"
            />

            <HomeStatCard
              href="/loans"
              label="Prestiti"
              subtitle={
                loanedCount
                  ? 'Libri fuori casa'
                  : 'Tutto a casa'
              }
              value={loanedCount}
              icon={ArrowUpRight}
              accent="#C76955"
            />

          </div>

        </section>


        {/* RECENTI */}
        {recentBooks.length > 0 && (
          <section className="mt-9">

            <div className="flex items-center justify-between mb-4">

              <div>
                <p className="text-[#8e8e93] text-[11px] uppercase tracking-[0.08em]">
                  Biblioteca
                </p>

                <h2 className="text-[22px] font-bold tracking-[-0.03em] mt-0.5">
                  Ultimi aggiunti
                </h2>
              </div>

              <Link
                href="/catalog"
                className="h-9 px-3 rounded-full bg-black/[0.045] dark:bg-white/[0.08] text-[13px] font-semibold flex items-center gap-1 exl-press"
              >
                Tutti
                <ChevronRight
                  size={15}
                />
              </Link>

            </div>

            <div className="flex gap-4 overflow-x-auto exl-scrollbar-none -mx-5 px-5 pb-3">

              {recentBooks.map(
                (
                  book,
                  index
                ) => {
                  const cover =
                    book.custom_cover_url ||
                    book.cover_url

                  return (
                    <motion.div
                      key={
                        book.id
                      }
                      initial={{
                        opacity: 0,
                        x: 8,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        duration:
                          0.22,
                        delay:
                          Math.min(
                            index *
                              0.025,
                            0.12
                          ),
                      }}
                      className="w-[132px] shrink-0"
                    >

                      <Link
                        href={`/books/${book.id}`}
                        className="block exl-press"
                      >

                        <div className="aspect-[2/3] rounded-[17px] overflow-hidden bg-[#d1d1d6] shadow-[0_10px_25px_rgba(0,0,0,0.10)]">

                          <BookCover
                            title={
                              book.title
                            }
                            authors={
                              book.authors
                            }
                            coverUrl={
                              cover
                            }
                            priority={
                              index <
                              3
                            }
                          />

                        </div>

                        <p className="font-semibold text-[14px] leading-tight mt-3 line-clamp-2">
                          {book.title}
                        </p>

                        {book.authors?.[0] && (
                          <p className="text-[#8e8e93] text-[12px] mt-1 truncate">
                            {
                              book
                                .authors[0]
                            }
                          </p>
                        )}

                      </Link>

                    </motion.div>
                  )
                }
              )}

            </div>

          </section>
        )}


      </div>

    </main>
  )
}


function ReadingHomeTile({
  href,
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  href: string
  title: string
  value: number | string
  subtitle: string
  icon: typeof BookOpen
}) {
  return (
    <motion.div
      whileTap={{
        scale: 0.97,
      }}
      className="min-w-[156px] snap-start py-1 first:ml-0 last:mr-1"
    >
      <Link
        href={href}
        className="exl-glass block rounded-[23px] p-4 min-h-[126px] exl-press"
      >

        <div className="flex items-start justify-between gap-3">

          <div className="w-9 h-9 rounded-[12px] bg-[#5E7FA3]/10 text-[#5E7FA3] flex items-center justify-center">

            <Icon
              size={18}
            />

          </div>

          <p className="text-[24px] leading-none font-bold tracking-[-0.045em] tabular-nums">
            {value}
          </p>

        </div>

        <div className="mt-5">

          <p className="font-semibold text-[14px]">
            {title}
          </p>

          <p className="text-[#8e8e93] text-[10px] mt-1">
            {subtitle}
          </p>

        </div>

      </Link>
    </motion.div>
  )
}


function HomeStatCard({
  href,
  label,
  subtitle,
  value,
  icon: Icon,
  accent,
}: {
  href: string
  label: string
  subtitle: string
  value: number
  icon: typeof BookOpen
  accent: string
}) {
  return (
    <motion.div
      whileTap={{
        scale: 0.97,
      }}
    >
      <Link
        href={href}
        className="exl-glass rounded-[24px] p-4 min-h-[122px] flex flex-col justify-between exl-press"
      >

        <div className="flex items-start justify-between gap-3">

          <div
            className="w-10 h-10 rounded-[13px] flex items-center justify-center"
            style={{
              backgroundColor:
                `${accent}1F`,
              color:
                accent,
            }}
          >
            <Icon
              size={19}
              strokeWidth={2}
            />
          </div>

          <span className="text-[26px] leading-none font-bold tracking-[-0.045em] tabular-nums">
            {value}
          </span>

        </div>

        <div className="mt-5">

          <p className="font-semibold text-[15px]">
            {label}
          </p>

          <p className="text-[#8e8e93] text-[11px] mt-0.5">
            {subtitle}
          </p>

        </div>

      </Link>
    </motion.div>
  )
}
