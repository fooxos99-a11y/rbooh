"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { LogIn, CheckCircle2 } from 'lucide-react'

function normalizeAccountNumber(value: string) {
  const normalized = value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632)).trim()
  return /^[0-9]+$/.test(normalized) ? Number.parseInt(normalized, 10) : null
}

function serializeLookupError(error: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null } | null) {
  if (!error) {
    return null
  }

  return {
    code: error.code || null,
    message: error.message || null,
    details: error.details || null,
    hint: error.hint || null,
  }
}

function isTransientLookupError(error: { code?: string | null; message?: string | null } | null) {
  if (!error) return false

  const message = (error.message || "").toLowerCase()

  return error.code === "PGRST002" || error.code === "TIMEOUT" || message.includes("schema cache") || message.includes("failed to fetch")
}

function wait(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Lookup timed out")), timeoutMs)
    }),
  ])
}

async function retryLookup<T>(lookup: () => Promise<{ data: T | null; error: { code?: string | null; message?: string | null } | null }>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let result: { data: T | null; error: { code?: string | null; message?: string | null } | null }

    try {
      result = await withTimeout(lookup(), 4000)
    } catch {
      result = {
        data: null,
        error: {
          code: "TIMEOUT",
          message: "Lookup timed out",
        },
      }
    }

    if (!result.error || !isTransientLookupError(result.error) || attempt === 2) {
      return result
    }

    await wait(500 * (attempt + 1))
  }

  return { data: null, error: null }
}

export function LoginForm() {
  const [accountNumber, setAccountNumber] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    const parsedAccountNumber = normalizeAccountNumber(accountNumber)
    if (!parsedAccountNumber) {
      setError("رقم الحساب يجب أن يكون أرقام فقط")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      const { data: user, error: userError } = await retryLookup(() =>
        supabase
          .from("users")
          .select("id, name, role, account_number, halaqah")
          .eq("account_number", parsedAccountNumber)
          .maybeSingle(),
      )

      if (userError) {
        console.warn("[login] Users lookup failed:", serializeLookupError(userError))
        setError("تعذر التحقق من الحساب الآن")
        setIsLoading(false)
        return
      }

      let resolvedUser = user

      if (!resolvedUser) {
        const { data: student, error: studentError } = await retryLookup(() =>
          supabase
            .from("students")
            .select("id, name, account_number, halaqah")
            .eq("account_number", parsedAccountNumber)
            .maybeSingle(),
        )

        if (studentError) {
          console.warn("[login] Students lookup failed:", serializeLookupError(studentError))
          setError("تعذر التحقق من الحساب الآن")
          setIsLoading(false)
          return
        }

        if (student) {
          resolvedUser = {
            id: student.id,
            name: student.name,
            role: "student",
            account_number: student.account_number,
            halaqah: student.halaqah,
          }
        }
      }

      if (resolvedUser) {
        const currentUser = {
          account_number: resolvedUser.account_number,
          role: resolvedUser.role,
          name: resolvedUser.name,
          halaqah: resolvedUser.halaqah || "",
          id: resolvedUser.id,
        }
        localStorage.setItem("currentUser", JSON.stringify(currentUser))

        localStorage.setItem("account_number", resolvedUser.account_number.toString())
        localStorage.setItem("accountNumber", resolvedUser.account_number.toString())
        localStorage.setItem("userRole", resolvedUser.role)
        localStorage.setItem("userName", resolvedUser.name)
        localStorage.setItem("studentName", resolvedUser.name)
        localStorage.setItem("userHalaqah", resolvedUser.halaqah || "")
        localStorage.setItem("isLoggedIn", "true")

        if (resolvedUser.role === "student" && resolvedUser.id) {
          localStorage.setItem("studentId", resolvedUser.id)
        }

        setIsSuccess(true)
        setTimeout(() => {
          router.replace("/")
        }, 1500)
      } else {
        setError("رقم الحساب غير صحيح")
        setIsLoading(false)
      }
    } catch (error) {
      console.warn("[login] Unexpected login failure:", error instanceof Error ? error.message : error)
      setError("حدث خطأ أثناء تسجيل الدخول")
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8 border-2 border-[#3453a7]/20 relative">
      {isSuccess && (
        <div className="absolute inset-0 bg-white rounded-2xl flex flex-col items-center justify-center z-10 animate-in fade-in duration-300">
          <CheckCircle2 className="w-20 h-20 md:w-32 md:h-32 text-[#243870] animate-in zoom-in duration-500" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div className="space-y-2">
          <Label htmlFor="accountNumber" className="text-[#023232] font-semibold text-base md:text-lg">
            رقم الحساب
          </Label>
          <Input
            id="accountNumber"
            type="text"
            placeholder="أدخل رقم الحساب"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="h-12 md:h-14 text-base md:text-lg text-center border-2 border-gray-200 focus:border-[#3453a7] transition-colors"
            required
            dir="ltr"
          />
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-3 md:px-4 py-2 md:py-3 rounded-lg text-center text-sm md:text-base">{error}</div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 md:h-14 bg-[#3453a7] text-white font-bold text-base md:text-lg shadow-lg hover:bg-[#27428d] hover:shadow-xl transition-all duration-300"
        >
          {isLoading ? (
            "جاري تسجيل الدخول..."
          ) : (
            <span className="flex items-center justify-center gap-2">
              <LogIn className="w-4 h-4 md:w-5 md:h-5" />
              تسجيل الدخول
            </span>
          )}
        </Button>
      </form>

      <div className="mt-4 md:mt-6 text-center text-xs md:text-sm text-[#023232]/60">
        <p>استخدم رقم الحساب الخاص بك للدخول</p>
      </div>
    </div>
  )
}
