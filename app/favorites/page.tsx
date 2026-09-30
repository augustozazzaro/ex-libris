'use client'

import ExLibrisLoader from '@/components/ExLibrisLoader'

import {
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'

import {
  ArrowLeft,
  BookOpen,
  Heart,
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'
import {
  readCache,
  writeCache,
} from '@/utils/exlibris-cache'
import BookCover from '@/components/BookCover'
import {
  cleanBookTitle,
  cleanPersonName,
} from '@/utils/book-metadata'

type Book = {
  id: string
  title: string
  authors: string[] | null
  cover_url: string | null
  custom_cover_url: string | null
}

type FavoritesSnapshot = {
  books: Book[]
}

export default function FavoritesPage() {
  const supabase = createClient()

  const [books, setBooks] =
    useState<Book[]>([])

  const [loading, setLoading] =
    useState(true)

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } =
        await supabase.auth
          .getSession()

      const user =
        session?.user

      if (!user) {
        setLoading(false)
        return
      }

      const cacheKey =
        `favorites:${user.id}`

      const cached =
        readCache<FavoritesSnapshot>(
          cacheKey
        )

      if (cached) {
        setBooks(
          cached.books
        )

        setLoading(false)
      } else {
        setLoading(true)
      }

      const {
        data: states,
      } =
        await supabase
          .from(
            'user_book_state'
          )
          .select('book_id')
          .eq(
            'user_id',
            user.id
          )
          .eq(
            'favorite',
            true
          )

      const ids =
        (states ?? [])
          .map(
            (
              item: {
                book_id: string
              }
            ) =>
              item.book_id
          )

      if (!ids.length) {
        const snapshot:
          FavoritesSnapshot = {
            books: [],
          }

        setBooks([])
        writeCache(
          cacheKey,
          snapshot
        )

        setLoading(false)
        return
      }

      const { data } =
        await supabase
          .from('books')
          .select(`
            id,
            title,
            authors,
            cover_url,
            custom_cover_url
          `)
          .in(
            'id',
            ids
          )

      const snapshot:
        FavoritesSnapshot = {
          books:
            (data ?? []) as Book[],
        }

      setBooks(
        snapshot.books
      )

      writeCache(
        cacheKey,
        snapshot
      )

      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <ExLibrisLoader />
      </main>
    )
  }

  return (
    <main className="exl-page">

      <div className="max-w-5xl mx-auto px-5 pt-[calc(16px+env(safe-area-inset-top))] md:pt-8">

        <Link
          href="/"
          className="exl-glass w-11 h-11 rounded-full flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </Link>

        <header className="mt-7">

          <div className="flex items-center gap-2 text-[#DDB342]">

            <Heart
              size={20}
              fill="currentColor"
            />

            <p className="text-sm font-semibold">
              La tua selezione
            </p>

          </div>

          <h1 className="text-[38px] font-bold tracking-[-0.045em] mt-1">
            Preferiti
          </h1>

          <p className="text-[#8e8e93] mt-2">
            {books.length === 1
              ? '1 libro'
              : `${books.length} libri`}
          </p>

        </header>

        {books.length === 0 ? (

          <div className="exl-glass exl-card p-10 text-center mt-7">

            <Heart
              size={36}
              className="mx-auto text-[#DDB342]"
            />

            <p className="font-semibold mt-4">
              Nessun preferito
            </p>

            <p className="text-[#8e8e93] text-sm mt-1">
              Tocca il cuore nella scheda di un libro.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8 mt-7">

            {books.map(
              (book, index) => {
                const cover =
                  book.custom_cover_url ||
                  book.cover_url

                return (
                  <Link
                    key={book.id}
                    href={`/books/${book.id}`}
                    className="exl-press"
                  >

                    <div className="aspect-[2/3] rounded-[18px] overflow-hidden bg-[#d1d1d6] exl-book-cover">

                      <BookCover
                        title={cleanBookTitle(book.title)}
                        authors={book.authors}
                        coverUrl={cover}
                        priority={
                          index < 6
                        }
                      />

                    </div>

                    <p className="font-semibold leading-tight mt-3 line-clamp-2">
                      {cleanBookTitle(book.title)}
                    </p>

                    {book.authors?.[0] && (
                      <p className="text-[#8e8e93] text-sm mt-1 truncate">
                        {cleanPersonName(book.authors[0])}
                      </p>
                    )}

                  </Link>
                )
              }
            )}

          </div>

        )}

      </div>

    </main>
  )
}
