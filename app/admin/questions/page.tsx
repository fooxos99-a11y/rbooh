"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SiteLoader } from "@/components/ui/site-loader"
import { Trash2, Edit, Plus, ChevronDown, ChevronUp } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"

type Question = {
  id: string
  category_id: string
  question: string
  answer: string
  points: number
}

type Category = {
  id: string
  name: string
  questions: Question[]
}

export default function QuestionsDatabase() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة الألعاب");

  const [categories, setCategories] = useState<Category[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  
  // نوافذ الحوار
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  // البيانات المؤقتة
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [deleteItem, setDeleteItem] = useState<{ type: "category" | "question", id: string } | null>(null)
  
  // حقول النماذج
  const [categoryName, setCategoryName] = useState("")
  const [questionText, setQuestionText] = useState("")
  const [answerText, setAnswerText] = useState("")
  const [pointsValue, setPointsValue] = useState(200)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      const data = await response.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching categories:", error)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  // إضافة أو تعديل فئة
  const handleCategorySubmit = async () => {
    if (!categoryName.trim()) return

    try {
      if (editingCategory) {
        // تعديل
        await fetch("/api/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingCategory.id,
            name: categoryName,
          }),
        })
      } else {
        // إضافة
        await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: categoryName }),
        })
      }
      
      await fetchCategories()
      setShowCategoryDialog(false)
      resetCategoryForm()
    } catch (error) {
      console.error("Error saving category:", error)
    }
  }

  // إضافة أو تعديل سؤال
  const handleQuestionSubmit = async () => {
    if (!questionText.trim() || !answerText.trim()) return

    try {
      if (editingQuestion) {
        // تعديل
        await fetch("/api/category-questions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingQuestion.id,
            question: questionText,
            answer: answerText,
            points: pointsValue,
          }),
        })
      } else {
        // إضافة
        await fetch("/api/category-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_id: selectedCategoryId,
            question: questionText,
            answer: answerText,
            points: pointsValue,
          }),
        })
      }
      
      await fetchCategories()
      setShowQuestionDialog(false)
      resetQuestionForm()
    } catch (error) {
      console.error("Error saving question:", error)
    }
  }

  // حذف فئة أو سؤال
  const handleDelete = async () => {
    if (!deleteItem) return

    try {
      if (deleteItem.type === "category") {
        await fetch(`/api/categories?id=${deleteItem.id}`, {
          method: "DELETE",
        })
      } else {
        await fetch(`/api/category-questions?id=${deleteItem.id}`, {
          method: "DELETE",
        })
      }
      
      await fetchCategories()
      setShowDeleteDialog(false)
      setDeleteItem(null)
    } catch (error) {
      console.error("Error deleting:", error)
    }
  }

  const resetCategoryForm = () => {
    setCategoryName("")
    setEditingCategory(null)
  }

  const resetQuestionForm = () => {
    setQuestionText("")
    setAnswerText("")
    setPointsValue(200)
    setEditingQuestion(null)
    setSelectedCategoryId("")
  }

  const openAddCategoryDialog = () => {
    resetCategoryForm()
    setShowCategoryDialog(true)
  }

  const openEditCategoryDialog = (category: Category) => {
    setEditingCategory(category)
    setCategoryName(category.name)
    setShowCategoryDialog(true)
  }

  const openAddQuestionDialog = (categoryId: string) => {
    resetQuestionForm()
    setSelectedCategoryId(categoryId)
    setShowQuestionDialog(true)
  }

  const openEditQuestionDialog = (question: Question) => {
    setEditingQuestion(question)
    setQuestionText(question.question)
    setAnswerText(question.answer)
    setPointsValue(question.points)
    setSelectedCategoryId(question.category_id)
    setShowQuestionDialog(true)
  }

  const openDeleteDialog = (type: "category" | "question", id: string) => {
    setDeleteItem({ type, id })
    setShowDeleteDialog(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] via-[#f5ead8] to-[#faf8f5] p-8">
        <div className="max-w-6xl mx-auto flex justify-center py-12">
          <SiteLoader />
        </div>
      </div>
    )
  }

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>);

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-[#fafaf9]">
      <Header />

      <div className="flex-1 bg-gradient-to-br from-[#faf8f5] via-[#f5ead8] to-[#faf8f5] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 border-2 border-[#d8a355]/20">
          {/* العنوان */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-8">
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-[#d8a355] to-[#c89547] bg-clip-text text-transparent">
              قاعدة الأسئلة
            </h1>
            <Button
              onClick={openAddCategoryDialog}
              className="bg-gradient-to-r from-[#d8a355] to-[#c89547] hover:from-[#c89547] hover:to-[#b88437] text-white"
            >
              <Plus className="ml-2" size={20} />
              إضافة فئة جديدة
            </Button>
          </div>

          {/* قائمة الفئات */}
          <div className="space-y-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="border-2 border-[#d8a355]/30 rounded-lg overflow-hidden"
              >
                {/* رأس الفئة */}
                <div className="bg-gradient-to-r from-[#faf8f5] to-[#f5ead8] p-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="flex items-center gap-3 flex-1 text-right"
                    >
                      {expandedCategories.has(category.id) ? (
                        <ChevronUp className="text-[#d8a355]" size={24} />
                      ) : (
                        <ChevronDown className="text-[#d8a355]" size={24} />
                      )}
                      <h3 className="text-2xl font-bold text-[#1a2332]">
                        {category.name}
                      </h3>
                      <span className="text-sm text-[#1a2332]/60">
                        ({category.questions?.length || 0} سؤال)
                      </span>
                    </button>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => openAddQuestionDialog(category.id)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus size={16} className="ml-1" />
                        سؤال
                      </Button>
                      <Button
                        onClick={() => openEditCategoryDialog(category)}
                        size="sm"
                        variant="outline"
                        className="border-[#d8a355] text-[#d8a355] hover:bg-[#d8a355]/10"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        onClick={() => openDeleteDialog("category", category.id)}
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* قائمة الأسئلة */}
                {expandedCategories.has(category.id) && (
                  <div className="p-4 bg-white space-y-3">
                    {category.questions && category.questions.length > 0 ? (
                      category.questions.map((question) => (
                        <div
                          key={question.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-[#d8a355]/50 transition-all"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="bg-gradient-to-r from-[#d8a355] to-[#c89547] text-white px-3 py-1 rounded-full text-sm font-bold">
                                  {question.points} نقطة
                                </span>
                              </div>
                              <p className="text-lg font-semibold text-[#1a2332] mb-2">
                                {question.question}
                              </p>
                              <p className="text-base text-[#1a2332]/70">
                                <span className="font-bold text-green-600">الإجابة:</span>{" "}
                                {question.answer}
                              </p>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                onClick={() => openEditQuestionDialog(question)}
                                size="sm"
                                variant="outline"
                                className="border-[#d8a355] text-[#d8a355] hover:bg-[#d8a355]/10"
                              >
                                <Edit size={16} />
                              </Button>
                              <Button
                                onClick={() => openDeleteDialog("question", question.id)}
                                size="sm"
                                variant="outline"
                                className="border-red-500 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-[#1a2332]/60 py-4">
                        لا توجد أسئلة في هذه الفئة
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* نافذة إضافة/تعديل فئة */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#1a2332]">
              {editingCategory ? "تعديل الفئة" : "إضافة فئة جديدة"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="categoryName" className="text-lg font-semibold text-[#1a2332]">
                اسم الفئة
              </Label>
              <Input
                id="categoryName"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="مثال: القرآن الكريم"
                className="mt-2 text-lg border-2 border-[#d8a355]/30 focus:border-[#d8a355]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              onClick={() => setShowCategoryDialog(false)}
              variant="outline"
              className="border-2 border-gray-300"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleCategorySubmit}
              className="bg-gradient-to-r from-[#d8a355] to-[#c89547] hover:from-[#c89547] hover:to-[#b88437] text-white"
            >
              {editingCategory ? "حفظ التعديلات" : "إضافة الفئة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة إضافة/تعديل سؤال */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#1a2332]">
              {editingQuestion ? "تعديل السؤال" : "إضافة سؤال جديد"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="question" className="text-lg font-semibold text-[#1a2332]">
                السؤال
              </Label>
              <Input
                id="question"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="أدخل نص السؤال"
                className="mt-2 text-lg border-2 border-[#d8a355]/30 focus:border-[#d8a355]"
              />
            </div>

            <div>
              <Label htmlFor="answer" className="text-lg font-semibold text-[#1a2332]">
                الإجابة
              </Label>
              <Input
                id="answer"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="أدخل الإجابة الصحيحة"
                className="mt-2 text-lg border-2 border-[#d8a355]/30 focus:border-[#d8a355]"
              />
            </div>

            <div>
              <Label htmlFor="points" className="text-lg font-semibold text-[#1a2332]">
                النقاط
              </Label>
              <select
                id="points"
                value={pointsValue}
                onChange={(e) => setPointsValue(Number(e.target.value))}
                className="mt-2 w-full text-lg border-2 border-[#d8a355]/30 focus:border-[#d8a355] rounded-md p-2"
              >
                <option value={200}>200 نقطة</option>
                <option value={400}>400 نقطة</option>
                <option value={600}>600 نقطة</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              onClick={() => setShowQuestionDialog(false)}
              variant="outline"
              className="border-2 border-gray-300"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleQuestionSubmit}
              className="bg-gradient-to-r from-[#d8a355] to-[#c89547] hover:from-[#c89547] hover:to-[#b88437] text-white"
            >
              {editingQuestion ? "حفظ التعديلات" : "إضافة السؤال"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد الحذف */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-red-600">
              تأكيد الحذف
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-lg text-[#1a2332]">
              {deleteItem?.type === "category"
                ? "هل أنت متأكد من حذف هذه الفئة؟ سيتم حذف جميع الأسئلة المرتبطة بها."
                : "هل أنت متأكد من حذف هذا السؤال؟"}
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              onClick={() => setShowDeleteDialog(false)}
              variant="outline"
              className="border-2 border-gray-300"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>

      <Footer />
    </div>
  )
}
