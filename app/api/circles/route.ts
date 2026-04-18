import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { normalizeCircleName } from "@/lib/circle-name"

export const dynamic = "force-dynamic"
export const revalidate = 0

// GET all circles
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: circles, error: circlesError } = await supabase
      .from("circles")
      .select("id, name, created_at")
      .order("created_at", { ascending: true })

    if (circlesError) throw circlesError

    const { data: students, error: studentsError } = await supabase.from("students").select("halaqah")

    const studentCounts = new Map()

    if (studentsError) {
      console.warn("[circles] Failed to fetch student counts, returning circles without counts:", studentsError)
    } else {
      students?.forEach((student) => {
        if (student.halaqah) {
          const normalizedHalaqah = normalizeCircleName(student.halaqah)
          studentCounts.set(normalizedHalaqah, (studentCounts.get(normalizedHalaqah) || 0) + 1)
        }
      })
    }

    const circlesWithCounts = circles?.map((circle) => ({
      id: circle.id,
      name: normalizeCircleName(circle.name),
      studentCount: studentCounts.get(normalizeCircleName(circle.name)) || 0,
      created_at: circle.created_at,
    }))

    return NextResponse.json(
      { circles: circlesWithCounts || [] },
      {
        headers: {
          'Cache-Control': 'private, no-store'
        }
      }
    )
  } catch (error) {
    console.error("[v0] Error fetching circles:", error)
    return NextResponse.json({ error: "Failed to fetch circles" }, { status: 500 })
  }
}

// POST - Add a new circle
export async function POST(request: Request) {
  try {
    const { name } = await request.json()

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Circle name is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase.from("circles").insert({ name }).select().single()

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        return NextResponse.json({ error: "Circle with this name already exists" }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ success: true, circle: data })
  } catch (error) {
    console.error("[v0] Error adding circle:", error)
    return NextResponse.json({ error: "Failed to add circle" }, { status: 500 })
  }
}

// DELETE - Remove a circle
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const circleName = searchParams.get("name")

    if (!circleName) {
      return NextResponse.json({ error: "Circle name is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Delete all students in this circle
    const { error: studentsError } = await supabase.from("students").delete().eq("halaqah", circleName)

    if (studentsError) throw studentsError

    // Delete all attendance records for this circle
    const { error: attendanceError } = await supabase.from("attendance_records").delete().eq("halaqah", circleName)

    if (attendanceError) throw attendanceError

    // Update teachers assigned to this circle
    const { error: usersError } = await supabase.from("users").update({ halaqah: null }).eq("halaqah", circleName)

    if (usersError) throw usersError

    const { error: circleError } = await supabase.from("circles").delete().eq("name", circleName)

    if (circleError) throw circleError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting circle:", error)
    return NextResponse.json({ error: "Failed to delete circle" }, { status: 500 })
  }
}
