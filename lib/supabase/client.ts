import { createBrowserClient } from "@supabase/ssr"
import { getSupabasePublicConfig } from "@/lib/supabase-config"

export function createClient() {
  const { url: supabaseUrl, publishableKey: supabaseKey } = getSupabasePublicConfig()

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not set!")
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
