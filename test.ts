import { cli, z } from './src'

const program = cli()
	.name('my-app')
	.version('1.0.0')
	.description('A simple CLI application')
	.option('verbose', z.boolean().describe('Enable verbose output'))
	.option('output', z.string().describe('Output file path'))

program.parse()
