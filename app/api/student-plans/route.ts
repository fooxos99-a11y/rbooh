import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { calculateTotalPages, calculateTotalDays } from "@/lib/quran-data"

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

      // حساب الأيام المكتملة: حاضر + تقييم إيجابي في evaluations
      const POSITIVE_LEVELS = ["excellent", "good", "very_good", "average"]
      const completedRecords = (attendanceRecords || []).filter((r: any) => {
        if (r.status !== "present") return false
        const evals = Array.isArray(r.evaluations) ? r.evaluations : r.evaluations ? [r.evaluations] : []
        if (evals.length === 0) return false
        const ev = evals[evals.length - 1] // آخر تقييم
        return (
          POSITIVE_LEVELS.includes(ev.hafiz_level ?? "") ||
          POSITIVE_LEVELS.includes(ev.tikrar_level ?? "") ||
          POSITIVE_LEVELS.includes(ev.samaa_level ?? "") ||
          POSITIVE_LEVELS.includes(ev.rabet_level ?? "")
        )
      })

      const completedDays = completedRecords.length
      const progressPercent =
        plan.total_days > 0
          ? Math.min(Math.round((completedDays / plan.total_days) * 100), 100)
          : 0

      return NextResponse.json({
        plan,
        completedDays,
        progressPercent,
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
      end_surah_number,
      end_surah_name,
      daily_pages, // 0.5 | 1 | 2
      start_date,
      direction,
      total_days: totalDaysOverride,
    } = body

    if (!student_id || !start_surah_number || !end_surah_number || !daily_pages) {
      return NextResponse.json({ error: "البيانات المطلوبة ناقصة" }, { status: 400 })
    }

    const totalPages = calculateTotalPages(start_surah_number, end_surah_number)
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
        end_surah_number,
        end_surah_name,
        daily_pages,
        total_pages: totalPages,
        total_days: totalDays,
        start_date: start_date || new Date().toISOString().split("T")[0],
        direction: direction || "asc",
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
