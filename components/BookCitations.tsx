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
  Check,
  Copy,
  Hash,
  MessageSquareText,
  Pencil,
  Plus,
  Quote,
  Trash2,
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

import ExLibrisConfirmDialog from '@/components/ExLibrisConfirmDialog'
import AdaptiveGlassModal from '@/components/glass/AdaptiveGlassModal'

type Citation = {
  id: string
  quote_text: string
  page: number | null
  note: string | null
  created_at: string
}

type Props = {
  familyId: string
  editionKey: string
  pages?: number | null
}

export default function BookCitations({
  familyId,
  editionKey,
  pages,
}: Props) {
  const supabase =
    createClient()

  const [
    citations,
    setCitations,
  ] =
    useState<Citation[]>([])

  const [
    editorOpen,
    setEditorOpen,
  ] =
    useState(false)

  const [
    editingId,
    setEditingId,
  ] =
    useState<string | null>(
      null
    )

  const [
    quoteText,
    setQuoteText,
  ] =
    useState('')

  const [page, setPage] =
    useState('')

  const [note, setNote] =
    useState('')

  const [saving, setSaving] =
    useState(false)

  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<Citation | null>(
      null
    )

  const [
    copiedId,
    setCopiedId,
  ] =
    useState<string | null>(
      null
    )

  const [error, setError] =
    useState('')

  const loadCitations =
    useCallback(
      async () => {
        const {
          data: { user },
        } =
          await supabase.auth
            .getUser()

        if (!user) return

        const {
          data,
          error,
        } =
          await supabase
            .from(
              'book_citations'
            )
            .select(`
              id,
              quote_text,
              page,
              note,
              created_at
            `)
            .eq(
              'user_id',
              user.id
            )
            .eq(
              'family_id',
              familyId
            )
            .eq(
              'edition_key',
              editionKey
            )
            .order(
              'created_at',
              {
                ascending:
                  false,
              }
            )

        if (error) {
          setError(
            error.message
          )
          return
        }

        setCitations(
          (data ??
            []) as Citation[]
        )
      },
      [
        editionKey,
        familyId,
        supabase,
      ]
    )

  useEffect(() => {
    loadCitations()
  }, [
    loadCitations,
  ])

  function resetEditor() {
    setEditingId(null)
    setQuoteText('')
    setPage('')
    setNote('')
    setError('')
  }

  function openNew() {
    resetEditor()
    setEditorOpen(true)
    haptic('light')
  }

  function openEdit(
    citation: Citation
  ) {
    setEditingId(
      citation.id
    )

    setQuoteText(
      citation.quote_text
    )

    setPage(
      citation.page
        ? String(
            citation.page
          )
        : ''
    )

    setNote(
      citation.note ?? ''
    )

    setEditorOpen(true)
    haptic('light')
  }

  function closeEditor() {
    setEditorOpen(false)

    setTimeout(
      resetEditor,
      180
    )
  }

  async function saveCitation() {
    const cleanQuote =
      quoteText.trim()

    if (!cleanQuote) {
      setError(
        'Scrivi la citazione prima di salvarla.'
      )
      haptic('error')
      return
    }

    let parsedPage:
      number | null = null

    if (page.trim()) {
      const value =
        Number(page)

      if (
        !Number.isFinite(
          value
        ) ||
        value < 1
      ) {
        setError(
          'La pagina non è valida.'
        )
        haptic('error')
        return
      }

      parsedPage =
        Math.round(
          value
        )

      if (
        pages &&
        parsedPage > pages
      ) {
        setError(
          `Il libro ha ${pages} pagine.`
        )
        haptic('error')
        return
      }
    }

    const {
      data: { user },
    } =
      await supabase.auth
        .getUser()

    if (!user) return

    setSaving(true)
    setError('')

    if (editingId) {
      const {
        error,
      } =
        await supabase
          .from(
            'book_citations'
          )
          .update({
            quote_text:
              cleanQuote,

            page:
              parsedPage,

            note:
              note.trim() ||
              null,

            updated_at:
              new Date()
                .toISOString(),
          })
          .eq(
            'id',
            editingId
          )
          .eq(
            'user_id',
            user.id
          )

      if (error) {
        setError(
          error.message
        )
        haptic('error')
        setSaving(false)
        return
      }
    } else {
      const {
        error,
      } =
        await supabase
          .from(
            'book_citations'
          )
          .insert({
            user_id:
              user.id,

            family_id:
              familyId,

            edition_key:
              editionKey,

            quote_text:
              cleanQuote,

            page:
              parsedPage,

            note:
              note.trim() ||
              null,
          })

      if (error) {
        setError(
          error.message
        )
        haptic('error')
        setSaving(false)
        return
      }
    }

    haptic('success')

    removeCaches([
      `citations:${user.id}`,
      `profile:${user.id}`,
    ])

    await loadCitations()

    setSaving(false)
    closeEditor()
  }

  async function deleteCitation() {
    if (!deleteTarget) {
      return
    }

    const target =
      deleteTarget

    setDeleteTarget(null)

    const {
      data: { user },
    } =
      await supabase.auth
        .getUser()

    if (!user) return

    const {
      error,
    } =
      await supabase
        .from(
          'book_citations'
        )
        .delete()
        .eq(
          'id',
          target.id
        )
        .eq(
          'user_id',
          user.id
        )

    if (error) {
      setError(
        error.message
      )
      haptic('error')
      return
    }

    setCitations(
      current =>
        current.filter(
          citation =>
            citation.id !==
            target.id
        )
    )

    removeCaches([
      `citations:${user.id}`,
      `profile:${user.id}`,
    ])

    haptic('success')
  }

  async function copyCitation(
    citation: Citation
  ) {
    await navigator
      .clipboard
      .writeText(
        citation.quote_text
      )

    setCopiedId(
      citation.id
    )

    haptic('light')

    setTimeout(
      () =>
        setCopiedId(
          null
        ),
      1400
    )
  }

  return (
    <>
      <section className="mt-5">

        <div className="flex items-end justify-between gap-4 px-1 mb-3">

          <div>

            <p className="text-[#8e8e93] text-[11px] uppercase tracking-[0.08em]">
              Il tuo libro
            </p>

            <div className="flex items-center gap-2 mt-1">

              <Quote
                size={19}
                className="text-[#5E7FA3]"
              />

              <h2 className="font-bold text-[20px] tracking-[-0.025em]">
                Citazioni
              </h2>

            </div>

          </div>

          <button
            onClick={
              openNew
            }
            className="h-10 px-3.5 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center gap-1.5 text-sm font-semibold exl-press"
          >
            <Plus
              size={16}
            />

            Aggiungi
          </button>

        </div>

        {citations.length ===
        0 ? (
          <motion.button
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            onClick={
              openNew
            }
            className="w-full exl-glass exl-card p-6 text-left exl-press"
          >
            <div className="w-11 h-11 rounded-[15px] bg-[#5E7FA3]/10 text-[#5E7FA3] flex items-center justify-center">
              <Quote
                size={21}
              />
            </div>

            <p className="font-semibold mt-4">
              Salva una frase che vuoi ricordare
            </p>

            <p className="text-[#8e8e93] text-sm leading-relaxed mt-1">
              Puoi aggiungere la pagina e una nota personale.
            </p>
          </motion.button>
        ) : (
          <div className="space-y-3">

            <AnimatePresence
              initial={false}
            >
              {citations.map(
                (
                  citation,
                  index
                ) => (
                  <motion.article
                    layout
                    key={
                      citation.id
                    }
                    initial={{
                      opacity: 0,
                      y: 10,
                      scale: 0.985,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.97,
                      y: -6,
                    }}
                    transition={{
                      delay:
                        Math.min(
                          index *
                            0.035,
                          0.18
                        ),
                      type:
                        'spring',
                      stiffness:
                        320,
                      damping:
                        28,
                    }}
                    className="exl-glass exl-card overflow-hidden"
                  >
                    <div className="p-5">

                      <div className="flex items-start justify-between gap-4">

                        <Quote
                          size={25}
                          className="text-[#5E7FA3]/45 shrink-0 mt-0.5"
                          fill="currentColor"
                        />

                        {citation.page && (
                          <span className="rounded-full bg-black/5 dark:bg-white/10 px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 text-[#636366] dark:text-[#c7c7cc] shrink-0">
                            <Hash
                              size={11}
                            />

                            {citation.page}
                          </span>
                        )}

                      </div>

                      <p className="text-[17px] md:text-[18px] leading-[1.55] tracking-[-0.012em] mt-3 whitespace-pre-wrap">
                        “{citation.quote_text}”
                      </p>

                      {citation.note && (
                        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10 flex gap-2.5">

                          <MessageSquareText
                            size={16}
                            className="text-[#8e8e93] shrink-0 mt-0.5"
                          />

                          <p className="text-[#6e6e73] dark:text-[#aeaeb2] text-sm leading-relaxed whitespace-pre-wrap">
                            {citation.note}
                          </p>

                        </div>
                      )}

                    </div>

                    <div className="grid grid-cols-3 border-t border-black/5 dark:border-white/10">

                      <button
                        onClick={() =>
                          copyCitation(
                            citation
                          )
                        }
                        className="min-h-[44px] flex items-center justify-center gap-1.5 text-[12px] font-semibold exl-press"
                      >
                        {copiedId ===
                        citation.id ? (
                          <>
                            <Check
                              size={14}
                            />
                            Copiata
                          </>
                        ) : (
                          <>
                            <Copy
                              size={14}
                            />
                            Copia
                          </>
                        )}
                      </button>

                      <button
                        onClick={() =>
                          openEdit(
                            citation
                          )
                        }
                        className="min-h-[44px] flex items-center justify-center gap-1.5 text-[12px] font-semibold border-l border-black/5 dark:border-white/10 exl-press"
                      >
                        <Pencil
                          size={14}
                        />
                        Modifica
                      </button>

                      <button
                        onClick={() =>
                          setDeleteTarget(
                            citation
                          )
                        }
                        className="min-h-[44px] flex items-center justify-center gap-1.5 text-[12px] font-semibold text-[#ff3b30] border-l border-black/5 dark:border-white/10 exl-press"
                      >
                        <Trash2
                          size={14}
                        />
                        Elimina
                      </button>

                    </div>

                  </motion.article>
                )
              )}
            </AnimatePresence>

          </div>
        )}

        {error &&
          !editorOpen && (
          <p className="text-[#ff3b30] text-sm mt-3 px-1">
            {error}
          </p>
        )}

      </section>

      <AdaptiveGlassModal
        open={editorOpen}
        onClose={closeEditor}
        eyebrow="Ex Libris"
        title={
          editingId
            ? 'Modifica citazione'
            : 'Nuova citazione'
        }
        maxWidth="560px"
      >

        <div className="px-5 pb-5">

          <div className="pt-2">

            <label className="text-[#8e8e93] text-xs ml-2">
              Citazione
            </label>

            <div className="relative mt-1">

              <Quote
                size={20}
                className="absolute left-4 top-4 text-[#5E7FA3]/50"
              />

              <textarea
                autoFocus
                value={quoteText}
                onChange={(
                  event
                ) =>
                  setQuoteText(
                    event.target.value
                  )
                }
                rows={7}
                placeholder="Scrivi o incolla qui la frase…"
                className="w-full bg-black/[0.035] dark:bg-white/[0.07] rounded-[22px] pl-12 pr-4 py-4 outline-none resize-none leading-relaxed border border-black/[0.025] dark:border-white/[0.06] focus:bg-black/[0.05] dark:focus:bg-white/[0.09] transition-colors"
              />

            </div>

          </div>

          <div className="mt-4">

            <label className="text-[#8e8e93] text-xs ml-2">
              Pagina
            </label>

            <input
              inputMode="numeric"
              value={page}
              onChange={(
                event
              ) =>
                setPage(
                  event.target.value.replace(
                    /\D/g,
                    ''
                  )
                )
              }
              placeholder={
                pages
                  ? `1–${pages}`
                  : 'Facoltativa'
              }
              className="w-full bg-black/[0.035] dark:bg-white/[0.07] rounded-[18px] px-4 py-3.5 mt-1 outline-none border border-black/[0.025] dark:border-white/[0.06] focus:bg-black/[0.05] dark:focus:bg-white/[0.09] transition-colors"
            />

          </div>

          <div className="mt-4">

            <label className="text-[#8e8e93] text-xs ml-2">
              Nota personale
            </label>

            <textarea
              value={note}
              onChange={(
                event
              ) =>
                setNote(
                  event.target.value
                )
              }
              rows={3}
              placeholder="Perché vuoi ricordarla?"
              className="w-full bg-black/[0.035] dark:bg-white/[0.07] rounded-[18px] px-4 py-3.5 mt-1 outline-none resize-none leading-relaxed border border-black/[0.025] dark:border-white/[0.06] focus:bg-black/[0.05] dark:focus:bg-white/[0.09] transition-colors"
            />

          </div>

          {error && (
            <motion.p
              initial={{
                opacity: 0,
                y: -3,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="text-[#ff3b30] text-sm mt-4 px-1"
            >
              {error}
            </motion.p>
          )}

          <button
            disabled={saving}
            onClick={saveCitation}
            className="w-full bg-black text-white dark:bg-white dark:text-black rounded-[19px] py-4 font-semibold mt-6 exl-press disabled:opacity-50"
          >
            {saving
              ? 'Salvataggio…'
              : editingId
                ? 'Salva modifiche'
                : 'Salva citazione'}
          </button>

        </div>

      </AdaptiveGlassModal>

      <ExLibrisConfirmDialog
        open={
          Boolean(
            deleteTarget
          )
        }
        title="Eliminare la citazione?"
        message="La citazione e la relativa nota personale verranno eliminate definitivamente."
        confirmLabel="Elimina"
        destructive
        onCancel={() =>
          setDeleteTarget(
            null
          )
        }
        onConfirm={
          deleteCitation
        }
      />

    </>
  )
}
