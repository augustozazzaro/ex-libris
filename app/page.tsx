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
            y: 7,
            scale: 0.995,
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
          }}
          transition={{
            duration: 0.34,
            ease: [
              0.22,
              1,
              0.36,
              1,
            ],
          }}
          className="relative isolate overflow-hidden rounded-[34px] mt-7 min-h-[238px] border border-white/70 dark:border-white/[0.08] bg-[#EEEAE2] dark:bg-[#202022] shadow-[0_18px_55px_rgba(0,0,0,0.11)]"
        >

          {/* Atmosfera derivata dall'ultimo libro */}
          {featuredCover ? (
            <>
              <div
                className="absolute inset-[-45px] bg-cover bg-center blur-[42px] scale-110 opacity-[0.30] dark:opacity-[0.26]"
                style={{
                  backgroundImage:
                    `url("${featuredCover}")`,
                }}
              />

              <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(246,243,237,0.94)_0%,rgba(246,243,237,0.86)_46%,rgba(246,243,237,0.42)_100%)] dark:bg-[linear-gradient(105deg,rgba(31,31,33,0.96)_0%,rgba(31,31,33,0.90)_48%,rgba(31,31,33,0.56)_100%)]" />
            </>
          ) : (
            <>
              <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[#5E7FA3]/18 blur-[75px]" />
              <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-[#DDB342]/12 blur-[80px]" />
            </>
          )}

          {/* Luce superficiale */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/45 via-white/10 to-transparent dark:from-white/[0.06] dark:via-transparent" />

          <div className="relative min-h-[238px] p-5 sm:p-6">

            <div className="flex items-start justify-between gap-4">

              <div className="min-w-0 pr-[108px] sm:pr-[165px]">

                <div className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white/50 dark:bg-white/[0.08] backdrop-blur-md border border-white/60 dark:border-white/[0.08] text-[#636366] dark:text-[#c7c7cc]">

                  <BookOpen
                    size={13}
                    strokeWidth={2}
                  />

                  <span className="text-[10px] uppercase tracking-[0.09em] font-semibold">
                    Biblioteca personale
                  </span>

                </div>

                <div className="mt-4">

                  <div className="flex items-end gap-2">

                    <span className="text-[51px] sm:text-[58px] leading-[0.88] font-bold tracking-[-0.065em]">
                      {books.length}
                    </span>

                    <span className="text-[#77777c] dark:text-[#aeaeb2] text-[13px] font-medium pb-1">
                      {books.length === 1
                        ? 'libro'
                        : 'libri'}
                    </span>

                  </div>

                  <p className="text-[#636366] dark:text-[#aeaeb2] text-[13px] leading-relaxed mt-3 max-w-[255px]">
                    La tua biblioteca, sempre con te.
                  </p>

                </div>

              </div>

            </div>


            {featuredBook ? (
              <Link
                href={`/books/${featuredBook.id}`}
                className="group absolute left-5 sm:left-6 bottom-5 sm:bottom-6 right-[118px] sm:right-[180px]"
              >

                <div className="pt-3 border-t border-black/[0.07] dark:border-white/[0.10]">

                  <p className="text-[#8e8e93] text-[9px] uppercase tracking-[0.10em] font-semibold">
                    Ultimo aggiunto
                  </p>

                  <div className="flex items-center gap-1.5 mt-1.5">

                    <p className="font-semibold text-[14px] leading-tight line-clamp-1">
                      {featuredBook.title}
                    </p>

                    <ChevronRight
                      size={14}
                      className="text-[#8e8e93] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                    />

                  </div>

                  {featuredBook.authors?.[0] && (
                    <p className="text-[#8e8e93] text-[11px] mt-1 truncate">
                      {featuredBook.authors[0]}
                    </p>
                  )}

                </div>

              </Link>
            ) : (
              <Link
                href="/add"
                className="absolute left-5 sm:left-6 bottom-5 sm:bottom-6 inline-flex items-center gap-2 text-[14px] font-semibold"
              >
                <Plus size={17} />
                Aggiungi il primo libro
              </Link>
            )}


            {featuredBook && (
              <div className="absolute right-4 sm:right-8 top-5 sm:top-6">

                {/* seconda sagoma per profondità */}
                <div className="absolute inset-0 translate-x-[-9px] translate-y-[7px] rotate-[-4deg] rounded-[16px] bg-white/28 dark:bg-white/[0.07] border border-white/35 dark:border-white/[0.08]" />

                <motion.div
                  initial={{
                    opacity: 0,
                    x: 12,
                    rotate: 5,
                    scale: 0.96,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    rotate: 2.5,
                    scale: 1,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 270,
                    damping: 25,
                    delay: 0.05,
                  }}
                  whileHover={{
                    rotate: 0,
                    y: -2,
                  }}
                  className="relative w-[106px] sm:w-[137px] aspect-[2/3] rounded-[16px] overflow-hidden shadow-[0_18px_42px_rgba(0,0,0,0.22)] ring-1 ring-white/45 dark:ring-white/10 transform-gpu"
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

              </div>
            )}

          </div>

        </motion.section>


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
