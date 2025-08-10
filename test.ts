import { cli, z } from './src'

const program = cli()
	.name('@bunup/create')
	.description('Scaffold a new project with Bunup')
	.version('0.0.1')
	.positional('name', z.string().describe('The name of the project'))

const result = program.parse()
