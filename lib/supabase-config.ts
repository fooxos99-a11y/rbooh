export type SupabasePublicConfig = {
	url: string
	publishableKey: string
}

export type SupabaseServerConfig = SupabasePublicConfig & {
	serviceRoleKey: string
}

function normalizeEnvValue(value?: string) {
	return typeof value === "string" && value.trim() ? value.trim() : ""
}

function readPublicSupabaseUrl() {
	return normalizeEnvValue(process.env.NEXT_PUBLIC_RBOH_SUPABASE_URL)
		|| normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL)
}

function readPublicSupabaseKey() {
	return normalizeEnvValue(process.env.NEXT_PUBLIC_RBOH_SUPABASE_PUBLISHABLE_KEY)
		|| normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)
}

function readServiceRoleKey() {
	return normalizeEnvValue(process.env.RBOH_SUPABASE_SERVICE_ROLE_KEY)
		|| normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
	return {
		url: readPublicSupabaseUrl(),
		publishableKey: readPublicSupabaseKey(),
	}
}

export function getMissingSupabasePublicConfigKeys() {
	const missingKeys: string[] = []

	if (!readPublicSupabaseUrl()) {
		missingKeys.push("NEXT_PUBLIC_RBOH_SUPABASE_URL")
	}

	if (!readPublicSupabaseKey()) {
		missingKeys.push("NEXT_PUBLIC_RBOH_SUPABASE_PUBLISHABLE_KEY")
	}

	return missingKeys
}

export function hasSupabasePublicConfig() {
	return getMissingSupabasePublicConfigKeys().length === 0
}

export function getSupabaseServerConfig(): SupabaseServerConfig {
	const publicConfig = getSupabasePublicConfig()

	return {
		...publicConfig,
		serviceRoleKey: readServiceRoleKey(),
	}
}
