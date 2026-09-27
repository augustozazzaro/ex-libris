'use client'

import {
  useEffect,
  useState,
} from 'react'

import {
  useParams,
  useRouter,
} from 'next/navigation'

import Link from 'next/link'

import {
  ChevronLeft,
  Pencil,
  MapPin,
  BookOpen,
  Trash2,
  MoreHorizontal,
  Heart,
} from 'lucide-react'

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

  favorite: boolean
  status: string
  notes: string | null

  location_id: string | null
}

export default function BookPage() {
  const params = useParams()
  const router = useRouter()

  const supabase = createClient()

  const [book, setBook] =
    useState<Book | null>(null)

  const [locations, setLocations] =
    useState<LocationItem[]>([])

  const [editing, setEditing] =
    useState(false)

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [title, setTitle] =
    useState('')

  const [subtitle, setSubtitle] =
    useState('')

  const [authors, setAuthors] =
    useState('')

  const [publisher, setPublisher] =
    useState('')

  const [publicationYear, setPublicationYear] =
    useState('')

  const [pages, setPages] =
    useState('')

  const [locationId, setLocationId] =
    useState('')

  const [notes, setNotes] =
    useState('')

  async function loadBook() {
    setLoading(true)

    const { data, error } =
      await supabase
        .from('books')
        .select('*')
        .eq('id', params.id)
        .single()

    if (error || !data) {
      setError('Libro non trovato.')
      setLoading(false)
      return
    }

    setBook(data)

    setTitle(
      data.title ?? ''
    )

    setSubtitle(
      data.subtitle ?? ''
    )

    setAuthors(
      data.authors?.join(', ') ??
        ''
    )

    setPublisher(
      data.publisher ?? ''
    )

    setPublicationYear(
      data.publication_year
        ? String(
            data.publication_year
          )
        : ''
    )

    setPages(
      data.pages
        ? String(data.pages)
        : ''
    )

    setLocationId(
      data.location_id ?? ''
    )

    setNotes(
      data.notes ?? ''
    )

    const {
      data: locationData,
    } = await supabase
      .from('locations')
      .select(`
        id,
        name,
        location_type,
        parent_id
      `)
      .eq(
        'family_id',
        data.family_id
      )

    setLocations(
      locationData ?? []
    )

    setLoading(false)
  }

  useEffect(() => {
    loadBook()
  }, [params.id])

  async function toggleFavorite() {
    if (!book) return

    const newValue =
      !book.favorite

    const { error } =
      await supabase
        .from('books')
        .update({
          favorite: newValue,
        })
        .eq('id', book.id)

    if (!error) {
      setBook({
        ...book,
        favorite: newValue,
      })
    }
  }

  async function saveChanges() {
    if (!book) return

    setSaving(true)
    setError('')

    const authorsArray =
      authors
        .split(',')
        .map(
          (item) =>
            item.trim()
        )
        .filter(Boolean)

    const { error } =
      await supabase
        .from('books')
        .update({
          title:
            title.trim() ||
            book.title,

          subtitle:
            subtitle.trim() ||
            null,

          authors:
            authorsArray,

          publisher:
            publisher.trim() ||
            null,

          publication_year:
            publicationYear
              ? Number(
                  publicationYear
                )
              : null,

          pages:
            pages
              ? Number(pages)
              : null,

          location_id:
            locationId ||
            null,

          notes:
            notes.trim() ||
            null,
        })
        .eq('id', book.id)

    if (error) {
      setError(
        error.message
      )

      setSaving(false)
      return
    }

    setEditing(false)
    setSaving(false)

    await loadBook()
  }

  async function deleteBook() {
    if (!book) return

    const confirmed =
      window.confirm(
        `Eliminare "${book.title}" dalla biblioteca?`
      )

    if (!confirmed) return

    const { error } =
      await supabase
        .from('books')
        .delete()
        .eq('id', book.id)

    if (!error) {
      router.push('/')
      router.refresh()
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">

        <div className="w-8 h-8 border-[3px] border-black/15 border-t-black rounded-full animate-spin" />

      </main>
    )
  }

  if (!book) {
    return (
      <main className="p-8">
        {error}
      </main>
    )
  }

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
      (item) =>
        item.location_type ===
        'shelf'
    )

  return (
    <main className="exl-page">

      <div className="max-w-5xl mx-auto px-5 pt-[calc(16px+env(safe-area-inset-top))] md:pt-8">

        <div className="flex items-center justify-between">

          <Link
            href="/"
            className="exl-glass w-11 h-11 rounded-full flex items-center justify-center exl-press"
          >
            <ChevronLeft
              size={23}
            />
          </Link>

          <div className="flex gap-2">

            <button
              onClick={
                toggleFavorite
              }
              className="exl-glass w-11 h-11 rounded-full flex items-center justify-center exl-press"
            >
              <Heart
                size={20}
                fill={
                  book.favorite
                    ? 'currentColor'
                    : 'none'
                }
              />
            </button>

            <button
              onClick={() =>
                setEditing(true)
              }
              className="exl-glass w-11 h-11 rounded-full flex items-center justify-center exl-press"
            >
              <MoreHorizontal
                size={22}
              />
            </button>

          </div>

        </div>

        {!editing ? (
          <>

            <section className="mt-8 grid md:grid-cols-[260px_1fr] gap-8 md:gap-12">

              <div className="max-w-[230px] md:max-w-none mx-auto w-full">

                <div className="aspect-[2/3] rounded-[22px] overflow-hidden bg-[#d1d1d6] exl-book-cover">

                  {cover ? (
                    <img
                      src={cover}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen
                        size={55}
                        strokeWidth={1.2}
                        className="text-white"
                      />
                    </div>
                  )}

                </div>

              </div>

              <div className="text-center md:text-left">

                <h1 className="text-[32px] md:text-[42px] leading-[1.05] font-bold tracking-[-0.045em]">
                  {book.title}
                </h1>

                {book.subtitle && (
                  <p className="text-[#8e8e93] text-lg mt-3">
                    {book.subtitle}
                  </p>
                )}

                {book.authors?.length ? (
                  <p className="text-[18px] mt-5">
                    {book.authors.join(', ')}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-6">

                  <span className="exl-glass rounded-full px-3 py-1.5 text-sm">

                    {book.status === 'home'
                      ? 'A casa'
                      : book.status ===
                          'loaned'
                        ? 'In prestito'
                        : book.status}

                  </span>

                  {book.publication_year && (
                    <span className="exl-glass rounded-full px-3 py-1.5 text-sm">
                      {book.publication_year}
                    </span>
                  )}

                </div>

                {locationPath && (
                  <div className="exl-glass exl-card p-5 mt-7 text-left">

                    <p className="text-[#8e8e93] text-xs uppercase tracking-wider">
                      Posizione
                    </p>

                    <p className="mt-2 font-medium flex items-start gap-2">

                      <MapPin
                        size={18}
                        className="mt-0.5 shrink-0"
                      />

                      {locationPath}

                    </p>

                  </div>
                )}

              </div>

            </section>

            <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-9">

              <InfoCard
                label="Editore"
                value={book.publisher}
              />

              <InfoCard
                label="Pagine"
                value={
                  book.pages
                    ? String(
                        book.pages
                      )
                    : null
                }
              />

              <InfoCard
                label="Lingua"
                value={book.language}
              />

              <InfoCard
                label="ISBN"
                value={
                  book.isbn_13 ||
                  book.isbn_10
                }
              />

            </section>

            {book.description && (
              <section className="exl-glass exl-card p-6 mt-5">

                <h2 className="font-bold text-lg">
                  Descrizione
                </h2>

                <p className="text-[#636366] leading-relaxed mt-3">
                  {book.description}
                </p>

              </section>
            )}

            {book.notes && (
              <section className="exl-glass exl-card p-6 mt-4">

                <h2 className="font-bold text-lg">
                  Note
                </h2>

                <p className="text-[#636366] whitespace-pre-wrap mt-3">
                  {book.notes}
                </p>

              </section>
            )}

          </>
        ) : (
          <section className="exl-glass exl-card p-5 md:p-7 mt-7 max-w-3xl mx-auto">

            <div className="flex items-center justify-between mb-6">

              <div>

                <p className="text-[#8e8e93] text-sm">
                  Modifica
                </p>

                <h1 className="text-2xl font-bold">
                  Scheda libro
                </h1>

              </div>

              <button
                onClick={() =>
                  setEditing(false)
                }
                className="text-[#087f75] font-medium"
              >
                Fine
              </button>

            </div>

            <div className="space-y-3">

              <Field
                label="Titolo"
                value={title}
                onChange={
                  setTitle
                }
              />

              <Field
                label="Sottotitolo"
                value={subtitle}
                onChange={
                  setSubtitle
                }
              />

              <Field
                label="Autori"
                value={authors}
                onChange={
                  setAuthors
                }
              />

              <Field
                label="Editore"
                value={publisher}
                onChange={
                  setPublisher
                }
              />

              <div className="grid grid-cols-2 gap-3">

                <Field
                  label="Anno"
                  value={
                    publicationYear
                  }
                  onChange={
                    setPublicationYear
                  }
                  type="number"
                />

                <Field
                  label="Pagine"
                  value={pages}
                  onChange={
                    setPages
                  }
                  type="number"
                />

              </div>

              <div>

                <label className="text-xs text-[#8e8e93] ml-2">
                  Posizione
                </label>

                <select
                  value={locationId}
                  onChange={(e) =>
                    setLocationId(
                      e.target.value
                    )
                  }
                  className="w-full bg-white/70 rounded-2xl px-4 py-4 mt-1 outline-none"
                >

                  <option value="">
                    Nessuna posizione
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

              </div>

              <div>

                <label className="text-xs text-[#8e8e93] ml-2">
                  Note
                </label>

                <textarea
                  value={notes}
                  onChange={(e) =>
                    setNotes(
                      e.target.value
                    )
                  }
                  rows={5}
                  className="w-full bg-white/70 rounded-2xl px-4 py-4 mt-1 outline-none resize-none"
                />

              </div>

            </div>

            {error && (
              <p className="text-red-500 text-sm mt-4">
                {error}
              </p>
            )}

            <button
              onClick={saveChanges}
              disabled={saving}
              className="w-full bg-black text-white rounded-2xl py-4 font-semibold mt-5 exl-press"
            >
              {saving
                ? 'Salvataggio…'
                : 'Salva modifiche'}
            </button>

            <button
              onClick={deleteBook}
              className="w-full text-red-500 py-4 mt-3 flex items-center justify-center gap-2"
            >
              <Trash2
                size={18}
              />

              Elimina libro
            </button>

          </section>
        )}

      </div>

    </main>
  )
}

function InfoCard({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  if (!value) return null

  return (
    <div className="exl-glass exl-card p-4">

      <p className="text-[#8e8e93] text-xs">
        {label}
      </p>

      <p className="font-semibold mt-1 break-words">
        {value}
      </p>

    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (
    value: string
  ) => void
  type?: string
}) {
  return (
    <div>

      <label className="text-xs text-[#8e8e93] ml-2">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full bg-white/70 rounded-2xl px-4 py-4 mt-1 outline-none"
      />

    </div>
  )
}
