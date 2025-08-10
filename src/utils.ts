export function joinWithAnd(items: string[]): string {
	return new Intl.ListFormat('en', { type: 'conjunction' }).format(items)
}

export function joinWithOr(items: string[]): string {
	return new Intl.ListFormat('en', { type: 'disjunction' }).format(items)
}

export function getOrdinalNumber(index: number): string {
	const ordinals = [
		'first',
		'second',
		'third',
		'fourth',
		'fifth',
		'sixth',
		'seventh',
		'eighth',
		'ninth',
		'tenth',
		'eleventh',
		'twelfth',
		'thirteenth',
		'fourteenth',
		'fifteenth',
		'sixteenth',
		'seventeenth',
		'eighteenth',
		'nineteenth',
		'twentieth',
	]

	if (index < ordinals.length) {
		return ordinals[index]
	}

	// For numbers beyond 20, use the suffix approach
	const num = index + 1
	const suffix =
		num % 10 === 1 && num % 100 !== 11
			? 'st'
			: num % 10 === 2 && num % 100 !== 12
				? 'nd'
				: num % 10 === 3 && num % 100 !== 13
					? 'rd'
					: 'th'

	return `${num}${suffix}`
}
