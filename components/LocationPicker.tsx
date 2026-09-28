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
  X,
} from 'lucide-react'

import {
  AnimatePresence,
  motion,
} from 'framer-motion'

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
    onChange(id)
    setOpen(false)
  }

  function chooseNone() {
    onChange('')
    setOpen(false)
  }

  function goBack() {
    if (!currentLocation) {
      return
    }

    setCurrentParent(
      currentLocation.parent_id
    )
  }

  useEffect(() => {
    if (!open) return

    const original =
      document.body.style.overflow

    document.body.style.overflow =
      'hidden'

    return () => {
      document.body.style.overflow =
        original
    }
  }, [open])

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

      <AnimatePresence>
        {open && (
          <>

            <motion.button
              type="button"
              aria-label="Chiudi"
              onClick={closePicker}
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="fixed inset-0 z-[90] bg-black/25 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{
                y: '100%',
              }}
              animate={{
                y: 0,
              }}
              exit={{
                y: '100%',
              }}
              transition={{
                type: 'spring',
                stiffness: 360,
                damping: 34,
              }}
              className="fixed left-0 right-0 bottom-0 z-[100] px-2 pb-2"
            >

              <div className="max-w-xl mx-auto bg-[#f5f3ee]/95 dark:bg-[#1c1c1e]/95 backdrop-blur-3xl rounded-[30px] shadow-[0_-12px_50px_rgba(0,0,0,0.18)] overflow-hidden pb-[env(safe-area-inset-bottom)]">

                <div className="w-10 h-1 rounded-full bg-black/15 dark:bg-white/20 mx-auto mt-3" />

                <div className="px-5 pt-4 pb-3 flex items-center justify-between">

                  <div className="flex items-center gap-3">

                    {currentParent && (
                      <button
                        type="button"
                        onClick={goBack}
                        className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center exl-press"
                      >
                        <ChevronLeft
                          size={20}
                        />
                      </button>
                    )}

                    <div>

                      <p className="text-[#8e8e93] text-xs">
                        Posizione del libro
                      </p>

                      <h2 className="text-[21px] font-bold tracking-[-0.025em] mt-0.5">
                        {currentLocation
                          ? currentLocation.name
                          : 'Scegli posizione'}
                      </h2>

                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={closePicker}
                    className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center exl-press"
                  >
                    <X size={18} />
                  </button>

                </div>

                {currentPath.length > 1 && (
                  <div className="px-5 pb-3 overflow-x-auto exl-scrollbar-none">

                    <div className="flex items-center gap-1.5 whitespace-nowrap">

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

                            {index >
                              0 && (
                              <ChevronRight
                                size={13}
                                className="text-[#c7c7cc]"
                              />
                            )}

                            <span className="text-[#8e8e93] text-xs">
                              {
                                location.name
                              }
                            </span>

                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}

                <div className="px-4 pb-4 max-h-[55vh] overflow-y-auto">

                  {currentLocation && (
                    <button
                      type="button"
                      onClick={() =>
                        choose(
                          currentLocation.id
                        )
                      }
                      className="w-full bg-black text-white rounded-[18px] px-4 py-4 flex items-center justify-center gap-2 font-semibold exl-press mb-3"
                    >
                      <Check
                        size={18}
                      />
                      Usa questa posizione
                    </button>
                  )}

                  <div className="bg-white/65 dark:bg-white/[0.07] rounded-[22px] overflow-hidden">

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

                        <div className="flex-1">

                          <p className="font-medium">
                            Nessuna posizione
                          </p>

                          <p className="text-[#8e8e93] text-xs mt-0.5">
                            Lascia il libro senza collocazione
                          </p>

                        </div>

                        {!value && (
                          <Check
                            size={18}
                            className="text-[#5E7FA3]"
                          />
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
                            (item) =>
                              item.parent_id ===
                              location.id
                          )

                        const selected =
                          location.id ===
                          value

                        return (
                          <button
                            key={
                              location.id
                            }
                            type="button"
                            onClick={() => {
                              if (
                                hasChildren
                              ) {
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
                                  ? ' · Apri'
                                  : ' · Seleziona'}
                              </p>

                            </div>

                            {selected ? (
                              <Check
                                size={19}
                                className="text-[#5E7FA3] shrink-0"
                              />
                            ) : hasChildren ? (
                              <ChevronRight
                                size={18}
                                className="text-[#c7c7cc] shrink-0"
                              />
                            ) : null}

                          </button>
                        )
                      }
                    )}

                  </div>

                  {children.length ===
                    0 &&
                    currentLocation && (
                    <p className="text-center text-[#8e8e93] text-sm py-7">
                      Nessuna posizione al suo interno.
                    </p>
                  )}

                </div>

              </div>

            </motion.div>

          </>
        )}
      </AnimatePresence>
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
