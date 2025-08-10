import { cli, z } from './src'

const program = cli()
	.option('count', z.number().min(1))
	.option('name', z.string().optional())
	.positional('numbers', z.array(z.number().positive()))

const result = program.parse()
console.log(result)
