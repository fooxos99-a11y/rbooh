import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getRequestActor, canAccessStudent, canManageHalaqah, isAdminRole, isTeacherRole } from "@/lib/request-auth"
import { calculateExamScore } from "@/lib/exam-settings"
import { getExamSettings } from "@/lib/exam-settings-server"
import { formatExamPortionLabel, getEligibleExamPortions, getPendingMasteryJuzs, type StudentExamPlanProgressSource } from "@/lib/student-exams"
import { getCompletedMemorizationDays } from "@/lib/plan-progress"
import { isPassingMemorizationLevel } from "@/lib/student-attendance"
import { getContiguousCompletedJuzRange, getNormalizedCompletedJuzs } from "@/lib/quran-data"
import { getJuzNumberForPortion, isValidExamPortionNumber } from "@/lib/exam-portions"
import { notifyGuardian } from "@/lib/guardian-notifications"

export const dynamic = "force-dynamic"
export const revalidate = 0

function getErrorMessage(error: unknown) {
	if (!error) return "حدث خطأ غير معروف"
	if (error instanceof Error) return error.message || "حدث خطأ غير معروف"
	if (typeof error === "object") {
		const candidate = error as { message?: string; details?: string; hint?: string; code?: string }
		return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate)
	}
	return String(error)
}

function isMissingStudentExamsTable(error: unknown) {
	const message = getErrorMessage(error)
	return /student_exams/i.test(message) && /does not exist|schema cache|42P01|PGRST205/i.test(message)
}

function isMissingExamPortionColumns(error: unknown) {
	const message = getErrorMessage(error)
	return /portion_type|portion_number/i.test(message) && /column|does not exist|schema cache/i.test(message)
}

function parseCount(value: unknown) {
	const parsed = Number(value)
	if (!Number.isFinite(parsed) || parsed < 0) {
		return 0
	}

	return Math.floor(parsed)
}

function getSaudiDateString() {
	return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date())
}

function formatScheduledDate(dateValue: string) {
	const [year, month, day] = String(dateValue || "").split("-")
	if (!year || !month || !day) {
		return dateValue
	}

	return `${year}/${month}/${day}`
}

function buildExamResultGuardianMessage(params: {
	studentName: string
	halaqah?: string | null
	portionLabel: string
	examDate: string
	finalScore: number
	passed: boolean
}) {
	const examStatusText = params.passed ? "ناجح" : "لم يجتز الاختبار"
	const halaqahPrefix = params.halaqah?.trim() ? `تنبيه من ${params.halaqah}: ` : ""
	return `${halaqahPrefix}تم تسجيل نتيجة اختبار الطالب ${params.studentName} في ${params.portionLabel} بتاريخ ${formatScheduledDate(params.examDate)}. النتيجة: ${examStatusText} بدرجة ${params.finalScore}.`
}

function getScheduledStudyDates(startDate: string, maxSessions: number, endDate = getSaudiDateString()) {
	const scheduledDates: string[] = []
	const currentDate = new Date(startDate)
	const lastDate = new Date(endDate)

	while (currentDate <= lastDate && scheduledDates.length < maxSessions) {
		const dayOfWeek = currentDate.getDay()
		if (dayOfWeek !== 5 && dayOfWeek !== 6) {
			scheduledDates.push(currentDate.toISOString().split("T")[0])
		}
		currentDate.setDate(currentDate.getDate() + 1)
	}

	return scheduledDates
}

function hasCompletedMemorization(record: any) {
	const evaluations = Array.isArray(record.evaluations)
		? record.evaluations
		: record.evaluations
			? [record.evaluations]
			: []

	if ((record.status !== "present" && record.status !== "late") || evaluations.length === 0) {
		return false
	}

	const latestEvaluation = evaluations[evaluations.length - 1]
	return isPassingMemorizationLevel(latestEvaluation?.hafiz_level ?? null)
}

async function getStudentActivePlanProgress(supabase: any, studentId: string) {
	const { data: plan, error: planError } = await supabase
		.from("student_plans")
		.select("direction, total_pages, total_days, daily_pages, has_previous, prev_start_surah, prev_start_verse, prev_end_surah, prev_end_verse, start_surah_number, start_verse, end_surah_number, end_verse, start_date")
		.eq("student_id", studentId)
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle()

	if (planError) {
		throw planError
	}

	if (!plan) {
		return null
	}

	let attendanceQuery = supabase
		.from("attendance_records")
		.select("id, date, status, created_at, evaluations(hafiz_level)")
		.eq("student_id", studentId)
		.order("date", { ascending: true })

	if (plan.start_date) {
		attendanceQuery = attendanceQuery.gte("date", plan.start_date)
	}

	const { data: attendanceRecords, error: attendanceError } = await attendanceQuery
	if (attendanceError) {
		throw attendanceError
	}

	const scheduledDates = plan.start_date
		? getScheduledStudyDates(
			plan.start_date,
			Number(plan.total_days) > 0
				? Number(plan.total_days)
				: (Number(plan.total_pages) > 0 && Number(plan.daily_pages) > 0 ? Math.max(0, Math.ceil(Number(plan.total_pages) / Number(plan.daily_pages))) : 0),
		)
		: []

	const passingRecords = (attendanceRecords || []).filter(hasCompletedMemorization)
	const completedDays = getCompletedMemorizationDays(passingRecords, scheduledDates.length)

	return { plan: plan as StudentExamPlanProgressSource, completedDays }
}

async function hasPassedBothHizbsInJuz(supabase: any, studentId: string, juzNumber: number) {
	const firstHizb = juzNumber * 2 - 1
	const secondHizb = juzNumber * 2

	const { data, error } = await supabase
		.from("student_exams")
		.select("portion_number, passed")
		.eq("student_id", studentId)
		.eq("portion_type", "hizb")
		.in("portion_number", [firstHizb, secondHizb])
		.eq("passed", true)

	if (error) {
		throw error
	}

	const passedHizbs = new Set((data || []).map((row: any) => Number(row.portion_number)))
	return passedHizbs.has(firstHizb) && passedHizbs.has(secondHizb)
}

async function markFailedJuzForRememorization(supabase: any, student: any, failedJuzNumber: number) {
	const nextCompletedJuzs = getNormalizedCompletedJuzs(student.completed_juzs).filter((juzNumber) => juzNumber !== failedJuzNumber)
	const nextCurrentJuzs = Array.from(new Set([
		...getPendingMasteryJuzs(student.current_juzs, student.completed_juzs),
		failedJuzNumber,
	])).sort((left, right) => left - right)

	const completedRange = getContiguousCompletedJuzRange(nextCompletedJuzs)

	const { data, error } = await supabase
		.from("students")
		.update({
			completed_juzs: nextCompletedJuzs,
			current_juzs: nextCurrentJuzs,
			memorized_start_surah: completedRange?.startSurahNumber || null,
			memorized_start_verse: completedRange?.startVerseNumber || null,
			memorized_end_surah: completedRange?.endSurahNumber || null,
			memorized_end_verse: completedRange?.endVerseNumber || null,
		})
		.eq("id", student.id)
		.select("id, name, halaqah, completed_juzs, current_juzs, memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse")
		.single()

	if (error) {
		throw error
	}

	return data
}

async function markPassedJuzAsMemorized(supabase: any, student: any, passedJuzNumber: number) {
	const nextCompletedJuzs = Array.from(new Set([
		...getNormalizedCompletedJuzs(student.completed_juzs),
		passedJuzNumber,
	])).sort((left, right) => left - right)
	const nextCurrentJuzs = getPendingMasteryJuzs(student.current_juzs, nextCompletedJuzs).filter((juzNumber: number) => juzNumber !== passedJuzNumber)
	const completedRange = getContiguousCompletedJuzRange(nextCompletedJuzs)

	const { data, error } = await supabase
		.from("students")
		.update({
			completed_juzs: nextCompletedJuzs,
			current_juzs: nextCurrentJuzs,
			memorized_start_surah: completedRange?.startSurahNumber || null,
			memorized_start_verse: completedRange?.startVerseNumber || null,
			memorized_end_surah: completedRange?.endSurahNumber || null,
			memorized_end_verse: completedRange?.endVerseNumber || null,
		})
		.eq("id", student.id)
		.select("id, name, halaqah, completed_juzs, current_juzs, memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse")
		.single()

	if (error) {
		throw error
	}

	return data
}

export async function GET(request: NextRequest) {
	try {
		const supabase = createAdminClient()
		const actor = await getRequestActor(request, supabase as any)
		if (!actor) {
			return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 })
		}

		if (!isAdminRole(actor.role) && !isTeacherRole(actor.role) && actor.role !== "student") {
			return NextResponse.json({ error: "ليس لديك صلاحية الوصول" }, { status: 403 })
		}

		const { searchParams } = new URL(request.url)
		let circleName = String(searchParams.get("circle") || "").trim()
		let studentId = String(searchParams.get("student_id") || "").trim()
		const portionSettings = { mode: "juz" as const }

		if (actor.role === "student") {
			studentId = actor.id
			circleName = ""
		} else if (studentId && !isAdminRole(actor.role)) {
			const allowed = await canAccessStudent({ supabase: supabase as any, actor, studentId, allowTeacher: true })
			if (!allowed) {
				return NextResponse.json({ error: "ليس لديك صلاحية الوصول إلى هذا الطالب" }, { status: 403 })
			}
		} else if (circleName && !isAdminRole(actor.role) && !canManageHalaqah(actor, circleName)) {
			return NextResponse.json({ error: "لا يمكنك الوصول إلى حلقة أخرى" }, { status: 403 })
		}

		let query = supabase
			.from("student_exams")
			.select("id, student_id, halaqah, exam_portion_label, portion_type, portion_number, juz_number, exam_date, alerts_count, mistakes_count, final_score, passed, notes, tested_by_name, students(name, account_number)")
			.order("exam_date", { ascending: false })
			.order("created_at", { ascending: false })

		if (circleName) {
			query = query.eq("halaqah", circleName)
		}

		if (studentId) {
			query = query.eq("student_id", studentId)
		}

		const { data, error } = await query
		if (error) {
			if (isMissingExamPortionColumns(error)) {
				return NextResponse.json({ error: "حقول نظام الأجزاء/الأحزاب غير مضافة بعد. نفذ ملف SQL الخاص بنظام الاختبارات أولاً." }, { status: 503 })
			}

			if (isMissingStudentExamsTable(error)) {
				return NextResponse.json({ exams: [], tableMissing: true, portionSettings }, { status: 200 })
			}

			throw error
		}

		return NextResponse.json({ exams: data || [], tableMissing: false, portionSettings })
	} catch (error) {
		console.error("[exams][GET]", error)
		return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
	}
}

export async function POST(request: NextRequest) {
	try {
		const supabase = createAdminClient()
		const actor = await getRequestActor(request, supabase as any)
		if (!actor) {
			return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 })
		}

		if (!isAdminRole(actor.role) && !isTeacherRole(actor.role)) {
			return NextResponse.json({ error: "ليس لديك صلاحية الوصول" }, { status: 403 })
		}

		const body = await request.json()
		const settings = await getExamSettings()
		const studentId = String(body.student_id || "").trim()
		const examDate = String(body.exam_date || getSaudiDateString()).trim()
		const portionType = "juz" as const
		const portionNumber = body.portion_number === null || body.portion_number === undefined || body.portion_number === ""
			? (body.juz_number === null || body.juz_number === undefined || body.juz_number === "" ? null : Number(body.juz_number))
			: Number(body.portion_number)
		const testedByName = String(body.tested_by_name || "").trim() || "الإدارة"
		const alertsCount = parseCount(body.alerts_count)
		const mistakesCount = parseCount(body.mistakes_count)
		const notes = String(body.notes || "").trim() || null
		const failedAction = body.failed_action === "reschedule_exam" ? "reschedule_exam" : "repeat_memorization"
		const retryExamDate = String(body.retry_exam_date || "").trim()

		if (!studentId) {
			return NextResponse.json({ error: "الطالب مطلوب" }, { status: 400 })
		}

		if (!isValidExamPortionNumber(portionType, portionNumber)) {
			return NextResponse.json({ error: portionType === "hizb" ? "رقم الحزب غير صالح" : "رقم الجزء غير صالح" }, { status: 400 })
		}

		if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
			return NextResponse.json({ error: "تاريخ الاختبار غير صالح" }, { status: 400 })
		}

		const score = calculateExamScore({ alerts: alertsCount, mistakes: mistakesCount }, settings)
		if (!score.passed && failedAction === "reschedule_exam" && !/^\d{4}-\d{2}-\d{2}$/.test(retryExamDate)) {
			return NextResponse.json({ error: "حدد موعد الإعادة عند اختيار إعادة جدولة الاختبار" }, { status: 400 })
		}

		if (!isAdminRole(actor.role)) {
			const allowed = await canAccessStudent({ supabase: supabase as any, actor, studentId, allowTeacher: true })
			if (!allowed) {
				return NextResponse.json({ error: "ليس لديك صلاحية الوصول إلى هذا الطالب" }, { status: 403 })
			}
		}

		const { data: student, error: studentError } = await supabase
			.from("students")
			.select("id, name, halaqah, account_number, guardian_phone, completed_juzs, current_juzs, memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse")
			.eq("id", studentId)
			.maybeSingle()

		if (studentError) {
			throw studentError
		}

		if (!student) {
			return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 })
		}

		if (!student.halaqah) {
			return NextResponse.json({ error: "الطالب غير مرتبط بحلقة" }, { status: 400 })
		}

		const activePlanProgress = await getStudentActivePlanProgress(supabase, student.id)
		const eligiblePortions = getEligibleExamPortions(student, activePlanProgress, portionType)
		if (eligiblePortions.length > 0 && !eligiblePortions.some((portion) => portion.portionType === portionType && portion.portionNumber === portionNumber)) {
			return NextResponse.json({ error: portionType === "hizb" ? "لا يمكن اختبار حزب غير متاح حاليًا لهذا الطالب" : "لا يمكن اختبار جزء غير متاح حاليًا لهذا الطالب" }, { status: 400 })
		}

		const examPortionLabel = formatExamPortionLabel(portionNumber, portionType === "hizb" ? `الحزب ${portionNumber}` : `الجزء ${portionNumber}`, portionType)
		const juzNumber = getJuzNumberForPortion(portionType, portionNumber)

		const { data: insertedExam, error: insertError } = await supabase
			.from("student_exams")
			.insert({
				student_id: student.id,
				halaqah: student.halaqah,
				exam_portion_label: examPortionLabel,
				portion_type: portionType,
				portion_number: portionNumber,
				juz_number: juzNumber,
				exam_date: examDate,
				alerts_count: score.alerts,
				mistakes_count: score.mistakes,
				final_score: score.finalScore,
				passed: score.passed,
				notes,
				tested_by_name: testedByName,
			})
			.select("id, student_id, halaqah, exam_portion_label, portion_type, portion_number, juz_number, exam_date, alerts_count, mistakes_count, final_score, passed, notes, tested_by_name")
			.single()

		if (insertError) {
			if (isMissingExamPortionColumns(insertError)) {
				return NextResponse.json({ error: "حقول نظام الأجزاء/الأحزاب غير مضافة بعد. نفذ ملف SQL الخاص بنظام الاختبارات أولاً." }, { status: 503 })
			}

			if (isMissingStudentExamsTable(insertError)) {
				return NextResponse.json({ error: "جدول الاختبارات غير موجود بعد. طبّق ملف SQL أولاً.", tableMissing: true }, { status: 503 })
			}

			throw insertError
		}

		let updatedStudent = student

		if (juzNumber) {
			if (score.passed) {
				updatedStudent = await markPassedJuzAsMemorized(supabase, student, juzNumber)
			} else if (failedAction === "repeat_memorization") {
				updatedStudent = await markFailedJuzForRememorization(supabase, student, juzNumber)
			}
		}

		await supabase
			.from("exam_schedules")
			.update({ status: "completed", completed_exam_id: insertedExam.id, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
			.eq("student_id", student.id)
			.eq("portion_type", portionType)
			.eq("portion_number", portionNumber)
			.eq("status", "scheduled")

		let rescheduledSchedule: Record<string, unknown> | null = null

		if (!score.passed && failedAction === "reschedule_exam") {
			const { data: insertedRescheduledSchedule, error: rescheduleInsertError } = await supabase
				.from("exam_schedules")
				.insert({
					student_id: student.id,
					halaqah: student.halaqah,
					exam_portion_label: examPortionLabel,
					portion_type: portionType,
					portion_number: portionNumber,
					juz_number: juzNumber,
					exam_date: retryExamDate,
					status: "scheduled",
					notification_sent_at: new Date().toISOString(),
					scheduled_by_name: testedByName,
					scheduled_by_role: actor.role,
					updated_at: new Date().toISOString(),
				})
				.select("id, student_id, halaqah, exam_portion_label, portion_type, portion_number, juz_number, exam_date, status, notification_sent_at, completed_exam_id, completed_at, cancelled_at, scheduled_by_name, scheduled_by_role, created_at, updated_at")
				.single()

			if (rescheduleInsertError) {
				throw rescheduleInsertError
			}

			rescheduledSchedule = insertedRescheduledSchedule

			try {
				await notifyGuardian(supabase, {
					accountNumber: student.account_number,
					appMessage: `تمت إعادة جدولة اختبار ${examPortionLabel} للطالب ${student.name || "الطالب"} بتاريخ ${formatScheduledDate(retryExamDate)}.`,
					phoneNumber: student.guardian_phone,
					whatsappMessage: `تمت إعادة جدولة اختبار ${examPortionLabel} للطالب ${student.name || "الطالب"} بتاريخ ${formatScheduledDate(retryExamDate)}.`,
					userId: actor.id,
				})
			} catch (rescheduleNotificationError) {
				console.error("[exams][POST][reschedule-notify]", rescheduleNotificationError)
			}
		}

		try {
			const guardianMessage = buildExamResultGuardianMessage({
				studentName: student.name || "الطالب",
				halaqah: student.halaqah || "",
				portionLabel: examPortionLabel,
				examDate,
				finalScore: score.finalScore,
				passed: score.passed,
			})

			await notifyGuardian(supabase, {
				accountNumber: student.account_number,
				appMessage: guardianMessage,
				phoneNumber: student.guardian_phone,
				whatsappMessage: guardianMessage,
				userId: actor.id,
			})
		} catch (notificationError) {
			console.error("[exams][POST][guardian-notify]", notificationError)
		}

		return NextResponse.json({ success: true, exam: insertedExam, score, student: updatedStudent, rescheduledSchedule })
	} catch (error) {
		console.error("[exams][POST]", error)
		return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
	}
}