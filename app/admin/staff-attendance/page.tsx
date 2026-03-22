"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SiteLoader } from "@/components/ui/site-loader"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { getSaudiDateString, getSaudiWeekday, getSaudiTimeString, isSaudiAttendanceWindowOpen } from "@/lib/saudi-time"
import { Calendar } from "lucide-react"

type AttendanceStatus = "present" | "late" | "absent" | "excused" | null
type StaffGroup = "students" | "teachers"

interface StudentAttendanceRecord {
  student_id: string
  student_name: string
  account_number: number | null
  halaqah: string
  attendance_record_id: string | null
  status: AttendanceStatus
  teacher_id: string | null
  isEvaluated: boolean
}

interface TeacherRecord {
  id: string
  name: string
  accountNumber: string
  halaqah: string
}

interface TeacherAttendanceRecord {
  teacher_id: string
  teacher_name: string
  account_number: number | null
  halaqah: string
  attendance_record_id: string | null
  status: AttendanceStatus
}

const STATUS_OPTIONS: Array<{ value: Exclude<AttendanceStatus, null>; label: string; className: string }> = [
  {
    value: "present",
    label: "حاضر",
    className: "border-emerald-300 text-emerald-700 hover:bg-emerald-50 data-[active=true]:bg-emerald-100 data-[active=true]:text-emerald-800",
  },
  {
    value: "late",
    label: "متأخر",
    className: "border-orange-300 text-orange-700 hover:bg-orange-50 data-[active=true]:bg-orange-100 data-[active=true]:text-orange-800",
  },
  {
    value: "absent",
    label: "غائب",
    className: "border-rose-300 text-rose-700 hover:bg-rose-50 data-[active=true]:bg-rose-100 data-[active=true]:text-rose-800",
  },
  {
    value: "excused",
    label: "مستأذن",
    className: "border-amber-300 text-amber-700 hover:bg-amber-50 data-[active=true]:bg-amber-100 data-[active=true]:text-amber-800",
  },
]

function buildAttendanceTimestamp(date: string) {
  return new Date(`${date}T12:00:00+03:00`).toISOString()
}

function isAllowedAttendanceDate(date: string) {
  const day = getSaudiWeekday(date)
  return day === 0 || day === 3
}

export default function StaffAttendancePage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("التقارير")
  const showAlert = useAlertDialog()

  const [studentRecords, setStudentRecords] = useState<StudentAttendanceRecord[]>([])
  const [teacherRecords, setTeacherRecords] = useState<TeacherAttendanceRecord[]>([])
  const [circles, setCircles] = useState<string[]>([])
  const [selectedCircle, setSelectedCircle] = useState("all")
  const [selectedDate, setSelectedDate] = useState(getSaudiDateString())
  const [activeGroup, setActiveGroup] = useState<StaffGroup>("students")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [timeTick, setTimeTick] = useState(() => Date.now())

  const filteredStudentRecords = useMemo(() => {
    const base = selectedCircle === "all"
      ? studentRecords
      : studentRecords.filter((record) => record.halaqah === selectedCircle)

    return [...base].sort((first, second) => {
      const firstNumber = first.account_number || 0
      const secondNumber = second.account_number || 0
      if (firstNumber !== secondNumber) {
        return firstNumber - secondNumber
      }
      return first.student_name.localeCompare(second.student_name, "ar")
    })
  }, [selectedCircle, studentRecords])

  const filteredTeacherRecords = useMemo(() => {
    const base = selectedCircle === "all"
      ? teacherRecords
      : teacherRecords.filter((record) => record.halaqah === selectedCircle)

    return [...base].sort((first, second) => {
      const firstNumber = first.account_number || 0
      const secondNumber = second.account_number || 0
      if (firstNumber !== secondNumber) {
        return firstNumber - secondNumber
      }
      return first.teacher_name.localeCompare(second.teacher_name, "ar")
    })
  }, [selectedCircle, teacherRecords])

  const isAttendanceDateAllowed = isAllowedAttendanceDate(selectedDate)
  const isAttendanceWindowOpen = isSaudiAttendanceWindowOpen(new Date(timeTick))
  const saudiTimeLabel = getSaudiTimeString(new Date(timeTick))

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimeTick(Date.now())
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!authLoading && authVerified) {
      if (isAttendanceWindowOpen) {
        void fetchRecords(selectedDate)
      } else {
        setStudentRecords([])
        setTeacherRecords([])
        setCircles([])
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [authLoading, authVerified, selectedDate, isAttendanceWindowOpen])

  useEffect(() => {
    if (selectedCircle !== "all" && !circles.includes(selectedCircle)) {
      setSelectedCircle("all")
    }
  }, [circles, selectedCircle])

  const fetchRecords = async (date: string) => {
    const isFirstLoad = isLoading
    if (isFirstLoad) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }

    try {
      const [studentsResponse, teachersResponse, teacherAttendanceResponse] = await Promise.all([
        fetch(`/api/admin-student-attendance?date=${date}&t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/teachers?t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/teacher-attendance/all?t=${Date.now()}`, { cache: "no-store" }),
      ])

      const studentsData = await studentsResponse.json()
      const teachersData = await teachersResponse.json()
      const teacherAttendanceData = await teacherAttendanceResponse.json()

      if (!studentsResponse.ok) {
        throw new Error(studentsData.error || "فشل في جلب تحضير الطلاب")
      }

      if (!teachersResponse.ok) {
        throw new Error(teachersData.error || "فشل في جلب بيانات المعلمين")
      }

      if (!teacherAttendanceResponse.ok) {
        throw new Error(teacherAttendanceData.error || "فشل في جلب تحضير المعلمين")
      }

      const nextStudentRecords = Array.isArray(studentsData.records) ? studentsData.records : []
      const teachers: TeacherRecord[] = Array.isArray(teachersData.teachers) ? teachersData.teachers : []
      const teacherAttendanceMap = new Map(
        (Array.isArray(teacherAttendanceData.records) ? teacherAttendanceData.records : [])
          .filter((record) => record.attendance_date === date)
          .map((record) => [record.teacher_id, record] as const),
      )

      const nextTeacherRecords: TeacherAttendanceRecord[] = teachers.map((teacher) => {
        const attendance = teacherAttendanceMap.get(teacher.id)
        return {
          teacher_id: teacher.id,
          teacher_name: teacher.name,
          account_number: teacher.accountNumber ? Number(teacher.accountNumber) : null,
          halaqah: (teacher.halaqah || "").trim(),
          attendance_record_id: attendance?.id || null,
          status: (attendance?.status as AttendanceStatus) || null,
        }
      })

      const circleSet = new Set<string>(Array.isArray(studentsData.circles) ? studentsData.circles : [])
      teachers.forEach((teacher) => {
        const circleName = (teacher.halaqah || "").trim()
        if (circleName) {
          circleSet.add(circleName)
        }
      })

      setStudentRecords(nextStudentRecords)
      setTeacherRecords(nextTeacherRecords)
      setCircles(Array.from(circleSet).sort((first, second) => first.localeCompare(second, "ar")))
    } catch (error) {
      console.error("[staff-attendance] Error fetching records:", error)
      setStudentRecords([])
      setTeacherRecords([])
      setCircles([])
      await showAlert(error instanceof Error ? error.message : "تعذر جلب بيانات التحضير", "خطأ")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const setStudentStatus = (studentId: string, status: Exclude<AttendanceStatus, null>) => {
    setStudentRecords((current) => current.map((record) => (
      record.student_id === studentId && !record.isEvaluated
        ? { ...record, status }
        : record
    )))
  }

  const setTeacherStatus = (teacherId: string, status: Exclude<AttendanceStatus, null>) => {
    setTeacherRecords((current) => current.map((record) => (
      record.teacher_id === teacherId
        ? { ...record, status }
        : record
    )))
  }

  const handleSaveStudents = async () => {
    const updates = studentRecords
      .filter((record) => record.status !== null)
      .map((record) => ({ student_id: record.student_id, status: record.status }))

    if (updates.length === 0) {
      await showAlert("حدد حالة واحدة على الأقل قبل الحفظ", "تنبيه")
      return
    }

    const response = await fetch("/api/admin-student-attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDate, updates }),
    })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "فشل في حفظ تحضير الطلاب")
    }

    await fetchRecords(selectedDate)

    if (Array.isArray(data.blocked) && data.blocked.length > 0) {
      const blockedCount = data.blocked.length
      const savedCount = Array.isArray(data.saved) ? data.saved.length : 0
      await showAlert(
        savedCount > 0
          ? `تم حفظ ${savedCount} سجل وتعذر تحديث ${blockedCount} سجل.`
          : `تعذر حفظ ${blockedCount} سجل.`,
        savedCount > 0 ? "تنبيه" : "خطأ",
      )
      return
    }

    await showAlert("تم حفظ تحضير الطلاب", "نجاح")
  }

  const handleSaveTeachers = async () => {
    const updates = teacherRecords.filter((record) => record.status !== null)

    if (updates.length === 0) {
      await showAlert("حدد حالة واحدة على الأقل قبل الحفظ", "تنبيه")
      return
    }

    const timestamp = buildAttendanceTimestamp(selectedDate)
    const results = await Promise.all(
      updates.map(async (record) => {
        const response = await fetch("/api/teacher-attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacher_id: record.teacher_id,
            teacher_name: record.teacher_name,
            account_number: record.account_number,
            status: record.status,
            check_in_time: timestamp,
            attendance_date: selectedDate,
          }),
        })

        const data = await response.json().catch(() => ({}))
        return { ok: response.ok, data }
      }),
    )

    const failedResult = results.find((result) => !result.ok)
    if (failedResult) {
      throw new Error(failedResult.data?.error || "فشل في حفظ تحضير المعلمين")
    }

    await fetchRecords(selectedDate)
    await showAlert("تم حفظ تحضير المعلمين", "نجاح")
  }

  const handleSave = async () => {
    if (!isAttendanceWindowOpen) {
      await showAlert("التحضير متاح فقط يوم الأحد ويوم الأربعاء حتى الساعة 12 ظهرًا بتوقيت السعودية", "تنبيه")
      return
    }

    try {
      setIsSaving(true)
      if (activeGroup === "students") {
        await handleSaveStudents()
      } else {
        await handleSaveTeachers()
      }
    } catch (error) {
      console.error("[staff-attendance] Error saving records:", error)
      await showAlert(error instanceof Error ? error.message : "حدث خطأ أثناء الحفظ", "خطأ")
    } finally {
      setIsSaving(false)
    }
  }

  const isFutureDate = selectedDate > getSaudiDateString()

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader size="lg" />
      </div>
    )
  }

  if (!authVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader size="md" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#eef6f8] to-white">
      <Header />

      <main className="flex-1 px-3 py-6 md:px-5 md:py-10">
        <div className="container mx-auto max-w-7xl space-y-6">
          <section className="text-right">
            <h1 className="text-3xl md:text-4xl font-black text-[#1a2332]">التحضير</h1>
          </section>

          <Card className="border border-[#003f55]/15 shadow-sm">
            <CardContent className="pt-6">
              <div className="grid gap-4 lg:grid-cols-[220px_240px_1fr] lg:items-end">
                <div className="space-y-2 text-right">
                  <Label className="text-sm font-semibold text-[#1a2332]">
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#003f55]" />
                      التاريخ
                    </span>
                  </Label>
                  <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
                </div>
                <div className="space-y-2 text-right">
                  <Label className="text-sm font-semibold text-[#1a2332]">الحلقة</Label>
                  <Select value={selectedCircle} onValueChange={setSelectedCircle}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">كل الحلقات</SelectItem>
                      {circles.map((circle) => (
                        <SelectItem key={circle} value={circle}>{circle}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <div className="inline-flex rounded-2xl border border-[#003f55]/15 bg-[#f4fafb] p-1">
                    <button
                      type="button"
                      onClick={() => setActiveGroup("students")}
                      className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${activeGroup === "students" ? "bg-[#3453a7] text-white" : "text-[#4d6b76] hover:text-[#3453a7]"}`}
                    >
                      طلاب
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGroup("teachers")}
                      className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${activeGroup === "teachers" ? "bg-[#3453a7] text-white" : "text-[#4d6b76] hover:text-[#3453a7]"}`}
                    >
                      معلمين
                    </button>
                  </div>
                  {isRefreshing ? <span className="text-sm font-semibold text-[#4d6b76]">جاري التحديث...</span> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#003f55]/15 shadow-sm">
            <CardHeader>
              <CardTitle className="text-right text-[#1a2332]">{activeGroup === "students" ? "قائمة الطلاب" : "قائمة المعلمين"}</CardTitle>
            </CardHeader>
            <CardContent>
              {isFutureDate ? (
                <div className="rounded-2xl border border-dashed border-[#003f55]/20 bg-[#f4fafb] px-4 py-10 text-center text-[#4d6b76]">
                  لا يمكن اعتماد تحضير تاريخ مستقبلي.
                </div>
              ) : !isAttendanceWindowOpen ? (
                <div className="rounded-2xl border border-dashed border-[#003f55]/20 bg-[#f4fafb] px-4 py-10 text-center text-[#4d6b76]">
                  يفتح فقط يوم الأحد ويوم الأربعاء.
                </div>
              ) : !isAttendanceDateAllowed ? (
                <div className="rounded-2xl border border-dashed border-[#003f55]/20 bg-[#f4fafb] px-4 py-10 text-center text-[#4d6b76]">
                  التحضير متاح فقط يوم الأحد ويوم الأربعاء.
                </div>
              ) : activeGroup === "students" ? (
                filteredStudentRecords.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#003f55]/20 bg-[#f4fafb] px-4 py-10 text-center text-[#4d6b76]">
                    لا يوجد طلاب ضمن الفلترة الحالية.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {filteredStudentRecords.map((record) => (
                      <Card key={record.student_id} className={`border border-[#003f55]/12 bg-white/95 shadow-sm ${record.isEvaluated ? "opacity-70" : ""}`}>
                        <CardContent className="p-3" dir="rtl">
                          <div className="mb-3 flex justify-start">
                            <p className="text-base font-black text-[#1a2332] text-left">{record.student_name}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {STATUS_OPTIONS.map((option) => {
                              const isActive = record.status === option.value
                              return (
                                <Button
                                  key={`${record.student_id}-${option.value}`}
                                  type="button"
                                  variant="outline"
                                  disabled={record.isEvaluated || !isAttendanceDateAllowed}
                                  data-active={isActive}
                                  onClick={() => setStudentStatus(record.student_id, option.value)}
                                  className={`h-9 rounded-lg px-2 text-sm font-bold transition-colors ${option.className}`}
                                >
                                  {option.label}
                                </Button>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              ) : filteredTeacherRecords.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#003f55]/20 bg-[#f4fafb] px-4 py-10 text-center text-[#4d6b76]">
                  لا يوجد معلمون ضمن الفلترة الحالية.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {filteredTeacherRecords.map((record) => (
                    <Card key={record.teacher_id} className="border border-[#003f55]/12 bg-white/95 shadow-sm">
                      <CardContent className="p-3" dir="rtl">
                        <div className="mb-3 flex justify-start">
                          <p className="text-base font-black text-[#1a2332] text-left">{record.teacher_name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {STATUS_OPTIONS.map((option) => {
                            const isActive = record.status === option.value
                            return (
                              <Button
                                key={`${record.teacher_id}-${option.value}`}
                                type="button"
                                variant="outline"
                                disabled={!isAttendanceDateAllowed}
                                data-active={isActive}
                                onClick={() => setTeacherStatus(record.teacher_id, option.value)}
                                className={`h-9 rounded-lg px-2 text-sm font-bold transition-colors ${option.className}`}
                              >
                                {option.label}
                              </Button>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isFutureDate || !isAttendanceDateAllowed || !isAttendanceWindowOpen}
              className="h-12 min-w-[220px] rounded-xl bg-[#3453a7] text-white hover:bg-[#27428d]"
            >
              {isSaving ? "جاري الحفظ..." : "حفظ التحضير"}
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}