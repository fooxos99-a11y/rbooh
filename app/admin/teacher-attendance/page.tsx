"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Clock } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"

interface AttendanceRecord {
  id: string
  teacher_id: string
  teacher_name: string
  account_number: number
  attendance_date: string
  check_in_time: string
  status: string
  created_at: string
}

export default function TeacherAttendancePage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("التقارير");

  const [isLoading, setIsLoading] = useState(true)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  // تاريخ اليوم بتوقيت السعودية
  const getSaudiDate = () => {
    const now = new Date()
    const saDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }))
    return saDate.toISOString().split("T")[0]
  }
  const [selectedDate, setSelectedDate] = useState(getSaudiDate())
  const router = useRouter()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")

    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
    } else {
      fetchAttendanceRecords()
      setIsLoading(false)
    }
  }, [router])

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
      const date = new Date(timestamp)
      return date.toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    } catch {
      return "-"
    }
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
        <div className="text-2xl text-[#1a2332]">جاري التحميل...</div>
      </div>
    )
  }

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><div className="w-8 h-8 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" /></div>);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
      <Header />

      <main className="flex-1 py-4 md:py-8 lg:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#1a2332] mb-2">تحضير المعلمين</h1>
              <p className="text-gray-600">عرض وإدارة حضور المعلمين وتسجيل الوقت بالضبط</p>
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
                        <Calendar className="w-4 h-4" />
                        التاريخ
                      </div>
                    </Label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="text-base"
                    />
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
                                {formatTime(record.check_in_time)}
                              </TableCell>
                              <TableCell className="text-[#1a2332] text-lg">
                                {record.status === "present" ? (
                                  <span className="text-green-600 font-bold">✓ حاضر</span>
                                ) : (
                                  <span className="text-red-600 font-bold">✗ لم يحضر</span>
                                )}
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
