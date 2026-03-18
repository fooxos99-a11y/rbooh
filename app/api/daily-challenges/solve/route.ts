import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      },
    )

    const body = await request.json()
    const { studentId, studentName, answer } = body

    const correctAnswer = JSON.stringify([
      { shape: "مثلث", size: 1 },
      { shape: "مربع", size: 2 },
      { shape: "دائرة", size: 3 },
      { shape: "نجمة", size: 4 },
    ])

    const isCorrect = answer === correctAnswer

    console.log("[v0] Challenge solution:", {
      studentId,
      studentName,
      isCorrect,
      timestamp: new Date().toISOString(),
    })

    if (isCorrect) {
      return NextResponse.json({
        success: true,
        isCorrect: true,
        pointsAwarded: 20,
        message: "مبروك! حصلت على 20 نقطة",
      })
    } else {
      return NextResponse.json({
        success: false,
        isCorrect: false,
        message: "الترتيب غير صحيح، حاول مرة أخرى غداً",
      })
    }
  } catch (error) {
    console.error("[v0] Error:", error)
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 })
  }
}
