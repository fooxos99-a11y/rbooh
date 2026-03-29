import { SURAHS, getAyahByPageFloat, getInclusiveEndAyah, getJuzBounds, getPageFloatForAyah, getSurahJuzNumbers } from "@/lib/quran-data"

export type EnrollmentJuzTestStatus = "pass" | "fail" | "review"
export type EnrollmentJuzReviewStatus = "pass" | "fail" | "needs_mastery"
export type EnrollmentPartialJuzRange = {
  juzNumber: number
  startSurahNumber: number
  startAyahNumber: number
  endSurahNumber: number
  endAyahNumber: number
}

const TEST_STATUSES = ["pass", "fail", "review"] as const
const REVIEW_STATUSES = ["pass", "fail", "needs_mastery"] as const

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeStatusMap<T extends string>(value: unknown, allowed: readonly T[]) {
  if (!isObjectRecord(value)) return {} as Record<number, T>

  return Object.entries(value).reduce<Record<number, T>>((accumulator, [key, status]) => {
    const juzNumber = Number.parseInt(key, 10)
    if (!Number.isNaN(juzNumber) && allowed.includes(status as T)) {
      accumulator[juzNumber] = status as T
    }
    return accumulator
  }, {})
}

export function normalizeEnrollmentTestResults(value: unknown) {
  return normalizeStatusMap(value, TEST_STATUSES)
}

export function normalizeEnrollmentReviewResults(value: unknown) {
  return normalizeStatusMap(value, REVIEW_STATUSES)
}

export function normalizeSelectedJuzs(value: unknown) {
  if (!Array.isArray(value)) return [] as number[]

  return Array.from(
    new Set(
      value
        .map((item) => Number.parseInt(String(item), 10))
        .filter((juzNumber) => Number.isInteger(juzNumber) && juzNumber >= 1 && juzNumber <= 30),
    ),
  ).sort((left, right) => left - right)
}

export function getJuzSelectablePageBounds(juzNumber: number) {
  const bounds = getJuzBounds(juzNumber)
  if (!bounds) return null

  return {
    juzNumber,
    minPage: Math.max(1, Math.floor(bounds.startPage)),
    maxPage: Math.min(604, Math.ceil(bounds.endPageExclusive) - 1),
  }
}

function compareAyahRefs(
  leftSurahNumber: number,
  leftAyahNumber: number,
  rightSurahNumber: number,
  rightAyahNumber: number,
) {
  if (leftSurahNumber !== rightSurahNumber) {
    return leftSurahNumber - rightSurahNumber
  }

  return leftAyahNumber - rightAyahNumber
}

export function getJuzSurahOptions(juzNumber: number) {
  const juzBounds = getJuzBounds(juzNumber)
  if (!juzBounds) return [] as Array<{ surahNumber: number; surahName: string; minAyah: number; maxAyah: number }>

  return SURAHS.filter((surah) => getSurahJuzNumbers(surah.number).includes(juzNumber)).map((surah) => ({
    surahNumber: surah.number,
    surahName: surah.name,
    minAyah: surah.number === juzBounds.startSurahNumber ? juzBounds.startVerseNumber : 1,
    maxAyah: surah.number === juzBounds.endSurahNumber ? juzBounds.endVerseNumber : surah.verseCount,
  }))
}

export function getJuzAyahBoundsForSurah(juzNumber: number, surahNumber: number) {
  return getJuzSurahOptions(juzNumber).find((surah) => surah.surahNumber === surahNumber) || null
}

export function normalizeEnrollmentPartialJuzRanges(value: unknown) {
  if (!Array.isArray(value)) return [] as EnrollmentPartialJuzRange[]

  const normalizedRanges = value.reduce<EnrollmentPartialJuzRange[]>((accumulator, item) => {
    if (!isObjectRecord(item)) {
      return accumulator
    }

    const juzNumber = Number.parseInt(String(item.juzNumber), 10)
    const juzBounds = getJuzBounds(juzNumber)
    if (!juzBounds) {
      return accumulator
    }

    let startSurahNumber = Number.parseInt(String(item.startSurahNumber), 10)
    let startAyahNumber = Number.parseInt(String(item.startAyahNumber), 10)
    let endSurahNumber = Number.parseInt(String(item.endSurahNumber), 10)
    let endAyahNumber = Number.parseInt(String(item.endAyahNumber), 10)

    if (
      Number.isNaN(startSurahNumber)
      || Number.isNaN(startAyahNumber)
      || Number.isNaN(endSurahNumber)
      || Number.isNaN(endAyahNumber)
    ) {
      const rawStartPage = Number.parseInt(String(item.startPage), 10)
      const rawEndPage = Number.parseInt(String(item.endPage), 10)
      if (Number.isNaN(rawStartPage) || Number.isNaN(rawEndPage)) {
        return accumulator
      }

      const normalizedStartPage = Math.min(rawStartPage, rawEndPage)
      const normalizedEndPage = Math.max(rawStartPage, rawEndPage)
      const startRef = getAyahByPageFloat(normalizedStartPage)
      const endRef = getInclusiveEndAyah(normalizedEndPage + 1)
      startSurahNumber = startRef.surah
      startAyahNumber = startRef.ayah
      endSurahNumber = endRef.surah
      endAyahNumber = endRef.ayah
    }

    const startSurahBounds = getJuzAyahBoundsForSurah(juzNumber, startSurahNumber)
    const endSurahBounds = getJuzAyahBoundsForSurah(juzNumber, endSurahNumber)
    if (!startSurahBounds || !endSurahBounds) {
      return accumulator
    }

    const normalizedStartAyah = Math.max(startSurahBounds.minAyah, Math.min(startSurahBounds.maxAyah, startAyahNumber))
    const normalizedEndAyah = Math.max(endSurahBounds.minAyah, Math.min(endSurahBounds.maxAyah, endAyahNumber))

    const startBeforeEnd = compareAyahRefs(startSurahNumber, normalizedStartAyah, endSurahNumber, normalizedEndAyah) <= 0

    accumulator.push({
      juzNumber,
      startSurahNumber: startBeforeEnd ? startSurahNumber : endSurahNumber,
      startAyahNumber: startBeforeEnd ? normalizedStartAyah : normalizedEndAyah,
      endSurahNumber: startBeforeEnd ? endSurahNumber : startSurahNumber,
      endAyahNumber: startBeforeEnd ? normalizedEndAyah : normalizedStartAyah,
    })

    return accumulator
  }, [])

  const dedupedByJuz = new Map<number, EnrollmentPartialJuzRange>()
  for (const range of normalizedRanges) {
    dedupedByJuz.set(range.juzNumber, range)
  }

  return Array.from(dedupedByJuz.values()).sort((left, right) => left.juzNumber - right.juzNumber)
}

export function getPartialJuzRangeForJuz(juzNumber: number, partialJuzRanges?: EnrollmentPartialJuzRange[] | null) {
  return normalizeEnrollmentPartialJuzRanges(partialJuzRanges).find((range) => range.juzNumber === juzNumber) || null
}

export function isFullJuzPageRange(range: EnrollmentPartialJuzRange) {
  const juzBounds = getJuzBounds(range.juzNumber)
  if (!juzBounds) return false

  return compareAyahRefs(range.startSurahNumber, range.startAyahNumber, juzBounds.startSurahNumber, juzBounds.startVerseNumber) <= 0
    && compareAyahRefs(range.endSurahNumber, range.endAyahNumber, juzBounds.endSurahNumber, juzBounds.endVerseNumber) >= 0
}

export function formatPartialJuzRange(range: EnrollmentPartialJuzRange) {
  const startSurah = SURAHS.find((surah) => surah.number === range.startSurahNumber)
  const endSurah = SURAHS.find((surah) => surah.number === range.endSurahNumber)
  const startLabel = `${startSurah?.name || `سورة ${range.startSurahNumber}`} آية ${range.startAyahNumber}`
  const endLabel = `${endSurah?.name || `سورة ${range.endSurahNumber}`} آية ${range.endAyahNumber}`
  return `الجزء ${range.juzNumber} من ${startLabel} إلى ${endLabel}`
}

export function formatPartialJuzRangeSpan(range: EnrollmentPartialJuzRange) {
  const startSurah = SURAHS.find((surah) => surah.number === range.startSurahNumber)
  const endSurah = SURAHS.find((surah) => surah.number === range.endSurahNumber)
  const startLabel = `${startSurah?.name || `سورة ${range.startSurahNumber}`} آية ${range.startAyahNumber}`
  const endLabel = `${endSurah?.name || `سورة ${range.endSurahNumber}`} آية ${range.endAyahNumber}`
  return `من ${startLabel} إلى ${endLabel}`
}

export function formatTestableMemorizedLabel(
  juzNumber: number,
  partialJuzRanges?: EnrollmentPartialJuzRange[] | null,
) {
  const partialRange = getPartialJuzRangeForJuz(juzNumber, partialJuzRanges)
  if (!partialRange || isFullJuzPageRange(partialRange)) {
    return `الجزء ${juzNumber}`
  }

  return formatPartialJuzRangeSpan(partialRange)
}

export function getPartialJuzRangePageBounds(range: EnrollmentPartialJuzRange) {
  const startPage = getPageFloatForAyah(range.startSurahNumber, range.startAyahNumber)
  const nextAyah = (() => {
    const endSurah = SURAHS.find((surah) => surah.number === range.endSurahNumber)
    if (!endSurah) return null
    if (range.endAyahNumber < endSurah.verseCount) {
      return { surah: range.endSurahNumber, ayah: range.endAyahNumber + 1 }
    }
    const nextSurah = SURAHS.find((surah) => surah.number === range.endSurahNumber + 1)
    return nextSurah ? { surah: nextSurah.number, ayah: 1 } : null
  })()

  return {
    startPage,
    endPageExclusive: nextAyah ? getPageFloatForAyah(nextAyah.surah, nextAyah.ayah) : 605,
  }
}

export function parseMemorizedJuzRange(amount?: string | null) {
  if (!amount) return null

  if (amount.includes("-")) {
    const [from, to] = amount.split("-").map((part) => Number.parseInt(part, 10))
    if (!Number.isNaN(from) && !Number.isNaN(to) && from >= 1 && to <= 30) {
      return { fromJuz: Math.min(from, to), toJuz: Math.max(from, to) }
    }
    return null
  }

  const juzNumber = Number.parseInt(amount, 10)
  if (Number.isNaN(juzNumber) || juzNumber < 1 || juzNumber > 30) {
    return null
  }

  return { fromJuz: juzNumber, toJuz: juzNumber }
}

export function getJuzNumbersFromAmount(amount?: string | null) {
  const parsedRange = parseMemorizedJuzRange(amount)
  if (!parsedRange) {
    return []
  }

  return Array.from(
    { length: parsedRange.toJuz - parsedRange.fromJuz + 1 },
    (_, index) => parsedRange.fromJuz + index,
  )
}

export function getTestableJuzNumbers(
  selectedJuzs?: number[] | null,
  amount?: string | null,
  partialJuzRanges?: EnrollmentPartialJuzRange[] | null,
) {
  const normalizedSelectedJuzs = normalizeSelectedJuzs(selectedJuzs)
  const normalizedPartialJuzRanges = normalizeEnrollmentPartialJuzRanges(partialJuzRanges)
  const partialJuzs = normalizedPartialJuzRanges.map((range) => range.juzNumber)
  const explicitJuzs = Array.from(new Set([...normalizedSelectedJuzs, ...partialJuzs])).sort((left, right) => left - right)

  if (explicitJuzs.length > 0) {
    return explicitJuzs
  }

  return getJuzNumbersFromAmount(amount)
}

export function isContiguousJuzSelection(juzs?: number[] | null) {
  const normalizedJuzs = normalizeSelectedJuzs(juzs)
  if (normalizedJuzs.length <= 1) {
    return true
  }

  for (let index = 1; index < normalizedJuzs.length; index += 1) {
    if (normalizedJuzs[index] !== normalizedJuzs[index - 1] + 1) {
      return false
    }
  }

  return true
}

export function getContiguousSelectedJuzRange(juzs?: number[] | null) {
  const normalizedJuzs = normalizeSelectedJuzs(juzs)
  if (normalizedJuzs.length === 0 || !isContiguousJuzSelection(normalizedJuzs)) {
    return null
  }

  return {
    fromJuz: normalizedJuzs[0],
    toJuz: normalizedJuzs[normalizedJuzs.length - 1],
  }
}

export function getInitialPassedJuzNumbers(testResults?: Record<number, EnrollmentJuzTestStatus>) {
  if (!testResults) return []

  return Object.entries(testResults)
    .filter(([, status]) => status === "pass")
    .map(([juzNumber]) => Number(juzNumber))
    .sort((left, right) => left - right)
}

export function getReviewRequestedJuzNumbers(testResults?: Record<number, EnrollmentJuzTestStatus>) {
  if (!testResults) return []

  return Object.entries(testResults)
    .filter(([, status]) => status === "review")
    .map(([juzNumber]) => Number(juzNumber))
    .sort((left, right) => left - right)
}

export function filterReviewResultsByReviewRequestedJuzs(
  testResults: Record<number, EnrollmentJuzTestStatus>,
  reviewResults?: Record<number, EnrollmentJuzReviewStatus>,
) {
  if (!reviewResults) return {}

  const reviewRequestedJuzs = new Set(getReviewRequestedJuzNumbers(testResults))

  return Object.entries(reviewResults).reduce<Record<number, EnrollmentJuzReviewStatus>>((accumulator, [key, status]) => {
    const juzNumber = Number.parseInt(key, 10)
    if (!Number.isNaN(juzNumber) && reviewRequestedJuzs.has(juzNumber)) {
      accumulator[juzNumber] = status
    }
    return accumulator
  }, {})
}

export function getPassedJuzNumbers(
  testResults?: Record<number, EnrollmentJuzTestStatus>,
  reviewResults?: Record<number, EnrollmentJuzReviewStatus>,
) {
  const directPassedJuzs = getInitialPassedJuzNumbers(testResults)
  const reviewedPassedJuzs = getReviewRequestedJuzNumbers(testResults).filter((juzNumber) => reviewResults?.[juzNumber] === "pass")

  return Array.from(new Set([...directPassedJuzs, ...reviewedPassedJuzs])).sort((left, right) => left - right)
}

export function getNeedsMasteryJuzNumbers(
  testResults?: Record<number, EnrollmentJuzTestStatus>,
  reviewResults?: Record<number, EnrollmentJuzReviewStatus>,
) {
  return getReviewRequestedJuzNumbers(testResults).filter((juzNumber) => reviewResults?.[juzNumber] === "needs_mastery")
}

function formatFullJuzSelectionSummary(selectedJuzs: number[]) {
  if (selectedJuzs.length === 1) {
    return `الجزء ${selectedJuzs[0]}`
  }

  if (isContiguousJuzSelection(selectedJuzs)) {
    return `من الجزء ${selectedJuzs[0]} إلى الجزء ${selectedJuzs[selectedJuzs.length - 1]}`
  }

  return `أجزاء كاملة: ${selectedJuzs.join("، ")}`
}

export function formatEnrollmentMemorizedAmount(
  amount?: string | null,
  selectedJuzs?: number[] | null,
  partialJuzRanges?: EnrollmentPartialJuzRange[] | null,
) {
  const normalizedSelectedJuzs = normalizeSelectedJuzs(selectedJuzs)
  const normalizedPartialJuzRanges = normalizeEnrollmentPartialJuzRanges(partialJuzRanges)

  if (normalizedSelectedJuzs.length > 0 || normalizedPartialJuzRanges.length > 0) {
    const summaryParts: string[] = []

    if (normalizedSelectedJuzs.length > 0) {
      summaryParts.push(formatFullJuzSelectionSummary(normalizedSelectedJuzs))
    }

    if (normalizedPartialJuzRanges.length > 0) {
      summaryParts.push(...normalizedPartialJuzRanges.map(formatPartialJuzRange))
    }

    return summaryParts.join("، ")
  }

  if (!amount) return "-"
  if (amount.includes("-")) {
    const [from, to] = amount.split("-")
    if (from === to) return `الجزء ${from}`
    return `من الجزء ${from} إلى الجزء ${to}`
  }
  return amount
}

export function formatJuzList(juzs?: number[]) {
  if (!juzs || juzs.length === 0) return ""

  return juzs
    .slice()
    .sort((left, right) => left - right)
    .map((juzNumber) => `الجزء ${juzNumber}`)
    .join("، ")
}