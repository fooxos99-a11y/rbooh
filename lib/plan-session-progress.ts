import { isPassingMemorizationLevel } from "@/lib/student-attendance"

type SessionNumberCarrier = {
  report_date: string
  plan_session_number?: number | null
}

type AttendanceLike = {
  date?: string | null
  status?: string | null
  evaluations?: { hafiz_level?: string | null } | Array<{ hafiz_level?: string | null }> | null
}

export function isMemorizationOffDay(reportDate: string) {
  return new Date(`${reportDate}T12:00:00+03:00`).getUTCDay() === 6
}

function normalizeSessionNumber(value?: number | null) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.floor(parsed)
}

function getLatestHafizLevel(record: AttendanceLike) {
  const evaluations = Array.isArray(record.evaluations)
    ? record.evaluations
    : record.evaluations
      ? [record.evaluations]
      : []

  return evaluations.length > 0 ? evaluations[evaluations.length - 1]?.hafiz_level ?? null : null
}

function hasPassingMemorization(record: AttendanceLike) {
  if (!record.date) {
    return false
  }

  return isPassingMemorizationLevel(getLatestHafizLevel(record) ?? null)
}

function hasFailedMemorization(record: AttendanceLike) {
  if (!record.date) {
    return false
  }

  const latestHafizLevel = getLatestHafizLevel(record)

  if (latestHafizLevel === null || latestHafizLevel === undefined) {
    return false
  }

  return !isPassingMemorizationLevel(latestHafizLevel)
}

function sortReportsAscending<T extends SessionNumberCarrier>(reports: T[]) {
  return [...reports].sort((left, right) => left.report_date.localeCompare(right.report_date))
}

export function deriveReportSessionNumbersByDate<T extends SessionNumberCarrier>(reports: T[]) {
  const sortedReports = sortReportsAscending(reports)
  const reportSessionNumbersByDate: Record<string, number> = {}
  const usedAssignedNumbers = new Set<number>()
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

function getFirstMissingAssignedSessionNumber(assignedSessionNumbers: Set<number>) {
  const maxAssignedSessionNumber = assignedSessionNumbers.size > 0 ? Math.max(...assignedSessionNumbers) : 0
  const upperBound = Math.max(1, maxAssignedSessionNumber + 1)

  for (let sessionNumber = 1; sessionNumber <= upperBound; sessionNumber += 1) {
    if (!assignedSessionNumbers.has(sessionNumber)) {
      return sessionNumber
    }
  }

  return upperBound + 1
}

export function buildPlanSessionProgress<TReport extends SessionNumberCarrier, TAttendance extends AttendanceLike>(params: {
  reports?: TReport[] | null
  attendanceRecords?: TAttendance[] | null
  totalDays?: number | null
}) {
  const reports = sortReportsAscending(params.reports || [])
  const attendanceRecords = [...(params.attendanceRecords || [])].sort((left, right) => `${left.date || ""}`.localeCompare(`${right.date || ""}`))
  const totalDays = Number.isFinite(Number(params.totalDays)) && Number(params.totalDays) > 0 ? Math.floor(Number(params.totalDays)) : 0

  if (reports.length === 0) {
    const successfulRecords = attendanceRecords.filter(hasPassingMemorization)
    const completedDays = successfulRecords.length
    const completedSessionNumbers = Array.from({ length: completedDays }, (_, index) => index + 1)
    const nextSessionNumber = totalDays > 0 ? Math.min(completedDays + 1, totalDays) : completedDays + 1

    return {
      completedDays,
      progressedDays: completedDays,
      awaitingHearingSessionNumbers: [] as number[],
      failedSessionNumbers: [] as number[],
      completedSessionNumbers,
      nextSessionNumber,
      reportSessionNumbersByDate: {} as Record<string, number>,
      savedReportDates: attendanceRecords.map((record) => record.date).filter((value): value is string => Boolean(value)),
    }
  }

  const reportSessionNumbersByDate = deriveReportSessionNumbersByDate(reports)
  const savedReportDates = Array.from(new Set(attendanceRecords.map((record) => record.date).filter((value): value is string => Boolean(value))))
  const assignedSessionNumbers = new Set(
    Object.values(reportSessionNumbersByDate)
    .map((value) => normalizeSessionNumber(value))
    .filter((value): value is number => value !== null),
  )
  const latestReportDateBySession = new Map<number, string>()

  reports.forEach((report) => {
    const normalizedSessionNumber = normalizeSessionNumber(reportSessionNumbersByDate[report.report_date])
    if (!normalizedSessionNumber) {
      return
    }

    const currentLatestReportDate = latestReportDateBySession.get(normalizedSessionNumber)
    if (!currentLatestReportDate || report.report_date > currentLatestReportDate) {
      latestReportDateBySession.set(normalizedSessionNumber, report.report_date)
    }
  })

  const latestAttendanceStateBySession = new Map<number, { date: string; status: "passed" | "failed" }>()

  attendanceRecords.forEach((record) => {
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

  const successfulSessionNumbers = new Set<number>()
  const failedSessionNumberSet = new Set<number>()
  const awaitingHearingSessionNumberSet = new Set<number>()

  assignedSessionNumbers.forEach((sessionNumber) => {
    const latestReportDate = latestReportDateBySession.get(sessionNumber)
    const latestAttendanceState = latestAttendanceStateBySession.get(sessionNumber)

    if (!latestAttendanceState || (latestReportDate && latestReportDate > latestAttendanceState.date)) {
      awaitingHearingSessionNumberSet.add(sessionNumber)
      return
    }

    if (latestAttendanceState.status === "passed") {
      successfulSessionNumbers.add(sessionNumber)
      return
    }

    failedSessionNumberSet.add(sessionNumber)
  })

  const completedSessionNumbers = [...successfulSessionNumbers].sort((left, right) => left - right)
  const failedSessionNumbers = [...failedSessionNumberSet].sort((left, right) => left - right)
  const progressedDays = assignedSessionNumbers.size
  const awaitingHearingSessionNumbers = [...awaitingHearingSessionNumberSet].sort((left, right) => left - right)
  const rawNextSessionNumber = failedSessionNumbers[0] || getFirstMissingAssignedSessionNumber(assignedSessionNumbers)
  const nextSessionNumber = totalDays > 0 ? Math.min(rawNextSessionNumber, totalDays) : rawNextSessionNumber

  return {
    completedDays: completedSessionNumbers.length,
    progressedDays,
    awaitingHearingSessionNumbers,
    failedSessionNumbers,
    completedSessionNumbers,
    nextSessionNumber,
    reportSessionNumbersByDate,
    savedReportDates,
  }
}