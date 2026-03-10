import { NextRequest, NextResponse } from "next/server"
import { getSiteSetting, upsertSiteSetting } from "@/lib/site-settings"

export async function GET(request: NextRequest) {
	try {
		const id = request.nextUrl.searchParams.get("id")

		if (!id) {
			return NextResponse.json({ error: "معرف الإعداد مطلوب" }, { status: 400 })
		}

		const value = await getSiteSetting(id, null)
		return NextResponse.json({ id, value })
	} catch (error) {
		console.error("[site-settings][GET]", error)
		return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const body = await request.json()
		const { id, value } = body

		if (!id) {
			return NextResponse.json({ error: "معرف الإعداد مطلوب" }, { status: 400 })
		}

		const { data, error } = await upsertSiteSetting(id, value)

		if (error) {
			console.error("[site-settings][PATCH]", error)
			return NextResponse.json({ error: "فشل في حفظ الإعداد" }, { status: 500 })
		}

		return NextResponse.json({ success: true, setting: data })
	} catch (error) {
		console.error("[site-settings][PATCH]", error)
		return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
	}
}