import fs from 'node:fs'
import { cli, z } from './src'

const program = cli()
	.name('deploy-tool')
	.version('1.0.0')
	.description('Deploy applications to various environments')
	.option(
		'dry-run',
		z
			.boolean()
			.describe('Show what would be deployed without actually deploying')
			.alias('n')
			.default(true),
	)

console.time('time')
const result = program.parse()
console.log(result)
console.timeEnd('time')
