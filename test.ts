import { cli, z } from './src'

const program = cli()
	.option('verbose', z.boolean().alias('v'))
	.option('quiet', z.boolean().alias('q'))
	.option('force', z.boolean().default(false).describe('Skip confirmations'))

console.time('time')
const result = program.parse()
console.log(result)
console.timeEnd('time')
