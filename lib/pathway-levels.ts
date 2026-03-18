export type PathwayLevelRecord = {
  id: number
  student_id: string | null
  halaqah: string | null
  level_number: number
  title: string
  description: string | null
  points: number | null
  is_locked: boolean | null
  half_points_applied?: boolean | null
}

const PATHWAY_LEVEL_SELECT = "id, student_id, halaqah, level_number, title, description, points, is_locked, half_points_applied"
const LEGACY_PATHWAY_LEVEL_SELECT = "id, halaqah, level_number, title, description, points, is_locked, half_points_applied"
const DEFAULT_PATHWAY_LEVEL_TITLES = [
  "الإختبار الأول",
  "الإختبار الثاني",
  "الإختبار الثالث",
  "الإختبار الرابع",
] as const

function isMissingStudentIdColumnError(error: { message?: string; details?: string; hint?: string } | null | undefined) {
  const errorText = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase()
  return errorText.includes("student_id") && (errorText.includes("column") || errorText.includes("schema cache"))
}

async function getLegacyPathwayLevels(supabase: any, halaqah?: string | null, includeStudentIdFilter = true) {
  let legacyQuery = supabase
    .from("pathway_levels")
    .select(includeStudentIdFilter ? PATHWAY_LEVEL_SELECT : LEGACY_PATHWAY_LEVEL_SELECT)
    .order("level_number", { ascending: true })

  if (includeStudentIdFilter) {
    legacyQuery = legacyQuery.is("student_id", null)
  }

  if (halaqah) {
    legacyQuery = legacyQuery.eq("halaqah", halaqah)
  }

  const { data, error } = await legacyQuery

  if (error && includeStudentIdFilter && isMissingStudentIdColumnError(error)) {
    return getLegacyPathwayLevels(supabase, halaqah, false)
  }

  return {
    data: Array.isArray(data)
      ? data.map((level: Record<string, unknown>) => ({
          ...level,
          student_id: includeStudentIdFilter ? (level.student_id as string | null | undefined) ?? null : null,
        }))
      : data,
    error,
  }
}

function buildDefaultStudentPathwayLevels(studentId: string, halaqah?: string | null) {
  return DEFAULT_PATHWAY_LEVEL_TITLES.map((title, index) => ({
    student_id: studentId,
    halaqah: halaqah ?? null,
    level_number: index + 1,
    title,
    description: "",
    points: 100,
    is_locked: false,
    half_points_applied: false,
  }))
}

function buildDefaultLegacyPathwayLevels(halaqah?: string | null) {
  return DEFAULT_PATHWAY_LEVEL_TITLES.map((title, index) => ({
    halaqah: halaqah ?? null,
    level_number: index + 1,
    title,
    description: "",
    points: 100,
    is_locked: false,
    half_points_applied: false,
  }))
}

async function createDefaultPathwayLevelsForStudent(supabase: any, studentId: string, halaqah?: string | null) {
  const { data: insertedLevels, error: insertError } = await supabase
    .from("pathway_levels")
    .insert(buildDefaultStudentPathwayLevels(studentId, halaqah))
    .select(PATHWAY_LEVEL_SELECT)
    .order("level_number", { ascending: true })

  if (!insertError) {
    return { levels: (insertedLevels || []) as PathwayLevelRecord[], error: null }
  }

  if (!isMissingStudentIdColumnError(insertError)) {
    return { levels: null, error: insertError }
  }

  const { data: existingLegacyLevels, error: existingLegacyLevelsError } = await getLegacyPathwayLevels(supabase, halaqah, false)

  if (existingLegacyLevelsError) {
    return { levels: null, error: existingLegacyLevelsError }
  }

  if (Array.isArray(existingLegacyLevels) && existingLegacyLevels.length > 0) {
    return {
      levels: existingLegacyLevels.map((level: Record<string, unknown>) => ({
        ...level,
        student_id: null,
      })) as PathwayLevelRecord[],
      error: null,
    }
  }

  const { data: insertedLegacyLevels, error: insertLegacyError } = await supabase
    .from("pathway_levels")
    .insert(buildDefaultLegacyPathwayLevels(halaqah))
    .select(LEGACY_PATHWAY_LEVEL_SELECT)
    .order("level_number", { ascending: true })

  return {
    levels: (Array.isArray(insertedLegacyLevels)
      ? insertedLegacyLevels.map((level: Record<string, unknown>) => ({
          ...level,
          student_id: null,
        }))
      : []) as PathwayLevelRecord[],
    error: insertLegacyError,
  }
}

export async function ensureStudentPathwayLevels(
  supabase: any,
  studentId: string,
  halaqah?: string | null,
) {
  const { data: studentLevels, error: studentLevelsError } = await supabase
    .from("pathway_levels")
    .select(PATHWAY_LEVEL_SELECT)
    .eq("student_id", studentId)
    .order("level_number", { ascending: true })

  if (studentLevelsError) {
    if (isMissingStudentIdColumnError(studentLevelsError)) {
      const { data: legacyLevels, error: legacyLevelsError } = await getLegacyPathwayLevels(supabase, halaqah)
      return { levels: (legacyLevels || []) as PathwayLevelRecord[], error: legacyLevelsError }
    }

    return { levels: null, error: studentLevelsError }
  }

  if (Array.isArray(studentLevels) && studentLevels.length > 0) {
    return { levels: studentLevels as PathwayLevelRecord[], error: null }
  }

  const { data: legacyLevels, error: legacyLevelsError } = await getLegacyPathwayLevels(supabase, halaqah)

  if (legacyLevelsError) {
    return { levels: null, error: legacyLevelsError }
  }

  if (!Array.isArray(legacyLevels) || legacyLevels.length === 0) {
    return createDefaultPathwayLevelsForStudent(supabase, studentId, halaqah)
  }

  const cloneRows = legacyLevels.map((level: PathwayLevelRecord) => ({
    student_id: studentId,
    halaqah: halaqah ?? level.halaqah ?? null,
    level_number: level.level_number,
    title: level.title,
    description: level.description ?? "",
    points: typeof level.points === "number" ? level.points : 100,
    is_locked: Boolean(level.is_locked),
    half_points_applied: Boolean(level.half_points_applied),
  }))

  const { data: insertedLevels, error: cloneError } = await supabase
    .from("pathway_levels")
    .insert(cloneRows)
    .select(PATHWAY_LEVEL_SELECT)
    .order("level_number", { ascending: true })

  if (!cloneError) {
    return { levels: (insertedLevels || []) as PathwayLevelRecord[], error: null }
  }

  const { data: retryLevels, error: retryError } = await supabase
    .from("pathway_levels")
    .select(PATHWAY_LEVEL_SELECT)
    .eq("student_id", studentId)
    .order("level_number", { ascending: true })

  return {
    levels: (retryLevels || []) as PathwayLevelRecord[],
    error: retryError,
  }
}
