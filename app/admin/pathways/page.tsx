"use client"







import { useEffect, useState } from "react"







import { Footer } from "@/components/footer"



import { Header } from "@/components/header"



import { PathwayTestsTab } from "@/components/admin/pathway-tests-tab"



import { SiteLoader } from "@/components/ui/site-loader"



import { useAdminAuth } from "@/hooks/use-admin-auth"







export default function AdminPathwaysPage() {



const { isLoading: authLoading, isVerified: authVerified, role, isFullAccess } = useAdminAuth("إدارة المسار")



const [canManagePathway, setCanManagePathway] = useState(false)



const [loadingPermissions, setLoadingPermissions] = useState(true)







useEffect(() => {



if (!authVerified) return







const loadPermissions = async () => {



if (isFullAccess) {



setCanManagePathway(true)



setLoadingPermissions(false)



return



}







try {



const response = await fetch("/api/roles")



const data = await response.json()



const permissionsMap: Record<string, string[]> = data.permissions || {}



const currentPermissions = permissionsMap[role] || []







setCanManagePathway(currentPermissions.includes("إدارة المسار"))



setCanManagePathway(currentPermissions.includes("إدارة المسار"))



} catch {



setCanManagePathway(false)



} finally {



setLoadingPermissions(false)



}



}







void loadPermissions()



}, [authVerified, isFullAccess, role])







if (authLoading || !authVerified || loadingPermissions) {



return <SiteLoader fullScreen />



}







return (



<div dir="rtl" className="min-h-screen flex flex-col bg-[#fafaf9]">



<Header />



<main className="flex-1 py-10 px-4">



<div className="container mx-auto max-w-6xl">



<PathwayTestsTab



canManageSetup={canManagePathway}



canManageTests={canManagePathway}



/>



</div>



</main>



<Footer />



</div>



)



}