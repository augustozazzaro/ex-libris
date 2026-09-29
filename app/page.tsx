'use client'

import ExLibrisLoader from '@/components/ExLibrisLoader'

import {
  FormEvent,
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
  motion,
} from 'framer-motion'

import {
  BookOpen,
  ChevronRight,
  Heart,
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
}

type HomeSnapshot = {
  books: Book[]
  favoriteCount: number
  toReadCount: number
  citationCount: number
}

export default function Home() {
  const supabase = createClient()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [books, setBooks] = useState<Book[]>([])
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [toReadCount, setToReadCount] = useState(0)
  const [citationCount, setCitationCount] = useState(0)

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

      setFavoriteCount(
        cached.favoriteCount ?? 0
      )

      setToReadCount(
        cached.toReadCount ?? 0
      )

      setCitationCount(
        cached.citationCount ?? 0
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
      favoriteResult,
      toReadResult,
      citationResult,
    ] = await Promise.all([
      supabase
        .from('books')
        .select(`
          id,
          title,
          authors,
          cover_url,
          custom_cover_url,
          status
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
      }

    setBooks(
      snapshot.books
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

      <div className="max-w-5xl mx-auto px-5 pt-[calc(18px+env(safe-area-inset-top))] md:pt-10 pb-32">

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


        {/* HERO */}
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
            duration: 0.28,
            ease: [
              0.22,
              1,
              0.36,
              1,
            ],
          }}
          className="relative overflow-hidden rounded-[32px] mt-7 bg-[#5E7FA3] text-white min-h-[225px] shadow-[0_18px_45px_rgba(0,0,0,0.12)]"
        >

          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.10] via-transparent to-black/[0.12]" />

          <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-white/[0.08]" />

          <div className="relative h-full min-h-[225px] p-6 flex">

            <div className="flex-1 min-w-0 flex flex-col justify-between pr-[116px] sm:pr-[180px]">

              <div>

                <div className="flex items-center gap-2 text-white/70 text-[11px] uppercase tracking-[0.08em]">

                  <BookOpen
                    size={14}
                  />

                  Biblioteca personale

                </div>

                <div className="flex items-end gap-2 mt-3">

                  <span className="text-[48px] sm:text-[56px] leading-none font-bold tracking-[-0.06em]">
                    {books.length}
                  </span>

                  <span className="text-white/65 text-sm pb-1">
                    {books.length === 1
                      ? 'libro'
                      : 'libri'}
                  </span>

                </div>

              </div>

              {featuredBook ? (
                <Link
                  href={`/books/${featuredBook.id}`}
                  className="block mt-7 group"
                >

                  <p className="text-white/55 text-[10px] uppercase tracking-[0.09em]">
                    Ultimo aggiunto
                  </p>

                  <div className="flex items-center gap-2 mt-1">

                    <p className="font-semibold leading-tight line-clamp-2 max-w-[260px]">
                      {featuredBook.title}
                    </p>

                    <ChevronRight
                      size={16}
                      className="text-white/55 shrink-0 transition-transform group-hover:translate-x-0.5"
                    />

                  </div>

                  {featuredBook.authors?.[0] && (
                    <p className="text-white/55 text-xs mt-1 truncate">
                      {featuredBook.authors[0]}
                    </p>
                  )}

                </Link>
              ) : (
                <Link
                  href="/add"
                  className="inline-flex items-center gap-2 mt-7 font-semibold"
                >
                  <Plus size={18} />
                  Aggiungi il primo libro
                </Link>
              )}

            </div>


            {featuredBook && (
              <motion.div
                initial={{
                  opacity: 0,
                  x: 16,
                  rotate: 3,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  rotate: 2,
                }}
                transition={{
                  delay: 0.05,
                  duration: 0.35,
                  ease: [
                    0.22,
                    1,
                    0.36,
                    1,
                  ],
                }}
                className="absolute right-[-4px] sm:right-7 top-7 w-[116px] sm:w-[142px] aspect-[2/3] rounded-[15px] overflow-hidden shadow-[0_18px_38px_rgba(0,0,0,0.30)] ring-1 ring-white/20 transform-gpu"
              >
                <BookCover
                  title={
                    featuredBook.title
                  }
                  authors={
                    featuredBook.authors
                  }
                  coverUrl={
                    featuredCover
                  }
                  priority
                />
              </motion.div>
            )}

          </div>

        </motion.section>


        {/* SEARCH */}
        <Link
          href="/catalog"
          className="exl-glass mt-4 h-[58px] rounded-[22px] flex items-center gap-3 px-4 exl-press"
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
