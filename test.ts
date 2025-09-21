import { cli, z } from './src'

const program = cli()
	.option(
		'letter',
		z.union(
			z.string().choices(['a', 'b', 'c']),
			z.array(z.string().choices(['a', 'b', 'c'])),
		),
	)
	.option(
		'dts',
		z
			.union(
				z.boolean(),
				z.object({
					splitting: z.boolean(),
				}),
			)
			.default(true),
	)

console.time('time')
const result = program.parse()
console.log(result)
console.timeEnd('time')
