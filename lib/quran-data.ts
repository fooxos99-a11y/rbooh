import { PAGE_REFERENCES } from './quran-pages';
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
}): number {
  if (!plan.has_previous || !plan.prev_start_surah || !plan.prev_end_surah) {
    return 0
  }

  return calculateTotalPages(
    plan.prev_start_surah,
    plan.prev_end_surah,
    plan.prev_start_verse,
    plan.prev_end_verse,
  )
}

export function calculateQuranMemorizationProgress(plan: {
  total_pages?: number | null
  daily_pages?: number | null
  has_previous?: boolean | null
  prev_start_surah?: number | null
  prev_start_verse?: number | null
  prev_end_surah?: number | null
  prev_end_verse?: number | null
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

export function getInclusiveEndAyah(p: number) {
  if (!Number.isFinite(p) || p <= 1) return { surah: 1, ayah: 1 }
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
    formattedText = `${startSurahName} ${startRef.ayah}${startCustom} - ${endSurahName} ${endRef.ayah}${endCustom}`;
  }

  return {
    text: formattedText,
    fromSurah: startSurahName,
    toSurah: endSurahName,
  };
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
    formattedText = `${startSurahName} ${startRef.ayah} - ${endSurahName} ${endRef.ayah}`;
  }

  return { text: formattedText };
}
