"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { SiteLoader } from "@/components/ui/site-loader"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useToast } from "@/hooks/use-toast"
import {
	ABSENCE_ALERT_THRESHOLDS,
	DEFAULT_ABSENCE_ALERT_TEMPLATES,
	normalizeAbsenceAlertTemplates,
	STUDENT_ABSENCE_ALERT_SETTING_ID,
	type AbsenceAlertTemplates,
} from "@/lib/student-absence"
import { BellRing } from "lucide-react"

interface AbsenceRow {
	id: string
	name: string
	account_number: string | number | null
	halaqah: string
	absentCount: number
	excusedCount: number
	effectiveAbsenceCount: number
}

export default function AdminAbsencesPage() {
	const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("التقارير")
	const { toast } = useToast()
	const [isLoading, setIsLoading] = useState(true)
	const [isSavingTemplates, setIsSavingTemplates] = useState(false)
	const [rows, setRows] = useState<AbsenceRow[]>([])
	const [circles, setCircles] = useState<string[]>([])
	const [selectedCircle, setSelectedCircle] = useState("all")
	const [templates, setTemplates] = useState<AbsenceAlertTemplates>(DEFAULT_ABSENCE_ALERT_TEMPLATES)
	const [isTemplatesDialogOpen, setIsTemplatesDialogOpen] = useState(false)

	useEffect(() => {
		if (!authLoading && authVerified) {
			void Promise.all([fetchAbsences(), fetchTemplates()]).finally(() => setIsLoading(false))
		}
	}, [authLoading, authVerified])

	const fetchAbsences = async () => {
		const response = await fetch("/api/admin-absences", { cache: "no-store" })
		const data = await response.json()
		if (!response.ok) {
			throw new Error(data.error || "تعذر جلب بيانات الغيابات")
		}
		setRows(Array.isArray(data.rows) ? data.rows : [])
		setCircles(Array.isArray(data.circles) ? data.circles : [])
	}

	const fetchTemplates = async () => {
		const response = await fetch(`/api/site-settings?id=${STUDENT_ABSENCE_ALERT_SETTING_ID}`, { cache: "no-store" })
		const data = await response.json()
		setTemplates(normalizeAbsenceAlertTemplates(data.value))
	}

	const filteredRows = useMemo(() => {
		return rows.filter((row) => {
			return selectedCircle === "all" ? true : row.halaqah === selectedCircle
		})
	}, [rows, selectedCircle])

	const handleSaveTemplates = async () => {
		try {
			setIsSavingTemplates(true)
			const response = await fetch("/api/site-settings", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: STUDENT_ABSENCE_ALERT_SETTING_ID,
					value: templates,
				}),
			})
			const data = await response.json()
			if (!response.ok || !data.success) {
				throw new Error(data.error || "تعذر حفظ نصوص التنبيهات")
			}

			toast({ title: "تم الحفظ", description: "تم تحديث نصوص تنبيهات الغياب بنجاح" })
		} catch (error) {
			toast({
				title: "خطأ",
				description: error instanceof Error ? error.message : "حدث خطأ أثناء حفظ النصوص",
				variant: "destructive",
			})
		} finally {
			setIsSavingTemplates(false)
		}
	}

	if (authLoading || !authVerified || isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f5f1e8] to-white">
				<SiteLoader size="lg" />
			</div>
		)
	}

	return (
		<div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
			<Header />
			<main className="flex-1 px-4 py-6 md:px-6 md:py-10">
				<div className="container mx-auto max-w-7xl space-y-6">
					<section className="rounded-[32px] border border-[#D4AF37]/20 bg-white/90 p-6 shadow-sm">
						<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
							<div className="text-right">
								<p className="text-sm font-extrabold tracking-[0.18em] text-[#b38a1e]">التقارير</p>
								<h1 className="mt-2 text-3xl font-black text-[#1a2332]">الغيابات</h1>
							</div>
							<div className="flex flex-wrap items-center justify-end gap-3">
								<Select value={selectedCircle} onValueChange={setSelectedCircle}>
									<SelectTrigger className="h-11 w-[140px] border-[#D4AF37]/40 text-right">
										<SelectValue placeholder="كل الحلقات" />
									</SelectTrigger>
									<SelectContent dir="rtl">
										<SelectItem value="all">كل الحلقات</SelectItem>
										{circles.map((circle) => (
											<SelectItem key={circle} value={circle}>{circle}</SelectItem>
										))}
									</SelectContent>
								</Select>
								<Button
									onClick={() => setIsTemplatesDialogOpen(true)}
									className="h-11 rounded-xl bg-[#d8a355] px-6 text-white hover:bg-[#c99347]"
								>
									تنبيهات الغياب
								</Button>
							</div>
						</div>
					</section>

					<Card className="border border-[#D4AF37]/20 bg-white/90 shadow-sm">
						<CardHeader className="pb-2">
							<CardTitle className="text-right text-2xl font-black text-[#1a2332]">سجل غيابات الطلاب</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="overflow-x-auto rounded-2xl border border-[#D4AF37]/15">
								<Table>
									<TableHeader>
										<TableRow className="bg-[#f8f4e8] hover:bg-[#f8f4e8]">
											<TableHead className="text-right font-black text-[#1a2332]">الطالب</TableHead>
											<TableHead className="text-right font-black text-[#1a2332]">الحلقة</TableHead>
											<TableHead className="text-center font-black text-[#1a2332]">غياب</TableHead>
											<TableHead className="text-center font-black text-[#1a2332]">استئذان</TableHead>
											<TableHead className="text-center font-black text-[#1a2332]">الغياب المحتسب</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredRows.length === 0 ? (
											<TableRow>
												<TableCell colSpan={5} className="py-12 text-center text-[#8b6b3f]">لا توجد بيانات للعرض</TableCell>
											</TableRow>
										) : (
											filteredRows.map((row) => (
												<TableRow key={row.id} className="hover:bg-[#fcfaf3]">
													<TableCell className="text-right">
														<div>
															<p className="font-bold text-[#1a2332]">{row.name}</p>
															<p className="mt-1 text-xs font-semibold text-[#8b6b3f]">{row.account_number || "بدون رقم حساب"}</p>
														</div>
													</TableCell>
													<TableCell className="text-right font-semibold text-[#4b5563]">{row.halaqah || "—"}</TableCell>
													<TableCell className="text-center font-black text-red-600">{row.absentCount}</TableCell>
													<TableCell className="text-center font-black text-amber-600">{row.excusedCount}</TableCell>
													<TableCell className="text-center">
														<span className="inline-flex min-w-12 items-center justify-center rounded-full bg-[#D4AF37]/12 px-3 py-1 font-black text-[#8b6b16]">
															{row.effectiveAbsenceCount}
														</span>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</div>
						</CardContent>
					</Card>

				</div>
			</main>
			<Footer />
			<Dialog open={isTemplatesDialogOpen} onOpenChange={setIsTemplatesDialogOpen}>
				<DialogContent showCloseButton={false} className="max-w-4xl border border-[#D4AF37]/20 bg-[#fffdf8]" dir="rtl">
					<DialogTitle className="text-right text-2xl font-black text-[#1a2332]">تنبيهات الغياب</DialogTitle>
					<div className="space-y-4">
						<div className="grid gap-4 lg:grid-cols-2">
							{ABSENCE_ALERT_THRESHOLDS.map((threshold) => (
								<div key={threshold} className="rounded-3xl border border-[#D4AF37]/15 bg-white p-4">
									<div className="mb-3 flex items-center justify-between gap-3">
										<div className="flex items-center gap-2">
											<BellRing className="h-5 w-5 text-[#d8a355]" />
											<span className="font-black text-[#1a2332]">تنبيه {threshold} {threshold === 1 ? "غياب" : "غيابات"}</span>
										</div>
										<span className="rounded-full bg-[#D4AF37]/14 px-3 py-1 text-xs font-black text-[#8b6b16]">عند الوصول إلى {threshold}</span>
									</div>
									<Textarea
										value={templates[String(threshold) as keyof AbsenceAlertTemplates]}
										onChange={(event) =>
											setTemplates((current) => ({
												...current,
												[String(threshold)]: event.target.value,
											}))
										}
										className="min-h-[120px] border-[#D4AF37]/35 bg-white text-right focus-visible:ring-[#D4AF37]/35"
									/>
								</div>
							))}
						</div>
						<div className="flex justify-end gap-3">
							<Button
								variant="outline"
								onClick={() => setIsTemplatesDialogOpen(false)}
								className="h-11 rounded-xl border-[#D4AF37]/45 bg-white px-6 text-[#1a2332] hover:bg-[#f8f3df]"
							>
								إغلاق
							</Button>
							<Button onClick={handleSaveTemplates} disabled={isSavingTemplates} className="h-11 rounded-xl bg-[#d8a355] px-6 text-white hover:bg-[#c99347] disabled:opacity-60">
								{isSavingTemplates ? "جاري الحفظ..." : "حفظ النصوص"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}