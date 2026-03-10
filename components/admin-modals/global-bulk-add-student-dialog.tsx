"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

export function GlobalBulkAddStudentDialog() {
  const router = useRouter()
  const { toast } = useToast()

  const [isOpen, setIsOpen] = useState(true)
  const [circles, setCircles] = useState<any[]>([])
  
  const [bulkCircle, setBulkCircle] = useState("")
  type BulkRow = { name: string; account: string }
  const emptyRows = (): BulkRow[] => Array.from({ length: 10 }, () => ({ name: "", account: "" }))
  const [bulkRows, setBulkRows] = useState<BulkRow[]>(emptyRows())
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)

  useEffect(() => {
    fetchCircles()
  }, [])

  const fetchCircles = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("circles").select("*").order("created_at", { ascending: false })
      if (!error && data) setCircles(data)
    } catch (e) { console.error(e) }
  }

  const handleClose = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
       router.push(window.location.pathname, { scroll: false })
    }
  }

  const handleBulkAddStudents = async () => {
    const validRows = bulkRows.filter(r => r.name.trim() && r.account.trim())
    if (!bulkCircle || validRows.length === 0) {
      toast({ title: "تنبيه", description: "يرجى اختيار الحلقة وإدخال بيانات طالب واحد على الأقل", variant: "destructive" })
      return
    }
    setIsBulkSubmitting(true)
    let successCount = 0
    let failCount = 0
    for (const row of validRows) {
      try {
        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.name.trim(),
            circle_name: bulkCircle,
            id_number: "0",
            guardian_phone: "0",
            account_number: parseInt(row.account),
            initial_points: 0,
          }),
        })
        if (res.ok) successCount++
        else failCount++
      } catch { failCount++ }
    }
    setIsBulkSubmitting(false)
    toast({
      title: successCount > 0 ? `✓ تم إضافة ${successCount} طالب` : "فشل الحفظ",
      description: failCount > 0 ? `فشل ${failCount} طالب` : undefined,
    })
    if (successCount > 0) {
      handleClose(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto [&>button]:top-4 [&>button]:right-4 [&>button]:left-auto" dir="rtl">
        <DialogHeader className="text-right pr-8">
          <DialogTitle className="text-xl text-[#1a2332]">إضافة جماعية للطلاب</DialogTitle>
          <DialogDescription className="text-sm text-neutral-500 mb-2">اختر الحلقة ثم أدخل بيانات الطلاب</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* اختيار الحلقة */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-neutral-600">اسم الحلقة</Label>
            <Select value={bulkCircle} onValueChange={setBulkCircle} dir="rtl">
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="اختر الحلقة" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {circles.map((circle) => (
                  <SelectItem key={circle.name} value={circle.name}>{circle.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* صف العناوين */}
          <div className="grid grid-cols-2 gap-2 mb-1">
            <span className="text-xs font-bold text-neutral-500 text-right pr-1">اسم الطالب</span>
            <span className="text-xs font-bold text-neutral-500 text-right pr-1">رقم الحساب</span>
          </div>
          {/* صفوف الطلاب */}
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {bulkRows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 items-center">
                <Input
                  placeholder={`اسم الطالب ${idx + 1}`}
                  value={row.name}
                  onChange={e => setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))}
                  className="text-sm h-9"
                  dir="rtl"
                />
                <Input
                  placeholder="رقم الحساب"
                  value={row.account}
                  onChange={e => setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, account: e.target.value } : r))}
                  className="text-sm h-9 flex-row-reverse text-right"
                  dir="ltr"
                  type="number"
                />
              </div>
            ))}
          </div>
          {/* زر إضافة صف */}
          <button
            type="button"
            onClick={() => setBulkRows(prev => [...prev, { name: "", account: "" }])}
            className="flex items-center gap-1.5 text-sm text-[#C9A961] hover:text-[#D4AF37] font-medium transition-colors"
          >
            <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-base leading-none">+</span>
            إضافة طالب
          </button>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleClose(false)} className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600">إلغاء</Button>
          <Button
            onClick={handleBulkAddStudents}
            disabled={!bulkCircle || bulkRows.every(r => !r.name.trim() || !r.account.trim()) || isBulkSubmitting}
            className="border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#C9A961] hover:text-[#D4AF37] text-sm h-9 rounded-lg font-medium"
          >
            {isBulkSubmitting ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
