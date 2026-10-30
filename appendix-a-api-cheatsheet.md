# 附录 A API 速查

本附录的行号都以 `deepseek-harness/` 为根，指向 `vendor/cordis 4.0.6-alpha.1` 与 `vendor/loader 1.0.7-alpha.1`。上游 `cordis` 仓库命名有差（第 1 章 1.4），抄代码前确认包名前缀。

---

## A.1 命令

| 目的 | 命令 |
|---|---|
| 运行教程示例（在 `tmp/cordis-tutorial/`） | `node --import tsx ../../vendor/cordis/bin.js` |
| 带环境变量跑 `!!js` | `DEMO_GREETING=Salve node --import tsx ../../vendor/cordis/bin.js` |
| 建工作目录 | `mkdir -p tmp/cordis-tutorial && cd tmp/cordis-tutorial` |
| 装依赖（首次或检出被移动后） | `pnpm install` |
| 用 overlay 把本地插件加进 harness | `dsh --patch my-greet.patch.yml` |
| 导出组装后的配置 | `dsh --dump-config` |

---

## A.2 `ctx` 上的方法

| 方法 | 签名（简化） | 位置 | 一句话 |
|---|---|---|---|
| `plugin` | `plugin(plugin, config?, getOuterStack?): Fiber & PromiseLike<Fiber>` | `vendor/cordis/src/registry.ts:316`（声明 `:185`） | 挂载插件，返回 fiber（也可 await） |
| `inject` | `inject(deps: Inject, callback: Plugin.Function<void>): Fiber & PromiseLike<Fiber>` | `registry.ts:300-302`（声明 `:176`） | `plugin({ inject, apply })` 的糖 |
| `effect` | `effect(execute, label?): Disposable<Promise<void>>` / `AsyncDisposable` | `fiber.ts:415-418` | 注册可逆副作用；`execute` 返回 disposer |
| `on` | `on(name, listener, options?: boolean \| EventOptions): () => boolean` | `events.ts:97` | 注册监听器；布尔参数等价 `{prepend:true}` |
| `once` | 同 `on`，首次触发后自行 dispose | `events.ts:106` | 一次性监听 |
| `emit` | `emit(name, ...args): void` | `events.ts:194` | 同步广播；**异常同步回抛**（第 5 章 5.3） |
| `parallel` | `await parallel(name, ...args)` | `events.ts:183` | 并发 + 一起等待；失败聚合 `AggregateError` |
| `serial` | `await serial(name, ...args)` | `events.ts:204` | 逐个 await，首个 bail 值胜出 |
| `bail` | `bail(name, ...args)` | `events.ts:217` | serial 的同步版 |
| `waterfall` | `waterfall(name, ...args, next)` | `events.ts:234` | 环绕中间件；不调 `next()` 即否决 |
| `get` | `get(name, strict = true)` | `reflect.ts:233` | 显式可能为空的服务读取 |
| `set` | `set(name, value, error?)` | `reflect.ts:254` | 写入已注册的名字 |
| `provide` | `provide(name, value?, check?): () => void` | `reflect.ts:277` | 注册服务实现，返回 disposer |
| `accessor` / `mixin` | `accessor(name, options)` / `mixin(source, mixins)` | `reflect.ts:345, 364` | 给 `ctx.<name>` 装 getter / 混入方法 |
| `extend` | `extend(meta = {}): this` | `context.ts:99` | 原型继承出子上下文，`meta` 覆盖 |
| `isolate` | `isolate(name, label?): this` | `context.ts:121` | 为该名字换 realm；同 label 即共享 |
| `intercept` | `intercept(name, config): this` | `context.ts:139` | 追加服务级拦截配置 |

**属性**：`ctx.fiber`、`ctx.root`（`context.ts:75`）、`ctx.baseUrl`、`ctx.registry`（`registry.ts:195`）、`ctx.reflect`、`ctx.events`（`events.ts:131`）、`ctx.logger`（`logger.ts:194`）、`ctx.loader`（挂 Loader 之后）。

`ctx.<服务名>` 的解析走 Proxy `get`（`reflect.ts:136-171`）：特殊属性 → 自有属性 → `internal/get` waterfall → 沿 fiber 链查 `store`。没有 `inject` 就抛错，不返回 `undefined`。

---

## A.3 插件元数据

`Plugin.Base`（`vendor/cordis/src/registry.ts:100-111`）：

| 字段 | 类型 | 用途 |
|---|---|---|
| `name` | `string?` | 诊断显示；内联 `{apply}` 的假名 `apply` 会被抹成 undefined（`registry.ts:325-326`） |
| `Config` | `StandardSchemaV1?` | 配置校验器；本仓库用 Schemastery |
| `inject` | `Inject?` | 数组 `['tools']` 或名字→配置映射（`Inject.resolve`，`registry.ts:71-88`） |
| `provide` | `string \| string[]?` | `Service` 子类未传名字时的兜底（`service.ts:43`） |
| `intercept` | `Dict<boolean>?` | 参与服务配置拦截 |

三种形态（`registry.ts:92-95`，解析在 `:222-228, 316-319`）：函数 `(ctx, config)`、对象 `{ name?, inject?, Config?, apply(ctx, config) }`、`Service` 子类。

---

## A.4 `cordis.yml` 配置项元数据

基础字段 `vendor/loader/src/config/entry.ts:10-23`；隔离扩展 `vendor/loader/src/config/isolate.ts:5-14`。

| 字段 | 语义 | 备注 |
|---|---|---|
| `name` | 模块指定符 | 解析顺序：`cordis:` → internal → `.` 相对 `ctx.baseUrl` → NPM 包名（`config/tree.ts:112-132`） |
| `id` | 稳定标识 | 缺失时每次读取随机生成（`config/tree.ts:52-59`）→ 编辑配置即重挂（第 7 章 7.4 实测） |
| `config` | 传给插件的配置 | 校验失败 → fiber FAILED + logger 错误 |
| `group` | 该条目是子列表容器 | 子列表写在 `config` 里；组永远 enabled，`disabled` 由后代继承 |
| `disabled` | 保留但不挂载 | 支持 `!!js`，每次挂载决策求值（`entry.ts:91-95`） |
| `inject` | 条目级依赖声明 | 由 `internal/plugin` 解析进 fiber（`vendor/loader/src/index.ts:129-135`） |
| `isolate` | `{ <服务名>: true \| "label" }` | `true` 私有 realm（`#<id>`），字符串按 label 共享（`@<label>`） |
| `intercept` | 服务配置拦截 | 同 isolate 模块 |

**没有 `enabled` 字段。** YAML 由 `js-yaml` 解析，顶层必须是数组；`!!js` 标签产出 `{ __jsExpr }`（`vendor/include/src/index.ts:9-15`）。

---

## A.5 Fiber 与生命周期

| 成员 | 位置 | 说明 |
|---|---|---|
| `state` | `fiber.ts:194`，派生 `:576` | `PENDING:0, LOADING:1, ACTIVE:2, FAILED:3, DISPOSED:4, UNLOADING:5`（`:147-154`） |
| `uid` | `fiber.ts:186` | 单调编号；dispose 后置 `null`；epoch 由依赖的 uid 拼成 |
| `name` | `fiber.ts:336` | 沿祖先求名，根为 `'root'` |
| `config` / `_config` | `fiber.ts:184-233` | 校验后的配置与原始配置 |
| `inject` | 同上 | 依赖名 → 实现快照（未就绪为 `null`） |
| `store` | `fiber.ts:197-198` | 加载期的实现快照，属性读就查它 |
| `entry` | 由 `internal/plugin` 关联 | 对应的配置项对象（`options.id`、`disabled` 等） |
| `await()` | `fiber.ts:731` | 等加载完成；有 `_error` 时抛出 |
| `dispose()` | `fiber.ts:196` | 卸载并等清理（含异步、含子插件） |
| `restart()` | `fiber.ts:745` | 卸载后重新加载 |
| `update(config, noSave?)` | `fiber.ts:764` | 校验新配置 → `internal/update` waterfall → restart |

状态迁移：`_setEpoch` → `_reload()` / `_unload()`（`fiber.ts:625-639`），`_updateState` 发 `internal/status`（`:581-595`）。

---

## A.6 effect 与清理

| 规则 | 位置 |
|---|---|
| 单 effect 内：`disposables.splice(0).reverse()`，同步内联、异步逐个串接 | `fiber.ts:427-442` |
| fiber 卸载：`Promise.all(this._disposables.clear())`，逆序启动但**并发** | `fiber.ts:702-713` |
| `DisposableList.clear()` 返回逆序数组 | `utils.ts:27-31` |
| 加载异常 → `ctx.logger.error(reason)` + `_error` → FAILED | `fiber.ts:686-691` |
| `dispose` 注册为父 fiber 的 effect；`while (this.inertia) await` | `fiber.ts:265-297` |
| 在已 dispose 上下文注册 effect → `CordisError('INACTIVE_EFFECT')` | `fiber.ts:351-353` |

---

## A.7 事件系统

- `isBailed(value)`：`value !== null && value !== false && value !== undefined`（`events.ts:13-15`）。`0`、`''`、`NaN` 都算命中。
- `dispatch` 的过滤：`hook.global || !filter || filter.call(...)`（`events.ts:172-173`）。
- `EventOptions`：`prepend?`、`global?`（`events.ts:112-117`）。
- waterfall 实现：弹出最后一个参数作最内层 `inner`，压入 `next()`（`events.ts:234-243`）。
- harness 事件的模式记录在声明的 `@mode` 标签上，生成目录会交叉校验（`docs/cordis-primer.zh.md#dispatch-modes`）。

---

## A.8 Loader 侧

| 成员 | 位置 | 说明 |
|---|---|---|
| `ctx.loader.create(entry)` | 服务名 `loader`：`vendor/loader/src/index.ts:84, 102`；`create()` 本体：`vendor/loader/src/config/tree.ts:82-88` | 插入配置项、写回文件并返回其 Promise |
| `ctx.loader.getTasks()` / `await()` | `config/tree.ts:36-50` | 还有多少配置项在启动 |
| `ctx.loader.builtins` | `config/tree.ts:114-116` | `cordis:` 前缀查表 |
| `ctx.loader.internal` | `vendor/loader/src/internal.ts:108-118, 131-143` | Node loader 内部结构（`--expose-internals` 或 `node-addon-require-builtin`） |
| `applyEntryPatches` | `vendor/include/src/index.ts:57-127` | 补丁操作 `insert` / 按 `id` / 按 `name`，可覆盖任意键 |
| `internal/plugin` / `internal/config` / `internal/update` | `vendor/loader/src/index.ts:129-166, 104-113, 115-127` | 关联 entry、插值 `!!js`、写回与重挂 |
| `loader/volatile-update` | `vendor/loader/src/index.ts:34` 声明，`config/entry.ts:160-197` 发射 | 仅 volatile 变化时；等值不通知 |
| `loader/patch-context` / `loader/partial-dispose` | `config/isolate.ts:96-172` | isolate realm 的换入换出与回收 |

---

## A.9 常用辅助插件

| 服务名 / 插件 | 包名 | 提供什么 |
|---|---|---|
| `loader` | `@deepseek-ai/cordis-plugin-loader` | 配置项装载与差分 |
| —（Include） | `@deepseek-ai/cordis-plugin-include` | 读 `cordis.yml`，把 `ctx.baseUrl` 指向 yml 目录 |
| `group` | `@deepseek-ai/cordis-plugin-group` | 3 行转出 loader 的 `Group` |
| `timer` | `@deepseek-ai/cordis-plugin-timer` | 混入 `timeout`/`interval`/`throttle`/`debounce`/`setTimeout`/`setInterval`（`vendor/timer/src/index.ts:12-16`） |
| —（控制台导出器） | `@deepseek-ai/cordis-plugin-logger-console` | `ConsoleExporter`，配置项 `colors`/`maxLength`/`levels`/`showDiff`/`showTime`/`label`（**不是服务**） |
| `hmr` | `@deepseek-ai/dsh-hmr`（`packages/boot/hmr`） | 配置 `base`/`root`/`ignored`/`debounce`（扁平），`@Inject('loader')` + `@Inject('timer')` |

上游同功能包用 `@cordisjs/plugin-*` 命名，在本检出不可 import。

---

## A.10 harness 侧速查（第 8 章）

| 项 | 位置 | 要点 |
|---|---|---|
| `tools` 服务 | `packages/core/tools/src/index.ts:99, 111-113` | `ToolsService`，`static inject = ['systemPrompt']`（`:100`） |
| `register(definition, options?)` | `index.ts:128` | 校验 `output.render` 是函数、`output.schema` 支持、`timeoutMs` 正有限；拒绝保留名 `run_code`；重名抛错 |
| `execute(input)` | `index.ts:375-377` | `ToolBatchInput{calls, signal, maxParallelToolCalls?, agent?, toolSet?, log?}`（`src/executor.ts:19-48`） |
| 返回 | `executor.ts:50-61` | `ToolBatchResult{results[], additionalContexts, concluded}`，`results[i].result.content` 是 `ContentBlock[]` |
| `tools/result` | `src/events.ts:42-49` | `(exec, result)`，`@mode emit`；发射点包住观察者异常（`pipeline.ts:399-419`） |
| `defineTool(options)` | `src/schema.ts:555` | 面向模型只投影 `name`/`description`/`parameters`/`deferLoading`（`:641-646`） |
| 参数编译 | `schema.ts:450-459, 418, 98-107` | 逐属性 `required: true`，不是顶层数组 |
| 参数校验 | `schema.ts:580, 598-602` | 不合规格抛 `ToolArgsError`（`INVALID_ARGS`） |
| 输出强制 | `contracts.ts:16-23, 309-319` | 违反 `output.schema` → `ToolOutputError` |
| `systemPrompt` 服务 | `packages/core/system-prompt/src/index.ts:434-451` | `super(ctx, 'systemPrompt')`，`tools()` / `section()` 贡献点 |
| 最小正确写法夹具 | `packages/core/tools/tests/fixtures/literal-sdk.ts` | 20 行；抄它比抄产品代码合适 |

---

## A.11 一段可复用的“诊断头”

把这三行贴进任何调试目录，四问排查法就齐了：

```yaml
# cordis.yml
- id: console
  name: '@deepseek-ai/cordis-plugin-logger-console'
- id: states
  name: './exp-states.ts'      # 打印 FiberState 数值与注册表快照
- id: replay
  name: './log-replay.ts'      # 回读 ctx.logger.buffer
```

```yaml
# 你的真实配置项放最后
- id: my-plugin
  name: './my-plugin.ts'
```

注意两个插件都自己保活（`setTimeout`），运行完会 `process.exit(0)`。长期驻留时把 `process.exit(0)` 换成条件退出。
