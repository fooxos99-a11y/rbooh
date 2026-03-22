export const PATHWAY_TEST_SCORING_SETTING_ID = "pathway_test_scoring"

export type PathwayTestScoringSettings = {
  basePoints: number
  warningDeduction: number
  mistakeDeduction: number
}

export type PathwayTestScoreDetails = PathwayTestScoringSettings & {
  warningCount: number
  mistakeCount: number
  finalScore: number
}

type StoredPathwayTestNotes = {
  kind?: string
  noteText?: string | null
  scoreDetails?: Partial<PathwayTestScoreDetails> | null
}

export const DEFAULT_PATHWAY_TEST_SCORING_SETTINGS: PathwayTestScoringSettings = {
  basePoints: 100,
  warningDeduction: 5,
  mistakeDeduction: 10,
}

function normalizeNonNegativeInteger(value: unknown, fallback: number) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback
  }

  return Math.floor(parsed)
}

export function normalizePathwayTestScoringSettings(value: unknown): PathwayTestScoringSettings {
  const candidate = typeof value === "object" && value !== null ? value as Partial<PathwayTestScoringSettings> : {}

  return {
    basePoints: normalizeNonNegativeInteger(candidate.basePoints, DEFAULT_PATHWAY_TEST_SCORING_SETTINGS.basePoints),
    warningDeduction: normalizeNonNegativeInteger(candidate.warningDeduction, DEFAULT_PATHWAY_TEST_SCORING_SETTINGS.warningDeduction),
    mistakeDeduction: normalizeNonNegativeInteger(candidate.mistakeDeduction, DEFAULT_PATHWAY_TEST_SCORING_SETTINGS.mistakeDeduction),
  }
}

export function calculatePathwayTestScore(params: {
  settings: PathwayTestScoringSettings
  warningCount: number
  mistakeCount: number
}): PathwayTestScoreDetails {
  const settings = normalizePathwayTestScoringSettings(params.settings)
  const warningCount = normalizeNonNegativeInteger(params.warningCount, 0)
  const mistakeCount = normalizeNonNegativeInteger(params.mistakeCount, 0)
  const deductions = (warningCount * settings.warningDeduction) + (mistakeCount * settings.mistakeDeduction)

  return {
    ...settings,
    warningCount,
    mistakeCount,
    finalScore: Math.max(0, settings.basePoints - deductions),
  }
}

export function parsePathwayTestNotes(notes: string | null | undefined): {
  noteText: string | null
  scoreDetails: PathwayTestScoreDetails | null
} {
  if (!notes) {
    return { noteText: null, scoreDetails: null }
  }

  try {
    const parsed = JSON.parse(notes) as StoredPathwayTestNotes
    const hasStructuredPayload = parsed && typeof parsed === "object" && (parsed.kind === "pathway_test_result" || parsed.scoreDetails)

    if (!hasStructuredPayload) {
      return { noteText: notes, scoreDetails: null }
    }

    const rawScoreDetails = parsed.scoreDetails
    const scoreDetails = rawScoreDetails
      ? calculatePathwayTestScore({
          settings: normalizePathwayTestScoringSettings(rawScoreDetails),
          warningCount: rawScoreDetails.warningCount ?? 0,
          mistakeCount: rawScoreDetails.mistakeCount ?? 0,
        })
      : null

    return {
      noteText: typeof parsed.noteText === "string" ? parsed.noteText : null,
      scoreDetails,
    }
  } catch {
    return { noteText: notes, scoreDetails: null }
  }
}

export function stringifyPathwayTestNotes(params: {
  noteText?: string | null
  scoreDetails?: PathwayTestScoreDetails | null
}) {
  const noteText = typeof params.noteText === "string" ? params.noteText.trim() : null
  const scoreDetails = params.scoreDetails ?? null

  if (!noteText && !scoreDetails) {
    return null
  }

  return JSON.stringify({
    kind: "pathway_test_result",
    noteText,
    scoreDetails,
  })
}