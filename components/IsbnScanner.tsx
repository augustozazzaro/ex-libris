'use client'

import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  BrowserMultiFormatReader,
} from '@zxing/browser'

import {
  X,
  ScanBarcode,
  Camera,
} from 'lucide-react'

type Props = {
  onDetected: (
    isbn: string
  ) => void

  onClose: () => void
}

export default function IsbnScanner({
  onDetected,
  onClose,
}: Props) {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    )

  const [message, setMessage] =
    useState(
      'Avvio della fotocamera…'
    )

  useEffect(() => {
    let stopped = false

    let controls:
      | { stop: () => void }
      | null = null

    async function start() {
      try {
        const reader =
          new BrowserMultiFormatReader()

        if (!videoRef.current) {
          return
        }

        controls =
          await reader
            .decodeFromVideoDevice(
              undefined,
              videoRef.current,
              (result) => {
                if (
                  !result ||
                  stopped
                ) {
                  return
                }

                const raw =
                  result.getText()

                const cleaned =
                  raw.replace(
                    /[^0-9Xx]/g,
                    ''
                  )

                if (
                  cleaned.length === 13 ||
                  cleaned.length === 10
                ) {
                  stopped = true
                  controls?.stop()

                  onDetected(
                    cleaned
                  )
                }
              }
            )

        setMessage(
          'Allinea il codice a barre nel riquadro'
        )
      } catch (error) {
        console.error(error)

        setMessage(
          'Non riesco ad accedere alla fotocamera.'
        )
      }
    }

    start()

    return () => {
      stopped = true
      controls?.stop()
    }
  }, [onDetected])

  return (
    <div className="fixed inset-0 z-[100] bg-black">

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/18" />

      <div className="absolute top-0 left-0 right-0 pt-[calc(16px+env(safe-area-inset-top))] px-4 z-10">

        <div className="flex items-center justify-between">

          <div className="exl-glass rounded-full px-4 py-2.5 text-white flex items-center gap-2">

            <Camera
              size={17}
            />

            <span className="text-sm font-medium">
              Scanner ISBN
            </span>

          </div>

          <button
            onClick={onClose}
            className="exl-glass w-11 h-11 rounded-full text-white flex items-center justify-center"
          >
            <X size={22} />
          </button>

        </div>

      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

        <div className="relative w-[82%] max-w-[390px] h-[175px]">

          <div className="absolute inset-0 rounded-[26px] border border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.46)]" />

          <Corner className="top-0 left-0 border-l-4 border-t-4 rounded-tl-[26px]" />

          <Corner className="top-0 right-0 border-r-4 border-t-4 rounded-tr-[26px]" />

          <Corner className="bottom-0 left-0 border-l-4 border-b-4 rounded-bl-[26px]" />

          <Corner className="bottom-0 right-0 border-r-4 border-b-4 rounded-br-[26px]" />

          <div className="absolute left-5 right-5 top-1/2 h-[2px] bg-red-500/90 shadow-[0_0_10px_rgba(255,69,58,0.85)]" />

        </div>

      </div>

      <div className="absolute bottom-[calc(26px+env(safe-area-inset-bottom))] left-4 right-4">

        <div className="exl-glass rounded-[24px] px-5 py-4 max-w-md mx-auto text-white text-center">

          <ScanBarcode
            size={23}
            className="mx-auto mb-2"
          />

          <p className="text-sm font-medium">
            {message}
          </p>

          <p className="text-white/65 text-xs mt-1">
            Usa il codice ISBN sul retro del libro
          </p>

        </div>

      </div>

    </div>
  )
}

function Corner({
  className,
}: {
  className: string
}) {
  return (
    <span
      className={`absolute w-9 h-9 border-white ${className}`}
    />
  )
}
