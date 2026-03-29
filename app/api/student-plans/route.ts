import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"
import { canAccessStudent, getRequestActor, isAdminRole, isTeacherRole } from "@/lib/request-auth"
import {
  SURAHS,
  calculatePreviousMemorizedPages,
  calculateQuranMemorizationProgress,
  getContiguousCompletedJuzRange,
  getJuzBounds,
  getJuzNumbersForPageRange,
  getNextAyahReference,
  getNormalizedCompletedJuzs,
  hasScatteredCompletedJuzs,
  getPageFloatForAyah,
  resolvePlanTotalDays,
  resolvePlanTotalPages,
} from "@/lib/quran-data"
import { getSaudiDateString } from "@/lib/saudi-time"
import { isPassingMemorizationLevel } from "@/lib/student-attendance"
import { buildPlanSessionProgress } from "@/lib/plan-session-progress"

export const dynamic = "force-dynamic"
export const revalidate = 0

function hasCompletedMemorization(record: any) {
  const evaluations = Array.isArray(record.evaluations)
    ? record.evaluations
    : record.evaluations
      ? [record.evaluations]
      : []

  if (evaluations.length === 0) return false

  const latestEvaluation = evaluations[evaluations.length - 1]
  return isPassingMemorizationLevel(latestEvaluation?.hafiz_level ?? null)
}

function normalizeHalaqahName(value?: string | null) {
  return (value || "").trim().toLowerCase()
}

function getExpectedNextStart(prevStartSurah?: number | null, prevEndSurah?: number | null, prevEndVerse?: number | null) {
  if (!prevStartSurah || !prevEndSurah || !prevEndVerse) {
    return null
  }

  const previousEndSurahData = SURAHS.find((surah) => surah.number === prevEndSurah)
  if (!previousEndSurahData) return null

  const isDescending = prevStartSurah > prevEndSurah

  if (!isDescending) {
    if (prevEndVerse < previousEndSurahData.verseCount) {
      return { surahNumber: prevEndSurah, verseNumber: prevEndVerse + 1 }
    }

    const nextSurah = SURAHS.find((surah) => surah.number === prevEndSurah + 1)
    return nextSurah ? { surahNumber: nextSurah.number, verseNumber: 1 } : null
  }

  if (prevEndVerse > 1) {
    return { surahNumber: prevEndSurah, verseNumber: prevEndVerse - 1 }
  }

  const previousSurah = SURAHS.find((surah) => surah.number === prevEndSurah - 1)
  return previousSurah
    ? { surahNumber: previousSurah.number, verseNumber: previousSurah.verseCount }
    : null
}

function compareAyahRefs(
  leftSurahNumber: number,
  leftVerseNumber: number,
  rightSurahNumber: number,
  rightVerseNumber: number,
) {
  if (leftSurahNumber !== rightSurahNumber) {
    return leftSurahNumber - rightSurahNumber
  }

  return leftVerseNumber - rightVerseNumber
}

function isStartAllowedAfterPrevious(
  startSurahNumber: number,
  startVerseNumber: number,
  boundarySurahNumber: number,
  boundaryVerseNumber: number,
  previousDirection: "asc" | "desc",
) {
  const comparison = compareAyahRefs(startSurahNumber, startVerseNumber, boundarySurahNumber, boundaryVerseNumber)
  return previousDirection === "desc" ? comparison <= 0 : comparison >= 0
}

async function buildStudentPlanSummary(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  actor: Awaited<ReturnType<typeof getRequestActor>>
  studentId: string
}) {
  const { supabase, actor, studentId } = params

  const canViewStudent = await canAccessStudent({
    supabase,
    actor,
    studentId,
    allowStudentSelf: true,
    allowTeacher: true,
  })

  if (!canViewStudent) {
    return { error: "غير مصرح لك بعرض خطة هذا الطالب", status: 403 as const }
  }

  const [{ data: studentData }, { data: plans, error }] = await Promise.all([
    supabase
      .from("students")
      .select("completed_juzs, current_juzs, memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse")
      .eq("id", studentId)
      .maybeSingle(),
    supabase
      .from("student_plans")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
  ])

  if (error) {
    throw error
  }

  if (!plans || plans.length === 0) {
    const normalizedCompletedJuzs = getNormalizedCompletedJuzs(studentData?.completed_juzs)
    const completedJuzRange = hasScatteredCompletedJuzs(normalizedCompletedJuzs)
      ? null
      : getContiguousCompletedJuzRange(normalizedCompletedJuzs)
    const hasStoredStudentMemorizedRange = Boolean(
      studentData?.memorized_start_surah && studentData?.memorized_end_surah,
    )
    const quranMemorization = calculateQuranMemorizationProgress(
      {
        completed_juzs: studentData?.completed_juzs || [],
        has_previous: hasStoredStudentMemorizedRange || Boolean(completedJuzRange),
        prev_start_surah: hasStoredStudentMemorizedRange
          ? (studentData?.memorized_start_surah ?? null)
          : completedJuzRange?.startSurahNumber ?? null,
        prev_start_verse: hasStoredStudentMemorizedRange
          ? (studentData?.memorized_start_verse ?? null)
          : completedJuzRange?.startVerseNumber ?? null,
        prev_end_surah: hasStoredStudentMemorizedRange
          ? (studentData?.memorized_end_surah ?? null)
          : completedJuzRange?.endSurahNumber ?? null,
        prev_end_verse: hasStoredStudentMemorizedRange
          ? (studentData?.memorized_end_verse ?? null)
          : completedJuzRange?.endVerseNumber ?? null,
      },
      0,
    )

    return {
      plan: null,
      completedDays: 0,
      progressedDays: 0,
      awaitingHearingSessionNumbers: [],
      failedSessionNumbers: [],
      completedSessionNumbers: [],
      completedRecordsBySessionNumber: {},
      nextSessionNumber: 1,
      reportSessionNumbersByDate: {},
      progressPercent: 0,
      quranMemorizedPages: quranMemorization.memorizedPages,
      quranProgressPercent: quranMemorization.progressPercent,
      quranLevel: quranMemorization.level,
      attendanceRecords: [],
      completedRecords: [],
    }
  }

  const rawPlan = plans[0]
  const normalizedCompletedJuzs = getNormalizedCompletedJuzs(studentData?.completed_juzs)
  const completedJuzRange = hasScatteredCompletedJuzs(normalizedCompletedJuzs)
    ? null
    : getContiguousCompletedJuzRange(normalizedCompletedJuzs)
  const hasStoredStudentMemorizedRange = Boolean(
    studentData?.memorized_start_surah && studentData?.memorized_end_surah,
  )
  const hasExplicitCompletedJuzs = normalizedCompletedJuzs.length > 0
  const shouldUsePlanPreviousRange = !hasStoredStudentMemorizedRange && !completedJuzRange && !hasExplicitCompletedJuzs
  const effectivePlan = {
    ...rawPlan,
    completed_juzs: studentData?.completed_juzs || [],
    current_juzs: studentData?.current_juzs || [],
    has_previous: hasStoredStudentMemorizedRange || Boolean(completedJuzRange)
      ? true
      : shouldUsePlanPreviousRange
        ? Boolean(rawPlan.has_previous)
        : false,
    prev_start_surah: hasStoredStudentMemorizedRange
      ? (studentData?.memorized_start_surah ?? null)
      : completedJuzRange
        ? completedJuzRange.startSurahNumber
        : shouldUsePlanPreviousRange
          ? (rawPlan.prev_start_surah ?? null)
          : null,
    prev_start_verse: hasStoredStudentMemorizedRange
      ? (studentData?.memorized_start_verse ?? null)
      : completedJuzRange
        ? completedJuzRange.startVerseNumber
        : shouldUsePlanPreviousRange
          ? (rawPlan.prev_start_verse ?? null)
          : null,
    prev_end_surah: hasStoredStudentMemorizedRange
      ? (studentData?.memorized_end_surah ?? null)
      : completedJuzRange
        ? completedJuzRange.endSurahNumber
        : shouldUsePlanPreviousRange
          ? (rawPlan.prev_end_surah ?? null)
          : null,
    prev_end_verse: hasStoredStudentMemorizedRange
      ? (studentData?.memorized_end_verse ?? null)
      : completedJuzRange
        ? completedJuzRange.endVerseNumber
        : shouldUsePlanPreviousRange
          ? (rawPlan.prev_end_verse ?? null)
          : null,
  }
  const plan = {
    ...effectivePlan,
    total_pages: resolvePlanTotalPages({
      ...effectivePlan,
      completed_juzs: studentData?.completed_juzs || [],
    }),
    total_days: resolvePlanTotalDays({
      ...effectivePlan,
      completed_juzs: studentData?.completed_juzs || [],
    }),
  }

  let reportsQuery = supabase
    .from("student_daily_reports")
    .select("report_date, plan_session_number")
    .eq("student_id", studentId)
    .order("report_date", { ascending: true })

  if (plan.start_date) {
    reportsQuery = reportsQuery.gte("report_date", plan.start_date)
  }

  let attQuery = supabase
    .from("attendance_records")
    .select("id, date, status, evaluations(hafiz_level, tikrar_level, samaa_level, rabet_level)")
    .eq("student_id", studentId)
    .order("date", { ascending: true })

  if (plan.start_date) {
    attQuery = attQuery.gte("date", plan.start_date)
  }

  const [{ data: studentDailyReports, error: reportsError }, { data: attendanceRecords, error: attError }] = await Promise.all([
    reportsQuery,
    attQuery,
  ])

  if (reportsError) {
    console.error("[plans] student daily reports query error:", reportsError)
  }

  if (attError) {
    console.error("[plans] attendance query error:", attError)
    return {
      plan,
      completedDays: 0,
      progressedDays: 0,
      awaitingHearingSessionNumbers: [],
      failedSessionNumbers: [],
      progressPercent: 0,
      attendanceRecords: [],
      completedRecords: [],
    }
  }

  const completedRecords = (attendanceRecords || []).filter(hasCompletedMemorization)

  const planSessionProgress = buildPlanSessionProgress({
    reports: studentDailyReports || [],
    attendanceRecords: attendanceRecords || [],
    totalDays: plan.total_days,
  })
  const completedDays = planSessionProgress.completedDays
  const completedRecordsBySessionNumber = completedRecords.reduce<Record<string, (typeof completedRecords)[number]>>((acc, record) => {
    const sessionNumber = planSessionProgress.reportSessionNumbersByDate[record.date]
    if (sessionNumber) {
      acc[String(sessionNumber)] = record
    }
    return acc
  }, {})
  const progressPercent =
    plan.total_days > 0
      ? Math.min(Math.round((completedDays / plan.total_days) * 100), 100)
      : 0
  const quranMemorization = calculateQuranMemorizationProgress(plan, completedDays)

  return {
    plan,
    completedDays,
    progressedDays: planSessionProgress.progressedDays,
    awaitingHearingSessionNumbers: planSessionProgress.awaitingHearingSessionNumbers,
    failedSessionNumbers: planSessionProgress.failedSessionNumbers,
    completedSessionNumbers: planSessionProgress.completedSessionNumbers,
    completedRecordsBySessionNumber,
    nextSessionNumber: planSessionProgress.nextSessionNumber,
    reportSessionNumbersByDate: planSessionProgress.reportSessionNumbersByDate,
    progressPercent,
    quranMemorizedPages: quranMemorization.memorizedPages,
    quranProgressPercent: quranMemorization.progressPercent,
    quranLevel: quranMemorization.level,
    attendanceRecords: attendanceRecords || [],
    completedRecords,
  }
}

function buildStudentPlanSummaryFromResolvedData(params: {
  studentData: any
  rawPlan: any | null
  studentDailyReports: Array<{ report_date: string; plan_session_number?: number | null }>
  attendanceRecords: any[]
}) {
  const { studentData, rawPlan, studentDailyReports, attendanceRecords } = params

  const normalizedCompletedJuzs = getNormalizedCompletedJuzs(studentData?.completed_juzs)
  const completedJuzRange = hasScatteredCompletedJuzs(normalizedCompletedJuzs)
    ? null
    : getContiguousCompletedJuzRange(normalizedCompletedJuzs)
  const hasStoredStudentMemorizedRange = Boolean(
    studentData?.memorized_start_surah && studentData?.memorized_end_surah,
  )

  if (!rawPlan) {
    const quranMemorization = calculateQuranMemorizationProgress(
      {
        completed_juzs: studentData?.completed_juzs || [],
        has_previous: hasStoredStudentMemorizedRange || Boolean(completedJuzRange),
        prev_start_surah: hasStoredStudentMemorizedRange
          ? (studentData?.memorized_start_surah ?? null)
          : completedJuzRange?.startSurahNumber ?? null,
        prev_start_verse: hasStoredStudentMemorizedRange
          ? (studentData?.memorized_start_verse ?? null)
          : completedJuzRange?.startVerseNumber ?? null,
        prev_end_surah: hasStoredStudentMemorizedRange
          ? (studentData?.memorized_end_surah ?? null)
          : completedJuzRange?.endSurahNumber ?? null,
        prev_end_verse: hasStoredStudentMemorizedRange
          ? (studentData?.memorized_end_verse ?? null)
          : completedJuzRange?.endVerseNumber ?? null,
      },
      0,
    )

    return {
      plan: null,
      completedDays: 0,
      progressedDays: 0,
      awaitingHearingSessionNumbers: [],
      failedSessionNumbers: [],
      completedSessionNumbers: [],
      completedRecordsBySessionNumber: {},
      nextSessionNumber: 1,
      reportSessionNumbersByDate: {},
      progressPercent: 0,
      quranMemorizedPages: quranMemorization.memorizedPages,
      quranProgressPercent: quranMemorization.progressPercent,
      quranLevel: quranMemorization.level,
      attendanceRecords: [],
      completedRecords: [],
    }
  }

  const hasExplicitCompletedJuzs = normalizedCompletedJuzs.length > 0
  const shouldUsePlanPreviousRange = !hasStoredStudentMemorizedRange && !completedJuzRange && !hasExplicitCompletedJuzs
  const effectivePlan = {
    ...rawPlan,
    completed_juzs: studentData?.completed_juzs || [],
    current_juzs: studentData?.current_juzs || [],
    has_previous: hasStoredStudentMemorizedRange || Boolean(completedJuzRange)
      ? true
      : shouldUsePlanPreviousRange
        ? Boolean(rawPlan.has_previous)
        : false,
    prev_start_surah: hasStoredStudentMemorizedRange
      ? (studentData?.memorized_start_surah ?? null)
      : completedJuzRange
        ? completedJuzRange.startSurahNumber
        : shouldUsePlanPreviousRange
          ? (rawPlan.prev_start_surah ?? null)
          : null,
    prev_start_verse: hasStoredStudentMemorizedRange
      ? (studentData?.memorized_start_verse ?? null)
      : completedJuzRange
        ? completedJuzRange.startVerseNumber
        : shouldUsePlanPreviousRange
          ? (rawPlan.prev_start_verse ?? null)
          : null,
    prev_end_surah: hasStoredStudentMemorizedRange
      ? (studentData?.memorized_end_surah ?? null)
      : completedJuzRange
        ? completedJuzRange.endSurahNumber
        : shouldUsePlanPreviousRange
          ? (rawPlan.prev_end_surah ?? null)
          : null,
    prev_end_verse: hasStoredStudentMemorizedRange
      ? (studentData?.memorized_end_verse ?? null)
      : completedJuzRange
        ? completedJuzRange.endVerseNumber
        : shouldUsePlanPreviousRange
          ? (rawPlan.prev_end_verse ?? null)
          : null,
  }

  const plan = {
    ...effectivePlan,
    total_pages: resolvePlanTotalPages({
      ...effectivePlan,
      completed_juzs: studentData?.completed_juzs || [],
    }),
    total_days: resolvePlanTotalDays({
      ...effectivePlan,
      completed_juzs: studentData?.completed_juzs || [],
    }),
  }

  const filteredReports = plan.start_date
    ? studentDailyReports.filter((report) => report.report_date >= plan.start_date)
    : studentDailyReports
  const filteredAttendanceRecords = plan.start_date
    ? attendanceRecords.filter((record) => record.date >= plan.start_date)
    : attendanceRecords
  const completedRecords = filteredAttendanceRecords.filter(hasCompletedMemorization)
  const planSessionProgress = buildPlanSessionProgress({
    reports: filteredReports,
    attendanceRecords: filteredAttendanceRecords,
    totalDays: plan.total_days,
  })
  const completedDays = planSessionProgress.completedDays
  const completedRecordsBySessionNumber = completedRecords.reduce<Record<string, (typeof completedRecords)[number]>>((acc, record) => {
    const sessionNumber = planSessionProgress.reportSessionNumbersByDate[record.date]
    if (sessionNumber) {
      acc[String(sessionNumber)] = record
    }
    return acc
  }, {})
  const progressPercent = plan.total_days > 0
    ? Math.min(Math.round((completedDays / plan.total_days) * 100), 100)
    : 0
  const quranMemorization = calculateQuranMemorizationProgress(plan, completedDays)

  return {
    plan,
    completedDays,
    progressedDays: planSessionProgress.progressedDays,
    awaitingHearingSessionNumbers: planSessionProgress.awaitingHearingSessionNumbers,
    failedSessionNumbers: planSessionProgress.failedSessionNumbers,
    completedSessionNumbers: planSessionProgress.completedSessionNumbers,
    completedRecordsBySessionNumber,
    nextSessionNumber: planSessionProgress.nextSessionNumber,
    reportSessionNumbersByDate: planSessionProgress.reportSessionNumbersByDate,
    progressPercent,
    quranMemorizedPages: quranMemorization.memorizedPages,
    quranProgressPercent: quranMemorization.progressPercent,
    quranLevel: quranMemorization.level,
    attendanceRecords: filteredAttendanceRecords,
    completedRecords,
  }
}

async function buildStudentPlanSummariesBatch(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  actor: Awaited<ReturnType<typeof getRequestActor>>
  studentIds: string[]
}) {
  const { supabase, actor, studentIds } = params

  if (!actor || studentIds.length === 0) {
    return {}
  }

  const { data: studentRows, error: studentRowsError } = await supabase
    .from("students")
    .select("id, halaqah, completed_juzs, current_juzs, memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse")
    .in("id", studentIds)

  if (studentRowsError) {
    throw studentRowsError
  }

  const accessibleStudents = (studentRows || []).filter((student) => {
    if (isAdminRole(actor.role)) return true
    if (actor.role === "student") return actor.id === student.id
    if (isTeacherRole(actor.role)) {
      return normalizeHalaqahName(student.halaqah) === normalizeHalaqahName(actor.halaqah)
    }
    return false
  })

  const accessibleStudentIds = accessibleStudents.map((student) => student.id)
  if (accessibleStudentIds.length === 0) {
    return {}
  }

  const [{ data: plans, error: plansError }, { data: reports, error: reportsError }, { data: attendanceRecords, error: attendanceError }] = await Promise.all([
    supabase
      .from("student_plans")
      .select("*")
      .in("student_id", accessibleStudentIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("student_daily_reports")
      .select("student_id, report_date, plan_session_number")
      .in("student_id", accessibleStudentIds)
      .order("report_date", { ascending: true }),
    supabase
      .from("attendance_records")
      .select("student_id, id, date, status, evaluations(hafiz_level, tikrar_level, samaa_level, rabet_level)")
      .in("student_id", accessibleStudentIds)
      .order("date", { ascending: true }),
  ])

  if (plansError) throw plansError
  if (reportsError) {
    console.error("[plans] batch reports query error:", reportsError)
  }
  if (attendanceError) {
    console.error("[plans] batch attendance query error:", attendanceError)
  }

  const latestPlanByStudent = new Map<string, any>()
  ;(plans || []).forEach((plan) => {
    if (!latestPlanByStudent.has(plan.student_id)) {
      latestPlanByStudent.set(plan.student_id, plan)
    }
  })

  const reportsByStudent = new Map<string, Array<{ report_date: string; plan_session_number?: number | null }>>()
  ;(reports || []).forEach((report) => {
    const current = reportsByStudent.get(report.student_id) || []
    current.push(report)
    reportsByStudent.set(report.student_id, current)
  })

  const attendanceByStudent = new Map<string, any[]>()
  ;(attendanceRecords || []).forEach((record) => {
    const current = attendanceByStudent.get(record.student_id) || []
    current.push(record)
    attendanceByStudent.set(record.student_id, current)
  })

  return Object.fromEntries(
    accessibleStudents.map((student) => [
      student.id,
      buildStudentPlanSummaryFromResolvedData({
        studentData: student,
        rawPlan: latestPlanByStudent.get(student.id) || null,
        studentDailyReports: reportsByStudent.get(student.id) || [],
        attendanceRecords: attendanceByStudent.get(student.id) || [],
      }),
    ]),
  )
}

// GET - جلب خطط طالب معين أو جلب كل الخطط
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const actor = await getRequestActor(request, supabase)
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("student_id")
    const studentIds = (searchParams.get("student_ids") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
    const planId = searchParams.get("plan_id")

    if (planId) {
      const { data, error } = await supabase
        .from("student_plans")
        .select("*")
        .eq("id", planId)
        .single()
      if (error) throw error
      return NextResponse.json({ plan: data })
    }

    if (studentIds.length > 0) {
      const plansByStudent = await buildStudentPlanSummariesBatch({ supabase, actor, studentIds })

      return NextResponse.json({ plansByStudent })
    }

    if (studentId) {
      const result = await buildStudentPlanSummary({ supabase, actor, studentId })

      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: result.status })
      }

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "معرف الطالب مطلوب" }, { status: 400 })
  } catch (error) {
    console.error("[plans] GET error:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}

// POST - إنشاء خطة جديدة للطالب
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const actor = await getRequestActor(request, supabase)
    const body = await request.json()
    const {
      student_id,
      start_surah_number,
      start_surah_name,
      start_verse,
      end_surah_number,
      end_surah_name,
      end_verse,
      daily_pages, // 0.5 | 1 | 2
      start_date,
      direction,
      total_days: totalDaysOverride,
      has_previous,
      prev_start_surah,
      prev_start_verse,
      prev_end_surah,
      prev_end_verse,
      muraajaa_pages,
      rabt_pages,
      review_distribution_mode,
    } = body

    const canManageStudent = await canAccessStudent({
      supabase,
      actor,
      studentId: student_id,
      allowStudentSelf: false,
      allowTeacher: true,
    })

    if (!actor || !canManageStudent) {
      return NextResponse.json({ error: "غير مصرح لك بإدارة خطة هذا الطالب" }, { status: 403 })
    }

    if (actor.role === "student") {
      return NextResponse.json({ error: "الطالب لا يمكنه إنشاء خطة بنفسه" }, { status: 403 })
    }

    const { data: studentMemorizedData } = await supabase
      .from("students")
      .select("memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse, completed_juzs, current_juzs")
      .eq("id", student_id)
      .maybeSingle()

    const normalizedCompletedJuzs = getNormalizedCompletedJuzs(studentMemorizedData?.completed_juzs)
    const completedJuzRange = hasScatteredCompletedJuzs(normalizedCompletedJuzs)
      ? null
      : getContiguousCompletedJuzRange(normalizedCompletedJuzs)

    const effectiveHasPrevious =
      Boolean(has_previous) ||
      Boolean(
        (studentMemorizedData?.memorized_start_surah && studentMemorizedData?.memorized_end_surah) ||
        completedJuzRange ||
        normalizedCompletedJuzs.length > 0,
      )

    const effectivePrevStartSurah = prev_start_surah || studentMemorizedData?.memorized_start_surah || completedJuzRange?.startSurahNumber || null
    const effectivePrevStartVerse = prev_start_verse || studentMemorizedData?.memorized_start_verse || completedJuzRange?.startVerseNumber || null
    const effectivePrevEndSurah = prev_end_surah || studentMemorizedData?.memorized_end_surah || completedJuzRange?.endSurahNumber || null
    const effectivePrevEndVerse = prev_end_verse || studentMemorizedData?.memorized_end_verse || completedJuzRange?.endVerseNumber || null

    if (!student_id || !start_surah_number || !end_surah_number || !daily_pages) {
      return NextResponse.json({ error: "البيانات المطلوبة ناقصة" }, { status: 400 })
    }

    const normalizedDirection = direction || (Number(start_surah_number) > Number(end_surah_number) ? "desc" : "asc")
    let adjustedStartSurahNumber = Number(start_surah_number)
    let adjustedStartVerse = Number(start_verse) || 1
    let adjustedPlanMessage: string | null = null

    const startSurahData = SURAHS.find((surah) => surah.number === adjustedStartSurahNumber)
    const endSurahData = SURAHS.find((surah) => surah.number === Number(end_surah_number))

    if (!startSurahData || !endSurahData) {
      return NextResponse.json({ error: "تعذر تحديد السور المطلوبة" }, { status: 400 })
    }

    const selectedStartPage = getPageFloatForAyah(adjustedStartSurahNumber, adjustedStartVerse)
    const selectedEndAyah = Number(end_verse) || endSurahData.verseCount
    const nextSelectedEndAyah = getNextAyahReference(Number(end_surah_number), selectedEndAyah)
    const selectedEndPage = nextSelectedEndAyah
      ? getPageFloatForAyah(nextSelectedEndAyah.surah, nextSelectedEndAyah.ayah)
      : 605
    const selectedJuzs = getJuzNumbersForPageRange(selectedStartPage, selectedEndPage, normalizedDirection)
    const completedJuzSet = new Set<number>((studentMemorizedData?.completed_juzs || []).filter((juzNumber: number) => Number.isInteger(juzNumber)))
    const overlappingJuzs = selectedJuzs.filter((juzNumber) => completedJuzSet.has(juzNumber))

    if (overlappingJuzs.length > 0) {
      const leadingCompletedJuzs: number[] = []

      for (const juzNumber of selectedJuzs) {
        if (!completedJuzSet.has(juzNumber)) {
          break
        }

        leadingCompletedJuzs.push(juzNumber)
      }

      if (leadingCompletedJuzs.length === selectedJuzs.length) {
        return NextResponse.json({ error: "النطاق المختار محفوظ بالكامل ضمن الأجزاء الناجحة للطالب" }, { status: 400 })
      }

      if (leadingCompletedJuzs.length > 0) {
        const nextJuzNumber = selectedJuzs[leadingCompletedJuzs.length]
        const nextJuzBounds = getJuzBounds(nextJuzNumber)

        if (!nextJuzBounds) {
          return NextResponse.json({ error: "تعذر تحديد بداية النطاق بعد تجاوز الأجزاء الناجحة" }, { status: 400 })
        }

        if (normalizedDirection === "desc") {
          adjustedStartSurahNumber = nextJuzBounds.endSurahNumber
          adjustedStartVerse = nextJuzBounds.endVerseNumber
        } else {
          adjustedStartSurahNumber = nextJuzBounds.startSurahNumber
          adjustedStartVerse = nextJuzBounds.startVerseNumber
        }

        adjustedPlanMessage = `تم تجاوز الأجزاء الناجحة في بداية النطاق تلقائيًا: ${leadingCompletedJuzs.join("، ")}`
      }
    }

    if (effectiveHasPrevious && !hasScatteredCompletedJuzs(normalizedCompletedJuzs)) {
      const expectedNextStart = getExpectedNextStart(effectivePrevStartSurah, effectivePrevEndSurah, effectivePrevEndVerse)
      if (!expectedNextStart) {
        return NextResponse.json({ error: "بيانات الحفظ السابق غير مكتملة" }, { status: 400 })
      }

      const normalizedStartVerse = adjustedStartVerse
      const previousEndSurahData = SURAHS.find((surah) => surah.number === Number(effectivePrevEndSurah))
      const normalizedEndVerse = Number(end_verse) || endSurahData.verseCount
      const normalizedPrevStartVerse = Number(effectivePrevStartVerse) || 1
      const normalizedPrevEndVerse = Number(effectivePrevEndVerse) || previousEndSurahData?.verseCount || 1
      const previousDirection = Number(effectivePrevStartSurah) > Number(effectivePrevEndSurah) ? "desc" : "asc"
      const isMiddlePreviousSkip = previousDirection === "asc" &&
        compareAyahRefs(adjustedStartSurahNumber, normalizedStartVerse, Number(effectivePrevStartSurah), normalizedPrevStartVerse) < 0 &&
        compareAyahRefs(Number(end_surah_number), normalizedEndVerse, Number(effectivePrevEndSurah), normalizedPrevEndVerse) > 0

      if (
        !isMiddlePreviousSkip &&
        !isStartAllowedAfterPrevious(
          adjustedStartSurahNumber,
          normalizedStartVerse,
          expectedNextStart.surahNumber,
          expectedNextStart.verseNumber,
          previousDirection,
        )
      ) {
        const expectedSurah = SURAHS.find((surah) => surah.number === expectedNextStart.surahNumber)
        return NextResponse.json(
          {
            error: `يجب أن يكون بداية المحفوظ عند آخر آية تم حفظها: ${expectedSurah?.name || "السورة"} آية ${expectedNextStart.verseNumber}، أو إعادة حفظ الطالب من جديد`,
          },
          { status: 400 },
        )
      }
    }

    const totalPages = resolvePlanTotalPages({
      start_surah_number: adjustedStartSurahNumber,
      start_verse: adjustedStartVerse,
      end_surah_number,
      end_verse,
      direction: normalizedDirection,
      has_previous: effectiveHasPrevious,
      prev_start_surah: effectivePrevStartSurah,
      prev_start_verse: effectivePrevStartVerse,
      prev_end_surah: effectivePrevEndSurah,
      prev_end_verse: effectivePrevEndVerse,
      completed_juzs: normalizedCompletedJuzs,
    })
    const totalPagesForStorage = Math.max(1, Math.ceil(totalPages))
    const totalDays =
      totalDaysOverride && Number(totalDaysOverride) > 0
        ? Number(totalDaysOverride)
        : resolvePlanTotalDays({
            start_surah_number: adjustedStartSurahNumber,
            start_verse: adjustedStartVerse,
            end_surah_number,
            end_verse,
            total_pages: totalPages,
            daily_pages,
            direction: normalizedDirection,
            has_previous: effectiveHasPrevious,
            prev_start_surah: effectivePrevStartSurah,
            prev_start_verse: effectivePrevStartVerse,
            prev_end_surah: effectivePrevEndSurah,
            prev_end_verse: effectivePrevEndVerse,
            completed_juzs: normalizedCompletedJuzs,
          })

    const normalizedReviewDistributionMode = review_distribution_mode === "weekly" ? "weekly" : "fixed"
    const fixedReviewPages = Number(muraajaa_pages) || 0
    const weeklyReviewPages = normalizedReviewDistributionMode === "weekly"
      ? calculatePreviousMemorizedPages({
          has_previous: effectiveHasPrevious,
          prev_start_surah: effectivePrevStartSurah,
          prev_start_verse: effectivePrevStartVerse,
          prev_end_surah: effectivePrevEndSurah,
          prev_end_verse: effectivePrevEndVerse,
        }) / 7
      : 0
    const muraajaaPagesForStorage = normalizedReviewDistributionMode === "weekly"
      ? (weeklyReviewPages > 0 ? weeklyReviewPages : null)
      : (fixedReviewPages > 0 ? fixedReviewPages : null)

    const { data: existingPlans, error: existingPlansError } = await supabase
      .from("student_plans")
      .select("id")
      .eq("student_id", student_id)

    if (existingPlansError) {
      throw existingPlansError
    }

    const { data, error } = await supabase
      .from("student_plans")
      .insert([{
        student_id,
        start_surah_number: adjustedStartSurahNumber,
        start_surah_name: SURAHS.find((surah) => surah.number === adjustedStartSurahNumber)?.name || start_surah_name,
        start_verse: adjustedStartVerse || null,
        end_surah_number,
        end_surah_name,
        end_verse: end_verse || null,
        daily_pages,
        total_pages: totalPagesForStorage,
        total_days: totalDays,
        start_date: start_date || getSaudiDateString(),
        direction: normalizedDirection,
        has_previous: effectiveHasPrevious,
        prev_start_surah: effectivePrevStartSurah,
        prev_start_verse: effectivePrevStartVerse,
        prev_end_surah: effectivePrevEndSurah,
        prev_end_verse: effectivePrevEndVerse,
        muraajaa_pages: muraajaaPagesForStorage,
        rabt_pages: rabt_pages || null,
        review_distribution_mode: normalizedReviewDistributionMode,
      }])
      .select()
      .single()

    if (error) throw error

    const oldPlanIds = (existingPlans || []).map((plan) => plan.id).filter(Boolean)
    if (oldPlanIds.length > 0) {
      const { error: cleanupError } = await supabase
        .from("student_plans")
        .delete()
        .in("id", oldPlanIds)

      if (cleanupError) {
        console.error("[plans] cleanup old plans error:", cleanupError)
      }
    }

    return NextResponse.json({
      success: true,
      plan: {
        ...data,
        completed_juzs: normalizedCompletedJuzs,
        current_juzs: studentMemorizedData?.current_juzs || [],
      },
      message: adjustedPlanMessage,
    }, { status: 201 })
  } catch (error) {
    console.error("[plans] POST error:", error)
    return NextResponse.json({ error: "حدث خطأ في حفظ الخطة" }, { status: 500 })
  }
}

// DELETE - حذف خطة
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const actor = await getRequestActor(request, supabase)
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get("plan_id")
    const studentId = searchParams.get("student_id")

    if (studentId) {
      const canManageStudent = await canAccessStudent({
        supabase,
        actor,
        studentId,
        allowStudentSelf: false,
        allowTeacher: true,
      })

      if (!actor || !canManageStudent || actor.role === "student") {
        return NextResponse.json({ error: "غير مصرح لك بحذف خطة هذا الطالب" }, { status: 403 })
      }
    }

    if (planId) {
      if (!actor) {
        return NextResponse.json({ error: "غير مصرح لك بحذف هذه الخطة" }, { status: 403 })
      }

      const { data: planOwner } = await supabase.from("student_plans").select("student_id").eq("id", planId).maybeSingle()
      if (!planOwner?.student_id) {
        return NextResponse.json({ error: "الخطة غير موجودة" }, { status: 404 })
      }

      const canManagePlanOwner = await canAccessStudent({
        supabase,
        actor,
        studentId: planOwner.student_id,
        allowStudentSelf: false,
        allowTeacher: true,
      })

      if (!canManagePlanOwner || actor.role === "student") {
        return NextResponse.json({ error: "غير مصرح لك بحذف هذه الخطة" }, { status: 403 })
      }

      const { error } = await supabase.from("student_plans").delete().eq("id", planId)
      if (error) throw error
    } else if (studentId) {
      const { error } = await supabase.from("student_plans").delete().eq("student_id", studentId)
      if (error) throw error
    } else {
      return NextResponse.json({ error: "معرف مطلوب" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[plans] DELETE error:", error)
    return NextResponse.json({ error: "حدث خطأ في حذف الخطة" }, { status: 500 })
  }
}
