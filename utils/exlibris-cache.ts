const PREFIX =
  'exlibris-cache-v1:'

type CacheEnvelope<T> = {
  savedAt: number
  value: T
}

export function readCache<T>(
  key: string,
  maxAge =
    15 * 60 * 1000
): T | null {
  if (
    typeof window ===
    'undefined'
  ) {
    return null
  }

  try {
    const raw =
      sessionStorage.getItem(
        `${PREFIX}${key}`
      )

    if (!raw) return null

    const parsed =
      JSON.parse(
        raw
      ) as CacheEnvelope<T>

    if (
      Date.now() -
        parsed.savedAt >
      maxAge
    ) {
      sessionStorage.removeItem(
        `${PREFIX}${key}`
      )

      return null
    }

    return parsed.value
  } catch {
    return null
  }
}

export function writeCache<T>(
  key: string,
  value: T
) {
  if (
    typeof window ===
    'undefined'
  ) {
    return
  }

  try {
    const envelope:
      CacheEnvelope<T> = {
        savedAt: Date.now(),
        value,
      }

    sessionStorage.setItem(
      `${PREFIX}${key}`,
      JSON.stringify(
        envelope
      )
    )
  } catch {
    // Cache non disponibile:
    // l'app continua normalmente.
  }
}

export function removeCache(
  key: string
) {
  if (
    typeof window ===
    'undefined'
  ) {
    return
  }

  sessionStorage.removeItem(
    `${PREFIX}${key}`
  )
}

export function removeCaches(
  keys: string[]
) {
  if (
    typeof window ===
    'undefined'
  ) {
    return
  }

  for (const key of keys) {
    sessionStorage.removeItem(
      `${PREFIX}${key}`
    )
  }
}
