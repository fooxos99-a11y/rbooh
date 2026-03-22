"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"
import { Bell, CheckCircle2, Clock } from "lucide-react"
import { SiteLoader } from "@/components/ui/site-loader"

interface Notification {
  id: string
  message: string
  is_read: boolean
  created_at: string
}

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotificationStartAt = async (accountNumber: string) => {
    const response = await fetch(`/api/account-created-at?account_number=${accountNumber}`, { cache: "no-store" })
    const data = await response.json()
    return typeof data.created_at === "string" ? data.created_at : null
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    const accNum = localStorage.getItem("account_number") || localStorage.getItem("accountNumber")
    if (!accNum) {
      setLoading(false)
      return
    }

    try {
      const createdAt = await fetchNotificationStartAt(accNum)
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_account_number", accNum)
        .order("created_at", { ascending: false })

      if (createdAt) {
        query = query.gte("created_at", createdAt)
      }

      const { data, error } = await query

      if (error) throw error

      setNotifications(data || [])
      
      // Mark as read
      const unreadIds = data?.filter(n => !n.is_read).map(n => n.id) || []
      if (unreadIds.length > 0) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .in("id", unreadIds)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <SiteLoader size="md" color="#003f55" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center gap-3">
        <div className="w-12 h-12 flex items-center justify-center">
          <Bell className="w-6 h-6 text-[#003f55]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#023232]">الإشعارات</h1>
          <p className="text-gray-500 text-sm mt-1">سجل إشعاراتك وتنبيهاتك المهمة</p>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-400">لا توجد إشعارات جديدة</h3>
          </div>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id} className={`p-6 transition-colors ${!notification.is_read ? 'bg-[#3453a7]/[0.03]' : 'hover:bg-gray-50'}`}>
              <div className="flex items-start gap-4">
                <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${!notification.is_read ? 'bg-[#3453a7]' : 'bg-transparent'}`} />
                <div className="flex-1">
                  <p className={`text-base leading-relaxed ${!notification.is_read ? 'font-bold text-[#023232]' : 'text-gray-600'}`}>
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>
                      {new Date(notification.created_at).toLocaleString("ar-SA", {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
