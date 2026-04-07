"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, Users, BookOpen, Eye, UserX, Info, Settings } from "lucide-react"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { TeacherAttendanceModal } from "@/components/teacher-attendance-modal"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"

interface Circle {
  name: string
  studentCount: number
}

interface Student {
  id: string
  name: string
  id_number: string
  rank: number
  halaqah: string
  created_at: string
  points: number
}

export function GlobalCirclesDialog() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة الحلقات");

  const [isLoading, setIsLoading] = useState(true); const [isOpen, setIsOpen] = useState(true); const handleClose = (open) => { if(!open) { setIsOpen(false); setTimeout(() => router.push(window.location.pathname), 300) } }
  const [newCircleName, setNewCircleName] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null)
  const [isStudentsDialogOpen, setIsStudentsDialogOpen] = useState(false)
  const [circleStudents, setCircleStudents] = useState<Student[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isStudentInfoDialogOpen, setIsStudentInfoDialogOpen] = useState(false)
  const [circles, setCircles] = useState<Circle[]>([])
  const [showTeacherAttendance, setShowTeacherAttendance] = useState(true)
  const router = useRouter()

  const confirmDialog = useConfirmDialog()
  const showAlert = useAlertDialog()

  const fetchCircles = async () => {
    try {
      const response = await fetch("/api/circles")
      const data = await response.json()
      if (data.circles) {
        setCircles(data.circles)
      }
    } catch (error) {
      console.error("[v0] Error fetching circles:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCircles()
  }, [])

  const handleAddCircle = async () => {
    if (newCircleName.trim()) {
      try {
        const response = await fetch("/api/circles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newCircleName }),
        })

        if (response.ok) {
          localStorage.removeItem("circlesCache")
          localStorage.removeItem("circlesCacheTime")
          setNewCircleName("")
          setIsAddDialogOpen(false)
          await showAlert(`تم إضافة الحلقة ${newCircleName} بنجاح. سيتم إنشاؤها عند إضافة أول طالب.`, "نجاح")
          fetchCircles()
        }
      } catch (error) {
        console.error("[v0] Error adding circle:", error)
        await showAlert("حدث خطأ أثناء إضافة الحلقة", "خطأ")
      }
    }
  }

  const handleRemoveCircle = async (name: string) => {
    const confirmed = await confirmDialog(
      `هل أنت متأكد من إزالة ${name}؟ سيتم حذف جميع الطلاب في هذه الحلقة.`,
      "تأكيد إزالة الحلقة",
    )
    if (confirmed) {
      try {
        const response = await fetch(`/api/circles?name=${encodeURIComponent(name)}`, {
          method: "DELETE",
        })

        if (response.ok) {
          localStorage.removeItem("circlesCache")
          localStorage.removeItem("circlesCacheTime")
          window.dispatchEvent(new Event("circlesChanged"))
          await showAlert(`تم إزالة ${name} بنجاح`, "نجاح")
          fetchCircles()
        }
      } catch (error) {
        console.error("[v0] Error removing circle:", error)
        await showAlert("حدث خطأ أثناء إزالة الحلقة", "خطأ")
      }
    }
  }

  const handleViewCircle = async (circle: Circle) => {
    setSelectedCircle(circle)
    setIsStudentsDialogOpen(true)
    setIsLoadingStudents(true)
    setCircleStudents([])

    try {
      const response = await fetch(`/api/students?circle=${encodeURIComponent(circle.name)}`)
      const data = await response.json()
      if (data.students) {
        const sortedStudents = (data.students || []).sort((a: any, b: any) => (a.rank || 999) - (b.rank || 999))
        setCircleStudents(sortedStudents)
      }
    } catch (error) {
      console.error("[v0] Error fetching students:", error)
    } finally {
      setIsLoadingStudents(false)
    }
  }

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    const confirmed = await confirmDialog(`هل أنت متأكد من إزالة ${studentName} من الحلقة؟`)
    if (confirmed) {
      try {
        const response = await fetch(`/api/students?id=${studentId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          await showAlert(`تم إزالة ${studentName} من الحلقة بنجاح`, "نجاح")
          if (selectedCircle) {
            const studentsResponse = await fetch(`/api/students?circle=${encodeURIComponent(selectedCircle.name)}`)
            const data = await studentsResponse.json()
            if (data.students) {
              setCircleStudents(data.students)
            }
          }
          fetchCircles()
        }
      } catch (error) {
        console.error("[v0] Error removing student:", error)
        await showAlert("حدث خطأ أثناء إزالة الطالب", "خطأ")
      }
    }
  }

  const handleViewStudentInfo = (student: Student) => {
    setSelectedStudent(student)
    setIsStudentInfoDialogOpen(true)
  }

  const handleAttendanceClose = () => {
    setShowTeacherAttendance(false)
  }

  if (isLoading || authLoading || !authVerified) {
    return null
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl bg-white rounded-2xl p-0 overflow-hidden [&>button]:top-4 [&>button]:right-4 [&>button]:left-auto" dir="rtl">
          <DialogHeader className="flex-row items-center justify-between px-6 py-5 border-b border-[#3453a7]/20 bg-gradient-to-r from-[#3453a7]/8 to-transparent text-right">
            <DialogTitle className="flex flex-1 items-center justify-start gap-2 text-right text-lg font-bold text-[#1a2332]">
              <Settings className="h-4 w-4 shrink-0 text-[#003f55]" />
              <span>إدارة الحلقات</span>
            </DialogTitle>
            <div className="shrink-0">
              <Button onClick={() => setIsAddDialogOpen(true)} className="bg-[#3453a7] hover:bg-[#27428d] text-white gap-2">
                <Plus className="w-4 h-4" />
                إضافة حلقة
              </Button>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
            {circles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#3453a7]/20 shadow-sm p-16 text-center">
                <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-7 h-7 text-[#003f55]" />
                </div>
                <p className="text-lg font-semibold text-neutral-500">لا يوجد حلقات حالياً</p>
                <p className="text-sm text-neutral-400 mt-1">قم بإضافة حلقة جديدة للبدء</p>
              </div>
            ) : (
              <div className="space-y-3">
                {circles.map((circle) => (
                  <div key={circle.name} className="flex flex-col gap-3 rounded-2xl border border-[#3453a7]/20 bg-white px-5 py-4 shadow-sm transition-colors hover:bg-[#3453a7]/5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="w-11 h-11 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-[#003f55]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-bold leading-7 text-[#1a2332] break-words">{circle.name}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <button
                        onClick={() => handleViewCircle(circle)}
                        className="inline-flex h-9 min-w-[104px] items-center justify-center gap-1.5 rounded-lg border border-[#3453a7]/35 px-3 text-sm font-medium text-[#3453a7] transition-colors hover:bg-[#3453a7]/10 hover:text-[#27428d]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        عرض الطلاب
                      </button>
                      <button
                        onClick={() => handleRemoveCircle(circle.name)}
                        className="inline-flex h-9 min-w-[88px] items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        إزالة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[480px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1a2332]">إضافة حلقة جديدة</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">أضف حلقة تحفيظ جديدة إلى النظام</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="circleName" className="text-sm font-semibold text-[#1a2332]">اسم الحلقة</Label>
              <Input
                id="circleName"
                value={newCircleName}
                onChange={(e) => setNewCircleName(e.target.value)}
                placeholder="مثال: حلقة أبو بكر الصديق"
                onKeyDown={(e) => e.key === "Enter" && handleAddCircle()}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-[#003f55]/20 text-neutral-600">إلغاء</Button>
            <Button onClick={handleAddCircle} className="border border-[#3453a7] bg-[#3453a7] hover:bg-[#27428d] text-white">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isStudentsDialogOpen} onOpenChange={setIsStudentsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1a2332]">طلاب {selectedCircle?.name}</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">عرض الطلاب وإدارتهم</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {isLoadingStudents ? (
              <div className="flex justify-center py-12">
                <SiteLoader size="md" />
              </div>
            ) : circleStudents.length > 0 ? (
              <div className="divide-y divide-[#3453a7]/12 rounded-xl border border-[#3453a7]/20 overflow-hidden">
                {circleStudents.map((student) => (
                  <div key={student.id} className="flex flex-col gap-3 bg-white px-4 py-3 transition-colors hover:bg-[#3453a7]/5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#3453a7]/10 border border-[#3453a7]/25 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-[#3453a7]">{student.rank || "-"}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1a2332] break-words">{student.name}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <button
                        onClick={() => handleViewStudentInfo(student)}
                        className="inline-flex h-8 min-w-[72px] items-center justify-center gap-1 rounded-lg border border-[#3453a7]/35 px-2.5 text-xs font-medium text-[#3453a7] transition-colors hover:bg-[#3453a7]/10 hover:text-[#27428d]"
                      >
                        <Info className="w-3 h-3" /> عرض
                      </button>
                      <button
                        onClick={() => handleRemoveStudent(student.id, student.name)}
                        className="inline-flex h-8 min-w-[72px] items-center justify-center gap-1 rounded-lg border border-red-200 px-2.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <UserX className="w-3 h-3" /> إزالة
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا يوجد طلاب في هذه الحلقة</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isStudentInfoDialogOpen} onOpenChange={setIsStudentInfoDialogOpen}>
        <DialogContent className="sm:max-w-[460px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1a2332]">معلومات الطالب</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500">البيانات الشخصية للطالب</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <>
              <div className="space-y-3 py-2">
                {[
                  { label: "الاسم", value: selectedStudent.name },
                  { label: "رقم الهوية", value: selectedStudent.id_number || "—" },
                  { label: "الحلقة", value: selectedStudent.halaqah },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center px-4 py-3 bg-[#fafcff] rounded-xl border border-[#3453a7]/15">
                    <span className="text-sm font-semibold text-neutral-500">{label}</span>
                    <span className="text-sm font-bold text-[#1a2332]">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => setIsStudentInfoDialogOpen(false)} className="border border-[#3453a7]/35 bg-[#3453a7]/10 hover:bg-[#3453a7]/15 text-[#3453a7] hover:text-[#27428d]">
                  إغلاق
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </>
  )
}
