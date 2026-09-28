import {
  NextRequest,
  NextResponse,
} from 'next/server'

type NormalizedBook = {
  source:
    | 'google_books'
    | 'open_library'

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

const OPEN_LIBRARY_HEADERS = {
  'User-Agent':
    'ExLibrisFamilyLibrary/1.0',
}

function cleanIsbn(
  value: string
) {
  return value.replace(
    /[^0-9Xx]/g,
    ''
  )
}

function isbnCover(
  isbn: string | null
) {
  if (!isbn) return null

  return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`
}

async function googleSearch(
  query: string,
  maxResults = 20
): Promise<NormalizedBook[]> {
  try {
    const response =
      await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          query
        )}&maxResults=${maxResults}`,
        {
          cache:
            'no-store',
        }
      )

    if (!response.ok) {
      return []
    }

    const data =
      await response.json()

    return (
      data.items ?? []
    ).map(
      (item: any) => {
        const volume =
          item.volumeInfo ??
          {}

        const identifiers =
          volume.industryIdentifiers ??
          []

        const isbn10 =
          identifiers.find(
            (entry: any) =>
              entry.type ===
              'ISBN_10'
          )?.identifier ??
          null

        const isbn13 =
          identifiers.find(
            (entry: any) =>
              entry.type ===
              'ISBN_13'
          )?.identifier ??
          null

        const googleCover =
          volume.imageLinks
            ?.extraLarge ??
          volume.imageLinks
            ?.large ??
          volume.imageLinks
            ?.medium ??
          volume.imageLinks
            ?.thumbnail ??
          volume.imageLinks
            ?.smallThumbnail ??
          null

        return {
          source:
            'google_books' as const,

          sourceId:
            item.id,

          isbn10,
          isbn13,

          title:
            volume.title ??
            '',

          subtitle:
            volume.subtitle ??
            '',

          authors:
            volume.authors ??
            [],

          publisher:
            volume.publisher ??
            '',

          publicationDate:
            volume.publishedDate ??
            '',

          edition: '',

          pages:
            volume.pageCount ??
            null,

          language:
            volume.language ??
            '',

          categories:
            volume.categories ??
            [],

          description:
            volume.description ??
            '',

          cover:
            googleCover
              ? googleCover.replace(
                  'http://',
                  'https://'
                )
              : isbnCover(
                  isbn13 ??
                    isbn10
                ),
        }
      }
    )
  } catch {
    return []
  }
}

async function openLibraryEditionByIsbn(
  isbn: string
): Promise<NormalizedBook[]> {
  try {
    const response =
      await fetch(
        `https://openlibrary.org/isbn/${encodeURIComponent(
          isbn
        )}.json`,
        {
          cache:
            'no-store',

          headers:
            OPEN_LIBRARY_HEADERS,
        }
      )

    if (!response.ok) {
      return []
    }

    const book =
      await response.json()

    let authors:
      string[] = []

    if (
      book.authors?.length
    ) {
      const authorResults =
        await Promise.all(
          book.authors.map(
            async (
              author: {
                key: string
              }
            ) => {
              try {
                const result =
                  await fetch(
                    `https://openlibrary.org${author.key}.json`,
                    {
                      cache:
                        'no-store',

                      headers:
                        OPEN_LIBRARY_HEADERS,
                    }
                  )

                if (
                  !result.ok
                ) {
                  return null
                }

                const data =
                  await result.json()

                return (
                  data.name ??
                  null
                )
              } catch {
                return null
              }
            }
          )
        )

      authors =
        authorResults.filter(
          Boolean
        ) as string[]
    }

    const isbn13 =
      book.isbn_13?.[0] ??
      (isbn.length === 13
        ? isbn
        : null)

    const isbn10 =
      book.isbn_10?.[0] ??
      (isbn.length === 10
        ? isbn
        : null)

    let description = ''

    if (
      typeof book.description ===
      'string'
    ) {
      description =
        book.description
    } else if (
      book.description?.value
    ) {
      description =
        book.description.value
    }

    return [
      {
        source:
          'open_library',

        sourceId:
          book.key,

        isbn10,
        isbn13,

        title:
          book.title ??
          '',

        subtitle:
          book.subtitle ??
          '',

        authors,

        publisher:
          book.publishers?.[0] ??
          '',

        publicationDate:
          book.publish_date ??
          '',

        edition:
          book.edition_name ??
          '',

        pages:
          book.number_of_pages ??
          null,

        language: '',

        categories:
          book.subjects ??
          [],

        description,

        cover:
          isbnCover(
            isbn13 ??
              isbn10 ??
              isbn
          ),
      },
    ]
  } catch {
    return []
  }
}

async function openLibrarySearch(
  query: string,
  limit = 25
): Promise<NormalizedBook[]> {
  try {
    const fields = [
      'key',
      'title',
      'subtitle',
      'author_name',
      'publisher',
      'publish_year',
      'first_publish_year',
      'isbn',
      'cover_i',
      'language',
      'number_of_pages_median',
      'edition_key',
      'edition_count',
    ].join(',')

    const response =
      await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(
          query
        )}&fields=${encodeURIComponent(
          fields
        )}&limit=${limit}`,
        {
          cache:
            'no-store',

          headers:
            OPEN_LIBRARY_HEADERS,
        }
      )

    if (!response.ok) {
      return []
    }

    const data =
      await response.json()

    return (
      data.docs ?? []
    ).map(
      (doc: any) => {
        const isbnList:
          string[] =
          doc.isbn ?? []

        const isbn13 =
          isbnList.find(
            (value) =>
              cleanIsbn(
                value
              ).length ===
              13
          ) ?? null

        const isbn10 =
          isbnList.find(
            (value) =>
              cleanIsbn(
                value
              ).length ===
              10
          ) ?? null

        const publicationDate =
          doc.publish_year?.[0]
            ? String(
                doc.publish_year[0]
              )
            : doc.first_publish_year
              ? String(
                  doc.first_publish_year
                )
              : ''

        return {
          source:
            'open_library' as const,

          sourceId:
            doc.key,

          isbn10,
          isbn13,

          title:
            doc.title ??
            '',

          subtitle:
            doc.subtitle ??
            '',

          authors:
            doc.author_name ??
            [],

          publisher:
            doc.publisher?.[0] ??
            '',

          publicationDate,

          edition:
            doc.edition_count
              ? `${doc.edition_count} edizioni catalogate`
              : '',

          pages:
            doc.number_of_pages_median ??
            null,

          language:
            doc.language?.[0] ??
            '',

          categories: [],

          description: '',

          cover:
            doc.cover_i
              ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`
              : isbnCover(
                  isbn13 ??
                    isbn10
                ),
        }
      }
    )
  } catch {
    return []
  }
}

function scoreForIsbn(
  book: NormalizedBook,
  isbn: string
) {
  let score = 0

  if (
    book.isbn13 === isbn ||
    book.isbn10 === isbn
  ) {
    score += 100
  }

  if (book.publisher) {
    score += 8
  }

  if (
    book.publicationDate
  ) {
    score += 6
  }

  if (
    book.authors.length
  ) {
    score += 6
  }

  if (book.cover) {
    score += 4
  }

  if (book.pages) {
    score += 2
  }

  return score
}

function deduplicate(
  books: NormalizedBook[]
) {
  const seen =
    new Set<string>()

  return books.filter(
    (book) => {
      const key =
        book.isbn13 ||
        book.isbn10 ||
        [
          book.title,
          book.authors.join(
            ','
          ),
          book.publisher,
          book.publicationDate,
        ]
          .join('|')
          .toLowerCase()

      if (
        seen.has(key)
      ) {
        return false
      }

      seen.add(key)
      return true
    }
  )
}

export async function GET(
  request: NextRequest
) {
  const isbnParam =
    request.nextUrl.searchParams.get(
      'isbn'
    )

  const queryParam =
    request.nextUrl.searchParams.get(
      'q'
    )

  if (isbnParam) {
    const isbn =
      cleanIsbn(
        isbnParam
      )

    if (
      isbn.length !== 10 &&
      isbn.length !== 13
    ) {
      return NextResponse.json(
        {
          found: false,
          items: [],
          error:
            'ISBN non valido.',
        },
        {
          status: 400,
        }
      )
    }

    const [
      googleExact,
      openEdition,
      openSearch,
      googleBroad,
    ] = await Promise.all([
      googleSearch(
        `isbn:${isbn}`,
        10
      ),

      openLibraryEditionByIsbn(
        isbn
      ),

      openLibrarySearch(
        `isbn:${isbn}`,
        15
      ),

      googleSearch(
        isbn,
        10
      ),
    ])

    const items =
      deduplicate([
        ...googleExact,
        ...openEdition,
        ...openSearch,
        ...googleBroad,
      ])
        .sort(
          (a, b) =>
            scoreForIsbn(
              b,
              isbn
            ) -
            scoreForIsbn(
              a,
              isbn
            )
        )
        .slice(
          0,
          20
        )

    return NextResponse.json(
      {
        found:
          items.length > 0,

        mode: 'isbn',

        items,

        exact:
          items.some(
            (book) =>
              book.isbn13 ===
                isbn ||
              book.isbn10 ===
                isbn
          ),

        error:
          items.length === 0
            ? 'ISBN non trovato nei cataloghi disponibili.'
            : undefined,
      }
    )
  }

  if (
    queryParam?.trim()
  ) {
    const query =
      queryParam.trim()

    const [
      google,
      openLibrary,
    ] = await Promise.all([
      googleSearch(
        query,
        25
      ),

      openLibrarySearch(
        query,
        30
      ),
    ])

    const items =
      deduplicate([
        ...google,
        ...openLibrary,
      ]).slice(
        0,
        40
      )

    return NextResponse.json(
      {
        found:
          items.length > 0,

        mode:
          'search',

        items,

        error:
          items.length === 0
            ? 'Nessun risultato.'
            : undefined,
      }
    )
  }

  return NextResponse.json(
    {
      found: false,
      items: [],
      error:
        'Inserisci un ISBN o una ricerca.',
    },
    {
      status: 400,
    }
  )
}
