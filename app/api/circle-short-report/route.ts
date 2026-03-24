import { NextRequest, NextResponse } from "next/server"

import { isMemorizationOffDay } from "@/lib/plan-session-progress"
import { resolvePlanTotalDays } from "@/lib/quran-data"
import { createClient } from "@/lib/supabase/server"
import { isPassingMemorizationLevel, type EvaluationLevelValue } from "@/lib/student-attendance"

type StudentRow = {
  id: string
  name: string | null
  halaqah: string | null
}

type PlanRow = {
  id: string
  student_id: string
  start_date: string | null
  start_surah_number?: number | null
  start_verse?: number | null
  end_surah_number?: number | null
  end_verse?: number | null
  total_pages?: number | null
  daily_pages?: number | null
  total_days?: number | null
  direction?: "asc" | "desc" | null
  has_previous?: boolean | null
  prev_start_surah?: number | null
  prev_start_verse?: number | null
  prev_end_surah?: number | null
  prev_end_verse?: number | null
  created_at?: string | null
}

type AttendanceEvaluation = {
  hafiz_level?: EvaluationLevelValue
}

type AttendanceRow = {
  student_id: string
  date: string
  status: string | null
  evaluations?: AttendanceEvaluation[] | AttendanceEvaluation | null
}

type DailyReportRow = {
  student_id: string
  report_date: string
  memorization_done: boolean
  tikrar_done: boolean
  review_done: boolean
  linking_done: boolean
}

function getSaudiWeekday(dateValue: string) {
  return new Date(`${dateValue}T12:00:00+03:00`).getUTCDay()
}

function isFriday(dateValue: string) {
  return getSaudiWeekday(dateValue) === 5
}

function isCircleAttendanceDay(dateValue: string) {
  const weekday = getSaudiWeekday(dateValue)
  return weekday === 0 || weekday === 3
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00+03:00`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function getLatestHafizLevel(record: AttendanceRow) {
  const evaluations = Array.isArray(record.evaluations)
    ? record.evaluations
    : record.evaluations
      ? [record.evaluations]
      : []

  return evaluations.length > 0 ? evaluations[evaluations.length - 1]?.hafiz_level ?? null : null
}

function countAttendanceSessions(rangeStart: string, rangeEnd: string) {
  if (!rangeStart || rangeStart > rangeEnd) {
    return 0
  }

  let currentDate = rangeStart
  let total = 0

  while (currentDate <= rangeEnd) {
    if (isCircleAttendanceDay(currentDate)) {
      total += 1
    }

    currentDate = addDays(currentDate, 1)
  }

  return total
}

function countPlannedExecutions(plan: PlanRow | null | undefined, rangeStart: string, rangeEnd: string) {
  if (!plan?.start_date) {
    return {
      memorizationRequired: 0,
      reviewRequired: 0,
    }
  }

  const totalDays = resolvePlanTotalDays(plan)

  if (totalDays <= 0 || plan.start_date > rangeEnd) {
    return {
      memorizationRequired: 0,
      reviewRequired: 0,
    }
  }

  let currentDate = plan.start_date
  let completedSessions = 0
  let memorizationRequired = 0
  let reviewRequired = 0

  while (currentDate <= rangeEnd && completedSessions < totalDays) {
    const friday = isFriday(currentDate)
    const reviewOnly = isMemorizationOffDay(currentDate)
    const insideRange = currentDate >= rangeStart

    if (!friday && insideRange) {
      reviewRequired += 1
    }

    if (!friday && !reviewOnly) {
      if (insideRange) {
        memorizationRequired += 1
      }
      completedSessions += 1
    }

    currentDate = addDays(currentDate, 1)
  }

  return {
    memorizationRequired,
    reviewRequired,
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const circle = searchParams.get("circle")?.trim() || ""
    const startDate = searchParams.get("start")?.trim() || ""
    const endDate = searchParams.get("end")?.trim() || ""

    if (!circle) {
      return NextResponse.json({ error: "اسم الحلقة مطلوب" }, { status: 400 })
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "فترة التقرير مطلوبة" }, { status: 400 })
    }

    if (startDate > endDate) {
      return NextResponse.json({ error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, name, halaqah")
      .eq("halaqah", circle)
      .order("name", { ascending: true })

    if (studentsError) {
      throw studentsError
    }

    const safeStudents = (students || []) as StudentRow[]

    if (safeStudents.length === 0) {
      return NextResponse.json({
        circle,
        startDate,
        endDate,
        rows: [],
      })
    }

    const studentIds = safeStudents.map((student) => student.id)

    const [{ data: plans, error: plansError }, { data: attendance, error: attendanceError }, { data: reports, error: reportsError }, { data: allAttendanceUpToEnd, error: allAttendanceUpToEndError }] = await Promise.all([
      supabase
        .from("student_plans")
        .select("id, student_id, start_date, start_surah_number, start_verse, end_surah_number, end_verse, total_pages, daily_pages, total_days, direction, has_previous, prev_start_surah, prev_start_verse, prev_end_surah, prev_end_verse, created_at")
        .in("student_id", studentIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("attendance_records")
        .select("student_id, date, status, evaluations(hafiz_level)")
        .in("student_id", studentIds)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true }),
      supabase
        .from("student_daily_reports")
        .select("student_id, report_date, memorization_done, tikrar_done, review_done, linking_done")
        .in("student_id", studentIds)
        .gte("report_date", startDate)
        .lte("report_date", endDate)
        .order("report_date", { ascending: true }),
      supabase
        .from("attendance_records")
        .select("student_id, date")
        .in("student_id", studentIds)
        .lte("date", endDate)
        .order("date", { ascending: true }),
    ])

    if (plansError) {
      throw plansError
    }

    if (attendanceError) {
      throw attendanceError
    }

    if (reportsError) {
      throw reportsError
    }

    if (allAttendanceUpToEndError) {
      throw allAttendanceUpToEndError
    }

    const latestPlanByStudent = new Map<string, PlanRow>()
    for (const plan of (plans || []) as PlanRow[]) {
      if (!latestPlanByStudent.has(plan.student_id)) {
        latestPlanByStudent.set(plan.student_id, plan)
      }
    }

    const attendanceByStudent = new Map<string, AttendanceRow[]>()
    for (const record of (attendance || []) as AttendanceRow[]) {
      const current = attendanceByStudent.get(record.student_id) || []
      current.push(record)
      attendanceByStudent.set(record.student_id, current)
    }

    const reportsByStudent = new Map<string, DailyReportRow[]>()
    for (const report of (reports || []) as DailyReportRow[]) {
      const current = reportsByStudent.get(report.student_id) || []
      current.push(report)
      reportsByStudent.set(report.student_id, current)
    }

    const firstAttendanceDateByStudent = new Map<string, string>()
    for (const record of ((allAttendanceUpToEnd || []) as Array<Pick<AttendanceRow, "student_id" | "date">>)) {
      if (!record.date || firstAttendanceDateByStudent.has(record.student_id)) {
        continue
      }

      firstAttendanceDateByStudent.set(record.student_id, record.date)
    }

    const rows = safeStudents
      .map((student) => {
        const studentAttendance = attendanceByStudent.get(student.id) || []
        const studentReports = reportsByStudent.get(student.id) || []
        const plan = latestPlanByStudent.get(student.id)
        const plannedExecutions = countPlannedExecutions(plan, startDate, endDate)
        const firstAttendanceDate = firstAttendanceDateByStudent.get(student.id) || null
        const attendanceRangeStart = firstAttendanceDate && firstAttendanceDate > startDate ? firstAttendanceDate : startDate
        const attendanceTotal = firstAttendanceDate ? countAttendanceSessions(attendanceRangeStart, endDate) : 0

        const presentCount = studentAttendance.filter((record) => record.status === "present").length
        const lateCount = studentAttendance.filter((record) => record.status === "late").length
        const absentCount = studentAttendance.filter((record) => record.status === "absent").length
        const excusedCount = studentAttendance.filter((record) => record.status === "excused").length

        const tasmeeAttempts = studentAttendance.filter((record) => {
          if (isMemorizationOffDay(record.date)) {
            return false
          }

          return getLatestHafizLevel(record) !== null
        })

        const tasmeePassed = tasmeeAttempts.filter((record) => isPassingMemorizationLevel(getLatestHafizLevel(record))).length

        const memorizationExecuted = studentReports.filter(
          (report) => report.memorization_done && !isMemorizationOffDay(report.report_date),
        ).length
        const tikrarExecuted = studentReports.filter(
          (report) => report.tikrar_done && !isMemorizationOffDay(report.report_date),
        ).length
        const reviewExecuted = studentReports.filter((report) => report.review_done && !isFriday(report.report_date)).length
        const linkingExecuted = studentReports.filter(
          (report) => report.linking_done && !isMemorizationOffDay(report.report_date),
        ).length

        return {
          studentId: student.id,
          studentName: student.name?.trim() || "طالب غير معرّف",
          presentCount,
          attendanceTotal,
          absentCount,
          lateCount,
          excusedCount,
          tasmeePassed,
          tasmeeTotal: tasmeeAttempts.length,
          memorizationExecuted,
          memorizationRequired: plannedExecutions.memorizationRequired,
          tikrarExecuted,
          tikrarRequired: plannedExecutions.memorizationRequired,
          reviewExecuted,
          reviewRequired: plannedExecutions.reviewRequired,
          linkingExecuted,
          linkingRequired: plannedExecutions.memorizationRequired,
        }
      })
      .sort((left, right) => left.studentName.localeCompare(right.studentName, "ar"))

    return NextResponse.json({
      circle,
      startDate,
      endDate,
      rows,
    })
  } catch (error) {
    console.error("[circle-short-report]", error)
    return NextResponse.json({ error: "تعذر إنشاء التقرير المختصر" }, { status: 500 })
  }
}