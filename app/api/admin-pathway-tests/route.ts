import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ensureStudentPathwayLevels } from "@/lib/pathway-levels"
import {
  applyPathwayJuzTestResult,
  getAvailablePathwayJuzNumbers,
  type PathwayJuzTestStatus,
} from "@/lib/pathway-juz-tests"

type ActivePlanSnapshot = {
  id?: string
  has_previous?: boolean | null
  prev_start_surah?: number | null
  prev_start_verse?: number | null
  prev_end_surah?: number | null
  prev_end_verse?: number | null
}

type StudentSnapshot = {
  id: string
  name: string
  account_number?: string | number | null
  halaqah: string | null
  points?: number | null
  store_points?: number | null
  completed_juzs?: number[] | null
  current_juzs?: number[] | null
  memorized_start_surah?: number | null
  memorized_start_verse?: number | null
  memorized_end_surah?: number | null
  memorized_end_verse?: number | null
}

async function getStudentSnapshot(supabase: Awaited<ReturnType<typeof createClient>>, studentIdentifier: string) {
  const baseSelect = "id, name, account_number, halaqah, points, store_points, completed_juzs, current_juzs, memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse"

  const { data: byId, error: byIdError } = await supabase
    .from("students")
    .select(baseSelect)
    .eq("id", studentIdentifier)
    .maybeSingle<StudentSnapshot>()

  if (byId) {
    return { student: byId, error: null }
  }

  if (byIdError && byIdError.code && byIdError.code !== "PGRST116") {
    return { student: null, error: byIdError }
  }

  const { data: byAccountNumber, error: byAccountError } = await supabase
    .from("students")
    .select(baseSelect)
    .eq("account_number", studentIdentifier)
    .maybeSingle<StudentSnapshot>()

  return { student: byAccountNumber, error: byAccountError }
}

async function getActivePlanSnapshot(supabase: Awaited<ReturnType<typeof createClient>>, studentId: string) {
  const { data, error } = await supabase
    .from("student_plans")
    .select("id, has_previous, prev_start_surah, prev_start_verse, prev_end_surah, prev_end_verse, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ActivePlanSnapshot & { created_at?: string | null }>()

  return { plan: data, error }
}

function mergeStudentMemorizationSnapshot(student: StudentSnapshot, plan?: ActivePlanSnapshot | null): StudentSnapshot {
  if (!plan?.has_previous) {
    return student
  }

  return {
    ...student,
    memorized_start_surah: student.memorized_start_surah ?? plan.prev_start_surah ?? null,
    memorized_start_verse: student.memorized_start_verse ?? plan.prev_start_verse ?? null,
    memorized_end_surah: student.memorized_end_surah ?? plan.prev_end_surah ?? null,
    memorized_end_verse: student.memorized_end_verse ?? plan.prev_end_verse ?? null,
  }
}

type PathwayJuzTestRow = {
  juz_number: number
  level_number: number
  status: PathwayJuzTestStatus
  tested_at?: string | null
  tested_by_name?: string | null
  notes?: string | null
}

type SerializedPathwayJuzResult = {
  status: PathwayJuzTestStatus
  levelNumber: number
  testedAt: string | null
  testedByName: string | null
  notes: string | null
}

function serializePathwayJuzResult(row: PathwayJuzTestRow): SerializedPathwayJuzResult {
  return {
    status: row.status,
    levelNumber: row.level_number,
    testedAt: row.tested_at ?? null,
    testedByName: row.tested_by_name ?? null,
    notes: row.notes ?? null,
  }
}

function getResultSortValue(result: SerializedPathwayJuzResult) {
  return new Date(result.testedAt || 0).getTime()
}

function buildResultsMap(rows: PathwayJuzTestRow[]) {
  return rows.reduce<Record<string, {
    status: PathwayJuzTestStatus
    levelNumber: number
    testedAt: string | null
    testedByName: string | null
    notes: string | null
    levelResults: SerializedPathwayJuzResult[]
  }>>((accumulator, row) => {
    const key = String(row.juz_number)
    const serializedResult = serializePathwayJuzResult(row)

    if (!accumulator[key]) {
      accumulator[key] = {
        ...serializedResult,
        levelResults: [serializedResult],
      }

      return accumulator
    }

    const existingLevelResults = accumulator[key].levelResults.filter((item) => item.levelNumber !== serializedResult.levelNumber)
    const nextLevelResults = [...existingLevelResults, serializedResult].sort((left, right) => left.levelNumber - right.levelNumber)
    const latestResult = getResultSortValue(serializedResult) >= getResultSortValue(accumulator[key])
      ? serializedResult
      : accumulator[key]

    accumulator[key] = {
      status: latestResult.status,
      levelNumber: latestResult.levelNumber,
      testedAt: latestResult.testedAt,
      testedByName: latestResult.testedByName,
      notes: latestResult.notes,
      levelResults: nextLevelResults,
    }

    return accumulator
  }, {})
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("student_id")

    if (!studentId) {
      return NextResponse.json({ error: "student_id مطلوب" }, { status: 400 })
    }

    const { student, error: studentError } = await getStudentSnapshot(adminSupabase, studentId)

    if (studentError || !student) {
      return NextResponse.json({ error: "تعذر جلب بيانات الطالب" }, { status: 404 })
    }

    const { plan } = await getActivePlanSnapshot(adminSupabase, student.id)
    const effectiveStudent = mergeStudentMemorizationSnapshot(student, plan)

    const [{ levels, error: levelsError }, { data: testRows, error: testsError }] = await Promise.all([
      ensureStudentPathwayLevels(adminSupabase, student.id, effectiveStudent.halaqah),
      adminSupabase
        .from("pathway_student_juz_tests")
        .select("juz_number, level_number, status, tested_at, tested_by_name, notes")
        .eq("student_id", student.id)
        .order("juz_number", { ascending: true })
        .order("level_number", { ascending: true })
        .order("tested_at", { ascending: false }),
    ])

    if (levelsError) {
      return NextResponse.json({ error: "تعذر جلب مستويات المسار" }, { status: 500 })
    }

    if (testsError) {
      return NextResponse.json({ error: "تعذر جلب نتائج اختبارات المسار" }, { status: 500 })
    }

    const availableJuzs = getAvailablePathwayJuzNumbers(effectiveStudent)
    const testedJuzs = Array.from(new Set((testRows || []).map((row) => row.juz_number))).sort((left, right) => left - right)
    const displayJuzs = Array.from(new Set([...availableJuzs, ...testedJuzs])).sort((left, right) => left - right)
    const resultsByJuz = buildResultsMap(testRows || [])

    return NextResponse.json({
      student: {
        ...effectiveStudent,
        completed_juzs: effectiveStudent.completed_juzs || [],
        current_juzs: effectiveStudent.current_juzs || [],
      },
      levels: levels || [],
      availableJuzs,
      displayJuzs: displayJuzs.map((juzNumber) => ({
        juzNumber,
        isCurrentlyMemorized: availableJuzs.includes(juzNumber),
        latestResult: resultsByJuz[String(juzNumber)]
          ? {
              status: resultsByJuz[String(juzNumber)].status,
              lastLevelNumber: resultsByJuz[String(juzNumber)].levelNumber,
              testedAt: resultsByJuz[String(juzNumber)].testedAt,
              testedByName: resultsByJuz[String(juzNumber)].testedByName,
              notes: resultsByJuz[String(juzNumber)].notes,
            }
          : null,
        levelResults: resultsByJuz[String(juzNumber)]?.levelResults || [],
      })),
    })
  } catch (error) {
    console.error("[admin-pathway-tests] GET error:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const adminSupabase = createAdminClient()
    const body = await request.json()
    const studentId = String(body?.student_id || "")
    const levelNumber = Number.parseInt(String(body?.level_number || ""), 10)
    const juzNumber = Number.parseInt(String(body?.juz_number || ""), 10)
    const status = body?.status as PathwayJuzTestStatus
    const testedByName = typeof body?.tested_by_name === "string" ? body.tested_by_name.trim() : null
    const notes = typeof body?.notes === "string" ? body.notes.trim() : null

    if (!studentId || Number.isNaN(levelNumber) || Number.isNaN(juzNumber) || !["pass", "fail"].includes(status)) {
      return NextResponse.json({ error: "البيانات المطلوبة غير مكتملة" }, { status: 400 })
    }

    const { student, error: studentError } = await getStudentSnapshot(adminSupabase, studentId)

    if (studentError || !student) {
      return NextResponse.json({ error: "تعذر جلب بيانات الطالب" }, { status: 404 })
    }

    const { plan } = await getActivePlanSnapshot(adminSupabase, student.id)
    const effectiveStudent = mergeStudentMemorizationSnapshot(student, plan)

    const { error: ensureLevelsError } = await ensureStudentPathwayLevels(adminSupabase, student.id, effectiveStudent.halaqah)
    if (ensureLevelsError) {
      return NextResponse.json({ error: "تعذر تهيئة مستويات الطالب" }, { status: 500 })
    }

    let targetLevelQuery = adminSupabase
      .from("pathway_levels")
      .select("id, is_locked, points")
      .eq("level_number", levelNumber)
      .eq("student_id", student.id)

    let { data: targetLevel, error: targetLevelError } = await targetLevelQuery
      .maybeSingle<{ id: number; is_locked: boolean | null; points: number | null }>()

    const targetLevelErrorText = `${targetLevelError?.message || ""} ${targetLevelError?.details || ""}`.toLowerCase()
    if (targetLevelError && targetLevelErrorText.includes("student_id") && (targetLevelErrorText.includes("column") || targetLevelErrorText.includes("schema cache"))) {
      const fallbackQuery = effectiveStudent.halaqah
        ? adminSupabase
            .from("pathway_levels")
            .select("id, is_locked, points")
            .eq("level_number", levelNumber)
            .eq("halaqah", effectiveStudent.halaqah)
        : adminSupabase
            .from("pathway_levels")
            .select("id, is_locked, points")
            .eq("level_number", levelNumber)

      const fallbackResult = await fallbackQuery.maybeSingle<{ id: number; is_locked: boolean | null; points: number | null }>()
      targetLevel = fallbackResult.data
      targetLevelError = fallbackResult.error
    }

    if (targetLevelError) {
      return NextResponse.json({ error: "تعذر التحقق من حالة المستوى" }, { status: 500 })
    }

    if (!targetLevel) {
      return NextResponse.json({ error: "المستوى المحدد غير موجود لهذا الطالب" }, { status: 404 })
    }

    if (targetLevel.is_locked) {
      return NextResponse.json({ error: "المستوى المحدد مقفل حاليًا ولا يمكن تقييمه" }, { status: 400 })
    }

    const availableJuzs = getAvailablePathwayJuzNumbers(effectiveStudent)
    const isCurrentlyMemorized = availableJuzs.includes(juzNumber)

    const [
      { data: existingTestRow, error: existingTestError },
      { data: existingHistoricalRows, error: existingHistoricalError },
      { data: existingLevelCompletion, error: existingCompletionError },
    ] = await Promise.all([
      adminSupabase
        .from("pathway_student_juz_tests")
        .select("id, status, level_number")
        .eq("student_id", student.id)
        .eq("juz_number", juzNumber)
        .eq("level_number", levelNumber)
        .maybeSingle<{ id: string; status: PathwayJuzTestStatus; level_number: number }>(),
      adminSupabase
        .from("pathway_student_juz_tests")
        .select("id")
        .eq("student_id", student.id)
        .eq("juz_number", juzNumber)
        .limit(1),
      adminSupabase
        .from("pathway_level_completions")
        .select("id, points")
        .eq("student_id", student.id)
        .eq("level_number", levelNumber)
        .maybeSingle<{ id: number; points: number | null }>(),
    ])

    if (existingTestError && existingTestError.code && existingTestError.code !== "PGRST116") {
      return NextResponse.json({ error: "تعذر التحقق من نتيجة الجزء الحالية" }, { status: 500 })
    }

    if (existingHistoricalError) {
      return NextResponse.json({ error: "تعذر التحقق من سجل اختبارات الجزء" }, { status: 500 })
    }

    if (existingCompletionError && existingCompletionError.code && existingCompletionError.code !== "PGRST116") {
      return NextResponse.json({ error: "تعذر التحقق من نقاط المستوى الحالية" }, { status: 500 })
    }

    const wasPreviouslyTested = Boolean(existingHistoricalRows && existingHistoricalRows.length > 0)
    const isKnownJuz = isCurrentlyMemorized || wasPreviouslyTested

    if (!isKnownJuz) {
      return NextResponse.json({ error: "هذا الجزء غير موجود حاليًا في محفوظ الطالب" }, { status: 400 })
    }

    if (!isCurrentlyMemorized && status === "pass" && !wasPreviouslyTested) {
      return NextResponse.json({ error: "هذا الجزء غير موجود حاليًا في محفوظ الطالب" }, { status: 400 })
    }

    const nextMemorizationState = applyPathwayJuzTestResult(effectiveStudent, juzNumber, status)
    const originalMemorizationState = {
      completed_juzs: student.completed_juzs || [],
      current_juzs: student.current_juzs || [],
      memorized_start_surah: student.memorized_start_surah ?? null,
      memorized_start_verse: student.memorized_start_verse ?? null,
      memorized_end_surah: student.memorized_end_surah ?? null,
      memorized_end_verse: student.memorized_end_verse ?? null,
    }
    const originalStudentPointsState = {
      points: Number(student.points) || 0,
      store_points: Number(student.store_points) || 0,
    }
    const originalPlanState = plan?.id
      ? {
          has_previous: plan.has_previous ?? null,
          prev_start_surah: plan.prev_start_surah ?? null,
          prev_start_verse: plan.prev_start_verse ?? null,
          prev_end_surah: plan.prev_end_surah ?? null,
          prev_end_verse: plan.prev_end_verse ?? null,
        }
      : null
    const nextPlanState = {
      has_previous: Boolean(
        nextMemorizationState.memorized_start_surah && nextMemorizationState.memorized_end_surah,
      ),
      prev_start_surah: nextMemorizationState.memorized_start_surah ?? null,
      prev_start_verse: nextMemorizationState.memorized_start_verse ?? null,
      prev_end_surah: nextMemorizationState.memorized_end_surah ?? null,
      prev_end_verse: nextMemorizationState.memorized_end_verse ?? null,
    }
    const levelAwardPoints = Math.max(0, Number(targetLevel.points) || 100)

    let studentMemorizationUpdated = false
    let activePlanUpdated = false
    let studentPointsUpdated = false
    let levelCompletionChanged = false

    const memorizationStateChanged = (
      JSON.stringify(originalMemorizationState.completed_juzs) !== JSON.stringify(nextMemorizationState.completed_juzs)
      || JSON.stringify(originalMemorizationState.current_juzs) !== JSON.stringify(nextMemorizationState.current_juzs)
      || originalMemorizationState.memorized_start_surah !== nextMemorizationState.memorized_start_surah
      || originalMemorizationState.memorized_start_verse !== nextMemorizationState.memorized_start_verse
      || originalMemorizationState.memorized_end_surah !== nextMemorizationState.memorized_end_surah
      || originalMemorizationState.memorized_end_verse !== nextMemorizationState.memorized_end_verse
    )

    if (memorizationStateChanged) {
      const { error: updateStudentError } = await adminSupabase
        .from("students")
        .update(nextMemorizationState)
        .eq("id", student.id)

      if (updateStudentError) {
        return NextResponse.json({ error: status === "pass" ? "تعذر تحديث محفوظ الطالب بعد النجاح" : "تعذر تحديث محفوظ الطالب بعد الرسوب" }, { status: 500 })
      }

      studentMemorizationUpdated = true

      if (plan?.id) {
        const { error: updatePlanError } = await adminSupabase
          .from("student_plans")
          .update(nextPlanState)
          .eq("id", plan.id)

        if (updatePlanError) {
          await adminSupabase
            .from("students")
            .update(originalMemorizationState)
            .eq("id", student.id)

          return NextResponse.json({ error: status === "pass" ? "تعذر تحديث الخطة بعد النجاح" : "تعذر تحديث الخطة بعد الرسوب" }, { status: 500 })
        }

        activePlanUpdated = true
      }
    }

    if (status === "pass" && !existingLevelCompletion) {
      const { error: insertCompletionError } = await adminSupabase
        .from("pathway_level_completions")
        .insert({
          student_id: student.id,
          level_number: levelNumber,
          points: levelAwardPoints,
        })

      if (insertCompletionError) {
        if (activePlanUpdated && plan?.id && originalPlanState) {
          await adminSupabase.from("student_plans").update(originalPlanState).eq("id", plan.id)
        }

        if (studentMemorizationUpdated) {
          await adminSupabase.from("students").update(originalMemorizationState).eq("id", student.id)
        }

        return NextResponse.json({ error: "تعذر تسجيل نقاط المستوى بعد النجاح" }, { status: 500 })
      }

      const { error: updateStudentPointsError } = await adminSupabase
        .from("students")
        .update({
          points: originalStudentPointsState.points + levelAwardPoints,
          store_points: originalStudentPointsState.store_points + levelAwardPoints,
        })
        .eq("id", student.id)

      if (updateStudentPointsError) {
        await adminSupabase
          .from("pathway_level_completions")
          .delete()
          .eq("student_id", student.id)
          .eq("level_number", levelNumber)

        if (activePlanUpdated && plan?.id && originalPlanState) {
          await adminSupabase.from("student_plans").update(originalPlanState).eq("id", plan.id)
        }

        if (studentMemorizationUpdated) {
          await adminSupabase.from("students").update(originalMemorizationState).eq("id", student.id)
        }

        return NextResponse.json({ error: "تعذر إضافة نقاط الطالب بعد النجاح" }, { status: 500 })
      }

      levelCompletionChanged = true
      studentPointsUpdated = true
    }

    if (status === "fail" && existingTestRow?.status === "pass" && existingLevelCompletion) {
      const { data: remainingPassRows, error: remainingPassRowsError } = await adminSupabase
        .from("pathway_student_juz_tests")
        .select("id")
        .eq("student_id", student.id)
        .eq("level_number", levelNumber)
        .eq("status", "pass")
        .neq("juz_number", juzNumber)

      if (remainingPassRowsError) {
        return NextResponse.json({ error: "تعذر التحقق من نجاحات المستوى الحالية" }, { status: 500 })
      }

      if (!remainingPassRows || remainingPassRows.length === 0) {
        const pointsToRevoke = Math.max(0, Number(existingLevelCompletion.points) || levelAwardPoints)

        const { error: deleteCompletionError } = await adminSupabase
          .from("pathway_level_completions")
          .delete()
          .eq("id", existingLevelCompletion.id)

        if (deleteCompletionError) {
          return NextResponse.json({ error: "تعذر سحب نقاط المستوى بعد الرسوب" }, { status: 500 })
        }

        const { error: revokeStudentPointsError } = await adminSupabase
          .from("students")
          .update({
            points: Math.max(0, originalStudentPointsState.points - pointsToRevoke),
            store_points: Math.max(0, originalStudentPointsState.store_points - pointsToRevoke),
          })
          .eq("id", student.id)

        if (revokeStudentPointsError) {
          await adminSupabase
            .from("pathway_level_completions")
            .insert({
              student_id: student.id,
              level_number: levelNumber,
              points: pointsToRevoke,
            })

          return NextResponse.json({ error: "تعذر تحديث نقاط الطالب بعد الرسوب" }, { status: 500 })
        }

        levelCompletionChanged = true
        studentPointsUpdated = true
      }
    }

    const payload = {
      student_id: student.id,
      juz_number: juzNumber,
      level_number: levelNumber,
      status,
      halaqah: effectiveStudent.halaqah,
      tested_by_name: testedByName,
      notes: notes || null,
      tested_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const testSaveQuery = existingTestRow?.id
      ? adminSupabase
          .from("pathway_student_juz_tests")
          .update(payload)
          .eq("id", existingTestRow.id)
      : adminSupabase
          .from("pathway_student_juz_tests")
          .insert(payload)

    const { error: testSaveError } = await testSaveQuery

    if (testSaveError) {
      console.error("[admin-pathway-tests] save test row error:", testSaveError)

      if (studentMemorizationUpdated) {
        await adminSupabase
          .from("students")
          .update(originalMemorizationState)
          .eq("id", student.id)
      }

      if (studentPointsUpdated) {
        await adminSupabase
          .from("students")
          .update(originalStudentPointsState)
          .eq("id", student.id)
      }

      if (levelCompletionChanged) {
        if (existingLevelCompletion) {
          await adminSupabase
            .from("pathway_level_completions")
            .upsert({
              student_id: student.id,
              level_number: levelNumber,
              points: existingLevelCompletion.points ?? levelAwardPoints,
            }, { onConflict: "student_id,level_number" })
        } else {
          await adminSupabase
            .from("pathway_level_completions")
            .delete()
            .eq("student_id", student.id)
            .eq("level_number", levelNumber)
        }
      }

      if (activePlanUpdated && plan?.id && originalPlanState) {
        await adminSupabase
          .from("student_plans")
          .update(originalPlanState)
          .eq("id", plan.id)
      }

      return NextResponse.json({ error: "تعذر حفظ نتيجة اختبار الجزء" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      status,
      updatedStudentMemorization: memorizationStateChanged ? nextMemorizationState : null,
    })
  } catch (error) {
    console.error("[admin-pathway-tests] POST error:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}