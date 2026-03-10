"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SiteLoader } from "@/components/ui/site-loader"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"

type Category = {
  id: string
  name: string
}

type Question = {
  id: string
  category_id: string
  category: {
    id: string
    name: string
  }
  question: string
  answer: string
}

export default function AuctionQuestionsAdmin() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة الألعاب");

  const [questions, setQuestions] = useState<Question[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [newQuestion, setNewQuestion] = useState({ category_id: "", question: "", answer: "" })
  const [newCategoryName, setNewCategoryName] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchQuestions()
    fetchCategories()
  }, [])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/auction-questions")
      const data = await response.json()
      setQuestions(data)
    } catch (error) {
      console.error("Error fetching questions:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/auction-categories")
      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const handleAddQuestion = async () => {
    if (!newQuestion.category_id || !newQuestion.question.trim() || !newQuestion.answer.trim()) return

    try {
      const response = await fetch("/api/auction-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuestion),
      })

      if (response.ok) {
        setNewQuestion({ category_id: "", question: "", answer: "" })
        setIsAddDialogOpen(false)
        fetchQuestions()
      }
    } catch (error) {
      console.error("Error adding question:", error)
    }
  }

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return

    try {
      const response = await fetch("/api/auction-questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingQuestion),
      })

      if (response.ok) {
        setEditingQuestion(null)
        setIsEditDialogOpen(false)
        fetchQuestions()
      }
    } catch (error) {
      console.error("Error updating question:", error)
    }
  }

  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null)
  const [showDeleteQuestionDialog, setShowDeleteQuestionDialog] = useState(false)

  const handleDeleteQuestion = (id: string) => {
    setDeleteQuestionId(id)
    setShowDeleteQuestionDialog(true)
  }

  const confirmDeleteQuestion = async () => {
    if (!deleteQuestionId) return
    try {
      const response = await fetch(`/api/auction-questions?id=${deleteQuestionId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchQuestions()
      }
    } catch (error) {
      console.error("Error deleting question:", error)
    } finally {
      setShowDeleteQuestionDialog(false)
      setDeleteQuestionId(null)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      const response = await fetch("/api/auction-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName }),
      })

      if (response.ok) {
        setNewCategoryName("")
        setIsAddCategoryDialogOpen(false)
        fetchCategories()
      }
    } catch (error) {
      console.error("Error adding category:", error)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!id) return
    if (!confirm("هل أنت متأكد من حذف هذه الفئة؟ سيتم حذف جميع الأسئلة المرتبطة بها.")) return
    try {
      const response = await fetch(`/api/auction-categories?id=${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchCategories()
        fetchQuestions()
      }
    } catch (error) {
      console.error("Error deleting category:", error)
    }
  }

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>);

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-[#fafaf9]">
      <Header />

      {/* نافذة تأكيد حذف السؤال */}
      {showDeleteQuestionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-gradient-to-br from-[#faf8f5] via-[#f5ead8] to-[#faf8f5] border-2 border-[#d8a355]/40 rounded-xl shadow-xl p-8 min-w-[320px] max-w-[90vw]">
            <h2 className="text-xl font-bold text-[#d8a355] mb-2">تأكيد حذف السؤال</h2>
            <p className="text-base text-[#1a2332] mb-6">هل أنت متأكد من حذف هذا السؤال؟</p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => { setShowDeleteQuestionDialog(false); setDeleteQuestionId(null); }}
                className="px-5 py-2 rounded-lg border-2 border-[#d8a355]/40 text-[#1a2332] font-bold bg-white hover:bg-[#f5ead8] transition"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDeleteQuestion}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#d8a355] to-[#c89547] text-white font-bold shadow hover:from-[#c89547] hover:to-[#d8a355] transition"
              >
                حسناً
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ...باقي الصفحة... */}
    <div className="flex-1 bg-gradient-to-br from-[#faf8f5] via-[#f5ead8] to-[#faf8f5] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#d8a355] to-[#c89547] bg-clip-text text-transparent">
            قاعدة أسئلة المزاد
          </h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsAddCategoryDialogOpen(true)}
              className="bg-gradient-to-r from-[#c89547] to-[#b88437] hover:from-[#b88437] hover:to-[#a87327] text-white"
            >
              <Plus className="mr-2" />
              إضافة فئة
            </Button>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-gradient-to-r from-[#d8a355] to-[#c89547] hover:from-[#c89547] hover:to-[#d8a355] text-white"
            >
              <Plus className="mr-2" />
              إضافة سؤال
            </Button>
          </div>
        </div>

        {/* ...تم حذف قسم الفئات المتاحة... */}

        {/* ...تم حذف نافذة التأكيد المخصصة... */}

        {/* تصفية الأسئلة حسب الفئة وزر حذف الفئة المختارة */}
        <div className="mb-6 flex items-center gap-4">
          <Label>تصفية حسب الفئة:</Label>
          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="اختر الفئة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* زر حذف الفئة المختارة */}
          {selectedCategoryId !== "all" && (
            <Button
              variant="destructive"
              className="ml-2"
              onClick={() => handleDeleteCategory(selectedCategoryId)}
            >
              حذف فئة (
              {categories.find((cat) => cat.id === selectedCategoryId)?.name || ""}
              )
            </Button>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><SiteLoader /></div>
        ) : (
          <div className="space-y-4">
            {questions
              .filter((question) =>
                selectedCategoryId === "all" ? true : question.category_id === selectedCategoryId
              )
              .map((question) => (
                <div
                  key={question.id}
                  className="bg-white rounded-xl shadow-md p-6 border-2 border-[#d8a355]/20 hover:border-[#d8a355] transition-all"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#d8a355] mb-1">
                        {question.category.name}
                      </p>
                      <p className="text-lg font-semibold text-[#1a2332] mb-2">
                        السؤال: {question.question}
                      </p>
                      <p className="text-base text-[#1a2332]/70">
                        الإجابة: {question.answer}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setEditingQuestion(question)
                          setIsEditDialogOpen(true)
                        }}
                        size="icon"
                        variant="outline"
                        className="border-[#d8a355] text-[#d8a355] hover:bg-[#d8a355] hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteQuestion(question.id)}
                        size="icon"
                        variant="destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

            {questions.filter((question) => selectedCategoryId === "all" ? true : question.category_id === selectedCategoryId).length === 0 && !loading && (
              <div className="text-center text-xl text-[#1a2332]/50 py-12">
                لا توجد أسئلة لهذه الفئة.
              </div>
            )}
          </div>
        )}
      </div>
    </div>

      {/* مودال إضافة سؤال */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">إضافة سؤال جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الفئة</Label>
              <Select
                value={newQuestion.category_id}
                onValueChange={(value) =>
                  setNewQuestion({ ...newQuestion, category_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>السؤال</Label>
              <Input
                value={newQuestion.question}
                onChange={(e) =>
                  setNewQuestion({ ...newQuestion, question: e.target.value })
                }
                placeholder="اكتب السؤال هنا"
              />
            </div>
            <div>
              <Label>الإجابة</Label>
              <Input
                value={newQuestion.answer}
                onChange={(e) =>
                  setNewQuestion({ ...newQuestion, answer: e.target.value })
                }
                placeholder="اكتب الإجابة هنا"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleAddQuestion}
                className="bg-gradient-to-r from-[#d8a355] to-[#c89547]"
                disabled={!newQuestion.category_id || !newQuestion.question.trim() || !newQuestion.answer.trim()}
              >
                إضافة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* مودال تعديل سؤال */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">تعديل السؤال</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <div className="space-y-4">
              <div>
                <Label>الفئة</Label>
                <Select
                  value={editingQuestion.category_id}
                  onValueChange={(value) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      category_id: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>السؤال</Label>
                <Input
                  value={editingQuestion.question}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      question: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>الإجابة</Label>
                <Input
                  value={editingQuestion.answer}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      answer: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button
                  onClick={handleUpdateQuestion}
                  className="bg-gradient-to-r from-[#d8a355] to-[#c89547]"
                >
                  حفظ
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* مودال إضافة فئة */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl">إضافة فئة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم الفئة</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="مثال: التاريخ الإسلامي"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsAddCategoryDialogOpen(false)}>
                إلغاء
              </Button>
              <Button
                onClick={handleAddCategory}
                className="bg-gradient-to-r from-[#d8a355] to-[#c89547]"
                disabled={!newCategoryName.trim()}
              >
                إضافة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  )
}
