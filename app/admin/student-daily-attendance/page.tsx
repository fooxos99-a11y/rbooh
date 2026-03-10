
"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Calendar } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"

function translateLevel(level: string | null | undefined) {
  if (!level) return null;
  switch (level) {
    case "excellent": return "ممتاز";
    case "very_good": return "جيد جدًا";
    case "good": return "جيد";
    case "not_completed": return "لم يكمل";
    default: return null;
  }
}

function LevelBadge({ level }: { level: string | null | undefined }) {
  const label = translateLevel(level);
  if (!label) return <span className="text-gray-300">—</span>;
  const colors: Record<string, string> = {
    "ممتاز": "text-emerald-600",
    "جيد جدًا": "text-blue-600",
    "جيد": "text-amber-600",
    "لم يكمل": "text-red-500",
  };
  return (
    <span className={`text-base font-semibold ${colors[label] ?? "text-gray-500"}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "present") return <span className="text-base font-semibold text-emerald-600">حاضر</span>;
  if (status === "excused") return <span className="text-base font-semibold text-amber-600">مستأذن</span>;
  if (status === "absent") return <span className="text-base font-semibold text-red-500">غائب</span>;
  return <span className="text-gray-400 text-base">—</span>;
}

interface AttendanceRecord {
  id: string
  student_id: string
  student_name: string
  halaqah?: string | null
  status: string | null
  created_at: string
  notes?: string | null
  hafiz_level?: string | null
  tikrar_level?: string | null
  samaa_level?: string | null
  rabet_level?: string | null
  hafiz_from_surah?: string | null
  hafiz_from_verse?: string | null
  hafiz_to_surah?: string | null
  hafiz_to_verse?: string | null
  samaa_from_surah?: string | null
  samaa_from_verse?: string | null
  samaa_to_surah?: string | null
  samaa_to_verse?: string | null
  rabet_from_surah?: string | null
  rabet_from_verse?: string | null
  rabet_to_surah?: string | null
  rabet_to_verse?: string | null
  attendance_date?: string
}

function formatReadingRange(fromSurah?: string | null, fromVerse?: string | null, toSurah?: string | null, toVerse?: string | null) {
  if (!fromSurah || !fromVerse || !toSurah || !toVerse) return null
  return `${fromSurah} ${fromVerse} - ${toSurah} ${toVerse}`
}

function EvaluationCell({ level, detail }: { level: string | null | undefined, detail?: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <LevelBadge level={level} />
      {detail && <span className="text-[11px] leading-4 text-neutral-500">{detail}</span>}
    </div>
  )
}

export default function StudentDailyAttendancePage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("التقارير");

  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingRecords, setIsFetchingRecords] = useState(false)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [selectedCircle, setSelectedCircle] = useState("all")

  const getSaudiDate = () => {
    const now = new Date();
    const saDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
    return saDate.toISOString().split("T")[0];
  }

  const [selectedDate, setSelectedDate] = useState(getSaudiDate())
  useEffect(() => {
    if (!authLoading && authVerified) {
      fetchAttendanceRecords()
    }
  }, [authLoading, authVerified, selectedDate])

  useEffect(() => {
    filterRecords()
  }, [attendanceRecords, selectedDate, selectedCircle])

  const fetchAttendanceRecords = async () => {
    setIsFetchingRecords(true)
    try {
      const response = await fetch(`/api/student-attendance/all?date=${selectedDate}`)
      if (!response.ok) throw new Error("فشل في جلب البيانات من السيرفر")
      const data = await response.json()
      setAttendanceRecords(Array.isArray(data.records) ? data.records : [])
    } catch (error) {
      setAttendanceRecords([])
      console.error("[v0] Error fetching attendance:", error)
    } finally {
      setIsFetchingRecords(false)
      setIsLoading(false)
    }
  }

  const filterRecords = () => {
    setFilteredRecords(
      attendanceRecords.filter((r) => {
        const matchesDate = selectedDate ? r.attendance_date === selectedDate : true
        const matchesCircle = selectedCircle === "all" ? true : (r.halaqah || "") === selectedCircle
        return matchesDate && matchesCircle
      })
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f5f1e8] to-white">
        <SiteLoader size="lg" />
      </div>
    )
  }

  const isFuture = (() => {
    const getSaudiDateObj = (d: string) => {
      const o = new Date(new Date(d).toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
      o.setHours(0, 0, 0, 0);
      return o;
    };
    return getSaudiDateObj(selectedDate) > getSaudiDateObj(getSaudiDate());
  })();

  const sorted = [...filteredRecords].sort((a, b) => {
    const order: Record<string, number> = { absent: 0, excused: 1, present: 2 };
    return (order[a.status ?? ""] ?? 3) - (order[b.status ?? ""] ?? 3);
  });

  const availableCircles = Array.from(
    new Set(
      attendanceRecords
        .map((record) => (record.halaqah || "").trim())
        .filter((circleName) => circleName.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, "ar"))

  if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
      <Header />

      <main className="flex-1 py-6 md:py-10 px-3 md:px-6">
        <div className="container mx-auto max-w-7xl space-y-6">

          {/* Page Header */}
          <div className="animate-in fade-in slide-in-from-top-2 duration-500">
            <h1 className="text-4xl md:text-5xl font-bold text-[#1a2332] mb-1">السجل اليومي للطلاب</h1>
            <p className="text-gray-500 text-base">عرض حضور الطلاب حسب التاريخ</p>
          </div>

          {/* Date Filter */}
          <Card className="border border-[#d8a355]/25 shadow-sm transition-shadow duration-300 hover:shadow-md animate-in fade-in slide-in-from-top-3 duration-500">
            <CardContent className="pt-5 pb-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-[#d8a355] flex-shrink-0" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-base border-[#d8a355]/40 focus-visible:ring-[#d8a355]/40 transition-all duration-200"
                  />
                </div>
                <div>
                  <Select value={selectedCircle} onValueChange={setSelectedCircle}>
                    <SelectTrigger className="text-base border-[#d8a355]/40 focus:ring-[#d8a355]/40">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">كل الحلقات</SelectItem>
                      {availableCircles.map((circle) => (
                        <SelectItem key={circle} value={circle}>{circle}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table Card */}
          <Card className="border border-[#d8a355]/25 shadow-sm transition-shadow duration-300 hover:shadow-md animate-in fade-in slide-in-from-bottom-3 duration-500">
            <CardContent className="pt-4">
              <div className="overflow-x-auto rounded-lg border border-[#d8a355]/15">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#f5f1e8]/60 border-b border-[#d8a355]/20 hover:bg-[#f5f1e8]/60">
                      <TableHead className="text-right text-[#1a2332] font-bold text-base">الحلقة</TableHead>
                      <TableHead className="text-right text-[#1a2332] font-bold text-base">اسم الطالب</TableHead>
                      <TableHead className="text-center text-[#1a2332] font-bold w-24 px-1 text-base">الحفظ</TableHead>
                      <TableHead className="text-center text-[#1a2332] font-bold w-24 px-1 text-base">التكرار</TableHead>
                      <TableHead className="text-center text-[#1a2332] font-bold w-24 px-1 text-base">المراجعة</TableHead>
                      <TableHead className="text-center text-[#1a2332] font-bold w-24 px-1 text-base">الربط</TableHead>
                      <TableHead className="text-center text-[#1a2332] font-bold text-base">الحالة</TableHead>
                      <TableHead className="text-center text-[#1a2332] font-bold text-base">الملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isFuture ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                          لا يمكن عرض بيانات الحضور لتاريخ مستقبلي
                        </TableCell>
                      </TableRow>
                    ) : isFetchingRecords ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12">
                          <div className="flex justify-center">
                            <SiteLoader size="md" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : sorted.length > 0 ? sorted.map((record, i) => (
                      <TableRow
                        key={record.id}
                        className="transition-colors duration-150 hover:bg-[#f5f1e8]/50 border-b border-[#d8a355]/10"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <TableCell className="font-medium text-neutral-600 text-base">{record.halaqah || "—"}</TableCell>
                        <TableCell className="font-semibold text-[#1a2332] text-base">{record.student_name}</TableCell>
                        <TableCell className="text-center">
                          {(record.status === "absent" || record.status === "excused")
                            ? <span className="text-gray-300">—</span>
                            : <EvaluationCell level={record.hafiz_level} detail={formatReadingRange(record.hafiz_from_surah, record.hafiz_from_verse, record.hafiz_to_surah, record.hafiz_to_verse)} />}
                        </TableCell>
                        <TableCell className="text-center px-1">
                          {(record.status === "absent" || record.status === "excused")
                            ? <span className="text-gray-300">—</span>
                            : <LevelBadge level={record.tikrar_level} />}
                        </TableCell>
                        <TableCell className="text-center px-1">
                          {(record.status === "absent" || record.status === "excused")
                            ? <span className="text-gray-300">—</span>
                            : <EvaluationCell level={record.samaa_level} detail={formatReadingRange(record.samaa_from_surah, record.samaa_from_verse, record.samaa_to_surah, record.samaa_to_verse)} />}
                        </TableCell>
                        <TableCell className="text-center px-1">
                          {(record.status === "absent" || record.status === "excused")
                            ? <span className="text-gray-300">—</span>
                            : <EvaluationCell level={record.rabet_level} detail={formatReadingRange(record.rabet_from_surah, record.rabet_from_verse, record.rabet_to_surah, record.rabet_to_verse)} />}
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge status={record.status} />
                        </TableCell>
                        <TableCell className="text-center text-base max-w-[200px]">
                          {record.notes
                            ? <span className="text-neutral-600">{record.notes}</span>
                            : <span className="text-gray-300">—</span>}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                          {selectedCircle === "all"
                            ? "لا توجد سجلات للعرض في التاريخ المحدد"
                            : "لا يوجد طلاب أو سجلات لهذه الحلقة في التاريخ المحدد"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>

      <Footer />
    </div>
  )
}

