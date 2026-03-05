"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, RotateCcw, MessageSquare } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"

type EvaluationLevel = "excellent" | "very_good" | "good" | "not_completed" | null

interface EvaluationOption {
	hafiz?: EvaluationLevel
	tikrar?: EvaluationLevel
	samaa?: EvaluationLevel
	rabet?: EvaluationLevel
}

interface StudentAttendance {
	id: number
	name: string
	halaqah: string
	attendance: "present" | "absent" | "excused" | null
	evaluation?: EvaluationOption
	notes?: string
}

// دالة للحصول على التاريخ الحالي بتوقيت السعودية (بصيغة YYYY-MM-DD)
const getKsaDateString = () => {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Riyadh',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date());
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
	const [hasSavedToday, setHasSavedToday] = useState(false) // حالة جديدة للتحقق من حفظ اليوم
	const [notesStudentId, setNotesStudentId] = useState<number | null>(null)
	const [notesText, setNotesText] = useState("")
	const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)

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

	// التحقق مما إذا كان المعلم قد قام بالحفظ مسبقاً في هذا اليوم — يتحقق من قاعدة البيانات
	useEffect(() => {
		if (teacherData?.halaqah) {
			// تحقق أولاً من localStorage للسرعة
			const todayKSA = getKsaDateString();
			const lastSaveDate = localStorage.getItem(`last_save_${teacherData.halaqah}`);
			if (lastSaveDate === todayKSA) {
				setHasSavedToday(true);
				return;
			}
			// تحقق من قاعدة البيانات للأجهزة الأخرى
			fetch(`/api/attendance?halaqah=${encodeURIComponent(teacherData.halaqah)}`)
				.then((r) => r.json())
				.then((data) => {
					if (data.savedToday) {
						setHasSavedToday(true);
						localStorage.setItem(`last_save_${teacherData.halaqah}`, todayKSA);
					}
				})
				.catch(() => {});
		}
	}, [teacherData])

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

	const fetchStudents = async (halaqah: string) => {
		try {
			const response = await fetch(`/api/students?circle=${encodeURIComponent(halaqah)}`)
			const data = await response.json()

			if (data.students) {
				const mappedStudents: StudentAttendance[] = data.students.map((student: any) => ({
					id: student.id,
					name: student.name,
					halaqah: student.circle_name || halaqah,
					attendance: null,
					evaluation: {},
				}))
				setStudents(mappedStudents)
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
				<div className="text-2xl text-[#1a2332]">جاري التحميل...</div>
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

	const toggleAttendance = (id: number, status: "present" | "absent" | "excused") => {
		setStudents(
			students.map((s) =>
				s.id === id
					? {
							...s,
							attendance: status,
							evaluation: status === "absent" || status === "excused" ? {} : s.evaluation,
						}
					: s,
			),
		)
	}

	const setEvaluation = (studentId: number, type: "hafiz" | "tikrar" | "samaa" | "rabet", level: EvaluationLevel) => {
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

	const setAllEvaluations = (studentId: number, level: EvaluationLevel) => {
		setStudents(
			students.map((s) =>
				s.id === studentId
					? {
							...s,
							evaluation: {
								hafiz: level,
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
		setStudents(students.map((s) => ({ ...s, attendance: null, evaluation: {} })))
	}

	const handleSave = async () => {
		// 1. التأكد من تحضير جميع الطلاب أولاً (لم يترك أي طالب بدون حالة)
		const allStudentsHaveAttendance = students.every((s) => s.attendance !== null)
		if (!allStudentsHaveAttendance) {
			await showAlert("الرجاء إدخال حالة الحضور (حاضر، غائب، أو مستأذن) لجميع الطلاب قبل الحفظ", "تحذير")
			return
		}

		// 2. التأكد من أن جميع الطلاب الحاضرين تم تقييمهم في كافة الفروع
		const allPresentsEvaluated = students
			.filter((s) => s.attendance === "present")
			.every((s) => s.evaluation?.hafiz && s.evaluation?.tikrar && s.evaluation?.samaa && s.evaluation?.rabet)

		if (!allPresentsEvaluated) {
			await showAlert("لم يتم تقييم جميع الطلاب الحاضرين في كل الفروع! تأكد من إكمال التقييم قبل الحفظ", "تحذير")
			return
		}

		setIsSaving(true)
		setSaveStatus("saving")

		try {
			const studentsToSave = students.filter((s) => s.attendance !== null)

			// تجهيز جميع الطلبات لإرسالها دفعة واحدة
			const savePromises = studentsToSave.map((student) => {
			let requestBody: any = {
				student_id: student.id,
				teacher_id: teacherData.id,
				halaqah: teacherData.halaqah,
				status: student.attendance,
				hafiz_level: "not_completed",
				tikrar_level: "not_completed",
				samaa_level: "not_completed",
				rabet_level: "not_completed",
				notes: student.notes || null,
			};

				if (student.attendance === "present" && student.evaluation) {
					requestBody.hafiz_level = student.evaluation.hafiz || "not_completed";
					requestBody.tikrar_level = student.evaluation.tikrar || "not_completed";
					requestBody.samaa_level = student.evaluation.samaa || "not_completed";
					requestBody.rabet_level = student.evaluation.rabet || "not_completed";
				}

				// إرجاع الـ Promise بدون استخدام await هنا
				return fetch("/api/attendance", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(requestBody),
				});
			});

			// تنفيذ جميع الطلبات في نفس الوقت (توازي)
			await Promise.all(savePromises);

			// تسجيل تاريخ الحفظ لمنع التكرار في نفس اليوم
			localStorage.setItem(`last_save_${teacherData.halaqah}`, getKsaDateString());
			setHasSavedToday(true);

			setSaveStatus("success")
			await showAlert("تم حفظ البيانات بنجاح!", "نجاح")

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
		setStudents(students.map((s) => ({ ...s, attendance: "present", evaluation: s.evaluation || {} })))
	}

	const markAllAbsent = () => {
		setStudents(students.map((s) => ({ ...s, attendance: "absent", evaluation: {} })))
	}

	const markAllExcused = () => {
		setStudents(students.map((s) => ({ ...s, attendance: "excused", evaluation: {} })))
	}

	const openNotesDialog = (studentId: number) => {
		const student = students.find((s) => s.id === studentId)
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
		notCompletedText,
	}: {
		studentId: number
		type: "hafiz" | "tikrar" | "samaa" | "rabet"
		label: string
		notCompletedText: string
	}) => {
		const student = students.find((s) => s.id === studentId)
		const currentLevel = student?.evaluation?.[type] || null

		return (
			<div className="space-y-2">
				<div className="font-semibold text-[#1a2332] text-center">{label}</div>
		<div className="grid grid-cols-2 gap-2">
				<Button
					variant="outline"
					onClick={() => setEvaluation(studentId, type, "excellent")}
					className={`text-xs transition-all ${
						currentLevel === "excellent"
							? "bg-[#D4AF37]/20 border-[#D4AF37] text-neutral-800 font-bold"
							: "border-[#D4AF37]/80 text-neutral-600"
					}`}
				>
					ممتاز
				</Button>
				<Button
					variant="outline"
					onClick={() => setEvaluation(studentId, type, "very_good")}
					className={`text-xs transition-all ${
						currentLevel === "very_good"
							? "bg-[#D4AF37]/20 border-[#D4AF37] text-neutral-800 font-bold"
							: "border-[#D4AF37]/80 text-neutral-600"
					}`}
				>
					جيد جداً
				</Button>
				<Button
					variant="outline"
					onClick={() => setEvaluation(studentId, type, "good")}
					className={`text-xs transition-all ${
						currentLevel === "good"
							? "bg-[#D4AF37]/20 border-[#D4AF37] text-neutral-800 font-bold"
							: "border-[#D4AF37]/80 text-neutral-600"
					}`}
				>
					جيد
				</Button>
				<Button
					variant="outline"
					onClick={() => setEvaluation(studentId, type, "not_completed")}
					className={`text-xs transition-all ${
						currentLevel === "not_completed"
							? "bg-[#D4AF37]/20 border-[#D4AF37] text-neutral-800 font-bold"
							: "border-[#D4AF37]/80 text-neutral-600"
					}`}
				>
					لم يكمل
				</Button>
			</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
			<Header />

			<main className="flex-1 py-12 px-4">
				<div className="container mx-auto max-w-7xl">
					<div className="flex items-center gap-3 mb-8 flex-wrap">
						<Button onClick={() => router.back()} variant="outline">
							<ArrowRight className="w-5 h-5 ml-2" />
						</Button>
						<h1 className="text-2xl font-bold text-[#1a2332]">{halaqahName}</h1>
						<div className="flex gap-2">
							<Button
								variant="outline"
								onClick={markAllPresent}
								className="text-sm h-9 rounded-lg border-[#D4AF37]/80 text-neutral-600 transition-all"
							>
								حاضر
							</Button>
							<Button
								variant="outline"
								onClick={markAllAbsent}
								className="text-sm h-9 rounded-lg border-[#D4AF37]/80 text-neutral-600 transition-all"
							>
								غائب
							</Button>
							<Button
								variant="outline"
								onClick={markAllExcused}
								className="text-sm h-9 rounded-lg border-[#D4AF37]/80 text-neutral-600 transition-all"
							>
								مستأذن
							</Button>
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
									<Card key={student.id} className="border-2 border-[#35A4C7]/20 shadow-lg">
										<CardContent className="pt-0 pb-0">
											<div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
												<div className="lg:col-span-1">
													<div className="space-y-2">
														<div className="flex items-center gap-2">
															<p className="text-base font-bold text-[#1a2332]">{student.name}</p>
															<Button
																variant="outline"
																onClick={() => openNotesDialog(student.id)}
																title="الملاحظات"
																className={`h-5 w-5 rounded-md p-0 transition-all flex-shrink-0 ${
																	student.notes
																		? "bg-[#D4AF37]/20 border-[#D4AF37] text-neutral-800"
																		: "border-[#D4AF37]/80 text-neutral-600"
																}`}
															>
																<MessageSquare className="w-3 h-3" />
															</Button>
														</div>
														<div className="flex flex-row gap-2 w-full">
															<Button
																variant="outline"
																onClick={() => toggleAttendance(student.id, "present")}
																className={`flex-1 text-sm h-9 rounded-lg transition-all ${
																	student.attendance === "present"
																		? "bg-[#D4AF37]/20 border-[#D4AF37] text-neutral-800 font-bold"
																		: "border-[#D4AF37]/80 text-neutral-600"
																}`}
															>
																حاضر
															</Button>
															<Button
																variant="outline"
																onClick={() => toggleAttendance(student.id, "absent")}
																className={`flex-1 text-sm h-9 rounded-lg transition-all ${
																	student.attendance === "absent"
																		? "bg-[#D4AF37]/20 border-[#D4AF37] text-neutral-800 font-bold"
																		: "border-[#D4AF37]/80 text-neutral-600"
																}`}
															>
																غائب
															</Button>
															<Button
																variant="outline"
																onClick={() => toggleAttendance(student.id, "excused")}
																className={`flex-1 text-sm h-9 rounded-lg transition-all ${
																	student.attendance === "excused"
																		? "bg-[#D4AF37]/20 border-[#D4AF37] text-neutral-800 font-bold"
																		: "border-[#D4AF37]/80 text-neutral-600"
																}`}
															>
																مستأذن
															</Button>
														</div>
														{student.attendance === "present" && (
															<div className="space-y-2 pt-2">
																<p className="text-sm font-semibold text-[#1a2332] text-center">تقييم الكل:</p>
																<div className="grid grid-cols-2 gap-2">
																	<Button
																		variant="outline"
																		onClick={() => setAllEvaluations(student.id, "excellent")}
																		className="text-xs border-[#D4AF37]/80 text-neutral-600 transition-all"
																	>
																		ممتاز
																	</Button>
																	<Button
																		variant="outline"
																		onClick={() => setAllEvaluations(student.id, "very_good")}
																		className="text-xs border-[#D4AF37]/80 text-neutral-600 transition-all"
																	>
																		جيد جداً
																	</Button>
																	<Button
																		variant="outline"
																		onClick={() => setAllEvaluations(student.id, "good")}
																		className="text-xs border-[#D4AF37]/80 text-neutral-600 transition-all"
																	>
																		جيد
																	</Button>
																	<Button
																		variant="outline"
																		onClick={() => setAllEvaluations(student.id, "not_completed")}
																		className="text-xs border-[#D4AF37]/80 text-neutral-600 transition-all"
																	>
																		لم يكمل
																	</Button>
																</div>
															</div>
														)}
													</div>
												</div>

												{/* Evaluation Options */}
												{student.attendance === "present" && (
													<div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-6">
														<EvaluationOption
															studentId={student.id}
															type="hafiz"
															label="الحفظ"
															notCompletedText="لم يحفظ"
														/>
														<EvaluationOption
															studentId={student.id}
															type="tikrar"
															label="التكرار"
															notCompletedText="لم يكرر"
														/>
														<EvaluationOption
															studentId={student.id}
															type="samaa"
															label="السماع"
															notCompletedText="لم يسمع"
														/>
														<EvaluationOption
															studentId={student.id}
															type="rabet"
															label="الربط"
															notCompletedText="لم يربط"
														/>
													</div>
												)}
											</div>
										</CardContent>
									</Card>
								))}
							</div>

							<div className="flex justify-center gap-4 mt-8">
								<Button
									onClick={handleReset}
									variant="outline"
									className="text-base h-12 px-8 rounded-lg border-[#D4AF37]/80 text-neutral-600 transition-all"
									disabled={isSaving || hasSavedToday}
								>
									<RotateCcw className="w-4 h-4 ml-2" />
									إعادة تعيين
								</Button>
								<Button
									onClick={handleSave}
									variant="outline"
									className={`text-base h-12 px-8 rounded-lg transition-all ${
										hasSavedToday
											? "border-[#D4AF37]/40 text-neutral-400 cursor-not-allowed"
											: "border-[#D4AF37]/80 text-neutral-600 hover:bg-[#D4AF37]/20 hover:border-[#D4AF37] hover:text-neutral-800"
									}`}
									disabled={isSaving || hasSavedToday}
								>
									{hasSavedToday && "تم حفظ بيانات اليوم"}
									{!hasSavedToday && saveStatus === "saving" && "جاري الحفظ..."}
									{!hasSavedToday && saveStatus === "success" && "تم الحفظ!"}
									{!hasSavedToday && saveStatus === "idle" && "حفظ"}
								</Button>
							</div>
						</>
					)}
				</div>
			</main>

			<Footer />

			{/* Notes Dialog */}
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
