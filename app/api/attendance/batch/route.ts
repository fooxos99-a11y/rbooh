import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function getKsaDateString() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = formatter.formatToParts(new Date())
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  return `${year}-${month}-${day}`
}

function calculatePoints(level: string): number {
  switch (level) {
    case "excellent":
      return 10
    case "very_good":
      return 8
    case "good":
      return 6
    case "not_completed":
      return 4
    default:
      return 0
  }
}

function hasCompleteEvaluation(levels: {
  hafiz_level?: string | null
  tikrar_level?: string | null
  samaa_level?: string | null
  rabet_level?: string | null
}) {
  return !!(
    levels.hafiz_level &&
    levels.tikrar_level &&
    levels.samaa_level &&
    levels.rabet_level
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { students, teacher_id, halaqah, debug_today } = body
    console.log("[DEBUG][API] students received:", students)
    if (!Array.isArray(students) || !teacher_id || !halaqah) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    for (const student of students) {
      const status = student.attendance || "present"
      if (
        status === "present" &&
        !hasCompleteEvaluation({
          hafiz_level: student.evaluation?.hafiz,
          tikrar_level: student.evaluation?.tikrar,
          samaa_level: student.evaluation?.samaa,
          rabet_level: student.evaluation?.rabet,
        })
      ) {
        return NextResponse.json(
          { error: "يجب إكمال جميع فروع التقييم للطالب الحاضر قبل الحفظ", student_id: student.id },
          { status: 400 },
        )
      }
    }

    const supabase = await createClient()
    const todayDate = getKsaDateString()
    const results = []
    for (const student of students) {
      const { id: student_id, attendance, evaluation } = student;
      let status = attendance || "present";
      // إذا كان غائب أو مستأذن، اجعل كل التقييمات not_completed
      let isAbsent = status === "absent" || status === "excused";
      let hafiz_level = isAbsent ? "not_completed" : (evaluation?.hafiz || "not_completed");
      let tikrar_level = isAbsent ? "not_completed" : (evaluation?.tikrar || "not_completed");
      let samaa_level = isAbsent ? "not_completed" : (evaluation?.samaa || "not_completed");
      let rabet_level = isAbsent ? "not_completed" : (evaluation?.rabet || "not_completed");
      console.log(`[DEBUG][API] الطالب: ${student_id}, الحضور: ${status}, التقييمات المدخلة:`, evaluation);
      console.log(`[DEBUG][API] القيم التي سيتم حفظها: hafiz=${hafiz_level}, tikrar=${tikrar_level}, samaa=${samaa_level}, rabet=${rabet_level}`);
      // تحقق من وجود سجل حضور لهذا اليوم
      const { data: existingRecord } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("student_id", student_id)
        .eq("date", todayDate)
        .maybeSingle();
      let attendanceRecord;
      let oldPoints = 0;

      if (existingRecord) {
        // حذف التقييم القديم وخصم النقاط القديمة
        const { data: oldEvaluation } = await supabase
          .from("evaluations")
          .select("*")
          .eq("attendance_record_id", existingRecord.id)
          .maybeSingle();
        if (oldEvaluation) {
          oldPoints =
            calculatePoints(oldEvaluation.hafiz_level) +
            calculatePoints(oldEvaluation.tikrar_level) +
            calculatePoints(oldEvaluation.samaa_level) +
            calculatePoints(oldEvaluation.rabet_level);
          await supabase.from("evaluations").delete().eq("attendance_record_id", existingRecord.id);
        }
        await supabase
          .from("attendance_records")
          .update({ status })
          .eq("id", existingRecord.id);
        attendanceRecord = existingRecord;
        if (oldPoints > 0) {
          const { data: studentData } = await supabase.from("students").select("points").eq("id", student_id).single();
          if (studentData) {
            const currentPoints = studentData.points || 0;
            const newPoints = Math.max(0, currentPoints - oldPoints);
            await supabase.from("students").update({ points: newPoints }).eq("id", student_id);
          }
        }
      } else {
        const { data: newRecord } = await supabase
          .from("attendance_records")
          .insert({ student_id, teacher_id, halaqah, status, date: todayDate })
          .select()
          .single();
        attendanceRecord = newRecord;
      }

      // إضافة التقييم الجديد وحساب النقاط فقط إذا لم يكن غائب أو مستأذن
      if (!isAbsent) {
        const hafizPoints = calculatePoints(hafiz_level);
        const tikrarPoints = calculatePoints(tikrar_level);
        const samaaPoints = calculatePoints(samaa_level);
        const rabetPoints = calculatePoints(rabet_level);
        const totalPoints = hafizPoints + tikrarPoints + samaaPoints + rabetPoints;
        const { data: evaluationResult, error: evaluationError } = await supabase
          .from("evaluations")
          .insert({
            attendance_record_id: attendanceRecord.id,
            hafiz_level,
            tikrar_level,
            samaa_level,
            rabet_level,
          })
          .select()
          .single();

        if (evaluationError) {
          if (!existingRecord) {
            await supabase.from("attendance_records").delete().eq("id", attendanceRecord.id)
          }
          return NextResponse.json(
            { error: "فشل في حفظ تقييم الطالب وتم التراجع عن سجل الحضور", student_id },
            { status: 500 },
          )
        }

        console.log(`[DEBUG][API] التقييم المخزن في قاعدة البيانات:`, evaluationResult);
        if (totalPoints > 0) {
          const { data: studentData } = await supabase.from("students").select("points").eq("id", student_id).single();
          if (studentData) {
            const currentPoints = studentData.points || 0;
            const newPoints = currentPoints + totalPoints;
            await supabase.from("students").update({ points: newPoints }).eq("id", student_id);
          }
        }
        results.push({ student_id, success: true, pointsAdded: totalPoints });
      } else {
        // إذا كان غائب أو مستأذن لا يتم إضافة تقييمات ولا نقاط، ويتم حذف أي تقييمات قديمة
        await supabase.from("evaluations").delete().eq("attendance_record_id", attendanceRecord.id);
        results.push({ student_id, success: true, pointsAdded: 0 });
      }
    }
    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error("[batch] Error in batch attendance API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
