"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SiteLoader } from "@/components/ui/site-loader"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  Lock,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Unlock,
} from "lucide-react"
import {
  calculatePathwayTestScore,
  DEFAULT_PATHWAY_TEST_SCORING_SETTINGS,
  normalizePathwayTestScoringSettings,
  PATHWAY_TEST_SCORING_SETTING_ID,
  type PathwayTestScoreDetails,
  type PathwayTestScoringSettings,
} from "@/lib/pathway-test-scoring"

type Circle = { id: string; name: string }
type StudentOption = { id: string; name: string }
type PathwayLevel = {
  id: number
  level_number: number
  title: string
  description: string | null
  points: number
  is_locked: boolean
}

type DisplayJuz = {
  juzNumber: number
  isCurrentlyMemorized: boolean
  hasHistoricalResult: boolean
  latestResult: {
    status: "pass" | "fail"
    lastLevelNumber: number | null
    testedAt: string | null
    testedByName: string | null
    notes: string | null
    scoreDetails: PathwayTestScoreDetails | null
  } | null
  levelResults: Array<{
    status: "pass" | "fail"
    levelNumber: number
    testedAt: string | null
    testedByName: string | null
    notes: string | null
    scoreDetails: PathwayTestScoreDetails | null
  }>
}

type PathwayTestsTabProps = {
  canManageSetup: boolean
  canManageTests: boolean
}

type LoadStudentPathwayDataOptions = {
  silent?: boolean
  preferredLevelNumber?: number | null
}

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
)

const juzOrdinalNames = [
  "الأول",
  "الثاني",
  "الثالث",
  "الرابع",
  "الخامس",
  "السادس",
  "السابع",
  "الثامن",
  "التاسع",
  "العاشر",
  "الحادي عشر",
  "الثاني عشر",
  "الثالث عشر",
  "الرابع عشر",
  "الخامس عشر",
  "السادس عشر",
  "السابع عشر",
  "الثامن عشر",
  "التاسع عشر",
  "العشرون",
  "الحادي والعشرون",
  "الثاني والعشرون",
  "الثالث والعشرون",
  "الرابع والعشرون",
  "الخامس والعشرون",
  "السادس والعشرون",
  "السابع والعشرون",
  "الثامن والعشرون",
  "التاسع والعشرون",
  "الثلاثون",
]

function getJuzLabel(juzNumber: number) {
  const ordinalName = juzOrdinalNames[juzNumber - 1]
  return ordinalName ? `الجزء ${ordinalName}` : `الجزء ${juzNumber}`
}

export function PathwayTestsTab({ canManageSetup, canManageTests }: PathwayTestsTabProps) {
  const { toast } = useToast()

  const [circles, setCircles] = useState<Circle[]>([])
  const [selectedCircle, setSelectedCircle] = useState("")
  const [students, setStudents] = useState<StudentOption[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [levels, setLevels] = useState<PathwayLevel[]>([])
  const [selectedLevelNumber, setSelectedLevelNumber] = useState<number | null>(null)
  const [displayJuzs, setDisplayJuzs] = useState<DisplayJuz[]>([])
  const [studentName, setStudentName] = useState("")
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [pointsEditValue, setPointsEditValue] = useState("0")
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [scoringSettings, setScoringSettings] = useState<PathwayTestScoringSettings>(DEFAULT_PATHWAY_TEST_SCORING_SETTINGS)
  const [showScoringSettingsModal, setShowScoringSettingsModal] = useState(false)
  const [scoringSettingsDraft, setScoringSettingsDraft] = useState<PathwayTestScoringSettings>(DEFAULT_PATHWAY_TEST_SCORING_SETTINGS)
  const [isSavingScoringSettings, setIsSavingScoringSettings] = useState(false)
  const [pendingPassJuzNumber, setPendingPassJuzNumber] = useState<number | null>(null)
  const [warningCountInput, setWarningCountInput] = useState("0")
  const [mistakeCountInput, setMistakeCountInput] = useState("0")

  useEffect(() => {
    void loadCircles()
    void loadScoringSettings()
  }, [])

  useEffect(() => {
    if (!selectedCircle) return
    void loadStudents(selectedCircle)
  }, [selectedCircle])

  useEffect(() => {
    if (!selectedStudentId) return
    void loadStudentPathwayData(selectedStudentId)
  }, [selectedStudentId])

  async function loadCircles() {
    try {
      const response = await fetch("/api/circles")
      const data = await response.json()
      const nextCircles = Array.isArray(data.circles) ? data.circles : []
      setCircles(nextCircles)
      if (nextCircles.length > 0) {
        setSelectedCircle(nextCircles[0].name)
      }
    } catch {
      toast({ title: "خطأ", description: "تعذر جلب الحلقات", variant: "destructive" })
    }
  }

  async function loadScoringSettings() {
    try {
      const response = await fetch(`/api/site-settings?id=${PATHWAY_TEST_SCORING_SETTING_ID}`, { cache: "no-store" })
      const data = await response.json()
      const normalized = normalizePathwayTestScoringSettings(data.value)
      setScoringSettings(normalized)
      setScoringSettingsDraft(normalized)
    } catch {
      setScoringSettings(DEFAULT_PATHWAY_TEST_SCORING_SETTINGS)
      setScoringSettingsDraft(DEFAULT_PATHWAY_TEST_SCORING_SETTINGS)
    }
  }

  async function loadStudents(circleName: string) {
    setLoadingStudents(true)
    setSelectedStudentId("")
    setLevels([])
    setDisplayJuzs([])
    setStudentName("")

    try {
      const response = await fetch(`/api/students?circle=${encodeURIComponent(circleName)}`)
      const data = await response.json()
      const nextStudents = Array.isArray(data.students)
        ? data.students.map((student: { id: string; name: string }) => ({ id: student.id, name: student.name }))
        : []

      setStudents(nextStudents)
    } catch {
      toast({ title: "خطأ", description: "تعذر جلب الطلاب", variant: "destructive" })
    } finally {
      setLoadingStudents(false)
    }
  }

  async function loadStudentPathwayData(studentId: string, options?: LoadStudentPathwayDataOptions) {
    if (!options?.silent) {
      setLoadingData(true)
    }

    try {
      const response = await fetch(`/api/admin-pathway-tests?student_id=${encodeURIComponent(studentId)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "تعذر جلب بيانات اختبارات المسار")
      }

      const nextLevels = Array.isArray(data.levels) ? data.levels : []
      setLevels(nextLevels)
      setDisplayJuzs(Array.isArray(data.displayJuzs) ? data.displayJuzs : [])
      setStudentName(data.student?.name || "")
      setSelectedLevelNumber((current) => {
        if (options?.preferredLevelNumber && nextLevels.some((level: PathwayLevel) => level.level_number === options.preferredLevelNumber)) {
          return options.preferredLevelNumber
        }

        if (current && nextLevels.some((level: PathwayLevel) => level.level_number === current)) {
          return current
        }

        return nextLevels[0]?.level_number ?? null
      })
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "تعذر جلب بيانات اختبارات المسار",
        variant: "destructive",
      })
    } finally {
      if (!options?.silent) {
        setLoadingData(false)
      }
    }
  }

  async function refreshSelectedStudentData(options?: LoadStudentPathwayDataOptions) {
    if (!selectedStudentId) return
    await loadStudentPathwayData(selectedStudentId, options)
  }

  async function saveResult(juzNumber: number, status: "pass" | "fail", scoreCounts?: { warningCount: number; mistakeCount: number }) {
    if (!canManageTests || !selectedStudentId || !selectedLevelNumber || selectedLevel?.is_locked) return

    const currentLevelNumber = selectedLevelNumber

    const storageUser = typeof window !== "undefined" ? window.localStorage.getItem("currentUser") : null
    let testedByName = "الإدارة"

    if (storageUser) {
      try {
        const parsed = JSON.parse(storageUser)
        testedByName = parsed?.name || parsed?.full_name || parsed?.account_number || testedByName
      } catch {
        testedByName = "الإدارة"
      }
    }

    const saveId = `${juzNumber}-${status}`
    setSavingKey(saveId)

    try {
      const response = await fetch("/api/admin-pathway-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudentId,
          level_number: currentLevelNumber,
          juz_number: juzNumber,
          status,
          tested_by_name: testedByName,
          warning_count: status === "pass" ? (scoreCounts?.warningCount ?? 0) : 0,
          mistake_count: status === "pass" ? (scoreCounts?.mistakeCount ?? 0) : 0,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "تعذر حفظ نتيجة الاختبار")
      }

      await refreshSelectedStudentData({ silent: true, preferredLevelNumber: currentLevelNumber })
      toast({
        title: "تم الحفظ",
        description: status === "pass"
          ? `تم اعتماد نجاح الجزء ${juzNumber}`
          : `تم اعتماد رسوب الجزء ${juzNumber} وحذفه من محفوظ الطالب`,
      })
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "تعذر حفظ نتيجة الاختبار",
        variant: "destructive",
      })
    } finally {
      setSavingKey(null)
    }
  }

  async function handleSaveScoringSettings() {
    try {
      setIsSavingScoringSettings(true)
      const normalized = normalizePathwayTestScoringSettings(scoringSettingsDraft)
      const response = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: PATHWAY_TEST_SCORING_SETTING_ID,
          value: normalized,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر حفظ إعدادات الاختبار")
      }

      setScoringSettings(normalized)
      setScoringSettingsDraft(normalized)
      setShowScoringSettingsModal(false)
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات خصم الإختبار" })
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "تعذر حفظ إعدادات الاختبار",
        variant: "destructive",
      })
    } finally {
      setIsSavingScoringSettings(false)
    }
  }

  function openPassModal(juzNumber: number) {
    setPendingPassJuzNumber(juzNumber)
    setWarningCountInput("0")
    setMistakeCountInput("0")
  }

  async function handleConfirmPassResult() {
    if (!pendingPassJuzNumber) return

    const warningCount = Math.max(0, Number.parseInt(warningCountInput || "0", 10) || 0)
    const mistakeCount = Math.max(0, Number.parseInt(mistakeCountInput || "0", 10) || 0)

    await saveResult(pendingPassJuzNumber, "pass", { warningCount, mistakeCount })
    setPendingPassJuzNumber(null)
  }

  async function handleAddLevel() {
    if (!canManageSetup || !selectedCircle || !selectedStudentId) return

    const nextNumber = (levels[levels.length - 1]?.level_number || 0) + 1
    let { error } = await supabase.from("pathway_levels").insert({
      student_id: selectedStudentId,
      level_number: nextNumber,
      halaqah: selectedCircle,
      title: `المستوى ${nextNumber}`,
      description: "",
      points: 100,
      is_locked: false,
      half_points_applied: false,
    })

    const errorText = `${error?.message || ""} ${error?.details || ""}`.toLowerCase()
    if (error && errorText.includes("student_id") && (errorText.includes("column") || errorText.includes("schema cache"))) {
      const retry = await supabase.from("pathway_levels").insert({
        level_number: nextNumber,
        halaqah: selectedCircle,
        title: `المستوى ${nextNumber}`,
        description: "",
        points: 100,
        is_locked: false,
        half_points_applied: false,
      })
      error = retry.error
    }

    if (error) {
      toast({ title: "خطأ", description: "حدث خطأ أثناء إضافة المستوى", variant: "destructive" })
      return
    }

    toast({ title: "تم", description: "تمت إضافة مستوى جديد بنجاح" })
    await refreshSelectedStudentData()
    setSelectedLevelNumber(nextNumber)
  }

  async function handleDeleteLevel() {
    if (!canManageSetup || !selectedCircle || !selectedStudentId || levels.length === 0) return

    const maxLevel = Math.max(...levels.map((level) => level.level_number))
    const targetLevel = levels.find((level) => level.level_number === maxLevel)
    if (!targetLevel) return

    const { error } = await supabase
      .from("pathway_levels")
      .delete()
      .eq("id", targetLevel.id)

    if (error) {
      toast({ title: "خطأ", description: "حدث خطأ أثناء حذف المستوى", variant: "destructive" })
      return
    }

    toast({ title: "تم", description: "تم حذف آخر مستوى بنجاح" })
    await refreshSelectedStudentData()
  }

  async function handleToggleLockLevel() {
    const selectedLevel = levels.find((level) => level.level_number === selectedLevelNumber)
    if (!canManageSetup || !selectedCircle || !selectedStudentId || !selectedLevel) return

    const { error } = await supabase
      .from("pathway_levels")
      .update({ is_locked: !selectedLevel.is_locked })
      .eq("id", selectedLevel.id)

    if (error) {
      toast({ title: "خطأ", description: "حدث خطأ أثناء تحديث حالة القفل", variant: "destructive" })
      return
    }

    toast({ title: "تم", description: selectedLevel.is_locked ? "تم فتح المستوى" : "تم قفل المستوى" })
    await refreshSelectedStudentData()
  }

  async function handleSaveLevelEdit() {
    const selectedLevel = levels.find((level) => level.level_number === selectedLevelNumber)
    if (!canManageSetup || !selectedLevel) return

    const parsedPoints = Number(pointsEditValue)
    const normalizedPoints = Number.isFinite(parsedPoints) && parsedPoints >= 0 ? parsedPoints : 0

    const { error } = await supabase
      .from("pathway_levels")
      .update({ title: editTitle, description: editDescription, points: normalizedPoints })
      .eq("id", selectedLevel.id)

    if (error) {
      toast({ title: "خطأ", description: "تعذر تحديث بيانات المستوى", variant: "destructive" })
      return
    }

    setShowEditModal(false)
    await refreshSelectedStudentData()
  }

  const selectedLevel = levels.find((level) => level.level_number === selectedLevelNumber) || null
  const pendingScorePreview = calculatePathwayTestScore({
    settings: scoringSettings,
    warningCount: Math.max(0, Number.parseInt(warningCountInput || "0", 10) || 0),
    mistakeCount: Math.max(0, Number.parseInt(mistakeCountInput || "0", 10) || 0),
  })
  const visibleDisplayJuzs = displayJuzs.filter((item) => {
    if (!selectedLevelNumber) {
      return false
    }

    const hasSelectedLevelResult = item.levelResults.some((result) => result.levelNumber === selectedLevelNumber)
    if (hasSelectedLevelResult) {
      return true
    }

    if (item.hasHistoricalResult) {
      return false
    }

    return item.isCurrentlyMemorized
  })

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-[#3453a7]/18 bg-white/95 shadow-[0_12px_28px_rgba(26,35,50,0.08)]">
        <div className="px-6 py-7 md:px-7">
          <div className="space-y-5">
            <div>
              <div className="mb-3 flex items-start justify-between gap-3 border-b border-[#3453a7]/12 pb-3">
                <div className="text-right">
                  <p className="text-lg font-black leading-8 text-[#1a2332]">الإختبار</p>
                  <p className="mt-1 text-sm font-medium text-neutral-500">اختر الطالب ثم اختبره في الأجزاء داخل المستوى المحدد.</p>
                </div>

                {canManageSetup ? (
                  <button
                    onClick={() => {
                      setScoringSettingsDraft(scoringSettings)
                      setShowScoringSettingsModal(true)
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-[#8fb1ff] bg-[#f7faff] px-4 text-[#3453a7] transition-all hover:-translate-y-0.5 hover:bg-[#eaf1ff]"
                    title="إعدادات الاختبار"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="text-xs font-bold">إعدادات الاختبار</span>
                  </button>
                ) : <div />}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block space-y-2 text-right">
                  <span className="text-[11px] font-bold tracking-wide text-neutral-500">الحلقة</span>
                  <Select value={selectedCircle} onValueChange={setSelectedCircle}>
                    <SelectTrigger className="h-11 w-full rounded-2xl border-[#8fb1ff] bg-white px-4 text-right text-sm font-semibold text-[#1a2332]">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {circles.map((circle) => (
                        <SelectItem key={circle.id} value={circle.name}>{circle.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="block space-y-2 text-right">
                  <span className="text-[11px] font-bold tracking-wide text-neutral-500">الطالب</span>
                  <Select
                    value={selectedStudentId}
                    onValueChange={setSelectedStudentId}
                    disabled={loadingStudents || students.length === 0}
                  >
                    <SelectTrigger className="h-11 w-full rounded-2xl border-[#8fb1ff] bg-white px-4 text-right text-sm font-semibold text-[#1a2332] disabled:opacity-60">
                      <SelectValue placeholder="اختر الطالب" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
            </div>
          </div>

          {selectedStudentId && !loadingData && (
            <div className="mt-6 rounded-[26px] border border-[#3453a7]/12 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center justify-end gap-3">
                {levels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setSelectedLevelNumber(level.level_number)}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-[18px] border px-5 py-2.5 text-sm font-bold transition-all ${
                      selectedLevelNumber === level.level_number
                        ? "border-[#3453a7] bg-white text-[#3453a7] shadow-[0_10px_20px_rgba(52,83,167,0.16)]"
                        : "border-[#8fb1ff]/45 bg-white text-neutral-600 hover:-translate-y-0.5 hover:border-[#3453a7]/55"
                    }`}
                  >
                    <span>{level.title}</span>
                    {level.is_locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  </button>
                ))}
                </div>

                {canManageSetup ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddLevel}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200 bg-white text-emerald-600 transition-all hover:-translate-y-0.5 hover:bg-white"
                      title="إضافة مستوى"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleDeleteLevel}
                      disabled={levels.length === 0}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-200 bg-white text-red-500 transition-all hover:-translate-y-0.5 hover:bg-white disabled:opacity-40"
                      title="حذف آخر مستوى"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleToggleLockLevel}
                      disabled={!selectedLevel}
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-all disabled:opacity-40 ${selectedLevel?.is_locked ? "border-red-200 bg-white text-red-400 hover:-translate-y-0.5 hover:bg-white" : "border-emerald-200 bg-white text-emerald-500 hover:-translate-y-0.5 hover:bg-white"}`}
                      title={selectedLevel?.is_locked ? "فتح المستوى" : "قفل المستوى"}
                    >
                      {selectedLevel?.is_locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => {
                        if (!selectedLevel) return
                        setEditTitle(selectedLevel.title || "")
                        setEditDescription(selectedLevel.description || "")
                        setPointsEditValue(String(selectedLevel.points ?? 0))
                        setShowEditModal(true)
                      }}
                      disabled={!selectedLevel}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#3453a7]/30 bg-white text-[#3453a7] transition-all hover:-translate-y-0.5 hover:bg-[#f7faff] disabled:opacity-40"
                      title="تعديل المستوى"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                ) : <div />}
              </div>

              {levels.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#3453a7]/28 bg-white px-4 py-5 text-center text-sm font-semibold text-neutral-500">
                  لا توجد مستويات بعد لهذا الطالب داخل هذه الحلقة.
                </div>
              )}
            </div>
          )}

          <div className="mt-6 border-t border-[#3453a7]/12 pt-6">
          {!selectedStudentId ? null : loadingData ? (
            <div className="flex items-center justify-center rounded-[26px] border border-[#3453a7]/18 bg-white py-20 shadow-sm">
              <SiteLoader size="lg" />
            </div>
          ) : canManageTests ? (
            <section>
              {selectedLevel?.is_locked && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm font-bold text-amber-700">
                  هذا المستوى مقفل حاليًا. افتح المستوى أولًا ثم قيّم الأجزاء التابعة له.
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleDisplayJuzs.map((item) => {
                  const latestResult = item.latestResult
                  const currentLevelResult = item.levelResults.find((result) => result.levelNumber === selectedLevelNumber) || null
                  const isPassing = currentLevelResult?.status === "pass"
                  const isFailing = currentLevelResult?.status === "fail"
                  const hasExistingResult = Boolean(currentLevelResult)
                  const isLockedAfterResult = hasExistingResult
                  const isLevelLocked = Boolean(selectedLevel?.is_locked)
                  const isKnownJuzForRetest = item.isCurrentlyMemorized || hasExistingResult
                  const isDisabled = savingKey !== null || !isKnownJuzForRetest || !selectedLevelNumber || isLockedAfterResult || isLevelLocked

                  return (
                    <div
                      key={item.juzNumber}
                      className={`flex min-h-[190px] flex-col rounded-[24px] border p-4 shadow-[0_10px_26px_rgba(26,35,50,0.06)] transition-all ${
                        item.isCurrentlyMemorized
                          ? "border-[#3453a7]/18 bg-white"
                          : "border-red-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(255,247,247,1))]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-left">
                          <p className="text-xl font-black leading-none text-[#1a2332]">{getJuzLabel(item.juzNumber)}</p>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {!hasExistingResult && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-500">
                              <Search className="h-3.5 w-3.5" />
                              غير مختبر
                            </span>
                          )}
                        </div>
                      </div>

                      {hasExistingResult && (
                        <div className={`mt-4 rounded-[20px] border px-4 py-3 text-right text-sm font-black ${
                          isPassing
                            ? "border-emerald-200 bg-[linear-gradient(180deg,#ecfdf5,#dff8ee)] text-emerald-700"
                            : "border-red-200 bg-[linear-gradient(180deg,#fff1f1,#ffe8e8)] text-red-600"
                        }`}>
                          {isPassing ? "ناجح" : "راسب"}
                          {isPassing && currentLevelResult?.scoreDetails && (
                            <div className="mt-2 space-y-1 text-xs font-bold text-emerald-700/90">
                              <p>الدرجة: {currentLevelResult.scoreDetails.finalScore} / {currentLevelResult.scoreDetails.basePoints}</p>
                              <p>الأخطاء: {currentLevelResult.scoreDetails.mistakeCount} | التنبيهات: {currentLevelResult.scoreDetails.warningCount}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {!hasExistingResult && (
                        <div className="mt-auto flex gap-2 pt-5">
                          <Button
                            onClick={() => openPassModal(item.juzNumber)}
                            disabled={isDisabled}
                            className="h-10 flex-1 rounded-2xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {savingKey === `${item.juzNumber}-pass` ? "جاري الحفظ..." : "ناجح"}
                          </Button>
                          <Button
                            onClick={() => saveResult(item.juzNumber, "fail")}
                            disabled={isDisabled}
                            className="h-10 flex-1 rounded-2xl bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                          >
                            {savingKey === `${item.juzNumber}-fail` ? "جاري الحفظ..." : "راسب"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ) : (
            <div className="rounded-[30px] border border-[#3453a7]/18 bg-white px-6 py-12 text-center shadow-sm">
              <p className="text-lg font-bold text-[#1a2332]">لا تملك صلاحية إدارة الإختبارات.</p>
            </div>
          )}
          {selectedStudentId && !loadingData && canManageTests && visibleDisplayJuzs.length === 0 && (
            <div className="rounded-[30px] border border-[#3453a7]/18 bg-white px-6 py-12 text-center shadow-sm">
              <p className="text-lg font-bold text-[#1a2332]">لا توجد أجزاء غير مختبرة متاحة لهذا المستوى</p>
            </div>
          )}
          </div>
        </div>
      </section>

      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30" dir="rtl">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-[#3453a7]/24 shadow-xl space-y-4">
            <h2 className="text-xl font-bold text-[#1a2332]">تعديل المستوى</h2>
            <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} placeholder="اسم المستوى" />
            <Textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} placeholder="وصف المستوى" />
            <div className="space-y-2 text-right">
              <p className="text-sm font-semibold text-[#1a2332]">النقاط</p>
            <Input type="number" min={0} value={pointsEditValue} onChange={(event) => setPointsEditValue(event.target.value)} placeholder="نقاط المستوى" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-500 text-sm hover:bg-neutral-50 transition-colors">إلغاء</button>
              <button onClick={() => void handleSaveLevelEdit()} className="px-4 py-2 rounded-lg border border-[#3453a7] bg-[#3453a7] hover:bg-[#27428d] text-white text-sm font-semibold transition-colors">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {showScoringSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" dir="rtl">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-[#3453a7]/38 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-[#1a2332]">إعدادات احتساب الإختبارات</h2>
            <div className="space-y-2 text-right">
              <p className="text-sm font-semibold text-[#1a2332]">أصل النقاط</p>
              <Input
                type="number"
                min={0}
                value={scoringSettingsDraft.basePoints}
                onChange={(event) => setScoringSettingsDraft((current) => ({ ...current, basePoints: Number(event.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2 text-right">
              <p className="text-sm font-semibold text-[#1a2332]">خصم كل تنبيه</p>
              <Input
                type="number"
                min={0}
                value={scoringSettingsDraft.warningDeduction}
                onChange={(event) => setScoringSettingsDraft((current) => ({ ...current, warningDeduction: Number(event.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2 text-right">
              <p className="text-sm font-semibold text-[#1a2332]">خصم كل خطأ</p>
              <Input
                type="number"
                min={0}
                value={scoringSettingsDraft.mistakeDeduction}
                onChange={(event) => setScoringSettingsDraft((current) => ({ ...current, mistakeDeduction: Number(event.target.value) || 0 }))}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowScoringSettingsModal(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-50">إلغاء</button>
              <button onClick={() => void handleSaveScoringSettings()} disabled={isSavingScoringSettings} className="rounded-lg border border-[#3453a7] bg-[#3453a7] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#27428d] disabled:opacity-60">{isSavingScoringSettings ? "جاري الحفظ..." : "حفظ"}</button>
            </div>
          </div>
        </div>
      )}

      {pendingPassJuzNumber !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" dir="rtl">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-emerald-200 bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-[#1a2332]">نتيجة اختبار {getJuzLabel(pendingPassJuzNumber)}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 text-right">
                <p className="text-sm font-semibold text-[#1a2332]">عدد الأخطاء</p>
                <Input type="number" min={0} value={mistakeCountInput} onChange={(event) => setMistakeCountInput(event.target.value)} />
              </div>
              <div className="space-y-2 text-right">
                <p className="text-sm font-semibold text-[#1a2332]">عدد التنبيهات</p>
                <Input type="number" min={0} value={warningCountInput} onChange={(event) => setWarningCountInput(event.target.value)} />
              </div>
            </div>
            <div className="rounded-2xl border border-[#3453a7]/18 bg-[linear-gradient(135deg,#f8fbff,#eef4ff)] px-4 py-3 text-right text-sm text-[#1a2332]">
              <p className="font-bold">أصل النقاط: {pendingScorePreview.basePoints}</p>
              <p className="mt-1">خصم التنبيهات: {pendingScorePreview.warningCount} × {pendingScorePreview.warningDeduction}</p>
              <p className="mt-1">خصم الأخطاء: {pendingScorePreview.mistakeCount} × {pendingScorePreview.mistakeDeduction}</p>
              <p className="mt-2 text-base font-black text-emerald-700">النتيجة النهائية: {pendingScorePreview.finalScore} / {pendingScorePreview.basePoints}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setPendingPassJuzNumber(null)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-50">إلغاء</button>
              <button onClick={() => void handleConfirmPassResult()} disabled={savingKey === `${pendingPassJuzNumber}-pass`} className="rounded-lg bg-[#3453a7] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#27428d] disabled:opacity-60">{savingKey === `${pendingPassJuzNumber}-pass` ? "جاري الحفظ..." : "اعتماد النجاح"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}