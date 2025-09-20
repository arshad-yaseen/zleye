import fs from 'node:fs'
import { cli, z } from './src'

const program = cli().option('minify', z.boolean().default(true))

console.time('time')
const result = program.parse()
console.log(result)
console.timeEnd('time')
