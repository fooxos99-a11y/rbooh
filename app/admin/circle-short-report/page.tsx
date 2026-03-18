"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarDays } from "lucide-react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SiteLoader } from "@/components/ui/site-loader"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/hooks/use-admin-auth"

type Circle = {
  name: string
  studentCount?: number
}

type ReportRow = {
  studentId: string
  studentName: string
  presentCount: number
  attendanceTotal: number
  absentCount: number
  lateCount: number
  excusedCount: number
  tasmeePassed: number
  tasmeeTotal: number
  memorizationExecuted: number
  memorizationRequired: number
  tikrarExecuted: number
  tikrarRequired: number
  reviewExecuted: number
  reviewRequired: number
  linkingExecuted: number
  linkingRequired: number
}

function getKsaDateString(baseDate = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  return formatter.format(baseDate)
}

function getMonthStart(dateValue: string) {
  return `${dateValue.slice(0, 8)}01`
}

function formatRatio(done: number, total: number) {
  if (total <= 0) return "—"
  return `${done}/${total}`
}

export default function CircleShortReportPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("التقارير")
  const router = useRouter()

  const today = useMemo(() => getKsaDateString(), [])
  const [circles, setCircles] = useState<Circle[]>([])
  const [selectedCircle, setSelectedCircle] = useState("")
  const [startDate, setStartDate] = useState(getMonthStart(today))
  const [endDate, setEndDate] = useState(today)
  const [rows, setRows] = useState<ReportRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState("")
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    async function fetchCircles() {
      try {
        setIsLoading(true)
        setError("")

        const response = await fetch(`/api/circles?t=${Date.now()}`, { cache: "no-store" })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data?.error || "تعذر تحميل الحلقات")
        }

        const nextCircles = Array.isArray(data?.circles) ? data.circles : []
        setCircles(nextCircles)
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "تعذر تحميل الحلقات"
        setError(message)
        setCircles([])
      } finally {
        setIsLoading(false)
      }
    }

    if (!authLoading && authVerified) {
      void fetchCircles()
    }
  }, [authLoading, authVerified])

  async function fetchReport() {
    if (!selectedCircle) {
      setError("اختر الحلقة أولًا")
      return
    }

    if (!startDate || !endDate) {
      setError("حدد الفترة من وإلى")
      return
    }

    if (startDate > endDate) {
      setError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية")
      return
    }

    try {
      setIsFetching(true)
      setHasSearched(true)
      setError("")

      const params = new URLSearchParams({
        circle: selectedCircle,
        start: startDate,
        end: endDate,
      })

      const response = await fetch(`/api/circle-short-report?${params.toString()}`, { cache: "no-store" })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "تعذر تحميل التقرير")
      }

      setRows(Array.isArray(data?.rows) ? data.rows : [])
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "تعذر تحميل التقرير"
      setError(message)
      setRows([])
    } finally {
      setIsFetching(false)
    }
  }

  if (authLoading || !authVerified || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader size="md" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] font-cairo" dir="rtl">
      <Header />
      <main className="px-4 py-10">
        <div className="container mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-start gap-3 border-b border-[#e8dfcc] pb-6">
            <div className="text-right">
              <h1 className="text-3xl font-black text-[#1f2937]">تقرير الحلقات المختصر</h1>
              <p className="mt-2 text-sm font-semibold text-[#6b7280]">اختر الحلقة والفترة لعرض بيانات الطلاب بشكل مختصر ودقيق.</p>
            </div>
          </div>

          <Card className="overflow-hidden rounded-[28px] border border-[#e6dfcb] bg-white py-0 shadow-sm">
            <CardContent className="px-5 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-start">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative lg:w-[220px]">
                      <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b38a44]" />
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                        className="h-11 rounded-2xl border-[#dccba0] pl-11 text-base"
                      />
                    </div>

                    <div className="relative lg:w-[220px]">
                      <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b38a44]" />
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        className="h-11 rounded-2xl border-[#dccba0] pl-11 text-base"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => void fetchReport()}
                    disabled={isFetching}
                    className="h-11 rounded-2xl bg-[#d8a355] px-4 text-base font-bold text-white hover:bg-[#c99347]"
                  >
                    {isFetching ? "جاري التحميل..." : "عرض"}
                  </Button>
                </div>

                <div className="w-full lg:w-[340px] lg:flex-none lg:self-start">
                  <Select value={selectedCircle} onValueChange={setSelectedCircle}>
                    <SelectTrigger className="h-11 w-full rounded-2xl border-[#dccba0] px-4 text-right text-base [&>span]:text-right [&>svg]:order-first [&>svg]:ml-0 [&>svg]:mr-3">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {circles.map((circle) => (
                        <SelectItem key={circle.name} value={circle.name}>
                          {circle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[28px] border border-[#e6dfcb] bg-white py-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#fcfaf4] hover:bg-[#fcfaf4]">
                      <TableHead className="min-w-[220px] text-right font-black text-[#1f2937]">اسم الطالب</TableHead>
                      <TableHead className="text-center font-black text-[#1f2937]">حضور</TableHead>
                      <TableHead className="text-center font-black text-[#1f2937]">غياب</TableHead>
                      <TableHead className="text-center font-black text-[#1f2937]">تأخر</TableHead>
                      <TableHead className="text-center font-black text-[#1f2937]">استئذان</TableHead>
                      <TableHead className="text-center font-black text-[#1f2937]">التسميع</TableHead>
                      <TableHead className="text-center font-black text-[#1f2937]">الحفظ</TableHead>
                      <TableHead className="text-center font-black text-[#1f2937]">التكرار</TableHead>
                      <TableHead className="text-center font-black text-[#1f2937]">المراجعة</TableHead>
                      <TableHead className="text-center font-black text-[#1f2937]">الربط</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isFetching ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-14 text-center">
                          <div className="flex justify-center">
                            <SiteLoader size="md" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-14 text-center text-base font-semibold text-[#8a8f98]">
                          {hasSearched ? "لا توجد بيانات لهذه الفترة." : "اختر الحلقة والفترة ثم اضغط عرض."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => (
                        <TableRow key={row.studentId} className="hover:bg-[#fffdf8]">
                          <TableCell className="font-black text-[#1f2937]">{row.studentName}</TableCell>
                          <TableCell className="text-center font-bold text-[#2563eb]">{formatRatio(row.presentCount, row.attendanceTotal)}</TableCell>
                          <TableCell className="text-center font-bold text-red-600">{row.absentCount}</TableCell>
                          <TableCell className="text-center font-bold text-amber-600">{row.lateCount}</TableCell>
                          <TableCell className="text-center font-bold text-[#b7791f]">{row.excusedCount}</TableCell>
                          <TableCell className="text-center font-black text-[#1f2937]">{formatRatio(row.tasmeePassed, row.tasmeeTotal)}</TableCell>
                          <TableCell className="text-center font-black text-[#1f2937]">{formatRatio(row.memorizationExecuted, row.memorizationRequired)}</TableCell>
                          <TableCell className="text-center font-black text-[#1f2937]">{formatRatio(row.tikrarExecuted, row.tikrarRequired)}</TableCell>
                          <TableCell className="text-center font-black text-[#1f2937]">{formatRatio(row.reviewExecuted, row.reviewRequired)}</TableCell>
                          <TableCell className="text-center font-black text-[#1f2937]">{formatRatio(row.linkingExecuted, row.linkingRequired)}</TableCell>
                        </TableRow>
                      ))
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