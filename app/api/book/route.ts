import { NextRequest, NextResponse } from 'next/server'

type Candidate = {
  source: string

  title?: string
  subtitle?: string
  authors?: string[]
  publisher?: string
  publishedDate?: string

  description?: string

  pages?: number

  coverUrl?: string

  categories?: string[]

  isbn10?: string
  isbn13?: string
}

function cleanISBN(value: string) {
  return value
    .toUpperCase()
    .replace(/[^0-9X]/g, '')
}


function cleanSbnText(
  value: unknown
): string {
  if (typeof value !== 'string') {
    return ''
  }

  let text = value

  if (
    text.includes('Ã') ||
    text.includes('Â')
  ) {
    try {
      text = Buffer
        .from(text, 'latin1')
        .toString('utf8')
    } catch {
      // Mantiene il testo originale.
    }
  }

  return text
    .normalize('NFC')
    .replace(/[\u0088\u0089]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isbn10To13(isbn10: string) {
  if (!/^\d{9}[\dX]$/.test(isbn10)) {
    return null
  }

  const base = `978${isbn10.slice(0, 9)}`

  let sum = 0

  for (let i = 0; i < 12; i++) {
    sum +=
      Number(base[i]) *
      (i % 2 === 0 ? 1 : 3)
  }

  const check =
    (10 - (sum % 10)) % 10

  return `${base}${check}`
}

function isbn13To10(isbn13: string) {
  if (
    !/^978\d{10}$/.test(isbn13)
  ) {
    return null
  }

  const base =
    isbn13.slice(3, 12)

  let sum = 0

  for (let i = 0; i < 9; i++) {
    sum +=
      Number(base[i]) *
      (10 - i)
  }

  const remainder =
    11 - (sum % 11)

  const check =
    remainder === 10
      ? 'X'
      : remainder === 11
        ? '0'
        : String(remainder)

  return `${base}${check}`
}

function getISBNVariants(
  input: string
) {
  const cleaned =
    cleanISBN(input)

  let isbn10: string | null =
    null

  let isbn13: string | null =
    null

  if (cleaned.length === 13) {
    isbn13 = cleaned
    isbn10 =
      isbn13To10(cleaned)
  }

  if (cleaned.length === 10) {
    isbn10 = cleaned
    isbn13 =
      isbn10To13(cleaned)
  }

  return {
    original: cleaned,
    isbn10,
    isbn13,
  }
}

function textFromDescription(
  value: unknown
): string | undefined {
  if (
    typeof value === 'string'
  ) {
    return value
  }

  if (
    value &&
    typeof value === 'object' &&
    'value' in value &&
    typeof (
      value as {
        value?: unknown
      }
    ).value === 'string'
  ) {
    return (
      value as {
        value: string
      }
    ).value
  }

  return undefined
}

function stripHtml(
  value?: string
) {
  if (!value) return undefined

  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function secureImage(
  value?: string
) {
  if (!value) return undefined

  return value
    .replace(
      /^http:\/\//,
      'https://'
    )
    .replace(
      '&edge=curl',
      ''
    )
}

async function safeFetch(
  url: string
) {
  try {
    const response =
      await fetch(url, {
        cache: 'no-store',

        headers: {
          'User-Agent':
            'ExLibris-Family-Library/1.0',
        },

        signal:
          AbortSignal.timeout(5500),
      })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}
async function sbn(
  isbn10: string | null,
  isbn13: string | null
): Promise<Candidate[]> {
  const isbn =
    isbn13 ?? isbn10

  if (!isbn) return []

  try {
    const search =
      await safeFetchSbn(
        `https://opac.sbn.it/opacmobilegw/search.json?isbn=${encodeURIComponent(isbn)}`
      )

    const records =
      search?.briefRecords ??
      search?.records ??
      []

    if (
      !Array.isArray(records) ||
      records.length === 0
    ) {
      return []
    }

    const results: Candidate[] = []

    for (const record of records.slice(0, 5)) {
      const bid =
        record.codiceIdentificativo

      const full =
        bid
          ? await safeFetchSbn(
              `https://opac.sbn.it/opacmobilegw/full.json?bid=${encodeURIComponent(bid)}`
            )
          : null

      const source =
        full ?? record

      const rawTitle =
        record.titolo ??
        source.titolo ??
        ''

      const title =
        cleanSbnText(rawTitle)
          .split(' / ')[0]
          .trim()

      const mainAuthor =
        typeof record.autorePrincipale === 'string'
          ? record.autorePrincipale
              .normalize('NFC')
              .trim()
          : cleanSbnText(
              source.autorePrincipale ??
              ''
            )

      const authors =
        mainAuthor
          ? [mainAuthor]
          : Array.isArray(source.nomi)
            ? source.nomi.slice(0, 5)
            : []

      const publication =
        cleanSbnText(
          record.pubblicazione ??
          source.pubblicazione ??
          ''
        )

      let publisher: string | undefined
      let publishedDate: string | undefined

      if (
        typeof publication === 'string' &&
        publication
      ) {
        const yearMatch =
          publication.match(
            /\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/
          )

        if (yearMatch) {
          publishedDate =
            yearMatch[0]
        }

        const colonIndex =
          publication.indexOf(':')

        if (colonIndex >= 0) {
          publisher =
            publication
              .slice(colonIndex + 1)
              .split(',')[0]
              ?.trim()
        }
      }

      const physical =
        cleanSbnText(
          source.descrizioneFisica ??
          ''
        )

      let pages: number | undefined

      if (
        typeof physical === 'string'
      ) {
        const pageMatch =
          physical.match(
            /(\d+)\s*p\./i
          )

        if (pageMatch) {
          pages =
            Number(pageMatch[1])
        }
      }

      const descriptionParts = [
        ...(Array.isArray(source.note)
          ? source.note.map(cleanSbnText)
          : []),

        ...(Array.isArray(source.noteGenerali)
          ? source.noteGenerali.map(cleanSbnText)
          : []),

        source.collezione
          ? `Collana: ${cleanSbnText(source.collezione)}`
          : null,
      ].filter(
        (value): value is string =>
          typeof value === 'string' &&
          value.trim().length > 0
      )

      const categories = [
        ...(Array.isArray(source.soggetti)
          ? source.soggetti.map(cleanSbnText)
          : []),

        ...(Array.isArray(source.classificazioneDewey)
          ? source.classificazioneDewey.map(cleanSbnText)
          : source.classificazioneDewey
            ? [cleanSbnText(source.classificazioneDewey)]
            : []),
      ]
        .filter(Boolean)
        .slice(0, 20)

      results.push({
        source: 'SBN',
        title,
        authors,
        publisher,
        publishedDate,

        coverUrl:
          secureImage(
            record.copertina ??
            source.copertina ??
            undefined
          ),

        description:
          descriptionParts.length
            ? descriptionParts.join('\n')
            : undefined,
        pages,
        categories,
        isbn10:
          isbn10 ?? undefined,
        isbn13:
          isbn13 ?? undefined,
      })
    }

    return results.filter(
      (result) =>
        Boolean(result.title)
    )
  } catch {
    return []
  }
}

async function safeFetchSbn(
  url: string
) {
  try {
    const response =
      await fetch(url, {
        cache: 'no-store',

        headers: {
          'User-Agent':
            'ExLibris-Family-Library/1.0',
        },

        signal:
          AbortSignal.timeout(5500),
      })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

async function googleBooks(
  isbn10: string | null,
  isbn13: string | null
): Promise<Candidate[]> {
  const variants = [
    isbn13,
    isbn10,
  ].filter(Boolean) as string[]

  const results: Candidate[] = []

  for (const isbn of variants) {
    const key =
      process.env
        .GOOGLE_BOOKS_API_KEY

    const keyPart =
      key
        ? `&key=${encodeURIComponent(key)}`
        : ''

    const url =
      `https://www.googleapis.com/books/v1/volumes` +
      `?q=${encodeURIComponent(`isbn:${isbn}`)}` +
      `&maxResults=10` +
      `&projection=full` +
      `&printType=books` +
      keyPart

    const data =
      await safeFetch(url)

    if (!data?.items) {
      continue
    }

    for (
      const item of data.items
    ) {
      const info =
        item.volumeInfo ?? {}

      const identifiers =
        info.industryIdentifiers ??
        []

      const found13 =
        identifiers.find(
          (x: any) =>
            x.type === 'ISBN_13'
        )?.identifier

      const found10 =
        identifiers.find(
          (x: any) =>
            x.type === 'ISBN_10'
        )?.identifier

      const exact =
        [found13, found10]
          .filter(Boolean)
          .some(
            (candidate) =>
              cleanISBN(candidate) ===
                isbn13 ||
              cleanISBN(candidate) ===
                isbn10
          )

      if (!exact) {
        continue
      }

      results.push({
        source:
          'Google Books',

        title:
          info.title,

        subtitle:
          info.subtitle,

        authors:
          info.authors,

        publisher:
          info.publisher,

        publishedDate:
          info.publishedDate,

        description:
          stripHtml(
            info.description
          ),

        pages:
          info.pageCount,

        coverUrl:
          secureImage(
            info.imageLinks?.extraLarge ||
              info.imageLinks?.large ||
              info.imageLinks?.medium ||
              info.imageLinks?.thumbnail ||
              info.imageLinks?.smallThumbnail
          ),

        categories:
          info.categories,

        isbn10:
          found10
            ? cleanISBN(found10)
            : undefined,

        isbn13:
          found13
            ? cleanISBN(found13)
            : undefined,
      })
    }
  }

  return results
}

/* ======================================================
   OPEN LIBRARY - ISBN / EDITION / WORK
   ====================================================== */

async function openLibrary(
  isbn10: string | null,
  isbn13: string | null
): Promise<Candidate[]> {
  const variants = [
    isbn13,
    isbn10,
  ].filter(Boolean) as string[]

  const results: Candidate[] = []

  for (const isbn of variants) {
    const edition =
      await safeFetch(
        `https://openlibrary.org/isbn/${isbn}.json`
      )

    if (!edition) {
      continue
    }

    let work: any = null

    const workKey =
      edition.works?.[0]?.key

    if (workKey) {
      work =
        await safeFetch(
          `https://openlibrary.org${workKey}.json`
        )
    }

    let authors: string[] = []

    if (
      Array.isArray(
        edition.authors
      )
    ) {
      const authorResults =
        await Promise.all(
          edition.authors
            .slice(0, 8)
            .map(
              async (
                author: {
                  key?: string
                }
              ) => {
                if (!author.key) {
                  return null
                }

                const data =
                  await safeFetch(
                    `https://openlibrary.org${author.key}.json`
                  )

                return (
                  data?.name ??
                  null
                )
              }
            )
        )

      authors =
        authorResults.filter(
          Boolean
        ) as string[]
    }

    const publishers =
      Array.isArray(
        edition.publishers
      )
        ? edition.publishers
        : []

    const pageCount =
      edition.number_of_pages ??
      edition.pagination
        ?.match(/\d+/)
        ? Number(
            edition.pagination
              ?.match(/\d+/)?.[0]
          )
        : undefined

    const coverId =
      edition.covers?.[0]

    const coverUrl =
      coverId
        ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
        : `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`

    results.push({
      source:
        'Open Library',

      title:
        edition.title ??
        work?.title,

      subtitle:
        edition.subtitle,

      authors,

      publisher:
        publishers[0],

      publishedDate:
        edition.publish_date ??
        work?.first_publish_date,

      description:
        stripHtml(
          textFromDescription(
            edition.description
          ) ??
            textFromDescription(
              work?.description
            )
        ),

      pages:
        Number.isFinite(pageCount)
          ? pageCount
          : undefined,

      coverUrl,

      categories:
        edition.subjects ??
        work?.subjects,

      isbn10:
        edition.isbn_10?.[0] ??
        isbn10 ??
        undefined,

      isbn13:
        edition.isbn_13?.[0] ??
        isbn13 ??
        undefined,
    })
  }

  /* Search API come secondo tentativo:
     alcune edizioni sono indicizzate qui anche
     quando /isbn/... non restituisce bene i dati. */

  const searchISBN =
    isbn13 ?? isbn10

  if (searchISBN) {
    const search =
      await safeFetch(
        `https://openlibrary.org/search.json?isbn=${encodeURIComponent(
          searchISBN
        )}&limit=5`
      )

    for (
      const doc of
        search?.docs ?? []
    ) {
      results.push({
        source:
          'Open Library Search',

        title:
          doc.title,

        authors:
          doc.author_name,

        publisher:
          doc.publisher?.[0],

        publishedDate:
          doc.publish_date?.[0] ??
          (
            doc.first_publish_year
              ? String(
                  doc.first_publish_year
                )
              : undefined
          ),

        pages:
          doc.number_of_pages_median,

        coverUrl:
          doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
            : undefined,

        categories:
          doc.subject?.slice(
            0,
            20
          ),

        isbn10:
          doc.isbn?.find(
            (x: string) =>
              cleanISBN(x).length ===
              10
          ),

        isbn13:
          doc.isbn?.find(
            (x: string) =>
              cleanISBN(x).length ===
              13
          ),
      })
    }
  }

  return results
}

/* ======================================================
   CROSSREF
   ====================================================== */

async function crossref(
  isbn10: string | null,
  isbn13: string | null
): Promise<Candidate[]> {
  const isbn =
    isbn13 ?? isbn10

  if (!isbn) return []

  const url =
    `https://api.crossref.org/works` +
    `?filter=isbn:${encodeURIComponent(isbn)}` +
    `&rows=10` +
    `&mailto=exlibris@example.com`

  const data =
    await safeFetch(url)

  const items =
    data?.message?.items ?? []

  return items.map(
    (item: any) => {
      const authors =
        (
          item.author ?? []
        )
          .map(
            (author: any) =>
              [
                author.given,
                author.family,
              ]
                .filter(Boolean)
                .join(' ')
          )
          .filter(Boolean)

      const dateParts =
        item.published
          ?.['date-parts']
          ?.[0] ??
        item.publishedPrint
          ?.['date-parts']
          ?.[0] ??
        item.created
          ?.['date-parts']
          ?.[0]

      const publishedDate =
        Array.isArray(
          dateParts
        )
          ? dateParts.join('-')
          : undefined

      const isbns =
        (
          item.ISBN ?? []
        ).map(
          (x: string) =>
            cleanISBN(x)
        )

      return {
        source: 'Crossref',

        title:
          item.title?.[0],

        subtitle:
          item.subtitle?.[0],

        authors,

        publisher:
          item.publisher,

        publishedDate,

        description:
          stripHtml(
            item.abstract
          ),

        isbn10:
          isbns.find(
            (x: string) =>
              x.length === 10
          ),

        isbn13:
          isbns.find(
            (x: string) =>
              x.length === 13
          ),
      }
    }
  )
}

/* ======================================================
   MERGE
   ====================================================== */

function usefulString(
  value?: string
) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0
  )
}

function firstString(
  candidates: Candidate[],
  key:
    | 'title'
    | 'subtitle'
    | 'publisher'
    | 'publishedDate'
    | 'description'
    | 'coverUrl'
    | 'isbn10'
    | 'isbn13'
) {
  for (
    const candidate of candidates
  ) {
    const value =
      candidate[key]

    if (
      typeof value === 'string' &&
      usefulString(value)
    ) {
      return value.trim()
    }
  }

  return null
}

function longestDescription(
  candidates: Candidate[]
) {
  const descriptions =
    candidates
      .map(
        (candidate) =>
          candidate.description
      )
      .filter(
        (
          value
        ): value is string =>
          Boolean(
            value?.trim()
          )
      )

  descriptions.sort(
    (a, b) =>
      b.length - a.length
  )

  return descriptions[0] ?? null
}

function bestAuthors(
  candidates: Candidate[]
) {
  for (const candidate of candidates) {
    if (
      Array.isArray(candidate.authors) &&
      candidate.authors.length > 0
    ) {
      return candidate.authors
        .map((author) => cleanSbnText(author))
        .filter(Boolean)
    }
  }

  return []
}

function bestPages(
  candidates: Candidate[]
) {
  const values: number[] = []

  for (const candidate of candidates) {
    const value = candidate.pages

    if (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value > 0
    ) {
      values.push(value)
    }
  }

  if (values.length === 0) {
    return null
  }

  const frequencies =
    new Map<number, number>()

  for (const value of values) {
    frequencies.set(
      value,
      (frequencies.get(value) ?? 0) + 1
    )
  }

  const sorted =
    [...frequencies.entries()].sort(
      (a, b) => b[1] - a[1]
    )

  return sorted[0][0]
}

function bestCategories(
  candidates: Candidate[]
) {
  const all =
    candidates.flatMap(
      (candidate) =>
        candidate.categories ??
        []
    )

  return [
    ...new Set(
      all
        .filter(Boolean)
        .map(
          (value) =>
            value.trim()
        )
    ),
  ].slice(0, 20)
}

export async function GET(
  request: NextRequest
) {
  const rawISBN =
    request.nextUrl.searchParams.get(
      'isbn'
    )

  if (!rawISBN) {
    return NextResponse.json(
      {
        error:
          'ISBN mancante.',
      },
      {
        status: 400,
      }
    )
  }

  const {
    original,
    isbn10,
    isbn13,
  } = getISBNVariants(
    rawISBN
  )

  if (
    original.length !== 10 &&
    original.length !== 13
  ) {
    return NextResponse.json(
      {
        error:
          'ISBN non valido.',
      },
      {
        status: 400,
      }
    )
  }

  /* Le fonti vengono interrogate
     contemporaneamente. */

  const [
    google,
    openLibraryResults,
    crossrefResults,
    sbnResults,
  ] = await Promise.all([
    googleBooks(
      isbn10,
      isbn13
    ),

    openLibrary(
      isbn10,
      isbn13
    ),

    crossref(
      isbn10,
      isbn13
    ),

    sbn(
      isbn10,
      isbn13
    ),
  ])

  /*
    Ordine di preferenza generale:
    Google -> Open Library -> SBN -> Crossref

    Per descrizione e pagine usiamo invece
    funzioni dedicate.
  */

  const candidates = [
    ...google,
    ...openLibraryResults,
    ...sbnResults,
    ...crossrefResults,
  ]

  const meaningful =
    candidates.filter(
      (candidate) =>
        usefulString(
          candidate.title
        )
    )

  if (!meaningful.length) {
    return NextResponse.json(
      {
        error:
          'Libro non trovato nelle fonti automatiche.',

        isbn:
          isbn13 ??
          isbn10 ??
          original,

        isbn10,

        isbn13,

        sources_checked: [
          'Google Books',
          'Open Library',
          'SBN',
          'Crossref',
        ],

        /* Ci servirà quando aggiungiamo SBN. */
        sbn_available:
          true,
      },
      {
        status: 404,
      }
    )
  }

  const title =
    firstString(
      meaningful,
      'title'
    )

  const publisher =
    firstString(
      meaningful,
      'publisher'
    )

  const publishedDate =
    firstString(
      meaningful,
      'publishedDate'
    )

  const coverUrl =
    firstString(
      meaningful,
      'coverUrl'
    )

  const description =
    longestDescription(
      meaningful
    )

  const pages =
    bestPages(
      meaningful
    )

  const authors =
    bestAuthors(
      meaningful
    )

  const categories =
    bestCategories(
      meaningful
    )

  const sourceNames = [
    ...new Set(
      meaningful.map(
        (candidate) =>
          candidate.source
      )
    ),
  ]

  const yearMatch =
    publishedDate?.match(
      /\d{4}/
    )

  const book = {
    title,

    subtitle:
      firstString(
        meaningful,
        'subtitle'
      ),

    authors,

    publisher,

    publishedDate,

    publication_date:
      publishedDate,

    publication_year:
      yearMatch
        ? Number(
            yearMatch[0]
          )
        : null,

    description,

    pages,

    pageCount:
      pages,

    cover_url:
      coverUrl,

    coverUrl,

    thumbnail:
      coverUrl,

    categories,

    isbn:
      isbn13 ??
      isbn10 ??
      original,

    isbn10:
      isbn10 ??
      firstString(
        meaningful,
        'isbn10'
      ),

    isbn13:
      isbn13 ??
      firstString(
        meaningful,
        'isbn13'
      ),

    source:
      sourceNames.join(
        ' + '
      ),

    sources:
      sourceNames,

    source_count:
      sourceNames.length,
  }

  /*
    Restituiamo sia i campi al livello principale
    sia `book`, così restiamo compatibili con
    entrambe le forme di frontend.
  */

  return NextResponse.json({
    ...book,

    book,

    matches:
      meaningful.length,
  })
}
