"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"
import { useState } from "react"

export function GlobalEndSemesterDialog() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const buildCloseHref = () => {
    const nextParams = new URLSearchParams(searchParams?.toString() || "")
    nextParams.delete("action")
    const query = nextParams.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  const handleOpenChange = (open: boolean) => {
    if (isSubmitting) return
    setIsOpen(open)
    if (!open) {
      setTimeout(() => {
        router.push(buildCloseHref())
      }, 200)
    }
  }

  const handleEndSemester = async () => {
    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch("/api/end-semester", { method: "POST" })
      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "فشل في إنهاء الفصل" })
        return
      }

      setMessage({
        type: "success",
        text: `تم إنهاء الفصل بنجاح. صُفرت نقاط ${data.studentsReset || 0} طالب وحُفظت ${data.plansArchived || 0} خطة كمحفوظ سابق.`,
      })
    } catch {
      setMessage({ type: "error", text: "حدث خطأ أثناء تنفيذ إنهاء الفصل" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px] [&>button]:hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex w-full justify-start text-right text-xl text-[#1a2332]">
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#003f55]" />
              <span>إنهاء الفصل</span>
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-500">
            هل تريد إنهاء الفصل؟ سيُصفّر هذا الإجراء نقاط الطلاب ويحفظ الخطط الحالية كمحفوظ سابق ثم يحذف الخطط النشطة.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-[#8fb1ff] bg-[#f7faff] px-4 py-3 text-sm leading-7 text-[#1a2332]">
          سيتم تنفيذ الإجراءات التالية:
          <br />
          1. تصفير نقاط الطلاب إلى 0.
          <br />
          2. نقل حدود كل خطة حالية إلى محفوظ الطالب الدائم.
          <br />
          3. حذف الخطط الحالية لبدء فصل جديد بخطط جديدة.
        </div>
        {message && (
          <div className={`rounded-xl px-4 py-3 text-sm ${message.type === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-red-200 bg-red-50 text-red-700"}`}>
            {message.text}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleEndSemester}
            disabled={isSubmitting}
            className="bg-[#3453a7] hover:bg-[#27428d] text-white"
          >
            {isSubmitting ? "جاري إنهاء الفصل..." : "نعم، إنهاء الفصل"}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="border-[#8fb1ff] text-neutral-700 hover:bg-[#eaf1ff] hover:text-[#27428d]"
          >
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
