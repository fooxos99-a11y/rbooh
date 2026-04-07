import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { normalizeCircleNameKey, resolveCircleName } from "@/lib/circle-name"

export const dynamic = "force-dynamic"
export const revalidate = 0

const TEACHER_ROLE_VALUES = ["teacher", "deputy_teacher", "معلم", "نائب معلم"]

function normalizeTeacherRole(role?: string | null) {
  return role === "deputy_teacher" || role === "نائب معلم" ? "deputy_teacher" : "teacher"
}

function isMissingCircleNameColumn(error: { code?: string | null; message?: string | null } | null) {
  if (!error) return false

  const message = `${error.message || ""}`.toLowerCase()
  return message.includes("circle_name") && (message.includes("column") || message.includes("schema cache"))
}

function normalizeAccountNumber(rawValue: string | null) {
  if (!rawValue) return null

  const normalized = rawValue.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632)).trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const accountNumber = normalizeAccountNumber(searchParams.get("account_number"))

    // If account_number is provided, fetch specific teacher
    if (accountNumber) {
      const { data: teachers, error } = await supabase
        .from("users")
        .select("*")
        .in("role", TEACHER_ROLE_VALUES)
        .eq("account_number", accountNumber)
        .limit(1)

      if (error) {
        console.error("[v0] Error fetching teacher by account number:", error)
        return NextResponse.json({ error: "فشل في جلب بيانات المعلم" }, { status: 500 })
      }

      if (!teachers || teachers.length === 0) {
        return NextResponse.json({ error: "المعلم غير موجود" }, { status: 404 })
      }

      const teacher = teachers[0]
      return NextResponse.json({
        teachers: [{
          id: teacher.id,
          name: teacher.name,
          role: normalizeTeacherRole(teacher.role),
          account_number: teacher.account_number,
          accountNumber: teacher.account_number?.toString() || "",
          idNumber: teacher.id_number || "",
          circle_name: teacher.circle_name || "",
          halaqah: resolveCircleName(teacher.halaqah, teacher.circle_name),
          phoneNumber: teacher.phone_number || "",
        }]
      }, { status: 200 })
    }

    // Fetch all users with role 'teacher' or 'deputy_teacher'
    let teachersQuery = await supabase
      .from("users")
      .select("id, name, role, account_number, id_number, halaqah, circle_name, phone_number")
      .in("role", TEACHER_ROLE_VALUES)
      .order("created_at", { ascending: false })

    if (teachersQuery.error && isMissingCircleNameColumn(teachersQuery.error)) {
      teachersQuery = await supabase
        .from("users")
        .select("id, name, role, account_number, id_number, halaqah, phone_number")
        .in("role", TEACHER_ROLE_VALUES)
        .order("created_at", { ascending: false })
    }

    const { data: teachers, error } = teachersQuery

    if (error) {
      console.error("[v0] Error fetching teachers:", error)
      return NextResponse.json({ error: "فشل في جلب المعلمين" }, { status: 500 })
    }

    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("halaqah")

    if (studentsError) {
      console.error("[v0] Error fetching students for teacher counts:", studentsError)
    }

    const studentCountByHalaqah = new Map<string, number>()
    ;(students || []).forEach((student) => {
      const normalizedHalaqah = normalizeCircleNameKey(student.halaqah)
      if (!normalizedHalaqah) return
      studentCountByHalaqah.set(normalizedHalaqah, (studentCountByHalaqah.get(normalizedHalaqah) || 0) + 1)
    })

    const teachersWithStudentCount = (teachers || []).map((teacher) => {
      const resolvedHalaqah = resolveCircleName(teacher.halaqah, teacher.circle_name)
      const teacherHalaqah = normalizeCircleNameKey(resolvedHalaqah)

      return {
        id: teacher.id,
        name: teacher.name,
        accountNumber: teacher.account_number?.toString() || "",
        idNumber: teacher.id_number || "",
        circle_name: teacher.circle_name || "",
        halaqah: resolvedHalaqah,
        studentCount: studentCountByHalaqah.get(teacherHalaqah) || 0,
        phoneNumber: teacher.phone_number || "",
        role: normalizeTeacherRole(teacher.role),
      }
    })

    return NextResponse.json({ teachers: teachersWithStudentCount }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in GET /api/teachers:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { name, id_number, account_number, halaqah, role } = body

    if (!name || !id_number || !account_number || !halaqah) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 })
    }

    const assignedRole = role === "deputy_teacher" ? "deputy_teacher" : "teacher"

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("account_number", account_number)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: "رقم الحساب موجود بالفعل" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          name,
          id_number,
          role: assignedRole,
          halaqah: resolveCircleName(halaqah),
          account_number: Number.parseInt(account_number),
          password_hash: "",
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[v0] Error adding teacher:", error)
      return NextResponse.json({ error: "فشل في إضافة المعلم" }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        teacher: {
          id: data.id,
          name: data.name,
          accountNumber: data.account_number?.toString() || "",
          idNumber: data.id_number || "",
          halaqah: data.halaqah || "",
          studentCount: 0,
          role: data.role || "teacher",
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Error in POST /api/teachers:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get("id")

    if (!teacherId) {
      return NextResponse.json({ error: "معرف المعلم مطلوب" }, { status: 400 })
    }

    const { error } = await supabase.from("users").delete().eq("id", teacherId).in("role", TEACHER_ROLE_VALUES)

    if (error) {
      console.error("[v0] Error removing teacher:", error)
      return NextResponse.json({ error: "فشل في إزالة المعلم" }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in DELETE /api/teachers:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()
    const { id, name, phone_number, id_number, account_number, halaqah, role } = body

    if (!id) {
      return NextResponse.json({ error: "معرف المعلم مطلوب" }, { status: 400 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (phone_number !== undefined) updateData.phone_number = phone_number
    if (id_number !== undefined) updateData.id_number = id_number
    if (account_number !== undefined) updateData.account_number = account_number
    if (halaqah !== undefined) updateData.halaqah = resolveCircleName(halaqah)
    if (role !== undefined) updateData.role = role === "deputy_teacher" ? "deputy_teacher" : "teacher"

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "لا توجد بيانات لتحديثها" }, { status: 400 })
    }

    if (account_number !== undefined) {
      const { data: existingUser, error: accountError } = await supabase
        .from("users")
        .select("id")
        .eq("account_number", account_number)
        .neq("id", id)
        .maybeSingle()

      if (accountError) {
        console.error("[v0] Error checking teacher account number:", accountError)
        return NextResponse.json({ error: "تعذر التحقق من رقم الحساب" }, { status: 500 })
      }

      if (existingUser) {
        return NextResponse.json({ error: "رقم الحساب مستخدم بالفعل" }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .in("role", TEACHER_ROLE_VALUES)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating teacher:", error)
      return NextResponse.json({ error: "فشل في تحديث المعلم" }, { status: 500 })
    }

    return NextResponse.json({ success: true, teacher: data }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in PATCH /api/teachers:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}
