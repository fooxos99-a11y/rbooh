"use client"







import { useEffect, useState } from "react"







import { Footer } from "@/components/footer"



import { Header } from "@/components/header"



import { PathwayTestsTab } from "@/components/admin/pathway-tests-tab"



import { SiteLoader } from "@/components/ui/site-loader"



import { redirect } from "next/navigation"

export default function AdminPathwaysPage() {
	redirect("/admin/exams")
}