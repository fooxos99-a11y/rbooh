"use client"

import type { ThemePalette } from "@/lib/rank-theme"
import { StudentRankCard } from "@/components/student-rank-card"

type ThemeRankPreviewProps = {
	themeKey?: string
	primary?: string
	secondary?: string
	tertiary?: string
	premium?: boolean
	rank?: number
	points?: number
	name?: string
}

export function ThemeRankPreview({
	themeKey,
	primary,
	secondary,
	tertiary,
	premium = false,
	rank = 4,
	points = 111111,
	name = "الاسم",
}: ThemeRankPreviewProps) {
	const customPalette: ThemePalette | undefined = primary && secondary && tertiary
		? { primary, secondary, tertiary }
		: undefined

	return (
		<StudentRankCard
			rank={rank}
			name={name}
			points={points}
			scope="preview"
			themeKey={themeKey}
			customPalette={customPalette}
			compact
			forcePremiumDecorations={premium}
			showRank
			showRankValue={false}
			showName={false}
			showPoints={false}
			rankPlacement="corner"
		/>
	)
}

