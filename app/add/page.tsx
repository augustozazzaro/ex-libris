'use client'

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'

import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Keyboard,
  Search,
  ScanBarcode,
  X,
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'
import {
  haptic,
} from '@/utils/haptics'
import LocationPicker from '@/components/LocationPicker'
import BookCover from '@/components/BookCover'
import IsbnScanner from '@/components/IsbnScanner'

type Candidate = {
  source: string
  sourceId?: string

  isbn10: string | null
  isbn13: string | null

  title: string
  subtitle: string

  authors: string[]

  publisher: string
  publicationDate: string
  edition: string

  pages: number | null
  language: string

  categories: string[]
  description: string

  series?: string | null
  translators?: string[]
  editors?: string[]
  illustrators?: string[]
  introductions?: string[]
  format?: string | null
  bibliographic_notes?: string | null

  cover: string | null
}

type Location = {
  id: string
  name: string
  location_type: string
  parent_id: string | null
}

type Draft = {
  source: string

  isbn10: string
  isbn13: string

  title: string
  subtitle: string
  authors: string

  publisher: string
  publicationDate: string
  edition: string

  pages: string
  language: string

  series: string
  translators: string[]
  editors: string[]
  illustrators: string[]
  introductions: string[]
  format: string
  bibliographicNotes: string

  cover: string

  categories: string[]
  description: string
}

function emptyDraft(): Draft {
  return {
    source: 'manual',

    isbn10: '',
    isbn13: '',

    title: '',
    subtitle: '',
    authors: '',

    publisher: '',
    publicationDate: '',
    edition: '',

    pages: '',
    language: '',

    series: '',
    translators: [],
    editors: [],
    illustrators: [],
    introductions: [],
    format: '',
    bibliographicNotes: '',

    cover: '',

    categories: [],
    description: '',
  }
}

export default function AddBookPage() {
  const supabase = createClient()

  const [locations, setLocations] =
    useState<Location[]>([])

  const [locationId, setLocationId] =
    useState('')

  const [quickMode, setQuickMode] =
    useState(false)

  const [scannerOpen, setScannerOpen] =
    useState(false)

  const [isbn, setIsbn] =
    useState('')

  const [query, setQuery] =
    useState('')

  const [results, setResults] =
    useState<Candidate[]>([])

  const [draft, setDraft] =
    useState<Draft | null>(null)

  const [loading, setLoading] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [savedMessage, setSavedMessage] =
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

      const lastLocation =
        localStorage.getItem(
          'biblioteca_last_location'
        )

      if (lastLocation) {
        setLocationId(lastLocation)
      }

      setQuickMode(
        localStorage.getItem(
          'biblioteca_quick_mode'
        ) === 'true'
      )
    }

    initialize()
  }, [])

  function buildLocationPath(
    id: string
  ): string {
    const location =
      locations.find(
        (item) => item.id === id
      )

    if (!location) return ''

    if (!location.parent_id) {
      return location.name
    }

    return `${buildLocationPath(
      location.parent_id
    )} → ${location.name}`
  }

  function selectCandidate(
    candidate: Candidate
  ) {
    setDraft({
      source: candidate.source,

      isbn10:
        candidate.isbn10 ?? '',

      isbn13:
        candidate.isbn13 ?? '',

      title:
        candidate.title ?? '',

      subtitle:
        candidate.subtitle ?? '',

      authors:
        candidate.authors.join(', '),

      publisher:
        candidate.publisher ?? '',

      publicationDate:
        candidate.publicationDate ?? '',

      edition:
        candidate.edition ?? '',

      pages:
        candidate.pages
          ? String(candidate.pages)
          : '',

      language:
        candidate.language ?? '',

      series:
        candidate.series ?? '',

      translators:
        candidate.translators ?? [],

      editors:
        candidate.editors ?? [],

      illustrators:
        candidate.illustrators ?? [],

      introductions:
        candidate.introductions ?? [],

      format:
        candidate.format ?? '',

      bibliographicNotes:
        candidate.bibliographic_notes ?? '',

      cover:
        candidate.cover ?? '',

      categories:
        candidate.categories ?? [],

      description:
        candidate.description ?? '',
    })

    setResults([])
    setError('')
    setSavedMessage('')
  }

  async function lookupIsbn(
    value: string
  ) {
    const cleaned =
      value.replace(
        /[^0-9Xx]/g,
        ''
      )

    if (!cleaned) return

    setIsbn(cleaned)
    setLoading(true)
    setError('')
    setSavedMessage('')
    setResults([])
    setDraft(null)

    try {
      const response =
        await fetch(
          `/api/book?isbn=${encodeURIComponent(cleaned)}`
        )

      const data =
        await response.json()

      const items: Candidate[] =
        data.items ?? []

      if (!items.length) {
        setError(
          'Questa edizione non è stata trovata. Prova con titolo, autore o editore, oppure inseriscila manualmente.'
        )

        return
      }

      if (items.length === 1) {
        selectCandidate(items[0])
      } else {
        setResults(items)
      }
    } catch {
      setError(
        'Errore durante la ricerca.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleIsbnSubmit(
    event: FormEvent
  ) {
    event.preventDefault()
    await lookupIsbn(isbn)
  }

  async function textSearch(
    event: FormEvent
  ) {
    event.preventDefault()

    if (!query.trim()) return

    setLoading(true)
    setError('')
    setSavedMessage('')
    setDraft(null)
    setResults([])

    try {
      const response =
        await fetch(
          `/api/book?q=${encodeURIComponent(
            query.trim()
          )}`
        )

      const data =
        await response.json()

      const items: Candidate[] =
        data.items ?? []

      if (!items.length) {
        setError(
          'Nessun risultato. Puoi inserire il libro manualmente.'
        )

        return
      }

      setResults(items)
    } catch {
      setError(
        'Errore durante la ricerca.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDetected =
    useCallback(
      async (
        detectedIsbn: string
      ) => {
        setScannerOpen(false)
        await lookupIsbn(
          detectedIsbn
        )
      },
      []
    )

  function manualEntry() {
    const manual =
      emptyDraft()

    manual.isbn13 =
      isbn.length === 13
        ? isbn
        : ''

    manual.isbn10 =
      isbn.length === 10
        ? isbn
        : ''

    setDraft(manual)
    setResults([])
    setError('')
  }

  function setDraftField<
    K extends keyof Draft
  >(
    key: K,
    value: Draft[K]
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current
    )
  }

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

  function toggleQuick() {
    const newValue =
      !quickMode

    setQuickMode(newValue)

    localStorage.setItem(
      'biblioteca_quick_mode',
      String(newValue)
    )
  }

  async function saveBook() {
    if (
      !draft ||
      !draft.title.trim()
    ) {
      setError(
        'Il titolo è obbligatorio.'
      )
      return
    }

    setSaving(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

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

    const yearMatch =
      draft.publicationDate.match(
        /\d{4}/
      )

    const publicationYear =
      yearMatch
        ? Number(yearMatch[0])
        : null

    const authors =
      draft.authors
        .split(',')
        .map(
          (value) =>
            value.trim()
        )
        .filter(Boolean)

    const { error: insertError } =
      await supabase
        .from('books')
        .insert({
          family_id:
            membership.family_id,

          isbn_10:
            draft.isbn10 ||
            null,

          isbn_13:
            draft.isbn13 ||
            null,

          title:
            draft.title.trim(),

          subtitle:
            draft.subtitle.trim() ||
            null,

          authors,

          publisher:
            draft.publisher.trim() ||
            null,

          publication_year:
            publicationYear,

          edition:
            draft.edition.trim() ||
            null,

          language:
            draft.language.trim() ||
            null,

          series:
            draft.series.trim() ||
            null,

          translators:
            draft.translators,

          editors:
            draft.editors,

          illustrators:
            draft.illustrators,

          introductions:
            draft.introductions,

          format:
            draft.format.trim() ||
            null,

          bibliographic_notes:
            draft.bibliographicNotes.trim() ||
            null,

          pages:
            draft.pages
              ? Number(
                  draft.pages
                )
              : null,

          categories:
            draft.categories,

          description:
            draft.description ||
            null,

          cover_url:
            draft.cover ||
            null,

          metadata_source:
            (() => {
              const source =
                (draft.source || '')
                  .toLowerCase()

              if (
                source.includes('+') ||
                source.includes('open library search')
              ) {
                return 'multi_source'
              }

              if (source.includes('sbn')) {
                return 'sbn'
              }

              if (source.includes('google')) {
                return 'google_books'
              }

              if (source.includes('open library')) {
                return 'open_library'
              }

              if (source.includes('crossref')) {
                return 'crossref'
              }

              return 'manual'
            })(),

          metadata_raw:
            draft,

          owner_user_id:
            user.id,

          location_id:
            locationId ||
            null,

          status: 'home',

          created_by:
            user.id,
        })

    if (insertError) {
      setError(
        insertError.message
      )

      haptic('error')
      setSaving(false)
      return
    }

    haptic('success')

    setSaving(false)

    if (quickMode) {
      setDraft(null)
      setResults([])
      setIsbn('')
      setQuery('')

      setSavedMessage(
        'Libro salvato. Pronto per il prossimo.'
      )

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    } else {
      window.location.href = '/'
    }
  }


  return (
    <main className="exl-page">

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

      <div className="max-w-3xl mx-auto px-5 pt-[calc(16px+env(safe-area-inset-top))] md:pt-8">

        <div className="flex items-center gap-4">

          <Link
            href="/"
            className="exl-glass w-11 h-11 rounded-full flex items-center justify-center"
          >
            <ArrowLeft
              size={20}
            />
          </Link>

          <div>
            <p className="text-[#8e8e93] text-sm">
              Ex Libris
            </p>

            <h1 className="text-[32px] font-bold tracking-[-0.04em]">
              Aggiungi libro
            </h1>
          </div>

        </div>

        <button
          onClick={() =>
            setScannerOpen(true)
          }
          className="w-full bg-black text-white rounded-[26px] py-5 mt-7 flex items-center justify-center gap-3 font-semibold text-lg exl-press"
        >
          <ScanBarcode
            size={25}
          />

          Scansiona ISBN
        </button>

        <section className="exl-glass exl-card p-4 mt-4">

          <form
            onSubmit={
              handleIsbnSubmit
            }
          >
            <p className="text-sm font-semibold mb-2">
              ISBN
            </p>

            <div className="flex gap-2">

              <input
                value={isbn}
                onChange={(e) =>
                  setIsbn(
                    e.target.value
                  )
                }
                inputMode="numeric"
                placeholder="978..."
                className="bg-white/70 rounded-2xl px-4 py-3 flex-1 min-w-0 outline-none"
              />

              <button
                className="bg-black text-white rounded-2xl px-5"
                disabled={loading}
              >
                Cerca
              </button>

            </div>
          </form>

          <div className="h-px bg-black/5 my-5" />

          <form
            onSubmit={
              textSearch
            }
          >

            <p className="text-sm font-semibold mb-2">
              Cerca per titolo
            </p>

            <div className="flex gap-2">

              <div className="bg-white/70 rounded-2xl flex items-center px-3 flex-1 min-w-0">

                <Search
                  size={18}
                  className="text-[#8e8e93] shrink-0"
                />

                <input
                  value={query}
                  onChange={(e) =>
                    setQuery(
                      e.target.value
                    )
                  }
                  placeholder="Titolo, autore, editore..."
                  className="bg-transparent px-2 py-3 flex-1 min-w-0 outline-none"
                />

              </div>

              <button
                className="bg-white/80 rounded-2xl px-4 font-medium"
                disabled={loading}
              >
                Cerca
              </button>

            </div>

          </form>

          <button
            onClick={manualEntry}
            className="w-full flex items-center justify-between mt-4 py-2 text-[#087f75] font-medium"
          >
            <span className="flex items-center gap-2">
              <Keyboard
                size={18}
              />

              Inserisci manualmente
            </span>

            <ChevronRight
              size={18}
            />
          </button>

        </section>

        <section className="exl-glass exl-card p-4 mt-4">

          <div className="flex items-center justify-between gap-4">

            <div>
              <p className="font-semibold">
                Catalogazione rapida
              </p>

              <p className="text-[#8e8e93] text-sm mt-1">
                Mantiene il ripiano selezionato.
              </p>
            </div>

            <button
              onClick={
                toggleQuick
              }
              className={`w-13 h-8 rounded-full p-1 transition ${
                quickMode
                  ? 'bg-[#34c759]'
                  : 'bg-[#d1d1d6]'
              }`}
            >
              <span
                className={`block w-6 h-6 bg-white rounded-full shadow transition ${
                  quickMode
                    ? 'translate-x-5'
                    : ''
                }`}
              />
            </button>

          </div>

        </section>

        {savedMessage && (
          <div className="exl-glass exl-card p-4 mt-4 flex items-center gap-3 text-[#248a3d]">

            <Check
              size={20}
            />

            {savedMessage}

          </div>
        )}

        {error && (
          <div className="exl-glass exl-card p-4 mt-4">

            <p className="text-red-500 text-sm">
              {error}
            </p>

          </div>
        )}

        {loading && (
          <div className="flex justify-center py-10">

            <div className="w-8 h-8 border-[3px] border-black/15 border-t-black rounded-full animate-spin" />

          </div>
        )}

        {results.length > 0 && (
          <section className="mt-7">

            <p className="text-[#8e8e93] text-sm mb-3">
              Scegli l'edizione corretta
            </p>

            <div className="space-y-3">

              {results.map(
                (
                  result,
                  index
                ) => (
                  <button
                    key={`${result.source}-${result.isbn13}-${index}`}
                    onClick={() =>
                      selectCandidate(
                        result
                      )
                    }
                    className="exl-glass exl-card w-full p-4 flex gap-4 text-left exl-press"
                  >

                    <div className="w-16 h-24 rounded-xl bg-[#d1d1d6] overflow-hidden shrink-0">

                      <BookCover
                        title={result.title}
                        authors={result.authors}
                        coverUrl={result.cover}
                      />

                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="font-semibold">
                        {result.title}
                      </p>

                      {result.authors.length > 0 && (
                        <p className="text-[#636366] text-sm mt-1">
                          {result.authors.join(
                            ', '
                          )}
                        </p>
                      )}

                      <p className="text-[#8e8e93] text-xs mt-2">
                        {[
                          result.publisher,
                          result.publicationDate,
                          result.isbn13,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>

                    </div>

                    <ChevronRight
                      size={19}
                      className="text-[#c7c7cc] self-center"
                    />

                  </button>
                )
              )}

            </div>

          </section>
        )}

        {draft && (
          <section className="exl-glass exl-card p-5 mt-7">

            <div className="flex justify-between items-start mb-6">

              <div>
                <p className="text-[#8e8e93] text-sm">
                  Controlla i dati
                </p>

                <h2 className="text-2xl font-bold mt-1">
                  Scheda libro
                </h2>
              </div>

              <button
                onClick={() =>
                  setDraft(null)
                }
                className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center"
              >
                <X size={17} />
              </button>

            </div>

            <div className="w-28 aspect-[2/3] rounded-[15px] overflow-hidden shadow-lg mb-6">

              <BookCover
                title={draft.title}
                authors={draft.authors}
                coverUrl={draft.cover}
              />

            </div>

            <div className="space-y-3">

              <DraftField
                label="Titolo"
                value={draft.title}
                onChange={(value) =>
                  setDraftField(
                    'title',
                    value
                  )
                }
              />

              <DraftField
                label="Sottotitolo"
                value={
                  draft.subtitle
                }
                onChange={(value) =>
                  setDraftField(
                    'subtitle',
                    value
                  )
                }
              />

              <DraftField
                label="Autori"
                value={
                  draft.authors
                }
                onChange={(value) =>
                  setDraftField(
                    'authors',
                    value
                  )
                }
              />

              <DraftField
                label="Editore"
                value={
                  draft.publisher
                }
                onChange={(value) =>
                  setDraftField(
                    'publisher',
                    value
                  )
                }
              />

              <div className="grid grid-cols-2 gap-3">

                <DraftField
                  label="Anno / data"
                  value={
                    draft.publicationDate
                  }
                  onChange={(value) =>
                    setDraftField(
                      'publicationDate',
                      value
                    )
                  }
                />

                <DraftField
                  label="Pagine"
                  value={
                    draft.pages
                  }
                  onChange={(value) =>
                    setDraftField(
                      'pages',
                      value
                    )
                  }
                  type="number"
                />

              </div>

              <DraftField
                label="Edizione"
                value={
                  draft.edition
                }
                onChange={(value) =>
                  setDraftField(
                    'edition',
                    value
                  )
                }
              />

              <DraftField
                label="ISBN-13"
                value={
                  draft.isbn13
                }
                onChange={(value) =>
                  setDraftField(
                    'isbn13',
                    value
                  )
                }
              />

              <DraftField
                label="ISBN-10"
                value={
                  draft.isbn10
                }
                onChange={(value) =>
                  setDraftField(
                    'isbn10',
                    value
                  )
                }
              />

              <DraftField
                label="Lingua"
                value={
                  draft.language
                }
                onChange={(value) =>
                  setDraftField(
                    'language',
                    value
                  )
                }
              />

              <DraftField
                label="URL copertina"
                value={
                  draft.cover
                }
                onChange={(value) =>
                  setDraftField(
                    'cover',
                    value
                  )
                }
              />

              <LocationPicker
                locations={locations}
                value={locationId}
                onChange={changeLocation}
              />

            </div>

            <button
              onClick={saveBook}
              disabled={
                saving ||
                !draft.title.trim()
              }
              className="w-full bg-black text-white rounded-2xl py-4 font-semibold mt-6 disabled:opacity-40 exl-press"
            >
              {saving
                ? 'Salvataggio…'
                : quickMode
                  ? 'Salva e continua'
                  : 'Salva nella biblioteca'}
            </button>

          </section>
        )}

      </div>

    </main>
  )
}

function DraftField({
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
