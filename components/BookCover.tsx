'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  BookOpen,
} from 'lucide-react'

type Props = {
  title: string
  authors?: string[] | string | null
  coverUrl?: string | null
  className?: string
  priority?: boolean
}

/*
 * Registro condiviso per tutta la sessione SPA.
 *
 * Una cover già caricata non torna al fallback
 * quando viene rimontata in un'altra pagina.
 */
const loadedCoverUrls =
  new Set<string>()

/*
 * Evita preload duplicati della stessa immagine.
 */
const preloadingCoverUrls =
  new Set<string>()

export function preloadBookCover(
  url?: string | null
) {
  if (
    typeof window ===
      'undefined' ||
    !url ||
    loadedCoverUrls.has(url) ||
    preloadingCoverUrls.has(url)
  ) {
    return
  }

  preloadingCoverUrls.add(
    url
  )

  const image =
    new Image()

  image.decoding =
    'async'

  image.onload = () => {
    loadedCoverUrls.add(
      url
    )

    preloadingCoverUrls.delete(
      url
    )
  }

  image.onerror = () => {
    preloadingCoverUrls.delete(
      url
    )
  }

  image.src =
    url

  if (
    typeof image.decode ===
    'function'
  ) {
    image
      .decode()
      .then(() => {
        loadedCoverUrls.add(
          url
        )

        preloadingCoverUrls.delete(
          url
        )
      })
      .catch(
        () => {}
      )
  }
}

const palettes = [
  {
    background: '#5E7FA3',
    foreground: '#F7F3EA',
    accent: '#D9E2EA',
  },
  {
    background: '#C76955',
    foreground: '#FFF7F1',
    accent: '#E9B8AA',
  },
  {
    background: '#DDB342',
    foreground: '#2C2618',
    accent: '#F2D98B',
  },
  {
    background: '#6F8061',
    foreground: '#F5F3EA',
    accent: '#BAC6AE',
  },
  {
    background: '#76678A',
    foreground: '#FBF8FF',
    accent: '#C7BDD2',
  },
  {
    background: '#486F73',
    foreground: '#F3FAF9',
    accent: '#A9C9C7',
  },
  {
    background: '#9A6A52',
    foreground: '#FFF8F2',
    accent: '#D8B29F',
  },
]

function hashString(
  value: string
) {
  let hash = 0

  for (
    let i = 0;
    i < value.length;
    i += 1
  ) {
    hash =
      value.charCodeAt(i) +
      ((hash << 5) - hash)

    hash |= 0
  }

  return Math.abs(
    hash
  )
}

function GeneratedCover({
  title,
  authors,
}: {
  title: string
  authors?: string[] | string | null
}) {
  const palette =
    useMemo(() => {
      const authorSeed =
        Array.isArray(authors)
          ? authors.join('-')
          : authors ?? ''

      return palettes[
        hashString(
          `${title}-${authorSeed}`
        ) %
          palettes.length
      ]
    }, [
      title,
      authors,
    ])

  const author =
    Array.isArray(authors)
      ? authors[0] ??
        'Autore non disponibile'
      : authors ||
        'Autore non disponibile'

  return (
    <div
      className="absolute inset-0 overflow-hidden p-4 flex flex-col justify-between"
      style={{
        backgroundColor:
          palette.background,
        color:
          palette.foreground,
      }}
    >
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-bl-[40px] opacity-40"
        style={{
          backgroundColor:
            palette.accent,
        }}
      />

      <BookOpen
        size={20}
        strokeWidth={1.7}
        className="relative opacity-90"
      />

      <div className="relative">
        <h3 className="font-bold text-[16px] leading-[1.08] tracking-[-0.025em] line-clamp-5">
          {title}
        </h3>

        <div
          className="w-8 h-[2px] rounded-full my-3 opacity-70"
          style={{
            backgroundColor:
              palette.foreground,
          }}
        />

        <p className="text-[11px] leading-tight opacity-80 line-clamp-3">
          {author}
        </p>
      </div>
    </div>
  )
}

export default function BookCover({
  title,
  authors,
  coverUrl,
  className = '',
  priority = false,
}: Props) {
  const alreadyLoaded =
    Boolean(
      coverUrl &&
      loadedCoverUrls.has(
        coverUrl
      )
    )

  const [
    imageFailed,
    setImageFailed,
  ] =
    useState(false)

  const [
    imageReady,
    setImageReady,
  ] =
    useState(
      alreadyLoaded
    )

  useEffect(() => {
    const cached =
      Boolean(
        coverUrl &&
        loadedCoverUrls.has(
          coverUrl
        )
      )

    setImageFailed(
      false
    )

    setImageReady(
      cached
    )

    /*
     * Le cover importanti vengono iniziate
     * immediatamente anche prima che il browser
     * completi il normale rendering dell'img.
     */
    if (
      priority &&
      coverUrl &&
      !cached
    ) {
      preloadBookCover(
        coverUrl
      )
    }
  }, [
    coverUrl,
    priority,
  ])

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
    >
      <GeneratedCover
        title={title}
        authors={authors}
      />

      {coverUrl &&
        !imageFailed && (
          <img
            src={coverUrl}
            alt={title}
            loading={
              priority
                ? 'eager'
                : 'lazy'
            }
            decoding="async"
            fetchPriority={
              priority
                ? 'high'
                : 'auto'
            }
            onLoad={event => {
              loadedCoverUrls.add(
                coverUrl
              )

              /*
               * complete è particolarmente utile
               * quando Safari recupera l'immagine
               * direttamente dalla cache HTTP.
               */
              if (
                event.currentTarget
                  .naturalWidth >
                0
              ) {
                setImageReady(
                  true
                )
              }
            }}
            onError={() => {
              setImageFailed(
                true
              )
            }}
            className={`absolute inset-0 w-full h-full object-cover ${
              alreadyLoaded
                ? ''
                : 'transition-opacity duration-150'
            } ${
              imageReady
                ? 'opacity-100'
                : 'opacity-0'
            }`}
          />
        )}
    </div>
  )
}
