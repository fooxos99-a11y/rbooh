require("dotenv").config({ path: process.env.WORKER_ENV_FILE || ".env.local" })

const fs = require("fs")
const path = require("path")
const qrcode = require("qrcode-terminal")
const { Client, LocalAuth } = require("whatsapp-web.js")
const { createClient } = require("@supabase/supabase-js")

const SUPABASE_URL = process.env.NEXT_PUBLIC_RBOH_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.RBOH_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const AUTH_DIR = process.env.RBOH_WHATSAPP_AUTH_DIR || path.join(__dirname, ".wwebjs_auth")
const STATUS_FILE_PATH = process.env.RBOH_WHATSAPP_STATUS_FILE_PATH || path.join(__dirname, "status.json")
const QR_IMAGE_PATH = process.env.RBOH_WHATSAPP_QR_IMAGE_PATH || path.join(__dirname, "current-qr.txt")
const CLIENT_ID = process.env.RBOH_WHATSAPP_CLIENT_ID || "rboh-whatsapp-worker"
const WORKER_STATE_SETTING_ID = process.env.RBOH_WHATSAPP_WORKER_STATE_SETTING_ID || "rboh_whatsapp_worker_state"
const WORKER_COMMAND_SETTING_ID = process.env.RBOH_WHATSAPP_WORKER_COMMAND_SETTING_ID || "rboh_whatsapp_worker_command"
const HEARTBEAT_INTERVAL_MS = Number(process.env.RBOH_WHATSAPP_HEARTBEAT_INTERVAL_MS || 15000)
const COMMAND_POLL_MS = Number(process.env.RBOH_WHATSAPP_COMMAND_POLL_MS || 5000)
const QUEUE_POLL_MS = Number(process.env.RBOH_WHATSAPP_QUEUE_POLL_MS || 4000)
const IS_LINUX = process.platform === "linux"

const PUPPETEER_ARGS = IS_LINUX
  ? [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
    ]
  : ["--no-first-run"]

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing rboh Supabase credentials for WhatsApp worker.")
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

let workerState = {
  status: "starting",
  qrAvailable: false,
  ready: false,
  authenticated: false,
  lastUpdatedAt: new Date().toISOString(),
  lastHeartbeatAt: new Date().toISOString(),
  qrUpdatedAt: null,
  connectedAt: null,
  disconnectedAt: null,
  authFailedAt: null,
  lastError: null,
  qrValue: null,
}

let isReinitializingClient = false

function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    throw new Error("Missing phone_number value.")
  }

  let normalized = String(phoneNumber).trim().replace(/[^\d]/g, "")

  if (normalized.startsWith("00")) {
    normalized = normalized.slice(2)
  }

  if (/^05\d{8}$/.test(normalized)) {
    normalized = `966${normalized.slice(1)}`
  } else if (/^5\d{8}$/.test(normalized)) {
    normalized = `966${normalized}`
  }

  if (!/^\d{8,15}$/.test(normalized)) {
    throw new Error(`Invalid phone_number format: ${phoneNumber}`)
  }

  return normalized
}

function toChatId(phoneNumber) {
  return `${normalizePhoneNumber(phoneNumber)}@c.us`
}

async function processQueue() {
  if (!workerState.ready || workerState.status !== "connected") {
    return
  }

  const { data: messages, error } = await supabase
    .from("whatsapp_queue")
    .select("id, phone_number, message")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(5)

  if (error) {
    log("Failed to load whatsapp queue.", error)
    return
  }

  for (const queueRow of messages || []) {
    try {
      const sent = await whatsappClient.sendMessage(toChatId(queueRow.phone_number), queueRow.message)
      const messageId = sent?.id?._serialized || sent?.id?.id || null

      await supabase.from("whatsapp_queue").update({
        status: "sent",
        message_id: messageId,
        processed_at: new Date().toISOString(),
      }).eq("id", queueRow.id)

      await supabase.from("whatsapp_messages").update({
        status: "sent",
        message_id: messageId,
      }).eq("id", queueRow.id)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log(`Failed to send queued message ${queueRow.id}.`, errorMessage)

      await supabase.from("whatsapp_queue").update({
        status: "failed",
        error_message: errorMessage,
        processed_at: new Date().toISOString(),
      }).eq("id", queueRow.id)

      await supabase.from("whatsapp_messages").update({
        status: "failed",
        error_message: errorMessage,
      }).eq("id", queueRow.id)
    }
  }
}

const whatsappClient = new Client({
  authStrategy: new LocalAuth({
    clientId: CLIENT_ID,
    dataPath: AUTH_DIR,
  }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: PUPPETEER_ARGS,
  },
})

function log(message, extra) {
  const timestamp = new Date().toISOString()
  if (extra === undefined) {
    console.log(`[${timestamp}] ${message}`)
    return
  }
  console.log(`[${timestamp}] ${message}`, extra)
}

function ensureDirectory(targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
}

async function persistState() {
  workerState.lastUpdatedAt = new Date().toISOString()

  ensureDirectory(STATUS_FILE_PATH)
  fs.writeFileSync(STATUS_FILE_PATH, JSON.stringify(workerState, null, 2), "utf8")

  try {
    await supabase.from("site_settings").upsert({
      id: WORKER_STATE_SETTING_ID,
      value: workerState,
    }, { onConflict: "id" })
  } catch (error) {
    log("Failed to persist worker state to site_settings.", error)
  }
}

async function setWorkerState(patch) {
  workerState = {
    ...workerState,
    ...patch,
    lastHeartbeatAt: new Date().toISOString(),
  }

  await persistState()
}

async function clearCommand() {
  try {
    await supabase.from("site_settings").upsert({
      id: WORKER_COMMAND_SETTING_ID,
      value: null,
    }, { onConflict: "id" })
  } catch (error) {
    log("Failed to clear worker command.", error)
  }
}

async function reinitializeClient() {
  if (isReinitializingClient) {
    return
  }

  isReinitializingClient = true

  try {
    try {
      await whatsappClient.destroy()
    } catch (error) {
      log("Destroy before reinitialize failed.", error)
    }

    await setWorkerState({
      status: "restarting",
      ready: false,
      authenticated: false,
      qrAvailable: false,
      qrValue: null,
      lastError: null,
    })

    await whatsappClient.initialize()
  } catch (error) {
    log("Failed to reinitialize WhatsApp client.", error)
    await setWorkerState({
      status: "auth_failed",
      ready: false,
      authenticated: false,
      qrAvailable: false,
      qrValue: null,
      lastError: error instanceof Error ? error.message : String(error),
    })
  } finally {
    isReinitializingClient = false
  }
}

async function pollCommands() {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("id", WORKER_COMMAND_SETTING_ID)
      .maybeSingle()

    if (error || !data?.value?.action) {
      return
    }

    if (data.value.action === "disconnect") {
      const disconnectedAt = new Date().toISOString()

      await setWorkerState({
        status: "disconnecting",
        ready: false,
        authenticated: false,
        qrAvailable: false,
        qrValue: null,
        disconnectedAt,
        qrUpdatedAt: null,
        lastError: null,
      })

      try {
        await whatsappClient.logout()
      } catch (error) {
        log("Logout command failed.", error)
      }

      await clearCommand()
      await reinitializeClient()
    }
  } catch (error) {
    log("Failed to poll WhatsApp worker commands.", error)
  }
}

whatsappClient.on("qr", async (qrValue) => {
  qrcode.generate(qrValue, { small: true })
  ensureDirectory(QR_IMAGE_PATH)
  fs.writeFileSync(QR_IMAGE_PATH, qrValue, "utf8")

  await setWorkerState({
    status: "waiting_for_qr",
    qrAvailable: true,
    ready: false,
    authenticated: false,
    qrValue,
    qrUpdatedAt: new Date().toISOString(),
    lastError: null,
  })
})

whatsappClient.on("authenticated", async () => {
  await setWorkerState({
    status: "authenticating",
    authenticated: true,
    qrAvailable: false,
    qrValue: null,
    lastError: null,
  })
})

whatsappClient.on("ready", async () => {
  await setWorkerState({
    status: "connected",
    ready: true,
    authenticated: true,
    qrAvailable: false,
    qrValue: null,
    connectedAt: new Date().toISOString(),
    lastError: null,
  })
})

whatsappClient.on("auth_failure", async (message) => {
  await setWorkerState({
    status: "auth_failed",
    ready: false,
    authenticated: false,
    qrAvailable: false,
    qrValue: null,
    authFailedAt: new Date().toISOString(),
    lastError: String(message || "Authentication failed"),
  })
})

whatsappClient.on("disconnected", async (reason) => {
  await setWorkerState({
    status: "disconnected",
    ready: false,
    authenticated: false,
    qrAvailable: false,
    qrValue: null,
    disconnectedAt: new Date().toISOString(),
    lastError: String(reason || "Disconnected"),
  })
})

setInterval(() => {
  workerState.lastHeartbeatAt = new Date().toISOString()
  persistState().catch((error) => log("Failed to persist heartbeat.", error))
}, HEARTBEAT_INTERVAL_MS)

setInterval(() => {
  pollCommands().catch((error) => log("Command polling failed.", error))
}, COMMAND_POLL_MS)

setInterval(() => {
  processQueue().catch((error) => log("Queue processing failed.", error))
}, QUEUE_POLL_MS)

setWorkerState({ status: "starting" }).catch((error) => log("Failed to set starting state.", error))

whatsappClient.initialize().catch(async (error) => {
  log("Failed to initialize WhatsApp worker.", error)
  await setWorkerState({
    status: "auth_failed",
    ready: false,
    authenticated: false,
    lastError: error instanceof Error ? error.message : String(error),
  })
})
