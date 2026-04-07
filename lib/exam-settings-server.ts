import { getSiteSetting } from "@/lib/site-settings"
import { normalizeExamSettings, type ExamSettings } from "@/lib/exam-settings"
import { DEFAULT_EXAM_SETTINGS, EXAM_SETTINGS_ID } from "@/lib/site-settings-constants"

export async function getExamSettings(): Promise<ExamSettings> {
	const setting = await getSiteSetting<Partial<ExamSettings>>(EXAM_SETTINGS_ID, DEFAULT_EXAM_SETTINGS)
	return normalizeExamSettings(setting)
}