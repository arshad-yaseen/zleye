import fs from 'node:fs'
import { cli, z } from './src'

const program = cli().option(
	'config',
	z
		.string()
		.describe('Configuration file path')
		.default('./config.json')
		.transform((configPath) => {
			if (!fs.existsSync(configPath)) {
				throw new Error(`Config file not found: ${configPath}`)
			}
			return JSON.parse(fs.readFileSync(configPath, 'utf8')) as Record<
				string,
				any
			>
		}),
)

const result = program.parse()
console.log(result)
