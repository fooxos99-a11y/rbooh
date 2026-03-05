"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Trophy, Award, Calendar, Star, BarChart3, Medal, Gem, Flame, Zap, Crown, Heart, BookMarked, CheckCircle2, Clock } from "lucide-react"
import { getSessionContent, SURAHS } from "@/lib/quran-data"
import { Button } from "@/components/ui/button"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { EffectSelector } from "@/components/effect-selector"
import { BadgeSelector } from "@/components/badge-selector"
import { FontSelector } from "@/components/font-selector"

interface StudentData {
  id: string
  name: string
  halaqah: string
  account_number: number
  id_number: string | null
  guardian_phone: string | null
  points: number
  rank: number | null
  created_at: string
}

interface AttendanceRecord {
  id: string
  date: string
  status: string
  hafiz_level: string | null
  tikrar_level: string | null
  samaa_level: string | null
  rabet_level: string | null
}

interface StudentAchievement {
  id: string
  title: string
  icon_type: string
  date: string
}

interface RankingData {
  globalRank: number
  circleRank: number
  circleSize: number
  circleName: string
  points: number
}

function ProfilePage() {
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  // تحديث السجلات يدويًا
  const handleRefreshRecords = () => {
    if (studentData?.id) {
      fetchAttendanceRecords(studentData.id)
    }
  }

  // تحديث تلقائي عند العودة للصفحة
  useEffect(() => {
    const handleFocus = () => {
      if (studentData?.id) fetchAttendanceRecords(studentData.id)
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [studentData?.id])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams?.get("tab") || "profile")
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [rankingData, setRankingData] = useState<RankingData | null>(null)
  const [planData, setPlanData] = useState<any>(null)
  const [planCompletedDays, setPlanCompletedDays] = useState(0)
  const [planProgress, setPlanProgress] = useState(0)
  const [planAttendance, setPlanAttendance] = useState<any[]>([])
  const [isLoadingPlan, setIsLoadingPlan] = useState(false)
  const [achievements, setAchievements] = useState<StudentAchievement[]>([])
  const confirmDialog = useConfirmDialog()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [themeUpdateTrigger, setThemeUpdateTrigger] = useState(0)

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    if (!loggedIn || userRole !== "student") {
      router.push("/login")
    } else {
      fetchStudentData()
    }
  }, [])

  useEffect(() => {
    const handleThemeChanged = () => {
      console.log("[v0] Theme changed event received, updating card preview")
      setThemeUpdateTrigger((prev) => prev + 1)
    }

    window.addEventListener("themeChanged", handleThemeChanged as EventListener)

    return () => {
      window.removeEventListener("themeChanged", handleThemeChanged as EventListener)
    }
  }, [])

  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      const tab = event.detail.tab
      if (tab) {
        setActiveTab(tab)
      }
    }

    window.addEventListener("tabChange", handleTabChange as EventListener)
    return () => {
      window.removeEventListener("tabChange", handleTabChange as EventListener)
    }
  }, [])

  useEffect(() => {
    const tab = searchParams?.get("tab")
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const fetchStudentData = async () => {
    try {
      const accountNumber = localStorage.getItem("accountNumber")
      if (!accountNumber) { router.push("/login"); return }
      console.log("[v0] Fetching student data for account:", accountNumber)

      const response = await fetch(`/api/students?account_number=${accountNumber}`, { cache: "no-store" })
      const data = await response.json()

      const student = (data.students || [])[0]

      if (student) {
        setStudentData(student)
        fetchRankingData(student.id)
        fetchAttendanceRecords(student.id)
        fetchAchievements(student.id)
        fetchPlanData(student.id)
      }
      setIsLoading(false)
    } catch (error) {
      console.error("[v0] Error fetching student data:", error)
      setIsLoading(false)
    }
  }

  const fetchRankingData = async (studentId: string) => {
    try {
      const response = await fetch(`/api/student-ranking?student_id=${studentId}`)
      const data = await response.json()

      if (data.success && data.ranking) {
        setRankingData(data.ranking)
        console.log("[v0] Ranking data fetched:", data.ranking)
      }
    } catch (error) {
      console.error("[v0] Error fetching ranking data:", error)
    }
  }

  const fetchAchievements = async (studentId: string) => {
    try {
      const res = await fetch(`/api/achievements?student_id=${studentId}`)
      if (res.ok) {
        const data = await res.json()
        setAchievements(data.achievements || [])
      }
    } catch (e) {
      console.error("[profile] Error fetching achievements:", e)
    }
  }

  const renderAchievementIcon = (type: string, cls = "w-5 h-5") => {
    const color = "text-[#d8a355]"
    switch (type) {
      case "medal":  return <Medal  className={`${cls} ${color}`} />
      case "gem":    return <Gem    className={`${cls} ${color}`} />
      case "star":   return <Star   className={`${cls} ${color} fill-[#d8a355]/40`} />
      case "flame":  return <Flame  className={`${cls} ${color}`} />
      case "zap":    return <Zap    className={`${cls} ${color}`} />
      case "crown":  return <Crown      className={`${cls} ${color}`} />
      case "heart":  return <Heart      className={`${cls} ${color}`} />
      case "book":   return <BookMarked className={`${cls} ${color}`} />
      default:       return <Trophy className={`${cls} ${color}`} />
    }
  }

  const fetchPlanData = async (studentId: string) => {
    setIsLoadingPlan(true)
    try {
      const res = await fetch(`/api/student-plans?student_id=${studentId}`, { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      console.log("[profile] plan data:", data)
      setPlanData(data.plan ?? null)
      setPlanCompletedDays(data.completedDays ?? 0)
      setPlanProgress(data.progressPercent ?? 0)
      setPlanAttendance(data.completedRecords ?? [])

      // منح إنجاز تلقائي عند اكتمال الخطة 100%
      if ((data.progressPercent ?? 0) >= 100 && data.plan) {
        const plan = data.plan
        const descKey = `plan_${plan.id}`
        const achRes = await fetch(`/api/achievements?student_id=${studentId}`)
        if (achRes.ok) {
          const achData = await achRes.json()
          const existing = (achData.achievements || []).find((a: any) => a.description === descKey)
          if (!existing) {
            await fetch("/api/achievements", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                student_id: studentId,
                title: `إنجاز خطة (${plan.start_surah_name} إلى ${plan.end_surah_name})`,
                category: "خطة حفظ",
                date: new Date().toISOString().split("T")[0],
                description: descKey,
                status: "مكتمل",
                level: "ممتاز",
                icon_type: "book",
                achievement_type: "personal",
              }),
            })
            // تحديث قائمة الإنجازات بعد الإضافة
            fetchAchievements(studentId)
          } else {
            setAchievements(achData.achievements || [])
          }
        }
      }
    } catch (e) {
      console.error("[profile] Error fetching plan:", e)
      setPlanData(null)
    } finally {
      setIsLoadingPlan(false)
    }
  }

  const fetchAttendanceRecords = async (studentId: string) => {
    setIsLoadingRecords(true)
    try {
      const response = await fetch(`/api/attendance?student_id=${studentId}`)
      const data = await response.json()

      if (data.records) {
        setAttendanceRecords(data.records)
      }
    } catch (error) {
      console.error("[v0] Error fetching attendance records:", error)
    } finally {
      setIsLoadingRecords(false)
    }
  }

  const handleLogout = async () => {
    const confirmed = await confirmDialog({
      title: "تأكيد تسجيل الخروج",
      description: "هل أنت متأكد من أنك تريد تسجيل الخروج؟",
      confirmText: "نعم، تسجيل الخروج",
      cancelText: "إلغاء",
    })

    if (confirmed) {
      setIsLoggingOut(true)

      await new Promise((resolve) => setTimeout(resolve, 1000))

      localStorage.clear()
      router.push("/login")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-[#1a2332]">جاري التحميل...</div>
      </div>
    )
  }

  if (!studentData) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-2xl text-[#1a2332]">لم يتم العثور على بيانات الطالب.</div>
        </main>
        <Footer />
      </div>
    )
  }

  function getEvaluationText(level: string | null) {
    switch (level) {
      case null:
      case "not_completed":
        return "لم يكمل"
      case "excellent":
        return "ممتاز"
      case "good":
        return "جيد"
      case "average":
        return "متوسط"
      case "weak":
        return "ضعيف"
      default:
        return level
    }
  }

  return (
    <>
      {isLoggingOut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-[#d8a355]/20 border-t-[#d8a355] rounded-full animate-spin" />
            <p className="text-xl font-bold text-[#d8a355]">جاري تسجيل الخروج...</p>
          </div>
        </div>
      )}

      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
        <Header />

        <main className="flex-1 py-6 md:py-12 px-3 md:px-4">
          <div className="container mx-auto max-w-6xl">
            {/* بطاقة ملف الطالب */}
            <div className="w-full rounded-2xl overflow-hidden mb-3 md:mb-4 shadow-lg bg-white">

              {/* رأس البطاقة */}
              <div className="px-0 pt-0 pb-0 bg-white">
                {/* تم حذف المستطيل العلوي نهائياً ليبدأ المكون مباشرة بمربعات الإحصاءات */}
              </div>

              {/* فاصل */}
              <div className="h-px bg-[#d8a355]/15" />

              {/* بطاقات الإحصاءات */}
              <div className="grid grid-cols-3 divide-x divide-x-reverse divide-[#d8a355]/12">
                {[
                  { icon: <Trophy className="w-4 h-4 text-[#d8a355]" />,                       label: "المركز العام", value: rankingData?.globalRank || "-", sub: "بين جميع الطلاب"          },
                  { icon: <Award  className="w-4 h-4 text-[#d8a355]" />,                       label: "الحلقة",       value: rankingData?.circleRank  || "-", sub: rankingData?.circleName || "—" },
                  { icon: <Star   className="w-4 h-4 text-[#d8a355] fill-[#d8a355]" />,        label: "النقاط",       value: studentData.points,               sub: "نقطة"                        },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center justify-center py-4 px-2 gap-1 bg-white border-2 border-[#d8a355]/40 rounded-xl shadow-sm">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-1" style={{ background: "rgba(216,163,85,0.08)" }}>
                      {stat.icon}
                    </div>
                    <div className="text-xl md:text-2xl font-black text-[#1a2332]">{stat.value}</div>
                    <div className="text-[9px] font-bold text-[#1a2332]/45 text-center">{stat.label}</div>
                    <div className="text-[8px] text-[#1a2332]/30 truncate max-w-full text-center">{stat.sub}</div>
                  </div>
                ))}
              </div>

              {/* فاصل */}
              <div className="h-px bg-[#d8a355]/15" />

              {/* شريط خطة الحفظ */}
              <div className="px-5 py-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <BookMarked className="w-3.5 h-3.5 text-[#d8a355] flex-shrink-0" />
                    <span className="text-[11px] font-bold text-[#1a2332]/65">خطة الحفظ</span>
                    {planData && (
                      <span className="text-[9px] text-[#1a2332]/35 truncate">{planData?.start_surah_name} ← {planData?.end_surah_name}</span>
                    )}
                  </div>
                  <span className="text-xs font-black text-[#d8a355] flex-shrink-0 mr-2">{planData ? `${planProgress}%` : "0%"}</span>
                </div>
                <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(26,35,50,0.07)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                    style={{
                      width: `${planData ? planProgress : 0}%`,
                      background: "linear-gradient(90deg, #b8860b 0%, #d8a355 50%, #f0d060 100%)",
                    }}
                  >
                    <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)", animation: "shimmer 2s infinite" }} />
                  </div>
                  {[25, 50, 75].map((t) => (
                    <div key={t} className="absolute top-0 bottom-0 w-px bg-[#1a2332]/10" style={{ left: `${t}%` }} />
                  ))}
                </div>
                <div className="flex justify-between mt-1.5">
                  {[0, 25, 50, 75, 100].map((lvl) => (
                    <div key={lvl} className={`w-1.5 h-1.5 rounded-full transition-all ${(planData ? planProgress : 0) >= lvl ? "bg-[#d8a355] shadow-[0_0_4px_rgba(216,163,85,0.6)]" : "bg-[#1a2332]/12"}`} />
                  ))}
                </div>
                <p className="text-[9px] text-[#1a2332]/30 mt-1 text-left">
                  {planData && planCompletedDays > 0 ? `${planCompletedDays} يوم مكتمل` : null}
                </p>
              </div>
            </div>

            {/* قسم البيانات - موحد */}
            <div className="w-full bg-white rounded-xl shadow-md border border-[#d8a355]/20 overflow-hidden mb-3 md:mb-6">
              <div className="px-4 py-2 border-b border-[#d8a355]/20 bg-gradient-to-r from-[#d8a355]/10 to-transparent">
                <span className="text-sm font-bold text-[#1a2332]">البيانات</span>
              </div>
              <div className="grid grid-cols-4 divide-x divide-x-reverse divide-[#d8a355]/15 border-b border-[#d8a355]/15">
                  {[
                    { value: "profile",      icon: <User       className="w-5 h-5" />, label: "الملف"      },
                    { value: "achievements", icon: <Award      className="w-5 h-5" />, label: "الإنجازات"  },
                    { value: "records",      icon: <BarChart3  className="w-5 h-5" />, label: "السجلات"    },
                    { value: "plan",         icon: <BookMarked className="w-5 h-5" />, label: "الخطة"      },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setActiveTab(item.value)}
                      className={`flex flex-col items-center justify-center gap-1 py-3 text-xs font-bold transition-colors ${
                        activeTab === item.value
                          ? "text-[#d8a355] bg-[#d8a355]/8"
                          : "text-[#1a2332]/50 hover:text-[#d8a355] hover:bg-[#d8a355]/5"
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

              <TabsContent value="profile" className="space-y-4 md:space-y-6">
                <Card className="rounded-none border-0 shadow-none">
                  <CardHeader className="bg-white p-4 md:p-6">
                    <CardTitle className="text-xl md:text-2xl text-[#1a2332]">البيانات الشخصية</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2 md:pt-3 space-y-4 md:space-y-6">
                    {/* بيانات الطالب */}
                    <div className="grid grid-cols-2 gap-3 pb-4 md:pb-6 border-b-2 border-[#d8a355]/20">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1a2332]/60">رقم الحساب</label>
                        <div className="p-3 bg-white rounded-xl text-base font-extrabold text-[#1a2332] tracking-wide border border-[#d8a355]/20">
                          {studentData.account_number}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1a2332]/60">الاسم الكامل</label>
                        <div className="p-3 bg-white rounded-xl text-base font-extrabold text-[#1a2332] tracking-wide border border-[#d8a355]/20">
                          {studentData.name}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1a2332]/60">الحلقة</label>
                        <div className="p-3 bg-white rounded-xl text-base font-extrabold text-[#1a2332] tracking-wide border border-[#d8a355]/20">
                          {studentData.halaqah || "—"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[#1a2332]/60">رقم الهوية</label>
                        <div className="p-3 bg-white rounded-xl text-base font-extrabold text-[#1a2332] tracking-wide border border-[#d8a355]/20">
                          {studentData.id_number || "غير محدد"}
                        </div>
                      </div>
                      {studentData.guardian_phone && (
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs font-semibold text-[#1a2332]/60">رقم جوال ولي الأمر</label>
                          <div className="p-3 bg-white rounded-xl text-base font-extrabold text-[#1a2332] tracking-wide border border-[#d8a355]/20" dir="ltr">
                            {studentData.guardian_phone}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Theme Switcher Section */}
                    <div className="pb-4 md:pb-6 border-b-2 border-[#d8a355]/20">
                      <ThemeSwitcher studentId={studentData?.id} />
                    </div>

                    {/* Effect Selector Section */}
                    <div className="pb-4 md:pb-6 border-b-2 border-[#d8a355]/20">
                      <EffectSelector studentId={studentData?.id} />
                    </div>

                    {/* Badge Selector Section */}
                    <div className="pb-4 md:pb-6 border-b-2 border-[#d8a355]/20">
                      <BadgeSelector studentId={studentData?.id} />
                    </div>

                    {/* Font Selector Section */}
                    <div className="pb-2">
                      <FontSelector studentId={studentData?.id} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="achievements" className="space-y-6">
                <Card className="rounded-none border-0 shadow-none">
                  <CardContent className="pt-6">
                    {achievements.length === 0 ? (
                      <div className="text-center py-12">
                        <Award className="w-24 h-24 mx-auto mb-4 opacity-40" style={{ color: "#d8a355" }} />
                        <p className="text-2xl font-bold text-[#c99347] mb-2">لاتوجد إنجازات حاليا</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {achievements.map((ach) => (
                          <div
                            key={ach.id}
                            className="flex items-center gap-3 p-4 rounded-xl border-2 bg-white"
                            style={{ borderColor: "#d8a35533" }}
                          >
                            <div className="w-11 h-11 rounded-full bg-[#d8a355]/10 border border-[#d8a355]/30 flex items-center justify-center shrink-0">
                              {renderAchievementIcon(ach.icon_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[#1a2332] truncate">{ach.title}</p>
                              <p className="text-xs text-neutral-400 mt-0.5">
                                {new Date(ach.date).toLocaleDateString("ar-SA")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="records" className="space-y-4">
                <Card className="rounded-none border-0 shadow-none">
                  <CardHeader className="bg-white">
                    <CardTitle className="text-2xl font-bold text-[#c99347]">سجلات الحضور والتقييم</CardTitle>
                    <CardDescription className="text-lg font-semibold text-[#1a2332]/80">سجلات الحضور والتقييمات الخاصة بك</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {isLoadingRecords ? (
                      <div className="text-center py-8">
                        <p className="text-xl font-bold text-[#c99347]/80">جاري تحميل السجلات...</p>
                      </div>
                    ) : attendanceRecords.length === 0 ? (
                      <div className="text-center py-12">
                        <Calendar
                          className="w-24 h-24 mx-auto mb-4 opacity-40"
                          style={{ color: "#d8a355" }}
                        />
                        <p className="text-2xl font-bold text-[#c99347] mb-2">لا توجد سجلات حضور حالياً</p>
                        <p className="text-lg text-[#1a2332]/50">سيتم تسجيل حضورك وتقييماتك من قبل المعلم</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {attendanceRecords.map((record) => (
                          <div
                            key={record.id}
                            className="p-4 bg-white rounded-2xl border-2 shadow-md flex flex-col gap-3"
                            style={{ borderColor: `#d8a35533` }}
                          >
                            <div className="flex flex-row justify-between items-center mb-2">
                              <div>
                                <span className="text-base font-bold text-[#c99347]">التاريخ: </span>
                                <span className="text-lg font-extrabold text-[#1a2332] tracking-wide">
                                  {new Date(record.date).toLocaleDateString("ar-SA")}
                                </span>
                              </div>
                              <Badge
                                className={
                                  record.status === "present"
                                    ? "bg-green-100 text-green-800 text-base font-bold px-3 py-1"
                                    : record.status === "excused"
                                    ? "bg-yellow-100 text-yellow-800 text-base font-bold px-3 py-1"
                                    : "bg-red-100 text-red-800 text-base font-bold px-3 py-1"
                                }
                              >
                                {record.status === "present"
                                  ? "حاضر"
                                  : record.status === "excused"
                                  ? "مستأذن"
                                  : "غائب"}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-center">
                              <div className="flex flex-col">
                                <span className="text-base font-bold text-[#c99347] mb-1">الحفظ</span>
                                <span className="text-lg font-extrabold text-[#1a2332]">
                                  {getEvaluationText(record.hafiz_level)}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-base font-bold text-[#c99347] mb-1">التكرار</span>
                                <span className="text-lg font-extrabold text-[#1a2332]">
                                  {getEvaluationText(record.tikrar_level)}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-base font-bold text-[#c99347] mb-1">السماع</span>
                                <span className="text-lg font-extrabold text-[#1a2332]">
                                  {getEvaluationText(record.samaa_level)}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-base font-bold text-[#c99347] mb-1">الربط</span>
                                <span className="text-lg font-extrabold text-[#1a2332]">
                                  {getEvaluationText(record.rabet_level)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="plan" className="space-y-4">
                {isLoadingPlan ? (
                  <div className="text-center py-12">
                    <div className="w-10 h-10 rounded-full border-2 border-[#d8a355]/40 border-t-[#d8a355] animate-spin mx-auto" />
                    <p className="mt-4 text-base text-[#c99347]/70">جاري تحميل الخطة...</p>
                  </div>
                ) : !planData ? (
                  <div className="text-center py-14">
                    <BookMarked className="w-20 h-20 mx-auto mb-4 opacity-30" style={{ color: "#d8a355" }} />
                    <p className="text-xl font-bold text-[#c99347] mb-2">لا توجد خطة حفظ حالياً</p>
                    <p className="text-sm text-[#1a2332]/40">سيتم إضافة خطة حفظ من قِبل المشرف</p>
                  </div>
                ) : (() => {
                  const daily = planData.daily_pages as number
                  const totalDays = planData.total_days as number
                  const totalPages = planData.total_pages as number
                  const planDirection = (planData.direction as "asc" | "desc") || "asc"
                  const startSurahData = SURAHS.find((s) => s.number === Math.min(planData.start_surah_number, planData.end_surah_number))
                  const planStartPage = startSurahData?.startPage || 1

                  // بناء قائمة كل الأيام
                  const allDays = Array.from({ length: totalDays }, (_, i) => {
                    const dayNum = i + 1
                    const sessionContent = getSessionContent(planStartPage, daily, dayNum, totalPages, planDirection)

                    let label = ""
                    if (daily === 0.5) {
                      const wajh = Math.ceil(dayNum / 2)
                      // في التنازلي: أول يوم = النصف الثاني من آخر وجه
                      if (planDirection === "desc") {
                        label = (dayNum % 2 === 1) ? `الوجه ${wajh} — النصف الثاني` : `الوجه ${wajh} — النصف الأول`
                      } else {
                        label = (dayNum % 2 === 1) ? `الوجه ${wajh} — النصف الأول` : `الوجه ${wajh} — النصف الثاني`
                      }
                    } else if (daily === 1) {
                      label = `الوجه ${dayNum}`
                    } else {
                      label = `الوجه ${(dayNum - 1) * 2 + 1} – ${dayNum * 2}`
                    }

                    const completed = planAttendance[i] || null
                    return { dayNum, label, sessionContent, completed }
                  })

                  return (
                    <>
                      {/* رأس الخطة: النص + مربعَي الإجمالي والمتبقي */}
                      <div className="bg-white rounded-2xl border-2 px-4 py-4 shadow-sm flex items-center gap-3" style={{ borderColor: "#d8a35530" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-[#c99347]/70 font-semibold mb-0.5">خطة الحفظ</p>
                          <p className="text-base font-black text-[#1a2332] leading-snug">
                            من سورة {planDirection === "asc" ? planData.start_surah_name : planData.end_surah_name} إلى سورة {planDirection === "asc" ? planData.end_surah_name : planData.start_surah_name}
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">{planData.daily_pages === 0.5 ? "نصف وجه يومياً" : planData.daily_pages === 1 ? "وجه يومياً" : "وجهان يومياً"}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <div className="text-center bg-[#d8a355]/8 border border-[#d8a355]/25 rounded-xl px-3 py-2 min-w-[56px]">
                            <p className="text-lg font-black text-[#c99347]">{totalDays}</p>
                            <p className="text-[9px] text-neutral-400 font-semibold">الإجمالي</p>
                          </div>
                          <div className="text-center bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 min-w-[56px]">
                            <p className="text-lg font-black text-emerald-600">{totalDays - planCompletedDays}</p>
                            <p className="text-[9px] text-neutral-400 font-semibold">المتبقي</p>
                          </div>
                        </div>
                      </div>

                      {/* الجدول الزمني لكل الأيام */}
                      <div className="bg-white rounded-2xl border-2 overflow-hidden" style={{ borderColor: "#d8a35526" }}>
                        <div className="px-5 py-4 border-b border-[#d8a355]/20 flex items-center justify-between">
                          <h4 className="font-bold text-[#1a2332]">جدول الخطة</h4>
                          <span className="text-xs text-neutral-400">{planData.daily_pages === 0.5 ? "نصف وجه يومياً" : planData.daily_pages === 1 ? "وجه يومياً" : "وجهان يومياً"}</span>
                        </div>
                        <div className="relative">
                          {/* خط التسلسل */}
                          <div className="absolute right-[28px] top-0 bottom-0 w-0.5 bg-[#d8a355]/15" />
                          <div className="space-y-0">
                            {allDays.map(({ dayNum, label, sessionContent, completed }) => {
                              const isNext = !completed && dayNum === planCompletedDays + 1
                              const hijriDate = completed
                                ? new Date(completed.date).toLocaleDateString("ar-SA-u-ca-islamic", { day: "numeric", month: "long" })
                                : null
                              return (
                                <div
                                  key={dayNum}
                                  className={`flex items-start gap-3 px-4 py-3 relative transition-colors ${
                                    completed ? "bg-emerald-50/40" : isNext ? "bg-[#d8a355]/5" : ""
                                  }`}
                                >
                                  {/* الأيقونة */}
                                  <div className="shrink-0 mt-0.5 z-10">
                                    {completed ? (
                                      <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                                        <CheckCircle2 className="w-4 h-4 text-white" />
                                      </div>
                                    ) : isNext ? (
                                      <div className="w-7 h-7 rounded-full border-2 border-[#d8a355] bg-white flex items-center justify-center">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#d8a355] animate-pulse" />
                                      </div>
                                    ) : (
                                      <div className="w-7 h-7 rounded-full border-2 border-neutral-200 bg-white flex items-center justify-center">
                                        <span className="text-[9px] font-bold text-neutral-300">{dayNum}</span>
                                      </div>
                                    )}
                                  </div>
                                  {/* المحتوى */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className={`text-sm font-bold ${completed ? "text-emerald-700" : isNext ? "text-[#c99347]" : "text-neutral-400"}`}>
                                        {label}
                                      </p>
                                      {isNext && (
                                        <span className="text-[10px] bg-[#d8a355]/15 text-[#c99347] px-1.5 py-0.5 rounded-full font-semibold">التالي</span>
                                      )}
                                    </div>
                                    <p className={`text-[11px] mt-0.5 ${completed ? "text-emerald-600/70" : "text-neutral-400"}`}>
                                      {sessionContent.text}
                                    </p>
                                  </div>
                                  {/* التاريخ */}
                                  {hijriDate && (
                                    <div className="shrink-0 text-right">
                                      <p className="text-[11px] font-semibold text-emerald-600">{hijriDate}</p>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}

export default function ProfilePageWrapper() {
  return (
    <Suspense fallback={null}>
      <ProfilePage />
    </Suspense>
  )
}
