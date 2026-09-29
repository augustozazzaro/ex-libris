'use client'

import {
  useEffect,
  useState,
} from 'react'

import {
  BookCheck,
  MapPin,
  Pencil,
  Trash2,
  X,
  ArrowUpRight,
} from 'lucide-react'

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
    editingCopyId,
    setEditingCopyId,
  ] = useState<string | null>(
    null
  )

  const [
    editingLocation,
    setEditingLocation,
  ] = useState('')

  const [
    copyToDelete,
    setCopyToDelete,
  ] = useState<Copy | null>(
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
    setEditingCopyId(
      copy.id
    )

    setEditingLocation(
      copy.location_id ?? ''
    )
  }

  async function saveLocation(
    copy: Copy
  ) {
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

    setEditingCopyId(null)
    setSaving(false)

    await loadCopies()

    if (
      copy.id ===
      currentBookId
    ) {
      onChanged?.()
    }
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
      <section className="exl-glass exl-card p-5 mt-5">

        <div className="flex items-end justify-between gap-4">

          <div>
            <p className="text-[#8e8e93] text-xs uppercase tracking-[0.08em]">
              Biblioteca
            </p>

            <h2 className="font-bold text-[19px] tracking-[-0.02em] mt-1">
              {copies.length} copie
            </h2>
          </div>

          <span className="text-[#8e8e93] text-xs">
            Gestiscile separatamente
          </span>

        </div>

        <div className="mt-4 divide-y divide-black/5 dark:divide-white/10">

          {copies.map(
            copy => {
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
                <div
                  key={copy.id}
                  className="py-4 first:pt-1 last:pb-0"
                >
                  <div className="flex items-start gap-3">

                    <div className="w-10 h-10 rounded-[14px] bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                      {loaned ? (
                        <ArrowUpRight
                          size={18}
                        />
                      ) : (
                        <BookCheck
                          size={18}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">

                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          Copia {copy.copy_number ?? 1}
                        </p>

                        {isCurrent && (
                          <span className="text-[10px] uppercase tracking-[0.06em] bg-black text-white dark:bg-white dark:text-black rounded-full px-2 py-1">
                            Questa
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 text-[#8e8e93] text-[13px]">
                        <MapPin
                          size={13}
                          className="shrink-0"
                        />

                        <span className="truncate">
                          {location ||
                            'Posizione non indicata'}
                        </span>
                      </div>

                      <p className="text-[12px] text-[#8e8e93] mt-1">
                        {loaned
                          ? 'In prestito'
                          : 'In biblioteca'}
                      </p>

                    </div>

                    <div className="flex gap-1">

                      <button
                        onClick={() =>
                          startEditing(
                            copy
                          )
                        }
                        className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center exl-press"
                        aria-label="Modifica posizione"
                      >
                        <Pencil
                          size={15}
                        />
                      </button>

                      <button
                        onClick={() =>
                          setCopyToDelete(
                            copy
                          )
                        }
                        className="w-9 h-9 rounded-full bg-[#ff3b30]/10 text-[#ff3b30] flex items-center justify-center exl-press"
                        aria-label="Elimina copia"
                      >
                        <Trash2
                          size={15}
                        />
                      </button>

                    </div>

                  </div>

                  {editingCopyId ===
                    copy.id && (
                    <div className="mt-4 ml-0 md:ml-[52px] bg-black/[0.025] dark:bg-white/[0.05] rounded-[20px] p-3">

                      <div className="flex items-center justify-between mb-3">

                        <p className="font-semibold text-sm">
                          Posizione copia
                        </p>

                        <button
                          onClick={() =>
                            setEditingCopyId(
                              null
                            )
                          }
                          className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center"
                        >
                          <X
                            size={15}
                          />
                        </button>

                      </div>

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
                        disabled={saving}
                        onClick={() =>
                          saveLocation(
                            copy
                          )
                        }
                        className="w-full bg-black text-white dark:bg-white dark:text-black rounded-[17px] py-3.5 font-semibold mt-3 exl-press disabled:opacity-50"
                      >
                        {saving
                          ? 'Salvataggio…'
                          : 'Salva posizione'}
                      </button>

                    </div>
                  )}

                </div>
              )
            }
          )}

        </div>

        {error && (
          <p className="text-[#ff3b30] text-sm mt-4">
            {error}
          </p>
        )}

      </section>

      <ExLibrisConfirmDialog
        open={
          Boolean(
            copyToDelete
          )
        }
        title="Eliminare questa copia?"
        message="Verrà eliminata soltanto questa copia fisica. Le altre copie della stessa edizione resteranno nella biblioteca."
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
    </>
  )
}
