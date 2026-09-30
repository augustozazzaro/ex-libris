'use client'

import ExLibrisLoader from '@/components/ExLibrisLoader'

import {
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'

import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Plus,
  UserRound,
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'
import {
  readCache,
  writeCache,
  invalidateUserLibraryCaches,
} from '@/utils/exlibris-cache'
import BookCover from '@/components/BookCover'

type Book = {
  id: string
  title: string
  authors: string[] | null
  cover_url: string | null
  custom_cover_url: string | null
  status: string
}

type Loan = {
  id: string
  book_id: string
  borrower_name: string
  loan_date: string
  expected_return_date: string | null
  return_date: string | null
  notes: string | null
  books: Book | null
}

type LoansSnapshot = {
  familyId: string
  books: Book[]
  loans: Loan[]
}

export default function LoansPage() {
  const supabase = createClient()

  const [familyId, setFamilyId] =
    useState('')

  const [books, setBooks] =
    useState<Book[]>([])

  const [loans, setLoans] =
    useState<Loan[]>([])

  const [showNew, setShowNew] =
    useState(false)

  const [bookId, setBookId] =
    useState('')

  const [borrower, setBorrower] =
    useState('')

  const [expectedReturn, setExpectedReturn] =
    useState('')

  const [notes, setNotes] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  async function loadData() {
    setError('')

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
      `loans:${user.id}`

    const cached =
      readCache<LoansSnapshot>(
        cacheKey
      )

    if (cached) {
      setFamilyId(
        cached.familyId
      )

      setBooks(
        cached.books
      )

      setLoans(
        cached.loans
      )

      setLoading(false)
    } else {
      setLoading(true)
    }

    const {
      data: membership,
      error:
        membershipError,
    } =
      await supabase
        .from(
          'family_members'
        )
        .select(
          'family_id'
        )
        .eq(
          'user_id',
          user.id
        )
        .single()

    if (
      membershipError ||
      !membership
    ) {
      if (!cached) {
        setError(
          'Biblioteca non trovata.'
        )
      }

      setLoading(false)
      return
    }

    const [
      booksResult,
      loansResult,
    ] =
      await Promise.all([
        supabase
          .from('books')
          .select(`
            id,
            title,
            authors,
            cover_url,
            custom_cover_url,
            status
          `)
          .eq(
            'family_id',
            membership.family_id
          )
          .order('title'),

        supabase
          .from('loans')
          .select(`
            id,
            book_id,
            borrower_name,
            loan_date,
            expected_return_date,
            return_date,
            notes,
            books (
              id,
              title,
              authors,
              cover_url,
              custom_cover_url,
              status
            )
          `)
          .eq(
            'family_id',
            membership.family_id
          )
          .order(
            'loan_date',
            {
              ascending:
                false,
            }
          ),
      ])

    if (
      booksResult.error ||
      loansResult.error
    ) {
      if (!cached) {
        setError(
          'Errore nel caricamento dei prestiti.'
        )
      }

      setLoading(false)
      return
    }

    const snapshot:
      LoansSnapshot = {
        familyId:
          membership.family_id,

        books:
          (booksResult.data ??
            []) as Book[],

        loans:
          (loansResult.data ??
            []) as unknown as Loan[],
      }

    setFamilyId(
      snapshot.familyId
    )

    setBooks(
      snapshot.books
    )

    setLoans(
      snapshot.loans
    )

    writeCache(
      cacheKey,
      snapshot
    )

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function createLoan() {
    if (
      !bookId ||
      !borrower.trim()
    ) {
      return
    }

    setSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { error: loanError } =
      await supabase
        .from('loans')
        .insert({
          family_id:
            familyId,

          book_id:
            bookId,

          borrower_name:
            borrower.trim(),

          expected_return_date:
            expectedReturn ||
            null,

          notes:
            notes.trim() ||
            null,

          created_by:
            user.id,
        })

    if (loanError) {
      setError(
        loanError.message
      )
      setSaving(false)
      return
    }

    await supabase
      .from('books')
      .update({
        status: 'loaned',
      })
      .eq(
        'id',
        bookId
      )

    invalidateUserLibraryCaches(
      user.id
    )

    setBookId('')
    setBorrower('')
    setExpectedReturn('')
    setNotes('')
    setShowNew(false)
    setSaving(false)

    await loadData()
  }

  async function returnBook(
    loan: Loan
  ) {
    const {
      data: { user },
    } =
      await supabase.auth
        .getUser()

    const today =
      new Date()
        .toISOString()
        .slice(0, 10)

    await supabase
      .from('loans')
      .update({
        return_date:
          today,
      })
      .eq(
        'id',
        loan.id
      )

    await supabase
      .from('books')
      .update({
        status: 'home',
      })
      .eq(
        'id',
        loan.book_id
      )

    if (user) {
      invalidateUserLibraryCaches(
        user.id
      )
    }

    await loadData()
  }

  const active =
    loans.filter(
      (loan) =>
        !loan.return_date
    )

  const history =
    loans.filter(
      (loan) =>
        loan.return_date
    )

  const available =
    books.filter(
      (book) =>
        book.status !==
        'loaned'
    )

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <ExLibrisLoader />
      </main>
    )
  }

  return (
    <main className="exl-page">

      <div className="max-w-4xl mx-auto px-5 pt-[calc(20px+env(safe-area-inset-top))] md:pt-10">

        <header className="flex items-start justify-between">

          <div>

            <p className="text-[#8e8e93] text-sm">
              Ex Libris
            </p>

            <h1 className="text-[38px] font-bold tracking-[-0.045em] leading-none mt-1">
              Prestiti
            </h1>

            <p className="text-[#8e8e93] mt-2">
              {active.length === 1
                ? '1 libro fuori casa'
                : `${active.length} libri fuori casa`}
            </p>

          </div>

          <button
            onClick={() =>
              setShowNew(
                !showNew
              )
            }
            className="w-11 h-11 exl-glass rounded-full flex items-center justify-center"
          >
            <Plus size={22} />
          </button>

        </header>

        {showNew && (
          <section className="exl-glass exl-card p-5 mt-5">

            <h2 className="text-lg font-bold">
              Nuovo prestito
            </h2>

            <div className="space-y-3 mt-4">

              <select
                value={bookId}
                onChange={(e) =>
                  setBookId(
                    e.target.value
                  )
                }
                className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none"
              >

                <option value="">
                  Seleziona libro
                </option>

                {available.map(
                  (book) => (
                    <option
                      key={
                        book.id
                      }
                      value={
                        book.id
                      }
                    >
                      {
                        book.title
                      }
                    </option>
                  )
                )}

              </select>

              <div className="bg-white/70 rounded-2xl flex items-center px-4">

                <UserRound
                  size={18}
                  className="text-[#8e8e93]"
                />

                <input
                  value={
                    borrower
                  }
                  onChange={(e) =>
                    setBorrower(
                      e.target.value
                    )
                  }
                  placeholder="Prestato a"
                  className="bg-transparent flex-1 px-3 py-4 outline-none"
                />

              </div>

              <div className="bg-white/70 rounded-2xl flex items-center px-4">

                <CalendarDays
                  size={18}
                  className="text-[#8e8e93]"
                />

                <input
                  type="date"
                  value={
                    expectedReturn
                  }
                  onChange={(e) =>
                    setExpectedReturn(
                      e.target.value
                    )
                  }
                  className="bg-transparent flex-1 px-3 py-4 outline-none"
                />

              </div>

              <input
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
                placeholder="Nota facoltativa"
                className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none"
              />

            </div>

            <button
              onClick={
                createLoan
              }
              disabled={
                saving ||
                !bookId ||
                !borrower.trim()
              }
              className="w-full bg-black text-white rounded-2xl py-4 font-semibold mt-4 disabled:opacity-40"
            >
              Registra prestito
            </button>

          </section>
        )}

        {error && (
          <p className="text-red-500 mt-4">
            {error}
          </p>
        )}

        <section className="mt-8">

          <h2 className="text-[22px] font-bold">
            Fuori casa
          </h2>

          {active.length === 0 ? (
            <div className="exl-glass exl-card p-8 text-center mt-4">

              <ArrowDownLeft
                size={34}
                className="mx-auto text-[#8e8e93]"
              />

              <p className="font-semibold mt-3">
                Tutti i libri sono a casa
              </p>

            </div>
          ) : (
            <div className="space-y-3 mt-4">

              {active.map(
                (loan) => (
                  <LoanCard
                    key={
                      loan.id
                    }
                    loan={
                      loan
                    }
                    active
                    onReturn={() =>
                      returnBook(
                        loan
                      )
                    }
                  />
                )
              )}

            </div>
          )}

        </section>

        {history.length > 0 && (
          <section className="mt-9">

            <h2 className="text-[22px] font-bold">
              Storico
            </h2>

            <div className="exl-glass exl-card overflow-hidden mt-4">

              {history.map(
                (
                  loan,
                  index
                ) => (
                  <LoanCard
                    key={
                      loan.id
                    }
                    loan={
                      loan
                    }
                    active={
                      false
                    }
                    bordered={
                      index > 0
                    }
                  />
                )
              )}

            </div>

          </section>
        )}

      </div>

    </main>
  )
}

function LoanCard({
  loan,
  active,
  onReturn,
  bordered = false,
}: {
  loan: Loan
  active: boolean
  onReturn?: () => void
  bordered?: boolean
}) {
  const book =
    loan.books

  const cover =
    book?.custom_cover_url ||
    book?.cover_url

  return (
    <div
      className={
        active
          ? 'exl-glass exl-card p-4 flex items-center gap-4'
          : `p-4 flex items-center gap-4 ${
              bordered
                ? 'border-t border-black/5'
                : ''
            }`
      }
    >

      <div className="w-12 h-[70px] rounded-[10px] bg-[#d1d1d6] overflow-hidden shrink-0">

        <BookCover
          title={book?.title ?? 'Libro'}
          authors={book?.authors}
          coverUrl={cover}
        />

      </div>

      <div className="min-w-0 flex-1">

        {book ? (
          <Link
            href={`/books/${book.id}`}
            className="font-semibold line-clamp-2"
          >
            {book.title}
          </Link>
        ) : (
          <p className="font-semibold">
            Libro
          </p>
        )}

        <p className="text-[#636366] text-sm mt-1">
          {loan.borrower_name}
        </p>

        <p className="text-[#8e8e93] text-xs mt-1">
          {loan.loan_date}
          {loan.return_date
            ? ` → ${loan.return_date}`
            : loan.expected_return_date
              ? ` · entro ${loan.expected_return_date}`
              : ''}
        </p>

      </div>

      {active && onReturn ? (
        <button
          onClick={
            onReturn
          }
          className="bg-white/70 rounded-full px-3 py-2 text-sm font-medium"
        >
          Restituito
        </button>
      ) : (
        <ChevronRight
          size={17}
          className="text-[#c7c7cc]"
        />
      )}

    </div>
  )
}
