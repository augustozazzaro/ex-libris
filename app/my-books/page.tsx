'use client'

import {
  Suspense,
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import {
  ArrowLeft,
  BookOpen,
  Heart,
  Bookmark,
  BookCheck,
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'
import BookCover from '@/components/BookCover'

type Book = {
  id: string
  title: string
  authors: string[] | null
  cover_url: string | null
  custom_cover_url: string | null
}

type StateRow = {
  book_id: string
  favorite: boolean
  reading_status: string
}

export default function MyBooksPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-[3px] border-black/15 border-t-black rounded-full animate-spin" />
        </main>
      }
    >
      <MyBooksContent />
    </Suspense>
  )
}

function MyBooksContent() {
  const supabase = createClient()
  const params = useSearchParams()

  const filter =
    params.get('filter') ?? 'read'

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

      let query = supabase
        .from('user_book_state')
        .select(`
          book_id,
          favorite,
          reading_status
        `)
        .eq('user_id', user.id)

      if (filter === 'favorites') {
        query = query.eq(
          'favorite',
          true
        )
      } else {
        query = query.eq(
          'reading_status',
          filter
        )
      }

      const { data: states } =
        await query

      const rows =
        (states ?? []) as StateRow[]

      const ids =
        rows.map(
          (row) =>
            row.book_id
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
  }, [filter])

  const config =
    filter === 'favorites'
      ? {
          title: 'Preferiti',
          subtitle: 'I libri che hai salvato',
          icon: Heart,
          color: '#DDB342',
        }
      : filter === 'reading'
        ? {
            title: 'In lettura',
            subtitle: 'Quello che stai leggendo',
            icon: BookOpen,
            color: '#5E7FA3',
          }
        : filter === 'to_read'
          ? {
              title: 'Da leggere',
              subtitle: 'La tua lista personale',
              icon: Bookmark,
              color: '#DDB342',
            }
          : {
              title: 'Letti',
              subtitle: 'La tua storia di lettura',
              icon: BookCheck,
              color: '#C76955',
            }

  const Icon = config.icon

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
          href="/profile"
          className="exl-glass w-11 h-11 rounded-full flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </Link>

        <header className="mt-7">

          <div
            className="flex items-center gap-2 text-sm font-semibold"
            style={{
              color: config.color,
            }}
          >
            <Icon
              size={18}
              fill={
                filter === 'favorites'
                  ? 'currentColor'
                  : 'none'
              }
            />

            {config.subtitle}
          </div>

          <h1 className="text-[38px] font-bold tracking-[-0.045em] mt-1">
            {config.title}
          </h1>

          <p className="text-[#8e8e93] mt-2">
            {books.length === 1
              ? '1 libro'
              : `${books.length} libri`}
          </p>

        </header>

        {books.length === 0 ? (

          <div className="exl-glass exl-card p-10 text-center mt-7">

            <Icon
              size={36}
              className="mx-auto"
              style={{
                color: config.color,
              }}
            />

            <p className="font-semibold mt-4">
              Nessun libro
            </p>

            <p className="text-[#8e8e93] text-sm mt-1">
              Questa sezione è ancora vuota.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8 mt-7">

            {books.map((book) => {
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
                      title={book.title}
                      authors={book.authors}
                      coverUrl={cover}
                    />

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
            })}

          </div>

        )}

      </div>

    </main>
  )
}
