
"use client"

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { FileText, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown } from "lucide-react"
import { SiteLoader } from "@/components/ui/site-loader"
import { getEvaluationLevelLabel, isEvaluatedAttendance } from "@/lib/student-attendance"
import { getClientAuthHeaders } from "@/lib/client-auth"
import { normalizeCircleName } from "@/lib/circle-name"

export function GlobalStudentRecordsDialog() {
  const router = useRouter()
  const isMountedRef = useRef(true)
  const studentsRequestRef = useRef(0)
  const recordsRequestRef = useRef(0)

  const [isOpen, setIsOpen] = useState(true)
  const [circles, setCircles] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [studentsForCircle, setStudentsForCircle] = useState<any[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  
  const [selectedCircle, setSelectedCircle] = useState("")
  const [selectedStudent, setSelectedStudent] = useState("")
  
  const [records, setRecords] = useState<any[]>([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)

  useEffect(() => {
    isMountedRef.current = true
    fetchData()

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchData = async () => {
    try {
      const supabase = createClient()
      const [circlesRes, studentsRes] = await Promise.all([
        supabase.from("circles").select("*").order("created_at", { ascending: false }),
        supabase.from("students").select("*")
      ])

      if (!isMountedRef.current) return

      if (!circlesRes.error && circlesRes.data) {
        setCircles(circlesRes.data.map((circle) => ({
          ...circle,
          name: normalizeCircleName(circle.name),
        })))
      }

      if (!studentsRes.error && studentsRes.data) {
        setStudents(studentsRes.data.map((student) => ({
          ...student,
          halaqah: normalizeCircleName(student.halaqah || student.circle_name),
          circle_name: normalizeCircleName(student.circle_name || student.halaqah),
        })))
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (!selectedCircle) {
      setStudentsForCircle([])
      return
    }

    const requestId = studentsRequestRef.current + 1
    studentsRequestRef.current = requestId

    const loadStudents = async () => {
      try {
        setIsLoadingStudents(true)
        const res = await fetch(`/api/students?circle=${encodeURIComponent(selectedCircle)}`, { headers: getClientAuthHeaders() })
        if (!res.ok) throw new Error("Failed to fetch students")
        const data = await res.json()
        if (!isMountedRef.current || studentsRequestRef.current !== requestId) return

        setStudentsForCircle(Array.isArray(data.students) ? data.students : [])
      } catch (error) {
        console.error(error)
        if (!isMountedRef.current || studentsRequestRef.current !== requestId) return

        const normalizedSelectedCircle = normalizeCircleName(selectedCircle)
        setStudentsForCircle(students.filter((student) => normalizeCircleName(student.halaqah || student.circle_name) === normalizedSelectedCircle))
      } finally {
        if (!isMountedRef.current || studentsRequestRef.current !== requestId) return
        setIsLoadingStudents(false)
      }
    }

    void loadStudents()
  }, [selectedCircle, students])

  useEffect(() => {
    if (selectedStudent) {
      void fetchStudentRecords(selectedStudent)
    } else {
      setRecords([])
    }
  }, [selectedStudent])

  const fetchStudentRecords = async (studentId: string) => {
    const requestId = recordsRequestRef.current + 1
    recordsRequestRef.current = requestId
    setIsLoadingRecords(true)
    try {
      const res = await fetch(`/api/attendance?student_id=${studentId}`, { headers: getClientAuthHeaders() })
      if (!res.ok) throw new Error("Failed to fetch")
      const data = await res.json()
      if (!isMountedRef.current || recordsRequestRef.current !== requestId) return

      if (data && data.records && Array.isArray(data.records)) {
        setRecords(data.records)
      } else {
        setRecords(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error(error)
      if (!isMountedRef.current || recordsRequestRef.current !== requestId) return
      setRecords([])
    } finally {
      if (!isMountedRef.current || recordsRequestRef.current !== requestId) return
      setIsLoadingRecords(false)
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setIsOpen(false)
      setTimeout(() => {
        router.push(window.location.pathname)
      }, 300)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" />حضور</span>;
      case "absent":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200"><XCircle className="w-3.5 h-3.5" />غياب</span>;
      case "excused":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200"><AlertCircle className="w-3.5 h-3.5" />مستأذن</span>;
      case "late":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200"><Clock className="w-3.5 h-3.5" />متأخر</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">{status}</span>;
    }
  }

  const getEvaluationText = (level: string | null) => {
    return getEvaluationLevelLabel(level) || "—"
  }

  const formatHearingRecordDate = (date: string) => {
    return new Date(`${date}T12:00:00+03:00`).toLocaleDateString("ar-SA", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getNextOfficialHearingDate = (date: string) => {
    const currentDate = new Date(`${date}T12:00:00+03:00`)
    currentDate.setUTCDate(currentDate.getUTCDate() + 1)

    while (currentDate.getUTCDay() !== 0 && currentDate.getUTCDay() !== 3) {
      currentDate.setUTCDate(currentDate.getUTCDate() + 1)
    }

    return currentDate.toISOString().slice(0, 10)
  }

  const getHearingSegmentLabel = (index: number) => {
    const labels = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس"]
    return labels[index] || `${index + 1}`
  }

  const formatReadingRange = (fromSurah?: string | null, fromVerse?: string | null, toSurah?: string | null, toVerse?: string | null) => {
    if (!fromSurah || !fromVerse || !toSurah || !toVerse) return null

    if (fromSurah === toSurah) {
      return `من ${fromSurah} آية ${fromVerse} إلى آية ${toVerse}`
    }

    return `من ${fromSurah} آية ${fromVerse} إلى ${toSurah} آية ${toVerse}`
  }

  const hearingSessions = Array.from(
    records.reduce<Map<string, any[]>>((acc, record) => {
      if (!isEvaluatedAttendance(record.status)) {
        return acc
      }

      if (!record.hafiz_level && !formatReadingRange(record.hafiz_from_surah, record.hafiz_from_verse, record.hafiz_to_surah, record.hafiz_to_verse)) {
        return acc
      }

      const hearingDate = getNextOfficialHearingDate(record.date)
      const existing = acc.get(hearingDate) || []
      existing.push(record)
      acc.set(hearingDate, existing)
      return acc
    }, new Map()).entries(),
  )
    .map(([hearingDate, hearingRecords]) => ({
      hearingDate,
      records: [...hearingRecords].sort((left, right) => left.date.localeCompare(right.date)).slice(0, 3),
    }))
    .sort((left, right) => right.hearingDate.localeCompare(left.hearingDate))

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[92vw] md:max-w-[980px] w-full min-h-[60vh] max-h-[88vh] flex flex-col bg-white rounded-2xl p-0 overflow-hidden [&>button]:top-4 [&>button]:right-4 [&>button]:left-auto [&::-webkit-scrollbar]:hidden" dir="rtl">
        <DialogHeader className="px-5 py-4 border-b border-[#3453a7]/20 bg-gradient-to-r from-[#3453a7]/6 to-transparent text-right shrink-0">
          <DialogTitle className="flex w-full justify-start pr-8 text-right text-lg font-bold text-[#1a2332]">
            <span className="inline-flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#003f55]/10 border border-[#003f55]/20 flex items-center justify-center text-[#003f55]">
                <FileText className="w-4 h-4" />
              </span>
              <span>سجلات الطلاب</span>
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-500 pr-10 mt-1">
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5 rounded-2xl border border-[#3453a7]/12 bg-gradient-to-b from-[#f8fbff] to-white p-3 shadow-sm">
              <Label className="text-sm font-semibold text-[#1a2332]">الحلقة</Label>
              <div className="relative">
                <select
                  value={selectedCircle}
                  onChange={(event) => {
                    setSelectedCircle(event.target.value)
                    setSelectedStudent("")
                    setRecords([])
                  }}
                  className="h-11 w-full appearance-none rounded-xl border border-[#3453a7]/20 bg-white pr-4 pl-10 text-sm font-medium text-[#1a2332] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition focus:border-[#3453a7]/45 focus:ring-4 focus:ring-[#3453a7]/10"
                >
                  <option value="">اختر الحلقة</option>
                  {circles.map((circle) => (
                    <option key={circle.id || circle.name} value={circle.name}>{circle.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3453a7]" />
              </div>
            </div>
            
            <div className="space-y-1.5 rounded-2xl border border-[#3453a7]/12 bg-gradient-to-b from-[#f8fbff] to-white p-3 shadow-sm">
              <Label className="text-sm font-semibold text-[#1a2332]">الطالب</Label>
              <div className="relative">
                <select
                  value={selectedStudent}
                  onChange={(event) => setSelectedStudent(event.target.value)}
                  disabled={!selectedCircle || isLoadingStudents}
                  className="h-11 w-full appearance-none rounded-xl border border-[#3453a7]/20 bg-white pr-4 pl-10 text-sm font-medium text-[#1a2332] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition focus:border-[#3453a7]/45 focus:ring-4 focus:ring-[#3453a7]/10 disabled:cursor-not-allowed disabled:border-[#3453a7]/10 disabled:bg-[#f7f8fb] disabled:text-neutral-400"
                >
                  <option value="">{!selectedCircle ? "اختر الحلقة أولا" : isLoadingStudents ? "جاري تحميل الطلاب..." : "اختر الطالب"}</option>
                  {studentsForCircle.map((student) => (
                    <option key={student.id} value={student.id}>{student.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3453a7]" />
              </div>
            </div>
          </div>

          {selectedStudent && (
            <div className="border border-[#3453a7]/15 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="bg-[#f8faff] px-4 py-2.5 border-b border-[#3453a7]/10 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#003f55]" />
                  <h3 className="font-semibold text-sm text-[#1a2332]">سجل جلسات التسميع</h3>
              </div>
              
              <div className="max-h-[56vh] overflow-y-auto overflow-x-auto [&::-webkit-scrollbar]:hidden px-3 py-2">
                {isLoadingRecords ? (
                  <div className="flex justify-center items-center py-10">
                    <SiteLoader size="sm" />
                  </div>
                  ) : hearingSessions.length === 0 ? (
                  <div className="text-center py-10 text-neutral-500 text-sm">
                      لا توجد جلسات تسميع سابقة لهذا الطالب
                  </div>
                ) : (
                    <div className="flex flex-col gap-4 py-1">
                      {hearingSessions.map((session) => (
                        <div
                          key={session.hearingDate}
                          className="rounded-2xl border border-[#3453a7]/15 bg-white p-4 shadow-sm"
                        >
                          <div className="mb-4 border-b border-[#3453a7]/10 pb-3 text-right">
                            <p className="text-base font-extrabold text-[#1a2332]">
                              {formatHearingRecordDate(session.hearingDate)}
                            </p>
                          </div>

                          <div className="space-y-3">
                            {session.records.map((record, index) => (
                              <div
                                key={record.id}
                                className="rounded-xl bg-[#f8faff] p-4 text-right ring-1 ring-[#3453a7]/10"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <span className="text-sm font-bold text-[#1a2332]">
                                    المقطع {getHearingSegmentLabel(index)}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {getStatusBadge(record.status)}
                                    <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-[#3453a7] ring-1 ring-[#3453a7]/15">
                                      تقييمه: {getEvaluationText(record.hafiz_level)}
                                    </span>
                                  </div>
                                </div>

                                <p className="mt-3 text-sm leading-6 text-neutral-600">
                                  {formatReadingRange(record.hafiz_from_surah, record.hafiz_from_verse, record.hafiz_to_surah, record.hafiz_to_verse) || "—"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

