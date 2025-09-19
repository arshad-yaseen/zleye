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
			throw new CLIError(`${path} must be a string, received ${typeof value}`)
		}

		if (this._choices && !this._choices.includes(value)) {
			throw new CLIError(
				`${path} must be one of ${joinWithOr(Array.from(this._choices))}`,
			)
		}

		if (this._minLength !== undefined && value.length < this._minLength) {
			throw new CLIError(
				this._minMessage ||
					`${path} must be at least ${this._minLength} characters`,
			)
		}

		if (this._maxLength !== undefined && value.length > this._maxLength) {
			throw new CLIError(
				this._maxMessage ||
					`${path} must be at most ${this._maxLength} characters`,
			)
		}

		if (this._regex && !this._regex.pattern.test(value)) {
			throw new CLIError(
				this._regex.message ||
					`${path} must match pattern ${this._regex.pattern}`,
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

		if (Number.isNaN(num)) {
			throw new CLIError(`${path} must be a number, received ${typeof value}`)
		}

		if (this._isInt && !Number.isInteger(num)) {
			throw new CLIError(this._intMessage || `${path} must be an integer`)
		}

		if (this._isPositive && num <= 0) {
			throw new CLIError(this._positiveMessage || `${path} must be positive`)
		}

		if (this._isNegative && num >= 0) {
			throw new CLIError(this._negativeMessage || `${path} must be negative`)
		}

		if (this._min !== undefined && num < this._min) {
			throw new CLIError(
				this._minMessage || `${path} must be at least ${this._min}`,
			)
		}

		if (this._max !== undefined && num > this._max) {
			throw new CLIError(
				this._maxMessage || `${path} must be at most ${this._max}`,
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

		throw new CLIError(`${path} must be a boolean`)
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
		const arr = this.parseToArray(value)

		if (this._minLength !== undefined && arr.length < this._minLength) {
			throw new CLIError(
				this._minMessage ||
					`${path} must have at least ${this._minLength} items`,
			)
		}

		if (this._maxLength !== undefined && arr.length > this._maxLength) {
			throw new CLIError(
				this._maxMessage ||
					`${path} must have at most ${this._maxLength} items`,
			)
		}

		return arr.map((item, i) => {
			const itemPath = `${path}[${i}]`
			return this._itemSchema.parse(item, itemPath)
		})
	}

	private parseToArray(value: unknown): unknown[] {
		if (Array.isArray(value)) return value
		if (typeof value === 'string' && value.includes(',')) {
			return value
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean)
		}
		return [value]
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
				'z.object() requires either a shape or value schema. Use z.object({...}) for explicit keys or z.object(z.string()) for any keys',
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
			throw new CLIError(`${path} must be an object`)
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
			const valueKeys = Object.keys(objectValue)
			const unknownKeys = valueKeys.filter((k) => !shapeKeys.has(k))

			if (unknownKeys.length > 0) {
				throw new CLIError(
					`${path} has unknown keys: ${joinWithAnd(unknownKeys)}`,
				)
			}

			for (const [key, schema] of Object.entries(this._shape)) {
				result[key] = schema.parse(objectValue[key], `${path}.${key}`)
			}
			return result as T
		}

		throw new CLIError(`${path} schema configuration error`)
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

		// Sort schemas to try number before string (for better type inference)
		const sortedSchemas = [...this._schemas].sort((a, b) => {
			if (a._type === 'number' && b._type === 'string') return -1
			if (a._type === 'string' && b._type === 'number') return 1
			return 0
		})

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

						if (providedKeys.length > 0 && objSchema._shape) {
							const validKeys = providedKeys.filter(
								(k) => k in objSchema._shape!,
							)
							specificity = validKeys.length * 10

							if (missingFields.length > 0) {
								specificity += 5
							}
						}
					} else if (schema._type === typeof value) {
						specificity = 1
					}

					errors.push({
						schema,
						error: error.message,
						specificity,
					})
				}
			}
		}

		errors.sort((a, b) => b.specificity - a.specificity)

		const mostSpecificError = errors[0]
		if (mostSpecificError && mostSpecificError.specificity > 0) {
			throw new CLIError(mostSpecificError.error)
		}

		const typeDescriptions = this.getTypeDescriptions()
		const uniqueTypes = [...new Set(typeDescriptions)]

		throw new CLIError(`${path} must be one of: ${joinWithOr(uniqueTypes)}`)
	}

	private getTypeDescriptions(): string[] {
		return this._schemas.map((s) => {
			if (s._type === 'object') {
				const objSchema = s as ObjectSchema
				if (objSchema._isAnyKeys) {
					return 'object with any keys'
				}

				if (objSchema._shape) {
					const keys = Object.keys(objSchema._shape)
					if (keys.length <= 3) {
						return `object {${keys.join(', ')}}`
					}
					return 'object'
				}
			}

			return s._type
		})
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
		// Copy over optional and default settings
		this._isOptional = this._baseSchema._isOptional
		this._defaultValue = this._baseSchema._defaultValue
		this._description = this._baseSchema._description
	}

	protected validateValue(value: unknown, path: string): T {
		return this._baseSchema.parse(value, path || this._name)
	}

	parse(value: unknown, path = 'value'): T {
		// Use base schema's parsing directly to preserve optional/default behavior
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
			throw new CLIError(`${path} must be an array`)
		}

		return values.map((value, i) => {
			const itemPath = `${path}[${i}]`
			return this._itemSchema.parse(value, itemPath)
		})
	}

	parse(value: unknown, path = 'value'): T[] {
		if (value === undefined || (Array.isArray(value) && value.length === 0)) {
			if (this._isOptional || this._defaultValue !== undefined) {
				return this._defaultValue || []
			}
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
		console.error(
			pc.red(pc.bold('Error:')),
			error instanceof Error ? error.message : String(error),
		)
		console.error()
		console.error('Run with --help for usage information')
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
			if (this.cli._commands.length > 0) parts.push(pc.blue('<command>'))
			if (Object.keys(this.cli._options).length > 0)
				parts.push(pc.blue('[...flags]'))

			const hasPositionals = this.cli._positionals.length > 0
			if (hasPositionals) {
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
		if (this.cli._positionals.length === 0) return

		console.log(pc.bold('Arguments:'))
		for (const pos of this.cli._positionals) {
			const isVariadic = '_isVariadic' in pos && pos._isVariadic
			const name = isVariadic ? `[...${pos._name}]` : `<${pos._name}>`
			console.log(`  ${pc.cyan(name)}  ${pos._description || ''}`)
		}
		console.log()
	}

	private printCommands(): void {
		if (this.cli._commands.length === 0) return

		console.log(pc.bold('Commands:'))
		const rows = this.cli._commands.map((cmd) => ({
			name: cmd.name,
			example: Array.isArray(cmd.example) ? cmd.example[0] : cmd.example || '',
			description: cmd.description || '',
		}))

		const nameWidth = Math.max(...rows.map((r) => r.name.length))
		const exampleWidth = Math.max(...rows.map((r) => r.example.length))

		for (const { name, example, description } of rows) {
			const namePart = `  ${pc.cyan(name.padEnd(nameWidth))}`
			const examplePart = example
				? `  ${pc.dim(example.padEnd(exampleWidth))}`
				: `  ${' '.repeat(exampleWidth)}`
			const descPart = description ? `  ${description}` : ''
			console.log(`${namePart}${examplePart}${descPart}`)
		}

		console.log()
		console.log(
			`  ${pc.cyan('<command> --help'.padEnd(nameWidth))}${exampleWidth > 0 ? `  ${' '.repeat(exampleWidth)}` : ''}  ${pc.dim('Print help text for command.')}`,
		)
		console.log()
	}

	private printOptions(): void {
		if (Object.keys(this.cli._options).length === 0) return

		console.log(pc.bold('Flags:'))
		this.printOptionsTable(this.cli._options)
		console.log()
	}

	private printExamples(): void {
		if (this.cli._examples.length === 0) return

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
		if (Object.keys(command.options).length === 0) return

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
		if (examples.length === 0) return

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
			if (flags === '' && type === '' && desc === '') {
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
	): Array<{ flags: string; type: string; desc: string }> {
		const rows: Array<{ flags: string; type: string; desc: string }> = []

		for (const [key, schema] of Object.entries(options)) {
			const fullKey = prefix ? `${prefix}.${key}` : key

			if (schema._type === 'union') {
				const unionSchema = schema as UnionSchema<any>
				const unionRows = this.buildUnionRows(fullKey, unionSchema)
				rows.push(...unionRows)
			} else if (
				schema._type === 'object' &&
				// @ts-expect-error
				!schema._isAnyKeys &&
				// @ts-expect-error
				schema._shape
			) {
				// @ts-expect-error
				const objectRows = this.buildOptionRows(schema._shape, fullKey)
				rows.push(...objectRows)
			} else {
				// Check if it's a boolean with default true that needs --no- version
				const needsNoVersion = this.shouldAddNoVersion(schema)

				rows.push({
					flags: this.getOptionFlags(fullKey, schema),
					type: this.getOptionType(fullKey, schema),
					desc: this.getOptionDescription(schema),
				})

				// If it needs --no- version, add it
				if (needsNoVersion) {
					const noDesc = this.generateNoDescription(fullKey)
					rows.push({
						flags: `    --no-${fullKey}`,
						type: pc.dim(''),
						desc: noDesc,
					})
				}
			}
		}

		return rows
	}

	private shouldAddNoVersion(schema: Schema): boolean {
		// Check if it's a boolean with default true
		if (schema._type === 'boolean' && schema._defaultValue === true) {
			return true
		}

		// Check if it's a union containing a boolean with default true
		if (schema._type === 'union') {
			const unionSchema = schema as UnionSchema<any>
			const booleanSchema = unionSchema._schemas.find(
				(s: any) => s._type === 'boolean',
			)
			if (booleanSchema && booleanSchema._defaultValue === true) {
				return true
			}
		}

		return false
	}

	private generateNoDescription(key: string): string {
		const words = key.split(/(?=[A-Z])|[._-]/).map((w) => w.toLowerCase())
		const readableKey = words.join(' ')
		return `Disable ${readableKey}`
	}

	private buildUnionRows(
		key: string,
		schema: UnionSchema<any>,
	): Array<{ flags: string; type: string; desc: string }> {
		const rows: Array<{ flags: string; type: string; desc: string }> = []
		const schemas = schema._schemas

		const groups: Map<string, Schema[]> = new Map()
		for (const s of schemas) {
			const type = s._type
			if (!groups.has(type)) groups.set(type, [])
			groups.get(type)!.push(s)
		}

		const unionRows: Array<{ flags: string; type: string; desc: string }> = []

		const objectSchemas = groups.get('object') ?? []
		const nonObjectGroups = Array.from(groups.entries()).filter(
			([type]) => type !== 'object',
		)

		for (let i = 0; i < objectSchemas.length; ++i) {
			const objSchema = objectSchemas[i]
			if ((objSchema as ObjectSchema)._isAnyKeys) {
				const row = {
					flags: `    --${key}.<key>`,
					type: this.getOptionType(key, objSchema),
					desc: this.getOptionDescription(objSchema),
				}
				unionRows.push(row)
			} else {
				const objRows = this.buildOptionRows(
					(objSchema as ObjectSchema<any>)._shape!,
					key,
				)
				unionRows.push(...objRows)

				// Check if object properties need --no- versions
				const objShape = (objSchema as ObjectSchema<any>)._shape!
				for (const [propKey, propSchema] of Object.entries(objShape)) {
					if (this.shouldAddNoVersion(propSchema)) {
						const fullKey = `${key}.${propKey}`
						const noDesc = this.generateNoDescription(fullKey)
						unionRows.push({
							flags: `    --no-${fullKey}`,
							type: pc.dim(''),
							desc: noDesc,
						})
					}
				}
			}
		}

		let isFirstNonObject = true
		for (const [type, groupSchemas] of nonObjectGroups) {
			for (let i = 0; i < groupSchemas.length; ++i) {
				const s = groupSchemas[i]
				const row = {
					flags: this.getOptionFlags(key, s),
					type: this.getOptionType(key, s),
					desc: this.getOptionDescription(s),
				}
				unionRows.push(row)
				isFirstNonObject = false
			}
		}

		// Check if we need to add --no- version for boolean in union
		const needsNoVersion = this.shouldAddNoVersion(schema)
		if (needsNoVersion) {
			const noDesc = this.generateNoDescription(key)
			unionRows.push({
				flags: `    --no-${key}`,
				type: pc.dim(''),
				desc: noDesc,
			})
		}

		if (schema._description && unionRows.length > 0) {
			unionRows[0].desc = `${schema._description} ${unionRows[0].desc ? `- ${unionRows[0].desc}` : ''}`
		}

		if (unionRows.length > 0) {
			rows.push(...unionRows)
		}

		return rows
	}

	private getOptionFlags(key: string, schema: Schema): string {
		if (schema._type === 'object' && (schema as ObjectSchema)._isAnyKeys) {
			return `    --${key}.<key>`
		}
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
			// Show all choices, or up to a reasonable limit (e.g., 5)
			if (choices.length <= 5) {
				valueType = choices.join('|')
			} else {
				// For many choices, show first few with ellipsis
				valueType = `${choices.slice(0, 4).join('|')}|...`
			}
		} else if (schema._type === 'number') {
			valueType = 'n'
		} else if (schema._type === 'array') {
			valueType = 'val,...'
		} else if (
			schema._type === 'object' &&
			(schema as ObjectSchema)._valueSchema
		) {
			const valueSchema = (schema as ObjectSchema)._valueSchema!
			// Recursively get the type for the value schema
			return this.getOptionType(_key, valueSchema)
		}

		return ` ${pc.dim(`<${valueType}>`)}  `
	}

	private getOptionDescription(schema: Schema): string {
		const parts: string[] = []
		if (schema._description) parts.push(schema._description)

		// Add example to description
		if (schema._example) {
			parts.push(pc.dim(`Example: ${schema._example}`))
		}

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
		if (Object.keys(command.options).length > 0)
			parts.push(pc.cyan('[...flags]'))
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
	parse(
		args: string[],
		options: Record<string, Schema>,
	): { parsed: Record<string, any>; positionalArgs: any[]; rawArgs: string[] } {
		const parsed: Record<string, any> = {}
		const rawOptions: Record<string, any> = {}
		const positionalArgs: any[] = []
		const doubleDashIndex = args.indexOf('--')
		let rawArgs: string[] = []

		if (doubleDashIndex !== -1) {
			rawArgs = args.slice(doubleDashIndex + 1)
			args = args.slice(0, doubleDashIndex)
		}

		for (let i = 0; i < args.length; i++) {
			const arg = args[i]

			if (arg.startsWith('--')) {
				const consumed = this.parseFlag(arg, args, i, options, rawOptions)
				i += consumed
			} else if (arg.startsWith('-') && !this.looksLikeNegativeNumber(arg)) {
				const consumed = this.parseAlias(arg, args, i, options, rawOptions)
				i += consumed
			} else {
				positionalArgs.push(arg)
			}
		}

		positionalArgs.push(...rawArgs)

		for (const [key, schema] of Object.entries(options)) {
			if (rawOptions[key] !== undefined) {
				parsed[key] = this.parseOptionWithSchema(
					key,
					schema,
					rawOptions[key],
					options,
				)
			} else {
				parsed[key] = schema.parse(undefined, `--${key}`)
			}
		}

		return { parsed, positionalArgs, rawArgs }
	}

	private looksLikeNegativeNumber(arg: string): boolean {
		if (!arg.startsWith('-')) return false
		const rest = arg.slice(1)
		return /^\d/.test(rest) // Starts with digit after '-'
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
			const booleanValue = this.parseBooleanValue(rawValue)
			return schema.parse(booleanValue ?? rawValue, `--${key}`)
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
			for (const [k, v] of Object.entries(rawValue)) {
				if (!schema._shape[k]) {
					throw new CLIError(`${path}.${k} is not a valid option`)
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
				throw new CLIError(`Unknown option: ${arg}`)
			}

			// Handle nested paths like --no-minify.css
			if (keys.length > 1) {
				// Check if the main schema is a union containing an object with this nested property
				if (mainSchema._type === 'union') {
					const unionSchema = mainSchema as UnionSchema<any>

					// Find an object schema in the union that has this nested path with boolean default true
					for (const s of unionSchema._schemas) {
						if (s._type === 'object') {
							const nestedSchema = this.getNestedSchema(s, keys.slice(1))
							if (nestedSchema && this.shouldHandleNoVersion(nestedSchema)) {
								this.setNestedValue(rawOptions, keyPath, false, options)
								return 0
							}
						}
					}
				} else {
					// Regular nested schema (not in union)
					const nestedSchema = this.getNestedSchema(mainSchema, keys.slice(1))
					if (nestedSchema && this.shouldHandleNoVersion(nestedSchema)) {
						this.setNestedValue(rawOptions, keyPath, false, options)
						return 0
					}
				}
			} else {
				// Simple case: --no-cache
				if (this.shouldHandleNoVersion(mainSchema)) {
					this.setNestedValue(rawOptions, keyPath, false, options)
					return 0
				}
			}

			throw new CLIError(`Unknown option: ${arg}`)
		}

		const [keyPath, ...valueParts] = arg.slice(2).split('=')
		const hasExplicitValue = valueParts.length > 0
		const explicitValue = hasExplicitValue ? valueParts.join('=') : undefined

		const keys = keyPath.split('.')
		const mainKey = keys[0]
		const schema = options[mainKey]

		if (!schema) {
			throw new CLIError(`Unknown option: --${mainKey}`)
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
				throw new CLIError(`--${keyPath} requires a value`)
			}

			this.setNestedValue(rawOptions, keyPath, value, options)
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
		}

		return consumed
	}

	private shouldHandleNoVersion(schema: Schema | undefined): boolean {
		if (!schema) return false

		if (schema._type === 'boolean' && schema._defaultValue === true) {
			return true
		}

		if (schema._type === 'union') {
			const unionSchema = schema as UnionSchema<any>
			const booleanSchema = unionSchema._schemas.find(
				(s: any) => s._type === 'boolean',
			)
			if (booleanSchema && booleanSchema._defaultValue === true) {
				return true
			}
		}

		return false
	}

	private getNestedSchema(
		schema: Schema | undefined,
		nestedKeys: string[],
	): Schema | undefined {
		if (!schema || nestedKeys.length === 0) return schema

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
				// For unions, try to find an object schema that has this key
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
					throw new CLIError(`Unknown option key: ${key}`)
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

					if (obj._shape?.[key]) {
						current = obj._shape[key]
					}
				}
			}
		}

		if (current._type === 'boolean') {
			return 'boolean'
		}

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
			throw new CLIError(`Unknown option: -${alias}`)
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
			throw new CLIError(`-${alias} requires a value`)
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

		for (let i = 0; i < keys.length - 1; i++) {
			const k = keys[i]

			if (!current[k]) {
				current[k] = {}
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
		if (args.length === 0 || args[0].startsWith('-')) {
			return { remainingArgs: args }
		}

		const commandName = args[0]
		const command = this._commands.find((c) => c.name === commandName)

		if (command) {
			return { command, remainingArgs: args.slice(1) }
		}

		if (this._commands.length > 0) {
			throw new CLIError(`Unknown command: ${commandName}`)
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
	): { positionals: any[]; rest: any } {
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
					throw new CLIError(`Argument "${schema._name}": ${message}`)
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
				throw new CLIError(`Argument "${variadicSchema._name}": ${message}`)
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
					throw new CLIError(`Argument "${schema._name}": ${message}`)
				}
			}

			if (args.length > schemas.length) {
				const extra = args.slice(schemas.length)
				throw new CLIError(
					`Unexpected argument${extra.length > 1 ? 's' : ''}: ${joinWithAnd(extra)}`,
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
