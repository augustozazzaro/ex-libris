'use client'

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { createClient } from '@/utils/supabase/client'
import IsbnScanner from '@/components/IsbnScanner'

type BookResult = {
  found: boolean
  source?: string

  isbn10?: string | null
  isbn13?: string | null

  title?: string
  subtitle?: string

  authors?: string[]

  publisher?: string
  publicationDate?: string

  pages?: number | null
  language?: string

  categories?: string[]
  description?: string

  cover?: string | null
  error?: string
}

type Location = {
  id: string
  name: string
  location_type: string
  parent_id: string | null
}

export default function AddBookPage() {
  const router = useRouter()
  const supabase = createClient()

  const [isbn, setIsbn] = useState('')
  const [book, setBook] =
    useState<BookResult | null>(null)

  const [locations, setLocations] =
    useState<Location[]>([])

  const [locationId, setLocationId] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const [scannerOpen, setScannerOpen] =
    useState(false)

  const [quickMode, setQuickMode] =
    useState(false)

  const [error, setError] =
    useState('')

  useEffect(() => {
    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: membership } =
        await supabase
          .from('family_members')
          .select('family_id')
          .eq('user_id', user.id)
          .single()

      if (!membership) return

      const { data } = await supabase
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
        .order('name')

      setLocations(data ?? [])

      const savedLocation =
        localStorage.getItem(
          'biblioteca_last_location'
        )

      if (savedLocation) {
        setLocationId(savedLocation)
      }

      const savedQuickMode =
        localStorage.getItem(
          'biblioteca_quick_mode'
        )

      if (savedQuickMode === 'true') {
        setQuickMode(true)
      }
    }

    initialize()
  }, [])

  function buildLocationPath(
    id: string
  ): string {
    const location = locations.find(
      (item) => item.id === id
    )

    if (!location) return ''

    if (!location.parent_id) {
      return location.name
    }

    return (
      buildLocationPath(
        location.parent_id
      ) +
      ' → ' +
      location.name
    )
  }

  async function findBook(
    value: string
  ) {
    const cleaned =
      value.replace(
        /[^0-9Xx]/g,
        ''
      )

    if (!cleaned) {
      setError(
        'Inserisci un ISBN.'
      )
      return
    }

    setIsbn(cleaned)
    setLoading(true)
    setError('')
    setBook(null)

    try {
      const response =
        await fetch(
          `/api/book?isbn=${encodeURIComponent(
            cleaned
          )}`
        )

      const data: BookResult =
        await response.json()

      if (
        !response.ok ||
        !data.found
      ) {
        setError(
          data.error ??
            'Libro non trovato.'
        )

        return
      }

      setBook(data)
    } catch {
      setError(
        'Errore durante la ricerca.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function searchBook(
    e: FormEvent
  ) {
    e.preventDefault()
    await findBook(isbn)
  }

  const handleDetected =
    useCallback(
      async (detectedIsbn: string) => {
        setScannerOpen(false)
        await findBook(
          detectedIsbn
        )
      },
      []
    )

  function changeLocation(
    value: string
  ) {
    setLocationId(value)

    if (value) {
      localStorage.setItem(
        'biblioteca_last_location',
        value
      )
    } else {
      localStorage.removeItem(
        'biblioteca_last_location'
      )
    }
  }

  function changeQuickMode(
    value: boolean
  ) {
    setQuickMode(value)

    localStorage.setItem(
      'biblioteca_quick_mode',
      String(value)
    )
  }

  async function saveBook() {
    if (!book) return

    setSaving(true)
    setError('')

    const {
      data: { user },
    } =
      await supabase.auth.getUser()

    if (!user) {
      setError(
        'Utente non autenticato.'
      )
      setSaving(false)
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
        'Biblioteca non trovata.'
      )
      setSaving(false)
      return
    }

    let publicationYear:
      | number
      | null = null

    if (book.publicationDate) {
      const match =
        book.publicationDate.match(
          /\d{4}/
        )

      if (match) {
        publicationYear =
          Number(match[0])
      }
    }

    const { error: insertError } =
      await supabase
        .from('books')
        .insert({
          family_id:
            membership.family_id,

          isbn_10:
            book.isbn10 ?? null,

          isbn_13:
            book.isbn13 ?? null,

          title:
            book.title ??
            'Titolo sconosciuto',

          subtitle:
            book.subtitle || null,

          authors:
            book.authors ?? [],

          publisher:
            book.publisher || null,

          publication_year:
            publicationYear,

          language:
            book.language || null,

          pages:
            book.pages ?? null,

          categories:
            book.categories ?? [],

          description:
            book.description || null,

          cover_url:
            book.cover || null,

          metadata_source:
            book.source ===
            'google_books'
              ? 'google_books'
              : book.source ===
                  'open_library'
                ? 'open_library'
                : 'manual',

          metadata_raw:
            book,

          owner_user_id:
            user.id,

          location_id:
            locationId || null,

          status: 'home',

          created_by:
            user.id,
        })

    if (insertError) {
      console.error(
        insertError
      )

      setError(
        insertError.message
      )

      setSaving(false)
      return
    }

    if (quickMode) {
      setBook(null)
      setIsbn('')
      setSaving(false)

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })

      return
    }

    router.push('/')
    router.refresh()
  }

  const shelves =
    locations.filter(
      (location) =>
        location.location_type ===
        'shelf'
    )

  return (
    <main className="min-h-screen bg-[#f6f5f1]">

      {scannerOpen && (
        <IsbnScanner
          onDetected={
            handleDetected
          }
          onClose={() =>
            setScannerOpen(false)
          }
        />
      )}

      <div className="max-w-3xl mx-auto px-5 py-7">

        <div className="flex items-center justify-between">

          <Link
            href="/"
            className="text-sm text-gray-500"
          >
            ← Biblioteca
          </Link>

          <Link
            href="/locations"
            className="text-sm border bg-white rounded-xl px-3 py-2"
          >
            Posizioni
          </Link>

        </div>

        <div className="mt-7 mb-7">

          <p className="text-sm text-gray-500">
            Nuovo libro
          </p>

          <h1 className="text-3xl font-bold">
            Aggiungi libro
          </h1>

          <p className="text-gray-500 mt-2">
            Scansiona il codice a barre
            oppure inserisci l'ISBN.
          </p>

        </div>

        <section className="bg-white border rounded-3xl p-5">

          <button
            onClick={() =>
              setScannerOpen(true)
            }
            className="w-full bg-black text-white rounded-2xl py-4 text-lg font-semibold"
          >
            📷 Scansiona ISBN
          </button>

          <div className="flex items-center gap-4 my-5">

            <div className="h-px bg-gray-200 flex-1" />

            <span className="text-xs text-gray-400 uppercase">
              oppure
            </span>

            <div className="h-px bg-gray-200 flex-1" />

          </div>

          <form
            onSubmit={searchBook}
          >
            <div className="flex gap-3">

              <input
                type="text"
                inputMode="numeric"
                value={isbn}
                onChange={(e) =>
                  setIsbn(
                    e.target.value
                  )
                }
                placeholder="ISBN 978..."
                className="flex-1 min-w-0 border rounded-xl px-4 py-3"
              />

              <button
                type="submit"
                disabled={loading}
                className="border rounded-xl px-5 font-medium"
              >
                {loading
                  ? '...'
                  : 'Cerca'}
              </button>

            </div>
          </form>

          {error && (
            <p className="text-red-600 text-sm mt-4">
              {error}
            </p>
          )}

        </section>

        <section className="mt-5 bg-white border rounded-3xl p-5">

          <div className="flex items-center justify-between gap-5">

            <div>
              <p className="font-semibold">
                Catalogazione rapida
              </p>

              <p className="text-sm text-gray-500 mt-1">
                Dopo il salvataggio resta
                qui per il libro successivo.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                changeQuickMode(
                  !quickMode
                )
              }
              className={
                quickMode
                  ? 'w-14 h-8 rounded-full bg-black p-1 transition'
                  : 'w-14 h-8 rounded-full bg-gray-200 p-1 transition'
              }
            >
              <span
                className={
                  quickMode
                    ? 'block w-6 h-6 bg-white rounded-full translate-x-6 transition'
                    : 'block w-6 h-6 bg-white rounded-full transition'
                }
              />
            </button>

          </div>

        </section>

        {book && (
          <section className="bg-white border rounded-3xl p-6 mt-5">

            <div className="flex gap-5">

              <div className="w-28 shrink-0">

                {book.cover ? (
                  <img
                    src={
                      book.cover
                    }
                    alt={
                      book.title ??
                      'Copertina'
                    }
                    className="w-full rounded-xl border"
                  />
                ) : (
                  <div className="aspect-[2/3] bg-[#ebe8df] rounded-xl flex items-center justify-center text-4xl">
                    📖
                  </div>
                )}

              </div>

              <div className="min-w-0">

                <p className="text-xs uppercase tracking-wide text-gray-400">
                  {book.source ===
                  'google_books'
                    ? 'Google Books'
                    : 'Open Library'}
                </p>

                <h2 className="text-xl font-bold mt-1">
                  {book.title}
                </h2>

                {book.authors?.length ? (
                  <p className="text-gray-600 mt-2">
                    {book.authors.join(
                      ', '
                    )}
                  </p>
                ) : null}

                <div className="text-sm text-gray-500 mt-4 space-y-1">

                  {book.publisher && (
                    <p>
                      {
                        book.publisher
                      }
                    </p>
                  )}

                  {book.publicationDate && (
                    <p>
                      {
                        book.publicationDate
                      }
                    </p>
                  )}

                  {book.isbn13 && (
                    <p>
                      ISBN {
                        book.isbn13
                      }
                    </p>
                  )}

                </div>

              </div>

            </div>

            <div className="border-t mt-6 pt-6">

              <label className="block text-sm font-medium mb-2">
                📍 Posizione
              </label>

              {shelves.length ? (

                <select
                  value={
                    locationId
                  }
                  onChange={(e) =>
                    changeLocation(
                      e.target.value
                    )
                  }
                  className="w-full border rounded-xl px-4 py-3 bg-white"
                >

                  <option value="">
                    Nessuna posizione
                  </option>

                  {shelves.map(
                    (location) => (
                      <option
                        key={
                          location.id
                        }
                        value={
                          location.id
                        }
                      >
                        {buildLocationPath(
                          location.id
                        )}
                      </option>
                    )
                  )}

                </select>

              ) : (

                <Link
                  href="/locations"
                  className="block bg-gray-50 rounded-xl p-4 text-sm"
                >
                  Crea prima almeno
                  un ripiano →
                </Link>

              )}

            </div>

            <button
              onClick={saveBook}
              disabled={saving}
              className="w-full bg-black text-white rounded-2xl py-4 font-semibold mt-6 disabled:opacity-50"
            >
              {saving
                ? 'Salvataggio...'
                : quickMode
                  ? 'Salva e scansiona il prossimo'
                  : 'Salva nella biblioteca'}
            </button>

          </section>
        )}

      </div>

    </main>
  )
}
