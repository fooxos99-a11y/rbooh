"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, BarChart3, ChevronLeft, Users } from "lucide-react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { SiteLoader } from "@/components/ui/site-loader"
import { useAdminAuth } from "@/hooks/use-admin-auth"

type Circle = {
  name: string
  studentCount?: number
}

export default function AdminWeeklyReportsPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("التقارير")
  const [isLoading, setIsLoading] = useState(true)
  const [circles, setCircles] = useState<Circle[]>([])
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    async function fetchCircles() {
      try {
        setIsLoading(true)
        setError("")

        const response = await fetch(`/api/circles?t=${Date.now()}`, { cache: "no-store" })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data?.error || "تعذر تحميل الحلقات")
        }

        const rows = Array.isArray(data?.circles) ? data.circles : []
        setCircles(rows)
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "تعذر تحميل الحلقات"
        setError(message)
        setCircles([])
      } finally {
        setIsLoading(false)
      }
    }

    void fetchCircles()
  }, [])

  if (authLoading || !authVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader size="md" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] font-cairo" dir="rtl">
      <Header />
      <main className="px-4 py-10">
        <div className="container mx-auto max-w-6xl space-y-8">
          <div className="flex items-center justify-between gap-3 border-b border-[#e8dfcc] pb-6">
            <button
              type="button"
              onClick={() => router.push("/admin/dashboard")}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#dccba0] bg-white text-[#1a2332] shadow-sm transition hover:border-[#d8a355]"
              aria-label="العودة"
            >
              <ArrowRight className="h-4.5 w-4.5" />
            </button>
            <div className="text-right">
              <h1 className="text-3xl font-black text-[#1f2937]">تقارير الأسبوع</h1>
              <p className="mt-2 text-sm font-semibold text-[#6b7280]">اختر الحلقة لعرض تقريرها الأسبوعي الكامل.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-24">
              <SiteLoader size="lg" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          ) : circles.length === 0 ? (
            <div className="rounded-[28px] border border-[#e6dfcb] bg-white px-6 py-16 text-center text-lg font-bold text-[#7b8794] shadow-sm">
              لا توجد حلقات متاحة حاليًا.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {circles.map((circle) => (
                <Link
                  key={circle.name}
                  href={`/admin/statistics/circles/${encodeURIComponent(circle.name)}`}
                  className="group rounded-[28px] border border-[#dde6f0] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#d8a355] hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 text-right">
                      <div className="text-2xl font-black text-[#1f2937]">{circle.name}</div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-[#f8fafc] px-3 py-1.5 text-sm font-bold text-[#64748b]">
                        <Users className="h-4 w-4 text-[#6a8fbf]" />
                        <span>{new Intl.NumberFormat("ar-SA").format(circle.studentCount ?? 0)} طالب</span>
                      </div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef6ff] text-[#2563eb] transition group-hover:bg-[#d8a355]/15 group-hover:text-[#b7791f]">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-dashed border-[#e5e7eb] pt-4 text-sm font-black text-[#1f2937]">
                    <span>فتح التقرير</span>
                    <ChevronLeft className="h-4 w-4 text-[#94a3b8] transition group-hover:-translate-x-1 group-hover:text-[#d8a355]" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
