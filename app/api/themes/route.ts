import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

// GET: جلب المظاهر من Supabase
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    const respond = (payload: Record<string, unknown>) => {
      const response = NextResponse.json(payload)
      response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
      return response
    }

    if (studentId) {
      const { data, error } = await supabase
        .from("students")
        .select("preferred_theme")
        .eq("id", studentId)
        .single()

      if (error || !data) {
        return respond({ theme: null })
      }
      return respond({ theme: data.preferred_theme || null })
    }

    // جلب كل المظاهر
    const { data, error } = await supabase
      .from("students")
      .select("id, preferred_theme")

    if (error || !data) {
      return respond({ themes: {} })
    }

    const themes: Record<string, string> = {}
    for (const row of data) {
      if (row.preferred_theme) themes[row.id] = row.preferred_theme
    }

    return respond({ themes })
  } catch (error: any) {
    console.error("[themes] Error fetching themes:", error)
    const studentId = new URL(request.url).searchParams.get("studentId")
    const response = NextResponse.json(studentId ? { theme: null } : { themes: {} })
    response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120")
    return response
  }
}

// POST: حفظ مظهر طالب في Supabase
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { studentId, theme } = await request.json()

    if (!studentId || !theme) {
      return NextResponse.json({ error: "Missing studentId or theme" }, { status: 400 })
    }

    const { error } = await supabase
      .from("students")
      .update({ preferred_theme: theme })
      .eq("id", studentId)

    if (error) {
      console.error("[themes] Error saving theme:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[themes] Error saving theme:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
