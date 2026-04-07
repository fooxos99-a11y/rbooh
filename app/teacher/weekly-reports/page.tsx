"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getClientAccountNumber } from "@/lib/client-auth";

import { CircleWeeklyReports } from "@/components/circle-weekly-reports";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SiteLoader } from "@/components/ui/site-loader";
import { resolveCircleName } from "@/lib/circle-name";

type TeacherData = {
  halaqah?: string | null;
  circle_name?: string | null;
};

export default function TeacherWeeklyReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teacherCircle, setTeacherCircle] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTeacherCircle() {
      const loggedIn = localStorage.getItem("isLoggedIn") === "true";
      const userRole = localStorage.getItem("userRole");
      const accountNumber = getClientAccountNumber();

      if (!loggedIn || (userRole !== "teacher" && userRole !== "deputy_teacher") || !accountNumber) {
        router.push("/login");
        return;
      }

      try {
        const response = await fetch(`/api/teachers?account_number=${accountNumber}`, { cache: "no-store" });
        const data = await response.json();
        const teacher = (data.teachers?.[0] ?? null) as TeacherData | null;
        const teacherCircle = resolveCircleName(teacher?.halaqah, teacher?.circle_name);

        if (!teacherCircle) {
          setError("لا توجد حلقة مرتبطة بهذا المعلم");
          setTeacherCircle("");
          return;
        }

        setTeacherCircle(teacherCircle);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
        setError(`تعذر تحميل حلقة المعلم: ${message}`);
      } finally {
        setLoading(false);
      }
    }

    void fetchTeacherCircle();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf9]" dir="rtl">
        <Header />
        <main className="flex min-h-[calc(100vh-160px)] items-center justify-center px-4 py-10">
          <SiteLoader size="lg" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !teacherCircle) {
    return (
      <div className="min-h-screen bg-[#fafaf9]" dir="rtl">
        <Header />
        <main className="px-4 py-10">
          <div className="container mx-auto max-w-4xl space-y-8">
            <div className="rounded-[28px] border border-red-200 bg-white px-6 py-16 text-center text-lg font-bold text-red-700 shadow-sm">
              {error || "لا توجد حلقة مرتبطة بهذا المعلم"}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return <CircleWeeklyReports circleName={teacherCircle} />;
}
