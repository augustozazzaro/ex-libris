'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

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

export default function LoansPage() {
  const supabase = createClient()

  const [familyId, setFamilyId] = useState('')
  const [books, setBooks] = useState<Book[]>([])
  const [loans, setLoans] = useState<Loan[]>([])

  const [bookId, setBookId] = useState('')
  const [borrower, setBorrower] = useState('')
  const [expectedReturn, setExpectedReturn] = useState('')
  const [notes, setNotes] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Utente non autenticato.')
      setLoading(false)
      return
    }

    const { data: membership } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      setError('Biblioteca non trovata.')
      setLoading(false)
      return
    }

    setFamilyId(membership.family_id)

    const [bookResult, loanResult] =
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
          .eq('family_id', membership.family_id)
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
          .eq('family_id', membership.family_id)
          .order('loan_date', {
            ascending: false,
          }),
      ])

    if (bookResult.error || loanResult.error) {
      setError('Errore nel caricamento dei prestiti.')
      setLoading(false)
      return
    }

    setBooks(bookResult.data ?? [])
    setLoans((loanResult.data ?? []) as unknown as Loan[])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function createLoan() {
    if (!familyId || !bookId || !borrower.trim()) return

    setSaving(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Utente non autenticato.')
      setSaving(false)
      return
    }

    const { error: loanError } = await supabase
      .from('loans')
      .insert({
        family_id: familyId,
        book_id: bookId,
        borrower_name: borrower.trim(),
        expected_return_date: expectedReturn || null,
        notes: notes.trim() || null,
        created_by: user.id,
      })

    if (loanError) {
      setError(loanError.message)
      setSaving(false)
      return
    }

    const { error: bookError } = await supabase
      .from('books')
      .update({ status: 'loaned' })
      .eq('id', bookId)

    if (bookError) {
      setError(bookError.message)
      setSaving(false)
      return
    }

    setBookId('')
    setBorrower('')
    setExpectedReturn('')
    setNotes('')
    setSaving(false)

    await loadData()
  }

  async function returnBook(loan: Loan) {
    const today = new Date()
      .toISOString()
      .slice(0, 10)

    const { error: loanError } = await supabase
      .from('loans')
      .update({
        return_date: today,
      })
      .eq('id', loan.id)

    if (loanError) {
      setError(loanError.message)
      return
    }

    const { error: bookError } = await supabase
      .from('books')
      .update({
        status: 'home',
      })
      .eq('id', loan.book_id)

    if (bookError) {
      setError(bookError.message)
      return
    }

    await loadData()
  }

  const availableBooks =
    books.filter(
      (book) => book.status !== 'loaned'
    )

  const activeLoans =
    loans.filter(
      (loan) => !loan.return_date
    )

  const pastLoans =
    loans.filter(
      (loan) => loan.return_date
    )

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f5f1] flex items-center justify-center">
        Caricamento...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f6f5f1]">

      <div className="max-w-5xl mx-auto px-5 py-7">

        <div className="mb-8">

          <p className="text-sm text-gray-500">
            Circolazione
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Prestiti
          </h1>

          <p className="text-gray-500 mt-2">
            {activeLoans.length === 1
              ? '1 libro fuori casa'
              : `${activeLoans.length} libri fuori casa`}
          </p>

        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6">
            {error}
          </div>
        )}

        <section className="bg-white border rounded-3xl p-5 mb-8">

          <h2 className="text-lg font-semibold mb-5">
            Nuovo prestito
          </h2>

          <div className="grid md:grid-cols-2 gap-4">

            <div>
              <label className="block text-sm mb-2">
                Libro
              </label>

              <select
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 bg-white"
              >
                <option value="">
                  Seleziona un libro
                </option>

                {availableBooks.map((book) => (
                  <option
                    key={book.id}
                    value={book.id}
                  >
                    {book.title}
                    {book.authors?.[0]
                      ? ` — ${book.authors[0]}`
                      : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2">
                Prestato a
              </label>

              <input
                value={borrower}
                onChange={(e) => setBorrower(e.target.value)}
                placeholder="Nome"
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">
                Restituzione prevista
              </label>

              <input
                type="date"
                value={expectedReturn}
                onChange={(e) =>
                  setExpectedReturn(e.target.value)
                }
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">
                Nota
              </label>

              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Facoltativa"
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

          </div>

          <button
            onClick={createLoan}
            disabled={
              saving ||
              !bookId ||
              !borrower.trim()
            }
            className="mt-5 bg-black text-white rounded-xl px-6 py-3 font-semibold disabled:opacity-40"
          >
            {saving
              ? 'Salvataggio...'
              : 'Registra prestito'}
          </button>

        </section>

        <section>

          <h2 className="text-2xl font-bold mb-4">
            Fuori casa
          </h2>

          {activeLoans.length === 0 ? (
            <div className="bg-white border rounded-3xl p-8 text-center text-gray-500">
              Tutti i libri sono a casa.
            </div>
          ) : (
            <div className="space-y-3">

              {activeLoans.map((loan) => {

                const book = loan.books

                const cover =
                  book?.custom_cover_url ||
                  book?.cover_url

                return (
                  <div
                    key={loan.id}
                    className="bg-white border rounded-3xl p-4 flex items-center gap-4"
                  >

                    <div className="w-12 h-16 bg-[#ebe8df] rounded-lg overflow-hidden shrink-0">
                      {cover ? (
                        <img
                          src={cover}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          📖
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">

                      {book ? (
                        <Link
                          href={`/books/${book.id}`}
                          className="font-semibold"
                        >
                          {book.title}
                        </Link>
                      ) : (
                        <p className="font-semibold">
                          Libro
                        </p>
                      )}

                      <p className="text-sm text-gray-500 mt-1">
                        A {loan.borrower_name}
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        dal {loan.loan_date}
                        {loan.expected_return_date
                          ? ` · previsto ${loan.expected_return_date}`
                          : ''}
                      </p>

                    </div>

                    <button
                      onClick={() => returnBook(loan)}
                      className="border rounded-xl px-4 py-2 text-sm shrink-0"
                    >
                      Restituito
                    </button>

                  </div>
                )
              })}

            </div>
          )}

        </section>

        {pastLoans.length > 0 && (
          <section className="mt-10">

            <h2 className="text-xl font-bold mb-4">
              Storico
            </h2>

            <div className="bg-white border rounded-3xl divide-y">

              {pastLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="p-4"
                >
                  <p className="font-medium">
                    {loan.books?.title ?? 'Libro'}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    {loan.borrower_name}
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    {loan.loan_date} → {loan.return_date}
                  </p>
                </div>
              ))}

            </div>

          </section>
        )}

      </div>

    </main>
  )
}
