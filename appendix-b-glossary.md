# 附录 B 术语表

按主题分组。写法沿用官方中文文档（`docs/cordis-tutorial/*.zh.md`、`docs/cordis-api/*.zh.md`、`docs/cordis-primer.zh.md`）。

---

## B.1 骨架

| 术语 | 含义 | 出处 |
|---|---|---|
| **Cordis** | DeepSeek Harness 以 vendor 方式引入的底层插件框架；小型运行时，一切能力都是挂在共享上下文上的插件 | `docs/cordis-primer.zh.md` |
| **插件（Plugin）** | 导出 `apply(ctx)` 的函数、带 `apply` 的对象，或 `Service` 子类；Cordis 挂载它时调用 `apply` | `vendor/cordis/src/registry.ts:92-95` |
| **上下文（Context / `ctx`）** | 服务容器 + 注册入口 + 生命周期边界；实际是 Proxy | `vendor/cordis/src/context.ts:70-84` |
| **fiber** | 一个已加载插件实例的运行时句柄，携带状态、校验过的配置与已注册的作用 | `docs/cordis-api/fiber.zh.md`、`vendor/cordis/src/fiber.ts:184-233` |
| **runtime** | 一个插件回调对应的记录，其下挂它的**所有** fiber | `vendor/cordis/src/registry.ts:197, 320-330` |
| **作用域 / 子上下文** | `ctx.extend()` / `isolate()` 产生的原型继承子级 | `context.ts:99, 121` |
| **根上下文** | `new Context()` 返回的 Proxy，`ctx.root` 指向它 | `context.ts:75` |

## B.2 能力与依赖

| 术语 | 含义 | 出处 |
|---|---|---|
| **服务（Service）** | 以名字公开、经 `ctx` 消费的具名能力 | `vendor/cordis/src/service.ts:11-57` |
| **`inject`** | 声明所需服务；Cordis 等这些服务就绪后才 `apply`，并在其后持续跟踪 | `registry.ts:71-88, 330` |
| **注册表（Registry）** | `name → 实现 + 提供方 fiber` 的容器，每个应用一份扁平命名空间 | `registry.ts:195` |
| **`ctx.get(name)`** | 显式“可能为空”的服务读取，不触发依赖跟踪 | `reflect.ts:233` |
| **`provide`** | 注册实现，返回 disposer；注销时经 `reflect.notify` 唤醒依赖方 | `reflect.ts:277, 314` |
| **epoch** | 由依赖提供方的 `uid` 拼出的字符串；变化即重启，缺失即 INACTIVE | `fiber.ts:611-639` |
| **`store`** | 加载期填好的实现快照，属性读 `ctx.x` 就查它 | `fiber.ts:197-198` |
| **声明合并** | `declare module '@deepseek-ai/cordis' { interface Context / Events ... }`；只加类型，不产生运行时接线 | 第 4、5 章 |

## B.3 生命周期

| 术语 | 含义 | 出处 |
|---|---|---|
| **effect** | 可逆注册。加载期运行，卸载期回卷 | `fiber.ts:415-418` |
| **disposer（资源释放函数）** | effect 返回的清理函数；重复调用无副作用 | 同上 |
| **`dispose()`** | 卸载插件并等清理完成，递归子插件 | `fiber.ts:196, 265-297` |
| **`restart()` / `update()`** | 重新加载 / 校验新配置后重启 | `fiber.ts:745, 764` |
| **PENDING** | 已声明但所需服务未就绪；不报错、不保活事件循环 | `fiber.ts:147-154` |
| **FAILED** | `apply` 或配置校验抛错；异常已进 logger | `fiber.ts:576, 686-691` |
| **`INACTIVE_EFFECT`** | 在已 dispose 的上下文注册 effect 的错误码 | `fiber.ts:351-353` |

## B.4 事件

| 术语 | 含义 | 出处 |
|---|---|---|
| **分发模式** | 事件的公开约定：`emit` / `parallel` / `serial` / `bail` / `waterfall` | `docs/cordis-primer.zh.md#dispatch-modes` |
| **`@mode`** | harness 事件声明上记录模式的标签，生成目录据此交叉校验 | `packages/core/tools/src/events.ts:42-49` |
| **bail 值** | 非 `null`、非 `false`、非 `undefined` 的返回值；`0` 与 `''` 也算 | `events.ts:13-15` |
| **waterfall（瀑布式事件）** | 环绕中间件；监听器收 `(...args, next)` | `events.ts:234-243` |
| **否决** | waterfall 监听器**不调用** `next()` 直接返回，短路下游 | `docs/cordis-api/events.zh.md:118` |
| **`next()`** | 下游 continuation；其返回值可被当前层包装 | 同上 |
| **`prepend` / `global`** | 监听器排序与跳过上下文过滤的选项 | `events.ts:112-117` |

## B.5 配置

| 术语 | 含义 | 出处 |
|---|---|---|
| **配置项（entry）** | `cordis.yml` 里的一条，含 `name`、`id`、`config` 等元数据 | `vendor/loader/src/config/entry.ts:10-23` |
| **`group`** | 嵌套子列表、作为一个单元加载/卸载的配置项 | `config/group.ts:74-89` |
| **`disabled`** | 保留配置项但不挂载；`!!js` 时每次挂载决策求值 | `entry.ts:76-85, 91-95` |
| **`isolate`** | 为本组就某服务名换 realm，实现互相不可见 | `config/isolate.ts:5-14, 49-153` |
| **`!!js`** | YAML 标签，产出 `{ __jsExpr }` 并在加载时求值；只允许出现在 `config` 与 `disabled` | `vendor/include/src/index.ts:9-15`、`cordis/packages/include/src/index.ts:20-29, 33` |
| **Schemastery / Standard Schema** | 本仓库的 schema 库 / Cordis 接受的校验器协议 | `registry.ts:104` |
| **volatile 字段** | 设计上“改值不改挂载”的配置字段，经 `.get()` 读 | 第 6 章 6.4（含未复现项） |
| **overlay / patch 层** | harness 的补丁叠加：bundle patch → profile patch → home patch → `--patch` | `apps/cli/src/profile-boot.ts:81-84` |

## B.6 本教程的证据用语

| 说法 | 含义 |
|---|---|
| **实测** | 作者在本机跑出来的输出，逐字粘贴，含退出码 |
| **复现** | 官方描述的语义在本机观察到 |
| **未复现** | 官方描述在本机没有观察到；结论只到“此路径未验证”，不推断原因 |
| **与官方文档的差异** | 有实测或源码证据支持的、与 `docs/cordis-tutorial/*.zh.md` 不一致处 |
| **`vendor` 副本** | `deepseek-harness/vendor/*`，包名 `@deepseek-ai/*`，本教程实际运行的代码 |
| **上游仓库** | `cordis/packages/*`，包名 `cordis` 与 `@cordisjs/*`，概念与测试参考 |

## B.7 周边

| 术语 | 含义 |
|---|---|
| **harness / dsh** | DeepSeek Harness，agent 运行框架；Cordis 是其底层 |
| **agent loop** | 轮次/步骤循环本身也是一个插件（服务名 `agent-loop` 的配置项见 base 层） |
| **Native renderer** | `output.render` 把规范输出值投影为可持久化的 `ContentBlock[]` |
| **branded string** | `string & { readonly [BRAND]: B }` 的标称字符串，如 `ToolCallId`；`brandString` 是编译期转换 |
| **`cordis-surface` 区块** | `docs/subsystems/*.zh.md` 上自动生成的服务/事件清单 |
