"use client"

import { useEffect, useRef } from "react"

interface UseResumeRefreshOptions {
	enabled?: boolean
	minIntervalMs?: number
	includePageShow?: boolean
}

export function useResumeRefresh(callback: () => void, options?: UseResumeRefreshOptions) {
	const { enabled = true, minIntervalMs = 120000, includePageShow = true } = options || {}
	const callbackRef = useRef(callback)
	const lastRefreshAtRef = useRef(0)

	useEffect(() => {
		callbackRef.current = callback
	}, [callback])

	useEffect(() => {
		if (!enabled) {
			return
		}

		const refresh = () => {
			const now = Date.now()
			if (now - lastRefreshAtRef.current < minIntervalMs) {
				return
			}

			lastRefreshAtRef.current = now
			callbackRef.current()
		}

		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				refresh()
			}
		}

		window.addEventListener("focus", refresh)
		document.addEventListener("visibilitychange", handleVisibilityChange)

		if (includePageShow) {
			window.addEventListener("pageshow", refresh)
		}

		return () => {
			window.removeEventListener("focus", refresh)
			document.removeEventListener("visibilitychange", handleVisibilityChange)
			if (includePageShow) {
				window.removeEventListener("pageshow", refresh)
			}
		}
	}, [enabled, includePageShow, minIntervalMs])
}