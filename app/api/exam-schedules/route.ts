import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getRequestActor, canAccessStudent, canManageHalaqah, isAdminRole, isTeacherRole } from "@/lib/request-auth"
import { getExamPortionSettings } from "@/lib/exam-portion-settings-server"
import { formatExamPortionLabel, getEligibleExamPortions } from "@/lib/student-exams"
import { getJuzNumberForPortion, isValidExamPortionNumber, normalizeExamPortionType } from "@/lib/exam-portions"
import { getCompletedMemorizationDays } from "@/lib/plan-progress"
import { isPassingMemorizationLevel } from "@/lib/student-attendance"
import type { StudentExamPlanProgressSource } from "@/lib/student-exams"
import {
	buildExamAppNotificationMessage,
	EXAM_WHATSAPP_SETTINGS_ID,
	fillExamWhatsAppTemplate,
	normalizeExamWhatsAppTemplates,
} from "@/lib/whatsapp-notification-templates"
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

function isMissingExamSchedulesTable(error: unknown) {
	const message = getErrorMessage(error)
	return /exam_schedules/i.test(message) && /does not exist|schema cache|42P01|PGRST205/i.test(message)
}

function isMissingExamPortionColumns(error: unknown) {
	const message = getErrorMessage(error)
	return /portion_type|portion_number/i.test(message) && /column|does not exist|schema cache/i.test(message)
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

async function getExamWhatsAppTemplates(supabase: any) {
	const { data, error } = await supabase
		.from("site_settings")
		.select("value")
		.eq("id", EXAM_WHATSAPP_SETTINGS_ID)
		.maybeSingle()

	if (error) {
		throw error
	}

	return normalizeExamWhatsAppTemplates(data?.value)
}

async function insertAppNotification(supabase: any, accountNumber: string | number | null | undefined, message: string) {
	const normalizedAccountNumber = String(accountNumber || "").trim()
	const normalizedMessage = String(message || "").trim()

	if (!normalizedAccountNumber || !normalizedMessage) {
		return
	}

	const { error } = await supabase.from("notifications").insert({
		user_account_number: normalizedAccountNumber,
		message: normalizedMessage,
	})

	if (error) {
		throw error
	}
}

async function notifyExamScheduleChange(supabase: any, params: {
	kind: "create" | "update" | "cancel"
	student: {
		name?: string | null
		halaqah?: string | null
		guardian_phone?: string | null
		account_number?: string | number | null
	}
	portionLabel: string
	examDate: string
	userId?: string | null
}) {
	const templates = await getExamWhatsAppTemplates(supabase)
	const templateParams = {
		studentName: params.student.name || "الطالب",
		date: formatScheduledDate(params.examDate),
		portion: params.portionLabel,
		halaqah: params.student.halaqah || "",
	}

	const appMessage = buildExamAppNotificationMessage(params.kind, templateParams, templates)
	await insertAppNotification(supabase, params.student.account_number, appMessage)

	const whatsappTemplate = templates[params.kind]
	const whatsappMessage = fillExamWhatsAppTemplate(whatsappTemplate, templateParams)
	await notifyGuardian(supabase, {
		phoneNumber: params.student.guardian_phone,
		whatsappMessage: whatsappMessage,
		userId: params.userId,
	})
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
		let studentId = String(searchParams.get("student_id") || "").trim()
		const circleName = String(searchParams.get("circle") || "").trim()
		const portionSettings = await getExamPortionSettings()

		if (actor.role === "student") {
			studentId = actor.id
		} else if (studentId && !isAdminRole(actor.role)) {
			const allowed = await canAccessStudent({ supabase: supabase as any, actor, studentId, allowTeacher: true })
			if (!allowed) {
				return NextResponse.json({ error: "ليس لديك صلاحية الوصول إلى هذا الطالب" }, { status: 403 })
			}
		} else if (circleName && !isAdminRole(actor.role) && !canManageHalaqah(actor, circleName)) {
			return NextResponse.json({ error: "لا يمكنك الوصول إلى حلقة أخرى" }, { status: 403 })
		}

		let query = supabase
			.from("exam_schedules")
			.select("id, student_id, halaqah, exam_portion_label, portion_type, portion_number, juz_number, exam_date, status, notification_sent_at, completed_exam_id, completed_at, cancelled_at, scheduled_by_name, scheduled_by_role, created_at, updated_at, students(name)")
			.order("exam_date", { ascending: true })
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

			if (isMissingExamSchedulesTable(error)) {
				return NextResponse.json({ schedules: [], tableMissing: true, portionSettings }, { status: 200 })
			}

			throw error
		}

		return NextResponse.json({ schedules: data || [], tableMissing: false, portionSettings })
	} catch (error) {
		console.error("[exam-schedules][GET]", error)
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

		const portionSettings = await getExamPortionSettings()
		const body = await request.json()
		const studentId = String(body.student_id || "").trim()
		const portionType = normalizeExamPortionType(body.portion_type || portionSettings.mode)
		const portionNumber = Number(body.portion_number ?? body.juz_number)
		const examDate = String(body.exam_date || "").trim()

		if (!studentId) {
			return NextResponse.json({ error: "الطالب مطلوب" }, { status: 400 })
		}

		if (!isValidExamPortionNumber(portionType, portionNumber)) {
			return NextResponse.json({ error: portionType === "hizb" ? "رقم الحزب غير صالح" : "رقم الجزء غير صالح" }, { status: 400 })
		}

		if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
			return NextResponse.json({ error: "تاريخ الاختبار غير صالح" }, { status: 400 })
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

		if (!student?.id || !student.halaqah) {
			return NextResponse.json({ error: "الطالب غير موجود أو غير مرتبط بحلقة" }, { status: 404 })
		}

		const activePlanProgress = await getStudentActivePlanProgress(supabase, student.id)
		const eligiblePortions = getEligibleExamPortions(student, activePlanProgress, portionType)
		if (eligiblePortions.length > 0 && !eligiblePortions.some((portion) => portion.portionType === portionType && portion.portionNumber === portionNumber)) {
			return NextResponse.json({ error: portionType === "hizb" ? "لا يمكن جدولة اختبار لحزب غير متاح حاليًا لهذا الطالب" : "لا يمكن جدولة اختبار لجزء غير متاح حاليًا لهذا الطالب" }, { status: 400 })
		}

		const { data: existingSchedule, error: existingScheduleError } = await supabase
			.from("exam_schedules")
			.select("id")
			.eq("student_id", student.id)
			.eq("portion_type", portionType)
			.eq("portion_number", portionNumber)
			.eq("status", "scheduled")
			.maybeSingle()

		if (existingScheduleError) {
			if (isMissingExamPortionColumns(existingScheduleError)) {
				return NextResponse.json({ error: "حقول نظام الأجزاء/الأحزاب غير مضافة بعد. نفذ ملف SQL الخاص بنظام الاختبارات أولاً." }, { status: 503 })
			}

			if (isMissingExamSchedulesTable(existingScheduleError)) {
				return NextResponse.json({ error: "جدول مواعيد الاختبارات غير موجود بعد. طبّق ملف SQL أولاً.", tableMissing: true }, { status: 503 })
			}

			throw existingScheduleError
		}

		if (existingSchedule?.id) {
			return NextResponse.json({ error: portionType === "hizb" ? "يوجد موعد اختبار مجدول مسبقًا لهذا الحزب" : "يوجد موعد اختبار مجدول مسبقًا لهذا الجزء" }, { status: 400 })
		}

		const examPortionLabel = formatExamPortionLabel(portionNumber, portionType === "hizb" ? `الحزب ${portionNumber}` : `الجزء ${portionNumber}`, portionType)
		const schedulePayload = {
			student_id: student.id,
			halaqah: student.halaqah,
			exam_portion_label: examPortionLabel,
			portion_type: portionType,
			portion_number: portionNumber,
			juz_number: getJuzNumberForPortion(portionType, portionNumber),
			exam_date: examDate,
			status: "scheduled",
			notification_sent_at: new Date().toISOString(),
			scheduled_by_name: actor.accountNumber === 2 ? "الإدارة" : "المستخدم الحالي",
			scheduled_by_role: actor.role,
			updated_at: new Date().toISOString(),
		}

		const { data: schedule, error: scheduleError } = await supabase
			.from("exam_schedules")
			.insert(schedulePayload)
			.select("id, student_id, halaqah, exam_portion_label, portion_type, portion_number, juz_number, exam_date, status, notification_sent_at, completed_exam_id, completed_at, cancelled_at, scheduled_by_name, scheduled_by_role, created_at, updated_at")
			.single()

		if (scheduleError) {
			if (isMissingExamPortionColumns(scheduleError)) {
				return NextResponse.json({ error: "حقول نظام الأجزاء/الأحزاب غير مضافة بعد. نفذ ملف SQL الخاص بنظام الاختبارات أولاً." }, { status: 503 })
			}

			if (isMissingExamSchedulesTable(scheduleError)) {
				return NextResponse.json({ error: "جدول مواعيد الاختبارات غير موجود بعد. طبّق ملف SQL أولاً.", tableMissing: true }, { status: 503 })
			}

			throw scheduleError
		}

		await notifyExamScheduleChange(supabase, {
			kind: "create",
			student,
			portionLabel: examPortionLabel,
			examDate,
			userId: actor.id,
		})

		return NextResponse.json({ success: true, schedule })
	} catch (error) {
		console.error("[exam-schedules][POST]", error)
		return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
	}
}

export async function PATCH(request: NextRequest) {
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
		const id = String(body.id || "").trim()
		const examDate = String(body.exam_date || "").trim()

		if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
			return NextResponse.json({ error: "بيانات التعديل غير صالحة" }, { status: 400 })
		}

		const { data: existingSchedule, error: existingError } = await supabase
			.from("exam_schedules")
			.select("id, student_id, halaqah, status, exam_portion_label, portion_type, portion_number, juz_number")
			.eq("id", id)
			.maybeSingle()

		if (existingError) {
			throw existingError
		}

		if (!existingSchedule) {
			return NextResponse.json({ error: "الموعد غير موجود" }, { status: 404 })
		}

		if (!isAdminRole(actor.role)) {
			if (!canManageHalaqah(actor, existingSchedule.halaqah)) {
				return NextResponse.json({ error: "لا يمكنك تعديل موعد في حلقة أخرى" }, { status: 403 })
			}
		}

		const { data, error } = await supabase
			.from("exam_schedules")
			.update({ exam_date: examDate, updated_at: new Date().toISOString() })
			.eq("id", id)
			.select("id, student_id, halaqah, exam_portion_label, portion_type, portion_number, juz_number, exam_date, status, notification_sent_at, completed_exam_id, completed_at, cancelled_at, scheduled_by_name, scheduled_by_role, created_at, updated_at")
			.single()

		if (error) {
			throw error
		}

		const { data: student, error: studentError } = await supabase
			.from("students")
			.select("name, halaqah, account_number, guardian_phone")
			.eq("id", existingSchedule.student_id)
			.maybeSingle()

		if (studentError) {
			throw studentError
		}

		const existingPortionType = normalizeExamPortionType(existingSchedule.portion_type)
		const existingPortionNumber = Number(existingSchedule.portion_number || existingSchedule.juz_number)
		await notifyExamScheduleChange(supabase, {
			kind: "update",
			student: student || {},
			portionLabel: existingSchedule.exam_portion_label || formatExamPortionLabel(existingPortionNumber, existingPortionType === "hizb" ? `الحزب ${existingPortionNumber}` : `الجزء ${existingPortionNumber}`, existingPortionType),
			examDate,
			userId: actor.id,
		})

		return NextResponse.json({ success: true, schedule: data })
	} catch (error) {
		console.error("[exam-schedules][PATCH]", error)
		return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const supabase = createAdminClient()
		const actor = await getRequestActor(request, supabase as any)
		if (!actor) {
			return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 })
		}

		if (!isAdminRole(actor.role) && !isTeacherRole(actor.role)) {
			return NextResponse.json({ error: "ليس لديك صلاحية الوصول" }, { status: 403 })
		}

		const { searchParams } = new URL(request.url)
		const id = String(searchParams.get("id") || "").trim()

		if (!id) {
			return NextResponse.json({ error: "معرف الموعد مطلوب" }, { status: 400 })
		}

		const { data: existingSchedule, error: existingError } = await supabase
			.from("exam_schedules")
			.select("id, student_id, halaqah, exam_portion_label, portion_type, portion_number, juz_number, exam_date")
			.eq("id", id)
			.maybeSingle()

		if (existingError) {
			throw existingError
		}

		if (!existingSchedule) {
			return NextResponse.json({ error: "الموعد غير موجود" }, { status: 404 })
		}

		if (!isAdminRole(actor.role) && !canManageHalaqah(actor, existingSchedule.halaqah)) {
			return NextResponse.json({ error: "لا يمكنك إلغاء موعد في حلقة أخرى" }, { status: 403 })
		}

		const { error } = await supabase
			.from("exam_schedules")
			.update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
			.eq("id", id)

		if (error) {
			throw error
		}

		const { data: student, error: studentError } = await supabase
			.from("students")
			.select("name, halaqah, account_number, guardian_phone")
			.eq("id", existingSchedule.student_id)
			.maybeSingle()

		if (studentError) {
			throw studentError
		}

		const existingPortionType = normalizeExamPortionType(existingSchedule.portion_type)
		const existingPortionNumber = Number(existingSchedule.portion_number || existingSchedule.juz_number)
		await notifyExamScheduleChange(supabase, {
			kind: "cancel",
			student: student || {},
			portionLabel: existingSchedule.exam_portion_label || formatExamPortionLabel(existingPortionNumber, existingPortionType === "hizb" ? `الحزب ${existingPortionNumber}` : `الجزء ${existingPortionNumber}`, existingPortionType),
			examDate: existingSchedule.exam_date,
			userId: actor.id,
		})

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error("[exam-schedules][DELETE]", error)
		return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
	}
}