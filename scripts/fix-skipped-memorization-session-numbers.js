const fs = require("fs")
const path = require("path")
const dotenv = require("dotenv")
const { createClient } = require("@supabase/supabase-js")

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_RBOH_SUPABASE_URL
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.RBOH_SUPABASE_SERVICE_ROLE_KEY

if (typeof serviceRoleKey === "string" && serviceRoleKey.startsWith("service_role-")) {
  serviceRoleKey = serviceRoleKey.slice("service_role-".length)
}

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase credentials are missing from .env.local")
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const PAGE_SIZE = 1000
const APPLY_CHANGES = process.argv.includes("--apply")
const OUTPUT_PATH = path.join(process.cwd(), "scripts", "fix-skipped-memorization-session-numbers.last-run.json")

function isMemorizationOffDay(reportDate) {
  return new Date(`${reportDate}T12:00:00+03:00`).getUTCDay() === 6
}

function normalizeSessionNumber(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.floor(parsed)
}

function calculateEvaluationLevelPoints(level) {
  if (typeof level === "string" && /^(10|[0-9])$/.test(level)) {
    return Number.parseInt(level, 10)
  }

  switch (level) {
    case "excellent":
      return 10
    case "very_good":
      return 8
    case "good":
      return 6
    case "not_completed":
      return 0
    default:
      return 0
  }
}

function isPassingMemorizationLevel(level) {
  return calculateEvaluationLevelPoints(level) > 0
}

function getLatestHafizLevel(record) {
  const evaluations = Array.isArray(record.evaluations)
    ? record.evaluations
    : record.evaluations
      ? [record.evaluations]
      : []

  return evaluations.length > 0 ? evaluations[evaluations.length - 1]?.hafiz_level ?? null : null
}

function hasPassingMemorization(record) {
  if (!record.date) return false
  return isPassingMemorizationLevel(getLatestHafizLevel(record) ?? null)
}

function hasFailedMemorization(record) {
  if (!record.date) return false

  const latestHafizLevel = getLatestHafizLevel(record)
  if (latestHafizLevel === null || latestHafizLevel === undefined) return false

  return !isPassingMemorizationLevel(latestHafizLevel)
}

function sortReportsAscending(reports) {
  return [...reports].sort((left, right) => left.report_date.localeCompare(right.report_date))
}

function deriveReportSessionNumbersByDate(reports) {
  const sortedReports = sortReportsAscending(reports)
  const reportSessionNumbersByDate = {}
  const usedAssignedNumbers = new Set()
  let nextFallbackNumber = 1

  sortedReports.forEach((report) => {
    if (isMemorizationOffDay(report.report_date)) {
      return
    }

    const explicitSessionNumber = normalizeSessionNumber(report.plan_session_number)

    if (explicitSessionNumber) {
      reportSessionNumbersByDate[report.report_date] = explicitSessionNumber
      usedAssignedNumbers.add(explicitSessionNumber)
      return
    }

    while (usedAssignedNumbers.has(nextFallbackNumber)) {
      nextFallbackNumber += 1
    }

    reportSessionNumbersByDate[report.report_date] = nextFallbackNumber
    usedAssignedNumbers.add(nextFallbackNumber)
    nextFallbackNumber += 1
  })

  return reportSessionNumbersByDate
}

function getFirstMissingAssignedSessionNumber(assignedSessionNumbers) {
  const assignedNumbers = [...assignedSessionNumbers]
  const maxAssignedSessionNumber = assignedNumbers.length > 0 ? Math.max(...assignedNumbers) : 0
  const upperBound = Math.max(1, maxAssignedSessionNumber + 1)

  for (let sessionNumber = 1; sessionNumber <= upperBound; sessionNumber += 1) {
    if (!assignedSessionNumbers.has(sessionNumber)) {
      return sessionNumber
    }
  }

  return upperBound + 1
}

function buildPlanSessionProgress({ reports, attendanceRecords, totalDays }) {
  const sortedReports = sortReportsAscending(reports || [])
  const sortedAttendanceRecords = [...(attendanceRecords || [])].sort((left, right) => `${left.date || ""}`.localeCompare(`${right.date || ""}`))
  const normalizedTotalDays = Number.isFinite(Number(totalDays)) && Number(totalDays) > 0 ? Math.floor(Number(totalDays)) : 0

  if (sortedReports.length === 0) {
    const successfulRecords = sortedAttendanceRecords.filter(hasPassingMemorization)
    const completedDays = successfulRecords.length
    const nextSessionNumber = normalizedTotalDays > 0 ? Math.min(completedDays + 1, normalizedTotalDays) : completedDays + 1

    return {
      nextSessionNumber,
      reportSessionNumbersByDate: {},
    }
  }

  const reportSessionNumbersByDate = deriveReportSessionNumbersByDate(sortedReports)
  const assignedSessionNumbers = new Set(
    Object.values(reportSessionNumbersByDate)
      .map((value) => normalizeSessionNumber(value))
      .filter((value) => value !== null),
  )
  const latestReportStateBySession = new Map()

  sortedReports.forEach((report) => {
    const normalizedSessionNumber = normalizeSessionNumber(reportSessionNumbersByDate[report.report_date])
    if (!normalizedSessionNumber) {
      return
    }

    const currentLatestReportState = latestReportStateBySession.get(normalizedSessionNumber)
    if (!currentLatestReportState || report.report_date > currentLatestReportState.date) {
      latestReportStateBySession.set(normalizedSessionNumber, {
        date: report.report_date,
        memorizationDone: typeof report.memorization_done === "boolean" ? report.memorization_done : null,
      })
    }
  })

  const latestAttendanceStateBySession = new Map()

  sortedAttendanceRecords.forEach((record) => {
    if (!record.date) {
      return
    }

    const normalizedSessionNumber = normalizeSessionNumber(reportSessionNumbersByDate[record.date])
    if (!normalizedSessionNumber) {
      return
    }

    const status = hasPassingMemorization(record)
      ? "passed"
      : hasFailedMemorization(record)
        ? "failed"
        : null

    if (!status) {
      return
    }

    const currentLatestAttendance = latestAttendanceStateBySession.get(normalizedSessionNumber)
    if (!currentLatestAttendance || record.date > currentLatestAttendance.date) {
      latestAttendanceStateBySession.set(normalizedSessionNumber, { date: record.date, status })
    }
  })

  const failedSessionNumberSet = new Set()
  const pendingExecutionSessionNumberSet = new Set()

  assignedSessionNumbers.forEach((sessionNumber) => {
    const latestReportState = latestReportStateBySession.get(sessionNumber)
    const latestAttendanceState = latestAttendanceStateBySession.get(sessionNumber)

    if (!latestAttendanceState || (latestReportState && latestReportState.date > latestAttendanceState.date)) {
      if (latestReportState?.memorizationDone === false) {
        pendingExecutionSessionNumberSet.add(sessionNumber)
        return
      }

      return
    }

    if (latestAttendanceState.status === "failed") {
      failedSessionNumberSet.add(sessionNumber)
    }
  })

  const blockedSessionNumbers = [...pendingExecutionSessionNumberSet, ...failedSessionNumberSet].sort((left, right) => left - right)
  const rawNextSessionNumber = blockedSessionNumbers[0] || getFirstMissingAssignedSessionNumber(assignedSessionNumbers)
  const nextSessionNumber = normalizedTotalDays > 0 ? Math.min(rawNextSessionNumber, normalizedTotalDays) : rawNextSessionNumber

  return {
    nextSessionNumber,
    reportSessionNumbersByDate,
  }
}

function countSuccessfulAttendance(attendanceRecords) {
  return (attendanceRecords || []).filter(hasPassingMemorization).length
}

function capSessionNumber(value, totalDays) {
  if (!value) {
    return null
  }

  const normalizedTotalDays = Number.isFinite(Number(totalDays)) && Number(totalDays) > 0 ? Math.floor(Number(totalDays)) : 0
  return normalizedTotalDays > 0 ? Math.min(value, normalizedTotalDays) : value
}

function resolveNextSessionNumberForReassignment({ assignedReports, priorAttendanceRecords, totalDays }) {
  const baselineNextSessionNumber = countSuccessfulAttendance(priorAttendanceRecords) + 1

  if (!assignedReports.length) {
    return capSessionNumber(baselineNextSessionNumber, totalDays)
  }

  const reportSessionNumbersByDate = deriveReportSessionNumbersByDate(assignedReports)
  const assignedSessionNumbers = Array.from(
    new Set(
      Object.values(reportSessionNumbersByDate)
        .map((value) => normalizeSessionNumber(value))
        .filter((value) => value !== null),
    ),
  ).sort((left, right) => left - right)
  const latestReportStateBySession = new Map()

  assignedReports.forEach((report) => {
    const sessionNumber = normalizeSessionNumber(reportSessionNumbersByDate[report.report_date])
    if (!sessionNumber) {
      return
    }

    const currentLatestReportState = latestReportStateBySession.get(sessionNumber)
    if (!currentLatestReportState || report.report_date > currentLatestReportState.date) {
      latestReportStateBySession.set(sessionNumber, {
        date: report.report_date,
        memorizationDone: typeof report.memorization_done === "boolean" ? report.memorization_done : null,
      })
    }
  })

  const latestAttendanceStateBySession = new Map()

  ;(priorAttendanceRecords || []).forEach((record) => {
    if (!record.date) {
      return
    }

    const sessionNumber = normalizeSessionNumber(reportSessionNumbersByDate[record.date])
    if (!sessionNumber) {
      return
    }

    const status = hasPassingMemorization(record)
      ? "passed"
      : hasFailedMemorization(record)
        ? "failed"
        : null

    if (!status) {
      return
    }

    const currentLatestAttendance = latestAttendanceStateBySession.get(sessionNumber)
    if (!currentLatestAttendance || record.date > currentLatestAttendance.date) {
      latestAttendanceStateBySession.set(sessionNumber, { date: record.date, status })
    }
  })

  const blockedSessionNumbers = assignedSessionNumbers.filter((sessionNumber) => {
    const latestReportState = latestReportStateBySession.get(sessionNumber)
    const latestAttendanceState = latestAttendanceStateBySession.get(sessionNumber)

    if (!latestAttendanceState || (latestReportState && latestReportState.date > latestAttendanceState.date)) {
      return latestReportState?.memorizationDone === false
    }

    return latestAttendanceState.status === "failed"
  })

  if (blockedSessionNumbers.length > 0) {
    return capSessionNumber(blockedSessionNumbers[0], totalDays)
  }

  const highestAssignedSessionNumber = assignedSessionNumbers.length > 0 ? assignedSessionNumbers[assignedSessionNumbers.length - 1] : 0
  return capSessionNumber(Math.max(baselineNextSessionNumber, highestAssignedSessionNumber + 1), totalDays)
}

async function fetchAllPages(queryFactory) {
  const rows = []
  let from = 0

  while (true) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await queryFactory(from, to)

    if (error) {
      throw error
    }

    const batch = data || []
    rows.push(...batch)

    if (batch.length < PAGE_SIZE) {
      break
    }

    from += PAGE_SIZE
  }

  return rows
}

async function fetchLatestPlans() {
  const plans = await fetchAllPages((from, to) =>
    supabase
      .from("student_plans")
      .select("id, student_id, start_date, total_days, created_at")
      .order("created_at", { ascending: false })
      .range(from, to),
  )

  const latestPlansByStudent = new Map()

  for (const plan of plans) {
    if (!latestPlansByStudent.has(plan.student_id)) {
      latestPlansByStudent.set(plan.student_id, plan)
    }
  }

  return [...latestPlansByStudent.values()]
}

async function fetchStudentNames(studentIds) {
  const namesById = new Map()

  for (let index = 0; index < studentIds.length; index += 200) {
    const chunk = studentIds.slice(index, index + 200)
    const { data, error } = await supabase
      .from("students")
      .select("id, name, account_number")
      .in("id", chunk)

    if (error) {
      throw error
    }

    for (const student of data || []) {
      namesById.set(student.id, {
        name: student.name,
        accountNumber: student.account_number,
      })
    }
  }

  return namesById
}

function reassignPlanSessionNumbers({ reports, attendanceRecords, totalDays }) {
  const sortedReports = sortReportsAscending(reports)
  const reassignedReports = []

  for (const report of sortedReports) {
    if (isMemorizationOffDay(report.report_date)) {
      reassignedReports.push({ ...report, plan_session_number: null })
      continue
    }

    const priorAttendanceRecords = attendanceRecords.filter((attendanceRecord) => attendanceRecord.date < report.report_date)

    reassignedReports.push({
      ...report,
      plan_session_number: resolveNextSessionNumberForReassignment({
        assignedReports: reassignedReports,
        priorAttendanceRecords,
        totalDays,
      }),
    })
  }

  return reassignedReports
}

async function loadStudentContext(plan) {
  let reportsQuery = supabase
    .from("student_daily_reports")
    .select("id, student_id, report_date, plan_session_number, memorization_done")
    .eq("student_id", plan.student_id)
    .order("report_date", { ascending: true })

  let attendanceQuery = supabase
    .from("attendance_records")
    .select("date, evaluations(hafiz_level)")
    .eq("student_id", plan.student_id)
    .order("date", { ascending: true })

  if (plan.start_date) {
    reportsQuery = reportsQuery.gte("report_date", plan.start_date)
    attendanceQuery = attendanceQuery.gte("date", plan.start_date)
  }

  const [{ data: reports, error: reportsError }, { data: attendanceRecords, error: attendanceError }] = await Promise.all([
    reportsQuery,
    attendanceQuery,
  ])

  if (reportsError) throw reportsError
  if (attendanceError) throw attendanceError

  return {
    reports: reports || [],
    attendanceRecords: attendanceRecords || [],
  }
}

async function applyStudentFix(changes) {
  for (const change of changes) {
    const { error } = await supabase
      .from("student_daily_reports")
      .update({ plan_session_number: change.nextPlanSessionNumber, updated_at: new Date().toISOString() })
      .eq("id", change.reportId)

    if (error) {
      throw error
    }
  }
}

async function main() {
  const latestPlans = await fetchLatestPlans()
  const studentNamesById = await fetchStudentNames(latestPlans.map((plan) => plan.student_id))
  const affectedStudents = []

  for (const [index, plan] of latestPlans.entries()) {
    const { reports, attendanceRecords } = await loadStudentContext(plan)
    if (reports.length === 0) {
      continue
    }

    const reassignedReports = reassignPlanSessionNumbers({
      reports,
      attendanceRecords,
      totalDays: plan.total_days,
    })

    const reportChanges = reassignedReports.reduce((changes, report, reportIndex) => {
      const originalReport = reports[reportIndex]
      if (normalizeSessionNumber(report.plan_session_number) === normalizeSessionNumber(originalReport?.plan_session_number)) {
        return changes
      }

      changes.push({
        reportId: report.id,
        reportDate: report.report_date,
        memorizationDone: report.memorization_done,
        previousPlanSessionNumber: originalReport?.plan_session_number ?? null,
        nextPlanSessionNumber: report.plan_session_number ?? null,
      })

      return changes
    }, [])

    if (reportChanges.length > 0) {
      const studentMeta = studentNamesById.get(plan.student_id) || {}
      affectedStudents.push({
        studentId: plan.student_id,
        studentName: studentMeta.name || null,
        accountNumber: studentMeta.accountNumber || null,
        planId: plan.id,
        planStartDate: plan.start_date || null,
        changedReportsCount: reportChanges.length,
        reportChanges,
      })
    }

    if ((index + 1) % 25 === 0) {
      console.log(`Processed ${index + 1} / ${latestPlans.length} current plans...`)
    }
  }

  const totalChangedReports = affectedStudents.reduce((sum, student) => sum + student.changedReportsCount, 0)
  const payload = {
    generatedAt: new Date().toISOString(),
    applyMode: APPLY_CHANGES,
    affectedStudentsCount: affectedStudents.length,
    affectedReportsCount: totalChangedReports,
    affectedStudents,
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2))

  console.log(`Affected students: ${affectedStudents.length}`)
  console.log(`Affected reports: ${totalChangedReports}`)

  if (affectedStudents.length > 0) {
    console.log("Sample affected students:")
    affectedStudents.slice(0, 10).forEach((student) => {
      console.log(`- ${student.studentName || "(بدون اسم)"} | account=${student.accountNumber || "-"} | changedReports=${student.changedReportsCount}`)
    })
  }

  if (!APPLY_CHANGES) {
    console.log(`Dry run complete. Detailed output saved to ${OUTPUT_PATH}`)
    return
  }

  for (const student of affectedStudents) {
    await applyStudentFix(student.reportChanges)
  }

  console.log("Applied all report fixes successfully.")
  console.log(`Detailed output saved to ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error("Failed to process skipped memorization session numbers.")
  console.error(error)
  process.exitCode = 1
})