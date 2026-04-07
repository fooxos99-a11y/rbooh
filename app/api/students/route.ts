import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { ensureStudentPathwayLevels } from "@/lib/pathway-levels"
import { createAdminClient } from "@/lib/supabase/admin"
import { circleNamesMatch, normalizeCircleName, resolveCircleName } from "@/lib/circle-name"

export const dynamic = "force-dynamic"
export const revalidate = 0

function getSupabaseErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف";

  if (error instanceof Error) {
    return error.message || "حدث خطأ غير معروف";
  }

  if (typeof error === "object") {
    const candidate = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate);
  }

  return String(error);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const body = await request.json()
    const {
      name,
      circle_name,
      id_number,
      account_number,
      guardian_phone,
      initial_points = 0,
      memorized_start_surah,
      memorized_start_verse,
      memorized_end_surah,
      memorized_end_verse,
      completed_juzs,
      current_juzs,
    } = body

    console.log("[v0] POST /api/students - Received data:", {
      name,
      circle_name,
      id_number,
      account_number,
      guardian_phone,
      initial_points,
      memorized_start_surah,
      memorized_start_verse,
      memorized_end_surah,
      memorized_end_verse,
      completed_juzs,
      current_juzs,
    })

    if (!name || !circle_name) {
      return NextResponse.json({ error: "الاسم واسم الحلقة مطلوبان" }, { status: 400 })
    }

    if (account_number) {
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("account_number", account_number)
        .maybeSingle()

      if (existingStudent) {
        return NextResponse.json({ error: "رقم الحساب موجود بالفعل" }, { status: 400 })
      }

      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("account_number", account_number)
        .maybeSingle()

      if (existingUser) {
        return NextResponse.json({ error: "رقم الحساب موجود بالفعل في النظام" }, { status: 400 })
      }
    }

    const insertData: any = {
      name,
      halaqah: resolveCircleName(circle_name),
      points: initial_points,
      id_number,
      account_number,
      guardian_phone,
    }

    if (memorized_start_surah !== undefined) insertData.memorized_start_surah = memorized_start_surah
    if (memorized_start_verse !== undefined) insertData.memorized_start_verse = memorized_start_verse
    if (memorized_end_surah !== undefined) insertData.memorized_end_surah = memorized_end_surah
    if (memorized_end_verse !== undefined) insertData.memorized_end_verse = memorized_end_verse
    if (completed_juzs !== undefined) insertData.completed_juzs = completed_juzs
    if (current_juzs !== undefined) insertData.current_juzs = current_juzs

    const { data, error } = await supabase.from("students").insert([insertData]).select().single()

    if (error) {
      console.error("[v0] Error adding student:", error)
      return NextResponse.json(
        {
          error: getSupabaseErrorMessage(error),
          source: "students.insert",
        },
        { status: 500 }
      )
    }

    console.log("[v0] Student added to database:", data)

    const { error: pathwayLevelsError } = await ensureStudentPathwayLevels(
      adminSupabase,
      data.id,
      data.halaqah,
    )

    if (pathwayLevelsError) {
      console.error("[v0] Error creating default pathway levels:", pathwayLevelsError)
      return NextResponse.json(
        {
          error: "تم إنشاء الطالب لكن تعذر إنشاء مستويات المسار الافتراضية",
          details: getSupabaseErrorMessage(pathwayLevelsError),
          source: "pathway-levels.ensure",
        },
        { status: 500 }
      )
    }

    const studentWithCircleName = {
      ...data,
      circle_name: data.halaqah,
    }

    return NextResponse.json({ success: true, student: studentWithCircleName }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error in POST /api/students:", error)
    return NextResponse.json({ error: getSupabaseErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("id")

    if (!studentId) {
      return NextResponse.json({ error: "معرف الطالب مطلوب" }, { status: 400 })
    }

    const { error } = await supabase.from("students").delete().eq("id", studentId)

    if (error) {
      console.error("[v0] Error removing student:", error)
      return NextResponse.json({ error: "فشل في إزالة الطالب" }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in DELETE /api/students:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const circleName = searchParams.get("circle")
    const accountNumber = searchParams.get("account_number")

    console.log("[v0] GET /api/students - circle:", circleName, "account:", accountNumber)

    let query = supabase.from("students").select("*")

    if (accountNumber) {
      query = query.eq("account_number", Number(accountNumber)) as typeof query
    }

    const { data, error } = await (query as any).order("points", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching students:", error)
      return NextResponse.json({ error: "فشل في جلب الطلاب" }, { status: 500 })
    }

    const normalizedRequestedCircle = normalizeCircleName(circleName)
    const filtered = (data || []).filter((student: { halaqah?: string | null }) => {
      if (!normalizedRequestedCircle || accountNumber) {
        return true
      }

      return circleNamesMatch(student.halaqah, normalizedRequestedCircle)
    });

    console.log("[v0] Students fetched from database:", filtered)

    const studentsWithCircleName = filtered.map((student) => ({
      ...student,
      halaqah: normalizeCircleName(student.halaqah),
      circle_name: normalizeCircleName(student.halaqah),
    }))

    return NextResponse.json(
      { students: studentsWithCircleName },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'private, no-store'
        }
      }
    )
  } catch (error) {
    console.error("[v0] Error in GET /api/students:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const {
      id,
      phone_number,
      id_number,
      points,
      add_points,
      rank,
      guardian_phone,
      halaqah,
      reset_memorized,
      memorized_start_surah,
      memorized_start_verse,
      memorized_end_surah,
      memorized_end_verse,
      completed_juzs,
      current_juzs,
    } = body

    const studentId = id || new URL(request.url).searchParams.get("id")

    if (!studentId) {
      return NextResponse.json({ error: "معرف الطالب مطلوب" }, { status: 400 })
    }

    if (reset_memorized === true) {
      const { error: deletePlanError } = await supabase.from("student_plans").delete().eq("student_id", studentId)

      if (deletePlanError) {
        console.error("[students] Error deleting active plan during memorization reset:", deletePlanError.message)
        return NextResponse.json({ error: "فشل في حذف الخطة الحالية للطالب" }, { status: 500 })
      }

      const { data, error } = await supabase
        .from("students")
        .update({
          memorized_start_surah: null,
          memorized_start_verse: null,
          memorized_end_surah: null,
          memorized_end_verse: null,
          completed_juzs: [],
          current_juzs: [],
        })
        .eq("id", studentId)
        .select()
        .single()

      if (error) {
        console.error("[students] Error resetting memorized range:", error.message)
        return NextResponse.json({ error: "فشل في إعادة ضبط محفوظ الطالب" }, { status: 500 })
      }

      return NextResponse.json({ success: true, student: data }, { status: 200 })
    }

    const updateData: any = {}
    
    // Check if halaqah changed
    if (halaqah !== undefined) {
      updateData.halaqah = resolveCircleName(halaqah)
      const { data: currentStudentHalaqah } = await supabase
        .from("students")
        .select("halaqah")
        .eq("id", studentId)
        .single()
      
      if (currentStudentHalaqah && !circleNamesMatch(currentStudentHalaqah.halaqah, updateData.halaqah)) {
        // Drop pathway progress if student moved to a different circle
        await supabase.from("pathway_level_completions").delete().eq("student_id", studentId)
      }
    }

    if (phone_number !== undefined) updateData.phone_number = phone_number
    if (id_number !== undefined) updateData.id_number = id_number
    if (rank !== undefined) updateData.rank = rank
    if (guardian_phone !== undefined) updateData.guardian_phone = guardian_phone
    if (memorized_start_surah !== undefined) updateData.memorized_start_surah = memorized_start_surah
    if (memorized_start_verse !== undefined) updateData.memorized_start_verse = memorized_start_verse
    if (memorized_end_surah !== undefined) updateData.memorized_end_surah = memorized_end_surah
    if (memorized_end_verse !== undefined) updateData.memorized_end_verse = memorized_end_verse
    if (completed_juzs !== undefined) updateData.completed_juzs = completed_juzs
    if (current_juzs !== undefined) updateData.current_juzs = current_juzs
    if (add_points !== undefined) {
      const { data: currentStudent, error: fetchError } = await supabase
        .from("students")
        .select("points, store_points")
        .eq("id", studentId)
        .single()

      if (fetchError) {
        return NextResponse.json({ error: "فشل في جلب معلومات الطالب" }, { status: 500 })
      }

      const currentPoints = currentStudent?.points || 0
      const currentStorePoints = currentStudent?.store_points || 0
      const newPoints = currentPoints + add_points
      const newStorePoints = currentStorePoints + add_points
      updateData.points = newPoints
      updateData.store_points = newStorePoints
      console.log(`[v0] Adding points - Current: ${currentPoints}, Add: ${add_points}, New: ${newPoints}, Store: ${currentStorePoints} -> ${newStorePoints}`)
    } else if (points !== undefined) {
      updateData.points = points
    }

    const { data, error } = await supabase.from("students").update(updateData).eq("id", studentId).select().single()

    if (error) {
      console.error("[v0] Error updating student:", error.message)
      return NextResponse.json({ error: "فشل في تحديث الطالب" }, { status: 500 })
    }

    return NextResponse.json({ success: true, student: data }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in PATCH /api/students:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}
