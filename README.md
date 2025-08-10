# Zlye

A beautiful, type-safe CLI parser with Zod-like schema validation for Node.js applications.

## Features

- 🔒 **Type-safe** - Full TypeScript support with complete type inference
- 🎯 **Zod-inspired API** - Familiar schema validation with method chaining
- 🚀 **Zero dependencies** - Lightweight and fast
- 🎨 **Beautiful help text** - Colorized and styled output
- 🔧 **Flexible parsing** - Support for flags, positional args, and subcommands
- ⚡ **Transform & validate** - Built-in validation with custom transformers

## Installation

```bash
npm install zlye
# or
yarn add zlye
# or
pnpm add zlye
```

## Quick Start

```typescript
import { cli, z } from 'zlye'

const options = cli()
  .name('my-app')
  .version('1.0.0')
  .description('A sample CLI application')
  .option('port', z.number().min(1).max(65535).default(3000)
    .describe('Port to listen on')
    .alias('p'))
  .option('host', z.string().default('localhost')
    .describe('Host to bind to'))
  .option('verbose', z.boolean()
    .describe('Enable verbose logging')
    .alias('v'))
  .parse()

console.log(`Server starting on ${options.host}:${options.port}`)
if (options.verbose) {
  console.log('Verbose logging enabled')
}
```

## Schema Types

### String Schema

```typescript
z.string()
  .min(3)                    // Minimum length
  .max(20)                   // Maximum length
  .regex(/^[a-z]+$/)         // Pattern validation
  .choices(['dev', 'prod'])  // Enum choices
  .describe('Environment')   // Help description
  .alias('e')               // Short flag alias
  .example('dev')           // Example value
  .optional()               // Make optional
  .default('dev')           // Default value
```

### Number Schema

```typescript
z.number()
  .min(0)           // Minimum value
  .max(100)         // Maximum value
  .int()            // Integer only
  .positive()       // Must be positive
  .negative()       // Must be negative
  .default(42)      // Default value
```

### Boolean Schema

```typescript
z.boolean()
  .default(false)   // Default value
  .describe('Enable feature')
```

### Array Schema

```typescript
z.array(z.string())
  .min(1)           // Minimum items
  .max(5)           // Maximum items
  .default(['a'])   // Default array
```

Supports comma-separated parsing: `--tags "red,green,blue"`

### Object Schema

```typescript
z.object({
  name: z.string(),
  age: z.number().int().positive(),
  active: z.boolean().default(true)
})
```

### Transform & Custom Validation

```typescript
z.string()
  .transform(s => s.toUpperCase())
  .transform(s => new Date(s))
```

## CLI Configuration

### Basic Setup

```typescript
import { cli, z } from 'zlye'

const app = cli()
  .name('myapp')              // CLI name
  .version('1.0.0')           // Version string
  .description('My app')      // Description
  .usage('myapp [options]')   // Custom usage
  .example([                  // Usage examples
    'myapp --port 3000',
    'myapp --host 0.0.0.0 --verbose'
  ])
```

### Options

```typescript
const app = cli()
  .option('config', z.string()
    .describe('Path to config file')
    .alias('c')
    .example('/path/to/config.json'))
  .option('workers', z.number().int().positive()
    .describe('Number of worker processes')
    .default(4))
```

### Positional Arguments

```typescript
const app = cli()
  .positional('input', z.string().describe('Input file'))
  .positional('output', z.string().optional().describe('Output file'))
  
const result = app.parse()
// Access via parse() return value and ...args in action functions
```

## Commands

Create rich subcommand interfaces:

```typescript
import { cli, z } from 'zlye'

const app = cli()
  .name('git-like')
  .version('1.0.0')

// Add command
app.command('add', {
  all: z.boolean().alias('A').describe('Add all files'),
  force: z.boolean().alias('f').describe('Force add'),
  files: z.array(z.string()).describe('Files to add')
})
  .description('Add files to staging')
  .usage('git-like add [options] <files...>')
  .example([
    'git-like add file.txt',
    'git-like add --all',
    'git-like add -f *.js'
  ])
  .positional('files', z.array(z.string()).min(1))
  .action((options, ...files) => {
    console.log('Adding files:', files)
    console.log('Options:', options)
  })

// Commit command  
app.command('commit', {
  message: z.string().alias('m').describe('Commit message'),
  amend: z.boolean().describe('Amend previous commit')
})
  .description('Record changes to repository')
  .action(async (options) => {
    if (!options.message) {
      throw new Error('Commit message required')
    }
    console.log(`Committing: ${options.message}`)
  })

app.parse()
```

### Command Help

Each command gets its own help:

```bash
$ myapp add --help
Usage: myapp add [options] <files...>

  Add files to staging

Arguments:
  <files>  Files to add

Flags:
  -A, --all     Add all files
  -f, --force   Force add
  -h, --help    Display this menu and exit

Examples:
  myapp add file.txt
  myapp add --all  
  myapp add -f *.js
```

## Advanced Usage

### Custom Parsing Logic

```typescript
const schema = z.object({
  database: z.object({
    host: z.string().default('localhost'),
    port: z.number().default(5432),
    ssl: z.boolean().default(false)
  }),
  redis: z.object({
    url: z.string().default('redis://localhost:6379')
  })
})

const app = cli()
  .option('database', schema.shape.database)
  .option('redis', schema.shape.redis)
```

### Environment-based Defaults

```typescript
const app = cli()
  .option('port', z.number()
    .default(parseInt(process.env.PORT || '3000'))
    .describe('Server port'))
  .option('host', z.string()
    .default(process.env.HOST || 'localhost')
    .describe('Server host'))
```

### File Path Validation

```typescript
import { existsSync } from 'fs'
import { resolve } from 'path'

const app = cli()
  .option('config', z.string()
    .transform(path => resolve(path))
    .transform(path => {
      if (!existsSync(path)) {
        throw new Error(`Config file not found: ${path}`)
      }
      return path
    })
    .describe('Configuration file path'))
```

## Type Inference

Zlye provides complete type safety:

```typescript
const app = cli()
  .option('port', z.number().default(3000))
  .option('host', z.string().optional())
  .option('ssl', z.boolean())

const options = app.parse()
// TypeScript knows:
// options.port: number
// options.host: string | undefined  
// options.ssl: boolean
```

### Command Type Inference

```typescript
import type { InferCommand } from 'zlye'

const deployCommand = app.command('deploy', {
  env: z.string().choices(['dev', 'staging', 'prod']),
  force: z.boolean().optional()
}).action((options) => {
  // options is fully typed!
})

type DeployOptions = InferCommand<typeof deployCommand>
// { env: 'dev' | 'staging' | 'prod', force?: boolean }
```

## Built-in Help System

Zlye automatically generates beautiful help text:

```bash
$ myapp --help

My awesome CLI tool (v1.0.0)

Usage: myapp <command> [...flags] [...args]

Commands:
  add      myapp add file.txt        Add files to staging
  commit                             Record changes to repository  
  push     myapp push origin main    Upload changes to remote

  <command> --help                   Print help text for command.

Flags:
  -c, --config  <val>   Configuration file path
  -v, --verbose         Enable verbose logging
  -h, --help            Display this menu and exit

Examples:
  myapp add --all
  myapp commit -m "Initial commit"
```

## API Reference

### CLI Methods

| Method | Description |
|--------|-------------|
| `.name(string)` | Set CLI name |
| `.version(string)` | Set version |
| `.description(string)` | Set description |
| `.usage(string)` | Set custom usage text |
| `.example(string \| string[])` | Add usage examples |
| `.option(name, schema)` | Add global option |
| `.positional(name, schema?)` | Add positional argument |
| `.command(name, options)` | Create subcommand |
| `.parse(argv?)` | Parse arguments |

### Schema Methods

All schemas support:
- `.describe(string)` - Help description
- `.alias(string)` - Short flag alias  
- `.example(string)` - Example value
- `.optional()` - Make optional
- `.default(value)` - Set default
- `.transform(fn)` - Transform value

### Command Builder Methods

| Method | Description |
|--------|-------------|
| `.description(string)` | Command description |
| `.usage(string)` | Custom usage text |
| `.example(string \| string[])` | Usage examples |
| `.positional(name, schema?)` | Add positional arg |
| `.action(fn)` | Set command handler |

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [Your Name]
