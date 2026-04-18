"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteLoader } from "@/components/ui/site-loader"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import { getClientAuthHeaders } from "@/lib/client-auth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Users,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle2,
  Target,
  Calendar,
  BookMarked,
  BarChart3,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  REVIEW_DISTRIBUTION_DEFAULT_DAYS,
  REVIEW_DISTRIBUTION_DEFAULT_MINIMUM_PAGES,
  SURAHS,
  calculateTotalPages,
  calculateTotalDays,
  getContiguousCompletedJuzRange,
  getJuzBounds,
  getJuzNumbersForPageRange,
  getNextAyahReference,
  hasScatteredCompletedJuzs,
  getPageFloatForAyah,
  getPlanMemorizedRange,
  resolvePlanTotalDays,
  resolvePlanTotalPages,
  getSurahJuzNumbers,
} from "@/lib/quran-data";
import { getSaudiDateString } from "@/lib/saudi-time";
import { formatJuzList } from "@/lib/enrollment-test-utils"

interface Circle {
  id: string;
  name: string;
  studentCount: number;
}

interface Student {
  id: string;
  name: string;
  halaqah: string;
  account_number: number;
  completed_juzs?: number[];
  current_juzs?: number[];
  memorized_start_surah?: number | null;
  memorized_start_verse?: number | null;
  memorized_end_surah?: number | null;
  memorized_end_verse?: number | null;
}

interface StudentPlan {
  id: string;
  student_id: string;
  start_surah_number: number;
  start_surah_name: string;
  start_verse?: number | null;
  end_surah_number: number;
  end_surah_name: string;
  end_verse?: number | null;
  daily_pages: number;
  total_pages: number;
  total_days: number;
  start_date: string;
  created_at: string;
  has_previous?: boolean;
  prev_start_surah?: number | null;
  prev_start_verse?: number | null;
  prev_end_surah?: number | null;
  prev_end_verse?: number | null;
  muraajaa_pages?: number | null;
  rabt_pages?: number | null;
  review_distribution_mode?: "fixed" | "weekly" | null;
  review_distribution_days?: number | null;
  review_minimum_pages?: number | null;
  review_start_mode?: "auto" | "oldest" | "newest" | null;
  previous_memorization_ranges?: PreviousRangeForm[] | null;
}

type PreviousRangeForm = {
  startSurah: string;
  startVerse: string;
  endSurah: string;
  endVerse: string;
};

const WEEKLY_REVIEW_OPTION_VALUE = "weekly";

const MURAAJAA_OPTIONS = [
  { value: WEEKLY_REVIEW_OPTION_VALUE, label: "قسمة على عدد الأيام" },
  { value: "20", label: "جزء واحد" },
  { value: "40", label: "جزئين" },
  { value: "60", label: "3 أجزاء" },
];

const RABT_OPTIONS = [
  { value: "10", label: "نصف جزء" },
  { value: "20", label: "جزء واحد" },
  { value: "40", label: "جزئين" },
  { value: "60", label: "3 أجزاء" },
];

const DAILY_OPTIONS = [
  { value: "0.25", label: "ربع وجه" },
  { value: "0.5", label: "نصف وجه" },
  { value: "1", label: "وجه واحد" },
  { value: "2", label: "وجهان" },
  { value: "3", label: "ثلاثة أوجه" },
];

function dailyLabel(v: number) {
  if (v === 0.25) return "ربع وجه";
  if (v === 0.5) return "نصف وجه";
  if (v === 1) return "وجه واحد";
  if (v === 2) return "وجهان";
  if (v === 3) return "ثلاثة أوجه";
  return `${v} وجه`;
}

function getPreferredEndSurah(
  options: typeof SURAHS,
  selectedStartSurah: number,
  preferredDirection: "asc" | "desc",
) {
  const optionNumbers = new Set(options.map((surah) => surah.number));
  const preferredCandidate = preferredDirection === "desc" ? selectedStartSurah - 1 : selectedStartSurah + 1;
  if (optionNumbers.has(preferredCandidate)) {
    return preferredCandidate;
  }

  const fallbackCandidate = preferredDirection === "desc" ? selectedStartSurah + 1 : selectedStartSurah - 1;
  if (optionNumbers.has(fallbackCandidate)) {
    return fallbackCandidate;
  }

  const nearest = options
    .filter((surah) => surah.number !== selectedStartSurah)
    .sort((left, right) => Math.abs(left.number - selectedStartSurah) - Math.abs(right.number - selectedStartSurah))[0];

  return nearest?.number ?? selectedStartSurah;
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
    return leftSurahNumber - rightSurahNumber;
  }

  return leftVerseNumber - rightVerseNumber;
}

function isStartAllowedAfterPrevious(
  startSurahNumber: number,
  startVerseNumber: number,
  boundarySurahNumber: number,
  boundaryVerseNumber: number,
  previousDirection: "asc" | "desc",
) {
  const comparison = compareAyahRefs(startSurahNumber, startVerseNumber, boundarySurahNumber, boundaryVerseNumber);
  return previousDirection === "desc" ? comparison <= 0 : comparison >= 0;
}

function isAyahWithinRange(
  surahNumber: number,
  verseNumber: number,
  rangeStartSurahNumber: number,
  rangeStartVerseNumber: number,
  rangeEndSurahNumber: number,
  rangeEndVerseNumber: number,
) {
  const isAscendingRange = compareAyahRefs(
    rangeStartSurahNumber,
    rangeStartVerseNumber,
    rangeEndSurahNumber,
    rangeEndVerseNumber,
  ) <= 0;

  const normalizedRangeStart = isAscendingRange
    ? { surahNumber: rangeStartSurahNumber, verseNumber: rangeStartVerseNumber }
    : { surahNumber: rangeEndSurahNumber, verseNumber: rangeEndVerseNumber };
  const normalizedRangeEnd = isAscendingRange
    ? { surahNumber: rangeEndSurahNumber, verseNumber: rangeEndVerseNumber }
    : { surahNumber: rangeStartSurahNumber, verseNumber: rangeStartVerseNumber };

  return compareAyahRefs(surahNumber, verseNumber, normalizedRangeStart.surahNumber, normalizedRangeStart.verseNumber) >= 0
    && compareAyahRefs(surahNumber, verseNumber, normalizedRangeEnd.surahNumber, normalizedRangeEnd.verseNumber) <= 0;
}

function getAdjustedPreviewRange({
  startSurahNumber,
  startVerseNumber,
  endSurahNumber,
  endVerseNumber,
  dailyPages,
  direction,
  prevStartSurah,
  prevStartVerse,
  prevEndSurah,
  prevEndVerse,
  previousMemorizationRanges,
  completedJuzs,
}: {
  startSurahNumber: number;
  startVerseNumber: number;
  endSurahNumber: number;
  endVerseNumber: number;
  dailyPages?: number;
  direction: "asc" | "desc";
  prevStartSurah?: string;
  prevStartVerse?: string;
  prevEndSurah?: string;
  prevEndVerse?: string;
  previousMemorizationRanges?: PreviousRangeForm[];
  completedJuzs?: number[];
}) {
  let adjustedStartSurahNumber = startSurahNumber;
  let adjustedStartVerseNumber = startVerseNumber;

  const nextStartFromPrevious = (!previousMemorizationRanges || previousMemorizationRanges.length <= 1) && prevStartSurah && prevEndSurah && prevEndVerse
    ? getNextStartFromPrevious(prevStartSurah, prevEndSurah, prevEndVerse)
    : null;

  const isStartInsidePreviousRange = nextStartFromPrevious && prevStartSurah && prevEndSurah && prevEndVerse
    ? isAyahWithinRange(
        adjustedStartSurahNumber,
        adjustedStartVerseNumber,
        parseInt(prevStartSurah, 10),
        prevStartVerse ? parseInt(prevStartVerse, 10) : 1,
        parseInt(prevEndSurah, 10),
        parseInt(prevEndVerse, 10),
      )
    : false;

  if (nextStartFromPrevious && isStartInsidePreviousRange) {
    adjustedStartSurahNumber = nextStartFromPrevious.surahNumber;
    adjustedStartVerseNumber = nextStartFromPrevious.verseNumber;
  }

  const selectedStartPage = getPageFloatForAyah(adjustedStartSurahNumber, adjustedStartVerseNumber);
  const nextSelectedEndAyah = getNextAyahReference(endSurahNumber, endVerseNumber);
  const selectedEndPage = nextSelectedEndAyah
    ? getPageFloatForAyah(nextSelectedEndAyah.surah, nextSelectedEndAyah.ayah)
    : 605;
  const selectedJuzs = getJuzNumbersForPageRange(selectedStartPage, selectedEndPage, direction);
  const completedJuzSet = new Set(completedJuzs || []);
  const leadingCompletedJuzs: number[] = [];

  for (const juzNumber of selectedJuzs) {
    if (!completedJuzSet.has(juzNumber)) {
      break;
    }

    leadingCompletedJuzs.push(juzNumber);
  }

  if (leadingCompletedJuzs.length > 0 && leadingCompletedJuzs.length < selectedJuzs.length) {
    const nextJuzNumber = selectedJuzs[leadingCompletedJuzs.length];
    const nextJuzBounds = getJuzBounds(nextJuzNumber);

    if (nextJuzBounds) {
      if (direction === "desc") {
        adjustedStartSurahNumber = nextJuzBounds.endSurahNumber;
        adjustedStartVerseNumber = nextJuzBounds.endVerseNumber;
      } else {
        adjustedStartSurahNumber = nextJuzBounds.startSurahNumber;
        adjustedStartVerseNumber = nextJuzBounds.startVerseNumber;
      }
    }
  }

  const isRangeOrderValid = direction === "desc"
    ? compareAyahRefs(adjustedStartSurahNumber, adjustedStartVerseNumber, endSurahNumber, endVerseNumber) >= 0
    : compareAyahRefs(adjustedStartSurahNumber, adjustedStartVerseNumber, endSurahNumber, endVerseNumber) <= 0;

  const totalPages = isRangeOrderValid
    ? resolvePlanTotalPages({
        start_surah_number: adjustedStartSurahNumber,
        start_verse: adjustedStartVerseNumber,
        end_surah_number: endSurahNumber,
        end_verse: endVerseNumber,
        direction,
        has_previous: Boolean(prevStartSurah && prevEndSurah && prevEndVerse),
        prev_start_surah: prevStartSurah ? parseInt(prevStartSurah, 10) : null,
        prev_start_verse: prevStartVerse ? parseInt(prevStartVerse, 10) : null,
        prev_end_surah: prevEndSurah ? parseInt(prevEndSurah, 10) : null,
        prev_end_verse: prevEndVerse ? parseInt(prevEndVerse, 10) : null,
        previous_memorization_ranges: previousMemorizationRanges?.map((range) => ({
          startSurahNumber: parseInt(range.startSurah, 10),
          startVerseNumber: parseInt(range.startVerse || "1", 10),
          endSurahNumber: parseInt(range.endSurah, 10),
          endVerseNumber: parseInt(range.endVerse, 10),
        })),
        completed_juzs: completedJuzs,
      })
    : 0;
  const totalDays = totalPages > 0 && dailyPages
    ? resolvePlanTotalDays({
        start_surah_number: adjustedStartSurahNumber,
        start_verse: adjustedStartVerseNumber,
        end_surah_number: endSurahNumber,
        end_verse: endVerseNumber,
        total_pages: totalPages,
        daily_pages: dailyPages,
        direction,
        has_previous: Boolean(prevStartSurah && prevEndSurah && prevEndVerse),
        prev_start_surah: prevStartSurah ? parseInt(prevStartSurah, 10) : null,
        prev_start_verse: prevStartVerse ? parseInt(prevStartVerse, 10) : null,
        prev_end_surah: prevEndSurah ? parseInt(prevEndSurah, 10) : null,
        prev_end_verse: prevEndVerse ? parseInt(prevEndVerse, 10) : null,
        previous_memorization_ranges: previousMemorizationRanges?.map((range) => ({
          startSurahNumber: parseInt(range.startSurah, 10),
          startVerseNumber: parseInt(range.startVerse || "1", 10),
          endSurahNumber: parseInt(range.endSurah, 10),
          endVerseNumber: parseInt(range.endVerse, 10),
        })),
        completed_juzs: completedJuzs,
      })
    : 0;

  return {
    startSurahNumber: adjustedStartSurahNumber,
    startVerseNumber: adjustedStartVerseNumber,
    endSurahNumber,
    endVerseNumber,
    totalPages,
    totalDays,
  };
}

function createEmptyPreviousRange(): PreviousRangeForm {
  return {
    startSurah: "",
    startVerse: "1",
    endSurah: "",
    endVerse: "",
  };
}

function isPreviousRangeComplete(range?: PreviousRangeForm | null) {
  return Boolean(range?.startSurah && range?.startVerse && range?.endSurah && range?.endVerse);
}

function normalizePreviousRange(range?: PreviousRangeForm | null) {
  if (!range?.startSurah || !range?.endSurah || !range?.endVerse) {
    return null;
  }

  return {
    startSurahNumber: parseInt(range.startSurah, 10),
    startVerseNumber: parseInt(range.startVerse || "1", 10) || 1,
    endSurahNumber: parseInt(range.endSurah, 10),
    endVerseNumber: parseInt(range.endVerse, 10),
  };
}

function getPreviousRangeKey(range: NonNullable<ReturnType<typeof normalizePreviousRange>>) {
  return `${range.startSurahNumber}:${range.startVerseNumber}:${range.endSurahNumber}:${range.endVerseNumber}`;
}

function hasDuplicatePreviousRanges(ranges: Array<NonNullable<ReturnType<typeof normalizePreviousRange>>>) {
  const keys = new Set<string>();

  for (const range of ranges) {
    const key = getPreviousRangeKey(range);
    if (keys.has(key)) {
      return true;
    }

    keys.add(key);
  }

  return false;
}

function getOrderedPreviousRange(range: NonNullable<ReturnType<typeof normalizePreviousRange>>) {
  return compareAyahRefs(
    range.startSurahNumber,
    range.startVerseNumber,
    range.endSurahNumber,
    range.endVerseNumber,
  ) <= 0
    ? range
    : {
        startSurahNumber: range.endSurahNumber,
        startVerseNumber: range.endVerseNumber,
        endSurahNumber: range.startSurahNumber,
        endVerseNumber: range.startVerseNumber,
      };
}

function doPreviousRangesOverlap(
  firstRange: NonNullable<ReturnType<typeof normalizePreviousRange>>,
  secondRange: NonNullable<ReturnType<typeof normalizePreviousRange>>,
) {
  const first = getOrderedPreviousRange(firstRange);
  const second = getOrderedPreviousRange(secondRange);

  return (
    compareAyahRefs(
      first.startSurahNumber,
      first.startVerseNumber,
      second.endSurahNumber,
      second.endVerseNumber,
    ) <= 0
    && compareAyahRefs(
      second.startSurahNumber,
      second.startVerseNumber,
      first.endSurahNumber,
      first.endVerseNumber,
    ) <= 0
  );
}

function hasConflictingPreviousRanges(ranges: Array<NonNullable<ReturnType<typeof normalizePreviousRange>>>) {
  if (hasDuplicatePreviousRanges(ranges)) {
    return true;
  }

  for (let firstIndex = 0; firstIndex < ranges.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < ranges.length; secondIndex += 1) {
      if (doPreviousRangesOverlap(ranges[firstIndex], ranges[secondIndex])) {
        return true;
      }
    }
  }

  return false;
}

function getCoveredVerseNumbersForPreviousRangeInSurah(
  range: NonNullable<ReturnType<typeof normalizePreviousRange>>,
  surahNumber: number,
) {
  const orderedRange = getOrderedPreviousRange(range);
  const surah = SURAHS.find((item) => item.number === surahNumber);

  if (!surah) {
    return [] as number[];
  }

  if (surahNumber < orderedRange.startSurahNumber || surahNumber > orderedRange.endSurahNumber) {
    return [] as number[];
  }

  const minVerse = surahNumber === orderedRange.startSurahNumber ? orderedRange.startVerseNumber : 1;
  const maxVerse = surahNumber === orderedRange.endSurahNumber ? orderedRange.endVerseNumber : surah.verseCount;

  return Array.from({ length: Math.max(0, maxVerse - minVerse + 1) }, (_, index) => minVerse + index);
}

function getLockedPreviousRange(student: Student, plan: StudentPlan | null, completedDays: number) {
  const completedJuzRange = hasScatteredCompletedJuzs(student.completed_juzs)
    ? null
    : getContiguousCompletedJuzRange(student.completed_juzs);
  const memorizedStartSurah = hasScatteredCompletedJuzs(student.completed_juzs) ? null : student.memorized_start_surah;
  const memorizedStartVerse = hasScatteredCompletedJuzs(student.completed_juzs) ? null : student.memorized_start_verse;
  const memorizedEndSurah = hasScatteredCompletedJuzs(student.completed_juzs) ? null : student.memorized_end_surah;
  const memorizedEndVerse = hasScatteredCompletedJuzs(student.completed_juzs) ? null : student.memorized_end_verse;

  if (plan && completedDays > 0) {
    const memorizedRange = getPlanMemorizedRange(
      {
        ...plan,
        has_previous: plan.has_previous || !!(plan.prev_start_surah || memorizedStartSurah || completedJuzRange?.startSurahNumber),
        prev_start_surah: plan.prev_start_surah || memorizedStartSurah || completedJuzRange?.startSurahNumber || null,
        prev_start_verse: plan.prev_start_verse || memorizedStartVerse || completedJuzRange?.startVerseNumber || null,
        prev_end_surah: plan.prev_end_surah || memorizedEndSurah || completedJuzRange?.endSurahNumber || null,
        prev_end_verse: plan.prev_end_verse || memorizedEndVerse || completedJuzRange?.endVerseNumber || null,
      },
      completedDays,
    );

    if (memorizedRange) {
      return memorizedRange;
    }
  }

  const startSurahNumber = memorizedStartSurah || plan?.prev_start_surah || completedJuzRange?.startSurahNumber || null;
  const startVerseNumber = memorizedStartVerse || plan?.prev_start_verse || completedJuzRange?.startVerseNumber || 1;
  const endSurahNumber = memorizedEndSurah || plan?.prev_end_surah || completedJuzRange?.endSurahNumber || null;
  const endSurah = endSurahNumber ? SURAHS.find((surah) => surah.number === endSurahNumber) : null;
  const endVerseNumber = memorizedEndVerse || plan?.prev_end_verse || completedJuzRange?.endVerseNumber || endSurah?.verseCount || 1;

  if (!startSurahNumber || !endSurahNumber) {
    if (!plan?.start_surah_number || !plan?.end_surah_number) {
      return null;
    }

    const planEndSurah = SURAHS.find((surah) => surah.number === plan.end_surah_number);

    return {
      startSurahNumber: plan.start_surah_number,
      startVerseNumber: plan.start_verse || 1,
      endSurahNumber: plan.end_surah_number,
      endVerseNumber: plan.end_verse || planEndSurah?.verseCount || 1,
    };
  }

  return {
    startSurahNumber,
    startVerseNumber,
    endSurahNumber,
    endVerseNumber,
  };
}

function isJuzFullyCoveredByRange(
  juzNumber: number,
  range: ReturnType<typeof getLockedPreviousRange>,
) {
  if (!range) {
    return false;
  }

  const juzBounds = getJuzBounds(juzNumber);
  if (!juzBounds) {
    return false;
  }

  const rangeStartsFirst = compareAyahRefs(
    range.startSurahNumber,
    range.startVerseNumber,
    range.endSurahNumber,
    range.endVerseNumber,
  ) <= 0;

  const normalizedRangeStart = rangeStartsFirst
    ? { surahNumber: range.startSurahNumber, verseNumber: range.startVerseNumber }
    : { surahNumber: range.endSurahNumber, verseNumber: range.endVerseNumber };
  const normalizedRangeEnd = rangeStartsFirst
    ? { surahNumber: range.endSurahNumber, verseNumber: range.endVerseNumber }
    : { surahNumber: range.startSurahNumber, verseNumber: range.startVerseNumber };

  return (
    compareAyahRefs(
      normalizedRangeStart.surahNumber,
      normalizedRangeStart.verseNumber,
      juzBounds.startSurahNumber,
      juzBounds.startVerseNumber,
    ) <= 0
    && compareAyahRefs(
      normalizedRangeEnd.surahNumber,
      normalizedRangeEnd.verseNumber,
      juzBounds.endSurahNumber,
      juzBounds.endVerseNumber,
    ) >= 0
  );
}

export default function StudentPlansPage() {
  const router = useRouter();
  const confirmDialog = useConfirmDialog()
  const [isLoading, setIsLoading] = useState(true);
  const [isCirclesLoading, setIsCirclesLoading] = useState(true);
  const [isCircleDataLoading, setIsCircleDataLoading] = useState(false);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentPlans, setStudentPlans] = useState<
    Record<string, StudentPlan | null>
  >({});
  const [studentProgress, setStudentProgress] = useState<
    Record<string, number>
  >({});
  const [studentCompletedDays, setStudentCompletedDays] = useState<
    Record<string, number>
  >({});
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetDialogStudents, setResetDialogStudents] = useState<Student[]>([]);
  const [resetDialogCircle, setResetDialogCircle] = useState<string | null>(null);
  const [isResetDialogLoading, setIsResetDialogLoading] = useState(false);
  const [resettingStudentId, setResettingStudentId] = useState<string | null>(null);

  // نافذة إضافة الخطة
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [startSurah, setStartSurah] = useState<string>("");
  const [endSurah, setEndSurah] = useState<string>("");
  const [dailyPages, setDailyPages] = useState<string>("1");
  const [customDays, setCustomDays] = useState<string>("");
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [startVerse, setStartVerse] = useState<string>("");
  const [endVerse, setEndVerse] = useState<string>("");

  // الحفظ السابق
  const [hasPrevious, setHasPrevious] = useState(false);
  const [prevStartSurah, setPrevStartSurah] = useState<string>("");
  const [prevEndSurah, setPrevEndSurah] = useState<string>("");
  const [muraajaaPages, setMuraajaaPages] = useState<string>("20");
  const [rabtPages, setRabtPages] = useState<string>("10");
  const [prevStartOpen, setPrevStartOpen] = useState(false);
  const [prevEndOpen, setPrevEndOpen] = useState(false);
  const [prevStartVerse, setPrevStartVerse] = useState<string>("");
  const [prevEndVerse, setPrevEndVerse] = useState<string>("");
  const [additionalPreviousRanges, setAdditionalPreviousRanges] = useState<PreviousRangeForm[]>([]);
  const [isPreviousLocked, setIsPreviousLocked] = useState(false);
  const [additionalPrevStartOpenIndex, setAdditionalPrevStartOpenIndex] = useState<number | null>(null);
  const [additionalPrevEndOpenIndex, setAdditionalPrevEndOpenIndex] = useState<number | null>(null);
  const [reviewDistributionDays, setReviewDistributionDays] = useState<string>(String(REVIEW_DISTRIBUTION_DEFAULT_DAYS));
  const [reviewMinimumPages, setReviewMinimumPages] = useState<string>(String(REVIEW_DISTRIBUTION_DEFAULT_MINIMUM_PAGES));

  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const updateAdditionalPreviousRange = (index: number, patch: Partial<PreviousRangeForm>) => {
    setAdditionalPreviousRanges((current) => {
      const next = current.map((item, currentIndex) => currentIndex === index ? { ...item, ...patch } : item);
      const normalizedRanges = [
        normalizePreviousRange({ startSurah: prevStartSurah, startVerse: prevStartVerse || "1", endSurah: prevEndSurah, endVerse: prevEndVerse }),
        ...next.map((range) => normalizePreviousRange(range)),
      ].filter((range): range is NonNullable<ReturnType<typeof normalizePreviousRange>> => Boolean(range));

      if (hasConflictingPreviousRanges(normalizedRanges)) {
        setSaveMsg({ type: "error", text: "لا يمكن تكرار أو تداخل المحفوظ السابق" });
        return current;
      }

      return next;
    });
  };

  // التحقق من الصلاحيات
  useEffect(() => {
    const check = async () => {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true";
      const accountNumber = localStorage.getItem("accountNumber") || localStorage.getItem("account_number");
      if (!loggedIn || !accountNumber) {
        router.push("/login");
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("account_number", Number(accountNumber))
        .single();
      const role = data?.role || "";
      const adminRoles = [
        "admin",
        "مدير",
        "سكرتير",
        "مشرف تعليمي",
        "مشرف تربوي",
        "مشرف برامج",
      ];
      if (!adminRoles.includes(role) && role !== "admin") {
        router.push("/login");
        return;
      }
      setIsLoading(false);
    };
    check();
  }, [router]);

  // جلب الحلقات
  useEffect(() => {
    if (isLoading) return;
    setIsCirclesLoading(true);
    fetch("/api/circles")
      .then((r) => r.json())
      .then((d) => {
        const loadedCircles = d.circles || [];
        setCircles(loadedCircles);
      })
      .catch(console.error)
      .finally(() => setIsCirclesLoading(false));
  }, [isLoading]);

  // جلب طلاب الحلقة المختارة
  useEffect(() => {
    if (!selectedCircle) {
      setStudents([]);
      setStudentPlans({});
      setStudentProgress({});
      setStudentCompletedDays({});
      setIsCircleDataLoading(false);
      return;
    }

    let isCancelled = false;

    const loadCircleData = async () => {
      setIsCircleDataLoading(true);
      setStudents([]);
      setStudentPlans({});
      setStudentProgress({});
      setStudentCompletedDays({});

      try {
        const response = await fetch(`/api/students?circle=${encodeURIComponent(selectedCircle)}`, { cache: "no-store" });
        const data = await response.json();
        const circleStudents = data.students || [];

        if (isCancelled) return;

        setStudents(circleStudents);

        const { plans, progress, completedDays } = await fetchPlansForStudents(circleStudents);
        if (isCancelled) return;

        setStudentPlans(plans);
        setStudentProgress(progress);
        setStudentCompletedDays(completedDays);
      } catch (error) {
        if (isCancelled) return;
        console.error(error);
        setStudents([]);
        setStudentPlans({});
        setStudentProgress({});
        setStudentCompletedDays({});
      } finally {
        if (!isCancelled) {
          setIsCircleDataLoading(false);
        }
      }
    };

    loadCircleData();

    return () => {
      isCancelled = true;
    };
  }, [selectedCircle]);

  const fetchPlansForStudents = async (studs: Student[]) => {
    const plans: Record<string, StudentPlan | null> = {};
    const progress: Record<string, number> = {};
    const completedDays: Record<string, number> = {};
    await Promise.all(
      studs.map(async (s) => {
        try {
          const res = await fetch(`/api/student-plans?student_id=${s.id}`, {
            cache: "no-store",
            headers: getClientAuthHeaders(),
          });
          if (!res.ok) {
            plans[s.id] = null;
            progress[s.id] = 0;
            completedDays[s.id] = 0;
            return;
          }
          const data = await res.json();
          plans[s.id] = data.plan || null;
          progress[s.id] = data.progressPercent || 0;
          completedDays[s.id] = data.completedDays || 0;
        } catch {
          plans[s.id] = null;
          progress[s.id] = 0;
          completedDays[s.id] = 0;
        }
      }),
    );
    return { plans, progress, completedDays };
  };

  const openAddDialog = (student: Student) => {
    const currentPlan = studentPlans[student.id];
    const lockedPreviousRange = getLockedPreviousRange(student, currentPlan, studentCompletedDays[student.id] || 0);
    const storedPreviousRanges = Array.isArray(currentPlan?.previous_memorization_ranges)
      ? currentPlan.previous_memorization_ranges
      : [];
    const fallbackPreviousRange = currentPlan?.prev_start_surah && currentPlan?.prev_end_surah && currentPlan?.prev_end_verse
      ? [{
          startSurah: String(currentPlan.prev_start_surah),
          startVerse: String(currentPlan.prev_start_verse || 1),
          endSurah: String(currentPlan.prev_end_surah),
          endVerse: String(currentPlan.prev_end_verse),
        }]
      : [];
    const initialPreviousRanges = lockedPreviousRange
      ? [{
          startSurah: String(lockedPreviousRange.startSurahNumber),
          startVerse: String(lockedPreviousRange.startVerseNumber),
          endSurah: String(lockedPreviousRange.endSurahNumber),
          endVerse: String(lockedPreviousRange.endVerseNumber),
        }]
      : (storedPreviousRanges.length > 0 ? storedPreviousRanges : fallbackPreviousRange);
    const hasLockedPrevious = !!lockedPreviousRange;
    const shouldLockPrevious = !!currentPlan || hasLockedPrevious;
    const nextPlanStart = lockedPreviousRange
      ? getNextStartFromPrevious(
          String(lockedPreviousRange.startSurahNumber),
          String(lockedPreviousRange.endSurahNumber),
          String(lockedPreviousRange.endVerseNumber),
        )
      : null;

    setSelectedStudent(student);
    setStartSurah(nextPlanStart ? String(nextPlanStart.surahNumber) : "");
    setEndSurah("");
    setDailyPages("1");
    setCustomDays("");
    setSaveMsg(null);
    setStartOpen(false);
    setEndOpen(false);
    setStartVerse(nextPlanStart ? String(nextPlanStart.verseNumber) : "");
    setEndVerse("");
    setHasPrevious(shouldLockPrevious || initialPreviousRanges.length > 0);
    setIsPreviousLocked(shouldLockPrevious);
    setPrevStartSurah(initialPreviousRanges[0]?.startSurah || "");
    setPrevEndSurah(initialPreviousRanges[0]?.endSurah || "");
    setMuraajaaPages(currentPlan?.review_distribution_mode === "weekly"
      ? WEEKLY_REVIEW_OPTION_VALUE
      : currentPlan?.muraajaa_pages
        ? String(currentPlan.muraajaa_pages)
        : "20");
    setReviewDistributionDays(String(currentPlan?.review_distribution_days || REVIEW_DISTRIBUTION_DEFAULT_DAYS));
    setReviewMinimumPages(String(currentPlan?.review_minimum_pages || REVIEW_DISTRIBUTION_DEFAULT_MINIMUM_PAGES));
    setRabtPages(currentPlan?.rabt_pages ? String(currentPlan.rabt_pages) : "10");
    setPrevStartOpen(false);
    setPrevEndOpen(false);
    setAdditionalPrevStartOpenIndex(null);
    setAdditionalPrevEndOpenIndex(null);
    setPrevStartVerse(initialPreviousRanges[0]?.startVerse || "");
    setPrevEndVerse(initialPreviousRanges[0]?.endVerse || "");
    setAdditionalPreviousRanges(initialPreviousRanges.slice(1));

    setAddDialogOpen(true);
  };

  const handleSavePlan = async () => {
    if (!selectedStudent || !startSurah || !startVerse || !endSurah || !endVerse || !dailyPages) {
      setSaveMsg({ type: "error", text: "يجب اختيار الآية لبداية ونهاية الخطة قبل الحفظ" });
      return;
    }

    const primaryPreviousForm = {
      startSurah: prevStartSurah,
      startVerse: prevStartVerse,
      endSurah: prevEndSurah,
      endVerse: prevEndVerse,
    };

    if (hasPrevious && (!isPreviousRangeComplete(primaryPreviousForm) || additionalPreviousRanges.some((range) => !isPreviousRangeComplete(range)))) {
      setSaveMsg({ type: "error", text: "يجب اختيار السورة والآية لكل محفوظ سابق قبل الحفظ" });
      return;
    }

    const startNum = parseInt(startSurah);
    const endNum = parseInt(endSurah);
    const normalizedPreviousRanges = [
      normalizePreviousRange({ startSurah: prevStartSurah, startVerse: prevStartVerse || "1", endSurah: prevEndSurah, endVerse: prevEndVerse }),
      ...additionalPreviousRanges.map((range) => normalizePreviousRange(range)),
    ].filter((range): range is NonNullable<ReturnType<typeof normalizePreviousRange>> => Boolean(range));

    if (hasConflictingPreviousRanges(normalizedPreviousRanges)) {
      setSaveMsg({ type: "error", text: "لا يمكن تكرار أو تداخل المحفوظ السابق" });
      return;
    }

    const primaryPreviousRange = normalizedPreviousRanges[0] || null;
    const hasSinglePreviousRange = normalizedPreviousRanges.length === 1;

    if (hasPrevious) {
      if (normalizedPreviousRanges.length === 0) {
        setSaveMsg({ type: "error", text: "يجب تعبئة بيانات الحفظ السابق كاملة" });
        return;
      }

      if (hasSinglePreviousRange && !nextStartFromPrevious) {
        setSaveMsg({ type: "error", text: "تعذر تحديد البداية الصحيحة بعد الحفظ السابق" });
        return;
      }

      const normalizedStartVerse = startVerse ? parseInt(startVerse) : 1;
      const startInsidePreviousRange = primaryPreviousRange
        ? isAyahWithinRange(
            startNum,
            normalizedStartVerse,
            primaryPreviousRange.startSurahNumber,
            primaryPreviousRange.startVerseNumber,
            primaryPreviousRange.endSurahNumber,
            primaryPreviousRange.endVerseNumber,
          )
        : false;
      if (hasSinglePreviousRange && startInsidePreviousRange) {
        const expectedSurah = SURAHS.find((s) => s.number === nextStartFromPrevious.surahNumber)?.name || "السورة";
        setSaveMsg({
          type: "error",
          text: `يجب أن يكون بداية المحفوظ عند آخر آية تم حفظها: ${expectedSurah} آية ${nextStartFromPrevious.verseNumber}، أو إعادة حفظ الطالب من جديد`,
        });
        return;
      }
    }

    if (startNum === endNum && startVerse && endVerse && parseInt(startVerse) > parseInt(endVerse)) {
      setSaveMsg({ type: "error", text: "في نفس السورة يجب أن تكون آية النهاية بعد آية البداية" });
      return;
    }

    const startSurahData = SURAHS.find((s) => s.number === startNum)!;
    const endSurahData = SURAHS.find((s) => s.number === endNum)!;
    const adjustedPreview = getAdjustedPreviewRange({
      startSurahNumber: startNum,
      startVerseNumber: startVerse ? parseInt(startVerse) : 1,
      endSurahNumber: endNum,
      endVerseNumber: endVerse ? parseInt(endVerse) : (SURAHS.find((s) => s.number === endNum)?.verseCount || 1),
      dailyPages: parseFloat(dailyPages),
      direction,
      prevStartSurah,
      prevStartVerse,
      prevEndSurah,
      prevEndVerse,
      previousMemorizationRanges: [
        { startSurah: prevStartSurah, startVerse: prevStartVerse || "1", endSurah: prevEndSurah, endVerse: prevEndVerse },
        ...additionalPreviousRanges,
      ],
      completedJuzs: selectedStudent?.completed_juzs,
    });
    const total = adjustedPreview.totalPages;
    const days = adjustedPreview.totalDays;
    const effectiveDays = days;
    const reviewDistributionMode = muraajaaPages === WEEKLY_REVIEW_OPTION_VALUE ? "weekly" : "fixed";
    const normalizedReviewDistributionDays = Math.max(1, Math.floor(Number(reviewDistributionDays) || REVIEW_DISTRIBUTION_DEFAULT_DAYS));
    const normalizedReviewMinimumPages = Math.max(0.25, Number(reviewMinimumPages) || REVIEW_DISTRIBUTION_DEFAULT_MINIMUM_PAGES);

    if (reviewDistributionMode === "weekly" && (!Number.isFinite(normalizedReviewDistributionDays) || normalizedReviewDistributionDays <= 0)) {
      setSaveMsg({ type: "error", text: "أدخل عدد أيام صحيحًا لقسمة المراجعة" });
      return;
    }

    if (reviewDistributionMode === "weekly" && (!Number.isFinite(normalizedReviewMinimumPages) || normalizedReviewMinimumPages <= 0)) {
      setSaveMsg({ type: "error", text: "أدخل حدًا أدنى صحيحًا للمراجعة اليومية" });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/student-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          start_surah_number: startNum,
          start_surah_name: startSurahData.name,
          start_verse: startVerse ? parseInt(startVerse) : null,
          end_surah_number: endNum,
          end_surah_name: endSurahData.name,
          end_verse: endVerse ? parseInt(endVerse) : null,
          daily_pages: parseFloat(dailyPages),
          total_days: effectiveDays,
          direction,
          has_previous: hasPrevious && normalizedPreviousRanges.length > 0,
          prev_start_surah: hasPrevious && primaryPreviousRange ? primaryPreviousRange.startSurahNumber : null,
          prev_start_verse: hasPrevious && primaryPreviousRange ? primaryPreviousRange.startVerseNumber : null,
          prev_end_surah: hasPrevious && primaryPreviousRange ? primaryPreviousRange.endSurahNumber : null,
          prev_end_verse: hasPrevious && primaryPreviousRange ? primaryPreviousRange.endVerseNumber : null,
          previous_memorization_ranges: hasPrevious ? normalizedPreviousRanges : [],
          muraajaa_pages: reviewDistributionMode === "weekly" ? null : parseFloat(muraajaaPages),
          rabt_pages: parseFloat(rabtPages),
          review_distribution_mode: reviewDistributionMode,
          review_distribution_days: reviewDistributionMode === "weekly" ? normalizedReviewDistributionDays : null,
          review_minimum_pages: reviewDistributionMode === "weekly" ? normalizedReviewMinimumPages : null,
          review_start_mode: "auto",
          start_date: getSaudiDateString(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const refreshed = await fetchPlansForStudents([selectedStudent]);
        setSaveMsg({
          type: "success",
          text: data.message || `✓ تم حفظ الخطة — ${total} وجه خلال ${effectiveDays} يوم`,
        });
        setStudentPlans((prev) => ({
          ...prev,
          [selectedStudent.id]: refreshed.plans[selectedStudent.id] ?? data.plan,
        }));
        setStudentProgress((prev) => ({
          ...prev,
          [selectedStudent.id]: refreshed.progress[selectedStudent.id] ?? 0,
        }));
        setStudentCompletedDays((prev) => ({
          ...prev,
          [selectedStudent.id]: refreshed.completedDays[selectedStudent.id] ?? 0,
        }));
        setTimeout(() => setAddDialogOpen(false), 1500);
      } else {
        setSaveMsg({ type: "error", text: data.error || "فشل في حفظ الخطة" });
      }
    } catch {
      setSaveMsg({ type: "error", text: "حدث خطأ، يرجى المحاولة مجدداً" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (studentId: string) => {
    const confirmed = await confirmDialog({
      title: "حذف الخطة",
      description: "هل أنت متأكد من حذف خطة هذا الطالب؟",
      confirmText: "حذف",
      cancelText: "إلغاء",
    })
    if (!confirmed) return;

    try {
      await fetch(`/api/student-plans?student_id=${studentId}`, {
        method: "DELETE",
        headers: getClientAuthHeaders(),
      });
      setStudentPlans((prev) => ({ ...prev, [studentId]: null }));
      setStudentProgress((prev) => ({ ...prev, [studentId]: 0 }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetMemorization = async (student: Student) => {
    const confirmed = await confirmDialog({
      title: "إعادة حفظ الطالب",
      description: "سيتم حذف الخطة الحالية إن وجدت ومسح المحفوظ السابق لهذا الطالب للبدء من الصفر. هل تريد المتابعة؟",
      confirmText: "إعادة الحفظ",
      cancelText: "إلغاء",
    });
    if (!confirmed) return;

    try {
      setResettingStudentId(student.id);
      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: student.id, reset_memorized: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل في إعادة حفظ الطالب");
      }

      setStudents((prev) => prev.map((item) => (
        item.id === student.id
          ? {
              ...item,
              completed_juzs: [],
              current_juzs: [],
              memorized_start_surah: null,
              memorized_start_verse: null,
              memorized_end_surah: null,
              memorized_end_verse: null,
            }
          : item
      )));
      setStudentPlans((prev) => ({ ...prev, [student.id]: null }));
      setStudentProgress((prev) => ({ ...prev, [student.id]: 0 }));
      setStudentCompletedDays((prev) => ({ ...prev, [student.id]: 0 }));
      setResetDialogStudents((prev) => prev.map((item) => (
        item.id === student.id
          ? {
              ...item,
              completed_juzs: [],
              current_juzs: [],
              memorized_start_surah: null,
              memorized_start_verse: null,
              memorized_end_surah: null,
              memorized_end_verse: null,
            }
          : item
      )));
    } catch (error) {
      console.error(error);
    } finally {
      setResettingStudentId(null);
    }
  };

  const openResetDialog = async () => {
    if (!selectedCircle) {
      return;
    }

    setResetDialogOpen(true);
    setResetDialogCircle(selectedCircle);
    setResetDialogStudents(students);
    setIsResetDialogLoading(false);
  };

  // السور مرتبة تنازلياً (من الناس إلى البقرة)
  const startNum = startSurah ? parseInt(startSurah) : null;
  const endNum = endSurah ? parseInt(endSurah) : null;
  const direction = (startNum && endNum && startNum > endNum) ? "desc" : "asc";
  const isEditingPlan = !!(selectedStudent && studentPlans[selectedStudent.id]);
  const previousRangesCount = [
    normalizePreviousRange({ startSurah: prevStartSurah, startVerse: prevStartVerse || "1", endSurah: prevEndSurah, endVerse: prevEndVerse }),
    ...additionalPreviousRanges.map((range) => normalizePreviousRange(range)),
  ].filter(Boolean).length;
  const nextStartFromPrevious = hasPrevious && prevStartSurah && prevEndSurah && prevEndVerse
    && previousRangesCount === 1
    ? getNextStartFromPrevious(prevStartSurah, prevEndSurah, prevEndVerse)
    : null;
  const selectedStudentPlan = selectedStudent ? studentPlans[selectedStudent.id] ?? null : null;
  const selectedStudentCompletedDays = selectedStudent ? studentCompletedDays[selectedStudent.id] || 0 : 0;
  const hasStoredPreviousMemorization = Boolean(
    (selectedStudent?.completed_juzs?.length || 0) > 0 ||
    (selectedStudent?.memorized_start_surah && selectedStudent?.memorized_end_surah),
  );
  const shouldHidePreviousToggle = hasStoredPreviousMemorization;
  const completedJuzSet = new Set(selectedStudent?.completed_juzs || []);
  const lockedPreviousRange = selectedStudent
    ? getLockedPreviousRange(selectedStudent, selectedStudentPlan, selectedStudentCompletedDays)
    : null;
  const pendingMasteryJuzs = (selectedStudent?.current_juzs || []).filter((juzNumber) => (
    !completedJuzSet.has(juzNumber)
    && !isJuzFullyCoveredByRange(juzNumber, lockedPreviousRange)
  ));
  const masteryJuzLabel = formatJuzList(pendingMasteryJuzs);
  const isMasteryOnlyStudent = pendingMasteryJuzs.length > 0 && !hasStoredPreviousMemorization;
  const completedJuzBounds = (selectedStudent?.completed_juzs || [])
    .map((juzNumber) => getJuzBounds(juzNumber))
    .filter((bounds): bounds is NonNullable<ReturnType<typeof getJuzBounds>> => Boolean(bounds));
  const isAyahBlockedByCompletedJuzs = (surahNumber: number, verseNumber: number) => {
    if (completedJuzBounds.length === 0) return false;

    return completedJuzBounds.some((bounds) => (
      compareAyahRefs(surahNumber, verseNumber, bounds.startSurahNumber, bounds.startVerseNumber) >= 0
      && compareAyahRefs(surahNumber, verseNumber, bounds.endSurahNumber, bounds.endVerseNumber) <= 0
    ));
  };
  const getAvailableVerseNumbers = (surahNumber: number, minVerse: number, maxVerse: number) => {
    if (maxVerse < minVerse) return [];

    return Array.from({ length: maxVerse - minVerse + 1 }, (_, index) => minVerse + index)
      .filter((verseNumber) => !isAyahBlockedByCompletedJuzs(surahNumber, verseNumber));
  };
  const isSurahBlockedByCompletedJuzs = (surahNumber: number, minVerse = 1, maxVerse?: number) => {
    const surah = SURAHS.find((item) => item.number === surahNumber);
    if (!surah) return true;

    const safeMaxVerse = Math.min(maxVerse ?? surah.verseCount, surah.verseCount);
    return getAvailableVerseNumbers(surahNumber, Math.max(1, minVerse), safeMaxVerse).length === 0;
  };
  const getNormalizedPreviousRanges = (options?: { excludePrimary?: boolean; excludeAdditionalIndex?: number }) => {
    const ranges: Array<NonNullable<ReturnType<typeof normalizePreviousRange>>> = [];

    if (!options?.excludePrimary) {
      const primaryRange = normalizePreviousRange({
        startSurah: prevStartSurah,
        startVerse: prevStartVerse || "1",
        endSurah: prevEndSurah,
        endVerse: prevEndVerse,
      });

      if (primaryRange) {
        ranges.push(primaryRange);
      }
    }

    additionalPreviousRanges.forEach((range, index) => {
      if (options?.excludeAdditionalIndex === index) {
        return;
      }

      const normalizedRange = normalizePreviousRange(range);
      if (normalizedRange) {
        ranges.push(normalizedRange);
      }
    });

    return ranges;
  };
  const getBlockedPreviousVerseNumbers = (surahNumber: number, options?: { excludePrimary?: boolean; excludeAdditionalIndex?: number }) => {
    return new Set(
      getNormalizedPreviousRanges(options).flatMap((range) => getCoveredVerseNumbersForPreviousRangeInSurah(range, surahNumber)),
    );
  };
  const getPreviousVerseOptionsForSurah = (surahValue: string, options?: { excludePrimary?: boolean; excludeAdditionalIndex?: number; minVerse?: number }) => {
    const surahNumber = parseInt(surahValue || "0", 10);
    const surah = SURAHS.find((item) => item.number === surahNumber);

    if (!surah) {
      return [];
    }

    const minVerse = Math.max(1, options?.minVerse || 1);
    const blockedVerseNumbers = getBlockedPreviousVerseNumbers(surah.number, options);

    return getAvailableVerseNumbers(surah.number, minVerse, surah.verseCount)
      .filter((verseNumber) => !blockedVerseNumbers.has(verseNumber));
  };
  const getPlanVerseOptionsForSurah = (surahValue: string) => {
    const surahNumber = parseInt(surahValue || "0", 10);
    const surah = SURAHS.find((item) => item.number === surahNumber);

    if (!surah) {
      return [];
    }

    return getAvailableVerseNumbers(surah.number, 1, surah.verseCount)
      .filter((verseNumber) => !getBlockedPreviousVerseNumbers(surah.number).has(verseNumber));
  };
  const getSelectablePreviousSurahs = (currentValue: string, options?: { excludePrimary?: boolean; excludeAdditionalIndex?: number }) => {
    return SURAHS.filter((surah) => (
      currentValue === String(surah.number) || getPreviousVerseOptionsForSurah(String(surah.number), options).length > 0
    ));
  };
  const primaryPrevStartSurahOptions = getSelectablePreviousSurahs(prevStartSurah, { excludePrimary: true });
  const primaryPrevEndSurahOptions = getSelectablePreviousSurahs(prevEndSurah, { excludePrimary: true });

  // خيارات بداية الخطة
  const startSurahOptions = (() => {
    return SURAHS.filter((surah) => getPlanVerseOptionsForSurah(String(surah.number)).length > 0);
  })();

  const startVerseOptions = (() => {
    if (!startSurah) return [];

    const selectedSurah = SURAHS.find((s) => s.number === parseInt(startSurah));
    if (!selectedSurah) return [];

    const verseCount = selectedSurah.verseCount;
    return getPlanVerseOptionsForSurah(String(selectedSurah.number));
  })();

  const prevStartVerseOptions = (() => {
    if (!prevStartSurah) return [];

    return getPreviousVerseOptionsForSurah(prevStartSurah, { excludePrimary: true });
  })();

  // قائمة السور المتاحة لنهاية الخطة
  const endSurahOptions = (() => {
    if (!startNum) return startSurahOptions;

    return startSurahOptions
      .filter((surah) => {
        if (endSurah && surah.number === parseInt(endSurah, 10)) return true;

        const minVerse = startNum && surah.number === startNum && startVerse
          ? parseInt(startVerse, 10)
          : 1;

        return !isSurahBlockedByCompletedJuzs(surah.number, minVerse);
      })
      .slice()
      .sort((left, right) => left.number - right.number);
  })();

  const endVerseOptions = (() => {
    if (!endSurah) return [];

    const selectedSurah = SURAHS.find((s) => s.number === parseInt(endSurah));
    if (!selectedSurah) return [];

    let minVerse = 1;
    let maxVerse = selectedSurah.verseCount;

    if (startNum && endNum && startNum === endNum && startVerse) {
      minVerse = parseInt(startVerse, 10);
    }

    return getAvailableVerseNumbers(selectedSurah.number, minVerse, maxVerse);
  })();

  const prevEndVerseOptions = (() => {
    if (!prevEndSurah) return [];

    return getPreviousVerseOptionsForSurah(prevEndSurah, {
      excludePrimary: true,
      minVerse: prevStartSurah && prevStartVerse && prevStartSurah === prevEndSurah
        ? parseInt(prevStartVerse, 10)
        : 1,
    });
  })();

  // إعادة تعيين النهاية إذا أصبحت غير صالحة
  const isEndValid =
    endNum !== null && endSurahOptions.some((s) => s.number === endNum);
  const previewTotal =
    startSurah && endSurah && isEndValid
      ? getAdjustedPreviewRange({
          startSurahNumber: parseInt(startSurah),
          startVerseNumber: startVerse ? parseInt(startVerse) : 1,
          endSurahNumber: parseInt(endSurah),
          endVerseNumber: endVerse ? parseInt(endVerse) : (SURAHS.find((s) => s.number === parseInt(endSurah))?.verseCount || 1),
          dailyPages: parseFloat(dailyPages),
          direction,
          prevStartSurah,
          prevStartVerse,
          prevEndSurah,
          prevEndVerse,
          previousMemorizationRanges: [
            { startSurah: prevStartSurah, startVerse: prevStartVerse || "1", endSurah: prevEndSurah, endVerse: prevEndVerse },
            ...additionalPreviousRanges,
          ],
          completedJuzs: selectedStudent?.completed_juzs,
        }).totalPages
      : 0;
  const previewDays =
    startSurah && endSurah && isEndValid
      ? getAdjustedPreviewRange({
          startSurahNumber: parseInt(startSurah),
          startVerseNumber: startVerse ? parseInt(startVerse) : 1,
          endSurahNumber: parseInt(endSurah),
          endVerseNumber: endVerse ? parseInt(endVerse) : (SURAHS.find((s) => s.number === parseInt(endSurah))?.verseCount || 1),
          dailyPages: parseFloat(dailyPages),
          direction,
          prevStartSurah,
          prevStartVerse,
          prevEndSurah,
          prevEndVerse,
          previousMemorizationRanges: [
            { startSurah: prevStartSurah, startVerse: prevStartVerse || "1", endSurah: prevEndSurah, endVerse: prevEndVerse },
            ...additionalPreviousRanges,
          ],
          completedJuzs: selectedStudent?.completed_juzs,
        }).totalDays
      : 0;
  const previewDisplayTotal = previewTotal > 0 ? Math.ceil(previewTotal) : 0;

  useEffect(() => {
    if (startOpen && startSurah) {
      setTimeout(() => {
        document
          .getElementById(`start-surah-${startSurah}`)
          ?.scrollIntoView({ block: "center" });
      }, 50);
    }
  }, [startOpen, startSurah]);

  useEffect(() => {
    if (endOpen && endSurah) {
      setTimeout(() => {
        document
          .getElementById(`end-surah-${endSurah}`)
          ?.scrollIntoView({ block: "center" });
      }, 50);
    }
  }, [endOpen, endSurah]);

  useEffect(() => {
    if (prevStartOpen && prevStartSurah) {
      setTimeout(() => {
        document
          .getElementById(`prev-start-surah-${prevStartSurah}`)
          ?.scrollIntoView({ block: "center" });
      }, 50);
    }
  }, [prevStartOpen, prevStartSurah]);

  useEffect(() => {
    if (prevEndOpen && prevEndSurah) {
      setTimeout(() => {
        document
          .getElementById(`prev-end-surah-${prevEndSurah}`)
          ?.scrollIntoView({ block: "center" });
      }, 50);
    }
  }, [prevEndOpen, prevEndSurah]);

  useEffect(() => {
    if (!hasPrevious || !prevStartSurah || !prevEndSurah || !prevEndVerse) return;

    const nextStart = getNextStartFromPrevious(prevStartSurah, prevEndSurah, prevEndVerse);
    if (!nextStart) return;

    setStartSurah(String(nextStart.surahNumber));
    setStartVerse(String(nextStart.verseNumber));
  }, [hasPrevious, prevStartSurah, prevEndSurah, prevEndVerse]);

  useEffect(() => {
    if (!startNum) return;

    const preferredDirection = hasPrevious && prevStartSurah && prevEndSurah && parseInt(prevStartSurah, 10) > parseInt(prevEndSurah, 10)
      ? "desc"
      : "asc";

    const autoEndSurah = String(getPreferredEndSurah(startSurahOptions, startNum, preferredDirection));
    if (!endSurah || !endSurahOptions.some((surah) => surah.number === parseInt(endSurah, 10))) {
      setEndSurah(autoEndSurah);
    }
  }, [endSurah, endSurahOptions, hasPrevious, prevEndSurah, prevStartSurah, startNum, startSurahOptions]);

  useEffect(() => {
    if (!startVerseOptions.length) {
      if (startVerse) setStartVerse("");
      return;
    }

    if (hasPrevious && nextStartFromPrevious && startNum === nextStartFromPrevious.surahNumber) {
      const expectedStartVerse = String(nextStartFromPrevious.verseNumber);
      if (startVerse !== expectedStartVerse) {
        setStartVerse(expectedStartVerse);
      }
      return;
    }

    if (!startVerse || !startVerseOptions.includes(parseInt(startVerse, 10))) {
      setStartVerse(String(startVerseOptions[0]));
    }
  }, [hasPrevious, nextStartFromPrevious, startNum, startVerse, startVerseOptions]);

  useEffect(() => {
    if (!prevStartVerseOptions.length) {
      if (prevStartVerse) setPrevStartVerse("");
      return;
    }

    if (!prevStartVerse || !prevStartVerseOptions.includes(parseInt(prevStartVerse, 10))) {
      setPrevStartVerse(String(prevStartVerseOptions[0]));
    }
  }, [prevStartVerse, prevStartVerseOptions]);

  useEffect(() => {
    if (!endVerseOptions.length) {
      if (endVerse) setEndVerse("");
      return;
    }

    if (!endVerse || !endVerseOptions.includes(parseInt(endVerse, 10))) {
      setEndVerse(String(endVerseOptions[endVerseOptions.length - 1]));
    }
  }, [endVerse, endVerseOptions]);

  useEffect(() => {
    if (!prevEndVerseOptions.length) {
      if (prevEndVerse) setPrevEndVerse("");
      return;
    }

    if (!prevEndVerse || !prevEndVerseOptions.includes(parseInt(prevEndVerse, 10))) {
      setPrevEndVerse(String(prevEndVerseOptions[prevEndVerseOptions.length - 1]));
    }
  }, [prevEndVerse, prevEndVerseOptions]);

  if (isLoading) {
    return <SiteLoader fullScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]">
      <Header />
      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-5xl space-y-8">
          {/* رأس الصفحة */}
          <div className="border-b border-[#3453a7]/20 pb-6 flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <BookMarked className="w-5 h-5 text-[#003f55]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1a2332]">خطط الطلاب</h1>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#3453a7]/20 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-[#3453a7]/20 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#003f55]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1a2332]">
                    {selectedCircle || "طلاب الحلقة"}
                  </h2>
                  <p className="text-xs text-neutral-400">
                    {selectedCircle ? `${students.length} طالب` : "اختر الحلقة لعرض الخطط"}
                  </p>
                </div>
              </div>

              <div className="flex w-full items-center gap-2 md:w-auto">
                {isCirclesLoading ? (
                  <div className="flex justify-center py-2 md:w-[280px]">
                    <SiteLoader size="sm" />
                  </div>
                ) : circles.length === 0 ? (
                  <div className="text-sm text-neutral-400">لا توجد حلقات</div>
                ) : (
                  <>
                    {selectedCircle && (
                      <button
                        onClick={openResetDialog}
                        className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                      >
                        إعادة حفظ طالب
                      </button>
                    )}
                    <Select
                      value={selectedCircle || undefined}
                      onValueChange={(value) => setSelectedCircle(value)}
                      dir="rtl"
                    >
                      <SelectTrigger className="w-full bg-white text-sm md:w-[280px]">
                        <SelectValue placeholder="اختر الحلقة" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {circles.map((circle) => (
                          <SelectItem key={circle.id} value={circle.name}>
                            {circle.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </div>

            {!selectedCircle ? (
              <div className="flex items-center justify-center py-16 text-neutral-400">
                اختر الحلقة من الأعلى لعرض طلابها وخططهم
              </div>
            ) : isCircleDataLoading ? (
              <div className="flex justify-center py-16">
                <SiteLoader size="lg" />
              </div>
            ) : students.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-neutral-400">
                لا يوجد طلاب في هذه الحلقة
              </div>
            ) : (
              <div className="divide-y divide-[#3453a7]/10">
                {students.map((student) => {
                  const plan = studentPlans[student.id];
                  const progress = studentProgress[student.id] || 0;
                  const hasStoredMemorized = Boolean(
                    (student.completed_juzs?.length || 0) > 0 ||
                    (student.memorized_start_surah && student.memorized_end_surah),
                  );
                  return (
                    <div
                      key={student.id}
                      className="px-6 py-4 flex items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-[#1a2332] text-sm">
                            {student.name}
                          </p>
                          {plan && (
                            <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0">
                              لديه خطة
                            </Badge>
                          )}
                        </div>
                        {plan ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold bg-[#eaf1ff] text-[#27428d] border border-[#8fb1ff] rounded-md px-1.5 py-0.5 shrink-0">
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
                                    background: "linear-gradient(to right, #3453a7, #4a67b7)",
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-[#3453a7] w-8 text-left">
                                {progress}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-400">
                            لا توجد خطة
                          </p>
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
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${plan
                            ? "bg-[#3453a7] hover:bg-[#27428d] text-white border border-[#3453a7]"
                            : "bg-[#eaf1ff] hover:bg-[#dbe7ff] text-[#27428d] border border-[#8fb1ff]"
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {plan ? "تعديل الخطة" : "إضافة خطة"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* نافذة إضافة الخطة */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-md bg-white rounded-2xl p-0 overflow-hidden"
          dir="rtl"
        >
          <DialogHeader className="px-6 py-5 border-b border-[#3453a7]/20 bg-gradient-to-r from-[#3453a7]/8 to-transparent">
            <DialogTitle className="flex w-full items-center justify-start gap-2 pl-1 text-left text-lg font-bold text-[#1a2332]">
              <Target className="w-5 h-5 text-[#003f55]" />
              {isEditingPlan ? "تعديل خطة حفظ" : "إضافة خطة حفظ"}{selectedStudent ? ` — ${selectedStudent.name}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
            {masteryJuzLabel && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-semibold text-sky-700">
                أجزاء تحتاج إلى إتقان: {masteryJuzLabel}.
              </div>
            )}
            {/* الحفظ السابق وطريقة المراجعة والربط */}
            {!isMasteryOnlyStudent && (
            <div className="space-y-2 pt-2 pb-2 border-y border-[#3453a7]/15">
              {!shouldHidePreviousToggle && (
                <label
                  className="plan-history-checkbox text-sm font-semibold text-[#1a2332]"
                  onClick={(e) => {
                    if (!isPreviousLocked) return;

                    e.preventDefault();
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
              )}

              {isPreviousLocked && hasPrevious && (
                <p className="text-[11px] font-medium text-[#8a6f1f]">الحفظ السابق مقفل لأنه محفوظ فعلياً، ويجب حذف الخطة إذا أردت إعادة حفظ الطالب.</p>
              )}

              {hasPrevious && !(isEditingPlan && isPreviousLocked) && (
                <div className="mt-2 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* بداية الحفظ السابق */}
                    <div className="space-y-1.5 flex flex-col w-full">
                      <label className="text-xs font-semibold text-[#1a2332]">
                        بداية الحفظ السابق
                      </label>
                      <div className="flex items-center gap-2 w-full">
                        <Popover open={isPreviousLocked ? false : prevStartOpen} onOpenChange={(open) => {
                          if (!isPreviousLocked) setPrevStartOpen(open);
                        }}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              disabled={isPreviousLocked}
                              className={`flex-1 flex items-center justify-between px-3 h-9 rounded-lg border border-[#8fb1ff] text-xs bg-white text-right transition-colors ${isPreviousLocked ? "cursor-not-allowed opacity-70" : "hover:border-[#3453a7]"}`}
                            >
                              <span className={prevStartSurah ? "text-[#1a2332] font-medium" : "text-neutral-400"}>
                                {prevStartSurah
                                  ? SURAHS.find((s) => s.number === parseInt(prevStartSurah))?.name
                                  : "اختر السورة"}
                              </span>
                              <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-0" align="start" dir="rtl">
                            <Command className="overflow-visible border-[#8fb1ff]">
                              <CommandInput placeholder="ابحث عن سورة..." className="text-xs h-8" />
                              <CommandEmpty>لا توجد نتائج</CommandEmpty>
                              <CommandList className="max-h-48 overflow-y-auto surah-scroll" onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }}>
                                {primaryPrevStartSurahOptions.map((s) => (
                                  <CommandItem key={s.number} id={`prevStartSurah-${s.number}`} value={s.name} onSelect={() => { setPrevStartSurah(s.number.toString()); setPrevStartOpen(false); setPrevStartVerse(""); }}>
                                    {s.name}
                                    {prevStartSurah === s.number.toString() && <Check className="w-3.5 h-3.5 mr-auto text-[#003f55]" />}
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        <Select value={prevStartVerse} onValueChange={setPrevStartVerse} disabled={isPreviousLocked || !prevStartSurah || prevStartVerseOptions.length === 0}>
                          <SelectTrigger className="w-[80px] h-9 border-[#8fb1ff] text-xs bg-white px-2" dir="rtl">
                            <SelectValue placeholder="الآية" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="max-h-48">
                            {prevStartVerseOptions.map((v) => (
                                <SelectItem key={v} value={v.toString()} className="text-xs text-right">
                                  {v}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* نهاية الحفظ السابق */}
                    <div className="space-y-1.5 flex flex-col w-full">
                      <label className="text-xs font-semibold text-[#1a2332]">
                        نهاية الحفظ السابق
                      </label>
                      <div className="flex items-center gap-2 w-full">
                        <Popover open={isPreviousLocked ? false : prevEndOpen} onOpenChange={(open) => {
                          if (!isPreviousLocked) setPrevEndOpen(open);
                        }}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              disabled={isPreviousLocked}
                              className={`flex-1 flex items-center justify-between px-3 h-9 rounded-lg border border-[#8fb1ff] text-xs bg-white text-right transition-colors ${isPreviousLocked ? "cursor-not-allowed opacity-70" : "hover:border-[#3453a7]"}`}
                            >
                              <span className={prevEndSurah ? "text-[#1a2332] font-medium" : "text-neutral-400"}>
                                {prevEndSurah
                                  ? SURAHS.find((s) => s.number === parseInt(prevEndSurah))?.name
                                  : "اختر السورة"}
                              </span>
                              <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-0" align="start" dir="rtl">
                            <Command className="overflow-visible border-[#8fb1ff]">
                              <CommandInput placeholder="ابحث عن سورة..." className="text-xs h-8" />
                              <CommandEmpty>لا توجد نتائج</CommandEmpty>
                              <CommandList className="max-h-48 overflow-y-auto surah-scroll" onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }}>
                                {primaryPrevEndSurahOptions.map((s) => (
                                  <CommandItem key={s.number} id={`prevEndSurah-${s.number}`} value={s.name} onSelect={() => { setPrevEndSurah(s.number.toString()); setPrevEndOpen(false); setPrevEndVerse(""); }}>
                                    {s.name}
                                    {prevEndSurah === s.number.toString() && <Check className="w-3.5 h-3.5 mr-auto text-[#003f55]" />}
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        <Select value={prevEndVerse} onValueChange={setPrevEndVerse} disabled={isPreviousLocked || !prevEndSurah || prevEndVerseOptions.length === 0}>
                          <SelectTrigger className="w-[80px] h-9 border-[#8fb1ff] text-xs bg-white px-2" dir="rtl">
                            <SelectValue placeholder="الآية" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="max-h-48">
                            {prevEndVerseOptions.map((v) => (
                                <SelectItem key={v} value={v.toString()} className="text-xs text-right">
                                  {v}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAdditionalPreviousRanges((current) => [...current, createEmptyPreviousRange()])}
                      disabled={isPreviousLocked}
                      className="h-9 rounded-lg border-[#8fb1ff] px-3 text-xs text-[#3453a7] hover:bg-[#eaf1ff]"
                    >
                      <Plus className="ml-1 h-3.5 w-3.5" />
                      إضافة محفوظ سابق
                    </Button>

                    {additionalPreviousRanges.map((range, index) => {
                      const additionalStartSurahOptions = getSelectablePreviousSurahs(range.startSurah, { excludeAdditionalIndex: index });
                      const additionalEndSurahOptions = getSelectablePreviousSurahs(range.endSurah, { excludeAdditionalIndex: index });
                      const additionalStartVerseOptions = getPreviousVerseOptionsForSurah(range.startSurah, { excludeAdditionalIndex: index });
                      const additionalEndVerseOptions = getPreviousVerseOptionsForSurah(range.endSurah, {
                        excludeAdditionalIndex: index,
                        minVerse: range.startSurah && range.startVerse && range.startSurah === range.endSurah
                          ? parseInt(range.startVerse, 10)
                          : 1,
                      });

                      return (
                        <div key={`additional-previous-range-${index}`} className="space-y-3">
                          <div className="flex justify-start">
                            <button
                              type="button"
                              onClick={() => {
                                setAdditionalPreviousRanges((current) => current.filter((_, currentIndex) => currentIndex !== index));
                                setAdditionalPrevStartOpenIndex(null);
                                setAdditionalPrevEndOpenIndex(null);
                              }}
                              disabled={isPreviousLocked}
                              className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 disabled:opacity-50"
                            >
                              حذف
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5 flex flex-col w-full">
                              <label className="text-xs font-semibold text-[#1a2332]">بداية الحفظ السابق</label>
                              <div className="flex items-center gap-2 w-full">
                                <Popover open={isPreviousLocked ? false : additionalPrevStartOpenIndex === index} onOpenChange={(open) => {
                                  if (!isPreviousLocked) setAdditionalPrevStartOpenIndex(open ? index : null);
                                }}>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      disabled={isPreviousLocked}
                                      className={`flex-1 flex items-center justify-between px-3 h-9 rounded-lg border border-[#8fb1ff] text-xs bg-white text-right transition-colors ${isPreviousLocked ? "cursor-not-allowed opacity-70" : "hover:border-[#3453a7]"}`}
                                    >
                                      <span className={range.startSurah ? "text-[#1a2332] font-medium" : "text-neutral-400"}>
                                        {range.startSurah
                                          ? SURAHS.find((surah) => surah.number === parseInt(range.startSurah, 10))?.name
                                          : "اختر السورة"}
                                      </span>
                                      <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-48 p-0" align="start" dir="rtl">
                                    <Command className="overflow-visible border-[#8fb1ff]">
                                      <CommandInput placeholder="ابحث عن سورة..." className="text-xs h-8" />
                                      <CommandEmpty>لا توجد نتائج</CommandEmpty>
                                      <CommandList className="max-h-48 overflow-y-auto surah-scroll" onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }}>
                                        {additionalStartSurahOptions.map((surah) => (
                                          <CommandItem
                                            key={`additional-prev-start-${index}-${surah.number}`}
                                            id={`additional-prev-start-${index}-${surah.number}`}
                                            value={surah.name}
                                            onSelect={() => {
                                              const nextStartVerseOptions = getPreviousVerseOptionsForSurah(surah.number.toString(), { excludeAdditionalIndex: index });
                                              updateAdditionalPreviousRange(index, {
                                                startSurah: surah.number.toString(),
                                                startVerse: nextStartVerseOptions[0] ? String(nextStartVerseOptions[0]) : "",
                                              });
                                              setAdditionalPrevStartOpenIndex(null);
                                            }}
                                          >
                                            {surah.name}
                                            {range.startSurah === surah.number.toString() && <Check className="w-3.5 h-3.5 mr-auto text-[#003f55]" />}
                                          </CommandItem>
                                        ))}
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>

                                <Select value={range.startVerse} onValueChange={(value) => updateAdditionalPreviousRange(index, { startVerse: value })} disabled={isPreviousLocked || !range.startSurah || additionalStartVerseOptions.length === 0}>
                                  <SelectTrigger className="w-[80px] h-9 border-[#8fb1ff] text-xs bg-white px-2" dir="rtl">
                                    <SelectValue placeholder="الآية" />
                                  </SelectTrigger>
                                  <SelectContent dir="rtl" className="max-h-48">
                                    {additionalStartVerseOptions.map((verse) => (
                                      <SelectItem key={`additional-prev-start-verse-${index}-${verse}`} value={verse.toString()} className="text-xs text-right">
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
                                <Popover open={isPreviousLocked ? false : additionalPrevEndOpenIndex === index} onOpenChange={(open) => {
                                  if (!isPreviousLocked) setAdditionalPrevEndOpenIndex(open ? index : null);
                                }}>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      disabled={isPreviousLocked}
                                      className={`flex-1 flex items-center justify-between px-3 h-9 rounded-lg border border-[#8fb1ff] text-xs bg-white text-right transition-colors ${isPreviousLocked ? "cursor-not-allowed opacity-70" : "hover:border-[#3453a7]"}`}
                                    >
                                      <span className={range.endSurah ? "text-[#1a2332] font-medium" : "text-neutral-400"}>
                                        {range.endSurah
                                          ? SURAHS.find((surah) => surah.number === parseInt(range.endSurah, 10))?.name
                                          : "اختر السورة"}
                                      </span>
                                      <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-48 p-0" align="start" dir="rtl">
                                    <Command className="overflow-visible border-[#8fb1ff]">
                                      <CommandInput placeholder="ابحث عن سورة..." className="text-xs h-8" />
                                      <CommandEmpty>لا توجد نتائج</CommandEmpty>
                                      <CommandList className="max-h-48 overflow-y-auto surah-scroll" onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }}>
                                        {additionalEndSurahOptions.map((surah) => (
                                          <CommandItem
                                            key={`additional-prev-end-${index}-${surah.number}`}
                                            id={`additional-prev-end-${index}-${surah.number}`}
                                            value={surah.name}
                                            onSelect={() => {
                                              const nextEndVerseOptions = getPreviousVerseOptionsForSurah(surah.number.toString(), {
                                                excludeAdditionalIndex: index,
                                                minVerse: range.startSurah && range.startVerse && range.startSurah === surah.number.toString()
                                                  ? parseInt(range.startVerse, 10)
                                                  : 1,
                                              });
                                              updateAdditionalPreviousRange(index, {
                                                endSurah: surah.number.toString(),
                                                endVerse: nextEndVerseOptions.length > 0 ? String(nextEndVerseOptions[nextEndVerseOptions.length - 1]) : "",
                                              });
                                              setAdditionalPrevEndOpenIndex(null);
                                            }}
                                          >
                                            {surah.name}
                                            {range.endSurah === surah.number.toString() && <Check className="w-3.5 h-3.5 mr-auto text-[#003f55]" />}
                                          </CommandItem>
                                        ))}
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>

                                <Select value={range.endVerse} onValueChange={(value) => updateAdditionalPreviousRange(index, { endVerse: value })} disabled={isPreviousLocked || !range.endSurah || additionalEndVerseOptions.length === 0}>
                                  <SelectTrigger className="w-[80px] h-9 border-[#8fb1ff] text-xs bg-white px-2" dir="rtl">
                                    <SelectValue placeholder="الآية" />
                                  </SelectTrigger>
                                  <SelectContent dir="rtl" className="max-h-48">
                                    {additionalEndVerseOptions.map((verse) => (
                                      <SelectItem key={`additional-prev-end-verse-${index}-${verse}`} value={verse.toString()} className="text-xs text-right">
                                        {verse}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            )}

            {/* بداية ونهاية الخطة والمقدار اليومي */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5 flex flex-col w-full">
                <label className="text-sm font-semibold text-[#1a2332]">
                  بداية الخطة
                </label>
                
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Popover open={startOpen} onOpenChange={setStartOpen}>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center justify-between px-3 h-10 rounded-xl border border-[#8fb1ff] text-sm bg-white text-right hover:border-[#3453a7] transition-colors">
                      <span
                        className={
                          startSurah
                            ? "text-[#1a2332] font-medium"
                            : "text-neutral-400"
                        }
                      >
                        {startSurah
                          ? SURAHS.find(
                              (s) => s.number === parseInt(startSurah),
                            )?.name
                          : "اختر السورة"}
                      </span>
                      <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-0" align="start" dir="rtl">
                    <Command className="overflow-visible">
                      <CommandInput
                        placeholder="ابحث عن سورة..."
                        className="text-sm h-9"
                      />
                      <CommandEmpty>لا توجد نتائج</CommandEmpty>
                      <CommandList
                        className="max-h-52 overflow-y-auto surah-scroll"
                        onWheel={(e) => {
                          e.stopPropagation();
                          e.currentTarget.scrollTop += e.deltaY;
                        }}
                      >
                        {startSurahOptions.map((s) => (
                          <CommandItem
                            key={s.number}
                            id={`start-surah-${s.number}`}
                            value={s.name}
                            onSelect={() => {
                              setStartSurah(String(s.number));
                              setStartOpen(false);
                            }}
                            className="flex items-center justify-between"
                          >
                            {s.name}
                            {startSurah === String(s.number) && (
                              <Check className="w-3.5 h-3.5 text-[#003f55]" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                    </div>
                    
                      <Select value={startVerse} onValueChange={setStartVerse} disabled={!startSurah || startVerseOptions.length === 0}>
                          <SelectTrigger className="w-[80px] h-10 border-[#8fb1ff] hover:border-[#3453a7] transition-colors rounded-xl bg-white text-sm" dir="rtl">
                            <SelectValue placeholder="الآية" />
                          </SelectTrigger>
                          <SelectContent className="max-h-48" dir="rtl">
                            {startVerseOptions.map((v) => (
                                <SelectItem key={v} value={v.toString()} className="text-right">
                                  {v}
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                  </div>
              </div>
              <div className="space-y-1.5 flex flex-col w-full">
                <label className="text-sm font-semibold text-[#1a2332]">
                  نهاية الخطة
                </label>
                
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Popover open={endOpen} onOpenChange={setEndOpen}>
                  <PopoverTrigger asChild>
                    <button className="w-full flex items-center justify-between px-3 h-10 rounded-xl border border-[#8fb1ff] text-sm bg-white text-right hover:border-[#3453a7] transition-colors">
                      <span
                        className={
                          isEndValid
                            ? "text-[#1a2332] font-medium"
                            : "text-neutral-400"
                        }
                      >
                        {isEndValid
                          ? SURAHS.find((s) => s.number === parseInt(endSurah))
                              ?.name
                          : "اختر السورة"}
                      </span>
                      <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-0" align="start" dir="rtl">
                    <Command className="overflow-visible">
                      <CommandInput
                        placeholder="ابحث عن سورة..."
                        className="text-sm h-9"
                      />
                      <CommandEmpty>لا توجد نتائج</CommandEmpty>
                      <CommandList
                        className="max-h-52 overflow-y-auto surah-scroll"
                        onWheel={(e) => {
                          e.stopPropagation();
                          e.currentTarget.scrollTop += e.deltaY;
                        }}
                      >
                        {endSurahOptions.map((s) => (
                          <CommandItem
                            key={s.number}
                            id={`end-surah-${s.number}`}
                            value={s.name}
                            onSelect={() => {
                              setEndSurah(String(s.number));
                              setEndOpen(false);
                            }}
                            className="flex items-center justify-between"
                          >
                            {s.name}
                            {endSurah === String(s.number) && (
                              <Check className="w-3.5 h-3.5 text-[#003f55]" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                    </div>
                    <Select value={endVerse} onValueChange={setEndVerse} disabled={!endSurah || endVerseOptions.length === 0}>
                          <SelectTrigger className="w-[80px] h-10 border-[#8fb1ff] hover:border-[#3453a7] transition-colors rounded-xl bg-white text-sm" dir="rtl">
                            <SelectValue placeholder="الآية" />
                          </SelectTrigger>
                          <SelectContent className="max-h-48" dir="rtl">
                            {endVerseOptions.map((v) => (
                                <SelectItem key={v} value={v.toString()} className="text-right">
                                  {v}
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select></div>
                {startSurah && endSurahOptions.length === 0 && (
                  <p className="text-[11px] text-red-400">لا توجد سور صالحة</p>
                )}
              </div>

            </div>
            
            <div className="grid grid-cols-1 gap-3 mb-2 pb-2">
              <div className="space-y-1.5 flex min-w-0 flex-col w-full">
                <label className="text-sm font-semibold text-[#1a2332]">
                  المقدار اليومي
                </label>
                <Select value={dailyPages} onValueChange={setDailyPages}>
                  <SelectTrigger
                    className="border-[#8fb1ff] focus:border-[#3453a7] rounded-xl text-right bg-white"
                    dir="rtl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {DAILY_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="text-right dir-rtl"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-sm font-semibold text-[#1a2332]">
                  طريقة المراجعة
                </label>
                <Select
                  value={muraajaaPages}
                  onValueChange={setMuraajaaPages}
                  dir="rtl"
                >
                  <SelectTrigger
                    className="border-[#8fb1ff] focus:border-[#3453a7] rounded-xl text-right bg-white"
                    dir="rtl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {MURAAJAA_OPTIONS.map((o) => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="text-right dir-rtl"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {muraajaaPages === WEEKLY_REVIEW_OPTION_VALUE && (
                  <div className="space-y-2 rounded-xl border border-[#8fb1ff]/35 bg-[#f7faff] p-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#1a2332]">عدد أيام القسمة</label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={reviewDistributionDays}
                        onChange={(event) => setReviewDistributionDays(event.target.value)}
                        className="h-9 border-[#8fb1ff] bg-white text-sm"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#1a2332]">الحد الأدنى اليومي للمراجعة</label>
                      <Input
                        type="number"
                        min="0.25"
                        step="0.25"
                        value={reviewMinimumPages}
                        onChange={(event) => setReviewMinimumPages(event.target.value)}
                        className="h-9 border-[#8fb1ff] bg-white text-sm"
                        dir="ltr"
                      />
                    </div>
                    <p className="text-[11px] font-medium text-neutral-500">
                      يقسم النظام رصيد المراجعة على عدد الأيام المحدد، ثم يطبق الحد الأدنى اليومي داخل هذا النطاق.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 min-w-0">
                <label className="text-sm font-semibold text-[#1a2332]">
                  مقدار الربط اليومي
                </label>
                <Select
                  value={rabtPages}
                  onValueChange={setRabtPages}
                  dir="rtl"
                >
                  <SelectTrigger
                    className="border-[#8fb1ff] focus:border-[#3453a7] rounded-xl text-right bg-white"
                    dir="rtl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {RABT_OPTIONS.map((o) => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="text-right dir-rtl"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* معاينة الخطة */}
            {previewTotal > 0 &&
              (() => {
                const startNum = parseInt(startSurah);
                const endNum = parseInt(endSurah);
                const adjustedPreview = getAdjustedPreviewRange({
                  startSurahNumber: startNum,
                  startVerseNumber: startVerse ? parseInt(startVerse) : 1,
                  endSurahNumber: endNum,
                  endVerseNumber: endVerse ? parseInt(endVerse) : (SURAHS.find((s) => s.number === endNum)?.verseCount || 1),
                  dailyPages: parseFloat(dailyPages),
                  direction,
                  prevStartSurah,
                  prevStartVerse,
                  prevEndSurah,
                  prevEndVerse,
                  previousMemorizationRanges: [
                    { startSurah: prevStartSurah, startVerse: prevStartVerse || "1", endSurah: prevEndSurah, endVerse: prevEndVerse },
                    ...additionalPreviousRanges,
                  ],
                  completedJuzs: selectedStudent?.completed_juzs,
                });
                const actuallStartSurah = SURAHS.find((s) => s.number === adjustedPreview.startSurahNumber);
                const actualEndSurah =
                  direction === "asc"
                    ? SURAHS.find(
                        (s) => s.number === Math.max(startNum, endNum),
                      )
                    : SURAHS.find(
                        (s) => s.number === Math.min(startNum, endNum),
                      );
                return (
                  <div className="rounded-xl bg-[#eaf1ff] border border-[#8fb1ff] p-4 space-y-3">
                    <p className="text-xs font-bold text-[#3453a7]">
                      معاينة الخطة
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg font-semibold text-xs">
                        تبدأ من
                      </span>
                      <span className="font-bold text-[#1a2332]">
                        {actuallStartSurah?.name}
                        {adjustedPreview.startVerseNumber ? ` آية ${adjustedPreview.startVerseNumber}` : ""}
                      </span>
                      <span className="text-neutral-300">←</span>
                      <span className="text-neutral-500 text-xs">
                        {actualEndSurah?.name}
                        {endVerse ? ` آية ${endVerse}` : ""}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center">
                        <p className="text-2xl font-black text-[#1a2332]">
                          {previewDisplayTotal}
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          وجهاً إجمالاً
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black text-[#1a2332]">
                          {previewDays}
                        </p>
                        <p className="text-[11px] text-neutral-400">يوماً</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* رسالة الحفظ */}
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

          <div className="px-6 py-4 border-t border-[#8fb1ff] flex gap-3">
            <Button
              variant="outline"
              onClick={handleSavePlan}
              disabled={isSaving || !startSurah || !endSurah}
              className="flex-1 border-[#8fb1ff] text-neutral-600 rounded-xl h-10 hover:bg-[#eaf1ff]"
            >
              {isSaving ? "جاري الحفظ..." : "حفظ الخطة"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              className="border-[#003f55]/20 text-neutral-600 rounded-xl h-10 hover:bg-[#003f55]/8"
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
            {isResetDialogLoading ? (
              <div className="flex justify-center py-10"><SiteLoader size="md" /></div>
            ) : !resetDialogCircle ? (
              circles.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-10">لا توجد حلقات</p>
              ) : (
                circles.map((circle) => (
                  <button
                    key={circle.id}
                    onClick={() => setResetDialogCircle(circle.name)}
                    className="w-full flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 text-right transition-colors hover:bg-neutral-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#1a2332]">{circle.name}</p>
                      <p className="text-[11px] text-neutral-400">{circle.studentCount} طالب</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-300" />
                  </button>
                ))
              )
            ) : (
              (() => {
                const circleStudents = resetDialogStudents.filter((student) => (student.halaqah || "").trim() === resetDialogCircle.trim());

                return (
                  <div className="space-y-3">
                    {circleStudents.length === 0 ? (
                      <p className="text-sm text-neutral-400 text-center py-10">لا يوجد طلاب في هذه الحلقة</p>
                    ) : (
                      circleStudents.map((student) => {
                        const hasStoredMemorized = Boolean(
                          (student.completed_juzs?.length || 0) > 0 ||
                          (student.memorized_start_surah && student.memorized_end_surah),
                        );

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
                        );
                      })
                    )}
                  </div>
                );
              })()
            )}
          </div>

          <div className="px-6 py-4 border-t border-neutral-200 flex justify-end">
            <Button variant="outline" onClick={() => setResetDialogOpen(false)} className="rounded-xl border-[#003f55]/20 text-neutral-600 hover:bg-[#003f55]/8">
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
