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
  BarcodeFormat,
  DecodeHintType,
} from '@zxing/library'

import {
  X,
  ScanBarcode,
  Camera,
  Zap,
} from 'lucide-react'

type Props = {
  onDetected: (
    isbn: string
  ) => void

  onClose: () => void
}

function isValidISBN13(
  isbn: string
) {
  if (!/^\d{13}$/.test(isbn)) {
    return false
  }

  const sum = isbn
    .slice(0, 12)
    .split('')
    .reduce(
      (acc, digit, index) =>
        acc +
        Number(digit) *
          (index % 2 === 0
            ? 1
            : 3),
      0
    )

  const check =
    (10 - (sum % 10)) % 10

  return (
    check ===
    Number(isbn[12])
  )
}

function isValidISBN10(
  isbn: string
) {
  if (
    !/^\d{9}[\dXx]$/.test(
      isbn
    )
  ) {
    return false
  }

  let sum = 0

  for (
    let index = 0;
    index < 10;
    index++
  ) {
    const char =
      isbn[index]

    const value =
      index === 9 &&
      /[Xx]/.test(char)
        ? 10
        : Number(char)

    sum +=
      value *
      (10 - index)
  }

  return (
    sum % 11 === 0
  )
}

function isValidISBN(
  value: string
) {
  return (
    isValidISBN13(value) ||
    isValidISBN10(value)
  )
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
      'Avvio fotocamera…'
    )

  const [torchAvailable, setTorchAvailable] =
    useState(false)

  const [torchOn, setTorchOn] =
    useState(false)

  const trackRef =
    useRef<MediaStreamTrack | null>(
      null
    )

  useEffect(() => {
    let stopped = false

    let controls:
      | { stop: () => void }
      | null = null

    async function start() {
      try {
        const hints =
          new Map<
            DecodeHintType,
            unknown
          >()

        hints.set(
          DecodeHintType.POSSIBLE_FORMATS,
          [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
          ]
        )

        hints.set(
          DecodeHintType.TRY_HARDER,
          true
        )

        const reader =
          new BrowserMultiFormatReader(
            hints,
            {
              delayBetweenScanAttempts:
                100,
              delayBetweenScanSuccess:
                500,
            }
          )

        if (!videoRef.current) {
          return
        }

        const constraints:
          MediaStreamConstraints =
          {
            audio: false,

            video: {
              facingMode: {
                ideal:
                  'environment',
              },

              width: {
                ideal: 1920,
              },

              height: {
                ideal: 1080,
              },

              frameRate: {
                ideal: 30,
              },
            },
          }

        controls =
          await reader.decodeFromConstraints(
            constraints,
            videoRef.current,
            (
              result,
              _error,
              controlsFromCallback
            ) => {
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
                !isValidISBN(
                  cleaned
                )
              ) {
                setMessage(
                  'Codice letto, ma non è un ISBN valido. Continua a inquadrare.'
                )

                return
              }

              stopped = true

              controlsFromCallback.stop()

              if (
                'vibrate' in
                navigator
              ) {
                navigator.vibrate(
                  80
                )
              }

              onDetected(
                cleaned
              )
            }
          )

        const stream =
          videoRef.current.srcObject as
            | MediaStream
            | null

        const track =
          stream
            ?.getVideoTracks()
            ?.[0]

        if (track) {
          trackRef.current =
            track

          const capabilities =
            track.getCapabilities?.() as
              | MediaTrackCapabilities
              | undefined

          if (
            capabilities &&
            'torch' in capabilities
          ) {
            setTorchAvailable(
              true
            )
          }
        }

        setMessage(
          'Avvicina il barcode al riquadro e tienilo fermo'
        )
      } catch (error) {
        console.error(error)

        setMessage(
          'Non riesco ad accedere alla fotocamera. Controlla i permessi.'
        )
      }
    }

    start()

    return () => {
      stopped = true

      controls?.stop()

      const stream =
        videoRef.current?.srcObject as
          | MediaStream
          | null

      stream
        ?.getTracks()
        .forEach((track) =>
          track.stop()
        )
    }
  }, [onDetected])

  async function toggleTorch() {
    const track =
      trackRef.current

    if (!track) return

    try {
      await track.applyConstraints({
        advanced: [
          {
            torch:
              !torchOn,
          } as MediaTrackConstraintSet,
        ],
      })

      setTorchOn(
        !torchOn
      )
    } catch {
      setTorchAvailable(
        false
      )
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black">

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/10" />

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

          <div className="flex gap-2">

            {torchAvailable && (
              <button
                onClick={
                  toggleTorch
                }
                className={`exl-glass w-11 h-11 rounded-full flex items-center justify-center ${
                  torchOn
                    ? 'text-yellow-300'
                    : 'text-white'
                }`}
              >
                <Zap
                  size={20}
                  fill={
                    torchOn
                      ? 'currentColor'
                      : 'none'
                  }
                />
              </button>
            )}

            <button
              onClick={
                onClose
              }
              className="exl-glass w-11 h-11 rounded-full text-white flex items-center justify-center"
            >
              <X
                size={22}
              />
            </button>

          </div>

        </div>

      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

        <div className="relative w-[88%] max-w-[430px] h-[145px]">

          <div className="absolute inset-0 rounded-[24px] border border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.40)]" />

          <Corner className="top-0 left-0 border-l-4 border-t-4 rounded-tl-[24px]" />

          <Corner className="top-0 right-0 border-r-4 border-t-4 rounded-tr-[24px]" />

          <Corner className="bottom-0 left-0 border-l-4 border-b-4 rounded-bl-[24px]" />

          <Corner className="bottom-0 right-0 border-r-4 border-b-4 rounded-br-[24px]" />

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
            Per i libri moderni cerca soprattutto il codice EAN-13 che inizia con 978 o 979
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
