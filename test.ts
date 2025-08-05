import { cli, command, z } from './src'

const app = cli()
	.name('mycli')
	.version('1.0.0')
	.description('A test CLI application')
	.option('verbose', z.boolean().describe('Enable verbose output').alias('v'))
	.option('config', z.string().optional().describe('Config file path'))
	.positional('entry', z.string().describe('Entry file path'))
	.example('Process a file\nmycli --verbose entry.txt')
	.example('Use custom config\nmycli --config=custom.json --verbose entry.txt')

app
	.addCommand('deploy', {
		env: z.string().choices(['dev', 'staging', 'prod']).describe('Environment'),
		count: z.number(),
		force: z.boolean().describe('Force deployment'),
		tags: z.array(z.string()).min(1).describe('Deployment tags'),
	})
	.description('Deploy the application')
	.positional('service', z.string().describe('Service name'))
	.action((options, service) => {
		console.log('Deploying service:', service)
		console.log('Options:', options)
	})

const result = app.parse()
console.log('Global options:', result)
