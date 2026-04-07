export const TEACHER_ATTENDANCE_DELAY_SETTING_ID = "teacher_attendance_delay"
export const DEFAULT_TEACHER_ATTENDANCE_DELAY_MINUTES = 50

export const ABSENCE_ALERT_TEMPLATES_SETTING_ID = "student_absence_alert_templates"
export const STUDENT_ISSUE_NOTIFICATION_TEMPLATES_SETTING_ID = "student_issue_notification_templates"

export const EXAM_SETTINGS_ID = "exam_settings"
export const WHATSAPP_WORKER_STATE_SETTING_ID = "rboh_whatsapp_worker_state"
export const WHATSAPP_WORKER_COMMAND_SETTING_ID = "rboh_whatsapp_worker_command"
export const DEFAULT_EXAM_SETTINGS = {
	maxScore: 100,
	alertDeduction: 2,
	mistakeDeduction: 5,
	minPassingScore: 85,
} as const

export const EXAM_PORTION_SETTINGS_ID = "exam_portion_settings"
export const DEFAULT_EXAM_PORTION_SETTINGS = {
	mode: "juz",
} as const

export const EXAM_WHATSAPP_SETTINGS_ID = "exam_whatsapp_notifications"
export const DEFAULT_EXAM_WHATSAPP_TEMPLATES = {
	create: "تنبيه من {halaqah}: تم تحديد اختبار للطالب {name} في {portion} بتاريخ {date}.",
	update: "تنبيه من {halaqah}: تم تحديث موعد اختبار الطالب {name} في {portion} إلى تاريخ {date}.",
	cancel: "تنبيه من {halaqah}: تم إلغاء موعد اختبار الطالب {name} في {portion} بتاريخ {date}.",
} as const