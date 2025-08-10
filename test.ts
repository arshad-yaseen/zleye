import { cli, z } from './src'

const program = cli()
	.option('count', z.number().min(1))
	.option('name', z.string().optional())
	.positional('source', z.string().describe('Source file path'))
	.positional(
		'copies',
		z.number().int().positive().describe('Number of copies to create'),
	)
	.positional('tags', z.array(z.string()).describe('List of tags to apply'))

const result = program.parse()
console.log(result)
