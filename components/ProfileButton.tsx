'use client'

import {
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'

import { createClient } from '@/utils/supabase/client'

export default function ProfileButton() {
  const supabase = createClient()

  const [avatar, setAvatar] =
    useState('')

  const [initials, setInitials] =
    useState('EL')

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data } =
        await supabase
          .from('profiles')
          .select(`
            full_name,
            avatar_url
          `)
          .eq('id', user.id)
          .single()

      if (!data) return

      setAvatar(
        data.avatar_url ?? ''
      )

      const value =
        data.full_name
          ?.split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map(
            (part: string) =>
              part[0]?.toUpperCase()
          )
          .join('')

      if (value) {
        setInitials(value)
      }
    }

    load()
  }, [])

  return (
    <Link
      href="/profile"
      aria-label="Profilo"
      className="w-11 h-11 rounded-full overflow-hidden bg-[#5E7FA3] text-white flex items-center justify-center font-bold shadow-sm exl-press border-2 border-white/70"
    >

      {avatar ? (
        <img
          src={avatar}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-sm">
          {initials}
        </span>
      )}

    </Link>
  )
}
