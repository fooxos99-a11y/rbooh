"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ArrowRight, ShieldCheck, Users, BookOpen, Settings, UserPlus, FileText, MessageSquare, Bell, Map, Zap, ShoppingBag, Save, Banknote, BarChart3 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAdminAuth } from "@/hooks/use-admin-auth"

const DASHBOARD_ACTIONS = [
  { key: "إدارة الطلاب",              icon: Users },
  { key: "إدارة المعلمين",            icon: Settings },
  { key: "إدارة الحلقات",             icon: BookOpen },
  { key: "الهيكل الإداري",            icon: ShieldCheck },
  { key: "الصلاحيات",                 icon: ShieldCheck },
  { key: "طلبات الإلتحاق",           icon: UserPlus },
  { key: "التقارير",                   icon: FileText },
  { key: "الإرسال إلى أولياء الأمور", icon: MessageSquare },
  { key: "الإشعارات",                 icon: Bell },
  { key: "إدارة المسار",              icon: Map },
  { key: "إدارة الألعاب",             icon: Zap },
  { key: "إدارة المتجر",              icon: ShoppingBag },
  { key: "المالية",                   icon: Banknote },
  { key: "الإحصائيات",              icon: BarChart3 },
]

const DEFAULT_ROLES = ["سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"]

type PermissionsMap = Record<string, string[]>

export default function PermissionsPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("الصلاحيات");

  const [roles, setRoles] = useState<string[]>(DEFAULT_ROLES)
  const [permissions, setPermissions] = useState<PermissionsMap>({})
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")
    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
      return
    }
    fetchData()
  }, [router])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/roles")
      const data = await res.json()
      const fetchedRoles: string[] = (data.roles || DEFAULT_ROLES).filter((r: string) => r !== "مدير")
      const fetchedPerms: PermissionsMap = data.permissions || {}
      const normalized: PermissionsMap = {}
      fetchedRoles.forEach((r: string) => { normalized[r] = fetchedPerms[r] || [] })
      setRoles(fetchedRoles)
      setPermissions(normalized)
      if (fetchedRoles.length > 0) setSelectedRole(fetchedRoles[0])
    } catch {
      toast({ title: "خطأ", description: "تعذر جلب بيانات الصلاحيات", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const togglePermission = (action: string) => {
    if (!selectedRole) return
    setPermissions(prev => {
      const current = prev[selectedRole] || []
      const has = current.includes(action)
      return { ...prev, [selectedRole]: has ? current.filter(a => a !== action) : [...current, action] }
    })
  }

  const toggleAll = () => {
    if (!selectedRole) return
    const current = permissions[selectedRole] || []
    const allGranted = DASHBOARD_ACTIONS.every(a => current.includes(a.key))
    setPermissions(prev => ({ ...prev, [selectedRole]: allGranted ? [] : DASHBOARD_ACTIONS.map(a => a.key) }))
  }

  const savePermissions = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/roles")
      const data = await res.json()
      const saveRes = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: data.roles || roles, permissions })
      })
      if (saveRes.ok) {
        toast({ title: " تم الحفظ", description: `تم حفظ صلاحيات "${selectedRole}" بنجاح` })
      } else throw new Error("save failed")
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ أثناء حفظ الصلاحيات", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><div className="w-8 h-8 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" /></div>);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <div className="w-10 h-10 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
      </div>
    )
  }

  const currentPerms = permissions[selectedRole] || []

  const grantedCount = currentPerms.length
  const totalCount = DASHBOARD_ACTIONS.length
  const allGranted = grantedCount === totalCount
  const progressPct = Math.round((grantedCount / totalCount) * 100)

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f5f0]" dir="rtl">
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">

          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/admin/dashboard")}
                className="w-10 h-10 rounded-full bg-white border border-[#D4AF37]/30 flex items-center justify-center text-neutral-500 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-all shadow-sm"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-[#1a2332]">إدارة الصلاحيات</h1>
                <p className="text-sm text-neutral-400 mt-0.5">تحكم بصلاحيات الوصول لكل مسمى وظيفي</p>
              </div>
            </div>
            {selectedRole && (
              <button
                onClick={savePermissions}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-l from-[#C9A961] to-[#D4AF37] hover:opacity-90 text-white rounded-xl font-semibold shadow-md transition-all disabled:opacity-60 text-sm"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </button>
            )}
          </div>

          {/* Role Tabs */}
          <div className="bg-white rounded-2xl border border-[#E8DFC8] shadow-sm p-1.5 flex flex-wrap gap-1">
            {roles.map(role => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex-1 justify-center min-w-[100px] ${
                  selectedRole === role
                    ? "bg-[#D4AF37] text-white shadow-md"
                    : "text-neutral-500 hover:bg-[#f5f1e8] hover:text-[#D4AF37]"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 opacity-80" />
                {role}
              </button>
            ))}
            {roles.length === 0 && (
              <p className="text-sm text-neutral-400 p-3">لا توجد مسميات. أضف من صفحة الهيكل الإداري.</p>
            )}
          </div>

          {/* Permissions Panel */}
          {selectedRole && (
            <div className="bg-white rounded-2xl border border-[#E8DFC8] shadow-sm overflow-hidden">

              {/* Stats bar */}
              <div className="px-6 pt-5 pb-4 border-b border-[#f0ebe0]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#C9A961] flex items-center justify-center shadow">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-[#1a2332] text-base leading-tight">{selectedRole}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{grantedCount} من {totalCount} صلاحية مفعّلة</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleAll}
                    className={`text-xs px-4 py-2 rounded-lg font-semibold border transition-all ${
                      allGranted
                        ? "bg-red-50 border-red-200 text-red-500 hover:bg-red-100"
                        : "bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#C9A961] hover:bg-[#D4AF37]/20"
                    }`}
                  >
                    {allGranted ? "إلغاء الكل" : "تفعيل الكل"}
                  </button>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-[#C9A961] to-[#D4AF37] rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Toggle list */}
              <div className="divide-y divide-[#f0ebe0]">
                {DASHBOARD_ACTIONS.map(({ key, icon: Icon }) => {
                  const granted = currentPerms.includes(key)
                  return (
                    <div
                      key={key}
                      onClick={() => togglePermission(key)}
                      className={`flex items-center justify-between px-6 py-4 cursor-pointer transition-colors group ${
                        granted ? "hover:bg-green-50/50" : "hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          granted
                            ? "bg-green-100 text-green-600"
                            : "bg-neutral-100 text-neutral-400 group-hover:bg-[#D4AF37]/10 group-hover:text-[#D4AF37]"
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className={`text-sm font-medium transition-colors ${
                          granted ? "text-[#1a2332]" : "text-neutral-500"
                        }`}>{key}</span>
                      </div>

                      {/* Toggle Switch */}
                      <div className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                        granted ? "bg-green-500" : "bg-neutral-200"
                      }`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
                          granted ? "right-0.5" : "left-0.5"
                        }`} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer save */}
              <div className="px-6 py-4 bg-[#fafaf8] border-t border-[#f0ebe0] flex items-center justify-between">
                <p className="text-xs text-neutral-400">
                  {grantedCount === 0 ? "لا توجد صلاحيات مفعّلة" : `${grantedCount} صلاحية مفعّلة  ${totalCount - grantedCount} موقوفة`}
                </p>
                <button
                  onClick={savePermissions}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-l from-[#C9A961] to-[#D4AF37] hover:opacity-90 text-white rounded-xl font-semibold text-sm shadow transition-all disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? "جاري الحفظ..." : "حفظ"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
