import {
  createBrowserClient,
} from '@supabase/ssr'

type BrowserClient =
  ReturnType<
    typeof createBrowserClient
  >

let browserClient:
  BrowserClient | null = null

export function createClient() {
  if (
    typeof window ===
    'undefined'
  ) {
    return createBrowserClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
  }

  if (!browserClient) {
    browserClient =
      createBrowserClient(
        process.env
          .NEXT_PUBLIC_SUPABASE_URL!,
        process.env
          .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      )
  }

  return browserClient
}
