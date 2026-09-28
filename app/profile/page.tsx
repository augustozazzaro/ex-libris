'use client'

import ExLibrisLoader from '@/components/ExLibrisLoader'

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'

import Link from 'next/link'

import {
  ArrowLeft,
  BookCheck,
  BookOpen,
  Bookmark,
  Camera,
  Check,
  ChevronRight,
  Flame,
  Heart,
  KeyRound,
  LogOut,
  Mail,
  Pencil,
  Target,
type LucideIcon
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'
import BookCover from '@/components/BookCover'

type StateRow = {
  book_id: string
  favorite: boolean
  reading_status: string
  read_at: string | null
}

type Book = {
  id: string
  title: string
  authors: string[] | null
  pages: number | null
  cover_url: string | null
  custom_cover_url: string | null
}

export default function ProfilePage() {
  const supabase = createClient()

  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')

  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [readingGoal, setReadingGoal] = useState(12)

  const [states, setStates] = useState<StateRow[]>([])
  const [books, setBooks] = useState<Book[]>([])

  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  async function loadProfile() {
    setLoading(true)
    setError('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError('Sessione non disponibile.')
      setLoading(false)
      return
    }

    setUserId(user.id)
    setEmail(user.email ?? '')

    const { data: profile } = await supabase
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

    if (profile) {
      setFullName(profile.full_name ?? '')
      setNickname(profile.nickname ?? '')
      setBio(profile.bio ?? '')
      setAvatarUrl(profile.avatar_url ?? '')
      setReadingGoal(profile.reading_goal ?? 12)
    }

    const { data: stateData } = await supabase
      .from('user_book_state')
      .select(`
        book_id,
        favorite,
        reading_status,
        read_at
      `)
      .eq('user_id', user.id)

    const rows = (stateData ?? []) as StateRow[]
    setStates(rows)

    const ids = rows.map((row) => row.book_id).filter(Boolean)

    if (ids.length > 0) {
      const { data: bookData } = await supabase
        .from('books')
        .select(`
          id,
          title,
          authors,
          pages,
          cover_url,
          custom_cover_url
        `)
        .in('id', ids)

      setBooks((bookData ?? []) as Book[])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const bookMap = useMemo(
    () => new Map(books.map((book) => [book.id, book])),
    [books]
  )

  const stats = useMemo(() => {
    const read = states.filter(
      (row) => row.reading_status === 'read'
    )

    const reading = states.filter(
      (row) => row.reading_status === 'reading'
    )

    const toRead = states.filter(
      (row) => row.reading_status === 'to_read'
    )

    const favorites = states.filter(
      (row) => row.favorite
    )

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    const readThisYear = read.filter((row) => {
      if (!row.read_at) return false
      return new Date(row.read_at).getFullYear() === year
    })

    const readThisMonth = read.filter((row) => {
      if (!row.read_at) return false

      const date = new Date(row.read_at)

      return (
        date.getFullYear() === year &&
        date.getMonth() === month
      )
    })

    const pages = read.reduce((total, row) => {
      return total + (bookMap.get(row.book_id)?.pages ?? 0)
    }, 0)

    const latestState = [...read]
      .filter((row) => row.read_at)
      .sort(
        (a, b) =>
          new Date(b.read_at!).getTime() -
          new Date(a.read_at!).getTime()
      )[0]

    return {
      read: read.length,
      reading: reading.length,
      toRead: toRead.length,
      favorites: favorites.length,
      readThisYear: readThisYear.length,
      readThisMonth: readThisMonth.length,
      pages,
      latestState,
    }
  }, [states, bookMap])

  const latestBook = stats.latestState
    ? bookMap.get(stats.latestState.book_id)
    : undefined

  const goalProgress =
    readingGoal > 0
      ? Math.min(
          100,
          Math.round((stats.readThisYear / readingGoal) * 100)
        )
      : 0

  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'EL'

  async function saveProfile() {
    if (!userId) return

    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        nickname: nickname.trim() || null,
        bio: bio.trim() || null,
        reading_goal: readingGoal,
      })
      .eq('id', userId)

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
      setEditing(false)

      setTimeout(() => {
        setSaved(false)
      }, 1500)
    }

    setSaving(false)
  }

  async function uploadAvatar(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file || !userId) return

    setUploading(true)
    setError('')

    const extension =
      file.name.split('.').pop()?.toLowerCase() || 'jpg'

    const path = `${userId}/avatar.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, {
        upsert: true,
        cacheControl: '3600',
      })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(path)

    const url = `${data.publicUrl}?v=${Date.now()}`

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: url,
      })
      .eq('id', userId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setAvatarUrl(url)
    }

    setUploading(false)
  }

  async function changePassword(
    event: FormEvent
  ) {
    event.preventDefault()

    setPasswordError('')
    setPasswordMessage('')

    if (newPassword.length < 8) {
      setPasswordError(
        'La nuova password deve avere almeno 8 caratteri.'
      )
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        'Le due nuove password non coincidono.'
      )
      return
    }

    if (!email) return

    setChangingPassword(true)

    const { error: verifyError } =
      await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })

    if (verifyError) {
      setPasswordError(
        'La password attuale non è corretta.'
      )
      setChangingPassword(false)
      return
    }

    const { error: updateError } =
      await supabase.auth.updateUser({
        password: newPassword,
      })

    if (updateError) {
      setPasswordError(updateError.message)
    } else {
      setPasswordMessage('Password aggiornata.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }

    setChangingPassword(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/'
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
      <div className="max-w-3xl mx-auto px-5 pt-[calc(16px+env(safe-area-inset-top))] md:pt-8">

        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="exl-glass w-11 h-11 rounded-full flex items-center justify-center exl-press"
          >
            <ArrowLeft size={20} />
          </Link>

          <button
            onClick={() => setEditing(!editing)}
            className="exl-glass w-11 h-11 rounded-full flex items-center justify-center exl-press"
            aria-label="Modifica profilo"
          >
            {editing ? <Check size={20} /> : <Pencil size={18} />}
          </button>
        </div>

        <section className="text-center mt-6">
          <div className="relative w-[112px] h-[112px] mx-auto">

            <div className="w-full h-full rounded-full overflow-hidden bg-[#5E7FA3] text-white flex items-center justify-center text-[32px] font-bold shadow-lg">
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

            <label className="absolute right-0 bottom-0 w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer exl-press">
              <Camera size={18} />

              <input
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                className="hidden"
              />
            </label>
          </div>

          {uploading && (
            <p className="text-[#8e8e93] text-xs mt-3">
              Caricamento foto…
            </p>
          )}

          <h1 className="text-[34px] font-bold tracking-[-0.045em] mt-5">
            {fullName || 'Il tuo profilo'}
          </h1>

          {nickname && (
            <p className="text-[#5E7FA3] font-semibold mt-1">
              @{nickname}
            </p>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[#8e8e93] text-sm mt-2">
            <Mail size={14} />
            <span>{email}</span>
          </div>

          {bio && !editing && (
            <p className="text-[#8e8e93] max-w-md mx-auto mt-4 leading-relaxed">
              {bio}
            </p>
          )}
        </section>

<section className="grid grid-cols-4 gap-2 mt-7">

  <Stat
    href="/my-books?filter=read"
    value={stats.read}
    label="Letti"
    icon={BookCheck}
  />

  <Stat
    href="/my-books?filter=reading"
    value={stats.reading}
    label="In lettura"
    icon={BookOpen}
  />

  <Stat
    href="/my-books?filter=to_read"
    value={stats.toRead}
    label="Da leggere"
    icon={Bookmark}
  />

  <Stat
    href="/my-books?filter=favorites"
    value={stats.favorites}
    label="Preferiti"
    icon={Heart}
  />

</section>

        <section className="exl-glass exl-card p-5 mt-5">
          <div className="flex justify-between gap-4">

            <div>
              <div className="flex items-center gap-2">
                <Target
                  size={20}
                  className="text-[#DDB342]"
                />

                <p className="font-semibold">
                  Obiettivo {new Date().getFullYear()}
                </p>
              </div>

              <p className="text-[31px] font-bold tracking-[-0.04em] mt-3">
                {stats.readThisYear}
                <span className="text-[#8e8e93] text-lg font-medium">
                  {' '}/ {readingGoal}
                </span>
              </p>
            </div>

            <span className="text-[#8e8e93] text-sm">
              {goalProgress}%
            </span>
          </div>

          <div className="h-2.5 bg-black/5 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full bg-[#DDB342] rounded-full transition-all"
              style={{
                width: `${goalProgress}%`,
              }}
            />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 mt-3">
          <MetricCard
            icon={BookCheck}
            color="#C76955"
            value={stats.pages.toLocaleString('it-IT')}
            label="pagine lette"
          />

          <MetricCard
            icon={Flame}
            color="#5E7FA3"
            value={String(stats.readThisMonth)}
            label="letti questo mese"
          />
        </section>

        {latestBook && (
          <Link
            href={`/books/${latestBook.id}`}
            className="exl-glass exl-card p-4 mt-3 flex items-center gap-4 exl-press"
          >
            <div className="w-12 h-[70px] rounded-[10px] overflow-hidden bg-[#d1d1d6] shrink-0">
              <BookCover
                title={latestBook.title}
                authors={latestBook.authors}
                coverUrl={
                  latestBook.custom_cover_url ||
                  latestBook.cover_url
                }
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[#8e8e93] text-[11px] uppercase tracking-[0.08em]">
                Ultimo libro letto
              </p>

              <p className="font-semibold mt-1 line-clamp-2">
                {latestBook.title}
              </p>

              {latestBook.authors?.[0] && (
                <p className="text-[#8e8e93] text-sm mt-1 truncate">
                  {latestBook.authors[0]}
                </p>
              )}
            </div>

            <ChevronRight
              size={18}
              className="text-[#c7c7cc]"
            />
          </Link>
        )}

        {editing && (
          <section className="exl-glass exl-card p-5 mt-6">

            <h2 className="font-bold text-lg">
              Modifica profilo
            </h2>

            <div className="space-y-3 mt-5">
              <ProfileField
                label="Nome"
                value={fullName}
                onChange={setFullName}
                placeholder="Nome e cognome"
              />

              <ProfileField
                label="Nickname"
                value={nickname}
                onChange={setNickname}
                placeholder="es. augusto"
              />

              <div>
                <label className="text-xs text-[#8e8e93] ml-2">
                  Bio
                </label>

                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Qualcosa sui tuoi gusti di lettura…"
                  className="w-full bg-white/70 rounded-2xl px-4 py-4 mt-1 outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-[#8e8e93] ml-2">
                  Obiettivo annuale
                </label>

                <input
                  type="number"
                  min="0"
                  max="999"
                  value={readingGoal}
                  onChange={(e) =>
                    setReadingGoal(Number(e.target.value))
                  }
                  className="w-full bg-white/70 rounded-2xl px-4 py-4 mt-1 outline-none"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm mt-4">
                {error}
              </p>
            )}

            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full bg-black text-white rounded-2xl py-4 font-semibold mt-5 exl-press"
            >
              {saved
                ? 'Salvato ✓'
                : saving
                  ? 'Salvataggio…'
                  : 'Salva modifiche'}
            </button>
          </section>
        )}

        <section className="mt-8">
          <p className="text-[#8e8e93] text-xs uppercase tracking-[0.08em] px-2 mb-2">
            Account
          </p>

          <div className="exl-glass exl-card overflow-hidden">

            <div className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-[13px] bg-[#5E7FA3]/15 flex items-center justify-center">
                <Mail
                  size={19}
                  className="text-[#5E7FA3]"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold">
                  Email
                </p>

                <p className="text-[#8e8e93] text-sm truncate">
                  {email}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowPassword(!showPassword)}
              className="w-full p-4 border-t border-black/5 flex items-center gap-4 text-left exl-press"
            >
              <div className="w-10 h-10 rounded-[13px] bg-[#DDB342]/15 flex items-center justify-center">
                <KeyRound
                  size={19}
                  className="text-[#DDB342]"
                />
              </div>

              <div className="flex-1">
                <p className="font-semibold">
                  Password
                </p>

                <p className="text-[#8e8e93] text-sm">
                  Modifica password
                </p>
              </div>

              <ChevronRight
                size={18}
                className="text-[#c7c7cc]"
              />
            </button>
          </div>
        </section>

        {showPassword && (
          <form
            onSubmit={changePassword}
            className="exl-glass exl-card p-5 mt-3"
          >
            <h2 className="font-bold text-lg">
              Cambia password
            </h2>

            <p className="text-[#8e8e93] text-sm mt-1">
              Conferma prima la password attuale.
            </p>

            <div className="space-y-3 mt-5">
              <PasswordInput
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="Password attuale"
              />

              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Nuova password"
              />

              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Conferma nuova password"
              />
            </div>

            {passwordError && (
              <p className="text-red-500 text-sm mt-4">
                {passwordError}
              </p>
            )}

            {passwordMessage && (
              <p className="text-[#34c759] text-sm mt-4">
                {passwordMessage}
              </p>
            )}

            <button
              disabled={changingPassword}
              className="w-full bg-black text-white rounded-2xl py-4 font-semibold mt-5"
            >
              {changingPassword
                ? 'Aggiornamento…'
                : 'Aggiorna password'}
            </button>

            <Link
              href="/recover"
              className="block text-center text-[#8e8e93] text-sm mt-4"
            >
              Non ricordi la password attuale?
            </Link>
          </form>
        )}

        <button
          onClick={logout}
          className="exl-glass exl-card w-full p-4 mt-6 mb-8 flex items-center justify-center gap-2 text-[#ff3b30] font-semibold exl-press"
        >
          <LogOut size={19} />
          Esci da Ex Libris
        </button>

      </div>
    </main>
  )
}

function Stat({
  href,
  value,
  label,
  icon: Icon,
}: {
  href: string
  value: number
  label: string
  icon: LucideIcon
}) {
  return (
    <Link
      href={href}
      className="exl-glass rounded-[20px] px-1 py-4 text-center exl-press"
    >
      <Icon
        size={17}
        className="mx-auto text-[#8e8e93]"
      />

      <p className="text-[21px] font-bold mt-2">
        {value}
      </p>

      <p className="text-[#8e8e93] text-[10px] mt-1 leading-tight">
        {label}
      </p>
    </Link>
  )
}

function MetricCard({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: LucideIcon
  color: string
  value: string
  label: string
}) {
  return (
    <div className="exl-glass exl-card p-5">
      <Icon
        size={22}
        style={{ color }}
      />

      <p className="text-[28px] font-bold tracking-[-0.03em] mt-5">
        {value}
      </p>

      <p className="text-[#8e8e93] text-sm mt-1">
        {label}
      </p>
    </div>
  )
}

function ProfileField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-xs text-[#8e8e93] ml-2">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/70 rounded-2xl px-4 py-4 mt-1 outline-none"
      />
    </div>
  )
}

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <input
      type="password"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      minLength={8}
      className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none"
      required
    />
  )
}
