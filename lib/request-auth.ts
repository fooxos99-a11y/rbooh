import type { NextRequest } from "next/server"

type SupabaseClientLike = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>

type RequestActor = {
  id: string
  accountNumber: number
  role: string
  halaqah?: string | null
}

const ADMIN_ROLES = new Set(["admin", "مدير", "سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"])
const TEACHER_ROLES = new Set(["teacher", "deputy_teacher"])

function normalizeHalaqahName(value?: string | null) {
  return (value || "").trim().toLowerCase()
}

function normalizeAccountNumber(rawValue: string | null) {
  if (!rawValue) return null

  const normalized = rawValue.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632)).trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function isAdminRole(role?: string | null) {
  return !!role && ADMIN_ROLES.has(role)
}

export function isTeacherRole(role?: string | null) {
  return !!role && TEACHER_ROLES.has(role)
}

export async function getRequestActor(request: NextRequest, supabase: SupabaseClientLike): Promise<RequestActor | null> {
  const accountNumber = normalizeAccountNumber(request.headers.get("x-account-number"))
  if (!accountNumber) {
    return null
  }

  const { data: user } = await supabase
    .from("users")
    .select("id, role, halaqah, account_number")
    .eq("account_number", accountNumber)
    .maybeSingle()

  if (user) {
    return {
      id: user.id,
      accountNumber,
      role: user.role || "",
      halaqah: user.halaqah || null,
    }
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, halaqah, account_number")
    .eq("account_number", accountNumber)
    .maybeSingle()

  if (!student) {
    return null
  }

  return {
    id: student.id,
    accountNumber,
    role: "student",
    halaqah: student.halaqah || null,
  }
}

export async function canAccessStudent(params: {
  supabase: SupabaseClientLike
  actor: RequestActor | null
  studentId: string
  allowStudentSelf?: boolean
  allowTeacher?: boolean
}) {
  const { supabase, actor, studentId, allowStudentSelf = false, allowTeacher = true } = params

  if (!actor) return false
  if (isAdminRole(actor.role)) return true
  if (allowStudentSelf && actor.role === "student" && actor.id === studentId) return true

  if (!allowTeacher || !isTeacherRole(actor.role)) {
    return false
  }

  const { data: student } = await supabase
    .from("students")
    .select("halaqah")
    .eq("id", studentId)
    .maybeSingle()

  return !!normalizeHalaqahName(student?.halaqah) && !!normalizeHalaqahName(actor.halaqah)
    && normalizeHalaqahName(student?.halaqah) === normalizeHalaqahName(actor.halaqah)
}

export function canManageHalaqah(actor: RequestActor | null, halaqah?: string | null) {
  if (!actor) return false
  if (isAdminRole(actor.role)) return true
  return isTeacherRole(actor.role)
    && !!normalizeHalaqahName(halaqah)
    && !!normalizeHalaqahName(actor.halaqah)
    && normalizeHalaqahName(actor.halaqah) === normalizeHalaqahName(halaqah)
}