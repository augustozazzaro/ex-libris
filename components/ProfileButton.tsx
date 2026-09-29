'use client'

import {
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'

import {
  createClient,
} from '@/utils/supabase/client'

import {
  initialsFor,
  ProfileIdentity,
  readProfileIdentity,
  writeProfileIdentity,
} from '@/utils/profile-identity'

export default function ProfileButton() {
  const supabase =
    createClient()

  const cached =
    readProfileIdentity()

  const [avatar, setAvatar] =
    useState(
      cached?.avatarUrl ??
        ''
    )

  const [fullName, setFullName] =
    useState(
      cached?.fullName ??
        ''
    )

  useEffect(() => {
    function applyIdentity(
      event: Event
    ) {
      const custom =
        event as CustomEvent<
          ProfileIdentity
        >

      const value =
        custom.detail ??
        readProfileIdentity()

      if (!value) return

      setAvatar(
        value.avatarUrl
      )

      setFullName(
        value.fullName
      )
    }

    window.addEventListener(
      'exlibris-profile-change',
      applyIdentity
    )

    async function refresh() {
      const {
        data: { session },
      } =
        await supabase.auth
          .getSession()

      const user =
        session?.user

      if (!user) return

      const existing =
        readProfileIdentity()

      /*
       * Se abbiamo già l'identità
       * di questo utente, la UI è
       * immediatamente pronta.
       * Facciamo comunque refresh
       * silenzioso dal DB.
       */
      if (
        existing &&
        existing.userId ===
          user.id
      ) {
        const cachedIdentity =
          existing

        setAvatar(
          cachedIdentity.avatarUrl
        )

        setFullName(
          cachedIdentity.fullName
        )
      }

      const { data } =
        await supabase
          .from('profiles')
          .select(`
            full_name,
            avatar_url
          `)
          .eq(
            'id',
            user.id
          )
          .maybeSingle()

      if (!data) return

      const identity = {
        userId:
          user.id,

        fullName:
          data.full_name ??
          '',

        avatarUrl:
          data.avatar_url ??
          '',
      }

      writeProfileIdentity(
        identity
      )

      setAvatar(
        identity.avatarUrl
      )

      setFullName(
        identity.fullName
      )
    }

    refresh()

    return () =>
      window.removeEventListener(
        'exlibris-profile-change',
        applyIdentity
      )
  }, [])

  return (
    <Link
      href="/profile"
      prefetch
      aria-label="Profilo"
      className="w-11 h-11 rounded-full overflow-hidden bg-[#5E7FA3] text-white flex items-center justify-center font-bold shadow-sm exl-press border-2 border-white/70"
    >

      {avatar ? (
        <img
          src={avatar}
          alt=""
          decoding="async"
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-sm">
          {initialsFor(
            fullName
          )}
        </span>
      )}

    </Link>
  )
}
