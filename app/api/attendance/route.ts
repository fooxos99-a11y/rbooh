import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { canAccessStudent, canManageHalaqah, getRequestActor, isTeacherRole } from "@/lib/request-auth"
import { getSaudiAttendanceAnchorDate } from "@/lib/saudi-time"
import {
  applyAttendancePointsAdjustment,
  calculateEvaluationLevelPoints,
  calculateTotalEvaluationPoints,
  isEvaluatedAttendance,
  isNonEvaluatedAttendance,
} from "@/lib/student-attendance"

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

function hasCompleteEvaluation(levels: {
  hafiz_level?: string | null
  tikrar_level?: string | null
  samaa_level?: string | null
  rabet_level?: string | null
}) {
  return !!levels.hafiz_level
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const actor = await getRequestActor(request, supabase)
    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get("student_id")
    const halaqah = searchParams.get("halaqah")

    // Check if attendance was already saved today for a halaqah
    if (halaqah) {
      if (!canManageHalaqah(actor, halaqah)) {
        return NextResponse.json({ error: "غير مصرح لك بعرض بيانات هذه الحلقة" }, { status: 403 })
      }

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

    const canViewStudent = await canAccessStudent({
      supabase,
      actor,
      studentId,
      allowStudentSelf: true,
      allowTeacher: true,
    })

    if (!canViewStudent) {
      return NextResponse.json({ error: "غير مصرح لك بعرض سجل هذا الطالب" }, { status: 403 })
    }

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

        const isAbsent = isNonEvaluatedAttendance(record.status)
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
    const supabase = await createClient()
    const actor = await getRequestActor(request, supabase)
    const body = await request.json()
    const {
      student_id,
      teacher_id,
      halaqah,
      status,
      report_date,
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
    const isPresent = isEvaluatedAttendance(normalizedStatus)

    if (
      isPresent &&
      !hasCompleteEvaluation({ hafiz_level, tikrar_level, samaa_level, rabet_level })
    ) {
      return NextResponse.json(
        { error: "يجب إكمال تقييم الحفظ للطالب الحاضر أو المتأخر قبل الحفظ" },
        { status: 400 },
      )
    }

    const isAuthorizedForHalaqah = canManageHalaqah(actor, halaqah)
    const isAuthorizedForStudent = await canAccessStudent({
      supabase,
      actor,
      studentId: student_id,
      allowStudentSelf: false,
      allowTeacher: true,
    })

    if (!actor || !isAuthorizedForHalaqah || !isAuthorizedForStudent) {
      return NextResponse.json({ error: "غير مصرح لك بتسجيل حضور هذا الطالب" }, { status: 403 })
    }

    if (isTeacherRole(actor.role) && actor.id !== teacher_id) {
      return NextResponse.json({ error: "لا يمكنك التسجيل باسم معلم آخر" }, { status: 403 })
    }

    // Get today's date in YYYY-MM-DD format (Asia/Riyadh timezone)
    const reportDateInput = typeof report_date === "string" && report_date.trim() ? report_date.trim() : getKsaDateString()
    const targetDate = getSaudiAttendanceAnchorDate(reportDateInput)
    console.log("[DEBUG] تاريخ الحفظ في السيرفر (Asia/Riyadh):", targetDate)
    if (debug_today) {
      console.log("[DEBUG] debug_today من المتصفح:", debug_today)
    }

    console.log("[v0] Adding evaluation for student:", student_id, "on date:", targetDate)

    // Check if there's already an attendance record for this student today
    const { data: existingRecord, error: checkError } = await supabase
      .from("attendance_records")
      .select("id, status")
      .eq("student_id", student_id)
      .eq("date", targetDate)
      .maybeSingle()

    if (checkError) {
      console.error("[v0] Error checking existing attendance:", checkError)
      return NextResponse.json({ error: "Failed to check existing attendance" }, { status: 500 })
    }

    let attendanceRecord
    const isUpdate = !!existingRecord
    let previousPoints = 0

    if (existingRecord) {
      console.log("[v0] Attendance already exists for student today, updating record:", existingRecord.id)

      const { data: oldEvaluation } = await supabase
        .from("evaluations")
        .select("hafiz_level, tikrar_level, samaa_level, rabet_level")
        .eq("attendance_record_id", existingRecord.id)
        .maybeSingle()

      if (oldEvaluation) {
        previousPoints = applyAttendancePointsAdjustment(
          calculateEvaluationLevelPoints(oldEvaluation.hafiz_level as any),
          existingRecord.status,
        )

        await supabase.from("evaluations").delete().eq("attendance_record_id", existingRecord.id)
      }

      const { data: updatedRecord, error: attendanceUpdateError } = await supabase
        .from("attendance_records")
        .update({
          teacher_id,
          halaqah,
          status: normalizedStatus,
          notes: notes ?? null,
        })
        .eq("id", existingRecord.id)
        .select()
        .single()

      if (attendanceUpdateError) {
        console.error("[v0] Error updating attendance record:", attendanceUpdateError)
        return NextResponse.json({ error: "فشل في تحديث سجل الحضور الحالي" }, { status: 500 })
      }

      attendanceRecord = updatedRecord

      if (previousPoints > 0) {
        const { data: currentStudent, error: fetchStudentError } = await supabase
          .from("students")
          .select("points, store_points")
          .eq("id", student_id)
          .single()

        if (!fetchStudentError && currentStudent) {
          await supabase
            .from("students")
            .update({
              points: Math.max(0, (currentStudent.points || 0) - previousPoints),
              store_points: Math.max(0, (currentStudent.store_points || 0) - previousPoints),
            })
            .eq("id", student_id)
        }
      }
    } else {
      const { data: newRecord, error: attendanceError } = await supabase
        .from("attendance_records")
        .insert({
          student_id,
          teacher_id,
          halaqah,
          status: normalizedStatus,
          date: targetDate,
          notes: notes ?? null,
        })
        .select()
        .single()

      if (attendanceError) {
        console.error("[v0] Error creating attendance record:", attendanceError)
        const isDuplicateAttendanceRecord = /duplicate key|23505|unique/i.test(
          `${attendanceError.message ?? ""} ${attendanceError.details ?? ""} ${attendanceError.hint ?? ""} ${attendanceError.code ?? ""}`,
        )
        const isLateConstraintFailure =
          normalizedStatus === "late" &&
          /status|check|constraint|invalid input value/i.test(
            `${attendanceError.message ?? ""} ${attendanceError.details ?? ""} ${attendanceError.hint ?? ""}`,
          )

        if (isDuplicateAttendanceRecord) {
          return NextResponse.json(
            { error: "تم حفظ حضور هذا الطالب مسبقًا لهذا اليوم" },
            { status: 409 },
          )
        }

        return NextResponse.json(
          {
            error: isLateConstraintFailure
              ? "قاعدة البيانات لا تسمح بعد بحالة متأخر في سجل الحضور. نفذ ملف scripts/042_allow_late_attendance_records.sql ثم أعد المحاولة."
              : attendanceError.message || "Failed to create attendance record",
            details: attendanceError.details ?? null,
            hint: attendanceError.hint ?? null,
            code: attendanceError.code ?? null,
          },
          { status: 500 },
        )
      }

      attendanceRecord = newRecord
    }

    if (!isEvaluatedAttendance(normalizedStatus)) {
      return NextResponse.json({
        success: true,
        attendance: attendanceRecord,
        pointsAdded: 0,
        isUpdate,
      })
    }

    if (hasCompleteEvaluation({ hafiz_level, tikrar_level, samaa_level, rabet_level })) {
      const hafizPoints = calculateEvaluationLevelPoints(hafiz_level)

      const rawPoints = hafizPoints
      const totalPoints = applyAttendancePointsAdjustment(rawPoints, normalizedStatus)

      console.log("[v0] Points breakdown:", {
        hafiz: hafizPoints,
        raw: rawPoints,
        penalty: normalizedStatus === "late" ? 8 : 0,
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
      { error: "يجب إكمال تقييم الحفظ للطالب الحاضر أو المتأخر قبل الحفظ" },
      { status: 400 },
    )
  } catch (error) {
    console.error("[v0] Error in attendance POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
