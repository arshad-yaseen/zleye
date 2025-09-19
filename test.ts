import fs from 'node:fs'
import { cli, z } from './src'

const program = cli()
	.option('mode', z.string().choices(['development', 'production', 'test']))
	.option(
		'features',
		z.object(z.string().choices(['enabled', 'disabled', 'auto'])),
	)
	.option(
		'sourcemap',
		z.union(
			z.boolean().default(true),
			z.string().choices(['none', 'inline', 'external', 'both']),
		),
	)
	.option(
		'minify',
		z.union(
			z.boolean().default(true),
			z.object({
				js: z.boolean().default(true),
				css: z.boolean().default(true),
				html: z.boolean().default(false),
			}),
		),
	)

console.time('time')
const result = program.parse()
console.log(result)
console.timeEnd('time')
