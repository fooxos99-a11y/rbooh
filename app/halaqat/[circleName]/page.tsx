"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { SiteLoader } from "@/components/ui/site-loader"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Award, Calendar, Diamond, Star, Zap, Crown, MonitorPlay, X} from "lucide-react"
import { applyCardEffect } from "@/lib/card-effects"

interface Student {
  id: string
  name: string
  rank: number
  points: number
  halaqah: string
  badges?: string[]
  preferred_theme?: string
  active_effect?: string
  font_family?: string
}

const renderBadge = (badgeType: string) => {
  // Check if it's a star badge
  if (badgeType.startsWith("star_")) {
    let starColor = "#d8a355"
    let starGradient = "from-amber-500 to-yellow-500"

    if (badgeType === "star_fire") {
      starColor = "#f97316"
      starGradient = "from-orange-600 via-red-500 to-pink-600"
    } else if (badgeType === "star_snow") {
      starColor = "#38bdf8"
      starGradient = "from-blue-400 via-cyan-400 to-sky-300"
    } else if (badgeType === "star_leaves") {
      starColor = "#22c55e"
      starGradient = "from-green-600 via-emerald-500 to-teal-400"
    } else if (badgeType === "star_bats") {
      starColor = "#8B7355"
      starGradient = "from-amber-800 via-amber-700 to-yellow-700"
    } else if (badgeType === "star_royal") {
      starColor = "#9333ea"
      starGradient = "from-purple-600 via-fuchsia-500 to-pink-500"
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-transparent border-0 p-0 hover:scale-110 transition-transform duration-200 cursor-help">
            <div className="relative">
              <div className={`absolute inset-0 blur-md bg-gradient-to-br ${starGradient} opacity-60 rounded-full`} />
              <Star
                className="w-8 h-8 relative"
                style={{
                  fill: `url(#star-gradient-${badgeType})`,
                  filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))",
                }}
              />
              <svg width="0" height="0">
                <defs>
                  <linearGradient id={`star-gradient-${badgeType}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={starColor} stopOpacity="1" />
                    <stop offset="50%" stopColor={starColor} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={starColor} stopOpacity="1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-center">
            <p className="font-bold mb-1">نجمة مميزة</p>
            <p className="text-xs">نجمة تم شراؤها من المتجر</p>
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  const unifiedBadgeClass =
    "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-0 p-3 rounded-full hover:scale-110 transition-transform duration-200 cursor-help shadow-md"

  switch (badgeType) {
    case "memorization":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={unifiedBadgeClass}>
              <Award className="w-6 h-6" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-center">
              <p className="font-bold mb-1">شارة الحفظ</p>
              <p className="text-xs">تُمنح للطلاب المتميزين في حفظ القرآن الكريم</p>
            </div>
          </TooltipContent>
        </Tooltip>
      )
    case "mastery":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={unifiedBadgeClass}>
              <Star className="w-6 h-6" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-center">
              <p className="font-bold mb-1">شارة الإتقان</p>
              <p className="text-xs">تُمنح للطلاب المتقنين للتلاوة والتجويد</p>
            </div>
          </TooltipContent>
        </Tooltip>
      )
    case "attendance":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={unifiedBadgeClass}>
              <Calendar className="w-6 h-6" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-center">
              <p className="font-bold mb-1">شارة الحضور</p>
              <p className="text-xs">تُمنح للطلاب المواظبين على الحضور</p>
            </div>
          </TooltipContent>
        </Tooltip>
      )
    default:
      return null
  }
}

const getThemeColors = (preferredTheme?: string) => {
  if (preferredTheme === "bats") {
    return { primary: "#000000", secondary: "#1a1a1a", tertiary: "#2a2a2a" }
  }

  if (preferredTheme === "fire") {
    return { primary: "#ea580c", secondary: "#dc2626", tertiary: "#b91c1c" }
  }

  if (preferredTheme === "snow") {
    return { primary: "#0284c7", secondary: "#0369a1", tertiary: "#0c4a6e" }
  }

  if (preferredTheme === "leaves") {
    return { primary: "#22c55e", secondary: "#16a34a", tertiary: "#15803d" }
  }

  if (preferredTheme === "royal") {
    return { primary: "#9333ea", secondary: "#a855f7", tertiary: "#d946ef" }
  }

  // المظاهر الفاخرة الجديدة
  if (preferredTheme === "dawn") {
    return { primary: "#fbbf24", secondary: "#f97316", tertiary: "#d97706" }
  }

  if (preferredTheme === "galaxy") {
    return { primary: "#7c3aed", secondary: "#a78bfa", tertiary: "#c4b5fd" }
  }

  if (preferredTheme === "sunset_gold") {
    return { primary: "#f59e0b", secondary: "#d97706", tertiary: "#b45309" }
  }

  if (preferredTheme === "ocean_deep") {
    return { primary: "#0284c7", secondary: "#06b6d4", tertiary: "#22d3ee" }
  }

  // Default beige theme
  return { primary: "#d8a355", secondary: "#c99347", tertiary: "#b88a3d" }
}

const getThemeType = (theme?: string) => "default"

const ThemeDecorations = ({ theme }: { theme?: string }) => {
  // المظاهر الفاخرة التي تحتاج زخارف خاصة
  const premiumThemes = ["dawn", "galaxy", "sunset_gold", "ocean_deep"]

  if (!theme || !premiumThemes.includes(theme)) {
    return null
  }

  return (
    <>
      {/* النقاط المتلألئة */}
      {[...Array(20)].map((_, i) => (
        <div
          key={`star-${i}`}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            width: `${Math.random() * 6 + 2}px`,
            height: `${Math.random() * 6 + 2}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            opacity: 0.3,
            animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}

      {/* الخطوط القطرية */}
      <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`lines-${theme}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="20" y2="20" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#lines-${theme})`} />
      </svg>

      {/* الدوائر الزخرفية */}
      <div className="absolute top-2 right-2 w-8 h-8 rounded-full border-2 border-white opacity-30 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-6 h-6 rounded-full border-2 border-white opacity-40 pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-4 h-4 rounded-full bg-white opacity-20 pointer-events-none" />

      <div className="absolute inset-2 rounded-2xl pointer-events-none overflow-hidden">
        {/* الحدود بسمك صغير */}
        <div className="absolute inset-0 border border-white/40 rounded-2xl" />

        {/* الدوائر في الزوايا الأربع */}
        <div className="absolute top-0 right-0 w-3 h-3 rounded-full border border-white/50" />
        <div className="absolute top-0 left-0 w-3 h-3 rounded-full border border-white/50" />
        <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border border-white/50" />
        <div className="absolute bottom-0 left-0 w-3 h-3 rounded-full border border-white/50" />
      </div>

      {/* أنيميشن التلألؤ */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
      `}</style>
    </>
  )
}

const getFontFamily = (fontId?: string) => {
  const fontMap: Record<string, string> = {
    font_cairo: "'Cairo', sans-serif",
    font_amiri: "'Amiri', serif",
    font_tajawal: "'Tajawal', sans-serif",
    font_changa: "'Changa', sans-serif",
  }
  return fontId && fontMap[fontId] ? fontMap[fontId] : "inherit"
}

export default function CircleLeaderboard() {
  const params = useParams()
  const circleName = decodeURIComponent(params.circleName as string)
  const [topStudents, setTopStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)
  const [studentBadges, setStudentBadges] = useState<Record<string, string>>({})

    useEffect(() => {
    if (!isAutoScrolling) return;
    let animationFrameId: number;
    let scrollDirection = 1; let currentY = window.scrollY;

    const scrollStep = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      
      // Reverse direction at top or bottom
      if (scrollTop + clientHeight >= scrollHeight - 2) {
        scrollDirection = -1;
      } else if (scrollTop <= 0) {
        scrollDirection = 1;
      }
      
      currentY += scrollDirection * 0.3; window.scrollTo(0, currentY);
      animationFrameId = requestAnimationFrame(scrollStep);
    };

    animationFrameId = requestAnimationFrame(scrollStep);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isAutoScrolling]);

  useEffect(() => {
    fetchStudents()

    const handleStorageChange = () => {
      fetchStudents()
    }

    const handleThemeChange = () => {
      console.log("[v0] Theme changed, refreshing students")
      fetchStudents()
    }

    const handleFontChange = () => {
      console.log("[v0] Font changed, refreshing students")
      fetchStudents()
    }

    const handleEffectChange = () => {
      console.log("[v0] Effect changed, refreshing students")
      fetchStudents()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("themeChanged", handleThemeChange)
    window.addEventListener("fontChanged", handleFontChange)
    window.addEventListener("effectChanged", handleEffectChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("themeChanged", handleThemeChange)
      window.removeEventListener("fontChanged", handleFontChange)
      window.removeEventListener("effectChanged", handleEffectChange)
    }
  }, [circleName])

  const fetchStudents = async () => {
    try {
      console.log("[v0] Fetching students and themes")

      const [studentsRes, themesRes, badgesRes, fontsRes] = await Promise.all([
        fetch(`/api/students?circle=${encodeURIComponent(circleName)}`, { cache: "no-store" }),
        fetch("/api/themes", { cache: "no-store" }),
        fetch("/api/badges", { cache: "no-store" }),
        fetch("/api/fonts", { cache: "no-store" }),
      ])

      let themes: Record<string, string> = {}
      if (themesRes.ok) {
        const themesData = await themesRes.json()
        themes = themesData.themes || {}
        console.log("[v0] Loaded themes from server:", themes)
      }

      let badges: Record<string, string> = {}
      if (badgesRes.ok) {
        const badgesData = await badgesRes.json()
        badges = badgesData.badges || {}
        setStudentBadges(badges)
        console.log("[v0] Loaded badges from server:", badges)
      }

      let fonts: Record<string, string> = {}
      if (fontsRes.ok) {
        const fontsData = await fontsRes.json()
        fonts = fontsData.fonts || {}
        console.log("[v0] Loaded fonts from server:", fonts)
      }

      if (studentsRes.ok) {
        const data = await studentsRes.json()
        if (data.students) {
          const studentsWithData = data.students.map((student: Student) => {
            const activeEffectKey = localStorage.getItem(`active_effect_${student.id}`)
            const activeEffect = activeEffectKey && activeEffectKey !== "none" ? `effect_${activeEffectKey}` : null

            const studentTheme = themes[student.id] || "default"
            const studentFont = fonts[student.id]
            console.log(`[v0] Student ${student.name} theme: ${studentTheme}, font: ${studentFont}`)

            return {
              ...student,
              preferred_theme: studentTheme,
              active_effect: activeEffect,
              font_family: studentFont,
            }
          })

          const sorted = studentsWithData
            .sort((a: Student, b: Student) => (b.points || 0) - (a.points || 0))

          setTopStudents(sorted)
        }
      }
    } catch (error) {
      console.error("Error fetching students:", error)
    } finally {
      setLoading(false)
    }
  }

  const getBadgeIcon = (studentId: string) => {
    const badgeId = studentBadges[studentId]
    if (!badgeId || badgeId === "badge_none") return null

    const badgeData: Record<string, { color: string; gradient: string; icon: string }> = {
      badge_diamond: {
        color: "#60a5fa",
        gradient: "from-blue-400 via-cyan-400 to-sky-300",
        icon: "diamond",
      },
      badge_star: {
        color: "#fbbf24",
        gradient: "from-yellow-400 via-amber-400 to-orange-400",
        icon: "star",
      },
      badge_lightning: {
        color: "#a78bfa",
        gradient: "from-purple-400 via-violet-400 to-indigo-400",
        icon: "lightning",
      },
      badge_crown: {
        color: "#fbbf24",
        gradient: "from-yellow-400 via-amber-400 to-yellow-600",
        icon: "crown",
      },
    }

    const badge = badgeData[badgeId]
    if (!badge) return null

    const getBadgeIconComponent = () => {
      switch (badge.icon) {
        case "diamond":
          return (
            <Diamond
              className="w-8 h-8"
              style={{ color: badge.color, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }}
            />
          )
        case "star":
          return (
            <Star
              className="w-8 h-8"
              style={{ color: badge.color, fill: badge.color, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }}
            />
          )
        case "lightning":
          return (
            <Zap
              className="w-8 h-8"
              style={{ color: badge.color, fill: badge.color, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }}
            />
          )
        case "crown":
          return (
            <Crown
              className="w-8 h-8"
              style={{ color: badge.color, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }}
            />
          )
        default:
          return null
      }
    }

    return (
      <div>
        <div className={`bg-gradient-to-br ${badge.gradient} opacity-60 rounded-full inline-block`} />
        <div className="inline-block animate-pulse" style={{ animationDuration: "3s" }}>
          {getBadgeIconComponent()}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        {!isAutoScrolling && <Header />}
        <main className="flex-1 flex items-center justify-center">
          <SiteLoader size="lg" />
        </main>
        <Footer />
      </div>
    )
  }

  if (topStudents.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        {!isAutoScrolling && <Header />}
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-[#1a2332] mb-4">{circleName}</h1>
            <p className="text-xl text-gray-600">لا يوجد طلاب مسجلين في هذه الحلقة حالياً</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {!isAutoScrolling && <Header />}

      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-[#d8a355]" />
              <div
                className="w-2.5 h-2.5 rounded-full bg-[#d8a355] animate-pulse"
                style={{ animationDuration: "2s" }}
              />
              <div className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-[#d8a355]" />
            </div>

            <div className="relative inline-block">
              <div className="absolute inset-0 bg-[#d8a355]/5 blur-3xl rounded-full" />
              <h1 className="relative text-4xl md:text-5xl lg:text-6xl font-bold text-[#00312e] px-6 py-2 leading-tight">
                {circleName}
              </h1>
            </div>

            <div className="flex items-center justify-center gap-4 mt-6">
              <div className="h-px w-16 sm:w-24 bg-gradient-to-r from-transparent to-[#d8a355]" />
              <div
                className="w-2.5 h-2.5 rounded-full bg-[#d8a355] animate-pulse"
                style={{ animationDuration: "2s", animationDelay: "1s" }}
              />
              <div className="h-px w-16 sm:w-24 bg-gradient-to-l from-transparent to-[#d8a355]" />
            </div>
          </div>

          <TooltipProvider>
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 gap-3">
                {topStudents.map((student, index) => {
                  const themeColors = getThemeColors(student.preferred_theme)
                  const themeType = getThemeType(student.preferred_theme)

                  const cardEffect = applyCardEffect(
                    student.active_effect,
                    "group relative rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 hover:border-opacity-70",
                  )

                  const isPremiumTheme = ["dawn", "galaxy", "sunset_gold", "ocean_deep"].includes(
                    student.preferred_theme || "",
                  )

                  return (
                    <div key={student.id}>
                      <div
                        className={cardEffect.className}
                        style={{
                          ...(isPremiumTheme
                            ? {
                                backgroundColor: "rgba(245, 245, 240, 0.95)",
                                borderColor: themeColors.primary,
                                borderWidth: "3px",
                                backgroundImage: `
                                  linear-gradient(90deg, ${themeColors.primary}08 1px, transparent 1px),
                                  linear-gradient(${themeColors.primary}08 1px, transparent 1px),
                                  radial-gradient(circle at 10% 20%, ${themeColors.primary}05 0%, transparent 50%)
                                `,
                                backgroundSize: "20px 20px, 20px 20px, 100% 100%",
                              }
                            : {
                                backgroundColor: `${themeColors.primary}10`,
                                borderColor: `${themeColors.primary}50`,
                                backgroundImage: `radial-gradient(circle at 20% 80%, ${themeColors.primary}08 0%, transparent 50%),
                                                  radial-gradient(circle at 80% 20%, ${themeColors.secondary}06 0%, transparent 50%)`,
                              }),
                          ...cardEffect.style,
                        }}
                      >
                        {cardEffect.extraElements}

                        {isPremiumTheme && <ThemeDecorations theme={student.preferred_theme} />}

                        <div
                          className="absolute top-0 left-0 w-full h-1.5 md:h-2"
                          style={{
                            backgroundImage: isPremiumTheme
                              ? `linear-gradient(to right, ${themeColors.primary}, ${themeColors.secondary}, ${themeColors.primary})`
                              : `linear-gradient(to right, ${themeColors.primary}, ${themeColors.secondary})`,
                          }}
                        />

                        <div className="p-3 md:p-6 flex items-center gap-3 md:gap-6 relative z-10">
                          <div className="relative flex-shrink-0">
                            <svg
                              width="45"
                              height="52"
                              viewBox="0 0 80 92"
                              className="md:w-[60px] md:h-[70px] group-hover:scale-110 transition-transform duration-300"
                            >
                              <defs>
                                <linearGradient id={`grad-${student.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor={themeColors.primary} />
                                  <stop offset="50%" stopColor={themeColors.secondary} />
                                  <stop offset="100%" stopColor={themeColors.tertiary} />
                                </linearGradient>
                              </defs>
                              <path
                                d="M40 2 L75 23.5 L75 68.5 L40 90 L5 68.5 L5 23.5 Z"
                                fill={`url(#grad-${student.id})`}
                                stroke={themeColors.tertiary}
                                strokeWidth="2"
                              />
                              <text
                                x="40"
                                y="55"
                                textAnchor="middle"
                                fill="white"
                                fontSize="32"
                                fontWeight="bold"
                                fontFamily="system-ui"
                              >
                                {index + 1}
                              </text>
                            </svg>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-center gap-2 md:gap-3 mb-1 md:mb-2">
                              <h3
                                className="text-lg md:text-2xl font-bold transition-colors duration-300 text-[#023232] group-hover:text-[#1a3a3a]"
                                style={{ fontFamily: getFontFamily(student.font_family) }}
                              >
                                {student.name}
                              </h3>
                              {getBadgeIcon(student.id) && (
                                <div className="flex-shrink-0 scale-75 md:scale-100">
                                  {getBadgeIcon(student.id)}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 md:gap-2 justify-center mt-1 md:mt-2">
                              {student.badges?.map((badge, idx) => (
                                <div key={idx} className="scale-75 md:scale-100">
                                  {renderBadge(badge)}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="relative">
                            <div
                              className="flex flex-col items-center rounded-xl md:rounded-2xl px-3 py-2 md:px-6 md:py-3 shadow-inner bg-white border-2 md:border-4"
                              style={{
                                borderColor: themeColors.primary,
                              }}
                            >
                              <div className="text-xl md:text-3xl font-bold leading-none text-[#023232]">
                                {student.points || 0}
                              </div>
                              <div className="text-[10px] md:text-xs font-bold mt-0.5 md:mt-1 tracking-wide text-gray-600">
                                نقطة
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </TooltipProvider>
        </div>
      </main>

            <button
        onClick={() => setIsAutoScrolling(!isAutoScrolling)}
        className={`fixed bottom-6 left-6 w-8 h-8 rounded-full shadow-2xl transition-all duration-300 z-50 flex items-center justify-center ${
          isAutoScrolling 
            ? "bg-red-500 hover:bg-red-600 text-white" 
            : "bg-[#d8a355] hover:bg-[#c99347] text-white opacity-50 hover:opacity-100"
        }`}
        title={isAutoScrolling ? "إيقاف العرض" : "شاشة عرض"}
      >
        {isAutoScrolling ? <X size={16} /> : <MonitorPlay size={16} />}
      </button>

      {!isAutoScrolling && <Footer />}

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Amiri:wght@400;700&family=Tajawal:wght@400;700&family=Changa:wght@400;700&display=swap");

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes fly {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-8px) translateX(4px);
          }
          50% {
            transform: translateY(-4px) translateX(-4px);
          }
          75% {
            transform: translateY(-10px) translateX(2px);
          }
        }
        @keyframes sway {
          0%,
          100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(5deg);
          }
        }
        @keyframes twinkle {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          25% {
            opacity: 0.8;
            transform: scale(0.95);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          75% {
            opacity: 0.9;
            transform: scale(0.98);
          }
        }
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes glow {
          0%,
          100% {
            opacity: 1;
            filter: brightness(1);
          }
          50% {
            opacity: 0.7;
            filter: brightness(1.3);
          }
        }
        @keyframes wave {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        @keyframes flicker {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          25% {
            opacity: 0.8;
            transform: scale(0.95);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          75% {
            opacity: 0.9;
            transform: scale(0.98);
          }
        }
        @keyframes bounce {
          0%,
          20%,
          50%,
          80%,
          100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-30px);
          }
          60% {
            transform: translateY(-15px);
          }
        }
      `}</style>
    </div>
  )
}
