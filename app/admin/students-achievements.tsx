"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Medal, Gem, Trash2, Plus, User, Trophy, Star, Flame, Zap, Crown, Heart } from "lucide-react";

interface Student {
  id: string;
  name: string;
  halaqah?: string;
  circle_name?: string;
}

interface Achievement {
  id: string;
  title: string;
  icon_type: string;
  date: string;
}

function StudentsAchievementsAdmin() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCircle, setSelectedCircle] = useState("all");
  const [icon, setIcon] = useState<string>("trophy");
  const [achievementName, setAchievementName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [achievementsMap, setAchievementsMap] = useState<Record<string, Achievement[]>>({});

  const normalizeCircleName = (value?: string | null) =>
    (value || "")
      .replace(/\s+/g, " ")
      .trim();

  useEffect(() => {
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => {
        setStudents(data.students || []);
        (data.students || []).forEach((student: Student) => {
          fetch(`/api/achievements?student_id=${student.id}`)
            .then((res) => res.json())
            .then((achData) => {
              setAchievementsMap((prev) => ({ ...prev, [student.id]: achData.achievements || [] }));
            });
        });
      });
  }, []);

  const circles = Array.from(
    new Set(
      students
        .map((student) => normalizeCircleName(student.halaqah || student.circle_name))
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, "ar"));

  const filteredStudents = selectedCircle === "all"
    ? students
    : students.filter(
        (student) => normalizeCircleName(student.halaqah || student.circle_name) === selectedCircle
      );

  const handleSave = async () => {
    if (!selectedStudent || !achievementName) return;
    setIsSaving(true);
    await fetch("/api/achievements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_name: selectedStudent.name,
        student_id: selectedStudent.id,
        icon_type: icon,
        title: achievementName,
        achievement_type: "student",
        date: new Date().toLocaleDateString("ar-EG"),
        description: "تم إضافة إنجاز جديد للطالب.",
        category: "عام",
        status: "مكتمل",
        level: "ممتاز",
      }),
    });
    const res = await fetch(`/api/achievements?student_id=${selectedStudent.id}`);
    const achData = await res.json();
    setAchievementsMap((prev) => ({ ...prev, [selectedStudent.id]: achData.achievements || [] }));
    setIsSaving(false);
    setSelectedStudent(null);
    setAchievementName("");
    setIcon("trophy");
  };

  const handleDelete = async (achievementId: string, studentId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الإنجاز؟")) return;
    await fetch(`/api/achievements?id=${achievementId}`, { method: "DELETE" });
    const res = await fetch(`/api/achievements?student_id=${studentId}`);
    const achData = await res.json();
    setAchievementsMap((prev) => ({ ...prev, [studentId]: achData.achievements || [] }));
  };

  const renderIcon = (type: string, cls = "w-4 h-4") => {
    const color = "text-[#003f55]";
    switch (type) {
      case "medal":  return <Medal  className={`${cls} ${color}`} />;
      case "gem":    return <Gem    className={`${cls} ${color}`} />;
      case "star":   return <Star   className={`${cls} ${color}`} />;
      case "flame":  return <Flame  className={`${cls} ${color}`} />;
      case "zap":    return <Zap    className={`${cls} ${color}`} />;
      case "crown":  return <Crown  className={`${cls} ${color}`} />;
      case "heart":  return <Heart  className={`${cls} ${color}`} />;
      default:       return <Award  className={`${cls} ${color}`} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]" dir="rtl">
      <Header />
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">

          {/* Page header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-[#003f55]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#1a2332]">
                  {selectedStudent ? `إضافة إنجاز — ${selectedStudent.name}` : "إنجازات الطلاب"}
                </h1>
                <p className="text-sm text-neutral-400 mt-0.5">
                  {selectedStudent ? "اختر رمزاً وأدخل عنوان الإنجاز" : "تحكم في أوسمة وإنجازات الطلاب"}
                </p>
              </div>
            </div>
          </div>

          {!selectedStudent ? (
            /* ── قائمة الطلاب ── */
            <div className="bg-white rounded-2xl border border-[#3453a7]/20 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[#3453a7]/20 flex flex-col items-start gap-4">
                <div className="flex items-center gap-3 shrink-0">
                  <h2 className="text-base font-bold text-[#1a2332]">قائمة الطلاب</h2>
                </div>
                <div className="w-full max-w-[320px] shrink-0">
                  <Select value={selectedCircle} onValueChange={setSelectedCircle} dir="rtl">
                    <SelectTrigger className="text-sm bg-white">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">كل الحلقات</SelectItem>
                      {circles.map((circle) => (
                        <SelectItem key={circle} value={circle}>
                          {circle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="divide-y divide-[#3453a7]/10">
                {filteredStudents.length === 0 ? (
                  <div className="py-16 text-center text-neutral-400 text-sm">لا يوجد طلاب</div>
                ) : filteredStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#3453a7]/5 transition-colors gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-[#003f55]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1a2332]">{student.name}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{normalizeCircleName(student.halaqah || student.circle_name) || "غير محدد"}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(achievementsMap[student.id]?.length > 0) ? (
                            achievementsMap[student.id].map((ach) => (
                              <div key={ach.id} className="group/item flex items-center gap-1 bg-[#3453a7]/7 border border-[#3453a7]/18 px-2.5 py-0.5 rounded-full">
                                {renderIcon(ach.icon_type)}
                                <span className="text-xs text-neutral-700">{ach.title}</span>
                                <button
                                  onClick={() => handleDelete(ach.id, student.id)}
                                  className="mr-0.5 opacity-0 group-hover/item:opacity-100 text-red-400 hover:text-red-600 transition-all"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-neutral-400 italic">لا توجد إنجازات</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedStudent(student)}
                      className="flex items-center gap-1.5 text-sm h-9 px-4 rounded-lg bg-[#3453a7] hover:bg-[#27428d] text-white transition-all font-medium shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── نافذة إضافة إنجاز ── */
            <div className="bg-white rounded-2xl border border-[#3453a7]/20 shadow-sm overflow-hidden max-w-lg mx-auto">
              <div className="px-6 py-5 border-b border-[#3453a7]/20">
                <h2 className="text-base font-bold text-[#1a2332]">إنجاز جديد</h2>
                <p className="text-sm text-neutral-400 mt-0.5">للطالب: <span className="text-[#3453a7] font-semibold">{selectedStudent.name}</span></p>
              </div>
              <div className="p-6 space-y-6">
                {/* اختيار الرمز */}
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-3">اختر الرمز</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { type: "trophy", label: "كأس",     Icon: Trophy },
                      { type: "medal",  label: "ميدالية", Icon: Medal  },
                      { type: "gem",    label: "جوهرة",   Icon: Gem    },
                      { type: "star",   label: "نجمة",    Icon: Star   },
                      { type: "flame",  label: "شعلة",    Icon: Flame  },
                      { type: "zap",    label: "برق",     Icon: Zap    },
                      { type: "crown",  label: "تاج",     Icon: Crown  },
                      { type: "heart",  label: "قلب",     Icon: Heart  },
                    ].map(({ type, label, Icon }) => (
                      <button
                        key={type}
                        onClick={() => setIcon(type)}
                        className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all font-medium text-sm
                          ${icon === type
                            ? "border-[#003f55] bg-[#003f55]/8 text-[#003f55]"
                            : "border-neutral-100 bg-neutral-50 text-neutral-400 hover:border-[#003f55]/30 hover:text-[#003f55]"
                          }`}
                      >
                        <Icon className="w-6 h-6" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* حقل الإدخال */}
                <div>
                  <p className="text-sm font-medium text-neutral-600 mb-2">عنوان الإنجاز</p>
                  <input
                    className="w-full border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#3453a7] focus:ring-2 focus:ring-[#3453a7]/20 transition-all text-[#1a2332] bg-[#fafaf9]"
                    placeholder="مثال: حفظ جزء عم"
                    value={achievementName}
                    onChange={(e) => setAchievementName(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* الأزرار */}
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedStudent(null)}
                    className="text-sm h-9 rounded-lg border-[#003f55]/20 text-neutral-600"
                  >
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !achievementName}
                    className="bg-[#3453a7] hover:bg-[#27428d] text-white text-sm h-9 rounded-lg font-medium"
                  >
                    {isSaving ? "جاري الحفظ..." : "حفظ الإنجاز"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default StudentsAchievementsAdmin;
