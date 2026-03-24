"use client";

import { useRouter } from "next/navigation";

import { useState, useEffect } from "react";

import Image from "next/image";
import { StudentDailyExecutionDialog } from "@/components/student-daily-execution-dialog";

import {
  ChevronLeft,
  User,
  LogOut,
  Users,
  Menu,
  ClipboardCheck,
  Trophy,
  Star,
  Map,
  MessageSquare,
  Home,
  UserPlus,
  UserMinus,
  ArrowRightLeft,
  Settings,
  Eye,
  FileText,
  Award,
  Edit2,
  BookOpen,
  ShieldCheck,
  Bell,
  Send,
  Calendar,
  Phone,
  Banknote,
  BarChart3,
  Trash2,
  BookMarked,
} from "lucide-react";

import { Button } from "@/components/ui/button"
import { GlobalAddStudentDialog } from "@/components/global-add-student-dialog";
import { createClient } from "@/lib/supabase/client";

import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SiteLoader } from "@/components/ui/site-loader";
import { getClientAuthHeaders } from "@/lib/client-auth";

interface Circle {
  name: string;

  studentCount: number;
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
}

const CIRCLES_CACHE_DURATION = 5 * 60 * 1000;
const ROLE_CACHE_DURATION = 5 * 60 * 1000;

function NavItem({
  icon: Icon,

  label,

  onClick,

  gold,

  indent,

  strong,

  disabled,
}: {
  icon: React.ElementType;

  label: string;

  onClick: () => void;

  gold?: boolean;

  indent?: boolean;

  strong?: boolean;

  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative cursor-pointer

        ${indent ? "pr-8" : ""}

        ${disabled ? "cursor-not-allowed opacity-55 hover:bg-transparent" : "cursor-pointer"}

        ${gold ? "text-[#b5862c] hover:bg-[#d8a355]/12" : "text-[#1a2e2b] hover:bg-[#00312e]/7"}`}
    >
      <Icon
        size={17}
        className={`flex-shrink-0 transition-all duration-200 group-hover:scale-110
          ${gold ? "text-[#d8a355]" : "text-[#00312e]/50 group-hover:text-[#00312e]/80"}
          ${disabled ? "group-hover:scale-100 group-hover:text-[#00312e]/50" : ""}`}
      />

      <span className={`flex-1 text-right leading-tight ${strong ? "font-extrabold" : ""}`}>{label}</span>
    </button>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-5 pb-2">
      <p className="text-right text-[12px] font-extrabold tracking-[0.08em] text-[#5f6f6b] whitespace-nowrap">
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

  const [circlesLoading, setCirclesLoading] = useState(false);
  const [circlesLoaded, setCirclesLoaded] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isCirclesOpen, setIsCirclesOpen] = useState(true);
  const [isTopStudentsOpen, setIsTopStudentsOpen] = useState(false);

  const [isAdminStudentsOpen, setIsAdminStudentsOpen] = useState(false);

  const [isAdminReportsOpen, setIsAdminReportsOpen] = useState(false);

  const [isAdminCommOpen, setIsAdminCommOpen] = useState(false);

  const [isAdminGeneralOpen, setIsAdminGeneralOpen] = useState(false);

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
    const cacheKey = `notificationStartAt_${accountNumber}`;
    const cachedValue = localStorage.getItem(cacheKey);
    if (cachedValue) {
      setNotificationStartAt(cachedValue);
      return cachedValue;
    }

    try {
      const response = await fetch(`/api/account-created-at?account_number=${accountNumber}`, { cache: "no-store" });
      const data = await response.json();
      const createdAt = typeof data.created_at === "string" ? data.created_at : null;
      setNotificationStartAt(createdAt);
      if (createdAt) {
        localStorage.setItem(cacheKey, createdAt);
      }
      return createdAt;
    } catch {
      setNotificationStartAt(null);
      return null;
    }
  };

  const openDailyExecution = () => {
    setIsMobileMenuOpen(false);
    scrollToTop();
    window.dispatchEvent(new Event("studentDailyExecution:open"));
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "instant" });

  useEffect(() => {
      let cleanup: (() => void) | undefined;
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

    if (accNumStr) {
      const cachedUnread = localStorage.getItem(`unreadCount_${accNumStr}`);
      if (cachedUnread) {
        setUnreadCount(Number(cachedUnread) || 0);
      }
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

      const cachedCircles = localStorage.getItem("circlesCache");
      const circlesCacheTime = localStorage.getItem("circlesCacheTime");
      const hasFreshCirclesCache = Boolean(
        cachedCircles &&
        circlesCacheTime &&
        Date.now() - Number(circlesCacheTime) < CIRCLES_CACHE_DURATION
      );

      if (hasFreshCirclesCache) {
        try {
          const parsedCircles = JSON.parse(cachedCircles || "[]");
          setCircles(parsedCircles);
          setCirclesLoaded(true);
        } catch {}
      } else {
        const idleWindow = window as IdleWindow;
        const loadCachedCirclesInBackground = () => loadCircles();

        if (typeof idleWindow.requestIdleCallback === "function") {
          const idleId = idleWindow.requestIdleCallback(loadCachedCirclesInBackground, { timeout: 2000 });
          cleanup = () => {
            if (typeof idleWindow.cancelIdleCallback === "function") {
              idleWindow.cancelIdleCallback(idleId);
            }
          };
        } else {
          const timeoutId = window.setTimeout(loadCachedCirclesInBackground, 1200);
          cleanup = () => window.clearTimeout(timeoutId);
        }
      }
    } else {
      setIsSidebarStudentStatsLoading(false);
    }

    // Verify fresh role from DB (background) to keep sidebar in sync
    if (loggedIn) {
      const accountNumber = localStorage.getItem("accountNumber");
      if (accountNumber) {
        const roleCacheKey = `verifiedRole_${accountNumber}`;
        const roleCacheTimeKey = `verifiedRoleAt_${accountNumber}`;
        const cachedRole = localStorage.getItem(roleCacheKey);
        const cachedRoleAt = Number(localStorage.getItem(roleCacheTimeKey) || "0");

        if (cachedRole) {
          setUserRole(cachedRole);
        }

        if (Date.now() - cachedRoleAt > ROLE_CACHE_DURATION) {
          verifyFreshRole(accountNumber);
        }
      }
    }

    return () => cleanup?.();
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
      localStorage.setItem(`verifiedRole_${accountNumber}`, freshRole);
      localStorage.setItem(`verifiedRoleAt_${accountNumber}`, Date.now().toString());
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
    if (circlesLoading || circlesLoaded) {
      return;
    }

    const cachedData = localStorage.getItem("circlesCache");

    const cacheTime = localStorage.getItem("circlesCacheTime");

    if (
      cachedData &&
      cacheTime &&
      Date.now() - Number(cacheTime) < CIRCLES_CACHE_DURATION
    ) {
      setCircles(JSON.parse(cachedData));

      setCirclesLoading(false);
      setCirclesLoaded(true);
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
        setCirclesLoaded(true);

        localStorage.setItem("circlesCache", JSON.stringify(data.circles));

        localStorage.setItem("circlesCacheTime", Date.now().toString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCirclesLoading(false);
    }
  };

  const handleCirclesToggle = () => {
    const nextOpen = !isCirclesOpen;
    setIsCirclesOpen(nextOpen);

    if (nextOpen) {
      loadCircles();
    }
  };

  const handleTopStudentsToggle = () => {
    const nextOpen = !isTopStudentsOpen;
    setIsTopStudentsOpen(nextOpen);

    if (nextOpen) {
      loadCircles();
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
      const planRes = await fetch(`/api/student-plans?student_id=${student.id}`, { headers: getClientAuthHeaders() });
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
        const quranProgress = planData.quranProgressPercent ?? 0;
        const quranLevel = planData.quranLevel ?? Math.round(quranProgress);

        setSidebarPlanProgress(0);
        setSidebarQuranProgress(quranProgress);
        setSidebarQuranLevel(quranLevel);
        setSidebarPlanName(null);
        localStorage.setItem(`studentHeaderStats_${accNum}`, JSON.stringify({
          sidebarPlanProgress: 0,
          sidebarQuranProgress: quranProgress,
          sidebarQuranLevel: quranLevel,
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
        router.push(window.location.pathname + href);
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
      {isLoggedIn && userRole === "student" && <StudentDailyExecutionDialog />}

      {isLoggingOut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white rounded-3xl px-10 py-8 flex flex-col items-center shadow-2xl min-w-[260px]">
            <SiteLoader size="md" color="#003f55" />
          </div>
        </div>
      )}

      <header
        className="text-white sticky top-0 z-50 shadow-lg relative"
        style={{ background: "linear-gradient(135deg, #0f2f6d 0%, #1f4d9a 55%, #3667b2 100%)" }}
      >
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex items-center gap-2">
          <button
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/10 transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="القائمة"
          >
            <Menu size={26} />
          </button>
          {isLoggedIn && userRole === "student" && (
            <div className="flex items-center gap-2">
              <button
                className="h-10 rounded-full bg-white/10 px-4 text-sm font-black text-white transition-colors hover:bg-white/15"
                onClick={openDailyExecution}
              >
                التنفيذ
              </button>
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
                  localStorage.setItem(`unreadCount_${accNumStr}`, "0");
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
                      <div className="w-6 h-6 rounded-full bg-[#3453a7]/12 flex items-center justify-center">
                        <Bell size={13} className="text-[#003f55]" />
                      </div>
                      <span className="font-bold text-gray-800 text-sm">الإشعارات</span>
                    </div>
                    {notifications.length > 0 && (
                      <span className="text-[11px] bg-[#3453a7]/10 text-[#3453a7] px-2 py-0.5 rounded-full font-semibold">
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  <div className="max-h-[380px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#3453a740_transparent] bg-white" dir="rtl">
                    {notifLoading ? (
                      <div className="flex items-center justify-center py-14">
                        <SiteLoader size="sm" color="#003f55" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="py-14 flex flex-col items-center gap-3 text-center">
                        <div className="w-14 h-14 rounded-full bg-[#3453a7]/10 flex items-center justify-center">
                          <Bell size={24} className="text-[#003f55]/60" />
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
                                ? <div className="w-2 h-2 rounded-full bg-[#3453a7] shadow-sm" />
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
            </div>
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
                          color: "#3453a7",
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
                        background: "linear-gradient(to right, #3453a7, #4a67b7)",
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
                  className="relative flex items-center gap-0.5 h-7 sm:h-7.5 overflow-hidden rounded-full px-2.5 sm:px-2.5"
                  style={{
                    background: "linear-gradient(135deg, rgba(125,183,255,0.24) 0%, rgba(52,83,167,0.20) 55%, rgba(24,49,112,0.18) 100%)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 18px rgba(4,16,44,0.18), 0 0 0 1px rgba(255,255,255,0.08)",
                    backdropFilter: "blur(10px)",
                  }}
                  aria-label="الترتيب العام"
                  title="الترتيب العام"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent_52%)]" />
                  <div className="relative flex h-6 w-6 items-center justify-center translate-y-[1px] sm:h-6.5 sm:w-6.5">
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-[19px] w-[19px] text-[#ffd766] drop-shadow-[0_0_7px_rgba(255,215,102,0.30)] sm:h-[17px] sm:w-[17px]"
                      fill="currentColor"
                    >
                      <path d="M8 2.75a1.25 1.25 0 0 0-1.25 1.25v1H4.75A1.75 1.75 0 0 0 3 6.96c.2 2.58 1.72 4.72 4.12 5.54A5.51 5.51 0 0 0 10.75 16v1.25H8.5a1 1 0 1 0 0 2h7a1 1 0 1 0 0-2h-2.25V16a5.51 5.51 0 0 0 3.63-3.5c2.4-.82 3.92-2.96 4.12-5.54A1.75 1.75 0 0 0 19.25 5h-2V4A1.25 1.25 0 0 0 16 2.75H8Zm-.95 4.25c.11 1.21.46 2.34 1 3.32-1.33-.63-2.17-1.79-2.42-3.32h1.42Zm10.9 0c-.25 1.53-1.09 2.69-2.42 3.32.54-.98.89-2.11 1-3.32h1.42Z" />
                    </svg>
                  </div>
                  <span className="relative text-[12px] font-black tabular-nums text-white leading-none tracking-[0.01em] sm:text-[13px]" style={{ textShadow: "0 2px 8px rgba(7,20,54,0.32)" }}>
                    {globalRank ?? "-"}
                  </span>
                </div>

                <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#3453a7]/25 bg-[linear-gradient(135deg,rgba(37,63,140,0.98),rgba(74,103,183,0.95))] px-2 py-1 text-[10px] font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.18)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  الترتيب العام
                </div>
              </div>

              <div className="relative z-30 group">
                <div
                  className="relative flex items-center gap-1 h-7 sm:h-7.5 overflow-hidden rounded-full px-2.5 sm:px-2.5"
                  style={{
                    background: "linear-gradient(135deg, rgba(125,183,255,0.24) 0%, rgba(52,83,167,0.20) 55%, rgba(24,49,112,0.18) 100%)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 18px rgba(4,16,44,0.18), 0 0 0 1px rgba(255,255,255,0.08)",
                    backdropFilter: "blur(10px)",
                  }}
                  aria-label="النقاط"
                  title="النقاط"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent_52%)]" />
                  <div className="relative flex h-5 w-5 items-center justify-center sm:h-5.5 sm:w-5.5">
                    <Star
                      className="h-4 w-4 fill-[#ffd766] text-[#ffd766] drop-shadow-[0_0_7px_rgba(255,215,102,0.30)] sm:h-[14px] sm:w-[14px]"
                      strokeWidth={1.9}
                    />
                  </div>
                  <span className="relative text-[12px] font-black tabular-nums text-white leading-none tracking-[0.01em] sm:text-[13px]" style={{ textShadow: "0 2px 8px rgba(7,20,54,0.32)" }}>
                    {sidebarStudentPoints}
                  </span>
                </div>

                <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#3453a7]/25 bg-[linear-gradient(135deg,rgba(37,63,140,0.98),rgba(74,103,183,0.95))] px-2 py-1 text-[10px] font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.18)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
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
              src="/ربوة.png"
              alt="ربوة"
              width={100}
              height={60}
              className="w-20 md:w-24 h-auto cursor-pointer"
              onClick={() => handleNav("/")}
            />
          </div>

          <div className="absolute left-4 top-1/2 z-20 flex -translate-y-1/2 items-center gap-2">
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
                  localStorage.setItem(`unreadCount_${accNumStr}`, "0");
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
                    className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 transition-colors hover:bg-white/15"
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
                      <div className="w-6 h-6 rounded-full bg-[#3453a7]/12 flex items-center justify-center">
                        <Bell size={13} className="text-[#003f55]" />
                      </div>
                      <span className="font-bold text-gray-800 text-sm">الإشعارات</span>
                    </div>
                    {notifications.length > 0 && (
                      <span className="text-[11px] bg-[#3453a7]/10 text-[#3453a7] px-2 py-0.5 rounded-full font-semibold">
                        {notifications.length}
                      </span>
                    )}
                  </div>
                  {/* Body */}
                  <div className="max-h-[380px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#3453a740_transparent] bg-white" dir="rtl">
                    {notifLoading ? (
                      <div className="flex items-center justify-center py-14">
                        <SiteLoader size="sm" color="#003f55" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="py-14 flex flex-col items-center gap-3 text-center">
                        <div className="w-14 h-14 rounded-full bg-[#3453a7]/10 flex items-center justify-center">
                          <Bell size={24} className="text-[#003f55]/60" />
                        </div>
                        <p className="text-sm text-gray-400 font-medium">لا توجد إشعارات</p>
                      </div>
                    ) : (
                      <div>
                        {notifications.map((n, i) => (
                          <div
                            key={n.id}
                            className={`group flex items-start gap-3 px-4 py-3.5 hover:bg-[#3453a7]/5 transition-colors cursor-default ${i !== notifications.length - 1 ? "border-b border-gray-100" : ""}`}
                          >
                            {/* Unread indicator */}
                            <div className="flex-shrink-0 mt-2">
                              {!n.is_read
                                ? <div className="w-2 h-2 rounded-full bg-[#3453a7] shadow-sm" />
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
                className="h-10 rounded-full bg-white/10 px-5 text-sm font-extrabold text-white transition-colors hover:bg-white/15"
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

        <div
          className="px-4 pt-3 pb-4 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0f2f6d 0%, #1f4d9a 55%, #3667b2 100%)" }}
        >
          {/* الصف العلوي: اللوغو + إغلاق */}
          <div className="flex items-center justify-between mb-3">
            <Image
              src="/ربوة.png"
              alt="ربوة"
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
                  <div className="w-10 h-10 rounded-full bg-[#3453a7] flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-white" />
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

        <div className="flex-1 overflow-y-auto bg-[#f9fafb] [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">

          {isLoggedIn && (userRole === "teacher" || userRole === "deputy_teacher") && (
            <>
              <SectionHeader title="الإدارة" />
              <div className="px-2 mb-0">
                {userRole === "teacher" && (
                  <NavItem
                    icon={BookMarked}
                    label="خطط الطلاب"
                    onClick={() => handleNav("/teacher/student-plans")}
                  />
                )}
                <NavItem
                  icon={Users}
                  label="إدارة الحلقة"
                  onClick={() => handleNav("/teacher/halaqah/1")}
                />
                <NavItem
                  icon={BarChart3}
                  label="تقارير الأسابيع"
                  onClick={() => handleNav("/teacher/weekly-reports")}
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

            <NavItem
              icon={BookOpen}
              label="أفضل الحلقات"
              onClick={() => handleNav("/halaqat/all")}
            />

            <CollapseSection
              icon={Star}
              label="أفضل الطلاب"
              isOpen={isTopStudentsOpen}
              onToggle={handleTopStudentsToggle}
            >
              {circlesLoading ? (
                <div className="pr-10 pl-4 py-3 flex justify-start">
                  <SiteLoader size="sm" color="#003f55" />
                </div>
              ) : (
                <>
                  <NavItem
                    icon={Users}
                    label="جميع الطلاب"
                    onClick={() => handleNav("/students/all?scope=all")}
                    indent
                  />
                  {circles.map((c) => (
                    <NavItem
                      key={`top-${c.name}`}
                      icon={Star}
                      label={c.name}
                      onClick={() => handleNav(`/students/all?circle=${encodeURIComponent(c.name)}`)}
                      indent
                    />
                  ))}
                </>
              )}
            </CollapseSection>

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
                  icon={ClipboardCheck}
                  label="التنفيذ اليومي"
                  onClick={openDailyExecution}
                />
                <NavItem
                  icon={BookMarked}
                  label="الخطة"
                  onClick={() => { handleNav("/profile?tab=plan"); setIsMobileMenuOpen(false); }}
                />
                <NavItem
                  icon={Map}
                  label="الإختبارات"
                  onClick={() => handleNav("/pathways")}
                />
              </div>
            </>
          )}

          {isLoggedIn && isAdmin && (
            <>
              <SectionHeader title="لوحة التحكم" />

              <div className="px-2 mb-0.5">
                <NavItem
                  icon={ClipboardCheck}
                  label="التحضير"
                  onClick={() => handleNav("/admin/staff-attendance")}
                />
              </div>

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

              {["إدارة المعلمين", "إدارة الحلقات", "الهيكل الإداري", "طلبات التسجيل"].some(p => hasPermission(p)) && <div className="px-2 mb-0.5">
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

                      label: "طلبات التسجيل",

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

                      label: "متابعة التنفيذ",

                      path: "/admin/student-daily-attendance",
                    },

                    {
                      icon: FileText,

                      label: "تقرير الحلقات المختصر",

                      path: "/admin/reports/circle-short-report",
                    },

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
                      icon: BarChart3,

                      label: "الإحصائيات",

                      path: "/admin/statistics",
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

              {["الإشعارات", "إدارة المسار", "إنهاء الفصل", "الإرسال إلى أولياء الأمور", "الصلاحيات", "المالية"].some(p => hasPermission(p)) && <div className="px-2 mb-0.5">
                <CollapseSection
                  icon={Settings}
                  label="الإدارة العامة"
                  isOpen={isAdminGeneralOpen}
                  onToggle={() => setIsAdminGeneralOpen(!isAdminGeneralOpen)}
                >
                  {[
                    {
                      icon: Map,

                      label: "إدارة الإختبارات",

                      permKey: "إدارة المسار",

                      path: "/admin/pathways",
                    },

                    {
                      icon: Bell,

                      label: "الإشعارات",

                      permKey: "الإشعارات",

                      path: "/admin/notifications",
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
                      icon: Send,

                      label: "الإرسال إلى أولياء الأمور",

                      permKey: "الإرسال إلى أولياء الأمور",

                      path: "/admin/whatsapp-send",
                    },

                    {
                      icon: Calendar,

                      label: "إنهاء الفصل",

                      permKey: "إنهاء الفصل",

                      path: "?action=end-semester",
                    },
                  ].filter(({ permKey }) => hasPermission(permKey)).map(({ icon: Ic, label, path }) => (
                    <NavItem
                      key={`${label}-${path}`}
                      icon={Ic}
                      label={label}
                      onClick={() => handleNav(path)}
                      disabled={false}
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
