'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  AnimatePresence,
  motion,
} from 'framer-motion'

import {
  Bookmark,
  Check,
  Minus,
  Plus,
  Sparkles,
} from 'lucide-react'

import {
  createClient,
} from '@/utils/supabase/client'

import {
  haptic,
} from '@/utils/haptics'

import {
  removeCaches,
} from '@/utils/exlibris-cache'

type Props = {
  bookId: string
  pages?: number | null
}

type ReadingStatus =
  | 'none'
  | 'to_read'
  | 'reading'
  | 'read'

export default function BookBookmarkCard({
  bookId,
  pages,
}: Props) {
  const supabase =
    createClient()

  const [page, setPage] =
    useState(0)

  const [draftPage, setDraftPage] =
    useState('')

  const [editing, setEditing] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  const [ready, setReady] =
    useState(false)

  const [
    readingStatus,
    setReadingStatus,
  ] =
    useState<ReadingStatus>(
      'none'
    )

  const [showFinish, setShowFinish] =
    useState(false)

  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    )

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } =
        await supabase.auth
          .getUser()

      if (!user) {
        setReady(true)
        return
      }

      const { data } =
        await supabase
          .from(
            'user_book_state'
          )
          .select(`
            bookmark_page,
            reading_status
          `)
          .eq(
            'user_id',
            user.id
          )
          .eq(
            'book_id',
            bookId
          )
          .maybeSingle()

      const initialPage =
        data?.bookmark_page ??
        0

      setPage(
        initialPage
      )

      setDraftPage(
        initialPage
          ? String(
              initialPage
            )
          : ''
      )

      setReadingStatus(
        (
          data?.reading_status ??
          'none'
        ) as ReadingStatus
      )

      setShowFinish(
        Boolean(
          pages &&
          initialPage >= pages &&
          data?.reading_status !==
            'read'
        )
      )

      setReady(true)
    }

    load()
  }, [
    bookId,
    pages,
  ])

  useEffect(() => {
    if (
      editing &&
      inputRef.current
    ) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const percentage =
    useMemo(() => {
      if (
        !pages ||
        pages <= 0 ||
        page <= 0
      ) {
        return null
      }

      return Math.min(
        100,
        Math.round(
          (
            page /
            pages
          ) *
            100
        )
      )
    }, [
      page,
      pages,
    ])

  function clampPage(
    value: number
  ) {
    let next =
      Math.max(
        0,
        Math.round(
          value
        )
      )

    if (
      pages &&
      pages > 0
    ) {
      next =
        Math.min(
          pages,
          next
        )
    }

    return next
  }

  async function savePage(
    nextValue: number
  ) {
    const nextPage =
      clampPage(
        nextValue
      )

    const {
      data: { user },
    } =
      await supabase.auth
        .getUser()

    if (!user) return

    setSaving(true)

    const {
      error,
    } =
      await supabase
        .from(
          'user_book_state'
        )
        .upsert(
          {
            user_id:
              user.id,

            book_id:
              bookId,

            bookmark_page:
              nextPage > 0
                ? nextPage
                : null,

            bookmark_updated_at:
              nextPage > 0
                ? new Date()
                    .toISOString()
                : null,
          },
          {
            onConflict:
              'user_id,book_id',
          }
        )

    if (error) {
      haptic('error')
      setSaving(false)
      return
    }

    setPage(
      nextPage
    )

    setDraftPage(
      nextPage
        ? String(nextPage)
        : ''
    )

    setEditing(false)

    const reachedEnd =
      Boolean(
        pages &&
        nextPage >= pages &&
        readingStatus !==
          'read'
      )

    setShowFinish(
      reachedEnd
    )

    removeCaches([
      `profile:${user.id}`,
      `book:${user.id}:${bookId}`,
    ])

    if (reachedEnd) {
      haptic('success')
    } else {
      haptic('light')
    }

    setSaving(false)
  }

  function adjust(
    delta: number
  ) {
    if (saving) return

    savePage(
      page + delta
    )
  }

  function submitDraft() {
    const parsed =
      Number(
        draftPage
      )

    if (
      !Number.isFinite(
        parsed
      )
    ) {
      setEditing(false)
      return
    }

    savePage(
      parsed
    )
  }

  async function markAsRead() {
    const {
      data: { user },
    } =
      await supabase.auth
        .getUser()

    if (!user) return

    setSaving(true)

    const today =
      new Date()
        .toISOString()
        .slice(0, 10)

    const {
      error,
    } =
      await supabase
        .from(
          'user_book_state'
        )
        .upsert(
          {
            user_id:
              user.id,

            book_id:
              bookId,

            reading_status:
              'read',

            read_at:
              today,

            bookmark_page:
              pages ??
              page ??
              null,

            bookmark_updated_at:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              'user_id,book_id',
          }
        )

    if (error) {
      haptic('error')
      setSaving(false)
      return
    }

    setReadingStatus(
      'read'
    )

    setShowFinish(false)

    removeCaches([
      `profile:${user.id}`,
      `shuffle:${user.id}`,
      `book:${user.id}:${bookId}`,
    ])

    window.dispatchEvent(
      new CustomEvent(
        'exlibris-reading-status-updated',
        {
          detail: {
            bookId,
            status:
              'read',
            readAt:
              today,
          },
        }
      )
    )

    haptic('success')
    setSaving(false)
  }

  if (!ready) {
    return null
  }

  return (
    <section className="exl-glass exl-card p-5 mt-5 overflow-hidden">

      <div className="flex items-start justify-between gap-4">

        <div className="flex items-center gap-3">

          <motion.div
            animate={{
              rotate:
                page > 0
                  ? -5
                  : 0,
              scale:
                page > 0
                  ? 1
                  : 0.96,
            }}
            transition={{
              type: 'spring',
              stiffness: 350,
              damping: 22,
            }}
            className="w-11 h-11 rounded-[15px] bg-[#5E7FA3]/10 flex items-center justify-center text-[#5E7FA3]"
          >
            <Bookmark
              size={21}
              fill={
                page > 0
                  ? 'currentColor'
                  : 'none'
              }
            />
          </motion.div>

          <div>
            <p className="text-[#8e8e93] text-[11px] uppercase tracking-[0.08em]">
              La tua lettura
            </p>

            <h2 className="font-bold text-[19px] tracking-[-0.025em] mt-0.5">
              Segnalibro
            </h2>
          </div>

        </div>

        {percentage !==
          null && (
          <motion.div
            key={
              percentage
            }
            initial={{
              scale: 0.8,
              opacity: 0,
            }}
            animate={{
              scale: 1,
              opacity: 1,
            }}
            className="rounded-full bg-black/5 dark:bg-white/10 px-3 py-1.5 text-[12px] font-semibold tabular-nums"
          >
            {percentage}%
          </motion.div>
        )}

      </div>

      <div className="mt-6">

        <div className="flex items-end justify-between gap-4">

          <div>

            <p className="text-[#8e8e93] text-xs">
              Pagina
            </p>

            <AnimatePresence
              mode="wait"
              initial={false}
            >
              {editing ? (
                <motion.div
                  key="editor"
                  initial={{
                    opacity: 0,
                    y: 4,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -4,
                  }}
                  className="flex items-center gap-2 mt-1"
                >
                  <input
                    ref={
                      inputRef
                    }
                    inputMode="numeric"
                    value={
                      draftPage
                    }
                    onChange={(
                      event
                    ) =>
                      setDraftPage(
                        event
                          .target
                          .value
                          .replace(
                            /\D/g,
                            ''
                          )
                      )
                    }
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
                        'Enter'
                      ) {
                        submitDraft()
                      }

                      if (
                        event.key ===
                        'Escape'
                      ) {
                        setEditing(
                          false
                        )
                      }
                    }}
                    className="w-[110px] bg-black/5 dark:bg-white/10 rounded-[16px] px-3 py-2 text-[30px] font-bold tracking-[-0.04em] outline-none tabular-nums"
                  />

                  <button
                    onClick={
                      submitDraft
                    }
                    className="w-10 h-10 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center exl-press"
                  >
                    <Check
                      size={18}
                    />
                  </button>

                </motion.div>
              ) : (
                <motion.button
                  key={`page-${page}`}
                  initial={{
                    scale: 0.92,
                    opacity: 0,
                    y: 3,
                  }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    type:
                      'spring',
                    stiffness:
                      420,
                    damping:
                      24,
                  }}
                  onClick={() => {
                    setDraftPage(
                      page
                        ? String(
                            page
                          )
                        : ''
                    )

                    setEditing(
                      true
                    )

                    haptic(
                      'light'
                    )
                  }}
                  className="text-left mt-1 exl-press"
                >
                  <span className="text-[34px] leading-none font-bold tracking-[-0.045em] tabular-nums">
                    {page || '—'}
                  </span>

                  {pages && (
                    <span className="text-[#8e8e93] text-sm ml-2">
                      di {pages}
                    </span>
                  )}
                </motion.button>
              )}
            </AnimatePresence>

          </div>

          <p className="text-[#8e8e93] text-[11px] text-right max-w-[130px]">
            Tocca il numero per andare direttamente a una pagina
          </p>

        </div>

        {percentage !==
          null && (
          <div className="h-[6px] rounded-full bg-black/[0.07] dark:bg-white/10 overflow-hidden mt-5">

            <motion.div
              initial={false}
              animate={{
                width:
                  `${percentage}%`,
              }}
              transition={{
                type: 'spring',
                stiffness: 180,
                damping: 24,
              }}
              className="h-full rounded-full bg-[#5E7FA3]"
            />

          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mt-5">

          <button
            disabled={
              saving ||
              page <= 0
            }
            onClick={() =>
              adjust(-1)
            }
            className="min-h-[48px] rounded-[17px] bg-black/5 dark:bg-white/10 flex items-center justify-center gap-1.5 font-semibold text-sm exl-press disabled:opacity-35"
          >
            <Minus size={15} />
            1
          </button>

          <button
            disabled={
              saving
            }
            onClick={() =>
              adjust(1)
            }
            className="min-h-[48px] rounded-[17px] bg-black text-white dark:bg-white dark:text-black flex items-center justify-center gap-1.5 font-semibold text-sm exl-press"
          >
            <Plus size={15} />
            1
          </button>

          <button
            disabled={
              saving
            }
            onClick={() =>
              adjust(10)
            }
            className="min-h-[48px] rounded-[17px] bg-[#5E7FA3]/10 text-[#5E7FA3] flex items-center justify-center gap-1.5 font-semibold text-sm exl-press"
          >
            <Plus size={15} />
            10
          </button>

        </div>

      </div>

      <AnimatePresence>
        {showFinish && (
          <motion.div
            initial={{
              opacity: 0,
              y: 12,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 8,
              scale: 0.98,
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 26,
            }}
            className="mt-5 rounded-[22px] bg-[#DDB342]/12 border border-[#DDB342]/20 p-4"
          >
            <div className="flex gap-3">

              <motion.div
                animate={{
                  rotate: [
                    0,
                    -8,
                    8,
                    0,
                  ],
                }}
                transition={{
                  duration: 0.6,
                }}
                className="w-10 h-10 rounded-[14px] bg-[#DDB342]/20 text-[#9b7415] flex items-center justify-center shrink-0"
              >
                <Sparkles
                  size={19}
                />
              </motion.div>

              <div className="flex-1">

                <p className="font-bold">
                  Hai raggiunto l’ultima pagina
                </p>

                <p className="text-[#6e6e73] dark:text-[#aeaeb2] text-sm mt-1">
                  Vuoi segnare questo libro come letto?
                </p>

                <div className="flex gap-2 mt-4">

                  <button
                    onClick={() =>
                      setShowFinish(
                        false
                      )
                    }
                    className="flex-1 rounded-[15px] bg-black/5 dark:bg-white/10 py-2.5 text-sm font-semibold exl-press"
                  >
                    Non ancora
                  </button>

                  <button
                    disabled={
                      saving
                    }
                    onClick={
                      markAsRead
                    }
                    className="flex-1 rounded-[15px] bg-black text-white dark:bg-white dark:text-black py-2.5 text-sm font-semibold exl-press"
                  >
                    Segna come letto
                  </button>

                </div>

              </div>

            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </section>
  )
}
