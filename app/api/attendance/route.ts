import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function getKsaDateString() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(new Date())
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  return `${year}-${month}-${day}`
}

function calculatePoints(level: string): number {
  switch (level) {
    case "excellent":
      return 10
    case "very_good":
      return 8
    case "good":
      return 6
    case "not_completed":
      return 4
    default:
      return 0
  }
}

function hasCompleteEvaluation(levels: {
  hafiz_level?: string | null
  tikrar_level?: string | null
  samaa_level?: string | null
  rabet_level?: string | null
}) {
  return !!(
    levels.hafiz_level &&
    levels.tikrar_level &&
    levels.samaa_level &&
    levels.rabet_level
  )
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get("student_id")
    const halaqah = searchParams.get("halaqah")

    // Check if attendance was already saved today for a halaqah
    if (halaqah) {
      const supabase = await createClient()
      const todayDate = getKsaDateString()

      const { data, error } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("halaqah", halaqah)
        .eq("date", todayDate)
        .limit(1)

      if (error) {
        return NextResponse.json({ error: "Failed to check" }, { status: 500 })
      }

      return NextResponse.json({ savedToday: (data?.length ?? 0) > 0 })
    }

    if (!studentId) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch attendance records for the student
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("student_id", studentId)
      .order("date", { ascending: false })

    if (attendanceError) {
      console.error("[v0] Error fetching attendance records:", attendanceError)
      return NextResponse.json({ error: "Failed to fetch attendance records" }, { status: 500 })
    }

    // Fetch evaluations for each attendance record
    const recordsWithEvaluations = await Promise.all(
      (attendanceData || []).map(async (record) => {
        const { data: evaluations } = await supabase
          .from("evaluations")
          .select("*")
          .eq("attendance_record_id", record.id)
          .order("created_at", { ascending: true });

        // اختر آخر تقييم (الأحدث)
        const lastEval = Array.isArray(evaluations) && evaluations.length > 0
          ? evaluations[evaluations.length - 1]
          : null;

        const isAbsent = record.status === "absent" || record.status === "excused";
        return {
          id: record.id,
          date: record.date,
          status: record.status,
          hafiz_level: isAbsent ? "not_completed" : (lastEval?.hafiz_level || null),
          tikrar_level: isAbsent ? "not_completed" : (lastEval?.tikrar_level || null),
          samaa_level: isAbsent ? "not_completed" : (lastEval?.samaa_level || null),
          rabet_level: isAbsent ? "not_completed" : (lastEval?.rabet_level || null),
          hafiz_from_surah: lastEval?.hafiz_from_surah || null,
          hafiz_from_verse: lastEval?.hafiz_from_verse || null,
          hafiz_to_surah: lastEval?.hafiz_to_surah || null,
          hafiz_to_verse: lastEval?.hafiz_to_verse || null,
          samaa_from_surah: lastEval?.samaa_from_surah || null,
          samaa_from_verse: lastEval?.samaa_from_verse || null,
          samaa_to_surah: lastEval?.samaa_to_surah || null,
          samaa_to_verse: lastEval?.samaa_to_verse || null,
          rabet_from_surah: lastEval?.rabet_from_surah || null,
          rabet_from_verse: lastEval?.rabet_from_verse || null,
          rabet_to_surah: lastEval?.rabet_to_surah || null,
          rabet_to_verse: lastEval?.rabet_to_verse || null,
        }
      }),
    )

    return NextResponse.json({ records: recordsWithEvaluations })
  } catch (error) {
    console.error("[v0] Error in attendance API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      student_id,
      teacher_id,
      halaqah,
      status,
      hafiz_level,
      tikrar_level,
      samaa_level,
      rabet_level,
      hafiz_from_surah,
      hafiz_from_verse,
      hafiz_to_surah,
      hafiz_to_verse,
      samaa_from_surah,
      samaa_from_verse,
      samaa_to_surah,
      samaa_to_verse,
      rabet_from_surah,
      rabet_from_verse,
      rabet_to_surah,
      rabet_to_verse,
      debug_today,
      notes,
    } = body

    // طباعة القيم المستلمة للتشخيص
    console.log("[DEBUG][API] Received attendance POST:")
    console.log("  student_id:", student_id)
    console.log("  teacher_id:", teacher_id)
    console.log("  halaqah:", halaqah)
    console.log("  status:", status)
    console.log("  hafiz_level:", hafiz_level)
    console.log("  tikrar_level:", tikrar_level)
    console.log("  samaa_level:", samaa_level)
    console.log("  rabet_level:", rabet_level)

    if (!student_id || !teacher_id || !halaqah) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const normalizedStatus = status || "present"
    const isPresent = normalizedStatus === "present"

    if (
      isPresent &&
      !hasCompleteEvaluation({ hafiz_level, tikrar_level, samaa_level, rabet_level })
    ) {
      return NextResponse.json(
        { error: "يجب إكمال جميع فروع التقييم للطالب الحاضر قبل الحفظ" },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    // Get today's date in YYYY-MM-DD format (Asia/Riyadh timezone)
    const todayDate = getKsaDateString()
    console.log("[DEBUG] تاريخ اليوم في السيرفر (Asia/Riyadh):", todayDate)
    if (debug_today) {
      console.log("[DEBUG] debug_today من المتصفح:", debug_today)
    }

    console.log("[v0] Adding evaluation for student:", student_id, "on date:", todayDate)

    // Check if there's already an attendance record for this student today
    const { data: existingRecord, error: checkError } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("student_id", student_id)
      .eq("date", todayDate)
      .maybeSingle()

    if (checkError) {
      console.error("[v0] Error checking existing attendance:", checkError)
      return NextResponse.json({ error: "Failed to check existing attendance" }, { status: 500 })
    }

    if (existingRecord) {
      console.log("[v0] Attendance already exists for student today:", existingRecord.id)
      return NextResponse.json(
        {
          error: "تم حفظ هذا الطالب مسبقاً اليوم ولا يمكن إعادة حفظه مرة أخرى",
          alreadySaved: true,
          attendanceRecordId: existingRecord.id,
        },
        { status: 409 },
      )
    }

    let attendanceRecord
    const isUpdate = false

    // Create new attendance record
    const { data: newRecord, error: attendanceError } = await supabase
      .from("attendance_records")
      .insert({
        student_id,
        teacher_id,
        halaqah,
        status: normalizedStatus,
        date: todayDate,
        notes: notes ?? null,
      })
      .select()
      .single()

    if (attendanceError) {
      console.error("[v0] Error creating attendance record:", attendanceError)
      return NextResponse.json({ error: "Failed to create attendance record" }, { status: 500 })
    }

    attendanceRecord = newRecord

    if (normalizedStatus !== "present") {
      return NextResponse.json({
        success: true,
        attendance: attendanceRecord,
        pointsAdded: 0,
        isUpdate,
      })
    }

    if (hasCompleteEvaluation({ hafiz_level, tikrar_level, samaa_level, rabet_level })) {
      const hafizPoints = calculatePoints(hafiz_level)
      const tikrarPoints = calculatePoints(tikrar_level)
      const samaaPoints = calculatePoints(samaa_level)
      const rabetPoints = calculatePoints(rabet_level)

      const totalPoints = hafizPoints + tikrarPoints + samaaPoints + rabetPoints

      console.log("[v0] Points breakdown:", {
        hafiz: hafizPoints,
        tikrar: tikrarPoints,
        samaa: samaaPoints,
        rabet: rabetPoints,
        total: totalPoints,
      })

      const { data: evaluation, error: evaluationError } = await supabase
        .from("evaluations")
        .insert({
          attendance_record_id: attendanceRecord.id,
          hafiz_level,
          tikrar_level,
          samaa_level,
          rabet_level,
          hafiz_from_surah,
          hafiz_from_verse,
          hafiz_to_surah,
          hafiz_to_verse,
          samaa_from_surah,
          samaa_from_verse,
          samaa_to_surah,
          samaa_to_verse,
          rabet_from_surah,
          rabet_from_verse,
          rabet_to_surah,
          rabet_to_verse,
        })
        .select()
        .single()

      if (evaluationError) {
        console.error("[v0] Error creating evaluation:", evaluationError)
        await supabase.from("attendance_records").delete().eq("id", attendanceRecord.id)
        return NextResponse.json(
          { error: "فشل في حفظ تقييم الطالب وتم التراجع عن سجل الحضور" },
          { status: 500 },
        )
      }

      console.log("[v0] Evaluation created:", evaluation.id)

      if (totalPoints > 0) {
        const { data: studentData, error: fetchError } = await supabase
          .from("students")
          .select("points, store_points")
          .eq("id", student_id)
          .single()

        if (fetchError) {
          console.error("[v0] Error fetching student points:", fetchError)
        } else {
          const currentPoints = studentData.points || 0
          const currentStorePoints = studentData.store_points || 0
          const newPoints = currentPoints + totalPoints
          const newStorePoints = currentStorePoints + totalPoints

          console.log("[v0] Updating student points and store_points:", {
            currentPoints,
            currentStorePoints,
            addedPoints: totalPoints,
            newPoints,
            newStorePoints,
          })

          const { error: updateError } = await supabase
            .from("students")
            .update({ points: newPoints, store_points: newStorePoints })
            .eq("id", student_id)

          if (updateError) {
            console.error("[v0] Error updating student points/store_points:", updateError)
          } else {
            console.log("[v0] Student points and store_points updated successfully to:", newPoints, newStorePoints)
          }
        }
      }

      return NextResponse.json({
        success: true,
        attendance: attendanceRecord,
        evaluation,
        pointsAdded: totalPoints,
        isUpdate,
      })
    }

    return NextResponse.json(
      { error: "يجب إكمال جميع فروع التقييم للطالب الحاضر قبل الحفظ" },
      { status: 400 },
    )
  } catch (error) {
    console.error("[v0] Error in attendance POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
