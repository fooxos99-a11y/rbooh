"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Phone, Save, Search, Users } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"

interface Student {
  id: string
  name: string
  guardian_phone: string | null
  account_number: number
  halaqah: string | null
}

export default function GuardianPhonesPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة الطلاب");

  const [isLoading, setIsLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [editingPhones, setEditingPhones] = useState<Record<string, string>>({})
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")

    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
    } else {
      fetchStudents()
    }
  }, [router])

  useEffect(() => {
    if (searchTerm) {
      const filtered = students.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.guardian_phone?.includes(searchTerm) ||
          student.account_number.toString().includes(searchTerm)
      )
      setFilteredStudents(filtered)
    } else {
      setFilteredStudents(students)
    }
  }, [searchTerm, students])

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students")
      const data = await response.json()

      if (data.students) {
        setStudents(data.students)
        setFilteredStudents(data.students)
      }
    } catch (error) {
      console.error("Error fetching students:", error)
      toast({
        title: "خطأ",
        description: "فشل في جلب بيانات الطلاب",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePhoneChange = (studentId: string, phone: string) => {
    setEditingPhones((prev) => ({
      ...prev,
      [studentId]: phone,
    }))
  }

  const handleSavePhone = async (student: Student) => {
    const newPhone = editingPhones[student.id] || student.guardian_phone || ""

    // التحقق من صحة الرقم
    const cleanPhone = newPhone.replace(/[^\d]/g, "")
    if (cleanPhone && cleanPhone.length < 9) {
      toast({
        title: "خطأ",
        description: "رقم الهاتف غير صحيح. يجب أن يكون 9 أرقام على الأقل",
        variant: "destructive",
      })
      return
    }

    setSavingIds((prev) => new Set(prev).add(student.id))

    try {
      const response = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          guardian_phone: cleanPhone || null,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "تم الحفظ",
          description: `تم تحديث رقم ولي أمر ${student.name}`,
        })

        // تحديث القائمة
        setStudents((prev) =>
          prev.map((s) => (s.id === student.id ? { ...s, guardian_phone: cleanPhone || null } : s))
        )

        // إزالة من قائمة التعديل
        setEditingPhones((prev) => {
          const newPhones = { ...prev }
          delete newPhones[student.id]
          return newPhones
        })
      } else {
        throw new Error(data.error || "فشل التحديث")
      }
    } catch (error) {
      console.error("Error updating phone:", error)
      toast({
        title: "خطأ",
        description: "فشل في تحديث رقم الهاتف",
        variant: "destructive",
      })
    } finally {
      setSavingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(student.id)
        return newSet
      })
    }
  }

  const formatPhoneDisplay = (phone: string | null) => {
    if (!phone) return "-"
    const cleaned = phone.replace(/[^\d]/g, "")
    if (cleaned.startsWith("966")) {
      return `+966 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`
    }
    return phone
  }

  const studentsWithPhone = students.filter((s) => s.guardian_phone).length
  const studentsWithoutPhone = students.length - studentsWithPhone

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SiteLoader size="lg" />
      </div>
    )
  }

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#faf8f5] to-white">
      <Header />

      <main className="flex-1 py-4 md:py-8 lg:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#1a2332] mb-2 flex items-center gap-3">
                <Phone className="w-8 h-8 text-[#35A4C7]" />
                إدارة أرقام أولياء الأمور
              </h1>
              <p className="text-gray-600">إضافة وتعديل أرقام هواتف أولياء الأمور لإرسال رسائل الواتساب</p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-2 border-[#35A4C7]/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">إجمالي الطلاب</p>
                      <p className="text-3xl font-bold text-[#1a2332]">{students.length}</p>
                    </div>
                    <Users className="w-12 h-12 text-[#35A4C7]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">لديهم أرقام</p>
                      <p className="text-3xl font-bold text-green-600">{studentsWithPhone}</p>
                    </div>
                    <Phone className="w-12 h-12 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">بدون أرقام</p>
                      <p className="text-3xl font-bold text-orange-600">{studentsWithoutPhone}</p>
                    </div>
                    <Phone className="w-12 h-12 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <Card className="border-2 border-[#35A4C7]/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="بحث بالاسم أو الرقم..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Students Table */}
            <Card className="border-2 border-[#35A4C7]/20">
              <CardHeader>
                <CardTitle className="text-[#1a2332]">قائمة الطلاب ({filteredStudents.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right font-bold">الرقم التسلسلي</TableHead>
                        <TableHead className="text-right font-bold">اسم الطالب</TableHead>
                        <TableHead className="text-right font-bold">الحلقة</TableHead>
                        <TableHead className="text-right font-bold">رقم ولي الأمر</TableHead>
                        <TableHead className="text-right font-bold">تعديل الرقم</TableHead>
                        <TableHead className="text-right font-bold">حفظ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            لا توجد نتائج
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>{student.account_number}</TableCell>
                            <TableCell className="font-semibold">{student.name}</TableCell>
                            <TableCell>{student.halaqah || "-"}</TableCell>
                            <TableCell>
                              <span
                                className={`${
                                  student.guardian_phone ? "text-green-600" : "text-orange-500"
                                }`}
                              >
                                {formatPhoneDisplay(student.guardian_phone)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="tel"
                                placeholder="966501234567"
                                value={
                                  editingPhones[student.id] !== undefined
                                    ? editingPhones[student.id]
                                    : student.guardian_phone || ""
                                }
                                onChange={(e) => handlePhoneChange(student.id, e.target.value)}
                                className="max-w-[200px]"
                                dir="ltr"
                              />
                              <p className="text-xs text-gray-500 mt-1">مثال: 966501234567</p>
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => handleSavePhone(student)}
                                disabled={savingIds.has(student.id)}
                                size="sm"
                                className="bg-[#35A4C7] hover:bg-[#2d8ba8]"
                              >
                                {savingIds.has(student.id) ? (
                                  "جاري الحفظ..."
                                ) : (
                                  <>
                                    <Save className="w-4 h-4 ml-1" />
                                    حفظ
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="border-2 border-blue-500/20 bg-blue-50">
              <CardContent className="pt-6">
                <h3 className="font-bold text-[#1a2332] mb-3 flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  تعليمات إدخال الأرقام:
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• أدخل رقم الهاتف مع رمز الدولة بدون + أو مسافات</li>
                  <li>• مثال للسعودية: <span className="font-mono bg-white px-2 py-1 rounded">966501234567</span></li>
                  <li>• تأكد من صحة الرقم قبل الحفظ</li>
                  <li>• يمكنك ترك الحقل فارغاً إذا لم يكن لديك الرقم</li>
                  <li>• بعد إضافة الأرقام، يمكنك استخدام صفحة "الإرسال إلى أولياء الأمور" لإرسال رسائل الواتساب</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
