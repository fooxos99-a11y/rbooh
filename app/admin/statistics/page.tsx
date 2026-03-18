"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, ChevronDown, ClipboardCheck, Link2, Orbit, Percent, Trophy, Users, type LucideIcon } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SiteLoader } from "@/components/ui/site-loader";
import { createClient } from "@/lib/supabase/client";
import { calculatePreviousMemorizedPages, resolvePlanReviewPagesPreference, resolvePlanReviewPoolPages } from "@/lib/quran-data";
import {
  applyAttendancePointsAdjustment,
  calculateTotalEvaluationPoints,
  isPassingMemorizationLevel,
  type EvaluationLevelValue,
} from "@/lib/student-attendance";

type DateFilter = "today" | "currentWeek" | "currentMonth" | "all" | "custom";

type CustomDateRange = {
  start: string;
  end: string;
};

type Counts = {
  circles: number;
  students: number;
};

type Totals = {
  attendance: number;
  execution: number;
  linkingExecution: number;
  memorized: number;
  reviewExecution: number;
  tasmee: number;
  revised: number;
  tied: number;
};

type StudentRow = {
  id: string;
  name: string | null;
};

type CircleRow = {
  id: string;
  name: string | null;
};

type PlanRow = {
  student_id: string;
  daily_pages: number | null;
  muraajaa_pages: number | null;
  rabt_pages: number | null;
  review_distribution_mode?: "fixed" | "weekly" | null;
};

type EvaluationRecord = {
  hafiz_level?: EvaluationLevelValue;
  tikrar_level?: EvaluationLevelValue;
  samaa_level?: EvaluationLevelValue;
  rabet_level?: EvaluationLevelValue;
};

type AttendanceRow = {
  id: string;
  student_id: string;
  halaqah: string | null;
  date: string;
  status: string | null;
  evaluations: EvaluationRecord[] | EvaluationRecord | null;
};

type DailyReportRow = {
  student_id: string;
  report_date: string;
  memorization_done: boolean;
  review_done: boolean;
  linking_done: boolean;
};

type StudentSummary = {
  id: string;
  name: string;
  circleName: string;
  memorized: number;
  revised: number;
  tied: number;
  maxPoints: number;
  earnedPoints: number;
  percent: number;
};

type CircleSummary = {
  name: string;
  memorized: number;
  revised: number;
  tied: number;
  passedMemorizationSegments: number;
  passedTikrarSegments: number;
  maxPoints: number;
  earnedPoints: number;
  totalAttend: number;
  totalRecords: number;
  evalPercent: number;
  attendPercent: number;
  memorizedPercent: number;
  tikrarPercent: number;
  revisedPercent: number;
  tiedPercent: number;
  score: number;
};

type PanelTone = {
  shellClass: string;
  titleClass: string;
  iconWrapClass: string;
  iconClass: string;
  dividerClass: string;
  bodyClass: string;
  valueClass: string;
  rankClass: string;
};

const TEXT = {
  title: "\u0627\u0644\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a \u0648\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631",
  filter: "\u0627\u0644\u0641\u062a\u0631\u0629",
  fromDate: "\u0645\u0646",
  toDate: "\u0625\u0644\u0649",
  students: "\u0639\u062f\u062f \u0627\u0644\u0637\u0644\u0627\u0628",
  circles: "\u0639\u062f\u062f \u0627\u0644\u062d\u0644\u0642\u0627\u062a",
  attendanceTotal: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062d\u0636\u0648\u0631",
  executionTotal: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062d\u0641\u0638",
  memorized: "\u0625\u062c\u0645\u0627\u0644\u064a \u0635\u0641\u062d\u0627\u062a \u0627\u0644\u062d\u0641\u0638",
  tasmeeTotal: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062a\u0633\u0645\u064a\u0639",
  revised: "\u0625\u062c\u0645\u0627\u0644\u064a \u0635\u0641\u062d\u0627\u062a \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
  tied: "\u0625\u062c\u0645\u0627\u0644\u064a \u0635\u0641\u062d\u0627\u062a \u0627\u0644\u0631\u0628\u0637",
  topMemorizers: "\u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0623\u0643\u062b\u0631 \u062d\u0641\u0638\u0627\u064b",
  topRevisers: "\u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0623\u0643\u062b\u0631 \u0645\u0631\u0627\u062c\u0639\u0629",
  topTied: "\u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0623\u0643\u062b\u0631 \u0631\u0628\u0637\u0627\u064b",
  topCircles: "\u0627\u0644\u062d\u0644\u0642 \u0627\u0644\u0623\u0639\u0644\u0649 \u0625\u0646\u062c\u0627\u0632\u0627\u064b",
  browseCircles: "\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0623\u0633\u0627\u0628\u064a\u0639",
  circleIndicators: "\u0645\u0624\u0634\u0631\u0627\u062a \u0623\u062f\u0627\u0621 \u0627\u0644\u062d\u0644\u0642",
  attendanceMetric: "\u0627\u0644\u062d\u0636\u0648\u0631",
  memorizedMetric: "\u0627\u0644\u062a\u0633\u0645\u064a\u0639",
  tikrarMetric: "\u0627\u0644\u062a\u0643\u0631\u0627\u0631",
  revisedMetric: "\u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
  tiedMetric: "\u0627\u0644\u0631\u0628\u0637",
  facesUnit: "\u0648\u062c\u0647",
  noData:
    "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0639\u0631\u0636\u0647\u0627 \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u0641\u062a\u0631\u0629",
  unknownStudent: "\u0637\u0627\u0644\u0628 \u063a\u064a\u0631 \u0645\u0639\u0631\u0641",
  unknownCircle: "\u062d\u0644\u0642\u0629 \u063a\u064a\u0631 \u0645\u0639\u0631\u0641\u0629",
  loadError: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a",
} as const;

const FILTER_LABELS: Record<DateFilter, string> = {
  today: "\u0627\u0644\u064a\u0648\u0645",
  currentWeek: "\u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u062d\u0627\u0644\u064a",
  currentMonth: "\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u062d\u0627\u0644\u064a",
  all: "\u0643\u0644 \u0627\u0644\u0641\u062a\u0631\u0627\u062a",
  custom: "\u0645\u062e\u0635\u0635",
};

const PANEL_TONES: Record<"memorized" | "revised" | "tied" | "circles", PanelTone> = {
  memorized: {
    shellClass: "border-[#cceee1] bg-[#eefbf5]",
    titleClass: "text-[#198754]",
    iconWrapClass: "bg-[#dcf6e9]",
    iconClass: "text-[#198754]",
    dividerClass: "border-b border-[#cfeee2]",
    bodyClass: "bg-[#eefbf5]",
    valueClass: "text-[#198754]",
    rankClass: "bg-[#dcf6e9] text-[#198754]",
  },
  revised: {
    shellClass: "border-[#cdeef2] bg-[#eefbfd]",
    titleClass: "text-[#177e94]",
    iconWrapClass: "bg-[#def4f8]",
    iconClass: "text-[#177e94]",
    dividerClass: "border-b border-[#cfeaf0]",
    bodyClass: "bg-[#eefbfd]",
    valueClass: "text-[#177e94]",
    rankClass: "bg-[#def4f8] text-[#177e94]",
  },
  tied: {
    shellClass: "border-[#ddd8f8] bg-[#f5f2ff]",
    titleClass: "text-[#6f60bd]",
    iconWrapClass: "bg-[#e8e2ff]",
    iconClass: "text-[#6f60bd]",
    dividerClass: "border-b border-[#e3ddf8]",
    bodyClass: "bg-[#f5f2ff]",
    valueClass: "text-[#6f60bd]",
    rankClass: "bg-[#e8e2ff] text-[#6f60bd]",
  },
  circles: {
    shellClass: "border-[#d9def7] bg-[#f4f6ff]",
    titleClass: "text-[#5a67b1]",
    iconWrapClass: "bg-[#e5e9ff]",
    iconClass: "text-[#5a67b1]",
    dividerClass: "border-b border-[#dee3f8]",
    bodyClass: "bg-[#f4f6ff]",
    valueClass: "text-[#5a67b1]",
    rankClass: "bg-[#e5e9ff] text-[#5a67b1]",
  },
};

function formatDateForQuery(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(value);
}

function getDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function isStudyDay(dateValue: string) {
  const day = new Date(`${dateValue}T00:00:00`).getDay();
  return day !== 5;
}

function isSaturdayReviewOnlyDay(dateValue: string) {
  const day = new Date(`${dateValue}T00:00:00`).getDay();
  return day === 6;
}

function getDateRange(filter: DateFilter, customRange: CustomDateRange) {
  const end = new Date();
  const start = new Date();

  if (filter === "today") {
    return { start: new Date(start.setHours(0, 0, 0, 0)), end };
  }

  if (filter === "currentWeek") {
    const today = new Date();
    const day = today.getDay();
    const weekStart = new Date(today);
    const startOffset = day === 0 ? 0 : day;

    weekStart.setDate(today.getDate() - startOffset);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(today);

    if (day === 5) {
      weekEnd.setDate(today.getDate() - 1);
    }

    weekEnd.setHours(23, 59, 59, 999);

    return { start: weekStart, end: weekEnd };
  }

  if (filter === "currentMonth") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (filter === "custom") {
    return {
      start: new Date(`${customRange.start}T00:00:00`),
      end: new Date(`${customRange.end}T23:59:59`),
    };
  }

  start.setFullYear(2020, 0, 1);
  return { start, end };
}

function getEvaluationRecord(value: AttendanceRow["evaluations"]): EvaluationRecord {
  if (Array.isArray(value)) {
    return value[0] ?? {};
  }

  return value ?? {};
}

function createStudentSummary(id: string, name: string, circleName: string): StudentSummary {
  return {
    id,
    name,
    circleName,
    memorized: 0,
    revised: 0,
    tied: 0,
    maxPoints: 0,
    earnedPoints: 0,
    percent: 0,
  };
}

function createCircleSummary(name: string): CircleSummary {
  return {
    name,
    memorized: 0,
    revised: 0,
    tied: 0,
    passedMemorizationSegments: 0,
    passedTikrarSegments: 0,
    maxPoints: 0,
    earnedPoints: 0,
    totalAttend: 0,
    totalRecords: 0,
    evalPercent: 0,
    attendPercent: 0,
    memorizedPercent: 0,
    tikrarPercent: 0,
    revisedPercent: 0,
    tiedPercent: 0,
    score: 0,
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(Math.round(value * 10) / 10);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: value >= 10 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function formatDisplayDate(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  iconClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#e7dcc0] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-bold text-[#6b7280]">{label}</span>
        <span className={`rounded-full p-2 ${accent}`}>
          <Icon className={iconClassName ?? "h-5 w-5"} />
        </span>
      </div>
      <div className="text-3xl font-extrabold text-[#1a2332]">{value}</div>
    </div>
  );
}

function MetricBar({
  label,
  value,
  trackClass,
  fillClass,
}: {
  label: string;
  value: number;
  trackClass: string;
  fillClass: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)_72px] items-center gap-3 text-xs font-bold text-[#5f6b7a]">
      <span className="text-left tabular-nums text-[#4c5a6a]">{formatPercent(safeValue)}</span>
      <div className={`h-2.5 overflow-hidden rounded-full ${trackClass}`}>
        <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${safeValue}%` }} />
      </div>
      <span className="text-right whitespace-nowrap">{label}</span>
    </div>
  );
}

function CircleIndicatorsCard({ items }: { items: CircleSummary[] }) {
  return (
    <section className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#111827]">
          <span className="text-sm font-black text-[#111827]">{TEXT.circleIndicators}</span>
        </div>
        <Orbit className="h-4 w-4 text-[#60a5fa]" />
      </div>

      <div className="space-y-6">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.name} className="space-y-3 border-b border-[#edf0f3] pb-5 last:border-b-0 last:pb-0">
              <div className="text-right text-sm font-black text-[#1f2937]">{item.name}</div>
              <div className="space-y-2.5">
                <MetricBar label={TEXT.attendanceMetric} value={item.attendPercent} trackClass="bg-[#fff3bf]" fillClass="bg-[#facc15]" />
                <MetricBar label={TEXT.memorizedMetric} value={item.memorizedPercent} trackClass="bg-[#dcfce7]" fillClass="bg-[#22c55e]" />
                <MetricBar label={TEXT.tikrarMetric} value={item.tikrarPercent} trackClass="bg-[#d1fae5]" fillClass="bg-[#10b981]" />
                <MetricBar label={TEXT.revisedMetric} value={item.revisedPercent} trackClass="bg-[#dbeafe]" fillClass="bg-[#3b82f6]" />
                <MetricBar label={TEXT.tiedMetric} value={item.tiedPercent} trackClass="bg-[#ede9fe]" fillClass="bg-[#8b5cf6]" />
              </div>
            </div>
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}

function SectionShell({
  title,
  open,
  onToggle,
  icon: Icon,
  shellClass,
  titleClass,
  iconWrapClass,
  iconClass,
  dividerClass,
  bodyClass,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  icon: LucideIcon;
  shellClass: string;
  titleClass: string;
  iconWrapClass: string;
  iconClass: string;
  dividerClass: string;
  bodyClass: string;
  children: ReactNode;
}) {
  return (
    <section className={`self-start overflow-hidden rounded-[20px] border shadow-sm ${shellClass}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`grid w-full grid-cols-[28px_1fr_24px] items-center gap-3 px-4 py-4 text-right ${open ? dividerClass : ""}`}
      >
        <span className={`flex h-7 w-7 items-center justify-center justify-self-start rounded-full ${iconWrapClass}`}>
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </span>
        <div className="min-w-0 justify-self-center">
          <h2 className={`truncate whitespace-nowrap text-[15px] font-extrabold sm:text-lg ${titleClass}`}>{title}</h2>
        </div>
        <ChevronDown className={`h-5 w-5 justify-self-end ${iconClass} transition-transform ${open ? "rotate-180" : "rotate-0"}`} />
      </button>
      {open ? <div className={`px-4 py-2 ${bodyClass}`}>{children}</div> : null}
    </section>
  );
}

function EmptyState() {
  return <div className="px-4 py-10 text-center text-sm font-semibold text-[#7c6f57]">{TEXT.noData}</div>;
}

function StudentRowItem({
  item,
  rank,
  value,
  valueClass,
  rankClass,
}: {
  item: StudentSummary;
  rank: number;
  value: string;
  valueClass: string;
  rankClass: string;
}) {
  return (
    <div className="py-3.5">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4" dir="ltr">
        <div className={`shrink-0 text-left text-sm font-black ${valueClass}`}>{value}</div>
        <div className="min-w-0 text-right" dir="rtl">
          <div className="truncate text-[14px] font-bold text-[#4d5870] sm:text-[15px]">{item.name}</div>
          <div className="truncate text-[11px] font-semibold text-[#7b8794] sm:text-xs">{item.circleName}</div>
        </div>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${rankClass}`}>
          {rank}
        </span>
      </div>
    </div>
  );
}

function CircleRowItem({
  item,
  rank,
  valueClass,
  rankClass,
}: {
  item: CircleSummary;
  rank: number;
  valueClass: string;
  rankClass: string;
}) {
  return (
    <div className="py-3.5">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4" dir="ltr">
        <div className={`shrink-0 text-left text-sm font-black ${valueClass}`}>{formatPercent(item.score)}</div>
        <div className="min-w-0 truncate text-right text-[14px] font-bold text-[#4d5870] sm:text-[15px]" dir="rtl">
          {item.name}
        </div>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${rankClass}`}>
          {rank}
        </span>
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  const initialCustomRange = {
    start: getDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end: getDateInputValue(new Date()),
  };

  const [dateFilter, setDateFilter] = useState<DateFilter>("currentMonth");
  const [customRange, setCustomRange] = useState<CustomDateRange>(initialCustomRange);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState<Counts>({ circles: 0, students: 0 });
  const [totals, setTotals] = useState<Totals>({
    attendance: 0,
    execution: 0,
    linkingExecution: 0,
    memorized: 0,
    reviewExecution: 0,
    tasmee: 0,
    revised: 0,
    tied: 0,
  });
  const [allCircles, setAllCircles] = useState<CircleRow[]>([]);
  const [topMemorizers, setTopMemorizers] = useState<StudentSummary[]>([]);
  const [topRevisers, setTopRevisers] = useState<StudentSummary[]>([]);
  const [topTied, setTopTied] = useState<StudentSummary[]>([]);
  const [topCircles, setTopCircles] = useState<CircleSummary[]>([]);
  const [openSections, setOpenSections] = useState({ memorized: true, revised: true, tied: true, circles: true });
  const customStartRef = useRef<HTMLInputElement | null>(null);
  const customEndRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void fetchStatistics();
  }, [dateFilter, customRange.end, customRange.start]);

  function openDatePicker(input: HTMLInputElement | null) {
    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.click();
  }

  function handleCustomStartChange(value: string) {
    setCustomRange((current) => ({
      ...current,
      start: value,
      end: value > current.end ? value : current.end,
    }));
  }

  function handleDateFilterChange(nextFilter: DateFilter) {
    setDateFilter(nextFilter);
  }

  async function fetchStatistics() {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { start, end } = getDateRange(dateFilter, customRange);

      const [studentsResult, circlesResult, plansResult] = await Promise.all([
        supabase.from("students").select("id, name"),
        supabase.from("circles").select("id, name"),
        supabase.from("student_plans").select("student_id, daily_pages, muraajaa_pages, rabt_pages, review_distribution_mode"),
      ]);

      if (studentsResult.error) {
        throw studentsResult.error;
      }

      if (circlesResult.error) {
        throw circlesResult.error;
      }

      if (plansResult.error) {
        throw plansResult.error;
      }

      let attendanceQuery = supabase.from("attendance_records").select(`
        id,
        student_id,
        halaqah,
        date,
        status,
        evaluations (hafiz_level, tikrar_level, samaa_level, rabet_level)
      `);

      let dailyReportsQuery = supabase.from("student_daily_reports").select("student_id, report_date, memorization_done, review_done, linking_done");

      if (dateFilter !== "all") {
        attendanceQuery = attendanceQuery
          .gte("date", formatDateForQuery(start))
          .lte("date", formatDateForQuery(end));

        dailyReportsQuery = dailyReportsQuery
          .gte("report_date", formatDateForQuery(start))
          .lte("report_date", formatDateForQuery(end));
      }

      const [attendanceResult, dailyReportsResult] = await Promise.all([attendanceQuery, dailyReportsQuery]);

      if (attendanceResult.error) {
        throw attendanceResult.error;
      }

      if (dailyReportsResult.error) {
        throw dailyReportsResult.error;
      }

      const students = (studentsResult.data ?? []) as StudentRow[];
      const circles = (circlesResult.data ?? []) as CircleRow[];
      const plans = (plansResult.data ?? []) as PlanRow[];
      const plannedStudentIds = new Set(plans.map((plan) => plan.student_id).filter(Boolean));
      const attendance = ((attendanceResult.data ?? []) as AttendanceRow[]).filter(
        (record) => isStudyDay(record.date) && plannedStudentIds.has(record.student_id),
      );
      const dailyReports = ((dailyReportsResult.data ?? []) as DailyReportRow[]).filter(
        (report) => isStudyDay(report.report_date) && plannedStudentIds.has(report.student_id),
      );

      setCounts({ circles: circles.length, students: students.length });
      setAllCircles([...circles].sort((left, right) => (left.name || "").localeCompare(right.name || "ar")));

      const studentNames = new Map(students.map((student) => [student.id, student.name?.trim() || TEXT.unknownStudent]));
      const plansByStudent = new Map(plans.map((plan) => [plan.student_id, plan]));
      const dailyReportByStudentDate = new Map(
        dailyReports.map((report) => [`${report.student_id}::${report.report_date}`, report] as const),
      );

      const studentStats = new Map<string, StudentSummary>();
      const circleStats = new Map<string, CircleSummary>();

      let attendanceTotal = 0;
      let executionTotal = 0;
      let memorizedTotal = 0;
      let tasmeeTotal = 0;
      let revisedTotal = 0;
      let tiedTotal = 0;

      for (const report of dailyReports) {
        if (report.memorization_done && !isSaturdayReviewOnlyDay(report.report_date)) {
          executionTotal += 1;
        }
      }

      const memorizedPoolByStudent = new Map<string, number>();
      const sortedAttendance = [...attendance].sort((left, right) => {
        if (left.student_id !== right.student_id) {
          return left.student_id.localeCompare(right.student_id);
        }

        return left.date.localeCompare(right.date);
      });

      for (const record of sortedAttendance) {
        const studentId = record.student_id;
        const plan = plansByStudent.get(studentId);
        const circleName = record.halaqah?.trim() || TEXT.unknownCircle;

        // Students without plans should not affect student totals or circle performance ratios.
        if (!plan) {
          continue;
        }

        const studentName = studentNames.get(studentId) ?? TEXT.unknownStudent;
        const studentSummary = studentStats.get(studentId) ?? createStudentSummary(studentId, studentName, circleName);
        studentStats.set(studentId, studentSummary);
        if (studentSummary.circleName === TEXT.unknownCircle && circleName !== TEXT.unknownCircle) {
          studentSummary.circleName = circleName;
        }

        const circleSummary = circleStats.get(circleName) ?? createCircleSummary(circleName);
        circleStats.set(circleName, circleSummary);

        circleSummary.totalRecords += 1;

        const dailyPages = Number(plan?.daily_pages ?? 1);
        const status = record.status ?? "";
        const isPresent = status === "present" || status === "late";
        const memorizedPoolPages = memorizedPoolByStudent.has(studentId)
          ? memorizedPoolByStudent.get(studentId) ?? 0
          : calculatePreviousMemorizedPages(plan);
        const reviewPoolPages = resolvePlanReviewPoolPages(plan, memorizedPoolPages);
        const reviewPages = resolvePlanReviewPagesPreference(plan, reviewPoolPages);
        const tiePages = Math.min(Number(plan?.rabt_pages ?? 10), Math.max(0, memorizedPoolPages));

        studentSummary.maxPoints += 10;
        circleSummary.maxPoints += 10;

        if (!isPresent) {
          continue;
        }

        attendanceTotal += 1;
        circleSummary.totalAttend += 1;

        const evaluation = getEvaluationRecord(record.evaluations);
        const dailyReport = dailyReportByStudentDate.get(`${studentId}::${record.date}`);
        const isSaturdayReviewOnly = isSaturdayReviewOnlyDay(record.date);

        if (dailyReport?.memorization_done && !isSaturdayReviewOnly) {
          studentSummary.memorized += dailyPages;
          circleSummary.memorized += dailyPages;
          memorizedTotal += dailyPages;
          memorizedPoolByStudent.set(studentId, memorizedPoolPages + dailyPages);
        } else if (isPassingMemorizationLevel(evaluation.hafiz_level ?? null)) {
          studentSummary.memorized += dailyPages;
          circleSummary.memorized += dailyPages;
          memorizedTotal += dailyPages;
          memorizedPoolByStudent.set(studentId, memorizedPoolPages + dailyPages);
        } else if (!memorizedPoolByStudent.has(studentId)) {
          memorizedPoolByStudent.set(studentId, memorizedPoolPages);
        }

        if (isPassingMemorizationLevel(evaluation.hafiz_level ?? null)) {
          circleSummary.passedMemorizationSegments += 1;
          tasmeeTotal += 1;
        }

        if (isPassingMemorizationLevel(evaluation.tikrar_level ?? null)) {
          circleSummary.passedTikrarSegments += 1;
        }

        if (dailyReport?.review_done) {
          studentSummary.revised += reviewPages;
          circleSummary.revised += reviewPages;
          revisedTotal += reviewPages;
        } else if (isPassingMemorizationLevel(evaluation.samaa_level ?? null)) {
          studentSummary.revised += reviewPages;
          circleSummary.revised += reviewPages;
          revisedTotal += reviewPages;
        }

        if (dailyReport?.linking_done && !isSaturdayReviewOnly) {
          studentSummary.tied += tiePages;
          circleSummary.tied += tiePages;
          tiedTotal += tiePages;
        } else if (isPassingMemorizationLevel(evaluation.rabet_level ?? null)) {
          studentSummary.tied += tiePages;
          circleSummary.tied += tiePages;
          tiedTotal += tiePages;
        }

        const earnedPoints = applyAttendancePointsAdjustment(calculateTotalEvaluationPoints(evaluation), status);
        studentSummary.earnedPoints += earnedPoints;
        circleSummary.earnedPoints += earnedPoints;
      }

      const studentArray = Array.from(studentStats.values()).map((item) => ({
        ...item,
        percent: item.maxPoints > 0 ? (item.earnedPoints / item.maxPoints) * 100 : 0,
      }));

      const circleArray = Array.from(circleStats.values())
        .filter((item) => item.totalRecords > 0)
        .map((item) => {
        const evalPercent = item.maxPoints > 0 ? (item.earnedPoints / item.maxPoints) * 100 : 0;
        const attendPercent = item.totalRecords > 0 ? (item.totalAttend / item.totalRecords) * 100 : 0;
        const memorizedPercent = item.totalRecords > 0 ? (item.passedMemorizationSegments / item.totalRecords) * 100 : 0;
        const tikrarPercent = item.totalRecords > 0 ? (item.passedTikrarSegments / item.totalRecords) * 100 : 0;
        const revisedPercent = revisedTotal > 0 ? (item.revised / revisedTotal) * 100 : 0;
        const tiedPercent = tiedTotal > 0 ? (item.tied / tiedTotal) * 100 : 0;
        const score = evalPercent * 0.6 + attendPercent * 0.4;

        return {
          ...item,
          evalPercent,
          attendPercent,
          memorizedPercent,
          tikrarPercent,
          revisedPercent,
          tiedPercent,
          score,
        };
      });

      const reviewExecutionTotal = dailyReports.reduce((sum, report) => sum + (report.review_done ? 1 : 0), 0);
      const linkingExecutionTotal = dailyReports.reduce(
        (sum, report) => sum + (report.linking_done && !isSaturdayReviewOnlyDay(report.report_date) ? 1 : 0),
        0,
      );

      setTotals({
        attendance: attendanceTotal,
        execution: executionTotal,
        linkingExecution: linkingExecutionTotal,
        memorized: memorizedTotal,
        reviewExecution: reviewExecutionTotal,
        tasmee: tasmeeTotal,
        revised: revisedTotal,
        tied: tiedTotal,
      });
      setTopMemorizers([...studentArray].sort((left, right) => right.memorized - left.memorized).slice(0, 5));
      setTopRevisers([...studentArray].sort((left, right) => right.revised - left.revised).slice(0, 5));
      setTopTied([...studentArray].sort((left, right) => right.tied - left.tied).slice(0, 5));
      setTopCircles([...circleArray].sort((left, right) => right.score - left.score).slice(0, 5));
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
      setError(`${TEXT.loadError}: ${message}`);
      setTopMemorizers([]);
      setTopRevisers([]);
      setTopTied([]);
      setTopCircles([]);
      setTotals({
        attendance: 0,
        execution: 0,
        linkingExecution: 0,
        memorized: 0,
        reviewExecution: 0,
        tasmee: 0,
        revised: 0,
        tied: 0,
      });
      setCounts({ circles: 0, students: 0 });
      setAllCircles([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] font-cairo" dir="rtl">
      <Header />
      <main className="px-4 py-10">
        <div className="container mx-auto max-w-7xl space-y-8">
          <section className="p-2 md:p-0">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-3xl font-black text-[#1a2332] md:text-4xl">{TEXT.title}</h1>
              </div>
              <label className="flex min-w-[220px] flex-col gap-2 text-sm font-bold text-[#40515b]">
                <span>{TEXT.filter}</span>
                <div className="relative">
                  <input
                    ref={customStartRef}
                    type="date"
                    className="sr-only"
                    value={customRange.start}
                    max={customRange.end}
                    onChange={(event) => handleCustomStartChange(event.target.value)}
                  />
                  <input
                    ref={customEndRef}
                    type="date"
                    className="sr-only"
                    value={customRange.end}
                    min={customRange.start}
                    onChange={(event) =>
                      setCustomRange((current) => ({
                        ...current,
                        end: event.target.value,
                      }))
                    }
                  />
                  <select
                    className="w-full appearance-none rounded-2xl border border-[#d8c79f] bg-white py-3 pl-12 pr-4 text-center text-base font-extrabold text-[#1a2332] outline-none transition focus:border-[#0f766e]"
                    value={dateFilter}
                    onChange={(event) => handleDateFilterChange(event.target.value as DateFilter)}
                  >
                    {Object.entries(FILTER_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#1a2332]" />
                </div>
                {dateFilter === "custom" ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      className="rounded-2xl border border-[#d8c79f] bg-white px-4 py-3 text-right text-sm font-bold text-[#1a2332] transition hover:border-[#0f766e]"
                      onClick={() => openDatePicker(customStartRef.current)}
                    >
                      <span className="block text-xs text-[#6b7280]">{TEXT.fromDate}</span>
                      <span className="mt-1 block">
                        {customRange.start ? formatDisplayDate(customRange.start) : "\u0627\u062e\u062a\u0631 \u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0645\u0646"}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl border border-[#d8c79f] bg-white px-4 py-3 text-right text-sm font-bold text-[#1a2332] transition hover:border-[#0f766e]"
                      onClick={() => openDatePicker(customEndRef.current)}
                    >
                      <span className="block text-xs text-[#6b7280]">{TEXT.toDate}</span>
                      <span className="mt-1 block">
                        {customRange.end ? formatDisplayDate(customRange.end) : "\u0627\u062e\u062a\u0631 \u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0625\u0644\u0649"}
                      </span>
                    </button>
                  </div>
                ) : null}
              </label>
            </div>

          </section>

          {loading ? (
            <div className="flex justify-center py-24">
              <SiteLoader size="lg" />
            </div>
          ) : (
            <>
              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
              ) : null}

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard icon={Users} label={TEXT.students} value={formatNumber(counts.students)} accent="bg-[#e8f3f1] text-[#0f766e]" />
                <StatCard icon={Trophy} label={TEXT.circles} value={formatNumber(counts.circles)} accent="bg-[#fbf2d9] text-[#b88710]" />
                <StatCard icon={Users} label={TEXT.attendanceTotal} value={formatNumber(totals.attendance)} accent="bg-[#fff7db] text-[#ca8a04]" />
                <StatCard icon={BookOpen} label={TEXT.memorized} value={formatNumber(totals.memorized)} accent="bg-[#e9f7ec] text-[#1f8b4c]" iconClassName="h-6 w-6" />
                <StatCard icon={Orbit} label={TEXT.revised} value={formatNumber(totals.revised)} accent="bg-[#ebf2ff] text-[#2563eb]" />
                <StatCard icon={Percent} label={TEXT.tied} value={formatNumber(totals.tied)} accent="bg-[#f4ebff] text-[#7c3aed]" />
              </section>

              <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-4">
                <SectionShell
                  title={TEXT.topMemorizers}
                  open={openSections.memorized}
                  onToggle={() => setOpenSections((current) => ({ ...current, memorized: !current.memorized }))}
                  icon={BookOpen}
                  {...PANEL_TONES.memorized}
                >
                  <div className="divide-y divide-[#cfeee2]">
                    {topMemorizers.length > 0 ? (
                      topMemorizers.map((item, index) => (
                        <StudentRowItem
                          key={item.id}
                          item={item}
                          rank={index + 1}
                          value={`${formatNumber(item.memorized)} ${TEXT.facesUnit}`}
                          valueClass={PANEL_TONES.memorized.valueClass}
                          rankClass={PANEL_TONES.memorized.rankClass}
                        />
                      ))
                    ) : (
                      <EmptyState />
                    )}
                  </div>
                </SectionShell>

                <SectionShell
                  title={TEXT.topRevisers}
                  open={openSections.revised}
                  onToggle={() => setOpenSections((current) => ({ ...current, revised: !current.revised }))}
                  icon={Orbit}
                  {...PANEL_TONES.revised}
                >
                  <div className="divide-y divide-[#cfeaf0]">
                    {topRevisers.length > 0 ? (
                      topRevisers.map((item, index) => (
                        <StudentRowItem
                          key={item.id}
                          item={item}
                          rank={index + 1}
                          value={`${formatNumber(item.revised)} ${TEXT.facesUnit}`}
                          valueClass={PANEL_TONES.revised.valueClass}
                          rankClass={PANEL_TONES.revised.rankClass}
                        />
                      ))
                    ) : (
                      <EmptyState />
                    )}
                  </div>
                </SectionShell>

                <SectionShell
                  title={TEXT.topTied}
                  open={openSections.tied}
                  onToggle={() => setOpenSections((current) => ({ ...current, tied: !current.tied }))}
                  icon={Link2}
                  {...PANEL_TONES.tied}
                >
                  <div className="divide-y divide-[#e3ddf8]">
                    {topTied.length > 0 ? (
                      topTied.map((item, index) => (
                        <StudentRowItem
                          key={item.id}
                          item={item}
                          rank={index + 1}
                          value={`${formatNumber(item.tied)} ${TEXT.facesUnit}`}
                          valueClass={PANEL_TONES.tied.valueClass}
                          rankClass={PANEL_TONES.tied.rankClass}
                        />
                      ))
                    ) : (
                      <EmptyState />
                    )}
                  </div>
                </SectionShell>

                <SectionShell
                  title={TEXT.topCircles}
                  open={openSections.circles}
                  onToggle={() => setOpenSections((current) => ({ ...current, circles: !current.circles }))}
                  icon={Trophy}
                  {...PANEL_TONES.circles}
                >
                  <div className="divide-y divide-[#dee3f8]">
                    {topCircles.length > 0 ? (
                      topCircles.map((item, index) => (
                        <CircleRowItem
                          key={`${item.name}-${index}`}
                          item={item}
                          rank={index + 1}
                          valueClass={PANEL_TONES.circles.valueClass}
                          rankClass={PANEL_TONES.circles.rankClass}
                        />
                      ))
                    ) : (
                      <EmptyState />
                    )}
                  </div>
                </SectionShell>
              </section>

              <CircleIndicatorsCard items={topCircles} />

              <section className="space-y-3">
                <div className="text-sm font-black text-[#1a2332]">{TEXT.browseCircles}</div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {allCircles.map((circle) => (
                    <Link
                      key={circle.id}
                      href={`/admin/statistics/circles/${encodeURIComponent(circle.name || TEXT.unknownCircle)}`}
                      className="group relative overflow-hidden rounded-[28px] border border-[#d9e1f7] bg-[linear-gradient(135deg,#f8fbff_0%,#eef4ff_52%,#f7f4ff_100%)] p-5 shadow-[0_20px_45px_-30px_rgba(90,103,177,0.55)] transition duration-200 hover:-translate-y-1 hover:border-[#bcc8ef] hover:shadow-[0_28px_50px_-28px_rgba(90,103,177,0.6)]"
                    >
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.95),rgba(255,255,255,0))]" />
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-[#5a67b1] shadow-sm transition group-hover:scale-105">
                          <BookOpen className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="relative mt-6 text-right">
                        <div className="text-[13px] font-extrabold tracking-[0.16em] text-[#7c89c7]">تقرير الحلقة</div>
                        <div className="mt-2 line-clamp-2 text-lg font-black leading-8 text-[#1a2332]">{circle.name || TEXT.unknownCircle}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}





