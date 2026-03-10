"use client";
import { GlobalAdminsDialog } from "./admin-modals/global-admins-dialog"
import { GlobalCirclesDialog } from "./admin-modals/global-circles-dialog"
import { GlobalEditStudentDialog } from "./admin-modals/global-edit-student-dialog"
import { GlobalMoveStudentDialog } from "./admin-modals/global-move-student-dialog"
import { GlobalRemoveStudentDialog } from "./admin-modals/global-remove-student-dialog"

import React, { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { GlobalBulkAddStudentDialog } from "./admin-modals/global-bulk-add-student-dialog"
import { GlobalEditPointsDialog } from "./admin-modals/global-edit-points-dialog"
import { GlobalStudentRecordsDialog } from "./admin-modals/global-student-records-dialog"
import { GlobalTeachersDialog } from "./admin-modals/global-teachers-dialog"

function AdminModalsContent() {
  const searchParams = useSearchParams()
  const action = searchParams?.get("action")

  

  return (
    <>
      {action === 'student-records' && <GlobalStudentRecordsDialog />}
      {action === 'bulk-add' && <GlobalBulkAddStudentDialog />}
      {action === 'remove-student' && <GlobalRemoveStudentDialog />}
      {action === 'transfer-student' && <GlobalMoveStudentDialog />}
      {action === 'edit-student' && <GlobalEditStudentDialog />}
      {action === 'edit-points' && <GlobalEditPointsDialog />}
      {action === 'teachers' && <GlobalTeachersDialog />}
      {action === 'circles' && <GlobalCirclesDialog />}
      {action === 'admins' && <GlobalAdminsDialog />}

      
      
      
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
