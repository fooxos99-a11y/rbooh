export type ThemePalette = {
  primary: string
  secondary: string
  tertiary: string
}

const DEFAULT_THEME: ThemePalette = {
  primary: "#d8a355",
  secondary: "#c99347",
  tertiary: "#b88a3d",
}

const THEME_PALETTES: Record<string, ThemePalette> = {
  beige_default: DEFAULT_THEME,
  default: DEFAULT_THEME,
  bats: { primary: "#000000", secondary: "#1a1a1a", tertiary: "#2a2a2a" },
  fire: { primary: "#ea580c", secondary: "#dc2626", tertiary: "#b91c1c" },
  snow: { primary: "#0284c7", secondary: "#0369a1", tertiary: "#0c4a6e" },
  leaves: { primary: "#22c55e", secondary: "#16a34a", tertiary: "#15803d" },
  royal: { primary: "#9333ea", secondary: "#a855f7", tertiary: "#d946ef" },
  dawn: { primary: "#fbbf24", secondary: "#f97316", tertiary: "#dc2626" },
  galaxy: { primary: "#7c3aed", secondary: "#a78bfa", tertiary: "#c4b5fd" },
  sunset_gold: { primary: "#f59e0b", secondary: "#d97706", tertiary: "#b45309" },
  ocean_deep: { primary: "#0284c7", secondary: "#06b6d4", tertiary: "#22d3ee" },
}

const LOCKED_RANK_PALETTES: Record<number, ThemePalette> = {
  1: { primary: "#f5c96a", secondary: "#d8a355", tertiary: "#a56a16" },
  2: { primary: "#d7dde8", secondary: "#aab4c3", tertiary: "#7d899b" },
  3: { primary: "#d89a6a", secondary: "#b87333", tertiary: "#8c4f24" },
}

const PREMIUM_THEMES = new Set(["dawn", "galaxy", "sunset_gold", "ocean_deep"])

export function getThemePalette(theme?: string | null): ThemePalette {
  if (!theme) {
    return DEFAULT_THEME
  }

  return THEME_PALETTES[theme] ?? DEFAULT_THEME
}

export function isPremiumTheme(theme?: string | null) {
  return !!theme && PREMIUM_THEMES.has(theme)
}

export function isLockedTopRank(rank: number) {
  return rank >= 1 && rank <= 3
}

export function getLockedRankPalette(rank: number): ThemePalette {
  return LOCKED_RANK_PALETTES[rank] ?? DEFAULT_THEME
}

export function getLeaderboardPalette(rank: number, preferredTheme?: string | null): ThemePalette {
  if (isLockedTopRank(rank)) {
    return getLockedRankPalette(rank)
  }

  return getThemePalette(preferredTheme)
}