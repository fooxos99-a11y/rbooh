"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Users } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SiteLoader } from "@/components/ui/site-loader";
import { createClient } from "@/lib/supabase/client";
import { getSaudiDateString, getSaudiWeekday } from "@/lib/saudi-time";
import { calculatePreviousMemorizedPages, resolvePlanReviewPagesPreference, resolvePlanReviewPoolPages } from "@/lib/quran-data";
import { isPassingMemorizationLevel, type EvaluationLevelValue } from "@/lib/student-attendance";

type StudentRow = {
  id: string;
  name: string | null;
  halaqah: string | null;
  id_number?: string | null;
  account_number?: string | number | null;
  points?: number | null;
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
  date: string;
  status: string | null;
  evaluations: EvaluationRecord[] | EvaluationRecord | null;
};

type DailyReportRow = {
  student_id: string;
  report_date: string;
  memorization_done: boolean;
  memorization_pages_count?: number | null;
  review_done: boolean;
  review_pages_count?: number | null;
  linking_done: boolean;
  linking_pages_count?: number | null;
};

type DayStatus = "absent" | "late" | "present-only" | "memorized" | "review" | "tied" | "review-tied" | "complete" | "none";

type StudentCardData = {
  id: string;
  name: string;
  memorized: number;
  revised: number;
  tied: number;
  presentCount: number;
  absentCount: number;
  memorizationCompletedCount: number;
  reviewCompletedCount: number;
  linkingCompletedCount: number;
  tasmeeCompletedCount: number;
  statuses: Array<{ date: string; status: DayStatus }>;
  totalActivity: number;
};

const TEXT = {
  titleSuffix: "\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0623\u0633\u0627\u0628\u064a\u0639",
  currentWeek: "\u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u062d\u0627\u0644\u064a",
  previousWeek: "\u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u0633\u0627\u0628\u0642",
  olderWeeks: "\u0642\u0628\u0644 {count} \u0623\u0633\u0627\u0628\u064a\u0639",
  noStudents: "\u0644\u0627 \u064a\u0648\u062c\u062f \u0637\u0644\u0627\u0628 \u0645\u0633\u062c\u0644\u0648\u0646 \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u062d\u0644\u0642\u0629",
  loadError: "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062d\u0644\u0642\u0629",
  back: "\u0627\u0644\u0639\u0648\u062f\u0629",
  legendTitle: "\u0645\u0639\u0627\u0646\u064a \u0627\u0644\u0623\u0644\u0648\u0627\u0646",
  attendance: "\u0627\u0644\u062d\u0636\u0648\u0631",
  weeklyAttendance: "\u062d\u0636\u0648\u0631",
  absent: "\u063a\u064a\u0627\u0628",
  weeklyAbsent: "\u063a\u064a\u0627\u0628",
  memorizationExecution: "\u0627\u0644\u062d\u0641\u0638",
  tasmee: "\u0627\u0644\u062a\u0633\u0645\u064a\u0639",
  reviewLabel: "\u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
  linkingLabel: "\u0627\u0644\u0631\u0628\u0637",
  memorizedPages: "\u0635\u0641\u062d\u0627\u062a \u0627\u0644\u062d\u0641\u0638",
  revisedPages: "\u0635\u0641\u062d\u0627\u062a \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629",
  tiedPages: "\u0635\u0641\u062d\u0627\u062a \u0627\u0644\u0631\u0628\u0637",
  memorized: "\u062d\u0627\u0641\u0638 \u0641\u0642\u0637",
  revised: "\u0645\u0631\u0627\u062c\u0639\u0629 \u0641\u0642\u0637",
  tied: "\u0631\u0628\u0637 \u0641\u0642\u0637",
  reviewTied: "\u0631\u0628\u0637 \u0648\u0645\u0631\u0627\u062c\u0639\u0629 \u0641\u0642\u0637",
  presentOnly: "\u062d\u0627\u0636\u0631 \u0641\u0642\u0637",
  notEvaluated: "\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u062a\u0642\u064a\u064a\u0645",
  complete: "\u0643\u0627\u0645\u0644",
  unknownStudent: "\u0637\u0627\u0644\u0628 \u063a\u064a\u0631 \u0645\u0639\u0631\u0641",
} as const;

function formatDateForQuery(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(value);
}

function parseSaudiDate(value: string) {
  return new Date(`${value}T12:00:00+03:00`);
}

function addDaysToSaudiDate(value: string, days: number) {
  const date = parseSaudiDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateForQuery(date);
}

function isStudyDay(dateValue: Date | string) {
  const date = typeof dateValue === "string" ? new Date(`${dateValue}T00:00:00`) : dateValue;
  const day = date.getDay();
  return day !== 6;
}

function isAttendanceDay(dateValue: Date | string) {
  const date = typeof dateValue === "string" ? new Date(`${dateValue}T00:00:00`) : dateValue;
  const day = date.getDay();
  return day === 0 || day === 3;
}

function isSaturdayReviewOnlyDay(dateValue: Date | string) {
  const date = typeof dateValue === "string" ? new Date(`${dateValue}T00:00:00`) : dateValue;
  return date.getDay() === 6;
}

function getCurrentStudyWeekStart() {
  const today = getSaudiDateString();
  return addDaysToSaudiDate(today, -getSaudiWeekday(today));
}

function getStudyWeekLabel(weekOffset: number) {
  if (weekOffset === 0) {
    return TEXT.currentWeek;
  }

  if (weekOffset === 1) {
    return TEXT.previousWeek;
  }

  return TEXT.olderWeeks.replace("{count}", new Intl.NumberFormat("ar-SA").format(weekOffset));
}

function getStudyWeek(weekOffset: number) {
  const startDate = addDaysToSaudiDate(getCurrentStudyWeekStart(), -weekOffset * 7);
  const fullWeekDates = [0, 1, 2, 3, 4, 5, 6].map((offset) => addDaysToSaudiDate(startDate, offset));
  const endDate = weekOffset === 0
    ? getSaudiDateString()
    : fullWeekDates[fullWeekDates.length - 1];
  const dates = fullWeekDates.filter((date) => date <= endDate);

  return {
    dates,
    startDate,
    endDate,
    label: getStudyWeekLabel(weekOffset),
  };
}

function LegendItem({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-[#4b5563]">
      <span className={`h-3 w-3 rounded-full ${colorClass}`} />
      <span>{label}</span>
    </div>
  );
}

function getEvaluationRecord(value: AttendanceRow["evaluations"]): EvaluationRecord {
  if (Array.isArray(value)) {
    return value[0] ?? {};
  }

  return value ?? {};
}

function hasPassingMemorization(record?: AttendanceRow) {
  if (!record || (record.status !== "present" && record.status !== "late")) {
    return false;
  }

  const evaluation = getEvaluationRecord(record.evaluations);
  return isPassingMemorizationLevel(evaluation.hafiz_level ?? null);
}

function formatMetric(value: number) {
  return new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

function formatRatio(completed: number, target: number) {
  return `${formatCount(completed)}/${formatCount(target)}`;
}

function getDayStatus(record?: AttendanceRow, dailyReport?: DailyReportRow): DayStatus {
  if (record?.status === "absent" || record?.status === "excused") {
    return "absent";
  }

  const reviewDone = Boolean(dailyReport?.review_done);
  const linkingDone = Boolean(dailyReport?.linking_done);
  const passedMemorization = hasPassingMemorization(record);

  if (passedMemorization) {
    return reviewDone || linkingDone ? "complete" : "memorized";
  }

  if (reviewDone && linkingDone) {
    return "review-tied";
  }

  if (reviewDone) {
    return "review";
  }

  if (linkingDone) {
    return "tied";
  }

  if (record?.status === "late") {
    return "late";
  }

  if (record?.status === "present") {
    return "present-only";
  }

  return "none";
}

function getStatusColor(status: DayStatus) {
  switch (status) {
    case "absent":
      return "bg-[#ef4444]";
    case "late":
      return "border border-[#d1d5db] bg-white";
    case "present-only":
      return "bg-[#22d3ee]";
    case "memorized":
      return "bg-[#4ade80]";
    case "review":
      return "bg-[#3b82f6]";
    case "tied":
      return "bg-[#facc15]";
    case "review-tied":
      return "bg-[#8b5cf6]";
    case "complete":
      return "bg-[#15803d]";
    default:
      return "bg-[#e5e7eb]";
  }
}

function ProgressRow({
  label,
  completed,
  target,
  barClass,
  badgeClass,
}: {
  label: string;
  completed: number;
  target: number;
  barClass: string;
  badgeClass: string;
}) {
  const progress = target > 0 ? Math.min(100, (completed / target) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-black text-[#334155]">{label}</div>
        <div className={`rounded-full px-3 py-1 text-sm font-black ${badgeClass}`}>{formatRatio(completed, target)}</div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#edf1f5]">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function MetricSummaryPill({ label, value, toneClass }: { label: string; value: string; toneClass: string }) {
  return (
    <div className={`rounded-2xl px-3 py-2 ${toneClass}`}>
      <div className="text-[11px] font-bold text-[#64748b]">{label}</div>
      <div className="mt-1 text-sm font-black text-[#1f2937]">{value}</div>
    </div>
  );
}

type CircleWeeklyReportsProps = {
  circleName: string;
  backHref?: string;
  backLabel?: string;
};

export function CircleWeeklyReports({ circleName, backHref, backLabel }: CircleWeeklyReportsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [students, setStudents] = useState<StudentCardData[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [hasPreviousWeek, setHasPreviousWeek] = useState(false);
  const studyWeek = useMemo(() => getStudyWeek(weekOffset), [weekOffset]);
  const studyDates = studyWeek.dates;
  const studyDayCount = studyDates.length;
  const attendanceTargetCount = studyDates.filter((date) => isAttendanceDay(date)).length;
  const executionTargetCount = studyDates.filter((date) => isStudyDay(date)).length;
  const memorizationTargetCount = executionTargetCount;
  const reviewTargetCount = studyDayCount;
  const linkingTargetCount = executionTargetCount;
  const tasmeeTargetCount = memorizationTargetCount;

  useEffect(() => {
    async function fetchCircleData() {
      if (!circleName) {
        setStudents([]);
        setHasPreviousWeek(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const supabase = createClient();
        const previousWeek = getStudyWeek(weekOffset + 1);

        const studentsResult = await supabase
          .from("students")
          .select("id, name, halaqah, id_number, account_number, points")
          .eq("halaqah", circleName)
          .order("points", { ascending: false });

        if (studentsResult.error) {
          throw studentsResult.error;
        }

        const studentRows = (studentsResult.data ?? []) as StudentRow[];
        const studentIds = studentRows.map((student) => student.id).filter(Boolean);

        if (studentIds.length === 0) {
          setHasPreviousWeek(false);
          setStudents([]);
          return;
        }

        const [plansResult, attendanceResult, dailyReportsResult, previousWeekAttendanceResult, previousWeekReportsResult] = await Promise.all([
          supabase.from("student_plans").select("student_id, daily_pages, muraajaa_pages, rabt_pages, review_distribution_mode"),
          supabase
            .from("attendance_records")
            .select(`
              id,
              student_id,
              date,
              status,
              evaluations (hafiz_level, tikrar_level, samaa_level, rabet_level)
            `)
            .eq("halaqah", circleName)
            .gte("date", studyWeek.startDate)
            .lte("date", studyWeek.endDate),
          supabase
            .from("student_daily_reports")
            .select("student_id, report_date, memorization_done, memorization_pages_count, review_done, review_pages_count, linking_done, linking_pages_count")
            .in("student_id", studentIds)
            .gte("report_date", studyWeek.startDate)
            .lte("report_date", studyWeek.endDate),
          supabase
            .from("attendance_records")
            .select("id", { count: "exact", head: true })
            .eq("halaqah", circleName)
            .gte("date", previousWeek.startDate)
            .lte("date", previousWeek.endDate),
          supabase
            .from("student_daily_reports")
            .select("student_id", { count: "exact", head: true })
            .in("student_id", studentIds)
            .gte("report_date", previousWeek.startDate)
            .lte("report_date", previousWeek.endDate),
        ]);

        if (plansResult.error) {
          throw plansResult.error;
        }

        if (attendanceResult.error) {
          throw attendanceResult.error;
        }

        if (dailyReportsResult.error) {
          throw dailyReportsResult.error;
        }

        if (previousWeekAttendanceResult.error) {
          throw previousWeekAttendanceResult.error;
        }

        if (previousWeekReportsResult.error) {
          throw previousWeekReportsResult.error;
        }

        const plans = (plansResult.data ?? []) as PlanRow[];
        const attendanceRows = ((attendanceResult.data ?? []) as AttendanceRow[]).filter((record) => studyDates.includes(record.date));
        const dailyReports = ((dailyReportsResult.data ?? []) as DailyReportRow[]).filter((report) => studyDates.includes(report.report_date));

        const plansByStudent = new Map(plans.map((plan) => [plan.student_id, plan]));
        const attendanceByStudent = new Map<string, Map<string, AttendanceRow>>();
        const dailyReportsByStudent = new Map<string, Map<string, DailyReportRow>>();

        for (const record of attendanceRows) {
          const byDate = attendanceByStudent.get(record.student_id) ?? new Map<string, AttendanceRow>();
          byDate.set(record.date, record);
          attendanceByStudent.set(record.student_id, byDate);
        }

        for (const report of dailyReports) {
          const byDate = dailyReportsByStudent.get(report.student_id) ?? new Map<string, DailyReportRow>();
          byDate.set(report.report_date, report);
          dailyReportsByStudent.set(report.student_id, byDate);
        }

        const cardRows = studentRows
          .map((student) => {
            const plan = plansByStudent.get(student.id);
            const byDate = attendanceByStudent.get(student.id) ?? new Map<string, AttendanceRow>();
            const reportsByDate = dailyReportsByStudent.get(student.id) ?? new Map<string, DailyReportRow>();
            let memorized = 0;
            let revised = 0;
            let tied = 0;
            let presentCount = 0;
            let absentCount = 0;
            let memorizationCompletedCount = 0;
            let reviewCompletedCount = 0;
            let linkingCompletedCount = 0;
            let tasmeeCompletedCount = 0;
            let memorizedPoolPages = plan ? calculatePreviousMemorizedPages(plan) : 0;

            const statuses = studyDates.map((date) => {
              const record = byDate.get(date);
              const dailyReport = reportsByDate.get(date);
              const status = getDayStatus(record, dailyReport);
              const isReviewOnlyDay = isSaturdayReviewOnlyDay(date);

              if (isAttendanceDay(date) && (record?.status === "present" || record?.status === "late")) {
                presentCount += 1;
              }

              if (isAttendanceDay(date) && (record?.status === "absent" || record?.status === "excused")) {
                absentCount += 1;
              }

              if (dailyReport?.memorization_done && !isReviewOnlyDay) {
                memorizationCompletedCount += 1;
              }

              if (dailyReport?.review_done) {
                reviewCompletedCount += 1;
              }

              if (dailyReport?.linking_done && !isReviewOnlyDay) {
                linkingCompletedCount += 1;
              }

              if (plan) {
                const reviewPoolPages = resolvePlanReviewPoolPages(plan, memorizedPoolPages);
                const reviewPages = resolvePlanReviewPagesPreference(plan, reviewPoolPages);
                const tiePages = Math.min(Number(plan.rabt_pages ?? 10), Math.max(0, memorizedPoolPages));

                if (dailyReport?.review_done) {
                  revised += Math.max(Number(dailyReport.review_pages_count ?? reviewPages), 0);
                }

                if (dailyReport?.linking_done) {
                  tied += Math.max(Number(dailyReport.linking_pages_count ?? tiePages), 0);
                }

                if (hasPassingMemorization(record)) {
                  const dailyPages = Number(plan.daily_pages ?? 1);
                  tasmeeCompletedCount += 1;
                  memorized += dailyPages;
                  memorizedPoolPages += dailyPages;
                }
              }

              return { date, status };
            });

            const totalActivity = memorized + revised + tied;

            return {
              id: student.id,
              name: student.name?.trim() || TEXT.unknownStudent,
              memorized,
              revised,
              tied,
              presentCount,
              absentCount,
              memorizationCompletedCount,
              reviewCompletedCount,
              linkingCompletedCount,
              tasmeeCompletedCount,
              statuses,
              totalActivity,
            } satisfies StudentCardData;
          })
          .sort((left, right) => {
            if (right.totalActivity !== left.totalActivity) {
              return right.totalActivity - left.totalActivity;
            }

            if (right.presentCount !== left.presentCount) {
              return right.presentCount - left.presentCount;
            }

            return left.name.localeCompare(right.name, "ar");
          });

        setHasPreviousWeek((previousWeekAttendanceResult.count ?? 0) > 0 || (previousWeekReportsResult.count ?? 0) > 0);
        setStudents(cardRows);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
        setError(`${TEXT.loadError}: ${message}`);
        setHasPreviousWeek(false);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchCircleData();
  }, [circleName, studyDates, studyWeek.endDate, studyWeek.startDate, weekOffset]);

  return (
    <div className="min-h-screen bg-[#fafaf9] font-cairo" dir="rtl">
      <Header />
      <main className="px-4 py-10">
        <div className="container mx-auto max-w-7xl space-y-8">
          <div className="grid grid-cols-[48px_1fr_48px] items-center">
              {backHref ? (
                <Link
                  href={backHref}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#dccba0] bg-white text-[#1a2332] shadow-sm transition hover:border-[#d8a355]"
                  aria-label={backLabel}
                >
                  <ArrowRight className="h-4.5 w-4.5" />
                </Link>
              ) : (
                <div />
              )}
            <div />
          </div>

          {loading ? (
            <div className="flex justify-center py-24">
              <SiteLoader size="lg" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          ) : students.length === 0 ? (
            <div className="rounded-[28px] border border-[#e6dfcb] bg-white px-6 py-16 text-center text-lg font-bold text-[#7b8794] shadow-sm">
              {TEXT.noStudents}
            </div>
          ) : (
            <section className="space-y-4">
              <div className="rounded-[24px] border border-[#e5e7eb] bg-[#fcfcfb] px-4 py-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-2 py-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setWeekOffset((currentOffset) => Math.max(0, currentOffset - 1))}
                      disabled={weekOffset === 0}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#1f2937] transition hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#c7cdd4] disabled:hover:bg-transparent"
                      aria-label="الرجوع للأسبوع الأحدث"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <span className="min-w-[118px] text-center text-sm font-black text-[#1f2937]">{studyWeek.label}</span>
                    <button
                      type="button"
                      onClick={() => setWeekOffset((currentOffset) => currentOffset + 1)}
                      disabled={!hasPreviousWeek}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#1f2937] transition hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#c7cdd4] disabled:hover:bg-transparent"
                      aria-label="الانتقال إلى الأسبوع الأقدم"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {students.map((student) => (
                  <article key={student.id} className="overflow-hidden rounded-[28px] border border-[#dde6f0] bg-white shadow-sm">
                    <div className="p-6">
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div className="min-w-0 text-right">
                          <div className="truncate text-2xl font-black text-[#1f2937]">{student.name}</div>
                        </div>
                        <Users className="mt-1 h-5 w-5 shrink-0 text-[#6a8fbf]" />
                      </div>
                      <div className="mb-5 rounded-[24px] border border-[#eef2f6] bg-[#fcfdff] p-4">
                        <div className="space-y-4">
                          <ProgressRow
                            label={TEXT.weeklyAttendance}
                            completed={student.presentCount}
                            target={attendanceTargetCount}
                            barClass="bg-[#22c55e]"
                            badgeClass="bg-[#ecfdf5] text-[#15803d]"
                          />
                          <ProgressRow
                            label={TEXT.memorizationExecution}
                            completed={student.memorizationCompletedCount}
                            target={memorizationTargetCount}
                            barClass="bg-[#16a34a]"
                            badgeClass="bg-[#f0fdf4] text-[#166534]"
                          />
                          <ProgressRow
                            label={TEXT.reviewLabel}
                            completed={student.reviewCompletedCount}
                            target={reviewTargetCount}
                            barClass="bg-[#2563eb]"
                            badgeClass="bg-[#eff6ff] text-[#1d4ed8]"
                          />
                          <ProgressRow
                            label={TEXT.linkingLabel}
                            completed={student.linkingCompletedCount}
                            target={linkingTargetCount}
                            barClass="bg-[#f59e0b]"
                            badgeClass="bg-[#fffbeb] text-[#b45309]"
                          />
                          <ProgressRow
                            label={TEXT.tasmee}
                            completed={student.tasmeeCompletedCount}
                            target={tasmeeTargetCount}
                            barClass="bg-[#0f766e]"
                            badgeClass="bg-[#f0fdfa] text-[#0f766e]"
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 border-t border-dashed border-[#e2e8f0] pt-4">
                          <MetricSummaryPill label={TEXT.memorizedPages} value={formatMetric(student.memorized)} toneClass="bg-[#f0fdf4]" />
                          <MetricSummaryPill label={TEXT.revisedPages} value={formatMetric(student.revised)} toneClass="bg-[#eff6ff]" />
                          <MetricSummaryPill label={TEXT.tiedPages} value={formatMetric(student.tied)} toneClass="bg-[#fffbeb]" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 border-t border-dashed border-[#e5e7eb] pt-4 text-sm font-black">
                        <div className="flex items-center gap-2 text-[#ef4444]">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                          <span>{TEXT.weeklyAbsent}: {formatCount(student.absentCount)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#22c55e]">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
                          <span>{TEXT.weeklyAttendance}: {formatCount(student.presentCount)}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}