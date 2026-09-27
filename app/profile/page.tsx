'use client'

import {
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'

import {
  ArrowLeft,
  Camera,
  Check,
  Target,
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'

export default function ProfilePage() {
  const supabase = createClient()

  const [userId, setUserId] = useState('')
  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [readingGoal, setReadingGoal] = useState(12)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      setUserId(user.id)

      const { data } = await supabase
        .from('profiles')
        .select(`
          full_name,
          nickname,
          bio,
          avatar_url,
          reading_goal
        `)
        .eq('id', user.id)
        .maybeSingle()

      if (data) {
        setFullName(data.full_name ?? '')
        setNickname(data.nickname ?? '')
        setBio(data.bio ?? '')
        setAvatarUrl(data.avatar_url ?? '')
        setReadingGoal(data.reading_goal ?? 12)
      }

      setLoading(false)
    }

    load()
  }, [])

  async function saveProfile() {
    if (!userId) return

    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        nickname: nickname.trim() || null,
        bio: bio.trim() || null,
        reading_goal: readingGoal,
      })
      .eq('id', userId)

    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 1400)
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-black/15 border-t-black rounded-full animate-spin" />
      </main>
    )
  }

  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'EL'

  return (
    <main className="exl-page">
      <div className="max-w-xl mx-auto px-5 pt-[calc(16px+env(safe-area-inset-top))]">

        <Link
          href="/"
          className="exl-glass w-11 h-11 rounded-full flex items-center justify-center"
        >
          <ArrowLeft size={20} />
        </Link>

        <section className="text-center mt-7">

          <div className="relative w-28 h-28 mx-auto">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-[#5E7FA3] text-white flex items-center justify-center text-[34px] font-bold shadow-lg">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <div className="absolute -right-1 bottom-0 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-lg">
              <Camera size={18} />
            </div>
          </div>

          <h1 className="text-[32px] font-bold tracking-[-0.04em] mt-5">
            {fullName || 'Il tuo profilo'}
          </h1>

          {nickname && (
            <p className="text-[#5E7FA3] font-semibold mt-1">
              @{nickname}
            </p>
          )}

          {bio && (
            <p className="text-[#8e8e93] mt-3">
              {bio}
            </p>
          )}

        </section>

        <section className="exl-glass exl-card p-5 mt-7">

          <div className="flex items-center gap-2">
            <Target
              size={20}
              className="text-[#DDB342]"
            />

            <h2 className="font-bold text-lg">
              Il tuo profilo
            </h2>
          </div>

          <div className="space-y-3 mt-5">

            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome e cognome"
              className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none"
            />

            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nickname"
              className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none"
            />

            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Qualcosa sui tuoi gusti di lettura…"
              rows={3}
              className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none resize-none"
            />

            <input
              type="number"
              min="0"
              value={readingGoal}
              onChange={(e) => setReadingGoal(Number(e.target.value))}
              className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none"
            />

          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full bg-black text-white rounded-2xl py-4 font-semibold mt-5"
          >
            {saved ? (
              <span className="flex items-center justify-center gap-2">
                <Check size={18} />
                Salvato
              </span>
            ) : saving ? (
              'Salvataggio…'
            ) : (
              'Salva profilo'
            )}
          </button>

        </section>

      </div>
    </main>
  )
}
