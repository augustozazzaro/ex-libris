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

const typeLabels: Record<string, string> = {
  house: 'Casa',
  room: 'Stanza',
  bookcase: 'Libreria',
  shelf: 'Ripiano',
  box: 'Scatola',
  other: 'Altro',
}

export default function LocationsPage() {
  const supabase = createClient()

  const [familyId, setFamilyId] = useState<string | null>(null)
  const [locations, setLocations] = useState<Location[]>([])

  const [name, setName] = useState('')
  const [type, setType] = useState('house')
  const [parentId, setParentId] = useState('')

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

    const { data: membership, error: membershipError } =
      await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .single()

    if (membershipError || !membership) {
      setError('Biblioteca non trovata.')
      setLoading(false)
      return
    }

    setFamilyId(membership.family_id)

    const { data, error: locationsError } =
      await supabase
        .from('locations')
        .select(`
          id,
          name,
          location_type,
          parent_id,
          sort_order
        `)
        .eq('family_id', membership.family_id)
        .order('sort_order')
        .order('name')

    if (locationsError) {
      setError('Errore nel caricamento delle posizioni.')
      setLoading(false)
      return
    }

    setLocations(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function addLocation() {
    if (!familyId || !name.trim()) return

    setSaving(true)
    setError('')

    const { error: insertError } =
      await supabase
        .from('locations')
        .insert({
          family_id: familyId,
          name: name.trim(),
          location_type: type,
          parent_id: parentId || null,
        })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    setName('')
    setParentId('')
    setSaving(false)

    await loadData()
  }

  function getChildren(parent: string | null) {
    return locations.filter(
      (location) => location.parent_id === parent
    )
  }

  function renderTree(parent: string | null, level = 0) {
    const children = getChildren(parent)

    if (children.length === 0) return null

    return (
      <div className={level > 0 ? 'ml-5 border-l pl-4' : ''}>
        {children.map((location) => (
          <div key={location.id} className="mb-3">

            <div className="bg-white border rounded-2xl px-4 py-3 flex items-center justify-between">

              <div>
                <p className="font-medium">
                  {location.name}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  {typeLabels[location.location_type] ??
                    location.location_type}
                </p>
              </div>

              <span className="text-xl">
                {location.location_type === 'house' && '🏠'}
                {location.location_type === 'room' && '🚪'}
                {location.location_type === 'bookcase' && '📚'}
                {location.location_type === 'shelf' && '▰'}
                {location.location_type === 'box' && '📦'}
                {location.location_type === 'other' && '📍'}
              </span>

            </div>

            <div className="mt-3">
              {renderTree(location.id, level + 1)}
            </div>

          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Caricamento...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f6f5f1]">

      <div className="max-w-4xl mx-auto px-6 py-8">

        <Link
          href="/"
          className="text-sm text-gray-500"
        >
          ← Torna alla biblioteca
        </Link>

        <div className="mt-6 mb-8">

          <p className="text-sm text-gray-500">
            Organizzazione
          </p>

          <h1 className="text-3xl font-bold">
            Posizioni
          </h1>

          <p className="text-gray-500 mt-2">
            Crea case, stanze, librerie e ripiani.
          </p>

        </div>

        <section className="bg-white border rounded-3xl p-6 mb-8">

          <h2 className="text-lg font-semibold mb-5">
            Aggiungi posizione
          </h2>

          <div className="grid md:grid-cols-3 gap-4">

            <div>
              <label className="block text-sm mb-2">
                Nome
              </label>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Studio"
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">
                Tipo
              </label>

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 bg-white"
              >
                <option value="house">Casa</option>
                <option value="room">Stanza</option>
                <option value="bookcase">Libreria</option>
                <option value="shelf">Ripiano</option>
                <option value="box">Scatola</option>
                <option value="other">Altro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2">
                Dentro
              </label>

              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full border rounded-xl px-4 py-3 bg-white"
              >
                <option value="">
                  Nessuna posizione superiore
                </option>

                {locations.map((location) => (
                  <option
                    key={location.id}
                    value={location.id}
                  >
                    {typeLabels[location.location_type]} · {location.name}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {error && (
            <p className="text-red-600 mt-4">
              {error}
            </p>
          )}

          <button
            onClick={addLocation}
            disabled={saving || !name.trim()}
            className="mt-5 bg-black text-white rounded-xl px-6 py-3 font-medium disabled:opacity-40"
          >
            {saving
              ? 'Salvataggio...'
              : 'Aggiungi posizione'}
          </button>

        </section>

        <section>

          <p className="text-sm text-gray-500 mb-3">
            Struttura della biblioteca
          </p>

          {locations.length === 0 ? (

            <div className="bg-white border rounded-3xl p-8 text-center">

              <div className="text-5xl mb-4">
                🏠
              </div>

              <h2 className="text-xl font-semibold">
                Nessuna posizione
              </h2>

              <p className="text-gray-500 mt-2">
                Comincia creando una casa.
              </p>

            </div>

          ) : (

            renderTree(null)

          )}

        </section>

      </div>

    </main>
  )
}
