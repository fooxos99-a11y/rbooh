import { getWhatsAppRuntimeConfig } from "@/lib/whatsapp-config"
import { readWhatsAppWorkerStatus } from "@/lib/whatsapp-worker-status"

type SupabaseLike = {
  from: (table: string) => {
    insert: (value: any) => any
  }
}

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

export async function insertAppNotification(
  supabase: SupabaseLike,
  accountNumber: string | number | null | undefined,
  message: string,
) {
  const normalizedAccountNumber = String(accountNumber || "").trim()
  const normalizedMessage = String(message || "").trim()

  if (!normalizedAccountNumber || !normalizedMessage) {
    return { inserted: false, skipped: true as const }
  }

  const { error } = await supabase.from("notifications").insert({
    user_account_number: normalizedAccountNumber,
    message: normalizedMessage,
  })

  if (error) {
    throw error
  }

  return { inserted: true, skipped: false as const }
}

async function saveWhatsAppMessageRecord(
  supabase: SupabaseLike,
  params: {
    id?: string
    phoneNumber: string
    message: string
    status: "pending" | "sent" | "failed"
    messageId?: string
    errorMessage?: string
    userId?: string | null
  },
) {
  await supabase.from("whatsapp_messages").insert({
    id: params.id || undefined,
    phone_number: params.phoneNumber,
    message_text: params.message,
    status: params.status,
    message_id: params.messageId || null,
    error_message: params.errorMessage || null,
    sent_by: params.userId || null,
  })
}

export async function sendGuardianWhatsAppMessage(
  supabase: SupabaseLike,
  params: {
    phoneNumber?: string | null
    message: string
    userId?: string | null
  },
) {
  const cleanedPhone = String(params.phoneNumber || "").replace(/[^0-9]/g, "")
  const normalizedMessage = String(params.message || "").trim()

  if (!cleanedPhone || !normalizedMessage) {
    return { sent: false, queued: false, skipped: true as const, reason: "missing-phone-or-message" as const }
  }

  if (await shouldSendViaWorker()) {
    const queueId = crypto.randomUUID()
    const { error: queueError } = await supabase.from("whatsapp_queue").insert({
      id: queueId,
      phone_number: cleanedPhone,
      message: normalizedMessage,
      status: "pending",
    })

    if (queueError) {
      await saveWhatsAppMessageRecord(supabase, {
        phoneNumber: cleanedPhone,
        message: normalizedMessage,
        status: "failed",
        errorMessage: queueError.message || "فشل في إضافة الرسالة إلى طابور الإرسال",
        userId: params.userId,
      })
      return { sent: false, queued: false, skipped: false as const, reason: "queue-failed" as const }
    }

    await saveWhatsAppMessageRecord(supabase, {
      id: queueId,
      phoneNumber: cleanedPhone,
      message: normalizedMessage,
      status: "pending",
      userId: params.userId,
    })

    return { sent: false, queued: true, skipped: false as const, queueId }
  }

  const { phoneNumberId, accessToken, apiVersion } = getWhatsAppRuntimeConfig()

  if (!phoneNumberId || !accessToken) {
    await saveWhatsAppMessageRecord(supabase, {
      phoneNumber: cleanedPhone,
      message: normalizedMessage,
      status: "failed",
      errorMessage: "WhatsApp API غير مكون بشكل صحيح",
      userId: params.userId,
    })
    return { sent: false, queued: false, skipped: true as const, reason: "missing-config" as const }
  }

  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: cleanedPhone,
      type: "text",
      text: { body: normalizedMessage },
    }),
  })

  const responseData = await response.json()

  if (!response.ok) {
    await saveWhatsAppMessageRecord(supabase, {
      phoneNumber: cleanedPhone,
      message: normalizedMessage,
      status: "failed",
      errorMessage: JSON.stringify(responseData?.error || responseData),
      userId: params.userId,
    })
    return { sent: false, queued: false, skipped: false as const, reason: "send-failed" as const, details: responseData }
  }

  await saveWhatsAppMessageRecord(supabase, {
    phoneNumber: cleanedPhone,
    message: normalizedMessage,
    status: "sent",
    messageId: responseData?.messages?.[0]?.id,
    userId: params.userId,
  })

  return { sent: true, queued: false, skipped: false as const }
}

export async function notifyGuardian(
  supabase: SupabaseLike,
  params: {
    accountNumber?: string | number | null
    appMessage?: string | null
    phoneNumber?: string | null
    whatsappMessage?: string | null
    userId?: string | null
  },
) {
  const normalizedAppMessage = String(params.appMessage || "").trim()
  const normalizedWhatsAppMessage = String(params.whatsappMessage || normalizedAppMessage).trim()

  if (normalizedAppMessage) {
    await insertAppNotification(supabase, params.accountNumber, normalizedAppMessage)
  }

  if (!normalizedWhatsAppMessage) {
    return { appNotified: Boolean(normalizedAppMessage), whatsapp: { sent: false, queued: false, skipped: true as const } }
  }

  const whatsapp = await sendGuardianWhatsAppMessage(supabase, {
    phoneNumber: params.phoneNumber,
    message: normalizedWhatsAppMessage,
    userId: params.userId,
  })

  return {
    appNotified: Boolean(normalizedAppMessage),
    whatsapp,
  }
}