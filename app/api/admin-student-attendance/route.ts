import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSiteSetting } from "@/lib/site-settings"
import { getSaudiWeekday, isSaudiAttendanceWindowOpen } from "@/lib/saudi-time"
import {
  DEFAULT_ABSENCE_ALERT_TEMPLATES,
  calculateEffectiveAbsenceCount,
  formatAbsenceAlertMessage,
  normalizeAbsenceAlertTemplates,
  STUDENT_ABSENCE_ALERT_SETTING_ID,
} from "@/lib/student-absence"

type AdminAttendanceStatus = "present" | "late" | "absent" | "excused"

const VALID_STATUSES = new Set<AdminAttendanceStatus>(["present", "late", "absent", "excused"])

function isAllowedAttendanceDate(date: string) {
  const day = getSaudiWeekday(date)
  return day === 0 || day === 3
}

function normalizeCircleName(value: string | null | undefined) {
  return (value || "").trim().toLowerCase()
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get("date")
    const circle = searchParams.get("circle")

    if (!date) {
      return NextResponse.json({ error: "التاريخ مطلوب" }, { status: 400 })
    }

    let studentsQuery = supabase
      .from("students")
      .select("id, name, account_number, halaqah")

    if (circle?.trim()) {
      studentsQuery = studentsQuery.eq("halaqah", circle.trim())
    }

    const { data: students, error: studentsError } = await studentsQuery.order("account_number", { ascending: true })

    if (studentsError) {
      console.error("[admin-student-attendance] students query error:", studentsError)
      return NextResponse.json({ error: studentsError.message || "فشل في جلب الطلاب" }, { status: 500 })
    }

    let attendanceQuery = supabase
      .from("attendance_records")
      .select("id, student_id, status, teacher_id, halaqah")
      .eq("date", date)

    if (circle?.trim()) {
      attendanceQuery = attendanceQuery.eq("halaqah", circle.trim())
    }

    const { data: attendanceRecords, error: attendanceError } = await attendanceQuery

    if (attendanceError) {
      console.error("[admin-student-attendance] attendance query error:", attendanceError)
      return NextResponse.json({ error: attendanceError.message || "فشل في جلب سجلات التحضير" }, { status: 500 })
    }

    const attendanceIds = (attendanceRecords || []).map((record) => record.id)
    let evaluatedSet = new Set<string>()

    if (attendanceIds.length > 0) {
      const { data: evaluations, error: evaluationsError } = await supabase
        .from("evaluations")
        .select("attendance_record_id")
        .in("attendance_record_id", attendanceIds)

      if (evaluationsError) {
        console.error("[admin-student-attendance] evaluations query error:", evaluationsError)
        return NextResponse.json({ error: evaluationsError.message || "فشل في جلب التقييمات المرتبطة" }, { status: 500 })
      }

      evaluatedSet = new Set((evaluations || []).map((evaluation) => evaluation.attendance_record_id))
    }

    const attendanceMap = new Map((attendanceRecords || []).map((record) => [record.student_id, record] as const))
    const circleSet = new Set<string>()

    const records = (students || []).map((student) => {
      const attendance = attendanceMap.get(student.id)
      const halaqah = (student.halaqah || "").trim()
      if (halaqah) {
        circleSet.add(halaqah)
      }

      return {
        student_id: student.id,
        student_name: student.name,
        account_number: student.account_number,
        halaqah,
        attendance_record_id: attendance?.id || null,
        status: (attendance?.status as AdminAttendanceStatus | null) || null,
        teacher_id: attendance?.teacher_id || null,
        isEvaluated: attendance ? evaluatedSet.has(attendance.id) : false,
      }
    })

    return NextResponse.json({
      records,
      circles: Array.from(circleSet).sort((first, second) => first.localeCompare(second, "ar")),
    })
  } catch (error) {
    console.error("[admin-student-attendance] GET error:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const date = typeof body?.date === "string" ? body.date.trim() : ""
    const updates = Array.isArray(body?.updates) ? body.updates : []

    if (!date) {
      return NextResponse.json({ error: "التاريخ مطلوب" }, { status: 400 })
    }

    if (!isAllowedAttendanceDate(date) || !isSaudiAttendanceWindowOpen()) {
      return NextResponse.json({ error: "التحضير متاح فقط يوم الأحد ويوم الأربعاء حتى الساعة 11:59 مساءً بتوقيت السعودية" }, { status: 400 })
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "لا توجد بيانات للتحضير" }, { status: 400 })
    }

    const invalidUpdate = updates.find((entry) => !entry?.student_id || !VALID_STATUSES.has(entry?.status))
    if (invalidUpdate) {
      return NextResponse.json({ error: "توجد حالة تحضير غير صالحة" }, { status: 400 })
    }

    const studentIds = updates.map((entry) => entry.student_id)

    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, name, account_number, halaqah")
      .in("id", studentIds)

    if (studentsError) {
      console.error("[admin-student-attendance] student lookup error:", studentsError)
      return NextResponse.json({ error: studentsError.message || "فشل في جلب بيانات الطلاب" }, { status: 500 })
    }

    const studentsMap = new Map((students || []).map((student) => [student.id, student] as const))
    const circles = Array.from(
      new Set(
        (students || [])
          .map((student) => (student.halaqah || "").trim())
          .filter(Boolean),
      ),
    )

    const { data: teachers, error: teachersError } = await supabase
      .from("users")
      .select("id, halaqah, role")
      .in("role", ["teacher", "deputy_teacher"])

    if (teachersError) {
      console.error("[admin-student-attendance] teachers lookup error:", teachersError)
      return NextResponse.json({ error: teachersError.message || "فشل في جلب المعلمين المرتبطين بالحلقات" }, { status: 500 })
    }

    const teacherMap = new Map<string, string>()
    ;(teachers || []).forEach((teacher) => {
      const key = normalizeCircleName(teacher.halaqah)
      if (!key || !circles.some((circleName) => normalizeCircleName(circleName) === key)) {
        return
      }

      const current = teacherMap.get(key)
      if (!current || teacher.role === "teacher") {
        teacherMap.set(key, teacher.id)
      }
    })

    const { data: existingRecords, error: existingError } = await supabase
      .from("attendance_records")
      .select("id, student_id, status, teacher_id")
      .eq("date", date)
      .in("student_id", studentIds)

    if (existingError) {
      console.error("[admin-student-attendance] existing attendance error:", existingError)
      return NextResponse.json({ error: existingError.message || "فشل في قراءة سجلات التحضير الحالية" }, { status: 500 })
    }

    const existingMap = new Map((existingRecords || []).map((record) => [record.student_id, record] as const))
    const existingIds = (existingRecords || []).map((record) => record.id)
    const evaluatedSet = new Set<string>()

    if (existingIds.length > 0) {
      const { data: evaluations, error: evaluationsError } = await supabase
        .from("evaluations")
        .select("attendance_record_id")
        .in("attendance_record_id", existingIds)

      if (evaluationsError) {
        console.error("[admin-student-attendance] existing evaluations error:", evaluationsError)
        return NextResponse.json({ error: evaluationsError.message || "فشل في التحقق من التقييمات الحالية" }, { status: 500 })
      }

      ;(evaluations || []).forEach((evaluation) => {
        evaluatedSet.add(evaluation.attendance_record_id)
      })
    }

    const { data: absenceRecords, error: absenceRecordsError } = await supabase
    .from("attendance_records")
    .select("student_id, status")
    .in("student_id", studentIds)
    .in("status", ["absent", "excused"])

    if (absenceRecordsError) {
    console.error("[admin-student-attendance] absence records error:", absenceRecordsError)
    return NextResponse.json({ error: absenceRecordsError.message || "فشل في قراءة سجل الغيابات الحالي" }, { status: 500 })
  }

    const absenceCountByStudent = new Map<string, number>()
  const excusedCountByStudent = new Map<string, number>()

  for (const record of absenceRecords || []) {
    if (record.status === "absent") {
      absenceCountByStudent.set(record.student_id, (absenceCountByStudent.get(record.student_id) || 0) + 1)
    }
    if (record.status === "excused") {
      excusedCountByStudent.set(record.student_id, (excusedCountByStudent.get(record.student_id) || 0) + 1)
    }
  }

    const absenceAlertTemplates = normalizeAbsenceAlertTemplates(
    await getSiteSetting(STUDENT_ABSENCE_ALERT_SETTING_ID, DEFAULT_ABSENCE_ALERT_TEMPLATES),
  )
    const absenceNotificationCandidates: Array<{ user_account_number: string; message: string }> = []

    const saved: Array<{ student_id: string; status: AdminAttendanceStatus }> = []
    const blocked: Array<{ student_id: string; reason: string }> = []

    for (const update of updates) {
      const student = studentsMap.get(update.student_id)
      if (!student) {
        blocked.push({ student_id: update.student_id, reason: "الطالب غير موجود" })
        continue
      }

      const halaqah = (student.halaqah || "").trim()
      const teacherId = teacherMap.get(normalizeCircleName(halaqah)) || null
      const existingRecord = existingMap.get(update.student_id)
      const hasEvaluation = existingRecord ? evaluatedSet.has(existingRecord.id) : false

      if (existingRecord) {
        if (hasEvaluation && existingRecord.status !== update.status) {
          blocked.push({
            student_id: update.student_id,
            reason: "تم تقييم الطالب بالفعل اليوم، ولا يمكن تغيير حالة التحضير بعد التقييم",
          })
          continue
        }

        const { error: updateError } = await supabase
          .from("attendance_records")
          .update({
            status: update.status,
            halaqah,
            teacher_id: existingRecord.teacher_id || teacherId,
          })
          .eq("id", existingRecord.id)

        if (updateError) {
          blocked.push({
            student_id: update.student_id,
            reason: updateError.message || "تعذر تحديث سجل التحضير",
          })
          continue
        }

        saved.push({ student_id: update.student_id, status: update.status })

    const oldAbsentCount = absenceCountByStudent.get(update.student_id) || 0
    const oldExcusedCount = excusedCountByStudent.get(update.student_id) || 0
    let nextAbsentCount = oldAbsentCount
    let nextExcusedCount = oldExcusedCount

    if (existingRecord.status === "absent" && update.status !== "absent") nextAbsentCount -= 1
    if (existingRecord.status !== "absent" && update.status === "absent") nextAbsentCount += 1
    if (existingRecord.status === "excused" && update.status !== "excused") nextExcusedCount -= 1
    if (existingRecord.status !== "excused" && update.status === "excused") nextExcusedCount += 1

    absenceCountByStudent.set(update.student_id, Math.max(0, nextAbsentCount))
    excusedCountByStudent.set(update.student_id, Math.max(0, nextExcusedCount))

    const previousEffectiveAbsences = calculateEffectiveAbsenceCount(oldAbsentCount, oldExcusedCount)
    const nextEffectiveAbsences = calculateEffectiveAbsenceCount(nextAbsentCount, nextExcusedCount)
    if (nextEffectiveAbsences > previousEffectiveAbsences && nextEffectiveAbsences >= 1 && nextEffectiveAbsences <= 4) {
      const template = absenceAlertTemplates[String(nextEffectiveAbsences) as keyof typeof absenceAlertTemplates]
      if (student.account_number && template) {
        absenceNotificationCandidates.push({
          user_account_number: String(student.account_number),
          message: formatAbsenceAlertMessage(template, {
            studentName: student.name || "الطالب",
            absenceCount: nextEffectiveAbsences,
            absentCount: Math.max(0, nextAbsentCount),
            excusedCount: Math.max(0, nextExcusedCount),
          }),
        })
      }
    }
        continue
      }

      if (!teacherId) {
        blocked.push({
          student_id: update.student_id,
          reason: `لا يوجد معلم مرتبط بحلقة ${halaqah || "غير محددة"}`,
        })
        continue
      }

      const { error: insertError } = await supabase
        .from("attendance_records")
        .insert({
          student_id: update.student_id,
          teacher_id: teacherId,
          halaqah,
          status: update.status,
          date,
        })

      if (insertError) {
        const isLateConstraintFailure =
          update.status === "late" &&
          /status|check|constraint|invalid input value/i.test(
            `${insertError.message ?? ""} ${insertError.details ?? ""} ${insertError.hint ?? ""}`,
          )

        blocked.push({
          student_id: update.student_id,
          reason: isLateConstraintFailure
            ? "قاعدة البيانات لا تسمح بعد بحالة متأخر. نفذ scripts/042_allow_late_attendance_records.sql ثم أعد المحاولة."
            : insertError.message || "تعذر إنشاء سجل التحضير",
        })
        continue
      }

      saved.push({ student_id: update.student_id, status: update.status })

    const oldAbsentCount = absenceCountByStudent.get(update.student_id) || 0
    const oldExcusedCount = excusedCountByStudent.get(update.student_id) || 0
    const nextAbsentCount = update.status === "absent" ? oldAbsentCount + 1 : oldAbsentCount
    const nextExcusedCount = update.status === "excused" ? oldExcusedCount + 1 : oldExcusedCount

    absenceCountByStudent.set(update.student_id, nextAbsentCount)
    excusedCountByStudent.set(update.student_id, nextExcusedCount)

    const previousEffectiveAbsences = calculateEffectiveAbsenceCount(oldAbsentCount, oldExcusedCount)
    const nextEffectiveAbsences = calculateEffectiveAbsenceCount(nextAbsentCount, nextExcusedCount)
    if (nextEffectiveAbsences > previousEffectiveAbsences && nextEffectiveAbsences >= 1 && nextEffectiveAbsences <= 4) {
      const template = absenceAlertTemplates[String(nextEffectiveAbsences) as keyof typeof absenceAlertTemplates]
      if (student.account_number && template) {
        absenceNotificationCandidates.push({
          user_account_number: String(student.account_number),
          message: formatAbsenceAlertMessage(template, {
            studentName: student.name || "الطالب",
            absenceCount: nextEffectiveAbsences,
            absentCount: nextAbsentCount,
            excusedCount: nextExcusedCount,
          }),
        })
      }
    }
    }

  if (absenceNotificationCandidates.length > 0) {
    const todayStart = `${date}T00:00:00+03:00`
    const candidateAccounts = Array.from(
      new Set(absenceNotificationCandidates.map((candidate) => candidate.user_account_number)),
    )

    const { data: existingNotifications } = await supabase
      .from("notifications")
      .select("user_account_number, message")
      .in("user_account_number", candidateAccounts)
      .gte("created_at", todayStart)

    const existingNotificationSet = new Set(
      (existingNotifications || []).map((notification) => `${notification.user_account_number}::${notification.message}`),
    )

    const notificationsToInsert = absenceNotificationCandidates.filter(
      (candidate) => !existingNotificationSet.has(`${candidate.user_account_number}::${candidate.message}`),
    )

    if (notificationsToInsert.length > 0) {
      await supabase.from("notifications").insert(notificationsToInsert)
    }
  }

    return NextResponse.json({
      success: blocked.length === 0,
      saved,
      blocked,
    })
  } catch (error) {
    console.error("[admin-student-attendance] POST error:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}