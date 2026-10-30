// Render the guide figures to PNG with Playwright.
// Usage (from this directory):
//   node render.mjs
// Override discovery with:
//   PLAYWRIGHT_CORE=<path-to-playwright-core/index.mjs> \
//   CHROMIUM_PATH=<path-to-chrome-headless-shell> \
//   node render.mjs
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..', 'deepseek-harness')
const output = resolve(here, '..', 'images')
await mkdir(output, { recursive: true })

async function resolveCore() {
  const candidates = [
    process.env.PLAYWRIGHT_CORE,
    join(repoRoot, 'node_modules/playwright-core/index.mjs'),
    join(repoRoot, 'node_modules/.pnpm/playwright-core@1.61.1/node_modules/playwright-core/index.mjs'),
    'playwright-core',
  ].filter(Boolean)
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && !candidate.startsWith('playwright') && !existsSync(candidate)) continue
    const specifier = candidate.startsWith('.') || candidate.includes('\\') || candidate.includes('/')
      ? pathToFileURL(resolve(candidate)).href
      : candidate
    try {
      return await import(specifier)
    } catch {}
  }
  throw new Error('playwright-core not found; set PLAYWRIGHT_CORE')
}

function resolveChromium() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, 'ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe')
      : undefined,
  ].filter(Boolean)
  return candidates.find(candidate => existsSync(candidate))
}

const { chromium } = await resolveCore()
const executablePath = resolveChromium()
const browser = await chromium.launch(executablePath === undefined ? {} : { executablePath })
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1.5 })
await page.goto(pathToFileURL(join(here, 'figures.html')).href)
await page.evaluate(() => document.fonts.ready)

const figures = await page.locator('section.figure').all()
for (const figure of figures) {
  const id = await figure.getAttribute('id')
  if (id === null) continue
  const name = id.replace(/^fig-/, '')
  const file = join(output, `${name}.png`)
  await figure.screenshot({ path: file })
  console.log(`rendered ${name}.png${executablePath ? '' : ' (browser auto-resolved)'}`)
}

await browser.close()
