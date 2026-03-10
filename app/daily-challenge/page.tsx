"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase-client"
import { useRouter } from 'next/navigation'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SiteLoader } from "@/components/ui/site-loader"
import { useToast } from "@/hooks/use-toast"
import { Zap, Trophy, XCircle, X, Sparkles, Clock, Award, Lock } from 'lucide-react'
import { SizeOrderingChallenge } from "@/components/challenges/size-ordering-challenge"
import { ColorDifferenceChallenge } from "@/components/challenges/color-difference-challenge"
import { MathProblemsChallenge } from "@/components/challenges/math-problems-challenge"
import { InstantMemoryChallenge } from "@/components/challenges/instant-memory-challenge"

export default function DailyChallengeStudent() {
  const [isLoading, setIsLoading] = useState(true)
  const [challenge, setChallenge] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const [showResult, setShowResult] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const [studentName, setStudentName] = useState("")
  const [studentId, setStudentId] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [challengeStarted, setChallengeStarted] = useState(false)

  const [hasPlayedToday, setHasPlayedToday] = useState(false)

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")

    if (loggedIn && userRole === "student") {
      setIsLoggedIn(true)

      const name = localStorage.getItem("studentName") || localStorage.getItem("userName") || ""
      const accountNumber = localStorage.getItem("account_number") || localStorage.getItem("accountNumber") || ""

      console.log("[v0] Student login info:", { name, accountNumber, userRole })

      setStudentName(name)
      setStudentId(accountNumber)

      if (accountNumber) {
        const lastPlayDate = localStorage.getItem(`lastPlayDate_${accountNumber}`)
        const today = getTodayDate()
        const played = lastPlayDate === today
        setHasPlayedToday(played)
        console.log("[v0] Daily challenge status:", {
          accountNumber,
          lastPlayDate,
          today,
          hasPlayedToday: played,
        })
      } else {
        console.error("[v0] No account_number found in localStorage!")
      }
    } else {
      setIsLoggedIn(false)
      console.log("[v0] User not logged in as student:", { loggedIn, userRole })
    }

    loadChallenge()
  }, [])

  const getTodayDate = () => {
    // إرجاع تاريخ اليوم بتوقيت السعودية
    const now = new Date()
    const saDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }))
    return saDate.toISOString().split("T")[0]
  }

  // تحديات افتراضية يعاد تدويرها للأبد
  const fallbackChallenges = [
    {
      challenge_type: "size_ordering",
      title: "تحدي الأشكال من الأكبر للأصغر",
      description: "اضغط على الأشكال من الأكبر للأصغر - 3 جولات",
      points_reward: 20,
    },
    {
      challenge_type: "color_difference",
      title: "تحدي اللون المختلف",
      description: "اعثر على الشكل الذي يختلف قليلاً في درجة اللون",
      points_reward: 20,
    },
    {
      challenge_type: "math_problems",
      title: "تحدي حل المسائل",
      description: "حل 5 مسائل رياضية بسيطة خلال 60 ثانية",
      points_reward: 20,
    },
    {
      challenge_type: "instant_memory",
      title: "لعبة الذاكرة اللحظية",
      description: "احفظ ترتيب الأشكال والألوان لمدة 10 ثواني ثم رتبها بشكل صحيح",
      points_reward: 20,
    },
  ];

  const loadChallenge = async () => {
    try {
      const todayDate = getTodayDate();
      // جلب التحدي اليومي من Supabase
      const { data, error } = await supabase
        .from("daily_challenges")
        .select("*")
        .eq("date", todayDate)
        .single();
      if (!error && data) {
        setChallenge(data);
      } else {
        // استخدم تحدي افتراضي حسب اليوم (يدور على القائمة)
        const startDate = new Date("2024-01-01");
        const today = new Date(todayDate);
        const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        const fallback = fallbackChallenges[diffDays % fallbackChallenges.length];
        setChallenge(fallback);
      }
    } catch (error) {
      // في حال فشل الاتصال، استخدم تحدي افتراضي
      const todayDate = getTodayDate();
      const startDate = new Date("2024-01-01");
      const today = new Date(todayDate);
      const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
      const fallback = fallbackChallenges[diffDays % fallbackChallenges.length];
      setChallenge(fallback);
      console.error("Error loading challenge:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleChallengeSuccess = async () => {
    const pointsAwarded = challenge?.points_reward || 0

    console.log("[v0] Challenge success! Adding points...", { studentId, pointsAwarded })

    if (!studentId) {
      console.error("[v0] Cannot add points: studentId is empty!")
      toast({
        title: "خطأ",
        description: "حدث خطأ في تسجيل النقاط. يرجى تسجيل الدخول مرة أخرى.",
        variant: "destructive",
      })
      return
    }

    try {
      const getAllStudentsResponse = await fetch("/api/students")
      if (!getAllStudentsResponse.ok) {
        throw new Error("Failed to fetch students")
      }

      const allStudentsData = await getAllStudentsResponse.json()
      console.log("[v0] All students data:", allStudentsData)

      const student = allStudentsData.students?.find((s: any) => String(s.account_number) === String(studentId))

      if (!student || !student.id) {
        console.error("[v0] Student not found in database:", { studentId, allStudents: allStudentsData.students })
        toast({
          title: "خطأ",
          description: "لم يتم العثور على بياناتك. يرجى تسجيل الدخول مرة أخرى.",
          variant: "destructive",
        })
        return
      }

      console.log("[v0] Found student:", { account_number: studentId, uuid: student.id, currentPoints: student.points })

      const response = await fetch(`/api/students?id=${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          add_points: pointsAwarded,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Points added successfully! New total:", data.student?.points)

        // Update localStorage
        const newPoints = data.student?.points
        localStorage.setItem(`studentPoints_${studentId}`, newPoints.toString())
      } else {
        const errorText = await response.text()
        console.error("[v0] Failed to add points to database:", errorText)
        toast({
          title: "خطأ",
          description: "فشل في إضافة النقاط. يرجى المحاولة لاحقاً.",
          variant: "destructive",
        })
        return
      }
    } catch (error) {
      console.error("[v0] Error adding points:", error)
      toast({
        title: "خطأ",
        description: "حدث خطأ في إضافة النقاط.",
        variant: "destructive",
      })
      return
    }

    const today = getTodayDate()
    localStorage.setItem(`lastPlayDate_${studentId}`, today)
    setHasPlayedToday(true)
    console.log("[v0] Marked as played today:", { studentId, today })

    setResult({
      isCorrect: true,
      pointsAwarded: pointsAwarded,
    })
    setShowResult(true)

    try {
      const attempts = JSON.parse(localStorage.getItem("challengeAttempts") || "[]")
      attempts.push({
        studentId,
        studentName,
        date: getTodayDate(),
        correct: true,
        points: pointsAwarded,
      })
      localStorage.setItem("challengeAttempts", JSON.stringify(attempts))
    } catch (error) {
      console.error("Error:", error)
    }

    toast({
      title: "✓ فزت!",
      description: `مبروك! حصلت على ${pointsAwarded} نقطة`,
      className: "bg-gradient-to-r from-[#d8a355] to-[#c89547] text-white border-none",
    })
  }

  const handleChallengeFailure = (message: string) => {
    if (!studentId) {
      console.error("[v0] Cannot mark as played: studentId is empty!")
      return
    }

    const today = getTodayDate()
    localStorage.setItem(`lastPlayDate_${studentId}`, today)
    setHasPlayedToday(true)
    console.log("[v0] Marked as played today (failed):", { studentId, today })

    setResult({
      isCorrect: false,
      message: message,
    })
    setShowResult(true)
  }

  const handleStartChallenge = () => {
    if (hasPlayedToday) {
      toast({
        title: "تنبيه",
        description: "لقد لعبت التحدي اليوم. عد غداً للتحدي الجديد!",
        variant: "destructive",
      })
      return
    }

    if (!studentId) {
      toast({
        title: "خطأ",
        description: "يرجى تسجيل الدخول مرة أخرى",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    setIsFullscreen(true)
    setChallengeStarted(true)
  }

  const handleExitFullscreen = () => {
    setIsFullscreen(false)
    setChallengeStarted(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#faf8f5] via-[#f5f0e8] to-[#ebe4d8]">
        <SiteLoader size="lg" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#faf8f5] via-[#f5f0e8] to-[#ebe4d8]">
        <Header />

        <main className="flex-1 py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="mb-12 text-center animate-slide-up">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-[#faf8f5] via-[#f5f0e8] to-[#ebe4d8] border-2 border-[#d8a355] px-6 py-2 rounded-full mb-6 shadow-lg">
                <Sparkles className="w-5 h-5 text-[#d8a355] animate-pulse" />
                <span className="text-sm font-semibold text-[#d8a355]">تحدي اليوم</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-[#d8a355] via-[#c89547] to-[#b8823d] bg-clip-text text-transparent leading-tight">
                التحدي اليومي
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                اختبر مهاراتك واحصل على نقاط إضافية
              </p>
            </div>

            <Card className="border-none shadow-2xl overflow-hidden animate-scale-in bg-gradient-to-br from-[#faf8f5] to-[#f5f0e8] backdrop-blur-sm">
              <CardContent className="py-20 text-center">
                <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-r from-[#faf8f5] via-[#f5f0e8] to-[#ebe4d8] border-2 border-[#d8a355] rounded-full mb-6 shadow-lg">
                  <Lock className="w-16 h-16 text-[#d8a355]" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-3">هذا القسم متاح للطلاب المسجلين فقط</h2>
                <p className="text-lg text-gray-600 mb-8">يرجى تسجيل الدخول للوصول إلى التحدي اليومي</p>
                <Button
                  onClick={() => router.push("/login")}
                  className="bg-gradient-to-r from-[#d8a355] via-[#c89547] to-[#b8823d] hover:from-[#c89547] hover:via-[#d8a355] hover:to-[#c89547] text-white font-bold py-6 px-12 text-xl shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl"
                >
                  تسجيل الدخول
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  if (isFullscreen && challenge) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#faf8f5] via-[#f5f0e8] to-[#ebe4d8]">
        <div className="absolute top-6 left-6 z-50">
          <Button
            onClick={handleExitFullscreen}
            variant="outline"
            size="icon"
            className="rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white hover:shadow-xl transition-all border-[#d8a355]"
          >
            <X className="h-5 w-5 text-[#d8a355]" />
          </Button>
        </div>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="container mx-auto max-w-6xl">
            {challenge.challenge_type === "size_ordering" && (
              <SizeOrderingChallenge
                onSuccess={handleChallengeSuccess}
                onFailure={handleChallengeFailure}
                timeLimit={60}
              />
            )}
            {challenge.challenge_type === "color_difference" && (
              <ColorDifferenceChallenge
                onSuccess={handleChallengeSuccess}
                onFailure={handleChallengeFailure}
                timeLimit={60}
              />
            )}
            {challenge.challenge_type === "math_problems" && (
              <MathProblemsChallenge
                onSuccess={handleChallengeSuccess}
                onFailure={handleChallengeFailure}
                timeLimit={60}
              />
            )}
            {challenge.challenge_type === "instant_memory" && (
              <InstantMemoryChallenge
                onSuccess={handleChallengeSuccess}
                onFailure={handleChallengeFailure}
                timeLimit={60}
              />
            )}
            {/* تجاهل أي تحدي غير الأنواع الأربعة */}
            {["size_ordering","color_difference","math_problems","instant_memory"].indexOf(challenge.challenge_type) === -1 && (
              <div className="text-center text-red-600 font-bold text-xl py-10">نوع التحدي غير مدعوم حالياً</div>
            )}
          </div>
        </main>

        <Dialog open={showResult} onOpenChange={setShowResult}>
          <DialogContent className="sm:max-w-[500px] border-2 border-[#d8a355]/30 shadow-2xl bg-gradient-to-br from-[#1a2332] via-[#0f1419] to-[#1a2332]">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-3xl md:text-4xl text-center font-black bg-gradient-to-r from-[#d8a355] via-[#f4d03f] to-[#d8a355] bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                {result?.isCorrect ? "🎉 إنجاز رائع!" : "💪 حاول مجدداً"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-6 md:py-8 text-center relative overflow-hidden">
              {/* Background Effects */}
              <div className="absolute inset-0 pointer-events-none">
                {result?.isCorrect ? (
                  <>
                    <div className="absolute top-0 left-1/4 w-32 h-32 bg-[#d8a355]/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-[#f4d03f]/20 rounded-full blur-3xl animate-pulse delay-300" />
                  </>
                ) : (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-3xl" />
                )}
              </div>

              {result?.isCorrect ? (
                <div className="animate-scale-in space-y-6 relative z-10">
                  {/* Trophy with effects */}
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#d8a355] to-[#f4d03f] blur-2xl opacity-50 animate-pulse" />
                    <Trophy className="relative w-28 h-28 md:w-32 md:h-32 text-[#d8a355] mx-auto animate-bounce drop-shadow-2xl" />
                    <Sparkles className="w-10 h-10 text-[#f4d03f] absolute -top-2 -right-4 animate-pulse" />
                    <Sparkles className="w-8 h-8 text-[#d8a355] absolute -bottom-2 -left-2 animate-pulse delay-500" />
                  </div>

                  {/* Success Message */}
                  <div className="space-y-3 bg-gradient-to-r from-[#d8a355]/10 to-[#00312e]/10 backdrop-blur-sm border border-[#d8a355]/30 rounded-2xl p-6">
                    <p className="text-3xl md:text-4xl font-black text-transparent bg-gradient-to-r from-[#d8a355] to-[#f4d03f] bg-clip-text">
                      +{result.pointsAwarded} نقطة ⭐
                    </p>
                    <p className="text-base md:text-lg text-gray-300 font-bold">أحسنت! لقد أتممت التحدي بنجاح</p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                    <Clock className="w-4 h-4" />
                    <p>تحدٍ جديد ينتظرك غداً 🚀</p>
                  </div>
                </div>
              ) : (
                <div className="animate-scale-in space-y-6 relative z-10">
                  {/* Failure Icon */}
                  <div className="relative inline-block">
                    <XCircle className="w-28 h-28 md:w-32 md:h-32 text-red-400 mx-auto drop-shadow-2xl" />
                  </div>

                  {/* Failure Message */}
                  <div className="space-y-3 bg-gradient-to-r from-red-500/10 to-orange-500/10 backdrop-blur-sm border border-red-400/30 rounded-2xl p-6">
                    <p className="text-2xl md:text-3xl font-black text-red-400">للأسف 😔</p>
                    <p className="text-base md:text-lg text-gray-300 font-medium">{result?.message}</p>
                    <p className="text-sm text-gray-500">لم تحصل على نقاط هذه المرة</p>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                    <Clock className="w-4 h-4" />
                    <p>حاول مرة أخرى غداً 💪</p>
                  </div>
                </div>
              )}
            </div>
            <Button
              onClick={() => {
                setShowResult(false)
                handleExitFullscreen()
              }}
              className="w-full bg-gradient-to-r from-[#d8a355] via-[#f4d03f] to-[#d8a355] hover:from-[#f4d03f] hover:via-[#d8a355] hover:to-[#f4d03f] text-[#0a0f1e] font-black py-6 md:py-7 text-lg md:text-xl shadow-2xl hover:shadow-[#d8a355]/50 transition-all duration-500 rounded-xl relative overflow-hidden group hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span className="relative z-10">حسناً 👍</span>
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#faf8f5] via-[#f5f0e8] to-[#ebe4d8]">
      <Header />

      <main className="flex-1 py-8 md:py-16 px-3 md:px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 md:mb-12 text-center animate-slide-up">
            <div className="inline-flex items-center gap-2 md:gap-3 bg-gradient-to-r from-[#faf8f5] via-[#f5f0e8] to-[#ebe4d8] border-2 border-[#d8a355] px-4 md:px-6 py-1.5 md:py-2 rounded-full mb-4 md:mb-6 shadow-lg">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-[#d8a355] animate-pulse" />
              <span className="text-xs md:text-sm font-semibold text-[#d8a355]">تحدي اليوم</span>
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-[#d8a355] via-[#c89547] to-[#b8823d] bg-clip-text text-transparent leading-tight">
              التحدي اليومي
            </h1>
            <p className="text-base md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              اختبر مهاراتك واحصل على نقاط إضافية
            </p>
          </div>

          {challenge && ["size_ordering","color_difference","math_problems","instant_memory"].includes(challenge.challenge_type) ? (
            <Card className="border-none shadow-2xl overflow-hidden animate-scale-in bg-gradient-to-br from-[#faf8f5] to-[#f5f0e8] backdrop-blur-sm">
              {hasPlayedToday && (
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-3 md:p-4 text-center font-bold text-sm md:text-base">
                  لقد لعبت التحدي اليوم. عد غداً للتحدي الجديد!
                </div>
              )}
              <div className="relative bg-gradient-to-r from-[#d8a355] via-[#c89547] to-[#b8823d] p-6 md:p-8 text-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="bg-white/20 backdrop-blur-sm p-2 md:p-3 rounded-lg md:rounded-xl">
                      <Zap className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <h2 className="text-xl md:text-3xl font-bold">{challenge.title}</h2>
                  </div>
                  <p className="text-sm md:text-lg text-white/90 leading-relaxed">
                    {challenge.challenge_type === "instant_memory"
                      ? "احفظ ترتيب الأشكال والألوان لمدة 10 ثواني ثم رتبها بشكل صحيح"
                      : challenge.description}
                  </p>
                </div>
              </div>
              <CardContent className="p-4 md:p-8 space-y-4 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-br from-[#faf8f5] via-[#f5f0e8] to-[#ebe4d8] rounded-lg md:rounded-xl border-2 border-[#d8a355] shadow-md">
                    <div className="bg-gradient-to-br from-[#d8a355] to-[#c89547] p-2 md:p-3 rounded-lg shadow-lg">
                      <Award className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-gray-600 font-medium">المكافأة</p>
                      <p className="text-xl md:text-2xl font-bold text-[#d8a355]">{challenge.points_reward} نقطة</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gradient-to-br from-[#faf8f5] via-[#f5f0e8] to-[#ebe4d8] rounded-lg md:rounded-xl border-2 border-[#d8a355] shadow-md">
                    <div className="bg-gradient-to-br from-[#d8a355] to-[#c89547] p-2 md:p-3 rounded-lg shadow-lg">
                      <Clock className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm text-gray-600 font-medium">الوقت المتاح</p>
                      <p className="text-xl md:text-2xl font-bold text-[#d8a355]">دقيقة</p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleStartChallenge}
                  disabled={hasPlayedToday}
                  className="w-full bg-gradient-to-r from-[#d8a355] via-[#c89547] to-[#b8823d] hover:from-[#c89547] hover:via-[#d8a355] hover:to-[#c89547] text-white font-bold py-6 md:py-8 text-lg md:text-2xl shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2 md:gap-3">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />
                    {hasPlayedToday ? "لقد لعبت اليوم" : "ابدأ التحدي"}
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6 animate-pulse" />
                  </span>
                  {!hasPlayedToday && (
                    <div className="absolute inset-0 bg-gradient-to-r from-[#ebe4d8] to-[#d8a355] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-2xl overflow-hidden animate-scale-in bg-gradient-to-br from-[#faf8f5] to-[#f5f0e8] backdrop-blur-sm">
              <CardContent className="py-12 md:py-20 text-center px-4">
                <div className="inline-flex items-center justify-center w-24 h-24 md:w-32 md:h-32 bg-gradient-to-r from-[#faf8f5] via-[#f5f0e8] to-[#ebe4d8] border-2 border-[#d8a355] rounded-full mb-4 md:mb-6 shadow-lg">
                  <Zap className="w-12 h-12 md:w-16 md:h-16 text-[#d8a355]" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 md:mb-3">لا يوجد تحدي اليوم</h2>
                <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-8">سيتم إضافة تحدي جديد قريباً</p>
                <div className="flex items-center justify-center gap-2 text-[#d8a355]">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 animate-pulse" />
                  <span className="text-xs md:text-sm font-medium">عد قريباً</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
