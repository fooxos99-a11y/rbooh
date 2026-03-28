"use client";
import dynamic from "next/dynamic"
import React, { Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"

const GlobalAdminsDialog = dynamic(() => import("./admin-modals/global-admins-dialog").then((mod) => mod.GlobalAdminsDialog), {
  ssr: false,
  loading: () => null,
})
const GlobalCirclesDialog = dynamic(() => import("./admin-modals/global-circles-dialog").then((mod) => mod.GlobalCirclesDialog), {
  ssr: false,
  loading: () => null,
})
const GlobalTeachersDialog = dynamic(() => import("./admin-modals/global-teachers-dialog").then((mod) => mod.GlobalTeachersDialog), {
  ssr: false,
  loading: () => null,
})
const GlobalEditStudentDialog = dynamic(() => import("./admin-modals/global-edit-student-dialog").then((mod) => mod.GlobalEditStudentDialog), {
  ssr: false,
  loading: () => null,
})
const GlobalMoveStudentDialog = dynamic(() => import("./admin-modals/global-move-student-dialog").then((mod) => mod.GlobalMoveStudentDialog), {
  ssr: false,
  loading: () => null,
})
const GlobalRemoveStudentDialog = dynamic(() => import("./admin-modals/global-remove-student-dialog").then((mod) => mod.GlobalRemoveStudentDialog), {
  ssr: false,
  loading: () => null,
})
const GlobalBulkAddStudentDialog = dynamic(() => import("./admin-modals/global-bulk-add-student-dialog").then((mod) => mod.GlobalBulkAddStudentDialog), {
  ssr: false,
  loading: () => null,
})
const GlobalEditPointsDialog = dynamic(() => import("./admin-modals/global-edit-points-dialog").then((mod) => mod.GlobalEditPointsDialog), {
  ssr: false,
  loading: () => null,
})
const GlobalEndSemesterDialog = dynamic(() => import("./admin-modals/global-end-semester-dialog").then((mod) => mod.GlobalEndSemesterDialog), {
  ssr: false,
  loading: () => null,
})
const GlobalStudentRecordsDialog = dynamic(() => import("./admin-modals/global-student-records-dialog").then((mod) => mod.GlobalStudentRecordsDialog), {
  ssr: false,
  loading: () => null,
})

function AdminModalsContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const action = searchParams?.get("action")
  const isDashboard = pathname === "/admin/dashboard"
  const dashboardLocalActions = new Set([
    "bulk-add",
    "remove-student",
    "transfer-student",
    "edit-student",
    "edit-points",
    "student-records",
  ])

  if (isDashboard && action && dashboardLocalActions.has(action)) {
    return null
  }

  

  return (
    <>
      {action === 'teachers' && <GlobalTeachersDialog />}
      {action === 'circles' && <GlobalCirclesDialog />}
      {action === 'admins' && <GlobalAdminsDialog />}
      {action === 'student-records' && <GlobalStudentRecordsDialog />}
      {action === 'bulk-add' && <GlobalBulkAddStudentDialog />}
      {action === 'remove-student' && <GlobalRemoveStudentDialog />}
      {action === 'transfer-student' && <GlobalMoveStudentDialog />}
      {action === 'edit-student' && <GlobalEditStudentDialog />}
      {action === 'edit-points' && <GlobalEditPointsDialog />}
      {action === 'end-semester' && <GlobalEndSemesterDialog />}

      
      
      
    </>
  )
}

export function GlobalAdminModals() {
  return (
    <Suspense fallback={null}>
      <AdminModalsContent />
    </Suspense>
  )
}
