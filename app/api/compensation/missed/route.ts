import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getAyahByPageFloat, getInclusiveEndAyah, getSessionContent, SURAHS } from "@/lib/quran-data"

interface MissedDayItem {
  date: string
  sessionIndex: number
  content: string
  hafiz_from_surah: string
  hafiz_from_verse: string
  hafiz_to_surah: string
  hafiz_to_verse: string
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("student_id")

    if (!studentId) {
      return NextResponse.json({ error: "Missing student_id" }, { status: 400 })
    }

    // 1. Get the current active plan
    const { data: plans } = await supabase
      .from("student_plans")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (!plans || plans.length === 0 || !plans[0].start_date) {
      return NextResponse.json({ missedDays: [] }) // No active plan
    }

    const plan = plans[0]

    // 2. Get attendance records from start_date to yesterday
    const today = new Date()
    const saDate = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }))
    saDate.setDate(saDate.getDate() - 1) // yesterday
    const yesterdayStr = saDate.toISOString().split("T")[0]

    const startDate = new Date(plan.start_date)

    if (startDate > saDate) {
        return NextResponse.json({ missedDays: [] }) // Plan starts in the future or started today
    }

    const { data: attendanceRecords } = await supabase
      .from("attendance_records")
      .select("id, date, status, evaluations(hafiz_level)")
      .eq("student_id", studentId)
      .gte("date", plan.start_date)
      .lte("date", yesterdayStr)
      .order("date", { ascending: true })

    const POSITIVE_LEVELS = ["excellent", "good", "very_good", "average"]
    
    // Create a Set of completed dates
    const completedDates = new Set()
    
    if (attendanceRecords) {
        for (const r of attendanceRecords) {
            if (r.status === "present") {
                const evals = Array.isArray(r.evaluations) ? r.evaluations : r.evaluations ? [r.evaluations] : []
                if (evals.length > 0) {
                    const ev = evals[evals.length - 1]
                    if (POSITIVE_LEVELS.includes(ev.hafiz_level ?? "")) {
                        completedDates.add(r.date)
                    }
                }
            }
        }
    }

    const missedDaysList: MissedDayItem[] = []
    
    // اربط كل يوم تدريبي بمقطع الخطة الأصلي لذلك اليوم، وليس بعدّاد المنجز الحالي.
    let d = new Date(plan.start_date)
    let sessionCounter = 1

    while (d <= saDate) {
        const dStr = d.toISOString().split("T")[0]
        const dayOfWeek = d.getDay() // 0: Sunday, 1: Monday, ..., 5: Friday, 6: Saturday
        
        // Skip Friday (5) and Saturday (6)
        if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        const startSurahData = SURAHS.find((s) => s.number === Math.min(plan.start_surah_number, plan.end_surah_number))
        const planStartPage = startSurahData?.startPage || 1
        const dir = plan.direction || "asc"
        const dailyStr = String(plan.daily_pages)
        const daily = dailyStr === "0.3333" ? 0.3333 : dailyStr === "0.25" ? 0.25 : plan.daily_pages
        const sessionContent = getSessionContent(planStartPage, daily, sessionCounter, plan.total_pages, dir)
        let sessionStart = dir === "desc"
          ? planStartPage + plan.total_pages - sessionCounter * daily
          : planStartPage + (sessionCounter - 1) * daily
        sessionStart = Math.max(1, Math.min(sessionStart, 605))
        const sessionEnd = Math.max(sessionStart, Math.min(sessionStart + daily, 605))
        const startRef = getAyahByPageFloat(sessionStart)
        const endRef = getInclusiveEndAyah(sessionEnd)
        const startSurah = SURAHS.find((surah) => surah.number === startRef.surah)
        const endSurah = SURAHS.find((surah) => surah.number === endRef.surah)

            if (!completedDates.has(dStr)) {
                missedDaysList.push({
                    date: dStr,
                    sessionIndex: sessionCounter,
            content: sessionContent.text,
            hafiz_from_surah: startSurah?.name || sessionContent.fromSurah,
            hafiz_from_verse: String(startRef.ayah),
            hafiz_to_surah: endSurah?.name || sessionContent.toSurah,
            hafiz_to_verse: String(endRef.ayah),
                })
            }

        sessionCounter++
        }
        d.setDate(d.getDate() + 1)
    }

    return NextResponse.json({ missedDays: missedDaysList })
  } catch (error: any) {
    console.error("[compensation error]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
