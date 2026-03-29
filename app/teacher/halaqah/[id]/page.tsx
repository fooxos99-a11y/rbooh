"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, RotateCcw, MessageSquare, Check } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { useResumeRefresh } from "@/hooks/use-resume-refresh"
import { SiteLoader } from "@/components/ui/site-loader"
import { getClientAccountNumber, getClientAuthHeaders } from "@/lib/client-auth"
import { getActivePlanDayNumber, getPlanSessionContent, getPlanSessionContentRange, getPlanSupportSessionContent, resolvePlanTotalDays, resolvePlanTotalPages, SURAHS } from "@/lib/quran-data"
import { getSaudiAttendanceAnchorDate, getSaudiWeekday, isSaudiAttendanceWindowOpen } from "@/lib/saudi-time"
import {
	type AttendanceStatus,
	type EvaluationLevelValue,
	type NumericEvaluationLevel,
	getMemorizationEvaluationTextLabel,
	getMemorizationEvaluationOptions,
	isEvaluatedAttendance,
	isNonEvaluatedAttendance,
} from "@/lib/student-attendance"

type EvaluationLevel = EvaluationLevelValue
type EvaluationType = "hafiz" | "tikrar" | "samaa" | "rabet"
type ContentfulEvaluationType = "hafiz" | "samaa" | "rabet"

const UNSET_REPORT_EVALUATION = "__unset_report_evaluation__"

interface EvaluationContent {
	fromSurah?: string
	fromVerse?: string
	toSurah?: string
	toVerse?: string
	text?: string
}

type ReadingDetails = Partial<Record<ContentfulEvaluationType, EvaluationContent>>

interface EvaluationOption {
	hafiz?: EvaluationLevel
	tikrar?: EvaluationLevel
	samaa?: EvaluationLevel
	rabet?: EvaluationLevel
}

interface MemorizationEvaluationSelectOption {
	level: NumericEvaluationLevel
	label: string
}

const normalizeEvaluationLevel = (level: string | null | undefined): NumericEvaluationLevel => {
	switch (level) {
		case "excellent":
			return "10"
		case "very_good":
			return "8"
		case "good":
			return "6"
		case "not_completed":
		case null:
		case undefined:
			return "0"
		default:
			return /^(10|[0-9])$/.test(level) ? (level as NumericEvaluationLevel) : "0"
	}
}

const appendCurrentEvaluationOption = (
	options: readonly MemorizationEvaluationSelectOption[],
	level: string | null | undefined,
) => {
	if (!level || level === "null") return [...options]

	const normalizedLevel = normalizeEvaluationLevel(level)
	if (options.some((option) => option.level === normalizedLevel)) {
		return [...options]
	}

	return [
		{
			level: normalizedLevel,
			label: getMemorizationEvaluationTextLabel(level) || normalizedLevel,
		},
		...options,
	]
}

interface StudentDailyReport {
	id: string
	student_id: string
	report_date: string
	plan_session_number?: number | null
	memorization_done: boolean
	tikrar_done: boolean
	review_done: boolean
	linking_done: boolean
	notes?: string | null
	created_at?: string
	updated_at?: string
}

interface StudentAttendance {
	id: string
	name: string
	halaqah: string
	hasPlan: boolean
	plan?: StudentPlan | null
	completedDays?: number
	progressedDays?: number
	nextSessionNumber?: number
	failedSessionNumbers?: number[]
	reportSessionNumbersByDate?: Record<string, number>
	attendance: AttendanceStatus | null
	evaluation?: EvaluationOption
	reportEvaluations?: Record<string, EvaluationLevel>
	savedReportDates?: string[]
	readingDetails?: ReadingDetails
	planReadingDetails?: ReadingDetails
	selfReports?: StudentDailyReport[]
	notes?: string
	savedToday?: boolean
}

interface StudentPlan {
	id: string
	student_id: string
	start_surah_number: number
	start_surah_name: string
	start_verse?: number | null
	end_surah_number: number
	end_surah_name: string
	end_verse?: number | null
	daily_pages: number
	total_pages: number
	total_days: number
	start_date: string
	created_at?: string
	direction?: "asc" | "desc" | null
	has_previous?: boolean
	prev_start_surah?: number | null
	prev_start_verse?: number | null
	prev_end_surah?: number | null
	prev_end_verse?: number | null
	muraajaa_pages?: number | null
	rabt_pages?: number | null
	review_distribution_mode?: "fixed" | "weekly" | null
}

interface PlanProgressResponse {
	plan: StudentPlan | null
	completedDays?: number
	progressedDays?: number
	nextSessionNumber?: number
	failedSessionNumbers?: number[]
	reportSessionNumbersByDate?: Record<string, number>
	completedSessionNumbers?: number[]
	completedRecordsBySessionNumber?: Record<string, unknown>
	progressPercent?: number
	completedRecords?: unknown[]
}

interface SavedAttendanceRecord {
	student_id: string
	date?: string
	created_at?: string | null
	updated_at?: string | null
	status: AttendanceStatus
	hafiz_level?: EvaluationLevel
	tikrar_level?: EvaluationLevel
	samaa_level?: EvaluationLevel
	rabet_level?: EvaluationLevel
	hafiz_from_surah?: string | null
	hafiz_from_verse?: string | null
	hafiz_to_surah?: string | null
	hafiz_to_verse?: string | null
	samaa_from_surah?: string | null
	samaa_from_verse?: string | null
	samaa_to_surah?: string | null
	samaa_to_verse?: string | null
	rabet_from_surah?: string | null
	rabet_from_verse?: string | null
	rabet_to_surah?: string | null
	rabet_to_verse?: string | null
}

function getKsaDateString(baseDate = new Date()) {
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Riyadh",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})
	const parts = formatter.formatToParts(baseDate)
	const year = parts.find((part) => part.type === "year")?.value
	const month = parts.find((part) => part.type === "month")?.value
	const day = parts.find((part) => part.type === "day")?.value

	return `${year}-${month}-${day}`
}

const formatReadingDetails = (content?: EvaluationContent | null) => {
	if (!content) return ""
	if (content.text?.includes("ما عدا")) return content.text.trim()

	const fromSurah = content.fromSurah?.trim()
	const toSurah = content.toSurah?.trim()
	const fromVerse = content.fromVerse?.trim()
	const toVerse = content.toVerse?.trim()

	if (!fromSurah && !toSurah) return ""
	if (!toSurah || (fromSurah === toSurah && (!toVerse || fromVerse === toVerse))) {
		return fromVerse ? `${fromSurah} ${fromVerse}` : (fromSurah || "")
	}

	const fromLabel = fromVerse ? `${fromSurah} ${fromVerse}` : fromSurah
	const toLabel = toVerse ? `${toSurah} ${toVerse}` : toSurah
	return [fromLabel, toLabel].filter(Boolean).join(" - ")
}

const getPlanReadingDetails = (
	plan: StudentPlan | null,
	completedDays: number,
	nextSessionNumber?: number,
	failedSessionNumbers?: number[],
	progressedDays?: number,
): ReadingDetails => {
	if (!plan) return {}

	const totalDays = resolvePlanTotalDays(plan)
	const sortedFailedSessionNumbers = (failedSessionNumbers || []).filter((value) => value > 0).sort((left, right) => left - right)
	const retryStartSessionNumber = sortedFailedSessionNumbers[0]
	let retryEndSessionNumber = retryStartSessionNumber

	if (retryStartSessionNumber) {
		while (sortedFailedSessionNumbers.includes((retryEndSessionNumber || retryStartSessionNumber) + 1)) {
			retryEndSessionNumber = (retryEndSessionNumber || retryStartSessionNumber) + 1
		}
	}
	const activeSessionNumber = Math.max(
		1,
		Math.min(
			totalDays,
			retryStartSessionNumber || nextSessionNumber || getActivePlanDayNumber(totalDays, completedDays, plan.start_date, plan.created_at),
		),
	)
	const hafiz = retryStartSessionNumber
		? getPlanSessionContentRange(plan, retryStartSessionNumber, retryEndSessionNumber || retryStartSessionNumber)
		: getPlanSessionContent(plan, activeSessionNumber)
	const supportContent = getPlanSupportSessionContent(plan, progressedDays ?? completedDays, failedSessionNumbers) as {
		review?: EvaluationContent | null
		rabt?: EvaluationContent | null
	}
	const samaa = supportContent.review
	const rabet = supportContent.rabt

	return {
		...(hafiz ? { hafiz } : {}),
		...(samaa ? { samaa } : {}),
		...(rabet ? { rabet } : {}),
	}
}

const mergeSavedAttendance = (student: StudentAttendance, record?: SavedAttendanceRecord) => {
	if (!record) return student

	const savedReadingDetails: ReadingDetails = {
		...(record.hafiz_from_surah || record.hafiz_to_surah
			? {
				hafiz: {
					fromSurah: record.hafiz_from_surah || undefined,
					fromVerse: record.hafiz_from_verse || undefined,
					toSurah: record.hafiz_to_surah || undefined,
					toVerse: record.hafiz_to_verse || undefined,
					text: student.planReadingDetails?.hafiz?.text,
				},
			}
			: {}),
		...(record.samaa_from_surah || record.samaa_to_surah
			? {
				samaa: {
					fromSurah: record.samaa_from_surah || undefined,
					fromVerse: record.samaa_from_verse || undefined,
					toSurah: record.samaa_to_surah || undefined,
					toVerse: record.samaa_to_verse || undefined,
					text: student.planReadingDetails?.samaa?.text,
				},
			}
			: {}),
		...(record.rabet_from_surah || record.rabet_to_surah
			? {
				rabet: {
					fromSurah: record.rabet_from_surah || undefined,
					fromVerse: record.rabet_from_verse || undefined,
					toSurah: record.rabet_to_surah || undefined,
					toVerse: record.rabet_to_verse || undefined,
					text: student.planReadingDetails?.rabet?.text,
				},
			}
			: {}),
	}
	const hasSavedReadingDetails = Object.keys(savedReadingDetails).length > 0
	const hasPendingSelfReports = (student.selfReports || []).some(
		(report) => !(student.savedReportDates || []).includes(report.report_date),
	)
	const isLockedForToday =
		isNonEvaluatedAttendance(record.status) || (isEvaluatedAttendance(record.status) && !!record.hafiz_level)

	return {
		...student,
		attendance: record.status,
		evaluation: {
			hafiz: record.hafiz_level || undefined,
			tikrar: record.tikrar_level || undefined,
			samaa: record.samaa_level || undefined,
			rabet: record.rabet_level || undefined,
		},
		readingDetails: hasSavedReadingDetails ? savedReadingDetails : student.planReadingDetails,
		savedToday: hasPendingSelfReports ? false : isLockedForToday,
	}
}

const hasCompletePresentEvaluation = (student: StudentAttendance) => {
	if (!isEvaluatedAttendance(student.attendance)) return false
	if (!student.hasPlan) return false

	return !!student.evaluation?.hafiz
}

const isStudentReadyToSave = (student: StudentAttendance) => {
	if ((student.selfReports || []).length > 0) {
		return getSelectedUnsavedSelfReports(student).length > 0
	}
	if (student.savedToday || student.attendance === null) return false
	if (!isEvaluatedAttendance(student.attendance)) return false
	return hasCompletePresentEvaluation(student)
}

const formatExecutionDay = (date: string) =>
	new Date(`${date}T00:00:00+03:00`).toLocaleDateString("ar-SA", {
		weekday: "long",
	})

const isSaturdayReviewOnlyDate = (date: string) => new Date(`${date}T12:00:00+03:00`).getUTCDay() === 6

const getSaudiDayDifference = (targetDate: string, baseDate: string) => {
	const target = new Date(`${targetDate}T00:00:00+03:00`)
	const base = new Date(`${baseDate}T00:00:00+03:00`)
	return Math.round((base.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))
}

const normalizePlanSessionNumber = (value?: number | null) => {
	const parsed = Number(value)
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null
	}

	return Math.floor(parsed)
}

const getDisplayReportSessionNumbersByDate = (student: StudentAttendance) => {
	const explicitSessionNumbersByDate = Object.fromEntries(
		(student.selfReports || []).map((report) => [report.report_date, normalizePlanSessionNumber(report.plan_session_number)]),
	)
	const allDates = Array.from(
		new Set([
			...Object.keys(student.reportSessionNumbersByDate || {}),
			...(student.selfReports || []).map((report) => report.report_date),
		]),
	).sort((left, right) => left.localeCompare(right))
	const normalizedSessionNumbersByDate: Record<string, number> = {}
	const usedSessionNumbers = new Set<number>()
	let lastAssignedSessionNumber = 0

	allDates.forEach((date) => {
		const preferredSessionNumber = explicitSessionNumbersByDate[date] || normalizePlanSessionNumber(student.reportSessionNumbersByDate?.[date])

		if (
			preferredSessionNumber &&
			preferredSessionNumber > lastAssignedSessionNumber &&
			!usedSessionNumbers.has(preferredSessionNumber)
		) {
			normalizedSessionNumbersByDate[date] = preferredSessionNumber
			usedSessionNumbers.add(preferredSessionNumber)
			lastAssignedSessionNumber = preferredSessionNumber
			return
		}

		let fallbackSessionNumber = Math.max(1, lastAssignedSessionNumber + 1)
		while (usedSessionNumbers.has(fallbackSessionNumber)) {
			fallbackSessionNumber += 1
		}

		normalizedSessionNumbersByDate[date] = fallbackSessionNumber
		usedSessionNumbers.add(fallbackSessionNumber)
		lastAssignedSessionNumber = fallbackSessionNumber
	})

	return normalizedSessionNumbersByDate
}

const isRetrySessionNumber = (student: StudentAttendance, sessionNumber?: number | null) => {
	const normalizedSessionNumber = normalizePlanSessionNumber(sessionNumber)
	if (!normalizedSessionNumber) {
		return false
	}

	return (student.failedSessionNumbers || []).includes(normalizedSessionNumber)
}

const getReportEvaluationOptions = (student: StudentAttendance, reportDate: string, currentLevel?: string | null) => {
	const sessionNumber = getDisplayReportSessionNumbersByDate(student)[reportDate]
	const baseOptions = getMemorizationEvaluationOptions(isRetrySessionNumber(student, sessionNumber))
	return appendCurrentEvaluationOption(baseOptions, currentLevel)
}

const getReportMemorizationContent = (student: StudentAttendance, reportDate: string): EvaluationContent | null => {
    if (isSaturdayReviewOnlyDate(reportDate)) {
		return null
	}

	const matchingReport = student.selfReports?.find((report) => report.report_date === reportDate)
	if (matchingReport && !matchingReport.memorization_done) {
		return null
	}

	if (!student.plan) {
		return student.readingDetails?.hafiz || null
	}

	const totalDays = resolvePlanTotalDays(student.plan)
	const mappedSessionNumber = getDisplayReportSessionNumbersByDate(student)[reportDate]
	const fallbackActiveDayNum = getActivePlanDayNumber(
		totalDays,
		student.completedDays ?? 0,
		student.plan.start_date,
		student.plan.created_at,
	)
	const daysAgo = Math.max(0, getSaudiDayDifference(reportDate, getKsaDateString()))
	const sessionNum = Math.max(
		1,
		Math.min(totalDays, mappedSessionNumber || Math.max(1, fallbackActiveDayNum - daysAgo)),
	)
	const sessionContent = getPlanSessionContent(student.plan, sessionNum)

	return sessionContent
}

const getReportMemorizationSegment = (student: StudentAttendance, reportDate: string) => {
	const matchingReport = student.selfReports?.find((report) => report.report_date === reportDate)
	if (matchingReport && !matchingReport.memorization_done) {
		return "لا يوجد حفظ في هذا اليوم"
	}

	const content = getReportMemorizationContent(student, reportDate)
	return content?.text || formatReadingDetails(content) || "لا يوجد مقطع حفظ"
}

const deriveAutoLevel = (value: boolean) => (value ? "6" : "0") as EvaluationLevel

const buildAutoSupportEvaluationForReport = (report: StudentDailyReport) => ({
	tikrar: deriveAutoLevel(report.tikrar_done),
	samaa: deriveAutoLevel(report.review_done),
	rabet: deriveAutoLevel(report.linking_done),
})

const getUnsavedSelfReports = (student: StudentAttendance) => {
	const savedDates = new Set(student.savedReportDates || [])
	return (student.selfReports || []).filter((report) => !savedDates.has(report.report_date))
}

const getAttendanceAnchorLabel = (date: string) => {
	const effectiveDate = getSaudiAttendanceAnchorDate(date)
	return getSaudiWeekday(effectiveDate) === 0 ? "الأحد" : "الأربعاء"
}

const hasSelectedReportEvaluation = (student: StudentAttendance, reportDate: string) => {
	const selectedLevel = student.reportEvaluations?.[reportDate]
	return selectedLevel !== null && selectedLevel !== undefined && selectedLevel !== UNSET_REPORT_EVALUATION
}

const getSelectedUnsavedSelfReports = (student: StudentAttendance) => {
	return getUnsavedSelfReports(student).filter((report) => hasSelectedReportEvaluation(student, report.report_date))
}

const buildAutoSupportEvaluation = (reports?: StudentDailyReport[]) => {
	const safeReports = Array.isArray(reports) ? reports : []
	const hasTikrarExecution = safeReports.some((report) => report.tikrar_done)
	const hasReviewExecution = safeReports.some((report) => report.review_done)
	const hasLinkingExecution = safeReports.some((report) => report.linking_done)

	return {
		tikrar: deriveAutoLevel(hasTikrarExecution),
		samaa: deriveAutoLevel(hasReviewExecution),
		rabet: deriveAutoLevel(hasLinkingExecution),
	}
}

export default function HalaqahManagement() {
	const [isLoading, setIsLoading] = useState(true)
	const [isModeSwitchLoading, setIsModeSwitchLoading] = useState(false)
	const router = useRouter()
	const params = useParams()
	const isAttendanceEntryAllowedToday = isSaudiAttendanceWindowOpen()
	const todayKsaDate = getKsaDateString()
	const todayAttendanceAnchorDate = getSaudiAttendanceAnchorDate(todayKsaDate)
	const todayAttendanceAnchorLabel = getAttendanceAnchorLabel(todayKsaDate)

	const [teacherData, setTeacherData] = useState<any>(null)
	const [teacherHalaqah, setTeacherHalaqah] = useState("")
	const [students, setStudents] = useState<StudentAttendance[]>([])
	const [hasCircle, setHasCircle] = useState(true)
	const [isEditMode, setIsEditMode] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success">("idle")
	const [hasSavedToday, setHasSavedToday] = useState(false)
	const [notesStudentId, setNotesStudentId] = useState<string | null>(null)
	const [notesText, setNotesText] = useState("")
	const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)
	const [savingReportKeys, setSavingReportKeys] = useState<string[]>([])
	const [recentlySavedReportKeys, setRecentlySavedReportKeys] = useState<string[]>([])
	const studentsRef = useRef<StudentAttendance[]>([])
	const reportSuccessTimersRef = useRef<Record<string, number>>({})
	const fetchStudentsRequestIdRef = useRef(0)
	const cachedBaseStudentsRef = useRef<any[]>([])
	const cachedPlanMapRef = useRef<Map<string, PlanProgressResponse>>(new Map())
	const cachedHalaqahRef = useRef("")

	const showAlert = useAlertDialog()

	useEffect(() => {
		const loggedIn = localStorage.getItem("isLoggedIn") === "true"
		const userRole = localStorage.getItem("userRole")
		const accountNumber = getClientAccountNumber()
		const adminLikeRoles = ["admin", "مدير", "سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"]

		if (!loggedIn || !userRole || !accountNumber) {
			router.push("/login")
		} else if (adminLikeRoles.includes(userRole)) {
			router.replace("/")
		} else if (!["teacher", "deputy_teacher"].includes(userRole)) {
			router.push("/login")
		} else if (!isAttendanceEntryAllowedToday) {
			setIsLoading(false)
		} else {
			fetchTeacherData(accountNumber)
		}
	}, [isAttendanceEntryAllowedToday, router])

	useEffect(() => {
		if (!teacherHalaqah) return
		void fetchStudents(teacherHalaqah, isEditMode, { preferCachedBaseData: true })
	}, [teacherHalaqah, isEditMode])

	useResumeRefresh(
		() => {
			if (!teacherHalaqah) return
			void fetchStudents(teacherHalaqah, isEditMode)
		},
		{ enabled: Boolean(teacherHalaqah), minIntervalMs: 120000 },
	)

	useEffect(() => {
		studentsRef.current = students
	}, [students])

	useEffect(() => {
		return () => {
			Object.values(reportSuccessTimersRef.current).forEach((timerId) => {
				window.clearTimeout(timerId)
			})
		}
	}, [])

	const updateStudentsState = (updater: (current: StudentAttendance[]) => StudentAttendance[]) => {
		setStudents((current) => {
			const next = updater(current)
			studentsRef.current = next
			return next
		})
	}

	const getReportSaveKey = (studentId: string, reportDate: string) => `${studentId}:${reportDate}`

	const flashReportSaved = (reportKey: string) => {
		const activeTimer = reportSuccessTimersRef.current[reportKey]
		if (activeTimer) {
			window.clearTimeout(activeTimer)
		}

		setRecentlySavedReportKeys((current) => (current.includes(reportKey) ? current : [...current, reportKey]))

		reportSuccessTimersRef.current[reportKey] = window.setTimeout(() => {
			setRecentlySavedReportKeys((current) => current.filter((key) => key !== reportKey))
			delete reportSuccessTimersRef.current[reportKey]
		}, 900)
	}

	const updateStudentAfterReportSave = (studentId: string, reportDate: string, level: EvaluationLevel) => {
		updateStudentsState((current) =>
			current.map((student) => {
				if (student.id !== studentId) {
					return student
				}

				const nextSavedReportDates = Array.from(new Set([...(student.savedReportDates || []), reportDate]))
				const hasPendingSelfReports = (student.selfReports || []).some((report) => !nextSavedReportDates.includes(report.report_date))

				return {
					...student,
					reportEvaluations: {
						...(student.reportEvaluations || {}),
						[reportDate]: level,
					},
					savedReportDates: nextSavedReportDates,
					savedToday: hasPendingSelfReports ? student.savedToday : true,
				}
			}),
		)
	}

	const saveSingleReportEvaluation = async (studentId: string, reportDate: string, level: EvaluationLevel) => {
		const student = studentsRef.current.find((entry) => entry.id === studentId)
		const report = student?.selfReports?.find((entry) => entry.report_date === reportDate)

		if (!student || !report || !teacherData?.id || !teacherHalaqah) {
			return
		}

		const reportContent = getReportMemorizationContent(student, reportDate)
		const autoSupportEvaluation = buildAutoSupportEvaluationForReport(report)
		const reportKey = getReportSaveKey(studentId, reportDate)

		setSavingReportKeys((current) => (current.includes(reportKey) ? current : [...current, reportKey]))
		flashReportSaved(reportKey)

		try {
			const response = await fetch("/api/attendance", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
				body: JSON.stringify({
					student_id: student.id,
					teacher_id: teacherData.id,
					halaqah: teacherHalaqah,
					status: student.attendance,
					report_date: reportDate,
					hafiz_level: level,
					tikrar_level: autoSupportEvaluation.tikrar,
					samaa_level: autoSupportEvaluation.samaa,
					rabet_level: autoSupportEvaluation.rabet,
					hafiz_from_surah: reportContent?.fromSurah?.trim() || null,
					hafiz_from_verse: reportContent?.fromVerse?.trim() || null,
					hafiz_to_surah: reportContent?.toSurah?.trim() || null,
					hafiz_to_verse: reportContent?.toVerse?.trim() || null,
					notes: student.notes || null,
				}),
			})

			const data = await response.json().catch(() => ({}))
			if (!response.ok) {
				throw new Error(data.error || "حدث خطأ أثناء حفظ تقييم المقطع")
			}

			updateStudentAfterReportSave(studentId, reportDate, level)
		} catch (error) {
			setReportEvaluation(studentId, reportDate, student.reportEvaluations?.[reportDate])
			setRecentlySavedReportKeys((current) => current.filter((key) => key !== reportKey))
			delete reportSuccessTimersRef.current[reportKey]
			await showAlert(error instanceof Error ? error.message : "حدث خطأ أثناء حفظ تقييم المقطع", "خطأ")
		} finally {
			setSavingReportKeys((current) => current.filter((key) => key !== reportKey))
		}
	}

	const saveTodayEvaluation = async (studentId: string, level: EvaluationLevel) => {
		const student = studentsRef.current.find((entry) => entry.id === studentId)
		const directSaveKey = getReportSaveKey(studentId, todayKsaDate)

		if (!student || !teacherData?.id || !teacherHalaqah || !isEvaluatedAttendance(student.attendance)) {
			return
		}

		setSavingReportKeys((current) => (current.includes(directSaveKey) ? current : [...current, directSaveKey]))
		flashReportSaved(directSaveKey)

		try {
			const response = await fetch("/api/attendance", {
				method: "POST",
				headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
				body: JSON.stringify({
					student_id: student.id,
					teacher_id: teacherData.id,
					halaqah: teacherHalaqah,
					status: student.attendance,
					hafiz_level: level,
					tikrar_level: student.evaluation?.tikrar || "0",
					samaa_level: student.evaluation?.samaa || "0",
					rabet_level: student.evaluation?.rabet || "0",
					hafiz_from_surah: student.readingDetails?.hafiz?.fromSurah?.trim() || null,
					hafiz_from_verse: student.readingDetails?.hafiz?.fromVerse?.trim() || null,
					hafiz_to_surah: student.readingDetails?.hafiz?.toSurah?.trim() || null,
					hafiz_to_verse: student.readingDetails?.hafiz?.toVerse?.trim() || null,
					samaa_from_surah: student.readingDetails?.samaa?.fromSurah?.trim() || null,
					samaa_from_verse: student.readingDetails?.samaa?.fromVerse?.trim() || null,
					samaa_to_surah: student.readingDetails?.samaa?.toSurah?.trim() || null,
					samaa_to_verse: student.readingDetails?.samaa?.toVerse?.trim() || null,
					rabet_from_surah: student.readingDetails?.rabet?.fromSurah?.trim() || null,
					rabet_from_verse: student.readingDetails?.rabet?.fromVerse?.trim() || null,
					rabet_to_surah: student.readingDetails?.rabet?.toSurah?.trim() || null,
					rabet_to_verse: student.readingDetails?.rabet?.toVerse?.trim() || null,
					notes: student.notes || null,
				}),
			})

			const data = await response.json().catch(() => ({}))
			if (!response.ok) {
				throw new Error(data.error || "حدث خطأ أثناء تحديث تقييم اليوم")
			}

			updateStudentsState((current) =>
				current.map((entry) =>
					entry.id === studentId
						? {
								...entry,
								evaluation: { ...(entry.evaluation || {}), hafiz: level },
								savedToday: true,
							}
						: entry,
				),
			)
		} catch (error) {
			setRecentlySavedReportKeys((current) => current.filter((key) => key !== directSaveKey))
			delete reportSuccessTimersRef.current[directSaveKey]
			await showAlert(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث تقييم اليوم", "خطأ")
		} finally {
			setSavingReportKeys((current) => current.filter((key) => key !== directSaveKey))
		}
	}

	const handleReportEvaluationChange = async (studentId: string, reportDate: string, level?: EvaluationLevel) => {
		const previousLevel = studentsRef.current.find((student) => student.id === studentId)?.reportEvaluations?.[reportDate]
		setReportEvaluation(studentId, reportDate, level)

		if (!level) {
			return
		}

		try {
			await saveSingleReportEvaluation(studentId, reportDate, level)
		} catch {
			setReportEvaluation(studentId, reportDate, previousLevel)
		}
	}

	const fetchTeacherData = async (accountNumber: string) => {
		try {
			const response = await fetch(`/api/teachers?account_number=${accountNumber}`, { cache: "no-store" })
			if (!response.ok) {
				throw new Error(`Failed to load teacher: ${response.status}`)
			}
			const data = await response.json()

			if (data.teachers && data.teachers.length > 0) {
				const teacher = data.teachers[0]
				const teacherHalaqah = (teacher.halaqah || teacher.circle_name || "").trim()
				setTeacherData(teacher)

				if (teacherHalaqah) {
					setHasCircle(true)
					setTeacherHalaqah(teacherHalaqah)
					setTeacherData({ ...teacher, halaqah: teacherHalaqah })
				} else {
					setTeacherHalaqah("")
					setHasCircle(false)
					setIsLoading(false)
				}
			} else {
				router.push("/login")
			}
		} catch (error) {
			console.error("Error fetching teacher data:", error)
			router.push("/login")
		}
	}

	const loadSavedStudentsForToday = async (halaqah: string, baseStudents?: StudentAttendance[]) => {
		try {
			const response = await fetch(
				`/api/attendance-by-date?date=${getKsaDateString()}&circle=${encodeURIComponent(halaqah)}`,
				{ cache: "no-store", headers: getClientAuthHeaders() },
			)
			const data = await response.json()
			const records: SavedAttendanceRecord[] = Array.isArray(data.records) ? data.records : []
			const savedMap = new Map(records.map((record) => [record.student_id, record] as const))

			const applySavedState = (list: StudentAttendance[]) =>
				list.map((student) => mergeSavedAttendance(student, savedMap.get(student.id)))

			return applySavedState(baseStudents ?? studentsRef.current)
		} catch (error) {
			console.error("Error loading saved attendance for today:", error)
		}
	}

	const fetchStudents = async (halaqah: string, editMode = isEditMode, options?: { preferCachedBaseData?: boolean }) => {
		const requestId = ++fetchStudentsRequestIdRef.current
		try {
			const shouldUseCachedBaseData =
				options?.preferCachedBaseData === true &&
				cachedHalaqahRef.current === halaqah &&
				cachedBaseStudentsRef.current.length > 0

			const data = shouldUseCachedBaseData
				? { students: cachedBaseStudentsRef.current }
				: await (async () => {
					const response = await fetch(`/api/students?circle=${encodeURIComponent(halaqah)}`)
					return response.json()
				})()

			if (data.students) {
				const rawStudents = data.students as any[]
				const studentIds = rawStudents.map((student: any) => student.id).filter(Boolean)
				let planMap = shouldUseCachedBaseData ? new Map(cachedPlanMapRef.current) : new Map<string, PlanProgressResponse>()

				if (!shouldUseCachedBaseData && studentIds.length > 0) {
					try {
						const planResponse = await fetch(
							`/api/student-plans?student_ids=${encodeURIComponent(studentIds.join(","))}`,
							{ cache: "no-store", headers: getClientAuthHeaders() },
						)
						const planJson = await planResponse.json().catch(() => ({}))

						if (planResponse.ok && planJson.plansByStudent) {
							planMap = new Map<string, PlanProgressResponse>(
								Object.entries(planJson.plansByStudent as Record<string, PlanProgressResponse>),
							)
							cachedBaseStudentsRef.current = rawStudents
							cachedPlanMapRef.current = new Map(planMap)
							cachedHalaqahRef.current = halaqah
						}
					} catch (planError) {
						console.error("Error fetching batched student plans:", planError)
					}
				} else if (!shouldUseCachedBaseData) {
					cachedBaseStudentsRef.current = rawStudents
					cachedPlanMapRef.current = new Map(planMap)
					cachedHalaqahRef.current = halaqah
				}
				let reportsByStudent: Record<string, StudentDailyReport[]> = {}
				let savedReportEvaluationMap: Record<string, Record<string, EvaluationLevel>> = {}
				let savedReportDatesMap: Record<string, string[]> = {}
				let savedRecordsByStudent: Record<string, SavedAttendanceRecord[]> = {}

				if (studentIds.length > 0) {
					try {
						if (editMode) {
							const [reportsResponse, savedTodayResponse] = await Promise.all([
								fetch(
									`/api/student-daily-reports?student_ids=${encodeURIComponent(studentIds.join(","))}&exclude_today=true&skip_memorization_off_days=true&days=14`,
									{ cache: "no-store" },
								),
								fetch(
									`/api/attendance-by-date?date=${todayKsaDate}&circle=${encodeURIComponent(halaqah)}`,
									{ cache: "no-store", headers: getClientAuthHeaders() },
								),
							])

							const reportsData = await reportsResponse.json().catch(() => ({}))
							const savedTodayData = await savedTodayResponse.json().catch(() => ({}))
							const savedTodayRecords: SavedAttendanceRecord[] = Array.isArray(savedTodayData.records)
								? savedTodayData.records.filter(
									(record: SavedAttendanceRecord) =>
										isEvaluatedAttendance(record.status) && !!record.hafiz_level && studentIds.includes(record.student_id),
								)
								: []

							savedRecordsByStudent = savedTodayRecords.reduce<Record<string, SavedAttendanceRecord[]>>((acc, record) => {
								if (!acc[record.student_id]) {
									acc[record.student_id] = []
								}
								acc[record.student_id].push(record)
								return acc
							}, {})

							if (reportsResponse.ok && reportsData.reportsByStudent) {
								const rawReportsByStudent = reportsData.reportsByStudent as Record<string, StudentDailyReport[]>

								savedReportDatesMap = Object.fromEntries(
									Object.entries(rawReportsByStudent).map(([currentStudentId, reports]) => {
										const savedAnchorDates = new Set(
											(savedRecordsByStudent[currentStudentId] || [])
												.map((record) => record.date)
												.filter((value): value is string => !!value),
										)
										return [
											currentStudentId,
											reports
												.filter((report) => savedAnchorDates.has(getSaudiAttendanceAnchorDate(report.report_date)))
												.map((report) => report.report_date)
												.sort((left, right) => left.localeCompare(right)),
										]
									}),
								)

								savedReportEvaluationMap = Object.fromEntries(
									Object.entries(rawReportsByStudent).map(([currentStudentId, reports]) => {
										const recordsByAnchorDate = new Map(
											(savedRecordsByStudent[currentStudentId] || [])
												.filter((record) => !!record.date && !!record.hafiz_level)
												.map((record) => [record.date as string, record.hafiz_level as EvaluationLevel] as const),
										)

										return [
											currentStudentId,
											Object.fromEntries(
												reports
													.map((report) => [report.report_date, recordsByAnchorDate.get(getSaudiAttendanceAnchorDate(report.report_date))] as const)
													.filter((entry): entry is [string, EvaluationLevel] => !!entry[1]),
											),
										]
									}),
								)

								reportsByStudent = Object.fromEntries(
									Object.entries(rawReportsByStudent).map(([currentStudentId, reports]) => [
										currentStudentId,
										reports.filter((report) => (savedReportDatesMap[currentStudentId] || []).includes(report.report_date)),
									]),
								)
							}
						} else {
							const reportsResponse = await fetch(
								`/api/student-daily-reports?student_ids=${encodeURIComponent(studentIds.join(","))}&exclude_today=true&skip_memorization_off_days=true&pending_only=true`,
								{ cache: "no-store" },
							)
							const reportsData = await reportsResponse.json()
							if (reportsResponse.ok && reportsData.reportsByStudent) {
								reportsByStudent = reportsData.reportsByStudent
							}
						}
					} catch (reportsError) {
						console.error(editMode ? "Error fetching edit-mode student reports:" : "Error fetching student daily reports:", reportsError)
					}
				}

				const localStudentsMap = new Map(studentsRef.current.map((student) => [student.id, student] as const))

				const mappedStudents: StudentAttendance[] = rawStudents.map((student: any) => {
							const planData = planMap.get(student.id)
							const planReadingDetails = getPlanReadingDetails(planData?.plan ?? null, planData?.completedDays ?? 0, planData?.nextSessionNumber, planData?.failedSessionNumbers, planData?.progressedDays)
					const localStudent = localStudentsMap.get(student.id)
					const latestSavedRecord = (savedRecordsByStudent[student.id] || [])[0]
					const hasUnsavedLocalChanges = !editMode && !!localStudent && !localStudent.savedToday
					const selfReports = (reportsByStudent[student.id] || []).filter((report) => report.memorization_done)
					const savedReportDates = savedReportDatesMap[student.id] || []
					const allReportDatesSaved = selfReports.length > 0 ? selfReports.every((report) => savedReportDates.includes(report.report_date)) : !!latestSavedRecord
					const baseReportEvaluations = hasUnsavedLocalChanges
						? { ...(savedReportEvaluationMap[student.id] || {}), ...(localStudent.reportEvaluations || {}) }
						: savedReportEvaluationMap[student.id] || {}
					const reportEvaluations = { ...baseReportEvaluations }

					const baseStudent: StudentAttendance = {
						id: student.id,
						name: student.name,
						halaqah: student.circle_name || halaqah,
						hasPlan: !!planData?.plan,
						plan: planData?.plan ?? null,
						completedDays: planData?.completedDays ?? 0,
						progressedDays: planData?.progressedDays ?? planData?.completedDays ?? 0,
								nextSessionNumber: planData?.nextSessionNumber,
						failedSessionNumbers: planData?.failedSessionNumbers ?? [],
								reportSessionNumbersByDate: planData?.reportSessionNumbersByDate ?? {},
						attendance: hasUnsavedLocalChanges ? localStudent.attendance : null,
						evaluation: hasUnsavedLocalChanges ? localStudent.evaluation || {} : {},
						reportEvaluations,
						savedReportDates,
						readingDetails: hasUnsavedLocalChanges ? localStudent.readingDetails || planReadingDetails : planReadingDetails,
						planReadingDetails,
						selfReports,
						notes: hasUnsavedLocalChanges ? localStudent.notes : undefined,
						savedToday: allReportDatesSaved,
					}

					return editMode && latestSavedRecord ? mergeSavedAttendance(baseStudent, latestSavedRecord) : baseStudent
				})
				const nextStudents = editMode ? mappedStudents : (await loadSavedStudentsForToday(halaqah, mappedStudents)) ?? mappedStudents
				const eligibleStudents = nextStudents.filter((student) => {
					if (editMode) {
						return (student.selfReports || []).length > 0 || (student.savedToday && isEvaluatedAttendance(student.attendance))
					}

					return isEvaluatedAttendance(student.attendance) && (student.selfReports || []).length > 0
				})
				if (requestId !== fetchStudentsRequestIdRef.current) {
					return
				}
				studentsRef.current = eligibleStudents
				setStudents(eligibleStudents)
				setHasSavedToday(eligibleStudents.some((student) => student.savedToday))
			}
			if (requestId === fetchStudentsRequestIdRef.current) {
				setIsLoading(false)
				setIsModeSwitchLoading(false)
			}
		} catch (error) {
			console.error("Error fetching students:", error)
			if (requestId === fetchStudentsRequestIdRef.current) {
				setIsLoading(false)
				setIsModeSwitchLoading(false)
			}
		}
	}

	const handleToggleEditMode = () => {
		setIsModeSwitchLoading(true)
		setIsEditMode((current) => !current)
	}

	if (isLoading || isModeSwitchLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<SiteLoader size="lg" />
			</div>
		)
	}

	if (!isAttendanceEntryAllowedToday) {
		return (
			<div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
				<Header />
				<main className="flex-1 py-4 px-4">
					<div className="container mx-auto max-w-7xl">
						<div className="flex flex-col items-center justify-center min-h-[400px] text-center">
							<h1 className="text-3xl font-bold text-[#1a2332]">إدارة الحلقة متاحة يوم الأحد ويوم الأربعاء فقط</h1>
						</div>
					</div>
				</main>
				<Footer />
			</div>
		)
	}

	if (!hasCircle || !teacherHalaqah) {
		return (
			<div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
				<Header />
				<main className="flex-1 py-4 px-4">
					<div className="container mx-auto max-w-7xl">
						<div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
							<h1 className="text-3xl font-bold text-[#1a2332]">لا يوجد لديك حلقة</h1>
							<p className="text-lg text-[#1a2332]/70">الرجاء التواصل مع الإدارة لتعيين حلقة لك</p>
							<Button onClick={() => router.push("/teacher/dashboard")} className="mt-4">
								<ArrowRight className="w-5 h-5 ml-2" />
								العودة إلى لوحة التحكم
							</Button>
						</div>
					</div>
				</main>
				<Footer />
			</div>
		)
	}

	const toggleAttendance = (id: string, status: AttendanceStatus) => {
		const student = students.find((s) => s.id === id)
		if ((student?.savedToday && !isEditMode) || !student?.hasPlan) return

		updateStudentsState((current) =>
			current.map((s) =>
				s.id === id
					? {
							...s,
							attendance: status,
							evaluation:
								isNonEvaluatedAttendance(status)
									? {}
									: s.hasPlan
										? s.evaluation
										: { ...s.evaluation, hafiz: "0" },
							readingDetails: s.planReadingDetails || s.readingDetails,
						}
					: s,
			),
		)
	}

	const setEvaluation = (studentId: string, type: EvaluationType, level: EvaluationLevel) => {
		const student = students.find((s) => s.id === studentId)
		if ((student?.savedToday && !isEditMode) || (type === "hafiz" && !student?.hasPlan)) return

		updateStudentsState((current) =>
			current.map((s) =>
				s.id === studentId
					? {
							...s,
							evaluation: { ...s.evaluation, [type]: level },
						}
					: s,
			),
		)
	}

	const setReportEvaluation = (studentId: string, reportDate: string, level?: EvaluationLevel) => {
		updateStudentsState((current) =>
			current.map((student) =>
				student.id === studentId
					? {
							...student,
							reportEvaluations: (() => {
								const nextReportEvaluations = { ...(student.reportEvaluations || {}) }
								if (level === null || level === undefined) {
									delete nextReportEvaluations[reportDate]
								} else {
									nextReportEvaluations[reportDate] = level
								}
								return nextReportEvaluations
							})(),
						}
					: student,
			),
		)
	}

	const handleReset = () => {
		updateStudentsState((current) =>
			current.map((s) =>
				s.savedToday && !isEditMode
					? s
					: {
							...s,
							evaluation: {},
							reportEvaluations: Object.fromEntries(
								Object.entries(s.reportEvaluations || {}).filter(([date]) => (s.savedReportDates || []).includes(date)),
							),
							readingDetails: s.planReadingDetails || {},
						},
			),
		)
	}

	const handleSave = async () => {
		const refreshedStudents = ((await loadSavedStudentsForToday(teacherHalaqah, students)) ?? students).filter(
			(student) => isEvaluatedAttendance(student.attendance) && (student.selfReports || []).length > 0,
		)

		const studentsToSave = refreshedStudents.filter(isStudentReadyToSave)
		const hasIncompletePresentStudents = refreshedStudents.some(
			(student) =>
				(student.selfReports || []).length > 0
					? false
					: !student.savedToday && isEvaluatedAttendance(student.attendance) && !hasCompletePresentEvaluation(student),
		)

		if (studentsToSave.length === 0) {
			await showAlert(
				hasIncompletePresentStudents
					? "يجب تقييم الحفظ للطالب الحاضر أو المتأخر قبل الحفظ."
					: "لا توجد مقاطع محددة بتقييم للحفظ",
				"تحذير",
			)
			return
		}

		const allPresentsEvaluated = studentsToSave.every((student) =>
			(student.selfReports || []).length > 0 ? getSelectedUnsavedSelfReports(student).length > 0 : !isEvaluatedAttendance(student.attendance) || hasCompletePresentEvaluation(student),
		)

		if (!allPresentsEvaluated) {
			await showAlert("لم يتم تقييم الحفظ لجميع الطلاب الحاضرين أو المتأخرين. أكمل تقييم الحفظ قبل الحفظ النهائي", "تحذير")
			return
		}

		setIsSaving(true)
		setSaveStatus("saving")

		try {
			const nestedSaveResults = await Promise.all(
				studentsToSave.map(async (student) => {
					if ((student.selfReports || []).length > 0) {
						const unsavedReports = getSelectedUnsavedSelfReports(student)
						return Promise.all(
							unsavedReports.map(async (report) => {
								const reportContent = getReportMemorizationContent(student, report.report_date)
								const autoSupportEvaluation = buildAutoSupportEvaluationForReport(report)
								const response = await fetch("/api/attendance", {
									method: "POST",
									headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
									body: JSON.stringify({
										student_id: student.id,
										teacher_id: teacherData.id,
										halaqah: teacherHalaqah,
										status: student.attendance,
										report_date: report.report_date,
										hafiz_level: student.reportEvaluations?.[report.report_date],
										tikrar_level: autoSupportEvaluation.tikrar,
										samaa_level: autoSupportEvaluation.samaa,
										rabet_level: autoSupportEvaluation.rabet,
										hafiz_from_surah: reportContent?.fromSurah?.trim() || null,
										hafiz_from_verse: reportContent?.fromVerse?.trim() || null,
										hafiz_to_surah: reportContent?.toSurah?.trim() || null,
										hafiz_to_verse: reportContent?.toVerse?.trim() || null,
										notes: student.notes || null,
									}),
								})
								const data = await response.json().catch(() => ({}))
								return {
									ok: response.ok,
									status: response.status,
									studentId: student.id,
									reportDate: report.report_date,
									data,
								}
							}),
						)
					}

					const autoSupportEvaluation = buildAutoSupportEvaluation(student.selfReports)
					const requestBody: any = {
						student_id: student.id,
						teacher_id: teacherData.id,
						halaqah: teacherHalaqah,
						status: student.attendance,
						hafiz_level: "0",
						tikrar_level: "0",
						samaa_level: "0",
						rabet_level: "0",
						hafiz_from_surah: null,
						hafiz_from_verse: null,
						hafiz_to_surah: null,
						hafiz_to_verse: null,
						samaa_from_surah: null,
						samaa_from_verse: null,
						samaa_to_surah: null,
						samaa_to_verse: null,
						rabet_from_surah: null,
						rabet_from_verse: null,
						rabet_to_surah: null,
						rabet_to_verse: null,
						notes: student.notes || null,
					}

					if (isEvaluatedAttendance(student.attendance) && student.evaluation) {
						requestBody.hafiz_level = student.evaluation.hafiz || "0"
						requestBody.tikrar_level = autoSupportEvaluation.tikrar
						requestBody.samaa_level = autoSupportEvaluation.samaa
						requestBody.rabet_level = autoSupportEvaluation.rabet
						requestBody.hafiz_from_surah = student.readingDetails?.hafiz?.fromSurah?.trim() || null
						requestBody.hafiz_from_verse = student.readingDetails?.hafiz?.fromVerse?.trim() || null
						requestBody.hafiz_to_surah = student.readingDetails?.hafiz?.toSurah?.trim() || null
						requestBody.hafiz_to_verse = student.readingDetails?.hafiz?.toVerse?.trim() || null
						requestBody.samaa_from_surah = student.readingDetails?.samaa?.fromSurah?.trim() || null
						requestBody.samaa_from_verse = student.readingDetails?.samaa?.fromVerse?.trim() || null
						requestBody.samaa_to_surah = student.readingDetails?.samaa?.toSurah?.trim() || null
						requestBody.samaa_to_verse = student.readingDetails?.samaa?.toVerse?.trim() || null
						requestBody.rabet_from_surah = student.readingDetails?.rabet?.fromSurah?.trim() || null
						requestBody.rabet_from_verse = student.readingDetails?.rabet?.fromVerse?.trim() || null
						requestBody.rabet_to_surah = student.readingDetails?.rabet?.toSurah?.trim() || null
						requestBody.rabet_to_verse = student.readingDetails?.rabet?.toVerse?.trim() || null
					}

					const response = await fetch("/api/attendance", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(requestBody),
					})
					const data = await response.json().catch(() => ({}))

					return {
						ok: response.ok,
						status: response.status,
						studentId: student.id,
						data,
					}
				}),
			)
			const saveResults = nestedSaveResults.flat()

			const blockingError = saveResults.find((result) => !result.ok && result.status !== 409)
			if (blockingError) {
				throw new Error(blockingError.data?.error || "حدث خطأ أثناء حفظ البيانات")
			}

			await fetchStudents(teacherHalaqah, isEditMode)

			const successfulSavesCount = saveResults.filter((result) => result.ok).length
			const duplicateSavesCount = saveResults.filter((result) => result.status === 409).length

			if (successfulSavesCount > 0) {
				setSaveStatus("success")
				if (duplicateSavesCount > 0) {
					await showAlert("تم حفظ الطلاب الجدد فقط.", "نجاح")
				} else {
					await showAlert("تم حفظ البيانات بنجاح!", "نجاح")
				}
			} else if (duplicateSavesCount > 0) {
				setSaveStatus("idle")
				await showAlert("بعض الأيام محفوظة مسبقًا ولا يمكن حفظها مرة أخرى.", "تنبيه")
			}

			setTimeout(() => {
				setSaveStatus("idle")
				setIsSaving(false)
			}, 500)
		} catch (error) {
			console.error("Error saving data:", error)
			setSaveStatus("idle")
			setIsSaving(false)
			await showAlert("حدث خطأ أثناء حفظ البيانات", "خطأ")
		}
	}

	const markAllPresent = () => {
		updateStudentsState((current) =>
			current.map((s) =>
				s.savedToday && !isEditMode
					? s
					: !s.hasPlan
						? { ...s, attendance: null, evaluation: {}, readingDetails: s.planReadingDetails || {} }
						: { ...s, attendance: "present", evaluation: s.evaluation || {}, readingDetails: s.planReadingDetails || {} },
			),
		)
	}

	const markAllAbsent = () => {
		updateStudentsState((current) =>
			current.map((s) =>
				s.savedToday && !isEditMode
					? s
					: !s.hasPlan
						? { ...s, attendance: null, evaluation: {}, readingDetails: s.planReadingDetails || {} }
						: { ...s, attendance: "absent", evaluation: {}, readingDetails: s.planReadingDetails || {} },
			),
		)
	}

	const openNotesDialog = (studentId: string) => {
		const student = students.find((s) => s.id === studentId)
		if (student?.savedToday && !isEditMode) return
		setNotesStudentId(studentId)
		setNotesText(student?.notes || "")
		setIsNotesDialogOpen(true)
	}

	const saveNotes = () => {
		if (notesStudentId !== null) {
			updateStudentsState((current) => current.map((s) => (s.id === notesStudentId ? { ...s, notes: notesText } : s)))
		}
		setIsNotesDialogOpen(false)
	}

	const halaqahName = teacherHalaqah || teacherData?.halaqah || "الحلقة"
	const savedStudentsCount = students.filter((student) => student.savedToday).length
	const hasPendingStudents = students.some(isStudentReadyToSave)
	const getDirectTodayEvaluationOptions = (student: StudentAttendance) =>
		appendCurrentEvaluationOption(
			getMemorizationEvaluationOptions(!!student.failedSessionNumbers?.length),
			student.evaluation?.hafiz,
		)

	const EvaluationOption = ({
		studentId,
		type,
		label,
	}: {
		studentId: string
		type: EvaluationType
		label: string
	}) => {
		const student = students.find((s) => s.id === studentId)
		const currentLevel = student?.evaluation?.[type] || null
		const evaluationOptions = appendCurrentEvaluationOption(
			getMemorizationEvaluationOptions(type === "hafiz" && !!student?.failedSessionNumbers?.length),
			currentLevel,
		)
		const currentDetails =
			type === "hafiz" || type === "samaa" || type === "rabet" ? student?.readingDetails?.[type] : null
		const showsReadingFields = type === "hafiz" || type === "samaa" || type === "rabet"
		const readingSummary = formatReadingDetails(currentDetails)
		const emptyReadingMessage =
			type === "samaa"
				? "لا يوجد لديه مراجعة لليوم"
				: type === "rabet"
					? "لا يوجد لديه ربط لليوم"
					: "لا يوجد لديه حفظ لليوم"
		const isSavedLocked = !!student?.savedToday && !isEditMode
		const isHafizLocked = type === "hafiz" && !student?.hasPlan
		const isDisabled = isSavedLocked || isHafizLocked
		const currentLevelValue = currentLevel ? normalizeEvaluationLevel(currentLevel) : undefined
		const currentLevelLabel = currentLevelValue
			? evaluationOptions.find((option) => option.level === currentLevelValue)?.label || "اختر التقييم"
			: "اختر التقييم"
		const scoreSelector = (
			<div className="w-full sm:max-w-[136px] shrink-0">
				<Select
					value={currentLevelValue}
					onValueChange={(value) => setEvaluation(studentId, type, value as EvaluationLevel)}
					disabled={isDisabled}
				>
					<SelectTrigger className="h-9 rounded-xl border-[#3453a7]/30 bg-white px-2.5 text-[12px] font-semibold leading-4 text-[#1a2332] shadow-none [&>span]:leading-4 focus:ring-[#3453a7]/20" dir="rtl">
						<SelectValue>{currentLevelLabel}</SelectValue>
					</SelectTrigger>
					<SelectContent dir="rtl">
						{evaluationOptions.map((option) => (
							<SelectItem key={`${studentId}-${type}-${option.level}`} value={option.level} className="text-right text-sm">
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		)

		return (
			<div
				className={`space-y-2 rounded-lg border px-3 py-2 ${
					isSavedLocked
						? "border-[#3453a7]/25 bg-[#eef4ff]/80 opacity-80"
						: isHafizLocked
							? "border-[#3453a7]/18 bg-[#f5f8ff]/75 opacity-75"
							: "border-[#3453a7]/15 bg-[#fafdff]"
				}`}
			>
				{showsReadingFields && !isHafizLocked ? (
					<div className="flex flex-col gap-2 lg:flex-row-reverse lg:items-start lg:justify-between">
						<div className="flex-1 text-right">
							<div className="text-base font-semibold text-[#1a2332]">{label}</div>
							<div className={`mt-1 text-base ${readingSummary ? "font-semibold text-[#0f766e]" : "text-[#4d6b76]"}`}>
								{readingSummary || emptyReadingMessage}
							</div>
						</div>
						{scoreSelector}
					</div>
				) : (
					<>
						<div className="text-right text-base font-semibold text-[#1a2332]">{label}</div>
						{scoreSelector}
					</>
				)}
			</div>
		)
	}

	return (
		<div className="min-h-screen flex flex-col bg-gradient-to-br from-[#eef6f8] via-white to-[#f3f7ff]">
			<Header />
			<main className="flex-1 py-4 px-4">
				<div className="container mx-auto max-w-7xl space-y-6">
					<div className="rounded-2xl border border-[#3453a7]/12 bg-white/85 px-4 py-3 text-right text-sm font-semibold text-[#4d6b76] shadow-sm">
						تقييم اليوم يُحتسب على {todayAttendanceAnchorLabel} ({todayAttendanceAnchorDate}).
					</div>
					<section className="rounded-[32px] border border-[#3453a7]/15 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
						<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
							<div className="text-right">
								<p className="text-sm font-extrabold tracking-[0.18em] text-[#3453a7]">إدارة الحلقة</p>
								<h1 className="mt-2 text-4xl font-black text-[#1a2332]">{halaqahName}</h1>
							</div>
							<Button
								type="button"
								variant={isEditMode ? "default" : "outline"}
								className={isEditMode ? "bg-[#3453a7] text-white hover:bg-[#27428d]" : "border-[#3453a7]/35 text-[#1a2332] hover:bg-[#3453a7]/8"}
								onClick={handleToggleEditMode}
								disabled={isModeSwitchLoading}
							>
								{isModeSwitchLoading ? "جاري التحميل..." : isEditMode ? "إلغاء التعديل" : "تعديل"}
							</Button>
						</div>
					</section>

					{students.length === 0 ? (
						<div className="rounded-[28px] border border-[#3453a7]/15 bg-white/90 px-6 py-12 text-center shadow-sm">
							<p className="text-lg font-bold text-[#1a2332]">{isEditMode ? "لاتوجد تقارير للتسميع" : "لا توجد مقاطع للتسميع"}</p>
						</div>
					) : (
						<>
							<div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
								{students.map((student) => {
									const isNoPlanLocked = !student.savedToday && !student.hasPlan
									const shouldShowReportEvaluations = (student.selfReports || []).length > 0
									const shouldShowDirectTodayEvaluation =
										isEditMode &&
										student.savedToday &&
										!shouldShowReportEvaluations &&
										isEvaluatedAttendance(student.attendance)
									const shouldExpandCard =
										student.savedToday ||
										student.attendance !== null ||
										shouldShowReportEvaluations ||
										shouldShowDirectTodayEvaluation ||
										Boolean(student.notes) ||
										isNoPlanLocked

									return (
										<Card
											key={student.id}
											className={`overflow-hidden rounded-[20px] border shadow-[0_18px_42px_-34px_rgba(52,83,167,0.24)] transition-all ${
												student.savedToday && !isEditMode
													? "border-[#3453a7]/25 bg-[#eef4ff]/90 opacity-80 pointer-events-none select-none"
													: isNoPlanLocked
														? "border-[#3453a7]/18 bg-[#f5f8ff] opacity-75"
														: "border-[#3453a7]/12 bg-white"
											}`}
										>
											<CardContent className={`p-2.5 lg:p-2 xl:p-2.5 ${shouldExpandCard ? "" : "pb-2"}`}>
												<div className={`${shouldExpandCard ? "space-y-3" : "space-y-2.5"}`} dir="rtl">
													<div className="flex items-start justify-between gap-2.5">
														<div className="min-w-0 flex-1 text-right">
															<p className="text-base font-black leading-none text-[#1a2332] lg:text-[15px] xl:text-base">{student.name}</p>
														</div>
														<div className="flex items-center gap-2">
															<Button
																variant="outline"
																onClick={() => openNotesDialog(student.id)}
																title="الملاحظات"
																disabled={student.savedToday && !isEditMode}
																className={`h-6.5 w-6.5 rounded-full ${
																	student.notes
																		? "border-[#3453a7] bg-[#3453a7]/12 text-[#1a2332]"
																		: "border-[#3453a7]/50 bg-white text-neutral-600 hover:bg-[#3453a7]/10 hover:border-[#3453a7] hover:text-neutral-800"
																}`}
															>
																<MessageSquare className="h-2.5 w-2.5" />
															</Button>
														</div>
													</div>

													{isNoPlanLocked && shouldExpandCard ? (
														<div className="rounded-2xl bg-[#edf4ff] px-3 py-3 text-center">
															<p className="text-base font-semibold text-[#3453a7]">لا توجد لديه خطة</p>
														</div>
													) : !isEvaluatedAttendance(student.attendance) && !student.savedToday && !student.hasPlan ? (
														<div className="rounded-xl bg-[#edf4ff] px-3 py-2 text-center">
															<p className="text-sm font-semibold text-[#3453a7]">لا توجد لديه خطة</p>
														</div>
													) : shouldExpandCard && !isNoPlanLocked && shouldShowReportEvaluations ? (
														<div className="rounded-[18px] bg-[#f7fbff] px-2 py-2 sm:px-2.5">
															<div className="space-y-2">
																{[...(student.selfReports || [])]
																	.sort((left, right) => left.report_date.localeCompare(right.report_date))
																	.map((report) => (
																	<div key={report.id} className="grid gap-2 rounded-[16px] bg-white px-2.5 py-2 shadow-sm ring-1 ring-[#3453a7]/10 md:grid-cols-[minmax(0,1fr)_102px] md:items-center">
																		<div className="min-w-0 text-right">
																			{isRetrySessionNumber(student, getDisplayReportSessionNumbersByDate(student)[report.report_date]) && (
																				<p className="text-xs font-extrabold text-[#3453a7]">إعادة حفظ</p>
																			)}
																				<p className={`${isRetrySessionNumber(student, getDisplayReportSessionNumbersByDate(student)[report.report_date]) ? "mt-0.5" : ""} text-[13px] leading-5 font-semibold ${report.memorization_done ? "text-[#0f766e]" : "text-[#4d6b76]"}`}>
																					{getReportMemorizationSegment(student, report.report_date)}
																				</p>
																			
																		</div>
																		<div className="rounded-[14px] border border-[#3453a7]/15 bg-[#f5f9ff] px-2 py-1.5">
																			<p className="mb-1 text-right text-[10px] font-bold tracking-[0.06em] text-[#3453a7]">التقييم</p>
																			{(() => {
																				const reportEvaluationOptions = getReportEvaluationOptions(student, report.report_date, student.reportEvaluations?.[report.report_date])
																				const reportKey = getReportSaveKey(student.id, report.report_date)
																				const isReportSaving = savingReportKeys.includes(reportKey)
																				const isReportRecentlySaved = recentlySavedReportKeys.includes(reportKey)
																				return (
																			<div className={`relative transition-all duration-200 ${isReportRecentlySaved ? "animate-pulse" : ""}`}>
																				<Select
																					value={student.reportEvaluations?.[report.report_date] ?? UNSET_REPORT_EVALUATION}
																					onValueChange={(value) => {
																						void handleReportEvaluationChange(
																							student.id,
																							report.report_date,
																							value === UNSET_REPORT_EVALUATION ? undefined : (value as EvaluationLevel),
																						)
																					}}
																					disabled={isReportSaving || ((student.savedReportDates || []).includes(report.report_date) && !isEditMode)}
																				>
																					<SelectTrigger className="h-8 w-full rounded-lg border-[#3453a7]/30 bg-white px-2 text-[12px] font-semibold leading-4 text-[#1a2332] shadow-none [&>span]:leading-4 focus:ring-[#3453a7]/20" dir="rtl">
																						<SelectValue />
																					</SelectTrigger>
																					<SelectContent dir="rtl">
																						<SelectItem value={UNSET_REPORT_EVALUATION} className="text-right text-sm">
																							لم يقيم
																						</SelectItem>
																							{reportEvaluationOptions.map((option) => (
																							<SelectItem key={`${report.id}-${option.level}`} value={option.level} className="text-right text-sm">
																								{option.label}
																							</SelectItem>
																						))}
																					</SelectContent>
																				</Select>
																				{isReportRecentlySaved ? (
																					<div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-white/88">
																						<Check className="h-5 w-5 text-[#3453a7]" />
																					</div>
																				) : null}
																			</div>
																				)
																			})()}
																		</div>
																	</div>
																	))}
															</div>
														</div>
													) : shouldExpandCard && !isNoPlanLocked && shouldShowDirectTodayEvaluation ? (
														<div className="rounded-[18px] bg-[#f7fbff] px-2 py-2 sm:px-2.5">
															<div className="grid gap-2 rounded-[16px] bg-white px-2.5 py-2 shadow-sm ring-1 ring-[#3453a7]/10 md:grid-cols-[minmax(0,1fr)_102px] md:items-center">
																<div className="min-w-0 text-right">
																	<p className="text-[13px] leading-5 font-semibold text-[#0f766e]">
																		{formatReadingDetails(student.readingDetails?.hafiz) || student.readingDetails?.hafiz?.text || "لا يوجد مقطع حفظ محفوظ لليوم"}
																	</p>
																</div>
																<div className="rounded-[14px] border border-[#3453a7]/15 bg-[#f5f9ff] px-2 py-1.5">
																	<p className="mb-1 text-right text-[10px] font-bold tracking-[0.06em] text-[#3453a7]">تقييم اليوم</p>
																	{(() => {
																		const directSaveKey = getReportSaveKey(student.id, todayKsaDate)
																		const directEvaluationOptions = getDirectTodayEvaluationOptions(student)
																		const currentLevelValue = student.evaluation?.hafiz ? normalizeEvaluationLevel(student.evaluation.hafiz) : UNSET_REPORT_EVALUATION
																		const isDirectSaving = savingReportKeys.includes(directSaveKey)
																		const isDirectRecentlySaved = recentlySavedReportKeys.includes(directSaveKey)
																		return (
																			<div className={`relative transition-all duration-200 ${isDirectRecentlySaved ? "animate-pulse" : ""}`}>
																				<Select
																					value={currentLevelValue}
																					onValueChange={(value) => {
																						const nextLevel = value === UNSET_REPORT_EVALUATION ? undefined : (value as EvaluationLevel)
																						if (!nextLevel) {
																							return
																						}

																						updateStudentsState((current) =>
																							current.map((entry) =>
																								entry.id === student.id
																									? { ...entry, evaluation: { ...(entry.evaluation || {}), hafiz: nextLevel } }
																									: entry,
																							),
																						)
																						void saveTodayEvaluation(student.id, nextLevel)
																					}}
																					disabled={isDirectSaving}
																				>
																					<SelectTrigger className="h-8 w-full rounded-lg border-[#3453a7]/30 bg-white px-2 text-[12px] font-semibold leading-4 text-[#1a2332] shadow-none [&>span]:leading-4 focus:ring-[#3453a7]/20" dir="rtl">
																						<SelectValue />
																					</SelectTrigger>
																					<SelectContent dir="rtl">
																						<SelectItem value={UNSET_REPORT_EVALUATION} className="text-right text-sm">
																							لم يقيم
																						</SelectItem>
																						{directEvaluationOptions.map((option) => (
																							<SelectItem key={`${student.id}-direct-${option.level}`} value={option.level} className="text-right text-sm">
																								{option.label}
																							</SelectItem>
																						))}
																					</SelectContent>
																				</Select>
																				{isDirectRecentlySaved ? (
																					<div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-white/88">
																						<Check className="h-5 w-5 text-[#3453a7]" />
																					</div>
																				) : null}
																			</div>
																		)
																	})()}
																</div>
															</div>
														</div>
													) : null}

												</div>
											</CardContent>
										</Card>
									)
								})}
							</div>

						</>
					)}
				</div>
			</main>

			<Footer />

			{/* Notes Dialog */}
			<Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
				<DialogContent className="max-w-md border-[#3453a7]/15 bg-white" dir="rtl">
					<DialogTitle className="sr-only">الملاحظات</DialogTitle>
					<div className="space-y-4 pt-4">
						<Textarea
							value={notesText}
							onChange={(e) => setNotesText(e.target.value)}
							placeholder="اكتب ملاحظاتك هنا..."
							className="min-h-[120px] text-right border-[#3453a7]/30 bg-[#f8fbff] focus-visible:border-[#3453a7]/50 focus-visible:ring-[#3453a7]/25"
						/>
						<div className="flex gap-2 justify-end">
							<Button
								variant="outline"
								onClick={() => setIsNotesDialogOpen(false)}
								className="text-sm h-9 rounded-lg border-[#3453a7]/45 bg-white text-neutral-600 hover:bg-[#3453a7]/8 hover:border-[#3453a7]"
							>
								إلغاء
							</Button>
							<Button
								variant="outline"
								onClick={saveNotes}
								className="text-sm h-9 rounded-lg border-[#3453a7] bg-[#3453a7] text-white hover:border-[#27428d] hover:bg-[#27428d] hover:text-white focus-visible:text-white active:text-white"
							>
								حفظ الملاحظة
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
