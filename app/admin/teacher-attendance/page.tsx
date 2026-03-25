"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { SiteLoader } from "@/components/ui/site-loader"
import { formatSaudiTimeWithPeriod, getSaudiDateString } from "@/lib/saudi-time"

interface AttendanceRecord {
  id: string
  teacher_id: string
  teacher_name: string
  account_number: number
  attendance_date: string
  check_in_time: string
  status: string
  created_at: string
  ishaTime: string | null
  graceDeadline: string | null
  checkInTimeLocal: string | null
  isLate: boolean | null
  isEarly: boolean | null
  isOnTime: boolean | null
  timingCategory: "late" | "early" | "on-time" | null
  lateMinutes: number | null
  city: string
  graceMinutes: number
  source: string
}

export default function TeacherAttendancePage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("التقارير");

  const [isLoading, setIsLoading] = useState(true)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [selectedDate, setSelectedDate] = useState(getSaudiDateString())
  const router = useRouter()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")

    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
    } else {
      fetchAttendanceRecords()
    }
  }, [router])

  useEffect(() => {
    const refreshData = () => {
      void fetchAttendanceRecords()
    }

    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshData()
      }
    }

    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshData()
      }
    }, 60000)

    window.addEventListener("focus", refreshData)
    document.addEventListener("visibilitychange", refreshOnVisibility)

    return () => {
      window.removeEventListener("focus", refreshData)
      document.removeEventListener("visibilitychange", refreshOnVisibility)
      window.clearInterval(refreshInterval)
    }
  }, [])

  useEffect(() => {
    filterRecords()
  }, [attendanceRecords, selectedDate])

  const fetchAttendanceRecords = async () => {
    try {
      const response = await fetch("/api/teacher-attendance/all")
      const data = await response.json()

      if (data.records) {
        setAttendanceRecords(data.records)
      }
    } catch (error) {
      console.error("[v0] Error fetching attendance:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterRecords = () => {
    let filtered = attendanceRecords
    // Filter by date only
    if (selectedDate) {
      filtered = filtered.filter((record) => record.attendance_date === selectedDate)
    }
    setFilteredRecords(filtered)
  }

  const formatTime = (timestamp: string) => {
    try {
      return formatSaudiTimeWithPeriod(timestamp)
    } catch {
      return "-"
    }
  }

  const renderAttendanceStatus = (record: AttendanceRecord) => {
    if (record.status !== "present") {
      return <span className="text-red-600 font-bold">✗ لم يحضر</span>
    }

    if (record.timingCategory === "late") {
      return <span className="font-bold text-amber-600">متأخر {record.lateMinutes} د</span>
    }

    if (record.timingCategory === "early") {
      return <span className="text-emerald-600 font-bold">مبكر</span>
    }

    if (record.timingCategory === "on-time") {
      return <span className="text-sky-700 font-bold">حاضر</span>
    }

    return <span className="text-neutral-500 font-bold">حاضر</span>
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString + "T00:00:00")
      return date.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return dateString
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SiteLoader size="lg" />
      </div>
    )
  }

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
      <Header />

      <main className="flex-1 py-4 md:py-8 lg:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#1a2332] mb-2">تحضير المعلمين</h1>
              </div>
            </div>

            {/* Filters Card */}
            <Card className="border-2 border-[#35A4C7]/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-[#1a2332]">تحديد التاريخ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  {/* Date Filter Only */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#1a2332]">
                      <div className="flex items-center gap-2 mb-1">
                        <CalendarIcon className="w-4 h-4" />
                        التاريخ
                      </div>
                    </Label>
                    <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={`w-full justify-start text-right font-normal flex-row-reverse gap-2 ${!selectedDate ? "text-muted-foreground" : ""} text-base h-10`}
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
                                const pad = (n) => n.toString().padStart(2, "0");
                                const val = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                                setSelectedDate(val);
                              }
                            }}
                            disabled={(date) => date.getDay() !== 0 && date.getDay() !== 3}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Table */}
            <Card className="border-2 border-[#35A4C7]/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-[#1a2332]">سجل الحضور</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right text-[#1a2332] font-bold text-lg">الاسم</TableHead>
                        <TableHead className="text-right text-[#1a2332] font-bold text-lg">رقم الحساب</TableHead>
                        <TableHead className="text-right text-[#1a2332] font-bold text-lg">التاريخ</TableHead>
                        <TableHead className="text-right text-[#1a2332] font-bold text-lg">
                          <div className="flex items-center gap-1">
                            <Clock className="w-5 h-5" />
                            وقت التحضير
                          </div>
                        </TableHead>
                        <TableHead className="text-right text-[#1a2332] font-bold text-lg">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* تحقق من أن التاريخ ليس مستقبلي (اليوم مسموح) */}
                      {new Date(selectedDate).setHours(0,0,0,0) > new Date().setHours(0,0,0,0) ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <div className="text-gray-500">لا يمكن عرض بيانات الحضور لتاريخ مستقبلي</div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRecords.length > 0 ? (
                          filteredRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-semibold text-[#1a2332] text-lg">{record.teacher_name}</TableCell>
                              <TableCell className="text-[#1a2332] text-lg">{record.account_number}</TableCell>
                              <TableCell className="text-[#1a2332] text-lg">{formatDate(record.attendance_date)}</TableCell>
                              <TableCell className="text-[#1a2332] font-mono text-lg font-semibold">
                                {record.checkInTimeLocal ? formatSaudiTimeWithPeriod(record.checkInTimeLocal) : formatTime(record.check_in_time)}
                              </TableCell>
                              <TableCell className="text-[#1a2332] text-lg">
                                {renderAttendanceStatus(record)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <div className="text-gray-500">لا توجد سجلات للعرض في التاريخ المحدد</div>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
