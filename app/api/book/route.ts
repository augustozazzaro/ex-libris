import { NextRequest, NextResponse } from 'next/server'

type NormalizedBook = {
  source: 'google_books' | 'open_library'
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

  cover: string | null
}

function cleanIsbn(value: string) {
  return value.replace(/[^0-9Xx]/g, '')
}

async function googleSearch(
  query: string
): Promise<NormalizedBook[]> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`,
      { cache: 'no-store' }
    )

    if (!response.ok) return []

    const data = await response.json()

    return (data.items ?? []).map((item: any) => {
      const volume = item.volumeInfo ?? {}

      const identifiers =
        volume.industryIdentifiers ?? []

      const isbn10 =
        identifiers.find(
          (x: any) => x.type === 'ISBN_10'
        )?.identifier ?? null

      const isbn13 =
        identifiers.find(
          (x: any) => x.type === 'ISBN_13'
        )?.identifier ?? null

      const cover =
        volume.imageLinks?.large ??
        volume.imageLinks?.medium ??
        volume.imageLinks?.thumbnail ??
        volume.imageLinks?.smallThumbnail ??
        null

      return {
        source: 'google_books' as const,
        sourceId: item.id,

        isbn10,
        isbn13,

        title: volume.title ?? '',
        subtitle: volume.subtitle ?? '',

        authors: volume.authors ?? [],

        publisher: volume.publisher ?? '',
        publicationDate: volume.publishedDate ?? '',
        edition: '',

        pages: volume.pageCount ?? null,
        language: volume.language ?? '',

        categories: volume.categories ?? [],
        description: volume.description ?? '',

        cover: cover
          ? cover.replace('http://', 'https://')
          : null,
      }
    })
  } catch {
    return []
  }
}

async function openLibraryIsbn(
  isbn: string
): Promise<NormalizedBook[]> {
  try {
    const response = await fetch(
      `https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`,
      { cache: 'no-store' }
    )

    if (!response.ok) return []

    const book = await response.json()

    let authors: string[] = []

    if (book.authors?.length) {
      const names = await Promise.all(
        book.authors.map(async (author: any) => {
          try {
            const r = await fetch(
              `https://openlibrary.org${author.key}.json`,
              { cache: 'no-store' }
            )

            if (!r.ok) return null

            const data = await r.json()

            return data.name ?? null
          } catch {
            return null
          }
        })
      )

      authors = names.filter(Boolean) as string[]
    }

    return [
      {
        source: 'open_library',

        isbn10:
          book.isbn_10?.[0] ??
          (isbn.length === 10 ? isbn : null),

        isbn13:
          book.isbn_13?.[0] ??
          (isbn.length === 13 ? isbn : null),

        title: book.title ?? '',
        subtitle: book.subtitle ?? '',

        authors,

        publisher: book.publishers?.[0] ?? '',
        publicationDate: book.publish_date ?? '',
        edition: '',

        pages: book.number_of_pages ?? null,
        language: '',

        categories: book.subjects ?? [],

        description:
          typeof book.description === 'string'
            ? book.description
            : book.description?.value ?? '',

        cover:
          `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
      },
    ]
  } catch {
    return []
  }
}

async function openLibrarySearch(
  query: string
): Promise<NormalizedBook[]> {
  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20`,
      { cache: 'no-store' }
    )

    if (!response.ok) return []

    const data = await response.json()

    return (data.docs ?? []).map((doc: any) => {
      const isbnList: string[] = doc.isbn ?? []

      const isbn13 =
        isbnList.find(
          (value) => cleanIsbn(value).length === 13
        ) ?? null

      const isbn10 =
        isbnList.find(
          (value) => cleanIsbn(value).length === 10
        ) ?? null

      return {
        source: 'open_library' as const,
        sourceId: doc.key,

        isbn10,
        isbn13,

        title: doc.title ?? '',
        subtitle: doc.subtitle ?? '',

        authors: doc.author_name ?? [],

        publisher: doc.publisher?.[0] ?? '',
        publicationDate:
          doc.first_publish_year
            ? String(doc.first_publish_year)
            : '',

        edition: '',

        pages:
          doc.number_of_pages_median ?? null,

        language: doc.language?.[0] ?? '',

        categories:
          doc.subject?.slice(0, 10) ?? [],

        description: '',

        cover: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
          : isbn13
            ? `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg`
            : null,
      }
    })
  } catch {
    return []
  }
}

function deduplicate(
  books: NormalizedBook[]
) {
  const seen = new Set<string>()

  return books.filter((book) => {
    const key =
      book.isbn13 ||
      book.isbn10 ||
      `${book.title}|${book.authors.join(',')}|${book.publisher}|${book.publicationDate}`

    const normalized =
      key.toLowerCase().trim()

    if (seen.has(normalized)) {
      return false
    }

    seen.add(normalized)
    return true
  })
}

export async function GET(
  request: NextRequest
) {
  const isbnRaw =
    request.nextUrl.searchParams.get('isbn')

  const queryRaw =
    request.nextUrl.searchParams.get('q')

  if (isbnRaw) {
    const isbn = cleanIsbn(isbnRaw)

    if (
      isbn.length !== 10 &&
      isbn.length !== 13
    ) {
      return NextResponse.json(
        {
          found: false,
          items: [],
          error: 'ISBN non valido',
        },
        { status: 400 }
      )
    }

    const googleExact =
      await googleSearch(`isbn:${isbn}`)

    if (googleExact.length) {
      return NextResponse.json({
        found: true,
        mode: 'isbn',
        items: deduplicate(
          googleExact
        ),
      })
    }

    const openExact =
      await openLibraryIsbn(isbn)

    if (openExact.length) {
      return NextResponse.json({
        found: true,
        mode: 'isbn',
        items: openExact,
      })
    }

    const [
      googleBroad,
      openBroad,
    ] = await Promise.all([
      googleSearch(isbn),
      openLibrarySearch(isbn),
    ])

    const combined =
      deduplicate([
        ...googleBroad,
        ...openBroad,
      ])

    return NextResponse.json({
      found: combined.length > 0,
      mode: 'isbn',
      items: combined,
      error:
        combined.length === 0
          ? 'ISBN non trovato nei cataloghi disponibili.'
          : undefined,
    })
  }

  if (queryRaw?.trim()) {
    const query =
      queryRaw.trim()

    const [
      google,
      openLibrary,
    ] = await Promise.all([
      googleSearch(query),
      openLibrarySearch(query),
    ])

    const combined =
      deduplicate([
        ...google,
        ...openLibrary,
      ]).slice(0, 30)

    return NextResponse.json({
      found: combined.length > 0,
      mode: 'search',
      items: combined,
      error:
        combined.length === 0
          ? 'Nessun risultato.'
          : undefined,
    })
  }

  return NextResponse.json(
    {
      found: false,
      items: [],
      error:
        'Inserisci ISBN oppure una ricerca.',
    },
    { status: 400 }
  )
}
