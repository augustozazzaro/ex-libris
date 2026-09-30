/*
 * Normalizzazione conservativa dei metadata bibliografici.
 *
 * Obiettivo:
 * - togliere sintassi catalografica visibile all'utente;
 * - eliminare date biografiche dai nomi;
 * - convertire "Cognome, Nome" in "Nome Cognome";
 * - preservare accenti, apostrofi, iniziali e trattini.
 */

export function cleanBookText(
  value?: string | null
) {
  if (!value) return ''

  return value
    .normalize('NFC')
    .replace(/[\u0088\u0089]/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function cleanBookTitle(
  value?: string | null
) {
  return cleanBookText(value)
    /*
     * Alcuni record catalografici terminano
     * con slash o separatori rimasti dopo
     * la rimozione della responsabilità.
     */
    .replace(/\s*\/\s*$/, '')
    .replace(/\s*;\s*$/, '')
    .replace(/\s*:\s*$/, '')
    .trim()
}

export function cleanPersonName(
  value?: string | null
) {
  let text =
    cleanBookText(value)

  if (!text) return ''

  /*
   * Eventuale ruolo SBN:
   * [Traduttore] Mario Rossi
   */
  text = text.replace(
    /^\[[^\]]+\]\s*/,
    ''
  )

  /*
   * Qualificatori finali fra parentesi,
   * quando contengono date.
   *
   * "Mario Rossi (1930-2001)"
   */
  text = text.replace(
    /\s*\(\s*(?:ca\.?\s*)?\d{3,4}\s*[-–—]\s*(?:\d{3,4})?\s*\)\s*$/i,
    ''
  )

  /*
   * Date catalografiche dopo virgola:
   *
   * "Eco, Umberto, 1932-2016"
   * "Rossi, Mario, 1950-"
   */
  text = text.replace(
    /,\s*(?:ca\.?\s*)?\d{3,4}\s*[-–—]\s*(?:\d{3,4})?\s*$/i,
    ''
  )

  /*
   * Singola data finale.
   */
  text = text.replace(
    /,\s*(?:ca\.?\s*)?\d{3,4}\s*$/i,
    ''
  )

  /*
   * Qualificatori catalografici comuni.
   * Non tocchiamo normali parentesi che
   * potrebbero far parte di un nome.
   */
  text = text
    .replace(
      /\s*:\s*(?:autore|traduttore|illustratore|curatore)\s*$/i,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim()

  /*
   * Forma bibliografica:
   *
   * "Eco, Umberto" -> "Umberto Eco"
   *
   * Solo UNA virgola: evitiamo di
   * reinterpretare stringhe ambigue.
   */
  const commaParts =
    text
      .split(',')
      .map(part =>
        part.trim()
      )
      .filter(Boolean)

  if (
    commaParts.length === 2 &&
    !/\d/.test(
      commaParts.join('')
    )
  ) {
    const [
      surname,
      givenName,
    ] = commaParts

    if (
      surname &&
      givenName
    ) {
      text =
        `${givenName} ${surname}`
    }
  }

  return text
    .replace(/\s+/g, ' ')
    .trim()
}

export function cleanPeople(
  values?: string[] | null
) {
  const result: string[] = []
  const seen =
    new Set<string>()

  for (
    const raw of values ?? []
  ) {
    const value =
      cleanPersonName(raw)

    if (!value) continue

    const key =
      value
        .normalize('NFD')
        .replace(
          /[\u0300-\u036f]/g,
          ''
        )
        .toLocaleLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          ' '
        )
        .trim()

    if (
      !key ||
      seen.has(key)
    ) {
      continue
    }

    seen.add(key)
    result.push(value)
  }

  return result
}

export function cleanPeopleInput(
  value?: string | null
) {
  if (!value) return []

  return cleanPeople(
    value
      .split(',')
      .map(item =>
        item.trim()
      )
      .filter(Boolean)
  )
}
