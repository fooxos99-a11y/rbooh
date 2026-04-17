"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { useState, useEffect } from "react";

import Image from "next/image";

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
  QrCode,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  RefreshCw, ServerCrash } from "lucide-react";

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client";

import { useConfirmDialog } from "@/hooks/use-confirm-dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SiteLoader } from "@/components/ui/site-loader";
import { getClientAuthHeaders } from "@/lib/client-auth";

const StudentDailyExecutionDialog = dynamic(
  () => import("@/components/student-daily-execution-dialog").then((mod) => mod.StudentDailyExecutionDialog),
  { ssr: false, loading: () => null },
);

const GlobalAddStudentDialog = dynamic(
  () => import("@/components/global-add-student-dialog").then((mod) => mod.GlobalAddStudentDialog),
  { ssr: false, loading: () => null },
);

interface Circle {
  name: string;

  studentCount: number;
}

type WhatsAppHeaderStatus = {
  status: string
  qrAvailable: boolean
  ready: boolean
  authenticated: boolean
  lastUpdatedAt: string | null
  lastHeartbeatAt: string | null
  qrUpdatedAt: string | null
  connectedAt: string | null
  disconnectedAt: string | null
  authFailedAt: string | null
  lastError: string | null
  workerOnline: boolean
  qrImageUrl: string | null
}

const DEFAULT_WHATSAPP_HEADER_STATUS: WhatsAppHeaderStatus = {
  status: "not_started",
  qrAvailable: false,
  ready: false,
  authenticated: false,
  lastUpdatedAt: null,
  lastHeartbeatAt: null,
  qrUpdatedAt: null,
  connectedAt: null,
  disconnectedAt: null,
  authFailedAt: null,
  lastError: null,
  workerOnline: false,
  qrImageUrl: null,
}

function getWhatsappHeaderStatusText(status: WhatsAppHeaderStatus) {
  if (status.ready && status.authenticated && status.status === "connected") {
    return {
      title: "تم الربط",
      description: "الجهاز متصل وجاهز للإرسال.",
      tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
      icon: CheckCircle2,
    }
  }

  if (status.status === "authenticating") {
    return {
      title: "تمت قراءة الباركود",
      description: "لا تمسح الباركود مرة ثانية. انتظر حتى يكتمل الربط داخل واتساب.",
      tone: "text-sky-700 bg-sky-50 border-sky-200",
      icon: CheckCircle2,
    }
  }

  if (status.status === "waiting_for_qr" || status.qrAvailable) {
    return {
      title: "الباركود جاهز",
      description: "الباركود جاهز، وبعد القراءة انتظر انتقال الحالة تلقائياً.",
      tone: "text-amber-700 bg-amber-50 border-amber-200",
      icon: QrCode,
    }
  }

  if (
    status.status === "starting"
    || status.status === "disconnecting"
    || status.status === "fetching_qr"
    || status.status === "restarting"
  ) {
    return {
      title: "جاري تجهيز الجلسة",
      description: "يتم الآن تجهيز واتساب أو طلب باركود جديد، انتظر قليلاً.",
      tone: "text-slate-700 bg-slate-50 border-slate-200",
      icon: Smartphone,
    }
  }

  if (!status.workerOnline) {
    return {
      title: "لم يتم الربط",
      description: "لن يظهر باركود جديد حتى يعود العامل للعمل مرة أخرى.",
      tone: "text-rose-700 bg-rose-50 border-rose-200",
      icon: AlertTriangle,
    }
  }

  if (status.status === "auth_failed" || status.status === "disconnected") {
    return {
      title: "انقطع الربط",
      description: "إذا ظهر باركود جديد امسحه مرة واحدة فقط، ولا تكرر المسح بعد انتقال الحالة.",
      tone: "text-rose-700 bg-rose-50 border-rose-200",
      icon: AlertTriangle,
    }
  }

  return {
    title: "لم يتم الربط",
    description: "يتم الآن تجهيز الجلسة أو انتظار باركود جديد.",
    tone: "text-slate-700 bg-slate-50 border-slate-200",
    icon: Smartphone,
  }
}

function isWhatsappHeaderConnected(status: WhatsAppHeaderStatus) {
  return status.ready && status.authenticated && status.status === "connected"
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
}

const CIRCLES_CACHE_DURATION = 5 * 60 * 1000;
const ROLE_CACHE_DURATION = 5 * 60 * 1000;
const CONTACT_REPORTS_CACHE_DURATION = 60 * 1000;

const PERMISSION_ALIASES: Record<string, string[]> = {
  "الاختبارات": ["الاختبارات", "إدارة المسار"],
  "إدارة المسار": ["إدارة المسار", "الاختبارات"],
  "يوم السرد": ["يوم السرد", "التقارير"],
  "التقارير": ["التقارير", "يوم السرد"],
}

const scheduleIdleTask = (callback: () => void, timeout = 1200) => {
  const idleWindow = window as IdleWindow;

  if (typeof idleWindow.requestIdleCallback === "function") {
    const handle = idleWindow.requestIdleCallback(callback, { timeout });
    return () => {
      if (typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(handle);
      }
    };
  }

  const handle = window.setTimeout(callback, 120);
  return () => window.clearTimeout(handle);
};

function NavItem({
  icon: Icon,

  label,

  onClick,

  gold,

  indent,

  strong,

  disabled,

  badgeCount,
}: {
  icon: React.ElementType;

  label: string;

  onClick: () => void;

  gold?: boolean;

  indent?: boolean;

  strong?: boolean;

  disabled?: boolean;

  badgeCount?: number;
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

      {badgeCount && badgeCount > 0 ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#3453a7] px-1.5 py-0.5 text-[11px] font-extrabold leading-none text-white">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
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

function StudentRankIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M8 2.75a1.25 1.25 0 0 0-1.25 1.25v1H4.75A1.75 1.75 0 0 0 3 6.96c.2 2.58 1.72 4.72 4.12 5.54A5.51 5.51 0 0 0 10.75 16v1.25H8.5a1 1 0 1 0 0 2h7a1 1 0 1 0 0-2h-2.25V16a5.51 5.51 0 0 0 3.63-3.5c2.4-.82 3.92-2.96 4.12-5.54A1.75 1.75 0 0 0 19.25 5h-2V4A1.25 1.25 0 0 0 16 2.75H8Zm-.95 4.25c.11 1.21.46 2.34 1 3.32-1.33-.63-2.17-1.79-2.42-3.32h1.42Zm10.9 0c-.25 1.53-1.09 2.69-2.42 3.32.54-.98.89-2.11 1-3.32h1.42Z" />
    </svg>
  )
}

function StudentLevelBadge({ currentLevel, displayProgress }: { currentLevel: number; displayProgress: number }) {
  return (
    <div className="relative flex items-center gap-1.5">
      <div className="student-level-shell relative flex flex-col items-center justify-center z-30 drop-shadow-md">
        <div
          className="absolute h-full w-full"
          style={{
            background: "linear-gradient(to bottom, #ffffff, #e1e4eb)",
            clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
            padding: "2.5px",
          }}
        >
          <div
            className="relative flex h-full w-full items-center justify-center p-[2px]"
            style={{
              background: "linear-gradient(to bottom, #eceef3, #d3d7df)",
              clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
              boxShadow: "inset 0 -2px 3px rgba(0,0,0,0.1), inset 0 2px 3px rgba(255,255,255,0.8)",
            }}
          >
            <span
              className="student-level-number relative z-10 font-black pb-[1px]"
              style={{
                color: "#3453a7",
                filter: "drop-shadow(0px -1px 0px rgba(255,255,255,1)) drop-shadow(0px 2px 2px rgba(0,0,0,0.2))",
              }}
            >
              {currentLevel}
            </span>
          </div>
        </div>
      </div>

      <div
        className="student-progress-shell relative z-20 flex items-center"
        style={{
          background: "linear-gradient(to bottom, #ffffff, #dcdede)",
          borderRadius: "0 100px 100px 0",
          padding: "2px",
          paddingLeft: "0",
        }}
      >
        <div
          className="relative h-full w-full"
          style={{
            background: "linear-gradient(to bottom, #e2e5eb, #ced3db)",
            borderRadius: "0 100px 100px 0",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)",
          }}
        >
          <div
            className="absolute bottom-0 left-0 top-0 z-10 transition-all duration-1000"
            style={{
              width: displayProgress > 0 ? `min(100%, calc(${displayProgress}% + 24px))` : "0%",
              background: "linear-gradient(to right, #3453a7, #4a67b7)",
              borderRadius: "0 100px 100px 0",
            }}
          >
            <div className="absolute left-0 right-0 top-0 h-[45%] bg-gradient-to-b from-white/40 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StudentStatPill({
  label,
  value,
  icon,
  compact = false,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  compact?: boolean
}) {
  return (
    <div className="relative z-30 group">
      <div
        className={`student-stat-pill relative flex items-center overflow-hidden rounded-full ${compact ? "gap-0.5 px-2" : "gap-1 px-2.5"}`}
        style={{
          background: "linear-gradient(135deg, rgba(125,183,255,0.24) 0%, rgba(52,83,167,0.20) 55%, rgba(24,49,112,0.18) 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 18px rgba(4,16,44,0.18), 0 0 0 1px rgba(255,255,255,0.08)",
          backdropFilter: "blur(10px)",
        }}
        aria-label={label}
        title={label}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),transparent_52%)]" />
        <div className={`student-stat-icon-wrap relative flex items-center justify-center ${compact ? "translate-y-0" : "translate-y-[1px]"}`}>
          {icon}
        </div>
        <span
          className="student-stat-number relative font-black tabular-nums leading-none tracking-[0.01em] text-white"
          style={{ textShadow: "0 2px 8px rgba(7,20,54,0.32)" }}
        >
          {value}
        </span>
      </div>

      {!compact ? (
        <div className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#3453a7]/25 bg-[linear-gradient(135deg,rgba(37,63,140,0.98),rgba(74,103,183,0.95))] px-2 py-1 text-[10px] font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.18)] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {label}
        </div>
      ) : null}
    </div>
  )
}

function StudentStatsCluster({
  currentLevel,
  globalRank,
  points,
  compact = false,
  showLevel = true,
  className = "",
}: {
  currentLevel: number
  globalRank: string | number | null
  points: number
  compact?: boolean
  showLevel?: boolean
  className?: string
}) {
  const displayProgress = currentLevel

  return (
    <div className={`${compact ? "student-drawer-stats" : "student-header-stats"} ${className}`} style={{ direction: "ltr" }}>
      {showLevel ? <StudentLevelBadge currentLevel={currentLevel} displayProgress={displayProgress} /> : null}
      <StudentStatPill
        label="الترتيب العام"
        value={globalRank ?? "-"}
        compact={compact}
        icon={<StudentRankIcon className="student-stat-icon text-[#ffd766] drop-shadow-[0_0_7px_rgba(255,215,102,0.30)]" />}
      />
      <StudentStatPill
        label="النقاط"
        value={points}
        compact={compact}
        icon={<Star className="student-stat-icon fill-[#ffd766] text-[#ffd766] drop-shadow-[0_0_7px_rgba(255,215,102,0.30)]" strokeWidth={1.9} />}
      />
    </div>
  )
}

function CollapseSection({
  icon: Icon,

  label,

  badgeCount,

  isOpen,

  onToggle,

  children,
}: {
  icon: React.ElementType;

  label: string;

  badgeCount?: number;

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

        {badgeCount && badgeCount > 0 ? (
          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#3453a7] px-1.5 py-0.5 text-[11px] font-extrabold leading-none text-white">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        ) : null}

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
  const [contactReportsUnreadCount, setContactReportsUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<{id:string;message:string;is_read:boolean;created_at:string}[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [isWhatsappQrDialogOpen, setIsWhatsappQrDialogOpen] = useState(false);
  const [whatsappQrStatus, setWhatsappQrStatus] = useState<WhatsAppHeaderStatus>(DEFAULT_WHATSAPP_HEADER_STATUS);
  const [isWhatsappQrLoading, setIsWhatsappQrLoading] = useState(false);
  const [hasResolvedWhatsappQrStatus, setHasResolvedWhatsappQrStatus] = useState(false);
  const [whatsappQrImageFailed, setWhatsappQrImageFailed] = useState(false);
  const [isWhatsappQrDisconnecting, setIsWhatsappQrDisconnecting] = useState(false);
  const [sidebarPlanProgress, setSidebarPlanProgress] = useState<number | null>(null);
  const [sidebarQuranProgress, setSidebarQuranProgress] = useState<number | null>(null);
  const [sidebarQuranLevel, setSidebarQuranLevel] = useState<number>(0);
  const [sidebarStudentPoints, setSidebarStudentPoints] = useState<number>(0);
  const [sidebarPlanName, setSidebarPlanName] = useState<string | null>(null);
  const [isSidebarStudentStatsLoading, setIsSidebarStudentStatsLoading] = useState(true);

  const isAdmin = userAccountNumber === 2 || validAdminRoles.includes(userRole || "");

  const isFullAccess = userAccountNumber === 2 || userRole === "admin" || userRole === "مدير" || userPermissions.includes("all");

  const hasPermission = (key: string) => {
    if (isFullAccess) {
      return true
    }

    const candidateKeys = PERMISSION_ALIASES[key] || [key]
    return candidateKeys.some((permissionKey) => userPermissions.includes(permissionKey))
  };

  const router = useRouter();

  const hydrateCirclesFromCache = () => {
    const cachedCircles = localStorage.getItem("circlesCache");
    const circlesCacheTime = localStorage.getItem("circlesCacheTime");
    const hasFreshCirclesCache = Boolean(
      cachedCircles &&
      circlesCacheTime &&
      Date.now() - Number(circlesCacheTime) < CIRCLES_CACHE_DURATION
    );

    if (!hasFreshCirclesCache) {
      return false;
    }

    try {
      const parsedCircles = JSON.parse(cachedCircles || "[]");
      setCircles(parsedCircles);
      setCirclesLoaded(true);
      return true;
    } catch {
      return false;
    }
  };

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

  const fetchWhatsappQrStatus = async (silent = false) => {
    try {
      if (!silent) {
        setIsWhatsappQrLoading(true);
      }

      const response = await fetch(`/api/whatsapp/status?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const nextStatus = { ...DEFAULT_WHATSAPP_HEADER_STATUS, ...data };
      setWhatsappQrStatus(nextStatus);
      setWhatsappQrImageFailed(false);
      return nextStatus;
    } catch {
      setWhatsappQrStatus(DEFAULT_WHATSAPP_HEADER_STATUS);
      return DEFAULT_WHATSAPP_HEADER_STATUS;
    } finally {
      setHasResolvedWhatsappQrStatus(true);
      if (!silent) {
        setIsWhatsappQrLoading(false);
      }
    }
  };

  const fetchContactReportsUnreadCount = async () => {
    try {
      const response = await fetch("/api/contact", { cache: "no-store" });
      const data = await response.json();
      const messages = Array.isArray(data.messages) ? data.messages as Array<{ status?: string | null }> : [];
      const nextUnreadCount = messages.filter((message) => message?.status === "unread").length;
      setContactReportsUnreadCount(nextUnreadCount);
      localStorage.setItem("contactReportsUnreadCount", String(nextUnreadCount));
      localStorage.setItem("contactReportsUnreadCountAt", Date.now().toString());
    } catch {
      setContactReportsUnreadCount(0);
    }
  };

  const openDailyExecution = () => {
    setIsMobileMenuOpen(false);
    scrollToTop();
    window.dispatchEvent(new Event("studentDailyExecution:open"));
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "instant" });

  useEffect(() => {
      const cleanups: Array<() => void> = [];
        // Ø¬Ù„Ø¨ Ø§Ù„ØªØ±ØªÙŠØ¨ Ø§Ù„Ø¹Ø§Ù… Ù„Ù„Ø·Ø§Ù„Ø¨ Ø¹Ù†Ø¯ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¬Ø§Ù†Ø¨ÙŠØ©
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
              // Ø¬Ù„Ø¨ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ø§Ù„Ø¨ Ù„Ù„Ø­ØµÙˆÙ„ Ø¹Ù„Ù‰ studentId
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
        cleanups.push(scheduleIdleTask(() => {
          void fetchGlobalRank();
        }));
    const loggedIn = localStorage.getItem("isLoggedIn") === "true";

    const role = localStorage.getItem("userRole");

    const name = localStorage.getItem("userName");

    setIsLoggedIn(loggedIn);

    setUserRole(role);

    setUserName(name);

    setAuthResolved(true);

    const accNumStr = localStorage.getItem("accountNumber");
    if (accNumStr) setUserAccountNumber(Number(accNumStr));

    const hasCachedCircles = hydrateCirclesFromCache();
    if (!hasCachedCircles) {
      cleanups.push(scheduleIdleTask(() => {
        void fetchCircles();
      }));
    }

    cleanups.push(scheduleIdleTask(() => {
      void router.prefetch("/students/all?scope=all");
    }));

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
        cleanups.push(scheduleIdleTask(() => {
          void fetchSidebarPlan(accNum);
        }));
      }
      else setIsSidebarStudentStatsLoading(false);
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
          cleanups.push(scheduleIdleTask(() => {
            void verifyFreshRole(accountNumber);
          }));
        }
      }
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);

  useEffect(() => {
    if (!authResolved || !hasPermission("التقارير")) {
      setContactReportsUnreadCount(0);
      return;
    }

    const cachedUnreadCount = Number(localStorage.getItem("contactReportsUnreadCount") || "0");
    const cachedUnreadAt = Number(localStorage.getItem("contactReportsUnreadCountAt") || "0");
    const hasFreshUnreadCache = Date.now() - cachedUnreadAt < CONTACT_REPORTS_CACHE_DURATION;

    if (hasFreshUnreadCache) {
      setContactReportsUnreadCount(cachedUnreadCount);
    } else {
      void fetchContactReportsUnreadCount();
    }

    const intervalId = window.setInterval(() => {
      void fetchContactReportsUnreadCount();
    }, CONTACT_REPORTS_CACHE_DURATION);

    return () => window.clearInterval(intervalId);
  }, [authResolved, userPermissions, userRole, userAccountNumber]);

  useEffect(() => {
    if (!authResolved || !isLoggedIn || userRole === "student" || !hasPermission("الإرسال إلى أولياء الأمور")) {
      setHasResolvedWhatsappQrStatus(false);
      return;
    }

    void fetchWhatsappQrStatus(true);
  }, [authResolved, isLoggedIn, userRole, userPermissions]);

  useEffect(() => {
    if (!isWhatsappQrDialogOpen) {
      return;
    }

    void fetchWhatsappQrStatus();

    const intervalId = window.setInterval(() => {
      void fetchWhatsappQrStatus(true);
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [isWhatsappQrDialogOpen]);

  const handleWhatsappQrRefresh = async () => {
    setWhatsappQrImageFailed(false);
    setIsWhatsappQrLoading(true);
    try {
      if (whatsappQrStatus.workerOnline) {
        await fetch("/api/whatsapp/disconnect", { method: "POST" });
      }
    } catch (e) {
      console.error(e);
    }
    // Wait for the worker to pick up the disconnect command (up to 5s)
    setTimeout(() => {
      void fetchWhatsappQrStatus(false);
    }, 6000);
  };

  const handleWhatsappQrDisconnect = async () => {
    const confirmed = await confirmDialog({
      title: "إلغاء ربط واتساب",
      description: "سيتم فصل الجهاز الحالي وإنشاء باركود جديد. هل تريد المتابعة؟",
      confirmText: "إلغاء الربط",
      cancelText: "تراجع",
    });

    if (!confirmed) {
      return;
    }

    try {
      setIsWhatsappQrDisconnecting(true);
      const response = await fetch("/api/whatsapp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const immediateStatus = await fetchWhatsappQrStatus();

      if (!immediateStatus.qrAvailable) {
        for (let attempt = 0; attempt < 12; attempt += 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 1000));
          const nextStatus = await fetchWhatsappQrStatus(true);
          if (nextStatus.qrAvailable || nextStatus.status === "waiting_for_qr") {
            break;
          }
        }
      }
    } catch {
      setWhatsappQrStatus(DEFAULT_WHATSAPP_HEADER_STATUS);
    } finally {
      setIsWhatsappQrDisconnecting(false);
    }
  };

  useEffect(() => {
    const handleContactMessagesChanged = () => {
      if (!authResolved || !hasPermission("التقارير")) {
        return;
      }

      void fetchContactReportsUnreadCount();
    };

    window.addEventListener("contactMessages:changed", handleContactMessagesChanged);

    return () => {
      window.removeEventListener("contactMessages:changed", handleContactMessagesChanged);
    };
  }, [authResolved, userPermissions, userRole, userAccountNumber]);

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
        // No redirect here â€” just update sidebar. Redirect happens on admin pages via useAdminAuth.
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
        void router.prefetch("/students/all?scope=all");

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
        setSidebarPlanName(`${planData.plan.start_surah_name} â† ${planData.plan.end_surah_name}`);
        localStorage.setItem(`studentHeaderStats_${accNum}`, JSON.stringify({
          sidebarPlanProgress: planData.progressPercent ?? 0,
          sidebarQuranProgress: planData.quranProgressPercent ?? 0,
          sidebarQuranLevel: planData.quranLevel ?? 0,
          sidebarStudentPoints: Number(student.points) || 0,
          sidebarPlanName: `${planData.plan.start_surah_name} â† ${planData.plan.end_surah_name}`,
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
              <>
                {hasPermission("الإرسال إلى أولياء الأمور") && (
                  <button
                    type="button"
                    className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 transition-colors hover:bg-white/15"
                    aria-label="باركود واتساب"
                    onClick={() => setIsWhatsappQrDialogOpen(true)}
                  >
                    <QrCode size={21} className="text-white" />
                    {hasResolvedWhatsappQrStatus && !isWhatsappHeaderConnected(whatsappQrStatus) ? (
                      <span className="absolute -left-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[11px] font-black text-[#1a2332] shadow-[0_4px_10px_rgba(0,0,0,0.18)]">
                        !
                      </span>
                    ) : null}
                  </button>
                )}
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
                              className={`group flex items-start gap-3 px-4 py-3.5 hover:bg-[#3453a7]/5 transition-colors cursor-default ${i !== notifications.length - 1 ? "border-b border-gray-100" : ""}`}
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
              </>
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
        <Dialog open={isWhatsappQrDialogOpen} onOpenChange={setIsWhatsappQrDialogOpen}>
          <DialogContent className="max-w-[92vw] rounded-[24px] border border-[#e5e7eb] p-6 sm:max-w-[360px] shadow-2xl bg-white" dir="rtl" showCloseButton={false}>
            <DialogTitle className="sr-only">ربط واتساب</DialogTitle>
            <div className="flex flex-col items-center justify-center bg-white">
              <div className="flex w-full items-center justify-start gap-2 mb-5">
                <QrCode className="h-6 w-6 text-[#3453a7]" />
                <span className="text-xl font-black text-[#1a2332]">ربط الهاتف</span>
              </div>
              
              <div className="relative flex w-full flex-col items-center justify-center">
                {isWhatsappQrLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-4 mb-5">
                    <SiteLoader size="md" color="#3453a7" />
                    <p className="text-sm font-semibold text-[#64748b]">جاري التحديث...</p>
                  </div>
                ) : !isWhatsappHeaderConnected(whatsappQrStatus) && whatsappQrStatus.qrAvailable && whatsappQrStatus.qrImageUrl && !whatsappQrImageFailed ? (
                  <div className="relative flex w-full flex-col items-center justify-center gap-3 h-auto mix-blend-multiply mb-5">
                    <img
                      src={`${whatsappQrStatus.qrImageUrl}&refresh=${Date.now()}`}
                      alt="باركود واتساب"
                      className="h-auto w-full max-w-[210px] rounded-xl"
                      onError={() => setWhatsappQrImageFailed(true)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 text-center px-4 py-4 mb-5">
                    {(() => {
                      const StatusIcon = getWhatsappHeaderStatusText(whatsappQrStatus).icon
                      const statusTone = getWhatsappHeaderStatusText(whatsappQrStatus).tone
                      
                      const iconColorClass = statusTone.match(/text-\w+-\d+/)?.[0] || 'text-[#3453a7]'
                      const bgAndBorder = statusTone.replace(/text-\w+-\d+/g, '')

                      return (
                        <div className={`flex h-16 w-16 items-center justify-center rounded-[20px] border shadow-sm ${bgAndBorder}`}>
                          <StatusIcon className={`h-8 w-8 ${iconColorClass}`} />
                        </div>
                      )
                    })()}
                    <p className="text-lg font-black text-[#1a2332] mt-1">{getWhatsappHeaderStatusText(whatsappQrStatus).title}</p>
                  </div>
                )}
              </div>

              {whatsappQrStatus.lastError && !isWhatsappHeaderConnected(whatsappQrStatus) ? (
                <div className="mb-6 w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-center text-sm font-bold leading-relaxed text-rose-700 shadow-sm">
                  {whatsappQrStatus.lastError}
                </div>
              ) : null}

              <div className="flex w-full flex-col gap-3">
                {!isWhatsappHeaderConnected(whatsappQrStatus) ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleWhatsappQrRefresh}
                    disabled={isWhatsappQrLoading}
                    className="w-full h-12 rounded-2xl border-[#dbe7ff] bg-[#f8faff] text-[15px] font-bold text-[#3453a7] shadow-[0_6px_18px_rgba(59,130,246,0.05)] transition-all hover:bg-[#eff4ff] hover:border-[#c5d6f8] disabled:opacity-70"
                  >
                    <RefreshCw className={`me-2 h-4 w-4 ${isWhatsappQrLoading ? 'animate-spin' : ''}`} />
                    تحديث الباركود
                  </Button>
                ) : null}

                {isWhatsappHeaderConnected(whatsappQrStatus) ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleWhatsappQrDisconnect}
                  className="w-full h-12 rounded-2xl border-rose-200 bg-rose-50 px-5 text-[15px] font-black text-rose-700 transition-all hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isWhatsappQrDisconnecting}
                >
                  <LogOut className="me-2 h-4 w-4" />
                  {isWhatsappQrDisconnecting ? "جاري الفصل..." : "إلغاء الربط"}
                </Button>
                ) : null}

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsWhatsappQrDialogOpen(false)}
                  className="w-full h-12 rounded-2xl text-[15px] font-bold text-[#64748b] hover:bg-gray-100 hover:text-[#334155]"
                >
                  إغلاق
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
          {/* الصف العلوي: اللوقو + إغلاق */}
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
                {isStudentHeaderStatsReady ? (
                  <div className="pt-2">
                    <div className="flex justify-end">
                      <StudentStatsCluster
                        currentLevel={Math.max(0, Math.min(100, sidebarQuranLevel || 0))}
                        globalRank={globalRank}
                        points={sidebarStudentPoints}
                        compact
                        showLevel={false}
                      />
                    </div>
                  </div>
                ) : null}
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
                  label="الاختبارات"
                  onClick={() => handleNav("/exams")}
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

              {["التقارير", "يوم السرد"].some((permission) => hasPermission(permission)) && <div className="px-2 mb-0.5">
                <CollapseSection
                  icon={FileText}
                  label="التقارير"
                  badgeCount={contactReportsUnreadCount}
                  isOpen={isAdminReportsOpen}
                  onToggle={() => setIsAdminReportsOpen(!isAdminReportsOpen)}
                >
                  {[
                    {
                      icon: FileText,

                      label: "متابعة التنفيذ",

                      permKey: "التقارير",

                      path: "/admin/student-daily-attendance",
                    },

                    {
                      icon: FileText,

                      label: "تقرير الحلقات المختصر",

                      permKey: "التقارير",

                      path: "/admin/reports/circle-short-report",
                    },

                    {
                      icon: FileText,

                      label: "تقارير المعلمين",

                      permKey: "التقارير",

                      path: "/admin/teacher-attendance",
                    },

                    {
                      icon: MessageSquare,
                      label: "تقارير الرسائل",

                      permKey: "التقارير",

                      path: "/admin/reports",
                    },

                    {
                      icon: BarChart3,

                      label: "الإحصائيات",

                      permKey: "التقارير",

                      path: "/admin/statistics",
                    },
                  ].filter(({ permKey }) => hasPermission(permKey)).map(({ icon: Ic, label, path }) => (
                    <NavItem
                      key={label}
                      icon={Ic}
                      label={label}
                      onClick={() => handleNav(path)}
                      indent
                      badgeCount={label === "تقارير الرسائل" ? contactReportsUnreadCount : undefined}
                    />
                  ))}
                </CollapseSection>
              </div>}

              {/* فئة الإدارة العامة */}

              {["الإشعارات", "الاختبارات", "إدارة المسار", "إنهاء الفصل", "الإرسال إلى أولياء الأمور", "الصلاحيات", "المالية"].some(p => hasPermission(p)) && <div className="px-2 mb-0.5">
                <CollapseSection
                  icon={Settings}
                  label="الإدارة العامة"
                  isOpen={isAdminGeneralOpen}
                  onToggle={() => setIsAdminGeneralOpen(!isAdminGeneralOpen)}
                >
                  {[
                    {
                      icon: Map,
                      label: "الاختبارات",
                      permKey: "الاختبارات",
                      path: "/admin/exams",
                    },

                    {
                      icon: FileText,
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



