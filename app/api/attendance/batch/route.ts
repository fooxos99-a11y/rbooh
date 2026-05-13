import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  applyAttendancePointsAdjustment,
  calculateEvaluationLevelPoints,
  calculateTotalEvaluationPoints,
  isEvaluatedAttendance,
  isNonEvaluatedAttendance,
} from "@/lib/student-attendance"

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

function hasCompleteEvaluation(levels: {
  hafiz_level?: string | null
  tikrar_level?: string | null
  samaa_level?: string | null
  rabet_level?: string | null
}) {
  return !!levels.hafiz_level
}

function isMissingEvaluationReportDateColumnError(error: {
  message?: string | null
  details?: string | null
  hint?: string | null
  code?: string | null
} | null | undefined) {
  const content = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""} ${error?.code ?? ""}`
  return /report_date/i.test(content)
}

const EVALUATION_READING_RANGE_FIELDS = [
  "hafiz_from_surah",
  "hafiz_from_verse",
  "hafiz_to_surah",
  "hafiz_to_verse",
  "samaa_from_surah",
  "samaa_from_verse",
  "samaa_to_surah",
  "samaa_to_verse",
  "rabet_from_surah",
  "rabet_from_verse",
  "rabet_to_surah",
  "rabet_to_verse",
] as const

function omitUnsupportedEvaluationFields<T extends Record<string, any>>(
  payload: T,
  error: {
    message?: string | null
    details?: string | null
    hint?: string | null
    code?: string | null
  } | null | undefined,
) {
  const content = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""} ${error?.code ?? ""}`
  const nextPayload = { ...payload }
  let didOmitField = false

  if (/report_date/i.test(content) && "report_date" in nextPayload) {
    delete nextPayload.report_date
    didOmitField = true
  }

  if (new RegExp(EVALUATION_READING_RANGE_FIELDS.join("|"), "i").test(content)) {
    for (const field of EVALUATION_READING_RANGE_FIELDS) {
      if (field in nextPayload) {
        delete nextPayload[field]
        didOmitField = true
      }
    }
  }

  return didOmitField ? nextPayload : payload
}

function omitEvaluationReportDate<T extends { report_date?: string | null }>(payload: T): Omit<T, "report_date"> {
  const { report_date: _reportDate, ...legacyPayload } = payload
  return legacyPayload
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
        isEvaluatedAttendance(status) &&
        !hasCompleteEvaluation({
          hafiz_level: student.evaluation?.hafiz,
          tikrar_level: student.evaluation?.tikrar,
          samaa_level: student.evaluation?.samaa,
          rabet_level: student.evaluation?.rabet,
        })
      ) {
        return NextResponse.json(
          { error: "يجب إكمال تقييم الحفظ للطالب الحاضر أو المتأخر قبل الحفظ", student_id: student.id },
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
      let isAbsent = isNonEvaluatedAttendance(status)
      let hafiz_level = isAbsent ? "not_completed" : (evaluation?.hafiz || "not_completed");
      let tikrar_level = isAbsent ? "not_completed" : (evaluation?.tikrar || "not_completed");
      let samaa_level = isAbsent ? "not_completed" : (evaluation?.samaa || "not_completed");
      let rabet_level = isAbsent ? "not_completed" : (evaluation?.rabet || "not_completed");
      console.log(`[DEBUG][API] الطالب: ${student_id}, الحضور: ${status}, التقييمات المدخلة:`, evaluation);
      console.log(`[DEBUG][API] القيم التي سيتم حفظها: hafiz=${hafiz_level}, tikrar=${tikrar_level}, samaa=${samaa_level}, rabet=${rabet_level}`);
      // تحقق من وجود سجل حضور لهذا اليوم
      const { data: existingRecord } = await supabase
        .from("attendance_records")
          .select("id, status")
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
          oldPoints = applyAttendancePointsAdjustment(
            calculateEvaluationLevelPoints(oldEvaluation.hafiz_level as any),
            existingRecord?.status,
          )
          await supabase.from("evaluations").delete().eq("attendance_record_id", existingRecord.id);
        }
        await supabase
          .from("attendance_records")
          .update({ status })
          .eq("id", existingRecord.id);
        attendanceRecord = existingRecord;
        if (oldPoints > 0) {
          const { data: studentData } = await supabase.from("students").select("points, store_points").eq("id", student_id).single();
          if (studentData) {
            const currentPoints = studentData.points || 0;
            const currentStorePoints = studentData.store_points || 0;
            const newPoints = Math.max(0, currentPoints - oldPoints);
            const newStorePoints = Math.max(0, currentStorePoints - oldPoints);
            await supabase.from("students").update({ points: newPoints, store_points: newStorePoints }).eq("id", student_id);
          }
        }
      } else {
        const { data: newRecord, error: attendanceInsertError } = await supabase
          .from("attendance_records")
          .insert({ student_id, teacher_id, halaqah, status, date: todayDate })
          .select()
          .single();

        if (attendanceInsertError) {
          const isLateConstraintFailure =
            status === "late" &&
            /status|check|constraint|invalid input value/i.test(
              `${attendanceInsertError.message ?? ""} ${attendanceInsertError.details ?? ""} ${attendanceInsertError.hint ?? ""}`,
            )

          return NextResponse.json(
            {
              error: isLateConstraintFailure
                ? "قاعدة البيانات لا تسمح بعد بحالة متأخر في سجل الحضور. نفذ ملف scripts/042_allow_late_attendance_records.sql ثم أعد المحاولة."
                : attendanceInsertError.message || "Failed to create attendance record",
              student_id,
              details: attendanceInsertError.details ?? null,
              hint: attendanceInsertError.hint ?? null,
              code: attendanceInsertError.code ?? null,
            },
            { status: 500 },
          )
        }
        attendanceRecord = newRecord;
      }

      // إضافة التقييم الجديد وحساب النقاط فقط إذا لم يكن غائب أو مستأذن
      if (isEvaluatedAttendance(status)) {
        const totalPoints = applyAttendancePointsAdjustment(
          calculateEvaluationLevelPoints(hafiz_level as any),
          status,
        )
        const evaluationPayload = {
          attendance_record_id: attendanceRecord.id,
          report_date: todayDate,
          hafiz_level,
          tikrar_level,
          samaa_level,
          rabet_level,
        }
        const runEvaluationInsert = (payload: typeof evaluationPayload | Omit<typeof evaluationPayload, "report_date">) =>
          supabase
            .from("evaluations")
            .insert(payload)
            .select()
            .single()

        let evaluationPayloadAttempt: typeof evaluationPayload | Omit<typeof evaluationPayload, "report_date"> = evaluationPayload
        let { data: evaluationResult, error: evaluationError } = await runEvaluationInsert(evaluationPayloadAttempt)

        while (evaluationError) {
          const fallbackPayload = isMissingEvaluationReportDateColumnError(evaluationError)
            ? omitEvaluationReportDate(evaluationPayloadAttempt)
            : omitUnsupportedEvaluationFields(evaluationPayloadAttempt, evaluationError)

          if (Object.keys(fallbackPayload).length === Object.keys(evaluationPayloadAttempt).length) {
            break
          }

          evaluationPayloadAttempt = fallbackPayload
          const legacyEvaluationResult = await runEvaluationInsert(evaluationPayloadAttempt)
          evaluationResult = legacyEvaluationResult.data
          evaluationError = legacyEvaluationResult.error
        }

        if (evaluationError) {
          if (!existingRecord) {
            await supabase.from("attendance_records").delete().eq("id", attendanceRecord.id)
          }

          const evaluationErrorDetails = [
            evaluationError.message,
            evaluationError.details,
            evaluationError.hint,
            evaluationError.code,
          ]
            .filter(Boolean)
            .join(" | ")

          return NextResponse.json(
            {
              error: evaluationErrorDetails
                ? `فشل في حفظ تقييم الطالب وتم التراجع عن سجل الحضور: ${evaluationErrorDetails}`
                : "فشل في حفظ تقييم الطالب وتم التراجع عن سجل الحضور",
              student_id,
            },
            { status: 500 },
          )
        }

        console.log(`[DEBUG][API] التقييم المخزن في قاعدة البيانات:`, evaluationResult);
        if (totalPoints > 0) {
          const { data: studentData } = await supabase.from("students").select("points, store_points").eq("id", student_id).single();
          if (studentData) {
            const currentPoints = studentData.points || 0;
            const currentStorePoints = studentData.store_points || 0;
            const newPoints = currentPoints + totalPoints;
            const newStorePoints = currentStorePoints + totalPoints;
            await supabase.from("students").update({ points: newPoints, store_points: newStorePoints }).eq("id", student_id);
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
