import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildPlanSessionProgress, deriveReportSessionNumbersByDate, isMemorizationOffDay } from "@/lib/plan-session-progress"

const SELF_REPORT_REWARD_POINTS = {
  memorization_done: 10,
  tikrar_done: 10,
  review_done: 10,
  linking_done: 10,
} as const

function getKsaDateString(baseDate = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(baseDate)
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  return `${year}-${month}-${day}`
}

function getEarlierKsaDateString(referenceDate: string, daysBack: number) {
  const baseDate = new Date(`${referenceDate}T00:00:00+03:00`)
  baseDate.setUTCDate(baseDate.getUTCDate() - daysBack)
  return baseDate.toISOString().slice(0, 10)
}

function isMissingReportsTable(error: { message?: string | null; details?: string | null; hint?: string | null } | null) {
  if (!error) return false
  const content = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`
  return /student_daily_reports|relation .* does not exist|schema cache/i.test(content)
}

function isMissingRewardClaimedColumns(error: { message?: string | null; details?: string | null; hint?: string | null } | null) {
  if (!error) return false
  const content = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`
  return /memorization_reward_claimed|tikrar_reward_claimed|review_reward_claimed|linking_reward_claimed|column .* does not exist/i.test(content)
}

function isMissingTikrarColumns(error: { message?: string | null; details?: string | null; hint?: string | null } | null) {
  if (!error) return false
  const content = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`
  return /tikrar_done|tikrar_reward_claimed|column .* does not exist/i.test(content)
}

function isMissingPlanSessionNumberColumn(error: { message?: string | null; details?: string | null; hint?: string | null } | null) {
  if (!error) return false
  const content = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`
  return /plan_session_number|column .* does not exist/i.test(content)
}

async function resolvePlanSessionNumber(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  studentId: string
  reportDate: string
}) {
  const { supabase, studentId, reportDate } = params
  const { data: plan } = await supabase
    .from("student_plans")
    .select("start_date, total_days")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!plan) {
    return null
  }

  let reportsQuery = supabase
    .from("student_daily_reports")
    .select("report_date, plan_session_number")
    .eq("student_id", studentId)
    .order("report_date", { ascending: true })

  let attendanceQuery = supabase
    .from("attendance_records")
    .select("date, status, evaluations(hafiz_level)")
    .eq("student_id", studentId)
    .order("date", { ascending: true })

  if (plan.start_date) {
    reportsQuery = reportsQuery.gte("report_date", plan.start_date)
    attendanceQuery = attendanceQuery.gte("date", plan.start_date)
  }

  const [{ data: reports, error: reportsError }, { data: attendanceRecords, error: attendanceError }] = await Promise.all([
    reportsQuery,
    attendanceQuery,
  ])

  if (reportsError) {
    throw reportsError
  }

  if (attendanceError) {
    throw attendanceError
  }

  const safeReports = reports || []
  const reportSessionNumbersByDate = deriveReportSessionNumbersByDate(safeReports)
  const progress = buildPlanSessionProgress({
    reports: safeReports,
    attendanceRecords: attendanceRecords || [],
    totalDays: plan.total_days,
  })

  return reportSessionNumbersByDate[reportDate] || progress.nextSessionNumber || null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get("student_id")?.trim() || ""
    const studentIds = (searchParams.get("student_ids") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
    const requestedDays = Number.parseInt(searchParams.get("days") || "3", 10)
    const days = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 1), 14) : 3
    const excludeToday = searchParams.get("exclude_today") === "true"
    const skipMemorizationOffDays = searchParams.get("skip_memorization_off_days") === "true"

    if (!studentId && studentIds.length === 0) {
      return NextResponse.json({ error: "student_id أو student_ids مطلوب" }, { status: 400 })
    }

    const supabase = await createClient()
    const todayDate = getKsaDateString()
    const queryEndDate = excludeToday ? getEarlierKsaDateString(todayDate, 1) : todayDate
    const lookbackDays = skipMemorizationOffDays ? Math.min(31, Math.max(days * 2, days + 7)) : days
    const fromDate = getEarlierKsaDateString(queryEndDate, lookbackDays - 1)

    let query = supabase
      .from("student_daily_reports")
      .select("id, student_id, report_date, plan_session_number, memorization_done, tikrar_done, review_done, linking_done, notes, created_at, updated_at")
      .gte("report_date", fromDate)
      .lte("report_date", queryEndDate)
      .order("report_date", { ascending: false })

    if (studentId) {
      query = query.eq("student_id", studentId)
    } else {
      query = query.in("student_id", studentIds)
    }

    const { data, error } = await query

    if (error) {
      console.error("[student-daily-reports][GET]", error)
      return NextResponse.json(
        {
          error: isMissingReportsTable(error)
            ? "جدول تقارير تنفيذ الطالب غير موجود بعد. نفذ ملف scripts/045_create_student_daily_reports.sql ثم أعد المحاولة."
            : isMissingTikrarColumns(error)
            ? "يلزم تنفيذ ملف scripts/048_add_tikrar_to_student_daily_reports.sql قبل عرض التنفيذ اليومي."
            : isMissingPlanSessionNumberColumn(error)
            ? "يلزم تنفيذ ملف scripts/047_add_plan_session_number_to_student_daily_reports.sql قبل عرض التنفيذ اليومي."
            : "تعذر جلب تقارير التنفيذ اليومية",
          details: error.details ?? null,
          hint: error.hint ?? null,
          code: (error as { code?: string | null }).code ?? null,
        },
        { status: 500 },
      )
    }

    const filteredReports = (data || []).filter((report) => {
      if (excludeToday && report.report_date >= todayDate) {
        return false
      }

      if (skipMemorizationOffDays && isMemorizationOffDay(report.report_date)) {
        return false
      }

      return true
    })

    const reportsByStudent = filteredReports.reduce<Record<string, typeof filteredReports>>((acc, report) => {
      if (!acc[report.student_id]) acc[report.student_id] = []
      acc[report.student_id].push(report)
      return acc
    }, {})

    const limitedReportsByStudent = Object.fromEntries(
      Object.entries(reportsByStudent).map(([currentStudentId, studentReports]) => [
        currentStudentId,
        studentReports
          .sort((left, right) => right.report_date.localeCompare(left.report_date))
          .slice(0, days),
      ]),
    )

    const reports = Object.values(limitedReportsByStudent).flat()

    return NextResponse.json({ todayDate, reports, reportsByStudent: limitedReportsByStudent })
  } catch (error) {
    console.error("[student-daily-reports][GET][fatal]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const studentId = typeof body.student_id === "string" ? body.student_id.trim() : ""
    const reportDate = typeof body.report_date === "string" && body.report_date.trim() ? body.report_date.trim() : getKsaDateString()
    const notes = typeof body.notes === "string" ? body.notes.trim() : ""
    const isReviewOnlyDay = isMemorizationOffDay(reportDate)

    if (!studentId) {
      return NextResponse.json({ error: "student_id مطلوب" }, { status: 400 })
    }

    const hasMemorizationValue = !isReviewOnlyDay && typeof body.memorization_done === "boolean"
    const hasTikrarValue = !isReviewOnlyDay && typeof body.tikrar_done === "boolean"
    const hasReviewValue = typeof body.review_done === "boolean"
    const hasLinkingValue = !isReviewOnlyDay && typeof body.linking_done === "boolean"

    if (!hasMemorizationValue && !hasTikrarValue && !hasReviewValue && !hasLinkingValue) {
      return NextResponse.json(
        { error: "حدد عنصرًا واحدًا على الأقل قبل الحفظ" },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const nowIso = new Date().toISOString()

    const { data: existingReport, error: existingReportError } = await supabase
      .from("student_daily_reports")
      .select("id, plan_session_number, memorization_done, tikrar_done, review_done, linking_done, memorization_reward_claimed, tikrar_reward_claimed, review_reward_claimed, linking_reward_claimed")
      .eq("student_id", studentId)
      .eq("report_date", reportDate)
      .maybeSingle()

    if (existingReportError) {
      console.error("[student-daily-reports][POST][existing]", existingReportError)
      return NextResponse.json(
        {
          error: isMissingTikrarColumns(existingReportError)
            ? "يلزم تنفيذ ملف scripts/048_add_tikrar_to_student_daily_reports.sql قبل حفظ التنفيذ اليومي."
            : isMissingPlanSessionNumberColumn(existingReportError)
            ? "يلزم تنفيذ ملف scripts/047_add_plan_session_number_to_student_daily_reports.sql قبل حفظ التنفيذ اليومي."
            : isMissingRewardClaimedColumns(existingReportError)
            ? "يلزم تنفيذ ملف scripts/046_add_reward_claimed_flags_to_student_daily_reports.sql قبل حفظ التنفيذ اليومي."
            : "تعذر التحقق من تقرير التنفيذ اليومي الحالي",
          details: existingReportError.details ?? null,
          hint: existingReportError.hint ?? null,
          code: (existingReportError as { code?: string | null }).code ?? null,
        },
        { status: 500 },
      )
    }

    if (existingReport && (hasMemorizationValue || hasTikrarValue || hasReviewValue || hasLinkingValue)) {
      return NextResponse.json(
        { error: "تم حفظ تنفيذ اليوم مسبقاً، ولا يمكن تعديله مرة أخرى" },
        { status: 409 },
      )
    }

    const nextMemorizationDone = isReviewOnlyDay
      ? false
      : hasMemorizationValue
      ? body.memorization_done
      : existingReport?.memorization_done ?? false
    const nextTikrarDone = isReviewOnlyDay
      ? false
      : hasTikrarValue
      ? body.tikrar_done
      : existingReport?.tikrar_done ?? false
    const nextReviewDone = hasReviewValue
      ? body.review_done
      : existingReport?.review_done ?? false
    const nextLinkingDone = isReviewOnlyDay
      ? false
      : hasLinkingValue
      ? body.linking_done
      : existingReport?.linking_done ?? false

    const memorizationRewardClaimed = isReviewOnlyDay
      ? false
      : Boolean(existingReport?.memorization_reward_claimed || existingReport?.memorization_done)
    const tikrarRewardClaimed = isReviewOnlyDay
      ? false
      : Boolean(existingReport?.tikrar_reward_claimed || existingReport?.tikrar_done)
    const reviewRewardClaimed = Boolean(existingReport?.review_reward_claimed || existingReport?.review_done)
    const linkingRewardClaimed = Boolean(existingReport?.linking_reward_claimed || existingReport?.linking_done)

    const nextMemorizationRewardClaimed = isReviewOnlyDay ? false : memorizationRewardClaimed || nextMemorizationDone
    const nextTikrarRewardClaimed = isReviewOnlyDay ? false : tikrarRewardClaimed || nextTikrarDone
    const nextReviewRewardClaimed = reviewRewardClaimed || nextReviewDone
    const nextLinkingRewardClaimed = linkingRewardClaimed || nextLinkingDone
    const planSessionNumber = isReviewOnlyDay ? null : existingReport?.plan_session_number || (await resolvePlanSessionNumber({
      supabase,
      studentId,
      reportDate,
    }))

    const newlyCompletedFields = [
      !isReviewOnlyDay && !memorizationRewardClaimed && nextMemorizationDone ? "memorization_done" : null,
      !isReviewOnlyDay && !tikrarRewardClaimed && nextTikrarDone ? "tikrar_done" : null,
      !reviewRewardClaimed && nextReviewDone ? "review_done" : null,
      !linkingRewardClaimed && nextLinkingDone ? "linking_done" : null,
    ].filter(Boolean)

    const { data, error } = await supabase
      .from("student_daily_reports")
      .upsert(
        {
          student_id: studentId,
          report_date: reportDate,
          plan_session_number: planSessionNumber,
          memorization_done: nextMemorizationDone,
          tikrar_done: nextTikrarDone,
          review_done: nextReviewDone,
          linking_done: nextLinkingDone,
          memorization_reward_claimed: nextMemorizationRewardClaimed,
          tikrar_reward_claimed: nextTikrarRewardClaimed,
          review_reward_claimed: nextReviewRewardClaimed,
          linking_reward_claimed: nextLinkingRewardClaimed,
          notes: notes || null,
          updated_at: nowIso,
        },
        { onConflict: "student_id,report_date" },
      )
      .select("id, student_id, report_date, plan_session_number, memorization_done, tikrar_done, review_done, linking_done, notes, created_at, updated_at")
      .single()

    if (error) {
      console.error("[student-daily-reports][POST]", error)
      return NextResponse.json(
        {
          error: isMissingPlanSessionNumberColumn(error)
            ? "يلزم تنفيذ ملف scripts/047_add_plan_session_number_to_student_daily_reports.sql قبل حفظ التنفيذ اليومي."
            : isMissingTikrarColumns(error)
            ? "يلزم تنفيذ ملف scripts/048_add_tikrar_to_student_daily_reports.sql قبل حفظ التنفيذ اليومي."
            : isMissingRewardClaimedColumns(error)
            ? "يلزم تنفيذ ملف scripts/046_add_reward_claimed_flags_to_student_daily_reports.sql قبل حفظ التنفيذ اليومي."
            : isMissingReportsTable(error)
            ? "جدول تقارير تنفيذ الطالب غير موجود بعد. نفذ ملف scripts/045_create_student_daily_reports.sql ثم أعد المحاولة."
            : "تعذر حفظ تقرير التنفيذ اليومي",
          details: error.details ?? null,
          hint: error.hint ?? null,
          code: (error as { code?: string | null }).code ?? null,
        },
        { status: 500 },
      )
    }

    const awardedFields = newlyCompletedFields.filter(
      (field): field is keyof typeof SELF_REPORT_REWARD_POINTS => field in SELF_REPORT_REWARD_POINTS,
    )
    const pointsAwarded = awardedFields.reduce((total, field) => total + SELF_REPORT_REWARD_POINTS[field], 0)

    let updatedPoints: number | null = null
    let updatedStorePoints: number | null = null

    if (pointsAwarded > 0) {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("points, store_points")
        .eq("id", studentId)
        .single()

      if (studentError) {
        console.error("[student-daily-reports][POST][student-points][select]", studentError)
        return NextResponse.json(
          {
            error: "تم حفظ التنفيذ اليومي، لكن تعذر تحديث نقاط الطالب",
            report: data,
            newlyCompletedFields,
          },
          { status: 500 },
        )
      }

      const nextPoints = (studentData?.points || 0) + pointsAwarded
      const nextStorePoints = (studentData?.store_points || 0) + pointsAwarded
      updatedPoints = nextPoints
      updatedStorePoints = nextStorePoints

      const { error: updateStudentError } = await supabase
        .from("students")
        .update({ points: nextPoints, store_points: nextStorePoints })
        .eq("id", studentId)

      if (updateStudentError) {
        console.error("[student-daily-reports][POST][student-points][update]", updateStudentError)
        return NextResponse.json(
          {
            error: "تم حفظ التنفيذ اليومي، لكن تعذر تحديث نقاط الطالب",
            report: data,
            newlyCompletedFields,
          },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ success: true, report: data, newlyCompletedFields, pointsAwarded, updatedPoints, updatedStorePoints })
  } catch (error) {
    console.error("[student-daily-reports][POST][fatal]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}