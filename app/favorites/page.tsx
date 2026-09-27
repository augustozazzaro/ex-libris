'use client'

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

type Book = {
  id: string
  title: string
  authors: string[] | null
  cover_url: string | null
  custom_cover_url: string | null
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
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data: states } =
        await supabase
          .from('user_book_state')
          .select('book_id')
          .eq('user_id', user.id)
          .eq('favorite', true)

      const ids =
        (states ?? [])
          .map(
            (item) =>
              item.book_id
          )

      if (!ids.length) {
        setBooks([])
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
          .in('id', ids)

      setBooks(
        (data ?? []) as Book[]
      )

      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-black/15 border-t-black rounded-full animate-spin" />
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
              (book) => {
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

                      {cover ? (
                        <img
                          src={cover}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">

                          <BookOpen
                            size={35}
                            className="text-white"
                          />

                        </div>
                      )}

                    </div>

                    <p className="font-semibold leading-tight mt-3 line-clamp-2">
                      {book.title}
                    </p>

                    {book.authors?.[0] && (
                      <p className="text-[#8e8e93] text-sm mt-1 truncate">
                        {book.authors[0]}
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
