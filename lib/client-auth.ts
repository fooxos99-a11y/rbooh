export function getClientAuthHeaders() {
  if (typeof window === "undefined") {
    return {} as Record<string, string>
  }

  const accountNumber = localStorage.getItem("accountNumber") || localStorage.getItem("account_number") || ""
  const userRole = localStorage.getItem("userRole") || ""

  return {
    ...(accountNumber ? { "x-account-number": accountNumber } : {}),
    ...(userRole ? { "x-user-role": userRole } : {}),
  }
}