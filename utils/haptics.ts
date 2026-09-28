export type HapticKind =
  | 'light'
  | 'medium'
  | 'success'
  | 'warning'
  | 'error'

const patterns: Record<
  HapticKind,
  number | number[]
> = {
  light: 8,
  medium: 16,
  success: [10, 35, 14],
  warning: [18, 30, 18],
  error: [24, 35, 24],
}

export function haptic(
  kind: HapticKind = 'light'
) {
  if (
    typeof window === 'undefined' ||
    !('vibrate' in navigator)
  ) {
    return
  }

  try {
    navigator.vibrate(
      patterns[kind]
    )
  } catch {
    // Nessun feedback aptico disponibile.
  }
}
