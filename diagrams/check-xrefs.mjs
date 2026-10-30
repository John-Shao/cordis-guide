import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = 'D:/workspace/harness/deepseek/cordis-guide'
const files = readdirSync(root).filter(f => f.endsWith('.md'))

// collect section numbers per chapter file (## N.K 标题) and figure captions
const sections = new Map()
const figures = new Map()
for (const file of files) {
  const text = readFileSync(join(root, file), 'utf8')
  const sec = new Set()
  const fig = new Set()
  for (const line of text.split('\n')) {
    const m = /^#{2,3}\s+(\d+(?:\.\d+)?)\s/.exec(line)
    if (m) sec.add(m[1])
    const a = /^#{2,3}\s+([ABC]\.\d+)\s/.exec(line)
    if (a) sec.add(a[1])
    const c = /!\[[^\]]*图\s*(\d+-\d+)/.exec(line)
    if (c) fig.add(c[1])
  }
  sections.set(file, sec)
  figures.set(file, fig)
}

const problems = []

// 1) "第 N 章 M.K" cross references resolve to a real section in chapter N
const chapterOf = {}
for (const file of files) {
  const m = /^(\d{2})-/.exec(file)
  if (m) chapterOf[m[1]] = file
}
for (const file of files) {
  const text = readFileSync(join(root, file), 'utf8')
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/第\s*(\d{1,2})\s*章\s*(\d{1,2}\.\d{1,2})/g)) {
      const [, ch, sec] = m
      const target = chapterOf[ch.padStart(2, '0')]
      if (!target) { problems.push(`${file}:${i + 1} 不存在的章节 ${ch}`); continue }
      if (!sections.get(target).has(sec)) problems.push(`${file}:${i + 1} 引用 ${ch} 章 ${sec} 节，但 ${target} 里没有该节（有：${[...sections.get(target)].join(' ')}）`)
    }
    for (const m of line.matchAll(/(\d{1,2}\.\d)\s*节/g)) {
      const sec = m[1]
      const own = file.match(/^(\d{2})/)
      if (!own) continue
      if (!sections.get(file).has(sec) && !line.includes(`第 ${sec.split('.')[0]} 章`)) {
        problems.push(`${file}:${i + 1} 提到 ${sec} 节，但本章没有该节`)
      }
    }
  })
}

// 2) figure numbering: every 图 N-M referenced in text exists as an image caption
const allFigRefs = new Set()
const allCaptions = new Set()
for (const file of files) {
  const text = readFileSync(join(root, file), 'utf8')
  for (const m of text.matchAll(/!\[([^\]]*)\]\((images\/[a-z-]+\.png)\)/g)) {
    const label = /图\s*(\d+-\d+)/.exec(m[1])
    if (label) { allFigRefs.add(label[1]); allCaptions.add(`${m[2]}=${label[1]}`) }
  }
}
// 3) README index table lists each figure number used
const readme = readFileSync(join(root, 'README.md'), 'utf8')
for (const ref of [...allFigRefs].sort()) {
  if (!new RegExp(`图\\s*${ref.replace('-', '-')}\\s*·`).test(readme) && !readme.includes(`图 ${ref}`)) {
    problems.push(`README 图表索引缺少 图 ${ref}`)
  }
}
// 4) images present on disk vs referenced
import { existsSync } from 'node:fs'
for (const entry of allCaptions) {
  const [img] = entry.split('=')
  if (!existsSync(join(root, img))) problems.push(`缺图片文件 ${img}`)
}

console.log(problems.length ? problems.join('\n') : '(no cross-reference problems)')
console.log(`sections checked: ${[...sections.values()].reduce((n, s) => n + s.size, 0)}, figure refs: ${allFigRefs.size}`)
