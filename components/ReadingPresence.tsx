'use client'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  AnimatePresence,
  motion,
} from 'framer-motion'

import {
  BookOpenText,
} from 'lucide-react'

import {
  createClient,
} from '@/utils/supabase/client'

type Reader = {
  user_id: string
  full_name: string | null
  nickname: string | null
  avatar_url: string | null
}

type Props = {
  editionKey: string
  bookId: string
}

function displayName(
  reader: Reader
) {
  return (
    reader.nickname ||
    reader.full_name ||
    'Lettore'
  )
}

function initials(
  reader: Reader
) {
  return displayName(reader)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(
      part =>
        part[0]?.toUpperCase()
    )
    .join('')
}

export default function ReadingPresence({
  editionKey,
  bookId,
}: Props) {
  const supabase =
    createClient()

  const [readers, setReaders] =
    useState<Reader[]>([])

  const loadReaders =
    useCallback(
      async () => {
        const {
          data,
          error,
        } =
          await supabase.rpc(
            'get_edition_reading_presence',
            {
              p_edition_key:
                editionKey,
            }
          )

        if (error) {
          return
        }

        setReaders(
          (data ?? []) as Reader[]
        )
      },
      [
        editionKey,
        supabase,
      ]
    )

  useEffect(() => {
    loadReaders()

    function handleStatusChange(
      event: Event
    ) {
      const custom =
        event as CustomEvent<{
          bookId?: string
        }>

      if (
        !custom.detail?.bookId ||
        custom.detail.bookId ===
          bookId
      ) {
        loadReaders()
        return
      }

      /*
        Anche una copia differente
        può appartenere alla stessa
        edizione: aggiorniamo comunque.
      */
      loadReaders()
    }

    window.addEventListener(
      'exlibris-reading-status-updated',
      handleStatusChange
    )

    return () =>
      window.removeEventListener(
        'exlibris-reading-status-updated',
        handleStatusChange
      )
  }, [
    bookId,
    loadReaders,
  ])

  if (!readers.length) {
    return null
  }

  const names =
    readers.map(
      displayName
    )

  let sentence = ''

  if (names.length === 1) {
    sentence =
      `${names[0]} lo sta leggendo`
  } else if (
    names.length === 2
  ) {
    sentence =
      `${names[0]} e ${names[1]} lo stanno leggendo`
  } else {
    sentence =
      `${names[0]}, ${names[1]} e altre ${names.length - 2} persone lo stanno leggendo`
  }

  return (
    <AnimatePresence>
      <motion.section
        initial={{
          opacity: 0,
          y: 8,
          scale: 0.985,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          type: 'spring',
          stiffness: 320,
          damping: 28,
        }}
        className="mt-4 px-1"
      >
        <div className="flex items-center justify-center gap-3">

          <div className="flex -space-x-2">

            {readers
              .slice(0, 3)
              .map(
                (
                  reader,
                  index
                ) => (
                  <motion.div
                    key={
                      reader.user_id
                    }
                    initial={{
                      scale: 0.7,
                      opacity: 0,
                    }}
                    animate={{
                      scale: 1,
                      opacity: 1,
                    }}
                    transition={{
                      delay:
                        index *
                        0.045,
                      type:
                        'spring',
                      stiffness:
                        380,
                      damping:
                        24,
                    }}
                    className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#f6f5f1] dark:border-[#1c1c1e] bg-[#5E7FA3] text-white flex items-center justify-center text-[10px] font-bold shadow-sm"
                  >
                    {reader.avatar_url ? (
                      <img
                        src={
                          reader.avatar_url
                        }
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials(
                        reader
                      )
                    )}
                  </motion.div>
                )
              )}

          </div>

          <div className="flex items-center gap-1.5 min-w-0 text-[#636366] dark:text-[#c7c7cc]">

            <BookOpenText
              size={14}
              className="shrink-0 text-[#5E7FA3]"
            />

            <p className="text-[13px] truncate">
              {sentence}
            </p>

          </div>

        </div>
      </motion.section>
    </AnimatePresence>
  )
}
