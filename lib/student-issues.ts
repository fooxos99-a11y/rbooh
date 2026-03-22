import { STUDENT_ISSUE_NOTIFICATION_TEMPLATES_SETTING_ID } from "@/lib/site-settings-constants"

export const STUDENT_ISSUE_NOTIFICATION_TYPES = ["warning", "alert"] as const

export type StudentIssueNotificationType = (typeof STUDENT_ISSUE_NOTIFICATION_TYPES)[number]

export type StudentIssueNotificationTemplates = Record<StudentIssueNotificationType, string>

export const STUDENT_ISSUE_NOTIFICATION_SETTING_ID = STUDENT_ISSUE_NOTIFICATION_TEMPLATES_SETTING_ID

export const DEFAULT_STUDENT_ISSUE_NOTIFICATION_TEMPLATES: StudentIssueNotificationTemplates = {
	warning: "تنبيه للطالب {{studentName}} في حلقة {{circleName}} بتاريخ {{date}}: {{issueSummary}}",
	alert: "إنذار للطالب {{studentName}} في حلقة {{circleName}} بتاريخ {{date}} بسبب: {{issueSummary}}. نرجو معالجة الملاحظات فورًا.",
}

export function normalizeStudentIssueNotificationTemplates(value: unknown): StudentIssueNotificationTemplates {
	const source = value && typeof value === "object" ? (value as Partial<Record<StudentIssueNotificationType, unknown>>) : {}

	return {
		warning:
			typeof source.warning === "string" && source.warning.trim()
				? source.warning.trim()
				: DEFAULT_STUDENT_ISSUE_NOTIFICATION_TEMPLATES.warning,
		alert:
			typeof source.alert === "string" && source.alert.trim()
				? source.alert.trim()
				: DEFAULT_STUDENT_ISSUE_NOTIFICATION_TEMPLATES.alert,
	}
}

export function formatStudentIssueNotificationMessage(
	template: string,
	params: {
		studentName: string
		circleName: string
		date: string
		issueSummary: string
		absentCount?: number
		excusedCount?: number
		effectiveAbsenceCount?: number
		missingTasks?: string[]
	},
) {
	return template
		.replaceAll("{{studentName}}", params.studentName)
		.replaceAll("{{circleName}}", params.circleName)
		.replaceAll("{{date}}", params.date)
		.replaceAll("{{issueSummary}}", params.issueSummary)
		.replaceAll("{{absentCount}}", String(params.absentCount ?? 0))
		.replaceAll("{{excusedCount}}", String(params.excusedCount ?? 0))
		.replaceAll("{{effectiveAbsenceCount}}", String(params.effectiveAbsenceCount ?? 0))
		.replaceAll("{{missingTasks}}", (params.missingTasks || []).join("، "))
}