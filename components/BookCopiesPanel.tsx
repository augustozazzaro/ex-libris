'use client'

import {
  useEffect,
  useState,
} from 'react'

import {
  ArrowUpRight,
  BookCheck,
  Check,
  ChevronRight,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react'

import {
  AnimatePresence,
  motion,
} from 'framer-motion'

import {
  useRouter,
} from 'next/navigation'

import {
  createClient,
} from '@/utils/supabase/client'

import {
  removeCaches,
} from '@/utils/exlibris-cache'

import {
  haptic,
} from '@/utils/haptics'

import {
  buildLocationPath,
  LocationItem,
} from '@/utils/location-path'

import LocationPicker from '@/components/LocationPicker'
import ExLibrisConfirmDialog from '@/components/ExLibrisConfirmDialog'
import AdaptiveGlassModal from '@/components/glass/AdaptiveGlassModal'

type Copy = {
  id: string
  copy_number: number | null
  location_id: string | null
  status: string
}

type Props = {
  familyId: string
  editionKey: string
  currentBookId: string
  locations: LocationItem[]
  onChanged?: () => void
}

export default function BookCopiesPanel({
  familyId,
  editionKey,
  currentBookId,
  locations,
  onChanged,
}: Props) {
  const supabase =
    createClient()

  const router =
    useRouter()

  const [copies, setCopies] =
    useState<Copy[]>([])

  const [
    editingCopy,
    setEditingCopy,
  ] =
    useState<Copy | null>(
      null
    )

  const [
    editingLocation,
    setEditingLocation,
  ] =
    useState('')

  const [
    copyToDelete,
    setCopyToDelete,
  ] =
    useState<Copy | null>(
      null
    )

  const [
    blockedCopy,
    setBlockedCopy,
  ] =
    useState<Copy | null>(
      null
    )

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  async function loadCopies() {
    const {
      data,
      error,
    } =
      await supabase
        .from('books')
        .select(`
          id,
          copy_number,
          location_id,
          status
        `)
        .eq(
          'family_id',
          familyId
        )
        .eq(
          'edition_key',
          editionKey
        )
        .order(
          'copy_number',
          {
            ascending: true,
          }
        )

    if (error) {
      setError(
        error.message
      )
      return
    }

    setCopies(
      (data ?? []) as Copy[]
    )
  }

  useEffect(() => {
    loadCopies()
  }, [
    familyId,
    editionKey,
  ])

  function startEditing(
    copy: Copy
  ) {
    haptic('light')

    setEditingCopy(
      copy
    )

    setEditingLocation(
      copy.location_id ?? ''
    )
  }

  function closeEditor() {
    setEditingCopy(null)
    setEditingLocation('')
    setError('')
  }

  async function saveLocation() {
    if (!editingCopy) {
      return
    }

    const copy =
      editingCopy

    setSaving(true)
    setError('')

    const {
      error,
    } =
      await supabase
        .from('books')
        .update({
          location_id:
            editingLocation ||
            null,
        })
        .eq(
          'id',
          copy.id
        )

    if (error) {
      setError(
        error.message
      )

      haptic('error')
      setSaving(false)
      return
    }

    const {
      data: { user },
    } =
      await supabase.auth
        .getUser()

    if (user) {
      removeCaches([
        `home:${user.id}`,
        `catalog:${user.id}`,
        `shuffle:${user.id}`,
        `book:${user.id}:${copy.id}`,
        `book:${user.id}:${currentBookId}`,
      ])
    }

    haptic('success')

    closeEditor()

    setSaving(false)

    await loadCopies()

    if (
      copy.id ===
      currentBookId
    ) {
      onChanged?.()
    }
  }

  function requestDelete(
    copy: Copy
  ) {
    haptic('light')

    if (
      copy.status ===
      'loaned'
    ) {
      setBlockedCopy(
        copy
      )

      return
    }

    setCopyToDelete(
      copy
    )
  }

  async function deleteCopy() {
    if (!copyToDelete) {
      return
    }

    const copy =
      copyToDelete

    setCopyToDelete(null)
    setSaving(true)
    setError('')

    const remaining =
      copies.filter(
        item =>
          item.id !==
          copy.id
      )

    const {
      error,
    } =
      await supabase
        .from('books')
        .delete()
        .eq(
          'id',
          copy.id
        )

    if (error) {
      setError(
        error.message
      )

      haptic('error')
      setSaving(false)
      return
    }

    const {
      data: { user },
    } =
      await supabase.auth
        .getUser()

    if (user) {
      removeCaches([
        `home:${user.id}`,
        `catalog:${user.id}`,
        `profile:${user.id}`,
        `shuffle:${user.id}`,
        `book:${user.id}:${copy.id}`,
        `book:${user.id}:${currentBookId}`,
      ])
    }

    haptic('success')

    if (
      copy.id ===
      currentBookId
    ) {
      const next =
        remaining[0]

      if (next) {
        router.replace(
          `/books/${next.id}`
        )
      } else {
        router.replace('/')
      }

      router.refresh()
      return
    }

    setSaving(false)

    await loadCopies()

    onChanged?.()
  }

  if (
    copies.length <= 1
  ) {
    return null
  }

  return (
    <>
      <section className="mt-5">

        <div className="flex items-end justify-between gap-4 px-1">

          <div>

            <p className="text-[#8e8e93] text-[11px] uppercase tracking-[0.08em]">
              Biblioteca
            </p>

            <h2 className="font-bold text-[20px] tracking-[-0.025em] mt-1">
              Le tue copie
            </h2>

          </div>

          <div className="h-8 px-3 rounded-full bg-black/[0.045] dark:bg-white/[0.08] flex items-center text-[#8e8e93] text-xs font-semibold">
            {copies.length}{' '}
            copie
          </div>

        </div>

        <div className="space-y-2.5 mt-4">

          <AnimatePresence
            initial={false}
          >
            {copies.map(
              (
                copy,
                index
              ) => {
                const isCurrent =
                  copy.id ===
                  currentBookId

                const location =
                  buildLocationPath(
                    copy.location_id,
                    locations
                  )

                const loaned =
                  copy.status ===
                  'loaned'

                return (
                  <motion.article
                    layout
                    key={
                      copy.id
                    }
                    initial={{
                      opacity: 0,
                      y: 8,
                      scale:
                        0.985,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      x: -20,
                      scale:
                        0.97,
                    }}
                    transition={{
                      delay:
                        Math.min(
                          index *
                            0.035,
                          0.15
                        ),
                      type:
                        'spring',
                      stiffness:
                        320,
                      damping:
                        29,
                    }}
                    className={`relative overflow-hidden rounded-[24px] border ${
                      isCurrent
                        ? 'border-[#5E7FA3]/25 bg-[#5E7FA3]/[0.065]'
                        : 'border-white/45 dark:border-white/[0.07] bg-white/48 dark:bg-white/[0.055]'
                    } backdrop-blur-[18px]`}
                  >

                    {isCurrent && (
                      <div className="absolute inset-y-0 left-0 w-[3px] bg-[#5E7FA3]" />
                    )}

                    <div className="p-4 flex items-center gap-3.5">

                      <div
                        className={`w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 ${
                          loaned
                            ? 'bg-[#C76955]/12 text-[#C76955]'
                            : 'bg-[#5E7FA3]/12 text-[#5E7FA3]'
                        }`}
                      >
                        {loaned ? (
                          <ArrowUpRight
                            size={21}
                          />
                        ) : (
                          <BookCheck
                            size={21}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">

                        <div className="flex items-center gap-2 flex-wrap">

                          <p className="font-bold tracking-[-0.015em]">
                            Copia{' '}
                            {copy.copy_number ??
                              index +
                                1}
                          </p>

                          {isCurrent && (
                            <span className="rounded-full bg-[#5E7FA3] text-white px-2 py-1 text-[9px] leading-none font-bold uppercase tracking-[0.07em]">
                              Questa
                            </span>
                          )}

                        </div>

                        <div
                          className={`flex items-center gap-1.5 mt-1.5 text-[12px] font-medium ${
                            loaned
                              ? 'text-[#C76955]'
                              : 'text-[#5E7FA3]'
                          }`}
                        >
                          {loaned ? (
                            <ArrowUpRight
                              size={12}
                            />
                          ) : (
                            <Check
                              size={12}
                            />
                          )}

                          {loaned
                            ? 'In prestito'
                            : 'In biblioteca'}
                        </div>

                        <div className="flex items-center gap-1.5 mt-1.5 text-[#8e8e93] text-[12px]">

                          <MapPin
                            size={12}
                            className="shrink-0"
                          />

                          <span className="truncate">
                            {location ||
                              'Posizione non indicata'}
                          </span>

                        </div>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          startEditing(
                            copy
                          )
                        }
                        className="w-10 h-10 rounded-full bg-black/[0.045] dark:bg-white/[0.09] flex items-center justify-center shrink-0 exl-press"
                        aria-label={`Gestisci copia ${copy.copy_number ?? index + 1}`}
                      >
                        <ChevronRight
                          size={18}
                          className="text-[#8e8e93]"
                        />
                      </button>

                    </div>

                  </motion.article>
                )
              }
            )}
          </AnimatePresence>

        </div>

        {error &&
          !editingCopy && (
          <p className="text-[#ff3b30] text-sm mt-3 px-1">
            {error}
          </p>
        )}

      </section>

      <AdaptiveGlassModal
        open={
          Boolean(
            editingCopy
          )
        }
        onClose={
          closeEditor
        }
        eyebrow="Biblioteca"
        title={
          editingCopy
            ? `Copia ${editingCopy.copy_number ?? 1}`
            : 'Gestisci copia'
        }
        maxWidth="520px"
      >

        {editingCopy && (
          <div className="px-5 pb-5">

            <div className="flex items-center gap-3 py-2">

              <div
                className={`w-12 h-12 rounded-[16px] flex items-center justify-center ${
                  editingCopy.status ===
                  'loaned'
                    ? 'bg-[#C76955]/12 text-[#C76955]'
                    : 'bg-[#5E7FA3]/12 text-[#5E7FA3]'
                }`}
              >
                {editingCopy.status ===
                'loaned' ? (
                  <ArrowUpRight
                    size={21}
                  />
                ) : (
                  <BookCheck
                    size={21}
                  />
                )}
              </div>

              <div>

                <p className="font-semibold">
                  {editingCopy.status ===
                  'loaned'
                    ? 'In prestito'
                    : 'In biblioteca'}
                </p>

                <p className="text-[#8e8e93] text-xs mt-0.5">
                  Gestisci questa copia fisica
                </p>

              </div>

            </div>

            <div className="mt-4 rounded-[22px] bg-black/[0.025] dark:bg-white/[0.05] border border-black/[0.025] dark:border-white/[0.06] p-3">

              <LocationPicker
                locations={
                  locations
                }
                value={
                  editingLocation
                }
                onChange={
                  setEditingLocation
                }
              />

              <button
                type="button"
                disabled={
                  saving
                }
                onClick={
                  saveLocation
                }
                className="w-full bg-black text-white dark:bg-white dark:text-black rounded-[18px] py-3.5 font-semibold mt-3 exl-press disabled:opacity-50"
              >
                {saving
                  ? 'Salvataggio…'
                  : 'Salva posizione'}
              </button>

            </div>

            {error && (
              <p className="text-[#ff3b30] text-sm mt-4 px-1">
                {error}
              </p>
            )}

            <div className="h-px bg-black/5 dark:bg-white/10 mt-5" />

            <button
              type="button"
              onClick={() => {
                const copy =
                  editingCopy

                closeEditor()

                window.setTimeout(
                  () =>
                    requestDelete(
                      copy
                    ),
                  180
                )
              }}
              className="w-full min-h-[48px] mt-3 rounded-[17px] text-[#ff3b30] font-semibold flex items-center justify-center gap-2 exl-press"
            >
              <Trash2
                size={17}
              />

              Elimina questa copia
            </button>

          </div>
        )}

      </AdaptiveGlassModal>

      <ExLibrisConfirmDialog
        open={
          Boolean(
            copyToDelete
          )
        }
        title="Eliminare questa copia?"
        message={
          copyToDelete
            ? `La copia ${copyToDelete.copy_number ?? ''} verrà eliminata. Le altre copie della stessa edizione resteranno nella biblioteca.`
            : ''
        }
        confirmLabel="Elimina copia"
        destructive
        onCancel={() =>
          setCopyToDelete(
            null
          )
        }
        onConfirm={
          deleteCopy
        }
      />

      <ExLibrisConfirmDialog
        open={
          Boolean(
            blockedCopy
          )
        }
        title="Copia in prestito"
        message="Questa copia risulta attualmente in prestito. Registrane prima la restituzione dalla sezione Prestiti, poi potrai eliminarla."
        confirmLabel="Vai ai prestiti"
        cancelLabel="Chiudi"
        onCancel={() =>
          setBlockedCopy(
            null
          )
        }
        onConfirm={() => {
          setBlockedCopy(
            null
          )

          haptic('light')

          router.push(
            '/loans'
          )
        }}
      />

    </>
  )
}
