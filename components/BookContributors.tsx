'use client'

import {
  Brush,
  Languages,
  PenLine,
  UserRound,
} from 'lucide-react'

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
      names: translators ?? [],
      icon: Languages,
    },
    {
      role: 'Curatela',
      names: editors ?? [],
      icon: PenLine,
    },
    {
      role: 'Illustrazioni',
      names: illustrators ?? [],
      icon: Brush,
    },
    {
      role: 'Introduzione e prefazione',
      names: introductions ?? [],
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
    <section className="exl-glass exl-card p-5 mt-5">

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
              className="flex items-start gap-3 py-3.5"
            >

              <div className="w-9 h-9 rounded-[12px] bg-[#5E7FA3]/12 flex items-center justify-center shrink-0">
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
