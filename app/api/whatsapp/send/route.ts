import { NextResponse } from "next/server"
import { getWhatsAppRuntimeConfig } from "@/lib/whatsapp-config"
import { readWhatsAppWorkerStatus } from "@/lib/whatsapp-worker-status"

function shouldUseWorkerMode() {
  return (process.env.RBOH_WHATSAPP_SEND_MODE || "").trim().toLowerCase() === "worker"
}

async function shouldSendViaWorker() {
  if (shouldUseWorkerMode()) {
    return true
  }

  try {
    const workerStatus = await readWhatsAppWorkerStatus()
    return Boolean(workerStatus.workerOnline && workerStatus.authenticated && workerStatus.ready && workerStatus.status === "connected")
  } catch {
    return false
  }
}

/**
 * WhatsApp Cloud API - Send Message Endpoint
 * POST /api/whatsapp/send
 * 
 * يرسل رسالة واتساب إلى رقم محدد
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phoneNumber, message, userId } = body

    // التحقق من البيانات المطلوبة
    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: "رقم الهاتف والرسالة مطلوبان" },
        { status: 400 }
      )
    }

    if (await shouldSendViaWorker()) {
      const cleanedPhone = phoneNumber.replace(/[^0-9]/g, "")
      const { createAdminClient } = await import("@/lib/supabase/admin")
      const supabase = createAdminClient()
      const queueId = crypto.randomUUID()

      const { error: queueError } = await supabase.from("whatsapp_queue").insert({
        id: queueId,
        phone_number: cleanedPhone,
        message,
        status: "pending",
      })

      if (queueError) {
        console.error("[WhatsApp Queue] Enqueue error:", queueError)
        return NextResponse.json({ error: "فشل في إضافة الرسالة إلى طابور الإرسال" }, { status: 500 })
      }

      await saveMessageToDatabase({
        id: queueId,
        phoneNumber: cleanedPhone,
        message,
        status: "pending",
        userId,
      })

      return NextResponse.json({
        success: true,
        queued: true,
        queueId,
        message: "تمت إضافة الرسالة إلى طابور الإرسال بنجاح",
      })
    }

    // الحصول على معلومات WhatsApp API من المتغيرات البيئية
    const { phoneNumberId, accessToken, apiVersion } = getWhatsAppRuntimeConfig()

    if (!phoneNumberId || !accessToken) {
      console.error("[WhatsApp] Missing configuration")
      return NextResponse.json(
        { error: "WhatsApp API غير مكون بشكل صحيح" },
        { status: 500 }
      )
    }

    // تنظيف رقم الهاتف (إزالة + و مسافات)
    const cleanedPhone = phoneNumber.replace(/[^0-9]/g, "")

    // إرسال الرسالة عبر WhatsApp Cloud API
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanedPhone,
          type: "text",
          text: {
            body: message,
          },
        }),
      }
    )

    const whatsappData = await whatsappResponse.json()

    if (!whatsappResponse.ok) {
      console.error("[WhatsApp] Send error:", whatsappData)
      
      // حفظ الرسالة الفاشلة في قاعدة البيانات
      await saveMessageToDatabase({
        phoneNumber: cleanedPhone,
        message,
        status: "failed",
        errorMessage: JSON.stringify(whatsappData.error),
        userId,
      })

      return NextResponse.json(
        { 
          error: "فشل إرسال الرسالة",
          details: whatsappData.error?.message || "خطأ غير معروف"
        },
        { status: 500 }
      )
    }

    // حفظ الرسالة الناجحة في قاعدة البيانات
    const messageId = whatsappData.messages?.[0]?.id
    const savedMessage = await saveMessageToDatabase({
      phoneNumber: cleanedPhone,
      message,
      status: "sent",
      messageId,
      userId,
    })

    return NextResponse.json({
      success: true,
      messageId,
      savedMessage,
      message: "تم إرسال الرسالة بنجاح",
    })
  } catch (error) {
    console.error("[WhatsApp] Send error:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء إرسال الرسالة" },
      { status: 500 }
    )
  }
}

/**
 * حفظ الرسالة في قاعدة البيانات
 */
async function saveMessageToDatabase(data: {
  id?: string
  phoneNumber: string
  message: string
  status: string
  messageId?: string
  errorMessage?: string
  userId?: string
}) {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    const { data: savedMessage, error } = await supabase
      .from("whatsapp_messages")
      .insert({
        id: data.id,
        phone_number: data.phoneNumber,
        message_text: data.message,
        status: data.status,
        message_id: data.messageId,
        error_message: data.errorMessage,
        sent_by: data.userId,
      })
      .select()
      .single()

    if (error) {
      console.error("[Database] Error saving message:", error)
      return null
    }

    return savedMessage
  } catch (error) {
    console.error("[Database] Error:", error)
    return null
  }
}

/**
 * GET /api/whatsapp/send
 * الحصول على قائمة الرسائل المرسلة
 */
export async function GET() {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    const { data: messages, error } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("[Database] Error fetching messages:", error)
      return NextResponse.json(
        { error: "فشل في جلب الرسائل" },
        { status: 500 }
      )
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("[WhatsApp] Get messages error:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الرسائل" },
      { status: 500 }
    )
  }
}
