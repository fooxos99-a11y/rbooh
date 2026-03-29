const RIYADH_TIME_ZONE = "Asia/Riyadh"

export function getSaudiDateString(date = new Date()) {
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: RIYADH_TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})

	return formatter.format(date)
}

export function getSaudiTimeString(date = new Date()) {
	return date.toLocaleTimeString("ar-SA", {
		timeZone: RIYADH_TIME_ZONE,
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	})
}

export function getSaudiTimeParts(date = new Date()) {
	const formatter = new Intl.DateTimeFormat("en-GB", {
		timeZone: RIYADH_TIME_ZONE,
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	})

	const parts = formatter.formatToParts(date)
	return {
		hour: Number(parts.find((part) => part.type === "hour")?.value || "0"),
		minute: Number(parts.find((part) => part.type === "minute")?.value || "0"),
		second: Number(parts.find((part) => part.type === "second")?.value || "0"),
	}
}

export function getSaudiWeekday(dateString: string) {
	return new Date(`${dateString}T12:00:00+03:00`).getUTCDay()
}

function shiftSaudiDateString(dateString: string, offsetDays: number) {
	const date = new Date(`${dateString}T12:00:00+03:00`)
	date.setUTCDate(date.getUTCDate() + offsetDays)
	return getSaudiDateString(date)
}

export function getSaudiAttendanceAnchorDate(dateString: string) {
	const weekday = getSaudiWeekday(dateString)
	const offsetDays = weekday <= 2 ? -weekday : -(weekday - 3)
	return shiftSaudiDateString(dateString, offsetDays)
}

export function isSaudiAttendanceDateAllowed(dateString: string) {
	return Boolean(dateString)
}

export function isSaudiAttendanceWindowOpen(date = new Date()) {
	void date
	return true
}

export function formatSaudiTimeWithPeriod(timeValue: string) {
	const normalized = timeValue.includes("T") ? new Date(timeValue) : null

	if (normalized && !Number.isNaN(normalized.getTime())) {
		const formatter = new Intl.DateTimeFormat("en-GB", {
			timeZone: RIYADH_TIME_ZONE,
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		})
		const parts = formatter.formatToParts(normalized)
		const hour = Number(parts.find((part) => part.type === "hour")?.value || "0")
		const minute = Number(parts.find((part) => part.type === "minute")?.value || "0")
		return formatHourMinuteWithPeriod(hour, minute)
	}

	const [hourText, minuteText] = timeValue.split(" ")[0].split(":")
	const hour = Number(hourText)
	const minute = Number(minuteText)

	if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
		return timeValue
	}

	return formatHourMinuteWithPeriod(hour, minute)
}

function formatHourMinuteWithPeriod(hour24: number, minute: number) {
	const period = hour24 >= 12 ? "م" : "ص"
	const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
	return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`
}