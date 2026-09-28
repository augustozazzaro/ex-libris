'use client'

import {
  FormEvent,
  useState,
} from 'react'

import Link from 'next/link'

import {
  ArrowLeft,
  Check,
  KeyRound,
} from 'lucide-react'

export default function RecoverPage() {
  const [email, setEmail] =
    useState('')

  const [code, setCode] =
    useState('')

  const [
    newPassword,
    setNewPassword,
  ] = useState('')

  const [loading, setLoading] =
    useState(false)

  const [success, setSuccess] =
    useState(false)

  const [error, setError] =
    useState('')

  async function submit(
    event: FormEvent
  ) {
    event.preventDefault()

    setLoading(true)
    setError('')

    const response =
      await fetch(
        '/api/account/reset-password',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify({
              email,
              code,
              newPassword,
            }),
        }
      )

    const data =
      await response.json()

    if (!response.ok) {
      setError(
        data.error ??
          'Errore.'
      )

      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen px-5 pt-[calc(16px+env(safe-area-inset-top))]">

      <div className="max-w-sm mx-auto">

        <Link
          href="/"
          className="exl-glass w-11 h-11 rounded-full flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </Link>

        <div className="text-center mt-10">

          <div className="w-20 h-20 bg-black text-white rounded-[24px] mx-auto flex items-center justify-center shadow-xl">

            <KeyRound size={34} />

          </div>

          <h1 className="text-[34px] font-bold tracking-[-0.045em] mt-6">
            Recupera account
          </h1>

          <p className="text-[#8e8e93] mt-2">
            Usa il codice ricevuto da un amministratore.
          </p>

        </div>

        {success ? (

          <div className="exl-glass exl-card p-6 mt-8 text-center">

            <Check
              size={32}
              className="mx-auto text-[#34c759]"
            />

            <p className="font-semibold mt-3">
              Password aggiornata
            </p>

            <Link
              href="/"
              className="block bg-black text-white rounded-2xl py-4 font-semibold mt-5"
            >
              Accedi
            </Link>

          </div>

        ) : (

          <form
            onSubmit={submit}
            className="exl-glass exl-card p-5 mt-8 space-y-3"
          >

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              placeholder="Email account"
              className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none"
              required
            />

            <input
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value
                    .toUpperCase()
                )
              }
              placeholder="Codice recupero"
              className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none font-mono tracking-wider"
              required
            />

            <input
              type="password"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(
                  e.target.value
                )
              }
              placeholder="Nuova password"
              minLength={8}
              className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none"
              required
            />

            {error && (
              <p className="text-red-500 text-sm">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              className="w-full bg-black text-white rounded-2xl py-4 font-semibold disabled:opacity-40"
            >
              {loading
                ? 'Aggiornamento…'
                : 'Imposta nuova password'}
            </button>

          </form>

        )}

      </div>

    </main>
  )
}
