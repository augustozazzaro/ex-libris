import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const isbn = request.nextUrl.searchParams
    .get('isbn')
    ?.replace(/[^0-9Xx]/g, '')

  if (!isbn) {
    return NextResponse.json(
      { error: 'ISBN mancante' },
      { status: 400 }
    )
  }

  try {
    // --------------------------------------------------
    // 1. GOOGLE BOOKS
    // --------------------------------------------------

    const googleResponse = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
      { cache: 'no-store' }
    )

    if (googleResponse.ok) {
      const googleData = await googleResponse.json()

      if (googleData.totalItems > 0 && googleData.items?.length) {
        const volume = googleData.items[0].volumeInfo

        const identifiers = volume.industryIdentifiers ?? []

        const isbn10 =
          identifiers.find(
            (item: { type: string; identifier: string }) =>
              item.type === 'ISBN_10'
          )?.identifier ?? null

        const isbn13 =
          identifiers.find(
            (item: { type: string; identifier: string }) =>
              item.type === 'ISBN_13'
          )?.identifier ?? null

        return NextResponse.json({
          found: true,
          source: 'google_books',

          isbn10,
          isbn13: isbn13 ?? isbn,

          title: volume.title ?? '',
          subtitle: volume.subtitle ?? '',
          authors: volume.authors ?? [],
          publisher: volume.publisher ?? '',
          publicationDate: volume.publishedDate ?? '',
          pages: volume.pageCount ?? null,
          language: volume.language ?? '',
          categories: volume.categories ?? [],
          description: volume.description ?? '',

          cover:
            volume.imageLinks?.thumbnail
              ?.replace('http://', 'https://') ??
            volume.imageLinks?.smallThumbnail
              ?.replace('http://', 'https://') ??
            null,
        })
      }
    }

    // --------------------------------------------------
    // 2. OPEN LIBRARY FALLBACK
    // --------------------------------------------------

    const openLibraryResponse = await fetch(
      `https://openlibrary.org/isbn/${isbn}.json`,
      { cache: 'no-store' }
    )

    if (openLibraryResponse.ok) {
      const book = await openLibraryResponse.json()

      let authors: string[] = []

      if (book.authors?.length) {
        const authorResults = await Promise.all(
          book.authors.map(
            async (author: { key: string }) => {
              try {
                const response = await fetch(
                  `https://openlibrary.org${author.key}.json`,
                  { cache: 'no-store' }
                )

                if (!response.ok) return null

                const data = await response.json()
                return data.name ?? null
              } catch {
                return null
              }
            }
          )
        )

        authors = authorResults.filter(Boolean) as string[]
      }

      return NextResponse.json({
        found: true,
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
        pages: book.number_of_pages ?? null,
        language: '',
        categories: book.subjects ?? [],
        description:
          typeof book.description === 'string'
            ? book.description
            : book.description?.value ?? '',

        cover:
          `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
      })
    }

    return NextResponse.json({
      found: false,
      error: 'Libro non trovato',
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        found: false,
        error: 'Errore durante la ricerca del libro',
      },
      { status: 500 }
    )
  }
}
