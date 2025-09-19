# Zlye ✨

*A delightfully simple, type-safe CLI parser*

Building command-line tools should be enjoyable. Zlye brings the elegance of Zod's schema validation to CLI parsing, making your applications both powerful and maintainable.

## Why Developers Love Zlye

🎨 **Beautiful Help Messages** - Automatically generated, colorized, and intuitive
💫 **Zero Learning Curve** - If you know Zod, you already know Zlye
🔧 **Full TypeScript Support** - Complete type safety from input to output
✨ **Effortless Validation** - Rich error messages that guide your users
🚀 **Union Types Support** - Handle complex option types with ease
🔄 **Variadic Arguments** - Support for rest parameters and flexible argument handling

## Installation

```bash
npm install zlye
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
  console.log('Options:', result.options) // Fully typed!
  console.log('Arguments:', result.positionals) // Fully typed!
  console.log('Rest args:', result.rest) // Fully typed!
}
```

## Beautiful Help System

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

## Complete Type Safety

Zlye is built for full type safety with comprehensive support for all argument types:

```typescript
const program = cli()
  .option('count', z.number().min(1))
  .option('name', z.string().optional())
  .positional('source', z.string().describe('Source file path'))
  .positional('copies', z.number().int().positive().describe('Number of copies to create'))
  .rest('tags', z.string().describe('Additional tags to apply'))

const result = program.parse()
if (result) {
  // TypeScript knows these types!
  result.options.count // number
  result.options.name  // string | undefined
  result.positionals   // readonly [string, number]
  result.rest          // string[]
}
```

## Intelligent Error Messages

Zlye provides detailed, contextual error messages for validation failures:

```bash
$ myapp --port 99999
Error: --port must be at most 65535

$ myapp build
Error: Argument "context": value is required

$ myapp --invalid-flag
Error: Unknown option: --invalid-flag

$ myapp --numbers 2,-10
Error: --numbers[1] must be positive

$ my-cli --env invalid
Error: --env must be one of dev, staging, or prod

$ my-cli --envs dev,invalid,prod
Error: --envs[1] must be one of dev, staging, or prod

$ myapp --server.port abc
Error: --server.port must be a number, received string

$ myapp unexpected-arg
Error: Unexpected argument: unexpected-arg
```

## Core Concepts

### Basic CLI Setup

```typescript
import { cli, z } from 'zlye'

const program = cli()
  .name('myapp')                           // Program name
  .version('2.1.0')                        // Version string (enables --version/-v)
  .description('My awesome CLI tool')      // Description for help
  .usage('myapp [options] <file>')         // Custom usage string (optional)
  .example([                               // Usage examples
    'myapp --verbose file.txt',
    'myapp build --output dist/'
  ])
```

### Adding Options

Options are the heart of Zlye. They support a wide range of types and validation:

```typescript
const program = cli()
  .option('config', z.string()
    .describe('Path to configuration file')
    .alias('c')                            // Short flag: -c
    .example('./config.json')              // Example value in help
    .default('./config.json')              // Default value
  )
  .option('port', z.number()
    .min(1024)                             // Validation constraints
    .max(65535)
    .describe('Server port')
    .alias('p')
    .default(3000)
  )
  .option('features', z.array(z.string())
    .min(1)                                // At least one feature required
    .describe('List of features to enable')
  )
  .option('verbose', z.boolean()
    .describe('Enable verbose logging')
    .alias('v')
    .default(false)
  )
```

### Positional Arguments

Positional arguments are required arguments that come after options:

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
  .positional('count', z.number()
    .int()
    .positive()
    .describe('Number of times to repeat')
  )
```

### Variadic Arguments (Rest Parameters)

Use `.rest()` to capture remaining arguments into an array:

```typescript
const program = cli()
  .positional('command', z.string().describe('Command to run'))
  .rest('files', z.string().describe('Files to process'))

// Usage: myapp build file1.txt file2.txt file3.txt
// Result: { positionals: ['build'], rest: ['file1.txt', 'file2.txt', 'file3.txt'] }

// With validation on rest items
const program = cli()
  .positional('operation', z.string().choices(['copy', 'move']))
  .rest('paths', z.string()
    .regex(/\.(txt|md)$/, 'Must be a .txt or .md file')
    .describe('File paths to process')
  )
```

**Important Notes about Positional Arguments:**
- Regular positionals must come before variadic (`.rest()`) positionals
- You can only have one variadic positional per CLI
- Variadic positionals capture all remaining arguments after the fixed positionals

## Schema Types

### String Schema

```typescript
// Basic string
z.string()

// String with comprehensive constraints
z.string()
  .min(3, 'Must be at least 3 characters')     // Custom error message
  .max(50, 'Must be at most 50 characters')    // Custom error message
  .regex(/^[a-z]+$/, 'Must be lowercase only') // Pattern matching
  .choices(['red', 'green', 'blue'])           // Predefined choices
  .describe('Color selection')                 // Description for help
  .alias('c')                                  // Short flag alias
  .example('red')                              // Example value
  .default('blue')                             // Default value
  .optional()                                  // Make optional
```

### Number Schema

```typescript
// Basic number
z.number()

// Number with comprehensive constraints
z.number()
  .min(0, 'Must be non-negative')      // Minimum value with custom message
  .max(100, 'Must be at most 100')     // Maximum value with custom message
  .int('Must be an integer')           // Must be integer with custom message
  .positive('Must be positive')        // Must be positive with custom message
  .negative('Must be negative')        // Must be negative with custom message
  .describe('Port number')
  .alias('p')
  .default(3000)

// Combining constraints
z.number()
  .int()
  .min(1024)
  .max(65535)
  .describe('Valid port number')
```

### Boolean Schema

Boolean flags have special behavior - they default to `false` when not provided:

```typescript
// Basic boolean flag
z.boolean()
  .describe('Enable debug mode')
  .alias('d')
  .default(false)

// Boolean with true default (creates --no-flag syntax)
z.boolean()
  .describe('Use cache')
  .default(true)  // Will show as --no-cache in help

// Usage examples:
// --debug          → true
// --debug=true     → true
// --debug=false    → false
// --debug true     → true
// --debug false    → false
// (no flag)        → false (or default value)
```

### Array Schema

Arrays can be provided in multiple ways and support comprehensive validation:

```typescript
// Array of strings
z.array(z.string())
  .min(1, 'At least one item required')    // Minimum items
  .max(5, 'At most 5 items allowed')       // Maximum items
  .describe('List of files')

// Array of numbers with item validation
z.array(z.number().positive())
  .min(2)
  .describe('List of port numbers')

// Array of validated strings
z.array(z.string().regex(/\.txt$/, 'Must be .txt files'))
  .describe('Text files to process')

// Usage examples:
// --files file1.txt,file2.txt,file3.txt    (comma-separated)
// --files file1.txt --files file2.txt      (multiple flags)
// --files "file1.txt,file2.txt"            (quoted comma-separated)
```

### Object Schema

Objects enable complex nested configurations:

```typescript
// Structured object with defined shape
z.object({
  host: z.string().default('localhost'),
  port: z.number().min(1).max(65535).default(3000),
  ssl: z.boolean().default(false),
  timeout: z.number().positive().optional()
})
.describe('Server configuration')

// Usage:
// --server.host=example.com --server.port=8080 --server.ssl=true

// Object with any string keys (dictionary-style)
z.object(z.string())
  .describe('Environment variables')

// Usage:
// --env.NODE_ENV=production --env.PORT=3000 --env.DEBUG=true

// Object with any keys but validated values
z.object(z.number())
  .describe('Numeric configuration')

// Usage:
// --config.timeout=5000 --config.retries=3
```

### Union Schema

Union types allow options that accept multiple different types:

```typescript
// Simple union
z.union(
  z.string(),
  z.number()
)
.describe('Port (number) or named pipe (string)')

// Complex union with objects
z.union(
  z.object({
    type: z.string().choices(['file']),
    path: z.string()
  }),
  z.object({
    type: z.string().choices(['url']),
    url: z.string().regex(/^https?:\/\//)
  }),
  z.boolean()
)
.describe('Source configuration')

// Usage examples:
// --source.type=file --source.path=./data.json
// --source.type=url --source.url=https://api.example.com/data
// --source=true  (boolean variant)
```

**Union Type Help Display:**
Zlye intelligently displays union types in help messages, showing each variant clearly:

```bash
Flags:
  --source.type   <file>    Source configuration -
  --source.path   <val>
      or
  --source.type   <url>
  --source.url    <val>
      or
  --source
```

### Schema Transformations

Transform values during parsing for advanced processing:

```typescript
// Transform string to uppercase
z.string()
  .transform(s => s.toUpperCase())
  .describe('Name (will be uppercased)')

// Parse JSON string to object
z.string()
  .regex(/^\{.*\}$/, 'Must be valid JSON')
  .transform(s => JSON.parse(s))
  .describe('JSON configuration')

// Convert and validate file path
z.string()
  .transform(path => {
    if (!require('fs').existsSync(path)) {
      throw new Error(`File not found: ${path}`)
    }
    return require('path').resolve(path)
  })
  .describe('File path (will be resolved to absolute path)')

// Parse comma-separated numbers
z.string()
  .transform(s => s.split(',').map(n => {
    const num = Number(n.trim())
    if (isNaN(num)) throw new Error(`Invalid number: ${n}`)
    return num
  }))
  .describe('Comma-separated numbers')
```

## Commands

Commands allow you to create subcommands with their own options and arguments:

```typescript
import { cli, z } from 'zlye'

const program = cli()
  .name('my-app')
  .description('A versatile CLI application')
  .version('1.0.0')

// Simple command
program
  .command('greet', {
    name: z.string()
      .describe('Name to greet')
      .default('world'),
    uppercase: z.boolean()
      .describe('Convert greeting to uppercase')
      .alias('u')
  })
  .description('Greet someone')
  .example([
    'my-app greet',
    'my-app greet --name Alice',
    'my-app greet --name Bob --uppercase'
  ])
  .action(({ options }) => {
    let greeting = `Hello, ${options.name}!`

    if (options.uppercase) {
      greeting = greeting.toUpperCase()
    }

    console.log(greeting)
  })

// Command with positional arguments
program
  .command('copy', {
    force: z.boolean().describe('Overwrite existing files').alias('f'),
    backup: z.boolean().describe('Create backup of existing files')
  })
  .description('Copy files')
  .positional('source', z.string().describe('Source file'))
  .positional('destination', z.string().describe('Destination file'))
  .example([
    'my-app copy file1.txt file2.txt',
    'my-app copy --force file1.txt file2.txt'
  ])
  .action(({ options, positionals }) => {
    const [source, destination] = positionals
    console.log(`Copying ${source} to ${destination}`)
    if (options.force) console.log('Force mode enabled')
    if (options.backup) console.log('Backup mode enabled')
  })

// Command with variadic arguments
program
  .command('process', {
    parallel: z.number().int().positive().default(1).describe('Number of parallel workers')
  })
  .description('Process multiple files')
  .positional('operation', z.string().choices(['compress', 'extract']).describe('Operation to perform'))
  .rest('files', z.string().describe('Files to process'))
  .action(({ options, positionals, rest }) => {
    const [operation] = positionals
    console.log(`${operation} operation on ${rest.length} files`)
    console.log(`Using ${options.parallel} parallel workers`)
    rest.forEach(file => console.log(`  - ${file}`))
  })

program.parse()
```

### Command Structure and Behavior

**Important Command Notes:**

1. **Return Value**: When a command executes successfully, `program.parse()` returns `undefined`. The command's parsed options and arguments are passed to the action callback instead.

2. **Error Handling**: Commands automatically handle errors and display them with proper formatting. Async action functions are supported:

```typescript
program
  .command('deploy', { env: z.string().choices(['dev', 'prod']) })
  .action(async ({ options }) => {
    try {
      await deployToEnvironment(options.env)
      console.log('Deployment successful!')
    } catch (error) {
      throw new Error(`Deployment failed: ${error.message}`)
    }
  })
```

3. **Help Integration**: Each command gets its own help screen accessible via `<command> --help`:

```bash
$ my-app copy --help

Usage: my-app copy [...flags] <source> <destination>

  Copy files

Arguments:
  <source>       Source file
  <destination>  Destination file

Flags:
  -f, --force    Overwrite existing files (default: false)
      --backup   Create backup of existing files (default: false)
  -h, --help     Display this menu and exit

Examples:
  my-app copy file1.txt file2.txt
  my-app copy --force file1.txt file2.txt
```

4. **Mixed CLI**: You can have both global options and commands in the same CLI:

```typescript
const program = cli()
  .name('my-app')
  .option('verbose', z.boolean().describe('Enable verbose output'))
  .option('config', z.string().describe('Config file path'))

program.command('build', { /* ... */ }).action(/* ... */)
program.command('test', { /* ... */ }).action(/* ... */)

// Global options are available to all commands
// Commands take precedence over global parsing
```

## Advanced Features

### Custom Validation with Detailed Error Messages

Create sophisticated validation with helpful error messages:

```typescript
// Email validation
z.string()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Must be a valid email address')
  .describe('Email address')

// URL validation with protocol requirement
z.string()
  .regex(/^https?:\/\/.+/, 'Must be a valid HTTP/HTTPS URL')
  .describe('Website URL')

// File path validation with existence check
z.string()
  .transform(path => {
    const fs = require('fs')
    const resolvedPath = require('path').resolve(path)

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found: ${path}`)
    }

    const stats = fs.statSync(resolvedPath)
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${path}`)
    }

    return resolvedPath
  })
  .describe('Path to existing file')

// Complex business logic validation
z.string()
  .transform(version => {
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/

    if (!semverRegex.test(version)) {
      throw new Error('Must be a valid semantic version (e.g., 1.2.3, 1.0.0-alpha.1)')
    }

    const [, major, minor, patch] = version.match(semverRegex)!
    return {
      major: parseInt(major),
      minor: parseInt(minor),
      patch: parseInt(patch),
      raw: version
    }
  })
  .describe('Semantic version number')
```

### Advanced Object Configurations

Handle complex nested configurations:

```typescript
// Database configuration with validation
const program = cli()
  .option('database', z.object({
    host: z.string().default('localhost'),
    port: z.number().min(1).max(65535).default(5432),
    name: z.string().min(1, 'Database name required'),
    ssl: z.boolean().default(false),
    pool: z.object({
      min: z.number().int().min(0).default(2),
      max: z.number().int().min(1).default(10)
    }).optional()
  }).describe('Database connection settings'))

// Usage:
// --database.host=db.example.com
// --database.port=5432
// --database.name=myapp
// --database.ssl=true
// --database.pool.min=5
// --database.pool.max=20

// Environment variables (any key, string values)
const program = cli()
  .option('env', z.object(z.string())
    .describe('Environment variables'))

// Usage:
// --env.NODE_ENV=production
// --env.PORT=3000
// --env.DEBUG=false
```

### Complex Union Types for Flexible APIs

Handle multiple input formats elegantly:

```typescript
// API endpoint that accepts different authentication methods
const program = cli()
  .option('auth', z.union(
    z.object({
      type: z.string().choices(['token']),
      token: z.string().min(1, 'Token cannot be empty')
    }),
    z.object({
      type: z.string().choices(['basic']),
      username: z.string().min(1),
      password: z.string().min(1)
    }),
    z.object({
      type: z.string().choices(['oauth']),
      clientId: z.string(),
      clientSecret: z.string(),
      scope: z.array(z.string()).optional()
    })
  ).describe('Authentication configuration'))

// Usage examples:
// --auth.type=token --auth.token=abc123
// --auth.type=basic --auth.username=user --auth.password=pass
// --auth.type=oauth --auth.clientId=id --auth.clientSecret=secret --auth.scope=read,write

// Flexible input source
const program = cli()
  .option('input', z.union(
    z.string().regex(/^https?:\/\//, 'HTTP URL'),
    z.string().regex(/^file:\/\//, 'File URL'),
    z.string().transform(path => {
      if (require('fs').existsSync(path)) return path
      throw new Error(`File not found: ${path}`)
    })
  ).describe('Input source (URL or file path)'))
```

### Advanced Array Processing

Handle complex array inputs with validation:

```typescript
// Array of validated email addresses
const program = cli()
  .option('recipients', z.array(
    z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address')
  )
  .min(1, 'At least one recipient required')
  .max(10, 'Maximum 10 recipients allowed')
  .describe('Email recipients'))

// Array of port ranges
const program = cli()
  .option('ports', z.array(
    z.union(
      z.number().int().min(1).max(65535),
      z.string().regex(/^\d+-\d+$/).transform(range => {
        const [start, end] = range.split('-').map(Number)
        if (start >= end) throw new Error('Invalid range: start must be less than end')
        if (start < 1 || end > 65535) throw new Error('Port numbers must be between 1 and 65535')
        return { start, end, type: 'range' as const }
      })
    )
  ).describe('Port numbers or ranges (e.g., 8080 or 8000-8010)'))

// Usage:
// --ports 8080,9000,3000-3010
```

### Transforming Option Values

Transform and enrich option values during parsing:

```typescript
import fs from 'fs'
import path from 'path'

// Configuration file loading and parsing
const program = cli()
  .option('config', z.string()
    .describe('Configuration file path')
    .default('./config.json')
    .transform(configPath => {
      const resolvedPath = path.resolve(configPath)

      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Config file not found: ${configPath}`)
      }

      try {
        const content = fs.readFileSync(resolvedPath, 'utf8')
        const parsed = JSON.parse(content)

        // Validate the config structure
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error('Config must be a JSON object')
        }

        return {
          path: resolvedPath,
          data: parsed,
          lastModified: fs.statSync(resolvedPath).mtime
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`Invalid JSON in config file: ${error.message}`)
        }
        throw error
      }
    })
  )

// When you access the value, it's the transformed object
const result = program.parse()
if (result) {
  console.log('Config path:', result.options.config.path)
  console.log('Config data:', result.options.config.data)
  console.log('Last modified:', result.options.config.lastModified)
}
```

### Error Handling and User Experience

Zlye provides detailed error messages that help users understand what went wrong:

```typescript
// The error messages are contextual and specific:

// For arrays with item validation:
// --numbers 1,abc,3
// → Error: --numbers[1] must be a number, received string

// For nested objects:
// --server.port abc
// → Error: --server.port must be a number, received string

// For missing required fields:
// --auth.type=token (missing --auth.token)
// → Error: --auth.token is required

// For union types with specific matching:
// --input invalidurl
// → Error: --input must be one of: HTTP URL, File URL, file path

// For constraint violations:
// --port 99999
// → Error: --port must be at most 65535

// For unknown options:
// --unknown-flag
// → Error: Unknown option: --unknown-flag
```

### Version and Help Handling

Zlye automatically handles version and help flags:

```typescript
const program = cli()
  .name('my-app')
  .version('1.2.3')  // Enables --version and -v flags
  .description('My application')

// Built-in help flags: --help, -h
// Built-in version flags: --version, -v (when version is set)

// Help is context-aware:
// my-app --help          → Shows main help
// my-app command --help  → Shows command-specific help
```

### Raw Arguments and Double Dash Support

Handle raw arguments that should bypass parsing:

```typescript
const program = cli()
  .option('verbose', z.boolean())
  .rest('files', z.string())

// Everything after -- is treated as raw arguments:
// my-app --verbose -- --this-looks-like-a-flag file.txt
// Result: { options: { verbose: true }, rest: ['--this-looks-like-a-flag', 'file.txt'] }
```

### Best Practices

- **Use Descriptive Error Messages**: Always provide clear, actionable error messages in your custom validations.

- **Leverage Defaults**: Set sensible defaults to improve user experience.

- **Group Related Options**: Use objects to group related configuration options.

- **Provide Examples**: Use `.example()` to show users how to use your CLI.

- **Use Aliases Sparingly**: Only add aliases for frequently used options to avoid clutter.

- **Validate Early**: Use schema validation instead of checking values in your application logic.

- **Handle Async Operations**: Use async action functions for commands that perform I/O operations.

```typescript
// Good: Comprehensive CLI with clear structure
const program = cli()
  .name('deploy-tool')
  .version('1.0.0')
  .description('Deploy applications to various environments')
  .option('config', z.string()
    .describe('Configuration file path')
    .alias('c')
    .default('./deploy.config.json')
    .example('./custom-config.json')
  )
  .option('dry-run', z.boolean()
    .describe('Show what would be deployed without actually deploying')
    .alias('n')
    .default(false)
  )

program
  .command('deploy', {
    environment: z.string()
      .choices(['dev', 'staging', 'prod'])
      .describe('Target environment'),
    force: z.boolean()
      .describe('Force deployment even if validation fails')
      .default(false)
  })
  .description('Deploy to specified environment')
  .positional('app', z.string().describe('Application name'))
  .example([
    'deploy-tool deploy --environment=prod my-app',
    'deploy-tool deploy --environment=staging --force my-app'
  ])
  .action(async ({ options, positionals }) => {
    const [app] = positionals
    console.log(`Deploying ${app} to ${options.environment}`)

    if (options.force) {
      console.log('⚠️  Force mode enabled - skipping safety checks')
    }

    // Perform deployment...
  })

program.parse()
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

*Built with ❤️ for developers who appreciate type safety and great UX*
