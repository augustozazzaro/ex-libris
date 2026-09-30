const PREFIX =
  'exlibris-cache-v2:'

type CacheEnvelope<T> = {
  savedAt: number
  value: T
}

/*
 * Primo livello:
 * memoria JS.
 *
 * Durante la navigazione fra route
 * evita perfino JSON.parse e accessi
 * ripetuti a sessionStorage.
 */
const memoryCache =
  new Map<
    string,
    CacheEnvelope<unknown>
  >()

function fullKey(
  key: string
) {
  return `${PREFIX}${key}`
}

export function readCache<T>(
  key: string,
  maxAge =
    12 * 60 * 60 * 1000
): T | null {
  if (
    typeof window ===
    'undefined'
  ) {
    return null
  }

  const storageKey =
    fullKey(key)

  /*
   * RAM prima di tutto.
   */
  const memory =
    memoryCache.get(
      storageKey
    ) as
      | CacheEnvelope<T>
      | undefined

  if (memory) {
    if (
      Date.now() -
        memory.savedAt <=
      maxAge
    ) {
      return memory.value
    }

    memoryCache.delete(
      storageKey
    )
  }

  /*
   * Secondo livello:
   * sessionStorage.
   */
  try {
    const raw =
      sessionStorage.getItem(
        storageKey
      )

    if (!raw) {
      return null
    }

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
        storageKey
      )

      return null
    }

    /*
     * Promuoviamo subito
     * il valore in RAM.
     */
    memoryCache.set(
      storageKey,
      parsed
    )

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

  const storageKey =
    fullKey(key)

  const envelope:
    CacheEnvelope<T> = {
      savedAt:
        Date.now(),
      value,
    }

  /*
   * RAM immediata.
   */
  memoryCache.set(
    storageKey,
    envelope as CacheEnvelope<unknown>
  )

  /*
   * Persistenza per la sessione.
   */
  try {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify(
        envelope
      )
    )
  } catch {
    /*
     * Se lo storage è pieno/non
     * disponibile, la cache RAM
     * continua comunque a funzionare.
     */
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

  const storageKey =
    fullKey(key)

  memoryCache.delete(
    storageKey
  )

  try {
    sessionStorage.removeItem(
      storageKey
    )
  } catch {}
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

  for (
    const key of keys
  ) {
    removeCache(key)
  }
}

/*
 * Utile al logout o quando cambia
 * account nello stesso browser.
 */
export function clearExLibrisCache() {
  if (
    typeof window ===
    'undefined'
  ) {
    return
  }

  memoryCache.clear()

  try {
    const keys:
      string[] = []

    for (
      let index = 0;
      index <
      sessionStorage.length;
      index += 1
    ) {
      const key =
        sessionStorage.key(
          index
        )

      if (
        key?.startsWith(
          PREFIX
        )
      ) {
        keys.push(key)
      }
    }

    keys.forEach(
      key =>
        sessionStorage.removeItem(
          key
        )
    )
  } catch {}
}

/*
 * Rimuove tutte le cache il cui nome logico
 * inizia con uno dei prefissi indicati.
 *
 * Esempio:
 * removeCachePrefixes([
 *   `book:${userId}:`,
 *   `home:${userId}`,
 * ])
 */
export function removeCachePrefixes(
  prefixes: string[]
) {
  if (
    typeof window ===
    'undefined'
  ) {
    return
  }

  const storagePrefixes =
    prefixes.map(
      prefix =>
        fullKey(prefix)
    )

  /*
   * RAM.
   */
  for (
    const key of
    Array.from(
      memoryCache.keys()
    )
  ) {
    if (
      storagePrefixes.some(
        prefix =>
          key.startsWith(
            prefix
          )
      )
    ) {
      memoryCache.delete(
        key
      )
    }
  }

  /*
   * sessionStorage.
   */
  try {
    const keysToRemove:
      string[] = []

    for (
      let index = 0;
      index <
      sessionStorage.length;
      index += 1
    ) {
      const key =
        sessionStorage.key(
          index
        )

      if (
        key &&
        storagePrefixes.some(
          prefix =>
            key.startsWith(
              prefix
            )
        )
      ) {
        keysToRemove.push(
          key
        )
      }
    }

    keysToRemove.forEach(
      key =>
        sessionStorage.removeItem(
          key
        )
    )
  } catch {}
}

/*
 * Invalidazione centrale dei dati
 * che possono cambiare quando viene
 * modificato un libro o lo stato di lettura.
 */
export function invalidateUserLibraryCaches(
  userId: string
) {
  removeCachePrefixes([
    `home:${userId}`,
    `catalog:${userId}`,
    `profile:${userId}`,
    `shuffle:${userId}`,
    `favorites:${userId}`,
    `my-books:${userId}`,
    `citations:${userId}`,
    `locations:${userId}`,
    `loans:${userId}`,
    `book:${userId}:`,
  ])
}
