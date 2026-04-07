import { ABSENCE_ALERT_TEMPLATES_SETTING_ID } from "@/lib/site-settings-constants"

export const ABSENCE_ALERT_THRESHOLDS = [1, 2, 3, 4] as const

export type AbsenceAlertThreshold = (typeof ABSENCE_ALERT_THRESHOLDS)[number]

export type AbsenceTemplateSettings = {
	message: string
}

export const STUDENT_ABSENCE_ALERT_SETTING_ID = ABSENCE_ALERT_TEMPLATES_SETTING_ID

export const DEFAULT_ABSENCE_TEMPLATE_SETTINGS: AbsenceTemplateSettings = {
	message: "نحيطكم علماً بأن الطالب {{studentName}} قد سُجّل غائباً اليوم{{date}}. نأمل المتابعة.",
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

export function normalizeAbsenceTemplateSettings(value: unknown): AbsenceTemplateSettings {
	if (typeof value === "string" && value.trim()) {
		return { message: value.trim() }
	}

	const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
	if (typeof source.message === "string" && source.message.trim()) {
		return { message: source.message.trim() }
	}

	for (const threshold of ABSENCE_ALERT_THRESHOLDS) {
		const legacyValue = source[String(threshold)]
		if (typeof legacyValue === "string" && legacyValue.trim()) {
			return { message: legacyValue.trim() }
		}
	}

	return DEFAULT_ABSENCE_TEMPLATE_SETTINGS
}

export function formatAbsenceAlertMessage(
	template: string,
	params: {
		studentName: string
		date?: string
		circleName?: string
	},
) {
	return template
		.replaceAll("{{studentName}}", params.studentName)
		.replaceAll("{{date}}", params.date ? ` بتاريخ ${params.date}` : "")
		.replaceAll("{{circleName}}", params.circleName || "")
}