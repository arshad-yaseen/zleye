import fs from 'node:fs'
import { cli, z } from './src'

const program = cli()
	.name('deploy-tool')
	.version('1.0.0')
	.description('Deploy applications to various environments')
	.option(
		'config',
		z
			.string()
			.describe('Configuration file path')
			.alias('c')
			.default('./deploy.config.json')
			.example('./custom-config.json'),
	)
	.option(
		'dry-run',
		z
			.boolean()
			.describe('Show what would be deployed without actually deploying')
			.alias('n')
			.default(false),
	)

program
	.command('deploy', {
		environment: z
			.string()
			.choices(['dev', 'staging', 'prod'])
			.describe('Target environment'),
		force: z
			.boolean()
			.describe('Force deployment even if validation fails')
			.default(false),
	})
	.description('Deploy to specified environment')
	.positional('app', z.string().describe('Application name'))
	.example([
		'deploy-tool deploy --environment=prod my-app',
		'deploy-tool deploy --environment=staging --force my-app',
	])
	.action(async ({ options, positionals }) => {
		console.log(options, positionals)
		const [app] = positionals
		console.log(`Deploying ${app} to ${options.environment}`)

		if (options.force) {
			console.log('⚠️  Force mode enabled - skipping safety checks')
		}

		// Perform deployment...
	})

console.time('time')
const result = program.parse()
console.log(result)
console.timeEnd('time')
