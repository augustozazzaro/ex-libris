'use client'

import {
  Barcode,
  BookMarked,
  FileText,
  Languages,
  LibraryBig,
  NotebookText,
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
    [...new Set(
      (categories ?? [])
        .map(
          category =>
            category.trim()
        )
        .filter(Boolean)
    )]
      .slice(0, 8)

  const hasEdition =
    Boolean(publisher) ||
    Boolean(series) ||
    Boolean(language) ||
    Boolean(format) ||
    Boolean(isbn13) ||
    Boolean(isbn10)

  const hasDetails =
    hasEdition ||
    cleanCategories.length > 0 ||
    Boolean(bibliographicNotes)

  if (
    !hasDetails &&
    !notes
  ) {
    return null
  }

  return (
    <div className="mt-5 space-y-3">

      {hasDetails && (
        <section className="exl-glass exl-card overflow-hidden">

          <div className="p-5 pb-4">

            <p className="text-[#8e8e93] text-xs">
              Informazioni bibliografiche
            </p>

            <h2 className="text-[20px] font-bold tracking-[-0.025em] mt-0.5">
              Dettagli del libro
            </h2>

          </div>

          {hasEdition && (
            <div className="mx-5 border-t border-black/5 dark:border-white/10">

              <div className="flex items-center gap-2 pt-4 pb-1">

                <LibraryBig
                  size={16}
                  className="text-[#5E7FA3]"
                />

                <p className="font-semibold text-[15px]">
                  Edizione
                </p>

              </div>

              <div className="divide-y divide-black/5 dark:divide-white/10">

                {publisher && (
                  <DetailRow
                    label="Editore"
                    value={publisher}
                  />
                )}

                {series && (
                  <DetailRow
                    label="Collana"
                    value={series}
                  />
                )}

                {(language || format) && (
                  <div className="py-3 flex items-center justify-between gap-4">

                    <div className="flex items-center gap-1.5 text-[#8e8e93] text-sm">
                      <Languages size={14} />
                      Lingua · formato
                    </div>

                    <p className="font-medium text-right text-[14px]">
                      {[
                        language,
                        format,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>

                  </div>
                )}

                {(isbn13 || isbn10) && (
                  <div className="py-3 flex items-start justify-between gap-4">

                    <div className="flex items-center gap-1.5 text-[#8e8e93] text-sm shrink-0">
                      <Barcode size={14} />
                      ISBN
                    </div>

                    <div className="text-right min-w-0">

                      {isbn13 && (
                        <p className="font-medium text-[13px] break-all">
                          {isbn13}
                        </p>
                      )}

                      {isbn10 && (
                        <p className="text-[#8e8e93] text-[12px] break-all mt-0.5">
                          {isbn10}
                        </p>
                      )}

                    </div>

                  </div>
                )}

              </div>

            </div>
          )}

          {cleanCategories.length > 0 && (
            <div className="mx-5 border-t border-black/5 dark:border-white/10 py-4">

              <div className="flex items-center gap-2">

                <BookMarked
                  size={16}
                  className="text-[#5E7FA3]"
                />

                <p className="font-semibold text-[15px]">
                  Generi
                </p>

              </div>

              <div className="flex flex-wrap gap-2 mt-3">

                {cleanCategories.map(
                  category => (
                    <span
                      key={category}
                      className="px-3 py-1.5 rounded-full bg-black/[0.045] dark:bg-white/[0.08] text-[12px] leading-tight"
                    >
                      {category}
                    </span>
                  )
                )}

              </div>

            </div>
          )}

          {bibliographicNotes && (
            <div className="mx-5 border-t border-black/5 dark:border-white/10 py-4">

              <div className="flex items-center gap-2">

                <FileText
                  size={16}
                  className="text-[#5E7FA3]"
                />

                <p className="font-semibold text-[15px]">
                  Note sull'edizione
                </p>

              </div>

              <p className="text-[#636366] dark:text-[#c7c7cc] text-[13px] leading-relaxed mt-2">
                {bibliographicNotes}
              </p>

            </div>
          )}

        </section>
      )}

      {notes && (
        <section className="exl-glass exl-card p-5">

          <div className="flex items-center gap-2">

            <NotebookText
              size={17}
              className="text-[#5E7FA3]"
            />

            <div>

              <p className="text-[#8e8e93] text-xs">
                Personali
              </p>

              <h2 className="font-bold text-[18px]">
                Note
              </h2>

            </div>

          </div>

          <p className="text-[#48484a] dark:text-[#d1d1d6] whitespace-pre-wrap leading-relaxed text-[14px] mt-3">
            {notes}
          </p>

        </section>
      )}

    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="py-3 flex items-start justify-between gap-4">

      <span className="text-[#8e8e93] text-sm shrink-0">
        {label}
      </span>

      <span className="font-medium text-right text-[14px]">
        {value}
      </span>

    </div>
  )
}
