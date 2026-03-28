"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Clock, Archive, ArchiveX, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"

interface ContactMessage {
  id: string
  name: string
  subject: string
  message: string
  status: "unread" | "read" | "archived"
  created_at: string
}

const subjectLabels: Record<string, string> = {
  inquiry: "استفسار عام",
  registration: "التسجيل في الحلقات",
  programs: "الاستفسار عن البرامج",
  complaint: "شكوى أو اقتراح",
  other: "أخرى",
}

export default function ReportsPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("التقارير");
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [sessionUnreadIds, setSessionUnreadIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread" | "read" | "archived">("all")

  const dispatchContactMessagesChanged = () => {
    window.dispatchEvent(new Event("contactMessages:changed"))
  }

  useEffect(() => {
    fetchMessages()
  }, [])

  const getVisualStatus = (message: ContactMessage): ContactMessage["status"] => {
    if (message.status === "archived") return "archived"
    if (sessionUnreadIds.includes(message.id)) return "unread"
    return "read"
  }

  const fetchMessages = async () => {
    try {
      const response = await fetch("/api/contact")
      const data = await response.json()
      const nextMessages: ContactMessage[] = data.messages || []
      const unreadIds = nextMessages.filter((message) => message.status === "unread").map((message) => message.id)

      setMessages(nextMessages)
      setSessionUnreadIds(unreadIds)

      if (unreadIds.length > 0) {
        await Promise.all(
          unreadIds.map((id) =>
            fetch("/api/contact", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, status: "read" }),
            }).catch(() => null),
          ),
        )
      }

      dispatchContactMessagesChanged()
    } catch (error) {
      console.error("[v0] Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }

  const archiveMessage = async (id: string) => {
    try {
      const response = await fetch("/api/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "archived" }),
      })

      if (response.ok) {
        setMessages(messages.map((msg) => (msg.id === id ? { ...msg, status: "archived" as const } : msg)))
        setSessionUnreadIds((current) => current.filter((messageId) => messageId !== id))
        dispatchContactMessagesChanged()
      }
    } catch (error) {
      console.error("[v0] Error archiving message:", error)
    }
  }

  const unarchiveMessage = async (id: string) => {
    try {
      const response = await fetch("/api/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "read" }),
      })

      if (response.ok) {
        setMessages(messages.map((msg) => (msg.id === id ? { ...msg, status: "read" as const } : msg)))
        setSessionUnreadIds((current) => current.filter((messageId) => messageId !== id))
        dispatchContactMessagesChanged()
      }
    } catch (error) {
      console.error("[v0] Error unarchiving message:", error)
    }
  }

  const deleteMessage = async (id: string) => {
    try {
      const response = await fetch(`/api/contact?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setMessages(messages.filter((msg) => msg.id !== id))
        setSessionUnreadIds((current) => current.filter((messageId) => messageId !== id))
        dispatchContactMessagesChanged()
      }
    } catch (error) {
      console.error("[v0] Error deleting message:", error)
    }
  }

  const filteredMessages = messages.filter((msg) => {
    if (filter === "all") return true
    return getVisualStatus(msg) === filter
  })

  const unreadCount = messages.filter((msg) => getVisualStatus(msg) === "unread").length
  const readCount = messages.filter((msg) => getVisualStatus(msg) === "read").length
  const archivedCount = messages.filter((msg) => getVisualStatus(msg) === "archived").length

  const formatDate = (dateString: string) => {
    // تأكد من أن التاريخ يتم تفسيره كـ UTC إذا لم يحتوي على معلومات المنطقة الزمنية
    const date = new Date(dateString.includes("Z") || dateString.includes("+") ? dateString : dateString + "Z")
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "الآن"
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return "منذ يوم واحد"
    if (diffInDays < 7) return `منذ ${diffInDays} أيام`

    return date.toLocaleDateString("ar-SA")
  }

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,#eef6f8_0%,#f7fbff_45%,#ffffff_100%)]"><SiteLoader size="md" /></div>);

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top,#eef6f8_0%,#f7fbff_45%,#ffffff_100%)]" dir="rtl">
      <Header />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8 rounded-[28px] border border-[#3453a7]/12 bg-white/90 px-6 py-7 shadow-[0_22px_55px_-42px_rgba(52,83,167,0.35)] backdrop-blur-sm">
            <h1 className="text-4xl font-bold text-[#1a2332] mb-2">التقارير والرسائل</h1>
            <p className="text-lg text-[#4d6b76]">جميع الرسائل المرسلة من صفحة تواصل معنا</p>
          </div>

          {/* Filter Buttons فقط */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            {[
              { key: "all" as const, label: "الكل", count: messages.length },
              { key: "unread" as const, label: "غير مقروءة", count: unreadCount },
              { key: "read" as const, label: "مقروءة", count: readCount },
              { key: "archived" as const, label: "مؤرشفة", count: archivedCount },
            ].map((item) => {
              const isActive = filter === item.key

              return (
                <Button
                  key={item.key}
                  onClick={() => setFilter(item.key)}
                  variant={isActive ? "default" : "outline"}
                  className={`h-11 rounded-xl px-4 ${isActive ? "bg-[#3453a7] text-white hover:bg-[#27428d]" : "border-[#3453a7]/25 bg-white text-[#1a2332] hover:bg-[#3453a7]/8"}`}
                >
                  <span>{item.label}</span>
                  <span className={`mr-2 inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-extrabold leading-none ${isActive ? "bg-white/18 text-white" : "bg-[#3453a7]/12 text-[#3453a7]"}`}>
                    {item.count}
                  </span>
                </Button>
              )
            })}
          </div>

          {/* Messages List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <SiteLoader />
            </div>
          ) : filteredMessages.length === 0 ? (
            <Card className="border border-[#3453a7]/12 bg-white/95 shadow-[0_18px_40px_-34px_rgba(52,83,167,0.22)]">
              <CardContent className="p-6 sm:p-12 text-center">
                <Mail className="w-16 h-16 text-[#3453a7]/45 mx-auto mb-4" />
                <p className="text-xl text-[#60757f]">لا توجد رسائل</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((message) => (
                (() => {
                  const visualStatus = getVisualStatus(message)
                  return (
                <Card
                  key={message.id}
                  className={`border-2 transition-all duration-200 hover:shadow-lg ${
                    visualStatus === "unread"
                      ? "border-[#3453a7]/28 bg-[linear-gradient(135deg,rgba(52,83,167,0.08),rgba(79,111,199,0.03))]"
                      : visualStatus === "archived"
                        ? "border-slate-300 bg-slate-50"
                        : "border-[#d7dfef] bg-white"
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl text-[#1a2332]">{message.name}</CardTitle>
                          <Badge
                            variant={visualStatus === "unread" ? "default" : "secondary"}
                            className={
                              visualStatus === "unread"
                                ? "bg-[#3453a7] text-white"
                                : visualStatus === "archived"
                                  ? "bg-slate-600 text-white"
                                  : "bg-[#dce7ff] text-[#27428d]"
                            }
                          >
                            {visualStatus === "unread"
                              ? "جديدة"
                              : visualStatus === "archived"
                                ? "مؤرشفة"
                                : "مقروءة"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[#60757f]">
                          <span className="font-semibold">{subjectLabels[message.subject]}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {visualStatus === "archived" ? (
                          <Button
                            onClick={() => unarchiveMessage(message.id)}
                            size="sm"
                            className="bg-[#3453a7] hover:bg-[#27428d] text-white"
                          >
                            <ArchiveX className="w-4 h-4 ml-1" />
                            إلغاء الأرشفة
                          </Button>
                        ) : (
                          <Button
                            onClick={() => archiveMessage(message.id)}
                            size="sm"
                            variant="outline"
                            className="border-[#3453a7]/30 text-[#27428d] hover:bg-[#3453a7]/8"
                          >
                            <Archive className="w-4 h-4 ml-1" />
                            أرشفة
                          </Button>
                        )}
                        <Button
                          onClick={() => deleteMessage(message.id)}
                          size="sm"
                          variant="outline"
                          className="border-red-400 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 ml-1" />
                          حذف
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base leading-relaxed whitespace-pre-wrap text-[#334155]">{message.message}</p>
                  </CardContent>
                </Card>
                  )
                })()
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
