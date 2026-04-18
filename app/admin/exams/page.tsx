"use client"

import { useEffect, useMemo, useState } from "react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SiteLoader } from "@/components/ui/site-loader"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useAlertDialog, useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { getClientAuthHeaders } from "@/lib/client-auth"
import { normalizeExamSettings, type ExamSettings } from "@/lib/exam-settings"
import { normalizeExamPortionSettings, type ExamPortionType } from "@/lib/exam-portion-settings"
import { getPassedPortionNumbers } from "@/lib/exam-portions"
import {
	DEFAULT_EXAM_PORTION_SETTINGS,
	DEFAULT_EXAM_SETTINGS,
	EXAM_PORTION_SETTINGS_ID,
	EXAM_SETTINGS_ID,
} from "@/lib/site-settings-constants"
import {
	formatExamPortionLabel,
	getEligibleExamPortions,
	type PreviousMemorizationRange,
	type StudentExamPlanProgressSource,
	type StudentExamPortionOption,
} from "@/lib/student-exams"
import {
	DEFAULT_EXAM_WHATSAPP_TEMPLATES,
	EXAM_WHATSAPP_SETTINGS_ID,
	normalizeExamWhatsAppTemplates,
	type ExamWhatsAppTemplates,
} from "@/lib/whatsapp-notification-templates"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { BellRing } from "lucide-react"

type Circle = {
	id: string
	name: string
	studentCount?: number
}

type Student = {
	id: string
	name: string
	halaqah: string
	account_number?: number | null
	completed_juzs?: number[] | null
	current_juzs?: number[] | null
	memorized_ranges?: PreviousMemorizationRange[] | null
	memorized_start_surah?: number | null
	memorized_start_verse?: number | null
	memorized_end_surah?: number | null
	memorized_end_verse?: number | null
}

type ExamRow = {
	id: string
	student_id: string
	halaqah: string
	exam_portion_label: string
	portion_type?: ExamPortionType | null
	portion_number?: number | null
	juz_number: number | null
	exam_date: string
	alerts_count: number
	mistakes_count: number
	final_score: number
	passed: boolean
	notes?: string | null
	tested_by_name?: string | null
	students?: { name?: string | null; account_number?: number | null } | Array<{ name?: string | null; account_number?: number | null }> | null
}

type ExamScheduleRow = {
	id: string
	student_id: string
	halaqah: string
	exam_portion_label: string
	portion_type?: ExamPortionType | null
	portion_number?: number | null
	juz_number: number
	exam_date: string
	status: "scheduled" | "completed" | "cancelled"
	notification_sent_at?: string | null
	completed_exam_id?: string | null
	completed_at?: string | null
	cancelled_at?: string | null
	scheduled_by_name?: string | null
	scheduled_by_role?: string | null
	created_at: string
	updated_at: string
	students?: { name?: string | null } | Array<{ name?: string | null }> | null
}

type UntestedExamAlertRow = {
	studentId: string
	studentName: string
	halaqah: string
	pendingPortions: StudentExamPortionOption[]
	unscheduledPendingPortions: StudentExamPortionOption[]
	nextScheduledPendingDate: string | null
}

type SettingsForm = {
	maxScore: string
	alertDeduction: string
	mistakeDeduction: string
	minPassingScore: string
	portionMode: ExamPortionType
}

type NotificationTemplatesForm = {
	create: string
	update: string
	cancel: string
}

type StudentPlanProgressState = {
	plan: StudentExamPlanProgressSource | null
	completedDays: number
}

type ExamFormState = {
	circle: string
	studentId: string
	selectedPortion: string
	testedByName: string
	alertsCount: string
	mistakesCount: string
	failedAction: "repeat_memorization" | "reschedule_exam"
	retryExamDate: string
}

type ScheduleFormState = {
	circle: string
	examDate: string
}

const ALL_CIRCLES = "__all__"
const FIXED_EXAM_PORTION_MODE: ExamPortionType = "juz"

const DEFAULT_SETTINGS_FORM: SettingsForm = {
	maxScore: String(DEFAULT_EXAM_SETTINGS.maxScore),
	alertDeduction: String(DEFAULT_EXAM_SETTINGS.alertDeduction),
	mistakeDeduction: String(DEFAULT_EXAM_SETTINGS.mistakeDeduction),
	minPassingScore: String(DEFAULT_EXAM_SETTINGS.minPassingScore),
	portionMode: DEFAULT_EXAM_PORTION_SETTINGS.mode,
}

const DEFAULT_NOTIFICATION_TEMPLATES_FORM: NotificationTemplatesForm = {
	create: DEFAULT_EXAM_WHATSAPP_TEMPLATES.create,
	update: DEFAULT_EXAM_WHATSAPP_TEMPLATES.update,
	cancel: DEFAULT_EXAM_WHATSAPP_TEMPLATES.cancel,
}

function getTodayDate() {
	return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date())
}

function toSettingsForm(settings: ExamSettings, mode: ExamPortionType): SettingsForm {
	return {
		maxScore: String(settings.maxScore),
		alertDeduction: String(settings.alertDeduction),
		mistakeDeduction: String(settings.mistakeDeduction),
		minPassingScore: String(settings.minPassingScore),
		portionMode: mode,
	}
}

function fromSettingsForm(form: SettingsForm): ExamSettings {
	return normalizeExamSettings({
		maxScore: form.maxScore,
		alertDeduction: form.alertDeduction,
		mistakeDeduction: form.mistakeDeduction,
		minPassingScore: form.minPassingScore,
	})
}

function toNotificationTemplatesForm(templates: ExamWhatsAppTemplates): NotificationTemplatesForm {
	return {
		create: templates.create,
		update: templates.update,
		cancel: templates.cancel,
	}
}

function fromNotificationTemplatesForm(form: NotificationTemplatesForm): ExamWhatsAppTemplates {
	return normalizeExamWhatsAppTemplates(form)
}

function parseCount(value: string) {
	const parsed = Number(value)
	if (!Number.isFinite(parsed) || parsed < 0) {
		return 0
	}

	return Math.floor(parsed)
}

function normalizeScheduleStudentRelation(value: ExamScheduleRow["students"]) {
	if (Array.isArray(value)) return value[0] || null
	return value || null
}

function getScheduleStatusTone(status: ExamScheduleRow["status"]) {
	if (status === "completed") return "bg-[#ecfdf5] text-[#166534]"
	if (status === "cancelled") return "bg-[#fef2f2] text-[#b91c1c]"
	return "bg-[#eff6ff] text-[#3453a7]"
}

function getScheduleStatusLabel(status: ExamScheduleRow["status"]) {
	if (status === "completed") return "مكتمل"
	if (status === "cancelled") return "ملغي"
	return "مجدول"
}

function getCircleLabel(circle: string) {
	return circle === ALL_CIRCLES ? "جميع الحلقات" : circle
}

function normalizeCircleName(value: string | null | undefined) {
	return String(value || "").replace(/\s+/g, " ").trim()
}

async function parseApiResponse<T extends { error?: string }>(response: Response, fallbackMessage: string) {
	const rawText = await response.text()
	const trimmedText = rawText.trim()

	if (!trimmedText) {
		if (!response.ok) {
			throw new Error(fallbackMessage)
		}

		return {} as T
	}

	try {
		const payload = JSON.parse(trimmedText) as T

		if (!response.ok) {
			throw new Error(payload.error || fallbackMessage)
		}

		return payload
	} catch {
		const contentType = response.headers.get("content-type") || ""
		const isHtmlResponse = trimmedText.startsWith("<!DOCTYPE") || trimmedText.startsWith("<html") || contentType.includes("text/html")
		const message = isHtmlResponse
			? `${fallbackMessage} (وصل رد HTML غير متوقع من الخادم)`
			: fallbackMessage

		throw new Error(message)
	}
}

export default function AdminExamsPage() {
	const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth(["الإختبارات", "إدارة المسار"])
	const showAlert = useAlertDialog()
	const confirm = useConfirmDialog()

	const [isLoading, setIsLoading] = useState(true)
	const [isSavingExam, setIsSavingExam] = useState(false)
	const [savingScheduleStudentId, setSavingScheduleStudentId] = useState<string | null>(null)
	const [isSavingSettings, setIsSavingSettings] = useState(false)
	const [isSavingTemplates, setIsSavingTemplates] = useState(false)
	const [tableMissing, setTableMissing] = useState(false)
	const [schedulesTableMissing, setSchedulesTableMissing] = useState(false)
	const [circles, setCircles] = useState<Circle[]>([])
	const [students, setStudents] = useState<Student[]>([])
	const [exams, setExams] = useState<ExamRow[]>([])
	const [schedules, setSchedules] = useState<ExamScheduleRow[]>([])
	const [studentPlanProgressMap, setStudentPlanProgressMap] = useState<Record<string, StudentPlanProgressState>>({})
	const [settingsForm, setSettingsForm] = useState<SettingsForm>(DEFAULT_SETTINGS_FORM)
	const [notificationTemplatesForm, setNotificationTemplatesForm] = useState<NotificationTemplatesForm>(DEFAULT_NOTIFICATION_TEMPLATES_FORM)
	const [portionMode, setPortionMode] = useState<ExamPortionType>(DEFAULT_EXAM_PORTION_SETTINGS.mode)
	const [isExamDialogOpen, setIsExamDialogOpen] = useState(false)
	const [isSchedulesViewerOpen, setIsSchedulesViewerOpen] = useState(false)
	const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
	const [isUntestedAlertsDialogOpen, setIsUntestedAlertsDialogOpen] = useState(false)
	const [settingsSection, setSettingsSection] = useState<"settings" | "templates">("settings")
	const [examForm, setExamForm] = useState<ExamFormState>({
		circle: ALL_CIRCLES,
		studentId: "",
		selectedPortion: "",
		testedByName: "",
		alertsCount: "0",
		mistakesCount: "0",
		failedAction: "repeat_memorization",
		retryExamDate: getTodayDate(),
	})
	const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>({
		circle: ALL_CIRCLES,
		examDate: getTodayDate(),
	})
	const [scheduleSelections, setScheduleSelections] = useState<Record<string, string>>({})
	const [scheduleDates, setScheduleDates] = useState<Record<string, string>>({})
	const [scheduleViewerDate, setScheduleViewerDate] = useState(getTodayDate())
	const [scheduleViewerCircle, setScheduleViewerCircle] = useState(ALL_CIRCLES)

	useEffect(() => {
		async function bootstrap() {
			if (authLoading || !authVerified) {
				return
			}

			try {
				const authHeaders = getClientAuthHeaders()
				const savedUserName = localStorage.getItem("userName") || ""
				const [
					circlesResponse,
					studentsResponse,
					examsResponse,
					schedulesResponse,
					settingsResponse,
					portionSettingsResponse,
					templatesResponse,
				] = await Promise.all([
					fetch("/api/circles", { cache: "no-store", headers: authHeaders }),
					fetch("/api/students", { cache: "no-store", headers: authHeaders }),
					fetch("/api/exams", { cache: "no-store", headers: authHeaders }),
					fetch("/api/exam-schedules", { cache: "no-store", headers: authHeaders }),
					fetch(`/api/site-settings?id=${EXAM_SETTINGS_ID}`, { cache: "no-store", headers: authHeaders }),
					fetch(`/api/site-settings?id=${EXAM_PORTION_SETTINGS_ID}`, { cache: "no-store", headers: authHeaders }),
					fetch(`/api/site-settings?id=${EXAM_WHATSAPP_SETTINGS_ID}`, { cache: "no-store", headers: authHeaders }),
				])

				const [
					circlesData,
					studentsData,
					examsData,
					schedulesData,
					settingsData,
					portionSettingsData,
					templatesData,
				] = await Promise.all([
					parseApiResponse<{ circles?: Circle[] }>(circlesResponse, "تعذر تحميل الحلقات"),
					parseApiResponse<{ students?: Student[] }>(studentsResponse, "تعذر تحميل الطلاب"),
					parseApiResponse<{ exams?: ExamRow[]; tableMissing?: boolean }>(examsResponse, "تعذر تحميل الاختبارات"),
					parseApiResponse<{ schedules?: ExamScheduleRow[]; tableMissing?: boolean }>(schedulesResponse, "تعذر تحميل المواعيد"),
					parseApiResponse<{ value?: unknown }>(settingsResponse, "تعذر تحميل إعدادات الاختبارات"),
					parseApiResponse<{ value?: unknown }>(portionSettingsResponse, "تعذر تحميل إعدادات الأجزاء"),
					parseApiResponse<{ value?: unknown }>(templatesResponse, "تعذر تحميل قوالب الرسائل"),
				])
				const loadedStudents = (studentsData.students || []) as Student[]
				const loadedCircles = (circlesData.circles || []) as Circle[]
				const normalizedPortionSettings = normalizeExamPortionSettings(portionSettingsData.value)
				const studentIds = loadedStudents.map((student) => student.id).join(",")
				const plansData = loadedStudents.length > 0
					? await fetch(`/api/student-plans?student_ids=${encodeURIComponent(studentIds)}`, { cache: "no-store", headers: authHeaders })
						.then((plansResponse) => parseApiResponse<{ plansByStudent?: Record<string, { plan?: StudentExamPlanProgressSource | null; completedDays?: number | null }> }>(plansResponse, "تعذر تحميل خطط الطلاب"))
						.catch((error) => {
							console.error("[admin-exams] plans bootstrap:", error)
							return { plansByStudent: {} }
						})
					: { plansByStudent: {} }
				const planEntries = loadedStudents.map((student) => ([
					student.id,
					{
						plan: (plansData.plansByStudent?.[student.id]?.plan || null) as StudentExamPlanProgressSource | null,
						completedDays: Number(plansData.plansByStudent?.[student.id]?.completedDays) || 0,
					},
				] as const))

				setCircles(loadedCircles)
				setStudents(loadedStudents)
				setExams((examsData.exams || []) as ExamRow[])
				setSchedules((schedulesData.schedules || []) as ExamScheduleRow[])
				setTableMissing(Boolean(examsData.tableMissing))
				setSchedulesTableMissing(Boolean(schedulesData.tableMissing))
				setStudentPlanProgressMap(Object.fromEntries(planEntries))
				setPortionMode(FIXED_EXAM_PORTION_MODE)
				setSettingsForm(toSettingsForm(normalizeExamSettings(settingsData.value), FIXED_EXAM_PORTION_MODE))
				setNotificationTemplatesForm(toNotificationTemplatesForm(normalizeExamWhatsAppTemplates(templatesData.value)))
				setExamForm((current) => ({
					...current,
					testedByName: current.testedByName || savedUserName,
					retryExamDate: current.retryExamDate || getTodayDate(),
				}))
			} catch (error) {
				console.error("[admin-exams] bootstrap:", error)
				await showAlert("تعذر تحميل بيانات صفحة الاختبارات")
			} finally {
				setIsLoading(false)
			}
		}

		void bootstrap()
	}, [authLoading, authVerified, showAlert])

	const examStudents = useMemo(() => {
		if (examForm.circle === ALL_CIRCLES) return students
		const selectedCircle = normalizeCircleName(examForm.circle)
		return students.filter((student) => normalizeCircleName(student.halaqah) === selectedCircle)
	}, [students, examForm.circle])

	const scheduleStudents = useMemo(() => {
		if (scheduleForm.circle === ALL_CIRCLES) return students
		const selectedCircle = normalizeCircleName(scheduleForm.circle)
		return students.filter((student) => normalizeCircleName(student.halaqah) === selectedCircle)
	}, [students, scheduleForm.circle])

	const selectedExamStudent = useMemo(() => examStudents.find((student) => student.id === examForm.studentId) || null, [examStudents, examForm.studentId])
	const selectedExamStudentPlan = useMemo(() => examForm.studentId ? (studentPlanProgressMap[examForm.studentId] || null) : null, [studentPlanProgressMap, examForm.studentId])
	const selectedStudentExams = useMemo(() => exams.filter((exam) => exam.student_id === examForm.studentId), [exams, examForm.studentId])
	const examPassedPortions = useMemo(() => getPassedPortionNumbers(selectedStudentExams, portionMode), [selectedStudentExams, portionMode])
	const examEligiblePortions = useMemo<StudentExamPortionOption[]>(() => getEligibleExamPortions(selectedExamStudent, selectedExamStudentPlan, portionMode), [selectedExamStudent, selectedExamStudentPlan, portionMode])
	const examAvailablePortions = useMemo<StudentExamPortionOption[]>(() => examEligiblePortions.filter((portion) => !examPassedPortions.has(Number(portion.portionNumber))), [examEligiblePortions, examPassedPortions])
	const scheduleAvailablePortionsByStudent = useMemo<Record<string, StudentExamPortionOption[]>>(() => {
		return Object.fromEntries(scheduleStudents.map((student) => {
			const studentPlan = studentPlanProgressMap[student.id] || null
			const studentExams = exams.filter((exam) => exam.student_id === student.id)
			const passedPortions = getPassedPortionNumbers(studentExams, portionMode)
			const eligiblePortions = getEligibleExamPortions(student, studentPlan, portionMode)
			const availablePortions = eligiblePortions.filter((portion) => {
				if (passedPortions.has(Number(portion.portionNumber))) {
					return false
				}

				return !schedules.some((schedule) => schedule.student_id === student.id && schedule.status === "scheduled" && Number(schedule.portion_number || schedule.juz_number) === Number(portion.portionNumber))
			})

			return [student.id, availablePortions]
		}))
	}, [scheduleStudents, studentPlanProgressMap, exams, portionMode, schedules])

	const untestedExamAlerts = useMemo<UntestedExamAlertRow[]>(() => {
		return scheduleStudents
			.map((student) => {
				const studentPlan = studentPlanProgressMap[student.id] || null
				const eligiblePortions = getEligibleExamPortions(student, studentPlan, portionMode)
				if (eligiblePortions.length === 0) {
					return null
				}

				const testedPortionNumbers = new Set(
					exams
						.filter((exam) => exam.student_id === student.id)
						.map((exam) => Number(exam.portion_number || exam.juz_number))
						.filter((portionNumber) => Number.isFinite(portionNumber) && portionNumber > 0),
				)

				const pendingPortions = eligiblePortions.filter((portion) => !testedPortionNumbers.has(Number(portion.portionNumber)))
				if (pendingPortions.length === 0) {
					return null
				}

				const scheduledPendingRows = pendingPortions
					.map((portion) => {
						const matchedSchedule = schedules.find((schedule) => (
							schedule.student_id === student.id
							&& schedule.status === "scheduled"
							&& Number(schedule.portion_number || schedule.juz_number) === Number(portion.portionNumber)
						))

						return matchedSchedule ? { portion, schedule: matchedSchedule } : null
					})
					.filter((entry): entry is { portion: StudentExamPortionOption; schedule: ExamScheduleRow } => Boolean(entry))
					.sort((left, right) => left.schedule.exam_date.localeCompare(right.schedule.exam_date))

				const scheduledPendingNumbers = new Set(scheduledPendingRows.map((entry) => Number(entry.portion.portionNumber)))

				return {
					studentId: student.id,
					studentName: student.name,
					halaqah: student.halaqah,
					pendingPortions,
					unscheduledPendingPortions: pendingPortions.filter((portion) => !scheduledPendingNumbers.has(Number(portion.portionNumber))),
					nextScheduledPendingDate: scheduledPendingRows[0]?.schedule.exam_date || null,
				}
			})
			.filter((row): row is UntestedExamAlertRow => Boolean(row))
			.sort((left, right) => {
				if (right.pendingPortions.length !== left.pendingPortions.length) {
					return right.pendingPortions.length - left.pendingPortions.length
				}

				const halaqahCompare = left.halaqah.localeCompare(right.halaqah, "ar")
				if (halaqahCompare !== 0) {
					return halaqahCompare
				}

				return left.studentName.localeCompare(right.studentName, "ar")
			})
	}, [scheduleStudents, studentPlanProgressMap, portionMode, exams, schedules])

	function openExamForAlert(alertRow: UntestedExamAlertRow) {
		setExamForm((current) => ({
			...current,
			circle: alertRow.halaqah || ALL_CIRCLES,
			studentId: alertRow.studentId,
			selectedPortion: String(alertRow.pendingPortions[0]?.portionNumber || ""),
		}))
		setIsExamDialogOpen(true)
	}

	const displayedSchedules = useMemo(() => {
		return schedules.filter((schedule) => {
			if (schedule.exam_date !== scheduleViewerDate) {
				return false
			}

			if (scheduleViewerCircle !== ALL_CIRCLES && schedule.halaqah !== scheduleViewerCircle) {
				return false
			}

			return true
		})
	}, [schedules, scheduleViewerDate, scheduleViewerCircle])

	useEffect(() => {
		setExamForm((current) => {
			const nextStudentId = examStudents.some((student) => student.id === current.studentId) ? current.studentId : ""
			return nextStudentId === current.studentId ? current : { ...current, studentId: nextStudentId }
		})
	}, [examStudents])

	useEffect(() => {
		setExamForm((current) => {
			const nextPortion = examAvailablePortions.some((portion) => String(portion.portionNumber) === current.selectedPortion)
				? current.selectedPortion
				: (examAvailablePortions[0] ? String(examAvailablePortions[0].portionNumber) : "")
			return nextPortion === current.selectedPortion ? current : { ...current, selectedPortion: nextPortion }
		})
	}, [examAvailablePortions])

	useEffect(() => {
		setScheduleSelections((current) => {
			const next: Record<string, string> = {}
			let changed = false

			for (const student of scheduleStudents) {
				const availablePortions = scheduleAvailablePortionsByStudent[student.id] || []
				const currentSelection = current[student.id] || ""
				const nextSelection = availablePortions.some((portion) => String(portion.portionNumber) === currentSelection)
					? currentSelection
					: (availablePortions[0] ? String(availablePortions[0].portionNumber) : "")

				next[student.id] = nextSelection
				if (nextSelection !== currentSelection) {
					changed = true
				}
			}

			if (!changed && Object.keys(current).length === Object.keys(next).length) {
				return current
			}

			return next
		})
	}, [scheduleStudents, scheduleAvailablePortionsByStudent])

	useEffect(() => {
		setScheduleDates((current) => {
			const next: Record<string, string> = {}
			let changed = false

			for (const student of scheduleStudents) {
				const currentDate = current[student.id] || ""
				const nextDate = currentDate || scheduleForm.examDate || getTodayDate()
				next[student.id] = nextDate
				if (nextDate !== currentDate) {
					changed = true
				}
			}

			if (!changed && Object.keys(current).length === Object.keys(next).length) {
				return current
			}

			return next
		})
	}, [scheduleStudents, scheduleForm.examDate])

	async function saveSettings() {
		try {
			setIsSavingSettings(true)
			const authHeaders = { "Content-Type": "application/json", ...getClientAuthHeaders() }
			const nextExamSettings = fromSettingsForm(settingsForm)
			const nextPortionSettings = normalizeExamPortionSettings({ mode: FIXED_EXAM_PORTION_MODE })
			const [settingsResponse, portionResponse] = await Promise.all([
				fetch("/api/site-settings", { method: "PATCH", headers: authHeaders, body: JSON.stringify({ id: EXAM_SETTINGS_ID, value: nextExamSettings }) }),
				fetch("/api/site-settings", { method: "PATCH", headers: authHeaders, body: JSON.stringify({ id: EXAM_PORTION_SETTINGS_ID, value: nextPortionSettings }) }),
			])

			if (!settingsResponse.ok || !portionResponse.ok) {
				throw new Error("فشل حفظ الإعدادات")
			}

			setPortionMode(FIXED_EXAM_PORTION_MODE)
			setIsSettingsDialogOpen(false)
			await showAlert("تم حفظ إعدادات الاختبارات")
		} catch (error) {
			console.error("[admin-exams] save settings:", error)
			await showAlert("تعذر حفظ إعدادات الاختبارات")
		} finally {
			setIsSavingSettings(false)
		}
	}

	async function saveNotificationTemplates() {
		try {
			setIsSavingTemplates(true)
			const response = await fetch("/api/site-settings", {
				method: "PATCH",
				headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
				body: JSON.stringify({
					id: EXAM_WHATSAPP_SETTINGS_ID,
					value: fromNotificationTemplatesForm(notificationTemplatesForm),
				}),
			})
			await parseApiResponse(response, "تعذر حفظ قوالب الرسائل")

			setIsSettingsDialogOpen(false)
			await showAlert("تم حفظ قوالب رسائل الاختبارات. الإرسال الفعلي سيُفعّل لاحقًا.")
		} catch (error) {
			console.error("[admin-exams] save templates:", error)
			await showAlert(error instanceof Error ? error.message : "تعذر حفظ قوالب الرسائل")
		} finally {
			setIsSavingTemplates(false)
		}
	}

	async function saveExam() {
		if (!examForm.studentId || !examForm.selectedPortion) {
			await showAlert("اختر الطالب والجزء أولاً")
			return
		}

		try {
			setIsSavingExam(true)
			const selectedPortion = examAvailablePortions.find((portion) => String(portion.portionNumber) === examForm.selectedPortion)
			const response = await fetch("/api/exams", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
				body: JSON.stringify({
					student_id: examForm.studentId,
					exam_date: getTodayDate(),
					portion_type: portionMode,
					portion_number: Number(examForm.selectedPortion),
					tested_by_name: examForm.testedByName,
					alerts_count: parseCount(examForm.alertsCount),
					mistakes_count: parseCount(examForm.mistakesCount),
					failed_action: examForm.failedAction,
					retry_exam_date: examForm.retryExamDate,
				}),
			})
			const payload = await parseApiResponse<{ exam?: ExamRow; student?: Student; rescheduledSchedule?: ExamScheduleRow }>(response, "فشل تسجيل الاختبار")

			setExams((current) => [payload.exam as ExamRow, ...current])
			if (payload.student?.id) {
				setStudents((current) => current.map((student) => student.id === payload.student.id ? { ...student, ...payload.student } : student))
			}
			setSchedules((current) => {
				const nextSchedules = current.map((schedule) => {
					if (schedule.student_id === examForm.studentId && schedule.status === "scheduled" && Number(schedule.portion_number || schedule.juz_number) === Number(examForm.selectedPortion)) {
						return {
							...schedule,
							status: "completed",
							completed_exam_id: payload.exam?.id || schedule.completed_exam_id,
							completed_at: new Date().toISOString(),
						}
					}
					return schedule
				})

				return payload.rescheduledSchedule ? [payload.rescheduledSchedule, ...nextSchedules] : nextSchedules
			})
			setExamForm((current) => ({
				...current,
				alertsCount: "0",
				mistakesCount: "0",
				failedAction: "repeat_memorization",
				retryExamDate: getTodayDate(),
			}))
			setIsExamDialogOpen(false)
			await showAlert(`تم تسجيل نتيجة ${selectedPortion?.label || formatExamPortionLabel(Number(examForm.selectedPortion), "", portionMode)}`)
		} catch (error) {
			console.error("[admin-exams] save exam:", error)
			await showAlert(error instanceof Error ? error.message : "تعذر تسجيل الاختبار")
		} finally {
			setIsSavingExam(false)
		}
	}

	async function saveSchedule(student: Student) {
		const selectedPortion = scheduleSelections[student.id] || ""
		const selectedDate = scheduleDates[student.id] || scheduleForm.examDate || getTodayDate()
		if (!selectedPortion) {
			await showAlert(`اختر الجزء أولاً للطالب ${student.name}`)
			return
		}

		try {
			setSavingScheduleStudentId(student.id)
			const response = await fetch("/api/exam-schedules", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
				body: JSON.stringify({
					student_id: student.id,
					exam_date: selectedDate,
					portion_type: portionMode,
					portion_number: Number(selectedPortion),
				}),
			})
			const payload = await parseApiResponse<{ schedule?: ExamScheduleRow }>(response, "فشل حفظ الموعد")

			setSchedules((current) => [payload.schedule as ExamScheduleRow, ...current])
			await showAlert(`تم إرسال إشعار الاختبار للطالب ${student.name}`)
		} catch (error) {
			console.error("[admin-exams] save schedule:", error)
			await showAlert(error instanceof Error ? error.message : "تعذر حفظ الموعد")
		} finally {
			setSavingScheduleStudentId(null)
		}
	}

	async function cancelSchedule(schedule: ExamScheduleRow) {
		const approved = await confirm({
			title: "إلغاء الموعد",
			description: `هل تريد إلغاء موعد ${schedule.exam_portion_label} للطالب ${normalizeScheduleStudentRelation(schedule.students)?.name || ""}؟`,
			confirmText: "إلغاء الموعد",
			cancelText: "رجوع",
		})
		if (!approved) {
			return
		}

		try {
			const response = await fetch(`/api/exam-schedules?id=${encodeURIComponent(schedule.id)}`, {
				method: "DELETE",
				headers: getClientAuthHeaders(),
			})
			await parseApiResponse(response, "تعذر إلغاء الموعد")

			setSchedules((current) => current.map((item) => item.id === schedule.id ? { ...item, status: "cancelled", cancelled_at: new Date().toISOString() } : item))
			await showAlert("تم إلغاء الموعد")
		} catch (error) {
			console.error("[admin-exams] cancel schedule:", error)
			await showAlert(error instanceof Error ? error.message : "تعذر إلغاء الموعد")
		}
	}

	if (authLoading || isLoading) {
		return <SiteLoader fullScreen />
	}

	if (!authVerified) {
		return null
	}

	return (
		<div dir="rtl" className="min-h-screen bg-[#fafaf9]">
			<Header />
			<main className="px-4 py-10">
				<div className="container mx-auto max-w-6xl space-y-6">
					<div className="flex flex-col gap-6">
						<div>
							<h1 className="text-3xl font-black text-[#1a2332]">إدارة الاختبارات</h1>
						</div>
						<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
							<div className="flex flex-wrap gap-4">
								<Button onClick={() => setIsExamDialogOpen(true)} className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#3453a7] to-[#4a67b7] px-8 py-3.5 text-base font-semibold text-white shadow-[0_14px_28px_-18px_rgba(52,83,167,0.45)] transition-all hover:from-[#2f4b98] hover:to-[#4360ae] hover:shadow-[0_18px_34px_-18px_rgba(52,83,167,0.5)]">اختبار الطلاب</Button>
								<Button onClick={() => setIsSchedulesViewerOpen(true)} className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#3453a7] to-[#4a67b7] px-8 py-3.5 text-base font-semibold text-white shadow-[0_14px_28px_-18px_rgba(52,83,167,0.45)] transition-all hover:from-[#2f4b98] hover:to-[#4360ae] hover:shadow-[0_18px_34px_-18px_rgba(52,83,167,0.5)]">المواعيد</Button>
								<Button onClick={() => {
									setSettingsSection("settings")
									setIsSettingsDialogOpen(true)
								}} className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#3453a7] to-[#4a67b7] px-8 py-3.5 text-base font-semibold text-white shadow-[0_14px_28px_-18px_rgba(52,83,167,0.45)] transition-all hover:from-[#2f4b98] hover:to-[#4360ae] hover:shadow-[0_18px_34px_-18px_rgba(52,83,167,0.5)]">إعدادات الاختبار</Button>
							</div>
							{untestedExamAlerts.length > 0 ? (
								<Button
									type="button"
									onClick={() => setIsUntestedAlertsDialogOpen(true)}
									variant="outline"
									className="flex items-center gap-2 self-start rounded-2xl border-[#dbe7ff] bg-white px-5 py-3 text-sm font-bold text-[#3453a7] shadow-[0_10px_24px_-18px_rgba(52,83,167,0.45)] hover:bg-[#f7faff]"
								>
									<BellRing className="h-4 w-4" />
									الطلاب الغير مختبرين
								</Button>
							) : null}
						</div>
					</div>

					{tableMissing || schedulesTableMissing ? (
						<div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-900">
							يلزم تطبيق ملفات SQL الجديدة أولاً: <span className="font-black">063_create_student_exams.sql</span> و <span className="font-black">064_create_exam_schedules.sql</span> و <span className="font-black">065_add_exam_portion_mode.sql</span>.
						</div>
					) : null}

					<div className="overflow-hidden rounded-[30px] border border-[#dfe8fb] bg-white shadow-[0_24px_60px_-36px_rgba(15,23,42,0.18)]">
						<div className="px-7 pt-6 pb-7">
							<div className="mb-6 text-[#223a67]">
								<h2 className="text-right text-[2rem] font-black tracking-tight" style={{ letterSpacing: "-1px" }}>جدولة الاختبارات</h2>
							</div>
							<div className="flex flex-col gap-6">
								<div className="w-full max-w-[190px] space-y-2 text-right">
									<Label className="block text-base font-bold text-[#223a67] mr-1">الحلقة</Label>
									<Select value={scheduleForm.circle} onValueChange={(value) => setScheduleForm((current) => ({ ...current, circle: value }))}>
										<SelectTrigger className="h-12 rounded-2xl border-[#dbe7ff] bg-white px-4 text-right text-base shadow-[0_6px_18px_rgba(59,130,246,0.08)]"><SelectValue placeholder="اختر الحلقة" /></SelectTrigger>
										<SelectContent>
											<SelectItem value={ALL_CIRCLES}>جميع الحلقات</SelectItem>
											{circles.map((circle) => <SelectItem key={circle.id || circle.name} value={circle.name}>{circle.name}</SelectItem>)}
										</SelectContent>
									</Select>
								</div>

								<div className="overflow-hidden rounded-[28px] border border-[#dfe8fb] bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
									<div className="hidden border-b border-[#e8eef9] bg-[#f7faff] px-6 py-4 text-right text-[1.05rem] font-bold text-[#334155] md:grid md:grid-cols-[minmax(260px,1.6fr)_minmax(170px,0.9fr)_minmax(210px,1fr)_160px] gap-5">
										<div>الطالب</div>
										<div>الجزء</div>
										<div>التاريخ</div>
										<div>الإجراء</div>
									</div>
									{scheduleStudents.length === 0 ? (
										<div className="px-6 py-12 text-center text-base text-[#64748b]">لا يوجد طلاب في هذه الحلقة.</div>
									) : (
										<div className="divide-y divide-[#eef2f7]">
											{scheduleStudents.map((student) => {
												const availablePortions = scheduleAvailablePortionsByStudent[student.id] || []
												const selectedPortion = scheduleSelections[student.id] || ""
												const selectedDate = scheduleDates[student.id] || scheduleForm.examDate || getTodayDate()
												const isSending = savingScheduleStudentId === student.id

												return (
													<div key={student.id} className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-[minmax(260px,1.6fr)_minmax(170px,0.9fr)_minmax(210px,1fr)_160px] md:items-center md:py-3">
														<div className="text-right">
															<div className="text-sm font-semibold text-[#64748b] md:hidden mb-1">الطالب</div>
															<div className="text-lg font-semibold text-[#1a2332]">{student.name}</div>
														</div>
														<div className="text-right">
															<div className="text-sm font-semibold text-[#64748b] md:hidden mb-1">الجزء</div>
															{availablePortions.length > 0 ? (
																<Select value={selectedPortion} onValueChange={(value) => setScheduleSelections((current) => ({ ...current, [student.id]: value }))}>
																	<SelectTrigger className="h-12 rounded-2xl border-[#dbe7ff] bg-white px-4 text-right text-base shadow-[0_6px_18px_rgba(59,130,246,0.08)]"><SelectValue placeholder="اختر الجزء" /></SelectTrigger>
																	<SelectContent>
																		{availablePortions.map((portion) => <SelectItem key={`${student.id}-${portion.portionNumber}`} value={String(portion.portionNumber)}>{portion.label}</SelectItem>)}
																	</SelectContent>
																</Select>
															) : (
																<div className="rounded-2xl bg-[#fff7f7] px-4 py-3 text-sm text-[#b91c1c]">لا توجد أجزاء متاحة</div>
															)}
														</div>
														<div className="text-right">
															<div className="text-sm font-semibold text-[#64748b] md:hidden mb-1">التاريخ</div>
															<Input type="date" value={selectedDate} onChange={(event) => setScheduleDates((current) => ({ ...current, [student.id]: event.target.value }))} className="h-12 w-full rounded-2xl border-[#dbe7ff] bg-white px-4 text-right text-base shadow-[0_6px_18px_rgba(59,130,246,0.08)]" />
														</div>
														<div className="flex pt-2 md:justify-start md:pt-0">
															<Button onClick={() => void saveSchedule(student)} disabled={isSending || !selectedPortion || !selectedDate} className="h-12 w-full rounded-2xl bg-gradient-to-r from-[#3453a7] to-[#4a67b7] px-8 text-base font-bold text-white shadow-[0_14px_30px_-18px_rgba(52,83,167,0.45)] transition-all hover:from-[#2f4b98] hover:to-[#4360ae] hover:shadow-[0_20px_38px_-18px_rgba(52,83,167,0.5)] disabled:shadow-none md:w-[146px]">
																{isSending ? "جاري الإرسال..." : "إرسال"}
															</Button>
														</div>
													</div>
												)
											})}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>

				</div>
			</main>
			<Footer />

			<Dialog open={isExamDialogOpen} onOpenChange={setIsExamDialogOpen}>
				<DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-[30px] border border-[#dfe8fb] bg-white p-0 shadow-[0_26px_70px_rgba(15,23,42,0.2)] sm:max-w-[850px]" dir="rtl">
					<DialogHeader className="shrink-0 border-b border-[#e7eefb] px-5 pt-7 pb-5 sm:px-7">
						<DialogTitle className="text-right text-[2rem] font-black leading-none text-[#223a67]">اختبار الطلاب</DialogTitle>
					</DialogHeader>
					<div className="overflow-y-auto px-5 py-6 sm:px-7">
						<div className="mx-auto grid w-full gap-6">
							
							<div className="grid gap-6 sm:grid-cols-3">
								<div className="w-full space-y-2 text-right">
									<Label className="block text-base font-bold text-[#334155]">الحلقة</Label>
									<Select value={examForm.circle} onValueChange={(value) => setExamForm((current) => ({ ...current, circle: value }))}>
										<SelectTrigger className="h-12 w-full rounded-2xl border-[#dbe7ff] bg-white px-4 text-right text-base"><SelectValue placeholder="اختر الحلقة" /></SelectTrigger>
										<SelectContent>
											<SelectItem value={ALL_CIRCLES}>جميع الحلقات</SelectItem>
											{circles.map((circle) => <SelectItem key={circle.id || circle.name} value={circle.name}>{circle.name}</SelectItem>)}
										</SelectContent>
									</Select>
								</div>

								<div className="w-full space-y-2 text-right">
									<Label className="block text-base font-bold text-[#334155]">الطالب</Label>
									<Select value={examForm.studentId} onValueChange={(value) => setExamForm((current) => ({ ...current, studentId: value }))}>
										<SelectTrigger className="h-12 w-full rounded-2xl border-[#dbe7ff] bg-white px-4 text-right text-base"><SelectValue placeholder="اختر الطالب أولًا" /></SelectTrigger>
										<SelectContent>
											{examStudents.map((student) => <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>)}
										</SelectContent>
									</Select>
								</div>

								<div className="w-full space-y-2 text-right">
									<Label className="block text-base font-bold text-[#334155]">الجزء المراد اختباره</Label>
									<Select value={examForm.selectedPortion} onValueChange={(value) => setExamForm((current) => ({ ...current, selectedPortion: value }))}>
										<SelectTrigger className="h-12 w-full rounded-2xl border-[#dbe7ff] bg-white px-4 text-right text-base"><SelectValue placeholder="اختر الطالب أولًا" /></SelectTrigger>
										<SelectContent>
											{examAvailablePortions.map((portion) => <SelectItem key={String(portion.portionNumber)} value={String(portion.portionNumber)}>{portion.label}</SelectItem>)}
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="grid gap-6 sm:grid-cols-3">
								<div className="w-full space-y-2 text-right">
									<Label className="block text-base font-bold text-[#334155]">اسم المختبر</Label>
									<Input value={examForm.testedByName} onChange={(event) => setExamForm((current) => ({ ...current, testedByName: event.target.value }))} className="h-12 w-full rounded-2xl border-[#dbe7ff] bg-white px-4 text-right text-base font-semibold text-[#1a2332]" />
								</div>
								
								<div className="w-full space-y-2 text-right">
									<Label className="block text-base font-bold text-[#334155]">عدد التنبيهات</Label>
									<Input inputMode="numeric" value={examForm.alertsCount} onChange={(event) => setExamForm((current) => ({ ...current, alertsCount: event.target.value }))} className="h-12 w-full rounded-2xl border-[#dbe7ff] bg-white px-4 text-right text-base" />
								</div>
								
								<div className="w-full space-y-2 text-right">
									<Label className="block text-base font-bold text-[#334155]">عدد الأخطاء</Label>
									<Input inputMode="numeric" value={examForm.mistakesCount} onChange={(event) => setExamForm((current) => ({ ...current, mistakesCount: event.target.value }))} className="h-12 w-full rounded-2xl border-[#dbe7ff] bg-white px-4 text-right text-base" />
								</div>
							</div>

							<div className="grid gap-6 sm:grid-cols-2">
								<div className="w-full space-y-2 text-right">
									<Label className="block text-base font-bold text-[#334155]">إجراء الرسوب</Label>
									<Select value={examForm.failedAction} onValueChange={(value) => setExamForm((current) => ({ ...current, failedAction: value as ExamFormState["failedAction"] }))}>
										<SelectTrigger className="h-12 w-full rounded-2xl border-[#dbe7ff] bg-white px-4 text-right text-base"><SelectValue /></SelectTrigger>
										<SelectContent>
											<SelectItem value="repeat_memorization">إعادة الحفظ</SelectItem>
											<SelectItem value="reschedule_exam">إعادة موعد الاختبار</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="w-full space-y-2 text-right">
									<Label className="block text-base font-bold text-[#334155]">موعد الإعادة عند الرسوب</Label>
									<Input type="date" value={examForm.retryExamDate} onChange={(event) => setExamForm((current) => ({ ...current, retryExamDate: event.target.value }))} className="h-12 w-full rounded-2xl border-[#dbe7ff] bg-white px-4 text-right text-base" disabled={examForm.failedAction !== "reschedule_exam"} />
								</div>
							</div>

							{selectedExamStudent && examAvailablePortions.length === 0 ? <div className="rounded-2xl border border-[#fecaca] bg-[#fff7f7] px-5 py-4 text-right text-sm font-medium text-[#b91c1c]">لا توجد أجزاء متاحة حاليًا لهذا الطالب.</div> : null}
						</div>
					</div>
					<DialogFooter className="shrink-0 border-t border-[#e7eefb] bg-white px-5 py-5 flex-row-reverse sm:justify-start sm:px-7">
						<div className="flex w-full justify-end gap-3" dir="ltr">
							<Button type="button" variant="outline" onClick={() => setIsExamDialogOpen(false)} className="h-12 w-[120px] rounded-2xl border-[#d8e4fb] text-base font-bold text-[#3453a7] hover:bg-[#f8fbff]">إغلاق</Button>
							<Button onClick={() => void saveExam()} disabled={isSavingExam || !examForm.studentId || !examForm.selectedPortion} className="h-12 w-[120px] rounded-2xl bg-[#98aae0] text-base font-bold text-white transition-all hover:bg-[#8598cf] disabled:shadow-none">
								{isSavingExam ? "جاري الحفظ..." : "حفظ"}
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={isSchedulesViewerOpen} onOpenChange={setIsSchedulesViewerOpen}>
				<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
					<DialogHeader>
						<DialogTitle>المواعيد</DialogTitle>
						<DialogDescription>استعرض مواعيد يوم محدد لحلقة واحدة أو لجميع الحلقات.</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-2 md:grid-cols-[220px_1fr]">
						<div className="space-y-2">
							<Label>الحلقة</Label>
							<Select value={scheduleViewerCircle} onValueChange={setScheduleViewerCircle}>
								<SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value={ALL_CIRCLES}>جميع الحلقات</SelectItem>
									{circles.map((circle) => <SelectItem key={circle.id || circle.name} value={circle.name}>{circle.name}</SelectItem>)}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>التاريخ</Label>
							<Input type="date" value={scheduleViewerDate} onChange={(event) => setScheduleViewerDate(event.target.value)} className="bg-white" />
						</div>
					</div>
					<div className="rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm text-[#475569]">{getCircleLabel(scheduleViewerCircle)} - عدد المواعيد في هذا اليوم: {displayedSchedules.length}</div>
					<div className="overflow-x-auto rounded-2xl border border-[#e2e8f0]">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="text-right">الطالب</TableHead>
									<TableHead className="text-right">الحلقة</TableHead>
									<TableHead className="text-right">الاختبار</TableHead>
									<TableHead className="text-right">الحالة</TableHead>
									<TableHead className="text-right">الإجراء</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{displayedSchedules.length === 0 ? (
									<TableRow>
										<TableCell colSpan={5} className="py-10 text-center text-sm text-[#64748b]">لا توجد مواعيد في هذا التاريخ.</TableCell>
									</TableRow>
								) : displayedSchedules.map((schedule) => (
									<TableRow key={schedule.id}>
										<TableCell>{normalizeScheduleStudentRelation(schedule.students)?.name || "-"}</TableCell>
										<TableCell>{schedule.halaqah}</TableCell>
										<TableCell>{schedule.exam_portion_label}</TableCell>
										<TableCell>
											<Badge className={getScheduleStatusTone(schedule.status)}>{getScheduleStatusLabel(schedule.status)}</Badge>
										</TableCell>
										<TableCell>
											{schedule.status === "scheduled" ? (
												<Button variant="ghost" className="h-auto p-0 text-[#b91c1c] hover:bg-transparent hover:text-[#991b1b]" onClick={() => void cancelSchedule(schedule)}>إلغاء</Button>
											) : (
												<span className="text-sm text-[#94a3b8]">-</span>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setIsSchedulesViewerOpen(false)} className="rounded-xl border-[#3453a7]/30 px-5 py-2.5 text-sm font-semibold text-[#3453a7] hover:bg-[#f6f8fc]">إلغاء</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

				<Dialog open={isUntestedAlertsDialogOpen} onOpenChange={setIsUntestedAlertsDialogOpen}>
					<DialogContent className="sm:max-w-lg" dir="rtl">
						<DialogHeader>
							<DialogTitle className="text-right text-xl font-black text-[#1a2332]">الطلاب الذين عليهم أجزاء غير مختبرة</DialogTitle>
							<DialogDescription className="text-right text-sm text-[#64748b]">تظهر هنا أسماء الطلاب فقط ممن بقيت لهم أجزاء متاحة للاختبار ولم تُسجل لها نتيجة بعد.</DialogDescription>
						</DialogHeader>
						<div className="max-h-[60vh] overflow-y-auto rounded-2xl border border-[#e5ecfb] bg-[#fbfdff] p-3">
							{untestedExamAlerts.length === 0 ? (
								<div className="px-3 py-6 text-center text-sm font-medium text-[#64748b]">لا يوجد طلاب عليهم أجزاء غير مختبرة حاليًا.</div>
							) : (
								<div className="space-y-2">
									{untestedExamAlerts.map((alertRow) => (
										<button
											key={alertRow.studentId}
											type="button"
											onClick={() => {
												openExamForAlert(alertRow)
												setIsUntestedAlertsDialogOpen(false)
											}}
											className="flex w-full items-center justify-between rounded-2xl border border-[#dbe7ff] bg-white px-4 py-3 text-right text-[#1a2332] transition-colors hover:bg-[#f7faff]"
										>
											<span className="font-bold">{alertRow.studentName}</span>
											<span className="text-xs font-semibold text-[#64748b]">فتح الاختبار</span>
										</button>
									))}
								</div>
							)}
						</div>
					</DialogContent>
				</Dialog>

			<Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
				<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>إعدادات الاختبار</DialogTitle>
						<DialogDescription>تحكم بالإعدادات والقوالب من نفس النافذة.</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-2">
						<div className="inline-flex w-full rounded-full bg-[#eef3ff] p-1">
							<Button type="button" onClick={() => setSettingsSection("settings")} className={settingsSection === "settings" ? "flex-1 rounded-full bg-white text-[#1a2332] shadow-sm hover:bg-white" : "flex-1 rounded-full bg-transparent text-[#3453a7] shadow-none hover:bg-transparent"}>الإعدادات</Button>
							<Button type="button" onClick={() => setSettingsSection("templates")} className={settingsSection === "templates" ? "flex-1 rounded-full bg-white text-[#1a2332] shadow-sm hover:bg-white" : "flex-1 rounded-full bg-transparent text-[#3453a7] shadow-none hover:bg-transparent"}>القوالب</Button>
						</div>
						{settingsSection === "settings" ? (
							<div className="grid gap-4 rounded-[24px] border border-[#e7ecfa] bg-[#fbfcff] p-4 sm:p-5">
								<div className="grid gap-4 md:grid-cols-2">
									<div className="space-y-2"><Label>الدرجة الكاملة</Label><Input value={settingsForm.maxScore} onChange={(event) => setSettingsForm((current) => ({ ...current, maxScore: event.target.value }))} className="bg-white" /></div>
									<div className="space-y-2"><Label>خصم التنبيهات</Label><Input value={settingsForm.alertDeduction} onChange={(event) => setSettingsForm((current) => ({ ...current, alertDeduction: event.target.value }))} className="bg-white" /></div>
									<div className="space-y-2"><Label>خصم الأخطاء</Label><Input value={settingsForm.mistakeDeduction} onChange={(event) => setSettingsForm((current) => ({ ...current, mistakeDeduction: event.target.value }))} className="bg-white" /></div>
									<div className="space-y-2"><Label>درجة النجاح</Label><Input value={settingsForm.minPassingScore} onChange={(event) => setSettingsForm((current) => ({ ...current, minPassingScore: event.target.value }))} className="bg-white" /></div>
								</div>
								<div className="space-y-2">
									<Label>نمط الاختبار</Label>
									<Select value={settingsForm.portionMode} onValueChange={(value) => setSettingsForm((current) => ({ ...current, portionMode: value as ExamPortionType }))}>
										<SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
										<SelectContent>
												<SelectItem value="juz">بالأجزاء</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						) : (
							<div className="grid gap-4 rounded-[24px] border border-[#e7ecfa] bg-[#fbfcff] p-4 sm:p-5">
								<div className="flex items-center justify-between rounded-2xl border border-[#e7ecfa] bg-white px-4 py-3 text-sm text-[#475569]">
									<span className="font-semibold text-[#1a2332]">المتغيرات</span>
									<Tooltip>
										<TooltipTrigger asChild>
											<button type="button" className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-[#3453a7] to-[#4a67b7] text-sm font-bold text-white shadow-[0_10px_20px_-16px_rgba(52,83,167,0.5)]">!</button>
										</TooltipTrigger>
										<TooltipContent side="left">
											<div className="text-right leading-6">المتغيرات المتاحة: {'{name}'} و {'{portion}'} و {'{date}'} و {'{halaqah}'}</div>
										</TooltipContent>
									</Tooltip>
								</div>
								<div className="space-y-2"><Label>رسالة إنشاء موعد</Label><Textarea value={notificationTemplatesForm.create} onChange={(event) => setNotificationTemplatesForm((current) => ({ ...current, create: event.target.value }))} rows={3} className="bg-white" /></div>
								<div className="space-y-2"><Label>رسالة تعديل الموعد</Label><Textarea value={notificationTemplatesForm.update} onChange={(event) => setNotificationTemplatesForm((current) => ({ ...current, update: event.target.value }))} rows={3} className="bg-white" /></div>
								<div className="space-y-2"><Label>رسالة إلغاء الموعد</Label><Textarea value={notificationTemplatesForm.cancel} onChange={(event) => setNotificationTemplatesForm((current) => ({ ...current, cancel: event.target.value }))} rows={3} className="bg-white" /></div>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setIsSettingsDialogOpen(false)} className="rounded-xl border-[#3453a7]/30 px-5 py-2.5 text-sm font-semibold text-[#3453a7] hover:bg-[#f6f8fc]">إلغاء</Button>
						<Button onClick={() => void (settingsSection === "settings" ? saveSettings() : saveNotificationTemplates())} disabled={settingsSection === "settings" ? isSavingSettings : isSavingTemplates} className="rounded-xl bg-gradient-to-r from-[#3453a7] to-[#4a67b7] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_-18px_rgba(52,83,167,0.45)] transition-all hover:from-[#2f4b98] hover:to-[#4360ae] hover:shadow-[0_18px_34px_-18px_rgba(52,83,167,0.5)] disabled:shadow-none">حفظ</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
