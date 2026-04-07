import {
	SURAHS,
	getJuzBounds,
	getNormalizedCompletedJuzs,
	getJuzCoverageFromRange,
	getPlanMemorizedRange,
	getStoredMemorizedRange,
} from "@/lib/quran-data"
import { getExamPortionLabel, getEquivalentPortionNumbers, getJuzNumberForPortion, normalizeExamPortionType } from "@/lib/exam-portions"
import type { ExamPortionType } from "@/lib/exam-portion-settings"

export type PreviousMemorizationRange = {
	startSurahNumber: number
	startVerseNumber: number
	endSurahNumber: number
	endVerseNumber: number
}

export type StudentExamEligibilitySource = {
	completed_juzs?: number[] | null
	current_juzs?: number[] | null
	memorized_ranges?: PreviousMemorizationRange[] | null
	memorized_start_surah?: number | null
	memorized_start_verse?: number | null
	memorized_end_surah?: number | null
	memorized_end_verse?: number | null
}

export type StudentExamPlanProgressSource = {
	direction?: "asc" | "desc" | null
	total_pages?: number | null
	daily_pages?: number | null
	has_previous?: boolean | null
	prev_start_surah?: number | null
	prev_start_verse?: number | null
	prev_end_surah?: number | null
	prev_end_verse?: number | null
	previous_memorization_ranges?: PreviousMemorizationRange[] | null
	start_surah_number?: number | null
	start_verse?: number | null
	end_surah_number?: number | null
	end_verse?: number | null
	completed_juzs?: number[] | null
}

export type StudentExamPlanProgress = {
	plan?: StudentExamPlanProgressSource | null
	completedDays?: number | null
}

export type StudentExamPortionOption = {
	portionType: ExamPortionType
	portionNumber: number
	juzNumber: number
	label: string
	isComplete: boolean
}

function getJuzCoverageFromRanges(ranges: PreviousMemorizationRange[]) {
	const completedJuzs = new Set<number>()
	const currentJuzs = new Set<number>()

	for (const range of ranges) {
		const coverage = getJuzCoverageFromRange({
			startPage: getJuzBounds(1)?.startPage || 1,
			endPage: getJuzBounds(30)?.endPage || 604,
			startSurahNumber: range.startSurahNumber,
			startVerseNumber: range.startVerseNumber,
			endSurahNumber: range.endSurahNumber,
			endVerseNumber: range.endVerseNumber,
		})

		for (const juzNumber of coverage.completedJuzs) completedJuzs.add(juzNumber)
		for (const juzNumber of coverage.currentJuzs) currentJuzs.add(juzNumber)
	}

	return { completedJuzs, currentJuzs }
}

function getPlanMemorizedRanges(plan: StudentExamPlanProgressSource, completedDays: number) {
	const range = getPlanMemorizedRange(plan, completedDays)
	if (!range) {
		return [] as PreviousMemorizationRange[]
	}

	return [{
		startSurahNumber: range.startSurahNumber,
		startVerseNumber: range.startVerseNumber,
		endSurahNumber: range.endSurahNumber,
		endVerseNumber: range.endVerseNumber,
	}]
}

export function getPendingMasteryJuzs(currentJuzs?: number[] | null, completedJuzs?: number[] | null) {
	const completedSet = new Set(getNormalizedCompletedJuzs(completedJuzs))
	return Array.from(new Set((currentJuzs || []).filter((juzNumber) => Number.isInteger(juzNumber) && juzNumber >= 1 && juzNumber <= 30)))
		.filter((juzNumber) => !completedSet.has(juzNumber))
		.sort((left, right) => left - right)
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

function intersectAyahRangeWithJuz(range: PreviousMemorizationRange, juzNumber: number) {
	const juzBounds = getJuzBounds(juzNumber)
	if (!juzBounds) {
		return null
	}

	const startIsAfterJuzEnd = compareAyahRefs(
		range.startSurahNumber,
		range.startVerseNumber,
		juzBounds.endSurahNumber,
		juzBounds.endVerseNumber,
	) > 0
	const endIsBeforeJuzStart = compareAyahRefs(
		range.endSurahNumber,
		range.endVerseNumber,
		juzBounds.startSurahNumber,
		juzBounds.startVerseNumber,
	) < 0

	if (startIsAfterJuzEnd || endIsBeforeJuzStart) {
		return null
	}

	const startRef = compareAyahRefs(
		range.startSurahNumber,
		range.startVerseNumber,
		juzBounds.startSurahNumber,
		juzBounds.startVerseNumber,
	) < 0
		? { surahNumber: juzBounds.startSurahNumber, verseNumber: juzBounds.startVerseNumber }
		: { surahNumber: range.startSurahNumber, verseNumber: range.startVerseNumber }

	const endRef = compareAyahRefs(
		range.endSurahNumber,
		range.endVerseNumber,
		juzBounds.endSurahNumber,
		juzBounds.endVerseNumber,
	) > 0
		? { surahNumber: juzBounds.endSurahNumber, verseNumber: juzBounds.endVerseNumber }
		: { surahNumber: range.endSurahNumber, verseNumber: range.endVerseNumber }

	return {
		startSurahNumber: startRef.surahNumber,
		startVerseNumber: startRef.verseNumber,
		endSurahNumber: endRef.surahNumber,
		endVerseNumber: endRef.verseNumber,
	}
}

function getStoredMemorizedRanges(student?: StudentExamEligibilitySource | null) {
	if (!student) {
		return [] as PreviousMemorizationRange[]
	}

	const directRange = getStoredMemorizedRange(student)
	const ranges = [...(student.memorized_ranges || [])]
	if (directRange) {
		ranges.push({
			startSurahNumber: directRange.startSurahNumber,
			startVerseNumber: directRange.startVerseNumber,
			endSurahNumber: directRange.endSurahNumber,
			endVerseNumber: directRange.endVerseNumber,
		})
	}

	return ranges
}

function getCombinedMemorizedRanges(student?: StudentExamEligibilitySource | null, planProgress?: StudentExamPlanProgress | null) {
	if (!student) {
		return [] as PreviousMemorizationRange[]
	}

	const directCompleted = getNormalizedCompletedJuzs(student.completed_juzs)
	const storedRanges = getStoredMemorizedRanges(student)
	const planRanges = planProgress?.plan
		? getPlanMemorizedRanges(
			{
				...planProgress.plan,
				completed_juzs: directCompleted,
			},
			Number(planProgress.completedDays) || 0,
		)
		: []

	return [...storedRanges, ...planRanges]
}

export function getExamPortionOption(
	juzNumber?: number | null,
	student?: StudentExamEligibilitySource | null,
	planProgress?: StudentExamPlanProgress | null,
): StudentExamPortionOption | null {
	if (!juzNumber || !Number.isInteger(juzNumber)) {
		return null
	}

	const fallbackLabel = `الجزء ${juzNumber}`
	const juzBounds = getJuzBounds(juzNumber)
	if (!juzBounds || !student) {
		return { portionType: "juz", portionNumber: juzNumber, juzNumber, label: fallbackLabel, isComplete: true }
	}

	const directCompleted = getNormalizedCompletedJuzs(student.completed_juzs)
	const combinedRanges = getCombinedMemorizedRanges(student, planProgress)
	const combinedCoverage = getJuzCoverageFromRanges(combinedRanges)
	const isComplete = directCompleted.includes(juzNumber) || combinedCoverage.completedJuzs.has(juzNumber)

	if (isComplete) {
		return { portionType: "juz", portionNumber: juzNumber, juzNumber, label: fallbackLabel, isComplete: true }
	}

	const overlaps = combinedRanges
		.map((range) => intersectAyahRangeWithJuz(range, juzNumber))
		.filter((range): range is PreviousMemorizationRange => Boolean(range))
		.sort((left, right) => compareAyahRefs(left.startSurahNumber, left.startVerseNumber, right.startSurahNumber, right.startVerseNumber))

	if (overlaps.length === 0) {
		return { portionType: "juz", portionNumber: juzNumber, juzNumber, label: fallbackLabel, isComplete: true }
	}

	const firstRange = overlaps[0]
	const lastRange = overlaps[overlaps.length - 1]
	const startSurahName = SURAHS.find((surah) => surah.number === firstRange.startSurahNumber)?.name || "السورة"
	const endSurahName = SURAHS.find((surah) => surah.number === lastRange.endSurahNumber)?.name || "السورة"

	return {
		portionType: "juz",
		portionNumber: juzNumber,
		juzNumber,
		label: fallbackLabel,
		isComplete: false,
	}
}

export function getEligibleExamPortions(
	student?: StudentExamEligibilitySource | null,
	planProgress?: StudentExamPlanProgress | null,
	portionType: ExamPortionType = "juz",
) {
	const normalizedType = normalizeExamPortionType(portionType)
	const juzPortions = getEligibleExamJuzs(student, planProgress).map((juzNumber) => (
		getExamPortionOption(juzNumber, student, planProgress) || { portionType: "juz" as const, portionNumber: juzNumber, juzNumber, label: `الجزء ${juzNumber}`, isComplete: true }
	))

	if (normalizedType === "juz") {
		return juzPortions
	}

	return juzPortions.flatMap((portion) => {
		return getEquivalentPortionNumbers("juz", portion.juzNumber, "hizb").map((hizbNumber) => ({
			portionType: "hizb" as const,
			portionNumber: hizbNumber,
			juzNumber: getJuzNumberForPortion("hizb", hizbNumber) || portion.juzNumber,
			label: getExamPortionLabel("hizb", hizbNumber, `الحزب ${hizbNumber}`),
			isComplete: portion.isComplete,
		}))
	})
}

export function getEligibleExamJuzs(student?: StudentExamEligibilitySource | null, planProgress?: StudentExamPlanProgress | null) {
	if (!student) {
		return []
	}

	const directCompleted = getNormalizedCompletedJuzs(student.completed_juzs)
	const pendingMastery = getPendingMasteryJuzs(student.current_juzs, student.completed_juzs)
	const blockedJuzs = new Set(pendingMastery)
	const storedRanges = getStoredMemorizedRanges(student)
	const rangeCoverage = getJuzCoverageFromRanges(storedRanges)
	const coveredCompleted = Array.from(rangeCoverage.completedJuzs)
	const coveredCurrent = Array.from(rangeCoverage.currentJuzs)
	const planRanges = planProgress?.plan
		? getPlanMemorizedRanges(
			{
				...planProgress.plan,
				completed_juzs: directCompleted,
			},
			Number(planProgress.completedDays) || 0,
		)
		: []
	const planCoverage = getJuzCoverageFromRanges(planRanges)
	const plannedCompleted = Array.from(planCoverage.completedJuzs)
	const plannedCurrent = Array.from(planCoverage.currentJuzs)

	return Array.from(
		new Set([
			...directCompleted,
			...coveredCompleted,
			...coveredCurrent,
			...plannedCompleted,
			...plannedCurrent,
		]),
	)
		.filter((juzNumber) => !blockedJuzs.has(juzNumber))
		.sort((left, right) => left - right)
}

export function formatExamPortionLabel(
	portionNumber?: number | null,
	fallback = "",
	portionType: ExamPortionType = "juz",
) {
	return getExamPortionLabel(normalizeExamPortionType(portionType), portionNumber, fallback)
}