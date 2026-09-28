'use client'

import {
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'

import {
  BookOpen,
  Box,
  Building2,
  ChevronRight,
  House,
  LibraryBig,
  MapPin,
  Pencil,
  Plus,
  SquareStack,
  Trash2,
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'
import BookCover from '@/components/BookCover'

type Location = {
  id: string
  name: string
  location_type: string
  parent_id: string | null
}

type Book = {
  id: string
  title: string
  authors: string[] | null
  location_id: string | null
  cover_url: string | null
  custom_cover_url: string | null
}

export default function LocationsPage() {
  const supabase = createClient()

  const [familyId, setFamilyId] =
    useState('')

  const [locations, setLocations] =
    useState<Location[]>([])

  const [books, setBooks] =
    useState<Book[]>([])

  const [selected, setSelected] =
    useState<Location | null>(null)


  const [editingLocation, setEditingLocation] =
    useState<Location | null>(null)

  const [editName, setEditName] =
    useState('')

  const [editType, setEditType] =
    useState('other')

  const [editParentId, setEditParentId] =
    useState('')

  const [deleteTarget, setDeleteTarget] =
    useState<Location | null>(null)

  const [showAdd, setShowAdd] =
    useState(false)

  const [name, setName] =
    useState('')

  const [type, setType] =
    useState('house')

  const [parentId, setParentId] =
    useState('')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  async function loadData() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { data: membership } =
      await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .single()

    if (!membership) return

    setFamilyId(
      membership.family_id
    )

    const [
      locationsResult,
      booksResult,
    ] = await Promise.all([
      supabase
        .from('locations')
        .select(`
          id,
          name,
          location_type,
          parent_id
        `)
        .eq(
          'family_id',
          membership.family_id
        )
        .order('name'),

      supabase
        .from('books')
        .select(`
          id,
          title,
          authors,
          location_id,
          cover_url,
          custom_cover_url
        `)
        .eq(
          'family_id',
          membership.family_id
        ),
    ])

    setLocations(
      locationsResult.data ?? []
    )

    setBooks(
      booksResult.data ?? []
    )

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function descendants(
    id: string
  ): string[] {
    const children =
      locations.filter(
        (item) =>
          item.parent_id === id
      )

    return [
      id,
      ...children.flatMap(
        (child) =>
          descendants(child.id)
      ),
    ]
  }

  function booksInside(
    id: string
  ) {
    const ids =
      descendants(id)

    return books.filter(
      (book) =>
        book.location_id &&
        ids.includes(
          book.location_id
        )
    )
  }


  function locationPath(
    id: string
  ) {
    const path: Location[] = []

    let current =
      locations.find(
        (item) =>
          item.id === id
      )

    let safety = 0

    while (
      current &&
      safety < 20
    ) {
      path.unshift(current)

      current =
        current.parent_id
          ? locations.find(
              (item) =>
                item.id ===
                current!.parent_id
            )
          : undefined

      safety += 1
    }

    return path
  }

  function addInside(
    location: Location
  ) {
    setParentId(location.id)

    setType(
      location.location_type === 'house'
        ? 'room'
        : location.location_type === 'room'
          ? 'bookcase'
          : location.location_type === 'bookcase'
            ? 'shelf'
            : 'other'
    )

    setName('')
    setShowAdd(true)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function addLocation() {
    if (
      !name.trim() ||
      !familyId
    ) {
      return
    }

    const { error } =
      await supabase
        .from('locations')
        .insert({
          family_id:
            familyId,

          name:
            name.trim(),

          location_type:
            type,

          parent_id:
            parentId ||
            null,
        })

    if (error) {
      setError(
        error.message
      )
      return
    }

    setName('')
    setParentId('')
    setShowAdd(false)

    await loadData()
  }

  function beginEdit(
    location: Location
  ) {
    setEditingLocation(location)
    setEditName(location.name)
    setEditType(location.location_type)
    setEditParentId(location.parent_id ?? '')
  }

  async function saveLocationEdit() {
    if (
      !editingLocation ||
      !editName.trim()
    ) {
      return
    }

    const { error } =
      await supabase
        .from('locations')
        .update({
          name: editName.trim(),
          location_type: editType,
          parent_id:
            editParentId || null,
        })
        .eq(
          'id',
          editingLocation.id
        )

    if (error) {
      setError(error.message)
      return
    }

    setEditingLocation(null)
    setSelected(null)

    await loadData()
  }

  function requestDelete(
    location: Location
  ) {
    setDeleteTarget(location)
  }

  async function confirmDelete() {
    if (!deleteTarget) return

    const children =
      locations.filter(
        (item) =>
          item.parent_id ===
          deleteTarget.id
      )

    if (children.length > 0) {
      setError(
        'Questa posizione contiene altre posizioni. Spostale prima di eliminarla.'
      )
      setDeleteTarget(null)
      return
    }

    if (
      booksInside(
        deleteTarget.id
      ).length > 0
    ) {
      setError(
        'Questa posizione contiene libri. Spostali prima di eliminarla.'
      )
      setDeleteTarget(null)
      return
    }

    const { error } =
      await supabase
        .from('locations')
        .delete()
        .eq(
          'id',
          deleteTarget.id
        )

    if (error) {
      setError(error.message)
      return
    }

    setDeleteTarget(null)
    setSelected(null)

    await loadData()
  }

  const roots =
    locations.filter(
      (item) =>
        !item.parent_id
    )

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-black/15 border-t-black rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="exl-page">

      <div className="max-w-5xl mx-auto px-5 pt-[calc(20px+env(safe-area-inset-top))] md:pt-10">

        <header className="flex justify-between items-start">

          <div>

            <p className="text-[#8e8e93] text-sm">
              Ex Libris
            </p>

            <h1 className="text-[38px] font-bold tracking-[-0.045em] leading-none mt-1">
              Posizioni
            </h1>

            <p className="text-[#8e8e93] mt-2">
              {locations.length}{' '}
              {locations.length === 1
                ? 'posizione'
                : 'posizioni'}
            </p>

          </div>

          <button
            onClick={() =>
              setShowAdd(
                !showAdd
              )
            }
            className="w-11 h-11 exl-glass rounded-full flex items-center justify-center exl-press"
          >
            <Plus
              size={22}
            />
          </button>

        </header>

        {showAdd && (
          <section className="exl-glass exl-card p-5 mt-5">

            <div className="flex items-start justify-between gap-4">

              <div>

                <h2 className="font-bold text-lg">
                  Nuova posizione
                </h2>

                {parentId && (
                  <p className="text-[#8e8e93] text-sm mt-1">
                    Dentro{' '}
                    <span className="font-medium text-black/70 dark:text-white/80">
                      {
                        locationPath(
                          parentId
                        )
                          .map(
                            (item) =>
                              item.name
                          )
                          .join(' · ')
                      }
                    </span>
                  </p>
                )}

              </div>

              {parentId && (
                <button
                  type="button"
                  onClick={() =>
                    setParentId('')
                  }
                  className="text-[#8e8e93] text-sm"
                >
                  Rimuovi
                </button>
              )}

            </div>

            <div className="space-y-3 mt-4">

              <input
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                placeholder="Nome"
                className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none"
              />

              <select
                value={type}
                onChange={(e) =>
                  setType(
                    e.target.value
                  )
                }
                className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none"
              >
                <option value="house">
                  Casa
                </option>
                <option value="room">
                  Stanza
                </option>
                <option value="bookcase">
                  Libreria
                </option>
                <option value="shelf">
                  Ripiano
                </option>
                <option value="box">
                  Scatola
                </option>
                <option value="other">
                  Altro
                </option>
              </select>

              <select
                value={
                  parentId
                }
                onChange={(e) =>
                  setParentId(
                    e.target.value
                  )
                }
                className="w-full bg-white/70 rounded-2xl px-4 py-4 outline-none"
              >

                <option value="">
                  Nessuna posizione superiore
                </option>

                {locations.map(
                  (location) => (
                    <option
                      key={
                        location.id
                      }
                      value={
                        location.id
                      }
                    >
                      {
                        location.name
                      }
                    </option>
                  )
                )}

              </select>

            </div>

            <button
              onClick={
                addLocation
              }
              className="w-full bg-black text-white rounded-2xl py-4 font-semibold mt-4"
            >
              Aggiungi
            </button>

          </section>
        )}

        {error && (
          <p className="text-red-500 mt-4">
            {error}
          </p>
        )}

        <div className="grid lg:grid-cols-[1fr_360px] gap-5 mt-7">

          <section className="space-y-3">

            {roots.map(
              (location) => (
                <LocationNode
                  key={
                    location.id
                  }
                  location={
                    location
                  }
                  level={0}
                  locations={
                    locations
                  }
                  booksInside={
                    booksInside
                  }
                  onSelect={
                    setSelected
                  }
                  selectedId={
                    selected?.id ??
                    null
                  }
                />
              )
            )}

          </section>

          <aside className="fixed left-3 right-3 bottom-[calc(88px+env(safe-area-inset-bottom))] z-40 lg:static">

            {selected && (
              <div className="exl-glass exl-card p-5 max-h-[58dvh] overflow-y-auto shadow-[0_18px_60px_rgba(0,0,0,0.18)] lg:max-h-none lg:overflow-visible lg:shadow-none lg:sticky lg:top-6">

                <div className="flex items-center gap-3">

                  <LocationIcon
                    type={
                      selected.location_type
                    }
                  />

                  <div>

                    <p className="text-[#8e8e93] text-xs uppercase">
                      {typeName(
                        selected.location_type
                      )}
                    </p>

                    <h2 className="text-xl font-bold">
                      {selected.name}
                    </h2>

                  </div>

                </div>

                <div className="flex items-center gap-1.5 flex-wrap mt-4">

                  {locationPath(
                    selected.id
                  ).map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          item.id
                        }
                        className="flex items-center gap-1.5"
                      >
                        {index > 0 && (
                          <ChevronRight
                            size={12}
                            className="text-[#c7c7cc]"
                          />
                        )}

                        <span className="text-[#8e8e93] text-xs">
                          {item.name}
                        </span>
                      </div>
                    )
                  )}

                </div>

                <p className="text-[#8e8e93] mt-3">
                  {
                    booksInside(
                      selected.id
                    ).length
                  }{' '}
                  libri
                </p>

                <button
                  onClick={() =>
                    addInside(
                      selected
                    )
                  }
                  className="w-full bg-black text-white rounded-2xl py-3.5 mt-4 flex items-center justify-center gap-2 font-semibold exl-press"
                >
                  <Plus size={17} />
                  Aggiungi qui
                </button>

                <div className="grid grid-cols-2 gap-2 mt-3">

                  <button
                    onClick={() =>
                      beginEdit(
                        selected
                      )
                    }
                    className="bg-white/70 rounded-2xl py-3 flex items-center justify-center gap-2 exl-press"
                  >
                    <Pencil
                      size={16}
                    />
                    Modifica
                  </button>

                  <button
                    onClick={() =>
                      requestDelete(
                        selected
                      )
                    }
                    className="bg-white/70 text-red-500 rounded-2xl py-3 flex items-center justify-center gap-2 exl-press"
                  >
                    <Trash2
                      size={16}
                    />
                    Elimina
                  </button>

                </div>

                <div className="space-y-3 mt-6">

                  {booksInside(
                    selected.id
                  ).map(
                    (book) => {

                      const cover =
                        book.custom_cover_url ||
                        book.cover_url

                      return (
                        <Link
                          key={
                            book.id
                          }
                          href={`/books/${book.id}`}
                          className="flex items-center gap-3 exl-press"
                        >

                          <div className="w-10 h-14 bg-[#d1d1d6] rounded-lg overflow-hidden shrink-0">

                            <BookCover
                              title={book.title}
                              authors={book.authors}
                              coverUrl={cover}
                            />

                          </div>

                          <div className="min-w-0 flex-1">

                            <p className="font-medium text-sm line-clamp-2">
                              {
                                book.title
                              }
                            </p>

                            <p className="text-[#8e8e93] text-xs truncate mt-1">
                              {
                                book.authors?.[0] ??
                                ''
                              }
                            </p>

                          </div>

                          <ChevronRight
                            size={17}
                            className="text-[#c7c7cc]"
                          />

                        </Link>
                      )
                    }
                  )}

                </div>

              </div>
            )}

          </aside>

        </div>

      </div>

      {editingLocation && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">

          <button
            type="button"
            onClick={() =>
              setEditingLocation(null)
            }
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
          />

          <div className="relative w-full max-w-xl bg-[#f5f3ee]/95 dark:bg-[#1c1c1e]/95 backdrop-blur-3xl rounded-t-[30px] p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[0_-12px_50px_rgba(0,0,0,0.18)]">

            <div className="w-10 h-1 rounded-full bg-black/15 dark:bg-white/20 mx-auto mb-5" />

            <div className="flex items-center justify-between">

              <div>
                <p className="text-[#8e8e93] text-xs">
                  Posizione
                </p>

                <h2 className="text-[24px] font-bold tracking-[-0.03em]">
                  Modifica
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditingLocation(null)
                }
                className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center"
              >
                ×
              </button>

            </div>

            <div className="space-y-3 mt-5">

              <input
                value={editName}
                onChange={(e) =>
                  setEditName(
                    e.target.value
                  )
                }
                placeholder="Nome"
                className="w-full bg-white/70 dark:bg-white/10 rounded-2xl px-4 py-4 outline-none"
              />

              <select
                value={editType}
                onChange={(e) =>
                  setEditType(
                    e.target.value
                  )
                }
                className="w-full bg-white/70 dark:bg-white/10 rounded-2xl px-4 py-4 outline-none"
              >
                <option value="house">Casa</option>
                <option value="room">Stanza</option>
                <option value="bookcase">Libreria</option>
                <option value="shelf">Ripiano</option>
                <option value="box">Scatola</option>
                <option value="other">Altro</option>
              </select>

              <select
                value={editParentId}
                onChange={(e) =>
                  setEditParentId(
                    e.target.value
                  )
                }
                className="w-full bg-white/70 dark:bg-white/10 rounded-2xl px-4 py-4 outline-none"
              >

                <option value="">
                  Nessuna posizione superiore
                </option>

                {locations
                  .filter(
                    (location) =>
                      location.id !==
                      editingLocation.id
                  )
                  .map(
                    (location) => (
                      <option
                        key={location.id}
                        value={location.id}
                      >
                        {location.name}
                      </option>
                    )
                  )}

              </select>

            </div>

            <button
              type="button"
              onClick={saveLocationEdit}
              className="w-full bg-black text-white rounded-2xl py-4 font-semibold mt-5 exl-press"
            >
              Salva modifiche
            </button>

          </div>

        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">

          <button
            type="button"
            onClick={() =>
              setDeleteTarget(null)
            }
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
          />

          <div className="relative w-full max-w-xl bg-[#f5f3ee]/95 dark:bg-[#1c1c1e]/95 backdrop-blur-3xl rounded-t-[30px] p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[0_-12px_50px_rgba(0,0,0,0.18)]">

            <div className="w-10 h-1 rounded-full bg-black/15 dark:bg-white/20 mx-auto mb-5" />

            <h2 className="text-[23px] font-bold tracking-[-0.03em]">
              Eliminare “{deleteTarget.name}”?
            </h2>

            <p className="text-[#8e8e93] text-sm mt-2 leading-relaxed">
              La posizione verrà rimossa definitivamente.
              Se contiene libri o altre posizioni, Ex Libris ti impedirà di eliminarla.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-6">

              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
                className="bg-white/70 dark:bg-white/10 rounded-2xl py-4 font-semibold exl-press"
              >
                Annulla
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                className="bg-[#ff3b30] text-white rounded-2xl py-4 font-semibold exl-press"
              >
                Elimina
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  )
}

function LocationNode({
  location,
  level,
  locations,
  booksInside,
  onSelect,
  selectedId,
}: {
  location: Location
  level: number
  locations: Location[]
  booksInside: (
    id: string
  ) => Book[]
  onSelect: (
    location: Location
  ) => void
  selectedId: string | null
}) {
  const children =
    locations.filter(
      (item) =>
        item.parent_id ===
        location.id
    )

  const count =
    booksInside(
      location.id
    ).length

  return (
    <div
      style={{
        marginLeft:
          Math.min(
            level,
            3
          ) * 14,
      }}
    >

      <button
        onClick={() =>
          onSelect(
            location
          )
        }
        className={`exl-glass exl-card w-full p-4 flex items-center justify-between text-left exl-press ${
          selectedId === location.id
            ? 'ring-2 ring-black/10'
            : ''
        }`}
      >

        <div className="flex items-center gap-3">

          <LocationIcon
            type={
              location.location_type
            }
          />

          <div>

            <p className="font-semibold">
              {location.name}
            </p>

            <p className="text-[#8e8e93] text-xs mt-1">
              {typeName(
                location.location_type
              )}
            </p>

          </div>

        </div>

        <div className="flex items-center gap-2">

          <span className="text-[#8e8e93] text-sm">
            {count}
          </span>

          <ChevronRight
            size={18}
            className="text-[#c7c7cc]"
          />

        </div>

      </button>

      {children.length > 0 && (
        <div className="space-y-3 mt-3">

          {children.map(
            (child) => (
              <LocationNode
                key={
                  child.id
                }
                location={
                  child
                }
                level={
                  level + 1
                }
                locations={
                  locations
                }
                booksInside={
                  booksInside
                }
                onSelect={
                  onSelect
                }
                selectedId={
                  selectedId
                }
              />
            )
          )}

        </div>
      )}

    </div>
  )
}

function LocationIcon({
  type,
}: {
  type: string
}) {
  const Icon =
    type === 'house'
      ? House
      : type === 'room'
        ? Building2
        : type === 'bookcase'
          ? LibraryBig
          : type === 'shelf'
            ? SquareStack
            : type === 'box'
              ? Box
              : MapPin

  return (
    <div className="w-10 h-10 rounded-[14px] bg-white/70 flex items-center justify-center shrink-0">

      <Icon
        size={20}
      />

    </div>
  )
}

function typeName(
  type: string
) {
  const names: Record<
    string,
    string
  > = {
    house: 'Casa',
    room: 'Stanza',
    bookcase: 'Libreria',
    shelf: 'Ripiano',
    box: 'Scatola',
    other: 'Altro',
  }

  return (
    names[type] ?? type
  )
}
