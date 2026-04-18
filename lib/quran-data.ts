import { PAGE_REFERENCES } from './quran-pages';
import { getSaudiDateString } from './saudi-time';
// بيانات القرآن الكريم - المصحف الشريف (مصحف المدينة المنورة)
// كل وجه = صفحة واحدة، المصحف = 604 صفحة

export interface Surah {
  number: number
  name: string
  verseCount: number
  startPage: number // صفحة بداية السورة في المصحف
  startLine?: number // سطر البداية داخل الصفحة (1-15) — للسور التي تشترك في نفس الصفحة
}

export const SURAHS: Surah[] = [
  { number: 1, name: "الفاتحة", verseCount: 7, startPage: 1 },
  { number: 2, name: "البقرة", verseCount: 286, startPage: 2 },
  { number: 3, name: "آل عمران", verseCount: 200, startPage: 50 },
  { number: 4, name: "النساء", verseCount: 176, startPage: 77 },
  { number: 5, name: "المائدة", verseCount: 120, startPage: 106 },
  { number: 6, name: "الأنعام", verseCount: 165, startPage: 128 },
  { number: 7, name: "الأعراف", verseCount: 206, startPage: 151 },
  { number: 8, name: "الأنفال", verseCount: 75, startPage: 177 },
  { number: 9, name: "التوبة", verseCount: 129, startPage: 187 },
  { number: 10, name: "يونس", verseCount: 109, startPage: 208 },
  { number: 11, name: "هود", verseCount: 123, startPage: 221 },
  { number: 12, name: "يوسف", verseCount: 111, startPage: 235 },
  { number: 13, name: "الرعد", verseCount: 43, startPage: 249 },
  { number: 14, name: "إبراهيم", verseCount: 52, startPage: 255 },
  { number: 15, name: "الحجر", verseCount: 99, startPage: 262 },
  { number: 16, name: "النحل", verseCount: 128, startPage: 267 },
  { number: 17, name: "الإسراء", verseCount: 111, startPage: 282 },
  { number: 18, name: "الكهف", verseCount: 110, startPage: 293 },
  { number: 19, name: "مريم", verseCount: 98, startPage: 305 },
  { number: 20, name: "طه", verseCount: 135, startPage: 312 },
  { number: 21, name: "الأنبياء", verseCount: 112, startPage: 322 },
  { number: 22, name: "الحج", verseCount: 78, startPage: 332 },
  { number: 23, name: "المؤمنون", verseCount: 118, startPage: 342 },
  { number: 24, name: "النور", verseCount: 64, startPage: 350 },
  { number: 25, name: "الفرقان", verseCount: 77, startPage: 359 },
  { number: 26, name: "الشعراء", verseCount: 227, startPage: 367 },
  { number: 27, name: "النمل", verseCount: 93, startPage: 377 },
  { number: 28, name: "القصص", verseCount: 88, startPage: 385 },
  { number: 29, name: "العنكبوت", verseCount: 69, startPage: 396 },
  { number: 30, name: "الروم", verseCount: 60, startPage: 404 },
  { number: 31, name: "لقمان", verseCount: 34, startPage: 411 },
  { number: 32, name: "السجدة", verseCount: 30, startPage: 415 },
  { number: 33, name: "الأحزاب", verseCount: 73, startPage: 418 },
  { number: 34, name: "سبأ", verseCount: 54, startPage: 428 },
  { number: 35, name: "فاطر", verseCount: 45, startPage: 434 },
  { number: 36, name: "يس", verseCount: 83, startPage: 440 },
  { number: 37, name: "الصافات", verseCount: 182, startPage: 446 },
  { number: 38, name: "ص", verseCount: 88, startPage: 453 },
  { number: 39, name: "الزمر", verseCount: 75, startPage: 458 },
  { number: 40, name: "غافر", verseCount: 85, startPage: 467 },
  { number: 41, name: "فصلت", verseCount: 54, startPage: 477 },
  { number: 42, name: "الشورى", verseCount: 53, startPage: 483 },
  { number: 43, name: "الزخرف", verseCount: 89, startPage: 489 },
  { number: 44, name: "الدخان", verseCount: 59, startPage: 496 },
  { number: 45, name: "الجاثية", verseCount: 37, startPage: 499 },
  { number: 46, name: "الأحقاف", verseCount: 35, startPage: 502 },
  { number: 47, name: "محمد", verseCount: 38, startPage: 507 },
  { number: 48, name: "الفتح", verseCount: 29, startPage: 511 },
  { number: 49, name: "الحجرات", verseCount: 18, startPage: 515 },
  { number: 50, name: "ق", verseCount: 45, startPage: 518 },
  { number: 51, name: "الذاريات", verseCount: 60, startPage: 520 },
  { number: 52, name: "الطور", verseCount: 49, startPage: 523 },
  { number: 53, name: "النجم", verseCount: 62, startPage: 526 },
  { number: 54, name: "القمر", verseCount: 55, startPage: 528 },
  { number: 55, name: "الرحمن", verseCount: 78, startPage: 531 },
  { number: 56, name: "الواقعة", verseCount: 96, startPage: 534 },
  { number: 57, name: "الحديد", verseCount: 29, startPage: 537 },
  { number: 58, name: "المجادلة", verseCount: 22, startPage: 542 },
  { number: 59, name: "الحشر", verseCount: 24, startPage: 545 },
  { number: 60, name: "الممتحنة", verseCount: 13, startPage: 549 },
  { number: 61, name: "الصف", verseCount: 14, startPage: 551 },
  { number: 62, name: "الجمعة", verseCount: 11, startPage: 553 },
  { number: 63, name: "المنافقون", verseCount: 11, startPage: 554 },
  { number: 64, name: "التغابن", verseCount: 18, startPage: 556 },
  { number: 65, name: "الطلاق", verseCount: 12, startPage: 558 },
  { number: 66, name: "التحريم", verseCount: 12, startPage: 560 },
  { number: 67, name: "الملك", verseCount: 30, startPage: 562 },
  { number: 68, name: "القلم", verseCount: 52, startPage: 564 },
  { number: 69, name: "الحاقة", verseCount: 52, startPage: 566 },
  { number: 70, name: "المعارج", verseCount: 44, startPage: 568 },
  { number: 71, name: "نوح", verseCount: 28, startPage: 570 },
  { number: 72, name: "الجن", verseCount: 28, startPage: 572 },
  { number: 73, name: "المزمل", verseCount: 20, startPage: 574 },
  { number: 74, name: "المدثر", verseCount: 56, startPage: 575 },
  { number: 75, name: "القيامة", verseCount: 40, startPage: 577 },
  { number: 76, name: "الإنسان", verseCount: 31, startPage: 578 },
  { number: 77, name: "المرسلات", verseCount: 50, startPage: 580 },
  { number: 78, name: "النبأ", verseCount: 40, startPage: 582 },
  { number: 79, name: "النازعات", verseCount: 46, startPage: 583 },
  { number: 80, name: "عبس", verseCount: 42, startPage: 585 },
  { number: 81, name: "التكوير", verseCount: 29, startPage: 586 },
  { number: 82, name: "الانفطار",  verseCount: 19, startPage: 587, startLine: 1 },
  { number: 83, name: "المطففين", verseCount: 36, startPage: 587, startLine: 9 },
  { number: 84, name: "الانشقاق", verseCount: 25, startPage: 589 },
  { number: 85, name: "البروج", verseCount: 22, startPage: 590 },
  { number: 86, name: "الطارق",   verseCount: 17, startPage: 591, startLine: 1  },
  { number: 87, name: "الأعلى",   verseCount: 19, startPage: 591, startLine: 9  },
  { number: 88, name: "الغاشية",  verseCount: 26, startPage: 592 },
  { number: 89, name: "الفجر",    verseCount: 30, startPage: 593 },
  { number: 90, name: "البلد",    verseCount: 20, startPage: 594 },
  { number: 91, name: "الشمس",   verseCount: 15, startPage: 595, startLine: 1  },
  { number: 92, name: "الليل",    verseCount: 21, startPage: 595, startLine: 9  },
  { number: 93, name: "الضحى",   verseCount: 11, startPage: 596, startLine: 1  },
  { number: 94, name: "الشرح",   verseCount: 8,  startPage: 596, startLine: 9  },
  { number: 95, name: "التين",    verseCount: 8,  startPage: 597, startLine: 1  },
  { number: 96, name: "العلق",   verseCount: 19, startPage: 597, startLine: 8  },
  { number: 97, name: "القدر",   verseCount: 5,  startPage: 598, startLine: 1  },
  { number: 98, name: "البينة",   verseCount: 8,  startPage: 598, startLine: 5  },
  { number: 99, name: "الزلزلة",  verseCount: 8,  startPage: 599, startLine: 1  },
  { number: 100, name: "العاديات", verseCount: 11, startPage: 599, startLine: 8  },
  { number: 101, name: "القارعة",  verseCount: 11, startPage: 600, startLine: 1  },
  { number: 102, name: "التكاثر", verseCount: 8,  startPage: 600, startLine: 9  },
  { number: 103, name: "العصر",   verseCount: 3,  startPage: 601, startLine: 1  },
  { number: 104, name: "الهمزة",  verseCount: 9,  startPage: 601, startLine: 4  },
  { number: 105, name: "الفيل",   verseCount: 5,  startPage: 601, startLine: 10 },
  { number: 106, name: "قريش",   verseCount: 4,  startPage: 602, startLine: 1  },
  { number: 107, name: "الماعون", verseCount: 7,  startPage: 602, startLine: 5  },
  { number: 108, name: "الكوثر",  verseCount: 3,  startPage: 602, startLine: 11 },
  { number: 109, name: "الكافرون", verseCount: 6, startPage: 603, startLine: 1  },
  { number: 110, name: "النصر",   verseCount: 3,  startPage: 603, startLine: 7  },
  { number: 111, name: "المسد",   verseCount: 5,  startPage: 603, startLine: 11 },
  { number: 112, name: "الإخلاص", verseCount: 4,  startPage: 604, startLine: 1  },
  { number: 113, name: "الفلق",   verseCount: 5,  startPage: 604, startLine: 6  },
  { number: 114, name: "الناس",   verseCount: 6,  startPage: 604, startLine: 10 },
]

// المصحف = 604 صفحة (وجه)
export const TOTAL_MUSHAF_PAGES = 604

// صفحات بداية الأجزاء الثلاثين في مصحف المدينة
const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182,
  201, 222, 242, 262, 282, 302, 322, 342, 362, 382,
  402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
]

const JUZ_START_AYAHS = [
  { juz: 1, surah: 1, ayah: 1 },
  { juz: 2, surah: 2, ayah: 142 },
  { juz: 3, surah: 2, ayah: 253 },
  { juz: 4, surah: 3, ayah: 93 },
  { juz: 5, surah: 4, ayah: 24 },
  { juz: 6, surah: 4, ayah: 148 },
  { juz: 7, surah: 5, ayah: 82 },
  { juz: 8, surah: 6, ayah: 111 },
  { juz: 9, surah: 7, ayah: 88 },
  { juz: 10, surah: 8, ayah: 41 },
  { juz: 11, surah: 9, ayah: 93 },
  { juz: 12, surah: 11, ayah: 6 },
  { juz: 13, surah: 12, ayah: 53 },
  { juz: 14, surah: 15, ayah: 1 },
  { juz: 15, surah: 17, ayah: 1 },
  { juz: 16, surah: 18, ayah: 75 },
  { juz: 17, surah: 21, ayah: 1 },
  { juz: 18, surah: 23, ayah: 1 },
  { juz: 19, surah: 25, ayah: 21 },
  { juz: 20, surah: 27, ayah: 56 },
  { juz: 21, surah: 29, ayah: 46 },
  { juz: 22, surah: 33, ayah: 31 },
  { juz: 23, surah: 36, ayah: 28 },
  { juz: 24, surah: 39, ayah: 32 },
  { juz: 25, surah: 41, ayah: 47 },
  { juz: 26, surah: 46, ayah: 1 },
  { juz: 27, surah: 51, ayah: 31 },
  { juz: 28, surah: 58, ayah: 1 },
  { juz: 29, surah: 67, ayah: 1 },
  { juz: 30, surah: 78, ayah: 1 },
]

/**
 * الموضع العائم للسورة: صفحة + كسر بناءً على رقم السطر (15 سطر/صفحة)
 * مثال: صفحة 604 سطر 10 → 604 + (10-1)/15 ≈ 604.6
 */
export function getSurahFloatPos(surahNumber: number): number {
  const s = SURAHS.find((s) => s.number === surahNumber)
  if (!s) return 0
  return s.startPage + ((s.startLine ?? 1) - 1) / 15
}

/**
 * الموضع العائم لنهاية السورة (= بداية السورة التالية)
 */
export function getSurahEndFloat(surahNumber: number): number {
  const idx = SURAHS.findIndex((s) => s.number === surahNumber)
  if (idx === -1 || idx === SURAHS.length - 1) return TOTAL_MUSHAF_PAGES + 1
  return getSurahFloatPos(SURAHS[idx + 1].number)
}

/**
 * إيجاد السورة عند موضع عائم معين
 */
export function getSurahAtFloatPos(floatPos: number): Surah {
  let result = SURAHS[0]
  for (const surah of SURAHS) {
    if (getSurahFloatPos(surah.number) <= floatPos) {
      result = surah
    } else {
      break
    }
  }
  return result
}

/**
 * إيجاد السورة التي تبدأ في صفحة معينة أو أقرب سورة قبلها
 */
export function getSurahAtPage(page: number): Surah {
  return getSurahAtFloatPos(page)
}

/**
 * حساب آخر صفحة لسورة معينة
 * = صفحة بداية السورة التالية - 1  (أو 604 إذا كانت آخر سورة)
 */
export function getSurahEndPage(surahNumber: number): number {
  const idx = SURAHS.findIndex((s) => s.number === surahNumber)
  if (idx === -1) return TOTAL_MUSHAF_PAGES
  if (idx === SURAHS.length - 1) return TOTAL_MUSHAF_PAGES
  return SURAHS[idx + 1].startPage - 1
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

function getAyahDistance(
  startSurahNumber: number,
  startAyahNumber: number,
  endSurahNumber: number,
  endAyahNumber: number,
) {
  if (compareAyahRefs(startSurahNumber, startAyahNumber, endSurahNumber, endAyahNumber) >= 0) {
    return 0
  }

  let distance = 0

  for (let surahNumber = startSurahNumber; surahNumber <= endSurahNumber; surahNumber += 1) {
    const surah = SURAHS.find((item) => item.number === surahNumber)
    if (!surah) continue

    if (surahNumber === startSurahNumber && surahNumber === endSurahNumber) {
      distance += endAyahNumber - startAyahNumber
      continue
    }

    if (surahNumber === startSurahNumber) {
      distance += surah.verseCount - startAyahNumber + 1
      continue
    }

    if (surahNumber === endSurahNumber) {
      distance += endAyahNumber - 1
      continue
    }

    distance += surah.verseCount
  }

  return distance
}

export function getPageForAyah(surahNumber: number, ayahNumber: number): number {
  let page = 1

  for (let index = 0; index < PAGE_REFERENCES.length; index += 1) {
    const reference = PAGE_REFERENCES[index]
    if (compareAyahRefs(reference.surah, reference.ayah, surahNumber, ayahNumber) <= 0) {
      page = index + 1
      continue
    }

    break
  }

  return page
}

export function getNextAyahReference(surahNumber: number, ayahNumber: number) {
  const surah = SURAHS.find((item) => item.number === surahNumber)
  if (!surah) return null

  if (ayahNumber < surah.verseCount) {
    return { surah: surahNumber, ayah: ayahNumber + 1 }
  }

  const nextSurah = SURAHS.find((item) => item.number === surahNumber + 1)
  return nextSurah ? { surah: nextSurah.number, ayah: 1 } : null
}

export function getPageFloatForAyah(surahNumber: number, ayahNumber: number) {
  const surah = SURAHS.find((item) => item.number === surahNumber)
  if (surah) {
    const surahStartFloat = getSurahFloatPos(surahNumber)
    const surahEndFloat = getSurahEndFloat(surahNumber)
    const occupiesSinglePage = Math.floor(surahStartFloat) === Math.floor(Math.max(surahStartFloat, surahEndFloat - 0.0001))

    if (occupiesSinglePage) {
      const normalizedAyahNumber = Math.max(1, Math.min(surah.verseCount, ayahNumber))
      const verseProgress = (normalizedAyahNumber - 1) / Math.max(1, surah.verseCount)
      return surahStartFloat + (surahEndFloat - surahStartFloat) * verseProgress
    }
  }

  const page = getPageForAyah(surahNumber, ayahNumber)
  const startReference = PAGE_REFERENCES[page - 1]
  const nextReference = PAGE_REFERENCES[page]

  if (!startReference || !nextReference) {
    return page
  }

  if (compareAyahRefs(surahNumber, ayahNumber, startReference.surah, startReference.ayah) <= 0) {
    return page
  }

  const totalVersesInPage = getAyahDistance(
    startReference.surah,
    startReference.ayah,
    nextReference.surah,
    nextReference.ayah,
  )

  if (totalVersesInPage <= 0) {
    return page
  }

  const verseOffset = getAyahDistance(
    startReference.surah,
    startReference.ayah,
    surahNumber,
    ayahNumber,
  )

  return page + Math.max(0, Math.min(0.9999, verseOffset / totalVersesInPage))
}

export function getPageRangeLength(range?: { startPage: number; endPage: number; endPageExclusive?: number } | null) {
  if (!range) return 0

  const endPageExclusive = range.endPageExclusive ?? (range.endPage + 1)
  return Math.max(0, endPageExclusive - range.startPage)
}

/**
 * حساب إجمالي عدد الأوجه بين سورتين (يدعم الاتجاهين تصاعدياً وتنازلياً)
 */
export function calculateTotalPages(
  startSurahNumber: number,
  endSurahNumber: number,
  startVerseNumber?: number | null,
  endVerseNumber?: number | null,
): number {
  const startSurah = SURAHS.find((s) => s.number === startSurahNumber)
  const endSurah = SURAHS.find((s) => s.number === endSurahNumber)

  if (!startSurah || !endSurah) return 0

  const safeStartVerse = startVerseNumber && startVerseNumber > 0 ? startVerseNumber : 1
  const safeEndVerse = endVerseNumber && endVerseNumber > 0 ? endVerseNumber : endSurah.verseCount

  const startPage = getPageForAyah(startSurahNumber, safeStartVerse)
  const endPage = getPageForAyah(endSurahNumber, safeEndVerse)

  return Math.abs(endPage - startPage) + 1
}

/**
 * حساب عدد الأيام بناءً على الأوجه اليومية
 */
export function calculateTotalDays(totalPages: number, dailyPages: number): number {
  return Math.ceil(totalPages / dailyPages)
}

type SegmentedPlanLike = {
  start_surah_number?: number | null
  start_verse?: number | null
  end_surah_number?: number | null
  end_verse?: number | null
  total_pages?: number | null
  total_days?: number | null
  daily_pages?: number | null
  direction?: "asc" | "desc" | null
  has_previous?: boolean | null
  prev_start_surah?: number | null
  prev_start_verse?: number | null
  prev_end_surah?: number | null
  prev_end_verse?: number | null
  completed_juzs?: number[] | null
  previous_memorization_ranges?: AyahRange[] | null
}

type PlanSegment = {
  startSurahNumber: number
  startVerseNumber: number
  endSurahNumber: number
  endVerseNumber: number
  totalPages: number
}

type AyahRange = {
  startSurahNumber: number
  startVerseNumber: number
  endSurahNumber: number
  endVerseNumber: number
}

function compareAyahReferences(
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

function getPreviousAyahReference(surahNumber: number, ayahNumber: number) {
  if (ayahNumber > 1) {
    return { surah: surahNumber, ayah: ayahNumber - 1 }
  }

  const previousSurah = SURAHS.find((surah) => surah.number === surahNumber - 1)
  if (!previousSurah) return null

  return { surah: previousSurah.number, ayah: previousSurah.verseCount }
}

function getEffectiveEndVerse(surahNumber: number, verseNumber?: number | null) {
  const surah = SURAHS.find((item) => item.number === surahNumber)
  return Number(verseNumber) || surah?.verseCount || 1
}

function getRangeEndPageExclusive(endSurahNumber: number, endVerseNumber: number) {
  const nextRef = getNextAyahReference(endSurahNumber, endVerseNumber)
  if (!nextRef) {
    return 605
  }

  return getPageFloatForAyah(nextRef.surah, nextRef.ayah)
}

function getPreciseRangePages(
  startSurahNumber: number,
  startVerseNumber: number,
  endSurahNumber: number,
  endVerseNumber: number,
) {
  const startPage = getPageFloatForAyah(startSurahNumber, startVerseNumber)
  const endPageExclusive = getRangeEndPageExclusive(endSurahNumber, endVerseNumber)

  return Math.max(0, endPageExclusive - startPage)
}

export function getNormalizedCompletedJuzs(completedJuzs?: number[] | null) {
  return Array.from(
    new Set((completedJuzs || []).filter((juzNumber) => Number.isInteger(juzNumber) && juzNumber >= 1 && juzNumber <= 30)),
  ).sort((left, right) => left - right)
}

function isNormalizedJuzSequenceContiguous(juzNumbers: number[]) {
  if (juzNumbers.length <= 1) {
    return true
  }

  for (let index = 1; index < juzNumbers.length; index += 1) {
    if (juzNumbers[index] !== juzNumbers[index - 1] + 1) {
      return false
    }
  }

  return true
}

export function hasScatteredCompletedJuzs(completedJuzs?: number[] | null) {
  const normalized = getNormalizedCompletedJuzs(completedJuzs)
  return normalized.length > 1 && !isNormalizedJuzSequenceContiguous(normalized)
}

function normalizeAyahRange(range: AyahRange): AyahRange {
  if (compareAyahReferences(range.startSurahNumber, range.startVerseNumber, range.endSurahNumber, range.endVerseNumber) <= 0) {
    return range
  }

  return {
    startSurahNumber: range.endSurahNumber,
    startVerseNumber: range.endVerseNumber,
    endSurahNumber: range.startSurahNumber,
    endVerseNumber: range.startVerseNumber,
  }
}

function mergeAyahRanges(ranges: AyahRange[]) {
  const normalizedRanges = ranges
    .map(normalizeAyahRange)
    .sort((left, right) => compareAyahReferences(
      left.startSurahNumber,
      left.startVerseNumber,
      right.startSurahNumber,
      right.startVerseNumber,
    ))

  if (normalizedRanges.length === 0) {
    return [] as AyahRange[]
  }

  const mergedRanges: AyahRange[] = [normalizedRanges[0]]

  for (let index = 1; index < normalizedRanges.length; index += 1) {
    const currentRange = normalizedRanges[index]
    const lastRange = mergedRanges[mergedRanges.length - 1]
    const nextAyahAfterLastRange = getNextAyahReference(lastRange.endSurahNumber, lastRange.endVerseNumber)
    const rangesTouchOrOverlap = nextAyahAfterLastRange
      ? compareAyahReferences(
          currentRange.startSurahNumber,
          currentRange.startVerseNumber,
          nextAyahAfterLastRange.surah,
          nextAyahAfterLastRange.ayah,
        ) <= 0
      : true

    if (rangesTouchOrOverlap) {
      if (
        compareAyahReferences(
          currentRange.endSurahNumber,
          currentRange.endVerseNumber,
          lastRange.endSurahNumber,
          lastRange.endVerseNumber,
        ) > 0
      ) {
        lastRange.endSurahNumber = currentRange.endSurahNumber
        lastRange.endVerseNumber = currentRange.endVerseNumber
      }
      continue
    }

    mergedRanges.push(currentRange)
  }

  return mergedRanges
}

function getPreviousMemorizedRanges(plan: Pick<SegmentedPlanLike, "has_previous" | "prev_start_surah" | "prev_start_verse" | "prev_end_surah" | "prev_end_verse" | "completed_juzs" | "previous_memorization_ranges">) {
  const ranges: AyahRange[] = []
  let hasExplicitPreviousRange = false

  if (plan.has_previous && plan.prev_start_surah && plan.prev_end_surah) {
    ranges.push({
      startSurahNumber: Number(plan.prev_start_surah),
      startVerseNumber: Number(plan.prev_start_verse) || 1,
      endSurahNumber: Number(plan.prev_end_surah),
      endVerseNumber: getEffectiveEndVerse(Number(plan.prev_end_surah), plan.prev_end_verse),
    })
    hasExplicitPreviousRange = true
  }

  for (const range of Array.isArray(plan.previous_memorization_ranges) ? plan.previous_memorization_ranges : []) {
    const startSurahNumber = Number(range?.startSurahNumber)
    const startVerseNumber = Number(range?.startVerseNumber) || 1
    const endSurahNumber = Number(range?.endSurahNumber)
    const endVerseNumber = Number(range?.endVerseNumber)

    if (!startSurahNumber || !endSurahNumber) {
      continue
    }

    ranges.push({
      startSurahNumber,
      startVerseNumber,
      endSurahNumber,
      endVerseNumber: getEffectiveEndVerse(endSurahNumber, endVerseNumber),
    })
    hasExplicitPreviousRange = true
  }

  if (!hasExplicitPreviousRange) {
    for (const juzNumber of getNormalizedCompletedJuzs(plan.completed_juzs)) {
      const juzBounds = getJuzBounds(juzNumber)
      if (!juzBounds) continue

      ranges.push({
        startSurahNumber: juzBounds.startSurahNumber,
        startVerseNumber: juzBounds.startVerseNumber,
        endSurahNumber: juzBounds.endSurahNumber,
        endVerseNumber: juzBounds.endVerseNumber,
      })
    }
  }

  return mergeAyahRanges(ranges)
}

function createPlanSegment(
  startSurahNumber: number,
  startVerseNumber: number,
  endSurahNumber: number,
  endVerseNumber: number,
): PlanSegment {
  return {
    startSurahNumber,
    startVerseNumber,
    endSurahNumber,
    endVerseNumber,
    totalPages: getPreciseRangePages(startSurahNumber, startVerseNumber, endSurahNumber, endVerseNumber),
  }
}

function getBaseOrderedPlanSegments(plan: SegmentedPlanLike): PlanSegment[] | null {
  if (!plan.start_surah_number || !plan.end_surah_number) {
    return null
  }

  const direction = plan.direction === "desc" ? "desc" : "asc"
  const startSurahNumber = Number(plan.start_surah_number)
  const endSurahNumber = Number(plan.end_surah_number)

  if (direction === "desc") {
    if (startSurahNumber < endSurahNumber) {
      return null
    }

    const segments: PlanSegment[] = []

    for (let surahNumber = startSurahNumber; surahNumber >= endSurahNumber; surahNumber -= 1) {
      const surah = SURAHS.find((item) => item.number === surahNumber)
      if (!surah) {
        continue
      }

      const startVerseNumber = surahNumber === startSurahNumber
        ? Number(plan.start_verse) || 1
        : 1
      const endVerseNumber = surahNumber === endSurahNumber
        ? getEffectiveEndVerse(surahNumber, plan.end_verse)
        : surah.verseCount

      if (startVerseNumber > endVerseNumber) {
        continue
      }

      segments.push(createPlanSegment(surahNumber, startVerseNumber, surahNumber, endVerseNumber))
    }

    return segments.length > 0 ? segments : null
  }

  return [
    createPlanSegment(
      startSurahNumber,
      Number(plan.start_verse) || 1,
      endSurahNumber,
      getEffectiveEndVerse(endSurahNumber, plan.end_verse),
    ),
  ]
}

function subtractSkippedRangesFromSegment(segment: PlanSegment, skippedRanges: AyahRange[]) {
  if (skippedRanges.length === 0) {
    return [segment]
  }

  const remainingSegments: PlanSegment[] = []
  const segmentEnd = {
    surah: segment.endSurahNumber,
    ayah: segment.endVerseNumber,
  }

  let currentStart = {
    surah: segment.startSurahNumber,
    ayah: segment.startVerseNumber,
  }

  for (const skippedRange of skippedRanges) {
    if (
      compareAyahReferences(
        skippedRange.endSurahNumber,
        skippedRange.endVerseNumber,
        currentStart.surah,
        currentStart.ayah,
      ) < 0
    ) {
      continue
    }

    if (
      compareAyahReferences(
        skippedRange.startSurahNumber,
        skippedRange.startVerseNumber,
        segmentEnd.surah,
        segmentEnd.ayah,
      ) > 0
    ) {
      break
    }

    const beforeSkipped = getPreviousAyahReference(skippedRange.startSurahNumber, skippedRange.startVerseNumber)

    if (
      beforeSkipped &&
      compareAyahReferences(currentStart.surah, currentStart.ayah, beforeSkipped.surah, beforeSkipped.ayah) <= 0
    ) {
      const clippedEnd = compareAyahReferences(beforeSkipped.surah, beforeSkipped.ayah, segmentEnd.surah, segmentEnd.ayah) <= 0
        ? beforeSkipped
        : segmentEnd

      remainingSegments.push(
        createPlanSegment(currentStart.surah, currentStart.ayah, clippedEnd.surah, clippedEnd.ayah),
      )
    }

    const nextStart = getNextAyahReference(skippedRange.endSurahNumber, skippedRange.endVerseNumber)
    if (!nextStart) {
      return remainingSegments
    }

    if (compareAyahReferences(nextStart.surah, nextStart.ayah, segmentEnd.surah, segmentEnd.ayah) > 0) {
      return remainingSegments
    }

    currentStart = nextStart
  }

  if (compareAyahReferences(currentStart.surah, currentStart.ayah, segmentEnd.surah, segmentEnd.ayah) <= 0) {
    remainingSegments.push(
      createPlanSegment(currentStart.surah, currentStart.ayah, segmentEnd.surah, segmentEnd.ayah),
    )
  }

  return remainingSegments
}

function getSkippedPlanSegments(plan: SegmentedPlanLike): PlanSegment[] | null {
  const baseSegments = getBaseOrderedPlanSegments(plan)
  if (!baseSegments) {
    return null
  }

  const skippedRanges = getPreviousMemorizedRanges(plan)

  if ((plan.direction || "asc") !== "desc" && skippedRanges.length === 0) {
    return null
  }

  const segments = baseSegments.flatMap((segment) => subtractSkippedRangesFromSegment(segment, skippedRanges))

  return segments.length > 0 ? segments : []
}

function getMidSkippedPreviousPlanSegments(plan: SegmentedPlanLike): PlanSegment[] | null {
  const skippedPlanSegments = getSkippedPlanSegments(plan)
  if (skippedPlanSegments) {
    return skippedPlanSegments
  }

  return null
}

function getSegmentedPlanTotalDays(
  segments: PlanSegment[],
  dailyPages: number,
  direction: "asc" | "desc" = "asc",
) {
  if (!Number.isFinite(dailyPages) || dailyPages <= 0) return 0

  const sessionSegments = segments.map((segment) => createSessionSequenceSegment(segment, direction))
  const totalPages = sessionSegments.reduce((total, segment) => total + getMemorizedPageSegmentSize(segment), 0)

  if (direction === "desc" && dailyPages === 1 && sessionSegments.length > 0) {
    const firstPageNumber = Math.floor(sessionSegments[0].startPage)
    let firstSessionPages = 0

    for (const segment of sessionSegments) {
      if (Math.floor(segment.startPage) !== firstPageNumber) {
        break
      }

      firstSessionPages += getMemorizedPageSegmentSize(segment)
    }

    const normalizedFirstSessionPages = Math.min(dailyPages, Math.max(0, firstSessionPages))
    if (normalizedFirstSessionPages > 0 && normalizedFirstSessionPages < dailyPages - 0.0001) {
      return 1 + calculateTotalDays(Math.max(0, totalPages - normalizedFirstSessionPages), dailyPages)
    }
  }

  return calculateTotalDays(totalPages, dailyPages)
}

function createSessionSequenceSegment(segment: PlanSegment, direction: "asc" | "desc" = "asc"): MemorizedPageSegment {
  const physicalStartPage = getPageFloatForAyah(segment.startSurahNumber, segment.startVerseNumber)
  const physicalEndPageExclusive = getRangeEndPageExclusive(segment.endSurahNumber, segment.endVerseNumber)

  return {
    startPage: physicalStartPage,
    endPageExclusive: physicalEndPageExclusive,
    startSurahNumber: segment.startSurahNumber,
    startVerseNumber: segment.startVerseNumber,
    endSurahNumber: segment.endSurahNumber,
    endVerseNumber: segment.endVerseNumber,
    direction,
  }
}

function getSegmentedPlanSessionContent(
  segments: PlanSegment[],
  sessionNum: number,
  dailyPages: number,
  direction: "asc" | "desc" = "asc",
) {
  if (sessionNum <= 0 || dailyPages <= 0 || segments.length === 0) {
    return null
  }

  const sessionSegments = segments.map((segment) => createSessionSequenceSegment(segment, direction))
  const totalPages = sessionSegments.reduce((total, segment) => total + getMemorizedPageSegmentSize(segment), 0)
  if (totalPages <= 0) {
    return null
  }

  const totalDays = getSegmentedPlanTotalDays(segments, dailyPages, direction)
  if (sessionNum > totalDays) {
    return null
  }

  const firstSessionRemainder = (() => {
    if (dailyPages !== 1 || sessionSegments.length === 0) {
      return dailyPages
    }

    if (direction === "desc") {
      const firstPageNumber = Math.floor(sessionSegments[0].startPage)
      let remainingPageContent = 0

      for (const segment of sessionSegments) {
        if (Math.floor(segment.startPage) !== firstPageNumber) {
          break
        }

        remainingPageContent += getMemorizedPageSegmentSize(segment)
      }

      return Math.min(dailyPages, remainingPageContent || dailyPages)
    }

    const firstStartPage = sessionSegments[0].startPage
    const fractionalPart = ((firstStartPage % 1) + 1) % 1

    if (fractionalPart <= 0.0001) {
      return dailyPages
    }

    return Math.min(dailyPages, 1 - fractionalPart)
  })()

  const offsetPages = sessionNum === 1
    ? 0
    : Math.max(0, firstSessionRemainder + (sessionNum - 2) * dailyPages)
  const preferredPages = sessionNum === 1
    ? Math.min(firstSessionRemainder, totalPages)
    : Math.min(dailyPages, Math.max(0, totalPages - offsetPages))
  if (preferredPages <= 0) {
    return null
  }

  return getSlidingSegmentContent(sessionSegments, offsetPages, preferredPages)
}

function getContiguousAscendingSessionContent(segment: PlanSegment, sessionNum: number, dailyPages: number): PlanSessionContent | null {
  const totalPages = segment.totalPages
  if (dailyPages <= 0 || totalPages <= 0 || sessionNum <= 0) {
    return null
  }

  const planStartPage = getPageForAyah(segment.startSurahNumber, segment.startVerseNumber)
  let sessionStart = planStartPage + (sessionNum - 1) * dailyPages
  sessionStart = Math.max(1, Math.min(sessionStart, 605))
  const sessionEnd = Math.max(sessionStart, Math.min(sessionStart + dailyPages, 605))
  const lowerRef = getAyahByPageFloat(sessionStart)
  const upperRef = getInclusiveEndAyah(sessionEnd)
  const totalDays = calculateTotalDays(totalPages, dailyPages)
  const explicitStartRef: AyahReference = {
    surah: segment.startSurahNumber,
    ayah: segment.startVerseNumber,
  }
  const explicitEndRef: AyahReference = {
    surah: segment.endSurahNumber,
    ayah: segment.endVerseNumber,
  }
  const fromRef = sessionNum === 1 ? explicitStartRef : lowerRef
  const toRef = sessionNum === totalDays ? explicitEndRef : upperRef

  return formatPlanSessionContent(fromRef, toRef)
}

export function resolvePlanTotalPages(plan: {
  start_surah_number?: number | null
  start_verse?: number | null
  end_surah_number?: number | null
  end_verse?: number | null
  total_pages?: number | null
  direction?: "asc" | "desc" | null
  has_previous?: boolean | null
  prev_start_surah?: number | null
  prev_start_verse?: number | null
  prev_end_surah?: number | null
  prev_end_verse?: number | null
  completed_juzs?: number[] | null
}) {
  const segmentedPlan = getMidSkippedPreviousPlanSegments(plan)
  if (segmentedPlan !== null) {
    const segmentedTotalPages = segmentedPlan.reduce((total, segment) => total + segment.totalPages, 0)
    return segmentedTotalPages > 0 ? segmentedTotalPages : Number(plan.total_pages) || 0
  }

  if (plan.start_surah_number && plan.end_surah_number) {
    const calculatedPages = calculateTotalPages(
      Number(plan.start_surah_number),
      Number(plan.end_surah_number),
      plan.start_verse,
      plan.end_verse,
    )

    if (calculatedPages > 0) {
      return calculatedPages
    }
  }

  return Number(plan.total_pages) || 0
}

export function resolvePlanTotalDays(plan: {
  start_surah_number?: number | null
  start_verse?: number | null
  end_surah_number?: number | null
  end_verse?: number | null
  total_pages?: number | null
  daily_pages?: number | null
  total_days?: number | null
  direction?: "asc" | "desc" | null
  has_previous?: boolean | null
  prev_start_surah?: number | null
  prev_start_verse?: number | null
  prev_end_surah?: number | null
  prev_end_verse?: number | null
  completed_juzs?: number[] | null
}) {
  const segmentedPlan = getMidSkippedPreviousPlanSegments(plan)
  if (segmentedPlan !== null) {
    const segmentedDays = getSegmentedPlanTotalDays(
      segmentedPlan,
      Number(plan.daily_pages) || 0,
      plan.direction === "desc" ? "desc" : "asc",
    )
    return segmentedDays > 0 ? segmentedDays : Number(plan.total_days) || 0
  }

  const resolvedPages = resolvePlanTotalPages(plan)
  const dailyPages = Number(plan.daily_pages) || 0

  if (resolvedPages > 0 && dailyPages > 0) {
    return calculateTotalDays(resolvedPages, dailyPages)
  }

  return Number(plan.total_days) || 0
}

export function calculateCompletedPlanPages(
  totalPages: number,
  dailyPages: number,
  completedDays: number,
): number {
  if (!Number.isFinite(totalPages) || totalPages <= 0) return 0
  if (!Number.isFinite(dailyPages) || dailyPages <= 0) return 0
  if (!Number.isFinite(completedDays) || completedDays <= 0) return 0

  return Math.min(totalPages, completedDays * dailyPages)
}

export function calculatePreviousMemorizedPages(plan: {
  has_previous?: boolean | null
  prev_start_surah?: number | null
  prev_start_verse?: number | null
  prev_end_surah?: number | null
  prev_end_verse?: number | null
  completed_juzs?: number[] | null
  previous_memorization_ranges?: AyahRange[] | null
}): number {
  const memorizedRanges = getPreviousMemorizedRanges(plan)
  if (memorizedRanges.length === 0) {
    return 0
  }

  return memorizedRanges.reduce((total, range) => (
    total + calculateTotalPages(
      range.startSurahNumber,
      range.endSurahNumber,
      range.startVerseNumber,
      range.endVerseNumber,
    )
  ), 0)
}

export function calculateQuranMemorizationProgress(plan: {
  total_pages?: number | null
  daily_pages?: number | null
  has_previous?: boolean | null
  prev_start_surah?: number | null
  prev_start_verse?: number | null
  prev_end_surah?: number | null
  prev_end_verse?: number | null
  completed_juzs?: number[] | null
}, completedDays: number) {
  const currentPlanPages = calculateCompletedPlanPages(
    Number(plan.total_pages) || 0,
    Number(plan.daily_pages) || 0,
    completedDays,
  )
  const previousPages = calculatePreviousMemorizedPages(plan)
  const memorizedPages = Math.min(TOTAL_MUSHAF_PAGES, previousPages + currentPlanPages)
  const progressPercent = Math.max(0, Math.min(100, (memorizedPages / TOTAL_MUSHAF_PAGES) * 100))
  const level = Math.max(0, Math.min(100, Math.round(progressPercent)))

  return {
    memorizedPages,
    progressPercent,
    level,
  }
}

export function getStoredMemorizedRange(range: {
  memorized_start_surah?: number | null
  memorized_start_verse?: number | null
  memorized_end_surah?: number | null
  memorized_end_verse?: number | null
}) {
  if (!range.memorized_start_surah || !range.memorized_end_surah) {
    return null
  }

  const startSurahNumber = Number(range.memorized_start_surah)
  const startVerseNumber = Number(range.memorized_start_verse) || 1
  const endSurahNumber = Number(range.memorized_end_surah)
  const endSurah = SURAHS.find((surah) => surah.number === endSurahNumber)
  const endVerseNumber = Number(range.memorized_end_verse) || endSurah?.verseCount || 1
  const startPage = getPageForAyah(startSurahNumber, startVerseNumber)
  const endPage = getPageForAyah(endSurahNumber, endVerseNumber)

  return {
    startPage: Math.min(startPage, endPage),
    endPage: Math.max(startPage, endPage),
    startSurahNumber,
    startVerseNumber,
    endSurahNumber,
    endVerseNumber,
  }
}

export function getPlanMemorizedRange(plan: {
  direction?: "asc" | "desc" | null
  total_pages?: number | null
  daily_pages?: number | null
  has_previous?: boolean | null
  prev_start_surah?: number | null
  prev_start_verse?: number | null
  prev_end_surah?: number | null
  prev_end_verse?: number | null
  start_surah_number?: number | null
  start_verse?: number | null
}, completedDays: number) {
  if (!plan) return null

  const direction = plan.direction === "desc" ? "desc" : "asc"
  const previousPages = calculatePreviousMemorizedPages(plan)
  const currentPlanPages = calculateCompletedPlanPages(
    Number(plan.total_pages) || 0,
    Number(plan.daily_pages) || 0,
    completedDays,
  )
  const totalMemorizedPages = previousPages + currentPlanPages

  if (totalMemorizedPages <= 0) return null

  const anchorSurah = plan.has_previous && plan.prev_start_surah
    ? Number(plan.prev_start_surah)
    : Number(plan.start_surah_number)
  const anchorVerse = plan.has_previous && plan.prev_start_surah
    ? Number(plan.prev_start_verse) || 1
    : Number(plan.start_verse) || 1

  if (!anchorSurah) return null

  const anchorPage = getPageForAyah(anchorSurah, anchorVerse)

  if (direction === "desc") {
    const startPage = Math.max(1, anchorPage - totalMemorizedPages + 1)
    const startRef = getAyahByPageFloat(startPage)

    return {
      startPage,
      endPage: anchorPage,
      startSurahNumber: startRef.surah,
      startVerseNumber: startRef.ayah,
      endSurahNumber: anchorSurah,
      endVerseNumber: anchorVerse,
    }
  }

  const endPage = Math.min(604, anchorPage + totalMemorizedPages - 1)
  const endRef = getInclusiveEndAyah(endPage + 1)

  return {
    startPage: anchorPage,
    endPage,
    startSurahNumber: anchorSurah,
    startVerseNumber: anchorVerse,
    endSurahNumber: endRef.surah,
    endVerseNumber: endRef.ayah,
  }
}

export function getJuzCoverageFromRange(pageRange?: {
  startPage: number
  endPage: number
  endPageExclusive?: number
  startSurahNumber?: number
  startVerseNumber?: number
  endSurahNumber?: number
  endVerseNumber?: number
} | null) {
  const completedJuzs = new Set<number>()
  const currentJuzs = new Set<number>()

  if (!pageRange) {
    return { completedJuzs, currentJuzs }
  }

  const endPageExclusive = pageRange.endPageExclusive ?? (pageRange.endPage + 1)
  const hasExactAyahBounds = Boolean(
    pageRange.startSurahNumber
    && pageRange.startVerseNumber
    && pageRange.endSurahNumber
    && pageRange.endVerseNumber,
  )

  for (let juzNumber = 1; juzNumber <= 30; juzNumber += 1) {
    const juzBounds = getJuzBounds(juzNumber)
    if (!juzBounds) continue

    const juzStartPage = juzBounds.startPage
    const juzEndPageExclusive = juzBounds.endPageExclusive
    const overlaps = pageRange.startPage < juzEndPageExclusive && endPageExclusive > juzStartPage
    const fullyCovered = hasExactAyahBounds
      ? compareAyahReferences(
          Number(pageRange.startSurahNumber),
          Number(pageRange.startVerseNumber),
          juzBounds.startSurahNumber,
          juzBounds.startVerseNumber,
        ) <= 0
        && compareAyahReferences(
          Number(pageRange.endSurahNumber),
          Number(pageRange.endVerseNumber),
          juzBounds.endSurahNumber,
          juzBounds.endVerseNumber,
        ) >= 0
      : pageRange.startPage <= juzStartPage && endPageExclusive >= juzEndPageExclusive

    if (fullyCovered) {
      completedJuzs.add(juzNumber)
    } else if (overlaps) {
      if (endPageExclusive > juzStartPage && endPageExclusive <= juzEndPageExclusive) {
        currentJuzs.add(juzNumber)
      }
    }
  }

  return { completedJuzs, currentJuzs }
}

export function getJuzProgressDetailsFromRange(
  pageRange?: { startPage: number; endPage: number; endPageExclusive?: number } | null,
  explicitCompletedJuzs?: number[] | null,
  explicitCurrentJuzs?: number[] | null,
) {
  const details = new Map<number, { memorizedPages: number; totalPages: number; progressPercent: number }>()
  const completedSet = new Set(explicitCompletedJuzs || [])
  const currentSet = new Set(explicitCurrentJuzs || [])
  const endPageExclusive = pageRange ? (pageRange.endPageExclusive ?? (pageRange.endPage + 1)) : 0

  for (let juzNumber = 1; juzNumber <= 30; juzNumber += 1) {
    const juzBounds = getJuzBounds(juzNumber)
    if (!juzBounds) continue

    const juzStartPage = juzBounds.startPage
    const juzEndPageExclusive = juzBounds.endPageExclusive
    const totalPages = juzEndPageExclusive - juzStartPage
    let memorizedPages = 0

    if (pageRange) {
      memorizedPages = Math.max(
        0,
        Math.min(endPageExclusive, juzEndPageExclusive) - Math.max(pageRange.startPage, juzStartPage),
      )
    }

    if (completedSet.has(juzNumber)) {
      memorizedPages = totalPages
    } else if (currentSet.has(juzNumber) && memorizedPages <= 0) {
      memorizedPages = Math.min(totalPages, 0.25)
    }

    const progressPercent = totalPages > 0
      ? Math.max(0, Math.min(100, (memorizedPages / totalPages) * 100))
      : 0

    details.set(juzNumber, {
      memorizedPages,
      totalPages,
      progressPercent: progressPercent >= 99.5 ? 100 : progressPercent,
    })
  }

  return details
}

export function getJuzBounds(juzNumber: number) {
  if (!Number.isInteger(juzNumber) || juzNumber < 1 || juzNumber > 30) {
    return null
  }

  const startRef = JUZ_START_AYAHS[juzNumber - 1]
  const nextRef = JUZ_START_AYAHS[juzNumber]

  if (!startRef) {
    return null
  }

  const startPage = getPageFloatForAyah(startRef.surah, startRef.ayah)
  const endPageExclusive = nextRef ? getPageFloatForAyah(nextRef.surah, nextRef.ayah) : 605
  const endRef = getInclusiveEndAyah(endPageExclusive)

  return {
    juzNumber,
    startPage,
    endPage: endPageExclusive,
    endPageExclusive,
    startSurahNumber: startRef.surah,
    startVerseNumber: startRef.ayah,
    endSurahNumber: endRef.surah,
    endVerseNumber: endRef.ayah,
  }
}

export function getJuzBoundsRange(startJuzNumber: number, endJuzNumber: number) {
  const normalizedStart = Math.min(startJuzNumber, endJuzNumber)
  const normalizedEnd = Math.max(startJuzNumber, endJuzNumber)
  const startBounds = getJuzBounds(normalizedStart)
  const endBounds = getJuzBounds(normalizedEnd)

  if (!startBounds || !endBounds) {
    return null
  }

  return {
    startJuzNumber: normalizedStart,
    endJuzNumber: normalizedEnd,
    startPage: startBounds.startPage,
    endPage: endBounds.endPageExclusive,
    endPageExclusive: endBounds.endPageExclusive,
    startSurahNumber: startBounds.startSurahNumber,
    startVerseNumber: startBounds.startVerseNumber,
    endSurahNumber: endBounds.endSurahNumber,
    endVerseNumber: endBounds.endVerseNumber,
  }
}

export function getJuzNumbersForPageRange(startPage: number, endPage: number, direction: "asc" | "desc" = "asc") {
  const normalizedStart = Math.max(1, Math.min(604.9999, Math.min(startPage, endPage)))
  const normalizedEnd = Math.max(1, Math.min(605, Math.max(startPage, endPage)))
  const juzNumbers: number[] = []

  for (let juzNumber = 1; juzNumber <= 30; juzNumber += 1) {
    const juzBounds = getJuzBounds(juzNumber)
    if (!juzBounds) continue

    if (normalizedStart < juzBounds.endPageExclusive && normalizedEnd > juzBounds.startPage) {
      juzNumbers.push(juzNumber)
    }
  }

  return direction === "desc" ? juzNumbers.reverse() : juzNumbers
}

export function getSurahJuzNumbers(surahNumber: number) {
  const surah = SURAHS.find((item) => item.number === surahNumber)
  if (!surah) {
    return []
  }

  const startPage = getPageFloatForAyah(surah.number, 1)
  const nextSurah = SURAHS.find((item) => item.number === surahNumber + 1)
  const endPageExclusive = nextSurah ? getPageFloatForAyah(nextSurah.number, 1) : 605

  return getJuzNumbersForPageRange(startPage, endPageExclusive)
}

export function getContiguousCompletedJuzRange(completedJuzs?: number[] | null) {
  const normalized = Array.from(
    new Set((completedJuzs || []).filter((juzNumber) => Number.isInteger(juzNumber) && juzNumber >= 1 && juzNumber <= 30)),
  ).sort((left, right) => left - right)

  if (normalized.length === 0) {
    return null
  }

  let endJuzNumber = normalized[0]

  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index] !== endJuzNumber + 1) {
      break
    }

    endJuzNumber = normalized[index]
  }

  return getJuzBoundsRange(normalized[0], endJuzNumber)
}

/**
 * إيجاد نطاق الصفحات لجلسة محددة (رقم الجلسة يبدأ من 1)
 */
export function getSessionPageRange(
  startPage: number,
  dailyPages: number,
  sessionNumber: number
): { pageStart: number; pageEnd: number } {
  const pageStart = startPage + (sessionNumber - 1) * dailyPages
  const pageEnd = Math.min(startPage + sessionNumber * dailyPages - 0.5, TOTAL_MUSHAF_PAGES)
  return {
    pageStart: Math.floor(pageStart) + (pageStart % 1 === 0.5 ? 0 : 0),
    pageEnd: Math.ceil(pageEnd),
  }
}

/**
 * إجمالي عدد الأسطر التي تشغلها سورة في المصحف
 */
export function getSurahTotalLines(surahNumber: number): number {
  const idx = SURAHS.findIndex((s) => s.number === surahNumber)
  if (idx === -1 || idx === SURAHS.length - 1) return 7
  const curr = SURAHS[idx]
  const next = SURAHS[idx + 1]
  const lines =
    (next.startPage - curr.startPage) * 15 + (next.startLine ?? 1) - (curr.startLine ?? 1)
  return Math.max(1, lines)
}

/**
 * رقم الآية عند موضع عائم داخل سورة معينة (بالاستيفاء الخطي)
 */


export function getAyahByPageFloat(p: number): { surah: number; ayah: number; customText?: string } {
  if (!Number.isFinite(p) || p <= 1) return { surah: 1, ayah: 1 };
  if (p >= 605) return { surah: 114, ayah: 6 };
  const MathFloorP = Math.floor(p);
  const fraction = p % 1;
  const idx = MathFloorP - 1;
  const start = PAGE_REFERENCES[idx] || PAGE_REFERENCES[0];
  if (fraction === 0) return start;

  const end = PAGE_REFERENCES[idx + 1] || { surah: 114, ayah: 6 };
  
  if (start.surah === end.surah) {
    const totalVersesInPage = end.ayah - start.ayah;
    return { surah: start.surah, ayah: start.ayah + Math.floor(totalVersesInPage * fraction) };
  } else {
    let totalVersesInPage = 0;
    for (let sId = start.surah; sId <= end.surah; sId++) {
      const s = SURAHS.find((x) => x.number === sId)!;
      if (sId === start.surah) totalVersesInPage += (s.verseCount - start.ayah) + 1;
      else if (sId === end.surah) totalVersesInPage += Math.max(0, end.ayah - 1);
      else totalVersesInPage += s.verseCount;
    }
    
    let targetVerses = Math.floor(totalVersesInPage * fraction);
    if (targetVerses === 0) return start;

    for (let sId = start.surah; sId <= end.surah; sId++) {
      const s = SURAHS.find((x) => x.number === sId)!;
      let vInSurah = 0;
      if (sId === start.surah) vInSurah = (s.verseCount - start.ayah) + 1;
      else if (sId === end.surah) vInSurah = Math.max(0, end.ayah - 1);
      else vInSurah = s.verseCount;

      if (targetVerses < vInSurah) {
        if (sId === start.surah) return { surah: sId, ayah: start.ayah + targetVerses };
        else return { surah: sId, ayah: targetVerses + 1 };
      } else {
        targetVerses -= vInSurah;
      }
    }
    return end;
  }
}

export function getInclusiveEndAyah(p: number): { surah: number; ayah: number; customText?: string } {
  if (!Number.isFinite(p) || p <= 1) return { surah: 1, ayah: 1 }
  if (p >= 605) return { surah: 114, ayah: 6 }
  const next = getAyahByPageFloat(p);
  if (next.surah === 114 && next.ayah === 7) return { surah: 114, ayah: 6 };
  if (next.ayah > 1) {
    return { surah: next.surah, ayah: next.ayah - 1 };
  } else {
    const prevSurah = SURAHS.find((s) => s.number === next.surah - 1)!;
    return { surah: prevSurah.number, ayah: prevSurah.verseCount };
  }
}

export function getSessionContent(
  planStartPage: number,
  dailyPages: number,
  sessionNum: number,
  totalPages: number = 0,
  direction: "asc" | "desc" = "asc"
): { text: string; fromSurah: string; toSurah: string } {
  let sessionStart = direction === "desc" ? (planStartPage + totalPages - sessionNum * dailyPages) : planStartPage + (sessionNum - 1) * dailyPages;
  sessionStart = Math.max(1, Math.min(sessionStart, 605))
  let sessionEnd = Math.max(sessionStart, Math.min(sessionStart + dailyPages, 605));
  
  const startRef = getAyahByPageFloat(sessionStart);
  const endRef = getInclusiveEndAyah(sessionEnd);

  const startSurahName = SURAHS.find((x) => x.number === startRef.surah)!.name;
  const endSurahName = SURAHS.find((x) => x.number === endRef.surah)!.name;
  
  let formattedText = "";
  const startCustom = startRef.customText ? ` (${startRef.customText})` : "";
  const endCustom = endRef.customText ? ` (${endRef.customText})` : "";
  
  if (startRef.surah === endRef.surah && startRef.ayah === endRef.ayah && startCustom === endCustom) {
    formattedText = `${startSurahName} ${startRef.ayah}${startCustom}`;
  } else {
    formattedText = `${startSurahName} ${startRef.ayah}${startCustom} الى ${endSurahName} ${endRef.ayah}${endCustom}`;
  }

  return {
    text: formattedText,
    fromSurah: startSurahName,
    toSurah: endSurahName,
  };
}

interface AyahReference {
  surah: number
  ayah: number
}

export interface PlanSessionContent {
  text: string
  fromSurah: string
  fromVerse: string
  toSurah: string
  toVerse: string
  pageCount?: number
}

export interface PlanSupportSessionContent {
  muraajaa: PlanSessionContent | null
  rabt: PlanSessionContent | null
}

export function getPlanSessionContentPages(content?: PlanSessionContent | null) {
  if (!content) {
    return 0
  }

	if (typeof content.pageCount === "number" && Number.isFinite(content.pageCount)) {
	  return Math.max(0, content.pageCount)
	}

  const fromSurah = SURAHS.find((surah) => surah.name === content.fromSurah)
  const toSurah = SURAHS.find((surah) => surah.name === content.toSurah)

  if (!fromSurah || !toSurah) {
    return 0
  }

  return getPreciseRangePages(
    fromSurah.number,
    Number(content.fromVerse) || 1,
    toSurah.number,
    Number(content.toVerse) || 1,
  )
}

function getOrderedContentBounds(content: PlanSessionContent) {
  const fromSurah = SURAHS.find((surah) => surah.name === content.fromSurah)
  const toSurah = SURAHS.find((surah) => surah.name === content.toSurah)

  if (!fromSurah || !toSurah) {
    return null
  }

  const startRef = {
    surah: fromSurah.number,
    ayah: Number(content.fromVerse) || 1,
  }
  const endRef = {
    surah: toSurah.number,
    ayah: Number(content.toVerse) || 1,
  }

  return compareAyahReferences(startRef.surah, startRef.ayah, endRef.surah, endRef.ayah) <= 0
    ? { startRef, endRef }
    : { startRef: endRef, endRef: startRef }
}

function getIntersectedSessionContent(baseContent: PlanSessionContent, excludedContent: PlanSessionContent) {
  const baseBounds = getOrderedContentBounds(baseContent)
  const excludedBounds = getOrderedContentBounds(excludedContent)

  if (!baseBounds || !excludedBounds) {
    return null
  }

  const startRef = compareAyahReferences(
    baseBounds.startRef.surah,
    baseBounds.startRef.ayah,
    excludedBounds.startRef.surah,
    excludedBounds.startRef.ayah,
  ) >= 0
    ? baseBounds.startRef
    : excludedBounds.startRef
  const endRef = compareAyahReferences(
    baseBounds.endRef.surah,
    baseBounds.endRef.ayah,
    excludedBounds.endRef.surah,
    excludedBounds.endRef.ayah,
  ) <= 0
    ? baseBounds.endRef
    : excludedBounds.endRef

  if (compareAyahReferences(startRef.surah, startRef.ayah, endRef.surah, endRef.ayah) > 0) {
    return null
  }

  return createPlanSessionContent(startRef, endRef)
}

function formatSupportContentExceptionText(content: PlanSessionContent, excludedRanges: PlanSessionContent[]) {
  const normalizedBaseText = content.text
    .replace(/من\s+سورة\s+/u, "من ")
    .replace(/إلى\s+سورة\s+/u, "إلى ")
    .trim()
  const exclusionsText = excludedRanges
    .map((range) => range.text.replace(/\s+مرورًا بسورة\s+.+$/u, "").replace(/\s+مرورا بسورة\s+.+$/u, "").trim())
    .join("، ")

  if (!exclusionsText) {
    return normalizedBaseText
  }

  return `${normalizedBaseText} (ما عدا ${exclusionsText})`
}

function getFailedSessionContents(plan: SessionPlanBounds, failedSessionNumbers?: number[] | null) {
  const normalizedSessionNumbers = Array.from(new Set((failedSessionNumbers || []).filter((value) => value > 0))).sort((left, right) => left - right)

  return normalizedSessionNumbers
    .map((sessionNumber) => getPlanSessionContent(plan, sessionNumber))
    .filter((content): content is PlanSessionContent => Boolean(content))
}

function applyFailedSessionExclusionsToRabt(
  plan: SessionPlanBounds,
  rabt: PlanSessionContent | null,
  failedSessionNumbers?: number[] | null,
) {
  if (!rabt) {
    return rabt
  }

  const excludedRanges = getFailedSessionContents(plan, failedSessionNumbers)
    .map((range) => getIntersectedSessionContent(rabt, range))
    .filter((range): range is PlanSessionContent => Boolean(range))

  if (excludedRanges.length === 0) {
    return rabt
  }

  return {
    ...rabt,
    text: formatSupportContentExceptionText(rabt, excludedRanges),
  }
}

export interface SessionPlanBounds {
  start_surah_number: number
  start_verse?: number | null
  end_surah_number: number
  end_verse?: number | null
  total_pages: number
  daily_pages: number
  direction?: "asc" | "desc" | null
  total_days?: number | null
  has_previous?: boolean | null
  prev_start_surah?: number | null
  prev_start_verse?: number | null
  prev_end_surah?: number | null
  prev_end_verse?: number | null
  completed_juzs?: number[] | null
  previous_memorization_ranges?: AyahRange[] | null
  muraajaa_pages?: number | null
  rabt_pages?: number | null
  review_distribution_mode?: "fixed" | "weekly" | null
  review_distribution_days?: number | null
  review_minimum_pages?: number | null
  review_start_mode?: "auto" | "oldest" | "newest" | null
  start_date?: string | null
  created_at?: string | null
}

export const REVIEW_DISTRIBUTION_DEFAULT_DAYS = 7
export const REVIEW_DISTRIBUTION_DEFAULT_MINIMUM_PAGES = 10

function resolveReviewDistributionDays(
  plan: Pick<SessionPlanBounds, "review_distribution_days">,
) {
  const value = Math.floor(Number(plan.review_distribution_days) || 0)
  return value > 0 ? value : REVIEW_DISTRIBUTION_DEFAULT_DAYS
}

function resolveReviewMinimumPages(
  plan: Pick<SessionPlanBounds, "review_minimum_pages">,
) {
  const value = Number(plan.review_minimum_pages) || 0
  return value > 0 ? value : REVIEW_DISTRIBUTION_DEFAULT_MINIMUM_PAGES
}

function resolveReviewStartMode(
  plan: Pick<SessionPlanBounds, "review_start_mode" | "direction">,
) {
  if (plan.review_start_mode === "oldest" || plan.review_start_mode === "newest") {
    return plan.review_start_mode
  }

  return plan.direction === "desc" ? "newest" : "oldest"
}

interface MemorizedPageSegment {
  startPage: number
  endPageExclusive: number
  startSurahNumber: number
  startVerseNumber: number
  endSurahNumber: number
  endVerseNumber: number
  direction?: "asc" | "desc"
}

export function getDisplayCompletedDays(completedDays: number, startDate?: string | null) {
  const safeCompletedDays = Math.max(0, Math.floor(Number(completedDays) || 0))

  if (startDate && startDate === getSaudiDateString() && safeCompletedDays > 0) {
    return safeCompletedDays - 1
  }

  return safeCompletedDays
}

export function getActivePlanDayNumber(totalDays: number, completedDays: number, startDate?: string | null, createdAt?: string | null) {
  const normalizedTotalDays = Math.max(1, Math.floor(Number(totalDays) || 1))
  const createdTodaySaudi = createdAt
    ? getSaudiDateString(new Date(createdAt)) === getSaudiDateString()
    : false
  const adjustedCompletedDays = createdTodaySaudi && Math.max(0, Math.floor(Number(completedDays) || 0)) > 0
    ? Math.max(0, Math.floor(Number(completedDays) || 0) - 1)
    : completedDays
  const displayCompletedDays = getDisplayCompletedDays(adjustedCompletedDays, startDate)
  return Math.max(1, Math.min(displayCompletedDays + 1, normalizedTotalDays))
}

function formatPlanSessionContent(fromRef: AyahReference, toRef: AyahReference): PlanSessionContent | null {
  const fromSurah = SURAHS.find((surah) => surah.number === fromRef.surah)
  const toSurah = SURAHS.find((surah) => surah.number === toRef.surah)

  if (!fromSurah || !toSurah) return null

  const lowerSurahNumber = Math.min(fromRef.surah, toRef.surah)
  const upperSurahNumber = Math.max(fromRef.surah, toRef.surah)
  const intermediateSurahNames = SURAHS
    .filter((surah) => surah.number > lowerSurahNumber && surah.number < upperSurahNumber)
    .map((surah) => surah.name)

  let text = fromRef.surah === toRef.surah && fromRef.ayah === toRef.ayah
    ? `${fromSurah.name} ${fromRef.ayah}`
    : `${fromSurah.name} ${fromRef.ayah} الى ${toSurah.name} ${toRef.ayah}`

  if (intermediateSurahNames.length === 1) {
    text += ` مرورًا بسورة ${intermediateSurahNames[0]}`
  } else if (intermediateSurahNames.length === 2) {
    text += ` مرورًا بسورتي ${intermediateSurahNames[0]} و${intermediateSurahNames[1]}`
  } else if (intermediateSurahNames.length > 2) {
    text += ` مرورًا بعدة سور منها ${intermediateSurahNames[0]} و${intermediateSurahNames[intermediateSurahNames.length - 1]}`
  }

  return {
    text,
    fromSurah: fromSurah.name,
    fromVerse: String(fromRef.ayah),
    toSurah: toSurah.name,
    toVerse: String(toRef.ayah),
    pageCount: getPreciseRangePages(fromRef.surah, fromRef.ayah, toRef.surah, toRef.ayah),
  }
}

function createPlanSessionContent(fromRef: AyahReference, toRef: AyahReference, text?: string): PlanSessionContent | null {
  const baseContent = formatPlanSessionContent(fromRef, toRef)
  if (!baseContent) {
    return null
  }

  if (!text) {
    return baseContent
  }

  return {
    ...baseContent,
    text,
    pageCount: baseContent.pageCount,
  }
}

function getManualDescendingFirstPageContent(sessionStart: number, dailyPages: number) {
  if (sessionStart < 604 || sessionStart >= 605) {
    return null
  }

  if (dailyPages === 1) {
    return createPlanSessionContent(
      { surah: 114, ayah: 1 },
      { surah: 112, ayah: 4 },
      "الناس 1 الى الإخلاص 4",
    )
  }

  if (dailyPages === 0.5) {
    if (sessionStart >= 604.5) {
      return createPlanSessionContent(
        { surah: 114, ayah: 1 },
        { surah: 113, ayah: 3 },
        "الناس 1 الى الفلق 3",
      )
    }

    return createPlanSessionContent(
      { surah: 113, ayah: 4 },
      { surah: 112, ayah: 4 },
      "الفلق 4 الى الإخلاص 4",
    )
  }

  if (dailyPages === 0.25) {
    if (sessionStart >= 604.75) {
      return createPlanSessionContent(
        { surah: 114, ayah: 1 },
        { surah: 114, ayah: 6 },
        "الناس 1 الى الناس 6",
      )
    }

    if (sessionStart >= 604.5) {
      return createPlanSessionContent(
        { surah: 113, ayah: 1 },
        { surah: 113, ayah: 3 },
        "الفلق 1 الى الفلق 3",
      )
    }

    if (sessionStart >= 604.25) {
      return createPlanSessionContent(
        { surah: 113, ayah: 4 },
        { surah: 113, ayah: 5 },
        "الفلق 4 الى الفلق 5",
      )
    }

    return createPlanSessionContent(
      { surah: 112, ayah: 1 },
      { surah: 112, ayah: 4 },
      "الإخلاص 1 الى الإخلاص 4",
    )
  }

  return null
}

function getDescendingTopOrderedSessionRange(
  planStartPage: number,
  totalPages: number,
  dailyPages: number,
  sessionNum: number,
) {
  if (dailyPages >= 1) {
    return null
  }

  const consumedBefore = (sessionNum - 1) * dailyPages
  if (consumedBefore < 1) {
    return null
  }

  const progressAfterFirstPage = consumedBefore - 1
  const pageOffset = Math.floor(progressAfterFirstPage)
  const withinPageOffset = progressAfterFirstPage - pageOffset
  const currentPage = planStartPage + totalPages - 2 - pageOffset

  if (currentPage < planStartPage || currentPage > 604) {
    return null
  }

  const sessionStart = currentPage + withinPageOffset
  const sessionEnd = Math.min(currentPage + 1, sessionStart + dailyPages)

  return { sessionStart, sessionEnd }
}

function normalizeDescendingTopBoundaryRef(ref: AyahReference) {
  if (ref.ayah !== 1) {
    return ref
  }

  const surah = SURAHS.find((item) => item.number === ref.surah)
  if (!surah) {
    return ref
  }

  return {
    surah: ref.surah,
    ayah: surah.verseCount,
  }
}

export function getPlanStartPage(plan: Pick<SessionPlanBounds, "start_surah_number" | "start_verse" | "end_surah_number" | "direction">) {
  const direction = plan.direction === "desc" ? "desc" : "asc"

  if (direction === "desc") {
    return SURAHS.find((surah) => surah.number === Math.min(plan.start_surah_number, plan.end_surah_number))?.startPage || 1
  }

  return getPageForAyah(plan.start_surah_number, Number(plan.start_verse) || 1)
}

export function getPlanSessionContent(plan: SessionPlanBounds, sessionNum: number): PlanSessionContent | null {
  const dailyPages = Number(plan.daily_pages) || 0
  const totalPages = resolvePlanTotalPages(plan)
  const direction = plan.direction === "desc" ? "desc" : "asc"
  const hasExplicitStartVerse = plan.start_verse !== null && plan.start_verse !== undefined
  const hasExplicitEndVerse = plan.end_verse !== null && plan.end_verse !== undefined
  const segmentedPlan = getMidSkippedPreviousPlanSegments(plan)

  if (dailyPages <= 0 || totalPages <= 0 || sessionNum <= 0) {
    return null
  }

  if (segmentedPlan && segmentedPlan.length > 0) {
    return getSegmentedPlanSessionContent(segmentedPlan, sessionNum, dailyPages, direction)
  }

  const planStartPage = getPlanStartPage(plan)
  let sessionStart = direction === "desc"
    ? planStartPage + totalPages - sessionNum * dailyPages
    : planStartPage + (sessionNum - 1) * dailyPages

  if (direction === "desc" && !hasExplicitStartVerse) {
    const topOrderedRange = getDescendingTopOrderedSessionRange(planStartPage, totalPages, dailyPages, sessionNum)
    if (topOrderedRange) {
      sessionStart = topOrderedRange.sessionStart
    }
  }

  sessionStart = Math.max(1, Math.min(sessionStart, 605))
  let sessionEnd = Math.max(sessionStart, Math.min(sessionStart + dailyPages, 605))
  if (direction === "desc" && !hasExplicitStartVerse) {
    const topOrderedRange = getDescendingTopOrderedSessionRange(planStartPage, totalPages, dailyPages, sessionNum)
    if (topOrderedRange) {
      sessionEnd = Math.max(sessionStart, Math.min(topOrderedRange.sessionEnd, 605))
    }
  }
  const lowerRef = getAyahByPageFloat(sessionStart)
  const upperRef = getInclusiveEndAyah(sessionEnd)
  const totalDays = calculateTotalDays(totalPages, dailyPages)
  const explicitStartRef: AyahReference = {
    surah: plan.start_surah_number,
    ayah: Number(plan.start_verse) || 1,
  }
  const endSurah = SURAHS.find((surah) => surah.number === plan.end_surah_number)
  const explicitEndRef: AyahReference = {
    surah: plan.end_surah_number,
    ayah: Number(plan.end_verse) || endSurah?.verseCount || 1,
  }

  if (direction === "desc") {
    const manualFirstPageContent = !hasExplicitStartVerse
      ? getManualDescendingFirstPageContent(sessionStart, dailyPages)
      : null
    if (manualFirstPageContent) {
      return manualFirstPageContent
    }

    const isFirstSession = sessionNum === 1
    const fromRef = isFirstSession
      ? hasExplicitStartVerse ? explicitStartRef : upperRef
      : lowerRef
    const toRef = sessionNum === totalDays && hasExplicitEndVerse
      ? explicitEndRef
      : isFirstSession
        ? normalizeDescendingTopBoundaryRef(lowerRef)
        : upperRef
    return formatPlanSessionContent(fromRef, toRef)
  }

  const fromRef = sessionNum === 1 && hasExplicitStartVerse ? explicitStartRef : lowerRef
  const toRef = sessionNum === totalDays && hasExplicitEndVerse ? explicitEndRef : upperRef
  return formatPlanSessionContent(fromRef, toRef)
}

export function getPlanSessionContentRange(plan: SessionPlanBounds, startSessionNum: number, endSessionNum: number): PlanSessionContent | null {
  const normalizedStartSessionNum = Math.max(1, Math.min(startSessionNum, endSessionNum))
  const normalizedEndSessionNum = Math.max(normalizedStartSessionNum, Math.max(startSessionNum, endSessionNum))
  const startContent = getPlanSessionContent(plan, normalizedStartSessionNum)
  const endContent = getPlanSessionContent(plan, normalizedEndSessionNum)

  if (!startContent || !endContent) {
    return startContent || endContent || null
  }

  const text = `${startContent.fromSurah} ${startContent.fromVerse} الى ${endContent.toSurah} ${endContent.toVerse}`

  return {
    text,
    fromSurah: startContent.fromSurah,
    fromVerse: startContent.fromVerse,
    toSurah: endContent.toSurah,
    toVerse: endContent.toVerse,
  }
}

function createMemorizedPageSegment(range: AyahRange): MemorizedPageSegment {
  const startPage = getPageFloatForAyah(range.startSurahNumber, range.startVerseNumber)
  const totalPages = calculateTotalPages(
    range.startSurahNumber,
    range.endSurahNumber,
    range.startVerseNumber,
    range.endVerseNumber,
  )

  return {
    startPage,
    endPageExclusive: startPage + totalPages,
    startSurahNumber: range.startSurahNumber,
    startVerseNumber: range.startVerseNumber,
    endSurahNumber: range.endSurahNumber,
    endVerseNumber: range.endVerseNumber,
  }
}

function getMemorizedPageSegmentSize(segment: MemorizedPageSegment) {
  return Math.max(0, segment.endPageExclusive - segment.startPage)
}

function createPlanContentFromSegmentSlice(
  segment: MemorizedPageSegment,
  offsetPages: number,
  sizePages: number,
) {
  const segmentSize = getMemorizedPageSegmentSize(segment)
  if (segmentSize <= 0 || sizePages <= 0 || offsetPages < 0 || offsetPages >= segmentSize) {
    return null
  }

  const sliceStartPage = segment.startPage + offsetPages
  const sliceEndExclusive = Math.min(segment.endPageExclusive, sliceStartPage + sizePages)
  if (sliceEndExclusive <= sliceStartPage) {
    return null
  }

  const physicalSliceStartPage = sliceStartPage
  const physicalSliceEndExclusive = sliceEndExclusive

  const fromRef = offsetPages === 0
    ? { surah: segment.startSurahNumber, ayah: segment.startVerseNumber }
    : getAyahByPageFloat(physicalSliceStartPage)
  const reachesSegmentEnd = sliceEndExclusive >= segment.endPageExclusive - 0.0001
  const toRef = reachesSegmentEnd
    ? { surah: segment.endSurahNumber, ayah: segment.endVerseNumber }
    : getInclusiveEndAyah(physicalSliceEndExclusive)

  return formatPlanSessionContent(fromRef, toRef)
}

function getMergedMemorizedPageSegments(ranges: AyahRange[]) {
  return mergeAyahRanges(ranges).map(createMemorizedPageSegment)
}

function getCompletedPlanMemorizedRanges(
  plan: SessionPlanBounds,
  completedPlanPages: number,
) {
  if (completedPlanPages <= 0 || !plan.start_surah_number || !plan.end_surah_number) {
    return [] as AyahRange[]
  }

  const segmentedPlan = getMidSkippedPreviousPlanSegments(plan)
  const orderedSegments = segmentedPlan && segmentedPlan.length > 0
    ? segmentedPlan
    : [{
        startSurahNumber: Number(plan.start_surah_number),
        startVerseNumber: Number(plan.start_verse) || 1,
        endSurahNumber: Number(plan.end_surah_number),
        endVerseNumber: getEffectiveEndVerse(Number(plan.end_surah_number), plan.end_verse),
        totalPages: calculateTotalPages(
          Number(plan.start_surah_number),
          Number(plan.end_surah_number),
          Number(plan.start_verse) || 1,
          getEffectiveEndVerse(Number(plan.end_surah_number), plan.end_verse),
        ),
      }]

  let remainingPages = completedPlanPages
  const completedRanges: AyahRange[] = []

  for (const segment of orderedSegments) {
    if (remainingPages <= 0) {
      break
    }

    const segmentTotalPages = Math.max(0, Number(segment.totalPages) || 0)
    if (segmentTotalPages <= 0) {
      continue
    }

    if (remainingPages >= segmentTotalPages - 0.0001) {
      completedRanges.push({
        startSurahNumber: segment.startSurahNumber,
        startVerseNumber: segment.startVerseNumber,
        endSurahNumber: segment.endSurahNumber,
        endVerseNumber: segment.endVerseNumber,
      })
      remainingPages -= segmentTotalPages
      continue
    }

    const segmentStartPage = getPageFloatForAyah(segment.startSurahNumber, segment.startVerseNumber)
    const partialEndRef = getInclusiveEndAyah(segmentStartPage + remainingPages)

    completedRanges.push({
      startSurahNumber: segment.startSurahNumber,
      startVerseNumber: segment.startVerseNumber,
      endSurahNumber: partialEndRef.surah,
      endVerseNumber: partialEndRef.ayah,
    })
    remainingPages = 0
  }

  return completedRanges
}

function getTotalMemorizedSequencePages(segments: MemorizedPageSegment[]) {
  return segments.reduce((total, segment) => total + getMemorizedPageSegmentSize(segment), 0)
}

function getTrailingSegmentContent(segments: MemorizedPageSegment[], preferredPages: number) {
  if (preferredPages <= 0 || segments.length === 0) {
    return null
  }

  const lastSegment = segments[segments.length - 1]
  const segmentSize = getMemorizedPageSegmentSize(lastSegment)
  if (segmentSize <= 0) {
    return null
  }

  const actualSize = Math.min(preferredPages, segmentSize)
  return createPlanContentFromSegmentSlice(lastSegment, Math.max(0, segmentSize - actualSize), actualSize)
}

function getTrailingSegmentContentAtIndex(
  segments: MemorizedPageSegment[],
  segmentIndex: number,
  preferredPages: number,
) {
  if (preferredPages <= 0 || segmentIndex < 0 || segmentIndex >= segments.length) {
    return null
  }

  let remainingPages = preferredPages
  const parts: PlanSessionContent[] = []

  for (let index = segmentIndex; index >= 0; index -= 1) {
    const segment = segments[index]
    const segmentSize = getMemorizedPageSegmentSize(segment)
    if (segmentSize <= 0) {
      continue
    }

    const actualSize = Math.min(remainingPages, segmentSize)
    const part = createPlanContentFromSegmentSlice(segment, Math.max(0, segmentSize - actualSize), actualSize)

    if (part) {
      parts.unshift(part)
    }

    remainingPages -= actualSize
    if (remainingPages <= 0) {
      break
    }
  }

  if (parts.length === 0) {
    return null
  }

  if (parts.length === 1) {
    return parts[0]
  }

  const firstPart = parts[0]
  const lastPart = parts[parts.length - 1]
  const totalPageCount = parts.reduce((total, part) => total + getPlanSessionContentPages(part), 0)

  return {
    text: parts.map((part) => part.text).join("، ثم "),
    fromSurah: firstPart.fromSurah,
    fromVerse: firstPart.fromVerse,
    toSurah: lastPart.toSurah,
    toVerse: lastPart.toVerse,
    pageCount: totalPageCount,
  }
}

function trimTrailingMemorizedSegments(segments: MemorizedPageSegment[], pagesToTrim: number) {
  if (pagesToTrim <= 0) {
    return segments.slice()
  }

  let remainingToTrim = pagesToTrim
  const trimmed = segments.map((segment) => ({ ...segment }))

  for (let index = trimmed.length - 1; index >= 0; index -= 1) {
    const segment = trimmed[index]
    const segmentSize = getMemorizedPageSegmentSize(segment)
    if (segmentSize <= 0) {
      trimmed.splice(index, 1)
      continue
    }

    if (remainingToTrim >= segmentSize - 0.0001) {
      remainingToTrim -= segmentSize
      trimmed.splice(index, 1)
      continue
    }

    const nextEndExclusive = segment.endPageExclusive - remainingToTrim
    const nextEndRef = getInclusiveEndAyah(nextEndExclusive)
    segment.endPageExclusive = nextEndExclusive
    segment.endSurahNumber = nextEndRef.surah
    segment.endVerseNumber = nextEndRef.ayah
    remainingToTrim = 0
    break
  }

  return trimmed.filter((segment) => getMemorizedPageSegmentSize(segment) > 0)
}

function trimPagesFromSegmentIndex(
  segments: MemorizedPageSegment[],
  segmentIndex: number,
  pagesToTrim: number,
) {
  if (pagesToTrim <= 0 || segmentIndex < 0 || segmentIndex >= segments.length) {
    return segments.slice()
  }

  const trimmed = segments.map((segment) => ({ ...segment }))
  let remainingToTrim = pagesToTrim

  for (let index = segmentIndex; index >= 0 && remainingToTrim > 0; index -= 1) {
    const targetSegment = trimmed[index]
    const segmentSize = getMemorizedPageSegmentSize(targetSegment)

    if (segmentSize <= 0) {
      trimmed.splice(index, 1)
      continue
    }

    if (remainingToTrim >= segmentSize - 0.0001) {
      remainingToTrim -= segmentSize
      trimmed.splice(index, 1)
      continue
    }

    const nextEndExclusive = targetSegment.endPageExclusive - remainingToTrim
    const nextEndRef = getInclusiveEndAyah(nextEndExclusive)
    targetSegment.endPageExclusive = nextEndExclusive
    targetSegment.endSurahNumber = nextEndRef.surah
    targetSegment.endVerseNumber = nextEndRef.ayah
    remainingToTrim = 0
  }

  return trimmed.filter((segment) => getMemorizedPageSegmentSize(segment) > 0)
}

function getAvailablePagesThroughSegmentIndex(
  segments: MemorizedPageSegment[],
  segmentIndex: number,
) {
  if (segmentIndex < 0 || segmentIndex >= segments.length) {
    return 0
  }

  let totalPages = 0

  for (let index = 0; index <= segmentIndex; index += 1) {
    totalPages += getMemorizedPageSegmentSize(segments[index])
  }

  return totalPages
}

function getPlanSessionStartReference(plan: SessionPlanBounds, sessionNum: number) {
  const sessionContent = getPlanSessionContent(plan, sessionNum)
  if (!sessionContent) {
    return null
  }

  const surah = SURAHS.find((item) => item.name === sessionContent.fromSurah)
  if (!surah) {
    return null
  }

  return {
    surah: surah.number,
    ayah: Number(sessionContent.fromVerse) || 1,
  }
}

function getRabtSourceSegmentIndex(
  segments: MemorizedPageSegment[],
  plan: SessionPlanBounds,
  activeDayNum: number,
) {
  if (segments.length === 0) {
    return -1
  }

  const sessionStartRef = getPlanSessionStartReference(plan, activeDayNum)
  if (!sessionStartRef) {
    return segments.length - 1
  }

  let nearestPreviousIndex = -1

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    const nextRef = getNextAyahReference(segment.endSurahNumber, segment.endVerseNumber)

    if (
      nextRef &&
      compareAyahReferences(nextRef.surah, nextRef.ayah, sessionStartRef.surah, sessionStartRef.ayah) === 0
    ) {
      return index
    }

    if (
      compareAyahReferences(segment.endSurahNumber, segment.endVerseNumber, sessionStartRef.surah, sessionStartRef.ayah) < 0
    ) {
      if (nearestPreviousIndex === -1) {
        nearestPreviousIndex = index
        continue
      }

      const nearestSegment = segments[nearestPreviousIndex]
      if (
        compareAyahReferences(
          segment.endSurahNumber,
          segment.endVerseNumber,
          nearestSegment.endSurahNumber,
          nearestSegment.endVerseNumber,
        ) > 0
      ) {
        nearestPreviousIndex = index
      }
    }
  }

  return nearestPreviousIndex >= 0 ? nearestPreviousIndex : segments.length - 1
}

function getSlidingSegmentContent(
  segments: MemorizedPageSegment[],
  offsetPages: number,
  preferredPages: number,
) {
  const totalPages = getTotalMemorizedSequencePages(segments)
  if (totalPages <= 0 || preferredPages <= 0) {
    return null
  }

  let remainingOffset = ((offsetPages % totalPages) + totalPages) % totalPages

  function getReverseSlidingSegmentContent(
    segments: MemorizedPageSegment[],
    offsetPages: number,
    preferredPages: number,
  ) {
    const totalPages = getTotalMemorizedSequencePages(segments)
    if (totalPages <= 0 || preferredPages <= 0) {
      return null
    }

    const normalizedOffset = ((offsetPages % totalPages) + totalPages) % totalPages
    const trimmedSegments = trimTrailingMemorizedSegments(segments, normalizedOffset)

    if (trimmedSegments.length === 0) {
      return null
    }

    return getTrailingSegmentContentAtIndex(
      trimmedSegments,
      trimmedSegments.length - 1,
      preferredPages,
    )
  }
  let remainingPages = preferredPages
  const parts: PlanSessionContent[] = []

  for (const segment of segments) {
    const segmentSize = getMemorizedPageSegmentSize(segment)
    if (segmentSize <= 0) {
      continue
    }

    if (remainingOffset >= segmentSize) {
      remainingOffset -= segmentSize
      continue
    }

    const part = createPlanContentFromSegmentSlice(segment, remainingOffset, remainingPages)
    if (part) {
      parts.push(part)
    }

    const availablePages = Math.max(0, segmentSize - remainingOffset)
    remainingPages -= Math.min(remainingPages, availablePages)
    remainingOffset = 0

    if (remainingPages <= 0) {
      break
    }
  }

  if (parts.length === 0) {
    return null
  }

  if (parts.length === 1) {
    return parts[0]
  }

  const firstPart = parts[0]
  const lastPart = parts[parts.length - 1]
  const totalPageCount = parts.reduce((total, part) => total + getPlanSessionContentPages(part), 0)

  return {
    text: parts.map((part) => part.text).join("، ثم "),
    fromSurah: firstPart.fromSurah,
    fromVerse: firstPart.fromVerse,
    toSurah: lastPart.toSurah,
    toVerse: lastPart.toVerse,
    pageCount: totalPageCount,
  }
}

export function resolvePlanReviewPoolPages(
  plan: Pick<SessionPlanBounds, "rabt_pages">,
  totalMemorizedPool: number,
) {
  const safeTotalMemorizedPool = Math.max(0, totalMemorizedPool)
  const rabtPref = Math.max(0, Number(plan.rabt_pages) || 0)
  return Math.max(0, safeTotalMemorizedPool - Math.min(rabtPref, safeTotalMemorizedPool))
}

export function resolvePlanReviewPagesPreference(
  plan: Pick<SessionPlanBounds, "muraajaa_pages" | "review_distribution_mode" | "review_distribution_days" | "review_minimum_pages">,
  reviewPoolPages: number,
) {
  const safeReviewPoolPages = Math.max(0, reviewPoolPages)
  if (safeReviewPoolPages <= 0) {
    return 0
  }

  if (plan.review_distribution_mode === "weekly") {
    const distributionDays = resolveReviewDistributionDays(plan)
    const minimumPages = resolveReviewMinimumPages(plan)
    const distributedRangePages = safeReviewPoolPages / distributionDays
    if (distributedRangePages <= 0) {
      return 0
    }

    return Math.min(
      safeReviewPoolPages,
      Math.max(minimumPages, distributedRangePages),
    )
  }

  return Math.min(Math.max(0, Number(plan.muraajaa_pages) || 0), safeReviewPoolPages)
}

function resolveWeeklyReviewOffset(
  distributionRangePages: number,
  dailyReviewPages: number,
  distributionDays: number,
  activeDayNum: number,
) {
  if (distributionRangePages <= 0 || dailyReviewPages <= 0 || distributionDays <= 0) {
    return 0
  }

  const normalizedDayIndex = Math.max(0, activeDayNum - 1)
  const cycleIndex = Math.floor(normalizedDayIndex / distributionDays)
  const dayIndexWithinCycle = normalizedDayIndex % distributionDays
  const reviewWindowsCount = Math.max(1, Math.ceil(distributionRangePages / dailyReviewPages))
  const reviewWindowIndex = dayIndexWithinCycle % reviewWindowsCount
  const maxOffsetWithinCycle = Math.max(0, distributionRangePages - dailyReviewPages)
  const offsetWithinCycle = Math.min(reviewWindowIndex * dailyReviewPages, maxOffsetWithinCycle)

  return (cycleIndex * distributionRangePages) + offsetWithinCycle
}

function getLegacyPlanSupportSessionContent(plan: SessionPlanBounds, activeDayNum: number): PlanSupportSessionContent {
  const direction = plan.direction === "desc" ? "desc" : "asc"
  const rootSurahNum = plan.prev_start_surah || plan.start_surah_number
  const rootSurah = SURAHS.find((surah) => surah.number === rootSurahNum)

  if (!rootSurah) {
    return { muraajaa: null, rabt: null }
  }

  const rootStartPage = rootSurah.startPage
  let previousVolume = 0

  if (plan.has_previous && plan.prev_start_surah && plan.prev_end_surah) {
    const previousStart = SURAHS.find((surah) => surah.number === plan.prev_start_surah)
    const previousEnd = SURAHS.find((surah) => surah.number === plan.prev_end_surah)
    if (previousStart && previousEnd) {
      let endPage = 605
      if (previousEnd.number < 114) {
        const nextSurah = SURAHS.find((surah) => surah.number === previousEnd.number + 1)
        if (nextSurah) endPage = nextSurah.startPage
      }
      previousVolume = Math.abs(endPage - previousStart.startPage)
    }
  }

  const completedCurrentPlanPages = Math.max(0, activeDayNum - 1) * (Number(plan.daily_pages) || 0)
  const totalMemorizedPool = previousVolume + completedCurrentPlanPages

  if (totalMemorizedPool <= 0) {
    return { muraajaa: null, rabt: null }
  }

  let rabt: PlanSessionContent | null = null
  let muraajaa: PlanSessionContent | null = null
  const rabtPref = Number(plan.rabt_pages) || 0
  const rabtSize = Math.min(rabtPref, totalMemorizedPool)

  if (rabtSize > 0) {
    const rabtOffset = totalMemorizedPool - rabtSize
    rabt = getOffsetPlanSessionContent(rootStartPage, rabtOffset, rabtSize, 0, direction)
  }

  const muraajaaPool = resolvePlanReviewPoolPages(plan, totalMemorizedPool)
  const muraajaaPref = resolvePlanReviewPagesPreference(plan, muraajaaPool)
  if (muraajaaPool > 0 && muraajaaPref > 0) {
    const distributionDays = plan.review_distribution_mode === "weekly" ? resolveReviewDistributionDays(plan) : 0
    const distributionRangePages = plan.review_distribution_mode === "weekly" ? muraajaaPool / distributionDays : 0
    const baseOffset = plan.review_distribution_mode === "weekly"
      ? resolveWeeklyReviewOffset(distributionRangePages, muraajaaPref, distributionDays, activeDayNum)
      : ((activeDayNum - 1) * muraajaaPref) % muraajaaPool
    const muraajaaSize = Math.min(muraajaaPref, muraajaaPool - baseOffset)
    if (muraajaaSize > 0) {
      muraajaa = getOffsetPlanSessionContent(rootStartPage, baseOffset, muraajaaSize, 0, direction)
    }
  }

  return { muraajaa, rabt }
}

export function getPlanSupportSessionContent(
  plan: SessionPlanBounds,
  completedDays: number,
  failedSessionNumbers?: number[] | null,
): PlanSupportSessionContent {
  const totalDays = resolvePlanTotalDays(plan)
  const activeDayNum = getActivePlanDayNumber(totalDays, completedDays, plan.start_date, plan.created_at)
  const direction = plan.direction === "desc" ? "desc" : "asc"

  if (direction !== "asc") {
    const legacyContent = getLegacyPlanSupportSessionContent(plan, activeDayNum)

    return {
      ...legacyContent,
      rabt: applyFailedSessionExclusionsToRabt(plan, legacyContent.rabt, failedSessionNumbers),
    }
  }

  const completedPlanPages = calculateCompletedPlanPages(
    resolvePlanTotalPages(plan),
    Number(plan.daily_pages) || 0,
    Math.max(0, activeDayNum - 1),
  )

  const previousRanges = getPreviousMemorizedRanges(plan)
  const completedPlanRanges = getCompletedPlanMemorizedRanges(plan, completedPlanPages)
  const memorizedSegments = getMergedMemorizedPageSegments([...previousRanges, ...completedPlanRanges])
  const totalMemorizedPages = getTotalMemorizedSequencePages(memorizedSegments)

  if (totalMemorizedPages <= 0) {
    return { muraajaa: null, rabt: null }
  }

  const rabtPref = Number(plan.rabt_pages) || 0
  const rabt = getTrailingSegmentContentAtIndex(memorizedSegments, memorizedSegments.length - 1, rabtPref)
  const rabtVisiblePages = rabt
    ? Math.min(rabtPref, totalMemorizedPages)
    : 0

  const muraajaaPoolSegments = trimTrailingMemorizedSegments(memorizedSegments, rabtVisiblePages)
  const muraajaaPoolPages = getTotalMemorizedSequencePages(muraajaaPoolSegments)
  const muraajaaPref = resolvePlanReviewPagesPreference(plan, muraajaaPoolPages)
  const distributionDays = plan.review_distribution_mode === "weekly" ? resolveReviewDistributionDays(plan) : 0
  const distributionRangePages = plan.review_distribution_mode === "weekly" ? muraajaaPoolPages / distributionDays : 0
  const reviewOffsetPages = plan.review_distribution_mode === "weekly"
    ? resolveWeeklyReviewOffset(distributionRangePages, muraajaaPref, distributionDays, activeDayNum)
    : Math.max(0, activeDayNum - 1) * muraajaaPref
  const reviewStartMode = resolveReviewStartMode(plan)
  const muraajaa = muraajaaPoolPages > 0 && muraajaaPref > 0
    ? reviewStartMode === "newest"
      ? getReverseSlidingSegmentContent(
          muraajaaPoolSegments,
          reviewOffsetPages,
          muraajaaPref,
        )
      : getSlidingSegmentContent(
          muraajaaPoolSegments,
          reviewOffsetPages,
          muraajaaPref,
        )
    : null

  return {
    muraajaa,
    rabt: applyFailedSessionExclusionsToRabt(plan, rabt, failedSessionNumbers),
  }
}

export function resolvePlanLinkingPagesPreference(
  plan: SessionPlanBounds,
  completedDays: number,
  failedSessionNumbers?: number[] | null,
) {
  return Math.max(
    0,
    getPlanSessionContentPages(
      getPlanSupportSessionContent(plan, completedDays, failedSessionNumbers).rabt,
    ),
  )
}

function getOffsetPlanSessionContent(
  planStartPage: number,
  offset: number,
  size: number,
  totalPages: number = 0,
  direction: "asc" | "desc" = "asc",
) {
  if (size <= 0) {
    return null
  }

  let sessionStart = direction === "desc"
    ? planStartPage + totalPages - offset - size
    : planStartPage + offset
  sessionStart = Math.max(1, Math.min(sessionStart, 605))
  const sessionEnd = Math.max(sessionStart, Math.min(sessionStart + size, 605))

  return formatPlanSessionContent(getAyahByPageFloat(sessionStart), getInclusiveEndAyah(sessionEnd))
}

export function getOffsetContent(
  planStartPage: number,
  offset: number,
  size: number,
  totalPages: number = 0,
  direction: "asc" | "desc" = "asc"
) {
  let sessionStart = direction === "desc" ? (planStartPage + totalPages - offset - size) : planStartPage + offset;
  sessionStart = Math.max(1, Math.min(sessionStart, 605));
  let sessionEnd = Math.max(sessionStart, Math.min(sessionStart + size, 605));
  
  if (size <= 0) return null;

  const startRef = getAyahByPageFloat(sessionStart);
  const endRef = getInclusiveEndAyah(sessionEnd);

  const startSurahName = SURAHS.find((x) => x.number === startRef.surah)!.name; 
  const endSurahName = SURAHS.find((x) => x.number === endRef.surah)!.name;     

  let formattedText = "";
  if (startRef.surah === endRef.surah && startRef.ayah === endRef.ayah) {       
    formattedText = `${startSurahName} ${startRef.ayah}`;
  } else {
    formattedText = `${startSurahName} ${startRef.ayah} الى ${endSurahName} ${endRef.ayah}`;
  }

  return { text: formattedText };
}
