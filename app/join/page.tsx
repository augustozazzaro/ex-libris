'use client'

import {
  FormEvent,
  useState,
} from 'react'

import Link from 'next/link'

import {
  ArrowLeft,
  UserPlus,
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'

export default function JoinPage() {
  const supabase = createClient()

  const [name, setName] =
    useState('')

  const [email, setEmail] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [inviteCode, setInviteCode] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [message, setMessage] =
    useState('')

  const [error, setError] =
    useState('')

  async function signup(
    event: FormEvent
  ) {
    event.preventDefault()

    setLoading(true)
    setError('')
    setMessage('')

    localStorage.setItem(
      'exlibris_pending_invite',
      inviteCode.trim()
    )

    const {
      data,
      error: signupError,
    } = await supabase.auth.signUp({
      email:
        email.trim(),

      password,

      options: {
        data: {
          full_name:
            name.trim(),
        },
      },
    })

    if (signupError) {
      setError(
        signupError.message
      )

      setLoading(false)
      return
    }

    if (data.session) {
      const {
        error: inviteError,
      } = await supabase.rpc(
        'accept_family_invite',
        {
          p_code:
            inviteCode.trim(),
        }
      )

      if (inviteError) {
        setError(
          inviteError.message
        )

        setLoading(false)
        return
      }

      localStorage.removeItem(
        'exlibris_pending_invite'
      )

      window.location.href = '/'
      return
    }

    setMessage(
      'Account creato. Controlla la tua email per confermare l’indirizzo, poi accedi a Ex Libris.'
    )

    setLoading(false)
  }

  return (
    <main className="min-h-screen px-5 pt-[calc(16px+env(safe-area-inset-top))]">

      <div className="max-w-sm mx-auto">

        <Link
          href="/"
          className="exl-glass w-11 h-11 rounded-full flex items-center justify-center"
        >
          <ArrowLeft
            size={20}
          />
        </Link>

        <div className="mt-10 text-center">

          <div className="w-20 h-20 rounded-[24px] bg-black text-white mx-auto flex items-center justify-center shadow-xl">

            <UserPlus
              size={34}
            />

          </div>

          <h1 className="text-[36px] font-bold tracking-[-0.045em] mt-6">
            Entra in Ex Libris
          </h1>

          <p className="text-[#8e8e93] mt-2">
            Crea il tuo account personale
          </p>

        </div>

        <form
          onSubmit={signup}
          className="exl-glass exl-card p-5 mt-8 space-y-3"
        >

          <input
            value={name}
            onChange={(e) =>
              setName(
                e.target.value
              )
            }
            placeholder="Nome"
            className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none"
            required
          />

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            placeholder="Email"
            className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none"
            required
          />

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            placeholder="Password"
            minLength={6}
            className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none"
            required
          />

          <input
            value={inviteCode}
            onChange={(e) =>
              setInviteCode(
                e.target.value.toUpperCase()
              )
            }
            placeholder="Codice invito"
            className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none font-mono tracking-wider"
            required
          />

          {error && (
            <p className="text-red-500 text-sm">
              {error}
            </p>
          )}

          {message && (
            <p className="text-[#248a3d] text-sm">
              {message}
            </p>
          )}

          <button
            disabled={loading}
            className="w-full bg-black text-white rounded-2xl py-4 font-semibold disabled:opacity-40"
          >
            {loading
              ? 'Creazione account…'
              : 'Crea account'}
          </button>

        </form>

      </div>

    </main>
  )
}
