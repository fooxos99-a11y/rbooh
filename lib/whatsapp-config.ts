export type WhatsAppRuntimeConfig = {
	phoneNumberId: string
	accessToken: string
	verifyToken: string
	apiVersion: string
}

function readEnvValue(...keys: string[]) {
	for (const key of keys) {
		const value = process.env[key]
		if (typeof value === "string" && value.trim()) {
			return value.trim()
		}
	}

	return ""
}

export function getWhatsAppRuntimeConfig(): WhatsAppRuntimeConfig {
	return {
		phoneNumberId: readEnvValue("RBOH_WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_PHONE_NUMBER_ID"),
		accessToken: readEnvValue("RBOH_WHATSAPP_ACCESS_TOKEN", "WHATSAPP_ACCESS_TOKEN"),
		verifyToken: readEnvValue("RBOH_WHATSAPP_VERIFY_TOKEN", "WHATSAPP_VERIFY_TOKEN"),
		apiVersion: readEnvValue("RBOH_WHATSAPP_API_VERSION", "WHATSAPP_API_VERSION") || "v19.0",
	}
}
