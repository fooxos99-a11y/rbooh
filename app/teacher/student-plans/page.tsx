"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { SiteLoader } from "@/components/ui/site-loader"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { BookMarked, Plus, Trash2, Target, Users, ChevronDown, Check } from "lucide-react"
import { SURAHS, calculateTotalDays, calculateTotalPages, getPlanMemorizedRange } from "@/lib/quran-data"
import { getSaudiDateString } from "@/lib/saudi-time"

interface Student {
  id: string
  name: string
  halaqah: string
  account_number: number
  memorized_start_surah?: number | null
  memorized_start_verse?: number | null
  memorized_end_surah?: number | null
  memorized_end_verse?: number | null
}

interface StudentPlan {
  id: string
  student_id: string
  start_surah_number: number
  start_surah_name: string
  start_verse?: number | null
  end_surah_number: number
  end_surah_name: string
  end_verse?: number | null
  daily_pages: number
  total_pages: number
  total_days: number
  start_date: string
  created_at?: string
  direction?: string
  has_previous?: boolean
  prev_start_surah?: number | null
  prev_start_verse?: number | null
  prev_end_surah?: number | null
  prev_end_verse?: number | null
  muraajaa_pages?: number | null
  rabt_pages?: number | null
}

const MURAAJAA_OPTIONS = [
  { value: "20", label: "جزء واحد (20 وجه)" },
  { value: "40", label: "جزئين (40 وجه)" },
  { value: "60", label: "3 أجزاء (60 وجه)" },
]

const RABT_OPTIONS = [
  { value: "10", label: "10 أوجه" },
  { value: "20", label: "جزء واحد (20 وجه)" },
]

const DAILY_OPTIONS = [
  { value: "0.25", label: "ربع وجه" },
  { value: "0.5", label: "نصف وجه" },
  { value: "1", label: "وجه واحد" },
  { value: "2", label: "وجهان" },
]

function dailyLabel(v: number) {
  if (v === 0.25) return "ربع وجه"
  if (v === 0.5) return "نصف وجه"
  if (v === 1) return "وجه واحد"
  if (v === 2) return "وجهان"
  return `${v} وجه`
}

function getPreferredEndSurah(
  options: typeof SURAHS,
  selectedStartSurah: number,
  preferredDirection: "asc" | "desc",
) {
  const optionNumbers = new Set(options.map((surah) => surah.number))
  const preferredCandidate = preferredDirection === "desc" ? selectedStartSurah - 1 : selectedStartSurah + 1
  if (optionNumbers.has(preferredCandidate)) {
    return preferredCandidate
  }

  const fallbackCandidate = preferredDirection === "desc" ? selectedStartSurah + 1 : selectedStartSurah - 1
  if (optionNumbers.has(fallbackCandidate)) {
    return fallbackCandidate
  }

  const nearest = options
    .filter((surah) => surah.number !== selectedStartSurah)
    .sort((left, right) => Math.abs(left.number - selectedStartSurah) - Math.abs(right.number - selectedStartSurah))[0]

  return nearest?.number ?? selectedStartSurah
}

function getNextStartFromPrevious(
  prevStartSurahValue: string,
  prevEndSurahValue: string,
  prevEndVerseValue: string,
) {
  const previousStartNumber = parseInt(prevStartSurahValue, 10)
  const previousEndNumber = parseInt(prevEndSurahValue, 10)
  const previousEndVerseNumber = parseInt(prevEndVerseValue, 10)

  if (!previousStartNumber || !previousEndNumber || !previousEndVerseNumber) {
    return null
  }

  const previousEndSurah = SURAHS.find((surah) => surah.number === previousEndNumber)
  if (!previousEndSurah) return null

  const isDescending = previousStartNumber > previousEndNumber

  if (!isDescending) {
    if (previousEndVerseNumber < previousEndSurah.verseCount) {
      return {
        surahNumber: previousEndNumber,
        verseNumber: previousEndVerseNumber + 1,
      }
    }

    const nextSurah = SURAHS.find((surah) => surah.number === previousEndNumber + 1)
    if (!nextSurah) return null

    return {
      surahNumber: nextSurah.number,
      verseNumber: 1,
    }
  }

  if (previousEndVerseNumber > 1) {
    return {
      surahNumber: previousEndNumber,
      verseNumber: previousEndVerseNumber - 1,
    }
  }

  const previousSurah = SURAHS.find((surah) => surah.number === previousEndNumber - 1)
  if (!previousSurah) return null

  return {
    surahNumber: previousSurah.number,
    verseNumber: previousSurah.verseCount,
  }
}

function compareAyahRefs(
  leftSurahNumber: number,
  leftVerseNumber: number,
  rightSurahNumber: number,
  rightVerseNumber: number,
) {
  if (leftSurahNumber !== rightSurahNumber) {
    return leftSurahNumber - rightSurahNumber
  }

  return leftVerseNumber - rightVerseNumber
}

function isStartAllowedAfterPrevious(
  startSurahNumber: number,
  startVerseNumber: number,
  boundarySurahNumber: number,
  boundaryVerseNumber: number,
  previousDirection: "asc" | "desc",
) {
  const comparison = compareAyahRefs(startSurahNumber, startVerseNumber, boundarySurahNumber, boundaryVerseNumber)
  return previousDirection === "desc" ? comparison <= 0 : comparison >= 0
}

function getLockedPreviousRange(student: Student, plan: StudentPlan | null, completedDays: number) {
  if (plan && completedDays > 0) {
    const memorizedRange = getPlanMemorizedRange(
      {
        ...plan,
        has_previous: plan.has_previous || !!(plan.prev_start_surah || student.memorized_start_surah),
        prev_start_surah: plan.prev_start_surah || student.memorized_start_surah || null,
        prev_start_verse: plan.prev_start_verse || student.memorized_start_verse || null,
        prev_end_surah: plan.prev_end_surah || student.memorized_end_surah || null,
        prev_end_verse: plan.prev_end_verse || student.memorized_end_verse || null,
      },
      completedDays,
    )

    if (memorizedRange) {
      return memorizedRange
    }
  }

  const startSurahNumber = student.memorized_start_surah || plan?.prev_start_surah || null
  const startVerseNumber = student.memorized_start_verse || plan?.prev_start_verse || 1
  const endSurahNumber = student.memorized_end_surah || plan?.prev_end_surah || null
  const endSurah = endSurahNumber ? SURAHS.find((surah) => surah.number === endSurahNumber) : null
  const endVerseNumber = student.memorized_end_verse || plan?.prev_end_verse || endSurah?.verseCount || 1

  if (!startSurahNumber || !endSurahNumber) {
    if (!plan?.start_surah_number || !plan?.end_surah_number) {
      return null
    }

    const planEndSurah = SURAHS.find((surah) => surah.number === plan.end_surah_number)

    return {
      startSurahNumber: plan.start_surah_number,
      startVerseNumber: plan.start_verse || 1,
      endSurahNumber: plan.end_surah_number,
      endVerseNumber: plan.end_verse || planEndSurah?.verseCount || 1,
    }
  }

  return {
    startSurahNumber,
    startVerseNumber,
    endSurahNumber,
    endVerseNumber,
  }
}

export default function TeacherStudentPlansPage() {
  const router = useRouter()
  const confirmDialog = useConfirmDialog()
  const [isLoading, setIsLoading] = useState(true)
  const [halaqah, setHalaqah] = useState<string | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [studentPlans, setStudentPlans] = useState<Record<string, StudentPlan | null>>({})
  const [studentProgress, setStudentProgress] = useState<Record<string, number>>({})
  const [studentCompletedDays, setStudentCompletedDays] = useState<Record<string, number>>({})
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resettingStudentId, setResettingStudentId] = useState<string | null>(null)

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [startSurah, setStartSurah] = useState<string>("")
  const [endSurah, setEndSurah] = useState<string>("")
  const [startVerse, setStartVerse] = useState<string>("")
  const [endVerse, setEndVerse] = useState<string>("")
  const [dailyPages, setDailyPages] = useState<string>("1")
  const [startOpen, setStartOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)

  const [hasPrevious, setHasPrevious] = useState(false)
  const [prevStartSurah, setPrevStartSurah] = useState<string>("")
  const [prevEndSurah, setPrevEndSurah] = useState<string>("")
  const [prevStartVerse, setPrevStartVerse] = useState<string>("")
  const [prevEndVerse, setPrevEndVerse] = useState<string>("")
  const [prevStartOpen, setPrevStartOpen] = useState(false)
  const [prevEndOpen, setPrevEndOpen] = useState(false)
  const [isPreviousLocked, setIsPreviousLocked] = useState(false)
  const [muraajaaPages, setMuraajaaPages] = useState<string>("20")
  const [rabtPages, setRabtPages] = useState<string>("10")

  const [isSaving, setIsSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const init = async () => {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true"
      const role = localStorage.getItem("userRole")
      const accNum = localStorage.getItem("accountNumber")

      if (!loggedIn || role !== "teacher" || !accNum) {
        router.push("/login")
        return
      }

      try {
        const res = await fetch(`/api/teachers?account_number=${accNum}`)
        const data = await res.json()
        const teacher = data.teachers?.[0]
        if (!teacher) {
          router.push("/login")
          return
        }

        const teacherHalaqah = (teacher.halaqah || teacher.circle_name || "").trim()
        setHalaqah(teacherHalaqah)

        const studentsRes = await fetch(`/api/students?circle=${encodeURIComponent(teacherHalaqah)}`)
        const studentsData = await studentsRes.json()
        const circleStudents: Student[] = studentsData.students || []
        setStudents(circleStudents)
        await fetchPlansForStudents(circleStudents)
      } catch (error) {
        console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [router])

  const fetchPlansForStudents = async (studentList: Student[]) => {
    const plans: Record<string, StudentPlan | null> = {}
    const progress: Record<string, number> = {}
    const completedDays: Record<string, number> = {}

    await Promise.all(
      studentList.map(async (student) => {
        try {
          const res = await fetch(`/api/student-plans?student_id=${student.id}`)
          const data = await res.json()
          plans[student.id] = data.plan || null
          progress[student.id] = data.progressPercent || 0
          completedDays[student.id] = data.completedDays || 0
        } catch {
          plans[student.id] = null
          progress[student.id] = 0
          completedDays[student.id] = 0
        }
      }),
    )

    setStudentPlans(plans)
    setStudentProgress(progress)
    setStudentCompletedDays(completedDays)
  }

  const openAddDialog = (student: Student) => {
    const currentPlan = studentPlans[student.id]
    const lockedPreviousRange = getLockedPreviousRange(student, currentPlan, studentCompletedDays[student.id] || 0)
    const hasLockedPrevious = !!lockedPreviousRange
    const shouldLockPrevious = !!currentPlan || hasLockedPrevious

    setSelectedStudent(student)
    setStartSurah("")
    setEndSurah("")
    setStartVerse("")
    setEndVerse("")
    setDailyPages("1")
    setSaveMsg(null)
    setStartOpen(false)
    setEndOpen(false)
    setHasPrevious(shouldLockPrevious)
    setIsPreviousLocked(shouldLockPrevious)
    setPrevStartSurah(lockedPreviousRange ? String(lockedPreviousRange.startSurahNumber) : "")
    setPrevEndSurah(lockedPreviousRange ? String(lockedPreviousRange.endSurahNumber) : "")
    setPrevStartVerse(lockedPreviousRange ? String(lockedPreviousRange.startVerseNumber) : "")
    setPrevEndVerse(lockedPreviousRange ? String(lockedPreviousRange.endVerseNumber) : "")
    setPrevStartOpen(false)
    setPrevEndOpen(false)
    setMuraajaaPages("20")
    setRabtPages("10")

    setAddDialogOpen(true)
  }

  const handleSavePlan = async () => {
    if (!selectedStudent || !startSurah || !endSurah || !dailyPages) {
      setSaveMsg({ type: "error", text: "يرجى تعبئة جميع الحقول" })
      return
    }

    const startNum = parseInt(startSurah)
    const endNum = parseInt(endSurah)

    if (hasPrevious) {
      if (!prevStartSurah || !prevEndSurah || !prevEndVerse) {
        setSaveMsg({ type: "error", text: "يجب تعبئة بيانات الحفظ السابق كاملة" })
        return
      }

      if (!nextStartFromPrevious) {
        setSaveMsg({ type: "error", text: "تعذر تحديد البداية الصحيحة بعد الحفظ السابق" })
        return
      }

      const normalizedStartVerse = startVerse ? parseInt(startVerse) : 1
      const previousDirection = parseInt(prevStartSurah, 10) > parseInt(prevEndSurah, 10) ? "desc" : "asc"
      if (
        !isStartAllowedAfterPrevious(
          startNum,
          normalizedStartVerse,
          nextStartFromPrevious.surahNumber,
          nextStartFromPrevious.verseNumber,
          previousDirection,
        )
      ) {
        const expectedSurah = SURAHS.find((surah) => surah.number === nextStartFromPrevious.surahNumber)?.name || "السورة"
        setSaveMsg({
          type: "error",
          text: `يجب أن يكون بداية المحفوظ عند آخر آية تم حفظها: ${expectedSurah} آية ${nextStartFromPrevious.verseNumber}، أو إعادة حفظ الطالب من جديد`,
        })
        return
      }
    }

    if (startNum === endNum && startVerse && endVerse && parseInt(startVerse) > parseInt(endVerse)) {
      setSaveMsg({ type: "error", text: "في نفس السورة يجب أن تكون آية النهاية بعد آية البداية" })
      return
    }

    const startSurahData = SURAHS.find((surah) => surah.number === startNum)!
    const endSurahData = SURAHS.find((surah) => surah.number === endNum)!
    const total = calculateTotalPages(
      startNum,
      endNum,
      startVerse ? parseInt(startVerse) : null,
      endVerse ? parseInt(endVerse) : null,
    )
    const days = calculateTotalDays(total, parseFloat(dailyPages))

    setIsSaving(true)
    try {
      const res = await fetch("/api/student-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          start_surah_number: startNum,
          start_surah_name: startSurahData.name,
          start_verse: startVerse ? parseInt(startVerse) : null,
          end_surah_number: endNum,
          end_surah_name: endSurahData.name,
          end_verse: endVerse ? parseInt(endVerse) : null,
          daily_pages: parseFloat(dailyPages),
          total_days: days,
          direction,
          has_previous: hasPrevious,
          prev_start_surah: hasPrevious && prevStartSurah ? parseInt(prevStartSurah) : null,
          prev_start_verse: hasPrevious && prevStartVerse ? parseInt(prevStartVerse) : null,
          prev_end_surah: hasPrevious && prevEndSurah ? parseInt(prevEndSurah) : null,
          prev_end_verse: hasPrevious && prevEndVerse ? parseInt(prevEndVerse) : null,
          muraajaa_pages: parseFloat(muraajaaPages),
          rabt_pages: parseFloat(rabtPages),
          start_date: getSaudiDateString(),
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setSaveMsg({
          type: "success",
          text: `✓ تم حفظ الخطة — ${total} وجه خلال ${days} يوم`,
        })
        setStudentPlans((prev) => ({ ...prev, [selectedStudent.id]: data.plan }))
        setStudentProgress((prev) => ({ ...prev, [selectedStudent.id]: 0 }))
        setTimeout(() => setAddDialogOpen(false), 1500)
      } else {
        setSaveMsg({ type: "error", text: data.error || "فشل في حفظ الخطة" })
      }
    } catch {
      setSaveMsg({ type: "error", text: "حدث خطأ، يرجى المحاولة مجدداً" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeletePlan = async (studentId: string) => {
    const confirmed = await confirmDialog({
      title: "حذف الخطة",
      description: "هل أنت متأكد من حذف خطة هذا الطالب؟",
      confirmText: "حذف",
      cancelText: "إلغاء",
    })
    if (!confirmed) return

    try {
      await fetch(`/api/student-plans?student_id=${studentId}`, { method: "DELETE" })
      setStudentPlans((prev) => ({ ...prev, [studentId]: null }))
      setStudentProgress((prev) => ({ ...prev, [studentId]: 0 }))
    } catch (error) {
      console.error(error)
    }
  }

  const handleResetMemorization = async (student: Student) => {
    const confirmed = await confirmDialog({
      title: "إعادة حفظ الطالب",
      description: "سيتم حذف الخطة الحالية إن وجدت ومسح المحفوظ السابق لهذا الطالب للبدء من الصفر. هل تريد المتابعة؟",
      confirmText: "إعادة الحفظ",
      cancelText: "إلغاء",
    })
    if (!confirmed) return

    try {
      setResettingStudentId(student.id)
      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: student.id, reset_memorized: true }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "فشل في إعادة حفظ الطالب")
      }

      setStudents((prev) => prev.map((item) => (
        item.id === student.id
          ? {
              ...item,
              memorized_start_surah: null,
              memorized_start_verse: null,
              memorized_end_surah: null,
              memorized_end_verse: null,
            }
          : item
      )))
      setStudentPlans((prev) => ({ ...prev, [student.id]: null }))
      setStudentProgress((prev) => ({ ...prev, [student.id]: 0 }))
      setStudentCompletedDays((prev) => ({ ...prev, [student.id]: 0 }))
    } catch (error) {
      console.error(error)
    } finally {
      setResettingStudentId(null)
    }
  }

  const startNum = startSurah ? parseInt(startSurah) : null
  const endNum = endSurah ? parseInt(endSurah) : null
  const direction = startNum && endNum && startNum > endNum ? "desc" : "asc"
  const isEditingPlan = !!(selectedStudent && studentPlans[selectedStudent.id])
  const nextStartFromPrevious = hasPrevious && prevStartSurah && prevEndSurah && prevEndVerse
    ? getNextStartFromPrevious(prevStartSurah, prevEndSurah, prevEndVerse)
    : null

  const startSurahOptions = (() => {
    let options = SURAHS

    if (hasPrevious && prevStartSurah && prevEndSurah) {
      const previousStart = parseInt(prevStartSurah)
      const previousEnd = parseInt(prevEndSurah)
      const min = Math.min(previousStart, previousEnd)
      const max = Math.max(previousStart, previousEnd)
      options = options.filter((surah) => {
        if (nextStartFromPrevious?.surahNumber === surah.number) return true
        return surah.number < min || surah.number > max
      })
    }

    return options
  })()

  const startVerseOptions = (() => {
    if (!startSurah) return []

    const selectedSurah = SURAHS.find((surah) => surah.number === parseInt(startSurah))
    if (!selectedSurah) return []

    let minVerse = 1
    let maxVerse = selectedSurah.verseCount

    if (nextStartFromPrevious?.surahNumber === selectedSurah.number) {
      const previousStartNumber = parseInt(prevStartSurah || "0", 10)
      const previousEndNumber = parseInt(prevEndSurah || "0", 10)
      const isDescendingPrevious = previousStartNumber > previousEndNumber

      if (isDescendingPrevious) {
        maxVerse = nextStartFromPrevious.verseNumber
      } else {
        minVerse = nextStartFromPrevious.verseNumber
      }
    }

    return Array.from({ length: Math.max(0, maxVerse - minVerse + 1) }, (_, index) => minVerse + index)
  })()

  const prevStartVerseOptions = (() => {
    if (!prevStartSurah) return []

    const selectedSurah = SURAHS.find((surah) => surah.number === parseInt(prevStartSurah, 10))
    if (!selectedSurah) return []

    return Array.from({ length: selectedSurah.verseCount }, (_, index) => index + 1)
  })()

  const endSurahOptions = (() => {
    if (!startNum) return startSurahOptions

    return startSurahOptions.slice().sort((left, right) => left.number - right.number)
  })()

  const endVerseOptions = (() => {
    if (!endSurah) return []

    const selectedSurah = SURAHS.find((surah) => surah.number === parseInt(endSurah))
    if (!selectedSurah) return []

    let minVerse = 1
    const maxVerse = selectedSurah.verseCount

    if (startNum && endNum && startNum === endNum && startVerse) {
      minVerse = parseInt(startVerse, 10)
    }

    return Array.from({ length: Math.max(0, maxVerse - minVerse + 1) }, (_, index) => minVerse + index)
  })()

  const prevEndVerseOptions = (() => {
    if (!prevEndSurah) return []

    const selectedSurah = SURAHS.find((surah) => surah.number === parseInt(prevEndSurah, 10))
    if (!selectedSurah) return []

    let minVerse = 1
    const maxVerse = selectedSurah.verseCount

    if (prevStartSurah && prevStartVerse && prevStartSurah === prevEndSurah) {
      minVerse = parseInt(prevStartVerse, 10)
    }

    return Array.from({ length: Math.max(0, maxVerse - minVerse + 1) }, (_, index) => minVerse + index)
  })()

  const isEndValid = endNum !== null && endSurahOptions.some((surah) => surah.number === endNum)
  const previewTotal = startSurah && endSurah && isEndValid
    ? calculateTotalPages(
        parseInt(startSurah),
        parseInt(endSurah),
        startVerse ? parseInt(startVerse) : null,
        endVerse ? parseInt(endVerse) : null,
      )
    : 0
  const previewDays = previewTotal > 0 && dailyPages ? calculateTotalDays(previewTotal, parseFloat(dailyPages)) : 0

  useEffect(() => {
    if (startOpen && startSurah) {
      setTimeout(() => {
        document.getElementById(`start-surah-${startSurah}`)?.scrollIntoView({ block: "center" })
      }, 50)
    }
  }, [startOpen, startSurah])

  useEffect(() => {
    if (endOpen && endSurah) {
      setTimeout(() => {
        document.getElementById(`end-surah-${endSurah}`)?.scrollIntoView({ block: "center" })
      }, 50)
    }
  }, [endOpen, endSurah])

  useEffect(() => {
    if (prevStartOpen && prevStartSurah) {
      setTimeout(() => {
        document.getElementById(`prev-start-surah-${prevStartSurah}`)?.scrollIntoView({ block: "center" })
      }, 50)
    }
  }, [prevStartOpen, prevStartSurah])

  useEffect(() => {
    if (prevEndOpen && prevEndSurah) {
      setTimeout(() => {
        document.getElementById(`prev-end-surah-${prevEndSurah}`)?.scrollIntoView({ block: "center" })
      }, 50)
    }
  }, [prevEndOpen, prevEndSurah])

  useEffect(() => {
    if (!hasPrevious || !prevStartSurah || !prevEndSurah || !prevEndVerse) return

    const nextStart = getNextStartFromPrevious(prevStartSurah, prevEndSurah, prevEndVerse)
    if (!nextStart) return

    setStartSurah(String(nextStart.surahNumber))
    setStartVerse(String(nextStart.verseNumber))
  }, [hasPrevious, prevStartSurah, prevEndSurah, prevEndVerse])

  useEffect(() => {
    if (!startNum) return

    const preferredDirection = hasPrevious && prevStartSurah && prevEndSurah && parseInt(prevStartSurah, 10) > parseInt(prevEndSurah, 10)
      ? "desc"
      : "asc"

    const autoEndSurah = String(getPreferredEndSurah(startSurahOptions, startNum, preferredDirection))
    if (!endSurah || !endSurahOptions.some((surah) => surah.number === parseInt(endSurah, 10))) {
      setEndSurah(autoEndSurah)
    }
  }, [endSurah, endSurahOptions, hasPrevious, prevEndSurah, prevStartSurah, startNum, startSurahOptions])

  useEffect(() => {
    if (!startVerseOptions.length) {
      if (startVerse) setStartVerse("")
      return
    }

    if (hasPrevious && nextStartFromPrevious && startNum === nextStartFromPrevious.surahNumber) {
      const expectedStartVerse = String(nextStartFromPrevious.verseNumber)
      if (startVerse !== expectedStartVerse) {
        setStartVerse(expectedStartVerse)
      }
      return
    }

    if (!startVerse || !startVerseOptions.includes(parseInt(startVerse, 10))) {
      setStartVerse(String(startVerseOptions[0]))
    }
  }, [hasPrevious, nextStartFromPrevious, startNum, startVerse, startVerseOptions])

  useEffect(() => {
    if (!prevStartVerseOptions.length) {
      if (prevStartVerse) setPrevStartVerse("")
      return
    }

    if (!prevStartVerse || !prevStartVerseOptions.includes(parseInt(prevStartVerse, 10))) {
      setPrevStartVerse(String(prevStartVerseOptions[0]))
    }
  }, [prevStartVerse, prevStartVerseOptions])

  useEffect(() => {
    if (!endVerseOptions.length) {
      if (endVerse) setEndVerse("")
      return
    }

    if (!endVerse || !endVerseOptions.includes(parseInt(endVerse, 10))) {
      setEndVerse(String(endVerseOptions[endVerseOptions.length - 1]))
    }
  }, [endVerse, endVerseOptions])

  useEffect(() => {
    if (!prevEndVerseOptions.length) {
      if (prevEndVerse) setPrevEndVerse("")
      return
    }

    if (!prevEndVerse || !prevEndVerseOptions.includes(parseInt(prevEndVerse, 10))) {
      setPrevEndVerse(String(prevEndVerseOptions[prevEndVerseOptions.length - 1]))
    }
  }, [prevEndVerse, prevEndVerseOptions])

  if (isLoading) {
    return <SiteLoader fullScreen />
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]">
      <Header />
      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-3xl space-y-6">
          <div className="border-b border-[#D4AF37]/40 pb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
              <BookMarked className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1a2332]">خطط الطلاب</h1>
              {halaqah && <p className="text-sm text-neutral-400 mt-0.5">حلقة {halaqah}</p>}
            </div>
            <button
              onClick={() => setResetDialogOpen(true)}
              className="mr-auto rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              إعادة حفظ طالب
            </button>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-16 text-neutral-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">لا يوجد طلاب في حلقتك</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#D4AF37]/40 shadow-sm overflow-hidden">
              <div className="divide-y divide-[#D4AF37]/15">
                {students.map((student) => {
                  const plan = studentPlans[student.id]
                  const progress = studentProgress[student.id] || 0
                  const hasStoredMemorized = !!(student.memorized_start_surah && student.memorized_end_surah)

                  return (
                    <div key={student.id} className="px-6 py-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-[#1a2332] text-sm">{student.name}</p>
                          {plan && (
                            <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0">
                              لديه خطة
                            </Badge>
                          )}
                        </div>
                        {plan ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold bg-[#D4AF37]/10 text-[#C9A961] border border-[#D4AF37]/30 rounded-md px-1.5 py-0.5 shrink-0">
                                {dailyLabel(plan.daily_pages)}
                              </span>
                              <p className="text-xs text-neutral-500 truncate">
                                {plan.start_surah_name} ← {plan.end_surah_name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${progress}%`,
                                    background: "linear-gradient(to right, #D4AF37, #C9A961)",
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-[#D4AF37] w-8 text-left">{progress}%</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-400">لا توجد خطة</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {plan && (
                          <button
                            onClick={() => handleDeletePlan(student.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-colors"
                            title="حذف الخطة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openAddDialog(student)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#C9A961] border border-[#D4AF37]/30 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {plan ? "تعديل الخطة" : "إضافة خطة"}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent showCloseButton={false} className="max-w-md bg-white rounded-2xl p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="px-6 py-5 border-b border-[#D4AF37]/30 bg-gradient-to-r from-[#D4AF37]/8 to-transparent">
            <DialogTitle className="flex w-full items-center justify-start gap-2 pl-1 text-left text-lg font-bold text-[#1a2332]">
              <Target className="w-5 h-5 text-[#D4AF37]" />
              {isEditingPlan ? "تعديل خطة حفظ" : "إضافة خطة حفظ"}{selectedStudent ? ` — ${selectedStudent.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
            <div className="space-y-2 pt-2 pb-2 border-y border-[#D4AF37]/20">
              <label
                className="plan-history-checkbox text-sm font-semibold text-[#1a2332]"
                onClick={(e) => {
                  if (!isPreviousLocked) return

                  e.preventDefault()
                }}
              >
                <input
                  type="checkbox"
                  checked={hasPrevious}
                  disabled={isPreviousLocked}
                  onChange={(e) => setHasPrevious(e.target.checked)}
                />
                <span className="plan-history-checkbox__label">هل يوجد حفظ سابق؟</span>
                <span className="plan-history-checkbox__mark" aria-hidden="true" />
              </label>

              {isPreviousLocked && hasPrevious && (
                <p className="text-[11px] font-medium text-[#8a6f1f]">الحفظ السابق مقفل لأنه محفوظ فعلياً، ويجب حذف الخطة إذا أردت إعادة حفظ الطالب.</p>
              )}

              {hasPrevious && (
                <div className="bg-[#D4AF37]/5 p-3 rounded-xl border border-[#D4AF37]/20 space-y-3 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5 flex flex-col w-full">
                      <label className="text-xs font-semibold text-[#1a2332]">بداية الحفظ السابق</label>
                      <div className="flex items-center gap-2 w-full">
                        <Popover open={isPreviousLocked ? false : prevStartOpen} onOpenChange={(open) => {
                          if (!isPreviousLocked) setPrevStartOpen(open)
                        }}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              disabled={isPreviousLocked}
                              className={`flex-1 flex items-center justify-between px-3 h-9 rounded-lg border border-[#D4AF37]/40 text-xs bg-white text-right transition-colors ${isPreviousLocked ? "cursor-not-allowed opacity-70" : "hover:border-[#D4AF37]"}`}
                            >
                              <span className={prevStartSurah ? "text-[#1a2332] font-medium" : "text-neutral-400"}>
                                {prevStartSurah
                                  ? SURAHS.find((surah) => surah.number === parseInt(prevStartSurah))?.name
                                  : "اختر السورة"}
                              </span>
                              <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-0" align="start" dir="rtl">
                            <Command className="overflow-visible border-[#D4AF37]/20">
                              <CommandInput placeholder="ابحث عن سورة..." className="text-xs h-8" />
                              <CommandEmpty>لا توجد نتائج</CommandEmpty>
                              <CommandList className="max-h-48 overflow-y-auto surah-scroll" onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY }}>
                                {SURAHS.map((surah) => (
                                  <CommandItem
                                    key={surah.number}
                                    id={`prev-start-surah-${surah.number}`}
                                    value={surah.name}
                                    onSelect={() => {
                                      setPrevStartSurah(surah.number.toString())
                                      setPrevStartOpen(false)
                                      setPrevStartVerse("")
                                    }}
                                  >
                                    {surah.name}
                                    {prevStartSurah === surah.number.toString() && <Check className="w-3.5 h-3.5 mr-auto text-[#D4AF37]" />}
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        <Select value={prevStartVerse} onValueChange={setPrevStartVerse} disabled={isPreviousLocked || !prevStartSurah || prevStartVerseOptions.length === 0}>
                          <SelectTrigger className="w-[80px] h-9 border-[#D4AF37]/40 text-xs bg-white px-2" dir="rtl">
                            <SelectValue placeholder="الآية" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="max-h-48">
                            {prevStartVerseOptions.map((verse) => (
                              <SelectItem key={verse} value={verse.toString()} className="text-xs text-right">
                                {verse}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5 flex flex-col w-full">
                      <label className="text-xs font-semibold text-[#1a2332]">نهاية الحفظ السابق</label>
                      <div className="flex items-center gap-2 w-full">
                        <Popover open={isPreviousLocked ? false : prevEndOpen} onOpenChange={(open) => {
                          if (!isPreviousLocked) setPrevEndOpen(open)
                        }}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              disabled={isPreviousLocked}
                              className={`flex-1 flex items-center justify-between px-3 h-9 rounded-lg border border-[#D4AF37]/40 text-xs bg-white text-right transition-colors ${isPreviousLocked ? "cursor-not-allowed opacity-70" : "hover:border-[#D4AF37]"}`}
                            >
                              <span className={prevEndSurah ? "text-[#1a2332] font-medium" : "text-neutral-400"}>
                                {prevEndSurah
                                  ? SURAHS.find((surah) => surah.number === parseInt(prevEndSurah))?.name
                                  : "اختر السورة"}
                              </span>
                              <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-0" align="start" dir="rtl">
                            <Command className="overflow-visible border-[#D4AF37]/20">
                              <CommandInput placeholder="ابحث عن سورة..." className="text-xs h-8" />
                              <CommandEmpty>لا توجد نتائج</CommandEmpty>
                              <CommandList className="max-h-48 overflow-y-auto surah-scroll" onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY }}>
                                {SURAHS.map((surah) => (
                                  <CommandItem
                                    key={surah.number}
                                    id={`prev-end-surah-${surah.number}`}
                                    value={surah.name}
                                    onSelect={() => {
                                      setPrevEndSurah(surah.number.toString())
                                      setPrevEndOpen(false)
                                      setPrevEndVerse("")
                                    }}
                                  >
                                    {surah.name}
                                    {prevEndSurah === surah.number.toString() && <Check className="w-3.5 h-3.5 mr-auto text-[#D4AF37]" />}
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        <Select value={prevEndVerse} onValueChange={setPrevEndVerse} disabled={isPreviousLocked || !prevEndSurah || prevEndVerseOptions.length === 0}>
                          <SelectTrigger className="w-[80px] h-9 border-[#D4AF37]/40 text-xs bg-white px-2" dir="rtl">
                            <SelectValue placeholder="الآية" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="max-h-48">
                            {prevEndVerseOptions.map((verse) => (
                              <SelectItem key={verse} value={verse.toString()} className="text-xs text-right">
                                {verse}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5 flex flex-col w-full">
                <label className="text-sm font-semibold text-[#1a2332]">بداية الخطة</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Popover open={startOpen} onOpenChange={setStartOpen}>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center justify-between px-3 h-10 rounded-xl border border-[#D4AF37]/40 text-sm bg-white text-right hover:border-[#D4AF37] transition-colors">
                          <span className={startSurah ? "text-[#1a2332] font-medium" : "text-neutral-400"}>
                            {startSurah ? SURAHS.find((surah) => surah.number === parseInt(startSurah))?.name : "اختر السورة"}
                          </span>
                          <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-0" align="start" dir="rtl">
                        <Command className="overflow-visible">
                          <CommandInput placeholder="ابحث عن سورة..." className="text-sm h-9" />
                          <CommandEmpty>لا توجد نتائج</CommandEmpty>
                          <CommandList className="max-h-52 overflow-y-auto surah-scroll" onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY }}>
                            {startSurahOptions.map((surah) => (
                              <CommandItem
                                key={surah.number}
                                id={`start-surah-${surah.number}`}
                                value={surah.name}
                                onSelect={() => {
                                  setStartSurah(String(surah.number))
                                  setStartOpen(false)
                                }}
                                className="flex items-center justify-between"
                              >
                                {surah.name}
                                {startSurah === String(surah.number) && <Check className="w-3.5 h-3.5 text-[#D4AF37]" />}
                              </CommandItem>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Select value={startVerse} onValueChange={setStartVerse} disabled={!startSurah || startVerseOptions.length === 0}>
                    <SelectTrigger className="w-[80px] h-10 border-[#D4AF37]/40 hover:border-[#D4AF37] transition-colors rounded-xl bg-white text-sm" dir="rtl">
                      <SelectValue placeholder="الآية" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48" dir="rtl">
                      {startVerseOptions.map((verse) => (
                        <SelectItem key={verse} value={verse.toString()} className="text-right">
                          {verse}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5 flex flex-col w-full">
                <label className="text-sm font-semibold text-[#1a2332]">نهاية الخطة</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Popover open={endOpen} onOpenChange={setEndOpen}>
                      <PopoverTrigger asChild>
                        <button className="w-full flex items-center justify-between px-3 h-10 rounded-xl border border-[#D4AF37]/40 text-sm bg-white text-right hover:border-[#D4AF37] transition-colors">
                          <span className={isEndValid ? "text-[#1a2332] font-medium" : "text-neutral-400"}>
                            {isEndValid ? SURAHS.find((surah) => surah.number === parseInt(endSurah))?.name : "اختر السورة"}
                          </span>
                          <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-0" align="start" dir="rtl">
                        <Command className="overflow-visible">
                          <CommandInput placeholder="ابحث عن سورة..." className="text-sm h-9" />
                          <CommandEmpty>لا توجد نتائج</CommandEmpty>
                          <CommandList className="max-h-52 overflow-y-auto surah-scroll" onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY }}>
                            {endSurahOptions.map((surah) => (
                              <CommandItem
                                key={surah.number}
                                id={`end-surah-${surah.number}`}
                                value={surah.name}
                                onSelect={() => {
                                  setEndSurah(String(surah.number))
                                  setEndOpen(false)
                                }}
                                className="flex items-center justify-between"
                              >
                                {surah.name}
                                {endSurah === String(surah.number) && <Check className="w-3.5 h-3.5 text-[#D4AF37]" />}
                              </CommandItem>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Select value={endVerse} onValueChange={setEndVerse} disabled={!endSurah || endVerseOptions.length === 0}>
                    <SelectTrigger className="w-[80px] h-10 border-[#D4AF37]/40 hover:border-[#D4AF37] transition-colors rounded-xl bg-white text-sm" dir="rtl">
                      <SelectValue placeholder="الآية" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48" dir="rtl">
                      {endVerseOptions.map((verse) => (
                        <SelectItem key={verse} value={verse.toString()} className="text-right">
                          {verse}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {startSurah && endSurahOptions.length === 0 && <p className="text-[11px] text-red-400">لا توجد سور صالحة</p>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5 flex flex-col w-full">
                <label className="text-sm font-semibold text-[#1a2332]">المقدار اليومي</label>
                <Select value={dailyPages} onValueChange={setDailyPages}>
                  <SelectTrigger className="border-[#D4AF37]/40 focus:border-[#D4AF37] rounded-xl text-right bg-white" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {DAILY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-right dir-rtl">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-2 pb-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">مقدار المراجعة اليومي</label>
                <Select value={muraajaaPages} onValueChange={setMuraajaaPages} dir="rtl">
                  <SelectTrigger className="border-[#D4AF37]/40 focus:border-[#D4AF37] rounded-xl text-right bg-white" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {MURAAJAA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-right dir-rtl">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">مقدار الربط اليومي</label>
                <Select value={rabtPages} onValueChange={setRabtPages} dir="rtl">
                  <SelectTrigger className="border-[#D4AF37]/40 focus:border-[#D4AF37] rounded-xl text-right bg-white" dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {RABT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-right dir-rtl">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {previewTotal > 0 && (() => {
              const previewStart = direction === "asc"
                ? SURAHS.find((surah) => surah.number === Math.min(parseInt(startSurah), parseInt(endSurah)))
                : SURAHS.find((surah) => surah.number === Math.max(parseInt(startSurah), parseInt(endSurah)))
              const previewEnd = direction === "asc"
                ? SURAHS.find((surah) => surah.number === Math.max(parseInt(startSurah), parseInt(endSurah)))
                : SURAHS.find((surah) => surah.number === Math.min(parseInt(startSurah), parseInt(endSurah)))

              return (
                <div className="rounded-xl bg-[#D4AF37]/8 border border-[#D4AF37]/30 p-4 space-y-3">
                  <p className="text-xs font-bold text-[#D4AF37]">معاينة الخطة</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg font-semibold text-xs">تبدأ من</span>
                    <span className="font-bold text-[#1a2332]">
                      {previewStart?.name}
                      {startVerse ? ` آية ${startVerse}` : ""}
                    </span>
                    <span className="text-neutral-300">←</span>
                    <span className="text-neutral-500 text-xs">
                      {previewEnd?.name}
                      {endVerse ? ` آية ${endVerse}` : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-black text-[#1a2332]">{previewTotal}</p>
                      <p className="text-[11px] text-neutral-400">وجهاً إجمالاً</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-[#1a2332]">{previewDays}</p>
                      <p className="text-[11px] text-neutral-400">يوماً</p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {saveMsg && (
              <div
                className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  saveMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {saveMsg.text}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-[#D4AF37]/25 flex gap-3">
            <Button
              variant="outline"
              onClick={handleSavePlan}
              disabled={isSaving || !startSurah || !endSurah}
              className="flex-1 border-[#D4AF37]/40 text-neutral-600 rounded-xl h-10"
            >
              {isSaving ? "جاري الحفظ..." : "حفظ الخطة"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              className="border-[#D4AF37]/40 text-neutral-600 rounded-xl h-10"
            >
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent showCloseButton={false} className="max-w-md bg-white rounded-2xl p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="px-6 py-5 border-b border-red-200 bg-gradient-to-r from-red-50 to-transparent">
            <DialogTitle className="text-lg font-bold text-[#1a2332]">إعادة حفظ طالب</DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-3">
            {students.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-10">لا يوجد طلاب</p>
            ) : (
              students.map((student) => {
                const hasStoredMemorized = !!(student.memorized_start_surah && student.memorized_end_surah)

                return (
                  <div key={student.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1a2332] truncate">{student.name}</p>
                      <p className="text-[11px] text-neutral-400">{hasStoredMemorized ? "لديه محفوظ سابق" : "لا يوجد محفوظ سابق"}</p>
                    </div>
                    <button
                      onClick={() => handleResetMemorization(student)}
                      disabled={!hasStoredMemorized || resettingStudentId === student.id}
                      className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {resettingStudentId === student.id ? "جاري التنفيذ..." : "حذف المحفوظ والبدء بخطة جديدة"}
                    </button>
                  </div>
                )
              })
            )}
          </div>

          <div className="px-6 py-4 border-t border-neutral-200 flex justify-end">
            <Button variant="outline" onClick={() => setResetDialogOpen(false)} className="rounded-xl border-neutral-300">
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}