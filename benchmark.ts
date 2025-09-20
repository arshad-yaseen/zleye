import { cac } from 'cac'
import { Command } from 'commander'
import { Bench } from 'tinybench'
import yargs from 'yargs'
import { cli, z } from 'zlye'

const bench = new Bench()

const testArgs = ['--verbose', '--port', '3000', '--name', 'test']

bench
	.add('yargs', () => {
		yargs(testArgs)
			.option('verbose', { type: 'boolean' })
			.option('port', { type: 'number' })
			.option('name', { type: 'string' })
			.parse()
	})
	.add('commander', () => {
		new Command()
			.option('-v, --verbose', 'verbose output')
			.option('-p, --port <port>', 'port number')
			.option('-n, --name <name>', 'name')
			.parse(testArgs, { from: 'user' })
	})
	.add('cac', () => {
		const cli = cac()
		cli
			.option('--verbose', 'verbose output')
			.option('--port <port>', 'port number')
			.option('--name <name>', 'name')
			.parse(testArgs)
	})
	.add('zlye', () => {
		cli()
			.option('verbose', z.boolean())
			.option('port', z.number())
			.option('name', z.string())
			.parse(testArgs)
	})

await bench.run()
console.table(bench.table())
