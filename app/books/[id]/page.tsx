'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

import { createClient } from '@/utils/supabase/client'
import {
  buildLocationPath,
  LocationItem,
} from '@/utils/location-path'

type Book = {
  id: string
  family_id: string

  title: string
  subtitle: string | null
  authors: string[] | null

  isbn_10: string | null
  isbn_13: string | null

  publisher: string | null
  publication_year: number | null

  language: string | null
  pages: number | null

  categories: string[] | null
  description: string | null

  cover_url: string | null
  custom_cover_url: string | null

  status: string
  notes: string | null

  location_id: string | null
}

export default function BookPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [book, setBook] = useState<Book | null>(null)
  const [locations, setLocations] = useState<LocationItem[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [authors, setAuthors] = useState('')
  const [publisher, setPublisher] = useState('')
  const [publicationYear, setPublicationYear] = useState('')
  const [pages, setPages] = useState('')
  const [notes, setNotes] = useState('')
  const [locationId, setLocationId] = useState('')
  const [status, setStatus] = useState('home')

  async function loadBook() {
    setLoading(true)
    setError('')

    const { data, error: bookError } = await supabase
      .from('books')
      .select(`
        id,
        family_id,
        title,
        subtitle,
        authors,
        isbn_10,
        isbn_13,
        publisher,
        publication_year,
        language,
        pages,
        categories,
        description,
        cover_url,
        custom_cover_url,
        status,
        notes,
        location_id
      `)
      .eq('id', params.id)
      .single()

    if (bookError || !data) {
      setError('Libro non trovato.')
      setLoading(false)
      return
    }

    setBook(data)

    setTitle(data.title ?? '')
    setSubtitle(data.subtitle ?? '')
    setAuthors(data.authors?.join(', ') ?? '')
    setPublisher(data.publisher ?? '')
    setPublicationYear(
      data.publication_year
        ? String(data.publication_year)
        : ''
    )
    setPages(
      data.pages
        ? String(data.pages)
        : ''
    )
    setNotes(data.notes ?? '')
    setLocationId(data.location_id ?? '')
    setStatus(data.status ?? 'home')

    const { data: locationData } = await supabase
      .from('locations')
      .select(`
        id,
        name,
        location_type,
        parent_id
      `)
      .eq('family_id', data.family_id)

    setLocations(locationData ?? [])

    setLoading(false)
  }

  useEffect(() => {
    loadBook()
  }, [params.id])

  async function saveChanges() {
    if (!book) return

    setSaving(true)
    setError('')

    const authorList = authors
      .split(',')
      .map((author) => author.trim())
      .filter(Boolean)

    const parsedYear =
      publicationYear.trim()
        ? Number(publicationYear)
        : null

    const parsedPages =
      pages.trim()
        ? Number(pages)
        : null

    const { error: updateError } = await supabase
      .from('books')
      .update({
        title: title.trim() || book.title,
        subtitle: subtitle.trim() || null,
        authors: authorList,
        publisher: publisher.trim() || null,

        publication_year:
          Number.isFinite(parsedYear)
            ? parsedYear
            : null,

        pages:
          Number.isFinite(parsedPages)
            ? parsedPages
            : null,

        notes: notes.trim() || null,

        location_id:
          locationId || null,

        status,
      })
      .eq('id', book.id)

    if (updateError) {
      setError(
        `Errore durante il salvataggio: ${updateError.message}`
      )

      setSaving(false)
      return
    }

    setSaving(false)
    setEditing(false)

    await loadBook()
  }

  async function deleteBook() {
    if (!book) return

    const confirmed = window.confirm(
      `Vuoi davvero eliminare "${book.title}" dalla biblioteca?\n\nQuesta operazione non può essere annullata.`
    )

    if (!confirmed) return

    setDeleting(true)
    setError('')

    const { error: deleteError } = await supabase
      .from('books')
      .delete()
      .eq('id', book.id)

    if (deleteError) {
      setError(
        `Errore durante l'eliminazione: ${deleteError.message}`
      )

      setDeleting(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f5f1] flex items-center justify-center">
        <p>Caricamento...</p>
      </main>
    )
  }

  if (error && !book) {
    return (
      <main className="min-h-screen bg-[#f6f5f1] p-8">
        <p className="text-red-600">
          {error}
        </p>
      </main>
    )
  }

  if (!book) return null

  const cover =
    book.custom_cover_url ||
    book.cover_url

  const locationPath =
    buildLocationPath(
      book.location_id,
      locations
    )

  const shelves =
    locations.filter(
      (location) =>
        location.location_type === 'shelf'
    )

  return (
    <main className="min-h-screen bg-[#f6f5f1]">

      <div className="max-w-5xl mx-auto px-5 py-7">

        <nav className="flex flex-wrap items-center gap-2 mb-8">

          <Link
            href="/"
            className="bg-white border rounded-xl px-4 py-2 text-sm"
          >
            ← Biblioteca
          </Link>

          <Link
            href="/add"
            className="bg-white border rounded-xl px-4 py-2 text-sm"
          >
            + Aggiungi
          </Link>

          <Link
            href="/locations"
            className="bg-white border rounded-xl px-4 py-2 text-sm"
          >
            Posizioni
          </Link>

        </nav>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-2xl p-4 mb-6">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-[280px_1fr] gap-10">

          <div>

            <div className="aspect-[2/3] rounded-3xl overflow-hidden border bg-white shadow-sm">

              {cover ? (
                <img
                  src={cover}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#ebe8df] text-7xl">
                  📖
                </div>
              )}

            </div>

          </div>

          <div>

            {!editing ? (
              <>
                <p className="text-sm text-gray-500 mb-3">
                  Scheda del libro
                </p>

                <h1 className="text-4xl font-bold tracking-tight">
                  {book.title}
                </h1>

                {book.subtitle && (
                  <p className="text-xl text-gray-500 mt-2">
                    {book.subtitle}
                  </p>
                )}

                {book.authors?.length ? (
                  <p className="text-xl mt-5">
                    {book.authors.join(', ')}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2 mt-7">

                  <span className="px-3 py-1 rounded-full bg-white border text-sm">

                    {book.status === 'home' && '✓ A casa'}
                    {book.status === 'loaned' && 'In prestito'}
                    {book.status === 'lost' && 'Smarrito'}
                    {book.status === 'other' && 'Altro'}

                  </span>

                  {book.categories?.slice(0, 3).map(
                    (category) => (
                      <span
                        key={category}
                        className="px-3 py-1 rounded-full bg-white border text-sm"
                      >
                        {category}
                      </span>
                    )
                  )}

                </div>

                <div className="mt-8 bg-white border rounded-3xl p-6">

                  <p className="text-sm text-gray-400">
                    Posizione
                  </p>

                  {locationPath ? (
                    <>
                      <p className="font-semibold text-lg mt-2">
                        📍 {locationPath}
                      </p>

                      <p className="text-sm text-gray-500 mt-2">
                        Posizione fisica della copia
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500 mt-2">
                      Nessuna posizione assegnata
                    </p>
                  )}

                </div>

                <div className="mt-6 bg-white border rounded-3xl p-6">

                  <h2 className="text-lg font-semibold mb-5">
                    Dati bibliografici
                  </h2>

                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5 text-sm">

                    {book.publisher && (
                      <div>
                        <p className="text-gray-400">
                          Editore
                        </p>

                        <p className="font-medium mt-1">
                          {book.publisher}
                        </p>
                      </div>
                    )}

                    {book.publication_year && (
                      <div>
                        <p className="text-gray-400">
                          Anno
                        </p>

                        <p className="font-medium mt-1">
                          {book.publication_year}
                        </p>
                      </div>
                    )}

                    {book.pages && (
                      <div>
                        <p className="text-gray-400">
                          Pagine
                        </p>

                        <p className="font-medium mt-1">
                          {book.pages}
                        </p>
                      </div>
                    )}

                    {book.language && (
                      <div>
                        <p className="text-gray-400">
                          Lingua
                        </p>

                        <p className="font-medium mt-1">
                          {book.language}
                        </p>
                      </div>
                    )}

                    {book.isbn_13 && (
                      <div>
                        <p className="text-gray-400">
                          ISBN-13
                        </p>

                        <p className="font-medium mt-1 break-all">
                          {book.isbn_13}
                        </p>
                      </div>
                    )}

                    {book.isbn_10 && (
                      <div>
                        <p className="text-gray-400">
                          ISBN-10
                        </p>

                        <p className="font-medium mt-1 break-all">
                          {book.isbn_10}
                        </p>
                      </div>
                    )}

                  </div>

                </div>

                {book.notes && (
                  <div className="mt-6 bg-white border rounded-3xl p-6">

                    <h2 className="text-lg font-semibold mb-3">
                      Note
                    </h2>

                    <p className="text-gray-600 whitespace-pre-wrap">
                      {book.notes}
                    </p>

                  </div>
                )}

                {book.description && (
                  <div className="mt-6 bg-white border rounded-3xl p-6">

                    <h2 className="text-lg font-semibold mb-3">
                      Descrizione
                    </h2>

                    <p className="text-gray-600 leading-relaxed">
                      {book.description}
                    </p>

                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3 mt-8">

                  <button
                    onClick={() => setEditing(true)}
                    className="bg-black text-white rounded-2xl py-4 font-semibold"
                  >
                    Modifica libro
                  </button>

                  <button
                    onClick={deleteBook}
                    disabled={deleting}
                    className="bg-white border border-red-200 text-red-600 rounded-2xl py-4 font-semibold disabled:opacity-50"
                  >
                    {deleting
                      ? 'Eliminazione...'
                      : 'Elimina dalla biblioteca'}
                  </button>

                </div>

              </>
            ) : (
              <>

                <div className="flex items-center justify-between gap-4 mb-7">

                  <div>
                    <p className="text-sm text-gray-500">
                      Modifica
                    </p>

                    <h1 className="text-3xl font-bold">
                      Scheda del libro
                    </h1>
                  </div>

                  <button
                    onClick={() => {
                      setEditing(false)
                      loadBook()
                    }}
                    className="border bg-white rounded-xl px-4 py-2"
                  >
                    Annulla
                  </button>

                </div>

                <div className="bg-white border rounded-3xl p-6 space-y-5">

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Titolo
                    </label>

                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full border rounded-xl px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Sottotitolo
                    </label>

                    <input
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className="w-full border rounded-xl px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Autori
                    </label>

                    <input
                      value={authors}
                      onChange={(e) => setAuthors(e.target.value)}
                      placeholder="Separa più autori con una virgola"
                      className="w-full border rounded-xl px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Editore
                    </label>

                    <input
                      value={publisher}
                      onChange={(e) => setPublisher(e.target.value)}
                      className="w-full border rounded-xl px-4 py-3"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Anno
                      </label>

                      <input
                        type="number"
                        value={publicationYear}
                        onChange={(e) =>
                          setPublicationYear(e.target.value)
                        }
                        className="w-full border rounded-xl px-4 py-3"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Pagine
                      </label>

                      <input
                        type="number"
                        value={pages}
                        onChange={(e) =>
                          setPages(e.target.value)
                        }
                        className="w-full border rounded-xl px-4 py-3"
                      />
                    </div>

                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Posizione
                    </label>

                    <select
                      value={locationId}
                      onChange={(e) =>
                        setLocationId(e.target.value)
                      }
                      className="w-full border rounded-xl px-4 py-3 bg-white"
                    >

                      <option value="">
                        Nessuna posizione
                      </option>

                      {shelves.map((location) => (
                        <option
                          key={location.id}
                          value={location.id}
                        >
                          {buildLocationPath(
                            location.id,
                            locations
                          )}
                        </option>
                      ))}

                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Stato
                    </label>

                    <select
                      value={status}
                      onChange={(e) =>
                        setStatus(e.target.value)
                      }
                      className="w-full border rounded-xl px-4 py-3 bg-white"
                    >
                      <option value="home">
                        A casa
                      </option>

                      <option value="loaned">
                        In prestito
                      </option>

                      <option value="lost">
                        Smarrito
                      </option>

                      <option value="other">
                        Altro
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Note
                    </label>

                    <textarea
                      value={notes}
                      onChange={(e) =>
                        setNotes(e.target.value)
                      }
                      rows={5}
                      className="w-full border rounded-xl px-4 py-3 resize-none"
                      placeholder="Annotazioni sulla tua copia..."
                    />
                  </div>

                  <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="w-full bg-black text-white rounded-2xl py-4 font-semibold disabled:opacity-50"
                  >
                    {saving
                      ? 'Salvataggio...'
                      : 'Salva modifiche'}
                  </button>

                </div>

              </>
            )}

          </div>

        </div>

      </div>

    </main>
  )
}
