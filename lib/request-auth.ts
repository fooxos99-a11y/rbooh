import type { NextRequest } from "next/server"
import { circleNamesMatch, normalizeCircleNameKey, resolveCircleName } from "@/lib/circle-name"

type SupabaseClientLike = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>

type RequestActor = {
  id: string
  accountNumber: number
  role: string
  halaqah?: string | null
}

const ADMIN_ROLES = new Set(["admin", "مدير", "سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"])
const TEACHER_ROLES = new Set(["teacher", "deputy_teacher", "معلم", "نائب معلم"])

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

  let userQuery = await supabase
    .from("users")
    .select("id, role, halaqah, circle_name, account_number")
    .eq("account_number", accountNumber)
    .maybeSingle()

  if (userQuery.error && isMissingCircleNameColumn(userQuery.error)) {
    userQuery = await supabase
      .from("users")
      .select("id, role, halaqah, account_number")
      .eq("account_number", accountNumber)
      .maybeSingle()
  }

  const { data: user } = userQuery

  if (user) {
    return {
      id: user.id,
      accountNumber,
      role: user.role || "",
      halaqah: resolveCircleName(user.halaqah, user.circle_name) || null,
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

  return !!normalizeCircleNameKey(student?.halaqah) && !!normalizeCircleNameKey(actor.halaqah)
    && circleNamesMatch(student?.halaqah, actor.halaqah)
}

export function canManageHalaqah(actor: RequestActor | null, halaqah?: string | null) {
  if (!actor) return false
  if (isAdminRole(actor.role)) return true
  return isTeacherRole(actor.role)
    && !!normalizeCircleNameKey(halaqah)
    && !!normalizeCircleNameKey(actor.halaqah)
    && circleNamesMatch(actor.halaqah, halaqah)
}