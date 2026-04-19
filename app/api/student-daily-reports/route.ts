import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildPlanSessionProgress, deriveReportSessionNumbersByDate, isMemorizationOffDay } from "@/lib/plan-session-progress"
import { getSaudiAttendanceAnchorDate } from "@/lib/saudi-time"
import { calculatePreviousMemorizedPages, resolvePlanLinkingPagesPreference, resolvePlanReviewPagesPreference, resolvePlanReviewPoolPages } from "@/lib/quran-data"
import { isPassingMemorizationLevel } from "@/lib/student-attendance"
import { notifyGuardian } from "@/lib/guardian-notifications"

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
  const baseDate = new Date(`${referenceDate}T12:00:00+03:00`)
  baseDate.setUTCDate(baseDate.getUTCDate() - daysBack)
  return getKsaDateString(baseDate)
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

function isMissingExecutionPageCountColumns(error: { message?: string | null; details?: string | null; hint?: string | null } | null) {
  if (!error) return false
  const content = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`
  return /memorization_pages_count|tikrar_pages_count|review_pages_count|linking_pages_count|column .* does not exist/i.test(content)
}

function isDuplicateDailyReportError(error: { message?: string | null; details?: string | null; hint?: string | null; code?: string | null } | null) {
  if (!error) return false
  const content = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`
  return /PGRST116|multiple \(or no\) rows returned|more than 1 row|multiple rows/i.test(content)
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
    .select("report_date, plan_session_number, memorization_done")
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

function normalizePageCount(value: number) {
  return Math.max(0, Math.round(value * 100) / 100)
}

function formatReportDateLabel(dateValue: string) {
  const [year, month, day] = String(dateValue || "").split("-")
  if (!year || !month || !day) {
    return dateValue
  }

  return `${year}/${month}/${day}`
}

function buildDailyExecutionGuardianMessage(params: {
  studentName: string
  halaqah?: string | null
  reportDate: string
  isReviewOnlyDay: boolean
  memorizationDone: boolean
  tikrarDone: boolean
  reviewDone: boolean
  linkingDone: boolean
}) {
  const completedItems: string[] = []

  if (!params.isReviewOnlyDay && params.memorizationDone) completedItems.push("الحفظ")
  if (!params.isReviewOnlyDay && params.tikrarDone) completedItems.push("التكرار")
  if (params.reviewDone) completedItems.push(params.isReviewOnlyDay ? "السرد" : "المراجعة")
  if (!params.isReviewOnlyDay && params.linkingDone) completedItems.push("الربط")

  if (completedItems.length === 0) {
    return ""
  }

  const halaqahLabel = (params.halaqah || "الحلقة").trim() || "الحلقة"
  const dateLabel = formatReportDateLabel(params.reportDate)

  if (params.isReviewOnlyDay) {
    return `تنبيه من ${halaqahLabel}: تم تسجيل يوم السرد للطالب ${params.studentName} بتاريخ ${dateLabel}.`
  }

  return `تنبيه من ${halaqahLabel}: تم تسجيل تنفيذ اليوم للطالب ${params.studentName} بتاريخ ${dateLabel}، وتم إنجاز ${completedItems.join("، ")}.`
}

async function resolveExecutionPageCounts(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  studentId: string
  reportDate: string
  hasMemorizationDone: boolean
  hasTikrarDone: boolean
  hasReviewDone: boolean
  hasLinkingDone: boolean
  isReviewOnlyDay: boolean
}) {
  const { supabase, studentId, reportDate, hasMemorizationDone, hasTikrarDone, hasReviewDone, hasLinkingDone, isReviewOnlyDay } = params
  const { data: plan } = await supabase
    .from("student_plans")
    .select("start_date, daily_pages, muraajaa_pages, rabt_pages, review_distribution_mode, review_distribution_days, review_minimum_pages")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const dailyPages = normalizePageCount(Number(plan?.daily_pages) || 0)

  if (!plan) {
    return {
      memorizationPagesCount: hasMemorizationDone && !isReviewOnlyDay ? dailyPages : 0,
      tikrarPagesCount: hasTikrarDone && !isReviewOnlyDay ? dailyPages : 0,
      reviewPagesCount: 0,
      linkingPagesCount: 0,
    }
  }

  let attendanceQuery = supabase
    .from("attendance_records")
    .select("date, evaluations(hafiz_level)")
    .eq("student_id", studentId)
    .lte("date", reportDate)
    .order("date", { ascending: true })

  if (plan.start_date) {
    attendanceQuery = attendanceQuery.gte("date", plan.start_date)
  }

  const { data: attendanceRecords } = await attendanceQuery
  const successfulMemorizationCount = (attendanceRecords || []).filter((record) => {
    const evaluations = Array.isArray(record.evaluations)
      ? record.evaluations
      : record.evaluations
        ? [record.evaluations]
        : []
    const latestLevel = evaluations.length > 0 ? evaluations[evaluations.length - 1]?.hafiz_level ?? null : null
    return isPassingMemorizationLevel(latestLevel)
  }).length

  const memorizedPoolPages = calculatePreviousMemorizedPages(plan) + successfulMemorizationCount * dailyPages
  const reviewPoolPages = resolvePlanReviewPoolPages(plan, memorizedPoolPages)
  const linkingPagesCount = resolvePlanLinkingPagesPreference(plan, successfulMemorizationCount)

  return {
    memorizationPagesCount: hasMemorizationDone && !isReviewOnlyDay ? dailyPages : 0,
    tikrarPagesCount: hasTikrarDone && !isReviewOnlyDay ? dailyPages : 0,
    reviewPagesCount: hasReviewDone ? normalizePageCount(resolvePlanReviewPagesPreference(plan, reviewPoolPages)) : 0,
    linkingPagesCount: hasLinkingDone && !isReviewOnlyDay
      ? normalizePageCount(linkingPagesCount)
      : 0,
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get("student_id")?.trim() || ""
    const targetDateParam = searchParams.get("date")?.trim() || ""
    const studentIds = (searchParams.get("student_ids") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
    const requestedDays = Number.parseInt(searchParams.get("days") || "3", 10)
    const days = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 1), 14) : 3
    const excludeToday = searchParams.get("exclude_today") === "true"
    const skipMemorizationOffDays = searchParams.get("skip_memorization_off_days") === "true"
    const pendingOnly = searchParams.get("pending_only") === "true"

    if (!studentId && studentIds.length === 0) {
      return NextResponse.json({ error: "student_id أو student_ids مطلوب" }, { status: 400 })
    }

    const supabase = await createClient()
    const todayDate = getKsaDateString()
  const normalizedTargetDate = /^\d{4}-\d{2}-\d{2}$/.test(targetDateParam) ? targetDateParam : ""
  const baseDate = normalizedTargetDate || todayDate
  const queryEndDate = excludeToday ? getEarlierKsaDateString(baseDate, 1) : baseDate
    const lookbackDays = skipMemorizationOffDays ? Math.min(31, Math.max(days * 2, days + 7)) : days
    const fromDate = getEarlierKsaDateString(queryEndDate, lookbackDays - 1)

    let query = supabase
      .from("student_daily_reports")
      .select("id, student_id, report_date, plan_session_number, memorization_done, tikrar_done, review_done, linking_done, memorization_pages_count, tikrar_pages_count, review_pages_count, linking_pages_count, notes, created_at, updated_at")
      .lte("report_date", queryEndDate)
      .order("report_date", { ascending: false })

    if (!pendingOnly) {
      query = query.gte("report_date", fromDate)
    }

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
            : isMissingExecutionPageCountColumns(error)
            ? "يلزم تنفيذ ملف scripts/060_add_execution_page_counts_to_student_daily_reports.sql قبل عرض التنفيذ اليومي."
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

    let finalReportsByStudent = reportsByStudent

    if (pendingOnly) {
      let attendanceQuery = supabase
        .from("attendance_records")
        .select("student_id, date, evaluations(hafiz_level)")
        .lte("date", queryEndDate)

      if (studentId) {
        attendanceQuery = attendanceQuery.eq("student_id", studentId)
      } else {
        attendanceQuery = attendanceQuery.in("student_id", studentIds)
      }

      const { data: attendanceRecords, error: attendanceError } = await attendanceQuery

      if (attendanceError) {
        console.error("[student-daily-reports][GET][pending]", attendanceError)
        return NextResponse.json({ error: "تعذر جلب سجلات التسميع الحالية" }, { status: 500 })
      }

      const savedReportDatesByStudent = (attendanceRecords || []).reduce<Record<string, Set<string>>>((acc, record) => {
        const evaluations = Array.isArray(record.evaluations)
          ? record.evaluations
          : record.evaluations
            ? [record.evaluations]
            : []
        const latestHafizLevel = evaluations.length > 0 ? evaluations[evaluations.length - 1]?.hafiz_level ?? null : null

        if (latestHafizLevel === null || latestHafizLevel === undefined) {
          return acc
        }

        if (!acc[record.student_id]) {
          acc[record.student_id] = new Set<string>()
        }

        acc[record.student_id].add(record.date)
        return acc
      }, {})

      finalReportsByStudent = Object.fromEntries(
        Object.entries(reportsByStudent).map(([currentStudentId, studentReports]) => [
          currentStudentId,
          studentReports.filter((report) => !savedReportDatesByStudent[currentStudentId]?.has(getSaudiAttendanceAnchorDate(report.report_date))),
        ]),
      )
    } else {
      finalReportsByStudent = Object.fromEntries(
        Object.entries(reportsByStudent).map(([currentStudentId, studentReports]) => [
          currentStudentId,
          studentReports
            .sort((left, right) => right.report_date.localeCompare(left.report_date))
            .slice(0, days),
        ]),
      )
    }

    const reports = Object.values(finalReportsByStudent).flat()

    return NextResponse.json({ todayDate, reports, reportsByStudent: finalReportsByStudent })
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
      .select("id, plan_session_number, memorization_done, tikrar_done, review_done, linking_done, memorization_pages_count, tikrar_pages_count, review_pages_count, linking_pages_count, memorization_reward_claimed, tikrar_reward_claimed, review_reward_claimed, linking_reward_claimed")
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
            : isMissingExecutionPageCountColumns(existingReportError)
            ? "يلزم تنفيذ ملف scripts/060_add_execution_page_counts_to_student_daily_reports.sql قبل حفظ التنفيذ اليومي."
            : isDuplicateDailyReportError(existingReportError)
            ? "يوجد أكثر من تقرير تنفيذ يومي لهذا الطالب في نفس التاريخ داخل قاعدة البيانات، ويجب حذف التكرار والإبقاء على سجل واحد فقط."
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
    const executionPageCounts = await resolveExecutionPageCounts({
      supabase,
      studentId,
      reportDate,
      hasMemorizationDone: nextMemorizationDone,
      hasTikrarDone: nextTikrarDone,
      hasReviewDone: nextReviewDone,
      hasLinkingDone: nextLinkingDone,
      isReviewOnlyDay,
    })

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
          memorization_pages_count: executionPageCounts.memorizationPagesCount,
          tikrar_pages_count: executionPageCounts.tikrarPagesCount,
          review_pages_count: executionPageCounts.reviewPagesCount,
          linking_pages_count: executionPageCounts.linkingPagesCount,
          memorization_reward_claimed: nextMemorizationRewardClaimed,
          tikrar_reward_claimed: nextTikrarRewardClaimed,
          review_reward_claimed: nextReviewRewardClaimed,
          linking_reward_claimed: nextLinkingRewardClaimed,
          notes: notes || null,
          updated_at: nowIso,
        },
        { onConflict: "student_id,report_date" },
      )
      .select("id, student_id, report_date, plan_session_number, memorization_done, tikrar_done, review_done, linking_done, memorization_pages_count, tikrar_pages_count, review_pages_count, linking_pages_count, notes, created_at, updated_at")
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
            : isMissingExecutionPageCountColumns(error)
            ? "يلزم تنفيذ ملف scripts/060_add_execution_page_counts_to_student_daily_reports.sql قبل حفظ التنفيذ اليومي."
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

    const shouldNotifyGuardian = nextMemorizationDone || nextTikrarDone || nextReviewDone || nextLinkingDone
    if (shouldNotifyGuardian) {
      try {
        const notificationSupabase = createAdminClient()
        const { data: studentNotificationProfile, error: studentNotificationError } = await notificationSupabase
          .from("students")
          .select("name, halaqah, account_number, guardian_phone")
          .eq("id", studentId)
          .maybeSingle()

        if (studentNotificationError) {
          console.error("[student-daily-reports][POST][guardian-notify][student]", studentNotificationError)
        } else {
          const guardianMessage = buildDailyExecutionGuardianMessage({
            studentName: studentNotificationProfile?.name || "الطالب",
            halaqah: studentNotificationProfile?.halaqah || "",
            reportDate,
            isReviewOnlyDay,
            memorizationDone: nextMemorizationDone,
            tikrarDone: nextTikrarDone,
            reviewDone: nextReviewDone,
            linkingDone: nextLinkingDone,
          })

          if (guardianMessage) {
            await notifyGuardian(notificationSupabase, {
              accountNumber: studentNotificationProfile?.account_number,
              appMessage: guardianMessage,
              phoneNumber: studentNotificationProfile?.guardian_phone,
              whatsappMessage: guardianMessage,
            })
          }
        }
      } catch (guardianNotificationError) {
        console.error("[student-daily-reports][POST][guardian-notify]", guardianNotificationError)
      }
    }

    return NextResponse.json({ success: true, report: data, newlyCompletedFields, pointsAwarded, updatedPoints, updatedStorePoints })
  } catch (error) {
    console.error("[student-daily-reports][POST][fatal]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}