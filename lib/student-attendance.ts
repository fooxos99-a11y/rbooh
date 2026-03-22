export const ATTENDANCE_STATUS_LABELS = {
  present: "حاضر",
  late: "متأخر",
  absent: "غائب",
  excused: "مستأذن",
} as const

export type AttendanceStatus = keyof typeof ATTENDANCE_STATUS_LABELS

export type NumericEvaluationLevel = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10"

export type LegacyEvaluationLevelValue = "excellent" | "very_good" | "good" | "not_completed"

export type EvaluationLevelValue = NumericEvaluationLevel | LegacyEvaluationLevelValue | null | undefined

export const LATE_ATTENDANCE_PENALTY = 2

export const PRIMARY_MEMORIZATION_EVALUATION_OPTIONS = [
  { level: "10" as NumericEvaluationLevel, label: "متقن" },
  { level: "9" as NumericEvaluationLevel, label: "تنبيه واحد" },
  { level: "8" as NumericEvaluationLevel, label: "تنبيهان" },
  { level: "0" as NumericEvaluationLevel, label: "راسب" },
] as const

export const RETRY_MEMORIZATION_EVALUATION_OPTIONS = [
  { level: "6" as NumericEvaluationLevel, label: "متقن" },
  { level: "5" as NumericEvaluationLevel, label: "تنبيه واحد" },
  { level: "4" as NumericEvaluationLevel, label: "تنبيهان" },
  { level: "0" as NumericEvaluationLevel, label: "راسب" },
] as const

export function getMemorizationEvaluationOptions(isRetry: boolean) {
  return isRetry ? RETRY_MEMORIZATION_EVALUATION_OPTIONS : PRIMARY_MEMORIZATION_EVALUATION_OPTIONS
}

export function translateAttendanceStatus(status: string | null | undefined) {
  if (!status) return null
  return ATTENDANCE_STATUS_LABELS[status as AttendanceStatus] ?? status
}

export function isEvaluatedAttendance(status: string | null | undefined) {
  return status === "present" || status === "late"
}

export function isNonEvaluatedAttendance(status: string | null | undefined) {
  return status === "absent" || status === "excused"
}

export function calculateEvaluationLevelPoints(level: EvaluationLevelValue): number {
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

export function isPassingMemorizationLevel(level: EvaluationLevelValue) {
  return calculateEvaluationLevelPoints(level) > 0
}

export function getMemorizationEvaluationTextLabel(level: string | null | undefined) {
  if (!level || level === "null") return null

  switch (level) {
    case "10":
    case "6":
      return "متقن"
    case "9":
    case "5":
      return "تنبيه واحد"
    case "8":
    case "4":
      return "تنبيهان"
    case "0":
      return "راسب"
    case "excellent":
      return "متقن"
    case "very_good":
      return "تنبيهان"
    case "good":
      return "متقن"
    case "not_completed":
      return "راسب"
    default:
      return /^(10|[0-9])$/.test(level) ? level : level
  }
}

export function getEvaluationLevelLabel(level: string | null | undefined) {
  if (!level || level === "null") return null

  switch (level) {
    case "10":
    case "9":
    case "8":
    case "7":
    case "6":
    case "5":
    case "4":
    case "3":
    case "2":
    case "1":
    case "0":
      return level
    case "excellent":
      return "10"
    case "very_good":
      return "8"
    case "good":
      return "6"
    case "not_completed":
      return "0"
    case "acceptable":
      return "4"
    case "weak":
      return "2"
    default:
      return /^(10|[0-9])$/.test(level) ? level : level
  }
}

export function calculateTotalEvaluationPoints(levels: {
  hafiz_level?: EvaluationLevelValue
  tikrar_level?: EvaluationLevelValue
  samaa_level?: EvaluationLevelValue
  rabet_level?: EvaluationLevelValue
}) {
  return calculateEvaluationLevelPoints(levels.hafiz_level)
}

export function applyAttendancePointsAdjustment(totalPoints: number, status: string | null | undefined) {
  if (status === "late") {
    return Math.max(0, totalPoints - LATE_ATTENDANCE_PENALTY)
  }
  return Math.max(0, totalPoints)
}
