"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SiteLoader } from "@/components/ui/site-loader"
import { ArrowRight, Star, Check, BookOpen } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const BACKGROUNDS = [
  {
    id: "theme_beige_default",
    name: "الافتراضي",
    price: 0,
    themeValue: "beige_default",
    gradient: "linear-gradient(135deg, #f5f1e8 0%, #e8ddc8 100%)",
    isFree: true,
  },
  {
    id: "theme_bats",
    name: "أسود",
    price: 1000,
    themeValue: "bats",
    gradient: "linear-gradient(135deg, #000000 0%, #1a1a1a 100%)",
    isFree: false,
  },
  {
    id: "theme_fire",
    name: "برتقالي",
    price: 1000,
    themeValue: "fire",
    gradient: "linear-gradient(135deg, #ea580c 0%, #dc2626 100%)",
    isFree: false,
  },
  {
    id: "theme_snow",
    name: "سماوي",
    price: 1000,
    themeValue: "snow",
    gradient: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
    isFree: false,
  },
  {
    id: "theme_leaves",
    name: "أخضر",
    price: 1000,
    themeValue: "leaves",
    gradient: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
    isFree: false,
  },
  {
    id: "theme_royal",
    name: "أرجواني",
    price: 1000,
    themeValue: "royal",
    gradient: "linear-gradient(135deg, #9333ea 0%, #a855f7 50%, #d946ef 100%)",
    isFree: false,
  },
  {
    id: "theme_dawn",
    name: "الفجر",
    price: 2500,
    themeValue: "dawn",
    gradient: "linear-gradient(135deg, #fbbf24 0%, #fcd34d 20%, #f59e0b 40%, #d97706 60%, #b45309 80%, #78350f 100%)",
    isFree: false,
  },
  {
    id: "theme_galaxy",
    name: "المجرة",
    price: 2500,
    themeValue: "galaxy",
    gradient: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 20%, #7c3aed 40%, #a78bfa 60%, #c4b5fd 80%, #ddd6fe 100%)",
    isFree: false,
  },
  {
    id: "theme_sunset_gold",
    name: "الغروب الذهبي",
    price: 2500,
    themeValue: "sunset_gold",
    gradient: "linear-gradient(135deg, #fef3c7 0%, #fcd34d 20%, #f59e0b 40%, #d97706 60%, #b45309 80%, #78350f 100%)",
    isFree: false,
  },
  {
    id: "theme_ocean_deep",
    name: "أعماق المحيط",
    price: 2500,
    themeValue: "ocean_deep",
    gradient: "linear-gradient(135deg, #0c4a6e 0%, #075985 20%, #0369a1 40%, #0284c7 60%, #06b6d4 80%, #22d3ee 100%)",
    isFree: false,
  },
]

export default function BackgroundsPage() {
  const [studentPoints, setStudentPoints] = useState(0)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [purchases, setPurchases] = useState<string[]>([])
  const [activeTheme, setActiveTheme] = useState<string>("beige_default")
  const [purchasedNotActivated, setPurchasedNotActivated] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")

    if (!loggedIn || userRole !== "student") {
      setIsLoading(false)
    } else {
      fetchStudentData()
    }
  }, [])

  const fetchStudentData = async () => {
    try {
      const accountNumber = localStorage.getItem("accountNumber")
      const response = await fetch(`/api/students`)
      const data = await response.json()

      const student = data.students?.find((s: any) => s.account_number === Number(accountNumber))

      if (student) {
        setStudentId(student.id)
        setStudentPoints(student.points || 0)
        await fetchPurchases(student.id)
        await fetchActiveTheme(student.id)
      }
    } catch (error) {
      console.error("[v0] Error fetching student data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPurchases = async (studentId: string) => {
    // Always start with localStorage cache so purchases are never lost
    const cached: string[] = JSON.parse(localStorage.getItem(`purchases_${studentId}`) || '[]')
    const notActivatedCached: string[] = JSON.parse(localStorage.getItem(`bg_not_activated_${studentId}`) || '[]')
    try {
      const response = await fetch(`/api/purchases?student_id=${studentId}`)
      const data = await response.json()
      // Merge DB + cache (union) so neither source can erase the other
      const dbPurchases: string[] = Array.isArray(data.purchases) ? data.purchases : []
      const merged = [...new Set([...cached, ...dbPurchases])]
      setPurchases(merged)
      localStorage.setItem(`purchases_${studentId}`, JSON.stringify(merged))
      // Items waiting activation: in cache but not yet in merged DB purchases
      const pending = notActivatedCached.filter((id: string) => !merged.includes(id) || !dbPurchases.includes(id))
      setPurchasedNotActivated(pending)
    } catch (error) {
      console.error("[v0] Error fetching purchases:", error)
      // Fallback: use localStorage cache as-is
      setPurchases(cached)
      setPurchasedNotActivated(notActivatedCached)
    }
  }

  const fetchActiveTheme = async (studentId: string) => {
    try {
      const response = await fetch(`/api/themes?studentId=${studentId}`)
      const data = await response.json()
      if (data.theme) {
        setActiveTheme(data.theme)
        console.log("[v0] Active theme loaded:", data.theme)
      } else {
        setActiveTheme("beige_default")
        console.log("[v0] No theme found, using default")
      }
    } catch (error) {
      console.error("[v0] Error fetching active theme:", error)
      setActiveTheme("beige_default")
    }
  }

  const handlePurchase = async (product: (typeof BACKGROUNDS)[0]) => {
    if (!studentId) return

    if (product.isFree) {
      const response = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          theme: product.themeValue,
        }),
      })

      if (response.ok) {
        setActiveTheme(product.themeValue)
        console.log("[v0] Theme activated:", product.themeValue)
        toast({
          title: "تم التفعيل",
          description: "تم تفعيل الثيم",
        })
      }
      return
    }

    if (purchases.includes(product.id)) {
      const response = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          theme: product.themeValue,
        }),
      })

      if (response.ok) {
        setActiveTheme(product.themeValue)
        console.log("[v0] Theme activated:", product.themeValue)
        toast({
          title: "تم التفعيل",
          description: `تم تفعيل ${product.name}`,
        })
      }
      return
    }

    if (studentPoints < product.price) {
      toast({
        title: "نقاط غير كافية",
        description: `تحتاج ${product.price - studentPoints} نقطة إضافية`,
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          product_id: product.id,
          price: product.price,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setStudentPoints(result.remaining_points)

        // Update purchases state + localStorage immediately as cache (survives API failures on refresh)
        const updatedPurchases = [...purchases, product.id]
        setPurchases(updatedPurchases)
        localStorage.setItem(`purchases_${studentId}`, JSON.stringify(updatedPurchases))

        const updatedNotActivated = [...purchasedNotActivated, product.id]
        setPurchasedNotActivated(updatedNotActivated)
        localStorage.setItem(`bg_not_activated_${studentId}`, JSON.stringify(updatedNotActivated))
        toast({
          title: "تم الشراء بنجاح!",
          description: "يرجى الضغط على 'تفعيل' لتفعيل الخلفية",
        })
      } else {
        const err = await response.json()
        toast({
          title: "خطأ",
          description: err.error || "فشل الشراء",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error purchasing:", error)
      toast({
        title: "خطأ",
        description: "فشل الشراء",
        variant: "destructive",
      })
    }
  }

  const handleActivate = async (product: (typeof BACKGROUNDS)[0]) => {
    if (!studentId) return

    try {
      const response = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          theme: product.themeValue,
        }),
      })

      if (response.ok) {
        const updatedNotActivated = purchasedNotActivated.filter((id) => id !== product.id)
        setPurchasedNotActivated(updatedNotActivated)
        localStorage.setItem(`bg_not_activated_${studentId}`, JSON.stringify(updatedNotActivated))

        // Sync with DB but MERGE (never overwrite) local cache
        try {
          const res = await fetch(`/api/purchases?student_id=${studentId}`)
          const data = await res.json()
          const currentCached: string[] = JSON.parse(localStorage.getItem(`purchases_${studentId}`) || '[]')
          const dbPurchases: string[] = Array.isArray(data.purchases) ? data.purchases : []
          const merged = [...new Set([...currentCached, ...dbPurchases])]
          setPurchases(merged)
          localStorage.setItem(`purchases_${studentId}`, JSON.stringify(merged))
        } catch (_) { /* keep existing state on error */ }

        setActiveTheme(product.themeValue)
        console.log("[v0] Theme activated:", product.themeValue)
        toast({
          title: "تم التفعيل",
          description: `تم تفعيل ${product.name}`,
        })
      }
    } catch (error) {
      console.error("[v0] Error activating theme:", error)
      toast({
        title: "خطأ",
        description: "فشل التفعيل",
        variant: "destructive",
      })
    }
  }

  const renderThemePreview = (themeValue: string) => {
    const themeMap: Record<string, { name: string; primary: string; secondary: string; tertiary: string }> = {
      beige_default: { name: "الافتراضي", primary: "#d8a355", secondary: "#c99347", tertiary: "#b88a3d" },
      bats: { name: "أسود", primary: "#000000", secondary: "#1a1a1a", tertiary: "#2a2a2a" },
      fire: { name: "برتقالي", primary: "#ea580c", secondary: "#dc2626", tertiary: "#b91c1c" },
      snow: { name: "سماوي", primary: "#0284c7", secondary: "#0369a1", tertiary: "#0c4a6e" },
      leaves: { name: "أخضر", primary: "#22c55e", secondary: "#16a34a", tertiary: "#15803d" },
      royal: { name: "أرجواني", primary: "#9333ea", secondary: "#a855f7", tertiary: "#d946ef" },
      dawn: { name: "الفجر", primary: "#fbbf24", secondary: "#f97316", tertiary: "#dc2626" },
      galaxy: { name: "المجرة", primary: "#7c3aed", secondary: "#a78bfa", tertiary: "#c4b5fd" },
      sunset_gold: { name: "الغروب الذهبي", primary: "#f59e0b", secondary: "#d97706", tertiary: "#b45309" },
      ocean_deep: { name: "أعماق المحيط", primary: "#0284c7", secondary: "#06b6d4", tertiary: "#22d3ee" },
    }

    const theme = themeMap[themeValue]
    if (!theme) return null

    const isPremium = ["dawn", "galaxy", "sunset_gold", "ocean_deep"].includes(themeValue)

    if (isPremium) {
      return (
        <div
          className="relative w-full h-32 rounded-xl overflow-hidden border-[3px]"
          style={{
            backgroundColor: "rgba(245, 245, 240, 0.95)",
            borderColor: theme.primary,
            backgroundImage: `
              linear-gradient(90deg, ${theme.primary}08 1px, transparent 1px),
              linear-gradient(${theme.primary}08 1px, transparent 1px),
              radial-gradient(circle at 10% 20%, ${theme.primary}05 0%, transparent 50%)
            `,
            backgroundSize: "20px 20px, 20px 20px, 100% 100%",
          }}
        >
          {[...Array(20)].map((_, i) => (
            // إصلاح مشكلة hydration mismatch: توليد القيم عشوائية فقط على العميل
            <RandomStar key={i} />
          ))}
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`lines-${themeValue}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="20" y2="20" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#lines-${themeValue})`} />
          </svg>
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full border-2 border-white opacity-30" />
          <div className="absolute bottom-2 left-2 w-6 h-6 rounded-full border-2 border-white opacity-40" />
          <div className="absolute top-1/2 left-1/4 w-4 h-4 rounded-full bg-white opacity-20" />
          <div className="absolute inset-2 border border-white/30 rounded-lg" />
          <div
            className="absolute top-0 left-0 w-full h-2"
            style={{
              backgroundImage: `linear-gradient(to right, ${theme.primary}, ${theme.secondary}, ${theme.primary})`,
            }}
          />
          <style jsx>{`
            @keyframes twinkle {
              0%, 100% { opacity: 0.3; transform: scale(1); }
              50% { opacity: 0.8; transform: scale(1.2); }
            }
          `}</style>
        </div>
      )
    }

    return (
      <div
        className="relative w-full h-32 rounded-xl overflow-hidden border-2"
        style={{
          backgroundColor: `${theme.primary}10`,
          borderColor: `${theme.primary}50`,
          backgroundImage: `radial-gradient(circle at 20% 80%, ${theme.primary}08 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, ${theme.secondary}06 0%, transparent 50%)`,
        }}
      >
        <div
          className="absolute top-0 left-0 w-full h-2"
          style={{
            backgroundImage: `linear-gradient(to right, ${theme.primary}, ${theme.secondary}, ${theme.tertiary})`,
          }}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SiteLoader size="lg" />
      </div>
    )
  }

  const userRole = localStorage.getItem("userRole")
  if (!userRole || userRole !== "student") {
    return (
      <div className="min-h-screen flex flex-col bg-white" dir="rtl">
        <Header />
        <main className="flex-1 py-12 px-4 sm:px-6 flex items-center justify-center">
          <div className="text-center max-w-md">
            <BookOpen className="w-16 h-16 text-[#d8a355] mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-[#1a2332] mb-2">يظهر للطلاب فقط</h2>
            <p className="text-lg text-gray-600">هذا القسم متاح للطلاب المسجلين فقط</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <Header />
      <main className="flex-1 py-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-7xl">
          <button
            onClick={() => router.push("/store")}
            className="flex items-center gap-2 text-[#d8a355] hover:text-[#c99347] mb-8 font-semibold"
          >
            <ArrowRight className="w-5 h-5" />
            العودة للمتجر
          </button>
          <h1 className="text-4xl font-bold text-[#1a2332] mb-4">الخلفيات</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BACKGROUNDS.map((background, index) => {
              const isOwned = purchases.includes(background.id) || background.isFree
              const canAfford = background.isFree || studentPoints >= background.price
              const isActive = activeTheme === background.themeValue
              const waitingActivation = purchasedNotActivated.includes(background.id)

              return (
                <Card
                  key={background.id}
                  className={`overflow-hidden hover:shadow-lg transition-all relative border-2 ${
                    isActive ? "border-[#22C55E] shadow-lg ring-2 ring-[#22C55E33]" : "border-gray-200"
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-4 right-4 z-10 bg-[#22C55E] rounded-full p-2">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="mb-4">{renderThemePreview(background.themeValue)}</div>
                    <h3 className="text-xl font-bold text-[#1a2332] mb-2">{background.name}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-[#d8a355]" />
                        <span className="text-2xl font-bold text-[#1a2332]">
                          {background.isFree ? "مجاني" : background.price}
                        </span>
                      </div>
                      <Button
                        onClick={() =>
                          isActive ? null : waitingActivation ? handleActivate(background) : handlePurchase(background)
                        }
                        className={
                          isActive
                            ? "bg-[#22C55E] cursor-default text-white hover:bg-[#22C55E]"
                            : waitingActivation
                              ? "bg-[#d8a355] hover:bg-[#c99347] text-white"
                              : isOwned
                                ? "bg-[#d8a355] hover:bg-[#c99347] text-white"
                                : canAfford
                                  ? "bg-[#d8a355] hover:bg-[#c99347] text-white"
                                  : "bg-gray-300 cursor-not-allowed text-gray-600"
                        }
                      >
                        {isActive
                          ? "مُفعّل"
                          : waitingActivation
                            ? "تفعيل"
                            : isOwned
                              ? "تفعيل"
                              : canAfford
                                ? "شراء"
                                : "غير كافي"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
