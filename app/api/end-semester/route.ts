import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { SURAHS, getPlanMemorizedRange } from "@/lib/quran-data"
import { isPassingMemorizationLevel } from "@/lib/student-attendance"

function getNormalizedEndVerse(endSurahNumber: number, endVerse?: number | null) {
  if (endVerse && endVerse > 0) return endVerse
  return SURAHS.find((surah) => surah.number === endSurahNumber)?.verseCount ?? null
}

function hasCompletedMemorization(record: any) {
  const evaluations = Array.isArray(record.evaluations)
    ? record.evaluations
    : record.evaluations
      ? [record.evaluations]
      : []

  if (evaluations.length === 0) {
    return false
  }

  const latestEvaluation = evaluations[evaluations.length - 1]
  return isPassingMemorizationLevel(latestEvaluation?.hafiz_level ?? null)
}

async function getCompletedDaysForPlan(supabase: any, studentId: string, startDate?: string | null) {
  let query = supabase
    .from("attendance_records")
    .select("status, evaluations(hafiz_level)")
    .eq("student_id", studentId)
    .order("date", { ascending: true })

  if (startDate) {
    query = query.gte("date", startDate)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data || []).filter(hasCompletedMemorization).length
}

function getMergedMemorizedRange(student: any, plan: any) {
  const normalizedPlan = {
    ...plan,
    direction: plan?.direction || "asc",
    has_previous: plan?.has_previous || !!(plan?.prev_start_surah || student?.memorized_start_surah),
    prev_start_surah: plan?.prev_start_surah || student?.memorized_start_surah || null,
    prev_start_verse: plan?.prev_start_verse || student?.memorized_start_verse || null,
    prev_end_surah: plan?.prev_end_surah || student?.memorized_end_surah || null,
    prev_end_verse: plan?.prev_end_verse || student?.memorized_end_verse || null,
  }

  const memorizedRange = getPlanMemorizedRange(normalizedPlan, Number(plan?.completedDays) || 0)

  if (memorizedRange) {
    return {
      memorized_start_surah: memorizedRange.startSurahNumber,
      memorized_start_verse: memorizedRange.startVerseNumber,
      memorized_end_surah: memorizedRange.endSurahNumber,
      memorized_end_verse: memorizedRange.endVerseNumber,
    }
  }

  const inheritedStartSurah =
    student?.memorized_start_surah ||
    normalizedPlan?.prev_start_surah ||
    normalizedPlan?.start_surah_number ||
    null
  const inheritedStartVerse =
    student?.memorized_start_verse ||
    normalizedPlan?.prev_start_verse ||
    normalizedPlan?.start_verse ||
    1
  const endSurah =
    student?.memorized_end_surah ||
    normalizedPlan?.prev_end_surah ||
    normalizedPlan?.end_surah_number ||
    null
  const endVerse = endSurah
    ? getNormalizedEndVerse(
        endSurah,
        student?.memorized_end_verse || normalizedPlan?.prev_end_verse || normalizedPlan?.end_verse,
      )
    : null

  return {
    memorized_start_surah: inheritedStartSurah,
    memorized_start_verse: inheritedStartVerse,
    memorized_end_surah: endSurah,
    memorized_end_verse: endVerse,
  }
}

export async function POST() {
  try {
    const supabase = await createClient()

    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse")

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message || "فشل في جلب الطلاب" }, { status: 500 })
    }

    const { data: plans, error: plansError } = await supabase
      .from("student_plans")
      .select("student_id, start_surah_number, start_verse, end_surah_number, end_verse, prev_start_surah, prev_start_verse, prev_end_surah, prev_end_verse, total_pages, daily_pages, direction, start_date, has_previous")

    if (plansError) {
      return NextResponse.json({ error: plansError.message || "فشل في جلب الخطط الحالية" }, { status: 500 })
    }

    const plansByStudentId = new Map((plans || []).map((plan) => [plan.student_id, plan]))
    let archivedPlansCount = 0

    for (const student of students || []) {
      const plan = plansByStudentId.get(student.id)
      const updateData: Record<string, number | null> = {
        points: 0,
        store_points: 0,
      }

      if (plan) {
        const completedDays = await getCompletedDaysForPlan(supabase, student.id, plan.start_date)
        Object.assign(updateData, getMergedMemorizedRange(student, { ...plan, completedDays }))
        archivedPlansCount += 1
      }

      const { error: updateStudentError } = await supabase
        .from("students")
        .update(updateData)
        .eq("id", student.id)

      if (updateStudentError) {
        const columnsMissing = /memorized_start_surah|memorized_end_surah|column/i.test(
          `${updateStudentError.message ?? ""} ${updateStudentError.details ?? ""}`,
        )

        return NextResponse.json(
          {
            error: columnsMissing
              ? "حقول محفوظ الطالب غير موجودة بعد. نفذ ملف scripts/043_add_student_memorized_fields.sql ثم أعد المحاولة."
              : updateStudentError.message || "فشل في تحديث بيانات الطلاب",
            details: updateStudentError.details ?? null,
            hint: updateStudentError.hint ?? null,
            code: updateStudentError.code ?? null,
          },
          { status: 500 },
        )
      }
    }

    if ((plans || []).length > 0) {
      const { error: deletePlansError } = await supabase
        .from("student_plans")
        .delete()
        .not("id", "is", null)

      if (deletePlansError) {
        return NextResponse.json(
          { error: deletePlansError.message || "تم تحديث الطلاب لكن فشل حذف الخطط الحالية" },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      studentsReset: (students || []).length,
      plansArchived: archivedPlansCount,
    })
  } catch (error) {
    console.error("[end-semester] POST error:", error)
    return NextResponse.json({ error: "حدث خطأ أثناء إنهاء الفصل" }, { status: 500 })
  }
}
