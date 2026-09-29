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
 * Rimane vivo per tutta la sessione SPA.
 * Se una cover è già comparsa, quando il componente
 * viene rimontato non facciamo riapparire il fallback.
 */
const loadedCoverUrls =
  new Set<string>()

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
    i++
  ) {
    hash =
      value.charCodeAt(i) +
      ((hash << 5) - hash)

    hash |= 0
  }

  return Math.abs(hash)
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
      Boolean(
        coverUrl &&
        loadedCoverUrls.has(
          coverUrl
        )
      )
    )

  useEffect(() => {
    setImageFailed(false)

    setImageReady(
      Boolean(
        coverUrl &&
        loadedCoverUrls.has(
          coverUrl
        )
      )
    )
  }, [coverUrl])

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
          loading="eager"
          decoding="async"
          fetchPriority={
            priority
              ? 'high'
              : 'auto'
          }
          onLoad={() => {
            loadedCoverUrls.add(
              coverUrl
            )

            setImageReady(
              true
            )
          }}
          onError={() => {
            setImageFailed(
              true
            )
          }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-100 ${
            imageReady
              ? 'opacity-100'
              : 'opacity-0'
          }`}
        />
      )}

    </div>
  )
}
