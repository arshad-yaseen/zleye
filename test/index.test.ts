import { describe, expect, test } from 'vitest'
import { cli, z } from '../src'

describe('CLI Parser Tests', () => {
	describe('Basic CLI Setup', () => {
		test('should set CLI name', () => {
			const program = cli().name('test-app')
			// @ts-expect-error
			expect(program._name).toBe('test-app')
		})

		test('should set CLI version', () => {
			const program = cli().version('1.0.0')
			// @ts-expect-error
			expect(program._version).toBe('1.0.0')
		})

		test('should set CLI description', () => {
			const program = cli().description('Test application')
			// @ts-expect-error
			expect(program._description).toBe('Test application')
		})

		test('should set custom usage', () => {
			const program = cli().usage('test-app [options]')
			// @ts-expect-error
			expect(program._usage).toBe('test-app [options]')
		})

		test('should add single example', () => {
			const program = cli().example('test-app --help')
			// @ts-expect-error
			expect(program._examples).toEqual(['test-app --help'])
		})

		test('should add multiple examples', () => {
			const program = cli().example(['example1', 'example2'])
			// @ts-expect-error
			expect(program._examples).toEqual(['example1', 'example2'])
		})

		test('should chain multiple examples', () => {
			const program = cli().example('ex1').example(['ex2', 'ex3'])
			// @ts-expect-error
			expect(program._examples).toEqual(['ex1', 'ex2', 'ex3'])
		})
	})

	describe('String Schema', () => {
		test('should parse basic string option', () => {
			const program = cli().option('name', z.string())
			const result = program.parse(['--name', 'test'])
			expect(result?.options.name).toBe('test')
		})

		test('should parse string with equals syntax', () => {
			const program = cli().option('name', z.string())
			const result = program.parse(['--name=test'])
			expect(result?.options.name).toBe('test')
		})

		test('should handle string default value', () => {
			const program = cli().option('name', z.string().default('default'))
			const result = program.parse([])
			expect(result?.options.name).toBe('default')
		})

		test('should handle optional string', () => {
			const program = cli().option('name', z.string().optional())
			const result = program.parse([])
			expect(result?.options.name).toBeUndefined()
		})

		test('should validate string min length', () => {
			const program = cli().option('name', z.string().min(3))
			expect(() =>
				program.parse(['--name', 'ab']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --name must be at least 3 characters]`,
			)
		})

		test('should pass string min length validation', () => {
			const program = cli().option('name', z.string().min(3))
			const result = program.parse(['--name', 'abc'])
			expect(result?.options.name).toBe('abc')
		})

		test('should validate string max length', () => {
			const program = cli().option('name', z.string().max(5))
			expect(() =>
				program.parse(['--name', 'toolong']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --name must be at most 5 characters]`,
			)
		})

		test('should pass string max length validation', () => {
			const program = cli().option('name', z.string().max(5))
			const result = program.parse(['--name', 'short'])
			expect(result?.options.name).toBe('short')
		})

		test('should validate string regex pattern', () => {
			const program = cli().option('name', z.string().regex(/^[a-z]+$/))
			expect(() =>
				program.parse(['--name', 'Test123']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --name must match pattern /^[a-z]+$/]`,
			)
		})

		test('should pass string regex validation', () => {
			const program = cli().option('name', z.string().regex(/^[a-z]+$/))
			const result = program.parse(['--name', 'test'])
			expect(result?.options.name).toBe('test')
		})

		test('should validate string choices', () => {
			const program = cli().option('mode', z.string().choices(['dev', 'prod']))
			expect(() =>
				program.parse(['--mode', 'test']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --mode must be one of dev or prod]`,
			)
		})

		test('should accept valid string choice', () => {
			const program = cli().option('mode', z.string().choices(['dev', 'prod']))
			const result = program.parse(['--mode', 'dev'])
			expect(result?.options.mode).toBe('dev')
		})

		test('should transform string to uppercase', () => {
			const program = cli().option(
				'name',
				z.string().transform((s) => s.toUpperCase()),
			)
			const result = program.parse(['--name', 'test'])
			expect(result?.options.name).toBe('TEST')
		})

		test('should handle string alias', () => {
			const program = cli().option('name', z.string().alias('n'))
			const result = program.parse(['-n', 'test'])
			expect(result?.options.name).toBe('test')
		})

		test('should handle multiple string constraints', () => {
			const program = cli().option(
				'name',
				z
					.string()
					.min(2)
					.max(10)
					.regex(/^[a-z]+$/),
			)
			const result = program.parse(['--name', 'test'])
			expect(result?.options.name).toBe('test')
		})

		test('should handle string with spaces using equals', () => {
			const program = cli().option('message', z.string())
			const result = program.parse(['--message=hello world'])
			expect(result?.options.message).toBe('hello world')
		})
	})

	describe('Number Schema', () => {
		test('should parse basic number option', () => {
			const program = cli().option('count', z.number())
			const result = program.parse(['--count', '42'])
			expect(result?.options.count).toBe(42)
		})

		test('should parse number with equals syntax', () => {
			const program = cli().option('count', z.number())
			const result = program.parse(['--count=42'])
			expect(result?.options.count).toBe(42)
		})

		test('should handle number default value', () => {
			const program = cli().option('count', z.number().default(10))
			const result = program.parse([])
			expect(result?.options.count).toBe(10)
		})

		test('should handle optional number', () => {
			const program = cli().option('count', z.number().optional())
			const result = program.parse([])
			expect(result?.options.count).toBeUndefined()
		})

		test('should reject non-numeric input', () => {
			const program = cli().option('count', z.number())
			expect(() =>
				program.parse(['--count', 'abc']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --count must be a number, received string]`,
			)
		})

		test('should validate number min value', () => {
			const program = cli().option('port', z.number().min(1024))
			expect(() =>
				program.parse(['--port', '80']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --port must be at least 1024]`,
			)
		})

		test('should pass number min validation', () => {
			const program = cli().option('port', z.number().min(1024))
			const result = program.parse(['--port', '3000'])
			expect(result?.options.port).toBe(3000)
		})

		test('should validate number max value', () => {
			const program = cli().option('port', z.number().max(65535))
			expect(() =>
				program.parse(['--port', '70000']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --port must be at most 65535]`,
			)
		})

		test('should pass number max validation', () => {
			const program = cli().option('port', z.number().max(65535))
			const result = program.parse(['--port', '8080'])
			expect(result?.options.port).toBe(8080)
		})

		test('should validate integer constraint', () => {
			const program = cli().option('count', z.number().int())
			expect(() =>
				program.parse(['--count', '3.14']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --count must be an integer]`,
			)
		})

		test('should pass integer validation', () => {
			const program = cli().option('count', z.number().int())
			const result = program.parse(['--count', '42'])
			expect(result?.options.count).toBe(42)
		})

		test('should validate positive number', () => {
			const program = cli().option('count', z.number().positive())
			expect(() =>
				program.parse(['--count', '0']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --count must be positive]`,
			)
		})

		test('should pass positive number validation', () => {
			const program = cli().option('count', z.number().positive())
			const result = program.parse(['--count', '1'])
			expect(result?.options.count).toBe(1)
		})

		test('should validate negative number', () => {
			const program = cli().option('offset', z.number().negative())
			expect(() =>
				program.parse(['--offset', '0']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --offset must be negative]`,
			)
		})

		test('should pass negative number validation', () => {
			const program = cli().option('offset', z.number().negative())
			const result = program.parse(['--offset', '-1'])
			expect(result?.options.offset).toBe(-1)
		})

		test('should handle floating point numbers', () => {
			const program = cli().option('value', z.number())
			const result = program.parse(['--value', Math.PI.toString()])
			expect(result?.options.value).toBe(Math.PI)
		})

		test('should handle scientific notation', () => {
			const program = cli().option('value', z.number())
			const result = program.parse(['--value', '1e5'])
			expect(result?.options.value).toBe(100000)
		})

		test('should handle negative numbers', () => {
			const program = cli().option('value', z.number())
			const result = program.parse(['--value', '-42'])
			expect(result?.options.value).toBe(-42)
		})

		test('should transform number value', () => {
			const program = cli().option(
				'count',
				z.number().transform((n) => n * 2),
			)
			const result = program.parse(['--count', '21'])
			expect(result?.options.count).toBe(42)
		})

		test('should handle multiple number constraints', () => {
			const program = cli().option(
				'port',
				z.number().int().min(1024).max(65535),
			)
			const result = program.parse(['--port', '3000'])
			expect(result?.options.port).toBe(3000)
		})
	})

	describe('Boolean Schema', () => {
		test('should parse boolean flag without value as true', () => {
			const program = cli().option('verbose', z.boolean())
			const result = program.parse(['--verbose'])
			expect(result?.options.verbose).toBe(true)
		})

		test('should parse boolean with true value', () => {
			const program = cli().option('verbose', z.boolean())
			const result = program.parse(['--verbose', 'true'])
			expect(result?.options.verbose).toBe(true)
		})

		test('should parse boolean with false value', () => {
			const program = cli().option('verbose', z.boolean())
			const result = program.parse(['--verbose', 'false'])
			expect(result?.options.verbose).toBe(false)
		})

		test('should parse boolean with equals true', () => {
			const program = cli().option('verbose', z.boolean())
			const result = program.parse(['--verbose=true'])
			expect(result?.options.verbose).toBe(true)
		})

		test('should parse boolean with equals false', () => {
			const program = cli().option('verbose', z.boolean())
			const result = program.parse(['--verbose=false'])
			expect(result?.options.verbose).toBe(false)
		})

		test('should parse boolean with 1 as true', () => {
			const program = cli().option('verbose', z.boolean())
			const result = program.parse(['--verbose', '1'])
			expect(result?.options.verbose).toBe(true)
		})

		test('should parse boolean with 0 as false', () => {
			const program = cli().option('verbose', z.boolean())
			const result = program.parse(['--verbose', '0'])
			expect(result?.options.verbose).toBe(false)
		})

		test('should default boolean to false when not provided', () => {
			const program = cli().option('verbose', z.boolean())
			const result = program.parse([])
			expect(result?.options.verbose).toBe(false)
		})

		test('should handle boolean with explicit default true', () => {
			const program = cli().option('cache', z.boolean().default(true))
			const result = program.parse([])
			expect(result?.options.cache).toBe(true)
		})

		test('should handle --no- prefix for boolean with default true', () => {
			const program = cli().option('cache', z.boolean().default(true))
			const result = program.parse(['--no-cache'])
			expect(result?.options.cache).toBe(false)
		})

		test('should handle boolean alias', () => {
			const program = cli().option('verbose', z.boolean().alias('v'))
			const result = program.parse(['-v'])
			expect(result?.options.verbose).toBe(true)
		})

		test('should handle optional boolean', () => {
			const program = cli().option('verbose', z.boolean().optional())
			const result = program.parse([])
			expect(result?.options.verbose).toBeUndefined()
		})

		test('should transform boolean value', () => {
			const program = cli().option(
				'quiet',
				z.boolean().transform((b) => !b),
			)
			const result = program.parse(['--quiet'])
			expect(result?.options.quiet).toBe(false)
		})

		test('should not consume next arg if not boolean literal', () => {
			const program = cli()
				.option('verbose', z.boolean())
				.option('file', z.string())
			expect(() =>
				program.parse(['--verbose', 'file.txt', '--file', 'other.txt']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: Unexpected argument: file.txt]`,
			)
		})
	})

	describe('Array Schema', () => {
		test('should parse comma-separated array', () => {
			const program = cli().option('items', z.array(z.string()))
			const result = program.parse(['--items', 'a,b,c'])
			expect(result?.options.items).toEqual(['a', 'b', 'c'])
		})

		test('should parse array with equals syntax', () => {
			const program = cli().option('items', z.array(z.string()))
			const result = program.parse(['--items=a,b,c'])
			expect(result?.options.items).toEqual(['a', 'b', 'c'])
		})

		test('should handle multiple array flags', () => {
			const program = cli().option('items', z.array(z.string()))
			const result = program.parse([
				'--items',
				'a',
				'--items',
				'b',
				'--items',
				'c',
			])
			expect(result?.options.items).toEqual(['a', 'b', 'c'])
		})

		test('should parse array of numbers', () => {
			const program = cli().option('ports', z.array(z.number()))
			const result = program.parse(['--ports', '8080,3000,5000'])
			expect(result?.options.ports).toEqual([8080, 3000, 5000])
		})

		test('should validate array item types', () => {
			const program = cli().option('ports', z.array(z.number()))
			expect(() =>
				program.parse(['--ports', '8080,abc,3000']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --ports[1] must be a number, received string]`,
			)
		})

		test('should validate array min length', () => {
			const program = cli().option('items', z.array(z.string()).min(2))
			expect(() =>
				program.parse(['--items', 'single']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --items must have at least 2 items]`,
			)
		})

		test('should pass array min length validation', () => {
			const program = cli().option('items', z.array(z.string()).min(2))
			const result = program.parse(['--items', 'a,b'])
			expect(result?.options.items).toEqual(['a', 'b'])
		})

		test('should validate array max length', () => {
			const program = cli().option('items', z.array(z.string()).max(2))
			expect(() =>
				program.parse(['--items', 'a,b,c']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --items must have at most 2 items]`,
			)
		})

		test('should pass array max length validation', () => {
			const program = cli().option('items', z.array(z.string()).max(2))
			const result = program.parse(['--items', 'a,b'])
			expect(result?.options.items).toEqual(['a', 'b'])
		})

		test('should handle array default value', () => {
			const program = cli().option(
				'items',
				z.array(z.string()).default(['default']),
			)
			const result = program.parse([])
			expect(result?.options.items).toEqual(['default'])
		})

		test('should handle optional array', () => {
			const program = cli().option('items', z.array(z.string()).optional())
			const result = program.parse([])
			expect(result?.options.items).toBeUndefined()
		})

		test('should validate array item constraints', () => {
			const program = cli().option(
				'ports',
				z.array(z.number().min(1024).max(65535)),
			)
			expect(() =>
				program.parse(['--ports', '80,3000']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --ports[0] must be at least 1024]`,
			)
		})

		test('should trim array items', () => {
			const program = cli().option('items', z.array(z.string()))
			const result = program.parse(['--items', ' a , b , c '])
			expect(result?.options.items).toEqual(['a', 'b', 'c'])
		})

		test('should filter empty array items', () => {
			const program = cli().option('items', z.array(z.string()))
			const result = program.parse(['--items', 'a,,b,,c'])
			expect(result?.options.items).toEqual(['a', 'b', 'c'])
		})

		test('should handle single item as array', () => {
			const program = cli().option('items', z.array(z.string()))
			const result = program.parse(['--items', 'single'])
			expect(result?.options.items).toEqual(['single'])
		})

		test('should transform array items', () => {
			const program = cli().option(
				'items',
				z.array(z.string().transform((s) => s.toUpperCase())),
			)
			const result = program.parse(['--items', 'a,b,c'])
			expect(result?.options.items).toEqual(['A', 'B', 'C'])
		})
	})

	describe('Object Schema', () => {
		test('should parse nested object properties', () => {
			const program = cli().option(
				'server',
				z.object({
					host: z.string(),
					port: z.number(),
				}),
			)
			const result = program.parse([
				'--server.host',
				'localhost',
				'--server.port',
				'3000',
			])
			expect(result?.options.server).toEqual({ host: 'localhost', port: 3000 })
		})

		test('should parse nested object with equals syntax', () => {
			const program = cli().option(
				'server',
				z.object({
					host: z.string(),
					port: z.number(),
				}),
			)
			const result = program.parse([
				'--server.host=localhost',
				'--server.port=3000',
			])
			expect(result?.options.server).toEqual({ host: 'localhost', port: 3000 })
		})

		test('should handle object defaults', () => {
			const program = cli().option(
				'server',
				z
					.object({
						host: z.string(),
						port: z.number(),
					})
					.default({
						host: 'localhost',
						port: 3000,
					}),
			)
			const result = program.parse([])
			expect(result?.options.server).toEqual({ host: 'localhost', port: 3000 })
		})

		test('should handle partial object input', () => {
			const program = cli().option(
				'server',
				z.object({
					host: z.string().default('localhost'),
					port: z.number().default(3000),
				}),
			)
			const result = program.parse(['--server.port', '8080'])
			expect(result?.options.server).toEqual({ host: 'localhost', port: 8080 })
		})

		test('should validate object field types', () => {
			const program = cli().option(
				'server',
				z.object({
					port: z.number(),
				}),
			)
			expect(() =>
				program.parse(['--server.port', 'abc']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --server.port must be a number, received string]`,
			)
		})

		test('should reject unknown object keys', () => {
			const program = cli().option(
				'server',
				z.object({
					host: z.string(),
				}),
			)
			expect(() =>
				program.parse(['--server.unknown', 'value']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: Unknown option key: unknown]`,
			)
		})

		test('should handle deeply nested objects', () => {
			const program = cli().option(
				'config',
				z.object({
					server: z.object({
						http: z.object({
							port: z.number(),
						}),
					}),
				}),
			)
			const result = program.parse(['--config.server.http.port', '8080'])
			expect(result?.options.config).toEqual({
				server: { http: { port: 8080 } },
			})
		})

		test('should handle object with any keys', () => {
			const program = cli().option('env', z.object(z.string()))
			const result = program.parse([
				'--env.NODE_ENV',
				'production',
				'--env.PORT',
				'3000',
			])
			expect(result?.options.env).toEqual({
				NODE_ENV: 'production',
				PORT: '3000',
			})
		})

		test('should validate values in object with any keys', () => {
			const program = cli().option('counts', z.object(z.number()))
			const result = program.parse(['--counts.a', '1', '--counts.b', '2'])
			expect(result?.options.counts).toEqual({ a: 1, b: 2 })
		})

		test('should reject invalid values in object with any keys', () => {
			const program = cli().option('counts', z.object(z.number()))
			expect(() =>
				program.parse(['--counts.a', 'abc']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --counts.a must be a number, received string]`,
			)
		})

		test('should handle optional object', () => {
			const program = cli().option(
				'server',
				z
					.object({
						host: z.string(),
					})
					.optional(),
			)
			const result = program.parse([])
			expect(result?.options.server).toBeUndefined()
		})

		test('should handle object with mixed field types', () => {
			const program = cli().option(
				'config',
				z.object({
					name: z.string(),
					port: z.number(),
					debug: z.boolean(),
					tags: z.array(z.string()),
				}),
			)
			const result = program.parse([
				'--config.name',
				'app',
				'--config.port',
				'3000',
				'--config.debug',
				'true',
				'--config.tags',
				'web,api',
			])
			expect(result?.options.config).toEqual({
				name: 'app',
				port: 3000,
				debug: true,
				tags: ['web', 'api'],
			})
		})
	})

	describe('Union Schema', () => {
		test('should parse union of string and number - string variant', () => {
			const program = cli().option('value', z.union(z.string(), z.number()))
			const result = program.parse(['--value', 'text'])
			expect(result?.options.value).toBe('text')
		})

		test('should parse union of string and number - number variant', () => {
			const program = cli().option('value', z.union(z.string(), z.number()))
			const result = program.parse(['--value', '42'])
			expect(result?.options.value).toBe(42)
		})

		test('should parse union with boolean - boolean variant', () => {
			const program = cli().option('flag', z.union(z.boolean(), z.string()))
			const result = program.parse(['--flag'])
			expect(result?.options.flag).toBe(true)
		})

		test('should parse union with boolean - string variant', () => {
			const program = cli().option('flag', z.union(z.boolean(), z.string()))
			const result = program.parse(['--flag', 'custom'])
			expect(result?.options.flag).toBe('custom')
		})

		test('should parse union of objects - first variant', () => {
			const program = cli().option(
				'source',
				z.union(
					z.object({ type: z.string().choices(['file']), path: z.string() }),
					z.object({ type: z.string().choices(['url']), url: z.string() }),
				),
			)
			const result = program.parse([
				'--source.type',
				'file',
				'--source.path',
				'/tmp/file',
			])
			expect(result?.options.source).toEqual({
				type: 'file',
				path: '/tmp/file',
			})
		})

		test('should parse union of objects - second variant', () => {
			const program = cli().option(
				'source',
				z.union(
					z.object({ type: z.string().choices(['file']), path: z.string() }),
					z.object({ type: z.string().choices(['url']), url: z.string() }),
				),
			)
			const result = program.parse([
				'--source.type',
				'url',
				'--source.url',
				'http://example.com',
			])
			expect(result?.options.source).toEqual({
				type: 'url',
				url: 'http://example.com',
			})
		})

		test('should validate union constraints', () => {
			const program = cli().option(
				'value',
				z.union(z.string().min(5), z.number().min(100)),
			)
			expect(() =>
				program.parse(['--value', 'hi']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --value must be at least 5 characters]`,
			)
		})

		test('should handle union with default', () => {
			const program = cli().option(
				'value',
				z.union(z.string(), z.number()).default('default'),
			)
			const result = program.parse([])
			expect(result?.options.value).toBe('default')
		})

		test('should handle optional union', () => {
			const program = cli().option(
				'value',
				z.union(z.string(), z.number()).optional(),
			)
			const result = program.parse([])
			expect(result?.options.value).toBeUndefined()
		})

		test('should handle union with object and any-key object', () => {
			const program = cli().option(
				'config',
				z.union(z.object({ preset: z.string() }), z.object(z.string())),
			)
			const result = program.parse(['--config.custom', 'value'])
			expect(result?.options.config).toEqual({ custom: 'value' })
		})
	})

	describe('Positional Arguments', () => {
		test('should parse single positional argument', () => {
			const program = cli().positional('file', z.string())
			const result = program.parse(['input.txt'])
			expect(result?.positionals).toEqual(['input.txt'])
		})

		test('should parse multiple positional arguments', () => {
			const program = cli()
				.positional('source', z.string())
				.positional('dest', z.string())
			const result = program.parse(['src.txt', 'dst.txt'])
			expect(result?.positionals).toEqual(['src.txt', 'dst.txt'])
		})

		test('should validate positional argument type', () => {
			const program = cli().positional('count', z.number())
			const result = program.parse(['42'])
			expect(result?.positionals).toEqual([42])
		})

		test('should reject invalid positional type', () => {
			const program = cli().positional('count', z.number())
			expect(() => program.parse(['abc'])).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: Argument "count": must be a number, received string]`,
			)
		})

		test('should handle optional positional', () => {
			const program = cli().positional('file', z.string().optional())
			const result = program.parse([])
			expect(result?.positionals).toEqual([undefined])
		})

		test('should handle positional with default', () => {
			const program = cli().positional(
				'file',
				z.string().default('default.txt'),
			)
			const result = program.parse([])
			expect(result?.positionals).toEqual(['default.txt'])
		})

		test('should validate positional constraints', () => {
			const program = cli().positional('port', z.number().min(1024).max(65535))
			expect(() => program.parse(['80'])).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: Argument "port": must be at least 1024]`,
			)
		})

		test('should handle positionals with options', () => {
			const program = cli()
				.option('verbose', z.boolean())
				.positional('file', z.string())
			const result = program.parse(['--verbose', 'input.txt'])
			expect(result?.options.verbose).toBe(true)
			expect(result?.positionals).toEqual(['input.txt'])
		})

		test('should handle positionals before options', () => {
			const program = cli()
				.option('verbose', z.boolean())
				.positional('file', z.string())
			const result = program.parse(['input.txt', '--verbose'])
			expect(result?.options.verbose).toBe(true)
			expect(result?.positionals).toEqual(['input.txt'])
		})

		test('should reject extra positional arguments', () => {
			const program = cli().positional('file', z.string())
			expect(() =>
				program.parse(['file1.txt', 'file2.txt']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: Unexpected argument: file2.txt]`,
			)
		})

		test('should transform positional values', () => {
			const program = cli().positional(
				'file',
				z.string().transform((s) => s.toUpperCase()),
			)
			const result = program.parse(['input.txt'])
			expect(result?.positionals).toEqual(['INPUT.TXT'])
		})

		test('should validate positional choices', () => {
			const program = cli().positional(
				'command',
				z.string().choices(['start', 'stop']),
			)
			expect(() =>
				program.parse(['restart']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: Argument "command": must be one of start or stop]`,
			)
		})

		test('should accept valid positional choice', () => {
			const program = cli().positional(
				'command',
				z.string().choices(['start', 'stop']),
			)
			const result = program.parse(['start'])
			expect(result?.positionals).toEqual(['start'])
		})

		test('should handle mixed positional types', () => {
			const program = cli()
				.positional('name', z.string())
				.positional('age', z.number())
				.positional('active', z.boolean())
			const result = program.parse(['John', '30', 'true'])
			expect(result?.positionals).toEqual(['John', 30, true])
		})

		test('should reject positional after rest', () => {
			const program = cli().rest('files', z.string())
			expect(() =>
				program.positional('output', z.string()),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: Cannot add positional after variadic positional]`,
			)
		})
	})

	describe('Variadic Arguments (Rest)', () => {
		test('should parse rest arguments', () => {
			const program = cli().rest('files', z.string())
			const result = program.parse(['file1.txt', 'file2.txt', 'file3.txt'])
			expect(result?.rest).toEqual(['file1.txt', 'file2.txt', 'file3.txt'])
		})

		test('should handle empty rest arguments', () => {
			const program = cli().rest('files', z.string())
			const result = program.parse([])
			expect(result?.rest).toEqual([])
		})

		test('should validate rest argument types', () => {
			const program = cli().rest('counts', z.number())
			const result = program.parse(['1', '2', '3'])
			expect(result?.rest).toEqual([1, 2, 3])
		})

		test('should reject invalid rest argument type', () => {
			const program = cli().rest('counts', z.number())
			expect(() =>
				program.parse(['1', 'abc', '3']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: Argument "counts": counts[1] must be a number, received string]`,
			)
		})

		test('should handle positionals before rest', () => {
			const program = cli()
				.positional('command', z.string())
				.rest('args', z.string())
			const result = program.parse(['run', 'arg1', 'arg2', 'arg3'])
			expect(result?.positionals).toEqual(['run'])
			expect(result?.rest).toEqual(['arg1', 'arg2', 'arg3'])
		})

		test('should validate rest item constraints', () => {
			const program = cli().rest('ports', z.number().min(1024).max(65535))
			expect(() =>
				program.parse(['80', '3000']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: Argument "ports": ports[0] must be at least 1024]`,
			)
		})

		test('should transform rest items', () => {
			const program = cli().rest(
				'files',
				z.string().transform((s) => s.toUpperCase()),
			)
			const result = program.parse(['a.txt', 'b.txt'])
			expect(result?.rest).toEqual(['A.TXT', 'B.TXT'])
		})

		test('should handle rest with options', () => {
			const program = cli()
				.option('verbose', z.boolean())
				.rest('files', z.string())
			const result = program.parse(['--verbose', 'file1.txt', 'file2.txt'])
			expect(result?.options.verbose).toBe(true)
			expect(result?.rest).toEqual(['file1.txt', 'file2.txt'])
		})

		test('should handle options after rest args', () => {
			const program = cli()
				.option('verbose', z.boolean())
				.rest('files', z.string())
			const result = program.parse(['file1.txt', '--verbose', 'file2.txt'])
			expect(result?.options.verbose).toBe(true)
			expect(result?.rest).toEqual(['file1.txt', 'file2.txt'])
		})

		test('should reject multiple rest definitions', () => {
			const program = cli().rest('files', z.string())
			expect(() =>
				program.rest('more', z.string()),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: Cannot have multiple variadic positionals]`,
			)
		})

		test('should handle rest with default', () => {
			const program = cli().rest('files', z.string().default('default.txt'))
			const result = program.parse([])
			expect(result?.rest).toEqual([])
		})
	})

	describe('Commands', () => {
		test('should parse basic command', () => {
			let captured: any = null
			const program = cli()
			program.command('test', {}).action(({ options }) => {
				captured = { options }
			})
			program.parse(['test'])
			expect(captured).toEqual({ options: {} })
		})

		test('should parse command with options', () => {
			let captured: any = null
			const program = cli()
			program
				.command('build', {
					output: z.string(),
					minify: z.boolean(),
				})
				.action(({ options }) => {
					captured = options
				})
			program.parse(['build', '--output', 'dist', '--minify'])
			expect(captured).toEqual({ output: 'dist', minify: true })
		})

		test('should parse command with positionals', () => {
			let captured: any = null
			const program = cli()
			program
				.command('copy', {})
				.positional('source', z.string())
				.positional('dest', z.string())
				.action(({ positionals }) => {
					captured = positionals
				})
			program.parse(['copy', 'src.txt', 'dst.txt'])
			expect(captured).toEqual(['src.txt', 'dst.txt'])
		})

		test('should parse command with rest arguments', () => {
			let captured: any = null
			const program = cli()
			program
				.command('run', {})
				.positional('script', z.string())
				.rest('args', z.string())
				.action(({ positionals, rest }) => {
					captured = { positionals, rest }
				})
			program.parse(['run', 'build', 'arg1', 'arg2'])
			expect(captured).toEqual({
				positionals: ['build'],
				rest: ['arg1', 'arg2'],
			})
		})

		test('should handle command description', () => {
			const program = cli()
			const cmd = program
				.command('test', {})
				.description('Test command')
				.action(() => {})
			expect(cmd.description).toBe('Test command')
		})

		test('should handle command usage', () => {
			const program = cli()
			const cmd = program
				.command('test', {})
				.usage('test [options]')
				.action(() => {})
			expect(cmd.usage).toBe('test [options]')
		})

		test('should handle command examples', () => {
			const program = cli()
			const cmd = program
				.command('test', {})
				.example('test --verbose')
				.example(['test --quiet', 'test --debug'])
				.action(() => {})
			expect(cmd.example).toEqual([
				'test --verbose',
				'test --quiet',
				'test --debug',
			])
		})

		test('should validate command options', () => {
			const program = cli()
			program
				.command('build', {
					threads: z.number().min(1).max(8),
				})
				.action(() => {})
			expect(() =>
				program.parse(['build', '--threads', '0']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --threads must be at least 1]`,
			)
		})

		test('should handle command option defaults', () => {
			let captured: any = null
			const program = cli()
			program
				.command('build', {
					output: z.string().default('dist'),
				})
				.action(({ options }) => {
					captured = options
				})
			program.parse(['build'])
			expect(captured).toEqual({ output: 'dist' })
		})

		test('should reject unknown command', () => {
			const program = cli()
			program.command('build', {}).action(() => {})
			expect(() =>
				program.parse(['unknown']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: Unknown command: unknown]`,
			)
		})

		test('should handle async command action', async () => {
			let captured: any = null
			const program = cli()
			program.command('async', {}).action(async ({ options }) => {
				await new Promise((r) => setTimeout(r, 1))
				captured = options
			})
			program.parse(['async'])
			await new Promise((r) => setTimeout(r, 10))
			expect(captured).toEqual({})
		})

		test('should handle command with all features', () => {
			let captured: any = null
			const program = cli()
			program
				.command('complex', {
					verbose: z.boolean(),
					config: z.string().optional(),
				})
				.description('Complex command')
				.positional('input', z.string())
				.rest('files', z.string())
				.action((args) => {
					captured = args
				})

			program.parse(['complex', '--verbose', 'input.txt', 'file1', 'file2'])
			expect(captured).toEqual({
				options: { verbose: true, config: undefined },
				positionals: ['input.txt'],
				rest: ['file1', 'file2'],
			})
		})
	})

	describe('Aliases', () => {
		test('should handle single character alias', () => {
			const program = cli().option('verbose', z.boolean().alias('v'))
			const result = program.parse(['-v'])
			expect(result?.options.verbose).toBe(true)
		})

		test('should handle alias with value', () => {
			const program = cli().option('output', z.string().alias('o'))
			const result = program.parse(['-o', 'dist'])
			expect(result?.options.output).toBe('dist')
		})

		test('should handle alias for number option', () => {
			const program = cli().option('port', z.number().alias('p'))
			const result = program.parse(['-p', '3000'])
			expect(result?.options.port).toBe(3000)
		})

		test('should reject unknown alias', () => {
			const program = cli().option('verbose', z.boolean())
			expect(() => program.parse(['-x'])).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: Unknown option: -x]`,
			)
		})

		test('should handle multiple aliases in same command', () => {
			const program = cli()
				.option('verbose', z.boolean().alias('v'))
				.option('quiet', z.boolean().alias('q'))
			const result = program.parse(['-v', '-q'])
			expect(result?.options.verbose).toBe(true)
			expect(result?.options.quiet).toBe(true)
		})
	})

	describe('Double Dash Handling', () => {
		test('should treat args after -- as raw positionals', () => {
			const program = cli()
				.option('verbose', z.boolean())
				.rest('args', z.string())
			const result = program.parse(['--verbose', '--', '--not-a-flag', 'file'])
			expect(result?.options.verbose).toBe(true)
			expect(result?.rest).toEqual(['--not-a-flag', 'file'])
		})

		test('should pass -- args to rest unchanged', () => {
			const program = cli().rest('args', z.string())
			const result = program.parse(['--', '-v', '--help', 'test'])
			expect(result?.rest).toEqual(['-v', '--help', 'test'])
		})

		test('should handle -- with positionals', () => {
			const program = cli()
				.positional('file', z.string())
				.rest('args', z.string())
			const result = program.parse(['input.txt', '--', '--flag'])
			expect(result?.positionals).toEqual(['input.txt'])
			expect(result?.rest).toEqual(['--flag'])
		})

		test('should handle empty args after --', () => {
			const program = cli().rest('args', z.string())
			const result = program.parse(['--'])
			expect(result?.rest).toEqual([])
		})
	})

	describe('Error Messages', () => {
		test('should show helpful error for unknown option', () => {
			const program = cli()
			expect(() =>
				program.parse(['--unknown']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: Unknown option: --unknown]`,
			)
		})

		test('should show helpful error for missing required option', () => {
			const program = cli().option('required', z.string())
			expect(() => program.parse([])).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --required is required]`,
			)
		})

		test('should show helpful error for invalid type', () => {
			const program = cli().option('port', z.number())
			expect(() =>
				program.parse(['--port', 'abc']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --port must be a number, received string]`,
			)
		})

		test('should show helpful error for constraint violation', () => {
			const program = cli().option('port', z.number().min(1024))
			expect(() =>
				program.parse(['--port', '80']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --port must be at least 1024]`,
			)
		})

		test('should show helpful error for invalid choice', () => {
			const program = cli().option('env', z.string().choices(['dev', 'prod']))
			expect(() =>
				program.parse(['--env', 'test']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --env must be one of dev or prod]`,
			)
		})

		test('should show helpful error for array item validation', () => {
			const program = cli().option('ports', z.array(z.number()))
			expect(() =>
				program.parse(['--ports', '80,abc,3000']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --ports[1] must be a number, received string]`,
			)
		})

		test('should show helpful error for positional validation', () => {
			const program = cli().positional('count', z.number())
			expect(() => program.parse(['abc'])).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: Argument "count": must be a number, received string]`,
			)
		})

		test('should show helpful error for extra positionals', () => {
			const program = cli().positional('file', z.string())
			expect(() =>
				program.parse(['file1', 'file2']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: Unexpected argument: file2]`,
			)
		})
	})

	describe('Complex Integration', () => {
		test('should handle complex nested configuration', () => {
			const program = cli().option(
				'database',
				z.object({
					connections: z.object({
						primary: z.object({
							host: z.string(),
							port: z.number(),
							ssl: z.boolean().default(false),
						}),
						replica: z
							.object({
								host: z.string(),
								port: z.number(),
							})
							.optional(),
					}),
				}),
			)

			const result = program.parse([
				'--database.connections.primary.host',
				'db1.example.com',
				'--database.connections.primary.port',
				'5432',
				'--database.connections.replica.host',
				'db2.example.com',
				'--database.connections.replica.port',
				'5433',
			])

			expect(result?.options.database).toEqual({
				connections: {
					primary: { host: 'db1.example.com', port: 5432, ssl: false },
					replica: { host: 'db2.example.com', port: 5433 },
				},
			})
		})

		test('should handle mixed option types with positionals and rest', () => {
			const program = cli()
				.option('verbose', z.boolean())
				.option('config', z.string().optional())
				.option('threads', z.number().default(4))
				.option('features', z.array(z.string()))
				.positional('command', z.string().choices(['build', 'test']))
				.rest('files', z.string())

			const result = program.parse([
				'build',
				'--verbose',
				'--threads',
				'8',
				'--features',
				'optimize,minify',
				'src/index.js',
				'src/utils.js',
			])

			expect(result).toEqual({
				options: {
					verbose: true,
					config: undefined,
					threads: 8,
					features: ['optimize', 'minify'],
				},
				positionals: ['build'],
				rest: ['src/index.js', 'src/utils.js'],
			})
		})

		test('should handle union with objects and primitives', () => {
			const program = cli().option(
				'source',
				z.union(
					z.string().regex(/^https?:\/\//),
					z.object({
						type: z.string().choices(['file']),
						path: z.string(),
						encoding: z.string().default('utf8'),
					}),
					z.boolean(),
				),
			)

			let result = program.parse(['--source', 'https://example.com'])
			expect(result?.options.source).toBe('https://example.com')

			result = program.parse([
				'--source.type',
				'file',
				'--source.path',
				'/tmp/data',
			])
			expect(result?.options.source).toEqual({
				type: 'file',
				path: '/tmp/data',
				encoding: 'utf8',
			})

			result = program.parse(['--source'])
			expect(result?.options.source).toBe(true)
		})

		test('should handle command with complex nested options', () => {
			let captured: any = null
			const program = cli()

			program
				.command('deploy', {
					environment: z.string().choices(['dev', 'staging', 'prod']),
					config: z.object({
						replicas: z.number().min(1).max(10),
						resources: z.object({
							cpu: z.string(),
							memory: z.string(),
						}),
					}),
					services: z.array(z.string()),
					dry: z.boolean().default(false),
				})
				.positional('app', z.string())
				.action((args) => {
					captured = args
				})

			program.parse([
				'deploy',
				'my-app',
				'--environment',
				'prod',
				'--config.replicas',
				'3',
				'--config.resources.cpu',
				'2',
				'--config.resources.memory',
				'4Gi',
				'--services',
				'web,api,worker',
				'--dry',
			])

			expect(captured).toEqual({
				options: {
					environment: 'prod',
					config: {
						replicas: 3,
						resources: { cpu: '2', memory: '4Gi' },
					},
					services: ['web', 'api', 'worker'],
					dry: true,
				},
				positionals: ['my-app'],
				rest: undefined,
			})
		})

		test('should handle transform chains', () => {
			const program = cli().option(
				'data',
				z
					.string()
					.transform((s) => JSON.parse(s))
					.transform((obj) => ({ ...obj, processed: true })),
			)

			const result = program.parse(['--data', '{"value":42}'])
			expect(result?.options.data).toEqual({ value: 42, processed: true })
		})

		test('should handle array of objects', () => {
			const program = cli().option(
				'servers',
				z.array(
					z.string().transform((s) => {
						const [host, port] = s.split(':')
						return { host, port: Number.parseInt(port) }
					}),
				),
			)

			const result = program.parse([
				'--servers',
				'localhost:3000,example.com:8080',
			])
			expect(result?.options.servers).toEqual([
				{ host: 'localhost', port: 3000 },
				{ host: 'example.com', port: 8080 },
			])
		})

		test('should handle all option types together', () => {
			const program = cli()
				.option('string', z.string())
				.option('number', z.number())
				.option('boolean', z.boolean())
				.option('array', z.array(z.string()))
				.option('object', z.object({ key: z.string() }))
				.option('union', z.union(z.string(), z.number()))

			const result = program.parse([
				'--string',
				'text',
				'--number',
				'42',
				'--boolean',
				'--array',
				'a,b,c',
				'--object.key',
				'value',
				'--union',
				'100',
			])

			expect(result?.options).toEqual({
				string: 'text',
				number: 42,
				boolean: true,
				array: ['a', 'b', 'c'],
				object: { key: 'value' },
				union: 100,
			})
		})
	})

	describe('Edge Cases', () => {
		test('should handle empty string option value', () => {
			const program = cli().option('value', z.string().min(0))
			const result = program.parse(['--value='])
			expect(result?.options.value).toBe('')
		})

		test('should handle option value with special characters', () => {
			const program = cli().option('regex', z.string())
			const result = program.parse(['--regex=^[a-z]+$'])
			expect(result?.options.regex).toBe('^[a-z]+$')
		})

		test('should handle negative numbers', () => {
			const program = cli().option('offset', z.number())
			const result = program.parse(['--offset', '-10'])
			expect(result?.options.offset).toBe(-10)
		})

		test('should handle very large numbers', () => {
			const program = cli().option('big', z.number())
			const result = program.parse(['--big', '9999999999'])
			expect(result?.options.big).toBe(9999999999)
		})

		test('should handle decimal numbers', () => {
			const program = cli().option('pi', z.number())
			const result = program.parse(['--pi', Math.PI.toString()])
			expect(result?.options.pi).toBe(Math.PI)
		})

		test('should handle boolean-like strings as string values', () => {
			const program = cli().option('value', z.string())
			const result = program.parse(['--value', 'true'])
			expect(result?.options.value).toBe('true')
		})

		test('should handle number-like strings as string values', () => {
			const program = cli().option('id', z.string())
			const result = program.parse(['--id', '12345'])
			expect(result?.options.id).toBe('12345')
		})

		test('should handle arrays with single empty string', () => {
			const program = cli().option('items', z.array(z.string().min(0)))
			const result = program.parse(['--items', ''])
			expect(result?.options.items).toEqual([''])
		})

		test('should handle deeply nested object paths', () => {
			const program = cli().option(
				'a',
				z.object({
					b: z.object({
						c: z.object({
							d: z.object({
								e: z.string(),
							}),
						}),
					}),
				}),
			)
			const result = program.parse(['--a.b.c.d.e', 'deep'])
			expect(result?.options.a.b.c.d.e).toBe('deep')
		})

		test('should handle option names with numbers', () => {
			const program = cli().option('port8080', z.number())
			const result = program.parse(['--port8080', '3000'])
			expect(result?.options.port8080).toBe(3000)
		})

		test('should handle option names with hyphens', () => {
			const program = cli().option('dry-run', z.boolean())
			const result = program.parse(['--dry-run'])
			expect(result?.options['dry-run']).toBe(true)
		})

		test('should handle equals sign in string value', () => {
			const program = cli().option('equation', z.string())
			const result = program.parse(['--equation=a=b+c'])
			expect(result?.options.equation).toBe('a=b+c')
		})

		test('should handle multiple equals signs', () => {
			const program = cli().option('value', z.string())
			const result = program.parse(['--value=key=value=more'])
			expect(result?.options.value).toBe('key=value=more')
		})

		test('should handle whitespace in values with equals', () => {
			const program = cli().option('message', z.string())
			const result = program.parse(['--message=hello world'])
			expect(result?.options.message).toBe('hello world')
		})

		test('should reject flag that looks like number', () => {
			const program = cli()
			expect(() => program.parse(['--123'])).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: Unknown option: --123]`,
			)
		})

		test('should handle zero as number value', () => {
			const program = cli().option('value', z.number())
			const result = program.parse(['--value', '0'])
			expect(result?.options.value).toBe(0)
		})

		test('should handle empty array from empty comma-separated value', () => {
			const program = cli().option('items', z.array(z.string()))
			const result = program.parse(['--items', ',,,'])
			expect(result?.options.items).toEqual([])
		})

		test('should handle array with whitespace items', () => {
			const program = cli().option('items', z.array(z.string()))
			const result = program.parse(['--items', ' , a , , b , '])
			expect(result?.options.items).toEqual(['a', 'b'])
		})

		test('should handle union error with most specific message', () => {
			const program = cli().option(
				'value',
				z.union(
					z.object({ type: z.string().choices(['a']) }),
					z.object({ type: z.string().choices(['b']) }),
				),
			)
			expect(() =>
				program.parse(['--value.type', 'c']),
			).toThrowErrorMatchingInlineSnapshot(
				`[CLIError: --value.type must be one of a]`,
			)
		})

		test('should handle command returning undefined', () => {
			const program = cli()
			program.command('test', {}).action(() => {})
			const result = program.parse(['test'])
			expect(result).toBeUndefined()
		})

		test('should handle no arguments at all', () => {
			const program = cli().option('value', z.string().default('default'))
			const result = program.parse([])
			expect(result?.options.value).toBe('default')
		})

		test('should handle only positionals, no options', () => {
			const program = cli().positional('file', z.string())
			const result = program.parse(['input.txt'])
			expect(result?.positionals).toEqual(['input.txt'])
			expect(result?.options).toEqual({})
		})

		test('should handle schema without description', () => {
			const program = cli().option('value', z.string())
			// @ts-expect-error
			expect(program._options.value._description).toBeUndefined()
		})

		test('should handle transform that throws', () => {
			const program = cli().option(
				'value',
				z.string().transform(() => {
					throw new Error('Transform failed')
				}),
			)
			expect(() =>
				program.parse(['--value', 'test']),
			).toThrowErrorMatchingInlineSnapshot(`[Error: Transform failed]`)
		})

		test('should handle circular transform', () => {
			const program = cli().option(
				'value',
				z
					.string()
					.transform((s) => s.toUpperCase())
					.transform((s) => s.toLowerCase()),
			)
			const result = program.parse(['--value', 'Test'])
			expect(result?.options.value).toBe('test')
		})

		test('should handle option order independence', () => {
			const program = cli()
				.option('a', z.string())
				.option('b', z.string())
				.option('c', z.string())

			const result1 = program.parse(['--a', '1', '--b', '2', '--c', '3'])
			const result2 = program.parse(['--c', '3', '--a', '1', '--b', '2'])
			const result3 = program.parse(['--b', '2', '--c', '3', '--a', '1'])

			expect(result1?.options).toEqual(result2?.options)
			expect(result2?.options).toEqual(result3?.options)
		})
	})
})
