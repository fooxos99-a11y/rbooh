import { DEFAULT_EXAM_WHATSAPP_TEMPLATES, EXAM_WHATSAPP_SETTINGS_ID } from "@/lib/site-settings-constants"

export type ExamWhatsAppTemplates = {
	create: string
	update: string
	cancel: string
}

export type ExamNotificationKind = keyof ExamWhatsAppTemplates

export { DEFAULT_EXAM_WHATSAPP_TEMPLATES, EXAM_WHATSAPP_SETTINGS_ID }

export function normalizeExamWhatsAppTemplates(value: unknown): ExamWhatsAppTemplates {
	const candidate = value && typeof value === "object" ? value as Partial<ExamWhatsAppTemplates> : {}

	return {
		create: typeof candidate.create === "string" && candidate.create.trim() ? candidate.create.trim() : DEFAULT_EXAM_WHATSAPP_TEMPLATES.create,
		update: typeof candidate.update === "string" && candidate.update.trim() ? candidate.update.trim() : DEFAULT_EXAM_WHATSAPP_TEMPLATES.update,
		cancel: typeof candidate.cancel === "string" && candidate.cancel.trim() ? candidate.cancel.trim() : DEFAULT_EXAM_WHATSAPP_TEMPLATES.cancel,
	}
}

export function fillExamWhatsAppTemplate(template: string, params: {
	studentName: string
	date: string
	portion: string
	halaqah?: string | null
}) {
	return template
		.replaceAll("{name}", params.studentName)
		.replaceAll("{date}", params.date)
		.replaceAll("{portion}", params.portion)
		.replaceAll("{halaqah}", params.halaqah || "")
}

export function buildExamAppNotificationMessage(
	kind: ExamNotificationKind,
	params: {
		studentName: string
		date: string
		portion: string
		halaqah?: string | null
	},
	templates?: Partial<ExamWhatsAppTemplates> | null,
) {
	const normalizedTemplates = normalizeExamWhatsAppTemplates(templates)
	const selectedTemplate = normalizedTemplates[kind]

	if (selectedTemplate === DEFAULT_EXAM_WHATSAPP_TEMPLATES[kind]) {
		if (kind === "update") {
			return `تم تحديث موعد اختبارك في ${params.portion} إلى تاريخ ${params.date}.`
		}

		if (kind === "cancel") {
			return `تم إلغاء موعد اختبارك في ${params.portion} بتاريخ ${params.date}.`
		}

		return `تم تحديد موعد اختبارك في ${params.portion} بتاريخ ${params.date}.`
	}

	return fillExamWhatsAppTemplate(selectedTemplate, params)
}