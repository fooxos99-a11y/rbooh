import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const { account_number } = await request.json()

    if (!account_number || typeof account_number !== "string" || !/^[0-9]+$/.test(account_number)) {
      return NextResponse.json({ error: "رقم الحساب يجب أن يكون أرقام فقط" }, { status: 400 })
    }

    const accountNum = Number.parseInt(account_number)
    if (isNaN(accountNum) || accountNum <= 0) {
      return NextResponse.json({ error: "رقم الحساب غير صحيح" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, name, role, account_number, halaqah")
      .eq("account_number", accountNum)
      .maybeSingle()

    if (userError) {
      console.error("[auth] Users lookup failed:", userError)
      return NextResponse.json({ error: "تعذر التحقق من الحساب الآن" }, { status: 500 })
    }

    if (user) {
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          accountNumber: user.account_number,
          halaqah: user.halaqah,
        },
      })
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, name, account_number, halaqah")
      .eq("account_number", accountNum)
      .maybeSingle()

    if (studentError) {
      console.error("[auth] Students lookup failed:", studentError)
      return NextResponse.json({ error: "تعذر التحقق من الحساب الآن" }, { status: 500 })
    }

    if (student) {
      return NextResponse.json({
        success: true,
        user: {
          id: student.id,
          name: student.name,
          role: "student",
          accountNumber: student.account_number,
          halaqah: student.halaqah,
        },
      })
    }

    return NextResponse.json({ error: "رقم الحساب غير صحيح" }, { status: 401 })
  } catch (error) {
    console.error("[v0] Auth error:", error)
    return NextResponse.json({ error: "حدث خطأ أثناء تسجيل الدخول" }, { status: 500 })
  }
}
