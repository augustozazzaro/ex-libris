'use client'

import Link from 'next/link'

import {
  ChevronRight,
  MapPinned,
  Settings,
  UsersRound,
  UserRound,
} from 'lucide-react'

export default function SettingsPage() {
  return (
    <main className="exl-page">

      <div className="max-w-2xl mx-auto px-5 pt-[calc(20px+env(safe-area-inset-top))] md:pt-10">

        <header>

          <p className="text-[#8e8e93] text-sm">
            Ex Libris
          </p>

          <h1 className="text-[38px] font-bold tracking-[-0.045em] leading-none mt-1">
            Impostazioni
          </h1>

        </header>

        <section className="exl-glass exl-card overflow-hidden mt-7">

          <SettingRow
            href="/family"
            icon={UsersRound}
            title="Famiglia"
            subtitle="Membri, account e inviti"
          />

          <SettingRow
            href="/locations"
            icon={MapPinned}
            title="Posizioni"
            subtitle="Case, stanze, librerie e ripiani"
            bordered
          />

          <SettingRow
            href="/profile"
            icon={UserRound}
            title="Account"
            subtitle="Profilo e accesso"
            bordered
          />

        </section>

        <div className="mt-6 px-2">

          <p className="text-[#8e8e93] text-xs leading-relaxed">
            Le posizioni definiscono la struttura fisica
            della biblioteca. Normalmente vengono configurate
            una volta e modificate solo quando cambia
            l&apos;organizzazione dei libri.
          </p>

        </div>

      </div>

    </main>
  )
}

function SettingRow({
  href,
  icon: Icon,
  title,
  subtitle,
  bordered = false,
}: {
  href: string
  icon: React.ComponentType<{
    size?: number
  }>
  title: string
  subtitle: string
  bordered?: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 p-4 exl-press ${
        bordered
          ? 'border-t border-black/5'
          : ''
      }`}
    >

      <div className="w-11 h-11 rounded-[14px] bg-black/5 flex items-center justify-center shrink-0">

        <Icon size={21} />

      </div>

      <div className="flex-1 min-w-0">

        <p className="font-semibold">
          {title}
        </p>

        <p className="text-[#8e8e93] text-sm mt-0.5">
          {subtitle}
        </p>

      </div>

      <ChevronRight
        size={18}
        className="text-[#c7c7cc]"
      />

    </Link>
  )
}
