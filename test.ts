import { cli, z } from './src'

const program = cli()
	.option(
		'minify',
		z.union(
			z.boolean(),
			z
				.object({
					nice: z.object(z.string()),
				})
				.describe('nice'),
		),
	)
	.rest('entries', z.string())

console.time('time')
const result = program.parse()
console.log(result)
console.timeEnd('time')
