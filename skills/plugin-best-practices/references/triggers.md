# Triggers, handlers, and status

The client calls a plugin through named handlers on the object its entry returns. Two things decide
which handlers it looks for:

- the catalog entry's **`triggers` array** — the events the plugin opts into; and
- a small set of **automatic lifecycle events** the client always wires.

The dispatching code is `frontend/src/stores/plugins.ts` in the host source (fetch it with
`scripts/fetch-host-refs.mjs`).

## `triggers` values

List only these in `triggers` — anything else is ignored. Each maps to one handler name.

| `triggers` value | Handler | Signature | Receives | Must return |
| --- | --- | --- | --- | --- |
| `on::manual` | `onRun` | `() => ...` | — | status |
| `on::startup` | `onStartup` | `() => ...` | — | status |
| `on::ready` | `onReady` | `() => ...` | — | status |
| `on::reload` | `onReload` | `() => ...` | — | status |
| `on::shutdown` | `onShutdown` | `() => ...` | — | status |
| `on::subscribe` | `onSubscribe` | `(proxies, subscription) => ...` | proxy array, subscription metadata | `proxies` |
| `on::generate` | `onGenerate` | `(config, profile) => ...` | generated core config, profile | `config` |
| `on::before::core::start` | `onBeforeCoreStart` | `(config, profile) => ...` | generated core config, profile | `config` |
| `on::before::core::stop` | `onBeforeCoreStop` | `() => ...` | — | status |
| `on::core::started` | `onCoreStarted` | `() => ...` | — | status |
| `on::core::stopped` | `onCoreStopped` | `() => ...` | — | status |
| `on::tray::update` | `onTrayUpdate` | `(tray, menus) => ...` | tray content, tray menus | `{ tray, menus }` |

## Automatic lifecycle handlers

These are wired by the client whether or not they appear in `triggers`, so never list them there:
listing `on::install` / `on::uninstall` (or similar) has no effect.

| Handler | Signature | The client calls it |
| --- | --- | --- |
| `onInstall` | `() => ...` | after the plugin is added to the registry |
| `onUninstall` | `() => ...` | while removing the plugin, after `onDisabled` / `onDispose` |
| `onEnabled` | `() => ...` | when a disabled plugin is enabled |
| `onDisabled` | `() => ...` | when a plugin is disabled |
| `onDispose` | `() => ...` | before disable, reload, update, or remove |
| `onConfigure` | `(config, old) => ...` | when the configuration form is saved |
| `onTask` | `() => ...` | when a scheduled task that references the plugin runs |

`onRun` is also reached from the plugin card's run button and from `menus` / `context` actions.

## Pipeline handlers

`onSubscribe`, `onGenerate`, `onBeforeCoreStart`, and `onTrayUpdate` run as an ordered pipeline: every
enabled plugin that declared the trigger is called in turn and receives the previous plugin's return
value, so always **mutate and return** (or return the input unchanged). The client throws
`<plugin name> : Wrong result` when `onSubscribe` does not return an array or when `onGenerate` /
`onBeforeCoreStart` return a falsy value. The metadata argument (`subscription` / `profile`) is a deep
clone, so editing it does not affect the app's stored record.

## Status codes

A handler may return a number, which the client stores as the plugin's `status` and shows on the card.

- `0` — neutral / installed. Use for `onInstall`, `onUninstall`, `onConfigure`.
- `1` — running. Use for `onRun` and "start" actions.
- `2` — stopped. Use for "stop" actions.

Returning nothing leaves the status unchanged. `plugin.status` is the one writable property on the
metadata object, so a long-running handler can also set it directly.

## Errors

A thrown handler is re-thrown as `<plugin name> : <message>`. For most triggers the client logs and
continues; `onShutdown`, `onReload`, and `onBeforeCoreStop` interrupt the chain and propagate the error,
so let those fail loudly only when the app really must stop.

## Handler templates

The canonical shape of every handler, with the standard one-line comment that introduces it, written in
the comment language the plugin uses for user-facing text:

```js
/** @type {EsmPlugin} */
export default (plugin) => {
  /* 触发器 启用插件时 */
  const onEnabled = async () => {}

  /* 触发器 禁用插件时 */
  const onDisabled = async () => {}

  /* 触发器 插件销毁时 */
  const onDispose = async () => {}

  /* 触发器 安装插件时 */
  const onInstall = async () => {}

  /* 触发器 卸载插件时 */
  const onUninstall = async () => {}

  /* 触发器 手动触发 */
  const onRun = async () => {}

  /* 触发器 托盘更新时 */
  const onTrayUpdate = async (tray, menus) => {
    return { tray, menus }
  }

  /* 触发器 更新订阅时 */
  const onSubscribe = async (proxies, subscription) => {
    return proxies
  }

  /* 触发器 生成配置时 */
  const onGenerate = async (config, profile) => {
    return config
  }

  /* 触发器 启动应用时 */
  const onStartup = async () => {}

  /* 触发器 关闭应用时 */
  const onShutdown = async () => {}

  /* 触发器 核心启动后 */
  const onCoreStarted = async () => {}

  /* 触发器 核心停止后 */
  const onCoreStopped = async () => {}

  /* 触发器 核心启动前 */
  const onBeforeCoreStart = async (config, profile) => {
    return config
  }

  /* 触发器 核心停止前 */
  const onBeforeCoreStop = async () => {}

  /* 触发器 应用就绪后 */
  const onReady = async () => {}

  /* 触发器 应用重载时 */
  const onReload = async () => {}

  /* 触发器 计划任务执行时 */
  const onTask = async () => {}

  /* 触发器 配置插件时 */
  const onConfigure = async (config, old) => {}

  return {
    onEnabled, onDisabled, onDispose, onInstall, onUninstall, onRun, onTrayUpdate, onSubscribe,
    onGenerate, onStartup, onShutdown, onCoreStarted, onCoreStopped, onBeforeCoreStart,
    onBeforeCoreStop, onReady, onReload, onTask, onConfigure,
  }
}
```

Return the handlers you support from that object. Named exports also work, but when a handler exists
both on the returned object and as a named export the returned object wins (with a console warning) —
prefer the returned object.
