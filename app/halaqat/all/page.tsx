"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SiteLoader } from "@/components/ui/site-loader"
import { MonitorPlay, X } from "lucide-react"
import { StudentRankCard } from "@/components/student-rank-card"

type StudentRow = {
  id: string
  points?: number | null
  halaqah?: string | null
}

type CircleRank = {
  name: string
  points: number
  students: number
}

export default function AllCirclesPage() {
  const [loading, setLoading] = useState(true)
  const [circles, setCircles] = useState<CircleRank[]>([])
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)

  useEffect(() => {
    if (!isAutoScrolling) {
      return
    }

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
    async function fetchAllCircles() {
      try {
        const response = await fetch("/api/students", { cache: "no-store" })
        const data = await response.json()
        const students = (data.students ?? []) as StudentRow[]
        const circleTotals = new Map<string, CircleRank>()

        for (const student of students) {
          const circleName = student.halaqah?.trim()
          if (!circleName) {
            continue
          }

          const currentCircle = circleTotals.get(circleName) ?? {
            name: circleName,
            points: 0,
            students: 0,
          }

          currentCircle.points += Number(student.points ?? 0)
          currentCircle.students += 1
          circleTotals.set(circleName, currentCircle)
        }

        const rankedCircles = Array.from(circleTotals.values()).sort((left, right) => {
          if (right.points !== left.points) {
            return right.points - left.points
          }

          if (right.students !== left.students) {
            return right.students - left.students
          }

          return left.name.localeCompare(right.name, "ar")
        })

        setCircles(rankedCircles)
      } catch (error) {
        console.error("Error fetching all circles:", error)
        setCircles([])
      } finally {
        setLoading(false)
      }
    }

    void fetchAllCircles()
  }, [])

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

  if (circles.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-white" dir="rtl">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-[#1a2332] mb-4">أفضل الحلقات</h1>
            <p className="text-xl text-gray-600">لا توجد حلقات تحتوي على نقاط حالياً</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      {!isAutoScrolling && <Header />}

      <main className="flex-1 py-8 md:py-16">
        <div className="container mx-auto px-3 md:px-4">
          <div className="mb-8 text-center md:mb-16">
            <h1 className="text-3xl font-black text-[#173d3a] md:text-5xl">أفضل الحلقات</h1>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 gap-3 md:gap-4">
              {circles.map((circle, index) => (
                <Link key={circle.name} href={`/halaqat/${encodeURIComponent(circle.name)}`} className="block">
                  <StudentRankCard rank={index + 1} name={circle.name} points={circle.points || 0} scope="all-circles" className="cursor-pointer" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      <button
        onClick={() => setIsAutoScrolling(!isAutoScrolling)}
        className={`fixed bottom-6 left-6 w-8 h-8 rounded-full shadow-2xl transition-all duration-300 z-50 flex items-center justify-center ${
          isAutoScrolling
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-[#d8a355] hover:bg-[#c99347] text-white opacity-50 hover:opacity-100"
        }`}
        title={isAutoScrolling ? "إيقاف النزول التلقائي" : "تشغيل النزول التلقائي (وضع شاشة العرض)"}
      >
        {isAutoScrolling ? <X size={16} /> : <MonitorPlay size={16} />}
      </button>

      {!isAutoScrolling && <Footer />}
    </div>
  )
}