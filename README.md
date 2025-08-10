# Zlye

A powerful, type-safe CLI parser for Node.js applications with a Zod-like schema-based approach. Build beautiful command-line interfaces with full TypeScript support, automatic help generation, and comprehensive validation.

## Features

- 🔧 **Type-safe schema validation** - Define your CLI options with strong typing
- 🎨 **Automatic help generation** - Beautiful, colorized help messages
- 🌳 **Nested commands** - Support for subcommands with their own options
- 🔄 **Schema transformations** - Transform and validate input data
- 📝 **Rich option types** - String, number, boolean, array, and object support
- 🚀 **Zero dependencies** - Lightweight and fast
- 💫 **Intuitive API** - Familiar Zod-like syntax

## Installation

```bash
npm install zlye
# or
bun install zlye
# or
pnpm add zlye
```

## Quick Start

```typescript
import { cli, z } from 'zlye'

const program = cli()
  .name('my-app')
  .version('1.0.0')
  .description('A simple CLI application')
  .option('verbose', z.boolean().describe('Enable verbose output'))
  .option('output', z.string().describe('Output file path'))

const result = program.parse()
if (result) {
  console.log('Options:', result.options)
  console.log('Arguments:', result.positionals)
}
```

## Schema Types

### String Schema

```typescript
import { z } from 'zlye'

// Basic string
z.string()

// String with constraints
z.string()
  .min(3)                                    // Minimum length
  .max(50)                                   // Maximum length  
  .regex(/^[a-z]+$/, 'Must be lowercase')    // Pattern matching
  .choices(['red', 'green', 'blue'])         // Predefined choices
  .describe('Color selection')               // Description for help
  .alias('c')                                // Short flag alias
  .example('red')                            // Example value
  .default('blue')                           // Default value
  .optional()                                // Make optional
```

### Number Schema

```typescript
// Basic number
z.number()

// Number with constraints
z.number()
  .min(0)                    // Minimum value
  .max(100)                  // Maximum value
  .int()                     // Must be integer
  .positive()                // Must be positive
  .negative()                // Must be negative
  .describe('Port number')
  .default(3000)
```

### Boolean Schema

```typescript
// Boolean flags
z.boolean()
  .describe('Enable debug mode')
  .alias('d')
  .default(false)
```

### Array Schema

```typescript
// Array of strings
z.array(z.string())
  .min(1)                    // Minimum items
  .max(5)                    // Maximum items
  .describe('List of files')

// Array of numbers
z.array(z.number().positive())
  .describe('List of port numbers')

// Arrays can be provided as comma-separated values:
// --files file1.txt,file2.txt,file3.txt
// Or as multiple flags:
// --files file1.txt --files file2.txt
```

### Object Schema

```typescript
// Nested object configuration
z.object({
  host: z.string().default('localhost'),
  port: z.number().min(1).max(65535).default(3000),
  ssl: z.boolean().default(false)
})
.describe('Server configuration')

// Usage: --server.host=example.com --server.port=8080 --server.ssl
```

### Schema Transformations

```typescript
// Transform string to uppercase
z.string().transform(s => s.toUpperCase())

// Parse JSON string to object
z.string().transform(s => JSON.parse(s))

// Convert string to number
z.string().regex(/^\d+$/).transform(s => parseInt(s))
```

## CLI Configuration

### Basic Setup

```typescript
import { cli, z } from 'zlye'

const program = cli()
  .name('myapp')                           // Program name
  .version('2.1.0')                        // Version string
  .description('My awesome CLI tool')      // Description
  .usage('myapp [command] [options]')      // Custom usage string
  .example([                               // Usage examples
    'myapp --verbose',
    'myapp build --output dist/'
  ])
```

### Adding Options

```typescript
const program = cli()
  .option('config', z.string()
    .describe('Path to configuration file')
    .alias('c')
    .example('./config.json')
  )
  .option('port', z.number()
    .min(1024)
    .max(65535)
    .describe('Server port')
    .default(3000)
  )
  .option('features', z.array(z.string())
    .describe('List of features to enable')
  )
```

### Positional Arguments

```typescript
// Simple positional arguments
const program = cli()
  .positional('input', z.string().describe('Input file'))
  .positional('output', z.string().describe('Output file').optional())

// Advanced positional with validation
const program = cli()
  .positional('command', z.string()
    .choices(['start', 'stop', 'restart'])
    .describe('Action to perform')
  )
```

## Commands and Subcommands

### Defining Commands

```typescript
import { cli, z } from 'zlye'

const program = cli()
  .name('docker-cli')
  .description('Container management tool')

// Build command
program
  .command('build', {
    file: z.string()
      .describe('Dockerfile path')
      .alias('f')
      .default('./Dockerfile'),
    tag: z.string()
      .describe('Image tag')
      .alias('t'),
    'no-cache': z.boolean()
      .describe('Do not use cache')
  })
  .description('Build a Docker image')
  .usage('docker-cli build [options] <context>')
  .example([
    'docker-cli build .',
    'docker-cli build --tag myapp:latest .',
    'docker-cli build --file ./custom.Dockerfile --no-cache .'
  ])
  .positional('context', z.string().describe('Build context directory'))
  .action(async ({ options, positionals }) => {
    console.log('Building image...')
    console.log('Options:', options)      // Fully typed!
    console.log('Context:', positionals[0])
    
    // Your build logic here
    await buildImage(options.file, options.tag, positionals[0])
  })

// Run command
program
  .command('run', {
    detach: z.boolean().describe('Run in background').alias('d'),
    port: z.array(z.string()).describe('Port mapping').alias('p'),
    volume: z.array(z.string()).describe('Volume mapping').alias('v'),
    env: z.array(z.string()).describe('Environment variables').alias('e')
  })
  .description('Run a container')
  .positional('image', z.string().describe('Docker image'))
  .positional('command', z.string().describe('Command to run').optional())
  .action(({ options, positionals }) => {
    console.log('Starting container...')
    // Your run logic here
  })

program.parse()
```

### Complex Example: Git-like CLI

```typescript
import { cli, z } from 'zlye'

const git = cli()
  .name('git')
  .version('2.0.0')
  .description('Distributed version control system')

// git add
git.command('add', {
  all: z.boolean().alias('A').describe('Add all files'),
  force: z.boolean().alias('f').describe('Force add ignored files'),
  verbose: z.boolean().alias('v').describe('Be verbose')
})
.description('Add file contents to the index')
.positional('files', z.string().describe('Files to add').optional())
.example([
  'git add file.txt',
  'git add --all',
  'git add src/ --verbose'
])
.action(({ options, positionals }) => {
  if (options.all) {
    console.log('Adding all files...')
  } else {
    console.log(`Adding files: ${positionals.join(', ')}`)
  }
})

// git commit
git.command('commit', {
  message: z.string()
    .alias('m')
    .describe('Commit message')
    .min(1, 'Message cannot be empty'),
  amend: z.boolean().describe('Amend previous commit'),
  'sign-off': z.boolean().describe('Add Signed-off-by line')
})
.description('Record changes to the repository')
.example([
  'git commit -m "Initial commit"',
  'git commit --amend -m "Updated commit"'
])
.action(({ options }) => {
  console.log(`Committing with message: ${options.message}`)
})

// git push
git.command('push', {
  force: z.boolean().alias('f').describe('Force push'),
  'set-upstream': z.boolean().alias('u').describe('Set upstream branch'),
  tags: z.boolean().describe('Push tags')
})
.positional('remote', z.string().describe('Remote name').default('origin'))
.positional('branch', z.string().describe('Branch name').optional())
.action(({ options, positionals }) => {
  const [remote, branch] = positionals
  console.log(`Pushing to ${remote}${branch ? `/${branch}` : ''}`)
})

git.parse()
```

## Advanced Usage

### Custom Validation

```typescript
import { z } from 'zlye'

// Email validation
z.string()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Must be a valid email')

// URL validation  
z.string()
  .regex(/^https?:\/\/.+/, 'Must be a valid URL')

// File path validation
z.string()
  .transform(path => {
    if (!fs.existsSync(path)) {
      throw new Error(`File not found: ${path}`)
    }
    return path
  })
```

### Environment Variable Integration

```typescript
const program = cli()
  .option('apiKey', z.string()
    .describe('API key for authentication')
    .default(process.env.API_KEY || '')
    .transform(key => {
      if (!key) throw new Error('API key is required')
      return key
    })
  )
```

### Configuration File Support

```typescript
import fs from 'fs'

const program = cli()
  .option('config', z.string()
    .describe('Configuration file path')
    .default('./config.json')
    .transform(configPath => {
      if (!fs.existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}`)
      }
      return JSON.parse(fs.readFileSync(configPath, 'utf8'))
    })
  )
```

## Help System

Zlye automatically generates beautiful help messages based on your schema definitions:

```bash
$ myapp --help

My awesome CLI tool (v2.1.0)

Usage: myapp [command] [...flags] [...args]

Commands:
  build    docker build .              Build a Docker image
  run      docker run ubuntu:latest    Run a container

  <command> --help                     Print help text for command.

Flags:
  -c, --config    <val>     Path to configuration file (default: "./config.json")  
  -p, --port      <n>       Server port (min: 1024, max: 65535, default: 3000)
      --features  <val,...> List of features to enable
  -h, --help                Display this menu and exit

Examples:
  myapp --verbose
  myapp build --output dist/
```

### Command-specific Help

```bash
$ myapp build --help

Usage: myapp build [...flags] <context>

  Build a Docker image

Arguments:
  <context>  Build context directory

Flags:
  -f, --file      <val>  Dockerfile path (default: "./Dockerfile")
  -t, --tag       <val>  Image tag  
      --no-cache         Do not use cache (default: false)
  -h, --help             Display this menu and exit

Examples:
  myapp build .
  myapp build --tag myapp:latest .
  myapp build --file ./custom.Dockerfile --no-cache .
```

## Error Handling

Zlye provides detailed error messages for validation failures:

```bash
$ myapp --port 99999
Error: --port must be at most 65535

$ myapp build
Error: Argument context: context is required

$ myapp --invalid-flag
Error: Unknown option: --invalid-flag

$ myapp --numbers 2,-10
Error: Argument numbers: numbers[1] must be positive

$ my-cli --env invalid  
Error: --env must be one of dev, staging, or prod
```

## API Reference

### CLI Methods

| Method | Description |
|--------|-------------|
| `name(string)` | Set program name |
| `version(string)` | Set version string |  
| `description(string)` | Set program description |
| `usage(string)` | Set custom usage string |
| `example(string \| string[])` | Add usage examples |
| `option(name, schema)` | Add global option |
| `positional(name, schema?)` | Add positional argument |
| `command(name, options)` | Create subcommand |
| `parse(argv?)` | Parse command line arguments |

### Schema Methods

| Method | Description | Applies To |
|--------|-------------|------------|
| `describe(string)` | Add description | All |
| `alias(string)` | Set short flag alias | All |
| `example(string)` | Add example value | All |
| `optional()` | Make optional | All |
| `default(value)` | Set default value | All |
| `transform(fn)` | Transform parsed value | All |
| `min(number)` | Set minimum constraint | String, Number, Array |
| `max(number)` | Set maximum constraint | String, Number, Array |
| `regex(pattern, message?)` | Pattern validation | String |
| `choices(array)` | Restrict to specific values | String |
| `int()` | Require integer | Number |
| `positive()` | Require positive number | Number |
| `negative()` | Require negative number | Number |

## Best Practices

1. **Use descriptive option names**: Prefer `--output-dir` over `--out`
2. **Provide helpful descriptions**: Users rely on `--help` for guidance  
3. **Set sensible defaults**: Reduce required configuration
4. **Use aliases sparingly**: Only for very common options
5. **Group related options**: Use objects for complex configuration
6. **Validate early**: Use transforms to catch issues immediately
7. **Provide examples**: Show real usage patterns in help text

## TypeScript Support

Zlye is built for full type safety:

```typescript
const program = cli()
  .option('count', z.number().min(1))
  .option('name', z.string().optional())
  .positional('numbers', z.array(z.number().positive()))

const result = program.parse()
if (result) {
  // TypeScript knows these types!
  result.options.count // number  
  result.options.name  // string | undefined
  result.options.numbers // number[]
  result.positionals   // any[]
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.
