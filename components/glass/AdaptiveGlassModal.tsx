'use client'

import {
  ReactNode,
  useEffect,
  useState,
} from 'react'

import GlassDialog from './GlassDialog'
import GlassSheet from './GlassSheet'

type Props = {
  open: boolean
  onClose: () => void

  title?: string
  eyebrow?: string

  children: ReactNode

  maxWidth?: string
}

export default function AdaptiveGlassModal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  maxWidth = '560px',
}: Props) {
  const [
    mobile,
    setMobile,
  ] =
    useState(false)

  useEffect(() => {
    const media =
      window.matchMedia(
        '(max-width: 767px)'
      )

    function update() {
      setMobile(
        media.matches
      )
    }

    update()

    media.addEventListener(
      'change',
      update
    )

    return () =>
      media.removeEventListener(
        'change',
        update
      )
  }, [])

  if (mobile) {
    return (
      <GlassSheet
        open={open}
        onClose={onClose}
        title={title}
        eyebrow={eyebrow}
      >
        {children}
      </GlassSheet>
    )
  }

  return (
    <GlassDialog
      open={open}
      onClose={onClose}
      title={title}
      eyebrow={eyebrow}
      maxWidth={maxWidth}
    >
      {children}
    </GlassDialog>
  )
}
