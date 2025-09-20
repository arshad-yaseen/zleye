import { cli, z } from './src'

const program = cli().option(
	'input',
	z.union(
		z.boolean(),
		z.string(),
		z.object({
			file: z.string(),
			encoding: z
				.string()
				.choices(['utf8', 'utf16', 'ascii'])
				.default('utf8')
				.describe('File encoding'),
		}),
	),
)

console.time('time')
const result = program.parse()
console.log(result)
console.timeEnd('time')
