# 插图源文件

本目录保存 `cordis-guide` 插图的 HTML 源与渲染脚本。读者可以忽略；维护者修改 `figures.html` 后重新渲染 `../images/*.png`。

## 文件

| 文件 | 作用 |
|---|---|
| `figures.html` | 所有插图的 HTML/CSS 源；每个 `<section class="figure" id="fig-...">` 对应一张图 |
| `render.mjs` | 用 Playwright 逐个截图 `section.figure`，输出到 `../images/<id>.png` |

## 渲染

```sh
cd cordis-guide/diagrams
node render.mjs
```

脚本按顺序查找依赖，命中即用：

1. 环境变量 `PLAYWRIGHT_CORE` / `CHROMIUM_PATH`（显式指定）。
2. `../deepseek-harness/node_modules/playwright-core/index.mjs`。
3. `../deepseek-harness/node_modules/.pnpm/playwright-core@*/node_modules/playwright-core/index.mjs`。
4. 裸模块名 `playwright-core`（当你在能解析它的工作目录里运行时）。

浏览器默认尝试 `%LOCALAPPDATA%\ms-playwright\chromium_headless_shell-*/chrome-headless-shell-win64\chrome-headless-shell.exe`；找不到就交给 Playwright 自己解析。若报缺少浏览器：

```sh
npx playwright install chromium
```

## 约定

- 画布固定 `1100 × 640`，导出约 `1650 × 960`（`deviceScaleFactor: 1.5`）。
- 每张图包含 `kicker`（图号与主题）、`h2`（结论式标题）、`sub`（一句话解释）、`fig-no`（章节脚注）。
- 语义配色：`blue` 结构与主流程、`teal` 成功/实测通过、`amber` 条件与注意事项、`red` 失败与被吞掉的错误、`violet` 机制与内部实现。
- **图里的输出必须是实测输出**，逐字来自终端，含时间戳与退出码；概念性示意在 `kicker` 里写明“心智模型/时序/解剖”。
- 正文用 `*图 N-M · 说明*` 作为斜体图注，与 `figures.html` 里的 `h2` 内容彼此呼应但不必逐字相同。

## 新增一张图

1. 在 `figures.html` 里加 `<section class="figure" id="fig-<name>">`，内部一个 `.canvas`。
2. 运行 `node render.mjs`，得到 `../images/<name>.png`。
3. 在章节里插图 `![图 N-M · 标题](images/<name>.png)` 与斜体图注。
4. 更新 `../README.md` 的图表索引。
