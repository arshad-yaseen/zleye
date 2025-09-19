export function joinWithAnd(items: string[]): string {
	return new Intl.ListFormat('en', { type: 'conjunction' }).format(items)
}

export function joinWithOr(items: string[]): string {
	return new Intl.ListFormat('en', { type: 'disjunction' }).format(items)
}

export function processExit(code: number, error?: unknown): void {
	if (!process.env.NO_EXIT) {
		process.exit(code)
	} else if (error) {
		throw error
	}
}
