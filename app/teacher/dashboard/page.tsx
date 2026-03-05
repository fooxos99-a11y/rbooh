"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, UserMinus } from "lucide-react"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { TeacherAttendanceCheck } from "@/components/teacher-attendance-check"

export default function TeacherDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [studentNameToAdd, setStudentNameToAdd] = useState("")
  const [studentIdNumber, setStudentIdNumber] = useState("")
  const [studentPhoneNumber, setStudentPhoneNumber] = useState("")
  const [studentAccountNumber, setStudentAccountNumber] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [selectedStudentToRemove, setSelectedStudentToRemove] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditPointsDialogOpen, setIsEditPointsDialogOpen] = useState(false)
  const [selectedStudentForPoints, setSelectedStudentForPoints] = useState("")
  const [newPointsValue, setNewPointsValue] = useState("")

  const [teacherData, setTeacherData] = useState<any>(null)
  const [myStudents, setMyStudents] = useState<any[]>([])

  const router = useRouter()

  const showAlert = useAlertDialog()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    const accountNumber = localStorage.getItem("accountNumber")

    if (!loggedIn || (userRole !== "teacher" && userRole !== "deputy_teacher")) {
      router.push("/login")
    } else {
      fetchTeacherData(accountNumber || "")
      setIsLoading(false)
    }
  }, [router])

  const fetchTeacherData = async (accountNumber: string) => {
    try {
      const response = await fetch(`/api/teachers?account_number=${accountNumber}`)
      const data = await response.json()

      if (data.teachers && data.teachers.length > 0) {
        const teacher = data.teachers[0]
        setTeacherData(teacher)

        // Fetch students in teacher's circle
        if (teacher.halaqah) {
          fetchMyStudents(teacher.halaqah)
        }
      }
    } catch (error) {
      console.error("Error fetching teacher data:", error)
    }
  }

  const fetchMyStudents = async (halaqah: string) => {
    try {
      const response = await fetch(`/api/students?circle=${encodeURIComponent(halaqah)}`)
      const data = await response.json()

      if (data.students) {
        setMyStudents(data.students)
      }
    } catch (error) {
      console.error("Error fetching my students:", error)
    }
  }

  const handleAddStudent = async () => {
    if (studentNameToAdd.trim() && studentIdNumber.trim() && studentAccountNumber.trim()) {
      setIsSubmitting(true)
      try {
        const response = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: studentNameToAdd,
            circle_name: teacherData?.halaqah || "",
            id_number: studentIdNumber,
            phone_number: studentPhoneNumber,
            account_number: Number.parseInt(studentAccountNumber),
            initial_points: 0,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          await showAlert(`تم إضافة الطالب ${studentNameToAdd} إلى ${teacherData?.halaqah}`, "نجاح")
          setStudentNameToAdd("")
          setStudentIdNumber("")
          setStudentPhoneNumber("")
          setStudentAccountNumber("")
          setIsDialogOpen(false)
          fetchMyStudents(teacherData?.halaqah || "")
        } else {
          await showAlert(data.error || "فشل في إضافة الطالب", "خطأ")
        }
      } catch (error) {
        console.error("Error adding student:", error)
        await showAlert("حدث خطأ أثناء إضافة الطالب", "خطأ")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleRemoveStudent = async () => {
    if (selectedStudentToRemove) {
      setIsSubmitting(true)
      try {
        const response = await fetch(`/api/students?id=${selectedStudentToRemove}`, {
          method: "DELETE",
        })

        const data = await response.json()

        if (response.ok) {
          const studentName = myStudents.find((s) => s.id === selectedStudentToRemove)?.name
          await showAlert(`تم إزالة الطالب ${studentName} من ${teacherData?.halaqah}`, "نجاح")
          setSelectedStudentToRemove("")
          setIsRemoveDialogOpen(false)
          fetchMyStudents(teacherData?.halaqah || "")
        } else {
          await showAlert(data.error || "فشل في إزالة الطالب", "خطأ")
        }
      } catch (error) {
        console.error("Error removing student:", error)
        await showAlert("حدث خطأ أثناء إزالة الطالب", "خطأ")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleEditPoints = async () => {
    if (!selectedStudentForPoints) {
      await showAlert("الرجاء اختيار طالب", "تنبيه")
      return
    }

    if (!newPointsValue || Number.parseInt(newPointsValue) < 0) {
      await showAlert("الرجاء إدخال عدد النقاط الجديد", "تنبيه")
      return
    }

    setIsSubmitting(true)
    try {
      const student = myStudents.find((s) => s.id === selectedStudentForPoints)
      if (!student) {
        await showAlert("الطالب غير موجود", "خطأ")
        return
      }

      const pointsValue = Number.parseInt(newPointsValue)

      const response = await fetch(`/api/students?id=${selectedStudentForPoints}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: pointsValue,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        await showAlert(`تم تحديث نقاط الطالب ${student.name} إلى ${pointsValue} نقطة`, "نجاح")
        setIsEditPointsDialogOpen(false)
        setSelectedStudentForPoints("")
        setNewPointsValue("")
        fetchMyStudents(teacherData?.halaqah || "")
      } else {
        await showAlert(data.error || "فشل في تعديل النقاط", "خطأ")
      }
    } catch (error) {
      console.error("Error editing points:", error)
      await showAlert("حدث خطأ أثناء تعديل النقاط", "خطأ")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStudentSelection = (studentId: string) => {
    setSelectedStudentForPoints(studentId)
    const student = myStudents.find((s) => s.id === studentId)
    if (student) {
      setNewPointsValue(String(student.points || 0))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-[#1a2332]">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <>
      <Header />
      <main className="flex-1 py-4 md:py-8 lg:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="space-y-4 md:space-y-6">
            <Card className="border-2 border-[#35A4C7]/20 shadow-lg">
              <CardContent className="pt-4 md:pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-semibold text-[#1a2332]/70">رقم الحساب</label>
                    <div className="p-3 md:p-4 bg-gray-50 rounded-xl text-base md:text-lg font-bold text-[#1a2332]">
                      {teacherData?.account_number || "-"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-semibold text-[#1a2332]/70">اسم المعلم</label>
                    <div className="p-3 md:p-4 bg-gray-50 rounded-xl text-base md:text-lg font-bold text-[#1a2332]">
                      {teacherData?.name || "-"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-semibold text-[#1a2332]/70">رقم الهوية</label>
                    <div className="p-3 md:p-4 bg-gray-50 rounded-xl text-base md:text-lg font-bold text-[#1a2332]">
                      {teacherData?.id_number || "-"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-semibold text-[#1a2332]/70">الحلقة</label>
                    <div className="p-3 md:p-4 bg-gray-50 rounded-xl text-base md:text-lg font-bold text-[#1a2332]">
                      {teacherData?.halaqah || "-"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-semibold text-[#1a2332]/70">عدد الطلاب في الحلقة</label>
                    <div className="p-3 md:p-4 bg-gray-50 rounded-xl text-base md:text-lg font-bold text-[#1a2332]">
                      {myStudents.length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}