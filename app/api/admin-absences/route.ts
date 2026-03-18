import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { countAbsenceStatuses } from "@/lib/student-absence"

export async function GET(request: NextRequest) {
	try {
		const supabase = await createClient()
		const circle = request.nextUrl.searchParams.get("circle")?.trim()

		let studentsQuery = supabase.from("students").select("id, name, account_number, halaqah")
		if (circle) {
			studentsQuery = studentsQuery.eq("halaqah", circle)
		}

		const { data: students, error: studentsError } = await studentsQuery.order("name", { ascending: true }).limit(10000)

		if (studentsError) {
			return NextResponse.json({ error: "فشل في جلب الطلاب" }, { status: 500 })
		}

		const studentIds = (students || []).map((student) => student.id)
		let statusesByStudent = new Map<string, string[]>()

		if (studentIds.length > 0) {
			const { data: attendanceRecords, error: attendanceError } = await supabase
				.from("attendance_records")
				.select("student_id, status")
				.in("student_id", studentIds)
				.in("status", ["absent", "excused"])
				.limit(50000)

			if (attendanceError) {
				return NextResponse.json({ error: "فشل في جلب سجلات الغياب" }, { status: 500 })
			}

			statusesByStudent = new Map<string, string[]>()
			for (const record of attendanceRecords || []) {
				const current = statusesByStudent.get(record.student_id) || []
				current.push(record.status)
				statusesByStudent.set(record.student_id, current)
			}
		}

		const rows = (students || [])
			.map((student) => {
				const stats = countAbsenceStatuses(statusesByStudent.get(student.id) || [])
				return {
					id: student.id,
					name: student.name,
					account_number: student.account_number,
					halaqah: student.halaqah || "",
					absentCount: stats.absentCount,
					excusedCount: stats.excusedCount,
					effectiveAbsenceCount: stats.effectiveAbsenceCount,
				}
			})
			.sort((first, second) => {
				if (second.effectiveAbsenceCount !== first.effectiveAbsenceCount) {
					return second.effectiveAbsenceCount - first.effectiveAbsenceCount
				}
				if (second.absentCount !== first.absentCount) {
					return second.absentCount - first.absentCount
				}
				return first.name.localeCompare(second.name, "ar")
			})

		const circles = Array.from(
			new Set((students || []).map((student) => (student.halaqah || "").trim()).filter(Boolean)),
		).sort((first, second) => first.localeCompare(second, "ar"))

		return NextResponse.json({ rows, circles })
	} catch (error) {
		console.error("[admin-absences][GET]", error)
		return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
	}
}