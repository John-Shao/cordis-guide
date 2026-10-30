import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = 'D:/workspace/harness/deepseek/cordis-guide'
const targets = [...readdirSync(root).filter(f => f.endsWith('.md')).map(f => join(root, f)), join(root, 'diagrams/figures.html')]

// ordered: more specific first
const rules = [
  ['entry.ts:73-82, 84-92', 'entry.ts:76-85, 91-95'],
  ['entry.ts:84-92, 130-197', 'entry.ts:91-95, 130-197'],
  ['entry.ts:84-92', 'entry.ts:91-95'],
  ['entry.ts:73-82', 'entry.ts:76-85'],
  ['entry.ts:8-24', 'entry.ts:10-23'],
  ['vendor/include/src/index.ts:12-25', 'vendor/include/src/index.ts:9-15'],
  ['vendor/include/src/index.ts:52-133', 'vendor/include/src/index.ts:57-127'],
  ['cordis/packages/include/src/index.ts:20-33', 'cordis/packages/include/src/index.ts:20-29, 33'],
  ['config/isolate.ts:5-137', 'config/isolate.ts:5-14, 49-153'],
  ['isolate.ts:49-137', 'isolate.ts:49-153'],
  ['registry.ts:290-301', 'registry.ts:300-302'],
  ['`registry.ts:290`', '`registry.ts:300-302`'],
  ['registry.ts:331', 'registry.ts:330'],
  ['fiber.ts:745-783', 'fiber.ts:731, 745, 764'],
  ['reflect.ts:143, 165', 'reflect.ts:144, 163'],
  ['`reflect.ts:163`', '`reflect.ts:160-161`'],
  ['reflect.ts:136-172', 'reflect.ts:136-171'],
  ['reflect.ts:174-200', 'reflect.ts:173-197'],
  ['logger.ts:213-219', 'logger.ts:213-221'],
  ['schema.ts:402', 'schema.ts:194'],
  ['events.ts:105` 附近', 'events.ts:106`'],
  ['vendor/logger-console/src/shared.ts:53-57', 'vendor/logger-console/src/shared.ts:54-58'],
]

const tally = {}
for (const file of targets) {
  let text = readFileSync(file, 'utf8')
  let changed = false
  for (const [from, to] of rules) {
    if (!text.includes(from)) continue
    const n = text.split(from).length - 1
    text = text.split(from).join(to)
    tally[from] = (tally[from] ?? 0) + n
    changed = true
  }
  if (changed) writeFileSync(file, text)
}

for (const [from, n] of Object.entries(tally)) console.log(`${String(n).padStart(3)} × ${from}`)
console.log('rules with no match:', rules.map(([f]) => f).filter(f => !tally[f]).join(' | '))
