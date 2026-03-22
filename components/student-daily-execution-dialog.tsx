"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SiteLoader } from "@/components/ui/site-loader"
import { getClientAuthHeaders } from "@/lib/client-auth"
import {
  getActivePlanDayNumber,
  getPlanSessionContent,
  getPlanSessionContentRange,
  getPlanSupportSessionContent,
  resolvePlanTotalDays,
} from "@/lib/quran-data"

type StudentData = {
  id: string
  account_number: number
}

type StudentDailyReport = {
  id: string
  student_id: string
  report_date: string
  memorization_done: boolean
  tikrar_done: boolean
  review_done: boolean
  linking_done: boolean
}

type AttendanceRecord = {
  id: string
  date: string
  status: string
  hafiz_level: string | null
  tikrar_level: string | null
  samaa_level: string | null
  rabet_level: string | null
}

type PlanProgressResponse = {
  plan: any | null
  completedDays?: number
  progressedDays?: number
  failedSessionNumbers?: number[]
  nextSessionNumber?: number
  completedRecordsBySessionNumber?: Record<string, AttendanceRecord>
}

type DailyExecutionForm = {
  memorization_done: boolean | null
  tikrar_done: boolean | null
  review_done: boolean | null
  linking_done: boolean | null
}

function buildDailyExecutionForm(report: StudentDailyReport | null, isReviewOnlyDay: boolean): DailyExecutionForm {
  return {
    memorization_done: isReviewOnlyDay
      ? null
      : typeof report?.memorization_done === "boolean"
        ? report.memorization_done
        : true,
    tikrar_done: isReviewOnlyDay
      ? null
      : typeof report?.tikrar_done === "boolean"
        ? report.tikrar_done
        : true,
    review_done: typeof report?.review_done === "boolean" ? report.review_done : true,
    linking_done: isReviewOnlyDay
      ? null
      : typeof report?.linking_done === "boolean"
        ? report.linking_done
        : true,
  }
}

function getKsaDateString(baseDate = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(baseDate)
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  return `${year}-${month}-${day}`
}

function isSaturdayReviewOnlyDate(date: string) {
  return new Date(`${date}T12:00:00+03:00`).getUTCDay() === 6
}

function formatPlanSessionRange(
  fromSurah?: string | null,
  fromVerse?: string | null,
  toSurah?: string | null,
  toVerse?: string | null,
  fallbackText?: string | null,
) {
  if (fallbackText?.includes("ما عدا")) {
    return fallbackText.trim()
  }

  if (fromSurah && fromVerse && toSurah && toVerse) {
    if (fromSurah === toSurah) {
      return `من ${fromSurah} آية ${fromVerse} إلى آية ${toVerse}`
    }

    return `من ${fromSurah} آية ${fromVerse} إلى ${toSurah} آية ${toVerse}`
  }

  if (fallbackText?.trim()) {
    return fallbackText
      .replace(/\s+مرورًا بسورة\s+.+$/u, "")
      .replace(/\s+مرورا بسورة\s+.+$/u, "")
      .replace(/من\s+سورة\s+/u, "من ")
      .replace(/إلى\s+سورة\s+/u, "إلى ")
      .trim()
  }

  return "-"
}

export function StudentDailyExecutionDialog() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isOpen, setIsOpen] = useState(false)
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const [planData, setPlanData] = useState<any>(null)
  const [planCompletedDays, setPlanCompletedDays] = useState(0)
  const [planProgressedDays, setPlanProgressedDays] = useState(0)
  const [planFailedSessionNumbers, setPlanFailedSessionNumbers] = useState<number[]>([])
  const [nextPlanSessionNumber, setNextPlanSessionNumber] = useState(1)
  const [todayDailyReport, setTodayDailyReport] = useState<StudentDailyReport | null>(null)
  const [dailyExecutionForm, setDailyExecutionForm] = useState<DailyExecutionForm>(buildDailyExecutionForm(null, false))
  const [isLoadingStudent, setIsLoadingStudent] = useState(false)
  const [isLoadingPlan, setIsLoadingPlan] = useState(false)
  const [isLoadingDailyReports, setIsLoadingDailyReports] = useState(false)
  const [isSavingDailyReport, setIsSavingDailyReport] = useState(false)
  const [dailyReportFeedback, setDailyReportFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [isDailyExecutionDirty, setIsDailyExecutionDirty] = useState(false)
  const dailyReportsRequestIdRef = useRef(0)
  const dailyExecutionDirtyRef = useRef(false)

  useEffect(() => {
    dailyExecutionDirtyRef.current = isDailyExecutionDirty
  }, [isDailyExecutionDirty])

  const fetchStudentData = async () => {
    setIsLoadingStudent(true)
    try {
      const accountNumber = typeof window !== "undefined" ? localStorage.getItem("accountNumber") : null
      if (!accountNumber) {
        setStudentData(null)
        return null
      }

      const response = await fetch(`/api/students?account_number=${accountNumber}`, { cache: "no-store" })
      const data = await response.json()
      const student = (data.students || [])[0] || null
      setStudentData(student)
      return student
    } catch {
      setStudentData(null)
      return null
    } finally {
      setIsLoadingStudent(false)
    }
  }

  const fetchPlanData = async (studentId: string) => {
    setIsLoadingPlan(true)
    try {
      const response = await fetch(`/api/student-plans?student_id=${studentId}`, {
        cache: "no-store",
        headers: getClientAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: PlanProgressResponse = await response.json()
      setPlanData(data.plan ?? null)
      setPlanCompletedDays(data.completedDays ?? 0)
      setPlanProgressedDays(data.progressedDays ?? data.completedDays ?? 0)
      setPlanFailedSessionNumbers(data.failedSessionNumbers ?? [])
      setNextPlanSessionNumber(data.nextSessionNumber ?? 1)
    } catch {
      setPlanData(null)
      setPlanCompletedDays(0)
      setPlanProgressedDays(0)
      setPlanFailedSessionNumbers([])
      setNextPlanSessionNumber(1)
    } finally {
      setIsLoadingPlan(false)
    }
  }

  const fetchDailyReports = async (studentId: string, options?: { preserveDirtySelection?: boolean }) => {
    const requestId = dailyReportsRequestIdRef.current + 1
    dailyReportsRequestIdRef.current = requestId
    setIsLoadingDailyReports(true)

    try {
      const response = await fetch(`/api/student-daily-reports?student_id=${studentId}&days=3`, { cache: "no-store" })
      const data = await response.json()

      if (requestId !== dailyReportsRequestIdRef.current) {
        return
      }

      if (!response.ok) {
        throw new Error(data.error || "تعذر جلب تقارير التنفيذ اليومية")
      }

      const reports: StudentDailyReport[] = Array.isArray(data.reports) ? data.reports : []
      const todayDate = data.todayDate || getKsaDateString()
      const todayIsReviewOnlyDay = isSaturdayReviewOnlyDate(todayDate)
      const todayReport = reports.find((report) => report.report_date === todayDate) || null
      const nextForm = buildDailyExecutionForm(todayReport, todayIsReviewOnlyDay)
      const shouldPreserveDirtySelection =
        options?.preserveDirtySelection !== false &&
        dailyExecutionDirtyRef.current &&
        !isSavingDailyReport

      setTodayDailyReport(todayReport)
      if (!shouldPreserveDirtySelection) {
        setDailyExecutionForm(nextForm)
      }
    } catch (error) {
      setTodayDailyReport(null)
      setDailyExecutionForm(buildDailyExecutionForm(null, isSaturdayReviewOnlyDate(getKsaDateString())))
      setIsDailyExecutionDirty(false)
      setDailyReportFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "تعذر جلب تقارير التنفيذ اليومية",
      })
    } finally {
      setIsLoadingDailyReports(false)
    }
  }

  const refreshExecutionContext = async () => {
    const currentStudent = studentData || await fetchStudentData()
    if (!currentStudent?.id) {
      return
    }

    await Promise.all([
      fetchPlanData(currentStudent.id),
      fetchDailyReports(currentStudent.id, { preserveDirtySelection: false }),
    ])
  }

  useEffect(() => {
    const openDialog = () => {
      setDailyReportFeedback(null)
      setIsOpen(true)
      void refreshExecutionContext()
    }

    window.addEventListener("studentDailyExecution:open", openDialog)
    return () => window.removeEventListener("studentDailyExecution:open", openDialog)
  }, [studentData])

  useEffect(() => {
    if (searchParams?.get("execution") === "1" || searchParams?.get("tab") === "execution") {
      setIsOpen(true)
      void refreshExecutionContext()
    }
  }, [searchParams])

  const closeDialog = () => {
    setIsOpen(false)
    setDailyReportFeedback(null)

    const params = new URLSearchParams(searchParams?.toString())
    let changed = false

    if (params.get("execution") === "1") {
      params.delete("execution")
      changed = true
    }

    if (params.get("tab") === "execution") {
      params.delete("tab")
      changed = true
    }

    if (changed) {
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }
  }

  const updateDailyExecutionField = (field: keyof DailyExecutionForm, value: boolean) => {
    setDailyExecutionForm((prev) => ({ ...prev, [field]: value }))
    setIsDailyExecutionDirty(true)
    setDailyReportFeedback(null)
  }

  const handleSaveDailyReport = async () => {
    if (!studentData?.id) {
      return
    }

    const todayIsReviewOnlyDay = isSaturdayReviewOnlyDate(getKsaDateString())
    const hasSavedDailyReport = !!todayDailyReport
    const { muraajaa: muraajaaContent, rabt: rabtContent } = getPlanSupportSessionContent(planData, planProgressedDays, planFailedSessionNumbers)
    const hasReviewContent = Boolean(muraajaaContent)
    const hasLinkingContent = !todayIsReviewOnlyDay && Boolean(rabtContent)

    const isMemorizationLocked = !todayIsReviewOnlyDay && hasSavedDailyReport
    const isTikrarLocked = !todayIsReviewOnlyDay && hasSavedDailyReport
    const isReviewLocked = hasSavedDailyReport
    const isLinkingLocked = todayIsReviewOnlyDay ? true : hasSavedDailyReport

    const { tikrar_done, review_done, linking_done } = dailyExecutionForm
    const memorization_done = todayIsReviewOnlyDay || isMemorizationLocked ? null : dailyExecutionForm.memorization_done
    const nextTikrarDone = todayIsReviewOnlyDay || isTikrarLocked ? null : tikrar_done
    const nextReviewDone = !hasReviewContent || isReviewLocked ? null : review_done
    const nextLinkingDone = !hasLinkingContent || isLinkingLocked ? null : linking_done

    if (
      typeof memorization_done !== "boolean" &&
      typeof nextTikrarDone !== "boolean" &&
      typeof nextReviewDone !== "boolean" &&
      typeof nextLinkingDone !== "boolean"
    ) {
      setDailyReportFeedback({ type: "error", message: "حدد عنصرًا واحدًا على الأقل قبل الحفظ" })
      return
    }

    try {
      setIsSavingDailyReport(true)
      setDailyReportFeedback(null)

      const response = await fetch("/api/student-daily-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentData.id,
          ...(typeof memorization_done === "boolean" ? { memorization_done } : {}),
          ...(typeof nextTikrarDone === "boolean" ? { tikrar_done: nextTikrarDone } : {}),
          ...(typeof nextReviewDone === "boolean" ? { review_done: nextReviewDone } : {}),
          ...(typeof nextLinkingDone === "boolean" ? { linking_done: nextLinkingDone } : {}),
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setIsDailyExecutionDirty(false)
          await fetchDailyReports(studentData.id, { preserveDirtySelection: false })
          setDailyReportFeedback({
            type: "error",
            message: data.error || "تم قفل تنفيذ اليوم ولا يمكن تعديله مرة أخرى",
          })
          return
        }

        throw new Error(data.error || "تعذر حفظ التنفيذ اليومي")
      }

      const savedReport: StudentDailyReport | null = data.report || null
      const nextTodayIsReviewOnlyDay = isSaturdayReviewOnlyDate(savedReport?.report_date || getKsaDateString())

      setIsDailyExecutionDirty(false)
      setTodayDailyReport(savedReport)
      setDailyExecutionForm(buildDailyExecutionForm(savedReport, nextTodayIsReviewOnlyDay))
      setDailyReportFeedback({
        type: "success",
        message: "تم حفظ تنفيذك اليومي بنجاح",
      })

      await Promise.all([
        fetchPlanData(studentData.id),
        fetchDailyReports(studentData.id, { preserveDirtySelection: false }),
      ])
    } catch (error) {
      setDailyReportFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "تعذر حفظ التنفيذ اليومي",
      })
    } finally {
      setIsSavingDailyReport(false)
    }
  }

  const isBusy = isLoadingStudent || isLoadingPlan || isLoadingDailyReports

  const renderContent = () => {
    if (isBusy && !studentData) {
      return (
        <div className="rounded-2xl border-2 bg-white p-6 shadow-sm" style={{ borderColor: "#8fb1ff" }}>
          <div className="flex justify-center py-8">
            <SiteLoader size="md" color="#003f55" />
          </div>
        </div>
      )
    }

    if (!studentData) {
      return (
        <div className="rounded-2xl border-2 bg-white p-6 text-center shadow-sm" style={{ borderColor: "#8fb1ff" }}>
          <p className="text-lg font-bold text-[#3453a7]">تعذر تحميل بيانات الطالب</p>
        </div>
      )
    }

    if (isLoadingPlan) {
      return (
        <div className="rounded-2xl border-2 bg-white p-6 shadow-sm" style={{ borderColor: "#8fb1ff" }}>
          <div className="flex justify-center py-8">
            <SiteLoader size="md" color="#003f55" />
          </div>
        </div>
      )
    }

    if (!planData) {
      return (
        <div className="rounded-2xl border-2 bg-white p-6 text-center shadow-sm" style={{ borderColor: "#8fb1ff" }}>
          <p className="text-lg font-bold text-[#3453a7]">لا توجد خطة حفظ حالياً</p>
          <p className="mt-2 text-sm text-[#1a2332]/55">سيظهر لك التنفيذ اليومي بعد إضافة خطة حفظ.</p>
        </div>
      )
    }

    const totalDays = resolvePlanTotalDays(planData)
    const todayIsReviewOnlyDay = isSaturdayReviewOnlyDate(getKsaDateString())
    const hasSavedDailyReport = !!todayDailyReport
    const isMemorizationLocked = !todayIsReviewOnlyDay && hasSavedDailyReport
    const isTikrarLocked = !todayIsReviewOnlyDay && hasSavedDailyReport
    const isReviewLocked = hasSavedDailyReport
    const isLinkingLocked = todayIsReviewOnlyDay ? true : hasSavedDailyReport
    const isDayLocked = todayIsReviewOnlyDay
      ? isReviewLocked
      : isMemorizationLocked && isTikrarLocked && isReviewLocked && isLinkingLocked
    const sortedFailedSessionNumbers = [...planFailedSessionNumbers].sort((left, right) => left - right)
    const retryStartSessionNumber = sortedFailedSessionNumbers[0]
    let retryEndSessionNumber = retryStartSessionNumber

    if (retryStartSessionNumber) {
      while (sortedFailedSessionNumbers.includes((retryEndSessionNumber || retryStartSessionNumber) + 1)) {
        retryEndSessionNumber = (retryEndSessionNumber || retryStartSessionNumber) + 1
      }
    }

    const activeDayNum = Math.max(
      1,
      Math.min(
        totalDays,
        retryStartSessionNumber || nextPlanSessionNumber || getActivePlanDayNumber(totalDays, planCompletedDays, planData.start_date, planData.created_at),
      ),
    )

    const currentSessionContent = retryStartSessionNumber
      ? getPlanSessionContentRange(planData, retryStartSessionNumber, retryEndSessionNumber || retryStartSessionNumber)
      : getPlanSessionContent(planData, activeDayNum)

    const { muraajaa: muraajaaContent, rabt: rabtContent } = getPlanSupportSessionContent(planData, planProgressedDays, planFailedSessionNumbers)
    const hasReviewContent = Boolean(muraajaaContent)
    const hasLinkingContent = !todayIsReviewOnlyDay && Boolean(rabtContent)
    const hasSavableSelection = [
      !todayIsReviewOnlyDay && !isMemorizationLocked && typeof dailyExecutionForm.memorization_done === "boolean",
      !todayIsReviewOnlyDay && !isTikrarLocked && typeof dailyExecutionForm.tikrar_done === "boolean",
      hasReviewContent && !isReviewLocked && typeof dailyExecutionForm.review_done === "boolean",
      hasLinkingContent && !isLinkingLocked && typeof dailyExecutionForm.linking_done === "boolean",
    ].some(Boolean)

    const executionItems = [
      ...(!todayIsReviewOnlyDay
        ? [{
            key: "memorization_done" as const,
            title: "الحفظ",
            description: currentSessionContent
              ? formatPlanSessionRange(
                  currentSessionContent.fromSurah,
                  currentSessionContent.fromVerse,
                  currentSessionContent.toSurah,
                  currentSessionContent.toVerse,
                  currentSessionContent.text,
                )
              : "لا يوجد حفظ اليوم",
            isLocked: isMemorizationLocked,
          }, {
            key: "tikrar_done" as const,
            title: "التكرار",
            description: currentSessionContent
              ? formatPlanSessionRange(
                  currentSessionContent.fromSurah,
                  currentSessionContent.fromVerse,
                  currentSessionContent.toSurah,
                  currentSessionContent.toVerse,
                  currentSessionContent.text,
                )
              : "لا يوجد تكرار اليوم",
            isLocked: isTikrarLocked,
          }]
        : []),
      {
        key: "review_done" as const,
        title: "المراجعة",
        description: muraajaaContent
          ? formatPlanSessionRange(
              muraajaaContent.fromSurah,
              muraajaaContent.fromVerse,
              muraajaaContent.toSurah,
              muraajaaContent.toVerse,
              muraajaaContent.text,
            )
          : "لا توجد مراجعة اليوم",
        isLocked: isReviewLocked,
          isUnavailable: !hasReviewContent,
      },
      ...(!todayIsReviewOnlyDay
        ? [{
            key: "linking_done" as const,
            title: "الربط",
            description: rabtContent
              ? formatPlanSessionRange(
                  rabtContent.fromSurah,
                  rabtContent.fromVerse,
                  rabtContent.toSurah,
                  rabtContent.toVerse,
                  rabtContent.text,
                )
              : "لا يوجد ربط اليوم",
            isLocked: isLinkingLocked,
              isUnavailable: !hasLinkingContent,
          }]
        : []),
    ]

    return (
      <div className="rounded-[24px] border border-[#8fb1ff]/30 bg-[#f7faff] p-3.5 shadow-sm md:p-4">
        <div className="mb-4 border-b border-[#8fb1ff]/25 pb-3">
          <div className="text-right">
            <p className="text-base font-black text-[#1a2332] md:text-lg">تنفيذ اليوم</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {executionItems.map((item) => {
            const selectedValue = dailyExecutionForm[item.key as keyof DailyExecutionForm]
            return (
              <div key={item.key} className="rounded-xl border border-[#8fb1ff]/30 bg-white p-3 text-right shadow-[0_6px_18px_rgba(52,83,167,0.08)]">
                <div className="flex flex-col gap-2.5 md:grid md:grid-cols-[92px_minmax(0,1fr)_120px] md:items-center md:gap-3">
                  <div>
                    <p className="text-sm font-black text-[#1a2332] md:text-base">{item.title}</p>
                  </div>
                  <p className="text-xs leading-5 text-[#1a2332]/58 md:min-w-0 md:text-sm">{item.description}</p>
                  <div className="md:w-[120px]">
                    {item.isUnavailable ? (
                      <div className="flex h-9 items-center justify-center rounded-lg border border-dashed border-[#8fb1ff]/60 bg-[#f7faff] px-3 text-xs font-bold text-[#1a2332]/55 md:text-sm">
                        غير متاح اليوم
                      </div>
                    ) : (
                      <Select
                        value={selectedValue === false ? "not_done" : "done"}
                        onValueChange={(value) => updateDailyExecutionField(item.key as keyof DailyExecutionForm, value === "done")}
                        disabled={item.isLocked || isSavingDailyReport || isLoadingDailyReports}
                      >
                        <SelectTrigger className="h-9 rounded-lg border-[#8fb1ff] bg-white px-3 text-xs font-bold text-[#1a2332] md:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="done">نفذت</SelectItem>
                          <SelectItem value="not_done">لم أنفذ</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 border-t border-[#8fb1ff]/25 pt-3">
          <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-start sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              className="h-10 rounded-xl border-[#003f55]/20 bg-white px-5 text-sm text-neutral-600 hover:bg-[#003f55]/8 hover:text-[#003f55]"
            >
              إغلاق
            </Button>
            <div className="flex flex-col items-stretch gap-2 sm:min-w-[170px]">
              <Button
                type="button"
                onClick={handleSaveDailyReport}
                disabled={isSavingDailyReport || isLoadingDailyReports || isDayLocked || !hasSavableSelection}
                className="h-10 min-w-[160px] rounded-xl bg-[#3453a7] text-sm text-white shadow-sm hover:bg-[#27428d] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-[#3453a7]"
              >
                حفظ
              </Button>
              {dailyReportFeedback ? (
                <p className={`text-center text-xs font-semibold sm:text-right ${dailyReportFeedback.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>
                  {dailyReportFeedback.message}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent showCloseButton={false} className="w-[92vw] max-w-3xl overflow-hidden rounded-[28px] border border-[#8fb1ff] bg-white p-0" dir="rtl">
        <DialogTitle className="sr-only">التنفيذ اليومي</DialogTitle>
        <DialogDescription className="sr-only">نافذة تنفيذ يومي عالمية للطالب دون الانتقال إلى صفحة أخرى.</DialogDescription>
        <div className="max-h-[74vh] overflow-y-auto bg-[#f7faff] p-2.5 md:p-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  )
}