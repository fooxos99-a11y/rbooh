import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// POST /api/compensation
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      student_id,
      teacher_id,
      halaqah,
      date,
      hafiz_from_surah,
      hafiz_from_verse,
      hafiz_to_surah,
      hafiz_to_verse,
      compensated_content,
    } = await request.json()

    if (!student_id || !teacher_id || !halaqah || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 1. تحقق إذا كان يوجد سجل غياب أو مستأذن لهذا اليوم
    const { data: existingRecord } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("student_id", student_id)
      .eq("date", date)
      .maybeSingle()

    let recordId;
    if (existingRecord) {
      // تحديث إلى حاضر
      await supabase
        .from("attendance_records")
        .update({
          status: "present",
          is_compensation: true,
          notes: compensated_content ? `تم تعويض الحفظ: ${compensated_content}` : "تم تعويض الحفظ",
        })
        .eq("id", existingRecord.id)
      recordId = existingRecord.id
    } else {
      // إدخال جديد
      const { data: newRecord, error: insertError } = await supabase
        .from("attendance_records")
        .insert({
          student_id,
          teacher_id,
          halaqah,
          date,
          status: "present",
          is_compensation: true,
          notes: compensated_content ? `تم تعويض الحفظ: ${compensated_content}` : "تم تعويض الحفظ",
        })
        .select("id")
        .single()
      
      if (insertError) throw insertError
      recordId = newRecord.id
    }

    // 2. تثبيت تقييم التعويض مع نفس النطاق الحفظي حتى يظهر في الملف الشخصي
    await supabase.from("evaluations").delete().eq("attendance_record_id", recordId)

    const { error: evaluationError } = await supabase.from("evaluations").insert({
      attendance_record_id: recordId,
      hafiz_level: "good",
      tikrar_level: "not_completed",
      samaa_level: "not_completed",
      rabet_level: "not_completed",
      hafiz_from_surah: hafiz_from_surah || null,
      hafiz_from_verse: hafiz_from_verse || null,
      hafiz_to_surah: hafiz_to_surah || null,
      hafiz_to_verse: hafiz_to_verse || null,
    })

    if (evaluationError) {
      throw evaluationError
    }

    // 3. إضافة 10 نقاط للطالب
    const { data: studentData } = await supabase
      .from("students")
      .select("points, store_points")
      .eq("id", student_id)
      .single()

    const newPoints = (studentData?.points || 0) + 10
    const newStorePoints = (studentData?.store_points || 0) + 10
    await supabase
      .from("students")
      .update({ points: newPoints, store_points: newStorePoints })
      .eq("id", student_id)

    return NextResponse.json({ success: true, pointsAdded: 10, newPoints })
  } catch (error: any) {
    console.error("[compensation error]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
