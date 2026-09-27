'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { createClient } from '@/utils/supabase/client'
import {
  buildLocationPath,
  LocationItem,
} from '@/utils/location-path'

type Book = {
  id: string
  title: string
  authors: string[] | null
  publisher: string | null
  publication_year: number | null
  isbn_13: string | null
  cover_url: string | null
  custom_cover_url: string | null
  location_id: string | null
  status: string
  created_at: string
}

type SortMode =
  | 'recent'
  | 'title'
  | 'author'
  | 'year_desc'
  | 'year_asc'

export default function CatalogPage() {
  const supabase = createClient()

  const [books, setBooks] = useState<Book[]>([])
  const [locations, setLocations] =
    useState<LocationItem[]>([])

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [location, setLocation] = useState('all')
  const [sort, setSort] =
    useState<SortMode>('recent')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadCatalog() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('Utente non autenticato.')
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
        setError('Biblioteca non trovata.')
        setLoading(false)
        return
      }

      const [booksResult, locationsResult] =
        await Promise.all([
          supabase
            .from('books')
            .select(`
              id,
              title,
              authors,
              publisher,
              publication_year,
              isbn_13,
              cover_url,
              custom_cover_url,
              location_id,
              status,
              created_at
            `)
            .eq('family_id', membership.family_id),

          supabase
            .from('locations')
            .select(`
              id,
              name,
              location_type,
              parent_id
            `)
            .eq('family_id', membership.family_id),
        ])

      if (booksResult.error) {
        setError('Errore nel caricamento del catalogo.')
        setLoading(false)
        return
      }

      setBooks(booksResult.data ?? [])
      setLocations(locationsResult.data ?? [])
      setLoading(false)
    }

    loadCatalog()
  }, [])

  const shelfLocations = locations.filter(
    (item) => item.location_type === 'shelf'
  )

  const visibleBooks = useMemo(() => {
    const query = search.trim().toLowerCase()

    let result = books.filter((book) => {
      const searchable = [
        book.title,
        book.authors?.join(' '),
        book.publisher,
        book.isbn_13,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      if (
        query &&
        !searchable.includes(query)
      ) {
        return false
      }

      if (
        status !== 'all' &&
        book.status !== status
      ) {
        return false
      }

      if (
        location !== 'all' &&
        book.location_id !== location
      ) {
        return false
      }

      return true
    })

    result = [...result].sort((a, b) => {
      if (sort === 'title') {
        return a.title.localeCompare(
          b.title,
          'it'
        )
      }

      if (sort === 'author') {
        const authorA =
          a.authors?.[0] ?? ''

        const authorB =
          b.authors?.[0] ?? ''

        return authorA.localeCompare(
          authorB,
          'it'
        )
      }

      if (sort === 'year_desc') {
        return (
          (b.publication_year ?? 0) -
          (a.publication_year ?? 0)
        )
      }

      if (sort === 'year_asc') {
        return (
          (a.publication_year ?? 9999) -
          (b.publication_year ?? 9999)
        )
      }

      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      )
    })

    return result
  }, [
    books,
    search,
    status,
    location,
    sort,
  ])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f5f1] flex items-center justify-center">
        Caricamento...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f6f5f1]">

      <div className="max-w-6xl mx-auto px-5 py-7">

        <div className="mb-8">

          <p className="text-sm text-gray-500">
            La nostra biblioteca
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Catalogo
          </h1>

          <p className="text-gray-500 mt-2">
            {visibleBooks.length === 1
              ? '1 libro'
              : `${visibleBooks.length} libri`}
          </p>

        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-5">
            {error}
          </div>
        )}

        <section className="bg-white border rounded-3xl p-5 mb-7">

          <div className="relative">

            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              ⌕
            </span>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Titolo, autore, editore o ISBN..."
              className="w-full bg-gray-50 rounded-2xl pl-11 pr-4 py-4 outline-none"
            />

          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-4">

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
              className="border rounded-xl px-3 py-3 bg-white"
            >
              <option value="all">
                Tutti gli stati
              </option>

              <option value="home">
                A casa
              </option>

              <option value="loaned">
                In prestito
              </option>

              <option value="lost">
                Smarriti
              </option>

              <option value="other">
                Altro
              </option>
            </select>

            <select
              value={location}
              onChange={(e) =>
                setLocation(e.target.value)
              }
              className="border rounded-xl px-3 py-3 bg-white"
            >
              <option value="all">
                Tutte le posizioni
              </option>

              {shelfLocations.map(
                (shelf) => (
                  <option
                    key={shelf.id}
                    value={shelf.id}
                  >
                    {buildLocationPath(
                      shelf.id,
                      locations
                    )}
                  </option>
                )
              )}

            </select>

            <select
              value={sort}
              onChange={(e) =>
                setSort(
                  e.target.value as SortMode
                )
              }
              className="border rounded-xl px-3 py-3 bg-white"
            >
              <option value="recent">
                Ultimi aggiunti
              </option>

              <option value="title">
                Titolo A–Z
              </option>

              <option value="author">
                Autore A–Z
              </option>

              <option value="year_desc">
                Anno: più recenti
              </option>

              <option value="year_asc">
                Anno: meno recenti
              </option>
            </select>

          </div>

        </section>

        {visibleBooks.length === 0 ? (

          <div className="bg-white border rounded-3xl p-10 text-center">

            <div className="text-5xl mb-4">
              📚
            </div>

            <h2 className="text-xl font-semibold">
              Nessun libro trovato
            </h2>

            <p className="text-gray-500 mt-2">
              Prova a modificare i filtri.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8">

            {visibleBooks.map((book) => {

              const cover =
                book.custom_cover_url ||
                book.cover_url

              return (
                <Link
                  key={book.id}
                  href={`/books/${book.id}`}
                  className="group"
                >

                  <div className="aspect-[2/3] bg-[#ebe8df] rounded-2xl overflow-hidden border shadow-sm">

                    {cover ? (
                      <img
                        src={cover}
                        alt={book.title}
                        className="w-full h-full object-cover transition duration-200 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">
                        📖
                      </div>
                    )}

                  </div>

                  <h2 className="font-semibold leading-tight mt-3">
                    {book.title}
                  </h2>

                  {book.authors?.length ? (
                    <p className="text-sm text-gray-500 mt-1">
                      {book.authors.join(', ')}
                    </p>
                  ) : null}

                  {book.location_id && (
                    <p className="text-xs text-gray-400 mt-2 line-clamp-1">
                      📍{' '}
                      {buildLocationPath(
                        book.location_id,
                        locations
                      )}
                    </p>
                  )}

                </Link>
              )
            })}

          </div>

        )}

      </div>

    </main>
  )
}
