import pc from 'picocolors'
import { joinWithAnd, joinWithOr } from './utils'

type Prettify<T> = { [K in keyof T]: T[K] } & {}

type ExtractPositionalType<T> = T extends PositionalSchema<infer U> ? U : never
type ExtractPositionalTypes<T extends readonly PositionalSchema<any>[]> = {
	readonly [K in keyof T]: ExtractPositionalType<T[K]>
}

type SchemaType = 'string' | 'number' | 'boolean' | 'array' | 'object'

interface BaseSchema<T = any> {
	_type: SchemaType
	_output: T
	_input: unknown
	parse(value: unknown, path?: string): T
	optional(): Schema<T | undefined>
	default(value: T): Schema<T>
	transform<U>(fn: (value: T) => U): Schema<U>
	describe(description: string): this
	alias(alias: string): this
	example(example: string): this
	_description?: string
	_alias?: string
	_example?: string
	_isOptional?: boolean
	_defaultValue?: T
}

type Schema<T = any> = BaseSchema<T>

interface StringSchemaBase<T extends string = string> extends BaseSchema<T> {
	min(length: number): this
	max(length: number): this
	regex(pattern: RegExp, message?: string): this
	choices<const U extends readonly string[]>(
		choices: U,
	): StringSchema<U[number]>
	_minLength?: number
	_maxLength?: number
	_regex?: { pattern: RegExp; message?: string }
	_choices?: readonly string[]
}

type StringSchema<T extends string = string> = StringSchemaBase<T>

interface NumberSchema extends BaseSchema<number> {
	min(value: number): this
	max(value: number): this
	int(): this
	positive(): this
	negative(): this
	_min?: number
	_max?: number
	_isInt?: boolean
	_isPositive?: boolean
	_isNegative?: boolean
}

interface BooleanSchema extends BaseSchema<boolean> {}

interface ArraySchema<T> extends BaseSchema<T[]> {
	min(length: number): this
	max(length: number): this
	_itemSchema: Schema<T>
	_minLength?: number
	_maxLength?: number
}

interface ObjectSchema<T extends Record<string, any>> extends BaseSchema<T> {
	_shape: { [K in keyof T]: Schema<T[K]> }
}

interface PositionalSchema<T = string> extends BaseSchema<T> {
	_name: string
}

interface Command<
	TOptions extends Record<string, Schema> = any,
	TPositionals extends readonly PositionalSchema<any>[] = readonly [],
> {
	name: string
	description?: string
	usage?: string
	example?: string | string[]
	options: TOptions
	positionals?: PositionalSchema<any>[]
	action: (args: {
		options: Prettify<{ [K in keyof TOptions]: TOptions[K]['_output'] }>
		positionals: ExtractPositionalTypes<TPositionals>
	}) => void | Promise<void>
}

interface CommandBuilder<
	TOptions extends Record<string, Schema>,
	TPositionals extends readonly PositionalSchema<any>[] = readonly [],
> {
	description(desc: string): this
	usage(usage: string): this
	example(example: string | string[]): this
	positional<T>(
		name: string,
		schema?: Schema<T>,
	): CommandBuilder<TOptions, [...TPositionals, PositionalSchema<T>]>
	action(
		fn: (args: {
			options: Prettify<{ [K in keyof TOptions]: TOptions[K]['_output'] }>
			positionals: ExtractPositionalTypes<TPositionals>
		}) => void | Promise<void>,
	): Command<TOptions, TPositionals>
}

interface CLI<
	TOptions extends Record<string, Schema> = Record<string, never>,
	TPositionals extends readonly PositionalSchema<any>[] = readonly [],
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
	command<T extends Record<string, Schema>>(
		name: string,
		options: T,
	): CommandBuilder<T>
	parse(argv?: string[]):
		| {
				options: Prettify<{ [K in keyof TOptions]: TOptions[K]['_output'] }>
				positionals: ExtractPositionalTypes<TPositionals>
		  }
		| undefined
	_name?: string
	_version?: string
	_description?: string
	_usage?: string
	_examples?: string[]
	_options: TOptions
	_positionals?: PositionalSchema<any>[]
	_commands: Command<any, any>[]
}

class StringSchemaImpl<T extends string = string> implements StringSchema<T> {
	_type = 'string' as const
	_output!: T
	_input!: unknown
	_description?: string
	_alias?: string
	_example?: string
	_isOptional?: boolean
	_defaultValue?: T
	_minLength?: number
	_maxLength?: number
	_regex?: { pattern: RegExp; message?: string }
	_choices?: readonly string[]

	parse(value: unknown, path = 'value'): T {
		if (value === undefined && this._isOptional) return undefined as any
		if (value === undefined && this._defaultValue !== undefined)
			return this._defaultValue
		if (value === undefined) throw new CLIError(`${path} is required`)

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
				`${path} must be at least ${this._minLength} characters`,
			)
		}

		if (this._maxLength !== undefined && value.length > this._maxLength) {
			throw new CLIError(
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

	min(length: number): this {
		this._minLength = length
		return this
	}

	max(length: number): this {
		this._maxLength = length
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

class NumberSchemaImpl implements NumberSchema {
	_type = 'number' as const
	_output!: number
	_input!: unknown
	_description?: string
	_alias?: string
	_example?: string
	_isOptional?: boolean
	_defaultValue?: number
	_min?: number
	_max?: number
	_isInt?: boolean
	_isPositive?: boolean
	_isNegative?: boolean

	parse(value: unknown, path = 'value'): number {
		if (value === undefined && this._isOptional) return undefined as any
		if (value === undefined && this._defaultValue !== undefined)
			return this._defaultValue
		if (value === undefined) throw new CLIError(`${path} is required`)

		const num = Number(value)
		if (Number.isNaN(num)) {
			throw new CLIError(`${path} must be a number, received ${typeof value}`)
		}

		if (this._isInt && !Number.isInteger(num)) {
			throw new CLIError(`${path} must be an integer`)
		}

		if (this._isPositive && num <= 0) {
			throw new CLIError(`${path} must be positive`)
		}

		if (this._isNegative && num >= 0) {
			throw new CLIError(`${path} must be negative`)
		}

		if (this._min !== undefined && num < this._min) {
			throw new CLIError(`${path} must be at least ${this._min}`)
		}

		if (this._max !== undefined && num > this._max) {
			throw new CLIError(`${path} must be at most ${this._max}`)
		}

		return num
	}

	optional(): Schema<number | undefined> {
		const clone = Object.create(this)
		clone._isOptional = true
		return clone
	}

	default(value: number): Schema<number> {
		const clone = Object.create(this)
		clone._defaultValue = value
		return clone
	}

	transform<U>(fn: (value: number) => U): Schema<U> {
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

	min(value: number): this {
		this._min = value
		return this
	}

	max(value: number): this {
		this._max = value
		return this
	}

	int(): this {
		this._isInt = true
		return this
	}

	positive(): this {
		this._isPositive = true
		return this
	}

	negative(): this {
		this._isNegative = true
		return this
	}
}

class BooleanSchemaImpl implements BooleanSchema {
	_type = 'boolean' as const
	_output!: boolean
	_input!: unknown
	_description?: string
	_alias?: string
	_example?: string
	_isOptional?: boolean
	_defaultValue?: boolean

	parse(value: unknown, path = 'value'): boolean {
		if (value === undefined && this._isOptional) return undefined as any
		if (value === undefined && this._defaultValue !== undefined)
			return this._defaultValue
		if (value === undefined) return false

		if (value === 'true' || value === true || value === '1' || value === 1)
			return true
		if (value === 'false' || value === false || value === '0' || value === 0)
			return false

		throw new CLIError(`${path} must be a boolean`)
	}

	optional(): Schema<boolean | undefined> {
		const clone = Object.create(this)
		clone._isOptional = true
		return clone
	}

	default(value: boolean): Schema<boolean> {
		const clone = Object.create(this)
		clone._defaultValue = value
		return clone
	}

	transform<U>(fn: (value: boolean) => U): Schema<U> {
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

class ArraySchemaImpl<T> implements ArraySchema<T> {
	_type = 'array' as const
	_output!: T[]
	_input!: unknown
	_itemSchema: Schema<T>
	_description?: string
	_alias?: string
	_example?: string
	_isOptional?: boolean
	_defaultValue?: T[]
	_minLength?: number
	_maxLength?: number

	constructor(itemSchema: Schema<T>) {
		this._itemSchema = itemSchema
	}

	parse(value: unknown, path = 'value'): T[] {
		if (value === undefined && this._isOptional) return undefined as any
		if (value === undefined && this._defaultValue !== undefined)
			return this._defaultValue
		if (value === undefined) throw new CLIError(`${path} is required`)

		let arr: unknown[]
		if (Array.isArray(value)) {
			arr = value
		} else if (typeof value === 'string' && value.includes(',')) {
			arr = value
				.split(',')
				.map((item) => item.trim())
				.filter((item) => item !== '')
		} else {
			arr = [value]
		}

		if (this._minLength !== undefined && arr.length < this._minLength) {
			throw new CLIError(`${path} must have at least ${this._minLength} items`)
		}

		if (this._maxLength !== undefined && arr.length > this._maxLength) {
			throw new CLIError(`${path} must have at most ${this._maxLength} items`)
		}

		return arr.map((item, i) => this._itemSchema.parse(item, `${path}[${i}]`))
	}

	optional(): Schema<T[] | undefined> {
		const clone = Object.create(this)
		clone._isOptional = true
		return clone
	}

	default(value: T[]): Schema<T[]> {
		const clone = Object.create(this)
		clone._defaultValue = value
		return clone
	}

	transform<U>(fn: (value: T[]) => U): Schema<U> {
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

	min(length: number): this {
		this._minLength = length
		return this
	}

	max(length: number): this {
		this._maxLength = length
		return this
	}
}

class ObjectSchemaImpl<T extends Record<string, any>>
	implements ObjectSchema<T>
{
	_type = 'object' as const
	_output!: T
	_input!: unknown
	_shape: { [K in keyof T]: Schema<T[K]> }
	_description?: string
	_alias?: string
	_example?: string
	_isOptional?: boolean
	_defaultValue?: T

	constructor(shape: { [K in keyof T]: Schema<T[K]> }) {
		this._shape = shape
	}

	parse(value: unknown, path = 'value'): T {
		if (value === undefined && this._isOptional) return undefined as any
		if (value === undefined && this._defaultValue !== undefined)
			return this._defaultValue

		const objectValue = value === undefined ? {} : value

		if (typeof objectValue !== 'object' || objectValue === null) {
			throw new CLIError(`${path} must be an object`)
		}

		const result: any = {}
		for (const [key, schema] of Object.entries(this._shape)) {
			result[key] = schema.parse((objectValue as any)[key], `${path}.${key}`)
		}
		return result
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

class PositionalSchemaImpl<T = string> implements PositionalSchema<T> {
	_type = 'string' as const
	_output!: T
	_input!: unknown
	_name: string
	_description?: string
	_baseSchema: Schema<T>

	constructor(name: string, schema?: Schema<T>) {
		this._name = name
		this._baseSchema = schema || (new StringSchemaImpl() as any)
		this._description = schema?._description
	}

	parse(value: unknown, path?: string): T {
		return this._baseSchema.parse(value, path || this._name)
	}

	optional(): Schema<T | undefined> {
		const clone = Object.create(this)
		clone._baseSchema = this._baseSchema.optional()
		return clone
	}

	default(value: T): Schema<T> {
		const clone = Object.create(this)
		clone._baseSchema = this._baseSchema.default(value)
		return clone
	}

	transform<U>(fn: (value: T) => U): Schema<U> {
		const clone = Object.create(this)
		clone._baseSchema = this._baseSchema.transform(fn)
		return clone
	}

	describe(description: string): this {
		this._description = description
		return this
	}

	alias(alias: string): this {
		return this
	}

	example(example: string): this {
		if ('example' in this._baseSchema) {
			;(this._baseSchema as any).example(example)
		}
		return this
	}
}

class CommandBuilderImpl<
	TOptions extends Record<string, Schema>,
	TPositionals extends readonly PositionalSchema<any>[] = readonly [],
> implements CommandBuilder<TOptions, TPositionals>
{
	private _name: string
	private _options: TOptions
	private _description?: string
	private _usage?: string
	private _examples: string[] = []
	private _positionals: PositionalSchema<any>[] = []

	constructor(name: string, options: TOptions) {
		this._name = name
		this._options = options
	}

	description(desc: string): this {
		this._description = desc
		return this
	}

	usage(usage: string): this {
		this._usage = usage
		return this
	}

	example(example: string | string[]): this {
		if (Array.isArray(example)) {
			this._examples.push(...example)
		} else {
			this._examples.push(example)
		}
		return this
	}

	positional<T>(
		name: string,
		schema?: Schema<T>,
	): CommandBuilder<TOptions, [...TPositionals, PositionalSchema<T>]> {
		this._positionals.push(new PositionalSchemaImpl(name, schema))
		return this as any
	}

	action(
		fn: (args: {
			options: Prettify<{ [K in keyof TOptions]: TOptions[K]['_output'] }>
			positionals: ExtractPositionalTypes<TPositionals>
		}) => void | Promise<void>,
	): Command<TOptions, TPositionals> {
		return {
			name: this._name,
			description: this._description,
			usage: this._usage,
			example: this._examples.length > 0 ? this._examples : undefined,
			options: this._options,
			positionals: this._positionals as any,
			action: fn as any,
		}
	}
}

class CLIError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'CLIError'
	}
}

export const z = {
	string: (): StringSchema => new StringSchemaImpl(),
	number: (): NumberSchema => new NumberSchemaImpl(),
	boolean: (): BooleanSchema => new BooleanSchemaImpl(),
	array: <T>(schema: Schema<T>): ArraySchema<T> => new ArraySchemaImpl(schema),
	object: <T extends Record<string, Schema>>(
		shape: T,
	): ObjectSchema<{
		[K in keyof T]: T[K]['_output']
	}> =>
		new ObjectSchemaImpl(shape) as ObjectSchema<{
			[K in keyof T]: T[K]['_output']
		}>,
}

class CLIImpl<
	TOptions extends Record<string, Schema> = Record<string, never>,
	TPositionals extends readonly PositionalSchema<any>[] = readonly [],
> implements CLI<TOptions, TPositionals>
{
	_name?: string
	_version?: string
	_description?: string
	_usage?: string
	_examples: string[] = []
	_options: TOptions = {} as TOptions
	_positionals: PositionalSchema<any>[] = []
	_commands: Command<any, any>[] = []

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
		if (Array.isArray(example)) {
			this._examples.push(...example)
		} else {
			this._examples.push(example)
		}
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
		this._positionals.push(new PositionalSchemaImpl(name, schema))
		return this as any
	}

	command<T extends Record<string, Schema>>(
		name: string,
		options: T,
	): CommandBuilder<T> {
		const builder = new CommandBuilderImpl(name, options)

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
			let args = [...argv]

			if (args.includes('--version') || args.includes('-v')) {
				if (this._version) {
					console.log(this._version)
					process.exit(0)
				}
			}

			const helpIndex = args.findIndex(
				(arg) => arg === '--help' || arg === '-h',
			)
			if (helpIndex !== -1) {
				const commandBeforeHelp = helpIndex > 0 ? args[helpIndex - 1] : null
				const command =
					commandBeforeHelp &&
					this._commands.find((c) => c.name === commandBeforeHelp)

				if (command) {
					this.showCommandHelp(command)
				} else {
					this.showHelp()
				}
				process.exit(0)
			}

			let commandName: string | undefined
			let commandOptions: Record<string, Schema> = this._options
			let commandAction:
				| ((options: any, ...args: any[]) => void | Promise<void>)
				| undefined
			let commandPositionals: PositionalSchema[] = this._positionals
			const positionalArgs: any[] = []

			if (args.length > 0 && !args[0].startsWith('-')) {
				commandName = args[0]
				const cmd = this._commands.find((c) => c.name === commandName)

				if (cmd) {
					commandOptions = cmd.options
					commandPositionals = cmd.positionals || []
					commandAction = cmd.action
					args = args.slice(1)
				} else if (this._commands.length > 0) {
					throw new CLIError(`Unknown command: ${commandName}`)
				} else {
					positionalArgs.push(args[0])
					args = args.slice(1)
				}
			}

			const parsed: Record<string, any> = {}
			const rawOptions: Record<string, any> = {}

			for (let i = 0; i < args.length; i++) {
				const arg = args[i]

				if (arg.startsWith('--')) {
					const [key, ...valueParts] = arg.slice(2).split('=')
					let value: any

					if (valueParts.length > 0) {
						value = valueParts.join('=')
					} else {
						const schema = commandOptions[key]
						if (schema && schema._type === 'boolean') {
							value = true
						} else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
							value = args[++i]
						} else {
							value = undefined
						}
					}

					const keys = key.split('.')
					let current = rawOptions
					for (let j = 0; j < keys.length - 1; j++) {
						current[keys[j]] = current[keys[j]] || {}
						current = current[keys[j]]
					}

					const lastKey = keys[keys.length - 1]
					if (current[lastKey] !== undefined) {
						if (!Array.isArray(current[lastKey])) {
							current[lastKey] = [current[lastKey]]
						}
						current[lastKey].push(value)
					} else {
						current[lastKey] = value
					}
				} else if (arg.startsWith('-')) {
					const alias = arg.slice(1)
					const optionName = Object.entries(commandOptions).find(
						([_, schema]) => schema._alias === alias,
					)?.[0]

					if (optionName) {
						const schema = commandOptions[optionName]
						let value: any

						if (schema && schema._type === 'boolean') {
							value = true
						} else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
							value = args[++i]
						} else {
							value = undefined
						}

						rawOptions[optionName] = value
					}
				} else {
					positionalArgs.push(arg)
				}
			}

			for (const [key, schema] of Object.entries(commandOptions)) {
				parsed[key] = schema.parse(rawOptions[key], `--${key}`)
			}

			const parsedPositionals: any[] = []
			if (commandPositionals.length > 0) {
				for (let i = 0; i < commandPositionals.length; i++) {
					const positional = commandPositionals[i]
					const value = positionalArgs[i]

					try {
						const parsedValue = positional.parse(value, positional._name)
						parsedPositionals.push(parsedValue)
					} catch (error) {
						throw new CLIError(
							`Argument "${positional._name}" ${error instanceof Error ? error.message.replace(`${positional._name} `, '') : error}`,
						)
					}
				}

				if (positionalArgs.length > commandPositionals.length) {
					const extra = positionalArgs.slice(commandPositionals.length)
					throw new CLIError(
						`Unexpected argument${extra.length > 1 ? 's' : ''}: ${joinWithAnd(extra)}`,
					)
				}
			} else {
				parsedPositionals.push(...positionalArgs)
			}

			if (commandAction) {
				const result = commandAction({
					options: parsed,
					positionals: positionalArgs,
				})
				if (result instanceof Promise) {
					result.catch((err) => {
						this.showError(err)
						process.exit(1)
					})
				}
				return undefined
			}

			return {
				options: parsed as Prettify<{
					[K in keyof TOptions]: TOptions[K]['_output']
				}>,
				positionals: parsedPositionals as ExtractPositionalTypes<TPositionals>,
			}
		} catch (error) {
			this.showError(error)
			process.exit(1)
		}
	}

	private showHelp() {
		console.log()

		if (this._description && this._version) {
			console.log(`${this._description} ${pc.dim(`(${this._version})`)}`)
			console.log()
		} else if (this._name) {
			console.log(pc.bold(this._name))
			if (this._version) {
				console.log(pc.dim(`v${this._version}`))
			}
			if (this._description) {
				console.log()
				console.log(this._description)
			}
			console.log()
		}

		if (this._usage) {
			console.log(`${pc.bold('Usage:')} ${this._usage}`)
		} else {
			const name = this._name || 'cli'
			const parts = [name]
			if (this._commands.length > 0) {
				parts.push(pc.blue('<command>'))
			}
			parts.push(pc.blue('[...flags]'))
			if (this._positionals.length > 0) {
				parts.push(...this._positionals.map((p) => pc.dim(`<${p._name}>`)))
			} else {
				parts.push(pc.blue('[...args]'))
			}
			console.log(`${pc.bold('Usage:')} ${parts.join(' ')}`)
		}
		console.log()

		if (this._positionals.length > 0) {
			console.log(pc.bold('Arguments:'))
			for (const pos of this._positionals) {
				console.log(`  ${pc.cyan(`<${pos._name}>`)}  ${pos._description || ''}`)
			}
			console.log()
		}

		if (this._commands.length > 0) {
			console.log(pc.bold('Commands:'))
			const commandRows: Array<[string, string, string]> = []

			for (const cmd of this._commands) {
				const example = Array.isArray(cmd.example)
					? cmd.example[0]
					: cmd.example
				commandRows.push([cmd.name, example || '', cmd.description || ''])
			}

			const nameWidth = Math.max(...commandRows.map((r) => r[0].length))
			const exampleWidth = Math.max(...commandRows.map((r) => r[1].length))

			for (const [name, example, description] of commandRows) {
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

		if (Object.keys(this._options).length > 0) {
			console.log(pc.bold('Flags:'))
			this.showOptionsHelp(this._options)
			console.log()
		}

		if (this._examples.length > 0) {
			console.log(pc.bold('Examples:'))
			for (const example of this._examples) {
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
	}

	private showCommandHelp(command: Command) {
		console.log()

		const usage =
			command.usage ||
			`${this._name || 'cli'} ${command.name} ${pc.cyan('[...flags]')}${command.positionals ? ` ${command.positionals.map((p) => pc.dim(`<${p._name}>`)).join(' ')}` : ''}`
		console.log(`${pc.bold('Usage:')} ${usage}`)
		console.log()

		if (command.description) {
			console.log(`  ${command.description}`)
			console.log()
		}

		if (command.positionals && command.positionals.length > 0) {
			console.log(pc.bold('Arguments:'))
			for (const pos of command.positionals) {
				console.log(`  ${pc.cyan(`<${pos._name}>`)}  ${pos._description || ''}`)
			}
			console.log()
		}

		if (Object.keys(command.options).length > 0) {
			console.log(pc.bold('Flags:'))
			this.showOptionsHelp(command.options)
			console.log()
		}

		const examples = Array.isArray(command.example)
			? command.example
			: command.example
				? [command.example]
				: []
		if (examples.length > 0) {
			console.log(pc.bold('Examples:'))
			for (const example of examples) {
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
	}

	private showOptionsHelp(options: Record<string, Schema>) {
		const optionRows: Array<{ flags: string; type: string; desc: string }> = []

		for (const [key, schema] of Object.entries(options)) {
			const flags = schema._alias
				? `-${schema._alias}, --${key}`
				: `    --${key}`
			const type = this.getOptionTypeString(key, schema)
			const desc = this.getOptionDescription(schema)
			optionRows.push({ flags, type, desc })
		}

		const flagsWidth = Math.max(...optionRows.map((r) => r.flags.length))
		const typeWidth = Math.max(...optionRows.map((r) => r.type.length))

		for (const { flags, type, desc } of optionRows) {
			console.log(
				`  ${pc.cyan(flags.padEnd(flagsWidth))}${type.padEnd(typeWidth)}  ${desc}`,
			)
		}

		console.log(
			`  ${pc.cyan('-h, --help'.padEnd(flagsWidth))}${pc.dim('').padEnd(typeWidth)}  ${pc.dim('Display this menu and exit')}`,
		)
	}

	private getOptionTypeString(_: string, schema: Schema): string {
		if (schema._type === 'boolean') {
			return pc.dim('')
		}

		let valueType = 'val'

		if (schema._type === 'string' && (schema as StringSchema)._choices) {
			const choices = (schema as StringSchema)._choices
			if (choices && choices.length <= 3) {
				valueType = choices.join('|')
			}
		} else if (schema._type === 'number') {
			valueType = 'n'
		} else if (schema._type === 'array') {
			valueType = 'val,...'
		}

		return ` ${pc.dim(`<${valueType}>`)}  `
	}

	private getOptionDescription(schema: Schema): string {
		const parts: string[] = []

		if (schema._description) {
			parts.push(schema._description)
		}

		const constraints = this.getConstraintsString(schema)
		if (constraints) {
			parts.push(pc.dim(constraints))
		}

		return parts.join(' ')
	}

	private getConstraintsString(schema: Schema): string {
		const constraints: string[] = []

		if (schema._defaultValue !== undefined) {
			if (schema._type === 'boolean') {
				constraints.push(`default: ${schema._defaultValue}`)
			} else {
				constraints.push(`default: ${JSON.stringify(schema._defaultValue)}`)
			}
		}

		if (schema._type === 'string') {
			const strSchema = schema as StringSchema
			if (strSchema._minLength !== undefined) {
				constraints.push(`min: ${strSchema._minLength}`)
			}
			if (strSchema._maxLength !== undefined) {
				constraints.push(`max: ${strSchema._maxLength}`)
			}
			if (strSchema._regex) {
				constraints.push(
					strSchema._regex.message || `pattern: ${strSchema._regex.pattern}`,
				)
			}
		}

		if (schema._type === 'number') {
			const numSchema = schema as NumberSchema
			if (numSchema._min !== undefined) {
				constraints.push(`min: ${numSchema._min}`)
			}
			if (numSchema._max !== undefined) {
				constraints.push(`max: ${numSchema._max}`)
			}
			if (numSchema._isInt) {
				constraints.push('integer')
			}
			if (numSchema._isPositive) {
				constraints.push('positive')
			}
			if (numSchema._isNegative) {
				constraints.push('negative')
			}
		}

		if (schema._type === 'array') {
			const arrSchema = schema as ArraySchema<any>
			if (arrSchema._minLength !== undefined) {
				constraints.push(`min: ${arrSchema._minLength}`)
			}
			if (arrSchema._maxLength !== undefined) {
				constraints.push(`max: ${arrSchema._maxLength}`)
			}
		}

		return constraints.length > 0 ? `(${joinWithAnd(constraints)})` : ''
	}

	private showError(error: unknown) {
		console.error()
		console.error(
			pc.red(pc.bold('Error:')),
			error instanceof Error ? error.message : String(error),
		)
		console.error()
		console.error('Run with --help for usage information')
	}
}

export function cli(): CLI<Record<string, never>, readonly []> {
	return new CLIImpl<Record<string, never>, readonly []>()
}
