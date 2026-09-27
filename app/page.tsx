'use client'

import {
  FormEvent,
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'

import {
  BookOpen,
  Map,
  ArrowUpRight,
  Heart,
  Search,
  ScanBarcode,
  ChevronRight,
  Settings,
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'

type Book = {
  id: string
  title: string
  authors: string[] | null
  cover_url: string | null
  custom_cover_url: string | null
  favorite: boolean
  status: string
}

export default function Home() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [books, setBooks] =
    useState<Book[]>([])

  const [locationCount, setLocationCount] =
    useState(0)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  async function loadLibrary() {
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setBooks([])
      setLoading(false)
      return
    }

    const { data: membership } =
      await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .single()

    if (!membership) {
      setError(
        'Non riesco a trovare la tua biblioteca.'
      )

      setLoading(false)
      return
    }

    const [booksResult, locationResult] =
      await Promise.all([
        supabase
          .from('books')
          .select(`
            id,
            title,
            authors,
            cover_url,
            custom_cover_url,
            favorite,
            status
          `)
          .eq(
            'family_id',
            membership.family_id
          )
          .order(
            'created_at',
            { ascending: false }
          ),

        supabase
          .from('locations')
          .select(
            '*',
            {
              count: 'exact',
              head: true,
            }
          )
          .eq(
            'family_id',
            membership.family_id
          ),
      ])

    if (booksResult.error) {
      setError(
        'Errore durante il caricamento.'
      )

      setLoading(false)
      return
    }

    setBooks(
      booksResult.data ?? []
    )

    setLocationCount(
      locationResult.count ?? 0
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

    const { error } =
      await supabase.auth
        .signInWithPassword({
          email,
          password,
        })

    if (error) {
      setError(
        'Email o password non corrette.'
      )

      setLoading(false)
      return
    }

    await loadLibrary()
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">

        <div className="w-8 h-8 border-[3px] border-black/15 border-t-black rounded-full animate-spin" />

      </main>
    )
  }

  if (
    books.length === 0 &&
    error === '' &&
    !email
  ) {
    const sessionCheck = async () => {}
  }

  if (!books.length) {
    // Se non ci sono libri dobbiamo distinguere
    // tra utente autenticato e non autenticato.
  }

  return (
    <AuthenticatedHome
      books={books}
      locationCount={locationCount}
      error={error}
      email={email}
      password={password}
      setEmail={setEmail}
      setPassword={setPassword}
      handleLogin={handleLogin}
      supabase={supabase}
      reload={loadLibrary}
    />
  )
}

function AuthenticatedHome({
  books,
  locationCount,
  error,
  email,
  password,
  setEmail,
  setPassword,
  handleLogin,
  supabase,
  reload,
}: {
  books: Book[]
  locationCount: number
  error: string

  email: string
  password: string

  setEmail: (value: string) => void
  setPassword: (value: string) => void

  handleLogin: (
    event: FormEvent
  ) => Promise<void>

  supabase: ReturnType<
    typeof createClient
  >

  reload: () => Promise<void>
}) {
  const [authenticated, setAuthenticated] =
    useState<boolean | null>(null)

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setAuthenticated(!!user)
    }

    check()
  }, [])

  if (authenticated === null) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-black/15 border-t-black rounded-full animate-spin" />
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

          </form>

        </div>

      </main>
    )
  }

  const totalBooks =
    books.length

  const loanedBooks =
    books.filter(
      (book) =>
        book.status === 'loaned'
    ).length

  const favoriteBooks =
    books.filter(
      (book) => book.favorite
    ).length

  const recentBooks =
    books.slice(0, 8)

  async function logout() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <main className="exl-page">

      <div className="max-w-5xl mx-auto px-5 pt-[calc(20px+env(safe-area-inset-top))] md:pt-10">

        <header className="flex items-start justify-between gap-4">

          <div>

            <h1 className="text-[38px] sm:text-[46px] leading-none font-bold tracking-[-0.045em]">
              Ex Libris
            </h1>

            <p className="text-[#8e8e93] mt-2">
              {totalBooks === 1
                ? '1 libro'
                : `${totalBooks} libri`}
            </p>

          </div>

          <button
            onClick={logout}
            className="exl-glass w-11 h-11 rounded-full flex items-center justify-center exl-press"
            aria-label="Impostazioni"
          >
            <Settings
              size={20}
              strokeWidth={2}
            />
          </button>

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

          <DashboardCard
            href="/catalog"
            icon={BookOpen}
            value={totalBooks}
            label="Libri"
            color="#087f75"
          />

          <DashboardCard
            href="/locations"
            icon={Map}
            value={locationCount}
            label="Posizioni"
            color="#ff9f0a"
          />

          <DashboardCard
            href="/loans"
            icon={ArrowUpRight}
            value={loanedBooks}
            label="Prestiti"
            color="#0a84ff"
          />

          <DashboardCard
            href="/catalog"
            icon={Heart}
            value={favoriteBooks}
            label="Preferiti"
            color="#ff453a"
          />

        </section>

        <section className="mt-9">

          <div className="flex items-center justify-between mb-4">

            <h2 className="text-[22px] font-bold tracking-[-0.025em]">
              Ultimi aggiunti
            </h2>

            <Link
              href="/catalog"
              className="text-[15px] text-[#087f75] font-medium flex items-center"
            >
              Tutti

              <ChevronRight
                size={17}
              />
            </Link>

          </div>

          {recentBooks.length ? (

            <div className="flex gap-4 overflow-x-auto exl-scrollbar-none -mx-5 px-5 pb-4">

              {recentBooks.map(
                (book) => {

                  const cover =
                    book.custom_cover_url ||
                    book.cover_url

                  return (
                    <Link
                      href={`/books/${book.id}`}
                      key={book.id}
                      className="w-[128px] shrink-0 exl-press"
                    >

                      <div className="aspect-[2/3] rounded-[16px] overflow-hidden bg-white exl-book-cover">

                        {cover ? (
                          <img
                            src={cover}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#d1d1d6] flex items-center justify-center">

                            <BookOpen
                              size={34}
                              strokeWidth={1.4}
                              className="text-white"
                            />

                          </div>
                        )}

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
                  )
                }
              )}

            </div>

          ) : (

            <div className="exl-glass exl-card p-7">

              <p className="font-semibold">
                La biblioteca è vuota
              </p>

              <p className="text-[#8e8e93] text-sm mt-1">
                Inizia scansionando il primo libro.
              </p>

            </div>

          )}

        </section>

        <Link
          href="/add"
          className="hidden md:flex exl-glass exl-card mt-7 p-5 items-center justify-between exl-press"
        >

          <div className="flex items-center gap-4">

            <div className="w-12 h-12 bg-black text-white rounded-[16px] flex items-center justify-center">

              <ScanBarcode
                size={25}
              />

            </div>

            <div>

              <p className="font-semibold">
                Aggiungi un libro
              </p>

              <p className="text-[#8e8e93] text-sm mt-0.5">
                Scansiona il codice ISBN
              </p>

            </div>

          </div>

          <ChevronRight
            className="text-[#8e8e93]"
          />

        </Link>

      </div>

    </main>
  )
}

function DashboardCard({
  href,
  icon: Icon,
  value,
  label,
  color,
}: {
  href: string

  icon: React.ComponentType<{
    size?: number
    strokeWidth?: number
  }>

  value: number
  label: string
  color: string
}) {
  return (
    <Link
      href={href}
      className="rounded-[24px] min-h-[132px] p-4 text-white flex flex-col justify-between shadow-sm exl-press"
      style={{
        backgroundColor: color,
      }}
    >

      <div className="flex justify-between items-start">

        <Icon
          size={25}
          strokeWidth={2}
        />

        <span className="text-[26px] leading-none font-bold tracking-[-0.04em]">
          {value}
        </span>

      </div>

      <p className="text-[17px] font-semibold">
        {label}
      </p>

    </Link>
  )
}
