type PlanProgressRecord = {
	created_at?: string | null
	date?: string | null
}

function getRecordSequenceKey(record: PlanProgressRecord) {
	return String(record.created_at || record.date || "")
}

export function sortPlanProgressRecords<T extends PlanProgressRecord>(records: T[]) {
	return [...records].sort((left, right) => {
		const sequenceComparison = getRecordSequenceKey(left).localeCompare(getRecordSequenceKey(right))
		if (sequenceComparison !== 0) return sequenceComparison

		const dateComparison = String(left.date || "").localeCompare(String(right.date || ""))
		if (dateComparison !== 0) return dateComparison

		return String(left.created_at || "").localeCompare(String(right.created_at || ""))
	})
}

export function getCompletedMemorizationDays<T extends PlanProgressRecord>(records: T[], totalSessions: number) {
	return Math.max(0, Math.min(Math.max(0, totalSessions), sortPlanProgressRecords(records).length))
}