import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getRequestActor, isAdminRole } from "@/lib/request-auth"
import { calculatePreviousMemorizedPages, resolvePlanLinkingPagesPreference, resolvePlanReviewPagesPreference, resolvePlanReviewPoolPages } from "@/lib/quran-data"
import {
  applyAttendancePointsAdjustment,
  calculateTotalEvaluationPoints,
  isPassingMemorizationLevel,
  type EvaluationLevelValue,
} from "@/lib/student-attendance"

export const dynamic = "force-dynamic"
export const revalidate = 0

type DateFilter = "today" | "currentWeek" | "currentMonth" | "all" | "custom"

type PreviousMemorizationRange = {
  startSurahNumber: number
  startVerseNumber: number
  endSurahNumber: number
  endVerseNumber: number
}

type StudentRow = {
  id: string
  name: string | null
  halaqah: string | null
}

type CircleRow = {
  id: string
  name: string | null
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
  halaqah: string | null
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

type StudentSummary = {
  id: string
  name: string
  circleName: string
  memorized: number
  revised: number
  tied: number
  maxPoints: number
  earnedPoints: number
  percent: number
}

type CircleSummary = {
  name: string
  memorized: number
  revised: number
  tied: number
  passedMemorizationSegments: number
  passedTikrarSegments: number
  maxPoints: number
  earnedPoints: number
  totalAttend: number
  totalRecords: number
  evalPercent: number
  attendPercent: number
  memorizedPercent: number
  tikrarPercent: number
  revisedPercent: number
  tiedPercent: number
  score: number
}

function formatDateForQuery(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(value)
}

function isStudyDay(dateValue: string) {
  const day = new Date(`${dateValue}T00:00:00`).getDay()
  return day !== 5
}

function isSaturdayReviewOnlyDay(dateValue: string) {
  const day = new Date(`${dateValue}T00:00:00`).getDay()
  return day === 6
}

function getDateRange(filter: DateFilter, customStart: string, customEnd: string) {
  const end = new Date()
  const start = new Date()

  if (filter === "today") {
    return { start: new Date(start.setHours(0, 0, 0, 0)), end }
  }

  if (filter === "currentWeek") {
    const today = new Date()
    const day = today.getDay()
    const weekStart = new Date(today)
    const startOffset = day === 0 ? 0 : day

    weekStart.setDate(today.getDate() - startOffset)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(today)

    if (day === 5) {
      weekEnd.setDate(today.getDate() - 1)
    }

    weekEnd.setHours(23, 59, 59, 999)

    return { start: weekStart, end: weekEnd }
  }

  if (filter === "currentMonth") {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    return { start, end }
  }

  if (filter === "custom") {
    return {
      start: new Date(`${customStart}T00:00:00`),
      end: new Date(`${customEnd}T23:59:59`),
    }
  }

  start.setFullYear(2020, 0, 1)
  return { start, end }
}

function getEvaluationRecord(value: AttendanceRow["evaluations"]): EvaluationRecord {
  if (Array.isArray(value)) {
    return value[0] ?? {}
  }

  return value ?? {}
}

function createStudentSummary(id: string, name: string, circleName: string): StudentSummary {
  return {
    id,
    name,
    circleName,
    memorized: 0,
    revised: 0,
    tied: 0,
    maxPoints: 0,
    earnedPoints: 0,
    percent: 0,
  }
}

function createCircleSummary(name: string): CircleSummary {
  return {
    name,
    memorized: 0,
    revised: 0,
    tied: 0,
    passedMemorizationSegments: 0,
    passedTikrarSegments: 0,
    maxPoints: 0,
    earnedPoints: 0,
    totalAttend: 0,
    totalRecords: 0,
    evalPercent: 0,
    attendPercent: 0,
    memorizedPercent: 0,
    tikrarPercent: 0,
    revisedPercent: 0,
    tiedPercent: 0,
    score: 0,
  }
}

function getErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف"

  if (error instanceof Error) {
    return error.message || "حدث خطأ غير معروف"
  }

  if (typeof error === "object") {
    const candidate = error as {
      message?: string
      details?: string
      hint?: string
      code?: string
      error?: string
    }

    return candidate.message || candidate.details || candidate.hint || candidate.error || candidate.code || JSON.stringify(candidate)
  }

  return String(error)
}

export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient()
    const actor = await getRequestActor(request, authClient as never)

    if (!actor || !isAdminRole(actor.role)) {
      return NextResponse.json({ error: "غير مصرح لك بعرض الإحصائيات" }, { status: 403 })
    }

    const filterValue = (request.nextUrl.searchParams.get("filter") || "currentMonth") as DateFilter
    const customStart = request.nextUrl.searchParams.get("start") || formatDateForQuery(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const customEnd = request.nextUrl.searchParams.get("end") || formatDateForQuery(new Date())
    const supabase = createAdminClient()
    const { start, end } = getDateRange(filterValue, customStart, customEnd)

    const [studentsResult, circlesResult, plansResult] = await Promise.all([
      supabase.from("students").select("id, name, halaqah"),
      supabase.from("circles").select("id, name"),
      supabase.from("student_plans").select("student_id, start_surah_number, start_verse, end_surah_number, end_verse, total_pages, total_days, start_date, created_at, direction, has_previous, prev_start_surah, prev_start_verse, prev_end_surah, prev_end_verse, completed_juzs, previous_memorization_ranges, daily_pages, muraajaa_pages, rabt_pages, review_distribution_mode, review_distribution_days, review_minimum_pages"),
    ])

    if (studentsResult.error) throw studentsResult.error
    if (circlesResult.error) throw circlesResult.error
    if (plansResult.error) throw plansResult.error

    let attendanceQuery = supabase.from("attendance_records").select(`
      id,
      student_id,
      halaqah,
      date,
      status,
      evaluations (hafiz_level, tikrar_level, samaa_level, rabet_level)
    `)

    let dailyReportsQuery = supabase
      .from("student_daily_reports")
      .select("student_id, report_date, memorization_done, memorization_pages_count, review_done, review_pages_count, linking_done, linking_pages_count")

    if (filterValue !== "all") {
      attendanceQuery = attendanceQuery
        .gte("date", formatDateForQuery(start))
        .lte("date", formatDateForQuery(end))

      dailyReportsQuery = dailyReportsQuery
        .gte("report_date", formatDateForQuery(start))
        .lte("report_date", formatDateForQuery(end))
    }

    const [attendanceResult, dailyReportsResult] = await Promise.all([attendanceQuery, dailyReportsQuery])

    if (attendanceResult.error) throw attendanceResult.error
    if (dailyReportsResult.error) throw dailyReportsResult.error

    const students = (studentsResult.data ?? []) as StudentRow[]
    const circles = (circlesResult.data ?? []) as CircleRow[]
    const plans = (plansResult.data ?? []) as PlanRow[]
    const plannedStudentIds = new Set(plans.map((plan) => plan.student_id).filter(Boolean))
    const attendance = ((attendanceResult.data ?? []) as AttendanceRow[]).filter(
      (record) => isStudyDay(record.date) && plannedStudentIds.has(record.student_id),
    )
    const dailyReports = ((dailyReportsResult.data ?? []) as DailyReportRow[]).filter(
      (report) => plannedStudentIds.has(report.student_id),
    )

    const counts = { circles: circles.length, students: students.length }
    const allCircles = [...circles].sort((left, right) => (left.name || "").localeCompare(right.name || "", "ar"))

    const studentNames = new Map(students.map((student) => [student.id, student.name?.trim() || "طالب غير معرف"]))
    const studentCircles = new Map(students.map((student) => [student.id, student.halaqah?.trim() || "حلقة غير معروفة"]))
    const plansByStudent = new Map(plans.map((plan) => [plan.student_id, plan]))
    const dailyReportByStudentDate = new Map(
      dailyReports.map((report) => [`${report.student_id}::${report.report_date}`, report] as const),
    )
    const presentAttendanceKeys = new Set<string>()

    const studentStats = new Map<string, StudentSummary>()
    const circleStats = new Map<string, CircleSummary>()

    let attendanceTotal = 0
    let executionTotal = 0
    let memorizedTotal = 0
    let tasmeeTotal = 0
    let revisedTotal = 0
    let tiedTotal = 0

    for (const report of dailyReports) {
      if (report.memorization_done && !isSaturdayReviewOnlyDay(report.report_date)) {
        executionTotal += 1
      }
    }

    const memorizedPoolByStudent = new Map<string, number>()
    const successfulMemorizationCountByStudent = new Map<string, number>()
    const passedMemorizationDatesByStudent = new Map<string, string[]>()
    const sortedAttendance = [...attendance].sort((left, right) => {
      if (left.student_id !== right.student_id) {
        return left.student_id.localeCompare(right.student_id)
      }

      return left.date.localeCompare(right.date)
    })

    for (const record of sortedAttendance) {
      if (!plansByStudent.has(record.student_id)) continue

      const evaluation = getEvaluationRecord(record.evaluations)
      if (!isPassingMemorizationLevel(evaluation.hafiz_level ?? null)) continue

      const passedDates = passedMemorizationDatesByStudent.get(record.student_id) ?? []
      passedDates.push(record.date)
      passedMemorizationDatesByStudent.set(record.student_id, passedDates)
    }

    for (const record of sortedAttendance) {
      const studentId = record.student_id
      const plan = plansByStudent.get(studentId)
      const circleName = record.halaqah?.trim() || "حلقة غير معروفة"

      if (!plan) continue

      const studentName = studentNames.get(studentId) ?? "طالب غير معرف"
      const studentSummary = studentStats.get(studentId) ?? createStudentSummary(studentId, studentName, circleName)
      studentStats.set(studentId, studentSummary)
      if (studentSummary.circleName === "حلقة غير معروفة" && circleName !== "حلقة غير معروفة") {
        studentSummary.circleName = circleName
      }

      const circleSummary = circleStats.get(circleName) ?? createCircleSummary(circleName)
      circleStats.set(circleName, circleSummary)
      circleSummary.totalRecords += 1

      const dailyPages = Number(plan.daily_pages ?? 1)
      const status = record.status ?? ""
      const isPresent = status === "present" || status === "late"
      const successfulMemorizationCount = successfulMemorizationCountByStudent.get(studentId) ?? 0
      const memorizedPoolPages = memorizedPoolByStudent.has(studentId)
        ? memorizedPoolByStudent.get(studentId) ?? 0
        : calculatePreviousMemorizedPages(plan)
      const reviewPoolPages = resolvePlanReviewPoolPages(plan, memorizedPoolPages)
      const reviewPages = resolvePlanReviewPagesPreference(plan, reviewPoolPages)
      const tiePages = resolvePlanLinkingPagesPreference(plan, successfulMemorizationCount)

      studentSummary.maxPoints += 10
      circleSummary.maxPoints += 10

      if (!isPresent) continue

      attendanceTotal += 1
      circleSummary.totalAttend += 1
      presentAttendanceKeys.add(`${studentId}::${record.date}`)

      const evaluation = getEvaluationRecord(record.evaluations)
      const dailyReport = dailyReportByStudentDate.get(`${studentId}::${record.date}`)
      const isSaturdayReviewOnly = isSaturdayReviewOnlyDay(record.date)
      const fallbackReviewPages = Math.max(reviewPages, Number(plan.muraajaa_pages ?? 0), 0)
      const fallbackTiePages = tiePages

      if (isPassingMemorizationLevel(evaluation.hafiz_level ?? null)) {
        studentSummary.memorized += dailyPages
        circleSummary.memorized += dailyPages
        memorizedTotal += dailyPages
        memorizedPoolByStudent.set(studentId, memorizedPoolPages + dailyPages)
        successfulMemorizationCountByStudent.set(studentId, successfulMemorizationCount + 1)
      } else if (!memorizedPoolByStudent.has(studentId)) {
        memorizedPoolByStudent.set(studentId, memorizedPoolPages)
        successfulMemorizationCountByStudent.set(studentId, successfulMemorizationCount)
      }

      if (isPassingMemorizationLevel(evaluation.hafiz_level ?? null)) {
        circleSummary.passedMemorizationSegments += 1
        tasmeeTotal += 1
      }

      if (isPassingMemorizationLevel(evaluation.tikrar_level ?? null)) {
        circleSummary.passedTikrarSegments += 1
      }

      if (dailyReport?.review_done) {
        const resolvedReviewPages = Math.max(Number(dailyReport.review_pages_count ?? fallbackReviewPages), 0)
        studentSummary.revised += resolvedReviewPages
        circleSummary.revised += resolvedReviewPages
        revisedTotal += resolvedReviewPages
      } else if (isPassingMemorizationLevel(evaluation.samaa_level ?? null)) {
        studentSummary.revised += fallbackReviewPages
        circleSummary.revised += fallbackReviewPages
        revisedTotal += fallbackReviewPages
      }

      if (dailyReport?.linking_done && !isSaturdayReviewOnly) {
        const resolvedLinkingPages = Math.max(Number(dailyReport.linking_pages_count ?? fallbackTiePages), 0)
        studentSummary.tied += resolvedLinkingPages
        circleSummary.tied += resolvedLinkingPages
        tiedTotal += resolvedLinkingPages
      } else if (isPassingMemorizationLevel(evaluation.rabet_level ?? null)) {
        studentSummary.tied += fallbackTiePages
        circleSummary.tied += fallbackTiePages
        tiedTotal += fallbackTiePages
      }

      const earnedPoints = applyAttendancePointsAdjustment(calculateTotalEvaluationPoints(evaluation), status)
      studentSummary.earnedPoints += earnedPoints
      circleSummary.earnedPoints += earnedPoints
    }

    for (const report of dailyReports) {
      const reportKey = `${report.student_id}::${report.report_date}`
      if (presentAttendanceKeys.has(reportKey)) continue

      const plan = plansByStudent.get(report.student_id)
      if (!plan) continue

      const studentName = studentNames.get(report.student_id) ?? "طالب غير معرف"
      const circleName = studentCircles.get(report.student_id) ?? "حلقة غير معروفة"
      const studentSummary = studentStats.get(report.student_id) ?? createStudentSummary(report.student_id, studentName, circleName)
      studentStats.set(report.student_id, studentSummary)
      if (studentSummary.circleName === "حلقة غير معروفة" && circleName !== "حلقة غير معروفة") {
        studentSummary.circleName = circleName
      }

      const circleSummary = circleStats.get(circleName) ?? createCircleSummary(circleName)
      circleStats.set(circleName, circleSummary)

      const baseMemorizedPool = calculatePreviousMemorizedPages(plan)
      const reviewPoolPages = resolvePlanReviewPoolPages(plan, baseMemorizedPool)
      const reviewPages = Math.max(resolvePlanReviewPagesPreference(plan, reviewPoolPages), Number(plan.muraajaa_pages ?? 0), 0)
      const successfulMemorizationCount = (passedMemorizationDatesByStudent.get(report.student_id) || []).filter(
        (date) => date <= report.report_date,
      ).length
      const tiePages = resolvePlanLinkingPagesPreference(plan, successfulMemorizationCount)

      if (report.review_done) {
        const resolvedReviewPages = Math.max(Number(report.review_pages_count ?? reviewPages), 0)
        studentSummary.revised += resolvedReviewPages
        circleSummary.revised += resolvedReviewPages
        revisedTotal += resolvedReviewPages
      }

      if (report.linking_done && !isSaturdayReviewOnlyDay(report.report_date)) {
        const resolvedLinkingPages = Math.max(Number(report.linking_pages_count ?? tiePages), 0)
        studentSummary.tied += resolvedLinkingPages
        circleSummary.tied += resolvedLinkingPages
        tiedTotal += resolvedLinkingPages
      }
    }

    const studentArray = Array.from(studentStats.values()).map((item) => ({
      ...item,
      percent: item.maxPoints > 0 ? (item.earnedPoints / item.maxPoints) * 100 : 0,
    }))

    const circleArray = Array.from(circleStats.values())
      .filter((item) => item.totalRecords > 0)
      .map((item) => {
        const evalPercent = item.maxPoints > 0 ? (item.earnedPoints / item.maxPoints) * 100 : 0
        const attendPercent = item.totalRecords > 0 ? (item.totalAttend / item.totalRecords) * 100 : 0
        const memorizedPercent = item.totalRecords > 0 ? (item.passedMemorizationSegments / item.totalRecords) * 100 : 0
        const tikrarPercent = item.totalRecords > 0 ? (item.passedTikrarSegments / item.totalRecords) * 100 : 0
        const revisedPercent = revisedTotal > 0 ? (item.revised / revisedTotal) * 100 : 0
        const tiedPercent = tiedTotal > 0 ? (item.tied / tiedTotal) * 100 : 0
        const score = evalPercent * 0.6 + attendPercent * 0.4

        return {
          ...item,
          evalPercent,
          attendPercent,
          memorizedPercent,
          tikrarPercent,
          revisedPercent,
          tiedPercent,
          score,
        }
      })

    const reviewExecutionTotal = dailyReports.reduce((sum, report) => sum + (report.review_done ? 1 : 0), 0)
    const linkingExecutionTotal = dailyReports.reduce(
      (sum, report) => sum + (report.linking_done && !isSaturdayReviewOnlyDay(report.report_date) ? 1 : 0),
      0,
    )

    return NextResponse.json({
      counts,
      totals: {
        attendance: attendanceTotal,
        execution: executionTotal,
        linkingExecution: linkingExecutionTotal,
        memorized: memorizedTotal,
        reviewExecution: reviewExecutionTotal,
        tasmee: tasmeeTotal,
        revised: revisedTotal,
        tied: tiedTotal,
      },
      allCircles,
      topMemorizers: [...studentArray].filter((item) => item.memorized > 0).sort((left, right) => right.memorized - left.memorized).slice(0, 5),
      topRevisers: [...studentArray].filter((item) => item.revised > 0).sort((left, right) => right.revised - left.revised).slice(0, 5),
      topTied: [...studentArray].filter((item) => item.tied > 0).sort((left, right) => right.tied - left.tied).slice(0, 5),
      topCircles: [...circleArray].sort((left, right) => right.score - left.score).slice(0, 5),
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}