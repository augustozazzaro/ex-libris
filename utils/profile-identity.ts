export type ProfileIdentity = {
  userId: string
  fullName: string
  avatarUrl: string
}

const KEY =
  'exlibris-profile-identity'

let memoryIdentity:
  ProfileIdentity | null = null

export function readProfileIdentity() {
  if (memoryIdentity) {
    return memoryIdentity
  }

  if (
    typeof window ===
    'undefined'
  ) {
    return null
  }

  try {
    const raw =
      localStorage.getItem(
        KEY
      )

    if (!raw) {
      return null
    }

    const value =
      JSON.parse(
        raw
      ) as ProfileIdentity

    memoryIdentity =
      value

    return value
  } catch {
    return null
  }
}

export function writeProfileIdentity(
  value: ProfileIdentity
) {
  memoryIdentity =
    value

  if (
    typeof window !==
    'undefined'
  ) {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify(
          value
        )
      )
    } catch {}
  }

  window.dispatchEvent(
    new CustomEvent(
      'exlibris-profile-change',
      {
        detail: value,
      }
    )
  )
}

export function clearProfileIdentity() {
  memoryIdentity =
    null

  if (
    typeof window !==
    'undefined'
  ) {
    localStorage.removeItem(
      KEY
    )

    window.dispatchEvent(
      new CustomEvent(
        'exlibris-profile-change'
      )
    )
  }
}

export function initialsFor(
  fullName: string
) {
  return (
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(
        part =>
          part[0]
            ?.toUpperCase()
      )
      .join('') ||
    'EL'
  )
}
