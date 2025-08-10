export function joinWithAnd(items: string[]): string {
	return new Intl.ListFormat('en', { type: 'conjunction' }).format(items)
}

export function joinWithOr(items: string[]): string {
	return new Intl.ListFormat('en', { type: 'disjunction' }).format(items)
}
