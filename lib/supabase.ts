import { createBrowserClient } from "@supabase/ssr"
import { getSupabasePublicConfig } from "@/lib/supabase-config"

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabase() {
  if (supabaseClient) {
    return supabaseClient
  }

  const { url: supabaseUrl, publishableKey: supabaseKey } = getSupabasePublicConfig()

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not set!")
  }

  supabaseClient = createBrowserClient(supabaseUrl, supabaseKey)

  return supabaseClient
}
