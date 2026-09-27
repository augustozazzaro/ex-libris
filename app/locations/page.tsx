'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Location = {
  id: string
  name: string
  location_type: string
  parent_id: string | null
  sort_order: number
}

type Book = {
  id: string
  title: string
  authors: string[] | null
  location_id: string | null
  cover_url: string | null
  custom_cover_url: string | null
}

const labels: Record<string, string> = {
  house: 'Casa',
  room: 'Stanza',
  bookcase: 'Libreria',
  shelf: 'Ripiano',
  box: 'Scatola',
  other: 'Altro',
}

const icons: Record<string, string> = {
  house: '⌂',
  room: '▢',
  bookcase: '▥',
  shelf: '▬',
  box: '□',
  other: '⌖',
}

export default function LocationsPage() {
  const supabase = createClient()

  const [familyId, setFamilyId] = useState('')
  const [locations, setLocations] = useState<Location[]>([])
  const [books, setBooks] = useState<Book[]>([])

  const [name, setName] = useState('')
  const [type, setType] = useState('house')
  const [parentId, setParentId] = useState('')

  const [selected, setSelected] = useState<Location | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Utente non autenticato.')
      setLoading(false)
      return
    }

    const { data: membership } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      setError('Biblioteca non trovata.')
      setLoading(false)
      return
    }

    setFamilyId(membership.family_id)

    const [locationResult, bookResult] =
      await Promise.all([
        supabase
          .from('locations')
          .select('*')
          .eq('family_id', membership.family_id)
          .order('sort_order')
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
          .eq('family_id', membership.family_id),
      ])

    setLocations(locationResult.data ?? [])
    setBooks(bookResult.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function addLocation() {
    if (!familyId || !name.trim()) return

    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('locations')
      .insert({
        family_id: familyId,
        name: name.trim(),
        location_type: type,
        parent_id: parentId || null,
      })

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    setName('')
    setParentId('')
    setSaving(false)

    await loadData()
  }

  async function renameLocation(location: Location) {
    const newName = window.prompt(
      'Nuovo nome:',
      location.name
    )

    if (!newName?.trim()) return

    const { error } = await supabase
      .from('locations')
      .update({ name: newName.trim() })
      .eq('id', location.id)

    if (error) {
      setError(error.message)
      return
    }

    setSelected(null)
    await loadData()
  }

  async function deleteLocation(location: Location) {
    const children = locations.filter(
      (item) => item.parent_id === location.id
    )

    const directBooks = books.filter(
      (book) => book.location_id === location.id
    )

    if (children.length > 0) {
      window.alert(
        'Questa posizione contiene altre posizioni. Spostale o eliminale prima.'
      )
      return
    }

    if (directBooks.length > 0) {
      window.alert(
        `Questa posizione contiene ${directBooks.length} ${
          directBooks.length === 1 ? 'libro' : 'libri'
        }. Sposta prima i libri.`
      )
      return
    }

    const confirmed = window.confirm(
      `Eliminare "${location.name}"?`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', location.id)

    if (error) {
      setError(error.message)
      return
    }

    setSelected(null)
    await loadData()
  }

  function descendants(locationId: string): string[] {
    const children = locations.filter(
      (item) => item.parent_id === locationId
    )

    return [
      locationId,
      ...children.flatMap((child) =>
        descendants(child.id)
      ),
    ]
  }

  function booksInside(locationId: string) {
    const ids = descendants(locationId)

    return books.filter(
      (book) =>
        book.location_id &&
        ids.includes(book.location_id)
    )
  }

  function childrenOf(parent: string | null) {
    return locations.filter(
      (item) => item.parent_id === parent
    )
  }

  function renderTree(parent: string | null, level = 0) {
    const children = childrenOf(parent)

    return children.map((location) => {
      const count = booksInside(location.id).length

      return (
        <div
          key={location.id}
          className={level ? 'ml-5 border-l pl-4' : ''}
        >
          <button
            onClick={() => setSelected(location)}
            className="w-full text-left bg-white border rounded-2xl px-4 py-4 mb-3 flex items-center justify-between gap-4 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">

              <span className="w-9 h-9 rounded-xl bg-[#f6f5f1] flex items-center justify-center text-lg">
                {icons[location.location_type]}
              </span>

              <div>
                <p className="font-semibold">
                  {location.name}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  {labels[location.location_type]}
                </p>
              </div>

            </div>

            <div className="text-right">
              <p className="font-semibold">
                {count}
              </p>

              <p className="text-xs text-gray-400">
                {count === 1 ? 'libro' : 'libri'}
              </p>
            </div>

          </button>

          {renderTree(location.id, level + 1)}
        </div>
      )
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f5f1] flex items-center justify-center">
        Caricamento...
      </main>
    )
  }

  const selectedBooks =
    selected ? booksInside(selected.id) : []

  return (
    <main className="min-h-screen bg-[#f6f5f1]">

      <div className="max-w-5xl mx-auto px-5 py-7">

        <div className="mb-8">
          <p className="text-sm text-gray-500">
            Organizzazione
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Posizioni
          </h1>

          <p className="text-gray-500 mt-2">
            La mappa fisica della biblioteca.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-5">
            {error}
          </div>
        )}

        <section className="bg-white border rounded-3xl p-5 mb-8">

          <h2 className="font-semibold text-lg mb-4">
            Nuova posizione
          </h2>

          <div className="grid md:grid-cols-3 gap-3">

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome"
              className="border rounded-xl px-4 py-3"
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="border rounded-xl px-4 py-3 bg-white"
            >
              <option value="house">Casa</option>
              <option value="room">Stanza</option>
              <option value="bookcase">Libreria</option>
              <option value="shelf">Ripiano</option>
              <option value="box">Scatola</option>
              <option value="other">Altro</option>
            </select>

            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="border rounded-xl px-4 py-3 bg-white"
            >
              <option value="">
                Nessuna posizione superiore
              </option>

              {locations.map((location) => (
                <option
                  key={location.id}
                  value={location.id}
                >
                  {labels[location.location_type]} · {location.name}
                </option>
              ))}
            </select>

          </div>

          <button
            onClick={addLocation}
            disabled={saving || !name.trim()}
            className="mt-4 bg-black text-white rounded-xl px-6 py-3 font-semibold disabled:opacity-40"
          >
            {saving ? 'Salvataggio...' : 'Aggiungi'}
          </button>

        </section>

        <div className="grid lg:grid-cols-[1fr_360px] gap-7">

          <section>

            {locations.length ? (
              renderTree(null)
            ) : (
              <div className="bg-white border rounded-3xl p-10 text-center">
                <div className="text-5xl mb-4">⌂</div>

                <h2 className="text-xl font-semibold">
                  Nessuna posizione
                </h2>

                <p className="text-gray-500 mt-2">
                  Comincia creando una casa.
                </p>
              </div>
            )}

          </section>

          <aside>

            {selected ? (
              <div className="bg-white border rounded-3xl p-5 lg:sticky lg:top-5">

                <p className="text-xs uppercase tracking-wider text-gray-400">
                  {labels[selected.location_type]}
                </p>

                <h2 className="text-2xl font-bold mt-1">
                  {selected.name}
                </h2>

                <p className="text-gray-500 mt-2">
                  {selectedBooks.length}{' '}
                  {selectedBooks.length === 1
                    ? 'libro'
                    : 'libri'}
                </p>

                <div className="flex gap-2 mt-5">

                  <button
                    onClick={() => renameLocation(selected)}
                    className="flex-1 border rounded-xl py-2 text-sm"
                  >
                    Rinomina
                  </button>

                  <button
                    onClick={() => deleteLocation(selected)}
                    className="flex-1 border border-red-200 text-red-600 rounded-xl py-2 text-sm"
                  >
                    Elimina
                  </button>

                </div>

                <div className="mt-6 space-y-3">

                  {selectedBooks.length === 0 && (
                    <p className="text-sm text-gray-400">
                      Nessun libro in questa posizione.
                    </p>
                  )}

                  {selectedBooks.map((book) => {
                    const cover =
                      book.custom_cover_url ||
                      book.cover_url

                    return (
                      <Link
                        key={book.id}
                        href={`/books/${book.id}`}
                        className="flex gap-3 items-center"
                      >
                        <div className="w-10 h-14 rounded-md bg-[#ebe8df] overflow-hidden shrink-0">
                          {cover ? (
                            <img
                              src={cover}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              📖
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-medium text-sm line-clamp-2">
                            {book.title}
                          </p>

                          {book.authors?.length ? (
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              {book.authors.join(', ')}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    )
                  })}

                </div>

              </div>
            ) : (
              <div className="hidden lg:block bg-white border rounded-3xl p-6 text-gray-400 text-sm">
                Seleziona una posizione per vedere i libri che contiene.
              </div>
            )}

          </aside>

        </div>

      </div>

    </main>
  )
}
