"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { MessageCircle, Search, Phone, Clock, CheckCheck } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/hooks/use-admin-auth"

interface Reply {
  id: string
  from_phone: string
  message_text: string
  timestamp: string
  is_read: boolean
  student_name?: string
}

export default function WhatsAppRepliesPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("الإرسال إلى أولياء الأمور");

  const [isLoading, setIsLoading] = useState(true)
  const [replies, setReplies] = useState<Reply[]>([])
  const [filteredReplies, setFilteredReplies] = useState<Reply[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [students, setStudents] = useState<any[]>([])
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")

    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
    } else {
      fetchData()
    }
  }, [router])

  useEffect(() => {
    if (searchTerm) {
      const filtered = replies.filter(
        (reply) =>
          reply.message_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
          reply.from_phone.includes(searchTerm) ||
          reply.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredReplies(filtered)
    } else {
      setFilteredReplies(replies)
    }
  }, [searchTerm, replies])

  const fetchData = async () => {
    try {
      // جلب الطلاب
      const studentsResponse = await fetch("/api/students")
      const studentsData = await studentsResponse.json()
      const studentsList = studentsData.students || []
      setStudents(studentsList)

      // جلب الردود
      const repliesResponse = await fetch("/api/whatsapp/replies")
      const repliesData = await repliesResponse.json()

      if (repliesData.success && repliesData.replies) {
        // ربط الردود بأسماء الطلاب
        const repliesWithNames = repliesData.replies.map((reply: Reply) => {
          const cleanPhone = reply.from_phone.replace(/\D/g, "")
          const student = studentsList.find((s: any) => {
            const guardianPhone = s.guardian_phone?.replace(/\D/g, "")
            return guardianPhone && cleanPhone.includes(guardianPhone.slice(-9))
          })

          return {
            ...reply,
            student_name: student?.name || "غير معروف",
          }
        })

        setReplies(repliesWithNames)
        setFilteredReplies(repliesWithNames)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "خطأ",
        description: "فشل في جلب البيانات",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (replyId: string) => {
    try {
      const response = await fetch("/api/whatsapp/replies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: replyId, is_read: true }),
      })

      if (response.ok) {
        setReplies((prev) => prev.map((r) => (r.id === replyId ? { ...r, is_read: true } : r)))
        toast({
          title: "تم",
          description: "تم تحديث حالة الرسالة",
        })
      }
    } catch (error) {
      console.error("Error updating reply:", error)
      toast({
        title: "خطأ",
        description: "فشل في تحديث الرسالة",
        variant: "destructive",
      })
    }
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const unreadCount = replies.filter((r) => !r.is_read).length

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-[#1a2332]">جاري التحميل...</div>
      </div>
    )
  }

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><div className="w-8 h-8 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" /></div>);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#faf8f5] to-white">
      <Header />

      <main className="flex-1 py-4 md:py-8 lg:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#1a2332] mb-2 flex items-center gap-3">
                <MessageCircle className="w-8 h-8 text-[#25D366]" />
                ردود أولياء الأمور
              </h1>
              <p className="text-gray-600">عرض وإدارة الردود المستلمة من أولياء الأمور عبر الواتساب</p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-2 border-[#25D366]/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">إجمالي الردود</p>
                      <p className="text-3xl font-bold text-[#1a2332]">{replies.length}</p>
                    </div>
                    <MessageCircle className="w-12 h-12 text-[#25D366]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-orange-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">غير مقروءة</p>
                      <p className="text-3xl font-bold text-orange-600">{unreadCount}</p>
                    </div>
                    <MessageCircle className="w-12 h-12 text-orange-600" />
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
                    placeholder="بحث بالاسم أو الرقم أو نص الرسالة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Replies Table */}
            <Card className="border-2 border-[#35A4C7]/20">
              <CardHeader>
                <CardTitle className="text-[#1a2332]">الردود المستلمة ({filteredReplies.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredReplies.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>لا توجد ردود</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right font-bold">الحالة</TableHead>
                          <TableHead className="text-right font-bold">ولي الأمر</TableHead>
                          <TableHead className="text-right font-bold">رقم الجوال</TableHead>
                          <TableHead className="text-right font-bold">الرسالة</TableHead>
                          <TableHead className="text-right font-bold">التاريخ</TableHead>
                          <TableHead className="text-right font-bold">إجراء</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReplies.map((reply) => (
                          <TableRow
                            key={reply.id}
                            className={`${reply.is_read ? "bg-white" : "bg-orange-50"}`}
                          >
                            <TableCell>
                              {reply.is_read ? (
                                <CheckCheck className="w-5 h-5 text-green-600" />
                              ) : (
                                <MessageCircle className="w-5 h-5 text-orange-600" />
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">{reply.student_name}</TableCell>
                            <TableCell dir="ltr" className="text-right">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                {reply.from_phone}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-md">
                              <p className="line-clamp-2">{reply.message_text}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Clock className="w-4 h-4" />
                                {formatDate(reply.timestamp)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {!reply.is_read && (
                                <Button
                                  onClick={() => markAsRead(reply.id)}
                                  size="sm"
                                  className="bg-[#35A4C7] hover:bg-[#2d8ba8]"
                                >
                                  تحديد كمقروء
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
