"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SiteLoader } from "@/components/ui/site-loader"
import { ShoppingBag } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { getSupabase } from "@/lib/supabase"
import { ThemeRankPreview } from "@/components/theme-rank-preview"

function StarCoinIcon({ size = 96, className = "" }: { size?: number; className?: string }) {
  const starPath = "M50 18 L58.5 35.5 L78 38.5 L64 52 L67.5 72 L50 62.5 L32.5 72 L36 52 L22 38.5 L41.5 35.5 Z"

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="coinOuter" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(35 26) rotate(48) scale(68)">
          <stop offset="0" stopColor="#FFF7A8" />
          <stop offset="0.42" stopColor="#FFD74F" />
          <stop offset="1" stopColor="#F0A300" />
        </radialGradient>
        <linearGradient id="coinInner" x1="18" y1="12" x2="84" y2="88" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F7DD69" />
          <stop offset="0.45" stopColor="#F0BB18" />
          <stop offset="1" stopColor="#E39B00" />
        </linearGradient>
        <linearGradient id="coinRim" x1="14" y1="12" x2="86" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFF8A6" />
          <stop offset="0.5" stopColor="#F7D64E" />
          <stop offset="1" stopColor="#F0AF17" />
        </linearGradient>
        <linearGradient id="starFill" x1="30" y1="20" x2="68" y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFDE6" />
          <stop offset="0.55" stopColor="#F8E98B" />
          <stop offset="1" stopColor="#E8C84A" />
        </linearGradient>
        <filter id="coinShadow" x="2" y="4" width="96" height="96" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#A85F00" floodOpacity="0.14" />
        </filter>
      </defs>

      <g filter="url(#coinShadow)">
        <circle cx="50" cy="50" r="45" fill="url(#coinOuter)" />
        <circle cx="50" cy="50" r="38" fill="url(#coinRim)" />
        <circle cx="50" cy="50" r="34" fill="url(#coinInner)" />

        <ellipse cx="42" cy="24" rx="17" ry="9" fill="#FFF9C9" opacity="0.28" />
        <path d="M17 20C24 16 36 12 49 12" stroke="#FFF6A8" strokeWidth="4" strokeLinecap="round" opacity="0.2" />

        <g transform="translate(50 50) scale(0.88) translate(-50 -50)">
          <path d={starPath} fill="#C77A00" opacity="0.38" transform="translate(1.6 2.6)" />
          <path d={starPath} fill="url(#starFill)" />
          <path d={starPath} stroke="#FFF8D1" strokeWidth="1.5" opacity="0.95" />
        </g>
      </g>
    </svg>
  )
}

export default function StorePage() {
  const [studentPoints, setStudentPoints] = useState(0)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [ownedThemes, setOwnedThemes] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    const initializeStore = async () => {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true"
      const role = localStorage.getItem("userRole")

      setUserRole(role)

      if (!loggedIn || role !== "student") {
        setIsLoading(false)
        return
      }

      try {
        await Promise.all([fetchStudentData(), fetchStoreData()])
      } finally {
        setIsLoading(false)
      }
    }

    void initializeStore()
  }, [])

  const fetchStudentData = async () => {
    try {
      const accountNumber = localStorage.getItem("accountNumber")
      const response = await fetch("/api/students")
      const data = await response.json()

      const student = data.students?.find((entry: any) => entry.account_number === Number(accountNumber))

      if (!student) {
        return
      }

      setStudentId(student.id)
      setStudentPoints(student.store_points || 0)
      await fetchOwnedThemes(student.id)
    } catch (error) {
      console.error("[store] Error fetching student data:", error)
    }
  }

  const fetchOwnedThemes = async (currentStudentId: string) => {
    const storageKey = `purchases_${currentStudentId}`
    const cachedEntries: string[] = JSON.parse(localStorage.getItem(storageKey) || "[]")
    const extractThemes = (entries: string[]) => entries.filter((entry) => entry.startsWith("theme_")).map((entry) => entry.replace("theme_", ""))

    try {
      const response = await fetch(`/api/purchases?student_id=${currentStudentId}`)
      const data = await response.json()
      const dbEntries: string[] = Array.isArray(data.purchases) ? data.purchases : []
      const mergedEntries = [...new Set([...cachedEntries, ...dbEntries])]

      localStorage.setItem(storageKey, JSON.stringify(mergedEntries))
      setOwnedThemes(extractThemes(mergedEntries))
    } catch (error) {
      console.error("[store] Error fetching purchases:", error)
      setOwnedThemes(extractThemes(cachedEntries))
    }
  }

  const fetchStoreData = async () => {
    const supabase = getSupabase()
    const { data: productsData } = await supabase.from("store_products").select("*")
    const { data: categoriesData } = await supabase.from("store_categories").select("*")
    setProducts(productsData || [])
    setCategories(categoriesData || [])
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <SiteLoader size="lg" />
      </div>
    )
  }

  if (userRole !== "student") {
    return (
      <div className="min-h-screen flex flex-col bg-white" dir="rtl">
        <Header />
        <main className="flex-1 py-12 px-4 sm:px-6 flex items-center justify-center">
          <div className="text-center max-w-md">
            <ShoppingBag className="w-16 h-16 text-[#d8a355] mx-auto mb-4" />
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

      <main className="flex-1 py-6 md:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-7xl">
          {/* Page Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
              <ShoppingBag className="w-6 h-6 md:w-8 md:h-8 text-[#d8a355]" />
              <h1 className="text-3xl md:text-5xl font-bold text-[#1a2332]">المتجر</h1>
            </div>
          </div>

          {/* Points Card */}
          <div className="relative bg-gradient-to-br from-[#00312e] via-[#023232] to-[#001a18] rounded-2xl md:rounded-3xl p-6 md:p-10 mb-8 md:mb-12 text-white shadow-2xl overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#d8a355]/10 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#d8a355]/8 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center justify-center gap-4 p-2 md:p-4 text-center">
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <div
                  className="shrink-0 translate-y-[1px] md:translate-y-[2px] drop-shadow-[0_4px_10px_rgba(216,163,85,0.16)]"
                  aria-hidden="true"
                >
                  <StarCoinIcon size={44} className="md:h-[52px] md:w-[52px] h-[44px] w-[44px]" />
                </div>

                <div
                  className="text-5xl md:text-6xl font-black leading-[0.9] tracking-[-0.03em]"
                  style={{ color: '#f5c96a', textShadow: '0 0 30px rgba(216,163,85,0.6), 0 2px 0 rgba(0,0,0,0.4)' }}
                >
                  {studentPoints}
                </div>
              </div>
            </div>
          </div>

          {/* Products by Category */}
          <div className="space-y-14 mb-8 md:mb-16">
            {categories.length === 0 ? (
              <div className="text-center text-gray-400 py-16">لا توجد فئات متاحة حالياً</div>
            ) : (
              [...categories].sort((a, b) => {
                if (a.name === "المظاهر") return 1;
                if (b.name === "المظاهر") return -1;
                return 0;
              }).map((category) => {
                const categoryProducts = products.filter((prod) => prod.category_id === category.id)
                return (
                  <div key={category.id}>
                    {/* Category Header */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#d8a355]/30" />
                      <div className="flex items-center gap-2 px-5 py-2 rounded-full border border-[#d8a355]/40 bg-[#fdf8f0]">
                        <ShoppingBag className="w-4 h-4 text-[#d8a355]" />
                        <h2 className="text-base md:text-lg font-bold text-[#1a2332]">{category.name}</h2>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#d8a355]/30" />
                    </div>

                    {categoryProducts.length === 0 ? (
                      <div className="text-center text-gray-300 py-8 text-sm">لا توجد منتجات في هذه الفئة</div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
                        {categoryProducts.map((prod) => (
                          <div key={prod.id} className="group flex flex-col bg-white rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg"
                            style={{ border: prod.theme_key ? '2px solid #d8a355' : '1px solid #e5e7eb' }}>

                            {/* Image / Theme Preview */}
                            {prod.theme_key ? (
                              <div className="p-3 md:p-4">
                                <ThemeRankPreview themeKey={prod.theme_key} />
                              </div>
                            ) : (
                              <div className="relative w-full bg-white flex items-center justify-center p-3 md:p-5 h-48 md:h-56">
                                {prod.image_url ? (
                                  <img src={prod.image_url} alt={prod.name}
                                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
                                ) : (
                                  <ShoppingBag className="w-16 h-16 text-gray-200" />
                                )}
                              </div>
                            )}

                            {/* Divider */}
                            <div className="h-px bg-gray-100 mx-3" />

                            {/* Info */}
                            <div className="flex flex-col flex-1 p-4 md:p-5 gap-3">
                              {/* Name */}
                              {!prod.theme_key && (
                                <p className="text-base md:text-lg font-semibold text-gray-800 leading-snug line-clamp-2 h-12 md:h-14">
                                  {prod.name}
                                </p>
                              )}

                              {/* Buy button */}
                              {prod.theme_key && ownedThemes.includes(prod.theme_key) ? (
                                <div
                                  className="w-full py-3.5 rounded-xl text-base md:text-lg font-bold mt-1 flex items-center justify-center gap-2 select-none"
                                  style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }}
                                >
                                  <span>✓</span>
                                  <span>تم الشراء</span>
                                </div>
                              ) : (
                              <button
                                className="w-full py-3.5 rounded-xl text-lg md:text-xl font-black transition-all duration-150 active:scale-95 hover:opacity-90 mt-1 flex items-center justify-center gap-2.5"
                                style={{ background: 'linear-gradient(135deg, #00352f 0%, #00453e 100%)', color: '#f5c96a' }}
                                onClick={async () => {
                                  const accountNumber = localStorage.getItem("accountNumber")
                                  const studentsRes = await fetch(`/api/students`)
                                  const studentsData = await studentsRes.json()
                                  const student = studentsData.students?.find((s: any) => s.account_number === Number(accountNumber))
                                  if (!student) {
                                    toast({ title: "خطأ", description: "لم يتم العثور على الطالب", variant: "destructive" })
                                    return
                                  }
                                  if ((student.store_points ?? 0) < prod.price) {
                                    toast({ title: "نقاط المتجر غير كافية", description: `لا تملك نقاط متجر كافية لشراء هذا المنتج`, variant: "destructive" })
                                    return
                                  }
                                  const res = await fetch("/api/store-orders", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      student_id: student.id,
                                      student_name: student.name,
                                      product_id: prod.id,
                                      product_name: prod.name,
                                      price: prod.price,
                                      theme_key: prod.theme_key,
                                    })
                                  })
                                  const data = await res.json()
                                  if (res.ok && data.success) {
                                    setStudentPoints(data.remaining_store_points)
                                    // حفظ المظهر في localStorage إذا كان المنتج مظهراً
                                    if (prod.theme_key && studentId) {
                                      const key = `purchases_${studentId}`
                                      const existing = JSON.parse(localStorage.getItem(key) || '[]')
                                      const themeEntry = `theme_${prod.theme_key}`
                                      if (!existing.includes(themeEntry)) {
                                        localStorage.setItem(key, JSON.stringify([...existing, themeEntry]))
                                      }
                                      setOwnedThemes(prev => [...new Set([...prev, prod.theme_key!])])
                                    }
                                    toast({ title: prod.theme_key ? "تم شراء المظهر بنجاح ✓ يمكنك تفعيله من ملفك الشخصي" : "تم الشراء بنجاح ✓" })
                                  } else {
                                    toast({ title: "فشل الشراء", description: data.error || "حدث خطأ غير متوقع", variant: "destructive" })
                                  }
                                }}
                              >
                                <StarCoinIcon size={24} className="h-[24px] w-[24px] flex-shrink-0" />
                                <span className="leading-none tracking-[-0.02em]">{prod.price}</span>
                              </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div className="-mt-4 md:-mt-6 mb-4 md:mb-6 ml-auto w-full max-w-3xl rounded-xl border border-[#d8a355]/20 bg-[#faf9f6] px-4 py-4 text-right shadow-sm md:px-5">
            <div className="space-y-2 text-xs leading-7 text-[#4b5563] md:text-[15px] md:leading-8">
              <p className="text-right">• استخدم نقاطك المكتسبة من التقييم والأنشطة لشراء المنتجات</p>
              <p className="text-right">• نقاط ملفك الشخصي وترتيبك في اللائحة لا تتأثر بالشراء</p>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
