"use client";

import { useState, useEffect } from "react";

import Image from "next/image";

import { useRouter } from "next/navigation";

import {
  ChevronLeft,
  User,
  LogOut,
  Users,
  LayoutDashboard,
  Menu,
  ClipboardCheck,
  Trophy,
  Store,
  Map,
  Target,
  MessageSquare,
  Home,
  Gamepad2,
  Star,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  Settings,
  FileText,
  Award,
  Edit2,
  BookOpen,
  ShieldCheck,
  Zap,
  Bell,
  Send,
  ShoppingBag,
  Phone,
  Banknote,
  BarChart3,
  Trash2,
  BookMarked,
} from "lucide-react";

import { Button } from "@/components/ui/button"
import { GlobalAddStudentDialog } from "@/components/global-add-student-dialog";
import { GlobalAdminModals } from "@/components/global-admin-modals";
import { createClient } from "@/lib/supabase/client";

import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

import { TeacherAttendanceModal } from "@/components/teacher-attendance-modal";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SiteLoader } from "@/components/ui/site-loader";

interface Circle {
  name: string;

  studentCount: number;
}

const CIRCLES_CACHE_DURATION = 5 * 60 * 1000;

function NavItem({
  icon: Icon,

  label,

  onClick,

  gold,

  indent,
}: {
  icon: React.ElementType;

  label: string;

  onClick: () => void;

  gold?: boolean;

  indent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative cursor-pointer

        ${indent ? "pr-8" : ""}

        ${gold ? "text-[#b5862c] hover:bg-[#d8a355]/12" : "text-[#1a2e2b] hover:bg-[#00312e]/7"}`}
    >
      <Icon
        size={17}
        className={`flex-shrink-0 transition-all duration-200 group-hover:scale-110
          ${gold ? "text-[#d8a355]" : "text-[#00312e]/50 group-hover:text-[#00312e]/80"}`}
      />

      <span className="flex-1 text-right leading-tight">{label}</span>
    </button>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-5 pb-1.5">
      <p className="text-[9px] font-black tracking-[0.2em] text-[#00312e]/35 uppercase">
        {title}
      </p>
    </div>
  );
}

function CollapseSection({
  icon: Icon,

  label,

  isOpen,

  onToggle,

  children,
}: {
  icon: React.ElementType;

  label: string;

  isOpen: boolean;

  onToggle: () => void;

  children: React.ReactNode;
}) {
  return (
    <div className="mb-0.5">
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group cursor-pointer

          ${isOpen ? "bg-[#00312e]/7 text-[#00312e]" : "text-[#1a2e2b] hover:bg-[#00312e]/7"}`}
      >
        <Icon
          size={17}
          className={`flex-shrink-0 transition-all duration-200 group-hover:scale-110
          ${isOpen ? "text-[#00312e]" : "text-[#00312e]/50 group-hover:text-[#00312e]/80"}`}
        />

        <span className="flex-1 text-right leading-tight">{label}</span>

        <ChevronLeft
          size={14}
          className={`flex-shrink-0 transition-transform duration-300 ${isOpen ? "-rotate-90 opacity-70" : "opacity-35"}`}
        />
      </button>

      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pt-0.5 pb-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Header() {
    const [globalRank, setGlobalRank] = useState<string | number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [isGlobalRankLoading, setIsGlobalRankLoading] = useState(true);

  const [userRole, setUserRole] = useState<string | null>(null);

  const [userName, setUserName] = useState<string | null>(null);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [circles, setCircles] = useState<Circle[]>([]);

  const [circlesLoading, setCirclesLoading] = useState(true);

  const [teacherInfo, setTeacherInfo] = useState<{
    id: string;

    name: string;

    accountNumber: number;
  } | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isStudentsOpen, setIsStudentsOpen] = useState(false);

  const [isAdminStudentsOpen, setIsAdminStudentsOpen] = useState(false);

  const [isAdminReportsOpen, setIsAdminReportsOpen] = useState(false);

  const [isAdminCommOpen, setIsAdminCommOpen] = useState(false);

  const [isAdminGeneralOpen, setIsAdminGeneralOpen] = useState(false);

  const [isAdminGamesOpen, setIsAdminGamesOpen] = useState(false);

  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

  const [validAdminRoles, setValidAdminRoles] = useState<string[]>([
    "admin",
    "مدير",
    "سكرتير",
    "مشرف تعليمي",
    "مشرف تربوي",
    "مشرف برامج",
  ]);

  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [userAccountNumber, setUserAccountNumber] = useState<number | null>(null);
  const [notificationStartAt, setNotificationStartAt] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<{id:string;message:string;is_read:boolean;created_at:string}[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [dailyChallengePlayedToday, setDailyChallengePlayedToday] = useState(false);
  const [sidebarPlanProgress, setSidebarPlanProgress] = useState<number | null>(null);
  const [sidebarQuranProgress, setSidebarQuranProgress] = useState<number | null>(null);
  const [sidebarQuranLevel, setSidebarQuranLevel] = useState<number>(0);
  const [sidebarStudentPoints, setSidebarStudentPoints] = useState<number>(0);
  const [sidebarPlanName, setSidebarPlanName] = useState<string | null>(null);
  const [isSidebarStudentStatsLoading, setIsSidebarStudentStatsLoading] = useState(true);

  const isAdmin = userAccountNumber === 2 || validAdminRoles.includes(userRole || "");

  const isFullAccess = userAccountNumber === 2 || userRole === "admin" || userRole === "مدير" || userPermissions.includes("all");

  const hasPermission = (key: string) => isFullAccess || userPermissions.includes(key);

  const router = useRouter();

  const confirmDialog = useConfirmDialog();

  const fetchNotificationStartAt = async (accountNumber: string) => {
    try {
      const response = await fetch(`/api/account-created-at?account_number=${accountNumber}`, { cache: "no-store" });
      const data = await response.json();
      const createdAt = typeof data.created_at === "string" ? data.created_at : null;
      setNotificationStartAt(createdAt);
      return createdAt;
    } catch {
      setNotificationStartAt(null);
      return null;
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "instant" });

  useEffect(() => {
        // جلب الترتيب العام للطالب عند تحميل القائمة الجانبية
        const fetchGlobalRank = async () => {
          const accNum = localStorage.getItem("accountNumber");
          const role = localStorage.getItem("userRole");
          if (!(accNum && role === "student")) {
            setIsGlobalRankLoading(false);
            return;
          }
          const cachedGlobalRank = localStorage.getItem(`studentGlobalRank_${accNum}`) || localStorage.getItem("studentGlobalRank");
          if (cachedGlobalRank) {
            setGlobalRank(cachedGlobalRank);
            setIsGlobalRankLoading(false);
          }
          if (accNum && role === "student") {
            try {
              // جلب بيانات الطالب للحصول على studentId
              const resStudents = await fetch(`/api/students?account_number=${accNum}`);
              const dataStudents = await resStudents.json();
              const student = (dataStudents.students || []).find((s:any) => String(s.account_number) === String(accNum));
              if (student && student.id) {
                const resRank = await fetch(`/api/student-ranking?student_id=${student.id}`);
                const dataRank = await resRank.json();
                if (dataRank.success && dataRank.ranking && dataRank.ranking.globalRank) {
                  setGlobalRank(dataRank.ranking.globalRank);
                  localStorage.setItem('studentGlobalRank', String(dataRank.ranking.globalRank));
                  localStorage.setItem(`studentGlobalRank_${accNum}`, String(dataRank.ranking.globalRank));
                } else {
                  setGlobalRank("-");
                  localStorage.setItem('studentGlobalRank', "-");
                  localStorage.setItem(`studentGlobalRank_${accNum}`, "-");
                }
              } else {
                setGlobalRank("-");
                localStorage.setItem('studentGlobalRank', "-");
                localStorage.setItem(`studentGlobalRank_${accNum}`, "-");
              }
            } catch {
              setGlobalRank("-");
              localStorage.setItem('studentGlobalRank', "-");
              localStorage.setItem(`studentGlobalRank_${accNum}`, "-");
            } finally {
              setIsGlobalRankLoading(false);
            }
          }
        };
        fetchGlobalRank();
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";

    const role = localStorage.getItem("userRole");

    const name = localStorage.getItem("userName");

    setIsLoggedIn(loggedIn);

    setUserRole(role);

    setUserName(name);

    setAuthResolved(true);

    const accNumStr = localStorage.getItem("accountNumber");
    if (accNumStr) setUserAccountNumber(Number(accNumStr));

    // Check if student played today's daily challenge
    if (accNumStr) {
      const now = new Date();
      const saDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
      const todayStr = saDate.toISOString().split("T")[0];
      const lastPlay = localStorage.getItem(`lastPlayDate_${accNumStr}`);
      setDailyChallengePlayedToday(lastPlay === todayStr);
    }
    const fetchUnread = async () => {
      if (!accNumStr) return;
      try {
        const createdAt = await fetchNotificationStartAt(accNumStr);
        const supabase = createClient();
        let query = supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_account_number", accNumStr)
          .eq("is_read", false);
        if (createdAt) {
          query = query.gte("created_at", createdAt);
        }
        const { count } = await query;
        setUnreadCount(count || 0);
      } catch {}
    };
    fetchUnread();

    if (loggedIn && (role === "teacher" || role === "deputy_teacher")) {
      const accNum = localStorage.getItem("accountNumber");
      if (accNum) fetchTeacherInfo(accNum);
    }

    if (loggedIn && role === "student") {
      const accNum = localStorage.getItem("accountNumber");
      if (accNum) {
        const cachedStats = localStorage.getItem(`studentHeaderStats_${accNum}`);
        if (cachedStats) {
          try {
            const parsed = JSON.parse(cachedStats);
            setSidebarPlanProgress(parsed.sidebarPlanProgress ?? 0);
            setSidebarQuranProgress(parsed.sidebarQuranProgress ?? 0);
            setSidebarQuranLevel(parsed.sidebarQuranLevel ?? 0);
            setSidebarStudentPoints(parsed.sidebarStudentPoints ?? 0);
            setSidebarPlanName(parsed.sidebarPlanName ?? null);
            setIsSidebarStudentStatsLoading(false);
          } catch {}
        }
        fetchSidebarPlan(accNum);
      }
      else setIsSidebarStudentStatsLoading(false);
    } else {
      setIsSidebarStudentStatsLoading(false);
    }

    loadCircles();

    // Verify fresh role from DB (background) to keep sidebar in sync
    if (loggedIn) {
      const accountNumber = localStorage.getItem("accountNumber");
      if (accountNumber) {
        verifyFreshRole(accountNumber);
      }
    }
  }, []);

  const verifyFreshRole = async (accountNumber: string) => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("account_number", Number(accountNumber))
        .single();

      if (!data) return;
      const freshRole = data.role || "";

      // Fetch valid admin roles dynamically from API
      let freshAdminRoles = [
        "ادمين",
        "مدير",
        "سكرتير",
        "مشرف تعليمي",
        "مشرف تربوي",
        "مشرف برامج",
      ];
      try {
        const res = await fetch("/api/roles");
        const rolesData = await res.json();
        if (rolesData.roles) {
          freshAdminRoles = ["admin", ...rolesData.roles];
        }
        // Set permissions for this role
        const freshPerms: string[] = rolesData.permissions?.[freshRole] || [];
        setUserPermissions(freshPerms);
      } catch {}

      // Update localStorage and state with fresh role
      localStorage.setItem("userRole", freshRole);
      setUserRole(freshRole);
      setValidAdminRoles(freshAdminRoles);

      // If role is no longer valid admin, update isLoggedIn display
      if (
        freshRole === "student" ||
        freshRole === "teacher" ||
        freshRole === "deputy_teacher" ||
        !freshRole ||
        (!validAdminRoles.includes(freshRole) &&
          freshRole !== "student" &&
          freshRole !== "teacher" &&
          freshRole !== "deputy_teacher")
      ) {
        // No redirect here — just update sidebar. Redirect happens on admin pages via useAdminAuth.
      }
    } catch {}
  };

  const loadCircles = () => {
    const cachedData = localStorage.getItem("circlesCache");

    const cacheTime = localStorage.getItem("circlesCacheTime");

    if (
      cachedData &&
      cacheTime &&
      Date.now() - Number(cacheTime) < CIRCLES_CACHE_DURATION
    ) {
      setCircles(JSON.parse(cachedData));

      setCirclesLoading(false);
    } else {
      fetchCircles();
    }
  };

  const fetchCircles = async () => {
    try {
      setCirclesLoading(true);

      const res = await fetch("/api/circles");

      const data = await res.json();

      if (data.circles) {
        setCircles(data.circles);

        localStorage.setItem("circlesCache", JSON.stringify(data.circles));

        localStorage.setItem("circlesCacheTime", Date.now().toString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCirclesLoading(false);
    }
  };

  const fetchSidebarPlan = async (accNum: string) => {
    try {
      const res = await fetch(`/api/students?account_number=${accNum}`);
      const data = await res.json();
      const student = (data.students || [])[0];
      if (!student) {
        setSidebarPlanProgress(0);
        setSidebarQuranProgress(0);
        setSidebarQuranLevel(0);
        setSidebarStudentPoints(0);
        setSidebarPlanName(null);
        localStorage.setItem(`studentHeaderStats_${accNum}`, JSON.stringify({
          sidebarPlanProgress: 0,
          sidebarQuranProgress: 0,
          sidebarQuranLevel: 0,
          sidebarStudentPoints: 0,
          sidebarPlanName: null,
        }));
        return;
      }
      setSidebarStudentPoints(Number(student.points) || 0);
      const planRes = await fetch(`/api/student-plans?student_id=${student.id}`);
      const planData = await planRes.json();
      if (planData.plan) {
        setSidebarPlanProgress(planData.progressPercent ?? 0);
        setSidebarQuranProgress(planData.quranProgressPercent ?? 0);
        setSidebarQuranLevel(planData.quranLevel ?? 0);
        setSidebarPlanName(`${planData.plan.start_surah_name} ← ${planData.plan.end_surah_name}`);
        localStorage.setItem(`studentHeaderStats_${accNum}`, JSON.stringify({
          sidebarPlanProgress: planData.progressPercent ?? 0,
          sidebarQuranProgress: planData.quranProgressPercent ?? 0,
          sidebarQuranLevel: planData.quranLevel ?? 0,
          sidebarStudentPoints: Number(student.points) || 0,
          sidebarPlanName: `${planData.plan.start_surah_name} ← ${planData.plan.end_surah_name}`,
        }));
      } else {
        setSidebarPlanProgress(0);
        setSidebarQuranProgress(0);
        setSidebarQuranLevel(0);
        setSidebarPlanName(null);
        localStorage.setItem(`studentHeaderStats_${accNum}`, JSON.stringify({
          sidebarPlanProgress: 0,
          sidebarQuranProgress: 0,
          sidebarQuranLevel: 0,
          sidebarStudentPoints: Number(student.points) || 0,
          sidebarPlanName: null,
        }));
      }
    } catch {
      setSidebarPlanProgress(0);
      setSidebarQuranProgress(0);
      setSidebarQuranLevel(0);
      setSidebarStudentPoints(0);
      setSidebarPlanName(null);
      localStorage.setItem(`studentHeaderStats_${accNum}`, JSON.stringify({
        sidebarPlanProgress: 0,
        sidebarQuranProgress: 0,
        sidebarQuranLevel: 0,
        sidebarStudentPoints: 0,
        sidebarPlanName: null,
      }));
    } finally {
      setIsSidebarStudentStatsLoading(false);
    }
  };

  const fetchTeacherInfo = async (accNum: string) => {
    try {
      const res = await fetch(`/api/teachers?account_number=${accNum}`);

      const data = await res.json();

      if (data.teachers?.[0]) {
        setTeacherInfo({
          id: data.teachers[0].id,

          name: data.teachers[0].name,

          accountNumber: data.teachers[0].account_number,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    const confirmed = await confirmDialog({
      title: "تأكيد تسجيل الخروج",

      description: "هل أنت متأكد من أنك تريد تسجيل الخروج؟",

      confirmText: "نعم، تسجيل الخروج",

      cancelText: "إلغاء",
    });

    if (confirmed) {
      setIsLoggingOut(true);

      await new Promise((r) => setTimeout(r, 800));

      localStorage.clear();

      setIsLoggedIn(false);

      setUserRole(null);

      setIsLoggingOut(false);

      router.push("/");
    }
  };

  const handleNav = (href: string) => {
    setIsMobileMenuOpen(false);
    scrollToTop();

    if (href.startsWith('?')) {
      const dashboardOnlyActions: string[] = [];
        const action = href.split('=')[1];
        
        if (dashboardOnlyActions.includes(action) && window.location.pathname !== '/admin/dashboard') {
            router.push('/admin/dashboard' + href);
        } else {
            router.push(window.location.pathname + href);
        }
    } else {
        router.push(href);
    }
  };

  const goToProfile = () => {
    if (isAdmin) router.push("/admin/profile");
    else if (userRole === "teacher" || userRole === "deputy_teacher") router.push("/teacher/dashboard");
    else router.push("/profile");

    scrollToTop();
  };

  const deleteNotification = async (id: string) => {
    try {
      const supabase = createClient();
      await supabase.from("notifications").delete().eq("id", id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  const roleLabel = isAdmin
    ? (userAccountNumber === 2 ? "مدير" : (userRole || "مشرف"))
    : userRole === "teacher"
      ? "معلم"
      : userRole === "deputy_teacher"
        ? "نائب معلم"
        : userRole === "student"
        ? "طالب"
        : "";

  const isStudentHeaderStatsReady =
    authResolved &&
    isLoggedIn &&
    userRole === "student" &&
    !isSidebarStudentStatsLoading &&
    !isGlobalRankLoading;

  return (
    <>
      {isLoggedIn && (userRole === "teacher" || userRole === "deputy_teacher") && teacherInfo && (
        <TeacherAttendanceModal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          teacherId={teacherInfo.id}
          teacherName={teacherInfo.name}
          accountNumber={teacherInfo.accountNumber}
        />
      )}

      {isLoggingOut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white rounded-3xl px-10 py-8 flex flex-col items-center shadow-2xl min-w-[260px]">
            <SiteLoader size="md" color="#D4AF37" />
          </div>
        </div>
      )}

      <header className="text-white sticky top-0 z-50 shadow-lg relative" style={{ background: "linear-gradient(to right, #0f5c5c -80%, #032424 100%)" }}>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex items-center gap-2">
          <button
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/10 transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="القائمة"
          >
            <Menu size={26} />
          </button>
          {isLoggedIn && userRole === "student" && (
            <DropdownMenu onOpenChange={async (open) => {
              if (!open) return;
              const accNumStr = localStorage.getItem("accountNumber");
              if (!accNumStr) return;
              setNotifLoading(true);
              try {
                const supabase = createClient();
                const createdAt = notificationStartAt || await fetchNotificationStartAt(accNumStr);
                let query = supabase
                  .from("notifications")
                  .select("id,message,is_read,created_at")
                  .eq("user_account_number", accNumStr)
                  .order("created_at", { ascending: false })
                  .limit(20);
                if (createdAt) {
                  query = query.gte("created_at", createdAt);
                }
                const { data } = await query;
                setNotifications(data || []);
                const unreadIds = (data || []).filter(n => !n.is_read).map(n => n.id);
                if (unreadIds.length > 0) {
                  await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
                  setUnreadCount(0);
                }
              } catch {}
              setNotifLoading(false);
            }}>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                  aria-label="الإشعارات"
                >
                  <Bell size={22} className="text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-[320px] p-0 overflow-hidden rounded-xl shadow-2xl border border-gray-200">
                <div dir="rtl" className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#d8a355]/15 flex items-center justify-center">
                      <Bell size={13} className="text-[#d8a355]" />
                    </div>
                    <span className="font-bold text-gray-800 text-sm">الإشعارات</span>
                  </div>
                  {notifications.length > 0 && (
                    <span className="text-[11px] bg-[#d8a355]/15 text-[#c99347] px-2 py-0.5 rounded-full font-semibold">
                      {notifications.length}
                    </span>
                  )}
                </div>
                <div className="max-h-[380px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#d8a35540_transparent] bg-white" dir="rtl">
                  {notifLoading ? (
                    <div className="flex items-center justify-center py-14">
                      <SiteLoader size="sm" color="#d8a355" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-14 flex flex-col items-center gap-3 text-center">
                      <div className="w-14 h-14 rounded-full bg-[#d8a355]/10 flex items-center justify-center">
                        <Bell size={24} className="text-[#d8a355]/60" />
                      </div>
                      <p className="text-sm text-gray-400 font-medium">لا توجد إشعارات</p>
                    </div>
                  ) : (
                    <div>
                      {notifications.map((n, i) => (
                        <div
                          key={n.id}
                          className={`group flex items-start gap-3 px-4 py-3.5 hover:bg-amber-50/60 transition-colors cursor-default ${i !== notifications.length - 1 ? "border-b border-gray-100" : ""}`}
                        >
                          <div className="flex-shrink-0 mt-2">
                            {!n.is_read
                              ? <div className="w-2 h-2 rounded-full bg-[#d8a355] shadow-sm" />
                              : <div className="w-2 h-2 rounded-full border border-gray-300" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-relaxed break-words ${!n.is_read ? "text-gray-800 font-medium" : "text-gray-500"}`}>
                              {n.message}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1.5">
                              {new Date(n.created_at).toLocaleString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                            className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {isStudentHeaderStatsReady && (() => {
          const currentLevel = Math.max(0, Math.min(100, sidebarQuranLevel || 0));
          const displayProgress = currentLevel;

          return (
            <div className="absolute left-12 md:left-16 top-1/2 -translate-y-1/2 flex items-center gap-2 transform-gpu drop-shadow-sm select-none z-30" style={{ direction: 'ltr' }}>
              <div className="relative flex items-center gap-1.5">
                <div 
                   className="relative flex flex-col items-center justify-center z-30 drop-shadow-md"
                   style={{
                     width: "48px",
                     height: "42px",
                   }}
                >
                  <div className="absolute w-full h-full"
                       style={{
                         background: "linear-gradient(to bottom, #ffffff, #e1e4eb)",
                         clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
                         padding: "2.5px"
                       }}>
                    <div className="relative w-full h-full flex items-center justify-center p-[2px]"
                         style={{
                           background: "linear-gradient(to bottom, #eceef3, #d3d7df)",
                           clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
                           boxShadow: "inset 0 -2px 3px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.8)"
                         }}>
                      <span 
                        className="relative z-10 text-[18px] sm:text-[20px] font-black pb-[1px]"
                        style={{
                          color: "#c99347",
                          filter: "drop-shadow(0px -1px 0px rgba(255,255,255,1)) drop-shadow(0px 2px 2px rgba(0,0,0,0.2))"
                        }}
                      >
                        {currentLevel}
                      </span>
                    </div>
                  </div>
                </div>

                <div 
                  className="relative flex items-center h-5 w-36 z-20 ml-[-24px]"
                  style={{
                    background: "linear-gradient(to bottom, #ffffff, #dcdede)",
                    borderRadius: "0 100px 100px 0",
                    padding: "2px",
                    paddingLeft: "0",
                  }}
                >
                  <div
                    className="relative w-full h-full"
                    style={{
                      background: "linear-gradient(to bottom, #e2e5eb, #ced3db)",
                      borderRadius: "0 100px 100px 0",
                      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)"
                    }}
                  >
                    <div 
                      className="absolute top-0 left-0 bottom-0 z-10 transition-all duration-1000"
                      style={{ 
                        width: displayProgress > 0 ? `min(100%, calc(${displayProgress}% + 24px))` : "0%",
                        background: "linear-gradient(to right, #D4AF37, #C9A961)",
                        borderRadius: "0 100px 100px 0"
                      }}
                    >
                      <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/40 to-transparent"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-30 group">
                <div
                  className="flex items-center gap-1.5 h-7 sm:h-8 px-3 rounded-full border border-[#D4AF37]/50"
                  style={{
                    background: "linear-gradient(135deg, rgba(58,36,8,0.96), rgba(140,91,18,0.9))",
                    boxShadow: "inset 0 1px 0 rgba(255,245,214,0.18), 0 4px 10px rgba(0,0,0,0.18)",
                  }}
                  aria-label="الترتيب العام"
                  title="الترتيب العام"
                >
                  <Trophy
                    className="w-4 h-4 text-[#ffd36b] drop-shadow-[0_0_4px_rgba(255,211,107,0.35)]"
                    strokeWidth={1.9}
                  />
                  <span className="text-[13px] font-black tabular-nums text-[#fff7df] leading-none tracking-wide">
                    {globalRank ?? "-"}
                  </span>
                </div>

                <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#D4AF37]/30 bg-[linear-gradient(135deg,rgba(58,36,8,0.98),rgba(140,91,18,0.95))] px-2 py-1 text-[10px] font-semibold text-[#fff7df] shadow-[0_6px_18px_rgba(0,0,0,0.18)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  الترتيب العام
                </div>
              </div>

              <div className="relative z-30 group">
                <div
                  className="flex items-center gap-1.5 h-7 sm:h-8 px-3 rounded-full border border-[#D4AF37]/50"
                  style={{
                    background: "linear-gradient(135deg, rgba(3,36,36,0.92), rgba(15,92,92,0.88))",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 10px rgba(0,0,0,0.18)",
                  }}
                  aria-label="النقاط"
                  title="النقاط"
                >
                  <Star
                    className="w-4 h-4 text-[#f4d03f] fill-[#f4d03f] drop-shadow-[0_0_4px_rgba(244,208,63,0.35)]"
                    strokeWidth={1.8}
                  />
                  <span className="text-[13px] font-black tabular-nums text-[#fff7df] leading-none tracking-wide">
                    {sidebarStudentPoints}
                  </span>
                </div>

                <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#D4AF37]/30 bg-[linear-gradient(135deg,rgba(3,36,36,0.98),rgba(15,92,92,0.95))] px-2 py-1 text-[10px] font-semibold text-[#fff7df] shadow-[0_6px_18px_rgba(0,0,0,0.18)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  النقاط
                </div>
              </div>
            </div>
          );
        })()}
        <div className="container mx-auto px-4 h-20 flex items-center justify-between relative">
          <div className="w-[40px] z-20 shrink-0" />

          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10">
            <Image
              src="/قبس.png"
              alt="قبس"
              width={100}
              height={60}
              className="w-20 md:w-24 h-auto cursor-pointer"
              onClick={() => handleNav("/")}
            />
          </div>

          <div className="z-20 flex items-center gap-2 min-w-[40px] justify-end">
            {isLoggedIn && userRole !== "student" && (
              <DropdownMenu onOpenChange={async (open) => {
                if (!open) return;
                const accNumStr = localStorage.getItem("accountNumber");
                if (!accNumStr) return;
                setNotifLoading(true);
                try {
                  const supabase = createClient();
                  const createdAt = notificationStartAt || await fetchNotificationStartAt(accNumStr);
                  let query = supabase
                    .from("notifications")
                    .select("id,message,is_read,created_at")
                    .eq("user_account_number", accNumStr)
                    .order("created_at", { ascending: false })
                    .limit(20);
                  if (createdAt) {
                    query = query.gte("created_at", createdAt);
                  }
                  const { data } = await query;
                  setNotifications(data || []);
                  const unreadIds = (data || []).filter(n => !n.is_read).map(n => n.id);
                  if (unreadIds.length > 0) {
                    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
                    setUnreadCount(0);
                  }
                } catch {}
                setNotifLoading(false);
              }}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="fixed left-4 top-4 z-[70] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#0b4b4b]/95 shadow-[0_12px_30px_rgba(3,36,36,0.28)] backdrop-blur-sm transition-colors hover:bg-[#0f5c5c]"
                    aria-label="الإشعارات"
                  >
                    <Bell size={22} className="text-white" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="w-[320px] p-0 overflow-hidden rounded-xl shadow-2xl border border-gray-200">
                  {/* Header */}
                  <div dir="rtl" className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#d8a355]/15 flex items-center justify-center">
                        <Bell size={13} className="text-[#d8a355]" />
                      </div>
                      <span className="font-bold text-gray-800 text-sm">الإشعارات</span>
                    </div>
                    {notifications.length > 0 && (
                      <span className="text-[11px] bg-[#d8a355]/15 text-[#c99347] px-2 py-0.5 rounded-full font-semibold">
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  {/* Body */}
                  <div className="max-h-[380px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#d8a35540_transparent] bg-white" dir="rtl">
                    {notifLoading ? (
                      <div className="flex items-center justify-center py-14">
                        <SiteLoader size="sm" color="#d8a355" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="py-14 flex flex-col items-center gap-3 text-center">
                        <div className="w-14 h-14 rounded-full bg-[#d8a355]/10 flex items-center justify-center">
                          <Bell size={24} className="text-[#d8a355]/60" />
                        </div>
                        <p className="text-sm text-gray-400 font-medium">لا توجد إشعارات</p>
                      </div>
                    ) : (
                      <div>
                        {notifications.map((n, i) => (
                          <div
                            key={n.id}
                            className={`group flex items-start gap-3 px-4 py-3.5 hover:bg-amber-50/60 transition-colors cursor-default ${i !== notifications.length - 1 ? "border-b border-gray-100" : ""}`}
                          >
                            {/* Unread indicator */}
                            <div className="flex-shrink-0 mt-2">
                              {!n.is_read
                                ? <div className="w-2 h-2 rounded-full bg-[#d8a355] shadow-sm" />
                                : <div className="w-2 h-2 rounded-full border border-gray-300" />
                              }
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm leading-relaxed break-words ${!n.is_read ? "text-gray-800 font-medium" : "text-gray-500"}`}>
                                {n.message}
                              </p>
                              <p className="text-[11px] text-gray-400 mt-1.5">
                                {new Date(n.created_at).toLocaleString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            {/* Delete */}
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                              className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {authResolved && !isLoggedIn && (
              <Button
                onClick={() => handleNav("/login")}
                className="bg-[#d8a355] hover:bg-[#c99347] text-[#00312e] font-extrabold rounded-lg px-5 h-9 text-sm"
              >
                دخول
              </Button>
            )}
          </div>
        </div>
        <GlobalAddStudentDialog />
    </header>

      {/* خلفية مظللة */}

      <div
        className={`fixed inset-0 bg-black/50 z-[80] backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* الدرج الجانبي */}

      <div
        dir="rtl"
        className={`fixed top-0 right-0 h-full w-[300px] bg-[#f9fafb] z-[90] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* رأس الدرج */}

        <div className="bg-[#00312e] px-4 pt-3 pb-4 flex-shrink-0">
          {/* الصف العلوي: اللوغو + إغلاق */}
          <div className="flex items-center justify-between mb-3">
            <Image
              src="/قبس.png"
              alt="قبس"
              width={120}
              height={70}
              className="h-12 w-auto cursor-pointer"
              onClick={() => handleNav("/")}
            />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center transition-all duration-200 active:scale-90 hover:opacity-70"
            >
              <Menu size={22} className="text-white" />
            </button>
          </div>

          {/* معلومات المستخدم */}
          {isLoggedIn && (
            <>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => { goToProfile(); setIsMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.08] transition-colors rounded-xl px-3 py-2.5"
                >
                  <div className="w-10 h-10 rounded-full bg-[#d8a355] flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-[#00312e]" />
                  </div>
                  <div className="flex-1 text-right min-w-0">
                    <p className="text-white font-bold text-sm truncate">{userName || "المستخدم"}</p>
                    <p className="text-white/60 text-xs mt-0.5">{roleLabel}</p>
                  </div>
                  <ChevronLeft size={16} className="text-white/40 flex-shrink-0" />
                </button>
              </div>
            </>
          )}

        </div>

        {/* محتوى الدرج */}

        <div className="flex-1 overflow-y-auto bg-[#f9fafb] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {isLoggedIn && (userRole === "teacher" || userRole === "deputy_teacher") && (
            <>
              <SectionHeader title="الإدارة" />
              <div className="px-2 mb-0">
                <NavItem
                  icon={ClipboardCheck}
                  label="التحضير"
                  onClick={() => {
                    setIsAttendanceModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                />
                {userRole === "teacher" && (
                  <NavItem
                    icon={BookMarked}
                    label="خطة الطلاب"
                    onClick={() => handleNav("/teacher/student-plans")}
                  />
                )}
                <NavItem
                  icon={Users}
                  label="إدارة الحلقة"
                  onClick={() => handleNav("/teacher/halaqah/1")}
                />
              </div>
            </>
          )}

          <SectionHeader title="المعلومات العامة" />

          <div className="px-2 mb-2">
            <NavItem
              icon={Home}
              label="الرئيسية"
              onClick={() => handleNav("/")}
            />

            <NavItem
              icon={Trophy}
              label="الإنجازات"
              onClick={() => handleNav("/achievements")}
            />

            <NavItem
              icon={MessageSquare}
              label="تواصل معنا"
              onClick={() => handleNav("/contact")}
            />

            <CollapseSection
              icon={Star}
              label="أفضل الطلاب"
              isOpen={isStudentsOpen}
              onToggle={() => setIsStudentsOpen(!isStudentsOpen)}
            >
              <NavItem
                icon={Users}
                label="جميع الطلاب"
                onClick={() => handleNav("/students/all")}
                indent
              />

              {circlesLoading ? (
                <div className="pr-10 pl-4 py-3 flex justify-start">
                  <SiteLoader size="sm" color="#d8a355" />
                </div>
              ) : (
                circles.map((c) => (
                  <NavItem
                    key={c.name}
                    icon={BookOpen}
                    label={c.name}
                    onClick={() => handleNav(`/halaqat/${c.name}`)}
                    indent
                  />
                ))
              )}
            </CollapseSection>

            {isLoggedIn && (userRole === "teacher" || userRole === "deputy_teacher" || isAdmin) && (
              <NavItem
                icon={Gamepad2}
                label="المسابقات"
                onClick={() => handleNav("/competitions")}
              />
            )}
          </div>

          {isLoggedIn && userRole === "student" && (
            <>
              <SectionHeader title="البيانات" />
              <div className="px-2 mb-0">
                <NavItem
                  icon={User}
                  label="الملف الشخصي"
                  onClick={() => { handleNav("/profile?tab=profile"); setIsMobileMenuOpen(false); }}
                />
                <NavItem
                  icon={Award}
                  label="الإنجازات"
                  onClick={() => { handleNav("/profile?tab=achievements"); setIsMobileMenuOpen(false); }}
                />
                <NavItem
                  icon={BarChart3}
                  label="السجلات"
                  onClick={() => { handleNav("/profile?tab=records"); setIsMobileMenuOpen(false); }}
                />
                <NavItem
                  icon={BookMarked}
                  label="الخطة"
                  onClick={() => { handleNav("/profile?tab=plan"); setIsMobileMenuOpen(false); }}
                />
              </div>

              <SectionHeader title="الأنشطة" />
              <div className="px-2 mb-0">
                <NavItem
                  icon={Map}
                  label="المسار"
                  onClick={() => handleNav("/pathways")}
                />
                <NavItem
                  icon={Target}
                  label="التحدي اليومي"
                  onClick={() => handleNav("/daily-challenge")}
                  gold={!dailyChallengePlayedToday}
                />
                <NavItem
                  icon={Store}
                  label="المتجر"
                  onClick={() => handleNav("/store")}
                />
              </div>
            </>
          )}

          {isLoggedIn && isAdmin && (
            <>
              <SectionHeader title="لوحة التحكم" />

              {/* فئة إدارة الطلاب */}

              {hasPermission("إدارة الطلاب") && <div className="px-2 mb-0.5">
                <CollapseSection
                  icon={Users}
                  label="إدارة الطلاب"
                  isOpen={isAdminStudentsOpen}
                  onToggle={() => setIsAdminStudentsOpen(!isAdminStudentsOpen)}
                >
                  {[
                    {
                      icon: UserPlus,

                      label: "إضافة طالب",

                      path: "?action=add-student",
                    },

                    {
                      icon: Users,

                      label: "إضافة جماعية",

                      path: "?action=bulk-add",
                    },

                    {
                      icon: UserMinus,

                      label: "إزالة طالب",

                      path: "?action=remove-student",
                    },

                    {
                      icon: ArrowRightLeft,

                      label: "نقل طالب",

                      path: "?action=transfer-student",
                    },

                    {
                      icon: Settings,

                      label: "تعديل بيانات الطالب",

                      path: "?action=edit-student",
                    },

                    {
                      icon: Edit2,

                      label: "تعديل نقاط الطالب",

                      path: "?action=edit-points",
                    },

                    {
                      icon: FileText,

                      label: "سجلات الطلاب",

                      path: "?action=student-records",
                    },

                    {
                      icon: Award,

                      label: "إنجازات الطلاب",

                      path: "/admin/students-achievements",
                    },
                    {
                      icon: BookMarked,

                      label: "خطط الطلاب",

                      path: "/admin/student-plans",
                    },
                  ].map(({ icon: Ic, label, path }) => (
                    <NavItem
                      key={label}
                      icon={Ic}
                      label={label}
                      onClick={() => handleNav(path)}
                      indent
                    />
                  ))}
                </CollapseSection>
              </div>}

              {/* فئة إدارة المستخدمين */}

              {["إدارة المعلمين", "إدارة الحلقات", "الهيكل الإداري", "طلبات الإلتحاق"].some(p => hasPermission(p)) && <div className="px-2 mb-0.5">
                <CollapseSection
                  icon={ShieldCheck}
                  label="إدارة المستخدمين"
                  isOpen={isAdminCommOpen}
                  onToggle={() => setIsAdminCommOpen(!isAdminCommOpen)}
                >
                  {[
                    {
                      icon: Settings,

                      label: "إدارة المعلمين",

                      path: "?action=teachers",
                    },

                    {
                      icon: BookOpen,

                      label: "إدارة الحلقات",

                      path: "?action=circles",
                    },

                    {
                      icon: ShieldCheck,

                      label: "الهيكل الإداري",

                      path: "?action=admins",
                    },

                    {
                      icon: UserPlus,

                      label: "طلبات الإلتحاق",

                      path: "/admin/enrollment-requests",
                    },
                  ].filter(({ label }) => hasPermission(label)).map(({ icon: Ic, label, path }) => (
                    <NavItem
                      key={label}
                      icon={Ic}
                      label={label}
                      onClick={() => handleNav(path)}
                      indent
                    />
                  ))}
                </CollapseSection>
              </div>}

              {/* فئة التقارير */}

              {hasPermission("التقارير") && <div className="px-2 mb-0.5">
                <CollapseSection
                  icon={FileText}
                  label="التقارير"
                  isOpen={isAdminReportsOpen}
                  onToggle={() => setIsAdminReportsOpen(!isAdminReportsOpen)}
                >
                  {[
                    {
                      icon: FileText,

                      label: "تقارير المعلمين",

                      path: "/admin/teacher-attendance",
                    },

                    {
                      icon: MessageSquare,

                      label: "تقارير الرسائل",

                      path: "/admin/reports",
                    },

                    {
                      icon: FileText,

                      label: "السجل اليومي للطلاب",

                      path: "/admin/student-daily-attendance",
                    },
                  ].map(({ icon: Ic, label, path }) => (
                    <NavItem
                      key={label}
                      icon={Ic}
                      label={label}
                      onClick={() => handleNav(path)}
                      indent
                    />
                  ))}
                </CollapseSection>
              </div>}

              {/* فئة الإدارة العامة */}

              {["الإشعارات", "إدارة المسار", "إدارة المتجر", "الإرسال إلى أولياء الأمور", "الصلاحيات", "المالية", "الإحصائيات"].some(p => hasPermission(p)) && <div className="px-2 mb-0.5">
                <CollapseSection
                  icon={Settings}
                  label="الإدارة العامة"
                  isOpen={isAdminGeneralOpen}
                  onToggle={() => setIsAdminGeneralOpen(!isAdminGeneralOpen)}
                >
                  {[
                    {
                      icon: Bell,

                      label: "الإشعارات",

                      permKey: "الإشعارات",

                      path: "/admin/notifications",
                    },

                    {
                      icon: Map,

                      label: "إدارة المسار",

                      permKey: "إدارة المسار",

                      path: "/admin/pathways",
                    },

                    {
                      icon: ShoppingBag,

                      label: "إدارة المتجر",

                      permKey: "إدارة المتجر",

                      path: "/admin/store-management",
                    },

                    {
                      icon: Send,

                      label: "إرسال لأولياء الأمور",

                      permKey: "الإرسال إلى أولياء الأمور",

                      path: "/admin/whatsapp-send",
                    },

                    {
                      icon: ShieldCheck,

                      label: "الصلاحيات",

                      permKey: "الصلاحيات",

                      path: "/admin/permissions",
                    },

                    {
                      icon: Banknote,

                      label: "المالية",

                      permKey: "المالية",

                      path: "/admin/finance",
                    },

                    {
                      icon: BarChart3,

                      label: "الإحصائيات",

                      permKey: "الإحصائيات",

                      path: "/admin/statistics",
                    },
                  ].filter(({ permKey }) => hasPermission(permKey)).map(({ icon: Ic, label, path }) => (
                    <NavItem
                      key={label}
                      icon={Ic}
                      label={label}
                      onClick={() => handleNav(path)}
                      indent
                    />
                  ))}
                </CollapseSection>
              </div>}

              {/* فئة الألعاب */}

              {hasPermission("إدارة الألعاب") && <div className="px-2 mb-0.5">
                <CollapseSection
                  icon={Gamepad2}
                  label="الألعاب"
                  isOpen={isAdminGamesOpen}
                  onToggle={() => setIsAdminGamesOpen(!isAdminGamesOpen)}
                >
                  {[
                    {
                      icon: Star,

                      label: "قاعدة صور خمن الصورة",

                      path: "/admin/guess-images",
                    },

                    {
                      icon: Zap,

                      label: "قاعدة أسئلة المزاد",

                      path: "/admin/auction-questions",
                    },

                    {
                      icon: BookOpen,

                      label: "إدارة خلية الحروف",

                      path: "/admin/letter-hive-questions",
                    },

                    {
                      icon: FileText,

                      label: "قاعدة أسئلة الفئات",

                      path: "/admin/questions",
                    },
                  ].map(({ icon: Ic, label, path }) => (
                    <NavItem
                      key={label}
                      icon={Ic}
                      label={label}
                      onClick={() => handleNav(path)}
                      indent
                    />
                  ))}
                </CollapseSection>
              </div>}
            </>
          )}

          {/* تسجيل الخروج */}
          {isLoggedIn && (
            <div className="px-2 mt-1 mb-4">
              <button
                onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-right text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                  <LogOut size={16} className="text-red-500" />
                </div>
                <span>تسجيل الخروج</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Header;
