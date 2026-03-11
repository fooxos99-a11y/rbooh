"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, RotateCcw, MessageSquare } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { SiteLoader } from "@/components/ui/site-loader"
import { getActivePlanDayNumber, getAyahByPageFloat, getInclusiveEndAyah, getPlanSessionContent, SURAHS } from "@/lib/quran-data"
import { type AttendanceStatus, isEvaluatedAttendance, isNonEvaluatedAttendance } from "@/lib/student-attendance"

type EvaluationLevel = "excellent" | "very_good" | "good" | "not_completed" | null
type EvaluationType = "hafiz" | "tikrar" | "samaa" | "rabet"
type ContentfulEvaluationType = "hafiz" | "samaa" | "rabet"

interface EvaluationContent {
	fromSurah?: string
	fromVerse?: string
	toSurah?: string
	toVerse?: string
}

type ReadingDetails = Partial<Record<ContentfulEvaluationType, EvaluationContent>>

interface EvaluationOption {
	hafiz?: EvaluationLevel
	tikrar?: EvaluationLevel
	samaa?: EvaluationLevel
	rabet?: EvaluationLevel
}

interface StudentAttendance {
	id: string
	name: string
	halaqah: string
	hasPlan: boolean
	attendance: AttendanceStatus | null
	evaluation?: EvaluationOption
	readingDetails?: ReadingDetails
	planReadingDetails?: ReadingDetails
	notes?: string
	savedToday?: boolean
}

interface SavedAttendanceRecord {
	student_id: string
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

interface MissedDayRecord {
	date: string
	sessionIndex: number
	content: string
	hafiz_from_surah?: string
	hafiz_from_verse?: string
	hafiz_to_surah?: string
	hafiz_to_verse?: string
}

interface StudentPlan {
	student_id: string
	start_surah_number: number
	end_surah_number: number
	daily_pages: number
	total_pages: number
	total_days: number
	direction?: "asc" | "desc"
	has_previous?: boolean
	prev_start_surah?: number | null
	prev_end_surah?: number | null
	muraajaa_pages?: number | null
	rabt_pages?: number | null
}

interface PlanProgressResponse {
	plan: StudentPlan | null
	completedDays?: number
}

// دالة للحصول على التاريخ الحالي بتوقيت السعودية (بصيغة YYYY-MM-DD)
const getKsaDateString = () => {
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Riyadh",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})
	const parts = formatter.formatToParts(new Date())
	const year = parts.find((part) => part.type === "year")?.value
	const month = parts.find((part) => part.type === "month")?.value
	const day = parts.find((part) => part.type === "day")?.value

	return `${year}-${month}-${day}`
}

const buildReadingContent = (sessionStart: number, size: number): EvaluationContent | null => {
	if (size <= 0) return null

	const sessionEnd = Math.min(sessionStart + size, 605)
	const startRef = getAyahByPageFloat(Math.max(1, sessionStart))
	const endRef = getInclusiveEndAyah(sessionEnd)
	const startSurahName = SURAHS.find((surah) => surah.number === startRef.surah)?.name
	const endSurahName = SURAHS.find((surah) => surah.number === endRef.surah)?.name

	if (!startSurahName || !endSurahName) return null

	return {
		fromSurah: startSurahName,
		fromVerse: String(startRef.ayah),
		toSurah: endSurahName,
		toVerse: String(endRef.ayah),
	}
}

const getSessionReadingContent = (
	planStartPage: number,
	dailyPages: number,
	sessionNum: number,
	totalPages: number,
	direction: "asc" | "desc",
) => {
	const sessionStart = direction === "desc"
		? planStartPage + totalPages - sessionNum * dailyPages
		: planStartPage + (sessionNum - 1) * dailyPages

	return buildReadingContent(sessionStart, dailyPages)
}

const getOffsetReadingContent = (
	planStartPage: number,
	offset: number,
	size: number,
	totalPages: number,
	direction: "asc" | "desc",
) => {
	const sessionStart = direction === "desc"
		? planStartPage + totalPages - offset - size
		: planStartPage + offset

	return buildReadingContent(sessionStart, size)
}

const getPlanReadingDetails = (plan: StudentPlan | null, completedDays: number): ReadingDetails => {
	if (!plan) return {}

	const daily = Number(plan.daily_pages) || 0
	const totalPages = Number(plan.total_pages) || 0
	const totalDays = Number(plan.total_days) || 0
	const direction = plan.direction || "asc"
	const startSurahData = SURAHS.find((surah) => surah.number === Math.min(plan.start_surah_number, plan.end_surah_number))
	const planStartPage = startSurahData?.startPage || 1
	const activeDayNum = getActivePlanDayNumber(totalDays, completedDays, plan.start_date, plan.created_at)

	const hafiz = getPlanSessionContent(plan, activeDayNum)

	let samaa: EvaluationContent | null = null
	let rabet: EvaluationContent | null = null

	const rootSurahNum = plan.prev_start_surah || plan.start_surah_number
	const rootSurah = SURAHS.find((surah) => surah.number === rootSurahNum)

	if (rootSurah) {
		const rootStartPage = rootSurah.startPage
		let previousVolume = 0

		if (plan.has_previous && plan.prev_start_surah && plan.prev_end_surah) {
			const previousStart = SURAHS.find((surah) => surah.number === plan.prev_start_surah)
			const previousEnd = SURAHS.find((surah) => surah.number === plan.prev_end_surah)
			if (previousStart && previousEnd) {
				let endPage = 605
				if (previousEnd.number < 114) {
					const nextSurah = SURAHS.find((surah) => surah.number === previousEnd.number + 1)
					if (nextSurah) endPage = nextSurah.startPage
				}
				previousVolume = Math.abs(endPage - previousStart.startPage)
			}
		}

		const completedCurrentPlanPages = (activeDayNum - 1) * daily
		const totalMemorizedPool = previousVolume + completedCurrentPlanPages

		if (totalMemorizedPool > 0) {
			const rabtPref = Number(plan.rabt_pages) || 0
			const rabtSize = Math.min(rabtPref, totalMemorizedPool)
			if (rabtSize > 0) {
				const rabtOffset = totalMemorizedPool - rabtSize
				rabet = getOffsetReadingContent(rootStartPage, rabtOffset, rabtSize, 0, direction)
			}

			const muraajaaPool = totalMemorizedPool - rabtSize
			const muraajaaPref = Number(plan.muraajaa_pages) || 0
			if (muraajaaPool > 0 && muraajaaPref > 0) {
				const baseOffset = ((activeDayNum - 1) * muraajaaPref) % muraajaaPool
				const muraajaaSize = Math.min(muraajaaPref, muraajaaPool - baseOffset)
				if (muraajaaSize > 0) {
					samaa = getOffsetReadingContent(rootStartPage, baseOffset, muraajaaSize, 0, direction)
				}
			}
		}
	}

	return {
		...(hafiz ? { hafiz } : {}),
		...(samaa ? { samaa } : {}),
		...(rabet ? { rabet } : {}),
	}
}

const formatReadingDetails = (details?: EvaluationContent | null) => {
	if (!details?.fromSurah || !details?.fromVerse || !details?.toSurah || !details?.toVerse) {
		return null
	}

	return `من سورة ${details.fromSurah} آية ${details.fromVerse} إلى سورة ${details.toSurah} آية ${details.toVerse}`
}

const buildSavedReadingDetails = (record: SavedAttendanceRecord): ReadingDetails => {
	const readingDetails: ReadingDetails = {}

	if (record.hafiz_from_surah && record.hafiz_from_verse && record.hafiz_to_surah && record.hafiz_to_verse) {
		readingDetails.hafiz = {
			fromSurah: record.hafiz_from_surah,
			fromVerse: record.hafiz_from_verse,
			toSurah: record.hafiz_to_surah,
			toVerse: record.hafiz_to_verse,
		}
	}

	if (record.samaa_from_surah && record.samaa_from_verse && record.samaa_to_surah && record.samaa_to_verse) {
		readingDetails.samaa = {
			fromSurah: record.samaa_from_surah,
			fromVerse: record.samaa_from_verse,
			toSurah: record.samaa_to_surah,
			toVerse: record.samaa_to_verse,
		}
	}

	if (record.rabet_from_surah && record.rabet_from_verse && record.rabet_to_surah && record.rabet_to_verse) {
		readingDetails.rabet = {
			fromSurah: record.rabet_from_surah,
			fromVerse: record.rabet_from_verse,
			toSurah: record.rabet_to_surah,
			toVerse: record.rabet_to_verse,
		}
	}

	return readingDetails
}

const hasCompleteSavedRecord = (record: SavedAttendanceRecord, student: StudentAttendance) => {
	if (!isEvaluatedAttendance(record.status)) return true
	if (!student.hasPlan) return false

	return !!(
		record.hafiz_level &&
		record.tikrar_level &&
		record.samaa_level &&
		record.rabet_level
	)
}

const mergeSavedAttendance = (student: StudentAttendance, record?: SavedAttendanceRecord): StudentAttendance => {
	if (!record) return { ...student, savedToday: false }

	const savedReadingDetails = buildSavedReadingDetails(record)
	const hasSavedReadingDetails = Object.keys(savedReadingDetails).length > 0
	const isLockedForToday = hasCompleteSavedRecord(record, student)

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
		savedToday: isLockedForToday,
	}
}

const hasCompletePresentEvaluation = (student: StudentAttendance) => {
	if (!isEvaluatedAttendance(student.attendance)) return false
	if (!student.hasPlan) return false

	return !!(
		student.evaluation?.hafiz &&
		student.evaluation?.tikrar &&
		student.evaluation?.samaa &&
		student.evaluation?.rabet
	)
}

const isStudentReadyToSave = (student: StudentAttendance) => {
	if (student.savedToday || student.attendance === null) return false
	if (!isEvaluatedAttendance(student.attendance)) return true
	return hasCompletePresentEvaluation(student)
}

export default function HalaqahManagement() {
	const [isLoading, setIsLoading] = useState(true)
	const router = useRouter()
	const params = useParams()

	const [teacherData, setTeacherData] = useState<any>(null)
	const [students, setStudents] = useState<StudentAttendance[]>([])
	const [hasCircle, setHasCircle] = useState(true)
	const [isSaving, setIsSaving] = useState(false)
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success">("idle")
	const [hasSavedToday, setHasSavedToday] = useState(false)
	const [notesStudentId, setNotesStudentId] = useState<string | null>(null)
	const [notesText, setNotesText] = useState("")
	const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)
        const [isCompDialogOpen, setIsCompDialogOpen] = useState(false)
	const [compStudentId, setCompStudentId] = useState<string | null>(null)
		const [missedDays, setMissedDays] = useState<MissedDayRecord[]>([])
        const [isCompLoading, setIsCompLoading] = useState(false)
		const [showReadingSegments, setShowReadingSegments] = useState(false)
		const studentsRef = useRef<StudentAttendance[]>([])
		const readingSegmentsStorageKey = teacherData?.id
			? `halaqah-show-reading-segments-${teacherData.id}`
			: null

	const showAlert = useAlertDialog()

	useEffect(() => {
		const loggedIn = localStorage.getItem("isLoggedIn") === "true"
		const userRole = localStorage.getItem("userRole")
		const accountNumber = localStorage.getItem("accountNumber")

		const allowedRoles = ["teacher", "deputy_teacher", "admin", "supervisor"];
		if (!loggedIn || !allowedRoles.includes(userRole || "")) {
			router.push("/login")
		} else {
			fetchTeacherData(accountNumber || "")
		}
	}, [router])

	useEffect(() => {
		if (!teacherData?.halaqah) return

		const refreshStudentsState = () => {
			void fetchStudents(teacherData.halaqah)
		}

		const handlePageShow = () => {
			refreshStudentsState()
		}

		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				refreshStudentsState()
			}
		}

		window.addEventListener("focus", refreshStudentsState)
		window.addEventListener("pageshow", handlePageShow)
		document.addEventListener("visibilitychange", handleVisibilityChange)

		return () => {
			window.removeEventListener("focus", refreshStudentsState)
			window.removeEventListener("pageshow", handlePageShow)
			document.removeEventListener("visibilitychange", handleVisibilityChange)
		}
	}, [teacherData?.halaqah])

	useEffect(() => {
		if (!readingSegmentsStorageKey) return

		const savedPreference = localStorage.getItem(readingSegmentsStorageKey)
		if (savedPreference !== null) {
			setShowReadingSegments(savedPreference === "true")
		}
	}, [readingSegmentsStorageKey])

	useEffect(() => {
		if (!readingSegmentsStorageKey) return
		localStorage.setItem(readingSegmentsStorageKey, String(showReadingSegments))
	}, [readingSegmentsStorageKey, showReadingSegments])

	useEffect(() => {
		studentsRef.current = students
	}, [students])

	const fetchTeacherData = async (accountNumber: string) => {
		try {
			const response = await fetch(`/api/teachers?account_number=${accountNumber}`)
			const data = await response.json()

			if (data.teachers && data.teachers.length > 0) {
				const teacher = data.teachers[0]
				setTeacherData(teacher)

				if (teacher.halaqah) {
					setHasCircle(true)
					fetchStudents(teacher.halaqah)
				} else {
					setHasCircle(false)
					setIsLoading(false)
				}
			} else {
				setHasCircle(false)
				setIsLoading(false)
			}
		} catch (error) {
			console.error("Error fetching teacher data:", error)
			setHasCircle(false)
			setIsLoading(false)
		}
	}

	const loadSavedStudentsForToday = async (halaqah: string, baseStudents?: StudentAttendance[]) => {
		try {
			const response = await fetch(
				`/api/attendance-by-date?date=${getKsaDateString()}&circle=${encodeURIComponent(halaqah)}&t=${Date.now()}`,
				{ cache: "no-store" },
			)
			const data = await response.json()
			const records: SavedAttendanceRecord[] = Array.isArray(data.records) ? data.records : []
			const savedMap = new Map(records.map((record) => [record.student_id, record] as const))

			const applySavedState = (list: StudentAttendance[]) =>
				list.map((student) => mergeSavedAttendance(student, savedMap.get(student.id)))

			const nextStudents = applySavedState(baseStudents ?? students)
			setStudents(nextStudents)
			setHasSavedToday(nextStudents.some((student) => student.savedToday))
			return nextStudents
		} catch (error) {
			console.error("Error loading saved attendance for today:", error)
		}
	}

	const fetchStudents = async (halaqah: string) => {
		try {
			const response = await fetch(`/api/students?circle=${encodeURIComponent(halaqah)}`)
			const data = await response.json()

			if (data.students) {
				const planEntries = await Promise.all(
					data.students.map(async (student: any) => {
						try {
							const planResponse = await fetch(`/api/student-plans?student_id=${student.id}`, { cache: "no-store" })
							if (!planResponse.ok) return [student.id, { plan: null, completedDays: 0 }] as const
							const planData: PlanProgressResponse = await planResponse.json()
							return [student.id, planData] as const
						} catch {
							return [student.id, { plan: null, completedDays: 0 }] as const
						}
					}),
				)

				const planMap = new Map<string, PlanProgressResponse>(planEntries)

				const localStudentsMap = new Map(studentsRef.current.map((student) => [student.id, student] as const))

				const mappedStudents: StudentAttendance[] = data.students.map((student: any) => {
					const planData = planMap.get(student.id)
					const planReadingDetails = getPlanReadingDetails(planData?.plan ?? null, planData?.completedDays ?? 0)
					const localStudent = localStudentsMap.get(student.id)
					const hasUnsavedLocalChanges = !!localStudent && !localStudent.savedToday

					return {
						id: student.id,
						name: student.name,
						halaqah: student.circle_name || halaqah,
						hasPlan: !!planData?.plan,
						attendance: hasUnsavedLocalChanges ? localStudent.attendance : null,
						evaluation: hasUnsavedLocalChanges ? localStudent.evaluation || {} : {},
						readingDetails: hasUnsavedLocalChanges ? localStudent.readingDetails || planReadingDetails : planReadingDetails,
						planReadingDetails,
						notes: hasUnsavedLocalChanges ? localStudent.notes : undefined,
						savedToday: false,
					}
				})
				await loadSavedStudentsForToday(halaqah, mappedStudents)
			}
			setIsLoading(false)
		} catch (error) {
			console.error("Error fetching students:", error)
			setIsLoading(false)
		}
	}

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<SiteLoader size="lg" />
			</div>
		)
	}

	if (!hasCircle || !teacherData?.halaqah) {
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
		if (student?.savedToday || !student?.hasPlan) return

		setStudents(
			students.map((s) =>
				s.id === id
					? {
							...s,
							attendance: status,
							evaluation:
								isNonEvaluatedAttendance(status)
									? {}
									: s.hasPlan
										? s.evaluation
										: { ...s.evaluation, hafiz: "not_completed" },
							readingDetails: s.planReadingDetails || s.readingDetails,
						}
					: s,
			),
		)
	}

	const setEvaluation = (studentId: string, type: EvaluationType, level: EvaluationLevel) => {
		const student = students.find((s) => s.id === studentId)
		if (student?.savedToday || (type === "hafiz" && !student?.hasPlan)) return

		setStudents(
			students.map((s) =>
				s.id === studentId
					? {
							...s,
							evaluation: { ...s.evaluation, [type]: level },
						}
					: s,
			),
		)
	}

	const setAllEvaluations = (studentId: string, level: EvaluationLevel) => {
		const student = students.find((s) => s.id === studentId)
		if (student?.savedToday) return

		setStudents(
			students.map((s) =>
				s.id === studentId
					? {
							...s,
							evaluation: {
								...s.evaluation,
								...(s.hasPlan ? { hafiz: level } : {}),
								tikrar: level,
								samaa: level,
								rabet: level,
							},
						}
					: s,
			),
		)
	}

	const handleReset = () => {
		setStudents(
			students.map((s) =>
				s.savedToday ? s : { ...s, attendance: null, evaluation: {}, readingDetails: s.planReadingDetails || {} },
			),
		)
	}

	const handleSave = async () => {
		const refreshedStudents = (await loadSavedStudentsForToday(teacherData.halaqah, students)) ?? students

		const studentsToSave = refreshedStudents.filter(isStudentReadyToSave)
		const hasIncompletePresentStudents = refreshedStudents.some(
			(student) => !student.savedToday && isEvaluatedAttendance(student.attendance) && !hasCompletePresentEvaluation(student),
		)

		if (studentsToSave.length === 0) {
			await showAlert(
				hasIncompletePresentStudents
					? "يجب إكمال جميع فروع التقييم للطالب الحاضر أو المتأخر قبل الحفظ."
					: "لا يوجد طلاب جدد جاهزون للحفظ اليوم",
				"تحذير",
			)
			return
		}

		const allPresentsEvaluated = studentsToSave
			.filter((s) => isEvaluatedAttendance(s.attendance))
			.every(hasCompletePresentEvaluation)

		if (!allPresentsEvaluated) {
			await showAlert("لم يتم تقييم جميع الطلاب الحاضرين أو المتأخرين في كل الفروع! تأكد من إكمال التقييم قبل الحفظ", "تحذير")
			return
		}

		setIsSaving(true)
		setSaveStatus("saving")

		try {
			const saveResults = await Promise.all(
				studentsToSave.map(async (student) => {
					const requestBody: any = {
						student_id: student.id,
						teacher_id: teacherData.id,
						halaqah: teacherData.halaqah,
						status: student.attendance,
						hafiz_level: "not_completed",
						tikrar_level: "not_completed",
						samaa_level: "not_completed",
						rabet_level: "not_completed",
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
						requestBody.hafiz_level = student.evaluation.hafiz || "not_completed"
						requestBody.tikrar_level = student.evaluation.tikrar || "not_completed"
						requestBody.samaa_level = student.evaluation.samaa || "not_completed"
						requestBody.rabet_level = student.evaluation.rabet || "not_completed"
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

			const blockingError = saveResults.find((result) => !result.ok && result.status !== 409)
			if (blockingError) {
				throw new Error(blockingError.data?.error || "حدث خطأ أثناء حفظ البيانات")
			}

			await loadSavedStudentsForToday(teacherData.halaqah)

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
				await showAlert("هذا الطالب محفوظ مسبقًا اليوم ولا يمكن حفظه مرة أخرى.", "تنبيه")
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
		setStudents(
			students.map((s) =>
				s.savedToday
					? s
					: !s.hasPlan
						? { ...s, attendance: null, evaluation: {}, readingDetails: s.planReadingDetails || {} }
						: { ...s, attendance: "present", evaluation: s.evaluation || {}, readingDetails: s.planReadingDetails || {} },
			),
		)
	}

	const markAllLate = () => {
		setStudents(
			students.map((s) =>
				s.savedToday
					? s
					: !s.hasPlan
						? { ...s, attendance: null, evaluation: {}, readingDetails: s.planReadingDetails || {} }
						: { ...s, attendance: "late", evaluation: s.evaluation || {}, readingDetails: s.planReadingDetails || {} },
			),
		)
	}

	const markAllAbsent = () => {
		setStudents(
			students.map((s) =>
				s.savedToday
					? s
					: !s.hasPlan
						? { ...s, attendance: null, evaluation: {}, readingDetails: s.planReadingDetails || {} }
						: { ...s, attendance: "absent", evaluation: {}, readingDetails: s.planReadingDetails || {} },
			),
		)
	}

	const markAllExcused = () => {
		setStudents(
			students.map((s) =>
				s.savedToday
					? s
					: !s.hasPlan
						? { ...s, attendance: null, evaluation: {}, readingDetails: s.planReadingDetails || {} }
						: { ...s, attendance: "excused", evaluation: {}, readingDetails: s.planReadingDetails || {} },
			),
		)
	}

	const loadMissedDays = async (studentId: string) => {
		setIsCompLoading(true)
		try {
			const res = await fetch(`/api/compensation/missed?student_id=${studentId}&t=${Date.now()}`, {
				cache: "no-store",
			})
			const data = await res.json()
			setMissedDays(data.missedDays || [])
		} catch (e) {
			console.error(e)
			setMissedDays([])
		} finally {
			setIsCompLoading(false)
		}
	}

	const refreshStudentPlanState = async (studentId: string) => {
		try {
			const planResponse = await fetch(`/api/student-plans?student_id=${studentId}&t=${Date.now()}`, {
				cache: "no-store",
			})
			if (!planResponse.ok) return

			const planData: PlanProgressResponse = await planResponse.json()
			const nextReadingDetails = getPlanReadingDetails(planData?.plan ?? null, planData?.completedDays ?? 0)

			setStudents((prev) =>
				prev.map((student) =>
					student.id === studentId
						? {
								...student,
								hasPlan: !!planData?.plan,
								readingDetails: nextReadingDetails,
								planReadingDetails: nextReadingDetails,
							}
						: student,
				),
			)
		} catch (error) {
			console.error("Error refreshing student plan after compensation:", error)
		}
	}

	const openCompDialog = async (studentId: string) => {
		setCompStudentId(studentId)
		setMissedDays([])
		setIsCompDialogOpen(true)
		await loadMissedDays(studentId)
	}

	const handleCompensate = async (missedDay: MissedDayRecord) => {
		if (!compStudentId) {
			await showAlert("تعذر تحديد الطالب المطلوب تعويضه", "خطأ")
			return
		}

		try {
			const res = await fetch(`/api/compensation`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					student_id: compStudentId,
					teacher_id: teacherData.id,
					halaqah: teacherData.halaqah,
					date: missedDay.date,
					hafiz_from_surah: missedDay.hafiz_from_surah || null,
					hafiz_from_verse: missedDay.hafiz_from_verse || null,
					hafiz_to_surah: missedDay.hafiz_to_surah || null,
					hafiz_to_verse: missedDay.hafiz_to_verse || null,
					compensated_content: missedDay.content,
				}),
			})
			const data = await res.json()
			if (data.success) {
				await loadMissedDays(compStudentId)
				await refreshStudentPlanState(compStudentId)
				await showAlert(`تم تعويض المقطع بنجاح وتم إضافة ${data.pointsAdded} نقطة للطالب.`, "نجاح")
			} else {
				await showAlert(data.error || "خطأ في التعويض", "خطأ")
			}
		} catch (e) {
			await showAlert("حدث خطأ في النظام", "خطأ")
		}
	}

		const openNotesDialog = (studentId: string) => {
		const student = students.find((s) => s.id === studentId)
			if (student?.savedToday) return
		setNotesStudentId(studentId)
		setNotesText(student?.notes || "")
		setIsNotesDialogOpen(true)
	}

	const saveNotes = () => {
		if (notesStudentId !== null) {
			setStudents(students.map((s) => s.id === notesStudentId ? { ...s, notes: notesText } : s))
		}
		setIsNotesDialogOpen(false)
	}

	const halaqahName = teacherData?.halaqah || "الحلقة"

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
		const currentDetails = type === "hafiz" || type === "samaa" || type === "rabet" ? student?.readingDetails?.[type] : null
		const showsReadingFields = type === "hafiz" || type === "samaa" || type === "rabet"
		const readingSummary = formatReadingDetails(currentDetails)
		const emptyReadingMessage =
			type === "samaa"
				? "لا يوجد لديه مراجعة لليوم"
				: type === "rabet"
					? "لا يوجد لديه ربط لليوم"
					: "لا يوجد لديه حفظ لليوم"
		const isSavedLocked = !!student?.savedToday
		const isHafizLocked = type === "hafiz" && !student?.hasPlan
		const isDisabled = isSavedLocked || isHafizLocked

		return (
			<div
				className={`space-y-2 rounded-xl border p-3 ${
					isSavedLocked
						? "border-[#D4AF37]/35 bg-[#f8f3df]/80 opacity-75"
						: isHafizLocked
							? "border-red-200 bg-red-50/40"
							: "border-[#D4AF37]/15"
				}`}
			>
				<div className="font-semibold text-[#1a2332] text-center">{label}</div>
		<div className="grid grid-cols-2 gap-2">
				<Button
					variant="outline"
					onClick={() => setEvaluation(studentId, type, "excellent")}
					disabled={isDisabled}
					className={`text-xs transition-all ${
						currentLevel === "excellent"
							? "font-bold"
							: "border-[#D4AF37]/80 text-neutral-600 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]"
					}`}
					style={currentLevel === "excellent" ? {
						backgroundColor: "rgba(212, 175, 55, 0.2)",
						borderColor: "#D4AF37",
						color: "#262626",
					} : undefined}
				>
					ممتاز
				</Button>
				<Button
					variant="outline"
					onClick={() => setEvaluation(studentId, type, "very_good")}
					disabled={isDisabled}
					className={`text-xs transition-all ${
						currentLevel === "very_good"
							? "font-bold"
							: "border-[#D4AF37]/80 text-neutral-600 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]"
					}`}
					style={currentLevel === "very_good" ? {
						backgroundColor: "rgba(212, 175, 55, 0.2)",
						borderColor: "#D4AF37",
						color: "#262626",
					} : undefined}
				>
					جيد جداً
				</Button>
				<Button
					variant="outline"
					onClick={() => setEvaluation(studentId, type, "good")}
					disabled={isDisabled}
					className={`text-xs transition-all ${
						currentLevel === "good"
							? "font-bold"
							: "border-[#D4AF37]/80 text-neutral-600 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]"
					}`}
					style={currentLevel === "good" ? {
						backgroundColor: "rgba(212, 175, 55, 0.2)",
						borderColor: "#D4AF37",
						color: "#262626",
					} : undefined}
				>
					جيد
				</Button>
				<Button
					variant="outline"
					onClick={() => setEvaluation(studentId, type, "not_completed")}
					disabled={isDisabled}
					className={`text-xs transition-all ${
						currentLevel === "not_completed"
							? "font-bold"
							: "border-[#D4AF37]/80 text-neutral-600 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]"
					}`}
					style={currentLevel === "not_completed" ? {
						backgroundColor: "rgba(212, 175, 55, 0.2)",
						borderColor: "#D4AF37",
						color: "#262626",
					} : undefined}
				>
					لم يكمل
				</Button>
			</div>
			{showReadingSegments && showsReadingFields && !isHafizLocked && (
				<div className="pt-2">
					<div className="rounded-xl border border-[#D4AF37]/20 bg-[#faf7f0] px-3 py-2 text-right" dir="rtl">
						<p className="text-xs leading-6 text-[#1a2332]">
							{readingSummary || emptyReadingMessage}
						</p>
					</div>
				</div>
			)}
			</div>
		)
	}

	const savedStudentsCount = students.filter((student) => student.savedToday).length
	const pendingStudentsCount = students.filter(isStudentReadyToSave).length
	const hasPendingStudents = pendingStudentsCount > 0

	return (
		<div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
			<Header />

			<main className="flex-1 py-12 px-4">
				<div className="container mx-auto max-w-7xl">
					<div className="mb-8 overflow-x-auto pb-2">
						<div className="flex w-full flex-col items-end gap-2 sm:gap-2.5 md:min-w-max md:flex-row-reverse md:flex-nowrap md:items-center md:justify-end">
							<label className="plan-history-checkbox h-11 w-fit shrink-0 self-end rounded-full border border-[#D4AF37]/70 bg-white/90 px-4 text-sm font-semibold text-[#1a2332] shadow-sm transition-all hover:bg-[#faf7f0] sm:h-10 sm:px-4 sm:text-sm">
								<input
									type="checkbox"
									checked={showReadingSegments}
									onChange={(e) => setShowReadingSegments(e.target.checked)}
								/>
								<span className="plan-history-checkbox__label whitespace-nowrap">معاينة الخطط</span>
								<span className="plan-history-checkbox__mark" aria-hidden="true" />
							</label>
							<div className="flex w-full justify-end flex-nowrap flex-row-reverse items-center gap-2 sm:w-auto sm:gap-2.5 md:min-w-max">
							<Button
								variant="outline"
								onClick={markAllLate}
								disabled={isSaving}
									className="h-11 shrink-0 rounded-xl border-[#D4AF37]/80 bg-white px-4 text-sm font-semibold text-neutral-700 transition-all hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 active:bg-[#D4AF37]/15 focus-visible:border-[#D4AF37] focus-visible:bg-[#D4AF37]/10 focus-visible:text-neutral-800 focus-visible:ring-[#D4AF37]/30 sm:h-10 sm:px-3 sm:text-sm"
							>
								متأخر
							</Button>
							<Button
								variant="outline"
								onClick={markAllExcused}
								disabled={isSaving}
									className="h-11 shrink-0 rounded-xl border-[#D4AF37]/80 bg-white px-4 text-sm font-semibold text-neutral-700 transition-all hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 active:bg-[#D4AF37]/15 focus-visible:border-[#D4AF37] focus-visible:bg-[#D4AF37]/10 focus-visible:text-neutral-800 focus-visible:ring-[#D4AF37]/30 sm:h-10 sm:px-3 sm:text-sm"
							>
								مستأذن
							</Button>
							<Button
								variant="outline"
								onClick={markAllAbsent}
								disabled={isSaving}
									className="h-11 shrink-0 rounded-xl border-[#D4AF37]/80 bg-white px-4 text-sm font-semibold text-neutral-700 transition-all hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 active:bg-[#D4AF37]/15 focus-visible:border-[#D4AF37] focus-visible:bg-[#D4AF37]/10 focus-visible:text-neutral-800 focus-visible:ring-[#D4AF37]/30 sm:h-10 sm:px-3 sm:text-sm"
							>
								غائب
							</Button>
							<Button
								variant="outline"
								onClick={markAllPresent}
								disabled={isSaving}
								className="h-11 shrink-0 rounded-xl border-[#D4AF37]/80 bg-white px-4 text-sm font-semibold text-neutral-700 transition-all hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 active:bg-[#D4AF37]/15 focus-visible:border-[#D4AF37] focus-visible:bg-[#D4AF37]/10 focus-visible:text-neutral-800 focus-visible:ring-[#D4AF37]/30 sm:h-10 sm:px-3 sm:text-sm"
							>
								حاضر
							</Button>
							</div>
						</div>
					</div>
					{students.length === 0 ? (
						<div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
							<p className="text-2xl font-bold text-[#1a2332]">لا يوجد طلاب في هذه الحلقة</p>
							<p className="text-lg text-[#1a2332]/70">يمكنك إضافة طلاب من لوحة التحكم</p>
						</div>
					) : (
						<>
							{/* Student List */}
							<div className="space-y-4">
								{students.map((student) => (
										(() => {
											const isNoPlanLocked = !student.hasPlan && !student.savedToday

											return (
									<Card
										key={student.id}
										className={`border-2 shadow-lg transition-all ${
											student.savedToday
												? "border-[#D4AF37]/35 bg-[#fbf8ee]/85 opacity-80 pointer-events-none select-none"
												: isNoPlanLocked
													? "border-[#D4AF37]/25 bg-[#fbf8ee]/60 opacity-75 pointer-events-none select-none"
												: "border-[#D4AF37]/20"
										}`}
									>
										<CardContent className="pt-0 pb-0">
											<div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
												<div className="lg:col-span-1">
													<div className="space-y-2">
														<div className="flex flex-col gap-2">
															<div className="flex items-center gap-2 flex-wrap">
																<p className="text-base font-bold text-[#1a2332]">{student.name}</p>
																<Button
																	variant="outline"
																	onClick={() => openNotesDialog(student.id)}
																	title="الملاحظات"
																	disabled={student.savedToday}
																	className={`h-5 w-5 rounded-md p-0 transition-all flex-shrink-0 ${
																		student.notes
																			? "bg-[#D4AF37]/20 border-[#D4AF37] text-neutral-800 hover:bg-[#D4AF37]/25 hover:border-[#D4AF37] focus-visible:bg-[#D4AF37]/20 focus-visible:border-[#D4AF37] focus-visible:text-neutral-800 focus-visible:ring-[#D4AF37]/30"
																			: "border-[#D4AF37]/80 text-neutral-600 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] hover:text-neutral-800 focus-visible:bg-[#D4AF37]/10 focus-visible:border-[#D4AF37] focus-visible:text-neutral-800 focus-visible:ring-[#D4AF37]/30"
																	}`}
																>
																	<MessageSquare className="w-3 h-3" />
																</Button>
																<Button
																	variant="outline"
																	onClick={() => openCompDialog(student.id)}
																	title="تعويض الحفظ"
																	disabled={student.savedToday}
																	className="h-5 w-5 rounded-md p-0 transition-all flex-shrink-0 border-[#D4AF37]/80 text-neutral-600 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] hover:text-neutral-800 focus-visible:bg-[#D4AF37]/10 focus-visible:border-[#D4AF37] focus-visible:text-neutral-800 focus-visible:ring-[#D4AF37]/30"
																>
																	<RotateCcw className="w-3 h-3" />
																</Button>
															</div>
                                                                                                                </div>
														<div className="grid grid-cols-2 gap-2 w-full">
															<Button
																variant="outline"
																onClick={() => toggleAttendance(student.id, "present")}
																disabled={student.savedToday}
																className={`min-w-0 text-sm h-9 rounded-lg transition-all ${
																	student.attendance === "present"
																		? "font-bold"
																		: "border-[#D4AF37]/80 text-neutral-600 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]"
																}`}
																style={student.attendance === "present" ? {
																	backgroundColor: "rgba(212, 175, 55, 0.2)",
																	borderColor: "#D4AF37",
																	color: "#262626",
																} : undefined}
															>
																حاضر
															</Button>
															<Button
																variant="outline"
																onClick={() => toggleAttendance(student.id, "late")}
																disabled={student.savedToday}
																className={`min-w-0 text-sm h-9 rounded-lg transition-all ${
																	student.attendance === "late"
																		? "font-bold"
																		: "border-[#D4AF37]/80 text-neutral-600 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]"
																}`}
																style={student.attendance === "late" ? {
																	backgroundColor: "rgba(212, 175, 55, 0.2)",
																	borderColor: "#D4AF37",
																	color: "#262626",
																} : undefined}
															>
																متأخر
															</Button>
															<Button
																variant="outline"
																onClick={() => toggleAttendance(student.id, "absent")}
																disabled={student.savedToday}
																className={`min-w-0 text-sm h-9 rounded-lg transition-all ${
																	student.attendance === "absent"
																		? "font-bold"
																		: "border-[#D4AF37]/80 text-neutral-600 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]"
																}`}
																style={student.attendance === "absent" ? {
																	backgroundColor: "rgba(212, 175, 55, 0.2)",
																	borderColor: "#D4AF37",
																	color: "#262626",
																} : undefined}
															>
																غائب
															</Button>
															<Button
																variant="outline"
																onClick={() => toggleAttendance(student.id, "excused")}
																disabled={student.savedToday}
																className={`min-w-0 text-sm h-9 rounded-lg transition-all ${
																	student.attendance === "excused"
																		? "font-bold"
																		: "border-[#D4AF37]/80 text-neutral-600 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]"
																}`}
																style={student.attendance === "excused" ? {
																	backgroundColor: "rgba(212, 175, 55, 0.2)",
																	borderColor: "#D4AF37",
																	color: "#262626",
																} : undefined}
															>
																مستأذن
															</Button>
														</div>
														{isEvaluatedAttendance(student.attendance) && !student.savedToday && student.hasPlan && (
															<div className="space-y-2 pt-2">
																<p className="text-sm font-semibold text-[#1a2332] text-center">تقييم الكل:</p>
																<div className="grid grid-cols-2 gap-2">
																	<Button
																		variant="outline"
																		onClick={() => setAllEvaluations(student.id, "excellent")}
																		disabled={student.savedToday}
																		className="text-xs border-[#D4AF37]/80 text-neutral-600 bg-white hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] active:bg-[#D4AF37]/15 focus-visible:bg-[#D4AF37]/10 focus-visible:border-[#D4AF37] focus-visible:text-neutral-800 focus-visible:ring-[#D4AF37]/30 transition-all"
																	>
																		ممتاز
																	</Button>
																	<Button
																		variant="outline"
																		onClick={() => setAllEvaluations(student.id, "very_good")}
																		disabled={student.savedToday}
																		className="text-xs border-[#D4AF37]/80 text-neutral-600 bg-white hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] active:bg-[#D4AF37]/15 focus-visible:bg-[#D4AF37]/10 focus-visible:border-[#D4AF37] focus-visible:text-neutral-800 focus-visible:ring-[#D4AF37]/30 transition-all"
																	>
																		جيد جداً
																	</Button>
																	<Button
																		variant="outline"
																		onClick={() => setAllEvaluations(student.id, "good")}
																		disabled={student.savedToday}
																		className="text-xs border-[#D4AF37]/80 text-neutral-600 bg-white hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] active:bg-[#D4AF37]/15 focus-visible:bg-[#D4AF37]/10 focus-visible:border-[#D4AF37] focus-visible:text-neutral-800 focus-visible:ring-[#D4AF37]/30 transition-all"
																	>
																		جيد
																	</Button>
																	<Button
																		variant="outline"
																		onClick={() => setAllEvaluations(student.id, "not_completed")}
																		disabled={student.savedToday}
																		className="text-xs border-[#D4AF37]/80 text-neutral-600 bg-white hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] active:bg-[#D4AF37]/15 focus-visible:bg-[#D4AF37]/10 focus-visible:border-[#D4AF37] focus-visible:text-neutral-800 focus-visible:ring-[#D4AF37]/30 transition-all"
																	>
																		لم يكمل
																	</Button>
																</div>
															</div>
														)}
													</div>
												</div>

												{/* Evaluation Options */}
												{isNoPlanLocked && (
													<div className="lg:col-span-3 flex items-center justify-center">
														<div className="w-full rounded-2xl border border-[#D4AF37]/20 bg-[#f8f3df]/60 px-5 py-8 text-center opacity-80">
															<p className="text-sm font-semibold text-[#8b6b16]">لا توجد لديه خطة</p>
														</div>
													</div>
												)}
												{isEvaluatedAttendance(student.attendance) && !student.savedToday && student.hasPlan && (
													<div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-6">
														<EvaluationOption
															studentId={student.id}
															type="hafiz"
															label="الحفظ"
														/>
														<EvaluationOption
															studentId={student.id}
															type="tikrar"
															label="التكرار"
														/>
														<EvaluationOption
															studentId={student.id}
															type="samaa"
															label="المراجعة"
														/>
														<EvaluationOption
															studentId={student.id}
															type="rabet"
															label="الربط"
														/>
													</div>
												)}
											</div>
										</CardContent>
									</Card>
											)
										})()
								))}
							</div>

							<div className="flex justify-center gap-4 mt-8">
								<Button
									onClick={handleReset}
									variant="outline"
									className="text-base h-12 px-8 rounded-lg border-[#D4AF37]/80 bg-white/90 text-neutral-600 transition-all hover:bg-[#D4AF37]/12 hover:border-[#D4AF37] hover:text-neutral-800 focus-visible:border-[#D4AF37] focus-visible:ring-[#D4AF37]/30 active:bg-[#D4AF37]/18"
									disabled={isSaving}
								>
									<RotateCcw className="w-4 h-4 ml-2" />
									إعادة تعيين
								</Button>
								<Button
									onClick={handleSave}
									variant="outline"
									className="text-base h-12 px-8 rounded-lg transition-all border-[#D4AF37]/80 text-neutral-600 hover:bg-[#D4AF37]/20 hover:border-[#D4AF37] hover:text-neutral-800"
									disabled={isSaving || !hasPendingStudents}
								>
									{saveStatus === "saving" && "جاري الحفظ..."}
									{saveStatus === "success" && "تم الحفظ!"}
									{saveStatus === "idle" && hasPendingStudents && "حفظ"}
									{saveStatus === "idle" && !hasPendingStudents && (hasSavedToday ? "حفظ" : "اختر الطلاب أولاً")}
								</Button>
							</div>
						</>
					)}
				</div>
			</main>

			<Footer />

			{/* Notes Dialog */}
			
                        <Dialog open={isCompDialogOpen} onOpenChange={setIsCompDialogOpen}>
                                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
                                        <DialogTitle className="text-xl font-bold text-center text-[#1a2332] mb-4">تعويض الحفظ السابق</DialogTitle>
                                        <div className="space-y-4">
                                                {isCompLoading ? (
													<div className="flex justify-center items-center py-6"><SiteLoader size="sm" /></div>
                                                ) : missedDays.length === 0 ? (
                                                        <div className="text-center text-[#D4AF37] font-bold py-6">لا يوجد أيام تم التفريط فيها</div>
                                                ) : (
                                                        <div className="space-y-3">
																{missedDays.map((md, idx) => (
                                                                        <div key={idx} className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                                                                                <div>
                                                                                        <p className="font-semibold text-sm text-[#1a2332] mb-1">{md.content}</p>
                                                                                </div>
                                                                                <Button 
                                                                                        size="sm" 
																			onClick={() => handleCompensate(md)}
																					className="rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 h-8 text-xs font-medium text-[#C9A961] transition-colors hover:bg-[#D4AF37]/20 shrink-0"
                                                                                >
																					تعويض
                                                                                </Button>
                                                                        </div>
                                                                ))}
                                                        </div>
                                                )}
                                        </div>
                                </DialogContent>
                        </Dialog>

                        <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
				<DialogContent className="max-w-md" dir="rtl">
					<DialogTitle className="sr-only">الملاحظات</DialogTitle>
					<div className="space-y-4 pt-4">
						<Textarea
							value={notesText}
							onChange={(e) => setNotesText(e.target.value)}
							placeholder="اكتب ملاحظاتك هنا..."
							className="min-h-[120px] text-right border-[#D4AF37]/50 focus-visible:ring-[#D4AF37]/50"
						/>
						<div className="flex gap-2 justify-end">
							<Button
								variant="outline"
								onClick={() => setIsNotesDialogOpen(false)}
								className="text-sm h-9 rounded-lg border-[#D4AF37]/80 text-neutral-600"
							>
								إلغاء
							</Button>
							<Button
								variant="outline"
								onClick={saveNotes}
								className="text-sm h-9 rounded-lg border-[#D4AF37]/80 text-neutral-600 hover:bg-[#D4AF37]/20 hover:border-[#D4AF37] hover:text-neutral-800"
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
