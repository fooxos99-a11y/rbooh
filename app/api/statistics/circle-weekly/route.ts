import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { circleNamesMatch } from "@/lib/circle-name"
import { getRequestActor, isAdminRole } from "@/lib/request-auth"
import { getSaudiDateString, getSaudiWeekday } from "@/lib/saudi-time"
import { calculatePreviousMemorizedPages, resolvePlanLinkingPagesPreference, resolvePlanReviewPagesPreference, resolvePlanReviewPoolPages } from "@/lib/quran-data"
import { isPassingMemorizationLevel, type EvaluationLevelValue } from "@/lib/student-attendance"

export const dynamic = "force-dynamic"
export const revalidate = 0

type StudentRow = {
  id: string
  name: string | null
  halaqah: string | null
}

type PreviousMemorizationRange = {
  startSurahNumber: number
  startVerseNumber: number
  endSurahNumber: number
  endVerseNumber: number
}

type PlanRow = {
  student_id: string
  start_surah_number?: number | null
  start_verse?: number | null
  end_surah_number?: number | null
  end_verse?: number | null
  total_pages?: number | null
  total_days?: number | null
  start_date?: string | null
  created_at?: string | null
  direction?: "asc" | "desc" | null
  has_previous?: boolean | null
  prev_start_surah?: number | null
  prev_start_verse?: number | null
  prev_end_surah?: number | null
  prev_end_verse?: number | null
  completed_juzs?: number[] | null
  previous_memorization_ranges?: PreviousMemorizationRange[] | null
  daily_pages: number | null
  muraajaa_pages: number | null
  rabt_pages: number | null
  review_distribution_mode?: "fixed" | "weekly" | null
  review_distribution_days?: number | null
  review_minimum_pages?: number | null
}

type EvaluationRecord = {
  hafiz_level?: EvaluationLevelValue
  tikrar_level?: EvaluationLevelValue
  samaa_level?: EvaluationLevelValue
  rabet_level?: EvaluationLevelValue
}

type AttendanceRow = {
  id: string
  student_id: string
  date: string
  status: string | null
  evaluations: EvaluationRecord[] | EvaluationRecord | null
}

type DailyReportRow = {
  student_id: string
  report_date: string
  memorization_done: boolean
  memorization_pages_count?: number | null
  review_done: boolean
  review_pages_count?: number | null
  linking_done: boolean
  linking_pages_count?: number | null
}

type DayStatus = "absent" | "late" | "present-only" | "memorized" | "review" | "tied" | "review-tied" | "complete" | "none"

function formatDateForQuery(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(value)
}

function parseSaudiDate(value: string) {
  return new Date(`${value}T12:00:00+03:00`)
}

function addDaysToSaudiDate(value: string, days: number) {
  const date = parseSaudiDate(value)
  date.setUTCDate(date.getUTCDate() + days)
  return formatDateForQuery(date)
}

function isStudyDay(dateValue: Date | string) {
  const date = typeof dateValue === "string" ? new Date(`${dateValue}T00:00:00`) : dateValue
  const day = date.getDay()
  return day !== 6
}

function isAttendanceDay(dateValue: Date | string) {
  const date = typeof dateValue === "string" ? new Date(`${dateValue}T00:00:00`) : dateValue
  const day = date.getDay()
  return day === 0 || day === 3
}

function isSaturdayReviewOnlyDay(dateValue: Date | string) {
  const date = typeof dateValue === "string" ? new Date(`${dateValue}T00:00:00`) : dateValue
  return date.getDay() === 6
}

function getCurrentStudyWeekStart() {
  const today = getSaudiDateString()
  return addDaysToSaudiDate(today, -getSaudiWeekday(today))
}

function getStudyWeek(weekOffset: number) {
  const startDate = addDaysToSaudiDate(getCurrentStudyWeekStart(), -weekOffset * 7)
  const fullWeekDates = [0, 1, 2, 3, 4, 5, 6].map((offset) => addDaysToSaudiDate(startDate, offset))
  const endDate = weekOffset === 0
    ? getSaudiDateString()
    : fullWeekDates[fullWeekDates.length - 1]
  const dates = fullWeekDates.filter((date) => date <= endDate)

  return {
    dates,
    startDate,
    endDate,
  }
}

function getEvaluationRecord(value: AttendanceRow["evaluations"]): EvaluationRecord {
  if (Array.isArray(value)) {
    return value[0] ?? {}
  }

  return value ?? {}
}

function hasPassingMemorization(record?: AttendanceRow) {
  if (!record || (record.status !== "present" && record.status !== "late")) {
    return false
  }

  const evaluation = getEvaluationRecord(record.evaluations)
  return isPassingMemorizationLevel(evaluation.hafiz_level ?? null)
}

function getDayStatus(record?: AttendanceRow, dailyReport?: DailyReportRow): DayStatus {
  if (record?.status === "absent" || record?.status === "excused") {
    return "absent"
  }

  const reviewDone = Boolean(dailyReport?.review_done)
  const linkingDone = Boolean(dailyReport?.linking_done)
  const passedMemorization = hasPassingMemorization(record)

  if (passedMemorization) {
    return reviewDone || linkingDone ? "complete" : "memorized"
  }

  if (reviewDone && linkingDone) {
    return "review-tied"
  }

  if (reviewDone) {
    return "review"
  }

  if (linkingDone) {
    return "tied"
  }

  if (record?.status === "late") {
    return "late"
  }

  if (record?.status === "present") {
    return "present-only"
  }

  return "none"
}

function getErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف"
  if (error instanceof Error) return error.message || "حدث خطأ غير معروف"

  if (typeof error === "object") {
    const candidate = error as { message?: string; details?: string; hint?: string; code?: string; error?: string }
    return candidate.message || candidate.details || candidate.hint || candidate.error || candidate.code || JSON.stringify(candidate)
  }

  return String(error)
}

export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient()
    const actor = await getRequestActor(request, authClient as never)

    if (!actor || !isAdminRole(actor.role)) {
      return NextResponse.json({ error: "غير مصرح لك بعرض تقارير الحلقة" }, { status: 403 })
    }

    const circleName = request.nextUrl.searchParams.get("circle") || ""
    const weekOffset = Math.max(0, Number(request.nextUrl.searchParams.get("weekOffset") || 0))

    if (!circleName.trim()) {
      return NextResponse.json({ students: [], hasPreviousWeek: false })
    }

    const studyWeek = getStudyWeek(weekOffset)
    const previousWeek = getStudyWeek(weekOffset + 1)
    const supabase = createAdminClient()

    const studentsResult = await supabase.from("students").select("id, name, halaqah")
    if (studentsResult.error) throw studentsResult.error

    const studentRows = ((studentsResult.data ?? []) as StudentRow[])
      .filter((student) => circleNamesMatch(student.halaqah, circleName))

    const studentIds = studentRows.map((student) => student.id).filter(Boolean)

    if (studentIds.length === 0) {
      return NextResponse.json({ students: [], hasPreviousWeek: false })
    }

    const [plansResult, attendanceResult, dailyReportsResult, previousWeekAttendanceResult, previousWeekReportsResult] = await Promise.all([
      supabase.from("student_plans").select("student_id, start_surah_number, start_verse, end_surah_number, end_verse, total_pages, total_days, start_date, created_at, direction, has_previous, prev_start_surah, prev_start_verse, prev_end_surah, prev_end_verse, completed_juzs, previous_memorization_ranges, daily_pages, muraajaa_pages, rabt_pages, review_distribution_mode, review_distribution_days, review_minimum_pages"),
      supabase
        .from("attendance_records")
        .select(`
          id,
          student_id,
          date,
          status,
          evaluations (hafiz_level, tikrar_level, samaa_level, rabet_level)
        `)
        .in("student_id", studentIds)
        .gte("date", studyWeek.startDate)
        .lte("date", studyWeek.endDate),
      supabase
        .from("student_daily_reports")
        .select("student_id, report_date, memorization_done, memorization_pages_count, review_done, review_pages_count, linking_done, linking_pages_count")
        .in("student_id", studentIds)
        .gte("report_date", studyWeek.startDate)
        .lte("report_date", studyWeek.endDate),
      supabase
        .from("attendance_records")
        .select("id", { count: "exact", head: true })
        .in("student_id", studentIds)
        .gte("date", previousWeek.startDate)
        .lte("date", previousWeek.endDate),
      supabase
        .from("student_daily_reports")
        .select("student_id", { count: "exact", head: true })
        .in("student_id", studentIds)
        .gte("report_date", previousWeek.startDate)
        .lte("report_date", previousWeek.endDate),
    ])

    if (plansResult.error) throw plansResult.error
    if (attendanceResult.error) throw attendanceResult.error
    if (dailyReportsResult.error) throw dailyReportsResult.error
    if (previousWeekAttendanceResult.error) throw previousWeekAttendanceResult.error
    if (previousWeekReportsResult.error) throw previousWeekReportsResult.error

    const plans = (plansResult.data ?? []) as PlanRow[]
    const attendanceRows = ((attendanceResult.data ?? []) as AttendanceRow[]).filter((record) => studyWeek.dates.includes(record.date))
    const dailyReports = ((dailyReportsResult.data ?? []) as DailyReportRow[]).filter((report) => studyWeek.dates.includes(report.report_date))

    const plansByStudent = new Map(plans.map((plan) => [plan.student_id, plan]))
    const attendanceByStudent = new Map<string, Map<string, AttendanceRow>>()
    const dailyReportsByStudent = new Map<string, Map<string, DailyReportRow>>()

    for (const record of attendanceRows) {
      const byDate = attendanceByStudent.get(record.student_id) ?? new Map<string, AttendanceRow>()
      byDate.set(record.date, record)
      attendanceByStudent.set(record.student_id, byDate)
    }

    for (const report of dailyReports) {
      const byDate = dailyReportsByStudent.get(report.student_id) ?? new Map<string, DailyReportRow>()
      byDate.set(report.report_date, report)
      dailyReportsByStudent.set(report.student_id, byDate)
    }

    const students = studentRows
      .map((student) => {
        const plan = plansByStudent.get(student.id)
        const byDate = attendanceByStudent.get(student.id) ?? new Map<string, AttendanceRow>()
        const reportsByDate = dailyReportsByStudent.get(student.id) ?? new Map<string, DailyReportRow>()
        let memorized = 0
        let revised = 0
        let tied = 0
        let presentCount = 0
        let absentCount = 0
        let memorizationCompletedCount = 0
        let reviewCompletedCount = 0
        let linkingCompletedCount = 0
        let tasmeeCompletedCount = 0
        let memorizedPoolPages = plan ? calculatePreviousMemorizedPages(plan) : 0
        let successfulMemorizationCount = 0

        const statuses = studyWeek.dates.map((date) => {
          const record = byDate.get(date)
          const dailyReport = reportsByDate.get(date)
          const status = getDayStatus(record, dailyReport)
          const isReviewOnlyDay = isSaturdayReviewOnlyDay(date)

          if (isAttendanceDay(date) && (record?.status === "present" || record?.status === "late")) {
            presentCount += 1
          }

          if (isAttendanceDay(date) && (record?.status === "absent" || record?.status === "excused")) {
            absentCount += 1
          }

          if (dailyReport?.memorization_done && !isReviewOnlyDay) {
            memorizationCompletedCount += 1
          }

          if (dailyReport?.review_done) {
            reviewCompletedCount += 1
          }

          if (dailyReport?.linking_done && !isReviewOnlyDay) {
            linkingCompletedCount += 1
          }

          if (plan) {
            const reviewPoolPages = resolvePlanReviewPoolPages(plan, memorizedPoolPages)
            const reviewPages = resolvePlanReviewPagesPreference(plan, reviewPoolPages)
            const tiePages = resolvePlanLinkingPagesPreference(plan, successfulMemorizationCount)

            if (dailyReport?.review_done) {
              revised += Math.max(Number(dailyReport.review_pages_count ?? reviewPages), 0)
            }

            if (dailyReport?.linking_done) {
              tied += Math.max(Number(dailyReport.linking_pages_count ?? tiePages), 0)
            }

            if (hasPassingMemorization(record)) {
              const dailyPages = Number(plan.daily_pages ?? 1)
              tasmeeCompletedCount += 1
              memorized += dailyPages
              memorizedPoolPages += dailyPages
              successfulMemorizationCount += 1
            }
          }

          return { date, status }
        })

        const totalActivity = memorized + revised + tied

        return {
          id: student.id,
          name: student.name?.trim() || "طالب غير معرف",
          memorized,
          revised,
          tied,
          presentCount,
          absentCount,
          memorizationCompletedCount,
          reviewCompletedCount,
          linkingCompletedCount,
          tasmeeCompletedCount,
          statuses,
          totalActivity,
        }
      })
      .sort((left, right) => {
        if (right.totalActivity !== left.totalActivity) {
          return right.totalActivity - left.totalActivity
        }

        if (right.presentCount !== left.presentCount) {
          return right.presentCount - left.presentCount
        }

        return left.name.localeCompare(right.name, "ar")
      })

    return NextResponse.json({
      students,
      hasPreviousWeek: (previousWeekAttendanceResult.count ?? 0) > 0 || (previousWeekReportsResult.count ?? 0) > 0,
      meta: {
        studyDayCount: studyWeek.dates.length,
        attendanceTargetCount: studyWeek.dates.filter((date) => isAttendanceDay(date)).length,
        executionTargetCount: studyWeek.dates.filter((date) => isStudyDay(date)).length,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}