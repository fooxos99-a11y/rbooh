"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, LogOut, QrCode, RefreshCw, Smartphone } from "lucide-react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteLoader } from "@/components/ui/site-loader"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useAlertDialog, useConfirmDialog } from "@/hooks/use-confirm-dialog"

type WhatsAppStatusResponse = {
	status: string
	qrAvailable: boolean
	ready: boolean
	authenticated: boolean
	lastUpdatedAt: string | null
	lastHeartbeatAt: string | null
	qrUpdatedAt: string | null
	connectedAt: string | null
	disconnectedAt: string | null
	authFailedAt: string | null
	lastError: string | null
	workerOnline: boolean
	qrImageUrl: string | null
}

const DEFAULT_STATUS: WhatsAppStatusResponse = {
	status: "not_started",
	qrAvailable: false,
	ready: false,
	authenticated: false,
	lastUpdatedAt: null,
	lastHeartbeatAt: null,
	qrUpdatedAt: null,
	connectedAt: null,
	disconnectedAt: null,
	authFailedAt: null,
	lastError: null,
	workerOnline: false,
	qrImageUrl: null,
}

function getAutoRefreshIntervalMs(status: WhatsAppStatusResponse) {
	if (status.ready) return 0

	switch (status.status) {
		case "authenticating":
		case "disconnecting":
		case "fetching_qr":
		case "starting":
			return 1200
		case "waiting_for_qr":
			return 1500
		default:
			return 0
	}
}

function getStatusUi(status: WhatsAppStatusResponse) {
	if (status.ready && status.authenticated && status.status === "connected") {
		return {
			label: "تم الربط",
			tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
			description: "الواتساب متصل وجاهز للإرسال.",
		}
	}

	if (!status.workerOnline) {
		return {
			label: "عامل واتساب غير متصل",
			tone: "bg-rose-50 text-rose-700 border-rose-200",
			description: "العامل المسؤول عن واتساب غير متصل حالياً، لذلك لن يظهر باركود جديد حتى يعود للعمل.",
		}
	}

	switch (status.status) {
		case "waiting_for_qr":
			return {
				label: "الباركود جاهز",
				tone: "bg-amber-50 text-amber-700 border-amber-200",
					description: "الباركود جاهز لإكمال الربط.",
			}
		case "authenticating":
			return {
				label: "جاري التحقق",
				tone: "bg-sky-50 text-sky-700 border-sky-200",
					description: "تمت قراءة الباركود بالفعل. لا تعِد مسحه مرة ثانية، فقط انتظر حتى يكتمل الربط.",
			}
		case "auth_failed":
			return {
				label: "فشل الربط",
				tone: "bg-rose-50 text-rose-700 border-rose-200",
				description: "فشل التحقق من الجلسة، وقد تحتاج إلى مسح باركود جديد.",
			}
		case "disconnected":
			return {
				label: "انقطع الاتصال",
				tone: "bg-orange-50 text-orange-700 border-orange-200",
				description: "الجلسة انقطعت. انتظر باركودًا جديدًا أو أعد الربط.",
			}
		case "starting":
		case "disconnecting":
		case "fetching_qr":
			return {
				label: "جاري جلب الباركود",
				tone: "bg-slate-100 text-slate-700 border-slate-200",
				description: "يتم تجهيز الجلسة أو تجديدها الآن.",
			}
		default:
			return {
				label: "بانتظار الباركود",
				tone: "bg-slate-100 text-slate-700 border-slate-200",
				description: "لم تظهر جلسة واتساب جاهزة حتى الآن.",
			}
	}
}

function formatDateTime(value: string | null) {
	if (!value) return "-"

	try {
		return new Intl.DateTimeFormat("ar-SA", {
			dateStyle: "medium",
			timeStyle: "short",
			timeZone: "Asia/Riyadh",
		}).format(new Date(value))
	} catch {
		return value
	}
}

export default function WhatsAppQrPage() {
	const router = useRouter()
	const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("الإرسال إلى أولياء الأمور")
	const confirmDialog = useConfirmDialog()
	const alertDialog = useAlertDialog()
	const [status, setStatus] = useState<WhatsAppStatusResponse>(DEFAULT_STATUS)
	const [isLoadingStatus, setIsLoadingStatus] = useState(true)
	const [imageFailed, setImageFailed] = useState(false)
	const [isDisconnecting, setIsDisconnecting] = useState(false)
	const statusUi = getStatusUi(status)
	const canDisconnect = status.ready && status.authenticated && status.status === "connected" && !isDisconnecting
	const autoRefreshIntervalMs = getAutoRefreshIntervalMs(status)

	const fetchStatus = async ({ silent = false }: { silent?: boolean } = {}) => {
		try {
			if (!silent) setIsLoadingStatus(true)

			const response = await fetch(`/api/whatsapp/status?t=${Date.now()}`, { cache: "no-store" })
			if (!response.ok) {
				throw new Error("تعذر جلب حالة واتساب")
			}

			const data = (await response.json()) as WhatsAppStatusResponse
			setStatus({ ...DEFAULT_STATUS, ...data })
			setImageFailed(false)
		} catch (error) {
			console.error("[whatsapp-qr] fetch status:", error)
		} finally {
			if (!silent) setIsLoadingStatus(false)
		}
	}

	useEffect(() => {
		const loggedIn = localStorage.getItem("isLoggedIn") === "true"
		const userRole = localStorage.getItem("userRole")

		if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
			router.push("/login")
			return
		}

		void fetchStatus()
	}, [router])

	useEffect(() => {
		if (autoRefreshIntervalMs <= 0) return

		const intervalId = window.setInterval(() => {
			void fetchStatus({ silent: true })
		}, autoRefreshIntervalMs)

		return () => window.clearInterval(intervalId)
	}, [autoRefreshIntervalMs])

	const handleDisconnect = async () => {
		const confirmed = await confirmDialog({
			title: "إلغاء ربط واتساب",
			description: "سيتم فصل الجوال الحالي وإنشاء باركود جديد لتتمكن من ربط جوال آخر. هل تريد المتابعة؟",
			confirmText: "إلغاء الربط",
			cancelText: "تراجع",
		})

		if (!confirmed) return

		try {
			setIsDisconnecting(true)
			const response = await fetch("/api/whatsapp/disconnect", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			})

			const data = await response.json().catch(() => null)
			if (!response.ok) {
				throw new Error(data?.error || "تعذر إلغاء الربط")
			}

			setStatus((current) => ({
				...current,
				status: "fetching_qr",
				ready: false,
				authenticated: false,
				qrAvailable: false,
				qrImageUrl: null,
			}))

			await alertDialog("تم إرسال طلب إلغاء الربط. سيظهر باركود جديد بعد لحظات لربط جوال آخر.", "تم")
			await fetchStatus()
		} catch (error) {
			await alertDialog(error instanceof Error ? error.message : "تعذر إلغاء الربط حالياً", "خطأ")
		} finally {
			setIsDisconnecting(false)
		}
	}

	if (authLoading || !authVerified || isLoadingStatus) {
		return <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>
	}

	return (
		<div className="min-h-screen bg-[#fafaf9]" dir="rtl">
			<Header />
			<main className="px-4 py-8 md:py-10">
				<div className="mx-auto max-w-5xl space-y-6">
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-2 text-right">
							<h1 className="text-3xl font-black text-[#1a2332]">باركود الواتساب</h1>
							<p className="text-sm font-bold text-[#64748b]">ربط واتساب الخاص بموقع ربوة فقط عبر عامل مستقل على الـ VPS.</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button type="button" variant="outline" onClick={() => void fetchStatus()} className="h-10 rounded-2xl border-[#d7e3f2] bg-white px-3 text-sm font-black text-[#3453a7] hover:bg-[#f8fbff]">
								<RefreshCw className="me-1.5 h-4 w-4" /> تحديث
							</Button>
							{canDisconnect ? <Button type="button" onClick={handleDisconnect} disabled={isDisconnecting} variant="outline" className="h-10 rounded-2xl border-rose-200 bg-rose-50 px-3 text-sm font-black text-rose-700 hover:bg-rose-100"><LogOut className="me-1.5 h-4 w-4" />{isDisconnecting ? "جاري الإلغاء..." : "إلغاء الربط"}</Button> : null}
						</div>
					</div>

					<div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${statusUi.tone}`}>
						{statusUi.label}: {statusUi.description}
					</div>

					<div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
						<Card className="rounded-[28px] border-[#d8e0f0]">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-xl font-black text-[#1a2332]"><QrCode className="h-5 w-5 text-[#3453a7]" />الباركود</CardTitle>
							</CardHeader>
							<CardContent>
								{status.qrAvailable && status.qrImageUrl && !imageFailed ? (
									<div className="flex justify-center rounded-[24px] border border-dashed border-[#cfdcf2] bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fbff_55%,#eef3ff_100%)] p-4">
										<img src={status.qrImageUrl} alt="باركود واتساب" className="h-auto w-full max-w-[320px] rounded-2xl bg-white p-3 shadow-[0_14px_40px_rgba(20,39,92,0.10)]" onError={() => setImageFailed(true)} />
									</div>
								) : (
									<div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-[#d5dfef] bg-[linear-gradient(180deg,#fbfcff_0%,#f2f6ff_100%)] px-5 py-8 text-center">
										{status.ready ? <CheckCircle2 className="h-14 w-14 text-emerald-500" /> : status.workerOnline ? <Smartphone className="h-14 w-14 text-[#3453a7]" /> : <AlertTriangle className="h-14 w-14 text-rose-500" />}
										<div className="space-y-2">
											<p className="text-lg font-black text-[#1a2332]">{statusUi.label}</p>
											<p className="text-sm font-bold text-[#64748b]">{statusUi.description}</p>
										</div>
									</div>
								)}
							</CardContent>
						</Card>

						<Card className="rounded-[28px] border-[#d8e0f0]">
							<CardHeader>
								<CardTitle className="text-xl font-black text-[#1a2332]">حالة الربط</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3 text-sm font-bold text-[#475569]">
								<div className="flex items-center justify-between rounded-2xl bg-[#f8fbff] px-4 py-3"><span>الحالة</span><span>{status.status || "-"}</span></div>
								<div className="flex items-center justify-between rounded-2xl bg-[#f8fbff] px-4 py-3"><span>اتصال العامل</span><span>{status.workerOnline ? "متصل" : "غير متصل"}</span></div>
								<div className="flex items-center justify-between rounded-2xl bg-[#f8fbff] px-4 py-3"><span>جاهزية الإرسال</span><span>{status.ready ? "جاهز" : "غير جاهز"}</span></div>
								<div className="flex items-center justify-between rounded-2xl bg-[#f8fbff] px-4 py-3"><span>آخر نبضة</span><span>{formatDateTime(status.lastHeartbeatAt)}</span></div>
								<div className="flex items-center justify-between rounded-2xl bg-[#f8fbff] px-4 py-3"><span>آخر تحديث QR</span><span>{formatDateTime(status.qrUpdatedAt)}</span></div>
								<div className="flex items-center justify-between rounded-2xl bg-[#f8fbff] px-4 py-3"><span>آخر اتصال</span><span>{formatDateTime(status.connectedAt)}</span></div>
								{status.lastError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">آخر ملاحظة من العامل: {status.lastError}</div> : null}
							</CardContent>
						</Card>
					</div>
				</div>
			</main>
			<Footer />
		</div>
	)
}
