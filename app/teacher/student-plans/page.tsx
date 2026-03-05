"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { BookMarked, ArrowRight, Plus, Trash2, Target, Users, ChevronDown, Check } from "lucide-react"
import { SURAHS, calculateTotalPages, calculateTotalDays } from "@/lib/quran-data"

interface Student {
  id: string
  name: string
  halaqah: string
  account_number: number
}

interface StudentPlan {
  id: string
  student_id: string
  start_surah_number: number
  start_surah_name: string
  end_surah_number: number
  end_surah_name: string
  daily_pages: number
  total_pages: number
  total_days: number
  start_date: string
  direction?: string
}

const DAILY_OPTIONS = [
  { value: "0.3333", label: "ثلث وجه (5 أسطر)" },
  { value: "0.5", label: "نصف وجه" },
  { value: "1", label: "وجه واحد" },
  { value: "2", label: "وجهان" },
]

function dailyLabel(v: number) {
  if (v <= 0.334 && v >= 0.332) return "ثلث وجه"
  if (v === 0.5) return "نصف وجه"
  if (v === 1) return "وجه واحد"
  if (v === 2) return "وجهان"
  return `${v} وجه`
}

export default function TeacherStudentPlansPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [halaqah, setHalaqah] = useState<string | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [studentPlans, setStudentPlans] = useState<Record<string, StudentPlan | null>>({})
  const [studentProgress, setStudentProgress] = useState<Record<string, number>>({})

  // نافذة إضافة/تعديل الخطة
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [startSurah, setStartSurah] = useState<string>("")
  const [endSurah, setEndSurah] = useState<string>("")
  const [dailyPages, setDailyPages] = useState<string>("1")
  const [direction, setDirection] = useState<"asc" | "desc">("asc")
  const [customDays, setCustomDays] = useState<string>("")
  const [startOpen, setStartOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const init = async () => {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true"
      const role = localStorage.getItem("userRole")
      const accNum = localStorage.getItem("accountNumber")

      if (!loggedIn || role !== "teacher" || !accNum) {
        router.push("/login"); return
      }

      try {
        const res = await fetch(`/api/teachers?account_number=${accNum}`)
        const data = await res.json()
        const teacher = data.teachers?.[0]
        if (!teacher) { router.push("/login"); return }

        const teacherHalaqah = (teacher.halaqah || teacher.circle_name || "").trim()
        setHalaqah(teacherHalaqah)

        const studRes = await fetch(`/api/students?circle=${encodeURIComponent(teacherHalaqah)}`)
        const studData = await studRes.json()
        const circleStudents: Student[] = studData.students || []
        setStudents(circleStudents)
        await fetchPlansForStudents(circleStudents)
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [router])

  const fetchPlansForStudents = async (studs: Student[]) => {
    const plans: Record<string, StudentPlan | null> = {}
    const progress: Record<string, number> = {}
    await Promise.all(
      studs.map(async (s) => {
        try {
          const r = await fetch(`/api/student-plans?student_id=${s.id}`)
          const d = await r.json()
          plans[s.id] = d.plan || null
          progress[s.id] = d.progressPercent || 0
        } catch {
          plans[s.id] = null
          progress[s.id] = 0
        }
      })
    )
    setStudentPlans(plans)
    setStudentProgress(progress)
  }

  const openAddDialog = (student: Student) => {
    setSelectedStudent(student)
    const existing = studentPlans[student.id]
    if (existing) {
      setStartSurah(String(existing.start_surah_number))
      setEndSurah(String(existing.end_surah_number))
      setDailyPages(String(existing.daily_pages))
      setDirection((existing.direction as "asc" | "desc") || "asc")
      setCustomDays(String(existing.total_days))
    } else {
      setStartSurah("")
      setEndSurah("")
      setDailyPages("1")
      setDirection("asc")
      setCustomDays("")
    }
    setSaveMsg(null)
    setStartOpen(false)
    setEndOpen(false)
    setAddDialogOpen(true)
  }

  const handleSavePlan = async () => {
    if (!selectedStudent || !startSurah || !endSurah || !dailyPages) {
      setSaveMsg({ type: "error", text: "يرجى تعبئة جميع الحقول" }); return
    }
    const startNum = parseInt(startSurah)
    const endNum = parseInt(endSurah)
    const startSurahData = SURAHS.find((s) => s.number === startNum)!
    const endSurahData = SURAHS.find((s) => s.number === endNum)!
    const total = calculateTotalPages(startNum, endNum)
    const days = calculateTotalDays(total, parseFloat(dailyPages))
    const effectiveDays = customDays && parseInt(customDays) > 0 ? parseInt(customDays) : days

    setIsSaving(true)
    try {
      const res = await fetch("/api/student-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          start_surah_number: startNum,
          start_surah_name: startSurahData.name,
          end_surah_number: endNum,
          end_surah_name: endSurahData.name,
          daily_pages: parseFloat(dailyPages),
          total_days: effectiveDays,
          direction,
          start_date: new Date().toISOString().split("T")[0],
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSaveMsg({ type: "success", text: `✓ تم حفظ الخطة — ${total} وجه خلال ${effectiveDays} يوم` })
        setStudentPlans((prev) => ({ ...prev, [selectedStudent.id]: data.plan }))
        setStudentProgress((prev) => ({ ...prev, [selectedStudent.id]: 0 }))
        setTimeout(() => setAddDialogOpen(false), 1500)
      } else {
        setSaveMsg({ type: "error", text: data.error || "فشل في حفظ الخطة" })
      }
    } catch {
      setSaveMsg({ type: "error", text: "حدث خطأ، يرجى المحاولة مجدداً" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeletePlan = async (studentId: string) => {
    if (!confirm("هل أنت متأكد من حذف خطة هذا الطالب؟")) return
    try {
      await fetch(`/api/student-plans?student_id=${studentId}`, { method: "DELETE" })
      setStudentPlans((prev) => ({ ...prev, [studentId]: null }))
      setStudentProgress((prev) => ({ ...prev, [studentId]: 0 }))
    } catch (e) {
      console.error(e)
    }
  }

  // حسابات السور
  const surahsDescending = [...SURAHS].reverse()
  const startNum = startSurah ? parseInt(startSurah) : null
  const endSurahOptions = (() => {
    if (!startNum) return direction === "asc" ? surahsDescending : SURAHS
    if (direction === "asc") return surahsDescending.filter((s) => s.number > startNum)
    return SURAHS.filter((s) => s.number < startNum)
  })()
  const endNum = endSurah ? parseInt(endSurah) : null
  const isEndValid = endNum !== null && endSurahOptions.some((s) => s.number === endNum)
  const previewTotal = startSurah && endSurah && isEndValid
    ? calculateTotalPages(parseInt(startSurah), parseInt(endSurah)) : 0
  const previewDays = previewTotal > 0 && dailyPages
    ? calculateTotalDays(previewTotal, parseFloat(dailyPages)) : 0

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]">
      <Header />
      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-3xl space-y-6">

          {/* رأس الصفحة */}
          <div className="border-b border-[#D4AF37]/40 pb-5 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-[#D4AF37]/10 transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-[#D4AF37]" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
              <BookMarked className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1a2332]">خطط الطلاب</h1>
              {halaqah && <p className="text-sm text-neutral-400 mt-0.5">حلقة {halaqah}</p>}
            </div>
            <div className="mr-auto flex items-center gap-2 text-sm text-neutral-400">
              <Users className="w-4 h-4" />
              <span>{students.length} طالب</span>
            </div>
          </div>

          {/* قائمة الطلاب */}
          {students.length === 0 ? (
            <div className="text-center py-16 text-neutral-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا يوجد طلاب في حلقتك</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#D4AF37]/40 shadow-sm overflow-hidden">
              <div className="divide-y divide-[#D4AF37]/15">
                {students.map((student) => {
                  const plan = studentPlans[student.id]
                  const progress = studentProgress[student.id] || 0
                  return (
                    <div key={student.id} className="px-6 py-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-[#1a2332] text-sm">{student.name}</p>
                          {plan && (
                            <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0">
                              لديه خطة
                            </Badge>
                          )}
                        </div>
                        {plan ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold bg-[#D4AF37]/10 text-[#C9A961] border border-[#D4AF37]/30 rounded-md px-1.5 py-0.5 shrink-0">
                                {dailyLabel(plan.daily_pages)}
                              </span>
                              <p className="text-xs text-neutral-500 truncate">
                                {plan.start_surah_name} ← {plan.end_surah_name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${progress}%`,
                                    background: "linear-gradient(to right, #D4AF37, #C9A961)",
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-[#D4AF37] w-8 text-left">{progress}%</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-400">لا توجد خطة</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {plan && (
                          <button
                            onClick={() => handleDeletePlan(student.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-colors"
                            title="حذف الخطة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openAddDialog(student)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#C9A961] border border-[#D4AF37]/30 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {plan ? "تعديل الخطة" : "إضافة خطة"}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* نافذة إضافة/تعديل الخطة */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-0 overflow-hidden [&>button]:top-4 [&>button]:right-4 [&>button]:left-auto" dir="rtl">
          <DialogHeader className="px-6 py-5 border-b border-[#D4AF37]/30 bg-gradient-to-r from-[#D4AF37]/8 to-transparent">
            <DialogTitle className="text-lg font-bold text-[#1a2332] flex items-center gap-2 pr-8">
              <Target className="w-5 h-5 text-[#D4AF37]" />
              {selectedStudent && studentPlans[selectedStudent.id] ? "تعديل خطة" : "إضافة خطة حفظ"}
              {selectedStudent ? ` — ${selectedStudent.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
            {/* اتجاه الخطة */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1a2332]">اتجاه الحفظ</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button"
                  onClick={() => { setDirection("asc"); setStartSurah(""); setEndSurah("") }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${direction === "asc" ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#C9A961]" : "border-neutral-200 text-neutral-400 hover:border-[#D4AF37]/50"}`}
                >
                  <span>↑</span> تصاعدي
                </button>
                <button type="button"
                  onClick={() => { setDirection("desc"); setStartSurah(""); setEndSurah("") }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${direction === "desc" ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#C9A961]" : "border-neutral-200 text-neutral-400 hover:border-[#D4AF37]/50"}`}
                >
                  <span>↓</span> تنازلي
                </button>
              </div>
              <p className="text-[11px] text-neutral-400">
                {direction === "asc" ? "الحفظ يبدأ من البقرة ← الناس" : "الحفظ يبدأ من الناس ← البقرة"}
              </p>
            </div>

            {/* بداية ونهاية الخطة — جنب بعض */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">بداية الخطة</label>
                <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center justify-between px-3 h-10 rounded-xl border border-[#D4AF37]/40 text-sm bg-white text-right hover:border-[#D4AF37] transition-colors">
                      <span className={startSurah ? "text-[#1a2332] font-medium" : "text-neutral-400"}>
                        {startSurah ? SURAHS.find(s => s.number === parseInt(startSurah))?.name : "اختر السورة"}
                      </span>
                      <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-0" align="start" dir="rtl">
                    <Command className="overflow-visible">
                      <CommandInput placeholder="ابحث عن سورة..." className="text-sm h-9" />
                      <CommandEmpty>لا توجد نتائج</CommandEmpty>
                      <CommandList className="max-h-52 overflow-y-auto surah-scroll" onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }}>
                        {(direction === "asc" ? SURAHS : surahsDescending).map((s) => (
                          <CommandItem
                            key={s.number}
                            value={s.name}
                            onSelect={() => { setStartSurah(String(s.number)); setEndSurah(""); setStartOpen(false) }}
                            className="flex items-center justify-between"
                          >
                            {s.name}
                            {startSurah === String(s.number) && <Check className="w-3.5 h-3.5 text-[#D4AF37]" />}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">نهاية الخطة</label>
                <Popover open={endOpen} onOpenChange={setEndOpen}>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center justify-between px-3 h-10 rounded-xl border border-[#D4AF37]/40 text-sm bg-white text-right hover:border-[#D4AF37] transition-colors">
                      <span className={isEndValid ? "text-[#1a2332] font-medium" : "text-neutral-400"}>
                        {isEndValid ? SURAHS.find(s => s.number === parseInt(endSurah))?.name : "اختر السورة"}
                      </span>
                      <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-0" align="start" dir="rtl">
                    <Command className="overflow-visible">
                      <CommandInput placeholder="ابحث عن سورة..." className="text-sm h-9" />
                      <CommandEmpty>لا توجد نتائج</CommandEmpty>
                      <CommandList className="max-h-52 overflow-y-auto surah-scroll" onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }}>
                        {endSurahOptions.map((s) => (
                          <CommandItem
                            key={s.number}
                            value={s.name}
                            onSelect={() => { setEndSurah(String(s.number)); setEndOpen(false) }}
                            className="flex items-center justify-between"
                          >
                            {s.name}
                            {endSurah === String(s.number) && <Check className="w-3.5 h-3.5 text-[#D4AF37]" />}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {startSurah && endSurahOptions.length === 0 && (
                  <p className="text-[11px] text-red-400">لا توجد سور صالحة</p>
                )}
              </div>
            </div>

            {/* المقدار اليومي وعدد الأيام — جنب بعض */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">المقدار اليومي</label>
                <Select value={dailyPages} onValueChange={setDailyPages}>
                  <SelectTrigger className="border-[#D4AF37]/40 focus:border-[#D4AF37] rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAILY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">عدد الأيام</label>
                <input
                  type="number" min={1} value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  placeholder={previewDays > 0 ? String(previewDays) : "تلقائي"}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D4AF37]/40 focus:border-[#D4AF37] focus:outline-none text-sm text-[#1a2332] placeholder-neutral-400 bg-white"
                  dir="ltr"
                />
              </div>
            </div>

            {/* معاينة الخطة */}
            {previewTotal > 0 && startSurah !== endSurah && (() => {
              const sN = parseInt(startSurah), eN = parseInt(endSurah)
              const previewStart = direction === "asc"
                ? SURAHS.find((s) => s.number === Math.min(sN, eN))
                : SURAHS.find((s) => s.number === Math.max(sN, eN))
              const previewEnd = direction === "asc"
                ? SURAHS.find((s) => s.number === Math.max(sN, eN))
                : SURAHS.find((s) => s.number === Math.min(sN, eN))
              return (
                <div className="rounded-xl bg-[#D4AF37]/8 border border-[#D4AF37]/30 p-4 space-y-3">
                  <p className="text-xs font-bold text-[#D4AF37]">معاينة الخطة</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg font-semibold text-xs">تبدأ من</span>
                    <span className="font-bold text-[#1a2332]">{previewStart?.name}</span>
                    <span className="text-neutral-300">←</span>
                    <span className="text-neutral-500 text-xs">{previewEnd?.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-black text-[#1a2332]">{previewTotal}</p>
                      <p className="text-[11px] text-neutral-400">وجهاً إجمالاً</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-[#1a2332]">
                        {customDays && parseInt(customDays) > 0 ? parseInt(customDays) : previewDays}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        يوماً
                        {customDays && parseInt(customDays) > 0 && parseInt(customDays) !== previewDays && (
                          <span className="text-[#D4AF37] mr-1">(مخصص)</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {saveMsg && (
              <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
                saveMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {saveMsg.text}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-[#D4AF37]/25 flex gap-3">
            <Button
              variant="outline"
              onClick={handleSavePlan}
              disabled={isSaving || !startSurah || !endSurah}
              className="flex-1 border-[#D4AF37]/40 text-neutral-600 rounded-xl h-10"
            >
              {isSaving ? "جاري الحفظ..." : "حفظ الخطة"}
            </Button>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}
              className="border-[#D4AF37]/40 text-neutral-600 rounded-xl h-10">
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
