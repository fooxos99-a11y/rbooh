"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SiteLoader } from "@/components/ui/site-loader"
import { Plus, Pencil, Trash2, Upload, ImageIcon, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAdminAuth } from "@/hooks/use-admin-auth"

type GuessImage = {
  id: string;
  image_url: string;
  answer: string;
  hint: string | null;
  active: boolean;
  stage_id?: number;
}

type Stage = {
  id: number
  name: string
}

export default function GuessImagesManagement() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة الألعاب");

  const router = useRouter();
  const [images, setImages] = useState<GuessImage[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingImage, setEditingImage] = useState<GuessImage | null>(null)
  const [formData, setFormData] = useState({
    image_url: "",
    answer: ""
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  // مراحل خمن الصورة
  const [stages, setStages] = useState<Stage[]>([])
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null)
  const [showAddStage, setShowAddStage] = useState(false)
  const [newStage, setNewStage] = useState("")
  const [stageLoading, setStageLoading] = useState(false)


   // تعريف الدالة قبل الاستخدام
   const addStage = async (e: React.FormEvent) => {
     e.preventDefault()
     if (!newStage.trim()) return
     setStageLoading(true)
     const res = await fetch("/api/guess-image-stages", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ name: newStage })
     })
     if (res.ok) {
       setNewStage("")
       setShowAddStage(false)
       await fetchStages()
     }
     setStageLoading(false)
   }

   const deleteStage = async (id: number) => {
     if (!confirm("هل أنت متأكد من حذف المرحلة؟")) return
     setStageLoading(true)
     await fetch(`/api/guess-image-stages?id=${id}`, { method: "DELETE" })
     await fetchStages()
     setStageLoading(false)
   }

  const fetchStages = async () => {
    setStageLoading(true)
    try {
      const response = await fetch("/api/guess-image-stages")
      const data = await response.json()
      console.log('Stages:', data)
      setStages(Array.isArray(data) ? data : [])
      setSelectedStageId(null)
    } catch (error) {
      setStages([])
      setSelectedStageId(null)
    } finally {
      setStageLoading(false)
    }
  }

  useEffect(() => {
    fetchStages()
  }, [])

  useEffect(() => {
    // حتى لو لم يوجد مرحلة، جلب الصور بدون فلترة
    fetchImages(selectedStageId ?? undefined)
  }, [selectedStageId])

  const fetchImages = async (stageId?: number) => {
    setLoading(true)
    try {
      let url = "/api/guess-images"
      if (stageId) url += `?stage_id=${stageId}`
      const response = await fetch(url)
      const data = await response.json()
      console.log('Images:', data)
      setImages(Array.isArray(data) ? data : [])
    } catch (error) {
      setImages([])
    } finally {
      setLoading(false)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)
    
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formDataUpload
    })
    
    if (!response.ok) {
      throw new Error('فشل رفع الصورة')
    }
    
  const fetchStages = async () => {
    setStageLoading(true)
    try {
      const response = await fetch("/api/guess-image-stages")
      const data = await response.json()
      setStages(Array.isArray(data) ? data : [])
      if (Array.isArray(data) && data.length > 0) {
        setSelectedStageId(data[0].id)
      }
    } catch (error) {
      setStages([])
    } finally {
      setStageLoading(false)
    }
  }

  // إضافة مرحلة جديدة
  const addStage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStage.trim()) return
    setStageLoading(true)
    const res = await fetch("/api/guess-image-stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newStage })
    })
    if (res.ok) {
      setNewStage("")
      setShowAddStage(false)
      await fetchStages()
    }
    setStageLoading(false)
  }

  // حذف مرحلة
  const deleteStage = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف المرحلة؟")) return
    setStageLoading(true)
    await fetch(`/api/guess-image-stages?id=${id}`, { method: "DELETE" })
    await fetchStages()
    setStageLoading(false)
  }
    const data = await response.json()
    return data.url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    try {
      let imageUrl = formData.image_url

      // إذا تم اختيار ملف جديد، رفعه أولاً
      if (selectedFile) {
        imageUrl = await uploadImage(selectedFile)
      }
      const dataToSend = {
        image_url: imageUrl,
        answer: formData.answer,
        hint: null,
        stage_id: selectedStageId
      }

      if (editingImage) {
        // تحديث صورة موجودة
        const response = await fetch("/api/guess-images", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingImage.id,
            ...dataToSend
          })
        })

        if (response.ok) {
          await fetchImages()
          handleCloseDialog()
        }
      } else {
        // إضافة صورة جديدة
        const response = await fetch("/api/guess-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend)
        })

        if (response.ok) {
          await fetchImages()
          handleCloseDialog()
        }
      }
    } catch (error) {
      console.error("Error saving image:", error)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الصورة؟")) return

    try {
      const response = await fetch(`/api/guess-images?id=${id}`, {
        method: "DELETE"
      })

      if (response.ok) {
        await fetchImages()
      }
    } catch (error) {
      console.error("Error deleting image:", error)
    }
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files && files[0] && files[0].type.startsWith('image/')) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleEdit = (image: GuessImage) => {
    setEditingImage(image)
    setFormData({
      image_url: image.image_url,
      answer: image.answer
    })
    setPreviewUrl(image.image_url)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingImage(null)
    setFormData({
      image_url: "",
      answer: ""
    })
    setSelectedFile(null)
    setPreviewUrl("")
    setUploading(false)
  }

  const toggleActive = async (image: GuessImage) => {
    try {
      await fetch("/api/guess-images", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: image.id,
          active: !image.active
        })
      })
      await fetchImages()
    } catch (error) {
      console.error("Error toggling image active state:", error)
    }
  }

  if (loading) {
    return <SiteLoader fullScreen />
  }

    if (authLoading || !authVerified) return <SiteLoader fullScreen />;

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-[#fafaf9]">
      <Header />

      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8 border-2 border-[#d8a355]/20">
            <div className="flex flex-col gap-4 mb-6">
              <h1 className="text-2xl sm:text-4xl font-bold text-[#1a2332]">
                إدارة قاعدة خمن الصورة
              </h1>
              {/* قائمة المراحل */}
              <div className="flex flex-wrap gap-2 items-center">
                {stageLoading ? (
                  <div className="py-1">
                    <SiteLoader />
                  </div>
                ) : stages.length === 0 ? (
                  <span>لا توجد مراحل</span>
                ) : (
                  stages.map(stage => (
                    <div key={stage.id} className={`flex items-center border rounded px-3 py-1 gap-1 ${selectedStageId === stage.id ? 'bg-[#d8a355]/20 border-[#d8a355]' : 'border-gray-300'}`}>
                      <button
                        className={`font-bold ${selectedStageId === stage.id ? 'text-[#d8a355]' : ''}`}
                        style={{ cursor: 'pointer', background: 'none', border: 'none', outline: 'none' }}
                        onClick={() => setSelectedStageId(stage.id)}
                      >
                        {stage.name}
                      </button>
                      <button onClick={() => deleteStage(stage.id)} title="حذف المرحلة" className="text-red-500 hover:text-red-700"><X size={16} /></button>
                    </div>
                  ))
                )}
                <Button size="sm" variant="outline" onClick={() => setShowAddStage(true)}><Plus className="w-4 h-4 ml-1" />إضافة مرحلة</Button>
              </div>
              {/* نافذة إضافة مرحلة */}
              {showAddStage && (
                <form onSubmit={addStage} className="flex gap-2 items-center mt-2">
                  <Input value={newStage} onChange={e => setNewStage(e.target.value)} placeholder="اسم المرحلة الجديدة" required />
                  <Button type="submit" disabled={stageLoading || !newStage.trim()}>حفظ</Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddStage(false)}>إلغاء</Button>
                </form>
              )}
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">صور المرحلة المختارة</h2>
              <Button
                onClick={() => {
                  setEditingImage(null);
                  setFormData({ image_url: "", answer: "" });
                  setPreviewUrl("");
                  setSelectedFile(null);
                  setDialogOpen(true);
                }}
                disabled={!selectedStageId}
                className="bg-gradient-to-r from-[#d8a355] to-[#c89547] text-white"
              >
                <Plus className="ml-2 w-4 h-4" /> إضافة صورة جديدة
              </Button>
            </div>
            {selectedStageId ? (
              loading ? (
                <div className="py-12 flex justify-center">
                  <SiteLoader />
                </div>
              ) : images.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-xl text-gray-500">لا توجد صور في هذه المرحلة</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className={`border-2 rounded-lg p-4 relative ${
                        image.active ? "border-[#d8a355]" : "border-gray-300 opacity-60"
                      }`}
                    >
                      <div className="aspect-video bg-gray-100 rounded-lg mb-4 overflow-hidden">
                        <img
                          src={image.image_url}
                          alt={image.answer}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="font-bold text-lg mb-2">{image.answer}</h3>
                      <button
                        title="حذف الصورة"
                        onClick={() => handleDelete(image.id)}
                        className="absolute top-2 left-2 text-red-500 hover:text-red-700 bg-white rounded-full p-1 shadow"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-12 text-xl text-gray-500">اختر المرحلة لعرض صورها</div>
            )}
          </div>
        </div>
      </main>

      {/* Dialog للإضافة والتعديل */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#1a2332]">
              {editingImage ? "تعديل صورة" : "إضافة صورة جديدة"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* منطقة السحب والإفلات */}
            <div>
              <Label>الصورة *</Label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-[#d8a355] bg-[#faf8f5]'
                    : 'border-gray-300 hover:border-[#d8a355]'
                }`}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                {previewUrl ? (
                  <div className="space-y-4">
                    <img
                      src={previewUrl}
                      alt="معاينة"
                      className="max-h-48 mx-auto rounded-lg"
                    />
                    <p className="text-sm text-gray-600">
                      اضغط أو اسحب صورة جديدة للتغيير
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="text-lg font-semibold text-gray-700">
                      اسحب الصورة هنا
                    </p>
                    <p className="text-sm text-gray-500">
                      أو اضغط لاختيار ملف من جهازك
                    </p>
                  </div>
                )}
              </div>
              <input
                id="file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
              />
            </div>

            <div>
              <Label htmlFor="answer">الإجابة (اسم الصورة) *</Label>
              <Input
                id="answer"
                value={formData.answer}
                onChange={(e) =>
                  setFormData({ ...formData, answer: e.target.value })
                }
                placeholder="مثال: برج إيفل"
                required
                className="mt-2"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={uploading || (!selectedFile && !editingImage) || !selectedStageId}
                className="flex-1 bg-gradient-to-r from-[#d8a355] to-[#c89547] hover:from-[#c89547] hover:to-[#b88437] text-white disabled:opacity-50"
              >
                {uploading ? "جاري الرفع..." : editingImage ? "حفظ التعديلات" : "إضافة الصورة"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                className="flex-1"
                disabled={uploading}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
