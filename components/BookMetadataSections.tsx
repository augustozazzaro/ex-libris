'use client'

import {
  BookMarked,
  Languages,
  LibraryBig,
  NotebookText,
  Barcode,
} from 'lucide-react'

type Props = {
  categories?: string[] | null
  language?: string | null
  publisher?: string | null
  series?: string | null
  format?: string | null
  isbn10?: string | null
  isbn13?: string | null
  bibliographicNotes?: string | null
  notes?: string | null
}

export default function BookMetadataSections({
  categories,
  language,
  publisher,
  series,
  format,
  isbn10,
  isbn13,
  bibliographicNotes,
  notes,
}: Props) {
  const cleanCategories =
    (categories ?? [])
      .filter(Boolean)
      .slice(0, 8)

  const hasEditorial =
    Boolean(publisher) ||
    Boolean(series) ||
    Boolean(format) ||
    Boolean(isbn10) ||
    Boolean(isbn13)

  return (
    <div className="space-y-3 mt-5">

      {cleanCategories.length > 0 && (
        <section className="exl-glass exl-card p-5">

          <div className="flex items-center gap-2">
            <BookMarked
              size={18}
              className="text-[#5E7FA3]"
            />

            <h2 className="font-bold text-[18px]">
              Generi
            </h2>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {cleanCategories.map(
              (category) => (
                <span
                  key={category}
                  className="px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-[13px]"
                >
                  {category}
                </span>
              )
            )}
          </div>

        </section>
      )}

      {language && (
        <section className="exl-glass exl-card p-5">

          <div className="flex items-center gap-2">
            <Languages
              size={18}
              className="text-[#5E7FA3]"
            />

            <h2 className="font-bold text-[18px]">
              Lingua
            </h2>
          </div>

          <p className="mt-3 text-[#48484a] dark:text-[#d1d1d6]">
            {language}
          </p>

        </section>
      )}

      {hasEditorial && (
        <section className="exl-glass exl-card p-5">

          <div className="flex items-center gap-2">
            <LibraryBig
              size={18}
              className="text-[#5E7FA3]"
            />

            <h2 className="font-bold text-[18px]">
              Edizione
            </h2>
          </div>

          <div className="divide-y divide-black/5 dark:divide-white/10 mt-3">

            {publisher && (
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="text-[#8e8e93] text-sm">
                  Editore
                </span>

                <span className="font-medium text-right">
                  {publisher}
                </span>
              </div>
            )}

            {series && (
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="text-[#8e8e93] text-sm">
                  Collana
                </span>

                <span className="font-medium text-right">
                  {series}
                </span>
              </div>
            )}

            {format && (
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="text-[#8e8e93] text-sm">
                  Formato
                </span>

                <span className="font-medium text-right">
                  {format}
                </span>
              </div>
            )}

            {isbn13 && (
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="text-[#8e8e93] text-sm flex items-center gap-1.5">
                  <Barcode size={15} />
                  ISBN 13
                </span>

                <span className="font-medium text-right break-all">
                  {isbn13}
                </span>
              </div>
            )}

            {isbn10 && (
              <div className="py-3 flex items-center justify-between gap-4">
                <span className="text-[#8e8e93] text-sm flex items-center gap-1.5">
                  <Barcode size={15} />
                  ISBN 10
                </span>

                <span className="font-medium text-right break-all">
                  {isbn10}
                </span>
              </div>
            )}

          </div>

        </section>
      )}

      {bibliographicNotes && (
        <section className="exl-glass exl-card p-5">

          <div className="flex items-center gap-2">
            <NotebookText
              size={18}
              className="text-[#5E7FA3]"
            />

            <h2 className="font-bold text-[18px]">
              Note sull'edizione
            </h2>
          </div>

          <p className="text-[#48484a] dark:text-[#d1d1d6] leading-relaxed mt-3">
            {bibliographicNotes}
          </p>

        </section>
      )}

      {notes && (
        <section className="exl-glass exl-card p-5">

          <div className="flex items-center gap-2">
            <NotebookText
              size={18}
              className="text-[#5E7FA3]"
            />

            <h2 className="font-bold text-[18px]">
              Note
            </h2>
          </div>

          <p className="text-[#48484a] dark:text-[#d1d1d6] whitespace-pre-wrap leading-relaxed mt-3">
            {notes}
          </p>

        </section>
      )}

    </div>
  )
}
