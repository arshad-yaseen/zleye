# Zlye ✨

*A delightfully simple, type-safe CLI parser for Node.js*

Building command-line tools should be enjoyable. Zlye brings the elegance of Zod's schema validation to CLI parsing, making your applications both powerful and maintainable.

## Why Developers Love Zlye

🎨 **Beautiful Help Messages** - Automatically generated, colorized, and intuitive  
💫 **Zero Learning Curve** - If you know Zod, you already know Zlye  
🔧 **Full TypeScript Support** - Complete type safety from input to output  
✨ **Effortless Validation** - Rich error messages that guide your users  

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

Zlye is built for full type safety:

```typescript
const program = cli()
  .option('count', z.number().min(1))
  .option('name', z.string().optional())
  .positional('source', z.string().describe('Source file path'))
  .positional('copies', z.number().int().positive().describe('Number of copies to create'))
  .positional('tags', z.array(z.string()).describe('List of tags to apply'))

const result = program.parse()
if (result) {
  // TypeScript knows these types!
  result.options.count // number  
  result.options.name  // string | undefined
  result.positionals   // readonly [string, number, string[]]
}
```

## Intelligent Error Messages

Zlye provides detailed error messages for validation failures:

```bash
$ myapp --port 99999
Error: --port must be at most 65535

$ myapp build
Error: Argument "context" is required

$ myapp --invalid-flag
Error: Unknown option: --invalid-flag

$ myapp --numbers 2,-10
Error: Argument "numbers": first value must be positive

$ my-cli --env invalid  
Error: --env must be one of dev, staging, or prod

$ my-cli --envs dev,invalid,prod
Error: --envs: second value must be one of dev, staging, or prod
```

## Core Concepts

### Basic CLI Setup

```typescript
import { cli, z } from 'zlye'

const program = cli()
  .name('myapp')                           // Program name
  .version('2.1.0')                        // Version string
  .description('My awesome CLI tool')      // Description
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

## Schema Types

### String Schema

```typescript
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

## Commands

```typescript
import { cli, z } from 'zlye'

const program = cli()
  .name('my-app')
  .description('A simple CLI application')

program
  .command('greet', {
    name: z.string()
      .describe('Name to greet')
      .default('world'),
    uppercase: z.boolean()
      .describe('Convert greeting to uppercase')
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

program.parse()
```

### Important Notes

- You can have multiple commands in your CLI application
- You can have both global options and commands in the same program
- When a command executes and you have both options and a command defined, the result of `program.parse()` will be `undefined` - the command's options are available through the action callback parameters instead

## Advanced Features

### Custom Validation

```typescript
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

### Transforming Option Values

You can transform option values into different types using the `transform` method:

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
      return JSON.parse(fs.readFileSync(configPath, 'utf8')) as Record<string, any>
    })
  )
```

When you access the value, it will be the parsed object with the correct type:

```typescript
const result = program.parse()
if (result) {
  console.log(result.options.config) // Record<string, any>
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.
