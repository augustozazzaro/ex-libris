'use client'

import ExLibrisLoader from '@/components/ExLibrisLoader'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import Link from 'next/link'

import {
  Search,
  SlidersHorizontal,
  Grid2X2,
  List,
  BookOpen,
  MapPin,
  X,
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'
import {
  readCache,
  writeCache,
} from '@/utils/exlibris-cache'
import BookCover from '@/components/BookCover'

import {
  buildLocationPath,
  LocationItem,
} from '@/utils/location-path'

type Book = {
  id: string
  title: string
  subtitle: string | null
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

type CatalogSnapshot = {
  books: Book[]
  locations: LocationItem[]
}

type SortMode =
  | 'recent'
  | 'title'
  | 'author'
  | 'year_desc'
  | 'year_asc'

export default function CatalogPage() {
  const supabase = createClient()

  const [books, setBooks] =
    useState<Book[]>([])

  const [locations, setLocations] =
    useState<LocationItem[]>([])

  const [search, setSearch] =
    useState('')

  const [status, setStatus] =
    useState('all')

  const [location, setLocation] =
    useState('all')

  const [sort, setSort] =
    useState<SortMode>('recent')

  const [view, setView] =
    useState<'grid' | 'list'>('grid')

  const [showFilters, setShowFilters] =
    useState(false)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    async function loadCatalog() {
      setError('')

      const {
        data: { session },
      } =
        await supabase.auth.getSession()

      const user =
        session?.user

      if (!user) {
        setError(
          'Utente non autenticato.'
        )
        setLoading(false)
        return
      }

      const cacheKey =
        `catalog:${user.id}`

      const cached =
        readCache<CatalogSnapshot>(
          cacheKey
        )

      if (cached) {
        setBooks(
          cached.books
        )

        setLocations(
          cached.locations
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
            'Biblioteca non trovata.'
          )
        }

        setLoading(false)
        return
      }

      const [
        booksResult,
        locationsResult,
      ] =
        await Promise.all([
          supabase
            .from('books')
            .select(`
              id,
              title,
              subtitle,
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
            .eq(
              'family_id',
              membership.family_id
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
            ),
        ])

      if (
        booksResult.error
      ) {
        if (!cached) {
          setError(
            'Errore nel caricamento del catalogo.'
          )
        }

        setLoading(false)
        return
      }

      const snapshot:
        CatalogSnapshot = {
          books:
            (booksResult.data ??
              []) as Book[],

          locations:
            (locationsResult.data ??
              []) as LocationItem[],
        }

      setBooks(
        snapshot.books
      )

      setLocations(
        snapshot.locations
      )

      writeCache(
        cacheKey,
        snapshot
      )

      setLoading(false)
    }

    loadCatalog()
  }, [])

  const shelves =
    locations.filter(
      (item) =>
        item.location_type === 'shelf'
    )

  const visibleBooks =
    useMemo(() => {
      const query =
        search.trim().toLowerCase()

      let result = books.filter(
        (book) => {
          const searchable = [
            book.title,
            book.subtitle,
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
        }
      )

      result = [...result].sort(
        (a, b) => {
          if (sort === 'title') {
            return a.title.localeCompare(
              b.title,
              'it'
            )
          }

          if (sort === 'author') {
            return (
              a.authors?.[0] ?? ''
            ).localeCompare(
              b.authors?.[0] ?? '',
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
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
          )
        }
      )

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
      <main className="min-h-screen flex items-center justify-center">
        <ExLibrisLoader />
      </main>
    )
  }

  return (
    <main className="exl-page">

      <div className="max-w-6xl mx-auto px-5 pt-[calc(20px+env(safe-area-inset-top))] md:pt-10">

        <header className="mb-7">

          <p className="text-[#8e8e93] text-sm">
            Ex Libris
          </p>

          <h1 className="text-[38px] leading-none font-bold tracking-[-0.045em] mt-1">
            Catalogo
          </h1>

          <p className="text-[#8e8e93] mt-2">
            {visibleBooks.length === 1
              ? '1 libro'
              : `${visibleBooks.length} libri`}
          </p>

        </header>

        <section className="exl-glass exl-card p-3">

          <div className="flex items-center gap-3">

            <Search
              size={20}
              className="text-[#8e8e93] ml-2 shrink-0"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Titolo, autore, editore o ISBN"
              className="flex-1 bg-transparent outline-none py-2 min-w-0"
            />

            {search && (
              <button
                onClick={() =>
                  setSearch('')
                }
                className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            )}

          </div>

        </section>

        <div className="flex items-center justify-between gap-3 mt-4">

          <button
            onClick={() =>
              setShowFilters(
                !showFilters
              )
            }
            className="exl-glass rounded-full px-4 py-2.5 flex items-center gap-2 text-sm font-medium exl-press"
          >
            <SlidersHorizontal
              size={17}
            />
            Filtri
          </button>

          <div className="exl-glass rounded-full p-1 flex">

            <button
              onClick={() =>
                setView('grid')
              }
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                view === 'grid'
                  ? 'bg-black text-white'
                  : ''
              }`}
            >
              <Grid2X2 size={17} />
            </button>

            <button
              onClick={() =>
                setView('list')
              }
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                view === 'list'
                  ? 'bg-black text-white'
                  : ''
              }`}
            >
              <List size={18} />
            </button>

          </div>

        </div>

        {showFilters && (
          <section className="exl-glass exl-card p-4 mt-3 grid sm:grid-cols-3 gap-3">

            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value
                )
              }
              className="bg-white/65 rounded-2xl px-4 py-3 outline-none"
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
                setLocation(
                  e.target.value
                )
              }
              className="bg-white/65 rounded-2xl px-4 py-3 outline-none"
            >
              <option value="all">
                Tutte le posizioni
              </option>

              {shelves.map(
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
              className="bg-white/65 rounded-2xl px-4 py-3 outline-none"
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
                Anno ↓
              </option>

              <option value="year_asc">
                Anno ↑
              </option>
            </select>

          </section>
        )}

        {error && (
          <div className="mt-5 exl-glass exl-card p-4 text-red-500">
            {error}
          </div>
        )}

        {visibleBooks.length === 0 ? (

          <div className="exl-glass exl-card p-10 text-center mt-6">

            <BookOpen
              size={42}
              strokeWidth={1.5}
              className="mx-auto text-[#8e8e93]"
            />

            <p className="font-semibold mt-4">
              Nessun libro trovato
            </p>

            <p className="text-[#8e8e93] text-sm mt-1">
              Prova a cambiare ricerca o filtri.
            </p>

          </div>

        ) : view === 'grid' ? (

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8 mt-7">

            {visibleBooks.map(
              (book) => {

                const cover =
                  book.custom_cover_url ||
                  book.cover_url

                return (
                  <Link
                    key={book.id}
                    href={`/books/${book.id}`}
                    className="exl-press"
                  >

                    <div className="aspect-[2/3] rounded-[18px] overflow-hidden bg-[#d1d1d6] exl-book-cover">

                      <BookCover
                        title={book.title}
                        authors={book.authors}
                        coverUrl={cover}
                      />

                    </div>

                    <h2 className="font-semibold leading-tight mt-3 line-clamp-2">
                      {book.title}
                    </h2>

                    {book.authors?.[0] && (
                      <p className="text-[#8e8e93] text-sm mt-1 truncate">
                        {book.authors[0]}
                      </p>
                    )}

                  </Link>
                )
              }
            )}

          </div>

        ) : (

          <div className="exl-glass exl-card overflow-hidden mt-6">

            {visibleBooks.map(
              (book, index) => {

                const cover =
                  book.custom_cover_url ||
                  book.cover_url

                return (
                  <Link
                    key={book.id}
                    href={`/books/${book.id}`}
                    className={`flex items-center gap-4 p-4 exl-press ${
                      index > 0
                        ? 'border-t border-black/5'
                        : ''
                    }`}
                  >

                    <div className="w-14 h-20 rounded-[9px] overflow-hidden bg-[#d1d1d6] shrink-0 shadow-sm">

                      <BookCover
                        title={book.title}
                        authors={book.authors}
                        coverUrl={cover}
                      />

                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="font-semibold line-clamp-2">
                        {book.title}
                      </p>

                      {book.authors?.length ? (
                        <p className="text-[#8e8e93] text-sm mt-1 truncate">
                          {book.authors.join(', ')}
                        </p>
                      ) : null}

                      {book.location_id && (
                        <p className="text-[#8e8e93] text-xs mt-2 flex items-center gap-1 truncate">

                          <MapPin
                            size={12}
                          />

                          {buildLocationPath(
                            book.location_id,
                            locations
                          )}

                        </p>
                      )}

                    </div>

                  </Link>
                )
              }
            )}

          </div>

        )}

      </div>

    </main>
  )
}
