import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'

const root = resolve('D:/workspace/harness/deepseek/cordis-guide')
const files = readdirSync(root).filter(f => f.endsWith('.md'))

const slug = (text) => text
  .toLowerCase()
  .replace(/`/g, '')
  .replace(/[^\p{L}\p{N}\s-]/gu, '')
  .trim()
  .replace(/\s+/g, '-')

const norm = (value) => value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '')

const headings = new Map()
for (const file of files) {
  const text = readFileSync(join(root, file), 'utf8')
  const list = []
  for (const line of text.split('\n')) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line)
    if (m) list.push({ slug: slug(m[2]), norm: norm(m[2]) })
  }
  headings.set(file, list)
}

let changed = 0
const unresolved = []

for (const file of files) {
  const path = join(root, file)
  let text = readFileSync(path, 'utf8')
  text = text.replace(/\[[^\]]*\]\([^)\s]+\)/g, (match) => {
    const inner = match.slice(match.indexOf('(') + 1, -1)
    if (/^https?:/.test(inner) || !inner.includes('#')) return match
    const [pathPart, anchor] = inner.split('#')
    const targetFile = pathPart ? basename(pathPart) : file
    const list = headings.get(targetFile)
    if (!list) { unresolved.push(`${file} → ${inner}（目标文件不在本书内）`); return match }
    if (list.some(h => h.slug === anchor)) return match
    const want = norm(anchor)
    const hits = list.filter(h => h.norm === want)
    if (hits.length === 1) {
      changed++
      const fixedPath = pathPart ? `${pathPart}#${hits[0].slug}` : `#${hits[0].slug}`
      return match.replace(inner, fixedPath)
    }
    unresolved.push(`${file} → ${inner}（匹配 ${hits.length} 个标题）`)
    return match
  })
  writeFileSync(path, text)
}

console.log(`rewrote ${changed} anchors`)
if (unresolved.length) console.log('UNRESOLVED:\n' + unresolved.join('\n'))
