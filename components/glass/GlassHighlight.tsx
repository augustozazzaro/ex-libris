'use client'

type Props = {
  className?: string
}

export default function GlassHighlight({
  className = '',
}: Props) {
  return (
    <>
      <div
        aria-hidden
        className={`
          pointer-events-none
          absolute inset-0
          rounded-[inherit]
          overflow-hidden
          ${className}
        `}
      >
        <div
          className="
            absolute
            w-[180px]
            h-[180px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            opacity-[0.28]
            blur-[12px]
            bg-white
          "
          style={{
            left:
              'var(--glass-x, 50%)',
            top:
              'var(--glass-y, 15%)',
          }}
        />

        <div
          className="
            absolute inset-0
            rounded-[inherit]
            bg-gradient-to-b
            from-white/[0.20]
            via-white/[0.035]
            to-transparent
          "
        />

        <div
          className="
            absolute inset-[1px]
            rounded-[inherit]
            border
            border-white/[0.28]
          "
        />
      </div>
    </>
  )
}
