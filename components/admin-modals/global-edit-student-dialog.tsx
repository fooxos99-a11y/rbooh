"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { UserPen } from "lucide-react"

interface Circle {
	id: string
	name: string
}

interface Student {
	id: string
	name: string
	guardian_phone?: string | null
	id_number?: string | null
	halaqah?: string | null
	circle_name?: string | null
}

const normalizeCircleKey = (value?: string | null) =>
	(value || "")
		.replace(/\s+/g, " ")
		.trim()

const getStudentCircleName = (student: Student) => normalizeCircleKey(student.halaqah || student.circle_name || "غير محدد")

export function GlobalEditStudentDialog() {
	const router = useRouter()
	const pathname = usePathname()
	const { toast } = useToast()

	const [isOpen, setIsOpen] = useState(true)
	const [circles, setCircles] = useState<Circle[]>([])
	const [studentsInCircles, setStudentsInCircles] = useState<Record<string, Student[]>>({})
	const [selectedCircleForEdit, setSelectedCircleForEdit] = useState("")
	const [selectedStudentForEdit, setSelectedStudentForEdit] = useState("")
	const [editingStudent, setEditingStudent] = useState<Student | null>(null)
	const [editGuardianPhone, setEditGuardianPhone] = useState("")
	const [editStudentIdNumber, setEditStudentIdNumber] = useState("")
	const [isSubmitting, setIsSubmitting] = useState(false)

	const getStudentsForCircle = (circleName?: string | null) => {
		const normalizedCircle = normalizeCircleKey(circleName)
		if (!normalizedCircle) return []
		return studentsInCircles[normalizedCircle] || []
	}

	useEffect(() => {
		fetchData()
	}, [])

	const fetchData = async () => {
		try {
			const supabase = createClient()
			const [circlesRes, studentsResponse] = await Promise.all([
				supabase.from("circles").select("id, name").order("created_at", { ascending: false }),
				fetch("/api/students", { cache: "no-store" }),
			])

			if (!circlesRes.error && circlesRes.data) {
				setCircles(circlesRes.data)
			}

			if (studentsResponse.ok) {
				const studentsData = await studentsResponse.json()
				const students = Array.isArray(studentsData.students) ? studentsData.students : []
				const grouped: Record<string, Student[]> = {}
				students.forEach((student: Student) => {
					const circleName = getStudentCircleName(student)
					if (!grouped[circleName]) {
						grouped[circleName] = []
					}
					grouped[circleName].push(student)
				})
				setStudentsInCircles(grouped)
			}
		} catch (error) {
			console.error("Error fetching edit-student data:", error)
		}
	}

	const handleClose = (open: boolean) => {
		setIsOpen(open)
		if (!open) {
			setTimeout(() => {
				router.push(pathname || "/")
			}, 300)
		}
	}

	const handleSelectStudentForEdit = (studentId: string) => {
		setSelectedStudentForEdit(studentId)
		const student = getStudentsForCircle(selectedCircleForEdit).find((item) => item.id === studentId) || null
		setEditingStudent(student)
		setEditGuardianPhone(student?.guardian_phone || "")
		setEditStudentIdNumber(student?.id_number || "")
	}

	const handleSaveStudentEdit = async () => {
		if (!editingStudent) return

		setIsSubmitting(true)
		try {
			const response = await fetch("/api/students", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					id: editingStudent.id,
					guardian_phone: editGuardianPhone,
					id_number: editStudentIdNumber,
				}),
			})

			const data = await response.json()

			if (!data.success) {
				throw new Error(data.error || "فشل في تحديث الطالب")
			}

			toast({
				title: "✓ تم الحفظ بنجاح",
				description: `تم تحديث معلومات الطالب ${editingStudent.name} بنجاح`,
				className: "bg-gradient-to-r from-[#3453a7] to-[#4a67b7] text-white border-none",
			})

			setEditingStudent(null)
			setSelectedStudentForEdit("")
			setSelectedCircleForEdit("")
			setEditGuardianPhone("")
			setEditStudentIdNumber("")
			await fetchData()
			handleClose(false)
		} catch (error) {
			console.error("Error updating student:", error)
			toast({
				title: "حدث خطأ",
				description: error instanceof Error ? error.message : "حدث خطأ أثناء تحديث الطالب",
				variant: "destructive",
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[425px] [&>button]:hidden" dir="rtl">
				<DialogHeader>
					<DialogTitle className="flex w-full justify-start text-right text-xl text-[#1a2332]">
						<span className="inline-flex items-center gap-2">
							<UserPen className="w-5 h-5 text-[#003f55]" />
							<span>تعديل بيانات الطالب</span>
						</span>
					</DialogTitle>
					<DialogDescription className="text-sm text-neutral-500">اختر الحلقة والطالب لتعديل معلوماته</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="space-y-2">
						<Label className="text-sm font-medium text-neutral-600">اختر الحلقة</Label>
						<Select
							value={selectedCircleForEdit}
							onValueChange={(value) => {
								setSelectedCircleForEdit(value)
								setSelectedStudentForEdit("")
								setEditingStudent(null)
								setEditGuardianPhone("")
								setEditStudentIdNumber("")
							}}
							dir="rtl"
						>
							<SelectTrigger className="w-full text-base">
								<SelectValue placeholder="اختر الحلقة" />
							</SelectTrigger>
							<SelectContent dir="rtl">
								{circles.map((circle) => (
									<SelectItem key={circle.id} value={circle.name}>
										{circle.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label className="text-sm font-medium text-neutral-600">اختر الطالب</Label>
						<Select value={selectedStudentForEdit} onValueChange={handleSelectStudentForEdit} disabled={!selectedCircleForEdit} dir="rtl">
							<SelectTrigger className="w-full text-base">
								<SelectValue placeholder={selectedCircleForEdit ? "اختر الطالب" : "اختر الحلقة أولاً"} />
							</SelectTrigger>
							<SelectContent dir="rtl">
								{getStudentsForCircle(selectedCircleForEdit).map((student) => (
									<SelectItem key={student.id} value={student.id}>
										{student.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{editingStudent && (
						<>
							<div className="space-y-2">
								<Label className="text-sm font-medium text-neutral-600">رقم الهوية</Label>
								<Input
									value={editStudentIdNumber}
									onChange={(event) => setEditStudentIdNumber(event.target.value)}
									placeholder="أدخل رقم الهوية"
									className="text-sm"
									dir="ltr"
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-sm font-medium text-neutral-600">رقم جوال ولي الأمر</Label>
								<Input
									value={editGuardianPhone}
									onChange={(event) => setEditGuardianPhone(event.target.value)}
									placeholder="966501234567"
									className="text-sm"
									dir="ltr"
								/>
								<p className="text-xs text-gray-500">مثال: 966501234567</p>
							</div>
						</>
					)}
				</div>
				<div className="flex justify-end gap-2">
					<Button
						variant="outline"
						onClick={() => handleClose(false)}
						className="text-sm h-9 rounded-lg border-[#003f55]/20 text-neutral-600"
					>
						إلغاء
					</Button>
					<Button
						onClick={handleSaveStudentEdit}
						className="bg-[#3453a7] hover:bg-[#27428d] text-white text-sm h-9 rounded-lg font-medium"
						disabled={!editingStudent || isSubmitting}
					>
						{isSubmitting ? "جاري الحفظ..." : "حفظ التعديلات"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
