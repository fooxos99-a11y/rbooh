"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SiteLoader } from "@/components/ui/site-loader"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { getSaudiDateString, getSaudiTimeString, isSaudiAttendanceDateAllowed, isSaudiAttendanceWindowOpen } from "@/lib/saudi-time"
import { Calendar as CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

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
    className: "text-[#1a2332] focus:bg-[#eef4ff] focus:text-[#1a2332] data-[highlighted]:bg-[#eef4ff] data-[highlighted]:text-[#1a2332]",
  },
  {
    value: "late",
    label: "متأخر",
    className: "text-[#1a2332] focus:bg-[#eef4ff] focus:text-[#1a2332] data-[highlighted]:bg-[#eef4ff] data-[highlighted]:text-[#1a2332]",
  },
  {
    value: "absent",
    label: "غائب",
    className: "text-[#1a2332] focus:bg-[#eef4ff] focus:text-[#1a2332] data-[highlighted]:bg-[#eef4ff] data-[highlighted]:text-[#1a2332]",
  },
  {
    value: "excused",
    label: "مستأذن",
    className: "text-[#1a2332] focus:bg-[#eef4ff] focus:text-[#1a2332] data-[highlighted]:bg-[#eef4ff] data-[highlighted]:text-[#1a2332]",
  },
]

function buildAttendanceTimestamp(date: string) {
  return new Date(`${date}T12:00:00+03:00`).toISOString()
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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [timeTick, setTimeTick] = useState(() => Date.now())
  const [savingStudentIds, setSavingStudentIds] = useState<string[]>([])
  const [savingTeacherIds, setSavingTeacherIds] = useState<string[]>([])

  const filteredStudentRecords = useMemo(() => {
    const base = selectedCircle === "all"
      ? studentRecords
      : studentRecords.filter((record) => record.halaqah === selectedCircle)

    const pendingRecords = base.filter((record) => !record.isEvaluated && record.status === null)

    return [...pendingRecords].sort((first, second) => {
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

  const isAttendanceDateAllowed = isSaudiAttendanceDateAllowed(selectedDate)
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

  useEffect(() => {
    if (authLoading || !authVerified) {
      return
    }

    const refreshRecords = () => {
      if (document.visibilityState === "visible" && isAttendanceWindowOpen) {
        void fetchRecords(selectedDate)
      }
    }

    window.addEventListener("focus", refreshRecords)
    document.addEventListener("visibilitychange", refreshRecords)

    return () => {
      window.removeEventListener("focus", refreshRecords)
      document.removeEventListener("visibilitychange", refreshRecords)
    }
  }, [authLoading, authVerified, isAttendanceWindowOpen, selectedDate])

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

  const setStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setStudentRecords((current) => current.map((record) => (
      record.student_id === studentId && !record.isEvaluated
        ? { ...record, status }
        : record
    )))
  }

  const setTeacherStatus = (teacherId: string, status: AttendanceStatus) => {
    setTeacherRecords((current) => current.map((record) => (
      record.teacher_id === teacherId
        ? { ...record, status }
        : record
    )))
  }

  const saveStudentStatus = async (studentId: string, status: AttendanceStatus) => {
    if (!status) {
      return
    }

    const previousStatus = studentRecords.find((record) => record.student_id === studentId)?.status ?? null
    setStudentStatus(studentId, status)
    setSavingStudentIds((current) => [...current, studentId])

    try {
      const response = await fetch("/api/admin-student-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          updates: [{ student_id: studentId, status }],
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "فشل في حفظ تحضير الطالب")
      }

      if (Array.isArray(data.blocked) && data.blocked.length > 0) {
        throw new Error("تعذر حفظ حالة الطالب المحددة")
      }
    } catch (error) {
      setStudentStatus(studentId, previousStatus)
      console.error("[staff-attendance] Error saving student status:", error)
      await showAlert(error instanceof Error ? error.message : "حدث خطأ أثناء حفظ حالة الطالب", "خطأ")
    } finally {
      setSavingStudentIds((current) => current.filter((id) => id !== studentId))
    }
  }

  const saveTeacherStatus = async (teacherId: string, status: AttendanceStatus) => {
    if (!status) {
      return
    }

    const teacherRecord = teacherRecords.find((record) => record.teacher_id === teacherId)
    if (!teacherRecord) {
      return
    }

    const previousStatus = teacherRecord.status
    const timestamp = buildAttendanceTimestamp(selectedDate)
    setTeacherStatus(teacherId, status)
    setSavingTeacherIds((current) => [...current, teacherId])

    try {
      const response = await fetch("/api/teacher-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacher_id: teacherRecord.teacher_id,
          teacher_name: teacherRecord.teacher_name,
          account_number: teacherRecord.account_number,
          status,
          check_in_time: timestamp,
          attendance_date: selectedDate,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || "فشل في حفظ تحضير المعلم")
      }
    } catch (error) {
      setTeacherStatus(teacherId, previousStatus)
      console.error("[staff-attendance] Error saving teacher status:", error)
      await showAlert(error instanceof Error ? error.message : "حدث خطأ أثناء حفظ حالة المعلم", "خطأ")
    } finally {
      setSavingTeacherIds((current) => current.filter((id) => id !== teacherId))
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
                      <CalendarIcon className="h-4 w-4 text-[#003f55]" />
                      التاريخ
                    </span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start gap-2 text-right font-normal flex-row-reverse ${!selectedDate ? "text-muted-foreground" : ""}`}
                      >
                        <span className="flex-1 text-right" dir="ltr">{selectedDate || "اختر تاريخاً"}</span>
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate ? new Date(selectedDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const pad = (value: number) => value.toString().padStart(2, "0")
                            const nextDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
                            setSelectedDate(nextDate)
                          }
                        }}
                        disabled={(date) => date.getDay() !== 0 && date.getDay() !== 3}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
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
                  <div className="flex flex-wrap gap-2.5">
                    {filteredStudentRecords.map((record) => (
                      <Card key={record.student_id} className="w-full md:max-w-[200px] border border-[#003f55]/12 bg-white/95 shadow-sm">
                        <CardContent className="p-2.5" dir="rtl">
                          <div className="mb-2 flex justify-start">
                            <p className="text-base font-black text-[#1a2332] text-left">{record.student_name}</p>
                          </div>
                          <Select
                            value={record.status ?? undefined}
                            onValueChange={(value) => {
                              void saveStudentStatus(record.student_id, value as Exclude<AttendanceStatus, null>)
                            }}
                            disabled={!isAttendanceDateAllowed || savingStudentIds.includes(record.student_id)}
                          >
                            <SelectTrigger dir="rtl" className="h-10 w-full justify-between gap-0 rounded-lg border-[#003f55]/20 bg-white text-right text-base font-normal text-[#1a2332] [&>span]:flex-1 [&>span]:text-right">
                              <SelectValue placeholder="اختيار" />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                              {STATUS_OPTIONS.map((option) => (
                                <SelectItem key={`${record.student_id}-${option.value}`} value={option.value} className={`text-base ${option.className}`}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )
              ) : filteredTeacherRecords.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#003f55]/20 bg-[#f4fafb] px-4 py-10 text-center text-[#4d6b76]">
                  لايوجد معلمون
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {filteredTeacherRecords.map((record) => (
                    <Card key={record.teacher_id} className="w-full md:max-w-[200px] border border-[#003f55]/12 bg-white/95 shadow-sm">
                      <CardContent className="p-2.5" dir="rtl">
                        <div className="mb-2 flex justify-start">
                          <p className="text-base font-black text-[#1a2332] text-left">{record.teacher_name}</p>
                        </div>
                        <Select
                          value={record.status ?? undefined}
                          onValueChange={(value) => {
                            void saveTeacherStatus(record.teacher_id, value as Exclude<AttendanceStatus, null>)
                          }}
                          disabled={!isAttendanceDateAllowed || savingTeacherIds.includes(record.teacher_id)}
                        >
                          <SelectTrigger dir="rtl" className="h-10 w-full justify-between gap-0 rounded-lg border-[#003f55]/20 bg-white text-right text-base font-normal text-[#1a2332] [&>span]:flex-1 [&>span]:text-right">
                            <SelectValue placeholder="اختيار" />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem key={`${record.teacher_id}-${option.value}`} value={option.value} className={`text-base ${option.className}`}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}