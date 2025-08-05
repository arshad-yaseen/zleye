import { expect, test } from 'bun:test'
import { cli, z } from '../src'

test('should greet correctly', () => {
	const app = cli()
		.name('test')
		.version('1.0.0')
		.description('Test CLI')
		.option('name', z.string().default('World'))
		.parse()
	expect(app.name).toBe('World')
})
