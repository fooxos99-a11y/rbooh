import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { SURAHS, calculateTotalPages, calculateTotalDays, calculateQuranMemorizationProgress } from "@/lib/quran-data"

const POSITIVE_MEMORIZATION_LEVELS = ["excellent", "good", "very_good", "average"]

function hasCompletedMemorization(record: any) {
  if (record.status !== "present") return false

  const evaluations = Array.isArray(record.evaluations)
    ? record.evaluations
    : record.evaluations
      ? [record.evaluations]
      : []

  if (evaluations.length === 0) return false

  const latestEvaluation = evaluations[evaluations.length - 1]
  return POSITIVE_MEMORIZATION_LEVELS.includes(latestEvaluation?.hafiz_level ?? "")
}

function getExpectedNextStart(prevStartSurah?: number | null, prevEndSurah?: number | null, prevEndVerse?: number | null) {
  if (!prevStartSurah || !prevEndSurah || !prevEndVerse) {
    return null
  }

  const previousEndSurahData = SURAHS.find((surah) => surah.number === prevEndSurah)
  if (!previousEndSurahData) return null

  const isDescending = prevStartSurah > prevEndSurah

  if (!isDescending) {
    if (prevEndVerse < previousEndSurahData.verseCount) {
      return { surahNumber: prevEndSurah, verseNumber: prevEndVerse + 1 }
    }

    const nextSurah = SURAHS.find((surah) => surah.number === prevEndSurah + 1)
    return nextSurah ? { surahNumber: nextSurah.number, verseNumber: 1 } : null
  }

  if (prevEndVerse > 1) {
    return { surahNumber: prevEndSurah, verseNumber: prevEndVerse - 1 }
  }

  const previousSurah = SURAHS.find((surah) => surah.number === prevEndSurah - 1)
  return previousSurah
    ? { surahNumber: previousSurah.number, verseNumber: previousSurah.verseCount }
    : null
}

// GET - جلب خطط طالب معين أو جلب كل الخطط
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("student_id")
    const planId = searchParams.get("plan_id")

    if (planId) {
      const { data, error } = await supabase
        .from("student_plans")
        .select("*")
        .eq("id", planId)
        .single()
      if (error) throw error
      return NextResponse.json({ plan: data })
    }

    if (studentId) {
      // جلب الخطة مع عدد الأيام المكتملة
      const { data: plans, error } = await supabase
        .from("student_plans")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })

      if (error) throw error

      if (!plans || plans.length === 0) {
        return NextResponse.json({ plan: null, completedDays: 0 })
      }

      const plan = plans[0] // الخطة الأحدث هي الفعالة

      // جلب سجلات الحضور مع تقييماتها (join مع evaluations)
      let attQuery = supabase
        .from("attendance_records")
        .select("id, date, status, evaluations(hafiz_level, tikrar_level, samaa_level, rabet_level)")
        .eq("student_id", studentId)
        .order("date", { ascending: true })

      if (plan.start_date) {
        attQuery = attQuery.gte("date", plan.start_date)
      }

      const { data: attendanceRecords, error: attError } = await attQuery

      if (attError) {
        console.error("[plans] attendance query error:", attError)
        return NextResponse.json({
          plan,
          completedDays: 0,
          progressPercent: 0,
          attendanceRecords: [],
          completedRecords: [],
        })
      }

      // اليوم يُحتسب مكتملًا فقط إذا كان الطالب حاضرًا وتم تقييم الحفظ نفسه بشكل إيجابي.
      const completedRecords = (attendanceRecords || []).filter(hasCompletedMemorization)

      const completedDays = completedRecords.length
      const progressPercent =
        plan.total_days > 0
          ? Math.min(Math.round((completedDays / plan.total_days) * 100), 100)
          : 0
      const quranMemorization = calculateQuranMemorizationProgress(plan, completedDays)

      return NextResponse.json({
        plan,
        completedDays,
        progressPercent,
        quranMemorizedPages: quranMemorization.memorizedPages,
        quranProgressPercent: quranMemorization.progressPercent,
        quranLevel: quranMemorization.level,
        attendanceRecords: attendanceRecords || [],
        completedRecords,
      })
    }

    return NextResponse.json({ error: "معرف الطالب مطلوب" }, { status: 400 })
  } catch (error) {
    console.error("[plans] GET error:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}

// POST - إنشاء خطة جديدة للطالب
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const {
      student_id,
      start_surah_number,
      start_surah_name,
      start_verse,
      end_surah_number,
      end_surah_name,
      end_verse,
      daily_pages, // 0.5 | 1 | 2
      start_date,
      direction,
      total_days: totalDaysOverride,
      has_previous,
      prev_start_surah,
      prev_start_verse,
      prev_end_surah,
      prev_end_verse,
      muraajaa_pages,
      rabt_pages,
    } = body

    if (!student_id || !start_surah_number || !end_surah_number || !daily_pages) {
      return NextResponse.json({ error: "البيانات المطلوبة ناقصة" }, { status: 400 })
    }

    if (has_previous) {
      const expectedNextStart = getExpectedNextStart(prev_start_surah, prev_end_surah, prev_end_verse)
      if (!expectedNextStart) {
        return NextResponse.json({ error: "بيانات الحفظ السابق غير مكتملة" }, { status: 400 })
      }

      const normalizedStartVerse = Number(start_verse) || 1
      if (
        start_surah_number !== expectedNextStart.surahNumber ||
        normalizedStartVerse !== expectedNextStart.verseNumber
      ) {
        const expectedSurah = SURAHS.find((surah) => surah.number === expectedNextStart.surahNumber)
        return NextResponse.json(
          {
            error: `يجب أن تبدأ الخطة الجديدة مباشرة بعد نهاية الحفظ السابق: ${expectedSurah?.name || "السورة"} آية ${expectedNextStart.verseNumber}`,
          },
          { status: 400 },
        )
      }
    }

    const totalPages = calculateTotalPages(
      start_surah_number,
      end_surah_number,
      start_verse,
      end_verse,
    )
    const totalDays =
      totalDaysOverride && Number(totalDaysOverride) > 0
        ? Number(totalDaysOverride)
        : calculateTotalDays(totalPages, daily_pages)

    // حذف الخطة القديمة إن وجدت
    await supabase.from("student_plans").delete().eq("student_id", student_id)

    const { data, error } = await supabase
      .from("student_plans")
      .insert([{
        student_id,
        start_surah_number,
        start_surah_name,
        start_verse: start_verse || null,
        end_surah_number,
        end_surah_name,
        end_verse: end_verse || null,
        daily_pages,
        total_pages: totalPages,
        total_days: totalDays,
        start_date: start_date || new Date().toISOString().split("T")[0],
        direction: direction || "asc",
        has_previous: has_previous || false,
        prev_start_surah: prev_start_surah || null,
        prev_start_verse: prev_start_verse || null,
        prev_end_surah: prev_end_surah || null,
        prev_end_verse: prev_end_verse || null,
        muraajaa_pages: muraajaa_pages || null,
        rabt_pages: rabt_pages || null,
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, plan: data }, { status: 201 })
  } catch (error) {
    console.error("[plans] POST error:", error)
    return NextResponse.json({ error: "حدث خطأ في حفظ الخطة" }, { status: 500 })
  }
}

// DELETE - حذف خطة
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get("plan_id")
    const studentId = searchParams.get("student_id")

    if (planId) {
      const { error } = await supabase.from("student_plans").delete().eq("id", planId)
      if (error) throw error
    } else if (studentId) {
      const { error } = await supabase.from("student_plans").delete().eq("student_id", studentId)
      if (error) throw error
    } else {
      return NextResponse.json({ error: "معرف مطلوب" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[plans] DELETE error:", error)
    return NextResponse.json({ error: "حدث خطأ في حذف الخطة" }, { status: 500 })
  }
}
