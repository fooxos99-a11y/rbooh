
"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { BellRing, Eye, Pencil, ShieldAlert, Trash2 } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"
import { useToast } from "@/hooks/use-toast"
import {
	DEFAULT_STUDENT_ISSUE_NOTIFICATION_TEMPLATES,
	formatStudentIssueNotificationMessage,
	normalizeStudentIssueNotificationTemplates,
	STUDENT_ISSUE_NOTIFICATION_SETTING_ID,
	type StudentIssueNotificationTemplates,
} from "@/lib/student-issues"

const TEMPLATE_VARIABLE_HELP_ITEMS = [
  { key: "{{studentName}}", description: "اسم الطالب" },
  { key: "{{circleName}}", description: "اسم الحلقة" },
  { key: "{{date}}", description: "التاريخ الحالي للإرسال" },
  { key: "{{issueSummary}}", description: "ملخص السبب أو المشكلة" },
  { key: "{{absentCount}}", description: "عدد الغيابات" },
  { key: "{{excusedCount}}", description: "عدد الاستئذانات" },
  { key: "{{effectiveAbsenceCount}}", description: "الغياب المحتسب" },
  { key: "{{missingTasks}}", description: "العناصر الناقصة في التنفيذ" },
] as const

type IssueSeverity = "warning" | "alert"
type IssueScope = "today" | "total"

type StudentIssueReason = {
	code: string
	category: "attendance" | "execution"
	severity: IssueSeverity
	title: string
	description: string
	date: string
	missingTasks?: string[]
}

type StudentIssueRow = {
	studentId: string
	studentName: string
	accountNumber: string | null
	circleName: string
	selectedDate: string
	attendanceStatus: string | null
	attendanceNotes: string | null
	dailyReportNotes: string | null
	absentCount: number
	excusedCount: number
	effectiveAbsenceCount: number
	missingTasks: string[]
	reasons: StudentIssueReason[]
	issuesCount: number
	recommendedAction: IssueSeverity
  warningCount: number
  alertCount: number
  manualActions: Array<{
    id: string
    type: IssueSeverity
    source: "manual" | "automatic"
    issueDate: string
    issueSummary: string | null
    message: string
    sentAt: string
    updatedAt: string | null
    sentByAccountNumber: string | null
    sentByRole: string | null
  }>
  lastAction: {
    type: IssueSeverity
    message: string
    sentAt: string
    sentByAccountNumber: string | null
    sentByRole: string | null
  } | null
}

function SeverityBadge({ severity }: { severity: IssueSeverity }) {
	return severity === "alert" ? (
    <Badge className="border-red-200 bg-red-50 text-red-700 hover:bg-red-50">إنذار</Badge>
	) : (
  <Badge className="border-[#8fb1ff] bg-[#eef4ff] text-[#3453a7] hover:bg-[#eef4ff]">تنبيه</Badge>
	)
}

function CategoryBadge({ category }: { category: StudentIssueReason["category"] }) {
	return category === "attendance" ? (
		<Badge className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-50">حضور</Badge>
	) : (
		<Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">تنفيذ</Badge>
	)
}

function AttendanceStatusBadge({ status }: { status: string | null }) {
	if (status === "absent") {
		return <span className="font-bold text-red-600">غائب</span>
	}
	if (status === "excused") {
		return <span className="font-bold text-amber-600">مستأذن</span>
	}
	if (status === "late") {
		return <span className="font-bold text-orange-600">متأخر</span>
	}
	if (status === "present") {
		return <span className="font-bold text-emerald-600">حاضر</span>
	}
	return <span className="text-gray-400">—</span>
}

function getIssueReasonSummary(row: StudentIssueRow) {
  const hasAttendanceIssue = row.reasons.some((reason) => reason.category === "attendance")
  const hasExecutionIssue = row.reasons.some((reason) => reason.category === "execution")

  if (hasAttendanceIssue && hasExecutionIssue) {
    return "نقص وغياب"
  }

  if (hasExecutionIssue) {
    return "نقص"
  }

  if (hasAttendanceIssue) {
    return "غياب"
  }

  return "—"
}

function getIssueCountColumnTitle(scope: IssueScope) {
  return scope === "today" ? "مشاكل اليوم" : "المشكلات المحتسبة"
}

function getIssueCountValue(row: StudentIssueRow, scope: IssueScope) {
  if (scope === "today") {
    return row.issuesCount
  }

  return row.issuesCount + row.alertCount + row.warningCount
}

function getHistoryColumnTitle(scope: IssueScope) {
  return scope === "today" ? "السجل" : "المجموع"
}

function getHistoryCountValue(row: StudentIssueRow) {
  return row.alertCount + row.warningCount
}

function formatActionDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default function StudentDailyAttendancePage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("التقارير")
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingRecords, setIsFetchingRecords] = useState(false)
  const [isSavingTemplates, setIsSavingTemplates] = useState(false)
  const [isSendingNotification, setIsSendingNotification] = useState(false)
  const [issueRows, setIssueRows] = useState<StudentIssueRow[]>([])
  const [circles, setCircles] = useState<string[]>([])
  const [selectedCircle, setSelectedCircle] = useState("all")
  const [rangeStartDate, setRangeStartDate] = useState("")
  const [rangeEndDate, setRangeEndDate] = useState("")
  const [dailyReportsAvailable, setDailyReportsAvailable] = useState(true)
  const [templates, setTemplates] = useState<StudentIssueNotificationTemplates>(DEFAULT_STUDENT_ISSUE_NOTIFICATION_TEMPLATES)
  const [isTemplatesDialogOpen, setIsTemplatesDialogOpen] = useState(false)
  const [detailsRow, setDetailsRow] = useState<StudentIssueRow | null>(null)
  const [actionRow, setActionRow] = useState<StudentIssueRow | null>(null)
  const [editingActionId, setEditingActionId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<IssueSeverity>("warning")
  const [actionMessage, setActionMessage] = useState("")
  const [actionDate, setActionDate] = useState("")
  const [deleteActionTarget, setDeleteActionTarget] = useState<{
    actionId: string
    studentName: string
    type: IssueSeverity
  } | null>(null)

  const getSaudiDate = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }

  useEffect(() => {
    const today = getSaudiDate()
    setRangeStartDate(today)
    setRangeEndDate(today)
  }, [])

  const effectiveSelectedDate = rangeEndDate || rangeStartDate || getSaudiDate()
  const effectiveScope: IssueScope = rangeStartDate && rangeEndDate && rangeStartDate !== rangeEndDate ? "total" : "today"

  useEffect(() => {
    if (!authLoading && authVerified) {
      void Promise.all([fetchIssueRows(), fetchTemplates()]).finally(() => setIsLoading(false))
    }
  }, [authLoading, authVerified])

  useEffect(() => {
    if (!authLoading && authVerified) {
      void fetchIssueRows()
    }
  }, [authLoading, authVerified, selectedCircle, rangeStartDate, rangeEndDate])

  const fetchIssueRows = async () => {
    setIsFetchingRecords(true)
    try {
      const searchParams = new URLSearchParams({
        date: effectiveSelectedDate,
        circle: selectedCircle,
        scope: effectiveScope,
      })

      if (rangeStartDate) searchParams.set("from", rangeStartDate)
      if (rangeEndDate) searchParams.set("to", rangeEndDate)

      if (effectiveScope === "today") {
        searchParams.set("from", effectiveSelectedDate)
        searchParams.set("to", effectiveSelectedDate)
      }

      const response = await fetch(`/api/student-issues?${searchParams.toString()}`, {
        cache: "no-store",
      })
      if (!response.ok) throw new Error("فشل في جلب مشاكل الطلاب")
      const data = await response.json()
      setIssueRows(Array.isArray(data.rows) ? data.rows : [])
      setCircles(Array.isArray(data.circles) ? data.circles : [])
      setDailyReportsAvailable(data.dailyReportsAvailable !== false)
    } catch (error) {
      setIssueRows([])
      console.error("[student-issues] fetch error:", error)
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "تعذر جلب مشاكل الطلاب",
        variant: "destructive",
      })
    } finally {
      setIsFetchingRecords(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`/api/site-settings?id=${STUDENT_ISSUE_NOTIFICATION_SETTING_ID}`, { cache: "no-store" })
      const data = await response.json()
      setTemplates(normalizeStudentIssueNotificationTemplates(data.value))
    } catch {
      setTemplates(DEFAULT_STUDENT_ISSUE_NOTIFICATION_TEMPLATES)
    }
  }

  const handleSaveTemplates = async () => {
    try {
      setIsSavingTemplates(true)
      const response = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: STUDENT_ISSUE_NOTIFICATION_SETTING_ID,
          value: templates,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر حفظ القوالب")
      }
      toast({ title: "تم الحفظ", description: "تم تحديث قوالب التنبيهات والإنذارات" })
      setIsTemplatesDialogOpen(false)
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "تعذر حفظ القوالب",
        variant: "destructive",
      })
    } finally {
      setIsSavingTemplates(false)
    }
  }

  const buildIssueSummary = (row: StudentIssueRow) => {
    return row.reasons.map((reason) => reason.description).join(" ")
  }

  const openActionDialog = (row: StudentIssueRow, type: IssueSeverity) => {
    const template = templates[type]
    setActionRow(row)
    setEditingActionId(null)
    setActionType(type)
    setActionDate(row.selectedDate)
    setActionMessage(
      formatStudentIssueNotificationMessage(template, {
        studentName: row.studentName,
        circleName: row.circleName,
        date: row.selectedDate,
        issueSummary: buildIssueSummary(row),
        absentCount: row.absentCount,
        excusedCount: row.excusedCount,
        effectiveAbsenceCount: row.effectiveAbsenceCount,
        missingTasks: row.missingTasks,
      }),
    )
  }

  const openEditActionDialog = (row: StudentIssueRow, action: StudentIssueRow["manualActions"][number]) => {
    setActionRow(row)
    setEditingActionId(action.id)
    setActionType(action.type)
    setActionDate(action.issueDate)
    setActionMessage(action.message)
  }

  const handleSubmitAction = async () => {
    if (!editingActionId && !actionRow?.accountNumber) {
      toast({ title: "تعذر الإرسال", description: "لا يوجد رقم حساب مرتبط بالطالب", variant: "destructive" })
      return
    }

    if (!actionMessage.trim()) {
      toast({ title: "تعذر الإرسال", description: "نص الرسالة مطلوب", variant: "destructive" })
      return
    }

    try {
      setIsSendingNotification(true)
      const response = await fetch("/api/student-issues", {
        method: editingActionId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId: editingActionId,
          accountNumber: actionRow.accountNumber,
          studentId: actionRow.studentId,
          circleName: actionRow.circleName,
          issueSummary: buildIssueSummary(actionRow),
          issueReasons: actionRow.reasons,
          message: actionMessage.trim(),
          date: actionDate || effectiveSelectedDate,
          actionType,
          sentByAccountNumber: editingActionId
            ? undefined
            : (typeof window !== "undefined"
                ? (localStorage.getItem("accountNumber") || localStorage.getItem("account_number") || "").trim()
                : ""),
          sentByRole: editingActionId
            ? undefined
            : (typeof window !== "undefined" ? (localStorage.getItem("userRole") || "").trim() : ""),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "تعذر إرسال الإشعار")
      }

      toast({
        title: editingActionId ? "تم التحديث" : data.skipped ? "تم التجاهل" : "تم الإرسال",
        description: editingActionId
          ? "تم تحديث السجل اليدوي بنجاح"
          : data.skipped
            ? "تم إرسال نفس الرسالة اليوم مسبقًا"
            : "تم إرسال الإشعار للطالب بنجاح",
      })
      await fetchIssueRows()
      setActionRow(null)
      setEditingActionId(null)
      setActionMessage("")
      setActionDate("")
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "تعذر إرسال الإشعار",
        variant: "destructive",
      })
    } finally {
      setIsSendingNotification(false)
    }
  }

  const handleDeleteAction = async (actionId: string) => {
    try {
      setIsSendingNotification(true)
      const response = await fetch("/api/student-issues", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "تعذر حذف السجل اليدوي")
      }

      toast({ title: "تم الحذف", description: "تم حذف السجل اليدوي بنجاح" })
      await fetchIssueRows()
      setDetailsRow(null)
      setDeleteActionTarget(null)
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "تعذر حذف السجل اليدوي",
        variant: "destructive",
      })
    } finally {
      setIsSendingNotification(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ffffff]">
        <SiteLoader size="lg" />
      </div>
    )
  }

  const isFuture = (() => {
    return effectiveSelectedDate > getSaudiDate()
  })()

  if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>)

  return (
    <div className="min-h-screen flex flex-col bg-[#ffffff]">
      <Header />

      <main className="flex-1 py-6 md:py-10 px-3 md:px-6">
        <div className="container mx-auto max-w-7xl space-y-6">

          <div className="animate-in fade-in slide-in-from-top-2 duration-500">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-[#1a2332] mb-1">المتابعة</h1>
              <p className="text-gray-500 text-base">عرض الطلاب الذين لديهم غياب محتسب أو نقص في التنفيذ مع إرسال تنبيه أو إنذار مباشر</p>
            </div>
          </div>

          <Card className="border border-[#3453a7]/20 shadow-sm transition-shadow duration-300 hover:shadow-md animate-in fade-in slide-in-from-top-3 duration-500">
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="order-1 flex flex-wrap items-center justify-end gap-4">
                  <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-[#d9e1f7] bg-[#f8fbff] px-3 py-3">
                    <div className="flex min-w-[220px] items-center gap-2">
                      <span className="text-sm font-semibold text-[#3453a7]">من</span>
                      <Input
                        type="date"
                        value={rangeStartDate}
                        onChange={(e) => {
                          const nextValue = e.target.value
                          setRangeStartDate(nextValue)
                          if (!rangeEndDate || rangeStartDate === rangeEndDate) {
                            setRangeEndDate(nextValue)
                          }
                        }}
                        className="text-base border-[#8fb1ff] focus-visible:ring-[#3453a7]/25 transition-all duration-200"
                      />
                    </div>
                    <div className="flex min-w-[220px] items-center gap-2">
                      <span className="text-sm font-semibold text-[#3453a7]">إلى</span>
                      <Input
                        type="date"
                        value={rangeEndDate}
                        onChange={(e) => {
                          const nextValue = e.target.value
                          setRangeEndDate(nextValue)
                          if (!rangeStartDate) {
                            setRangeStartDate(nextValue)
                          }
                        }}
                        className="text-base border-[#8fb1ff] focus-visible:ring-[#3453a7]/25 transition-all duration-200"
                      />
                    </div>
                  </div>
                  <div className="min-w-[160px]">
                    <Select value={selectedCircle} onValueChange={setSelectedCircle}>
                    <SelectTrigger className="text-base border-[#8fb1ff] focus:ring-[#3453a7]/25">
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
                </div>
                <div className="order-2 lg:mr-auto">
                  <Button onClick={() => setIsTemplatesDialogOpen(true)} className="h-11 rounded-xl bg-[#3453a7] px-6 text-white hover:bg-[#27428d]">
                    <BellRing className="h-4 w-4" />
                    قوالب التنبيه والإنذار
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#3453a7]/20 shadow-sm transition-shadow duration-300 hover:shadow-md animate-in fade-in slide-in-from-bottom-3 duration-500">
            <CardContent className="pt-4">
              <div className="overflow-x-auto rounded-lg border border-[#3453a7]/15">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#eaf1ff] border-b border-[#8fb1ff] hover:bg-[#eaf1ff]">
                      <TableHead className="text-right text-[#1a2332] font-bold text-base">الحلقة</TableHead>
                      <TableHead className="text-right text-[#1a2332] font-bold text-base">اسم الطالب</TableHead>
                      <TableHead className="text-center text-[#1a2332] font-bold text-base">السبب</TableHead>
                      <TableHead className="text-center text-[#1a2332] font-bold text-base">{getIssueCountColumnTitle(effectiveScope)}</TableHead>
                      <TableHead className="text-center text-[#1a2332] font-bold text-base">{getHistoryColumnTitle(effectiveScope)}</TableHead>
                      <TableHead className="text-center text-[#1a2332] font-bold text-base">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isFuture ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                          لا يمكن عرض مشاكل الطلاب لتاريخ مستقبلي
                        </TableCell>
                      </TableRow>
                    ) : isFetchingRecords ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12">
                          <div className="flex justify-center">
                            <SiteLoader size="md" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : issueRows.length > 0 ? issueRows.map((row, i) => (
                      <TableRow
                        key={row.studentId}
                        className="transition-colors duration-150 hover:bg-[#f7faff] border-b border-[#3453a7]/10"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <TableCell className="text-base">
                            <span className="font-medium text-[#27428d]">
                            {row.circleName}
                          </span>
                        </TableCell>
                        <TableCell className="text-base">
                            <span className="font-semibold text-[#1a2332]">
                            {row.studentName}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                            <span className="font-semibold text-[#27428d]">{getIssueReasonSummary(row)}</span>
                        </TableCell>
                        <TableCell className="text-center font-black text-[#1a2332]">{getIssueCountValue(row, effectiveScope)}</TableCell>
                        <TableCell className="text-center text-sm leading-6">
                          {getHistoryCountValue(row) > 0 ? (
                            <div className="space-y-1 text-[#4b5563]">
                              <div className="font-bold text-[#1a2332]">{row.alertCount} إنذار / {row.warningCount} تنبيه</div>
                            </div>
                          ) : (
                            <span className="text-gray-300">لا يوجد</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => setDetailsRow(row)}>
                              <Eye className="h-4 w-4" />
                              التفاصيل
                            </Button>
                            <Button size="sm" className="bg-[#3453a7] text-white hover:bg-[#27428d]" onClick={() => openActionDialog(row, "warning")}>
                              <BellRing className="h-4 w-4" />
                              تنبيه
                            </Button>
                            <Button size="sm" className="bg-red-500 text-white hover:bg-red-600" onClick={() => openActionDialog(row, "alert")}>
                              <ShieldAlert className="h-4 w-4" />
                              إنذار
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                          لا توجد مشاكل نشطة للعرض وفق الفلاتر الحالية
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

      <Dialog open={isTemplatesDialogOpen} onOpenChange={setIsTemplatesDialogOpen}>
        <DialogContent className="max-w-3xl border border-[#8fb1ff] bg-[#f8fbff]" dir="rtl" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-2xl font-black text-[#1a2332]">قوالب التنبيه والإنذار</DialogTitle>
              <div className="group relative">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#8fb1ff] bg-[#eaf1ff] text-base font-black text-[#3453a7]">
                  !
                </span>
                <div className="invisible absolute left-0 top-10 z-10 w-80 rounded-2xl border border-[#8fb1ff] bg-white p-4 text-right opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:opacity-100">
                  <p className="text-sm font-black text-[#1a2332]">المتغيرات المتاحة</p>
                  <div className="mt-3 space-y-2 text-sm text-[#4b5563]">
                    {TEMPLATE_VARIABLE_HELP_ITEMS.map((item) => (
                      <div key={item.key} className="flex items-start justify-between gap-3 rounded-xl border border-[#3453a7]/10 bg-[#f7faff] px-3 py-2">
                        <span className="font-semibold text-[#3453a7]">{item.description}</span>
                        <span className="font-mono text-[#1a2332]" dir="ltr">{item.key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="block text-right font-black text-[#1a2332]">قالب التنبيه</label>
              <Textarea
                value={templates.warning}
                onChange={(event) => setTemplates((current) => ({ ...current, warning: event.target.value }))}
                className="min-h-[120px] border-[#8fb1ff] bg-white text-right focus-visible:ring-[#3453a7]/25"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-right font-black text-[#1a2332]">قالب الإنذار</label>
              <Textarea
                value={templates.alert}
                onChange={(event) => setTemplates((current) => ({ ...current, alert: event.target.value }))}
                className="min-h-[120px] border-[#8fb1ff] bg-white text-right focus-visible:ring-[#3453a7]/25"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsTemplatesDialogOpen(false)} className="border-[#003f55]/20">إغلاق</Button>
              <Button onClick={handleSaveTemplates} disabled={isSavingTemplates} className="bg-[#3453a7] text-white hover:bg-[#27428d]">
                {isSavingTemplates ? "جاري الحفظ..." : "حفظ القوالب"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailsRow)} onOpenChange={(open) => !open && setDetailsRow(null)}>
        <DialogContent className="max-w-3xl border border-[#3453a7]/20 bg-[#fbfdff]" dir="rtl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-[#1a2332]">تفاصيل المشكلة</DialogTitle>
          </DialogHeader>
          {detailsRow ? (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-[#3453a7]/15 bg-white p-4">
                  <p className="text-sm font-bold text-[#3453a7]">{effectiveScope === "today" ? "تنبيهات اليوم" : "مجموع التنبيهات"}</p>
                  <p className="mt-2 font-black text-[#1a2332]">{detailsRow.warningCount}</p>
                </div>
                <div className="rounded-2xl border border-[#3453a7]/15 bg-white p-4">
                  <p className="text-sm font-bold text-[#3453a7]">{effectiveScope === "today" ? "إنذارات اليوم" : "مجموع الإنذارات"}</p>
                  <p className="mt-2 font-black text-[#1a2332]">{detailsRow.alertCount}</p>
                </div>
              </div>

              <div className="space-y-3 rounded-3xl border border-[#3453a7]/15 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black text-[#1a2332]">{getHistoryColumnTitle(effectiveScope)}</h3>
                </div>
                {detailsRow.manualActions.length > 0 ? (
                  <div className="space-y-3">
                    {detailsRow.manualActions.map((action) => (
                      <div key={action.id} className="rounded-2xl border border-[#3453a7]/10 bg-[#f8fbff] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <SeverityBadge severity={action.type} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditActionDialog(detailsRow, action)}>
                              <Pencil className="h-4 w-4" />
                              تعديل
                            </Button>
                            <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeleteActionTarget({ actionId: action.id, studentName: detailsRow.studentName, type: action.type })}>
                              <Trash2 className="h-4 w-4" />
                              حذف
                            </Button>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-[#4b5563]">{action.message}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#6b7280]">
                          <span>أُرسل: {formatActionDate(action.sentAt)}</span>
                          {action.sentByRole ? <span>بواسطة: {action.sentByRole}</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#3453a7]/20 bg-[#f8fbff] px-4 py-8 text-center text-sm text-[#6b7280]">
                    لا توجد سجلات يدوية ضمن النطاق الحالي.
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-3xl border border-[#3453a7]/15 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black text-[#1a2332]">الأسباب الحالية</h3>
                  <SeverityBadge severity={detailsRow.recommendedAction} />
                </div>
                <div className="space-y-3">
                  {detailsRow.reasons.map((reason) => (
                    <div key={`${detailsRow.studentId}-${reason.code}`} className="rounded-2xl border border-[#3453a7]/10 bg-[#f8fbff] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <CategoryBadge category={reason.category} />
                          <SeverityBadge severity={reason.severity} />
                        </div>
                        <p className="font-black text-[#1a2332]">{reason.title}</p>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-[#4b5563]">{reason.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {(detailsRow.attendanceNotes || detailsRow.dailyReportNotes) ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#3453a7]/15 bg-white p-4">
                    <p className="text-sm font-bold text-[#3453a7]">ملاحظات الحضور</p>
                    <p className="mt-2 text-sm leading-7 text-[#4b5563]">{detailsRow.attendanceNotes || "—"}</p>
                  </div>
                  <div className="rounded-2xl border border-[#3453a7]/15 bg-white p-4">
                    <p className="text-sm font-bold text-[#3453a7]">ملاحظات التنفيذ</p>
                    <p className="mt-2 text-sm leading-7 text-[#4b5563]">{detailsRow.dailyReportNotes || "—"}</p>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDetailsRow(null)} className="border-[#003f55]/20">إغلاق</Button>
                <Button className="bg-[#3453a7] text-white hover:bg-[#27428d]" onClick={() => openActionDialog(detailsRow, "warning")}>
                  <BellRing className="h-4 w-4" />
                  إرسال تنبيه
                </Button>
                <Button className="bg-red-500 text-white hover:bg-red-600" onClick={() => openActionDialog(detailsRow, "alert")}>
                  <ShieldAlert className="h-4 w-4" />
                  إرسال إنذار
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(actionRow)} onOpenChange={(open) => !open && setActionRow(null)}>
        <DialogContent className="max-w-2xl overflow-hidden border border-[#d9e1f7] bg-white p-0 shadow-[0_28px_70px_-40px_rgba(52,83,167,0.45)]" dir="rtl" showCloseButton={false}>
          <DialogHeader className="border-b border-[#d9e1f7] bg-[linear-gradient(135deg,#f7faff_0%,#eef4ff_55%,#ffffff_100%)] px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-2xl font-black text-[#1a2332]">
              {editingActionId ? (actionType === "alert" ? "تعديل الإنذار" : "تعديل التنبيه") : actionType === "alert" ? "إرسال إنذار" : "إرسال تنبيه"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-[#5f6b7a]">
                  راجع النص ثم أرسل الإشعار مباشرة للطالب.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {actionRow ? (
            <div className="space-y-5 px-6 py-6">
              <div className="rounded-[24px] border border-[#d9e1f7] bg-[linear-gradient(135deg,#fbfdff_0%,#f4f8ff_100%)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-[#1a2332]">{actionRow.studentName}</p>
                    <p className="mt-1 text-sm font-semibold text-[#3453a7]">{actionRow.circleName}</p>
                  </div>
                  <SeverityBadge severity={actionType} />
                </div>
              </div>
              {!actionRow.accountNumber ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  لا يمكن الإرسال لأن الطالب لا يملك رقم حساب مرتبطًا.
                </div>
              ) : null}
              <div className="space-y-3">
                <label className="block text-right font-bold text-[#1a2332]">نص الرسالة</label>
                <Textarea
                  value={actionMessage}
                  onChange={(event) => setActionMessage(event.target.value)}
                  className="min-h-[180px] rounded-[22px] border-[#cfdcff] bg-[#fcfdff] px-4 py-3 text-right leading-8 focus-visible:ring-[#3453a7]/25"
                />
              </div>
              <div className="flex justify-end gap-3 border-t border-[#e9eefb] pt-4">
                <Button variant="outline" onClick={() => { setActionRow(null); setEditingActionId(null) }} className="rounded-xl border-[#d5deef] bg-white px-5 text-[#4b5563] hover:bg-[#f8fbff]">إلغاء</Button>
                <Button onClick={handleSubmitAction} disabled={isSendingNotification || (!editingActionId && !actionRow.accountNumber)} className={actionType === "alert" ? "bg-red-500 text-white hover:bg-red-600" : "bg-[#3453a7] text-white hover:bg-[#27428d]"}>
                  {isSendingNotification ? (editingActionId ? "جاري التحديث..." : "جاري الإرسال...") : editingActionId ? "حفظ التعديل" : actionType === "alert" ? "إرسال الإنذار" : "إرسال التنبيه"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteActionTarget)} onOpenChange={(open) => !open && setDeleteActionTarget(null)}>
        <DialogContent className="max-w-md overflow-hidden border border-[#d9e1f7] bg-white p-0 shadow-[0_28px_70px_-40px_rgba(52,83,167,0.45)]" dir="rtl" showCloseButton={false}>
          <DialogHeader className="border-b border-[#f3d4d4] bg-[linear-gradient(135deg,#fff8f8_0%,#fff1f1_100%)] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-xl font-black text-[#1a2332]">حذف السجل</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-[#6b7280]">
                  سيتم حذف السجل اليدوي والإشعار المرتبط به نهائيًا.
                </DialogDescription>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>
            </div>
          </DialogHeader>
          {deleteActionTarget ? (
            <div className="space-y-5 px-5 py-5">
              <div className="rounded-[20px] border border-[#f3d4d4] bg-[#fffafa] p-4 text-sm leading-7 text-[#4b5563]">
                سيتم حذف {deleteActionTarget.type === "alert" ? "الإنذار" : "التنبيه"} الخاص بالطالب {deleteActionTarget.studentName}.
              </div>
              <div className="flex justify-end gap-3 border-t border-[#f0f2f7] pt-4">
                <Button variant="outline" onClick={() => setDeleteActionTarget(null)} className="rounded-xl border-[#d5deef] bg-white px-5 text-[#4b5563] hover:bg-[#f8fbff]">إلغاء الأمر</Button>
                <Button className="rounded-xl bg-red-500 px-5 text-white hover:bg-red-600" disabled={isSendingNotification} onClick={() => void handleDeleteAction(deleteActionTarget.actionId)}>
                  {isSendingNotification ? "جاري الحذف..." : "حذف السجل"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

