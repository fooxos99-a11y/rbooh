"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Award, TrendingUp } from "lucide-react"

export function GlobalEditPointsDialog() {
  const router = useRouter()
  const { toast } = useToast()

  const [isOpen, setIsOpen] = useState(true)
  const [circles, setCircles] = useState<any[]>([])
  const [studentsInCircles, setStudentsInCircles] = useState<Record<string, any[]>>({})
  
  const [selectedCircleForPoints, setSelectedCircleForPoints] = useState("")
  const [selectedStudentForPoints, setSelectedStudentForPoints] = useState("")
  
  const [editingStudentPoints, setEditingStudentPoints] = useState<any>(null)
  const [newPoints, setNewPoints] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)

  const normalizeCircleKey = (value?: string | null) =>
    (value || "")
      .replace(/\s+/g, " ")
      .trim()

  const getStudentsForCircle = (circleName?: string | null) => {
    const normalizedCircle = normalizeCircleKey(circleName)
    if (!normalizedCircle) return []
    return studentsInCircles[normalizedCircle] || []
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const supabase = createClient()
      const [circlesRes, studentsRes] = await Promise.all([
        supabase.from("circles").select("*").order("created_at", { ascending: false }),
        supabase.from("students").select("*")
      ])
      
      if (!circlesRes.error && circlesRes.data) setCircles(circlesRes.data)
      
      if (!studentsRes.error && studentsRes.data) {
        const grouped: Record<string, any[]> = {}
        studentsRes.data.forEach((s) => {
          const circleKey = normalizeCircleKey(s.halaqah || s.circle_name || "غير محدد")
          if (!grouped[circleKey]) grouped[circleKey] = []
          grouped[circleKey].push(s)
        })
        setStudentsInCircles(grouped)
      }
    } catch (e) { console.error(e) }
  }

  const availableStudentsForPoints = getStudentsForCircle(selectedCircleForPoints)

  const handleSelectStudentForPoints = (studentId: string) => {
    setSelectedStudentForPoints(studentId)
    const student = getStudentsForCircle(selectedCircleForPoints).find((s) => s.id === studentId)
    if (student) {
      setEditingStudentPoints(student)
      setNewPoints(student.points?.toString() || "0")
    }
  }

  const handleClose = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
       router.push("?", { scroll: false })
    }
  }

  const handleSavePoints = async () => {
    if (editingStudentPoints && newPoints) {
      setIsSubmitting(true)
      try {
        const parsedPoints = parseInt(newPoints)
        if (isNaN(parsedPoints)) throw new Error("Invalid points value")

        const res = await fetch(`/api/students/${editingStudentPoints.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ points: parsedPoints }),
        })
        if (!res.ok) throw new Error("Failed to update points")

        toast({
          title: "✓ تم الحفظ بنجاح",
          description: "تم تحديث نقاط الطالب بنجاح",
          className: "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-none",
        })
        handleClose(false)
      } catch (error) {
        console.error("Error updating points:", error)
        alert("حدث خطأ أثناء حفظ النقاط")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] [&>button]:hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex w-full justify-start text-right text-xl text-[#1a2332]">
            <span className="inline-flex items-center gap-2">
              <Award className="w-5 h-5 text-[#D4AF37]" />
              <span>تعديل نقاط الطالب</span>
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-500">اختر الطالب لتعديل رصيد نقاطه</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-neutral-600">اختر الحلقة</Label>
            <Select
              value={selectedCircleForPoints}
              onValueChange={(value) => { setSelectedCircleForPoints(value); setSelectedStudentForPoints(""); setEditingStudentPoints(null) }}
              dir="rtl"
            >
              <SelectTrigger className="w-full text-sm"><SelectValue placeholder="اختر الحلقة" /></SelectTrigger>
              <SelectContent dir="rtl">
                {circles.map((circle) => (<SelectItem key={circle.name} value={circle.name}>{circle.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#1a2332]">اختر الطالب</Label>
            <Select value={selectedStudentForPoints} onValueChange={handleSelectStudentForPoints} disabled={!selectedCircleForPoints} dir="rtl">
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder={selectedCircleForPoints ? "اختر الطالب" : "اختر الحلقة أولاً"} />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {availableStudentsForPoints.map((student: any) => (
                  <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {editingStudentPoints && (
            <div className="space-y-3 pt-4 mt-2 border-t border-gray-100">
               <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                 <span className="text-sm text-neutral-600 font-medium">النقاط الحالية:</span>
                 <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#D4AF37]/30">
                   <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                   <span className="font-bold text-[#1a2332]">{editingStudentPoints.points || 0}</span>
                 </div>
               </div>
               <div className="space-y-2">
                <Label className="text-sm font-bold text-[#1a2332]">الرصيد الجديد</Label>
                <Input value={newPoints} onChange={(e) => setNewPoints(e.target.value)} className="text-base h-11 text-center font-bold" type="number" dir="ltr" />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600">إلغاء</Button>
          <Button variant="outline" onClick={handleSavePoints} className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600" disabled={!editingStudentPoints || !newPoints || isSubmitting}>
            {isSubmitting ? "جاري الحفظ..." : "حفظ النقاط"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
