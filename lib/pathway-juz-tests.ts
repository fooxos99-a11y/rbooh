import {
  getJuzCoverageFromRange,
  getContiguousCompletedJuzRange,
  getNormalizedCompletedJuzs,
  getStoredMemorizedRange,
  hasScatteredCompletedJuzs,
} from "@/lib/quran-data"

export type PathwayJuzTestStatus = "pass" | "fail"

export interface StudentMemorizationSnapshot {
  completed_juzs?: number[] | null
  current_juzs?: number[] | null
  memorized_start_surah?: number | null
  memorized_start_verse?: number | null
  memorized_end_surah?: number | null
  memorized_end_verse?: number | null
}

function getNormalizedCurrentJuzs(currentJuzs?: number[] | null) {
  return getNormalizedCompletedJuzs(currentJuzs)
}

function getEffectiveMemorizedJuzState(snapshot: StudentMemorizationSnapshot) {
  const storedRange = getStoredMemorizedRange(snapshot)
  const coveredFromRange = getJuzCoverageFromRange(storedRange)

  const completedJuzs = Array.from(
    new Set([
      ...getNormalizedCompletedJuzs(snapshot.completed_juzs),
      ...Array.from(coveredFromRange.completedJuzs),
    ]),
  ).sort((left, right) => left - right)

  const currentJuzs = Array.from(
    new Set([
      ...getNormalizedCurrentJuzs(snapshot.current_juzs),
      ...Array.from(coveredFromRange.currentJuzs),
    ]),
  ).sort((left, right) => left - right)

  return {
    completedJuzs,
    currentJuzs,
  }
}

function buildStoredMemorizedRange(completedJuzs: number[]) {
  if (completedJuzs.length === 0 || hasScatteredCompletedJuzs(completedJuzs)) {
    return {
      memorized_start_surah: null,
      memorized_start_verse: null,
      memorized_end_surah: null,
      memorized_end_verse: null,
    }
  }

  const contiguousRange = getContiguousCompletedJuzRange(completedJuzs)
  if (!contiguousRange) {
    return {
      memorized_start_surah: null,
      memorized_start_verse: null,
      memorized_end_surah: null,
      memorized_end_verse: null,
    }
  }

  return {
    memorized_start_surah: contiguousRange.startSurahNumber,
    memorized_start_verse: contiguousRange.startVerseNumber,
    memorized_end_surah: contiguousRange.endSurahNumber,
    memorized_end_verse: contiguousRange.endVerseNumber,
  }
}

export function getAvailablePathwayJuzNumbers(snapshot: StudentMemorizationSnapshot) {
  const { completedJuzs } = getEffectiveMemorizedJuzState(snapshot)

  return completedJuzs
}

export function applyPathwayJuzTestResult(
  snapshot: StudentMemorizationSnapshot,
  juzNumber: number,
  status: PathwayJuzTestStatus,
) {
  const { completedJuzs, currentJuzs } = getEffectiveMemorizedJuzState(snapshot)

  const nextCompletedJuzs = status === "pass"
    ? Array.from(new Set([...completedJuzs, juzNumber])).sort((left, right) => left - right)
    : completedJuzs.filter((value) => value !== juzNumber)
  const nextCurrentJuzs = status === "pass"
    ? currentJuzs.filter((value) => value !== juzNumber)
    : currentJuzs.filter((value) => value !== juzNumber)
  const storedRange = buildStoredMemorizedRange(nextCompletedJuzs)

  return {
    completed_juzs: nextCompletedJuzs,
    current_juzs: nextCurrentJuzs,
    ...storedRange,
  }
}