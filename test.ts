import fs from 'node:fs'
import { cli, z } from './src'

const program = cli().option('offset', z.number().negative())

console.time('time')
const result = program.parse()
console.log(result)
console.timeEnd('time')
