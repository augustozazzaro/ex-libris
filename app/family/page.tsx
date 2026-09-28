'use client'

import ExLibrisLoader from '@/components/ExLibrisLoader'

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
  KeyRound,
  Plus,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'

type Member = {
  id: string
  user_id: string
  role: string

  profiles: {
    full_name: string | null
    nickname: string | null
    avatar_url: string | null
  } | null
}

export default function FamilyPage() {
  const supabase = createClient()

  const [currentUserId, setCurrentUserId] =
    useState('')

  const [familyId, setFamilyId] =
    useState('')

  const [familyName, setFamilyName] =
    useState('Ex Libris')

  const [role, setRole] =
    useState('')

  const [members, setMembers] =
    useState<Member[]>([])

  const [inviteCode, setInviteCode] =
    useState('')

  const [recoveryCode, setRecoveryCode] =
    useState('')

  const [recoveryFor, setRecoveryFor] =
    useState('')

  const [copied, setCopied] =
    useState(false)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  async function loadFamily() {
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Sessione non disponibile.')
      setLoading(false)
      return
    }

    setCurrentUserId(user.id)

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
        .maybeSingle()

    if (!membership) {
      setError(
        'Non sei associato a una famiglia.'
      )
      setLoading(false)
      return
    }

    setFamilyId(membership.family_id)
    setRole(membership.role)

    const family =
      membership.families as unknown as
        | { name: string }
        | null

    setFamilyName(
      family?.name ?? 'Ex Libris'
    )

    const { data: memberData, error: memberError } =
      await supabase
        .from('family_members')
        .select(`
          id,
          user_id,
          role,
          profiles (
            full_name,
            nickname,
            avatar_url
          )
        `)
        .eq(
          'family_id',
          membership.family_id
        )
        .order('created_at')

    if (memberError) {
      setError(memberError.message)
    }

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

    const { data, error } =
      await supabase.rpc(
        'create_family_invite',
        {
          p_family_id: familyId,
          p_role: 'member',
        }
      )

    if (error) {
      setError(error.message)
      return
    }

    setInviteCode(data)
  }

  async function createRecoveryCode(
    member: Member
  ) {
    setError('')
    setRecoveryCode('')
    setRecoveryFor('')

    const { data, error } =
      await supabase.rpc(
        'create_password_reset_code',
        {
          p_target_user_id:
            member.user_id,
        }
      )

    if (error) {
      setError(error.message)
      return
    }

    setRecoveryCode(data)

    setRecoveryFor(
      member.profiles?.full_name ||
      member.profiles?.nickname ||
      'Membro'
    )
  }

  async function copyText(
    value: string
  ) {
    await navigator.clipboard.writeText(
      value
    )

    setCopied(true)

    setTimeout(
      () => setCopied(false),
      1500
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <ExLibrisLoader />
      </main>
    )
  }

  return (
    <main className="exl-page">

      <div className="max-w-2xl mx-auto px-5 pt-[calc(16px+env(safe-area-inset-top))] md:pt-8">

        <Link
          href="/settings"
          className="exl-glass w-11 h-11 rounded-full flex items-center justify-center exl-press"
        >
          <ArrowLeft size={20} />
        </Link>

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
              className="text-[#5E7FA3]"
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
            (member, index) => {
              const profile =
                member.profiles

              const isMe =
                member.user_id ===
                currentUserId

              const initials =
                (
                  profile?.full_name ||
                  profile?.nickname ||
                  'EL'
                )
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map(
                    (part) =>
                      part[0]?.toUpperCase()
                  )
                  .join('')

              return (
                <div
                  key={member.id}
                  className={`p-4 ${
                    index > 0
                      ? 'border-t border-black/5'
                      : ''
                  }`}
                >

                  <div className="flex items-center gap-4">

                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[#5E7FA3] text-white flex items-center justify-center font-bold shrink-0">

                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        initials
                      )}

                    </div>

                    <div className="flex-1 min-w-0">

                      <div className="flex items-center gap-2">

                        <p className="font-semibold truncate">
                          {profile?.full_name ||
                            'Membro della famiglia'}
                        </p>

                        {isMe && (
                          <span className="text-[10px] font-semibold bg-black/5 px-2 py-1 rounded-full">
                            Tu
                          </span>
                        )}

                      </div>

                      <div className="flex items-center gap-2 mt-0.5">

                        {profile?.nickname && (
                          <span className="text-[#8e8e93] text-sm">
                            @{profile.nickname}
                          </span>
                        )}

                        <span className="text-[#8e8e93] text-sm">
                          {member.role === 'admin'
                            ? 'Admin'
                            : 'Membro'}
                        </span>

                      </div>

                    </div>

                    {member.role === 'admin' ? (
                      <Crown
                        size={18}
                        className="text-[#DDB342]"
                      />
                    ) : (
                      <UserRound
                        size={18}
                        className="text-[#8e8e93]"
                      />
                    )}

                  </div>

                  {role === 'admin' &&
                    !isMe && (
                      <button
                        onClick={() =>
                          createRecoveryCode(
                            member
                          )
                        }
                        className="mt-4 ml-16 flex items-center gap-2 text-[#5E7FA3] text-sm font-semibold exl-press"
                      >
                        <KeyRound
                          size={16}
                        />
                        Genera codice recupero
                      </button>
                    )}

                </div>
              )
            }
          )}

        </section>

        {role === 'admin' && (
          <section className="exl-glass exl-card p-5 mt-5">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 bg-[#DDB342]/20 text-[#9B7415] rounded-[15px] flex items-center justify-center">

                <Plus size={22} />

              </div>

              <div>
                <p className="font-semibold">
                  Invita un familiare
                </p>

                <p className="text-[#8e8e93] text-sm mt-0.5">
                  Il codice rimane valido per 7 giorni
                </p>
              </div>

            </div>

            {!inviteCode ? (
              <button
                onClick={createInvite}
                className="w-full bg-black text-white rounded-2xl py-4 font-semibold mt-5 exl-press"
              >
                Genera codice invito
              </button>
            ) : (
              <CodeBox
                title="Codice invito"
                code={inviteCode}
                copied={copied}
                onCopy={() =>
                  copyText(inviteCode)
                }
              />
            )}

          </section>
        )}

        {recoveryCode && (
          <section className="exl-glass exl-card p-5 mt-5">

            <div className="flex items-center gap-3">

              <div className="w-11 h-11 bg-[#C76955]/15 text-[#C76955] rounded-[15px] flex items-center justify-center">

                <ShieldCheck
                  size={21}
                />

              </div>

              <div>
                <p className="font-semibold">
                  Recupero password
                </p>

                <p className="text-[#8e8e93] text-sm">
                  {recoveryFor}
                </p>
              </div>

            </div>

            <CodeBox
              title="Codice monouso"
              code={recoveryCode}
              copied={copied}
              onCopy={() =>
                copyText(
                  recoveryCode
                )
              }
            />

            <p className="text-[#8e8e93] text-xs mt-3 leading-relaxed">
              Valido per 15 minuti. Comunicalo direttamente alla persona interessata.
              Il codice non permette di vedere la password precedente.
            </p>

          </section>
        )}

        {error && (
          <div className="exl-glass exl-card p-4 mt-5 text-red-500 text-sm">
            {error}
          </div>
        )}

      </div>

    </main>
  )
}

function CodeBox({
  title,
  code,
  copied,
  onCopy,
}: {
  title: string
  code: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="mt-5">

      <p className="text-[#8e8e93] text-xs ml-1">
        {title}
      </p>

      <button
        onClick={onCopy}
        className="w-full bg-white/70 rounded-2xl px-5 py-5 mt-2 flex items-center justify-between gap-3 exl-press"
      >

        <span className="font-mono text-lg font-bold tracking-[0.12em] truncate">
          {code}
        </span>

        {copied ? (
          <Check
            size={20}
            className="text-[#34c759] shrink-0"
          />
        ) : (
          <Copy
            size={19}
            className="shrink-0"
          />
        )}

      </button>

    </div>
  )
}
