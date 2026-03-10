import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get("date")
    const circle = searchParams.get("circle")

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 })
    }

    console.log("[v0] Fetching attendance records for date:", date, "circle:", circle)

    const supabase = await createClient()

    let query = supabase.from("attendance_records").select("id, student_id, status, date").eq("date", date)

    if (circle) {
      query = query.eq("halaqah", circle)
    }

    const { data: records, error } = await query.order("id", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching attendance records:", error)
      return NextResponse.json({ error: "Failed to fetch attendance records" }, { status: 500 })
    }

    const formattedRecords = await Promise.all(
      (records || []).map(async (record: any) => {
        // جلب بيانات الطالب
        const { data: student } = await supabase.from("students").select("name").eq("id", record.student_id).single()

        // جلب بيانات التقييم
        const { data: evaluations } = await supabase
          .from("evaluations")
          .select("hafiz_level, tikrar_level, samaa_level, rabet_level, hafiz_from_surah, hafiz_from_verse, hafiz_to_surah, hafiz_to_verse, samaa_from_surah, samaa_from_verse, samaa_to_surah, samaa_to_verse, rabet_from_surah, rabet_from_verse, rabet_to_surah, rabet_to_verse")
          .eq("attendance_record_id", record.id)
          .single()

        return {
          student_id: record.student_id,
          student_name: student?.name || "Unknown",
          date: record.date,
          status: record.status,
          hafiz_level: evaluations?.hafiz_level || null,
          tikrar_level: evaluations?.tikrar_level || null,
          samaa_level: evaluations?.samaa_level || null,
          rabet_level: evaluations?.rabet_level || null,
          hafiz_from_surah: evaluations?.hafiz_from_surah || null,
          hafiz_from_verse: evaluations?.hafiz_from_verse || null,
          hafiz_to_surah: evaluations?.hafiz_to_surah || null,
          hafiz_to_verse: evaluations?.hafiz_to_verse || null,
          samaa_from_surah: evaluations?.samaa_from_surah || null,
          samaa_from_verse: evaluations?.samaa_from_verse || null,
          samaa_to_surah: evaluations?.samaa_to_surah || null,
          samaa_to_verse: evaluations?.samaa_to_verse || null,
          rabet_from_surah: evaluations?.rabet_from_surah || null,
          rabet_from_verse: evaluations?.rabet_from_verse || null,
          rabet_to_surah: evaluations?.rabet_to_surah || null,
          rabet_to_verse: evaluations?.rabet_to_verse || null,
        }
      }),
    )

    console.log("[v0] Found", formattedRecords.length, "records for date:", date, "circle:", circle)

    const response = NextResponse.json({ records: formattedRecords, count: formattedRecords.length })
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    return response
  } catch (error) {
    console.error("[v0] Error in attendance-by-date API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
