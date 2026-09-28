import { NextRequest, NextResponse } from 'next/server'

type Candidate = {
  source: string

  title?: string
  subtitle?: string
  authors?: string[]
  publisher?: string
  publishedDate?: string

  description?: string
  bibliographicNotes?: string
  series?: string

  translators?: string[]
  editors?: string[]
  illustrators?: string[]
  introductions?: string[]

  language?: string
  format?: string

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


function cleanContributorName(
  value: unknown
) {
  return cleanSbnText(value)
    .replace(
      /^\[[^\]]+\]\s*/,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()
}

function uniqueStrings(
  values: string[]
) {
  const result: string[] = []
  const seen =
    new Set<string>()

  function personKey(
    value: string
  ) {
    const clean =
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(
          /[\\u0300-\\u036f]/g,
          ''
        )
        .replace(
          /[^a-z0-9]+/g,
          ' '
        )
        .trim()

    const parts =
      clean
        .split(' ')
        .filter(Boolean)
        .sort()

    return parts.join('|')
  }

  for (const raw of values) {
    const value =
      raw.trim()

    if (!value) continue

    const key =
      personKey(value)

    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    result.push(value)
  }

  return result
}

function taggedSbnNames(
  names: unknown,
  role: string
) {
  if (!Array.isArray(names)) {
    return []
  }

  const prefix =
    `[${role}]`

  return uniqueStrings(
    names
      .filter(
        (value) =>
          typeof value === 'string' &&
          cleanSbnText(value)
            .toLowerCase()
            .startsWith(
              prefix.toLowerCase()
            )
      )
      .map(
        cleanContributorName
      )
  )
}

function extractRoleNames(
  title: string,
  patterns: RegExp[]
) {
  const names: string[] = []

  for (const pattern of patterns) {
    const regex =
      new RegExp(
        pattern.source,
        pattern.flags.includes('g')
          ? pattern.flags
          : pattern.flags + 'g'
      )

    let match:
      RegExpExecArray | null

    while (
      (
        match =
          regex.exec(title)
      ) !== null
    ) {
      const raw =
        match[1]

      if (!raw) continue

      const cleaned =
        cleanSbnText(raw)
          .replace(
            /\s+(?:con|with)\s+.*$/i,
            ''
          )
          .trim()

      if (cleaned) {
        names.push(cleaned)
      }
    }
  }

  return uniqueStrings(names)
}

function sbnLanguage(
  value: unknown
): string | undefined {
  const raw =
    Array.isArray(value)
      ? String(
          value[0] ?? ''
        )
      : typeof value === 'string'
        ? value
        : ''

  const code =
    raw
      .trim()
      .toLowerCase()

  const languages:
    Record<string, string> = {
      ita: 'Italiano',
      it: 'Italiano',
      eng: 'Inglese',
      en: 'Inglese',
      fra: 'Francese',
      fre: 'Francese',
      fr: 'Francese',
      deu: 'Tedesco',
      ger: 'Tedesco',
      de: 'Tedesco',
      spa: 'Spagnolo',
      es: 'Spagnolo',
      por: 'Portoghese',
      pt: 'Portoghese',
      lat: 'Latino',
      grc: 'Greco antico',
      gre: 'Greco',
      ell: 'Greco',
    }

  if (!code) {
    return undefined
  }

  const mapped =
    languages[code]

  if (mapped) {
    return mapped
  }

  const cleaned =
    cleanSbnText(raw)

  if (!cleaned) {
    return undefined
  }

  return (
    cleaned.charAt(0).toUpperCase() +
    cleaned.slice(1).toLowerCase()
  )
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
      ].filter(
        (value): value is string =>
          typeof value === 'string' &&
          value.trim().length > 0
      )

      const fullTitle =
        cleanSbnText(
          record.titolo ??
          source.titolo ??
          ''
        )

      const translators =
        uniqueStrings([
          ...taggedSbnNames(
            source.nomi,
            'Traduttore'
          ),

          ...extractRoleNames(
            fullTitle,
            [
              /traduzione\s+(?:di|da)\s+([^;\/]+)/gi,
              /tradotto\s+(?:da|di)\s+([^;\/]+)/gi,
              /translated\s+by\s+([^;\/]+)/gi,
            ]
          ),
        ])

      const illustrators =
        uniqueStrings([
          ...taggedSbnNames(
            source.nomi,
            'Illustratore'
          ),

          ...extractRoleNames(
            fullTitle,
            [
              /illustrazioni\s+di\s+([^;\/]+)/gi,
              /illustrato\s+da\s+([^;\/]+)/gi,
              /illustrations?\s+by\s+([^;\/]+)/gi,
            ]
          ),
        ])

      const editors =
        extractRoleNames(
          fullTitle,
          [
            /(?:edizione(?:\s+italiana)?\s+)?a\s+cura\s+di\s+([^;\/]+)/gi,
            /edited\s+by\s+([^;\/]+)/gi,
          ]
        )

      const introductions =
        extractRoleNames(
          fullTitle,
          [
            /introduzione\s+di\s+([^;\/]+)/gi,
            /prefazione(?:\s+[^;\/]+)?\s+di\s+([^;\/]+)/gi,
            /with\s+an\s+introduction(?:\s+and\s+notes)?\s+by\s+([^;\/]+)/gi,
          ]
        )

      const language =
        sbnLanguage(
          source.linguaPubblicazione ??
          record.linguaPubblicazione
        )

      const format =
        cleanSbnText(
          source.tipo ??
          record.tipo ??
          ''
        ) || undefined

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
          undefined,

        bibliographicNotes:
          descriptionParts.length
            ? descriptionParts.join('\n')
            : undefined,

        series:
          source.collezione
            ? cleanSbnText(
                source.collezione
              )
            : undefined,

        translators,
        editors,
        illustrators,
        introductions,
        language,
        format,

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

        language:
          info.language
            ? sbnLanguage(
                info.language
              )
            : undefined,

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
   APPLE BOOKS
   ====================================================== */

async function appleBooks(
  isbn10: string | null,
  isbn13: string | null
): Promise<Candidate[]> {
  const isbn =
    isbn13 ?? isbn10

  if (!isbn) return []

  const queries = [
    `https://itunes.apple.com/lookup?isbn=${encodeURIComponent(
      isbn
    )}&country=IT&entity=ebook`,

    `https://itunes.apple.com/search?term=${encodeURIComponent(
      isbn
    )}&country=IT&media=ebook&entity=ebook&limit=10`,
  ]

  const results: Candidate[] = []

  for (const url of queries) {
    const data =
      await safeFetch(url)

    for (
      const item of
        data?.results ?? []
    ) {
      const title =
        item.trackName ??
        item.collectionName

      if (!title) continue

      const authors =
        item.artistName
          ? [item.artistName]
          : []

      const publishedDate =
        item.releaseDate
          ? String(
              item.releaseDate
            )
          : undefined

      const description =
        stripHtml(
          item.description
        )

      const categories =
        Array.isArray(
          item.genres
        )
          ? item.genres
          : item.primaryGenreName
            ? [
                item.primaryGenreName
              ]
            : []

      results.push({
        source:
          'Apple Books',

        title,

        authors,

        publisher:
          item.sellerName ??
          item.publisher,

        publishedDate,

        description,

        coverUrl:
          secureImage(
            item.artworkUrl100 ??
            item.artworkUrl60
          ),

        categories,

        isbn10:
          isbn10 ?? undefined,

        isbn13:
          isbn13 ?? undefined,
      })
    }

    if (results.length) {
      break
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
    | 'series'
    | 'bibliographicNotes'
    | 'language'
    | 'format'
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

async function supplementalSynopsis(
  title: string | null,
  authors: string[]
): Promise<string | null> {
  if (!title) return null

  const author =
    authors[0] ?? ''

  function normalize(
    value: string
  ) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  }

  const normalizedTitle =
    normalize(title)

  const authorTokens =
    normalize(author)
      .split(' ')
      .filter(
        (token) =>
          token.length >= 4
      )

  const queries = [
    [
      `intitle:${title}`,
      author
        ? `inauthor:${author}`
        : '',
    ]
      .filter(Boolean)
      .join(' '),

    `${title} ${author}`.trim(),

    title,
  ]

  type SynopsisCandidate = {
    text: string
    score: number
  }

  const candidates:
    SynopsisCandidate[] = []

  for (const query of queries) {
    const google =
      await safeFetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          query
        )}&maxResults=10&projection=full`
      )

    for (
      const item of
        google?.items ?? []
    ) {
      const info =
        item?.volumeInfo ?? {}

      const description =
        stripHtml(
          info.description
        )

      if (
        !description ||
        description.length < 120
      ) {
        continue
      }

      const candidateTitle =
        normalize(
          info.title ?? ''
        )

      const titleMatches =
        candidateTitle.includes(
          normalizedTitle
        ) ||
        normalizedTitle.includes(
          candidateTitle
        )

      if (!titleMatches) {
        continue
      }

      const candidateAuthors =
        Array.isArray(info.authors)
          ? info.authors
              .map(
                (value: string) =>
                  normalize(value)
              )
              .join(' ')
          : ''

      const authorMatches =
        authorTokens.length === 0 ||
        authorTokens.some(
          (token) =>
            candidateAuthors.includes(
              token
            )
        )

      if (!authorMatches) {
        continue
      }

      let score =
        description.length

      if (
        info.language === 'it'
      ) {
        score += 10000
      }

      if (
        candidateTitle ===
        normalizedTitle
      ) {
        score += 3000
      }

      candidates.push({
        text: description,
        score,
      })
    }
  }

  if (candidates.length) {
    candidates.sort(
      (a, b) =>
        b.score - a.score
    )

    return candidates[0].text
  }

  const appleQuery =
    [
      title,
      author,
    ]
      .filter(Boolean)
      .join(' ')

  const apple =
    await safeFetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        appleQuery
      )}&country=IT&media=ebook&entity=ebook&limit=10`
    )

  const appleCandidates:
    {
      text: string
      score: number
    }[] = []

  for (
    const item of
      apple?.results ?? []
  ) {
    const description =
      stripHtml(
        item.description
      )

    if (
      !description ||
      description.length < 120
    ) {
      continue
    }

    const candidateTitle =
      normalize(
        item.trackName ??
        item.collectionName ??
        ''
      )

    const titleMatches =
      candidateTitle.includes(
        normalizedTitle
      ) ||
      normalizedTitle.includes(
        candidateTitle
      )

    if (!titleMatches) {
      continue
    }

    const candidateAuthor =
      normalize(
        item.artistName ?? ''
      )

    const authorMatches =
      authorTokens.length === 0 ||
      authorTokens.some(
        (token) =>
          candidateAuthor.includes(
            token
          )
      )

    if (!authorMatches) {
      continue
    }

    let score =
      description.length

    if (
      candidateTitle ===
      normalizedTitle
    ) {
      score += 3000
    }

    appleCandidates.push({
      text: description,
      score,
    })
  }

  if (appleCandidates.length) {
    appleCandidates.sort(
      (a, b) =>
        b.score - a.score
    )

    return appleCandidates[0].text
  }

  const openLibrary =
    await safeFetch(
      `https://openlibrary.org/search.json?title=${encodeURIComponent(
        title
      )}${
        author
          ? `&author=${encodeURIComponent(
              author
            )}`
          : ''
      }&limit=10`
    )

  for (
    const doc of
      openLibrary?.docs ?? []
  ) {
    const workKey =
      doc.key

    if (!workKey) continue

    const work =
      await safeFetch(
        `https://openlibrary.org${workKey}.json`
      )

    const description =
      stripHtml(
        textFromDescription(
          work?.description
        )
      )

    if (
      description &&
      description.length > 120
    ) {
      return description
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
        ): value is string => {
          if (
            typeof value !== 'string'
          ) {
            return false
          }

          const text =
            value.trim()

          if (
            text.length < 120
          ) {
            return false
          }

          const catalogNote =
            /^(collana|in cop\.?|in copertina|sul verso|titolo originale|traduzione|edizione|testo greco|testo inglese|contiene):/i

          return !catalogNote.test(
            text
          )
        }
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

function mergeStringArrays(
  candidates: Candidate[],
  key:
    | 'translators'
    | 'editors'
    | 'illustrators'
    | 'introductions'
) {
  return uniqueStrings(
    candidates.flatMap(
      (candidate) =>
        candidate[key] ?? []
    )
  )
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
    appleResults,
    openLibraryResults,
    crossrefResults,
    sbnResults,
  ] = await Promise.all([
    googleBooks(
      isbn10,
      isbn13
    ),

    appleBooks(
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
    ...appleResults,
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
          'Apple Books',
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

  let description:
    string | null =
      longestDescription(
        meaningful
      )

  if (!description) {
    description =
      await supplementalSynopsis(
        title,
        bestAuthors(
          meaningful
        )
      )
  }

  const series =
    firstString(
      meaningful,
      'series'
    )

  const bibliographicNotes =
    firstString(
      meaningful,
      'bibliographicNotes'
    )

  const translators =
    mergeStringArrays(
      meaningful,
      'translators'
    )

  const editors =
    mergeStringArrays(
      meaningful,
      'editors'
    )

  const illustrators =
    mergeStringArrays(
      meaningful,
      'illustrators'
    )

  const introductions =
    mergeStringArrays(
      meaningful,
      'introductions'
    )

  const language =
    firstString(
      meaningful,
      'language'
    )

  const format =
    firstString(
      meaningful,
      'format'
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

    synopsis:
      description,

    series,

    translators,
    editors,
    illustrators,

    introductions,

    language,

    format,

    bibliographic_notes:
      bibliographicNotes,

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

  const legacyBook = {
    ...book,

    cover:
      book.cover_url,

    publicationDate:
      book.publishedDate,

    edition: '',

    language: '',
  }

  return NextResponse.json({
    ...book,

    found: true,
    exact: true,
    mode: 'isbn',

    book:
      legacyBook,

    items: [
      legacyBook
    ],

    matches:
      meaningful.length,
  })
}
