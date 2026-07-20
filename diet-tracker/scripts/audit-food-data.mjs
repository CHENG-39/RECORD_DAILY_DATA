import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const foodFile = resolve('src/data/foods.ts')
const source = readFileSync(foodFile, 'utf8')
const ids = [...source.matchAll(/^\s*id:\s*'([^']+)'/gm)].map(match => match[1])
const categories = [...source.matchAll(/^\s*category:\s*'([^']+)'/gm)].map(match => match[1])
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)
const categoryCounts = new Map()

for (const category of categories) {
  categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
}

const fdcReferences = (source.match(/USDA FDC|FDC \d+/g) ?? []).length
const explicitSources = (source.match(/^\s*dataSource:/gm) ?? []).length

console.log(`Food definitions: ${ids.length}`)
console.log(`USDA FDC references: ${fdcReferences}`)
console.log(`Explicit provenance fields: ${explicitSources}`)
console.log('Categories:')
for (const [category, count] of categoryCounts) {
  console.log(`  ${category}: ${count}`)
}

if (duplicateIds.length > 0) {
  console.error(`Duplicate food IDs: ${[...new Set(duplicateIds)].join(', ')}`)
  process.exit(1)
}
