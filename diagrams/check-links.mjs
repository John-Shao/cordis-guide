import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'

const root = resolve('D:/workspace/harness/deepseek/cordis-guide')
const files = readdirSync(root).filter(f => f.endsWith('.md'))

const slug = (text) => text
  .toLowerCase()
  .replace(/`/g, '')
  .replace(/[^\p{L}\p{N}\s-]/gu, '')
  .trim()
  .replace(/\s+/g, '-')

const headings = new Map()
for (const file of files) {
  const text = readFileSync(join(root, file), 'utf8')
  const set = new Set()
  for (const line of text.split('\n')) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line)
    if (m) set.add(slug(m[2]))
  }
  headings.set(file, set)
}

const problems = []
for (const file of files) {
  const text = readFileSync(join(root, file), 'utf8')
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    // markdown links with targets
    for (const m of line.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = m[1]
      if (/^https?:/.test(target)) continue
      const [pathPart, anchor] = target.split('#')
      if (pathPart) {
        const abs = resolve(root, pathPart)
        if (!existsSync(abs)) problems.push(`${file}:${i + 1} 缺文件 ${target}`)
      }
      if (anchor) {
        const targetFile = pathPart ? resolve(root, pathPart).replace(root + '\\', '').replace(root + '/', '') : file
        const key = files.includes(targetFile) ? targetFile : null
        if (!key) {
          problems.push(`${file}:${i + 1} 锚点目标未知 ${target}`)
        } else if (!headings.get(key).has(anchor)) {
          problems.push(`${file}:${i + 1} 锚点不存在 ${target}   （${key} 可选：${[...headings.get(key)].filter(h => h.startsWith(anchor.slice(0, 3))).slice(0, 4).join(' | ')}）`)
        }
      }
      if (!pathPart && !anchor) problems.push(`${file}:${i + 1} 空链接`)
    }
    // image refs
    for (const m of line.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const abs = resolve(root, m[1])
      if (!existsSync(abs)) problems.push(`${file}:${i + 1} 缺图片 ${m[1]}`)
    }
  })
}

// every rendered png referenced at least once?
const images = readdirSync(join(root, 'images'))
const allText = files.map(f => readFileSync(join(root, f), 'utf8')).join('\n')
const unused = images.filter(img => !allText.includes(`images/${img}`))

console.log('--- problems ---')
console.log(problems.length ? problems.join('\n') : '(none)')
console.log('--- unused images ---')
console.log(unused.length ? unused.join('\n') : '(none)')
console.log('--- files ---', files.join(', '))
