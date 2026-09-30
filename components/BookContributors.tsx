'use client'

import {
  Brush,
  Languages,
  PenLine,
  UserRound,
} from 'lucide-react'

import {
  cleanPeople,
} from '@/utils/book-metadata'

type Props = {
  translators?: string[] | null
  editors?: string[] | null
  illustrators?: string[] | null
  introductions?: string[] | null
}

type Row = {
  role: string
  names: string[]
  icon: typeof UserRound
}

export default function BookContributors({
  translators,
  editors,
  illustrators,
  introductions,
}: Props) {
  const rows: Row[] = [
    {
      role: 'Traduzione',
      names: cleanPeople(
        translators
      ),
      icon: Languages,
    },
    {
      role: 'Curatela',
      names: cleanPeople(
        editors
      ),
      icon: PenLine,
    },
    {
      role: 'Illustrazioni',
      names: cleanPeople(
        illustrators
      ),
      icon: Brush,
    },
    {
      role: 'Introduzione e prefazione',
      names: cleanPeople(
        introductions
      ),
      icon: UserRound,
    },
  ].filter(
    (row) =>
      row.names.length > 0
  )

  if (!rows.length) {
    return null
  }

  return (
    <section className="exl-glass exl-card px-5 py-4 mt-5">

      <p className="text-[#8e8e93] text-xs">
        Questa edizione
      </p>

      <h2 className="font-bold text-[19px] tracking-[-0.02em] mt-0.5">
        Contributori
      </h2>

      <div className="divide-y divide-black/5 dark:divide-white/10 mt-3">

        {rows.map(
          ({
            role,
            names,
            icon: Icon,
          }) => (
            <div
              key={role}
              className="flex items-start gap-3 py-3"
            >

              <div className="w-8 h-8 rounded-[11px] bg-[#5E7FA3]/12 flex items-center justify-center shrink-0">
                <Icon
                  size={17}
                  className="text-[#5E7FA3]"
                />
              </div>

              <div className="min-w-0">

                <p className="text-[#8e8e93] text-xs">
                  {role}
                </p>

                <p className="font-medium mt-0.5 leading-snug">
                  {names.join(', ')}
                </p>

              </div>

            </div>
          )
        )}

      </div>

    </section>
  )
}
