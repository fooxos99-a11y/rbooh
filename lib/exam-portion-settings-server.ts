import { getSiteSetting } from "@/lib/site-settings"
import { normalizeExamPortionSettings, type ExamPortionSettings } from "@/lib/exam-portion-settings"
import { DEFAULT_EXAM_PORTION_SETTINGS, EXAM_PORTION_SETTINGS_ID } from "@/lib/site-settings-constants"

export async function getExamPortionSettings(): Promise<ExamPortionSettings> {
	const value = await getSiteSetting<Partial<ExamPortionSettings>>(EXAM_PORTION_SETTINGS_ID, DEFAULT_EXAM_PORTION_SETTINGS)
	return normalizeExamPortionSettings(value)
}