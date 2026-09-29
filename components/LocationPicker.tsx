'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Archive,
  Box,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  House,
  LibraryBig,
  MapPin,
  SquareStack,
} from 'lucide-react'

import {
  motion,
} from 'framer-motion'

import AdaptiveGlassModal from '@/components/glass/AdaptiveGlassModal'

import {
  haptic,
} from '@/utils/haptics'

export type PickerLocation = {
  id: string
  name: string
  location_type: string
  parent_id: string | null
}

type Props = {
  locations: PickerLocation[]
  value: string
  onChange: (value: string) => void
  label?: string
}

export default function LocationPicker({
  locations,
  value,
  onChange,
  label = 'Posizione',
}: Props) {
  const [open, setOpen] =
    useState(false)

  const [currentParent, setCurrentParent] =
    useState<string | null>(null)

  const locationMap =
    useMemo(
      () =>
        new Map(
          locations.map(
            (location) => [
              location.id,
              location,
            ]
          )
        ),
      [locations]
    )

  function pathFor(
    id: string | null
  ) {
    if (!id) return []

    const path: PickerLocation[] = []

    let current =
      locationMap.get(id)

    let safety = 0

    while (
      current &&
      safety < 20
    ) {
      path.unshift(current)

      current =
        current.parent_id
          ? locationMap.get(
              current.parent_id
            )
          : undefined

      safety += 1
    }

    return path
  }

  const selectedPath =
    pathFor(value)

  const selectedLabel =
    selectedPath.length
      ? selectedPath
          .map(
            (location) =>
              location.name
          )
          .join(' · ')
      : 'Nessuna posizione'

  const currentLocation =
    currentParent
      ? locationMap.get(
          currentParent
        )
      : undefined

  const currentPath =
    pathFor(currentParent)

  const children =
    useMemo(() => {
      return locations
        .filter(
          (location) =>
            location.parent_id ===
            currentParent
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            'it',
            {
              sensitivity: 'base',
            }
          )
        )
    }, [
      locations,
      currentParent,
    ])

  function openPicker() {
    haptic('light')
    if (value) {
      const selected =
        locationMap.get(value)

      setCurrentParent(
        selected?.parent_id ??
          null
      )
    } else {
      setCurrentParent(null)
    }

    setOpen(true)
  }

  function closePicker() {
    setOpen(false)
  }

  function choose(
    id: string
  ) {
    haptic('success')
    onChange(id)
    setOpen(false)
  }

  function chooseNone() {
    haptic('light')
    onChange('')
    setOpen(false)
  }

  function goBack() {
    if (!currentLocation) {
      return
    }

    haptic('light')

    setCurrentParent(
      currentLocation.parent_id
    )
  }

  return (
    <>
      <div>

        <label className="text-xs text-[#8e8e93] ml-2">
          {label}
        </label>

        <button
          type="button"
          onClick={openPicker}
          className="w-full bg-white/70 rounded-2xl px-4 py-3.5 mt-1 flex items-center gap-3 text-left exl-press"
        >

          <div className="w-10 h-10 rounded-[13px] bg-[#5E7FA3]/12 flex items-center justify-center shrink-0">

            {value ? (
              <LocationTypeIcon
                type={
                  locationMap.get(
                    value
                  )?.location_type ??
                  'other'
                }
              />
            ) : (
              <MapPin
                size={19}
                className="text-[#5E7FA3]"
              />
            )}

          </div>

          <div className="flex-1 min-w-0">

            <p
              className={`text-[15px] leading-tight truncate ${
                value
                  ? 'font-medium'
                  : 'text-[#8e8e93]'
              }`}
            >
              {selectedLabel}
            </p>

            {value && (
              <p className="text-[#8e8e93] text-xs mt-1">
                Tocca per cambiare
              </p>
            )}

          </div>

          <ChevronRight
            size={18}
            className="text-[#c7c7cc] shrink-0"
          />

        </button>

      </div>

      <AdaptiveGlassModal
        open={open}
        onClose={closePicker}
        eyebrow="Biblioteca"
        title={
          currentLocation
            ? currentLocation.name
            : 'Scegli posizione'
        }
        maxWidth="580px"
      >

        <div className="px-4 pb-5">

          {/* HEADER CON BACK */}
          <div className="flex items-center gap-3 mt-1 mb-4">

            {currentParent && (
              <button
                type="button"
                onClick={goBack}
                className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center exl-press shrink-0"
                aria-label="Indietro"
              >
                <ChevronLeft
                  size={20}
                />
              </button>
            )}

            <div className="min-w-0">

              <p className="text-[#8e8e93] text-xs">
                Posizione del libro
              </p>

              <p className="font-semibold text-[15px] truncate mt-0.5">
                {currentLocation
                  ? typeName(
                      currentLocation.location_type
                    )
                  : 'Esplora la biblioteca'}
              </p>

            </div>

          </div>

          {/* BREADCRUMB */}
          {currentPath.length > 0 && (
            <div className="overflow-x-auto exl-scrollbar-none mb-4">

              <div className="flex items-center gap-1.5 whitespace-nowrap min-w-max">

                {currentPath.map(
                  (
                    location,
                    index
                  ) => (
                    <div
                      key={
                        location.id
                      }
                      className="flex items-center gap-1.5"
                    >

                      {index > 0 && (
                        <ChevronRight
                          size={12}
                          className="text-[#c7c7cc]"
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          haptic('light')

                          setCurrentParent(
                            location.id
                          )
                        }}
                        className="px-2.5 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-[#6e6e73] dark:text-[#d1d1d6] text-[11px] font-medium exl-press"
                      >
                        {
                          location.name
                        }
                      </button>

                    </div>
                  )
                )}

              </div>

            </div>
          )}

          {/* USA POSIZIONE CORRENTE */}
          {currentLocation && (
            <motion.button
              type="button"
              onClick={() =>
                choose(
                  currentLocation.id
                )
              }
              whileTap={{
                scale: 0.985,
              }}
              className="w-full bg-black text-white dark:bg-white dark:text-black rounded-[19px] px-4 py-4 flex items-center justify-center gap-2 font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.12)] exl-press mb-3"
            >
              <Check
                size={18}
              />

              Usa questa posizione
            </motion.button>
          )}

          {/* LISTA */}
          <motion.div
            key={
              currentParent ??
              'root'
            }
            initial={{
              opacity: 0,
              x: 12,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.2,
            }}
            className="rounded-[24px] overflow-hidden bg-white/45 dark:bg-white/[0.055] border border-white/45 dark:border-white/[0.07]"
          >

            {!currentParent && (
              <button
                type="button"
                onClick={
                  chooseNone
                }
                className="w-full px-4 py-4 flex items-center gap-4 text-left exl-press border-b border-black/5 dark:border-white/10"
              >

                <div className="w-11 h-11 rounded-[14px] bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">

                  <MapPin
                    size={20}
                    className="text-[#8e8e93]"
                  />

                </div>

                <div className="flex-1 min-w-0">

                  <p className="font-medium">
                    Nessuna posizione
                  </p>

                  <p className="text-[#8e8e93] text-xs mt-0.5">
                    Lascia il libro senza collocazione
                  </p>

                </div>

                {!value && (
                  <div className="w-7 h-7 rounded-full bg-[#5E7FA3]/12 flex items-center justify-center">

                    <Check
                      size={16}
                      className="text-[#5E7FA3]"
                    />

                  </div>
                )}

              </button>
            )}

            {children.map(
              (
                location,
                index
              ) => {
                const hasChildren =
                  locations.some(
                    item =>
                      item.parent_id ===
                      location.id
                  )

                const selected =
                  location.id ===
                  value

                return (
                  <motion.button
                    key={
                      location.id
                    }
                    type="button"
                    initial={{
                      opacity: 0,
                      y: 5,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      delay:
                        Math.min(
                          index *
                            0.025,
                          0.16
                        ),
                    }}
                    onClick={() => {
                      if (
                        hasChildren
                      ) {
                        haptic(
                          'light'
                        )

                        setCurrentParent(
                          location.id
                        )
                      } else {
                        choose(
                          location.id
                        )
                      }
                    }}
                    className={`w-full px-4 py-3.5 flex items-center gap-4 text-left exl-press ${
                      index > 0 ||
                      !currentParent
                        ? 'border-t border-black/5 dark:border-white/10'
                        : ''
                    }`}
                  >

                    <div className="w-11 h-11 rounded-[14px] bg-[#5E7FA3]/12 flex items-center justify-center shrink-0">

                      <LocationTypeIcon
                        type={
                          location.location_type
                        }
                      />

                    </div>

                    <div className="flex-1 min-w-0">

                      <p className="font-medium truncate">
                        {
                          location.name
                        }
                      </p>

                      <p className="text-[#8e8e93] text-xs mt-0.5">
                        {typeName(
                          location.location_type
                        )}

                        {hasChildren
                          ? ' · Esplora'
                          : ' · Seleziona'}
                      </p>

                    </div>

                    {selected ? (
                      <div className="w-7 h-7 rounded-full bg-[#5E7FA3]/12 flex items-center justify-center shrink-0">

                        <Check
                          size={16}
                          className="text-[#5E7FA3]"
                        />

                      </div>
                    ) : hasChildren ? (
                      <ChevronRight
                        size={18}
                        className="text-[#c7c7cc] shrink-0"
                      />
                    ) : null}

                  </motion.button>
                )
              }
            )}

          </motion.div>

          {children.length ===
            0 &&
            currentLocation && (
            <div className="text-center py-8">

              <div className="w-12 h-12 rounded-[16px] bg-black/5 dark:bg-white/10 mx-auto flex items-center justify-center">

                <MapPin
                  size={20}
                  className="text-[#8e8e93]"
                />

              </div>

              <p className="text-[#8e8e93] text-sm mt-3">
                Nessuna posizione al suo interno.
              </p>

              <p className="text-[#aeaeb2] text-xs mt-1">
                Puoi usare direttamente questa posizione.
              </p>

            </div>
          )}

        </div>

      </AdaptiveGlassModal>
    </>
  )
}

function typeName(
  type: string
) {
  switch (type) {
    case 'house':
      return 'Casa'
    case 'room':
      return 'Stanza'
    case 'bookcase':
      return 'Libreria'
    case 'shelf':
      return 'Ripiano'
    case 'box':
      return 'Scatola'
    default:
      return 'Posizione'
  }
}

function LocationTypeIcon({
  type,
}: {
  type: string
}) {
  const className =
    'text-[#5E7FA3]'

  switch (type) {
    case 'house':
      return (
        <House
          size={20}
          className={
            className
          }
        />
      )

    case 'room':
      return (
        <Building2
          size={20}
          className={
            className
          }
        />
      )

    case 'bookcase':
      return (
        <LibraryBig
          size={20}
          className={
            className
          }
        />
      )

    case 'shelf':
      return (
        <SquareStack
          size={20}
          className={
            className
          }
        />
      )

    case 'box':
      return (
        <Box
          size={20}
          className={
            className
          }
        />
      )

    default:
      return (
        <Archive
          size={20}
          className={
            className
          }
        />
      )
  }
}
