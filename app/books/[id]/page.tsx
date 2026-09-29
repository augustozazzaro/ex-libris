'use client'

import ExLibrisLoader from '@/components/ExLibrisLoader'

import {
  ChangeEvent,
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
  haptic,
} from '@/utils/haptics'
import {
  readCache,
  writeCache,
  removeCaches,
} from '@/utils/exlibris-cache'
import LocationPicker from '@/components/LocationPicker'
import BookCover from '@/components/BookCover'
import BookDetailHero from '@/components/BookDetailHero'
import BookSynopsis from '@/components/BookSynopsis'
import BookMetadataSections from '@/components/BookMetadataSections'
import BookContributors from '@/components/BookContributors'
import ReadingStateCard from '@/components/ReadingStateCard'
import BookCitations from '@/components/BookCitations'
import BookBookmarkCard from '@/components/BookBookmarkCard'
import ReadingPresence from '@/components/ReadingPresence'
import BookCopiesPanel from '@/components/BookCopiesPanel'

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

  series: string | null
  translators: string[] | null
  editors: string[] | null
  illustrators: string[] | null
  introductions: string[] | null
  format: string | null
  bibliographic_notes: string | null

  cover_url: string | null
  custom_cover_url: string | null

  favorite: boolean
  status: string
  notes: string | null

  location_id: string | null

  edition_key: string | null
  copy_number: number | null
}

type BookDetailSnapshot = {
  book: Book
  locations: LocationItem[]
  personalFavorite: boolean
  copyCount: number
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

  const [personalFavorite, setPersonalFavorite] =
    useState(false)

  const [copyCount, setCopyCount] =
    useState(1)

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


  const [language, setLanguage] =
    useState('')

  const [series, setSeries] =
    useState('')

  const [format, setFormat] =
    useState('')

  const [description, setDescription] =
    useState('')

  const [translators, setTranslators] =
    useState('')

  const [editors, setEditors] =
    useState('')

  const [illustrators, setIllustrators] =
    useState('')

  const [introductions, setIntroductions] =
    useState('')

  const [bibliographicNotes, setBibliographicNotes] =
    useState('')


  const [customCover, setCustomCover] =
    useState('')

  const [coverUrlInput, setCoverUrlInput] =
    useState('')

  const [uploadingCover, setUploadingCover] =
    useState(false)

  function applyBookSnapshot(
    snapshot: BookDetailSnapshot
  ) {
    const data =
      snapshot.book

    setBook(data)

    setPersonalFavorite(
      snapshot.personalFavorite
    )

    setCopyCount(
      snapshot.copyCount
    )

    setLocations(
      snapshot.locations
    )

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

    setLanguage(
      data.language ?? ''
    )

    setSeries(
      data.series ?? ''
    )

    setFormat(
      data.format ?? ''
    )

    setDescription(
      data.description ?? ''
    )

    setTranslators(
      data.translators?.join(', ') ??
        ''
    )

    setEditors(
      data.editors?.join(', ') ??
        ''
    )

    setIllustrators(
      data.illustrators?.join(', ') ??
        ''
    )

    setIntroductions(
      data.introductions?.join(', ') ??
        ''
    )

    setBibliographicNotes(
      data.bibliographic_notes ??
        ''
    )

    setCustomCover(
      data.custom_cover_url ??
        ''
    )

    setCoverUrlInput(
      data.custom_cover_url ??
        ''
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
  }

  async function loadBook() {
    setError('')

    const bookId =
      String(params.id)

    const {
      data: { session },
    } =
      await supabase.auth.getSession()

    const user =
      session?.user

    if (!user) {
      setError(
        'Sessione non disponibile.'
      )
      setLoading(false)
      return
    }

    const cacheKey =
      `book:${user.id}:${bookId}`

    const cached =
      readCache<BookDetailSnapshot>(
        cacheKey
      )

    if (cached) {
      applyBookSnapshot(
        cached
      )

      setLoading(false)
    } else {
      setLoading(true)
    }

    const {
      data,
      error,
    } =
      await supabase
        .from('books')
        .select('*')
        .eq(
          'id',
          bookId
        )
        .single()

    if (
      error ||
      !data
    ) {
      if (!cached) {
        setError(
          'Libro non trovato.'
        )
      }

      setLoading(false)
      return
    }

    const [
      personalResult,
      locationsResult,
      copiesResult,
    ] =
      await Promise.all([
        supabase
          .from(
            'user_book_state'
          )
          .select('favorite')
          .eq(
            'user_id',
            user.id
          )
          .eq(
            'book_id',
            data.id
          )
          .maybeSingle(),

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
            data.family_id
          ),

        supabase
          .from('books')
          .select(
            'id',
            {
              count: 'exact',
              head: true,
            }
          )
          .eq(
            'family_id',
            data.family_id
          )
          .eq(
            'edition_key',
            data.edition_key ??
              data.id
          ),
      ])

    const snapshot:
      BookDetailSnapshot = {
        book:
          data as Book,

        locations:
          (
            locationsResult.data ??
            []
          ) as LocationItem[],

        personalFavorite:
          personalResult.data
            ?.favorite ??
          false,

        copyCount:
          copiesResult.count ??
          1,
      }

    applyBookSnapshot(
      snapshot
    )

    writeCache(
      cacheKey,
      snapshot
    )

    setLoading(false)
  }

  useEffect(() => {
    loadBook()
  }, [params.id])

  async function toggleFavorite() {
    if (!book) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const newValue =
      !personalFavorite

    const { error } = await supabase
      .from('user_book_state')
      .upsert(
        {
          user_id: user.id,
          book_id: book.id,
          favorite: newValue,
        },
        {
          onConflict:
            'user_id,book_id',
        }
      )

    if (!error) {
      setPersonalFavorite(
        newValue
      )

      haptic(
        newValue
          ? 'success'
          : 'light'
      )

      removeCaches([
        `home:${user.id}`,
        `profile:${user.id}`,
        `book:${user.id}:${book.id}`,
      ])
    } else {
      haptic('error')
    }
  }

  async function uploadBookCover(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0]

    if (!file || !book) return

    setUploadingCover(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Utente non autenticato.')
      setUploadingCover(false)
      return
    }

    if (
      !file.type.startsWith('image/')
    ) {
      setError(
        'Il file selezionato non è un’immagine.'
      )
      setUploadingCover(false)
      return
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      setError(
        'L’immagine supera il limite di 10 MB.'
      )
      setUploadingCover(false)
      return
    }

    const extension =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase()
        .replace(
          /[^a-z0-9]/g,
          ''
        ) ||
      'jpg'

    const path =
      `${user.id}/${book.id}/${Date.now()}.${extension}`

    const { error: uploadError } =
      await supabase.storage
        .from('book-covers')
        .upload(
          path,
          file,
          {
            upsert: true,
            cacheControl: '3600',
          }
        )

    if (uploadError) {
      setError(
        uploadError.message
      )
      setUploadingCover(false)
      return
    }

    const { data } =
      supabase.storage
        .from('book-covers')
        .getPublicUrl(path)

    const url =
      `${data.publicUrl}?v=${Date.now()}`

    const { error: updateError } =
      await supabase
        .from('books')
        .update({
          custom_cover_url:
            url,
        })
        .eq('id', book.id)

    if (updateError) {
      setError(
        updateError.message
      )
    } else {
      setCustomCover(url)
      setCoverUrlInput(url)

      setBook({
        ...book,
        custom_cover_url:
          url,
      })
    }

    event.target.value = ''
    setUploadingCover(false)
  }

  async function saveCoverUrl() {
    if (!book) return

    const url =
      coverUrlInput.trim()

    if (!url) return

    let parsedUrl: URL

    try {
      parsedUrl =
        new URL(url)
    } catch {
      setError(
        'Inserisci un URL valido.'
      )
      return
    }

    if (
      parsedUrl.protocol !== 'https:' &&
      parsedUrl.protocol !== 'http:'
    ) {
      setError(
        'L’URL deve iniziare con http:// o https://.'
      )
      return
    }

    setUploadingCover(true)
    setError('')

    const imageWorks =
      await new Promise<boolean>(
        resolve => {
          const image =
            new Image()

          const timeout =
            window.setTimeout(
              () => {
                image.src = ''
                resolve(false)
              },
              7000
            )

          image.onload = () => {
            window.clearTimeout(
              timeout
            )
            resolve(true)
          }

          image.onerror = () => {
            window.clearTimeout(
              timeout
            )
            resolve(false)
          }

          image.src = url
        }
      )

    if (!imageWorks) {
      setError(
        'Questo indirizzo non sembra essere un’immagine utilizzabile. Incolla il link diretto al file della copertina.'
      )
      setUploadingCover(false)
      return
    }

    const { error } =
      await supabase
        .from('books')
        .update({
          custom_cover_url:
            url,
        })
        .eq('id', book.id)

    if (error) {
      setError(error.message)
    } else {
      setCustomCover(url)

      setBook({
        ...book,
        custom_cover_url:
          url,
      })
    }

    setUploadingCover(false)
  }

  async function restoreOriginalCover() {
    if (!book) return

    setUploadingCover(true)
    setError('')

    const { error } =
      await supabase
        .from('books')
        .update({
          custom_cover_url:
            null,
        })
        .eq('id', book.id)

    if (error) {
      setError(error.message)
    } else {
      setCustomCover('')
      setCoverUrlInput('')

      setBook({
        ...book,
        custom_cover_url:
          null,
      })
    }

    setUploadingCover(false)
  }

  async function saveChanges() {
    if (!book) return

    setSaving(true)
    setError('')

    const peopleArray = (
      value: string
    ) =>
      value
        .split(',')
        .map(
          item =>
            item.trim()
        )
        .filter(Boolean)

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

          language:
            language.trim() ||
            null,

          series:
            series.trim() ||
            null,

          format:
            format.trim() ||
            null,

          description:
            description.trim() ||
            null,

          translators:
            peopleArray(
              translators
            ),

          editors:
            peopleArray(
              editors
            ),

          illustrators:
            peopleArray(
              illustrators
            ),

          introductions:
            peopleArray(
              introductions
            ),

          bibliographic_notes:
            bibliographicNotes.trim() ||
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

      haptic('error')
      setSaving(false)
      return
    }

    haptic('success')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      removeCaches([
        `home:${user.id}`,
        `catalog:${user.id}`,
        `profile:${user.id}`,
        `shuffle:${user.id}`,
        `book:${user.id}:${book.id}`,
      ])
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
      const {
        data: { user },
      } =
        await supabase.auth.getUser()

      if (user) {
        removeCaches([
          `home:${user.id}`,
          `catalog:${user.id}`,
          `profile:${user.id}`,
          `shuffle:${user.id}`,
        ])
      }

      router.push('/')
      router.refresh()
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">

        <ExLibrisLoader />

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
                  personalFavorite
                    ? 'currentColor'
                    : 'none'
                }
                className={
                  personalFavorite
                    ? 'exl-pop'
                    : ''
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

            <BookDetailHero
              title={book.title}
              subtitle={book.subtitle}
              authors={book.authors}
              publisher={book.publisher}
              publicationYear={
                book.publication_year
              }
              pages={book.pages}
              copyCount={copyCount}
              status={book.status}
              coverUrl={cover}
              locationPath={
                locationPath ||
                null
              }
            />

            {book.edition_key && (
              <ReadingPresence
                editionKey={
                  book.edition_key
                }
                bookId={
                  book.id
                }
              />
            )}

            {copyCount > 1 &&
              book.edition_key && (
                <BookCopiesPanel
                  familyId={
                    book.family_id
                  }
                  editionKey={
                    book.edition_key
                  }
                  currentBookId={
                    book.id
                  }
                  locations={
                    locations
                  }
                  onChanged={
                    loadBook
                  }
                />
              )}

            {book.description ? (
              <BookSynopsis
                text={book.description}
              />
            ) : (
              <section className="mt-5 px-1">

                <p className="text-[#8e8e93] text-xs">
                  Il libro
                </p>

                <div className="flex items-center justify-between gap-4 mt-1">

                  <h2 className="font-bold text-[19px] tracking-[-0.02em]">
                    Trama
                  </h2>

                  <span className="text-[#8e8e93] text-[13px]">
                    Non disponibile
                  </span>

                </div>

              </section>
            )}

            <ReadingStateCard
              bookId={book.id}
            />

            <BookBookmarkCard
              bookId={book.id}
              pages={book.pages}
            />

            {book.edition_key && (
              <BookCitations
                familyId={
                  book.family_id
                }
                editionKey={
                  book.edition_key
                }
                pages={
                  book.pages
                }
              />
            )}

            <BookContributors
              translators={book.translators}
              editors={book.editors}
              illustrators={book.illustrators}
              introductions={book.introductions}
            />

            <BookMetadataSections
              categories={book.categories}
              language={book.language}
              publisher={book.publisher}
              series={book.series}
              format={book.format}
              isbn10={book.isbn_10}
              isbn13={book.isbn_13}
              bibliographicNotes={
                book.bibliographic_notes
              }
              notes={book.notes}
            />


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

            <div className="space-y-6">

              <EditSection
                eyebrow="Immagine"
                title="Copertina"
              >

                <div className="flex items-start gap-4">

                  <div className="w-[92px] aspect-[2/3] rounded-[14px] overflow-hidden shadow-md shrink-0">

                    <BookCover
                      title={title || book.title}
                      authors={
                        authors
                          ? authors
                              .split(',')
                              .map(
                                item =>
                                  item.trim()
                              )
                              .filter(Boolean)
                          : book.authors
                      }
                      coverUrl={
                        customCover ||
                        book.cover_url
                      }
                    />

                  </div>

                  <div className="flex-1 min-w-0">

                    <p className="font-semibold text-[15px]">
                      {uploadingCover
                        ? 'Caricamento…'
                        : customCover
                          ? 'Copertina personalizzata'
                          : book.cover_url
                            ? 'Copertina originale'
                            : 'Nessuna copertina'}
                    </p>

                    <p className="text-[#8e8e93] text-xs leading-relaxed mt-1">
                      Puoi fotografare la tua copia o scegliere un'immagine dalla libreria.
                    </p>

                  </div>

                </div>

                <div className="grid grid-cols-2 gap-2">

                  <label className="bg-black text-white rounded-2xl py-3.5 font-semibold text-sm text-center cursor-pointer exl-press">

                    Scatta foto

                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={uploadBookCover}
                      disabled={uploadingCover}
                      className="hidden"
                    />

                  </label>

                  <label className="bg-white/70 dark:bg-white/10 rounded-2xl py-3.5 font-semibold text-sm text-center cursor-pointer exl-press">

                    Scegli foto

                    <input
                      type="file"
                      accept="image/*"
                      onChange={uploadBookCover}
                      disabled={uploadingCover}
                      className="hidden"
                    />

                  </label>

                </div>

                <div>

                  <label className="text-xs text-[#8e8e93] ml-2">
                    Oppure URL immagine
                  </label>

                  <div className="flex gap-2 mt-1">

                    <input
                      value={coverUrlInput}
                      onChange={(e) =>
                        setCoverUrlInput(
                          e.target.value
                        )
                      }
                      placeholder="https://..."
                      className="min-w-0 flex-1 bg-white/70 dark:bg-white/[0.08] rounded-2xl px-4 py-3.5 outline-none"
                    />

                    <button
                      type="button"
                      onClick={saveCoverUrl}
                      disabled={
                        uploadingCover ||
                        !coverUrlInput.trim()
                      }
                      className="px-4 rounded-2xl bg-black/5 dark:bg-white/10 font-semibold text-sm disabled:opacity-40 exl-press"
                    >
                      Usa
                    </button>

                  </div>

                </div>

                {error && (
                  <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-red-600 dark:text-red-400 text-[13px] leading-snug">
                    {error}
                  </div>
                )}

                {customCover && (
                  <button
                    type="button"
                    onClick={restoreOriginalCover}
                    disabled={uploadingCover}
                    className="w-full py-2 text-[#5E7FA3] font-medium text-sm exl-press disabled:opacity-40"
                  >
                    Ripristina copertina originale
                  </button>
                )}

              </EditSection>

              <EditSection
                eyebrow="Libro"
                title="Essenziali"
              >

                <Field
                  label="Titolo"
                  value={title}
                  onChange={setTitle}
                />

                <Field
                  label="Sottotitolo"
                  value={subtitle}
                  onChange={setSubtitle}
                />

                <Field
                  label="Autori"
                  value={authors}
                  onChange={setAuthors}
                  hint="Separa più autori con una virgola"
                />

              </EditSection>

              <EditSection
                eyebrow="Pubblicazione"
                title="Edizione"
              >

                <Field
                  label="Editore"
                  value={publisher}
                  onChange={setPublisher}
                />

                <Field
                  label="Collana"
                  value={series}
                  onChange={setSeries}
                />

                <div className="grid grid-cols-2 gap-3">

                  <Field
                    label="Anno"
                    value={publicationYear}
                    onChange={setPublicationYear}
                    type="number"
                  />

                  <Field
                    label="Pagine"
                    value={pages}
                    onChange={setPages}
                    type="number"
                  />

                </div>

                <div className="grid grid-cols-2 gap-3">

                  <Field
                    label="Lingua"
                    value={language}
                    onChange={setLanguage}
                  />

                  <Field
                    label="Formato"
                    value={format}
                    onChange={setFormat}
                  />

                </div>

              </EditSection>

              <EditSection
                eyebrow="Questa edizione"
                title="Contributori"
                optional
              >

                <Field
                  label="Traduttori"
                  value={translators}
                  onChange={setTranslators}
                  hint="Separa più persone con una virgola"
                />

                <Field
                  label="Curatori"
                  value={editors}
                  onChange={setEditors}
                />

                <Field
                  label="Illustratori"
                  value={illustrators}
                  onChange={setIllustrators}
                />

                <Field
                  label="Introduzioni e prefazioni"
                  value={introductions}
                  onChange={setIntroductions}
                />

              </EditSection>

              <EditSection
                eyebrow="Contenuto"
                title="Trama e note"
              >

                <TextAreaField
                  label="Trama"
                  value={description}
                  onChange={setDescription}
                  rows={7}
                  placeholder="Trama del libro"
                />

                <TextAreaField
                  label="Note personali"
                  value={notes}
                  onChange={setNotes}
                  rows={4}
                  placeholder="Le tue note su questa copia"
                />

                <TextAreaField
                  label="Note sull'edizione"
                  value={bibliographicNotes}
                  onChange={setBibliographicNotes}
                  rows={3}
                  placeholder="Informazioni bibliografiche sull'edizione"
                />

              </EditSection>

              <EditSection
                eyebrow="Biblioteca"
                title="Collocazione"
              >

                <LocationPicker
                  locations={locations}
                  value={locationId}
                  onChange={setLocationId}
                />

              </EditSection>

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

function Field({
  label,
  value,
  onChange,
  type = 'text',
  hint,
}: {
  label: string
  value: string
  onChange: (
    value: string
  ) => void
  type?: string
  hint?: string
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
        className="w-full bg-white/70 dark:bg-white/[0.08] rounded-2xl px-4 py-3.5 mt-1 outline-none"
      />

      {hint && (
        <p className="text-[#8e8e93] text-[11px] ml-2 mt-1">
          {hint}
        </p>
      )}

    </div>
  )
}

function EditSection({
  eyebrow,
  title,
  optional = false,
  children,
}: {
  eyebrow: string
  title: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <section>

      <div className="flex items-end justify-between gap-3 mb-3 px-1">

        <div>
          <p className="text-[#8e8e93] text-[11px] uppercase tracking-[0.08em]">
            {eyebrow}
          </p>

          <h2 className="font-bold text-[19px] tracking-[-0.02em] mt-0.5">
            {title}
          </h2>
        </div>

        {optional && (
          <span className="text-[#8e8e93] text-xs">
            Facoltativo
          </span>
        )}

      </div>

      <div className="bg-white/45 dark:bg-white/[0.06] rounded-[22px] p-3 space-y-3 border border-white/40 dark:border-white/[0.06]">
        {children}
      </div>

    </section>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string
  value: string
  onChange: (
    value: string
  ) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <div>

      <label className="text-xs text-[#8e8e93] ml-2">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        rows={rows}
        placeholder={placeholder}
        className="w-full bg-white/70 dark:bg-white/[0.08] rounded-2xl px-4 py-3.5 mt-1 outline-none resize-none"
      />

    </div>
  )
}
