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

  const lastHapticStep =
    useRef(-1)

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
        pages <= 0
      ) {
        return null
      }

      return Math.min(
        100,
        Math.max(
          0,
          Math.round(
            (
              page /
              pages
            ) *
              100
          )
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
      `home:${user.id}`,
      `profile:${user.id}`,
      `book:${user.id}:${bookId}`,
    ])

    window.dispatchEvent(
      new CustomEvent(
        'exlibris-bookmark-updated',
        {
          detail: {
            bookId,
            page:
              nextPage,
          },
        }
      )
    )

    if (reachedEnd) {
      haptic('success')
    } else {
      haptic('light')
    }

    setSaving(false)
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

  function updateSlider(
    value: number
  ) {
    const next =
      clampPage(
        value
      )

    setPage(
      next
    )

    setDraftPage(
      String(next)
    )

    if (
      pages &&
      pages > 0
    ) {
      const step =
        Math.floor(
          (
            next /
            pages
          ) *
            10
        )

      if (
        step !==
        lastHapticStep.current
      ) {
        lastHapticStep.current =
          step

        haptic('light')
      }
    }
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

    if (pages) {
      setPage(
        pages
      )
    }

    setShowFinish(false)

    removeCaches([
      `home:${user.id}`,
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
                  ? -4
                  : 0,
              scale:
                page > 0
                  ? 1
                  : 0.96,
            }}
            transition={{
              type: 'spring',
              stiffness: 350,
              damping: 24,
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

            <p className="text-[#8e8e93] text-[10px] uppercase tracking-[0.09em] font-semibold">
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
            key={percentage}
            initial={{
              scale: 0.92,
            }}
            animate={{
              scale: 1,
            }}
            className="rounded-full bg-black/5 dark:bg-white/10 px-3 py-1.5 text-[12px] font-semibold tabular-nums"
          >
            {percentage}%
          </motion.div>
        )}

      </div>


      <div className="mt-7 text-center">

        <p className="text-[#8e8e93] text-[11px] uppercase tracking-[0.08em]">
          Pagina attuale
        </p>

        <AnimatePresence
          mode="wait"
          initial={false}
        >

          {editing ? (
            <motion.div
              key="edit"
              initial={{
                opacity: 0,
                scale: 0.96,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.97,
              }}
              className="flex items-center justify-center gap-2 mt-2"
            >

              <input
                ref={inputRef}
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
                className="w-[125px] text-center bg-black/5 dark:bg-white/10 rounded-[18px] px-3 py-2 text-[34px] font-bold tracking-[-0.05em] outline-none tabular-nums"
              />

              <button
                type="button"
                onClick={
                  submitDraft
                }
                className="w-11 h-11 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center exl-press"
              >
                <Check
                  size={18}
                />
              </button>

            </motion.div>
          ) : (
            <motion.button
              key={`page-${page}`}
              type="button"
              onClick={() => {
                setDraftPage(
                  page
                    ? String(page)
                    : ''
                )

                setEditing(
                  true
                )

                haptic('light')
              }}
              initial={{
                opacity: 0.75,
                scale: 0.96,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              className="mt-2 exl-press"
            >

              <span className="text-[46px] leading-none font-bold tracking-[-0.065em] tabular-nums">
                {page || 0}
              </span>

              {pages && (
                <span className="text-[#8e8e93] text-[15px] ml-2">
                  / {pages}
                </span>
              )}

            </motion.button>
          )}

        </AnimatePresence>

        <p className="text-[#8e8e93] text-[11px] mt-3">
          Tocca il numero per inserirlo manualmente
        </p>

      </div>


      {pages &&
        pages > 0 && (
        <div className="mt-7">

          <input
            type="range"
            min={0}
            max={pages}
            step={1}
            value={page}
            disabled={saving}
            onChange={(
              event
            ) =>
              updateSlider(
                Number(
                  event.target
                    .value
                )
              )
            }
            onPointerUp={(
              event
            ) =>
              savePage(
                Number(
                  event.currentTarget
                    .value
                )
              )
            }
            onKeyUp={(
              event
            ) =>
              savePage(
                Number(
                  event.currentTarget
                    .value
                )
              )
            }
            aria-label="Pagina corrente"
            className="exl-bookmark-slider w-full"
          />

          <div className="flex items-center justify-between mt-2 text-[#8e8e93] text-[10px] tabular-nums">

            <span>
              0
            </span>

            <span>
              {pages}
            </span>

          </div>

        </div>
      )}


      {percentage !==
        null && (
        <div className="mt-5">

          <div className="h-[5px] rounded-full bg-black/[0.06] dark:bg-white/10 overflow-hidden">

            <motion.div
              initial={false}
              animate={{
                width:
                  `${percentage}%`,
              }}
              transition={{
                type: 'spring',
                stiffness: 240,
                damping: 28,
              }}
              className="h-full bg-[#5E7FA3] rounded-full"
            />

          </div>

        </div>
      )}


      <AnimatePresence>
        {showFinish && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: 6,
            }}
            className="mt-5 rounded-[22px] bg-[#DDB342]/12 border border-[#DDB342]/20 p-4"
          >

            <div className="flex gap-3">

              <div className="w-10 h-10 rounded-[14px] bg-[#DDB342]/20 text-[#9b7415] flex items-center justify-center shrink-0">
                <Sparkles
                  size={19}
                />
              </div>

              <div className="flex-1">

                <p className="font-bold">
                  Ultima pagina
                </p>

                <p className="text-[#6e6e73] dark:text-[#aeaeb2] text-sm mt-1">
                  Hai finito il libro?
                </p>

                <div className="flex gap-2 mt-4">

                  <button
                    type="button"
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
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={
                      markAsRead
                    }
                    className="flex-1 rounded-[15px] bg-black text-white dark:bg-white dark:text-black py-2.5 text-sm font-semibold exl-press"
                  >
                    Letto
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
