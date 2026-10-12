# Plugin system

A plugin is one JavaScript file that the client loads, evaluates, and calls into when events fire.
Everything the client can do is reachable from a plugin through the global `Plugins` object
(see [plugin-api.md](plugin-api.md)); the plugin reads its own metadata and configuration from the
object the entry function returns (see [host-notes.md](host-notes.md)).

## What a plugin can do

- Change the app theme or language, and manage profiles, subscriptions, rulesets, and the core.
- Rewrite a subscribed proxy list (`onSubscribe`) or the generated core config (`onGenerate`).
- Integrate third-party programs and expose them through menus and custom UIs.

## Triggers and handlers

A catalog entry's `triggers` array names the events the plugin subscribes to; the client maps each to a
handler name on the plugin's returned object. The exhaustive trigger ↔ handler table — signatures, what
each receives and returns, pipeline rules, and status codes — lives in
[triggers.md](triggers.md). Lifecycle handlers such as `onInstall`, `onUninstall`, `onEnabled`,
`onDisabled`, `onDispose`, `onConfigure`, and `onTask` are wired automatically and are never listed in
`triggers`.

## Lifecycle

| Action | Handlers called (in order) |
| --- | --- |
| Add a plugin | `onInstall` |
| Disable a plugin | `onDisabled`, `onDispose` |
| Enable a plugin | `onEnabled` |
| Reload / update the plugin source | `onDispose` (then the module is re-evaluated) |
| Remove a plugin | `onDisabled` (if enabled), `onDispose`, `onUninstall` |

`onConfigure(config, old)` runs when the user saves the configuration form, with the new values (`config`)
and the previous values (`old`); it runs *before* the new values are persisted, so read new settings from
the `config` argument rather than from `plugin.<key>`. `onTask` runs when a scheduled task that references
the plugin fires.

While a plugin is disabled its trigger handlers are skipped, so `onDispose` must leave the plugin in a
state that is safe to resume from. Put setup in `onInstall` and the matching teardown in `onUninstall`;
use `onDispose` for anything tied to the running process (timers, spawned processes, servers, open
modals). Removing a plugin also deletes its stored script when `path` is under `data/`, and asks whether
to drop its saved configuration.

## Menus and context actions

`menus` maps a right-click label to the name of an extra function the plugin returns. `context` maps the
same kind of label under a resource kind (`profiles`, `subscriptions`, `rulesets`, `plugins`,
`scheduledtasks`); those handlers receive the clicked resource as their argument. Both can return a
status code, which is why they are the natural home for start/stop controls.

```js
export default (plugin) => {
  const Start = async () => {
    const dir = await Plugins.AbsolutePath('data/third/my-plugin')
    await Plugins.ExecBackground('/path/to/bin', [], undefined, undefined, { WorkingDirectory: dir })
    return 1 // running
  }
  const Stop = async () => {
    await Plugins.Exec('pkill', ['-f', '/path/to/bin'])
    return 2 // stopped
  }
  const renameNode = async (profile) => {
    // `context.profiles` maps a label to this function; `profile` is the clicked profile
    Plugins.message.info(`profile: ${profile.name}`)
  }
  return { Start, Stop, renameNode }
}
```

## Example: a full hook set

```js
/** @type {EsmPlugin} */
export default (plugin) => {
  const onRun = async () => { await startProgram(); return 1 }
  const Stop = async () => { await stopProgram(); return 2 }
  const onInstall = async () => { await downloadProgram(); return 0 }
  const onUninstall = async () => { await removeProgram(); return 0 }
  const onSubscribe = async (proxies, subscription) => {
    // proxies: proxy array; subscription: metadata
    return proxies.map((p) => ({ ...p, name: p.name.replace('新加坡', '') }))
  }
  const onGenerate = async (config, profile) => {
    if (profile.name === '某个profile') config.dns.enable = false
    return config
  }
  const onStartup = async () => {}
  const onShutdown = async () => {}
  const onReady = async () => {}
  const onTask = async () => {}
  const onConfigure = async (config, old) => {}
  return {
    onRun, Stop, onInstall, onUninstall, onSubscribe, onGenerate,
    onStartup, onShutdown, onReady, onTask, onConfigure,
  }
}
```

## Finding the API

In the running app press `Ctrl+Shift+F12`, switch to the **Console**, and type `Plugins` to inspect
every method on the live object. `Vue` is exposed the same way. This is usually faster than reading
the type graph.
