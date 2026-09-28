'use client'

import ExLibrisLoader from '@/components/ExLibrisLoader'

import {
  FormEvent,
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'

import {
  motion,
} from 'framer-motion'

import {
  BookOpen,
  ChevronRight,
  Heart,
  Search,
  ArrowUpRight,
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'
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

export default function Home() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [books, setBooks] = useState<Book[]>([])
  const [favoriteCount, setFavoriteCount] = useState(0)

  const [authenticated, setAuthenticated] =
    useState<boolean | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadLibrary() {
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setAuthenticated(false)
      setBooks([])
      setFavoriteCount(0)
      setLoading(false)
      return
    }

    setAuthenticated(true)

    const { data: membership } =
      await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .single()

    if (!membership) {
      setError(
        'Non riesco a trovare la biblioteca associata al tuo account.'
      )
      setLoading(false)
      return
    }

    const [
      booksResult,
      favoriteResult,
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
        .eq('family_id', membership.family_id)
        .order('created_at', {
          ascending: false,
        }),

      supabase
        .from('user_book_state')
        .select('book_id', {
          count: 'exact',
          head: true,
        })
        .eq('user_id', user.id)
        .eq('favorite', true),
    ])

    if (booksResult.error) {
      setError(
        'Errore durante il caricamento della biblioteca.'
      )
      setLoading(false)
      return
    }

    setBooks(booksResult.data ?? [])
    setFavoriteCount(
      favoriteResult.count ?? 0
    )

    setLoading(false)
  }

  useEffect(() => {
    loadLibrary()
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
      (book) => book.status === 'loaned'
    ).length

  const recentBooks =
    books.slice(0, 8)

  return (
    <main className="exl-page">

      <div className="max-w-5xl mx-auto px-5 pt-[calc(20px+env(safe-area-inset-top))] md:pt-10">

        <header className="flex items-start justify-between gap-4">

          <div>

            <h1 className="text-[38px] sm:text-[46px] leading-none font-bold tracking-[-0.045em]">
              Ex Libris
            </h1>

            <p className="text-[#8e8e93] mt-2">
              {books.length === 1
                ? '1 libro'
                : `${books.length} libri`}
            </p>

          </div>

          <ProfileButton />

        </header>

        <Link
          href="/catalog"
          className="exl-glass exl-card mt-7 flex items-center gap-3 px-4 py-4 exl-press"
        >

          <Search
            size={20}
            className="text-[#8e8e93]"
          />

          <span className="text-[#8e8e93]">
            Cerca nella biblioteca
          </span>

        </Link>

        <section className="grid grid-cols-2 gap-3 mt-5">

          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 0.04,
              duration: 0.38,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="col-span-2"
          >
          <Link
            href="/catalog"
            className="min-h-[165px] rounded-[28px] p-5 text-white flex flex-col justify-between exl-press shadow-sm"
            style={{
              backgroundColor: '#5E7FA3',
            }}
          >

            <div className="flex justify-between items-start">

              <BookOpen
                size={29}
                strokeWidth={1.9}
              />

              <span className="text-[34px] leading-none font-bold tracking-[-0.04em]">
                {books.length}
              </span>

            </div>

            <div>

              <p className="text-[25px] font-bold tracking-[-0.03em]">
                Biblioteca
              </p>

              <p className="text-white/70 text-sm mt-1">
                Tutti i tuoi libri
              </p>

            </div>

          </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 0.10,
              duration: 0.38,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
          <Link
            href="/favorites"
            className="min-h-[135px] rounded-[25px] p-4 text-white flex flex-col justify-between exl-press shadow-sm"
            style={{
              backgroundColor: '#DDB342',
            }}
          >

            <div className="flex justify-between items-start">

              <Heart
                size={24}
                strokeWidth={2}
              />

              <span className="text-[27px] leading-none font-bold">
                {favoriteCount}
              </span>

            </div>

            <p className="text-[17px] font-semibold">
              Preferiti
            </p>

          </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 0.16,
              duration: 0.38,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
          <Link
            href="/loans"
            className="min-h-[135px] rounded-[25px] p-4 text-white flex flex-col justify-between exl-press shadow-sm"
            style={{
              backgroundColor: '#C76955',
            }}
          >

            <div className="flex justify-between items-start">

              <ArrowUpRight
                size={25}
                strokeWidth={2}
              />

              <span className="text-[27px] leading-none font-bold">
                {loanedCount}
              </span>

            </div>

            <p className="text-[17px] font-semibold">
              Prestiti
            </p>

          </Link>
          </motion.div>

        </section>

        <section className="mt-9">

          <div className="flex items-center justify-between mb-4">

            <h2 className="text-[22px] font-bold tracking-[-0.025em]">
              Ultimi aggiunti
            </h2>

            <Link
              href="/catalog"
              className="text-[15px] text-[#5E7FA3] font-medium flex items-center"
            >
              Tutti
              <ChevronRight size={17} />
            </Link>

          </div>

          <div className="flex gap-4 overflow-x-auto exl-scrollbar-none -mx-5 px-5 pb-4">

            {recentBooks.map((book, index) => {

              const cover =
                book.custom_cover_url ||
                book.cover_url

              return (
                <motion.div
                  key={book.id}
                  initial={{
                    opacity: 0,
                    x: 12,
                    scale: 0.97,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    scale: 1,
                  }}
                  transition={{
                    delay:
                      Math.min(
                        index * 0.045,
                        0.25
                      ),
                    duration: 0.34,
                    ease: [
                      0.22,
                      1,
                      0.36,
                      1,
                    ],
                  }}
                  className="w-[128px] shrink-0"
                >
                <Link
                  href={`/books/${book.id}`}
                  className="block exl-press"
                >

                  <div className="aspect-[2/3] rounded-[16px] overflow-hidden bg-[#d1d1d6] exl-book-cover">

                    <BookCover
                      title={book.title}
                      authors={book.authors}
                      coverUrl={cover}
                    />

                  </div>

                  <p className="font-semibold text-[14px] leading-tight mt-3 line-clamp-2">
                    {book.title}
                  </p>

                  {book.authors?.[0] && (
                    <p className="text-[#8e8e93] text-[12px] mt-1 truncate">
                      {book.authors[0]}
                    </p>
                  )}

                </Link>
                </motion.div>
              )
            })}

          </div>

        </section>

      </div>

    </main>
  )
}
