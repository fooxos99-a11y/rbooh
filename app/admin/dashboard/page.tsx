"use client"

export const dynamic = 'force-dynamic'

import type React from "react"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  UserPlus,
  UserMinus,
  Users,
  BookOpen,
  Settings,
  FileText,
  Award,
  Upload,
  Map,
  Zap,
  UserCheck,
  Edit2,
  MessageSquare,
  Phone,
  Calendar,
  ShoppingBag,
  ShieldCheck,
  Bell,
  ArrowRightLeft,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { useToast } from "@/hooks/use-toast"
import { useAdminAuth } from "@/hooks/use-admin-auth"

interface Circle {
  name: string
  studentCount: number
  created_at: string
}

interface AllUser {
  id: string
  name: string
  role: string
  account_number: number
  phone_number?: string
  id_number?: string
  halaqah?: string
  guardian_phone?: string
}

function AdminDashboard() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth();

  const [isLoading, setIsLoading] = useState(true)
  const [newStudentName, setNewStudentName] = useState("")
  const [newStudentIdNumber, setNewStudentIdNumber] = useState("")
  const [newStudentAccountNumber, setNewStudentAccountNumber] = useState("")
  const [newGuardianPhone, setNewGuardianPhone] = useState("")
  const [selectedCircleToAdd, setSelectedCircleToAdd] = useState("")
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false)
  const [isRemoveStudentDialogOpen, setIsRemoveStudentDialogOpen] = useState(false)
  const [isMoveStudentDialogOpen, setIsMoveStudentDialogOpen] = useState(false)
  const [moveSourceCircle, setMoveSourceCircle] = useState("")
  const [moveStudentId, setMoveStudentId] = useState("")
  const [moveTargetCircle, setMoveTargetCircle] = useState("")
  const [selectedCircleToRemove, setSelectedCircleToRemove] = useState("")
  const [selectedStudentToRemove, setSelectedStudentToRemove] = useState("")
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalTeachers, setTotalTeachers] = useState(0)
  const [totalAdmins, setTotalAdmins] = useState(0)
  const [totalCircles, setTotalCircles] = useState(3)
  const [studentsInCircles, setStudentsInCircles] = useState<Record<string, any[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [circles, setCircles] = useState<Circle[]>([])
  const router = useRouter()

  const [isEditStudentDialogOpen, setIsEditStudentDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [editGuardianPhone, setEditGuardianPhone] = useState("")
  const [editStudentIdNumber, setEditStudentIdNumber] = useState("")
  const [selectedCircleForEdit, setSelectedCircleForEdit] = useState("")
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState("")

  const [isAllUsersDialogOpen, setIsAllUsersDialogOpen] = useState(false)
  const [allUsers, setAllUsers] = useState<AllUser[]>([])
  const [isLoadingAllUsers, setIsLoadingAllUsers] = useState(false)

  const [isStudentManagementDialogOpen, setIsStudentManagementDialogOpen] = useState(false)
  const [isStudentRecordsDialogOpen, setIsStudentRecordsDialogOpen] = useState(false)
  const [selectedCircleForRecords, setSelectedCircleForRecords] = useState("")
  const [selectedStudentForRecords, setSelectedStudentForRecords] = useState("")
  const [studentRecords, setStudentRecords] = useState<any[]>([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)
  const [selectedStudentName, setSelectedStudentName] = useState("")

  const [isEditPointsDialogOpen, setIsEditPointsDialogOpen] = useState(false)
  const [selectedCircleForPoints, setSelectedCircleForPoints] = useState("")
  const [selectedStudentForPoints, setSelectedStudentForPoints] = useState("")
  const [editingStudentPoints, setEditingStudentPoints] = useState<any>(null)
  const [newPoints, setNewPoints] = useState("")

  const [isUserRoleDialogOpen, setIsUserRoleDialogOpen] = useState(false)
  const [searchUserQuery, setSearchUserQuery] = useState("")
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  const [isAchievementsDialogOpen, setIsAchievementsDialogOpen] = useState(false)
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(false)
  const [achievements, setAchievements] = useState<any[]>([])

  const [isReportsDialogOpen, setIsReportsDialogOpen] = useState(false)

  const [isBulkAddStudentDialogOpen, setIsBulkAddStudentDialogOpen] = useState(false)
  const [bulkCircle, setBulkCircle] = useState("")
  type BulkRow = { name: string; account: string }
  const emptyRows = (): BulkRow[] => Array.from({ length: 10 }, () => ({ name: "", account: "" }))
  const [bulkRows, setBulkRows] = useState<BulkRow[]>(emptyRows())
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)

  const availableStudentsToRemove = selectedCircleToRemove ? studentsInCircles[selectedCircleToRemove.trim()] || [] : []
  const availableStudentsToMove = moveSourceCircle ? studentsInCircles[moveSourceCircle.trim()] || [] : []

  const [isDragging, setIsDragging] = useState(false)
  const [isAchievementDragging, setIsAchievementDragging] = useState(false)

  const [newAchievement, setNewAchievement] = useState({
    title: "",
    date: "",
    description: "",
    status: "مكتمل",
    level: "ممتاز",
    icon_type: "trophy",
    image: null as File | null,
    image_url: "",
  })

  const [newProgram, setNewProgram] = useState({
    name: "",
    date: "",
    duration: "",
    points: "",
    description: "",
    is_active: false,
    file: null as File | null,
    file_url: "",
  })

  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadingAchievementImage, setUploadingAchievementImage] = useState(false)
  const [isGamesManagementDialogOpen, setIsGamesManagementDialogOpen] = useState(false)
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [isFullAccess, setIsFullAccess] = useState(false)

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      present: "حاضر",
      absent: "غائب",
      excused: "مستأذن",
    }
    return statusMap[status] || status
  }

  const translateLevel = (level: string) => {
    if (!level || level === "not_completed" || level === "null") {
      return "لم يكمل"
    }
    const levelMap: Record<string, string> = {
      excellent: "ممتاز",
      very_good: "جيد جداً",
      good: "جيد",
      acceptable: "مقبول",
      weak: "ضعيف",
    }
    return levelMap[level] || level
  }

  const confirmDialog = useConfirmDialog()
  const alertDialog = useAlertDialog()
  const { toast } = useToast()

  const searchParams = useSearchParams()

  useEffect(() => {
    const action = searchParams?.get("action")
    if (action) {
      if (action === "add-student") setIsAddStudentDialogOpen(true)
      if (action === "bulk-add") { setBulkCircle(""); setBulkRows(emptyRows()); setIsBulkAddStudentDialogOpen(true) }
      if (action === "remove-student") setIsRemoveStudentDialogOpen(true)
      if (action === "transfer-student") setIsMoveStudentDialogOpen(true)
      if (action === "edit-student") setIsEditStudentDialogOpen(true)
      if (action === "edit-points") setIsEditPointsDialogOpen(true)
      if (action === "student-records") setIsStudentRecordsDialogOpen(true)
    }
  }, [searchParams])

  const canAccess = (action: string) => {
    if (isFullAccess) return true
    return userPermissions.includes(action)
  }

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const accountNumber = localStorage.getItem("accountNumber")
    if (!loggedIn || !accountNumber) {
      router.push("/login")
      return
    }

    const loadData = async () => {
      try {
        // جلب الـ role الحقيقي من قاعدة البيانات مباشرة
        const supabase = createClient()
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("account_number", Number(accountNumber))
          .single()

        const freshRole = userData?.role || localStorage.getItem("userRole") || ""
        const adminRoles = ["admin", "مدير", "سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"]

        if (freshRole === "student" || freshRole === "teacher" || !freshRole) {
          router.push("/login")
          return
        }

        // تحديث localStorage بالـ role الجديد فوراً
        localStorage.setItem("userRole", freshRole)

        const fullAccess = ["admin", "مدير"].includes(freshRole) || Number(accountNumber) === 2
        setIsFullAccess(fullAccess)

        await Promise.all([fetchCircles(), fetchStudents(), fetchTeachers(), fetchAdmins()])

        if (!fullAccess) {
          try {
            const res = await fetch("/api/roles")
            const data = await res.json()
            const perms: Record<string, string[]> = data.permissions || {}
            setUserPermissions(perms[freshRole] || [])
          } catch {}
        }
      } catch {
        router.push("/login")
        return
      }
      setIsLoading(false)
    }
    loadData()
  }, [router])

  const fetchTeachers = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("users").select("*").eq("role", "teacher")

      if (error) {
        console.error("[v0] Error fetching teachers:", error)
        return
      }

      if (data) {
        setTotalTeachers(data.length)
        console.log("[v0] Teachers count:", data.length)
      }
    } catch (error) {
      console.error("[v0] Error fetching teachers:", error)
    }
  }

  const fetchAdmins = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("users").select("*").eq("role", "admin")

      if (error) {
        console.error("[v0] Error fetching admins:", error)
        return
      }

      if (data) {
        setTotalAdmins(data.length)
        console.log("[v0] Admins count:", data.length)
      }
    } catch (error) {
      console.error("[v0] Error fetching admins:", error)
    }
  }

  const fetchCircles = async () => {
    try {
      const response = await fetch("/api/circles")
      const data = await response.json()
      console.log("[v0] Circles fetched:", data.circles)
      if (data.circles) {
        setCircles(data.circles)
        setTotalCircles(data.circles.length)
        if (data.circles.length > 0 && !selectedCircleToAdd) {
          setSelectedCircleToAdd(data.circles[0].name)
          console.log("[v0] Default circle selected:", data.circles[0].name)
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching circles:", error)
    }
  }

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students")
      const data = await response.json()

      if (data.students) {
        setTotalStudents(data.students.length)

        const grouped: Record<string, any[]> = {}
        data.students.forEach((student: any) => {
          const circleKey = (student.halaqah || student.circle_name || "غير محدد").trim()
          if (!grouped[circleKey]) {
            grouped[circleKey] = []
          }
          grouped[circleKey].push(student)
        })
        setStudentsInCircles(grouped)
      }
    } catch (error) {
      console.error("[v0] Error fetching students:", error)
    }
  }

  const fetchAchievements = async () => {
    setIsLoadingAchievements(true)
    try {
      const response = await fetch("/api/achievements")
      const data = await response.json()
      setAchievements(data.achievements || [])
    } catch (error) {
      console.error("[v0] Error fetching achievements:", error)
    } finally {
      setIsLoadingAchievements(false)
    }
  }

  const fetchAllUsers = async () => {
    setIsLoadingAllUsers(true)
    try {
      console.log("[v0] Fetching all users...")

      const studentsResponse = await fetch("/api/students")
      const studentsData = await studentsResponse.json()
      console.log("[v0] Students data:", studentsData)

      const supabase = createClient()

      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .order("account_number", { ascending: true })

      console.log("[v0] Users data:", usersData)
      console.log("[v0] Users error:", usersError)

      const combinedUsers: AllUser[] = []

      const admins: AllUser[] = []
      const teachers: AllUser[] = []
      const students_list: AllUser[] = []

      if (studentsData.students) {
        studentsData.students.forEach((student: any) => {
          students_list.push({
            id: student.id,
            name: student.name,
            role: "طالب",
            account_number: student.account_number,
            phone_number: student.guardian_phone,
            guardian_phone: student.guardian_phone,
            id_number: student.id_number,
            halaqah: student.circle_name || student.halaqah,
          })
        })
      }

      if (usersData) {
        usersData.forEach((user: any) => {
          const userData: AllUser = {
            id: user.id,
            name: user.name,
            role: user.role === "teacher" ? "معلم" : (user.role !== "student" && user.role !== "teacher") ? "إداري" : user.role,
            account_number: user.account_number,
            phone_number: user.phone_number,
            id_number: user.id_number,
            halaqah: user.halaqah,
          }

          if (user.role !== "student" && user.role !== "teacher") {
            admins.push(userData)
          } else if (user.role === "teacher") {
            teachers.push(userData)
          }
        })
      }

      admins.sort((a, b) => (a.account_number || 0) - (b.account_number || 0))
      teachers.sort((a, b) => (a.account_number || 0) - (b.account_number || 0))
      students_list.sort((a, b) => (a.account_number || 0) - (b.account_number || 0))

      combinedUsers.push(...admins, ...teachers, ...students_list)

      console.log("[v0] Combined users:", combinedUsers)
      setAllUsers(combinedUsers)
    } catch (error) {
      console.error("[v0] Error fetching all users:", error)
    } finally {
      setIsLoadingAllUsers(false)
    }
  }

  const handleOpenAllUsersDialog = () => {
    setIsAllUsersDialogOpen(true)
    fetchAllUsers()
  }

  const handleBulkAddStudents = async () => {
    const validRows = bulkRows.filter(r => r.name.trim() && r.account.trim())
    if (!bulkCircle || validRows.length === 0) {
      toast({ title: "تنبيه", description: "يرجى اختيار الحلقة وإدخال بيانات طالب واحد على الأقل", variant: "destructive" })
      return
    }
    setIsBulkSubmitting(true)
    let successCount = 0
    let failCount = 0
    for (const row of validRows) {
      try {
        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.name.trim(),
            circle_name: bulkCircle,
            id_number: "0",
            guardian_phone: "0",
            account_number: parseInt(row.account),
            initial_points: 0,
          }),
        })
        if (res.ok) successCount++
        else failCount++
      } catch { failCount++ }
    }
    setIsBulkSubmitting(false)
    toast({
      title: successCount > 0 ? `✓ تم إضافة ${successCount} طالب` : "فشل الحفظ",
      description: failCount > 0 ? `فشل ${failCount} طالب` : undefined,
    })
    if (successCount > 0) {
      setIsBulkAddStudentDialogOpen(false)
      setBulkCircle("")
      setBulkRows(emptyRows())
      fetchStudents()
    }
  }

  const handleAddStudent = async () => {
    if (newStudentName.trim() && newStudentIdNumber.trim() && newStudentAccountNumber.trim()) {
      setIsSubmitting(true)
      try {
        const initialPoints = 0

        console.log("[v0] Adding student with circle:", selectedCircleToAdd)

        const response = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newStudentName,
            circle_name: selectedCircleToAdd,
            id_number: newStudentIdNumber,
            guardian_phone: newGuardianPhone,
            account_number: Number.parseInt(newStudentAccountNumber),
            initial_points: initialPoints,
          }),
        })

        const data = await response.json()
        console.log("[v0] Student added response:", data)

        if (response.ok) {
          toast({
            title: "✓ تم الحفظ بنجاح",
            description: `تم إضافة الطالب ${newStudentName} إلى ${selectedCircleToAdd} بنجاح`,
            className: "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-none",
          })
          setNewStudentName("")
          setNewStudentIdNumber("")
          setNewStudentAccountNumber("")
          setNewGuardianPhone("")
          setIsAddStudentDialogOpen(false)
          fetchStudents()
        } else {
          alert(data.error || "فشل في إضافة الطالب")
        }
      } catch (error) {
        console.error("[v0] Error adding student:", error)
        alert("حدث خطأ أثناء إضافة الطالب")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleAchievementImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewAchievement({ ...newAchievement, image: file })
    }
  }

  const handleAchievementDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsAchievementDragging(true)
  }

  const handleAchievementDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsAchievementDragging(false)
  }

  const handleAchievementDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsAchievementDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setNewAchievement({ ...newAchievement, image: file })
    }
  }

  const handleAddAchievement = async () => {
    if (!newAchievement.title) {
      await alertDialog("الرجاء إدخال عنوان الإنجاز")
      return
    }

    setIsSubmitting(true)
    try {
      let imageUrl = ""

      if (newAchievement.image) {
        setUploadingAchievementImage(true)
        const formData = new FormData()
        formData.append("file", newAchievement.image)

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error("فشل رفع الصورة")
        }

        const uploadData = await uploadResponse.json()
        imageUrl = uploadData.url
        setUploadingAchievementImage(false)
      }

      const response = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newAchievement,
          image_url: imageUrl,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        await alertDialog("تم إضافة الإنجاز بنجاح")
        setNewAchievement({
          title: "",
          date: "",
          description: "",
          status: "مكتمل",
          level: "ممتاز",
          icon_type: "trophy",
          image: null,
          image_url: "",
        })
        fetchAchievements()
      } else {
        await alertDialog(data.error || "فشل في إضافة الإنجاز")
      }
    } catch (error) {
      console.error("[v0] Error adding achievement:", error)
      await alertDialog("حدث خطأ أثناء إضافة الإنجاز")
    } finally {
      setIsSubmitting(false)
      setUploadingAchievementImage(false)
    }
  }

  const handleAddAchievementPublic = async () => {
    if (!newAchievement.title) {
      await alertDialog("الرجاء إدخال عنوان الإنجاز")
      return
    }
    setIsSubmitting(true)
    try {
      let imageUrl = ""
      if (newAchievement.image) {
        setUploadingAchievementImage(true)
        const formData = new FormData()
        formData.append("file", newAchievement.image)
        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })
        if (!uploadResponse.ok) {
          throw new Error("فشل رفع الصورة")
        }
        const uploadData = await uploadResponse.json()
        imageUrl = uploadData.url
        setUploadingAchievementImage(false)
      }
      const response = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newAchievement,
          image_url: imageUrl,
          achievement_type: "public",
        }),
      })
      const data = await response.json()
      if (response.ok) {
        await alertDialog("تم إضافة الإنجاز بنجاح")
        setNewAchievement({
          title: "",
          date: "",
          description: "",
          status: "مكتمل",
          level: "ممتاز",
          icon_type: "trophy",
          image: null,
          image_url: "",
        })
        fetchAchievements()
      } else {
        await alertDialog(data.error || "فشل في إضافة الإنجاز")
      }
    } catch (error) {
      console.error("[v0] Error adding achievement:", error)
      await alertDialog("حدث خطأ أثناء إضافة الإنجاز")
    } finally {
      setIsSubmitting(false)
      setUploadingAchievementImage(false)
    }
  }

  const handleDeleteAchievement = async (id: string) => {
    const confirmed = await confirmDialog("هل أنت متأكد من حذف هذا الإنجاز؟", "تأكيد حذف الإنجاز")
    if (!confirmed) return

    try {
      const response = await fetch(`/api/achievements?id=${id}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (response.ok) {
        toast({
          title: "✓ تم الحذف بنجاح",
          description: "تم حذف الإنجاز من القائمة",
          className: "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-none",
        })
        fetchAchievements()
      } else {
        toast({
          title: "فشل في حذف الإنجاز",
          description: data.error || "حدث خطأ أثناء حذف الإنجاز",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error deleting achievement:", error)
      toast({
        title: "حدث خطأ",
        description: "حدث خطأ أثناء حذف الإنجاز",
        variant: "destructive",
      })
    }
  }

  const handleProgramFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setNewProgram({ ...newProgram, file })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      setNewProgram({ ...newProgram, file })
    }
  }

  const handleMoveStudent = async () => {
    if (moveStudentId && moveTargetCircle) {
      setIsSubmitting(true)
      try {
        const response = await fetch(`/api/students?id=${moveStudentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ halaqah: moveTargetCircle }),
        })

        const data = await response.json()

        if (response.ok) {
          const studentName = availableStudentsToMove.find((s) => s.id === moveStudentId)?.name
          toast({
            title: "✓ تم النقل بنجاح",
            description: `تم نقل الطالب ${studentName} إلى ${moveTargetCircle} بنجاح`,
            className: "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-none",
          })
          setMoveStudentId("")
          setMoveSourceCircle("")
          setMoveTargetCircle("")
          setIsMoveStudentDialogOpen(false)
          fetchStudents()
        } else {
          toast({
            title: "حدث خطأ",
            description: data.error || "فشل في نقل الطالب",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error moving student:", error)
        toast({
          title: "حدث خطأ",
          description: "فشل في الاتصال بالخادم",
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleRemoveStudent = async () => {
    if (selectedStudentToRemove) {
      setIsSubmitting(true)
      try {
        const response = await fetch(`/api/students?id=${selectedStudentToRemove}`, {
          method: "DELETE",
        })

        const data = await response.json()

        if (response.ok) {
          const studentName = availableStudentsToRemove.find((s) => s.id === selectedStudentToRemove)?.name
          toast({
            title: "✓ تم الحذف بنجاح",
            description: `تم إزالة الطالب ${studentName} من ${selectedCircleToRemove} بنجاح`,
            className: "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-none",
          })
          setSelectedStudentToRemove("")
          setSelectedCircleToRemove("")
          setIsRemoveStudentDialogOpen(false)
          fetchStudents()
        } else {
          alert(data.error || "فشل في إزالة الطالب")
        }
      } catch (error) {
        console.error("[v0] Error removing student:", error)
        alert("حدث خطأ أثناء إزالة الطالب")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleOpenEditDialog = () => {
    setSelectedCircleForEdit("")
    setSelectedStudentForEdit("")
    setEditingStudent(null)
    setEditGuardianPhone("")
    setEditStudentIdNumber("")
    setIsEditStudentDialogOpen(true)
  }

  const handleSelectStudentForEdit = (studentId: string) => {
    setSelectedStudentForEdit(studentId)
    const student = studentsInCircles[(selectedCircleForEdit || "").trim()]?.find((s) => s.id === studentId)
    if (student) {
      setEditingStudent(student)
      setEditGuardianPhone(student.guardian_phone || "")
      setEditStudentIdNumber(student.id_number || "")
    }
  }

  const handleSaveStudentEdit = async () => {
    if (!editingStudent) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/students", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingStudent.id,
          guardian_phone: editGuardianPhone,
          id_number: editStudentIdNumber,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "✓ تم الحفظ بنجاح",
          description: `تم تحديث معلومات الطالب ${editingStudent.name} بنجاح`,
          className: "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-none",
        })
        setIsEditStudentDialogOpen(false)
        setEditingStudent(null)
        fetchStudents()
      } else {
        alert("فشل في تحديث الطالب")
      }
    } catch (error) {
      console.error("[v0] Error updating student:", error)
      alert("حدث خطأ أثناء تحديث الطالب")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectStudentForPoints = (studentId: string) => {
    setSelectedStudentForPoints(studentId)
    const student = studentsInCircles[(selectedCircleForPoints || "").trim()]?.find((s) => s.id === studentId)
    if (student) {
      setEditingStudentPoints(student)
      setNewPoints(student.points?.toString() || "0")
    }
  }

  const handleSavePoints = async () => {
    if (!editingStudentPoints) return;

    setIsSubmitting(true);
    try {
      const oldPoints = editingStudentPoints.points || 0;
      const diff = Number.parseInt(newPoints) - oldPoints;
      let bodyObj;
      if (diff > 0) {
        bodyObj = { add_points: diff };
      } else {
        bodyObj = { points: Number.parseInt(newPoints) };
      }
      const response = await fetch(`/api/students?id=${editingStudentPoints.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyObj),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "✓ تم الحفظ بنجاح",
          description: `تم تحديث نقاط الطالب ${editingStudentPoints.name} إلى ${newPoints} نقطة`,
          className: "bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-white border-none",
        });
        setIsEditPointsDialogOpen(false);
        setEditingStudentPoints(null);
        setNewPoints("");
        fetchStudents();
      } else {
        alert("فشل في تحديث النقاط");
      }
    } catch (error) {
      console.error("[v0] Error updating points:", error);
      alert("حدث خطأ أثناء تحديث النقاط");
    } finally {
      setIsSubmitting(false);
    }
  }

  const fetchStudentRecords = async (studentId: string) => {
    setIsLoadingRecords(true)
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("attendance_records")
        .select(`
          *,
          evaluations (
            hafiz_level,
            tikrar_level,
            samaa_level,
            rabet_level
          )
        `)
        .eq("student_id", studentId)
        .order("date", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching student records:", error)
        return
      }

      console.log("[v0] Student records fetched:", data)
      setStudentRecords(data || [])
    } catch (error) {
      console.error("[v0] Error fetching student records:", error)
    } finally {
      setIsLoadingRecords(false)
    }
  }

  const handleSelectStudentForRecords = (studentId: string) => {
    setSelectedStudentForRecords(studentId)
    const student = studentsInCircles[(selectedCircleForRecords || "").trim()]?.find((s) => s.id === studentId)
    if (student) {
      setSelectedStudentName(student.name)
      fetchStudentRecords(studentId)
    }
  }

  const handleOpenRecordsDialog = () => {
    setIsStudentManagementDialogOpen(false)
    setIsStudentRecordsDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
          <p className="text-sm text-neutral-400">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]">
      <Header />

      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-5xl space-y-10">

          {/* Page Title */}
          <div className="border-b border-[#D4AF37]/50 pb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1a2332]">لوحة التحكم</h1>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "الطلاب", value: totalStudents, icon: Users },
              { label: "المعلمون", value: totalTeachers, icon: Settings },
              { label: "الإداريون", value: totalAdmins, icon: ShieldCheck },
              { label: "الحلقات", value: totalCircles, icon: BookOpen },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white rounded-2xl border border-[#D4AF37]/40 p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/8 border border-[#D4AF37]/40 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-[#1a2332]">{value}</p>
                  <p className="text-sm text-neutral-400 mt-1">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Student Management */}
            <div className="bg-white rounded-2xl border border-[#D4AF37]/40 shadow-sm overflow-hidden">
              <div className="px-6 py-6 border-b border-[#D4AF37]/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <h2 className="text-lg font-bold text-[#1a2332]">إدارة المستخدمين</h2>
              </div>
              <div className="divide-y divide-[#D4AF37]/25">
                {canAccess("إدارة الطلاب") && (
                <Dialog open={isStudentManagementDialogOpen} onOpenChange={setIsStudentManagementDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      onClick={(e) => { e.preventDefault(); setIsStudentManagementDialogOpen(true) }}
                      className="w-full flex items-center justify-between px-6 py-5 hover:bg-[#D4AF37]/5 transition-colors duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-[#C9A961] group-hover:text-[#D4AF37] transition-colors" />
                        <span className="text-base font-medium text-neutral-700">إدارة الطلاب</span>
                      </div>
                      <span className="text-neutral-300 group-hover:text-[#D4AF37] transition-colors text-xl leading-none">‹</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                      <DialogTitle className="text-xl text-[#1a2332]">إدارة الطلاب</DialogTitle>
                      <DialogDescription className="text-sm text-neutral-500">اختر العملية المطلوبة</DialogDescription>
                    </DialogHeader>
                    <div className="divide-y divide-[#D4AF37]/25 rounded-xl border border-[#D4AF37]/40 overflow-hidden mt-4">
                      {[
                        { icon: UserPlus, label: "إضافة طالب", action: () => { setIsStudentManagementDialogOpen(false); setIsAddStudentDialogOpen(true) } },
                        { icon: Users, label: "إضافة جماعية", action: () => { setIsStudentManagementDialogOpen(false); setBulkCircle(""); setBulkRows(emptyRows()); setIsBulkAddStudentDialogOpen(true) } },
                        { icon: UserMinus, label: "إزالة طالب", action: () => { setIsStudentManagementDialogOpen(false); setIsRemoveStudentDialogOpen(true) } },
                        { icon: ArrowRightLeft, label: "نقل طالب", action: () => { setIsStudentManagementDialogOpen(false); setMoveSourceCircle(""); setMoveStudentId(""); setMoveTargetCircle(""); setIsMoveStudentDialogOpen(true) } },
                        { icon: Settings, label: "تعديل بيانات الطالب", action: () => { setIsStudentManagementDialogOpen(false); handleOpenEditDialog() } },
                        { icon: Edit2, label: "تعديل نقاط الطالب", action: () => { setIsStudentManagementDialogOpen(false); setSelectedCircleForPoints(""); setSelectedStudentForPoints(""); setEditingStudentPoints(null); setNewPoints(""); setIsEditPointsDialogOpen(true) } },
                        { icon: FileText, label: "سجلات الطلاب", action: handleOpenRecordsDialog },
                        { icon: Award, label: "إنجازات الطلاب", action: () => { setIsStudentManagementDialogOpen(false); router.push("/admin/students-achievements") } },
                      ].map(({ icon: Ic, label, action }) => (
                        <button key={label} onClick={action} className="w-full flex items-center justify-between px-5 py-5 bg-white hover:bg-[#D4AF37]/5 transition-colors duration-200 group">
                          <div className="flex items-center gap-3">
                            <Ic className="w-5 h-5 text-[#C9A961] group-hover:text-[#D4AF37] transition-colors" />
                            <span className="text-base font-medium text-neutral-700">{label}</span>
                          </div>
                          <span className="text-neutral-300 group-hover:text-[#D4AF37] transition-colors text-xl leading-none">‹</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button variant="outline" onClick={() => setIsStudentManagementDialogOpen(false)} className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600">إغلاق</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                )}

                {[
                  { icon: Settings, label: "إدارة المعلمين", action: () => router.push("/admin/teachers") },
                  { icon: BookOpen, label: "إدارة الحلقات", action: () => router.push("/admin/circles") },
                  { icon: ShieldCheck, label: "الهيكل الإداري", action: () => router.push("/admin/admins") },
                  { icon: Zap, label: "الصلاحيات", action: () => router.push("/admin/permissions") },
                  { icon: UserPlus, label: "طلبات الإلتحاق", action: () => router.push("/admin/enrollment-requests") },
                ].filter(({ label }) => canAccess(label)).map(({ icon: Ic, label, action }) => (
                  <button key={label} onClick={action} className="w-full flex items-center justify-between px-6 py-5 hover:bg-[#D4AF37]/5 transition-colors duration-200 group border-t border-[#D4AF37]/10">
                    <div className="flex items-center gap-3">
                      <Ic className="w-5 h-5 text-[#C9A961] group-hover:text-[#D4AF37] transition-colors" />
                      <span className="text-base font-medium text-neutral-700">{label}</span>
                    </div>
                    <span className="text-neutral-300 group-hover:text-[#D4AF37] transition-colors text-xl leading-none">‹</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Communication & Administration */}
            <div className="bg-white rounded-2xl border border-[#D4AF37]/40 shadow-sm overflow-hidden">
              <div className="px-6 py-6 border-b border-[#D4AF37]/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <h2 className="text-lg font-bold text-[#1a2332]">الإدارة العامة</h2>
              </div>
              <div className="divide-y divide-[#D4AF37]/25">
                {canAccess("التقارير") && (
                <Dialog open={isReportsDialogOpen} onOpenChange={setIsReportsDialogOpen}>
                  <DialogTrigger asChild>
                    <button onClick={(e) => { e.preventDefault(); setIsReportsDialogOpen(true) }} className="w-full flex items-center justify-between px-6 py-5 hover:bg-[#D4AF37]/5 transition-colors duration-200 group">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-[#C9A961] group-hover:text-[#D4AF37] transition-colors" />
                        <span className="text-base font-medium text-neutral-700">التقارير</span>
                      </div>
                      <span className="text-neutral-300 group-hover:text-[#D4AF37] transition-colors text-xl leading-none">‹</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                      <DialogTitle className="text-xl text-[#1a2332]">التقارير</DialogTitle>
                      <DialogDescription className="text-sm text-neutral-500">اختر نوع التقرير</DialogDescription>
                    </DialogHeader>
                    <div className="divide-y divide-[#D4AF37]/25 rounded-xl border border-[#D4AF37]/40 overflow-hidden mt-4">
                      {[
                        { icon: UserCheck, label: "تقارير المعلمين", action: () => { setIsReportsDialogOpen(false); router.push("/admin/teacher-attendance") } },
                        { icon: MessageSquare, label: "تقارير الرسائل", action: () => { setIsReportsDialogOpen(false); router.push("/admin/reports") } },
                        { icon: BookOpen, label: "السجل اليومي للطلاب", action: () => { setIsReportsDialogOpen(false); router.push("/admin/student-daily-attendance") } },
                      ].map(({ icon: Ic, label, action }) => (
                        <button key={label} onClick={action} className="w-full flex items-center justify-between px-5 py-5 bg-white hover:bg-[#D4AF37]/5 transition-colors duration-200 group">
                          <div className="flex items-center gap-3">
                            <Ic className="w-5 h-5 text-[#C9A961] group-hover:text-[#D4AF37] transition-colors" />
                            <span className="text-base font-medium text-neutral-700">{label}</span>
                          </div>
                          <span className="text-neutral-300 group-hover:text-[#D4AF37] transition-colors text-xl leading-none">‹</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button variant="outline" onClick={() => setIsReportsDialogOpen(false)} className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600">إغلاق</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                )}

                {[
                  { icon: MessageSquare, label: "الإرسال إلى أولياء الأمور", path: "/admin/whatsapp-send" },
                  { icon: Bell, label: "الإشعارات", path: "/admin/notifications" },
                  { icon: Map, label: "إدارة المسار", path: "/admin/pathways" },
                ].filter(({ label }) => canAccess(label)).map(({ icon: Ic, label, path }) => (
                  <button key={label} onClick={() => router.push(path)} className="w-full flex items-center justify-between px-6 py-5 hover:bg-[#D4AF37]/5 transition-colors duration-200 group">
                    <div className="flex items-center gap-3">
                      <Ic className="w-5 h-5 text-[#C9A961] group-hover:text-[#D4AF37] transition-colors" />
                      <span className="text-base font-medium text-neutral-700">{label}</span>
                    </div>
                    <span className="text-neutral-300 group-hover:text-[#D4AF37] transition-colors text-xl leading-none">‹</span>
                  </button>
                ))}

                {canAccess("إدارة الألعاب") && (
                <Dialog open={isGamesManagementDialogOpen} onOpenChange={setIsGamesManagementDialogOpen}>
                  <DialogTrigger asChild>
                    <button onClick={(e) => { e.preventDefault(); setIsGamesManagementDialogOpen(true) }} className="w-full flex items-center justify-between px-6 py-5 hover:bg-[#D4AF37]/5 transition-colors duration-200 group">
                      <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-[#C9A961] group-hover:text-[#D4AF37] transition-colors" />
                        <span className="text-base font-medium text-neutral-700">إدارة الألعاب</span>
                      </div>
                      <span className="text-neutral-300 group-hover:text-[#D4AF37] transition-colors text-xl leading-none">‹</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                      <DialogTitle className="text-xl text-[#1a2332]">إدارة الألعاب</DialogTitle>
                      <DialogDescription className="text-sm text-neutral-500">اختر اللعبة التي تريد إدارتها</DialogDescription>
                    </DialogHeader>
                    <div className="divide-y divide-[#D4AF37]/25 rounded-xl border border-[#D4AF37]/40 overflow-hidden mt-4">
                      {[
                        { icon: BookOpen, label: "قاعدة أسئلة الفئات", path: "/admin/questions" },
                        { icon: BookOpen, label: "إدارة خلية الحروف", path: "/admin/letter-hive-questions" },
                        { icon: BookOpen, label: "قاعدة أسئلة المزاد", path: "/admin/auction-questions" },
                        { icon: Upload, label: "قاعدة صور خمن الصورة", path: "/admin/guess-images" },
                      ].map(({ icon: Ic, label, path }) => (
                        <button key={label} onClick={() => { setIsGamesManagementDialogOpen(false); router.push(path) }} className="w-full flex items-center justify-between px-5 py-5 bg-white hover:bg-[#D4AF37]/5 transition-colors duration-200 group">
                          <div className="flex items-center gap-3">
                            <Ic className="w-5 h-5 text-[#C9A961] group-hover:text-[#D4AF37] transition-colors" />
                            <span className="text-base font-medium text-neutral-700">{label}</span>
                          </div>
                          <span className="text-neutral-300 group-hover:text-[#D4AF37] transition-colors text-xl leading-none">‹</span>
                        </button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
                )}

                {[
                  { icon: ShoppingBag, label: "إدارة المتجر", path: "/admin/store-management" },
                ].filter(({ label }) => canAccess(label)).map(({ icon: Ic, label, path }) => (
                  <button key={label} onClick={() => router.push(path)} className="w-full flex items-center justify-between px-6 py-5 hover:bg-[#D4AF37]/5 transition-colors duration-200 group">
                    <div className="flex items-center gap-3">
                      <Ic className="w-5 h-5 text-[#C9A961] group-hover:text-[#D4AF37] transition-colors" />
                      <span className="text-base font-medium text-neutral-700">{label}</span>
                    </div>
                    <span className="text-neutral-300 group-hover:text-[#D4AF37] transition-colors text-xl leading-none">‹</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Edit Points Dialog - programmatic only */}
          <Dialog open={isEditPointsDialogOpen} onOpenChange={setIsEditPointsDialogOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-xl text-[#1a2332]">تعديل نقاط الطالب</DialogTitle>
                  <DialogDescription className="text-sm text-neutral-500">اختر الحلقة والطالب لتعديل نقاطه</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="pointsCircleSelect" className="text-sm font-semibold text-[#1a2332]">
                      اختر الحلقة
                    </Label>
                    <Select
                      value={selectedCircleForPoints}
                      onValueChange={(value) => {
                        setSelectedCircleForPoints(value)
                        setSelectedStudentForPoints("")
                        setEditingStudentPoints(null)
                        setNewPoints("")
                      }}
                    >
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder="اختر الحلقة" />
                      </SelectTrigger>
                      <SelectContent>
                        {circles.map((circle) => (
                          <SelectItem key={circle.name} value={circle.name}>
                            {circle.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pointsStudentSelect" className="text-sm font-semibold text-[#1a2332]">
                      اختر الطالب
                    </Label>
                    <Select
                      value={selectedStudentForPoints}
                      onValueChange={handleSelectStudentForPoints}
                      disabled={!selectedCircleForPoints}
                    >
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue placeholder={selectedCircleForPoints ? "اختر الطالب" : "اختر الحلقة أولاً"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(studentsInCircles[(selectedCircleForPoints || "").trim()] || []).map((student: any) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name} - النقاط الحالية: {student.points || 0}
                          </SelectItem>

                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {editingStudentPoints && (
                    <div className="space-y-2">
                      <Label htmlFor="newPoints" className="text-sm font-semibold text-[#1a2332]">
                        النقاط الجديدة
                      </Label>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" onClick={() => setNewPoints((prev) => (Math.max(0, Number(prev) - 10)).toString())} disabled={Number(newPoints) <= 0}>-</Button>
                        <Input
                          id="newPoints"
                          type="number"
                          value={newPoints}
                          onChange={(e) => setNewPoints(e.target.value)}
                          placeholder="أدخل النقاط الجديدة"
                          className="text-sm w-24 text-center"
                          min="0"
                        />
                        <Button type="button" variant="outline" onClick={() => setNewPoints((prev) => (Number(prev) + 10).toString())}>+</Button>
                      </div>
                      <p className="text-xs text-neutral-400">النقاط الحالية: {editingStudentPoints.points || 0}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setIsEditPointsDialogOpen(false); setEditingStudentPoints(null); setNewPoints("") }} className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600">
                    إلغاء
                  </Button>
                  <Button
                    onClick={handleSavePoints}
                    variant="outline"
                    className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600"
                    disabled={!editingStudentPoints || !newPoints || isSubmitting}
                  >
                    {isSubmitting ? "جاري الحفظ..." : "حفظ النقاط"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

          <Dialog open={isBulkAddStudentDialogOpen} onOpenChange={(open) => { setIsBulkAddStudentDialogOpen(open); if (!open) { setBulkCircle(""); setBulkRows(emptyRows()) } }}>
            <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl text-[#1a2332]">إضافة جماعية للطلاب</DialogTitle>
                <DialogDescription className="text-sm text-neutral-500">اختر الحلقة ثم أدخل بيانات الطلاب</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* اختيار الحلقة */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-neutral-600">اسم الحلقة</Label>
                  <Select value={bulkCircle} onValueChange={setBulkCircle}>
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {circles.map((circle) => (
                        <SelectItem key={circle.name} value={circle.name}>{circle.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* صف العناوين */}
                <div className="grid grid-cols-2 gap-2 mb-1">
                  <span className="text-xs font-bold text-neutral-500 text-right pr-1">اسم الطالب</span>
                  <span className="text-xs font-bold text-neutral-500 text-right pr-1">رقم الحساب</span>
                </div>

                {/* صفوف الطلاب */}
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {bulkRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-2 items-center">
                      <Input
                        placeholder={`اسم الطالب ${idx + 1}`}
                        value={row.name}
                        onChange={e => setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, name: e.target.value } : r))}
                        className="text-sm h-9"
                        dir="rtl"
                      />
                      <Input
                        placeholder="رقم الحساب"
                        value={row.account}
                        onChange={e => setBulkRows(prev => prev.map((r, i) => i === idx ? { ...r, account: e.target.value } : r))}
                        className="text-sm h-9"
                        dir="ltr"
                        type="number"
                      />
                    </div>
                  ))}
                </div>

                {/* زر إضافة صف */}
                <button
                  type="button"
                  onClick={() => setBulkRows(prev => [...prev, { name: "", account: "" }])}
                  className="flex items-center gap-1.5 text-sm text-[#C9A961] hover:text-[#D4AF37] font-medium transition-colors"
                >
                  <span className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-base leading-none">+</span>
                  إضافة سطر
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsBulkAddStudentDialogOpen(false)} className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600">إلغاء</Button>
                <Button
                  onClick={handleBulkAddStudents}
                  disabled={!bulkCircle || bulkRows.every(r => !r.name.trim() || !r.account.trim()) || isBulkSubmitting}
                  className="border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#C9A961] hover:text-[#D4AF37] text-sm h-9 rounded-lg font-medium"
                >
                  {isBulkSubmitting ? "جاري الحفظ..." : "حفظ الجميع"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddStudentDialogOpen} onOpenChange={setIsAddStudentDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl text-[#1a2332]">إضافة طالب جديد</DialogTitle>
                <DialogDescription className="text-sm text-neutral-500">أدخل معلومات الطالب واختر الحلقة</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="studentName" className="text-sm font-medium text-neutral-600">
                    اسم الطالب
                  </Label>
                  <Input
                    id="studentName"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="أدخل اسم الطالب"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentAccountNumber" className="text-sm font-medium text-neutral-600">
                    رقم الحساب
                  </Label>
                  <Input
                    id="studentAccountNumber"
                    value={newStudentAccountNumber}
                    onChange={(e) => setNewStudentAccountNumber(e.target.value)}
                    placeholder="أدخل رقم الحساب"
                    className="text-sm"
                    dir="ltr"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentIdNumber" className="text-sm font-medium text-neutral-600">
                    رقم الهوية
                  </Label>
                  <Input
                    id="studentIdNumber"
                    value={newStudentIdNumber}
                    onChange={(e) => setNewStudentIdNumber(e.target.value)}
                    placeholder="أدخل رقم الهوية"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianPhoneNumber" className="text-sm font-medium text-neutral-600">
                    رقم جوال ولي الأمر
                  </Label>
                  <Input
                    id="guardianPhoneNumber"
                    value={newGuardianPhone}
                    onChange={(e) => setNewGuardianPhone(e.target.value)}
                    placeholder="966501234567"
                    className="text-sm"
                    dir="ltr"
                    type="tel"
                  />
                  <p className="text-xs text-gray-500">مثال: 966501234567</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="circleSelect" className="text-sm font-medium text-neutral-600">
                    اختر الحلقة
                  </Label>
                  <Select value={selectedCircleToAdd} onValueChange={setSelectedCircleToAdd}>
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {circles.map((circle) => (
                        <SelectItem key={circle.name} value={circle.name}>
                          {circle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddStudentDialogOpen(false)} className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600">
                  إلغاء
                </Button>
                <Button
                  onClick={handleAddStudent}
                  className="border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#C9A961] hover:text-[#D4AF37] text-sm h-9 rounded-lg font-medium"
                  disabled={
                    !newStudentName.trim() ||
                    !newStudentIdNumber.trim() ||
                    !newStudentAccountNumber.trim() ||
                    isSubmitting
                  }
                >
                  {isSubmitting ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isRemoveStudentDialogOpen} onOpenChange={setIsRemoveStudentDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl text-[#1a2332]">إزالة طالب</DialogTitle>
                <DialogDescription className="text-sm text-neutral-500">اختر الحلقة ثم اختر الطالب المراد إزالته</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="removeCircleSelect" className="text-sm font-medium text-neutral-600">
                    اختر الحلقة
                  </Label>
                  <Select
                    value={selectedCircleToRemove}
                    onValueChange={(value) => {
                      setSelectedCircleToRemove(value)
                      setSelectedStudentToRemove("")
                    }}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {circles.map((circle) => (
                        <SelectItem key={circle.name} value={circle.name}>
                          {circle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="removeStudentSelect" className="text-sm font-semibold text-[#1a2332]">
                    اختر الطالب
                  </Label>
                  <Select
                    value={selectedStudentToRemove}
                    onValueChange={setSelectedStudentToRemove}
                    disabled={!selectedCircleToRemove}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder={selectedCircleToRemove ? "اختر الطالب" : "اختر الحلقة أولاً"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStudentsToRemove.map((student: any) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setIsRemoveStudentDialogOpen(false); setSelectedCircleToRemove(""); setSelectedStudentToRemove("") }}
                  className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleRemoveStudent}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm h-9 rounded-lg font-medium"
                  disabled={!selectedStudentToRemove || !selectedCircleToRemove || isSubmitting}
                >
                  {isSubmitting ? "جاري الإزالة..." : "إزالة"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isMoveStudentDialogOpen} onOpenChange={setIsMoveStudentDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl text-[#1a2332]">نقل طالب</DialogTitle>
                <DialogDescription className="text-sm text-neutral-500">اختر الحلقة الحالية، ثم الطالب، ثم الحلقة المراد نقله إليها</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-neutral-600">
                    الحلقة الحالية
                  </Label>
                  <Select
                    value={moveSourceCircle}
                    onValueChange={(value) => {
                      setMoveSourceCircle(value)
                      setMoveStudentId("")
                    }}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {circles.map((circle) => (
                        <SelectItem key={circle.name} value={circle.name}>
                          {circle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1a2332]">
                    اختر الطالب
                  </Label>
                  <Select
                    value={moveStudentId}
                    onValueChange={setMoveStudentId}
                    disabled={!moveSourceCircle}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder={moveSourceCircle ? "اختر الطالب" : "اختر الحلقة أولاً"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStudentsToMove.map((student: any) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-[#1a2332]">
                    الحلقة المراد النقل إليها
                  </Label>
                  <Select
                    value={moveTargetCircle}
                    onValueChange={setMoveTargetCircle}
                    disabled={!moveStudentId}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder={moveStudentId ? "اختر الحلقة الجديدة" : "اختر الطالب أولاً"} />
                    </SelectTrigger>
                    <SelectContent>
                      {circles.map((circle) => (
                        <SelectItem key={'t_'+circle.name} value={circle.name}>
                          {circle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setIsMoveStudentDialogOpen(false); setMoveSourceCircle(""); setMoveStudentId(""); setMoveTargetCircle("") }}
                  className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleMoveStudent}
                  className="bg-[#D4AF37] hover:bg-[#C9A961] text-white text-sm h-9 rounded-lg font-medium"
                  disabled={!moveStudentId || !moveTargetCircle || isSubmitting}
                >
                  {isSubmitting ? "جاري النقل..." : "حفظ"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditStudentDialogOpen} onOpenChange={setIsEditStudentDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl text-[#1a2332]">تعديل بيانات الطالب</DialogTitle>
                <DialogDescription className="text-sm text-neutral-500">اختر الحلقة والطالب لتعديل معلوماته</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editCircleSelect" className="text-sm font-medium text-neutral-600">
                    اختر الحلقة
                  </Label>
                  <Select
                    value={selectedCircleForEdit}
                    onValueChange={(value) => {
                      setSelectedCircleForEdit(value)
                      setSelectedStudentForEdit("")
                      setEditingStudent(null)
                    }}
                  >
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {circles.map((circle) => (
                        <SelectItem key={circle.name} value={circle.name}>
                          {circle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStudentSelect" className="text-sm font-medium text-neutral-600">
                    اختر الطالب
                  </Label>
                  <Select
                    value={selectedStudentForEdit}
                    onValueChange={handleSelectStudentForEdit}
                    disabled={!selectedCircleForEdit}
                  >
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder={selectedCircleForEdit ? "اختر الطالب" : "اختر الحلقة أولاً"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(studentsInCircles[(selectedCircleForEdit || "").trim()] || []).map((student: any) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {editingStudent && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="editStudentIdNum" className="text-sm font-medium text-neutral-600">
                        رقم الهوية
                      </Label>
                      <Input
                        id="editStudentIdNum"
                        value={editStudentIdNumber}
                        onChange={(e) => setEditStudentIdNumber(e.target.value)}
                        placeholder="أدخل رقم الهوية"
                        className="text-sm"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editGuardianPhone" className="text-sm font-medium text-neutral-600">
                        رقم جوال ولي الأمر
                      </Label>
                      <Input
                        id="editGuardianPhone"
                        value={editGuardianPhone}
                        onChange={(e) => setEditGuardianPhone(e.target.value)}
                        placeholder="966501234567"
                        className="text-sm"
                        dir="ltr"
                      />
                      <p className="text-xs text-gray-500">مثال: 966501234567</p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setIsEditStudentDialogOpen(false); setEditingStudent(null) }}
                  className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleSaveStudentEdit}
                  className="border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#C9A961] hover:text-[#D4AF37] text-sm h-9 rounded-lg font-medium"
                  disabled={!editingStudent || isSubmitting}
                >
                  {isSubmitting ? "جاري الحفظ..." : "حفظ التعديلات"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isStudentRecordsDialogOpen} onOpenChange={setIsStudentRecordsDialogOpen}>
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl text-[#1a2332]">سجلات الطلاب</DialogTitle>
                <DialogDescription className="text-sm text-neutral-500">
                  اختر الحلقة والطالب لعرض سجلات الحضور والتقييم
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="recordsCircleSelect" className="text-sm font-medium text-neutral-600">
                    اختر الحلقة
                  </Label>
                  <Select
                    value={selectedCircleForRecords}
                    onValueChange={(value) => {
                      setSelectedCircleForRecords(value)
                      setSelectedStudentForRecords("")
                      setStudentRecords([])
                      setSelectedStudentName("")
                    }}
                  >
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {circles.map((circle) => (
                        <SelectItem key={circle.name} value={circle.name}>
                          {circle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recordsStudentSelect" className="text-sm font-medium text-neutral-600">
                    اختر الطالب
                  </Label>
                  <Select
                    value={selectedStudentForRecords}
                    onValueChange={handleSelectStudentForRecords}
                    disabled={!selectedCircleForRecords}
                  >
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder={selectedCircleForRecords ? "اختر الطالب" : "اختر الحلقة أولاً"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(studentsInCircles[(selectedCircleForRecords || "").trim()] || []).map((student: any) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedStudentForRecords && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-neutral-600 mb-4">سجلات الطالب: {selectedStudentName}</h3>
                    {isLoadingRecords ? (
                      <div className="text-center py-8 text-neutral-400 text-sm">جاري تحميل السجلات...</div>
                    ) : studentRecords.length === 0 ? (
                      <div className="text-center py-8 text-neutral-400 text-sm">لا توجد سجلات حضور لهذا الطالب</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">التاريخ</TableHead>
                            <TableHead className="text-right">الحالة</TableHead>
                            <TableHead className="text-right">الحفظ</TableHead>
                            <TableHead className="text-right">التكرار</TableHead>
                            <TableHead className="text-right">السماع</TableHead>
                            <TableHead className="text-right">الربط</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentRecords.map((record) => {
                            const lastEval = Array.isArray(record.evaluations) && record.evaluations.length > 0
                              ? record.evaluations[record.evaluations.length - 1]
                              : null;
                            console.log('[DEBUG][Dashboard] آخر تقييم:', lastEval);
                              if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><div className="w-8 h-8 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" /></div>);

  return (
                              <TableRow key={record.id}>
                                <TableCell className="font-medium">
                                  {new Date(record.date).toLocaleDateString("ar-SA")}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`px-2 py-1 rounded-full text-sm ${
                                      record.status === "present"
                                        ? "bg-green-100 text-green-800"
                                        : record.status === "absent"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-yellow-100 text-yellow-800"
                                    }`}
                                  >
                                    {translateStatus(record.status)}
                                  </span>
                                </TableCell>
                                <TableCell>{(record.status === "absent" || record.status === "excused") ? "لم يكمل" : (translateLevel(lastEval?.hafiz_level) || "-")}</TableCell>
                                <TableCell>{(record.status === "absent" || record.status === "excused") ? "لم يكمل" : (translateLevel(lastEval?.tikrar_level) || "-")}</TableCell>
                                <TableCell>{(record.status === "absent" || record.status === "excused") ? "لم يكمل" : (translateLevel(lastEval?.samaa_level) || "-")}</TableCell>
                                <TableCell>{(record.status === "absent" || record.status === "excused") ? "لم يكمل" : (translateLevel(lastEval?.rabet_level) || "-")}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => { setIsStudentRecordsDialogOpen(false); setSelectedCircleForRecords(""); setSelectedStudentForRecords(""); setStudentRecords([]) }}
                  className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600"
                >
                  إغلاق
                </Button>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={null}>
      <AdminDashboard />
    </Suspense>
  )
}
