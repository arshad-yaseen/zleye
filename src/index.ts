import pc from 'picocolors'
import { joinWithAnd, joinWithOr, processExit } from './utils'

type Prettify<T> = { [K in keyof T]: T[K] } & {}
type ExtractPositionalType<T> = T extends PositionalSchema<infer U> ? U : never
type ExtractPositionalTypes<T extends readonly PositionalSchema<any>[]> = {
	readonly [K in keyof T]: ExtractPositionalType<T[K]>
}
type ExtractRestType<
	T extends readonly (PositionalSchema<any> | VariadicPositionalSchema<any>)[],
> = T extends readonly [...infer _, VariadicPositionalSchema<infer U>]
	? U[]
	: never
type ExtractNonRestPositionals<
	T extends readonly (PositionalSchema<any> | VariadicPositionalSchema<any>)[],
> = T extends readonly [...infer P, VariadicPositionalSchema<any>]
	? P extends readonly PositionalSchema<any>[]
		? ExtractPositionalTypes<P>
		: readonly []
	: T extends readonly PositionalSchema<any>[]
		? ExtractPositionalTypes<T>
		: readonly []

type SchemaType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'union'
type UnionToTuple<T> = T extends Schema<infer U>[] ? U : never

interface BaseSchema<T = any> {
	_type: SchemaType
	_output: T
	_input: unknown
	_description?: string
	_alias?: string
	_example?: string
	_isOptional?: boolean
	_defaultValue?: T
	parse(value: unknown, path?: string): T
	optional(): Schema<T | undefined>
	default(value: T): Schema<T>
	transform<U>(fn: (value: T) => U): Schema<U>
	describe(description: string): this
	alias(alias: string): this
	example(example: string): this
}

type Schema<T = any> = BaseSchema<T>

interface StringSchema<T extends string = string> extends BaseSchema<T> {
	min(length: number, message?: string): this
	max(length: number, message?: string): this
	regex(pattern: RegExp, message?: string): this
	choices<const U extends readonly string[]>(
		choices: U,
	): StringSchema<U[number]>
	_minLength?: number
	_maxLength?: number
	_minMessage?: string
	_maxMessage?: string
	_regex?: { pattern: RegExp; message?: string }
	_choices?: readonly string[]
}

interface NumberSchema extends BaseSchema<number> {
	min(value: number, message?: string): this
	max(value: number, message?: string): this
	int(message?: string): this
	positive(message?: string): this
	negative(message?: string): this
	_min?: number
	_max?: number
	_minMessage?: string
	_maxMessage?: string
	_isInt?: boolean
	_intMessage?: string
	_isPositive?: boolean
	_positiveMessage?: string
	_isNegative?: boolean
	_negativeMessage?: string
}

interface BooleanSchema extends BaseSchema<boolean> {}

interface ArraySchema<T> extends BaseSchema<T[]> {
	min(length: number, message?: string): this
	max(length: number, message?: string): this
	_itemSchema: Schema<T>
	_minLength?: number
	_maxLength?: number
	_minMessage?: string
	_maxMessage?: string
}

interface ObjectSchema<T extends Record<string, any> = Record<string, any>>
	extends BaseSchema<T> {
	_shape?: { [K in keyof T]: Schema<T[K]> }
	_isAnyKeys?: boolean
	_valueSchema?: Schema<any>
}

interface UnionSchema<T extends readonly Schema[]>
	extends BaseSchema<UnionToTuple<T>> {
	_schemas: T
}

interface PositionalSchema<T = string> extends BaseSchema<T> {
	_name: string
}

interface VariadicPositionalSchema<T = string> extends BaseSchema<T[]> {
	_name: string
	_isVariadic: true
	_itemSchema: Schema<T>
}

interface Command<
	TOptions extends Record<string, Schema> = any,
	TPositionals extends readonly (
		| PositionalSchema<any>
		| VariadicPositionalSchema<any>
	)[] = readonly [],
> {
	name: string
	description?: string
	usage?: string
	example?: string | string[]
	options: TOptions
	positionals?: (PositionalSchema<any> | VariadicPositionalSchema<any>)[]
	action: (args: {
		options: Prettify<{ [K in keyof TOptions]: TOptions[K]['_output'] }>
		positionals: ExtractNonRestPositionals<TPositionals>
		rest: ExtractRestType<TPositionals>
	}) => void | Promise<void>
}

interface CommandBuilder<
	TOptions extends Record<string, Schema>,
	TPositionals extends readonly (
		| PositionalSchema<any>
		| VariadicPositionalSchema<any>
	)[] = readonly [],
> {
	description(desc: string): this
	usage(usage: string): this
	example(example: string | string[]): this
	positional<T>(
		name: string,
		schema?: Schema<T>,
	): CommandBuilder<TOptions, [...TPositionals, PositionalSchema<T>]>
	rest<T>(
		name: string,
		schema?: Schema<T>,
	): CommandBuilder<TOptions, [...TPositionals, VariadicPositionalSchema<T>]>
	action(
		fn: (args: {
			options: Prettify<{ [K in keyof TOptions]: TOptions[K]['_output'] }>
			positionals: ExtractNonRestPositionals<TPositionals>
			rest: ExtractRestType<TPositionals>
		}) => void | Promise<void>,
	): Command<TOptions, TPositionals>
}

interface CLI<
	TOptions extends Record<string, Schema> = Record<string, never>,
	TPositionals extends readonly (
		| PositionalSchema<any>
		| VariadicPositionalSchema<any>
	)[] = readonly [],
> {
	name(name: string): this
	version(version: string): this
	description(description: string): this
	usage(usage: string): this
	example(example: string | string[]): this
	option<K extends string, S extends Schema>(
		name: K,
		schema: S,
	): CLI<TOptions & { [P in K]: S }, TPositionals>
	positional<T>(
		name: string,
		schema?: Schema<T>,
	): CLI<TOptions, [...TPositionals, PositionalSchema<T>]>
	rest<T>(
		name: string,
		schema?: Schema<T>,
	): CLI<TOptions, [...TPositionals, VariadicPositionalSchema<T>]>
	command<T extends Record<string, Schema> = Record<string, never>>(
		name: string,
		options?: T,
	): CommandBuilder<T>
	parse(argv?: string[]):
		| {
				options: Prettify<{ [K in keyof TOptions]: TOptions[K]['_output'] }>
				positionals: ExtractNonRestPositionals<TPositionals>
				rest: ExtractRestType<TPositionals>
		  }
		| undefined
}

class CLIError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'CLIError'
	}
}

class ErrorFormatter {
	static formatValue(value: unknown): string {
		if (value === null) return pc.red('null')
		if (value === undefined) return pc.red('undefined')
		if (typeof value === 'string') return pc.red(`"${value}"`)
		if (typeof value === 'number') return pc.yellow(String(value))
		if (typeof value === 'boolean') return pc.cyan(String(value))
		if (Array.isArray(value)) {
			if (!value.length) return pc.red('[]')
			if (value.length <= 3)
				return (
					pc.red('[') +
					value.map((v) => this.formatValue(v)).join(', ') +
					pc.red(']')
				)
			return pc.red(`[${value.length} items]`)
		}
		if (typeof value === 'object' && value !== null) {
			const keys = Object.keys(value)
			if (!keys.length) return pc.red('{}')
			if (keys.length <= 3) return pc.red('{') + keys.join(', ') + pc.red('}')
			return pc.red(`{${keys.length} keys}`)
		}
		return pc.red(String(value))
	}

	static formatCorrectUsage(
		flagName: string,
		value: unknown,
		schema: Schema,
		isNested = false,
	): string {
		const prefix = isNested ? '' : '--'
		const type = schema._type

		if (type === 'boolean')
			return `${pc.green(`${prefix}${flagName}`)} ${pc.dim('or')} ${pc.green(`${prefix}${flagName} true`)}`

		if (type === 'number') {
			const num = schema as NumberSchema
			let example = 42
			if (num._min !== undefined) example = Math.max(example, num._min)
			if (num._max !== undefined) example = Math.min(example, num._max)
			if (num._isPositive && example <= 0) example = 1
			if (num._isNegative && example >= 0) example = -1
			if (num._isInt) example = Math.floor(example)
			return pc.green(`${prefix}${flagName} ${example}`)
		}

		if (type === 'string') {
			const str = schema as StringSchema
			if (str._choices?.length)
				return pc.green(`${prefix}${flagName} ${str._choices[0]}`)
			const example = str._minLength ? 'x'.repeat(str._minLength) : 'value'
			return pc.green(`${prefix}${flagName} "${example}"`)
		}

		if (type === 'array') {
			const arr = schema as ArraySchema<any>
			const item = this.getExampleValue(arr._itemSchema)
			const examples = Array(arr._minLength || 1).fill(item)
			return pc.green(`${prefix}${flagName} ${examples.join(',')}`)
		}

		if (type === 'object') {
			const obj = schema as ObjectSchema
			if (obj._isAnyKeys) {
				const value = obj._valueSchema
					? this.getExampleValue(obj._valueSchema)
					: 'value'
				return pc.green(`${prefix}${flagName}.key ${value}`)
			}
			if (obj._shape) {
				const keys = Object.keys(obj._shape)
				if (keys.length) {
					const key = keys[0]
					return pc.green(
						`${prefix}${flagName}.${key} ${this.getExampleValue(obj._shape[key])}`,
					)
				}
			}
		}

		if (type === 'union') {
			const union = schema as UnionSchema<any>
			const matchingSchema =
				union._schemas.find(
					(s: any) =>
						s._type === typeof value ||
						(s._type === 'array' && Array.isArray(value)),
				) ||
				union._schemas.find((s: any) => s._type !== 'object') ||
				union._schemas[0]
			return this.formatCorrectUsage(flagName, value, matchingSchema, isNested)
		}

		return pc.green(`${prefix}${flagName} <value>`)
	}

	static getExampleValue(schema: Schema): string {
		if (schema._example) return schema._example
		const type = schema._type

		if (type === 'boolean') return 'true'
		if (type === 'number') {
			const num = schema as NumberSchema
			let example = 42
			if (num._min !== undefined) example = Math.max(example, num._min)
			if (num._max !== undefined) example = Math.min(example, num._max)
			if (num._isPositive && example <= 0) example = 1
			if (num._isNegative && example >= 0) example = -1
			if (num._isInt) example = Math.floor(example)
			return String(example)
		}
		if (type === 'string') {
			const str = schema as StringSchema
			return str._choices?.length ? str._choices[0] : 'value'
		}
		if (type === 'array') {
			const arr = schema as ArraySchema<any>
			const item = this.getExampleValue(arr._itemSchema)
			return `${item},${item}`
		}
		return 'value'
	}

	static showDiff(received: string, expected: string): string {
		return `${pc.dim('  Received: ')}${pc.red(received)}\n${pc.dim('  Expected: ')}${pc.green(expected)}`
	}
}

abstract class BaseSchemaImpl<T> implements BaseSchema<T> {
	abstract _type: SchemaType
	_output!: T
	_input!: unknown
	_description?: string
	_alias?: string
	_example?: string
	_isOptional?: boolean
	_defaultValue?: T

	protected abstract validateValue(value: unknown, path: string): T

	parse(value: unknown, path = 'value'): T {
		if (value === undefined) {
			if (this._isOptional) return undefined as any
			if (this._defaultValue !== undefined) return this._defaultValue
			throw new CLIError(`${path} is required`)
		}
		return this.validateValue(value, path)
	}

	optional(): Schema<T | undefined> {
		const clone = Object.create(this)
		clone._isOptional = true
		return clone
	}

	default(value: T): Schema<T> {
		const clone = Object.create(this)
		clone._defaultValue = value
		return clone
	}

	transform<U>(fn: (value: T) => U): Schema<U> {
		const clone = Object.create(this)
		const originalParse = clone.parse.bind(clone)
		clone.parse = (value: unknown, path?: string) =>
			fn(originalParse(value, path))
		return clone
	}

	describe(description: string): this {
		this._description = description
		return this
	}

	alias(alias: string): this {
		this._alias = alias
		return this
	}

	example(example: string): this {
		this._example = example
		return this
	}
}

class StringSchemaImpl<T extends string = string>
	extends BaseSchemaImpl<T>
	implements StringSchema<T>
{
	_type = 'string' as const
	_minLength?: number
	_maxLength?: number
	_minMessage?: string
	_maxMessage?: string
	_regex?: { pattern: RegExp; message?: string }
	_choices?: readonly string[]

	protected validateValue(value: unknown, path: string): T {
		if (typeof value !== 'string') {
			const flagName = path.replace('--', '')
			const isArg = !path.startsWith('--')
			throw new CLIError(
				`${path} expects a text value\n\n${ErrorFormatter.showDiff(
					isArg
						? `${flagName} ${ErrorFormatter.formatValue(value)}`
						: `--${flagName} ${ErrorFormatter.formatValue(value)}`,
					isArg
						? `${flagName} "value"`
						: ErrorFormatter.formatCorrectUsage(flagName, value, this),
				)}`,
			)
		}

		if (this._choices && !this._choices.includes(value)) {
			const flagName = path.replace('--', '')
			const isArg = !path.startsWith('--')
			const similar = this._choices.find(
				(c) =>
					c.toLowerCase().includes(value.toLowerCase()) ||
					value.toLowerCase().includes(c.toLowerCase()),
			)
			const choices = Array.from(this._choices)

			let message = `${path} must be one of: ${choices.map((c) => pc.cyan(c)).join(', ')}\n\n`
			message += similar
				? `${ErrorFormatter.showDiff(
						isArg ? `${flagName} ${value}` : `--${flagName} ${value}`,
						isArg ? `${flagName} ${similar}` : `--${flagName} ${similar}`,
					)}\n\n${pc.dim('Did you mean')} ${pc.green(similar)}${pc.dim('?')}`
				: ErrorFormatter.showDiff(
						isArg ? `${flagName} ${value}` : `--${flagName} ${value}`,
						isArg ? `${flagName} ${choices[0]}` : `--${flagName} ${choices[0]}`,
					)
			throw new CLIError(message)
		}

		if (this._minLength !== undefined && value.length < this._minLength) {
			const flagName = path.replace('--', '')
			const isArg = !path.startsWith('--')
			const padded = value + 'x'.repeat(this._minLength - value.length)
			throw new CLIError(
				this._minMessage ||
					`${path} must be at least ${this._minLength} characters\n\n${ErrorFormatter.showDiff(
						`${isArg ? '' : '--'}${flagName} "${value}" ${pc.dim(`(${value.length} chars)`)}`,
						`${isArg ? '' : '--'}${flagName} "${padded}" ${pc.dim(`(${padded.length} chars)`)}`,
					)}`,
			)
		}

		if (this._maxLength !== undefined && value.length > this._maxLength) {
			const flagName = path.replace('--', '')
			const isArg = !path.startsWith('--')
			const truncated = value.slice(0, this._maxLength)
			throw new CLIError(
				this._maxMessage ||
					`${path} must be at most ${this._maxLength} characters\n\n${ErrorFormatter.showDiff(
						`${isArg ? '' : '--'}${flagName} "${value}" ${pc.dim(`(${value.length} chars)`)}`,
						`${isArg ? '' : '--'}${flagName} "${truncated}" ${pc.dim(`(${truncated.length} chars)`)}`,
					)}`,
			)
		}

		if (this._regex && !this._regex.pattern.test(value)) {
			throw new CLIError(
				this._regex.message ||
					`${path} format is invalid\n\n  ${pc.dim('Received:')} ${pc.red(`"${value}"`)}\n  ${pc.dim('Pattern:')} ${pc.cyan(this._regex.pattern.toString())}`,
			)
		}

		return value as T
	}

	min(length: number, message?: string): this {
		this._minLength = length
		this._minMessage = message
		return this
	}

	max(length: number, message?: string): this {
		this._maxLength = length
		this._maxMessage = message
		return this
	}

	regex(pattern: RegExp, message?: string): this {
		this._regex = { pattern, message }
		return this
	}

	choices<const U extends readonly string[]>(
		choices: U,
	): StringSchema<U[number]> {
		const clone = Object.create(this) as StringSchemaImpl<U[number]>
		clone._choices = choices
		return clone
	}
}

class NumberSchemaImpl extends BaseSchemaImpl<number> implements NumberSchema {
	_type = 'number' as const
	_min?: number
	_max?: number
	_minMessage?: string
	_maxMessage?: string
	_isInt?: boolean
	_intMessage?: string
	_isPositive?: boolean
	_positiveMessage?: string
	_isNegative?: boolean
	_negativeMessage?: string

	protected validateValue(value: unknown, path: string): number {
		const num = Number(value)
		const flagName = path.replace('--', '')
		const isArg = !path.startsWith('--')

		if (Number.isNaN(num)) {
			throw new CLIError(
				`${path} expects a numeric value\n\n${ErrorFormatter.showDiff(
					`${isArg ? '' : '--'}${flagName} ${ErrorFormatter.formatValue(value)}`,
					isArg
						? `${flagName} 42`
						: ErrorFormatter.formatCorrectUsage(flagName, value, this),
				)}`,
			)
		}

		if (this._isInt && !Number.isInteger(num)) {
			throw new CLIError(
				this._intMessage ||
					`${path} must be a whole number\n\n${ErrorFormatter.showDiff(
						`${isArg ? '' : '--'}${flagName} ${num}`,
						`${isArg ? '' : '--'}${flagName} ${Math.floor(num)}`,
					)}`,
			)
		}

		if (this._isPositive && num <= 0) {
			throw new CLIError(
				this._positiveMessage ||
					`${path} must be positive\n\n${ErrorFormatter.showDiff(
						`${isArg ? '' : '--'}${flagName} ${num}`,
						`${isArg ? '' : '--'}${flagName} ${Math.abs(num) || 1}`,
					)}`,
			)
		}

		if (this._isNegative && num >= 0) {
			throw new CLIError(
				this._negativeMessage ||
					`${path} must be negative\n\n${ErrorFormatter.showDiff(
						`${isArg ? '' : '--'}${flagName} ${num}`,
						`${isArg ? '' : '--'}${flagName} ${num === 0 ? -1 : -Math.abs(num)}`,
					)}`,
			)
		}

		if (this._min !== undefined && num < this._min) {
			throw new CLIError(
				this._minMessage ||
					`${path} must be at least ${this._min}\n\n${ErrorFormatter.showDiff(
						`${isArg ? '' : '--'}${flagName} ${num}`,
						`${isArg ? '' : '--'}${flagName} ${this._min}`,
					)}`,
			)
		}

		if (this._max !== undefined && num > this._max) {
			throw new CLIError(
				this._maxMessage ||
					`${path} must be at most ${this._max}\n\n${ErrorFormatter.showDiff(
						`${isArg ? '' : '--'}${flagName} ${num}`,
						`${isArg ? '' : '--'}${flagName} ${this._max}`,
					)}`,
			)
		}

		return num
	}

	min(value: number, message?: string): this {
		this._min = value
		this._minMessage = message
		return this
	}

	max(value: number, message?: string): this {
		this._max = value
		this._maxMessage = message
		return this
	}

	int(message?: string): this {
		this._isInt = true
		this._intMessage = message
		return this
	}

	positive(message?: string): this {
		this._isPositive = true
		this._positiveMessage = message
		return this
	}

	negative(message?: string): this {
		this._isNegative = true
		this._negativeMessage = message
		return this
	}
}

class BooleanSchemaImpl
	extends BaseSchemaImpl<boolean>
	implements BooleanSchema
{
	_type = 'boolean' as const

	protected validateValue(value: unknown, path: string): boolean {
		const truthy = ['true', true, '1', 1]
		const falsy = ['false', false, '0', 0]

		if (truthy.includes(value as any)) return true
		if (falsy.includes(value as any)) return false

		const flagName = path.replace('--', '')
		const isArg = !path.startsWith('--')
		throw new CLIError(
			`${path} expects a boolean value\n\n${ErrorFormatter.showDiff(
				`${isArg ? '' : '--'}${flagName} ${ErrorFormatter.formatValue(value)}`,
				`${isArg ? '' : '--'}${flagName} true`,
			)}\n\n${pc.dim('Valid values: ')}${pc.cyan('true, false, 1, 0')}`,
		)
	}

	parse(value: unknown, path = 'value'): boolean {
		if (value === undefined) {
			if (this._isOptional) return undefined as any
			if (this._defaultValue !== undefined) return this._defaultValue
			return false
		}
		return this.validateValue(value, path)
	}
}

class ArraySchemaImpl<T> extends BaseSchemaImpl<T[]> implements ArraySchema<T> {
	_type = 'array' as const
	_itemSchema: Schema<T>
	_minLength?: number
	_maxLength?: number
	_minMessage?: string
	_maxMessage?: string

	constructor(itemSchema: Schema<T>) {
		super()
		this._itemSchema = itemSchema
	}

	protected validateValue(value: unknown, path: string): T[] {
		const arr = Array.isArray(value)
			? value
			: typeof value === 'string' && value.includes(',')
				? value
						.split(',')
						.map((item) => item.trim())
						.filter(Boolean)
				: [value]
		const flagName = path.replace('--', '')
		const isArg = !path.startsWith('--')

		if (this._minLength !== undefined && arr.length < this._minLength) {
			const item = ErrorFormatter.getExampleValue(this._itemSchema)
			const examples = Array(this._minLength).fill(item)
			throw new CLIError(
				this._minMessage ||
					`${path} needs at least ${this._minLength} items\n\n${ErrorFormatter.showDiff(
						`${isArg ? '' : '--'}${flagName} ${arr.join(',')} ${pc.dim(`(${arr.length} items)`)}`,
						`${isArg ? '' : '--'}${flagName} ${examples.join(',')} ${pc.dim(`(${examples.length} items)`)}`,
					)}`,
			)
		}

		if (this._maxLength !== undefined && arr.length > this._maxLength) {
			const limited = arr.slice(0, this._maxLength)
			throw new CLIError(
				this._maxMessage ||
					`${path} allows at most ${this._maxLength} items\n\n${ErrorFormatter.showDiff(
						`${isArg ? '' : '--'}${flagName} ${arr.join(',')} ${pc.dim(`(${arr.length} items)`)}`,
						`${isArg ? '' : '--'}${flagName} ${limited.join(',')} ${pc.dim(`(${limited.length} items)`)}`,
					)}`,
			)
		}

		const results: T[] = []
		const errors: Array<{ index: number; error: string }> = []

		for (let i = 0; i < arr.length; i++) {
			try {
				results.push(this._itemSchema.parse(arr[i], `${path}[${i}]`))
			} catch (error) {
				if (error instanceof CLIError) {
					errors.push({
						index: i,
						error: error.message
							.split('\n')[0]
							.replace(`${path}[${i}]`, `Item ${i + 1}`),
					})
				}
			}
		}

		if (errors.length) {
			const item = ErrorFormatter.getExampleValue(this._itemSchema)
			const valid = arr.map((v, i) =>
				errors.find((e) => e.index === i) ? item : v,
			)
			let message = `${path} has invalid items\n\n`
			for (const { error } of errors) message += `  ${pc.red('>')} ${error}\n`
			message += `\n${ErrorFormatter.showDiff(
				`${isArg ? '' : '--'}${flagName} ${arr.join(',')}`,
				`${isArg ? '' : '--'}${flagName} ${valid.join(',')}`,
			)}`
			throw new CLIError(message)
		}

		return results
	}

	min(length: number, message?: string): this {
		this._minLength = length
		this._minMessage = message
		return this
	}

	max(length: number, message?: string): this {
		this._maxLength = length
		this._maxMessage = message
		return this
	}
}

class ObjectSchemaImpl<T extends Record<string, any> = Record<string, any>>
	extends BaseSchemaImpl<T>
	implements ObjectSchema<T>
{
	_type = 'object' as const
	_shape?: { [K in keyof T]: Schema<T[K]> }
	_isAnyKeys?: boolean
	_valueSchema?: Schema<any>

	constructor(
		shapeOrValueSchema?: { [K in keyof T]: Schema<T[K]> } | Schema<any>,
	) {
		super()
		if (!shapeOrValueSchema) {
			throw new CLIError(
				`Configuration expects either specific properties or a value schema\n\n${pc.dim('Examples:\n')}  ${pc.green('{ name: string(), age: number() }')}  ${pc.dim('for specific properties')}\n  ${pc.green('string()')}                           ${pc.dim('for any properties with string values')}`,
			)
		}

		if (
			shapeOrValueSchema &&
			typeof shapeOrValueSchema === 'object' &&
			'_type' in shapeOrValueSchema
		) {
			this._isAnyKeys = true
			this._valueSchema = shapeOrValueSchema as Schema<any>
		} else {
			this._shape = shapeOrValueSchema as { [K in keyof T]: Schema<T[K]> }
			this._isAnyKeys = false
		}
	}

	protected validateValue(value: unknown, path: string): T {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			const flagName = path.replace('--', '')
			let correctUsage = ''

			if (this._shape) {
				const keys = Object.keys(this._shape)
				if (keys.length) {
					const key = keys[0]
					const example = ErrorFormatter.getExampleValue(this._shape[key])
					correctUsage = `--${flagName}.${key} ${example}`
				}
			} else if (this._isAnyKeys) {
				const example = this._valueSchema
					? ErrorFormatter.getExampleValue(this._valueSchema)
					: 'value'
				correctUsage = `--${flagName}.property ${example}`
			}

			throw new CLIError(
				`${path} expects property assignments\n\n  ${pc.dim('Received:')} ${ErrorFormatter.formatValue(value)}\n  ${pc.dim('Expected:')} ${pc.green(correctUsage)}\n\n${pc.dim('Use dot notation to set properties: ')}${pc.cyan(`--${flagName}.key value`)}`,
			)
		}

		const objectValue = value as Record<string, any>

		if (this._isAnyKeys && this._valueSchema) {
			const result: any = {}
			for (const [key, val] of Object.entries(objectValue)) {
				result[key] = this._valueSchema.parse(val, `${path}.${key}`)
			}
			return result as T
		}

		if (this._shape) {
			const result: any = {}
			const shapeKeys = new Set(Object.keys(this._shape))
			const unknownKeys = Object.keys(objectValue).filter(
				(k) => !shapeKeys.has(k),
			)

			if (unknownKeys.length) {
				const validKeys = Array.from(shapeKeys)
				const suggestions = unknownKeys.map((uk) => {
					const similar = validKeys.find(
						(vk) =>
							vk.toLowerCase() === uk.toLowerCase() ||
							vk.toLowerCase().includes(uk.toLowerCase()) ||
							uk.toLowerCase().includes(vk.toLowerCase()),
					)
					return similar ? `${pc.red(uk)} → ${pc.green(similar)}` : pc.red(uk)
				})

				const flagName = path.replace('--', '')
				throw new CLIError(
					`${path} received unexpected properties\n\n  ${pc.red('Invalid:')} ${suggestions.join(', ')}\n  ${pc.green('Valid:')} ${validKeys.map((k) => pc.cyan(k)).join(', ')}\n\n${pc.dim('Available properties:\n')}${validKeys.map((k) => `  ${pc.cyan(`--${flagName}.${k}`)}`).join('\n')}`,
				)
			}

			for (const [key, schema] of Object.entries(this._shape)) {
				result[key] = schema.parse(objectValue[key], `${path}.${key}`)
			}
			return result as T
		}

		throw new CLIError(`${path} configuration error`)
	}

	getMissingRequiredFields(value: unknown): string[] {
		if (!this._shape || typeof value !== 'object' || value === null) return []
		const missing: string[] = []
		const objectValue = value as Record<string, any>

		for (const [key, schema] of Object.entries(this._shape)) {
			if (
				!(key in objectValue) &&
				!schema._isOptional &&
				schema._defaultValue === undefined
			) {
				missing.push(key)
			}
		}
		return missing
	}
}

class UnionSchemaImpl<T extends readonly Schema[]>
	extends BaseSchemaImpl<UnionToTuple<T>>
	implements UnionSchema<T>
{
	_type = 'union' as const
	_schemas: T

	constructor(schemas: T) {
		super()
		this._schemas = schemas
	}

	protected validateValue(value: unknown, path: string): UnionToTuple<T> {
		const errors: { schema: Schema; error: string; specificity: number }[] = []
		const sortedSchemas = [...this._schemas].sort((a, b) =>
			a._type === 'number' && b._type === 'string'
				? -1
				: a._type === 'string' && b._type === 'number'
					? 1
					: 0,
		)

		for (const schema of sortedSchemas) {
			try {
				return schema.parse(value, path)
			} catch (error) {
				if (error instanceof CLIError) {
					let specificity = 0

					if (
						schema._type === 'object' &&
						typeof value === 'object' &&
						value !== null
					) {
						const objSchema = schema as ObjectSchemaImpl
						const providedKeys = Object.keys(value)
						const missingFields = objSchema.getMissingRequiredFields(value)

						if (providedKeys.length && objSchema._shape) {
							const validKeys = providedKeys.filter(
								(k) => k in objSchema._shape!,
							)
							specificity = validKeys.length * 10
							if (missingFields.length) specificity += 5

							// Check for invalid properties to show better error
							const invalidKeys = providedKeys.filter(
								(k) => !(k in objSchema._shape!),
							)
							if (invalidKeys.length && validKeys.length === 0) {
								const allValidKeys = Object.keys(objSchema._shape)
								const flagName = path.replace('--', '')
								throw new CLIError(
									`${path} has invalid properties: ${pc.red('{' + invalidKeys.join(', ') + '}')}\n\n${pc.dim('Available properties for object format:')}\n${allValidKeys.map((k) => `  ${pc.green(`--${flagName}.${k}`)} <value>`).join('\n')}\n\n${pc.dim('Or use other formats:')}\n  ${pc.green(`--${flagName}`)} ${pc.dim('(boolean)')}\n  ${pc.green(`--${flagName} value`)} ${pc.dim('(simple value)')}`,
								)
							}
						}
					} else if (schema._type === typeof value) {
						specificity = 1
					}

					errors.push({ schema, error: error.message, specificity })
				}
			}
		}

		errors.sort((a, b) => b.specificity - a.specificity)

		if (errors[0]?.specificity > 0) {
			throw new CLIError(errors[0].error)
		}

		const flagName = path.replace('--', '')
		const examples = this.getExampleUsages(flagName, value)

		throw new CLIError(
			`${path} accepts multiple formats\n\n${pc.dim('Valid formats:')}\n${examples.map((ex) => `  ${ex}`).join('\n')}\n\n  ${pc.dim('You provided:')} ${ErrorFormatter.formatValue(value)}\n\n${pc.dim('Run with --help for usage information')}`,
		)
	}

	private getExampleUsages(flagName: string, providedValue: unknown): string[] {
		const examples: string[] = []
		const seenTypes = new Set<string>()

		// Check what was provided to give better suggestions
		const providedKeys =
			typeof providedValue === 'object' &&
			providedValue !== null &&
			!Array.isArray(providedValue)
				? Object.keys(providedValue)
				: []

		for (const schema of this._schemas) {
			if (schema._type === 'object') {
				const objSchema = schema as ObjectSchema
				if (objSchema._isAnyKeys) {
					examples.push(
						`${pc.green(`--${flagName}.key value`)} ${pc.dim('(dynamic properties)')}`,
					)
				} else if (objSchema._shape) {
					const keys = Object.keys(objSchema._shape)
					if (keys.length) {
						// Show all available properties if user provided invalid ones
						if (providedKeys.length) {
							examples.push(
								`${pc.dim('Object properties:')}\n${keys.map((k) => `    ${pc.green(`--${flagName}.${k}`)} <value>`).join('\n')}`,
							)
						} else {
							examples.push(
								`${pc.green(`--${flagName}.property value`)} ${pc.dim(`(object properties: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''})`)}`,
							)
						}
					}
				}
			} else if (!seenTypes.has(schema._type)) {
				seenTypes.add(schema._type)
				const example = ErrorFormatter.formatCorrectUsage(
					flagName,
					undefined,
					schema,
				)
				const typeLabel = schema._type === 'boolean' ? 'flag' : schema._type
				examples.push(`${example} ${pc.dim(`(${typeLabel})`)}`)
			}
		}

		return examples
	}
}

class PositionalSchemaImpl<T = string>
	extends BaseSchemaImpl<T>
	implements PositionalSchema<T>
{
	_type = 'string' as const
	_name: string
	_baseSchema: Schema<T>

	constructor(name: string, schema?: Schema<T>) {
		super()
		this._name = name
		this._baseSchema = schema || (new StringSchemaImpl() as any)
		this._isOptional = this._baseSchema._isOptional
		this._defaultValue = this._baseSchema._defaultValue
		this._description = this._baseSchema._description
	}

	protected validateValue(value: unknown, path: string): T {
		return this._baseSchema.parse(value, path || this._name)
	}

	parse(value: unknown, path = 'value'): T {
		return this._baseSchema.parse(value, path)
	}
}

class VariadicPositionalSchemaImpl<T = string>
	extends BaseSchemaImpl<T[]>
	implements VariadicPositionalSchema<T>
{
	_type = 'array' as const
	_name: string
	_itemSchema: Schema<T>
	_isVariadic = true as const

	constructor(name: string, schema?: Schema<T>) {
		super()
		this._name = name
		this._itemSchema = schema || (new StringSchemaImpl() as any)
		this._description = schema?._description
	}

	protected validateValue(values: unknown, path: string): T[] {
		if (!Array.isArray(values)) {
			throw new CLIError(
				`${path} expects multiple values\n\n  ${pc.dim('Received:')} ${ErrorFormatter.formatValue(values)}\n  ${pc.dim('Expected:')} ${pc.green('value1 value2 value3...')}`,
			)
		}
		return values.map((value, i) =>
			this._itemSchema.parse(value, `${path}[${i}]`),
		)
	}

	parse(value: unknown, path = 'value'): T[] {
		if (value === undefined || (Array.isArray(value) && !value.length)) {
			if (this._isOptional || this._defaultValue !== undefined)
				return this._defaultValue || []
			return []
		}
		return this.validateValue(value, path)
	}
}

class CommandBuilderImpl<
	TOptions extends Record<string, Schema>,
	TPositionals extends readonly (
		| PositionalSchema<any>
		| VariadicPositionalSchema<any>
	)[] = readonly [],
> implements CommandBuilder<TOptions, TPositionals>
{
	constructor(
		private _name: string,
		private _options: TOptions,
		private _description?: string,
		private _usage?: string,
		private _examples: string[] = [],
		private _positionals: (
			| PositionalSchema<any>
			| VariadicPositionalSchema<any>
		)[] = [],
	) {}

	description(desc: string): this {
		this._description = desc
		return this
	}

	usage(usage: string): this {
		this._usage = usage
		return this
	}

	example(example: string | string[]): this {
		this._examples.push(...(Array.isArray(example) ? example : [example]))
		return this
	}

	positional<T>(
		name: string,
		schema?: Schema<T>,
	): CommandBuilder<TOptions, [...TPositionals, PositionalSchema<T>]> {
		if (this._positionals.some((p) => '_isVariadic' in p && p._isVariadic)) {
			throw new CLIError('Cannot add positional after variadic positional')
		}
		this._positionals.push(new PositionalSchemaImpl(name, schema))
		return this as any
	}

	rest<T>(
		name: string,
		schema?: Schema<T>,
	): CommandBuilder<TOptions, [...TPositionals, VariadicPositionalSchema<T>]> {
		if (this._positionals.some((p) => '_isVariadic' in p && p._isVariadic)) {
			throw new CLIError('Cannot have multiple variadic positionals')
		}
		this._positionals.push(new VariadicPositionalSchemaImpl(name, schema))
		return this as any
	}

	action(
		fn: (args: {
			options: Prettify<{ [K in keyof TOptions]: TOptions[K]['_output'] }>
			positionals: ExtractNonRestPositionals<TPositionals>
			rest: ExtractRestType<TPositionals>
		}) => void | Promise<void>,
	): Command<TOptions, TPositionals> {
		return {
			name: this._name,
			description: this._description,
			usage: this._usage,
			example: this._examples.length ? this._examples : undefined,
			options: this._options,
			positionals: this._positionals as any,
			action: fn as any,
		}
	}
}

class HelpFormatter {
	constructor(private cli: CLIImpl<any, any>) {}

	showHelp(): void {
		this.printHeader()
		this.printUsage()
		this.printPositionals()
		this.printCommands()
		this.printOptions()
		this.printExamples()
	}

	showCommandHelp(command: Command): void {
		console.log()
		this.printCommandUsage(command)
		this.printCommandDescription(command)
		this.printCommandPositionals(command)
		this.printCommandOptions(command)
		this.printCommandExamples(command)
	}

	showError(error: unknown): void {
		console.error()
		const message = error instanceof Error ? error.message : String(error)
		console.error(`${pc.red(pc.bold('Error:'))} ${message}`)
		console.error(
			`\n${pc.dim(pc.white(`Run with ${pc.bold(pc.blue('--help'))} for usage information`))}`,
		)
	}

	private printHeader(): void {
		console.log()
		const { _name, _version, _description } = this.cli

		if (_description && _version) {
			console.log(`${_description} ${pc.dim(`(${_version})`)}`)
			console.log()
		} else if (_name) {
			console.log(pc.bold(_name))
			if (_version) console.log(pc.dim(`v${_version}`))
			if (_description) {
				console.log()
				console.log(_description)
			}
			console.log()
		}
	}

	private printUsage(): void {
		if (this.cli._usage) {
			console.log(`${pc.bold('Usage:')} ${this.cli._usage}`)
		} else {
			const parts = [this.cli._name || 'cli']
			if (this.cli._commands.length) parts.push(pc.blue('<command>'))
			if (Object.keys(this.cli._options).length)
				parts.push(pc.blue('[...flags]'))

			if (this.cli._positionals.length) {
				parts.push(
					...this.cli._positionals.map((p) =>
						'_isVariadic' in p && p._isVariadic
							? pc.dim(`[...${p._name}]`)
							: pc.dim(`<${p._name}>`),
					),
				)
			}

			console.log(`${pc.bold('Usage:')} ${parts.join(' ')}`)
		}
		console.log()
	}

	private printPositionals(): void {
		if (!this.cli._positionals.length) return

		console.log(pc.bold('Arguments:'))
		for (const pos of this.cli._positionals) {
			const isVariadic = '_isVariadic' in pos && pos._isVariadic
			const name = isVariadic ? `[...${pos._name}]` : `<${pos._name}>`
			console.log(`  ${pc.cyan(name)}  ${pos._description || ''}`)
		}
		console.log()
	}

	private printCommands(): void {
		if (!this.cli._commands.length) return

		console.log(pc.bold('Commands:'))
		const rows = this.cli._commands.map((cmd) => ({
			name: cmd.name,
			example: Array.isArray(cmd.example) ? cmd.example[0] : cmd.example || '',
			description: cmd.description || '',
		}))

		const nameWidth = Math.max(...rows.map((r) => r.name.length))
		const exampleWidth = Math.max(...rows.map((r) => r.example.length))

		for (const { name, example, description } of rows) {
			console.log(
				`  ${pc.cyan(name.padEnd(nameWidth))}  ${example ? pc.dim(example.padEnd(exampleWidth)) : ' '.repeat(exampleWidth)}  ${description}`,
			)
		}

		console.log(
			`  ${pc.cyan('<command> --help'.padEnd(nameWidth))}${exampleWidth ? `  ${' '.repeat(exampleWidth)}` : ''}  ${pc.dim('Print help text for command.')}`,
		)
		console.log()
	}

	private printOptions(): void {
		if (!Object.keys(this.cli._options).length) return

		console.log(pc.bold('Flags:'))
		this.printOptionsTable(this.cli._options)
		console.log()
	}

	private printExamples(): void {
		if (!this.cli._examples.length) return

		console.log(pc.bold('Examples:'))
		for (const example of this.cli._examples) {
			this.printExample(example)
		}
	}

	private printCommandUsage(command: Command): void {
		const usage = command.usage || this.buildCommandUsage(command)
		console.log(`${pc.bold('Usage:')} ${usage}`)
		console.log()
	}

	private printCommandDescription(command: Command): void {
		if (!command.description) return
		console.log(`  ${command.description}`)
		console.log()
	}

	private printCommandPositionals(command: Command): void {
		if (!command.positionals?.length) return

		console.log(pc.bold('Arguments:'))
		for (const pos of command.positionals) {
			const isVariadic = '_isVariadic' in pos && pos._isVariadic
			const name = isVariadic ? `[...${pos._name}]` : `<${pos._name}>`
			console.log(`  ${pc.cyan(name)}  ${pos._description || ''}`)
		}
		console.log()
	}

	private printCommandOptions(command: Command): void {
		if (!Object.keys(command.options).length) return

		console.log(pc.bold('Flags:'))
		this.printOptionsTable(command.options)
		console.log()
	}

	private printCommandExamples(command: Command): void {
		const examples = Array.isArray(command.example)
			? command.example
			: command.example
				? [command.example]
				: []
		if (!examples.length) return

		console.log(pc.bold('Examples:'))
		for (const example of examples) {
			this.printExample(example)
		}
	}

	private printOptionsTable(options: Record<string, Schema>): void {
		const rows = this.buildOptionRows(options)
		const flagsWidth = Math.max(...rows.map((r) => r.flags.length))
		const typeWidth = Math.max(...rows.map((r) => r.type.length))

		for (const { flags, type, desc } of rows) {
			if (!flags && !type && !desc) {
				console.log()
			} else {
				console.log(
					`  ${pc.cyan(flags.padEnd(flagsWidth))}${type.padEnd(typeWidth)}  ${desc}`,
				)
			}
		}

		console.log(
			`  ${pc.cyan('-h, --help'.padEnd(flagsWidth))}${pc.dim('').padEnd(typeWidth)}  ${pc.dim('Display this menu and exit')}`,
		)
	}

	private buildOptionRows(
		options: Record<string, Schema>,
		prefix = '',
		addedNoVersions = new Set<string>(),
	): Array<{ flags: string; type: string; desc: string }> {
		const rows: Array<{ flags: string; type: string; desc: string }> = []

		for (const [key, schema] of Object.entries(options)) {
			const fullKey = prefix ? `${prefix}.${key}` : key

			if (schema._type === 'union') {
				rows.push(
					...this.buildUnionRows(
						fullKey,
						schema as UnionSchema<any>,
						addedNoVersions,
					),
				)
			} else if (
				schema._type === 'object' &&
				// @ts-expect-error
				!schema._isAnyKeys &&
				// @ts-expect-error
				schema._shape
			) {
				rows.push(
					// @ts-expect-error
					...this.buildOptionRows(schema._shape, fullKey, addedNoVersions),
				)

				if (schema._defaultValue) {
					// @ts-expect-error
					for (const [propKey, propSchema] of Object.entries(schema._shape)) {
						const nestedKey = `${fullKey}.${propKey}`
						if (
							// @ts-expect-error
							propSchema._type === 'boolean' &&
							schema._defaultValue[propKey] === true &&
							!addedNoVersions.has(nestedKey)
						) {
							addedNoVersions.add(nestedKey)
							rows.push({
								flags: `    --no-${nestedKey}`,
								type: pc.dim(''),
								desc: this.generateNoDescription(nestedKey),
							})
						}
					}
				}
			} else {
				rows.push({
					flags: this.getOptionFlags(fullKey, schema),
					type: this.getOptionType(fullKey, schema),
					desc: this.getOptionDescription(schema),
				})

				if (!addedNoVersions.has(fullKey) && this.shouldAddNoVersion(schema)) {
					addedNoVersions.add(fullKey)
					rows.push({
						flags: `    --no-${fullKey}`,
						type: pc.dim(''),
						desc: this.generateNoDescription(fullKey),
					})
				}
			}
		}

		return rows
	}

	private shouldAddNoVersion(schema: Schema): boolean {
		if (schema._type === 'boolean' && schema._defaultValue === true) return true

		if (schema._type === 'union') {
			const unionSchema = schema as UnionSchema<any>
			if (
				schema._defaultValue === true &&
				unionSchema._schemas.some((s: any) => s._type === 'boolean')
			)
				return true
			const booleanSchema = unionSchema._schemas.find(
				(s: any) => s._type === 'boolean',
			)
			if (booleanSchema?._defaultValue === true) return true
		}

		return false
	}

	private generateNoDescription(key: string): string {
		const words = key.split(/(?=[A-Z])|[._-]/).map((w) => w.toLowerCase())
		return `Disable ${words.join(' ')}`
	}

	private buildUnionRows(
		key: string,
		schema: UnionSchema<any>,
		addedNoVersions: Set<string>,
	): Array<{ flags: string; type: string; desc: string }> {
		const rows: Array<{ flags: string; type: string; desc: string }> = []
		const groups = new Map<string, Schema[]>()

		for (const s of schema._schemas) {
			const type = s._type
			if (!groups.has(type)) groups.set(type, [])
			groups.get(type)!.push(s)
		}

		const objectSchemas = groups.get('object') ?? []
		const nonObjectGroups = Array.from(groups.entries()).filter(
			([type]) => type !== 'object',
		)

		for (const objSchema of objectSchemas) {
			if ((objSchema as ObjectSchema)._isAnyKeys) {
				rows.push({
					flags: `    --${key}.<key>`,
					type: this.getOptionType(key, objSchema),
					desc: this.getOptionDescription(objSchema),
				})
			} else {
				const objShape = (objSchema as ObjectSchema<any>)._shape!
				rows.push(...this.buildOptionRows(objShape, key, addedNoVersions))

				for (const [propKey, propSchema] of Object.entries(objShape)) {
					const fullKey = `${key}.${propKey}`
					if (
						propSchema._type === 'boolean' &&
						propSchema._defaultValue === true &&
						!addedNoVersions.has(fullKey)
					) {
						addedNoVersions.add(fullKey)
						rows.push({
							flags: `    --no-${fullKey}`,
							type: pc.dim(''),
							desc: this.generateNoDescription(fullKey),
						})
					}
				}
			}
		}

		for (const [, groupSchemas] of nonObjectGroups) {
			for (const s of groupSchemas) {
				rows.push({
					flags: this.getOptionFlags(key, s),
					type: this.getOptionType(key, s),
					desc: this.getOptionDescription(s),
				})
			}
		}

		if (!addedNoVersions.has(key) && this.shouldAddNoVersion(schema)) {
			addedNoVersions.add(key)
			rows.push({
				flags: `    --no-${key}`,
				type: pc.dim(''),
				desc: this.generateNoDescription(key),
			})
		}

		if (schema._description && rows.length) {
			rows[0].desc = `${schema._description}${rows[0].desc ? ` - ${rows[0].desc}` : ''}`
		}

		return rows
	}

	private getOptionFlags(key: string, schema: Schema): string {
		if (schema._type === 'object' && (schema as ObjectSchema)._isAnyKeys)
			return `    --${key}.<key>`
		return schema._alias ? `-${schema._alias}, --${key}` : `    --${key}`
	}

	private getOptionType(_key: string, schema: Schema): string {
		if (schema._type === 'boolean') return pc.dim('')

		let valueType = 'val'
		if (
			schema._type === 'string' &&
			(schema as StringSchema)._choices?.length
		) {
			const choices = (schema as StringSchema)._choices!
			valueType =
				choices.length <= 5
					? choices.join('|')
					: `${choices.slice(0, 4).join('|')}|...`
		} else if (schema._type === 'number') {
			valueType = 'n'
		} else if (schema._type === 'array') {
			valueType = 'val,...'
		} else if (
			schema._type === 'object' &&
			(schema as ObjectSchema)._valueSchema
		) {
			return this.getOptionType(_key, (schema as ObjectSchema)._valueSchema!)
		}

		return ` ${pc.dim(`<${valueType}>`)}  `
	}

	private getOptionDescription(schema: Schema): string {
		const parts: string[] = []
		if (schema._description) parts.push(schema._description)
		if (schema._example) parts.push(pc.dim(`Example: ${schema._example}`))

		const constraints = this.getConstraints(schema)
		if (constraints) parts.push(pc.dim(`(${constraints})`))

		return parts.join(' ')
	}

	private getConstraints(schema: Schema): string {
		const constraints: string[] = []

		if (schema._defaultValue !== undefined) {
			const value =
				schema._type === 'boolean'
					? schema._defaultValue
					: JSON.stringify(schema._defaultValue)
			constraints.push(`default: ${value}`)
		}

		if (schema._type === 'string') {
			const s = schema as StringSchema
			if (s._minLength !== undefined) constraints.push(`min: ${s._minLength}`)
			if (s._maxLength !== undefined) constraints.push(`max: ${s._maxLength}`)
			if (s._regex)
				constraints.push(s._regex.message || `pattern: ${s._regex.pattern}`)
		} else if (schema._type === 'number') {
			const n = schema as NumberSchema
			if (n._min !== undefined) constraints.push(`min: ${n._min}`)
			if (n._max !== undefined) constraints.push(`max: ${n._max}`)
			if (n._isInt) constraints.push('integer')
			if (n._isPositive) constraints.push('positive')
			if (n._isNegative) constraints.push('negative')
		} else if (schema._type === 'array') {
			const a = schema as ArraySchema<any>
			if (a._minLength !== undefined) constraints.push(`min: ${a._minLength}`)
			if (a._maxLength !== undefined) constraints.push(`max: ${a._maxLength}`)
		}

		return constraints.length ? joinWithAnd(constraints) : ''
	}

	private buildCommandUsage(command: Command): string {
		const parts = [this.cli._name || 'cli', command.name]
		if (Object.keys(command.options).length) parts.push(pc.cyan('[...flags]'))
		if (command.positionals) {
			parts.push(
				...command.positionals.map((p) =>
					'_isVariadic' in p && p._isVariadic
						? pc.dim(`[...${p._name}]`)
						: pc.dim(`<${p._name}>`),
				),
			)
		}
		return parts.join(' ')
	}

	private printExample(example: string): void {
		const lines = example.split('\n')
		if (lines.length > 1) {
			console.log(`  ${lines[0]}`)
			console.log(`  ${pc.green(lines.slice(1).join('\n  '))}`)
		} else {
			console.log(`  ${pc.green(example)}`)
		}
		console.log()
	}
}

class ArgumentParser {
	private flagUsage = new Map<string, 'simple' | 'object' | 'both'>()
	private flagValues = new Map<string, any>()

	parse(
		args: string[],
		options: Record<string, Schema>,
	): {
		parsed: Record<string, any>
		positionalArgs: any[]
		rawArgs: string[]
	} {
		const parsed: Record<string, any> = {}
		const rawOptions: Record<string, any> = {}
		const positionalArgs: any[] = []
		const doubleDashIndex = args.indexOf('--')
		let rawArgs: string[] = []

		this.flagUsage.clear()
		this.flagValues.clear()

		if (doubleDashIndex !== -1) {
			rawArgs = args.slice(doubleDashIndex + 1)
			args = args.slice(0, doubleDashIndex)
		}

		const flagOccurrences = this.collectFlagOccurrences(args, options)
		this.detectAndReportConflicts(flagOccurrences, options)

		for (let i = 0; i < args.length; i++) {
			const arg = args[i]

			if (arg.startsWith('--')) {
				i += this.parseFlag(arg, args, i, options, rawOptions)
			} else if (arg.startsWith('-') && !this.looksLikeNegativeNumber(arg)) {
				i += this.parseAlias(arg, args, i, options, rawOptions)
			} else {
				positionalArgs.push(arg)
			}
		}

		positionalArgs.push(...rawArgs)

		for (const [key, schema] of Object.entries(options)) {
			parsed[key] =
				rawOptions[key] !== undefined
					? this.parseOptionWithSchema(key, schema, rawOptions[key], options)
					: schema.parse(undefined, `--${key}`)
		}

		return { parsed, positionalArgs, rawArgs }
	}

	private collectFlagOccurrences(
		args: string[],
		options: Record<string, Schema>,
	): Map<string, string[]> {
		const occurrences = new Map<string, string[]>()

		for (const arg of args) {
			if (arg.startsWith('--') && !arg.startsWith('--no-')) {
				const [keyPath] = arg.slice(2).split('=')
				const mainKey = keyPath.split('.')[0]

				if (options[mainKey]) {
					if (!occurrences.has(mainKey)) occurrences.set(mainKey, [])
					occurrences.get(mainKey)!.push(arg)
				}
			}
		}

		return occurrences
	}

	private detectAndReportConflicts(
		occurrences: Map<string, string[]>,
		options: Record<string, Schema>,
	): void {
		for (const [key, flags] of occurrences.entries()) {
			if (flags.length > 1) {
				const schema = options[key]

				if (schema._type === 'union') {
					const hasSimple = flags.some(
						(f) => !f.includes('.') || f.split('=')[0] === `--${key}`,
					)
					const hasObject = flags.some(
						(f) => f.includes('.') && !f.split('=')[0].endsWith(key),
					)

					if (hasSimple && hasObject) {
						const simpleFlags = flags.filter(
							(f) => !f.includes('.') || f.split('=')[0] === `--${key}`,
						)
						const objectFlags = flags.filter(
							(f) => f.includes('.') && !f.split('=')[0].endsWith(key),
						)

						throw new CLIError(
							`Cannot mix different forms of --${key}\n\n  ${pc.dim('You used both:')}\n    ${pc.red('Simple:')} ${simpleFlags.join(', ')}\n    ${pc.red('Object:')} ${objectFlags.join(', ')}\n\n  ${pc.dim('Choose one approach:')}\n    ${pc.green(`--${key}`)} ${pc.dim('for simple values')}\n    ${pc.green(`--${key}.property`)} ${pc.dim('for object properties')}`,
						)
					}
				}
			}
		}
	}

	private looksLikeNegativeNumber(arg: string): boolean {
		return arg.startsWith('-') && /^\d/.test(arg.slice(1))
	}

	private parseOptionWithSchema(
		key: string,
		schema: Schema,
		rawValue: any,
		_allOptions: Record<string, Schema>,
	): any {
		if (schema._type === 'union') {
			const unionSchema = schema as UnionSchema<any>

			if (typeof rawValue === 'object' && !Array.isArray(rawValue)) {
				if ('_unionValue' in rawValue) {
					throw new CLIError(
						`Cannot mix different value types for --${key}\n\n${ErrorFormatter.showDiff(
							`--${key} ${ErrorFormatter.formatValue(rawValue._unionValue)} and --${key}.property`,
							`--${key} value ${pc.dim('or')} --${key}.property value`,
						)}`,
					)
				}

				const objectSchemas = unionSchema._schemas.filter(
					// @ts-expect-error
					(s) => s._type === 'object',
				)

				for (const objSchema of objectSchemas) {
					try {
						return this.validateObjectInUnion(
							objSchema as ObjectSchema,
							rawValue,
							`--${key}`,
						)
					} catch {}
				}
			}

			const booleanValue = this.parseBooleanValue(rawValue)
			if (booleanValue !== undefined) {
				const boolSchema = unionSchema._schemas.find(
					(s: any) => s._type === 'boolean',
				)
				if (boolSchema) {
					try {
						return boolSchema.parse(booleanValue, `--${key}`)
					} catch {}
				}
			}

			return schema.parse(rawValue, `--${key}`)
		}

		if (
			schema._type === 'object' &&
			typeof rawValue === 'object' &&
			!Array.isArray(rawValue)
		) {
			return this.validateObjectInUnion(
				schema as ObjectSchema,
				rawValue,
				`--${key}`,
			)
		}

		if (schema._type === 'boolean') {
			return schema.parse(
				this.parseBooleanValue(rawValue) ?? rawValue,
				`--${key}`,
			)
		}

		return schema.parse(rawValue, `--${key}`)
	}

	private parseBooleanValue(value: any): boolean | undefined {
		if (value === true || value === 'true' || value === '1') return true
		if (value === false || value === 'false' || value === '0') return false
		return undefined
	}

	private validateObjectInUnion(
		schema: ObjectSchema,
		rawValue: any,
		path: string,
	): any {
		if (schema._isAnyKeys && schema._valueSchema) {
			const result: any = {}
			for (const [k, v] of Object.entries(rawValue)) {
				result[k] = schema._valueSchema.parse(v, `${path}.${k}`)
			}
			return result
		}

		if (schema._shape) {
			const result: any = {}
			const allOptions: string[] = []
			for (const [k, v] of Object.entries(rawValue)) {
				if (!schema._shape[k]) {
					const validKeys = Object.keys(schema._shape)
					for (let i = 0; i < validKeys.length; i++) {
						const vk = validKeys[i]
						allOptions.push(`--${path.slice(2)}.${vk}`)
					}
					const suggestion = this.findSimilarKey(k, validKeys)

					throw new CLIError(
						`${path}.${k} is not recognized\n\n  ${pc.dim('Available properties:')}\n${validKeys.map((vk) => `    ${pc.green(`--${path.slice(2)}.${vk}`)}`).join('\n')}${suggestion ? `\n\n  ${pc.dim('Did you mean')} ${pc.green(`--${path.slice(2)}.${suggestion}`)}${pc.dim('?')}` : ''}`,
					)
				}
				result[k] = schema._shape[k].parse(v, `${path}.${k}`)
			}
			for (const [k, fieldSchema] of Object.entries(schema._shape)) {
				if (!(k in result)) {
					result[k] = fieldSchema.parse(undefined, `${path}.${k}`)
				}
			}
			return result
		}

		return rawValue
	}

	private findSimilarKey(key: string, validKeys: string[]): string | undefined {
		const lowered = key.toLowerCase()
		return validKeys.find(
			(vk) =>
				vk.toLowerCase() === lowered ||
				vk.toLowerCase().includes(lowered) ||
				lowered.includes(vk.toLowerCase()),
		)
	}

	private parseFlag(
		arg: string,
		args: string[],
		index: number,
		options: Record<string, Schema>,
		rawOptions: Record<string, any>,
	): number {
		if (arg.startsWith('--no-')) {
			const keyPath = arg.slice(5).split('=')[0]
			const keys = keyPath.split('.')
			const mainKey = keys[0]
			const mainSchema = options[mainKey]

			if (!mainSchema) {
				const suggestion = this.findSimilarKey(mainKey, Object.keys(options))
				const availableOptions: string[] = []
				for (const [k, s] of Object.entries(options)) {
					availableOptions.push(`--${k}`)
					if (this.shouldHandleNoVersion(s)) availableOptions.push(`--no-${k}`)
				}

				throw new CLIError(
					`${arg} is not recognized\n\n  ${pc.dim('Available options:')}\n${availableOptions.map((o) => `    ${pc.green(o)}`).join('\n')}${suggestion ? `\n\n  ${pc.dim('Did you mean')} ${pc.green(`--no-${suggestion}`)}${pc.dim('?')}` : ''}`,
				)
			}

			if (keys.length > 1) {
				if (mainSchema._type === 'union') {
					const unionSchema = mainSchema as UnionSchema<any>

					for (const s of unionSchema._schemas) {
						if (s._type === 'object') {
							const nestedSchema = this.getNestedSchema(s, keys.slice(1))
							if (
								nestedSchema &&
								this.shouldHandleNoVersion(nestedSchema, s, keys.slice(1))
							) {
								this.setNestedValue(rawOptions, keyPath, false, options)
								return 0
							}
						}
					}
				} else if (mainSchema._type === 'object') {
					const nestedSchema = this.getNestedSchema(mainSchema, keys.slice(1))
					if (
						nestedSchema &&
						this.shouldHandleNoVersion(nestedSchema, mainSchema, keys.slice(1))
					) {
						this.setNestedValue(rawOptions, keyPath, false, options)
						return 0
					}
				}
			} else {
				if (this.shouldHandleNoVersion(mainSchema)) {
					this.setNestedValue(rawOptions, keyPath, false, options)
					return 0
				}
			}

			throw new CLIError(
				`${arg} cannot be negated\n\n  ${pc.dim('The --no- prefix only works with boolean flags that default to true')}`,
			)
		}

		const [keyPath, ...valueParts] = arg.slice(2).split('=')
		const hasExplicitValue = valueParts.length > 0
		const explicitValue = hasExplicitValue ? valueParts.join('=') : undefined
		const keys = keyPath.split('.')
		const mainKey = keys[0]
		const schema = options[mainKey]

		if (!schema) {
			const suggestion = this.findSimilarKey(mainKey, Object.keys(options))
			const availableOptions: string[] = []
			for (const [k, s] of Object.entries(options)) {
				availableOptions.push(`--${k}`)
				if (this.shouldHandleNoVersion(s)) availableOptions.push(`--no-${k}`)
			}

			throw new CLIError(
				`--${mainKey} is not recognized\n\n  ${pc.dim('Available options:')}\n${availableOptions.map((o) => `    ${pc.green(o)}`).join('\n')}${suggestion ? `\n\n  ${pc.dim('Did you mean')} ${pc.green(`--${suggestion}`)}${pc.dim('?')}` : ''}`,
			)
		}

		const isSimple = keys.length === 1
		const currentUsage = this.flagUsage.get(mainKey)
		const newUsage = isSimple ? 'simple' : 'object'

		if (currentUsage && currentUsage !== newUsage) {
			this.flagUsage.set(mainKey, 'both')

			if (schema._type === 'union') {
				throw new CLIError(
					`Cannot mix forms for --${mainKey}\n\n  ${pc.dim('Previously used:')} ${currentUsage === 'simple' ? pc.yellow(`--${mainKey}`) : pc.yellow(`--${mainKey}.property`)}\n  ${pc.dim('Now trying:')} ${isSimple ? pc.red(`--${mainKey}`) : pc.red(`--${keyPath}`)}\n\n  ${pc.dim('Choose one approach consistently:')}\n    ${pc.green(`--${mainKey} value`)} ${pc.dim('for simple form')}\n    ${pc.green(`--${mainKey}.property value`)} ${pc.dim('for object form')}`,
				)
			}
		} else {
			this.flagUsage.set(mainKey, newUsage)
		}

		const expectsValue = this.schemaExpectsValue(schema, keys.slice(1))
		let consumed = 0

		if (expectsValue === 'required' || expectsValue === 'union') {
			let value: any
			if (hasExplicitValue) {
				value = explicitValue
			} else if (
				index + 1 < args.length &&
				(!args[index + 1].startsWith('-') ||
					this.looksLikeNegativeNumber(args[index + 1]))
			) {
				value = args[index + 1]
				consumed = 1
			} else if (expectsValue === 'union') {
				value = true
			} else {
				const example = ErrorFormatter.formatCorrectUsage(
					keyPath,
					undefined,
					this.getSchemaAtPath(schema, keys.slice(1)),
				)
				throw new CLIError(
					`--${keyPath} needs a value\n\n  ${pc.dim('Usage:')} ${example}`,
				)
			}

			this.setNestedValue(rawOptions, keyPath, value, options)
			this.flagValues.set(mainKey, value)
		} else if (expectsValue === 'boolean') {
			let value: any
			if (hasExplicitValue) {
				value = explicitValue
			} else if (
				index + 1 < args.length &&
				!args[index + 1].startsWith('-') &&
				this.isBooleanLiteral(args[index + 1])
			) {
				value = args[index + 1]
				consumed = 1
			} else {
				value = true
			}
			this.setNestedValue(rawOptions, keyPath, value, options)
			this.flagValues.set(mainKey, value)
		}

		return consumed
	}

	private getSchemaAtPath(schema: Schema, nestedKeys: string[]): Schema {
		let current = schema

		for (const key of nestedKeys) {
			if (current._type === 'object') {
				const objSchema = current as ObjectSchema
				if (objSchema._isAnyKeys) return objSchema._valueSchema!
				if (objSchema._shape?.[key]) current = objSchema._shape[key]
			} else if (current._type === 'union') {
				const unionSchema = current as UnionSchema<any>
				const objSchema = unionSchema._schemas.find(
					(s: any) => s._type === 'object',
				)
				if (objSchema) {
					const obj = objSchema as ObjectSchema
					if (obj._isAnyKeys) return obj._valueSchema!
					if (obj._shape?.[key]) current = obj._shape[key]
				}
			}
		}

		return current
	}

	private shouldHandleNoVersion(
		schema: Schema | undefined,
		parentSchema?: Schema,
		nestedKeys?: string[],
	): boolean {
		if (!schema) return false

		if (schema._type === 'boolean' && schema._defaultValue === true) return true

		if (
			parentSchema &&
			parentSchema._type === 'object' &&
			parentSchema._defaultValue &&
			nestedKeys?.length === 1
		) {
			const key = nestedKeys[0]
			if (
				schema._type === 'boolean' &&
				parentSchema._defaultValue[key] === true
			)
				return true
		}

		if (schema._type === 'union') {
			const unionSchema = schema as UnionSchema<any>
			if (
				schema._defaultValue === true &&
				unionSchema._schemas.some((s: any) => s._type === 'boolean')
			)
				return true
			const booleanSchema = unionSchema._schemas.find(
				(s: any) => s._type === 'boolean',
			)
			if (booleanSchema?._defaultValue === true) return true
		}

		return false
	}

	private getNestedSchema(
		schema: Schema | undefined,
		nestedKeys: string[],
	): Schema | undefined {
		if (!schema || !nestedKeys.length) return schema

		let current = schema

		for (const key of nestedKeys) {
			if (current._type === 'object') {
				const objSchema = current as ObjectSchema
				if (objSchema._shape?.[key]) {
					current = objSchema._shape[key]
				} else {
					return undefined
				}
			} else if (current._type === 'union') {
				const unionSchema = current as UnionSchema<any>
				const objSchema = unionSchema._schemas.find((s: any) => {
					if (s._type === 'object') {
						const obj = s as ObjectSchema
						return obj._shape?.[key] !== undefined
					}
					return false
				})

				if (objSchema) {
					current = (objSchema as ObjectSchema)._shape![key]
				} else {
					return undefined
				}
			} else {
				return undefined
			}
		}

		return current
	}

	private isBooleanLiteral(value: string): boolean {
		return ['true', 'false', '0', '1'].includes(value.toLowerCase())
	}

	private schemaExpectsValue(
		schema: Schema,
		nestedKeys: string[],
	): 'required' | 'boolean' | 'union' {
		let current = schema

		for (const key of nestedKeys) {
			if (current._type === 'object') {
				const objSchema = current as ObjectSchema
				if (objSchema._isAnyKeys) {
					current = objSchema._valueSchema!
					break
				}

				if (objSchema._shape?.[key]) {
					current = objSchema._shape[key]
				} else {
					const validKeys = Object.keys(objSchema._shape || {})
					const suggestion = this.findSimilarKey(key, validKeys)
					throw new CLIError(
						`Property '${key}' is not recognized\n\n  ${pc.dim('Available properties:')}\n${validKeys.map((k) => `    ${pc.cyan(k)}`).join('\n')}${suggestion ? `\n\n  ${pc.dim('Did you mean')} ${pc.green(suggestion)}${pc.dim('?')}` : ''}`,
					)
				}
			} else if (current._type === 'union') {
				const unionSchema = current as UnionSchema<any>
				const objSchema = unionSchema._schemas.find(
					(s: any) => s._type === 'object',
				)
				if (objSchema) {
					const obj = objSchema as ObjectSchema
					if (obj._isAnyKeys) {
						current = obj._valueSchema!
						break
					}
					if (obj._shape?.[key]) current = obj._shape[key]
				}
			}
		}

		if (current._type === 'boolean') return 'boolean'

		if (current._type === 'union') {
			const unionSchema = current as UnionSchema<any>
			const hasBoolean = unionSchema._schemas.some(
				(s: any) => s._type === 'boolean',
			)
			const hasOther = unionSchema._schemas.some(
				(s: any) => s._type !== 'boolean',
			)

			if (hasBoolean && !hasOther) return 'boolean'
			if (!hasBoolean && hasOther) return 'required'
			return 'union'
		}

		return 'required'
	}

	private parseAlias(
		arg: string,
		args: string[],
		index: number,
		options: Record<string, Schema>,
		rawOptions: Record<string, any>,
	): number {
		const alias = arg.slice(1)
		const [optionName, schema] =
			Object.entries(options).find(([_, s]) => s._alias === alias) || []

		if (!optionName) {
			const allAliases = Object.entries(options)
				.filter(([_, s]) => s._alias)
				.map(([k, s]) => ({ alias: s._alias, flag: k }))

			throw new CLIError(
				`-${alias} is not recognized\n\n${allAliases.length ? `  ${pc.dim('Available aliases:')}\n${allAliases.map(({ alias: a, flag }) => `    ${pc.green(`-${a}`)} ${pc.dim('for')} ${pc.cyan(`--${flag}`)}`).join('\n')}` : `  ${pc.dim('No aliases are defined for this command')}`}`,
			)
		}

		// @ts-expect-error
		const expectsValue = this.schemaExpectsValue(schema, [])

		if (expectsValue === 'boolean') {
			if (
				index + 1 < args.length &&
				!args[index + 1].startsWith('-') &&
				this.isBooleanLiteral(args[index + 1])
			) {
				rawOptions[optionName] = args[index + 1]
				return 1
			}
			rawOptions[optionName] = true
			return 0
		}

		if (expectsValue === 'required') {
			if (index + 1 < args.length && !args[index + 1].startsWith('-')) {
				rawOptions[optionName] = args[index + 1]
				return 1
			}
			const example = ErrorFormatter.formatCorrectUsage(
				optionName,
				undefined,
				schema!,
			)
			throw new CLIError(
				`-${alias} needs a value\n\n  ${pc.dim('Usage:')} ${example.replace(`--${optionName}`, `-${alias}`)}`,
			)
		}

		if (index + 1 < args.length && !args[index + 1].startsWith('-')) {
			rawOptions[optionName] = args[index + 1]
			return 1
		}
		rawOptions[optionName] = true
		return 0
	}

	private setNestedValue(
		obj: Record<string, any>,
		key: string,
		value: any,
		options: Record<string, Schema>,
	): void {
		const keys = key.split('.')
		let current = obj
		let schemaPath: any = options

		if (keys.length > 1) {
			const mainKey = keys[0]
			const existingValue = obj[mainKey]

			if (existingValue !== undefined && typeof existingValue !== 'object') {
				const schema = options[mainKey]
				if (schema._type === 'union') {
					throw new CLIError(
						`Cannot mix value types for --${mainKey}\n\n  ${pc.dim('Previously set:')} --${mainKey} ${ErrorFormatter.formatValue(existingValue)}\n  ${pc.dim('Now trying:')} --${key} ${ErrorFormatter.formatValue(value)}\n\n  ${pc.dim('Use one approach consistently:')}\n    ${pc.green(`--${mainKey} value`)} ${pc.dim('for simple values')}\n    ${pc.green(`--${mainKey}.property value`)} ${pc.dim('for object properties')}`,
					)
				}
				throw new CLIError(
					`Cannot set property on non-object value\n\n  ${pc.dim('Flag:')} --${mainKey}\n  ${pc.dim('Current value:')} ${ErrorFormatter.formatValue(existingValue)}\n  ${pc.dim('Attempted:')} --${key} ${ErrorFormatter.formatValue(value)}`,
				)
			}
		}

		for (let i = 0; i < keys.length - 1; i++) {
			const k = keys[i]

			if (!current[k]) {
				current[k] = {}
			} else if (typeof current[k] !== 'object' || Array.isArray(current[k])) {
				const partialKey = keys.slice(0, i + 1).join('.')
				throw new CLIError(
					`Cannot set nested property\n\n  ${pc.dim('Path:')} --${key}\n  ${pc.dim('Conflict at:')} --${partialKey}\n  ${pc.dim('Current type:')} ${Array.isArray(current[k]) ? 'array' : typeof current[k]}`,
				)
			}

			if (i === 0 && current[k]._unionValue !== undefined) {
				throw new CLIError(
					`Cannot switch to object form\n\n  ${pc.dim('Previously:')} --${k} ${ErrorFormatter.formatValue(current[k]._unionValue)}\n  ${pc.dim('Now trying:')} --${key} ${ErrorFormatter.formatValue(value)}\n\n  ${pc.dim('Use consistent form throughout')}`,
				)
			}

			current = current[k]

			if (schemaPath[k]) {
				const schema = schemaPath[k]
				if (schema._type === 'object') {
					const objSchema = schema as ObjectSchema
					if (!objSchema._isAnyKeys && objSchema._shape) {
						schemaPath = objSchema._shape
					}
				} else if (schema._type === 'union') {
					const unionSchema = schema as UnionSchema<any>
					const objSchema = unionSchema._schemas.find(
						// @ts-expect-error
						(s) => s._type === 'object' && !s._isAnyKeys,
					)
					if (objSchema) {
						schemaPath = (objSchema as ObjectSchema)._shape
					}
				}
			}
		}

		const lastKey = keys[keys.length - 1]

		if (current[lastKey] !== undefined && !Array.isArray(current[lastKey])) {
			current[lastKey] = [current[lastKey], value]
		} else if (Array.isArray(current[lastKey])) {
			current[lastKey].push(value)
		} else {
			current[lastKey] = value
		}
	}
}

class CLIImpl<
	TOptions extends Record<string, Schema> = Record<string, never>,
	TPositionals extends readonly (
		| PositionalSchema<any>
		| VariadicPositionalSchema<any>
	)[] = readonly [],
> implements CLI<TOptions, TPositionals>
{
	_name?: string
	_version?: string
	_description?: string
	_usage?: string
	_examples: string[] = []
	_options: TOptions = {} as TOptions
	_positionals: (PositionalSchema<any> | VariadicPositionalSchema<any>)[] = []
	_commands: Command<any, any>[] = []

	private formatter = new HelpFormatter(this)
	private parser = new ArgumentParser()

	name(name: string): this {
		this._name = name
		return this
	}

	version(version: string): this {
		this._version = version
		return this
	}

	description(description: string): this {
		this._description = description
		return this
	}

	usage(usage: string): this {
		this._usage = usage
		return this
	}

	example(example: string | string[]): this {
		this._examples.push(...(Array.isArray(example) ? example : [example]))
		return this
	}

	option<K extends string, S extends Schema>(
		name: K,
		schema: S,
	): CLI<TOptions & { [P in K]: S }, TPositionals> {
		;(this._options as any)[name] = schema
		return this as any
	}

	positional<T>(
		name: string,
		schema?: Schema<T>,
	): CLI<TOptions, [...TPositionals, PositionalSchema<T>]> {
		if (this._positionals.some((p) => '_isVariadic' in p && p._isVariadic)) {
			throw new CLIError('Cannot add positional after variadic positional')
		}
		this._positionals.push(new PositionalSchemaImpl(name, schema))
		return this as any
	}

	rest<T>(
		name: string,
		schema?: Schema<T>,
	): CLI<TOptions, [...TPositionals, VariadicPositionalSchema<T>]> {
		if (this._positionals.some((p) => '_isVariadic' in p && p._isVariadic)) {
			throw new CLIError('Cannot have multiple variadic positionals')
		}
		this._positionals.push(new VariadicPositionalSchemaImpl(name, schema))
		return this as any
	}

	command<T extends Record<string, Schema> = Record<string, never>>(
		name: string,
		options?: T,
	): CommandBuilder<T> {
		const builder = new CommandBuilderImpl(name, options || ({} as T))
		return new Proxy(builder, {
			get: (target, prop) => {
				if (prop === 'action') {
					return (fn: any) => {
						const cmd = target.action(fn)
						this._commands.push(cmd)
						return cmd
					}
				}
				return (target as any)[prop]
			},
		}) as CommandBuilder<T>
	}

	parse(argv: string[] = process.argv.slice(2)) {
		try {
			const result = this.handleArguments([...argv])
			if (result === 'handled') return undefined
			return result
		} catch (error) {
			this.formatter.showError(error)
			processExit(1, error)
		}
	}

	private handleArguments(args: string[]):
		| 'handled'
		| {
				options: Prettify<{ [K in keyof TOptions]: TOptions[K]['_output'] }>
				positionals: ExtractNonRestPositionals<TPositionals>
				rest: ExtractRestType<TPositionals>
		  } {
		if (this.handleVersion(args)) return 'handled'
		if (this.handleHelp(args)) return 'handled'

		const { command, remainingArgs } = this.extractCommand(args)

		if (command) {
			return this.executeCommand(command, remainingArgs)
		}

		return this.parseMainCommand(args)
	}

	private handleVersion(args: string[]): boolean {
		if (!this._version) return false
		if (args.includes('--version') || args.includes('-v')) {
			console.log(this._version)
			processExit(0)
		}
		return false
	}

	private handleHelp(args: string[]): boolean {
		const helpIndex = args.findIndex((arg) => arg === '--help' || arg === '-h')
		if (helpIndex === -1) return false

		const commandBeforeHelp = helpIndex > 0 ? args[helpIndex - 1] : null
		const command =
			commandBeforeHelp &&
			this._commands.find((c) => c.name === commandBeforeHelp)

		if (command) {
			this.formatter.showCommandHelp(command)
		} else {
			this.formatter.showHelp()
		}

		processExit(0)
		return true
	}

	private extractCommand(args: string[]): {
		command?: Command
		remainingArgs: string[]
	} {
		if (!args.length || args[0].startsWith('-')) return { remainingArgs: args }

		const commandName = args[0]
		const command = this._commands.find((c) => c.name === commandName)

		if (command) {
			return { command, remainingArgs: args.slice(1) }
		}

		if (this._commands.length) {
			const similar = this._commands.find(
				(c) =>
					c.name.toLowerCase() === commandName.toLowerCase() ||
					c.name.toLowerCase().includes(commandName.toLowerCase()) ||
					commandName.toLowerCase().includes(c.name.toLowerCase()),
			)?.name

			throw new CLIError(
				`Command '${commandName}' not found\n\n  ${pc.dim('Available commands:')}\n${this._commands.map((c) => `    ${pc.green(c.name)}`).join('\n')}${similar ? `\n\n  ${pc.dim('Did you mean')} ${pc.green(similar)}${pc.dim('?')}` : ''}`,
			)
		}

		return { remainingArgs: args }
	}

	private executeCommand(command: Command, args: string[]): 'handled' {
		const { parsed, positionalArgs } = this.parser.parse(args, command.options)
		const { positionals, rest } = this.parsePositionals(
			positionalArgs,
			command.positionals || [],
		)

		const result = command.action({
			options: parsed,
			// @ts-expect-error
			positionals,
			// @ts-expect-error
			rest,
		})

		if (result instanceof Promise) {
			result.catch((err) => {
				this.formatter.showError(err)
				processExit(1, err)
			})
		}

		return 'handled'
	}

	private parseMainCommand(args: string[]) {
		const { parsed, positionalArgs } = this.parser.parse(args, this._options)
		const { positionals, rest } = this.parsePositionals(
			positionalArgs,
			this._positionals,
		)

		return {
			options: parsed as Prettify<{
				[K in keyof TOptions]: TOptions[K]['_output']
			}>,
			// @ts-expect-error
			positionals: positionals as ExtractNonRestPositionals<TPositionals>,
			rest: rest as ExtractRestType<TPositionals>,
		}
	}

	private parsePositionals(
		args: any[],
		schemas: (PositionalSchema | VariadicPositionalSchema)[],
	): {
		positionals: any[]
		rest: any
	} {
		const positionals: any[] = []
		let rest: any = undefined

		const variadicIndex = schemas.findIndex(
			(s) => '_isVariadic' in s && s._isVariadic,
		)

		if (variadicIndex !== -1) {
			for (let i = 0; i < variadicIndex; i++) {
				const schema = schemas[i]
				const value = args[i]

				try {
					positionals.push(schema.parse(value, schema._name))
				} catch (error) {
					const message =
						error instanceof Error
							? error.message
									.replace(`${schema._name} `, '')
									.replace(`${schema._name}: `, '')
							: String(error)
					throw new CLIError(`Argument <${schema._name}>: ${message}`)
				}
			}

			const variadicSchema = schemas[variadicIndex] as VariadicPositionalSchema
			const variadicArgs = args.slice(variadicIndex)

			try {
				rest = variadicSchema.parse(variadicArgs, variadicSchema._name)
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
								.replace(`${variadicSchema._name} `, '')
								.replace(`${variadicSchema._name}: `, '')
						: String(error)
				throw new CLIError(`Argument <${variadicSchema._name}>: ${message}`)
			}
		} else {
			for (let i = 0; i < schemas.length; i++) {
				const schema = schemas[i]
				const value = args[i]

				try {
					positionals.push(schema.parse(value, schema._name))
				} catch (error) {
					const message =
						error instanceof Error
							? error.message
									.replace(`${schema._name} `, '')
									.replace(`${schema._name}: `, '')
							: String(error)
					throw new CLIError(`Argument <${schema._name}>: ${message}`)
				}
			}

			if (args.length > schemas.length) {
				const extra = args.slice(schemas.length)
				throw new CLIError(
					`Too many arguments provided\n\n  ${pc.dim('Expected:')} ${schemas.length} argument${schemas.length !== 1 ? 's' : ''}\n  ${pc.dim('Received:')} ${args.length} argument${args.length !== 1 ? 's' : ''}\n\n  ${pc.dim('Extra:')} ${extra.map((e) => pc.red(e)).join(', ')}`,
				)
			}
		}

		return {
			positionals:
				schemas.length === 0 && variadicIndex === -1 ? args : positionals,
			rest,
		}
	}
}

export const z = {
	string: (): StringSchema => new StringSchemaImpl(),
	number: (): NumberSchema => new NumberSchemaImpl(),
	boolean: (): BooleanSchema => new BooleanSchemaImpl(),
	array: <T>(schema: Schema<T>): ArraySchema<T> => new ArraySchemaImpl(schema),
	object: <T extends Record<string, Schema> | Schema = never>(
		shapeOrValueSchema: T,
	): T extends Record<string, Schema>
		? ObjectSchema<{ [K in keyof T]: T[K]['_output'] }>
		: T extends Schema
			? ObjectSchema<Record<string, T['_output']>>
			: never => {
		return new ObjectSchemaImpl(shapeOrValueSchema) as any
	},
	union: <T extends readonly Schema[]>(...schemas: T): UnionSchema<T> =>
		new UnionSchemaImpl(schemas),
}

export function cli(): CLI<Record<string, never>, readonly []> {
	return new CLIImpl<Record<string, never>, readonly []>()
}
