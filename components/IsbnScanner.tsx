'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

type Props = {
  onDetected: (isbn: string) => void
  onClose: () => void
}

export default function IsbnScanner({
  onDetected,
  onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [message, setMessage] = useState(
    'Avvio della fotocamera...'
  )

  useEffect(() => {
    let stopped = false
    let controls: { stop: () => void } | null = null

    async function startScanner() {
      try {
        const reader = new BrowserMultiFormatReader()

        if (!videoRef.current) return

        controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (!result || stopped) return

            const raw = result.getText()
            const cleaned = raw.replace(/[^0-9Xx]/g, '')

            if (
              cleaned.length === 13 ||
              cleaned.length === 10
            ) {
              stopped = true
              controls?.stop()
              onDetected(cleaned)
            }
          }
        )

        setMessage(
          'Inquadra il codice a barre sul retro del libro'
        )
      } catch (error) {
        console.error(error)

        setMessage(
          'Non riesco ad accedere alla fotocamera. Controlla i permessi del browser.'
        )
      }
    }

    startScanner()

    return () => {
      stopped = true
      controls?.stop()
    }
  }, [onDetected])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">

      <div className="flex items-center justify-between px-5 py-4 text-white">

        <div>
          <p className="text-xs uppercase tracking-widest text-white/60">
            Scanner ISBN
          </p>

          <h2 className="font-semibold">
            Inquadra il codice a barre
          </h2>
        </div>

        <button
          onClick={onClose}
          className="bg-white/15 rounded-full px-4 py-2"
        >
          Chiudi
        </button>

      </div>

      <div className="relative flex-1 overflow-hidden">

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

          <div className="w-[82%] max-w-md h-40 border-2 border-white rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />

        </div>

      </div>

      <div className="text-center text-white px-6 py-6 bg-black">
        <p className="text-sm text-white/80">
          {message}
        </p>
      </div>

    </div>
  )
}
