import { cli, z } from './src'

// const program = cli().positional('count', z.array(z.number().negative()))
// const program = cli().option('count', z.array(z.number().negative()))
const program = cli().option(
	'count',
	z.array(z.string().choices(['dev', 'staging', 'prod'])),
)

const result = program.parse()
console.log(result)
