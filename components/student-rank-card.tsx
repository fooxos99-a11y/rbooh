"use client"

import type { CSSProperties } from "react"
import { Award, Calendar, Crown, Diamond, Star, Zap } from "lucide-react"
import { applyCardEffect } from "@/lib/card-effects"
import { getLockedRankPalette, getThemePalette, isLockedTopRank, isPremiumTheme, type ThemePalette } from "@/lib/rank-theme"

type RankCardScope = "leaderboard" | "all-circles" | "preview"

type StudentRankCardProps = {
  rank: number
  name: string
  points: number
  scope?: RankCardScope
  themeKey?: string | null
  customPalette?: ThemePalette
  effectId?: string | null
  fontId?: string | null
  badgeId?: string | null
  achievementBadges?: string[]
  compact?: boolean
  className?: string
  forcePremiumDecorations?: boolean
  showRank?: boolean
  showName?: boolean
  showPoints?: boolean
  showRankValue?: boolean
  rankPlacement?: "default" | "corner"
}

const DEFAULT_BEIGE = getThemePalette("beige_default")

function canUsePurchasedAppearance(rank: number, scope: RankCardScope) {
  if (scope === "preview") return rank > 3
  if (scope === "leaderboard") return rank >= 4 && rank <= 10
  return false
}

function getFontFamily(fontId?: string | null) {
  const fontMap: Record<string, string> = {
    font_cairo: "'Cairo', sans-serif",
    font_amiri: "'Amiri', serif",
    font_tajawal: "'Tajawal', sans-serif",
    font_changa: "'Changa', sans-serif",
  }

  return fontId && fontMap[fontId] ? fontMap[fontId] : "inherit"
}

function getActivePalette(rank: number, scope: RankCardScope, themeKey?: string | null, customPalette?: ThemePalette) {
  if (isLockedTopRank(rank)) {
    return getLockedRankPalette(rank)
  }

  if (scope === "all-circles") {
    return DEFAULT_BEIGE
  }

  if (canUsePurchasedAppearance(rank, scope)) {
    return customPalette ?? getThemePalette(themeKey)
  }

  return DEFAULT_BEIGE
}

function renderSelectedBadge(badgeId?: string | null) {
  const iconClass = "h-4 w-4 md:h-[18px] md:w-[18px]"

  switch (badgeId) {
    case "badge_diamond":
      return <Diamond className={iconClass} />
    case "badge_star":
      return <Star className={iconClass} fill="currentColor" />
    case "badge_lightning":
      return <Zap className={iconClass} fill="currentColor" />
    case "badge_crown":
      return <Crown className={iconClass} />
    default:
      return null
  }
}

function renderAchievementBadge(badgeType: string) {
  const badgeClass = "flex h-7 w-7 items-center justify-center rounded-full bg-[#f6efe2] text-[#b7892d] shadow-sm ring-1 ring-[#e7d1a0]"

  switch (badgeType) {
    case "memorization":
      return <span className={badgeClass}><Award className="h-4 w-4" /></span>
    case "mastery":
      return <span className={badgeClass}><Star className="h-4 w-4" fill="currentColor" /></span>
    case "attendance":
      return <span className={badgeClass}><Calendar className="h-4 w-4" /></span>
    default:
      return null
  }
}

function PremiumDecorations({ palette }: { palette: ThemePalette }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(circle at 15% 25%, ${palette.primary} 0, transparent 28%), radial-gradient(circle at 85% 75%, ${palette.secondary} 0, transparent 30%)` }} />
      <div className="pointer-events-none absolute right-5 top-4 h-2.5 w-2.5 rounded-full bg-white/70" />
      <div className="pointer-events-none absolute bottom-5 left-7 h-2 w-2 rounded-full bg-white/55" />
    </>
  )
}

export function StudentRankCard({
  rank,
  name,
  points,
  scope = "leaderboard",
  themeKey,
  customPalette,
  effectId,
  fontId,
  badgeId,
  achievementBadges,
  compact = false,
  className,
  forcePremiumDecorations = false,
  showRank = true,
  showName = true,
  showPoints = true,
  showRankValue = true,
  rankPlacement = "default",
}: StudentRankCardProps) {
  const palette = getActivePalette(rank, scope, themeKey, customPalette)
  const canUsePurchased = canUsePurchasedAppearance(rank, scope)
  const effect = canUsePurchased ? applyCardEffect(effectId, "group relative overflow-hidden rounded-[26px] border bg-white") : applyCardEffect(null, "group relative overflow-hidden rounded-[26px] border bg-white")
  const fontFamily = getFontFamily(fontId)
  const premium = forcePremiumDecorations || (canUsePurchased && isPremiumTheme(themeKey))
  const activeBadge = canUsePurchased ? renderSelectedBadge(badgeId) : null
  const containerClass = compact
    ? "px-4 py-4 md:px-5 md:py-4.5"
    : "px-5 py-5 md:px-7 md:py-6"
  const nameClass = compact
    ? "text-lg md:text-xl"
    : "text-xl md:text-[1.7rem]"
  const pointsClass = compact
    ? "min-w-[94px] rounded-[18px] px-4 py-2.5"
    : "min-w-[104px] rounded-[20px] px-5 py-3"
  const medalSize = compact ? "h-[52px] w-[52px] text-xl" : "h-[58px] w-[58px] md:h-[64px] md:w-[64px] text-2xl"
  const achievementList = Array.isArray(achievementBadges) ? achievementBadges.slice(0, 3) : []
  const rankOnly = showRank && !showName && !showPoints
  const rankInCorner = showRank && rankPlacement === "corner"
  const previewRankOnly = scope === "preview" && rankOnly
  const style: CSSProperties = {
    ...effect.style,
    borderColor: `${palette.secondary}55`,
    boxShadow: `0 10px 30px ${palette.secondary}20, 0 2px 8px rgba(15, 23, 42, 0.06)`,
    backgroundColor: "#ffffff",
  }

  return (
    <div className={`${effect.className} ${className ?? ""}`} style={style}>
      <div className="absolute inset-x-0 top-0 h-[10px]" style={{ background: `linear-gradient(90deg, ${palette.primary}, ${palette.secondary})` }} />
      {premium ? <PremiumDecorations palette={palette} /> : null}
      {effect.extraElements}

      {rankInCorner ? (
        <div className={`absolute z-20 ${previewRankOnly ? "right-3 top-1/2 -translate-y-1/2 md:right-4" : "right-4 top-5 md:right-5 md:top-6"}`}>
          <div className="relative shrink-0">
            <div
              className={`flex items-center justify-center rounded-full border-[3px] border-white font-black text-white shadow-lg ${medalSize}`}
              style={{
                background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
                boxShadow: `0 10px 25px ${palette.secondary}50`,
              }}
            >
              <div
                className="pointer-events-none absolute left-[18%] top-[14%] h-[34%] w-[46%] rounded-full blur-[1px]"
                style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.08))" }}
              />
              {showRankValue ? rank : null}
            </div>
            <div className="pointer-events-none absolute inset-[5px] rounded-full border border-white/35" />
          </div>
        </div>
      ) : null}

      <div className={`relative z-10 flex items-center ${rankOnly ? "justify-center" : showRank || showName || showPoints ? "justify-between" : "justify-center"} gap-4 md:gap-6 ${previewRankOnly ? "min-h-[108px] px-4 pb-4 pt-8 md:min-h-[116px] md:px-5 md:pb-5 md:pt-9" : containerClass}`}>
        {(showRank || showName) ? (
          <div className={`min-w-0 flex items-center gap-3 md:gap-4 ${rankOnly ? "justify-center" : "flex-1"}`}>
            {showRank && !rankInCorner ? (
              <div className="relative shrink-0">
                <div
                  className={`flex items-center justify-center rounded-full border-[3px] border-white font-black text-white shadow-lg ${medalSize}`}
                  style={{
                    background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
                    boxShadow: `0 10px 25px ${palette.secondary}50`,
                  }}
                >
                  <div
                    className="pointer-events-none absolute left-[18%] top-[14%] h-[34%] w-[46%] rounded-full blur-[1px]"
                    style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.08))" }}
                  />
                  {showRankValue ? rank : null}
                </div>
                <div className="pointer-events-none absolute inset-[5px] rounded-full border border-white/35" />
              </div>
            ) : null}

            {showName ? (
              <div className="min-w-0 flex-1 text-right">
                <div className="flex items-center gap-2">
                  <h3 className={`truncate font-black tracking-tight text-[#1f4d9a] ${nameClass}`} style={{ fontFamily }}>
                    {name}
                  </h3>
                  {activeBadge ? (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4f7f7] text-[#b7892d] ring-1 ring-[#e6ddc8]">
                      {activeBadge}
                    </span>
                  ) : null}
                </div>

                {achievementList.length > 0 ? (
                  <div className="mt-2 flex items-center gap-2">
                    {achievementList.map((badgeType, index) => (
                      <span key={`${badgeType}-${index}`}>{renderAchievementBadge(badgeType)}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {showPoints ? (
          <div
            className={`shrink-0 border text-center ${pointsClass}`}
            style={{
              borderColor: `${palette.primary}18`,
              background: "linear-gradient(135deg, rgba(251,253,255,0.98) 0%, rgba(241,246,255,0.95) 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.82), 0 8px 18px rgba(52,83,167,0.07)",
            }}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Star className="h-5 w-5 fill-[#ffd766] text-[#ffd766] drop-shadow-[0_0_6px_rgba(255,215,102,0.28)] md:h-[22px] md:w-[22px]" strokeWidth={1.8} />
              <div className="text-[1.55rem] font-black leading-none text-[#3453a7] md:text-[1.8rem]">{points}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
