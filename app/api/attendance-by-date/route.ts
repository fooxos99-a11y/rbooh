import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getRequestActor } from "@/lib/request-auth"
import { getSaudiAttendanceAnchorDate } from "@/lib/saudi-time"

function isMissingUpdatedAtColumn(error: { code?: string | null; message?: string | null } | null) {
  if (!error) return false
  return error.code === "42703" && /updated_at/i.test(error.message || "")
}

function getSavedOnRange(savedOn: string) {
  const dayStart = new Date(`${savedOn}T00:00:00+03:00`)
  const dayEnd = new Date(dayStart)
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)

  return {
    dayStartIso: dayStart.toISOString(),
    dayEndIso: dayEnd.toISOString(),
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get("date")
    const savedOn = searchParams.get("saved_on")
    const circle = searchParams.get("circle")

    if (!date && !savedOn) {
      return NextResponse.json({ error: "date أو saved_on مطلوب" }, { status: 400 })
    }

    const authClient = await createClient()
    const actor = await getRequestActor(request, authClient)

    if (!actor) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const runAttendanceQuery = async (includeUpdatedAt: boolean) => {
      let query = supabase
        .from("attendance_records")
        .select(includeUpdatedAt ? "id, student_id, status, date, created_at, updated_at" : "id, student_id, status, date, created_at")

      if (date) {
        query = query.eq("date", getSaudiAttendanceAnchorDate(date))
      }

      if (savedOn) {
        const { dayStartIso, dayEndIso } = getSavedOnRange(savedOn)

        query = includeUpdatedAt
          ? query.or(
              `and(created_at.gte.${dayStartIso},created_at.lt.${dayEndIso}),and(updated_at.gte.${dayStartIso},updated_at.lt.${dayEndIso})`,
            )
          : query.gte("created_at", dayStartIso).lt("created_at", dayEndIso)
      }

      if (circle) {
        query = query.eq("halaqah", circle)
      }

      return query.order("id", { ascending: true })
    }

    let { data: records, error } = await runAttendanceQuery(true)

    if (isMissingUpdatedAtColumn(error)) {
      console.warn("[attendance-by-date] updated_at column not found, falling back to created_at only")
      const fallbackResult = await runAttendanceQuery(false)
      records = fallbackResult.data
      error = fallbackResult.error
    }

    if (error) {
      console.error("[attendance-by-date] Error fetching attendance records:", error)
      return NextResponse.json({ error: "Failed to fetch attendance records" }, { status: 500 })
    }

    const attendanceRecords = records || []
    if (attendanceRecords.length === 0) {
      const response = NextResponse.json({ records: [], count: 0 })
      response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
      return response
    }

    const studentIds = Array.from(new Set(attendanceRecords.map((record: any) => record.student_id).filter(Boolean)))
    const attendanceRecordIds = attendanceRecords.map((record: any) => record.id).filter(Boolean)

    const [{ data: students }, { data: evaluations, error: evaluationsError }] = await Promise.all([
      studentIds.length > 0
        ? supabase.from("students").select("id, name").in("id", studentIds)
        : Promise.resolve({ data: [], error: null }),
      attendanceRecordIds.length > 0
        ? supabase
            .from("evaluations")
            .select("attendance_record_id, hafiz_level, tikrar_level, samaa_level, rabet_level, hafiz_from_surah, hafiz_from_verse, hafiz_to_surah, hafiz_to_verse, samaa_from_surah, samaa_from_verse, samaa_to_surah, samaa_to_verse, rabet_from_surah, rabet_from_verse, rabet_to_surah, rabet_to_verse")
            .in("attendance_record_id", attendanceRecordIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (evaluationsError) {
      console.error("[attendance-by-date] Error fetching evaluations:", evaluationsError)
    }

    const studentNameById = new Map((students || []).map((student: any) => [student.id, student.name] as const))
    const evaluationByAttendanceId = new Map<string, any>()

    ;(evaluations || []).forEach((evaluation: any) => {
      if (!evaluation?.attendance_record_id) {
        return
      }

      if (!evaluationByAttendanceId.has(evaluation.attendance_record_id)) {
        evaluationByAttendanceId.set(evaluation.attendance_record_id, evaluation)
      }
    })

    const formattedRecords = attendanceRecords.map((record: any) => {
      const evaluation = evaluationByAttendanceId.get(record.id)

      return {
        student_id: record.student_id,
        student_name: studentNameById.get(record.student_id) || "Unknown",
        date: record.date,
        created_at: record.created_at || null,
        updated_at: record.updated_at || null,
        status: record.status,
        hafiz_level: evaluation?.hafiz_level || null,
        tikrar_level: evaluation?.tikrar_level || null,
        samaa_level: evaluation?.samaa_level || null,
        rabet_level: evaluation?.rabet_level || null,
        hafiz_from_surah: evaluation?.hafiz_from_surah || null,
        hafiz_from_verse: evaluation?.hafiz_from_verse || null,
        hafiz_to_surah: evaluation?.hafiz_to_surah || null,
        hafiz_to_verse: evaluation?.hafiz_to_verse || null,
        samaa_from_surah: evaluation?.samaa_from_surah || null,
        samaa_from_verse: evaluation?.samaa_from_verse || null,
        samaa_to_surah: evaluation?.samaa_to_surah || null,
        samaa_to_verse: evaluation?.samaa_to_verse || null,
        rabet_from_surah: evaluation?.rabet_from_surah || null,
        rabet_from_verse: evaluation?.rabet_from_verse || null,
        rabet_to_surah: evaluation?.rabet_to_surah || null,
        rabet_to_verse: evaluation?.rabet_to_verse || null,
      }
    })

    const response = NextResponse.json({ records: formattedRecords, count: formattedRecords.length })
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    return response
  } catch (error) {
    console.error("[attendance-by-date] Error in API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
