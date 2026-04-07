import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getSupabasePublicConfig } from "@/lib/supabase-config"

export async function getSupabaseServer() {
  const cookieStore = await cookies()

  const { url: supabaseUrl, publishableKey: supabaseKey } = getSupabasePublicConfig()

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not set!")
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // في حالة Server Components
        }
      },
    },
  })
}

export const createClient = getSupabaseServer
