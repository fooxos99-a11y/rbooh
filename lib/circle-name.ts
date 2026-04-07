export function normalizeCircleName(value?: string | null) {
  return (value || "").replace(/\s+/g, " ").trim()
}

export function normalizeCircleNameKey(value?: string | null) {
  return normalizeCircleName(value).toLowerCase()
}

export function resolveCircleName(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = normalizeCircleName(value)
    if (normalized) {
      return normalized
    }
  }

  return ""
}

export function circleNamesMatch(left?: string | null, right?: string | null) {
  const normalizedLeft = normalizeCircleNameKey(left)
  const normalizedRight = normalizeCircleNameKey(right)

  return !!normalizedLeft && !!normalizedRight && normalizedLeft === normalizedRight
}