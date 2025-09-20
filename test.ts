import { cli, z } from './src'

const program = cli().option(
	'minify',
	z.union(
		z.boolean(),
		z.object({
			name: z.string(),
			hello: z.boolean(),
		}),
	),
)

console.time('time')
const result = program.parse()
console.log(result)
console.timeEnd('time')
