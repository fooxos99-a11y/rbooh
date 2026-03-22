import { NextRequest, NextResponse } from "next/server"

import { isMemorizationOffDay } from "@/lib/plan-session-progress"
import { createClient } from "@/lib/supabase/server"
import { countAbsenceStatuses } from "@/lib/student-absence"

type IssueSeverity = "warning" | "alert"
type IssueCategory = "attendance" | "execution"

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
	student_id: string | null
	action_type: IssueSeverity
	message: string
	sent_at: string
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

function isFriday(dateValue: string) {
	return new Date(`${dateValue}T12:00:00+03:00`).getUTCDay() === 5
}

function getMissingDailyTasks(report: DailyReportRow | null | undefined, date: string) {
	const friday = isFriday(date)
	const memorizationOffDay = isMemorizationOffDay(date)
	const missingTasks: string[] = []

	if (!friday && !report?.review_done) {
		missingTasks.push("المراجعة")
	}

	if (!friday && !memorizationOffDay) {
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

export async function GET(request: NextRequest) {
	try {
		const date = request.nextUrl.searchParams.get("date")?.trim() || getKsaDateString()
		const selectedCircle = request.nextUrl.searchParams.get("circle")?.trim() || "all"
		const scope = request.nextUrl.searchParams.get("scope") === "total_with_today" ? "total_with_today" : "today"

		const supabase = await createClient()

		let studentsQuery = supabase
			.from("students")
			.select("id, name, account_number, halaqah")
			.order("halaqah", { ascending: true })
			.order("name", { ascending: true })

		if (selectedCircle !== "all") {
			studentsQuery = studentsQuery.eq("halaqah", selectedCircle)
		}

		const [{ data: students, error: studentsError }, { data: attendanceRecords, error: attendanceError }, { data: dailyReports, error: dailyReportsError }] = await Promise.all([
			studentsQuery,
			supabase
				.from("attendance_records")
				.select("student_id, date, status, notes")
				.lte("date", date),
			supabase
				.from("student_daily_reports")
				.select("student_id, report_date, memorization_done, tikrar_done, review_done, linking_done, notes")
				.eq("report_date", date),
		])

		if (studentsError) {
			return NextResponse.json({ error: "تعذر جلب بيانات الطلاب" }, { status: 500 })
		}

		if (attendanceError) {
			return NextResponse.json({ error: "تعذر جلب بيانات الحضور" }, { status: 500 })
		}

		const safeAttendance = (attendanceRecords || []) as AttendanceRow[]
		const safeDailyReports = dailyReportsError ? [] : ((dailyReports || []) as DailyReportRow[])
		const studentIds = ((students || []) as Array<{ id: string }>).map((student) => student.id)
		const { data: issueActions } = studentIds.length > 0
			? await supabase
				.from("student_issue_actions")
				.select("student_id, action_type, message, sent_at, sent_by_account_number, sent_by_role")
				.in("student_id", studentIds)
				.order("sent_at", { ascending: false })
			: { data: [] as StudentIssueActionRow[] }
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

		const dailyReportsByStudent = new Map(safeDailyReports.map((report) => [report.student_id, report]))
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
				const selectedAttendance = studentAttendance.find((record) => record.date === date) || null
				const dailyReport = dailyReportsByStudent.get(student.id) || null
				const { absentCount, excusedCount, effectiveAbsenceCount } = countAbsenceStatuses(
					studentAttendance.map((record) => record.status),
				)
				const studentActions = issueActionsByStudent.get(student.id) || []
				const warningCount = studentActions.filter((action) => action.action_type === "warning").length
				const alertCount = studentActions.filter((action) => action.action_type === "alert").length
				const lastAction = studentActions[0]
				const reasons: StudentIssueReason[] = []

				if (selectedAttendance?.status === "absent") {
					reasons.push({
						code: "absence_today",
						category: "attendance",
						severity: "alert",
						title: "غياب اليوم",
						description: `الطالب غائب بتاريخ ${date}.`,
						date,
					})
				}

				if (scope === "total_with_today" && effectiveAbsenceCount >= 1) {
					reasons.push({
						code: "effective_absence_count",
						category: "attendance",
						severity: effectiveAbsenceCount >= 2 ? "alert" : "warning",
						title: effectiveAbsenceCount >= 2 ? "ارتفاع الغياب المحتسب" : "غياب محتسب",
						description: `المجموع المحتسب ${effectiveAbsenceCount} (${absentCount} غياب و${excusedCount} استئذان).`,
						date,
					})
				}

				if (scope === "total_with_today" && excusedCount >= 2) {
					reasons.push({
						code: "repeated_excused",
						category: "attendance",
						severity: "warning",
						title: "تكرار الاستئذان",
						description: `لدى الطالب ${excusedCount} استئذان${excusedCount === 2 ? "ين" : "ات"}.`,
						date,
					})
				}

				const missingTasks = getMissingDailyTasks(dailyReport, date)
				if (missingTasks.length > 0) {
					reasons.push({
						code: "daily_execution_missing",
						category: "execution",
						severity: missingTasks.length >= 2 ? "alert" : "warning",
						title: "نقص في التنفيذ اليومي",
						description: `العناصر الناقصة: ${missingTasks.join("، ")}.`,
						date,
						missingTasks,
					})
				}

				if (reasons.length === 0) {
					return null
				}

				const recommendedAction = getRecommendedAction(reasons)

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
		const todayStart = `${date}T00:00:00+03:00`
		const { data: existingNotifications, error: existingError } = await supabase
			.from("notifications")
			.select("id")
			.eq("user_account_number", accountNumber)
			.eq("message", message)
			.gte("created_at", todayStart)

		if (existingError) {
			return NextResponse.json({ error: "تعذر التحقق من الإشعارات السابقة" }, { status: 500 })
		}

		if ((existingNotifications || []).length > 0) {
			return NextResponse.json({ success: true, skipped: true })
		}

		const { error } = await supabase.from("notifications").insert({
			user_account_number: accountNumber,
			message,
		})

		if (error) {
			return NextResponse.json({ error: "تعذر إرسال الإشعار" }, { status: 500 })
		}

		if (studentId) {
			const { error: actionError } = await supabase.from("student_issue_actions").insert({
				student_id: studentId,
				student_account_number: accountNumber,
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