"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SiteLoader } from "@/components/ui/site-loader"
import { MonitorPlay, X } from "lucide-react"
import { StudentRankCard } from "@/components/student-rank-card"

type Student = {
  id: string
  name: string
  points: number
  badges?: string[]
  preferred_theme?: string | null
  active_effect?: string | null
  font_family?: string | null
  selected_badge?: string | null
}

export default function AllStudentsPage() {
  const searchParams = useSearchParams()
  const selectedCircle = searchParams.get("circle")?.trim() || ""
  const scope = searchParams.get("scope")?.trim() || ""
  const showAllStudents = scope === "all"
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)

  useEffect(() => {
    if (!isAutoScrolling) return

    let animationFrameId: number
    let scrollDirection = 1
    let currentY = window.scrollY

    const scrollStep = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement

      if (scrollTop + clientHeight >= scrollHeight - 2) {
        scrollDirection = -1
      } else if (scrollTop <= 0) {
        scrollDirection = 1
      }

      currentY += scrollDirection * 0.3
      window.scrollTo(0, currentY)
      animationFrameId = requestAnimationFrame(scrollStep)
    }

    animationFrameId = requestAnimationFrame(scrollStep)
    return () => cancelAnimationFrame(animationFrameId)
  }, [isAutoScrolling])

  useEffect(() => {
    const fetchAllStudents = async () => {
      try {
        const studentsUrl = selectedCircle
          ? `/api/students?circle=${encodeURIComponent(selectedCircle)}`
          : "/api/students"

        const [studentsRes, themesRes, badgesRes, fontsRes] = await Promise.all([
          fetch(studentsUrl, { cache: "no-store" }),
          fetch("/api/themes", { cache: "no-store" }),
          fetch("/api/badges", { cache: "no-store" }),
          fetch("/api/fonts", { cache: "no-store" }),
        ])

        const studentsJson = studentsRes.ok ? await studentsRes.json() : { students: [] }
        const themesJson = themesRes.ok ? await themesRes.json() : { themes: {} }
        const badgesJson = badgesRes.ok ? await badgesRes.json() : { badges: {} }
        const fontsJson = fontsRes.ok ? await fontsRes.json() : { fonts: {} }

        const students = (studentsJson.students ?? []) as Student[]
        const themes = (themesJson.themes ?? {}) as Record<string, string>
        const selectedBadges = (badgesJson.badges ?? {}) as Record<string, string>
        const fonts = (fontsJson.fonts ?? {}) as Record<string, string>

        const mappedStudents = students
          .map((student) => {
            const effectKey = localStorage.getItem(`active_effect_${student.id}`)

            return {
              ...student,
              preferred_theme: themes[student.id] ?? "beige_default",
              active_effect: effectKey && effectKey !== "none" ? `effect_${effectKey}` : null,
              font_family: fonts[student.id] ?? null,
              selected_badge: selectedBadges[student.id] ?? null,
            }
          })
          .sort((left, right) => Number(right.points ?? 0) - Number(left.points ?? 0))

        const visibleStudents = showAllStudents ? mappedStudents : mappedStudents.slice(0, 10)

        setAllStudents(visibleStudents)
      } catch (error) {
        console.error("[students/all] Error fetching students:", error)
        setAllStudents([])
      } finally {
        setLoading(false)
      }
    }

    void fetchAllStudents()

    const refresh = () => {
      setLoading(true)
      void fetchAllStudents()
    }

    window.addEventListener("themeChanged", refresh)
    window.addEventListener("fontChanged", refresh)
    window.addEventListener("effectChanged", refresh)

    return () => {
      window.removeEventListener("themeChanged", refresh)
      window.removeEventListener("fontChanged", refresh)
      window.removeEventListener("effectChanged", refresh)
    }
  }, [selectedCircle, showAllStudents])

  const pageTitle = selectedCircle ? selectedCircle : showAllStudents ? "جميع الطلاب" : "أفضل الطلاب"
  const emptyStateText = selectedCircle
    ? `لا يوجد طلاب مسجلين حالياً في حلقة ${selectedCircle}`
    : showAllStudents
    ? "لا يوجد طلاب مسجلين حالياً في الحلق"
    : "لا يوجد طلاب مسجلين حالياً"

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white" dir="rtl">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <SiteLoader size="lg" />
        </main>
        <Footer />
      </div>
    )
  }

  if (allStudents.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-white" dir="rtl">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-[#003f55] md:text-5xl">{pageTitle}</h1>
            <p className="text-xl text-gray-600">{emptyStateText}</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      {!isAutoScrolling ? <Header /> : null}

      <main className="flex-1 py-8 md:py-16">
        <div className="container mx-auto px-3 md:px-4">
          <div className="mb-8 text-center md:mb-16">
            <h1 className="text-3xl font-black text-[#003f55] md:text-5xl">{pageTitle}</h1>
          </div>

          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {allStudents.map((student, index) => (
                <StudentRankCard
                  key={student.id}
                  rank={index + 1}
                  name={student.name}
                  points={Number(student.points ?? 0)}
                  scope="leaderboard"
                  themeKey={student.preferred_theme}
                  effectId={student.active_effect}
                  fontId={student.font_family}
                  badgeId={student.selected_badge}
                  achievementBadges={student.badges}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      <button
        onClick={() => setIsAutoScrolling((current) => !current)}
        className={`fixed bottom-6 left-6 z-50 flex h-8 w-8 items-center justify-center rounded-full shadow-2xl transition-all duration-300 ${
          isAutoScrolling ? "bg-red-500 text-white hover:bg-red-600" : "bg-[#3453a7] text-white opacity-50 hover:bg-[#27428d] hover:opacity-100"
        }`}
        title={isAutoScrolling ? "إيقاف النزول التلقائي" : "تشغيل النزول التلقائي"}
      >
        {isAutoScrolling ? <X size={16} /> : <MonitorPlay size={16} />}
      </button>

      {!isAutoScrolling ? <Footer /> : null}
    </div>
  )
}
