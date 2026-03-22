export function getClientAuthHeaders() {
  if (typeof window === "undefined") {
    return {} as Record<string, string>
  }

  const accountNumber = getClientAccountNumber()

  return {
    ...(accountNumber ? { "x-account-number": accountNumber } : {}),
  }
}

export function getClientAccountNumber() {
  if (typeof window === "undefined") {
    return ""
  }

  const rawAccountNumber = localStorage.getItem("accountNumber") || localStorage.getItem("account_number") || ""

  return rawAccountNumber
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .trim()
}