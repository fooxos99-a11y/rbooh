"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { SiteLoader } from "@/components/ui/site-loader"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Award, Calendar, Star, MonitorPlay, X} from "lucide-react"
import { useEffect, useState } from "react"

interface Student {
  id: string
  name: string
  rank: number
  badges?: string[]
  points: number
  preferred_theme?: string // Added preferred_theme field
}

const renderBadge = (badgeType: string) => {
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
  console.log("[v0] Getting theme colors for:", preferredTheme || "beige (default)")

  const themeMap: Record<string, { primary: string; secondary: string; tertiary: string }> = {
    beige: { primary: "#C9A86A", secondary: "#D4AF6A", tertiary: "#B89858" },
    ocean: { primary: "#0EA5E9", secondary: "#0284C7", tertiary: "#0284C7" },
    sunset: { primary: "#F97316", secondary: "#EA580C", tertiary: "#EA580C" },
    forest: { primary: "#22C55E", secondary: "#16A34A", tertiary: "#16A34A" },
    purple: { primary: "#A855F7", secondary: "#9333EA", tertiary: "#9333EA" },
  }

  return themeMap[preferredTheme || "beige"] || themeMap.beige
}

const isForestTheme = (theme?: string) => theme === "forest"

const ForestLeaves = () => (
  <>
    {/* ورقة شجر علوية يسار */}
    <div className="absolute -top-2 -left-2 w-8 h-8 opacity-30 pointer-events-none">
      <svg viewBox="0 0 24 24" fill="#22C55E">
        <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
      </svg>
    </div>
    {/* ورقة شجر سفلية يمين */}
    <div className="absolute -bottom-3 -right-3 w-16 h-16 opacity-25 pointer-events-none rotate-45">
      <svg viewBox="0 0 24 24" fill="#16A34A">
        <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
      </svg>
    </div>
    {/* ورقة صغيرة وسط */}
    <div className="absolute top-1/2 right-4 w-8 h-8 opacity-20 pointer-events-none -rotate-12">
      <svg viewBox="0 0 24 24" fill="#22C55E">
        <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
      </svg>
    </div>
    {/* تأثير ورق الشجر */}
    <div className="relative w-32 h-20 overflow-hidden">
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          background: "linear-gradient(135deg, rgba(240, 253, 244, 1), rgba(220, 252, 231, 1))",
        }}
      >
        {[
          { top: "14%", right: "16%", size: "17px", delay: "0s", animation: "leaf-float" },
          { top: "24%", left: "34%", size: "15px", delay: "0.6s", animation: "leaf-drift" },
          { top: "46%", left: "46%", size: "19px", delay: "1.2s", center: true, animation: "leaf-sway" },
          { bottom: "16%", left: "24%", size: "13px", delay: "1.8s", animation: "leaf-float" },
          { bottom: "26%", right: "26%", size: "21px", delay: "2.4s", animation: "leaf-drift" },
        ].map((leaf, i) => (
          <div
            key={i}
            className={`absolute animate-${leaf.animation}`}
            style={{
              ...(leaf.center
                ? { top: leaf.top, left: leaf.left, transform: "translate(-50%, -50%)" }
                : { top: leaf.top, right: leaf.right, left: leaf.left, bottom: leaf.bottom }),
              fontSize: leaf.size,
              animationDelay: leaf.delay,
              filter: "hue-rotate(0deg) saturate(1.3)",
            }}
          >
            🍃
          </div>
        ))}
      </div>
    </div>
  </>
)

export default function MusabHalaqahPage() {
  const [topStudents, setTopStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)

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
    const fetchStudents = async () => {
      try {
        const [studentsRes, themesRes] = await Promise.all([
          fetch("/api/students?circle=مصعب بن عمير"),
          fetch("/api/themes", { cache: "no-store" }),
        ])

        let themes: Record<string, string> = {}
        if (themesRes.ok) {
          const themesData = await themesRes.json()
          themes = themesData.themes || {}
          console.log("[v0] Themes loaded:", themes)
        }

        if (studentsRes.ok) {
          const data = await studentsRes.json()
          const studentsWithThemes = data.students.map((student: Student) => ({
            ...student,
            preferred_theme: themes[student.id] || "beige",
          }))

          const sorted = studentsWithThemes
            .sort((a: Student, b: Student) => (b.points || 0) - (a.points || 0))
            .slice(0, 10)

          console.log("[v0] Students with themes:", sorted)
          setTopStudents(sorted)
        }
      } catch (error) {
        console.error("[v0] Error fetching students:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [])

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
            <h1 className="text-4xl font-bold text-[#023232] mb-4">حلقة مصعب بن عمير</h1>
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
                حلقة مصعب بن عمير
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
              <div className="grid grid-cols-1 gap-6">
                {topStudents.map((student, index) => {
                  const themeColors = getThemeColors(student.preferred_theme)
                  const isForest = isForestTheme(student.preferred_theme)

                  return (
                    <div
                      key={student.id}
                      className={`group relative rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 hover:border-opacity-70 ${
                        isForest ? "shadow-[0_8px_30px_rgba(34,197,94,0.3)]" : ""
                      }`}
                      style={{
                        backgroundColor: isForest ? "#f0fdf4" : `${themeColors.primary}10`,
                        borderColor: isForest ? "#22C55E" : `${themeColors.primary}50`,
                        ...(isForest && {
                          backgroundImage: `radial-gradient(circle at 20% 80%, rgba(34,197,94,0.08) 0%, transparent 50%),
                                           radial-gradient(circle at 80% 20%, rgba(22,163,74,0.06) 0%, transparent 50%)`,
                        }),
                      }}
                    >
                      <div
                        className={`absolute top-0 left-0 w-full h-2 ${isForest ? "h-3" : ""}`}
                        style={{
                          backgroundImage: isForest
                            ? `linear-gradient(to right, #22C55E 0%, #16A34A 25%, #22C55E 50%, #16A34A 75%, #22C55E 100%)`
                            : `linear-gradient(to right, ${themeColors.primary}, ${themeColors.secondary}, ${themeColors.primary})`,
                        }}
                      />

                      {isForest && <ForestLeaves />}

                      <div className="p-3 sm:p-8 flex flex-col sm:flex-row items-center gap-3 sm:gap-8">
                        <div className="relative flex-shrink-0 mb-2 sm:mb-0">
                          <svg
                            width="80"
                            height="92"
                            viewBox="0 0 80 92"
                            className={`group-hover:scale-110 transition-transform duration-300 ${isForest ? "drop-shadow-[0_4px_12px_rgba(34,197,94,0.5)]" : ""}`}
                          >
                            <defs>
                              <linearGradient id={`grad-${student.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor={themeColors.primary} />
                                <stop offset="50%" stopColor={themeColors.secondary} />
                                <stop offset="100%" stopColor={themeColors.tertiary} />
                              </linearGradient>
                              {isForest && (
                                <filter id={`forest-shadow-${student.id}`} x="-50%" y="-50%" width="200%" height="200%">
                                  <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                                  <feOffset dx="0" dy="4" result="offsetblur" />
                                  <feComponentTransfer>
                                    <feFuncA type="linear" slope="0.4" />
                                  </feComponentTransfer>
                                  <feMerge>
                                    <feMergeNode />
                                    <feMergeNode in="SourceGraphic" />
                                  </feMerge>
                                </filter>
                              )}
                            </defs>
                            <path
                              d="M40 2 L75 23.5 L75 68.5 L40 90 L5 68.5 L5 23.5 Z"
                              fill={`url(#grad-${student.id})`}
                              stroke={themeColors.tertiary}
                              strokeWidth="2"
                              filter={isForest ? `url(#forest-shadow-${student.id})` : undefined}
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

                        <div className="flex-1 min-w-0 w-full flex flex-col items-center">
                          <h3
                            className={`text-xl sm:text-2xl font-bold mb-1 sm:mb-2 text-center transition-colors duration-300 ${
                              isForest
                                ? "text-[#166534] group-hover:text-[#14532d]"
                                : "text-[#023232] group-hover:text-[#1a3a3a]"
                            }`}
                          >
                            {student.name}
                          </h3>
                          <div className="flex flex-wrap gap-1 sm:gap-2 justify-center mt-2 sm:mt-3">
                            {student.badges?.map((badge, idx) => (
                              <div key={idx}>{renderBadge(badge)}</div>
                            ))}
                          </div>
                        </div>

                        <div
                          className={`flex flex-col items-center rounded-2xl px-6 py-3 sm:px-8 sm:py-4 border-2 shadow-inner mt-2 sm:mt-0 w-full sm:w-auto ${
                            isForest ? "shadow-[inset_0_2px_8px_rgba(22,163,74,0.2)]" : ""
                          }`}
                          style={{
                            backgroundColor: isForest ? "#dcfce7" : `${themeColors.primary}20`,
                            borderColor: isForest ? "#22C55E" : `${themeColors.primary}40`,
                          }}
                        >
                          <div
                            className={`text-2xl sm:text-4xl font-bold leading-none ${isForest ? "text-[#166534]" : "text-[#023232]"}`}
                          >
                            {student.points || 0}
                          </div>
                          <div
                            className={`text-xs font-bold mt-1 sm:mt-2 tracking-wide ${isForest ? "text-[#15803d]" : "text-gray-600"}`}
                          >
                            نقطة
                          </div>
                        </div>
                      </div>

                      {isForest ? (
                        <>
                          <div
                            className="absolute bottom-0 right-0 w-32 h-32 rounded-tl-full opacity-10"
                            style={{
                              background: `radial-gradient(circle at bottom right, #22C55E, #16A34A, transparent)`,
                            }}
                          />
                          <div
                            className="absolute top-0 left-0 w-24 h-24 rounded-br-full opacity-10"
                            style={{
                              background: `radial-gradient(circle at top left, #16A34A, #22C55E, transparent)`,
                            }}
                          />
                        </>
                      ) : (
                        <>
                          <div
                            className="absolute bottom-0 right-0 w-24 h-24 rounded-tl-full opacity-15"
                            style={{
                              background: `linear-gradient(to top left, ${themeColors.tertiary}, transparent)`,
                            }}
                          />
                          <div
                            className="absolute top-0 left-0 w-16 h-16 rounded-br-full opacity-10"
                            style={{
                              background: `linear-gradient(to bottom right, ${themeColors.secondary}, transparent)`,
                            }}
                          />
                        </>
                      )}
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
    </div>
  )
}
