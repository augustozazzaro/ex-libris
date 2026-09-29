'use client'

import {
  useEffect,
  useState,
} from 'react'

import {
  BookCheck,
  BookOpen,
  Bookmark,
  Check,
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'
import {
  haptic,
} from '@/utils/haptics'
import {
  removeCaches,
} from '@/utils/exlibris-cache'

type ReadingStatus =
  | 'none'
  | 'to_read'
  | 'reading'
  | 'read'

export default function ReadingStateCard({
  bookId,
}: {
  bookId: string
}) {
  const supabase = createClient()

  const [status, setStatus] =
    useState<ReadingStatus>('none')

  const [readAt, setReadAt] =
    useState('')

  const [saving, setSaving] =
    useState(false)

  const [ready, setReady] =
    useState(false)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setReady(true)
        return
      }

      const { data } = await supabase
        .from('user_book_state')
        .select(`
          reading_status,
          read_at
        `)
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .maybeSingle()

      if (data) {
        setStatus(
          (data.reading_status ??
            'none') as ReadingStatus
        )

        setReadAt(
          data.read_at ?? ''
        )
      }

      setReady(true)
    }

    load()
  }, [bookId])

  async function changeStatus(
    newStatus: ReadingStatus
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    setSaving(true)

    let newReadAt = readAt

    if (
      newStatus === 'read' &&
      !newReadAt
    ) {
      newReadAt =
        new Date()
          .toISOString()
          .slice(0, 10)
    }

    if (
      newStatus !== 'read'
    ) {
      newReadAt = ''
    }

    const { error } = await supabase
      .from('user_book_state')
      .upsert(
        {
          user_id: user.id,
          book_id: bookId,
          reading_status:
            newStatus,
          read_at:
            newReadAt || null,
        },
        {
          onConflict:
            'user_id,book_id',
        }
      )

    if (!error) {
      setStatus(newStatus)
      setReadAt(newReadAt)

      if (
        newStatus === 'read'
      ) {
        haptic('success')
      } else {
        haptic('medium')
      }

      removeCaches([
        `home:${user.id}`,
        `profile:${user.id}`,
        `shuffle:${user.id}`,
      ])
    } else {
      haptic('error')
    }

    setSaving(false)
  }

  async function changeReadDate(
    value: string
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    setReadAt(value)

    await supabase
      .from('user_book_state')
      .upsert(
        {
          user_id: user.id,
          book_id: bookId,
          reading_status: 'read',
          read_at: value || null,
        },
        {
          onConflict:
            'user_id,book_id',
        }
      )
  }

  if (!ready) return null

  const choices = [
    {
      value:
        'to_read' as ReadingStatus,
      label: 'Da leggere',
      icon: Bookmark,
    },
    {
      value:
        'reading' as ReadingStatus,
      label: 'In lettura',
      icon: BookOpen,
    },
    {
      value:
        'read' as ReadingStatus,
      label: 'Letto',
      icon: BookCheck,
    },
  ]

  return (
    <section className="exl-glass exl-card p-5 mt-5">

      <p className="text-[#8e8e93] text-xs uppercase tracking-[0.08em]">
        La tua lettura
      </p>

      <h2 className="font-bold text-lg mt-1">
        A che punto sei?
      </h2>

      <div className="grid grid-cols-3 gap-2 mt-5">

        {choices.map(
          ({
            value,
            label,
            icon: Icon,
          }) => {
            const active =
              status === value

            return (
              <button
                key={value}
                disabled={saving}
                onClick={() =>
                  changeStatus(
                    active
                      ? 'none'
                      : value
                  )
                }
                className={`rounded-[18px] min-h-[92px] px-2 py-3 flex flex-col items-center justify-center gap-2 transition exl-press ${
                  active
                    ? 'bg-black text-white exl-success-pop'
                    : 'bg-white/65'
                }`}
              >

                {active ? (
                  <Check size={20} />
                ) : (
                  <Icon size={20} />
                )}

                <span className="text-[12px] font-semibold leading-tight">
                  {label}
                </span>

              </button>
            )
          }
        )}

      </div>

      {status === 'read' && (
        <div className="mt-5">

          <label className="text-xs text-[#8e8e93] ml-2">
            Data di lettura
          </label>

          <input
            type="date"
            value={readAt}
            onChange={(e) =>
              changeReadDate(
                e.target.value
              )
            }
            className="w-full bg-white/65 rounded-2xl px-4 py-3 mt-1 outline-none"
          />

        </div>
      )}

    </section>
  )
}
