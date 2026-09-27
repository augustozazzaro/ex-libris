'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Book = {
  id: string
  title: string
  subtitle: string | null
  authors: string[] | null
  cover_url: string | null
  publication_year: number | null
  publisher: string | null
}

export default function Home() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [familyName, setFamilyName] = useState('')
  const [role, setRole] = useState('')
  const [bookCount, setBookCount] = useState(0)

  
const [books, setBooks] = useState<Book[]>([])
const [search, setSearch] = useState('')

  async function loadLibrary() {
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setFamilyName('')
      setBooks([])
      setLoading(false)
      return
    }

    const { data: membership, error: membershipError } =
      await supabase
        .from('family_members')
        .select('family_id, role')
        .eq('user_id', user.id)
        .single()

    if (membershipError || !membership) {
      setError(
        'Non riesco a trovare la biblioteca associata a questo utente.'
      )
      setLoading(false)
      return
    }

    const { data: family, error: familyError } =
      await supabase
        .from('families')
        .select('name')
        .eq('id', membership.family_id)
        .single()

    if (familyError || !family) {
      setError('Non riesco a leggere i dati della biblioteca.')
      setLoading(false)
      return
    }

    const { data: booksData, error: booksError } =
      await supabase
        .from('books')
        .select(`
          id,
          title,
          subtitle,
          authors,
          cover_url,
          publication_year,
          publisher
        `)
        .eq('family_id', membership.family_id)
        .order('created_at', {
          ascending: false,
        })

    if (booksError) {
      setError('Errore durante il caricamento dei libri.')
      setLoading(false)
      return
    }

    setFamilyName(family.name)
    setRole(membership.role)
    setBooks(booksData ?? [])
    setBookCount(booksData?.length ?? 0)

    setLoading(false)
  }

  useEffect(() => {
    loadLibrary()
  }, [])

  async function handleLogin(e: FormEvent) {
    e.preventDefault()

    setLoading(true)
    setError('')

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (loginError) {
      setError('Email o password non corrette.')
      setLoading(false)
      return
    }

    await loadLibrary()
  }

  async function handleLogout() {
    await supabase.auth.signOut()

    setFamilyName('')
    setRole('')
    setBooks([])
    setBookCount(0)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg">Caricamento...</p>
      </main>
    )
  }

  if (!familyName) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl border p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">📚</div>

            <h1 className="text-3xl font-bold">
              La nostra biblioteca
            </h1>

            <p className="text-gray-500 mt-2">
              Accedi alla biblioteca di famiglia
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-black text-white rounded-xl py-3 font-medium"
            >
              Accedi
            </button>
          </form>
        </div>
      </main>
    )
  }

const filteredBooks = books.filter((book) => {
  const query = search.trim().toLowerCase()

  if (!query) return true

  const title = book.title?.toLowerCase() ?? ''
  const subtitle = book.subtitle?.toLowerCase() ?? ''
  const authors = book.authors?.join(' ').toLowerCase() ?? ''
  const publisher = book.publisher?.toLowerCase() ?? ''

  return (
    title.includes(query) ||
    subtitle.includes(query) ||
    authors.includes(query) ||
    publisher.includes(query)
  )
})  
return (
    <main className="min-h-screen bg-[#f6f5f1]">

      <div className="max-w-6xl mx-auto px-6 py-8">

        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10">

          <div>
            <p className="text-sm text-gray-500">
              Biblioteca di famiglia
            </p>

            <h1 className="text-4xl font-bold tracking-tight">
              {familyName}
            </h1>

            <p className="text-gray-500 mt-2">
              {bookCount === 1
                ? '1 libro'
                : `${bookCount} libri`}
            </p>
          </div>

          <div className="flex gap-3">

            <Link
              href="/add"
              className="bg-black text-white rounded-xl px-5 py-3 font-medium"
            >
              + Aggiungi libro
            </Link>

            <button
              onClick={handleLogout}
              className="border rounded-xl px-4 py-3 bg-white"
            >
              Esci
            </button>

          </div>

        </header>

        <section className="mb-10">
          <div className="bg-white border rounded-3xl p-5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca titolo o autore..."
              className="w-full text-lg outline-none"
            />
          </div>
        </section>

        {books.length === 0 ? (

          <section className="bg-white border rounded-3xl p-10 text-center">

            <div className="text-6xl mb-5">
              📚
            </div>

            <h2 className="text-2xl font-semibold">
              La biblioteca è ancora vuota
            </h2>

            <p className="text-gray-500 mt-2 mb-6">
              Aggiungi il tuo primo libro.
            </p>

            <Link
              href="/add"
              className="inline-block bg-black text-white rounded-xl px-6 py-3 font-medium"
            >
              Aggiungi libro
            </Link>

          </section>

        ) : (

          <section>

            <div className="flex items-end justify-between mb-5">

              <div>
                <p className="text-sm text-gray-500">
                  Catalogo
                </p>

                <h2 className="text-2xl font-bold">
                  I tuoi libri
                </h2>
              </div>

            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">

              {filteredBooks.map((book) => (

                <Link
                  key={book.id}
                  href={`/books/${book.id}`}
                  className="group"
                >

                  <div className="aspect-[2/3] bg-white rounded-2xl border overflow-hidden shadow-sm">

                    {book.cover_url ? (

                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                      />

                    ) : (

                      <div className="w-full h-full flex items-center justify-center bg-[#ebe8df] text-5xl">
                        📖
                      </div>

                    )}

                  </div>

                  <div className="mt-3">

                    <h3 className="font-semibold leading-tight">
                      {book.title}
                    </h3>

                    {book.authors &&
                      book.authors.length > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          {book.authors.join(', ')}
                        </p>
                      )}

                    {(book.publisher ||
                      book.publication_year) && (
                        <p className="text-xs text-gray-400 mt-1">
                          {[
                            book.publisher,
                            book.publication_year,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}

                  </div>

                </Link>

              ))}

            </div>

          </section>

        )}

      </div>

    </main>
  )
}
