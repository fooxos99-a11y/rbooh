import { ABSENCE_ALERT_TEMPLATES_SETTING_ID } from "@/lib/site-settings-constants"

export const ABSENCE_ALERT_THRESHOLDS = [1, 2, 3, 4] as const

export type AbsenceAlertThreshold = (typeof ABSENCE_ALERT_THRESHOLDS)[number]

export type AbsenceAlertTemplates = Record<`${AbsenceAlertThreshold}`, string>

export const STUDENT_ABSENCE_ALERT_SETTING_ID = ABSENCE_ALERT_TEMPLATES_SETTING_ID

export const DEFAULT_ABSENCE_ALERT_TEMPLATES: AbsenceAlertTemplates = {
	"1": "تنبيه: لديك غياب واحد. نأمل الالتزام بالحضور من الآن.",
	"2": "تنبيه: لديك غيابان حتى الآن. تكرار الغياب سيؤثر على انتظامك.",
	"3": "تنبيه: لديك 3 غيابات. يرجى مراجعة الإدارة والالتزام بالحضور.",
	"4": "تنبيه: لديك 4 غيابات. هذا إنذار أخير قبل اتخاذ إجراء إداري.",
}

export function calculateEffectiveAbsenceCount(absentCount: number, excusedCount: number) {
	return Math.max(0, absentCount) + Math.floor(Math.max(0, excusedCount) / 2)
}

export function countAbsenceStatuses(statuses: Array<string | null | undefined>) {
	let absentCount = 0
	let excusedCount = 0

	for (const status of statuses) {
		if (status === "absent") absentCount += 1
		if (status === "excused") excusedCount += 1
	}

	return {
		absentCount,
		excusedCount,
		effectiveAbsenceCount: calculateEffectiveAbsenceCount(absentCount, excusedCount),
	}
}

export function normalizeAbsenceAlertTemplates(value: unknown): AbsenceAlertTemplates {
	const source = value && typeof value === "object" ? (value as Partial<Record<`${AbsenceAlertThreshold}`, unknown>>) : {}

	return {
		"1": typeof source["1"] === "string" && source["1"].trim() ? source["1"].trim() : DEFAULT_ABSENCE_ALERT_TEMPLATES["1"],
		"2": typeof source["2"] === "string" && source["2"].trim() ? source["2"].trim() : DEFAULT_ABSENCE_ALERT_TEMPLATES["2"],
		"3": typeof source["3"] === "string" && source["3"].trim() ? source["3"].trim() : DEFAULT_ABSENCE_ALERT_TEMPLATES["3"],
		"4": typeof source["4"] === "string" && source["4"].trim() ? source["4"].trim() : DEFAULT_ABSENCE_ALERT_TEMPLATES["4"],
	}
}

export function formatAbsenceAlertMessage(
	template: string,
	params: {
		studentName: string
		absenceCount: number
		absentCount: number
		excusedCount: number
	},
) {
	return template
		.replaceAll("{{studentName}}", params.studentName)
		.replaceAll("{{absenceCount}}", String(params.absenceCount))
		.replaceAll("{{absentCount}}", String(params.absentCount))
		.replaceAll("{{excusedCount}}", String(params.excusedCount))
}