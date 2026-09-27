'use client'

import {
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'

import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  LogOut,
  Plus,
  UserRound,
  UsersRound,
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'

type Member = {
  id: string
  role: string
  user_id: string

  profiles: {
    full_name: string | null
  } | null
}

export default function FamilyPage() {
  const supabase = createClient()

  const [familyId, setFamilyId] =
    useState('')

  const [familyName, setFamilyName] =
    useState('')

  const [role, setRole] =
    useState('')

  const [members, setMembers] =
    useState<Member[]>([])

  const [inviteCode, setInviteCode] =
    useState('')

  const [copied, setCopied] =
    useState(false)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  async function loadFamily() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: membership } =
      await supabase
        .from('family_members')
        .select(`
          family_id,
          role,
          families (
            name
          )
        `)
        .eq('user_id', user.id)
        .single()

    if (!membership) {
      setError(
        'Non sei associato a una biblioteca.'
      )

      setLoading(false)
      return
    }

    setFamilyId(
      membership.family_id
    )

    setRole(
      membership.role
    )

    const family =
      membership.families as unknown as
        | { name: string }
        | null

    setFamilyName(
      family?.name ??
        'Ex Libris'
    )

    const { data: memberData } =
      await supabase
        .from('family_members')
        .select(`
          id,
          role,
          user_id,
          profiles (
            full_name
          )
        `)
        .eq(
          'family_id',
          membership.family_id
        )
        .order('created_at')

    setMembers(
      (memberData ?? []) as unknown as Member[]
    )

    setLoading(false)
  }

  useEffect(() => {
    loadFamily()
  }, [])

  async function createInvite() {
    if (!familyId) return

    setError('')
    setInviteCode('')

    const {
      data,
      error,
    } = await supabase.rpc(
      'create_family_invite',
      {
        p_family_id:
          familyId,

        p_role:
          'member',
      }
    )

    if (error) {
      setError(
        error.message
      )
      return
    }

    setInviteCode(
      data
    )
  }

  async function copyInvite() {
    if (!inviteCode) return

    await navigator.clipboard.writeText(
      inviteCode
    )

    setCopied(true)

    setTimeout(
      () => setCopied(false),
      1500
    )
  }

  async function logout() {
    await supabase.auth.signOut()

    window.location.href = '/'
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-black/15 border-t-black rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="exl-page">

      <div className="max-w-3xl mx-auto px-5 pt-[calc(16px+env(safe-area-inset-top))] md:pt-8">

        <div className="flex items-center justify-between">

          <Link
            href="/"
            className="exl-glass w-11 h-11 rounded-full flex items-center justify-center"
          >
            <ArrowLeft
              size={20}
            />
          </Link>

          <button
            onClick={logout}
            className="exl-glass w-11 h-11 rounded-full flex items-center justify-center"
          >
            <LogOut
              size={19}
            />
          </button>

        </div>

        <header className="mt-7">

          <p className="text-[#8e8e93] text-sm">
            Ex Libris
          </p>

          <h1 className="text-[38px] font-bold tracking-[-0.045em] leading-none mt-1">
            Famiglia
          </h1>

          <p className="text-[#8e8e93] mt-2">
            {familyName}
          </p>

        </header>

        <section className="exl-glass exl-card overflow-hidden mt-7">

          <div className="p-5 flex items-center gap-3 border-b border-black/5">

            <UsersRound
              size={21}
            />

            <div>

              <p className="font-semibold">
                Membri
              </p>

              <p className="text-[#8e8e93] text-sm">
                {members.length}{' '}
                {members.length === 1
                  ? 'persona'
                  : 'persone'}
              </p>

            </div>

          </div>

          {members.map(
            (member, index) => (
              <div
                key={member.id}
                className={`p-4 flex items-center gap-4 ${
                  index > 0
                    ? 'border-t border-black/5'
                    : ''
                }`}
              >

                <div className="w-11 h-11 bg-black/5 rounded-full flex items-center justify-center">

                  <UserRound
                    size={20}
                  />

                </div>

                <div className="flex-1">

                  <p className="font-semibold">
                    {member.profiles
                      ?.full_name ||
                      'Membro della famiglia'}
                  </p>

                  <p className="text-[#8e8e93] text-sm mt-0.5">

                    {member.role ===
                    'admin'
                      ? 'Amministratore'
                      : 'Membro'}

                  </p>

                </div>

                {member.role ===
                  'admin' && (
                  <Crown
                    size={18}
                    className="text-[#ff9f0a]"
                  />
                )}

              </div>
            )
          )}

        </section>

        {role === 'admin' && (
          <section className="exl-glass exl-card p-5 mt-5">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 bg-black text-white rounded-[15px] flex items-center justify-center">

                <Plus
                  size={22}
                />

              </div>

              <div>

                <p className="font-semibold">
                  Invita un familiare
                </p>

                <p className="text-[#8e8e93] text-sm mt-0.5">
                  Genera un codice valido 7 giorni
                </p>

              </div>

            </div>

            {!inviteCode ? (

              <button
                onClick={
                  createInvite
                }
                className="w-full bg-black text-white rounded-2xl py-4 font-semibold mt-5"
              >
                Genera codice invito
              </button>

            ) : (

              <div className="mt-5">

                <p className="text-[#8e8e93] text-sm">
                  Codice invito
                </p>

                <button
                  onClick={
                    copyInvite
                  }
                  className="w-full bg-white/70 rounded-2xl px-5 py-5 mt-2 flex items-center justify-between"
                >

                  <span className="font-mono text-xl font-bold tracking-[0.14em]">
                    {inviteCode}
                  </span>

                  {copied ? (
                    <Check
                      size={20}
                      className="text-[#34c759]"
                    />
                  ) : (
                    <Copy
                      size={19}
                    />
                  )}

                </button>

                <p className="text-[#8e8e93] text-xs mt-3">
                  Condividi questo codice solo con un membro della famiglia.
                </p>

              </div>

            )}

          </section>
        )}

        {error && (
          <div className="exl-glass exl-card p-4 mt-5 text-red-500">
            {error}
          </div>
        )}

      </div>

    </main>
  )
}
