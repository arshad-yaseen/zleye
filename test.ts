import { cli, z } from './src'

const app = cli()
	.positional('input', z.string().describe('Input file').alias('i'))
	.positional('output', z.string().describe('Output file').alias('o'))
	.option('config', z.string().describe('Config file').alias('c'))

const result = app.parse()
console.log(result)
