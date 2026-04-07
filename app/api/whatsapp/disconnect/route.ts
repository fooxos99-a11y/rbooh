import { type NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getRequestActor, isAdminRole } from "@/lib/request-auth"
import { WHATSAPP_WORKER_COMMAND_SETTING_ID, WHATSAPP_WORKER_STATE_SETTING_ID } from "@/lib/site-settings-constants"
import { readWhatsAppWorkerStatus } from "@/lib/whatsapp-worker-status"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function POST(request: NextRequest) {
	const supabase = createAdminClient()
	const actor = await getRequestActor(request, supabase as never)

	if (!actor) {
		return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 })
	}

	if (!isAdminRole(actor.role)) {
		return NextResponse.json({ error: "ليس لديك صلاحية الوصول" }, { status: 403 })
	}

	try {
		const status = await readWhatsAppWorkerStatus()
		if (!status.workerOnline) {
			return NextResponse.json({ error: "عامل واتساب غير متصل حالياً" }, { status: 409 })
		}

		const requestedAt = new Date().toISOString()

		const { error } = await supabase.from("site_settings").upsert(
			[
				{
					id: WHATSAPP_WORKER_COMMAND_SETTING_ID,
					value: { action: "disconnect", requestedAt },
				},
				{
					id: WHATSAPP_WORKER_STATE_SETTING_ID,
					value: {
						status: "disconnecting",
						ready: false,
						authenticated: false,
						qrAvailable: false,
						qrValue: null,
						connectedAt: status.connectedAt,
						disconnectedAt: requestedAt,
						authFailedAt: status.authFailedAt,
						qrUpdatedAt: null,
						lastError: null,
						lastHeartbeatAt: status.lastHeartbeatAt || requestedAt,
						lastUpdatedAt: requestedAt,
					},
				},
			],
			{ onConflict: "id" },
		)

		if (error) {
			throw error
		}

		return NextResponse.json({ success: true, message: "تم إرسال طلب إلغاء الربط" })
	} catch (error) {
		console.error("[WhatsApp] Disconnect error:", error)
		return NextResponse.json({ error: "تعذر إلغاء الربط حالياً" }, { status: 500 })
	}
}
