import { NextRequest, NextResponse } from "next/server"

import { isMemorizationOffDay } from "@/lib/plan-session-progress"
import { getSaudiAttendanceAnchorDate, getSaudiWeekday } from "@/lib/saudi-time"
import { createClient } from "@/lib/supabase/server"
import { countAbsenceStatuses } from "@/lib/student-absence"

type IssueSeverity = "warning" | "alert"
type IssueCategory = "attendance" | "execution"
type IssueScope = "today" | "total"

type DailyReportRow = {
	student_id: string
	report_date: string
	memorization_done: boolean | null
	tikrar_done: boolean | null
	review_done: boolean | null
	linking_done: boolean | null
	notes: string | null
}

type AttendanceRow = {
	student_id: string
	date: string
	status: string | null
	notes: string | null
}

type StudentIssueReason = {
	code: string
	category: IssueCategory
	severity: IssueSeverity
	title: string
	description: string
	date: string
	missingTasks?: string[]
}

type StudentIssueActionRow = {
	id: string
	student_id: string | null
	student_account_number: string | null
	notification_id: string | null
	circle_name: string | null
	issue_date: string
	action_type: IssueSeverity
	action_source: "manual" | "automatic"
	issue_summary: string | null
	issue_reasons: StudentIssueReason[] | null
	message: string
	sent_at: string
	updated_at: string | null
	sent_by_account_number: string | null
	sent_by_role: string | null
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

function isAttendanceAnchorDay(dateValue: string) {
	const weekday = getSaudiWeekday(dateValue)
	return weekday === 0 || weekday === 3
}

function addSaudiDays(dateValue: string, days: number) {
	const date = new Date(`${dateValue}T12:00:00+03:00`)
	date.setUTCDate(date.getUTCDate() + days)
	return date.toISOString().slice(0, 10)
}

function getSaudiDatesInRange(startDate: string, endDate: string) {
	const dates: string[] = []
	let currentDate = startDate

	while (currentDate <= endDate) {
		dates.push(currentDate)
		currentDate = addSaudiDays(currentDate, 1)
	}

	return dates
}

function getAnchorDatesInRange(startDate: string, endDate: string) {
	const anchorDates = new Set<string>()
	let currentDate = startDate

	while (currentDate <= endDate) {
		anchorDates.add(getSaudiAttendanceAnchorDate(currentDate))
		currentDate = addSaudiDays(currentDate, 1)
	}

	return Array.from(anchorDates).sort((left, right) => left.localeCompare(right))
}

function uniqAttendanceByAnchorDate(records: AttendanceRow[]) {
	const latestByDate = new Map<string, AttendanceRow>()

	for (const record of records) {
		if (!record.date) {
			continue
		}

		if (!latestByDate.has(record.date)) {
			latestByDate.set(record.date, record)
		}
	}

	return Array.from(latestByDate.values())
}

function getMissingDailyTasks(report: DailyReportRow | null | undefined, date: string) {
	const memorizationOffDay = isMemorizationOffDay(date)
	const missingTasks: string[] = []

	if (!report?.review_done) {
		missingTasks.push("المراجعة")
	}

	if (!memorizationOffDay) {
		if (!report?.memorization_done) {
			missingTasks.push("الحفظ")
		}
		if (!report?.tikrar_done) {
			missingTasks.push("التكرار")
		}
		if (!report?.linking_done) {
			missingTasks.push("الربط")
		}
	}

	return missingTasks
}

function getRecommendedAction(reasons: StudentIssueReason[]): IssueSeverity {
	return reasons.some((reason) => reason.severity === "alert") ? "alert" : "warning"
}

function getIssueDateWindow(issueDate: string) {
	return {
		start: `${issueDate}T00:00:00+03:00`,
		end: `${issueDate}T23:59:59.999+03:00`,
	}
}

async function resolveLinkedNotificationId(supabase: Awaited<ReturnType<typeof createClient>>, action: Pick<StudentIssueActionRow, "notification_id" | "student_account_number" | "message" | "issue_date">) {
	if (action.notification_id) {
		return action.notification_id
	}

	if (!action.student_account_number) {
		return null
	}

	const window = getIssueDateWindow(action.issue_date)
	const { data, error } = await supabase
		.from("notifications")
		.select("id")
		.eq("user_account_number", action.student_account_number)
		.eq("message", action.message)
		.gte("created_at", window.start)
		.lte("created_at", window.end)
		.order("created_at", { ascending: false })
		.limit(1)

	if (error) {
		throw new Error("تعذر ربط السجل بالإشعار الحالي")
	}

	return data?.[0]?.id || null
}

export async function GET(request: NextRequest) {
	try {
		const date = request.nextUrl.searchParams.get("date")?.trim() || getKsaDateString()
		const fromDate = request.nextUrl.searchParams.get("from")?.trim() || ""
		const toDate = request.nextUrl.searchParams.get("to")?.trim() || ""
		const selectedCircle = request.nextUrl.searchParams.get("circle")?.trim() || "all"
		const scope: IssueScope = request.nextUrl.searchParams.get("scope") === "total" || request.nextUrl.searchParams.get("scope") === "total_with_today"
			? "total"
			: "today"
		const rangeStart = scope === "total" ? (fromDate || date) : date
		const rangeEnd = scope === "total" ? (toDate || date) : date
		const selectedAnchorDate = getSaudiAttendanceAnchorDate(date)
		const canFlagTodayAbsence = isAttendanceAnchorDay(date)

		if (rangeStart > rangeEnd) {
			return NextResponse.json({ error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" }, { status: 400 })
		}

		const supabase = await createClient()

		let studentsQuery = supabase
			.from("students")
			.select("id, name, account_number, halaqah")
			.order("halaqah", { ascending: true })
			.order("name", { ascending: true })

		if (selectedCircle !== "all") {
			studentsQuery = studentsQuery.eq("halaqah", selectedCircle)
		}

		const { data: students, error: studentsError } = await studentsQuery

		if (studentsError) {
			return NextResponse.json({ error: "تعذر جلب بيانات الطلاب" }, { status: 500 })
		}

		const studentIds = ((students || []) as Array<{ id: string }>).map((student) => student.id)
		const attendanceAnchorDates = getAnchorDatesInRange(rangeStart, rangeEnd)
		const reportDatesInRange = getSaudiDatesInRange(rangeStart, rangeEnd)

		const [{ data: attendanceRecords, error: attendanceError }, { data: dailyReports, error: dailyReportsError }, { data: issueActions, error: issueActionsError }] = await Promise.all([
			studentIds.length > 0 && attendanceAnchorDates.length > 0
				? supabase
					.from("attendance_records")
					.select("student_id, date, status, notes")
					.in("student_id", studentIds)
					.in("date", attendanceAnchorDates)
				: Promise.resolve({ data: [] as AttendanceRow[], error: null }),
			studentIds.length > 0
				? supabase
					.from("student_daily_reports")
					.select("student_id, report_date, memorization_done, tikrar_done, review_done, linking_done, notes")
					.in("student_id", studentIds)
					.gte("report_date", rangeStart)
					.lte("report_date", rangeEnd)
				: Promise.resolve({ data: [] as DailyReportRow[], error: null }),
			studentIds.length > 0
				? (() => {
					let query = supabase
						.from("student_issue_actions")
						.select("id, student_id, student_account_number, notification_id, circle_name, issue_date, action_type, action_source, issue_summary, issue_reasons, message, sent_at, updated_at, sent_by_account_number, sent_by_role")
						.in("student_id", studentIds)
						.gte("issue_date", rangeStart)
						.lte("issue_date", rangeEnd)
						.order("sent_at", { ascending: false })

					return query
				})()
				: Promise.resolve({ data: [] as StudentIssueActionRow[], error: null }),
		])

		if (attendanceError) {
			return NextResponse.json({ error: "تعذر جلب بيانات الحضور" }, { status: 500 })
		}

		if (issueActionsError) {
			return NextResponse.json({ error: "تعذر جلب سجل التنبيهات والإنذارات" }, { status: 500 })
		}

		const safeAttendance = (attendanceRecords || []) as AttendanceRow[]
		const safeDailyReports = dailyReportsError ? [] : ((dailyReports || []) as DailyReportRow[])
		const circles = Array.from(
			new Set(
				((students || []) as Array<{ halaqah: string | null }>).map((student) => (student.halaqah || "").trim()).filter(Boolean),
			),
		).sort((left, right) => left.localeCompare(right, "ar"))

		const attendanceByStudent = safeAttendance.reduce<Map<string, AttendanceRow[]>>((acc, record) => {
			const existing = acc.get(record.student_id) || []
			existing.push(record)
			acc.set(record.student_id, existing)
			return acc
		}, new Map())

		const dailyReportsByStudent = safeDailyReports.reduce<Map<string, Map<string, DailyReportRow>>>((acc, report) => {
			const reportsByDate = acc.get(report.student_id) || new Map<string, DailyReportRow>()
			reportsByDate.set(report.report_date, report)
			acc.set(report.student_id, reportsByDate)
			return acc
		}, new Map())
		const issueActionsByStudent = ((issueActions || []) as StudentIssueActionRow[]).reduce<Map<string, StudentIssueActionRow[]>>((acc, action) => {
			if (!action.student_id) {
				return acc
			}
			const existing = acc.get(action.student_id) || []
			existing.push(action)
			acc.set(action.student_id, existing)
			return acc
		}, new Map())

		const rows = (students || [])
			.map((student) => {
				const studentAttendance = attendanceByStudent.get(student.id) || []
				const normalizedAttendance = uniqAttendanceByAnchorDate(studentAttendance)
				const selectedAttendance = canFlagTodayAbsence
					? normalizedAttendance.find((record) => record.date === selectedAnchorDate) || null
					: null
				const reportsByDate = dailyReportsByStudent.get(student.id) || new Map<string, DailyReportRow>()
				const dailyReport = reportsByDate.get(date) || null
				const { absentCount, excusedCount, effectiveAbsenceCount } = countAbsenceStatuses(
					normalizedAttendance.map((record) => record.status),
				)
				const studentActions = issueActionsByStudent.get(student.id) || []
				const warningCount = studentActions.filter((action) => action.action_type === "warning").length
				const alertCount = studentActions.filter((action) => action.action_type === "alert").length
				const lastAction = studentActions[0]
				const reasons: StudentIssueReason[] = []

				if (canFlagTodayAbsence && selectedAttendance?.status === "absent") {
					reasons.push({
						code: "absence_today",
						category: "attendance",
						severity: "alert",
						title: "غياب اليوم المحتسب",
						description: `الطالب غائب على اليوم المحتسب ${selectedAnchorDate}.`,
						date,
					})
				}

				if (scope === "total" && effectiveAbsenceCount >= 1) {
					reasons.push({
						code: "effective_absence_count",
						category: "attendance",
						severity: effectiveAbsenceCount >= 2 ? "alert" : "warning",
						title: effectiveAbsenceCount >= 2 ? "ارتفاع الغياب المحتسب" : "غياب محتسب",
						description: `المجموع المحتسب ${effectiveAbsenceCount} (${absentCount} غياب و${excusedCount} استئذان).`,
						date,
					})
				}

				if (scope === "total" && excusedCount >= 2) {
					reasons.push({
						code: "repeated_excused",
						category: "attendance",
						severity: "warning",
						title: "تكرار الاستئذان",
						description: `لدى الطالب ${excusedCount} استئذان${excusedCount === 2 ? "ين" : "ات"}.`,
						date,
					})
				}

				const executionIssueDates = scope === "total" ? reportDatesInRange : [date]
				const executionReasons = executionIssueDates.flatMap((issueDate) => {
					const issueReport = reportsByDate.get(issueDate) || null
					const issueMissingTasks = getMissingDailyTasks(issueReport, issueDate)

					if (issueMissingTasks.length === 0) {
						return []
					}

					return [{
						code: `daily_execution_missing_${issueDate}`,
						category: "execution" as const,
						severity: issueMissingTasks.length >= 2 ? "alert" as const : "warning" as const,
						title: scope === "total" ? `نقص في التنفيذ بتاريخ ${issueDate}` : "نقص في التنفيذ اليومي",
						description: `العناصر الناقصة: ${issueMissingTasks.join("، ")}.`,
						date: issueDate,
						missingTasks: issueMissingTasks,
					} satisfies StudentIssueReason]
				})

				reasons.push(...executionReasons)
				const missingTasks = Array.from(
					new Set(executionReasons.flatMap((reason) => reason.missingTasks || [])),
				)

				if (reasons.length === 0 && studentActions.length === 0) {
					return null
				}

				const recommendedAction = reasons.length > 0
					? getRecommendedAction(reasons)
					: studentActions.some((action) => action.action_type === "alert")
						? "alert"
						: "warning"

				return {
					studentId: student.id,
					studentName: student.name?.trim() || "طالب غير معرّف",
					accountNumber: student.account_number ? String(student.account_number) : null,
					circleName: (student.halaqah || "").trim() || "بدون حلقة",
					selectedDate: date,
					attendanceStatus: selectedAttendance?.status || null,
					attendanceNotes: selectedAttendance?.notes || null,
					dailyReportNotes: dailyReport?.notes || null,
					absentCount,
					excusedCount,
					effectiveAbsenceCount,
					missingTasks,
					reasons,
					issuesCount: reasons.length,
					recommendedAction,
					warningCount,
					alertCount,
					manualActions: studentActions.map((action) => ({
						id: action.id,
						type: action.action_type,
						source: action.action_source,
						issueDate: action.issue_date,
						issueSummary: action.issue_summary,
						message: action.message,
						sentAt: action.sent_at,
						updatedAt: action.updated_at,
						sentByAccountNumber: action.sent_by_account_number,
						sentByRole: action.sent_by_role,
					})),
					lastAction: lastAction
						? {
							type: lastAction.action_type,
							message: lastAction.message,
							sentAt: lastAction.sent_at,
							sentByAccountNumber: lastAction.sent_by_account_number,
							sentByRole: lastAction.sent_by_role,
						}
						: null,
				}
			})
			.filter((row): row is NonNullable<typeof row> => Boolean(row))
			.sort((left, right) => {
				if (left.recommendedAction !== right.recommendedAction) {
					return left.recommendedAction === "alert" ? -1 : 1
				}

				if (left.issuesCount !== right.issuesCount) {
					return right.issuesCount - left.issuesCount
				}

				if (left.effectiveAbsenceCount !== right.effectiveAbsenceCount) {
					return right.effectiveAbsenceCount - left.effectiveAbsenceCount
				}

				return left.studentName.localeCompare(right.studentName, "ar")
			})

		return NextResponse.json({
			date,
			fromDate: fromDate || null,
			toDate: toDate || null,
			scope,
			circles,
			rows,
			dailyReportsAvailable: !dailyReportsError,
		})
	} catch (error) {
		console.error("[student-issues][GET]", error)
		return NextResponse.json({ error: "حدث خطأ أثناء تجميع مشاكل الطلاب" }, { status: 500 })
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const body = await request.json()
		const actionId = typeof body.actionId === "string" ? body.actionId.trim() : ""
		const message = typeof body.message === "string" ? body.message.trim() : ""
		const issueSummary = typeof body.issueSummary === "string" ? body.issueSummary.trim() : ""
		const issueDate = typeof body.date === "string" && body.date.trim() ? body.date.trim() : ""
		const actionType = body.actionType === "alert" ? "alert" : "warning"
		const issueReasons = Array.isArray(body.issueReasons) ? body.issueReasons : []

		if (!actionId) {
			return NextResponse.json({ error: "معرف السجل مطلوب" }, { status: 400 })
		}

		if (!message) {
			return NextResponse.json({ error: "نص الرسالة مطلوب" }, { status: 400 })
		}

		if (!issueDate) {
			return NextResponse.json({ error: "التاريخ مطلوب" }, { status: 400 })
		}

		const supabase = await createClient()
		const { data: existingAction, error: existingActionError } = await supabase
			.from("student_issue_actions")
			.select("id, notification_id, student_account_number, message, issue_date")
			.eq("id", actionId)
			.maybeSingle()

		if (existingActionError || !existingAction) {
			return NextResponse.json({ error: "تعذر العثور على السجل المطلوب" }, { status: 404 })
		}

		const { error } = await supabase
			.from("student_issue_actions")
			.update({
				action_type: actionType,
				issue_date: issueDate,
				issue_summary: issueSummary || null,
				issue_reasons: issueReasons,
				message,
				updated_at: new Date().toISOString(),
			})
			.eq("id", actionId)

		if (error) {
			return NextResponse.json({ error: "تعذر تحديث السجل الإداري" }, { status: 500 })
		}

		const notificationId = await resolveLinkedNotificationId(supabase, existingAction)
		if (notificationId) {
			const { error: notificationError } = await supabase
				.from("notifications")
				.update({ message })
				.eq("id", notificationId)

			if (notificationError) {
				return NextResponse.json({ error: "تم تحديث السجل الإداري لكن تعذر تحديث الإشعار المرتبط" }, { status: 500 })
			}

			if (!existingAction.notification_id) {
				await supabase
					.from("student_issue_actions")
					.update({ notification_id: notificationId, updated_at: new Date().toISOString() })
					.eq("id", actionId)
			}
		}

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error("[student-issues][PATCH]", error)
		return NextResponse.json({ error: "حدث خطأ أثناء تحديث السجل" }, { status: 500 })
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const body = await request.json()
		const actionId = typeof body.actionId === "string" ? body.actionId.trim() : ""

		if (!actionId) {
			return NextResponse.json({ error: "معرف السجل مطلوب" }, { status: 400 })
		}

		const supabase = await createClient()
		const { data: existingAction, error: existingActionError } = await supabase
			.from("student_issue_actions")
			.select("id, notification_id, student_account_number, message, issue_date")
			.eq("id", actionId)
			.maybeSingle()

		if (existingActionError || !existingAction) {
			return NextResponse.json({ error: "تعذر العثور على السجل المطلوب" }, { status: 404 })
		}

		const notificationId = await resolveLinkedNotificationId(supabase, existingAction)
		if (notificationId) {
			const { error: notificationError } = await supabase
				.from("notifications")
				.delete()
				.eq("id", notificationId)

			if (notificationError) {
				return NextResponse.json({ error: "تعذر حذف الإشعار المرتبط" }, { status: 500 })
			}
		}

		const { error } = await supabase.from("student_issue_actions").delete().eq("id", actionId)

		if (error) {
			return NextResponse.json({ error: "تعذر حذف السجل الإداري" }, { status: 500 })
		}

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error("[student-issues][DELETE]", error)
		return NextResponse.json({ error: "حدث خطأ أثناء حذف السجل" }, { status: 500 })
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const accountNumber = typeof body.accountNumber === "string" ? body.accountNumber.trim() : ""
		const message = typeof body.message === "string" ? body.message.trim() : ""
		const studentId = typeof body.studentId === "string" ? body.studentId.trim() : ""
		const circleName = typeof body.circleName === "string" ? body.circleName.trim() : ""
		const issueSummary = typeof body.issueSummary === "string" ? body.issueSummary.trim() : ""
		const actionType = body.actionType === "alert" ? "alert" : "warning"
		const sentByAccountNumber = typeof body.sentByAccountNumber === "string" ? body.sentByAccountNumber.trim() : ""
		const sentByRole = typeof body.sentByRole === "string" ? body.sentByRole.trim() : ""
		const issueReasons = Array.isArray(body.issueReasons) ? body.issueReasons : []
		const date = typeof body.date === "string" && body.date.trim() ? body.date.trim() : getKsaDateString()

		if (!accountNumber) {
			return NextResponse.json({ error: "رقم حساب الطالب مطلوب" }, { status: 400 })
		}

		if (!message) {
			return NextResponse.json({ error: "نص الرسالة مطلوب" }, { status: 400 })
		}

		const supabase = await createClient()
		const issueDateWindow = getIssueDateWindow(date)
		const { data: existingNotifications, error: existingError } = await supabase
			.from("notifications")
			.select("id")
			.eq("user_account_number", accountNumber)
			.eq("message", message)
			.gte("created_at", issueDateWindow.start)
			.lte("created_at", issueDateWindow.end)

		if (existingError) {
			return NextResponse.json({ error: "تعذر التحقق من الإشعارات السابقة" }, { status: 500 })
		}

		if ((existingNotifications || []).length > 0) {
			return NextResponse.json({ success: true, skipped: true })
		}

		const { data: insertedNotification, error } = await supabase.from("notifications").insert({
			user_account_number: accountNumber,
			message,
		}).select("id").single()

		if (error) {
			return NextResponse.json({ error: "تعذر إرسال الإشعار" }, { status: 500 })
		}

		if (studentId) {
			const { error: actionError } = await supabase.from("student_issue_actions").insert({
				student_id: studentId,
				student_account_number: accountNumber,
				notification_id: insertedNotification?.id || null,
				circle_name: circleName || null,
				issue_date: date,
				action_type: actionType,
				action_source: "manual",
				issue_summary: issueSummary || null,
				issue_reasons: issueReasons,
				message,
				sent_by_account_number: sentByAccountNumber || null,
				sent_by_role: sentByRole || null,
			})

			if (actionError) {
				return NextResponse.json({ error: "تم إرسال الإشعار لكن تعذر حفظ السجل الإداري" }, { status: 500 })
			}
		}

		return NextResponse.json({ success: true })
	} catch (error) {
		console.error("[student-issues][POST]", error)
		return NextResponse.json({ error: "حدث خطأ أثناء إرسال الإشعار" }, { status: 500 })
	}
}