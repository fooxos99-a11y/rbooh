import { createClient } from "@supabase/supabase-js"
import { getSupabaseServerConfig } from "@/lib/supabase-config"

export function createAdminClient() {
  const { url: supabaseUrl, serviceRoleKey } = getSupabaseServerConfig()

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin environment variables are not set!")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}