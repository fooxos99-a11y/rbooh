"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Plus, UserPlus } from "lucide-react"

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
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto [&>button]:hidden" dir="rtl">
        <DialogHeader className="border-b border-[#003f55]/15 bg-gradient-to-r from-[#003f55]/6 to-transparent px-6 py-5 text-right">
          <DialogTitle className="text-xl font-bold text-[#1a2332]">
            <UserPlus className="h-5 w-5 text-[#003f55]" />
            <span>إضافة جماعية للطلاب</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            نافذة لإضافة عدة طلاب دفعة واحدة مع اختيار الحلقة وإدخال الاسم ورقم الحساب لكل طالب.
          </DialogDescription>
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
            className="inline-flex items-center gap-2 self-start rounded-full border border-[#3453a7]/18 bg-[#3453a7]/7 px-3 py-2 text-sm font-semibold text-[#3453a7] transition-colors hover:border-[#3453a7]/28 hover:bg-[#3453a7]/12 hover:text-[#27428d]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#3453a7] shadow-sm ring-1 ring-[#3453a7]/15">
              <Plus className="h-3.5 w-3.5 stroke-[2.6]" />
            </span>
            <span>إضافة طالب</span>
          </button>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleClose(false)} className="text-sm h-9 rounded-lg border-[#003f55]/20 text-neutral-600">إلغاء</Button>
          <Button
            onClick={handleBulkAddStudents}
            disabled={!bulkCircle || bulkRows.every(r => !r.name.trim() || !r.account.trim()) || isBulkSubmitting}
            className="border border-[#3453a7] bg-[#3453a7] hover:bg-[#27428d] text-white text-sm h-9 rounded-lg font-medium"
          >
            {isBulkSubmitting ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
