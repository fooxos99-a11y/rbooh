"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAdminAuth } from "@/hooks/use-admin-auth"

import {
  Lock,
  Unlock,
  Plus,
  Trash2,
  FileText,
  Pencil,
  Video,
  LinkIcon,
  Upload,
  BookOpen,
  ArrowRight,
} from "lucide-react"

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

interface Level {
  id: number
  level_number: number
  title: string
  description: string | null
  points: number
  is_locked: boolean
  half_points_applied: boolean
}

interface LevelContent {
  id: string
  content_title: string
  content_description?: string
  content_url: string
  content_type: "pdf" | "video" | "link"
}

interface Quiz {
  id: number
  question: string
  options: string[]
  correctAnswer: number
}

/* -------------------------------------------------------------------------- */

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminPathwaysPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة المسار");

    // نافذة تعديل النقاط
    const [showPointsModal, setShowPointsModal] = useState(false);
    const [pointsEditValue, setPointsEditValue] = useState<number>(0);
    const [pointsEditLevel, setPointsEditLevel] = useState<Level | null>(null);
  const router = useRouter()

  const [levels, setLevels] = useState<Level[]>([])
  const [selectedLevel, setSelectedLevel] = useState<number>(1)
  const [selectedHalaqah, setSelectedHalaqah] = useState<string>("")
  const [circles, setCircles] = useState<{ id: string; name: string }[]>([]);

  const [contents, setContents] = useState<Record<number, LevelContent[]>>({})
  const [quizzes, setQuizzes] = useState<Record<number, Quiz[]>>({})

  const [showContentForm, setShowContentForm] = useState(false)
  const [showQuizForm, setShowQuizForm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const [notification, setNotification] = useState<string>("")
  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(""), 3000)
  }

  /* ------------------------------ Content Form ----------------------------- */
  const [contentTitle, setContentTitle] = useState("")
  const [contentDescription, setContentDescription] = useState("")
  const [contentUrl, setContentUrl] = useState("")
  const [contentType, setContentType] =
    useState<LevelContent["content_type"]>("link")
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  /* ------------------------------- Quiz Form -------------------------------- */
  const [quizQuestion, setQuizQuestion] = useState("")
  const [quizOptions, setQuizOptions] = useState(["", "", "", ""])
  const [correctAnswer, setCorrectAnswer] = useState(0)

  /* ------------------------------ Edit Level Modal ----------------------------- */
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [levelResults, setLevelResults] = useState<any[]>([])
  const [isLoadingResults, setIsLoadingResults] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")

  /* -------------------------------------------------------------------------- */
  /*                                   EFFECTS                                  */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const role = localStorage.getItem("userRole")

    if (!loggedIn || !role || role === "student" || role === "teacher" || role === "deputy_teacher") {
      router.push("/login")
      return
    }

    loadLevels()
    fetchCircles()
  }, [])

  useEffect(() => {
    if (selectedHalaqah) {
      loadLevels()
      setSelectedLevel(1)
    }
  }, [selectedHalaqah])

  useEffect(() => {
    if (selectedLevel && selectedHalaqah) {
      loadContents()
      loadQuizzes()
    }
  }, [selectedLevel, selectedHalaqah])

  /* -------------------------------------------------------------------------- */
  /*                                   LOADERS                                  */
  /* -------------------------------------------------------------------------- */

  async function fetchCircles() {
    try {
      const res = await fetch('/api/circles');
      const data = await res.json();
      if (data.circles) {
        setCircles(data.circles);
        if (data.circles.length > 0) {
          setSelectedHalaqah(data.circles[0].name);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadLevels() {
    if (!selectedHalaqah) return;
    const { data, error } = await supabase
      .from("pathway_levels").select("*").eq("halaqah", selectedHalaqah).order("level_number")

    if (!error && data) setLevels(data as Level[])
  }

  async function loadContents() {
    const res = await fetch(`/api/pathway-contents?level_id=${selectedLevel}&halaqah=${encodeURIComponent(selectedHalaqah)}`)
    const json = await res.json()
    setContents((p) => ({ ...p, [selectedLevel]: json.contents || [] }))
  }

  async function loadLevelResults() {
    if (!selectedLevel || !selectedHalaqah) return;
    setIsLoadingResults(true);
    const { data, error } = await supabase
      .from("pathway_level_completions")
      .select("id, student_id, points, level_number, students!inner(name, halaqah)")
      .eq("level_number", selectedLevel)
      .eq("students.halaqah", selectedHalaqah);
    
    if (!error && data) {
      setLevelResults(data.map((r: any) => ({
        id: r.id,
        student_id: r.student_id,
        points: r.points,
        student_name: r.students?.name || "-",
      })));
    } else {
      setLevelResults([]);
    }
    setIsLoadingResults(false);
  }

  async function loadQuizzes() {
    const { data } = await supabase
      .from("pathway_level_questions").select("*").eq("level_number", selectedLevel).eq("halaqah", selectedHalaqah)
      .order("id")

    if (data) {
      setQuizzes((p) => ({
        ...p,
        [selectedLevel]: data.map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correct_answer,
        })),
      }))
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                  HANDLERS                                  */
  /* -------------------------------------------------------------------------- */

  async function handleAddContent() {
    if (!contentTitle) return

    let finalUrl = contentUrl

    if (uploadMode === "file" && selectedFile) {
      setIsUploading(true)
      const ext = selectedFile.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data, error } = await supabase.storage
        .from("Contact")
        .upload(fileName, selectedFile, { upsert: false })

      if (error) {
        showNotification("فشل رفع الملف: " + error.message)
        setIsUploading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from("Contact")
        .getPublicUrl(fileName)
      finalUrl = urlData.publicUrl
      setIsUploading(false)
    }

    if (!finalUrl) return

    await fetch("/api/pathway-contents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level_id: selectedLevel,
        halaqah: selectedHalaqah,
        content_title: contentTitle,
        content_description: contentDescription,
        content_url: finalUrl,
        content_type: contentType,
      }),
    })

    setShowContentForm(false)
    setContentTitle("")
    setContentDescription("")
    setContentUrl("")
    setSelectedFile(null)
    setUploadMode("url")
    loadContents()
  }

  async function handleDeleteContent(id: string) {
    await fetch(`/api/pathway-contents?id=${id}`, { method: "DELETE" })
    loadContents()
  }

  async function handleAddQuiz() {
    if (!quizQuestion || quizOptions.some((o) => !o)) return

    await supabase.from("pathway_level_questions").insert({
      level_number: selectedLevel, halaqah: selectedHalaqah, question: quizQuestion,
      options: quizOptions,
      correct_answer: correctAnswer,
    })

    setQuizQuestion("")
    setQuizOptions(["", "", "", ""])
    setCorrectAnswer(0)
    setShowQuizForm(false)
    loadQuizzes()
  }

  async function handleDeleteQuiz(id: number) {
    await supabase.from("pathway_level_questions").delete().eq("id", id)
    loadQuizzes()
  }

  async function handleAddLevel() {
    // احسب رقم المستوى الجديد
    const nextNumber = (levels[levels.length - 1]?.level_number || 0) + 1;
    const { data, error } = await supabase.from('pathway_levels').insert({
      level_number: nextNumber, halaqah: selectedHalaqah, title: `المستوى ${nextNumber}`,
      description: '',
      points: 100,
      is_locked: false,
      half_points_applied: false
    });
    if (!error) {
      showNotification('تمت إضافة مستوى جديد بنجاح');
      loadLevels();
    } else {
      showNotification('حدث خطأ أثناء إضافة المستوى');
    }
  }

  async function handleDeleteLevel() {
    if (levels.length === 0) {
      showNotification('لا يوجد مستويات للحذف');
      return;
    }
    // احصل على رقم آخر مستوى
    const maxLevel = Math.max(...levels.map(l => l.level_number));
    // حذف بدون تأكيد
    const { error } = await supabase.from('pathway_levels').delete().eq('level_number', maxLevel).eq("halaqah", selectedHalaqah);
    if (!error) {
      showNotification('تم حذف آخر مستوى بنجاح');
      // جلب المستويات من القاعدة مباشرة بعد الحذف
      const { data: newLevels, error: fetchError } = await supabase
        .from('pathway_levels')
        .select('*')
        .eq('halaqah', selectedHalaqah)
        .order('level_number');
      if (!fetchError && newLevels) {
        setLevels(newLevels);
        if (newLevels.length > 0) {
          const prevMax = Math.max(...newLevels.map(l => l.level_number));
          setSelectedLevel(prevMax);
        } else {
          setSelectedLevel(1);
        }
      } else {
        showNotification('تم الحذف لكن لم يتم تحديث القائمة!');
      }
    } else {
      showNotification('حدث خطأ أثناء حذف المستوى: ' + error.message);
    }
  }

  async function handleToggleLockLevel() {
    if (!level) return;
    const { error } = await supabase.from('pathway_levels').update({ is_locked: !level.is_locked }).eq('level_number', selectedLevel).eq("halaqah", selectedHalaqah);
    if (!error) {
      showNotification(level.is_locked ? 'تم فتح المستوى بنجاح' : 'تم قفل المستوى بنجاح');
      loadLevels();
    } else {
      showNotification('حدث خطأ أثناء تحديث حالة القفل');
    }
  }

  /* -------------------------------------------------------------------------- */

  const level = levels.find((l) => l.level_number === selectedLevel)
  const levelContents = contents[selectedLevel] || []
  const levelQuizzes = quizzes[selectedLevel] || []

  const icon = (t: string) =>
    t === "pdf" ? <FileText /> : t === "video" ? <Video /> : <LinkIcon />

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><div className="w-8 h-8 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" /></div>);

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-[#fafaf9]">
      <Header />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 inset-x-0 mx-auto max-w-sm z-50 px-4">
          <div className="bg-white border border-[#D4AF37]/40 rounded-xl px-5 py-3 shadow-lg text-sm font-medium text-[#1a2332] text-center">
            {notification}
          </div>
        </div>
      )}

      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-4xl space-y-8">

          {/* Page Header */}
              <div className="mb-6 flex flex-col md:flex-row items-center gap-4">
                <span className="font-bold text-[#1a2332]">اختر الحلقة:</span>
                <Select value={selectedHalaqah} onValueChange={(val) => { setSelectedHalaqah(val); setSelectedLevel(1); }}>
                  <SelectTrigger className="w-[250px] border-[#D4AF37]/40 bg-white">
                    <SelectValue placeholder="اختر الحلقة" />
                  </SelectTrigger>
                  <SelectContent>
                    {circles.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          <div className="flex items-center justify-between border-b border-[#D4AF37]/40 pb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="w-9 h-9 rounded-lg border border-[#D4AF37]/40 flex items-center justify-center text-[#C9A961] hover:bg-[#D4AF37]/10 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <h1 className="text-2xl font-bold text-[#1a2332]">إدارة المسار</h1>
            </div>
            <button
              onClick={() => { loadLevelResults(); setShowResultsModal(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#C9A961] hover:text-[#D4AF37] text-sm font-semibold transition-colors"
            >
              نتائج المسار
            </button>
          </div>

          {/* Levels Card */}
          <div className="bg-white rounded-2xl border border-[#D4AF37]/40 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-[#D4AF37]/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <h2 className="text-base font-bold text-[#1a2332]">المستويات</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddLevel}
                  title="إضافة مستوى"
                  className="w-8 h-8 rounded-lg border border-emerald-200 text-emerald-500 hover:bg-emerald-50 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteLevel}
                  title="حذف آخر مستوى"
                  className="w-8 h-8 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleToggleLockLevel}
                  title={level?.is_locked ? "فتح المستوى" : "قفل المستوى"}
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${level?.is_locked ? "border-red-200 text-red-400 hover:bg-red-50" : "border-emerald-200 text-emerald-500 hover:bg-emerald-50"}`}
                >
                  {level?.is_locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => { setEditTitle(level?.title || ""); setEditDescription(level?.description || ""); setShowEditModal(true) }}
                  title="تعديل المستوى"
                  className="w-8 h-8 rounded-lg border border-[#D4AF37]/50 text-[#C9A961] hover:bg-[#D4AF37]/10 flex items-center justify-center transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4 flex flex-wrap gap-2">
              {levels.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedLevel(l.level_number)}
                  onDoubleClick={() => { setPointsEditLevel(l); setPointsEditValue(l.points); setShowPointsModal(true) }}
                  title="انقر مرتين لتعديل النقاط"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    l.level_number === selectedLevel
                      ? "border-[#D4AF37] bg-[#D4AF37]/15 text-[#C9A961] font-bold"
                      : "border-[#D4AF37]/30 text-neutral-600 hover:bg-[#D4AF37]/5 hover:border-[#D4AF37]/50"
                  }`}
                >
                  {l.is_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  {l.title}
                </button>
              ))}
            </div>
          </div>

          {/* Content Card */}
          <div className="bg-white rounded-2xl border border-[#D4AF37]/40 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-[#D4AF37]/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1a2332]">محتوى المستوى</h2>
                  <p className="text-xs text-neutral-400">ملفات وروابط تعليمية</p>
                </div>
              </div>
              <button
                onClick={() => setShowContentForm(!showContentForm)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#C9A961] hover:text-[#D4AF37] text-sm font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> إضافة محتوى
              </button>
            </div>

            <div className="px-6 py-4 space-y-3">
              {showContentForm && (
                <div className="space-y-3 p-4 bg-[#fafaf9] rounded-xl border border-[#D4AF37]/20 mb-4">
                  <Input placeholder="عنوان المحتوى" value={contentTitle} onChange={(e) => setContentTitle(e.target.value)} />
                  <Textarea placeholder="الوصف (اختياري)" value={contentDescription} onChange={(e) => setContentDescription(e.target.value)} />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setUploadMode("url")}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${uploadMode === "url" ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#C9A961]" : "border-neutral-200 text-neutral-500 hover:border-[#D4AF37]/50"}`}
                    >
                      <LinkIcon className="inline w-3.5 h-3.5 ml-1" /> رابط
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode("file")}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${uploadMode === "file" ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#C9A961]" : "border-neutral-200 text-neutral-500 hover:border-[#D4AF37]/50"}`}
                    >
                      <Upload className="inline w-3.5 h-3.5 ml-1" /> رفع ملف
                    </button>
                  </div>
                  {uploadMode === "url" ? (
                    <Input placeholder="الرابط" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} />
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[#D4AF37]/40 rounded-lg cursor-pointer hover:bg-[#D4AF37]/5 transition-colors">
                      <input type="file" className="hidden" accept=".pdf,.mp4,.mov,.avi,.doc,.docx,.ppt,.pptx" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                      {selectedFile ? (
                        <span className="text-sm text-[#C9A961] font-medium">{selectedFile.name}</span>
                      ) : (
                        <span className="text-sm text-neutral-400">اضغط لاختيار ملف</span>
                      )}
                    </label>
                  )}
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowContentForm(false)} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-500 text-sm hover:bg-neutral-50 transition-colors">إلغاء</button>
                    <button
                      onClick={handleAddContent}
                      disabled={isUploading}
                      className="px-4 py-2 rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#C9A961] hover:text-[#D4AF37] text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {isUploading ? "جاري الرفع..." : "حفظ"}
                    </button>
                  </div>
                </div>
              )}

              {levelContents.length === 0 && !showContentForm && (
                <p className="text-sm text-neutral-400 text-center py-6">لا يوجد محتوى لهذا المستوى</p>
              )}

              {levelContents.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#D4AF37]/20 hover:bg-[#D4AF37]/3 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                      {c.content_type === "pdf" ? <FileText className="w-4 h-4" /> : c.content_type === "video" ? <Video className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                    </div>
                    <span className="text-sm font-medium text-[#1a2332]">{c.content_title}</span>
                  </div>
                  <button onClick={() => handleDeleteContent(c.id)} className="w-7 h-7 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quiz Card */}
          <div className="bg-white rounded-2xl border border-[#D4AF37]/40 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-[#D4AF37]/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <h2 className="text-base font-bold text-[#1a2332]">الاختبار</h2>
              </div>
              <button
                onClick={() => setShowQuizForm(!showQuizForm)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#C9A961] hover:text-[#D4AF37] text-sm font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> إضافة سؤال
              </button>
            </div>

            <div className="px-6 py-4 space-y-3">
              {showQuizForm && (
                <div className="space-y-3 p-4 bg-[#fafaf9] rounded-xl border border-[#D4AF37]/20 mb-4">
                  <Input placeholder="السؤال" value={quizQuestion} onChange={(e) => setQuizQuestion(e.target.value)} />
                  {quizOptions.map((o, i) => (
                    <Input key={i} placeholder={`خيار ${i + 1}`} value={o} onChange={(e) => { const n = [...quizOptions]; n[i] = e.target.value; setQuizOptions(n) }} />
                  ))}
                  <Select value={String(correctAnswer)} onValueChange={(v) => setCorrectAnswer(Number(v))}>
                    <SelectTrigger className="border-[#D4AF37]/30">
                      <SelectValue placeholder="الإجابة الصحيحة" />
                    </SelectTrigger>
                    <SelectContent>
                      {quizOptions.map((_, i) => (
                        <SelectItem key={i} value={String(i)}>الخيار {i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowQuizForm(false)} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-500 text-sm hover:bg-neutral-50 transition-colors">إلغاء</button>
                    <button onClick={handleAddQuiz} className="px-4 py-2 rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#C9A961] hover:text-[#D4AF37] text-sm font-semibold transition-colors">حفظ السؤال</button>
                  </div>
                </div>
              )}

              {levelQuizzes.length === 0 && !showQuizForm && (
                <p className="text-sm text-neutral-400 text-center py-6">لا يوجد أسئلة لهذا المستوى</p>
              )}

              {levelQuizzes.map((q, i) => (
                <div key={q.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#D4AF37]/20 hover:bg-[#D4AF37]/3 transition-colors">
                  <span className="text-sm font-medium text-[#1a2332]">{i + 1}. {q.question}</span>
                  <button onClick={() => handleDeleteQuiz(q.id)} className="w-7 h-7 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      <Footer />

      {/* Edit Level Modal */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30" dir="rtl">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-[#D4AF37]/40 shadow-xl space-y-4">
            <h2 className="text-xl font-bold text-[#1a2332]">تعديل المستوى</h2>
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="اسم المستوى" />
            <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="وصف المستوى" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-500 text-sm hover:bg-neutral-50 transition-colors">إلغاء</button>
              <button onClick={async () => {
                if (level) {
                  await supabase.from("pathway_levels").update({ title: editTitle, description: editDescription }).eq("id", level.id)
                  setShowEditModal(false)
                  loadLevels()
                }
              }} className="px-4 py-2 rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#C9A961] hover:text-[#D4AF37] text-sm font-semibold transition-colors">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Points Edit Modal */}
      {showPointsModal && pointsEditLevel && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30" dir="rtl">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-[#D4AF37]/40 shadow-xl space-y-4">
            <h2 className="text-xl font-bold text-[#1a2332]">تعديل نقاط المستوى</h2>
            <p className="text-sm font-semibold text-[#C9A961]">{pointsEditLevel.title}</p>
            <Input type="number" min={0} value={pointsEditValue} onChange={(e) => setPointsEditValue(Number(e.target.value))} />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowPointsModal(false)} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-500 text-sm hover:bg-neutral-50 transition-colors">إلغاء</button>
              <button onClick={async () => {
                if (pointsEditLevel) {
                  await supabase.from("pathway_levels").update({ points: pointsEditValue }).eq("id", pointsEditLevel.id)
                  setShowPointsModal(false)
                  loadLevels()
                }
              }} className="px-4 py-2 rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#C9A961] hover:text-[#D4AF37] text-sm font-semibold transition-colors">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResultsModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30" dir="rtl">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg border border-[#D4AF37]/40 shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#1a2332]">
                {selectedHalaqah === "all" ? "جميع الحلقات" : `حلقة ${selectedHalaqah}`}
              </h2>
            </div>

            <div className="overflow-y-auto pr-2 space-y-3">
              {isLoadingResults ? (
                <div className="flex justify-center items-center py-10">
                  <div className="w-8 h-8 rounded-full border-4 border-[#D4AF37]/20 border-t-[#D4AF37] animate-spin" />
                </div>
              ) : levelResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-lg font-bold text-[#1a2332]">لا يوجد طلاب حاليا</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {levelResults.map((r, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-[#D4AF37]/20 hover:bg-[#D4AF37]/3 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center font-bold text-[#D4AF37] border border-[#D4AF37]/20">
                          {i + 1}
                        </div>
                        <span className="font-medium text-[#1a2332]">{r.student_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                        <span className="text-[#D4AF37] font-bold">{r.points}</span>
                        <span className="text-xs text-[#C9A961] font-semibold">نقطة</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-neutral-100">
              <button 
                onClick={() => setShowResultsModal(false)}
                className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-500 text-sm hover:bg-neutral-50 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}