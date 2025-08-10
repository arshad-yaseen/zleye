import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'
import { cli, z } from '../src/index'
import { getOrdinalNumber, joinWithAnd, joinWithOr } from '../src/utils'

let consoleLogs: string[] = []
let consoleErrors: string[] = []
let processExitCode: number | undefined

function mockConsole() {
	consoleLogs = []
	consoleErrors = []
	processExitCode = undefined

	spyOn(console, 'log').mockImplementation((...args) => {
		consoleLogs.push(args.map(String).join(' '))
	})

	spyOn(console, 'error').mockImplementation((...args) => {
		consoleErrors.push(args.map(String).join(' '))
	})

	spyOn(process, 'exit').mockImplementation((code) => {
		processExitCode = code as number
		throw new Error(`Process exit called with code ${code}`)
	})
}

function restoreConsole() {
	;(console.log as any).mockRestore?.()
	;(console.error as any).mockRestore?.()
	;(process.exit as any).mockRestore?.()
}

beforeEach(() => {
	mockConsole()
})

afterEach(() => {
	restoreConsole()
})

describe('Schema Validation', () => {
	describe('StringSchema', () => {
		test('should parse valid strings', () => {
			const schema = z.string()
			expect(schema.parse('hello')).toBe('hello')
			expect(schema.parse('world')).toBe('world')
		})

		test('should throw error for non-strings', () => {
			const schema = z.string()
			expect(() => schema.parse(123)).toThrow(
				'value must be a string, received number',
			)
			expect(() => schema.parse(true)).toThrow(
				'value must be a string, received boolean',
			)
			expect(() => schema.parse(null)).toThrow(
				'value must be a string, received object',
			)
		})

		test('should handle required vs optional', () => {
			const required = z.string()
			const optional = z.string().optional()

			expect(() => required.parse(undefined)).toThrow('value is required')
			expect(optional.parse(undefined)).toBeUndefined()
		})

		test('should handle default values', () => {
			const schema = z.string().default('default')
			expect(schema.parse(undefined)).toBe('default')
			expect(schema.parse('custom')).toBe('custom')
		})

		test('should validate min/max length', () => {
			const schema = z.string().min(3).max(10)

			expect(() => schema.parse('ab')).toThrow(
				'value must be at least 3 characters',
			)
			expect(() => schema.parse('this is too long')).toThrow(
				'value must be at most 10 characters',
			)
			expect(schema.parse('valid')).toBe('valid')
		})

		test('should validate regex patterns', () => {
			const schema = z
				.string()
				.regex(/^[a-z]+$/, 'Must be lowercase letters only')

			expect(() => schema.parse('ABC')).toThrow(
				'Must be lowercase letters only',
			)
			expect(() => schema.parse('abc123')).toThrow(
				'Must be lowercase letters only',
			)
			expect(schema.parse('abc')).toBe('abc')
		})

		test('should validate choices', () => {
			const schema = z.string().choices(['red', 'green', 'blue'] as const)

			expect(() => schema.parse('yellow')).toThrow(
				'value must be one of red, green, or blue',
			)
			expect(schema.parse('red')).toBe('red')
			expect(schema.parse('green')).toBe('green')
		})

		test('should support transformations', () => {
			const schema = z.string().transform((s) => s.toUpperCase())
			expect(schema.parse('hello')).toBe('HELLO')
		})

		test('should support chaining', () => {
			const schema = z
				.string()
				.min(2)
				.max(5)
				.regex(/^[a-z]+$/)
				.describe('A short lowercase word')
				.alias('w')
				.example('word')

			expect(schema.parse('test')).toBe('test')
			expect(schema._description).toBe('A short lowercase word')
			expect(schema._alias).toBe('w')
			expect(schema._example).toBe('word')
		})
	})

	describe('NumberSchema', () => {
		test('should parse valid numbers', () => {
			const schema = z.number()
			expect(schema.parse(42)).toBe(42)
			expect(schema.parse('123')).toBe(123)
			expect(schema.parse('3.14')).toBe(3.14)
		})

		test('should throw error for invalid numbers', () => {
			const schema = z.number()
			expect(() => schema.parse('not a number')).toThrow(
				'value must be a number, received string',
			)
			expect(() => schema.parse('abc')).toThrow(
				'value must be a number, received string',
			)
		})

		test('should validate integer constraint', () => {
			const schema = z.number().int()

			expect(() => schema.parse(3.14)).toThrow('value must be an integer')
			expect(schema.parse(42)).toBe(42)
		})

		test('should validate positive/negative constraints', () => {
			const positive = z.number().positive()
			const negative = z.number().negative()

			expect(() => positive.parse(0)).toThrow('value must be positive')
			expect(() => positive.parse(-1)).toThrow('value must be positive')
			expect(positive.parse(1)).toBe(1)

			expect(() => negative.parse(0)).toThrow('value must be negative')
			expect(() => negative.parse(1)).toThrow('value must be negative')
			expect(negative.parse(-1)).toBe(-1)
		})

		test('should validate min/max bounds', () => {
			const schema = z.number().min(0).max(100)

			expect(() => schema.parse(-1)).toThrow('value must be at least 0')
			expect(() => schema.parse(101)).toThrow('value must be at most 100')
			expect(schema.parse(50)).toBe(50)
		})

		test('should support transformations', () => {
			const schema = z.number().transform((n) => n * 2)
			expect(schema.parse(5)).toBe(10)
		})
	})

	describe('BooleanSchema', () => {
		test('should parse valid booleans', () => {
			const schema = z.boolean()
			expect(schema.parse(true)).toBe(true)
			expect(schema.parse(false)).toBe(false)
			expect(schema.parse('true')).toBe(true)
			expect(schema.parse('false')).toBe(false)
			expect(schema.parse('1')).toBe(true)
			expect(schema.parse('0')).toBe(false)
			expect(schema.parse(1)).toBe(true)
			expect(schema.parse(0)).toBe(false)
		})

		test('should default to false for undefined when not optional', () => {
			const schema = z.boolean()
			expect(schema.parse(undefined)).toBe(false)
		})

		test('should throw error for invalid booleans', () => {
			const schema = z.boolean()
			expect(() => schema.parse('maybe')).toThrow('value must be a boolean')
			expect(() => schema.parse(123)).toThrow('value must be a boolean')
		})
	})

	describe('ArraySchema', () => {
		test('should parse arrays', () => {
			const schema = z.array(z.string())
			expect(schema.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
		})

		test('should parse comma-separated strings', () => {
			const schema = z.array(z.string())
			expect(schema.parse('a,b,c')).toEqual(['a', 'b', 'c'])
			expect(schema.parse('a, b , c ')).toEqual(['a', 'b', 'c']) // trims whitespace
		})

		test('should parse single values as arrays', () => {
			const schema = z.array(z.string())
			expect(schema.parse('single')).toEqual(['single'])
		})

		test('should validate item schemas', () => {
			const schema = z.array(z.number())
			expect(() => schema.parse(['a', 'b'])).toThrow(
				'first value must be a number, received string',
			)
		})

		test('should validate min/max length', () => {
			const schema = z.array(z.string()).min(2).max(4)

			expect(() => schema.parse(['a'])).toThrow(
				'value must have at least 2 items',
			)
			expect(() => schema.parse(['a', 'b', 'c', 'd', 'e'])).toThrow(
				'value must have at most 4 items',
			)
			expect(schema.parse(['a', 'b', 'c'])).toEqual(['a', 'b', 'c'])
		})
	})

	describe('ObjectSchema', () => {
		test('should parse objects', () => {
			const schema = z.object({
				name: z.string(),
				age: z.number(),
				active: z.boolean(),
			})

			const result = schema.parse({
				name: 'John',
				age: 30,
				active: true,
			})

			expect(result).toEqual({
				name: 'John',
				age: 30,
				active: true,
			})
		})

		test('should validate nested properties', () => {
			const schema = z.object({
				name: z.string().min(2),
				age: z.number().min(0),
			})

			expect(() => schema.parse({ name: 'A', age: 30 })).toThrow(
				'value.name must be at least 2 characters',
			)
			expect(() => schema.parse({ name: 'John', age: -1 })).toThrow(
				'value.age must be at least 0',
			)
		})

		test('should handle missing properties', () => {
			const schema = z.object({
				name: z.string(),
				age: z.number().optional(),
			})

			expect(() => schema.parse({ age: 30 })).toThrow('value.name is required')
			expect(schema.parse({ name: 'John' })).toEqual({
				name: 'John',
				age: undefined,
			})
		})

		test('should throw error for non-objects', () => {
			const schema = z.object({ name: z.string() })
			expect(() => schema.parse('not an object')).toThrow(
				'value must be an object',
			)
			expect(() => schema.parse(null)).toThrow('value must be an object')
		})
	})
})

describe('CLI Functionality', () => {
	describe('Basic CLI Creation', () => {
		test('should create CLI with basic configuration', () => {
			const program = cli()
				.name('test-cli')
				.version('1.0.0')
				.description('Test CLI')
				.usage('test-cli [options]')
				.example('test-cli --help')

			expect(program._name).toBe('test-cli')
			expect(program._version).toBe('1.0.0')
			expect(program._description).toBe('Test CLI')
			expect(program._usage).toBe('test-cli [options]')
			expect(program._examples).toEqual(['test-cli --help'])
		})

		test('should support multiple examples', () => {
			const program = cli()
				.example(['example 1', 'example 2'])
				.example('example 3')

			expect(program._examples).toEqual(['example 1', 'example 2', 'example 3'])
		})
	})

	describe('Option Parsing', () => {
		test('should parse basic options', () => {
			const program = cli()
				.option('verbose', z.boolean())
				.option('output', z.string())
				.option('count', z.number())

			const result = program.parse([
				'--verbose',
				'--output',
				'file.txt',
				'--count',
				'5',
			])

			expect(result?.options.verbose).toBe(true)
			expect(result?.options.output).toBe('file.txt')
			expect(result?.options.count).toBe(5)
			expect(result?.positionals).toEqual([])
		})

		test('should parse options with aliases', () => {
			const program = cli()
				.option('verbose', z.boolean().alias('v'))
				.option('output', z.string().alias('o'))

			const result = program.parse(['-v', '-o', 'file.txt'])

			expect(result?.options.verbose).toBe(true)
			expect(result?.options.output).toBe('file.txt')
			expect(result?.positionals).toEqual([])
		})

		test('should parse options with equals syntax', () => {
			const program = cli()
				.option('output', z.string())
				.option('count', z.number())

			const result = program.parse(['--output=file.txt', '--count=42'])

			expect(result?.options.output).toBe('file.txt')
			expect(result?.options.count).toBe(42)
			expect(result?.positionals).toEqual([])
		})

		test('should handle array options', () => {
			const program = cli().option('tags', z.array(z.string()))

			const result1 = program.parse(['--tags', 'a,b,c'])
			expect(result1?.options.tags).toEqual(['a', 'b', 'c'])

			const result2 = program.parse(['--tags', 'single'])
			expect(result2?.options.tags).toEqual(['single'])
		})

		test('should handle default values', () => {
			const program = cli()
				.option('verbose', z.boolean().default(false))
				.option('port', z.number().default(3000))

			const result = program.parse([])

			expect(result?.options.verbose).toBe(false)
			expect(result?.options.port).toBe(3000)
			expect(result?.positionals).toEqual([])
		})

		test('should validate option constraints', () => {
			const program = cli().option('port', z.number().min(1).max(65535))

			expect(() => program.parse(['--port', '0'])).toThrow()
		})
	})

	describe('Positional Arguments', () => {
		test('should parse positional arguments', () => {
			const program = cli()
				.positional('command', z.string())
				.positional('file', z.string())

			const result = program.parse(['build', 'src/index.ts'])

			expect(result).toEqual({
				options: {},
				positionals: ['build', 'src/index.ts'],
			})
		})

		test('should validate positional arguments', () => {
			const program = cli().positional('port', z.number())

			expect(() => program.parse(['not-a-number'])).toThrow()
		})

		test('should handle optional positional arguments', () => {
			const program = cli()
				.positional('command', z.string())
				.positional('file', z.string().optional())

			const result = program.parse(['build'])
			expect(result?.positionals.length).toBeGreaterThanOrEqual(1)
			expect(result?.positionals[0]).toBe('build')
		})
	})

	describe('Commands', () => {
		test('should parse commands with their own options', () => {
			let actionCalled = false
			let capturedOptions: any

			const program = cli()

			program
				.command('build', {
					watch: z.boolean(),
					outdir: z.string(),
				})
				.description('Build the project')
				.action(({ options }) => {
					actionCalled = true
					capturedOptions = options
				})

			const result = program.parse(['build', '--watch', '--outdir', 'dist'])
			expect(result).toBeUndefined()
			expect(actionCalled).toBe(true)
			expect(capturedOptions.watch).toBe(true)
			expect(capturedOptions.outdir).toBe('dist')
		})

		test('should handle commands with positional arguments', () => {
			let actionCalled = false
			let capturedOptions: any
			let capturedPositionals: any

			const program = cli()

			program
				.command('deploy', {
					env: z.string(),
				})
				.positional('target', z.string())
				.action(({ options, positionals }) => {
					actionCalled = true
					capturedOptions = options
					capturedPositionals = positionals
				})

			const result = program.parse(['deploy', '--env', 'production', 'server1'])
			expect(result).toBeUndefined()
			expect(actionCalled).toBe(true)
			expect(capturedOptions.env).toBe('production')
			expect(capturedPositionals[0]).toBe('server1')
		})

		test('should throw error for unknown commands', () => {
			const program = cli()

			program.command('build', {}).action(() => {})

			expect(() => {
				program.parse(['unknown-command'])
			}).toThrow('Process exit called with code 1')
		})
	})

	describe('Help Generation', () => {
		test('should show main help', () => {
			const program = cli()
				.name('test-cli')
				.version('1.0.0')
				.description('Test CLI application')
				.option(
					'verbose',
					z.boolean().describe('Enable verbose output').alias('v'),
				)

			expect(() => {
				program.parse(['--help'])
			}).toThrow('Process exit called with code')

			expect(
				consoleLogs.some((log) => log.includes('Test CLI application')),
			).toBe(true)
			expect(consoleLogs.some((log) => log.includes('Usage:'))).toBe(true)
			expect(consoleLogs.some((log) => log.includes('verbose'))).toBe(true)
		})

		test('should show command help', () => {
			const program = cli().name('test-cli')

			program
				.command('build', {
					watch: z.boolean().describe('Watch for changes'),
				})
				.description('Build the project')
				.example('test-cli build --watch')
				.action(() => {})

			expect(() => {
				program.parse(['build', '--help'])
			}).toThrow('Process exit called with code')

			expect(consoleLogs.some((log) => log.includes('Build the project'))).toBe(
				true,
			)
			expect(consoleLogs.some((log) => log.includes('watch'))).toBe(true)
		})

		test('should show version', () => {
			const program = cli().version('1.2.3')

			expect(() => {
				program.parse(['--version'])
			}).toThrow('Process exit called with code')

			expect(consoleLogs).toContain('1.2.3')
		})
	})

	describe('Error Handling', () => {
		test('should handle parsing errors gracefully', () => {
			const program = cli().option('port', z.number().min(1))

			expect(() => {
				program.parse(['--port', 'invalid'])
			}).toThrow('Process exit called with code 1')

			expect(consoleErrors.some((error) => error.includes('Error:'))).toBe(true)
			expect(processExitCode).toBe(1)
		})

		test('should handle extra positional arguments', () => {
			const program = cli().positional('command', z.string())

			expect(() => {
				program.parse(['build', 'extra', 'args'])
			}).toThrow('Process exit called with code 1')

			expect(
				consoleErrors.some((error) =>
					error.includes('Unexpected arguments: extra and args'),
				),
			).toBe(true)
			expect(processExitCode).toBe(1)
		})
	})
})

describe('Utility Functions', () => {
	describe('joinWithAnd', () => {
		test('should join items with "and"', () => {
			expect(joinWithAnd(['apple'])).toBe('apple')
			expect(joinWithAnd(['apple', 'banana'])).toBe('apple and banana')
			expect(joinWithAnd(['apple', 'banana', 'cherry'])).toBe(
				'apple, banana, and cherry',
			)
		})
	})

	describe('joinWithOr', () => {
		test('should join items with "or"', () => {
			expect(joinWithOr(['red'])).toBe('red')
			expect(joinWithOr(['red', 'blue'])).toBe('red or blue')
			expect(joinWithOr(['red', 'blue', 'green'])).toBe('red, blue, or green')
		})
	})

	describe('getOrdinalNumber', () => {
		test('should return correct ordinal words for small numbers', () => {
			expect(getOrdinalNumber(0)).toBe('first')
			expect(getOrdinalNumber(1)).toBe('second')
			expect(getOrdinalNumber(2)).toBe('third')
			expect(getOrdinalNumber(10)).toBe('eleventh')
			expect(getOrdinalNumber(19)).toBe('twentieth')
		})

		test('should return correct ordinal suffixes for larger numbers', () => {
			expect(getOrdinalNumber(20)).toBe('21st')
			expect(getOrdinalNumber(21)).toBe('22nd')
			expect(getOrdinalNumber(22)).toBe('23rd')
			expect(getOrdinalNumber(23)).toBe('24th')
			expect(getOrdinalNumber(30)).toBe('31st')
			expect(getOrdinalNumber(100)).toBe('101st')
			expect(getOrdinalNumber(110)).toBe('111th') // special case
			expect(getOrdinalNumber(111)).toBe('112th') // special case
			expect(getOrdinalNumber(112)).toBe('113th') // special case
		})
	})
})

describe('Integration Tests', () => {
	test('should handle complex CLI with multiple features', () => {
		let actionCalled = false
		let capturedOptions: any
		let capturedPositionals: any

		const program = cli()
			.name('complex-cli')
			.version('2.0.0')
			.description('A complex CLI with many features')
			.option(
				'verbose',
				z.boolean().alias('v').describe('Enable verbose output'),
			)
			.option('config', z.string().describe('Config file path'))
			.positional(
				'action',
				z.string().choices(['start', 'stop', 'restart'] as const),
			)

		program
			.command('deploy', {
				environment: z.string().choices(['dev', 'staging', 'prod'] as const),
				force: z.boolean().default(false),
				tags: z.array(z.string()).optional(),
			})
			.description('Deploy the application')
			.positional('target', z.string())
			.action(({ options, positionals }) => {
				actionCalled = true
				capturedOptions = options
				capturedPositionals = positionals
			})

		const result = program.parse([
			'deploy',
			'--environment',
			'prod',
			'--force',
			'--tags',
			'v1.0,stable',
			'server1',
		])

		expect(result).toBeUndefined()
		expect(actionCalled).toBe(true)
		expect(capturedOptions.environment).toBe('prod')
		expect(capturedOptions.force).toBe(true)
		expect(capturedOptions.tags).toEqual(['v1.0', 'stable'])
		expect(capturedPositionals[0]).toBe('server1')
	})

	test('should handle nested object validation', () => {
		const program = cli().option(
			'database',
			z.object({
				host: z.string(),
				port: z.number().min(1).max(65535),
				ssl: z.boolean().default(true),
			}),
		)

		const schema = z.object({
			host: z.string(),
			port: z.number().min(1).max(65535),
			ssl: z.boolean().default(true),
		})

		const result = schema.parse({
			host: 'localhost',
			port: 5432,
			ssl: false,
		})

		expect(result).toEqual({
			host: 'localhost',
			port: 5432,
			ssl: false,
		})
	})
})
