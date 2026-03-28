import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    const respond = (payload: Record<string, unknown>, status = 200) => {
      const response = NextResponse.json(payload, { status })
      response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
      return response
    }

    if (studentId) {
      const { data, error } = await supabase
        .from("student_preferences")
        .select("active_badge")
        .eq("student_id", studentId)
        .single()

      if (error || !data) {
        return respond({ badge: null })
      }
      return respond({ badge: data.active_badge || null })
    }

    // جلب كل الشارات
    const { data, error } = await supabase
      .from("student_preferences")
      .select("student_id, active_badge")

    if (error || !data) {
      return respond({ badges: {} })
    }

    const badges: Record<string, string> = {}
    for (const row of data) {
      if (row.active_badge) badges[row.student_id] = row.active_badge
    }

    return respond({ badges })
  } catch (error) {
    console.error("[badges] Error in GET /api/badges:", error)
    const response = NextResponse.json({ badges: {} }, { status: 500 })
    response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120")
    return response
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { studentId, badge } = await request.json()

    if (!studentId || !badge) {
      return NextResponse.json({ error: "Student ID and badge required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("student_preferences")
      .upsert(
        { student_id: studentId, active_badge: badge },
        { onConflict: "student_id" }
      )

    if (error) {
      console.error("[badges] Error saving badge:", error)
      return NextResponse.json({ error: "Failed to save badge" }, { status: 500 })
    }

    return NextResponse.json({ success: true, badge })
  } catch (error) {
    console.error("[badges] Error in POST /api/badges:", error)
    return NextResponse.json({ error: "Failed to save badge" }, { status: 500 })
  }
}
