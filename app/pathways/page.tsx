"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { BookOpen, Check, Lock, Star } from "lucide-react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { SiteLoader } from "@/components/ui/site-loader"

type PathwayLevel = {
  id: number
  title: string
  description: string
  week: number
  isLocked: boolean
  isCompleted: boolean
  points: number
  userPoints: number
}

type PathwayTestStatus = "pass" | "fail"

type StudentPathwayTest = {
  juzNumber: number
  status: PathwayTestStatus
  isCurrentlyMemorized: boolean
  lastLevelNumber: number | null
}

type LevelTestSummary = {
  passed: number[]
  failed: number[]
}

export default function PathwaysPage() {
  const [levels, setLevels] = useState<PathwayLevel[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [pathwayTests, setPathwayTests] = useState<StudentPathwayTest[]>([])

  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    )

    async function init() {
      try {
        const loggedIn = localStorage.getItem("isLoggedIn") === "true"
        const role = localStorage.getItem("userRole")

        if (!loggedIn) {
          router.push("/login")
          return
        }

        if (role !== "student") {
          setLevels([])
          setTotalPoints(0)
          setPathwayTests([])
          return
        }

        let studentId = localStorage.getItem("studentId")
        let studentHalaqah: string | null = null
        const currentUserStr = localStorage.getItem("currentUser")

        if (currentUserStr) {
          try {
            const currentUser = JSON.parse(currentUserStr)
            studentHalaqah = currentUser?.halaqah ?? null
            if (!studentId) {
              studentId = currentUser?.id || currentUser?.account_number || null
            }
          } catch {
            studentHalaqah = null
          }
        }

        if (!studentId) {
          setLevels([])
          setTotalPoints(0)
          setPathwayTests([])
          return
        }

        try {
          const { data: studentById } = await supabase
            .from("students")
            .select("id, halaqah")
            .eq("id", studentId)
            .maybeSingle()

          if (studentById) {
            studentId = studentById.id
            studentHalaqah = studentById.halaqah ?? studentHalaqah
          } else {
            const { data: studentByAccount } = await supabase
              .from("students")
              .select("id, halaqah")
              .eq("account_number", studentId)
              .maybeSingle()

            if (studentByAccount) {
              studentId = studentByAccount.id
              studentHalaqah = studentByAccount.halaqah ?? studentHalaqah
            }
          }
        } catch {
          // Ignore student lookup failures and continue with local fallback values.
        }

        const resolvedStudentId = String(studentId)
        let levelsFromApi: any[] = []

        try {
          const testsResponse = await fetch(`/api/admin-pathway-tests?student_id=${encodeURIComponent(resolvedStudentId)}`)
          const testsData = await testsResponse.json()

          if (testsResponse.ok && Array.isArray(testsData.displayJuzs)) {
            levelsFromApi = Array.isArray(testsData.levels) ? testsData.levels : []
            setPathwayTests(
              testsData.displayJuzs
                .filter((item: any) => item.latestResult)
                .map((item: any) => ({
                  juzNumber: item.juzNumber,
                  status: item.latestResult.status,
                  isCurrentlyMemorized: item.isCurrentlyMemorized,
                  lastLevelNumber: item.latestResult.lastLevelNumber ?? null,
                })),
            )
          } else {
            setPathwayTests([])
          }
        } catch {
          setPathwayTests([])
        }

        const levelsFromDb = levelsFromApi

        const { data: completions, error: completionsError } = await supabase
          .from("pathway_level_completions")
          .select("level_number, points")
          .eq("student_id", resolvedStudentId)

        if (completionsError) throw completionsError

        const completedMap: Record<number, number> = {}
        for (const completion of completions ?? []) {
          completedMap[completion.level_number] = completion.points
        }

        const processedLevels = levelsFromDb.map((level: any) => {
          const isCompleted = Object.prototype.hasOwnProperty.call(completedMap, level.level_number)
          return {
            id: level.level_number,
            title: level.title,
            description: level.description ?? "",
            week: level.level_number,
            isLocked: level.is_locked === true,
            isCompleted,
            points: level.points ?? 100,
            userPoints: isCompleted ? completedMap[level.level_number] : level.points ?? 100,
          }
        })

        setLevels(processedLevels)
        setTotalPoints(
          processedLevels.reduce((sum: number, level: PathwayLevel) => sum + (level.isCompleted ? level.userPoints || 0 : 0), 0),
        )
      } catch (error) {
        console.error("Error loading pathway data:", error)
        setLevels([])
        setTotalPoints(0)
        setPathwayTests([])
      } finally {
        setIsLoading(false)
      }
    }

    void init()
  }, [router])

  const completedLevels = levels.filter((level) => level.isCompleted).length
  const progressPercentage = levels.length > 0 ? (completedLevels / levels.length) * 100 : 0
  const pathwayTestsByLevel = pathwayTests.reduce<Record<number, LevelTestSummary>>((accumulator, item) => {
    if (!item.lastLevelNumber) return accumulator

    const summary = accumulator[item.lastLevelNumber] || { passed: [], failed: [] }
    if (item.status === "pass") {
      summary.passed.push(item.juzNumber)
    } else {
      summary.failed.push(item.juzNumber)
    }

    accumulator[item.lastLevelNumber] = summary
    return accumulator
  }, {})

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <SiteLoader size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <Header />

      <main className="flex-1 px-3 py-6 md:px-4 md:py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8 text-center md:mb-12">
            <div className="mb-3 flex items-center justify-center gap-2 md:mb-4 md:gap-3">
              <BookOpen className="h-6 w-6 text-[#d8a355] md:h-8 md:w-8" />
              <h1 className="text-3xl font-bold text-[#1a2332] md:text-5xl">المسار</h1>
            </div>
          </div>

          <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-[#00312e] via-[#023232] to-[#001a18] p-6 text-white shadow-2xl md:mb-12 md:rounded-3xl md:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 translate-x-1/4 -translate-y-1/2 rounded-full bg-[#d8a355]/10" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-36 w-36 -translate-x-1/4 translate-y-1/2 rounded-full bg-[#d8a355]/8" />

            <div className="relative z-10 grid grid-cols-1 items-center gap-6 md:grid-cols-3 md:gap-10">
              <div className="md:col-span-2">
                <div className="mb-4">
                  <p className="text-sm font-bold tracking-wide opacity-90 md:text-base">التقدم في المسار</p>
                </div>

                <div className="relative h-7 overflow-hidden rounded-full border border-white/10 bg-black/30 shadow-inner md:h-9">
                  <div
                    className="absolute right-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${progressPercentage}%`,
                      background: "linear-gradient(90deg, #b8843a 0%, #d8a355 50%, #f5c96a 100%)",
                      boxShadow: "0 0 18px 3px rgba(216,163,85,0.5)",
                    }}
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
                  </div>

                  {[25, 50, 75].map((milestone) => (
                    <div
                      key={milestone}
                      className="absolute bottom-1 top-1 w-px bg-white/20"
                      style={{ right: `${100 - milestone}%` }}
                    />
                  ))}
                </div>

                <div className="mt-2 flex justify-between px-1">
                  {[0, 25, 50, 75, 100].map((milestone) => (
                    <span key={milestone} className="text-[10px] font-medium opacity-40 md:text-xs">
                      {milestone}%
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-4 md:p-6">
                <Star
                  className="mb-4 h-12 w-12 fill-[#f4d03f] text-[#f4d03f] drop-shadow-[0_0_14px_rgba(244,208,63,0.5)] md:h-16 md:w-16"
                  strokeWidth={2.1}
                />
                <div
                  className="text-5xl font-black leading-none tracking-tight md:text-6xl"
                  style={{ color: "#f5c96a", textShadow: "0 0 30px rgba(216,163,85,0.6), 0 2px 0 rgba(0,0,0,0.4)" }}
                >
                  {totalPoints}
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="h-px w-6 bg-[#d8a355]/40" />
                  <p className="text-xs font-semibold tracking-widest opacity-70 md:text-sm">الإجمالي</p>
                  <div className="h-px w-6 bg-[#d8a355]/40" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6">
            {levels.map((level) => {
              const levelTestSummary = pathwayTestsByLevel[level.id] || { passed: [], failed: [] }
              const hasPassedTests = levelTestSummary.passed.length > 0
              const hasFailedTests = levelTestSummary.failed.length > 0
              const hasAnyTestResults = hasPassedTests || hasFailedTests
              const levelTestItems = [
                ...levelTestSummary.passed.map((juzNumber) => ({ juzNumber, status: "pass" as const })),
                ...levelTestSummary.failed.map((juzNumber) => ({ juzNumber, status: "fail" as const })),
              ].sort((left, right) => left.juzNumber - right.juzNumber)

              const statusBadgeClassName = hasPassedTests && !hasFailedTests
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : hasFailedTests && !hasPassedTests
                  ? "border-red-200 bg-red-50 text-red-600"
                  : ""

              const statusBadgeLabel = hasPassedTests && !hasFailedTests
                ? "ناجح"
                : hasFailedTests && !hasPassedTests
                  ? "راسب"
                  : null

              return (
                <div
                  key={level.id}
                  className={`group relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl transition-all duration-300 ${
                    level.isCompleted || level.isLocked ? "cursor-not-allowed" : "cursor-default"
                  }`}
                  style={{
                    background: level.isCompleted
                      ? "linear-gradient(160deg, #f5f0e8 0%, #efe8d8 100%)"
                      : level.isLocked
                        ? "linear-gradient(160deg, #f4f4f4 0%, #e8e8e8 100%)"
                        : "linear-gradient(160deg, #ffffff 0%, #fdf8f0 100%)",
                    border: level.isCompleted
                      ? "1.5px solid rgba(216,163,85,0.4)"
                      : level.isLocked
                        ? "1.5px solid rgba(0,0,0,0.08)"
                        : "1.5px solid rgba(216,163,85,0.35)",
                    boxShadow: level.isLocked ? "none" : "0 2px 12px rgba(216,163,85,0.08)",
                  }}
                >
                  <div
                    className="h-1 w-full"
                    style={{
                      background: level.isCompleted
                        ? "linear-gradient(90deg, #d8a355, #f5c96a, #d8a355)"
                        : level.isLocked
                          ? "#d1d5db"
                          : "linear-gradient(90deg, #d8a355, #f5c96a)",
                      opacity: level.isLocked ? 0.5 : 1,
                    }}
                  />

                  <div className="flex flex-1 flex-col p-5 md:p-6">
                    <div className="mb-3 flex items-start justify-between">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-black md:h-14 md:w-14 md:text-2xl"
                        style={{
                          background: level.isCompleted
                            ? "linear-gradient(145deg, #d8a355, #b8843a)"
                            : level.isLocked
                              ? "#e5e7eb"
                              : "linear-gradient(145deg, #f5c96a, #d8a355)",
                          color: level.isLocked ? "#9ca3af" : level.isCompleted ? "#ffffff" : "#3d2000",
                          boxShadow: level.isLocked ? "none" : "0 2px 8px rgba(216,163,85,0.35)",
                        }}
                      >
                        {level.id}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {level.isCompleted && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d8a355]">
                            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                          </div>
                        )}
                        {level.isLocked && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200">
                            <Lock className="h-3 w-3 text-gray-400" strokeWidth={2.5} />
                          </div>
                        )}
                        {statusBadgeLabel && (
                          <div className={`rounded-full border px-3 py-1 text-[11px] font-black ${statusBadgeClassName}`}>
                            {statusBadgeLabel}
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className={`mb-1 text-base font-bold leading-tight md:text-lg ${level.isLocked ? "text-gray-400" : "text-[#1a2332]"}`}>
                      {level.title}
                    </h3>

                    <p className={`line-clamp-2 text-xs leading-relaxed md:text-sm ${level.isLocked ? "text-gray-300" : "text-gray-400"}`}>
                      {level.description}
                    </p>

                    <div className="mt-3 min-h-[58px] text-right">
                      {hasAnyTestResults && (
                        <div className="grid grid-cols-1 gap-2">
                          {levelTestItems.map((item) => (
                            <div
                              key={`${level.id}-${item.juzNumber}-${item.status}`}
                              className={`rounded-xl border px-3 py-2 ${
                                item.status === "pass"
                                  ? "border-[#D4AF37]/35 bg-[#fff7e7] text-[#9a6d16]"
                                  : "border-red-200 bg-red-50 text-red-600"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-black">{item.status === "pass" ? "ناجح" : "راسب"}</span>
                                <span className="text-[11px] font-black">الجزء {item.juzNumber}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {!hasAnyTestResults && !level.isLocked && !level.isCompleted && (
                        <p className="text-[11px] font-semibold text-amber-700">في انتظار النتيجة</p>
                      )}
                    </div>

                    <div className="mt-auto pt-3">
                      <div className="mb-3 flex items-center gap-1">
                        <Star
                          className={`h-4 w-4 ${
                            level.isLocked
                              ? "fill-gray-300 text-gray-300"
                              : "fill-[#f4d03f] text-[#f4d03f] drop-shadow-[0_0_4px_rgba(244,208,63,0.35)]"
                          }`}
                          strokeWidth={1.8}
                        />
                        <span className={`text-sm font-bold ${level.isLocked ? "text-gray-300" : "text-[#d8a355]"}`}>
                          {level.userPoints}
                        </span>
                      </div>

                      {level.isCompleted ? (
                        <div className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[#d8a355]/25 bg-[#d8a355]/10 text-sm font-bold text-[#d8a355] md:h-11">
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          مكتمل
                        </div>
                      ) : level.isLocked ? (
                        <div className="flex h-10 w-full items-center justify-center rounded-lg bg-gray-100 text-sm font-semibold text-gray-300 md:h-11">
                          مقفل
                        </div>
                      ) : !hasAnyTestResults ? (
                        <div
                          className="flex h-10 w-full items-center justify-center rounded-lg text-sm font-bold text-[#3d2000] md:h-11"
                          style={{ background: "linear-gradient(135deg, #f5c96a 0%, #d8a355 100%)" }}
                        >
                          في انتظار النتيجة
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
