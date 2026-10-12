# Plugin API reference (`Plugins`)

The client injects a global `Plugins` object (and the full Vue 3 namespace as `Vue`). Everything below
is mirrored in `plugins.d.ts`, which is the fastest place to confirm a signature. `Plugins.YAML.parse`
/ `Plugins.YAML.stringify` are handy alongside the rest. All paths are relative to the client's install
directory (where `data/` lives) unless they are already absolute.

## Dialogs, messages, notifications

| Call | Returns |
| --- | --- |
| `Plugins.alert(title, content, { type?: 'text' \| 'markdown' })` | `Promise<void>` |
| `Plugins.prompt(title, initialValue?, { placeholder?, type? })` | `Promise<string>` |
| `Plugins.confirm(title, content, { type?, okText?, cancelText? })` | `Promise<boolean>` |
| `Plugins.Notify(title, body)` | `Promise<void>` |
| `Plugins.message.success(msg, duration?)` / `.warn(...)` / `.error(...)` | `void` |
| `Plugins.message.info(msg, duration?, onClose?)` | `{ id, update(msg, type?), destroy(), success(msg), error(msg) }` |
| `Plugins.message.update(id, msg, type?)` / `Plugins.message.destroy(id)` | `void` |
| `Plugins.picker.multi(title, options, initialValue?)` | `Promise<any[]>` |
| `Plugins.picker.single(title, options, initialValue?)` | `Promise<any>` |

A progress-style message keeps its handle and updates it in place (duration `0` keeps it open):

```js
const msg = Plugins.message.info('download', 0)
msg.update('50%')
msg.success('done')
```

## Modal

`Plugins.modal(options, slots)` renders a modal and returns `{ open, close, destroy, setProps,
patchProps, setSlots, patchSlots, setComponent, setContent }`. A modal destroys itself on close by
default (`destroyOnClose`), so nothing needs to outlive the call that opens it — bind the API to a local
constant inside the entry closure, never a module-level variable. `options` and `slots` are listed in
`plugins.d.ts` (`UseModalOptions`, `UseModalSlots`); `title` / `cancelText` / `submitText` are i18n keys
passed through `$t` (a literal string falls back to itself), and the defaults are `common.save` /
`common.cancel`. See the SKILL for the pattern.

## Choosing between similar calls

| Goal | Use | Not |
| --- | --- | --- |
| Open a URL or a local folder with the **OS default handler** | `OpenURI(uri)` / `OpenDir(path)` | — |
| Force a URL into the **system default browser** | `BrowserOpenURL(url)` | — |
| Delete a file **or** a directory tree | `RemoveFile(path)` (it is `RemoveAll`) | there is no `RemoveDir` |
| Run a tool and read its output | `Exec(cmd, args, options)` | `ExecBackground` when you need to wait |
| Start a long-running process | `ExecBackground(cmd, args?, onOut?, onExit?, options?)` | `Exec` blocks until exit |
| Unpack a `.zip` / `.tar.gz` | `UnzipZIPFile` / `UnzipTarGZFile` → output is a **directory** | — |
| Unpack a single `.gz` | `UnzipGZFile` → output is a **file** path | — |
| Turn a relative data path into an absolute one | `AbsolutePath(path)` | hand-building the path |

`OpenURI` and `OpenDir` both call the OS default handler (`browser.OpenURL`); `OpenDir` resolves its path
against the app directory, `OpenURI` takes the string as-is. `BrowserOpenURL` is the Wails runtime call
that always targets the default browser.

## Custom actions (add UI into built-in views)

`Plugins.useAppStore().addCustomActions(target, actions)` injects components into built-in views and
returns a remover. Components are configured by name with props and slots, and the props/slots values
may be functions that receive `{ h, ref }` for local reactive state.

- `target`: `'core_state' | 'title_bar' | 'profiles_header' | 'subscriptions_header'`
- `component`: any HTML tag or globally registered host component.

```js
const appStore = Plugins.useAppStore()
const remove = appStore.addCustomActions('core_state', {
  id: 'my-reset',
  component: 'Button',
  componentProps: { type: 'link', size: 'small' },
  componentSlots: { default: '重置' },
})
// appStore.removeCustomActions('core_state', 'my-reset')  // or remove()
```

## Files

`ReadFile(path, { Mode?: 'Binary' | 'Text', Range? })` · `WriteFile(path, content, options?)` (creates
parent directories) · `MakeDir(path)` · `RemoveFile(path)` (file **or** directory tree) ·
`MoveFile(src, dest)` · `CopyFile(src, dest)` · `FileExists(path)` → `boolean` ·
`FileSHA256(path)` → `string` · `ReadDir(path)` → `Array<{ name, size, isDir }>` · `OpenDir(path)` ·
`OpenURI(uri)` · `AbsolutePath(path)` → absolute path · `UnzipGZFile(gz, file)` ·
`UnzipZIPFile(zip, dir)` · `UnzipTarGZFile(targz, dir)`.

`AbsolutePath('data/third/<id>/bin')` resolves a relative path against the client's install directory;
call it before passing a path to `Exec` / `ExecBackground` so the spawned process gets an absolute
location.

## Network

`HttpGet` / `HttpHead` / `HttpDelete` `(url, headers?, options?)` and `HttpPost` / `HttpPut` /
`HttpPatch` `(url, headers?, data?, options?)` → `Promise<{ status, headers, body }>`.

- Requests go through the app's configured request proxy by default; pass `options.Proxy` to override.
- A `User-Agent` is injected; a JSON or `x-www-form-urlencoded` `Content-Type` body is encoded for you,
  and a JSON response body is parsed automatically. Use `Requests({ autoTransformBody: false })` for raw
  text.
- Defaults: `Timeout` 15s (single requests) / 20min (`Download` / `Upload`), `Redirect` true, `Insecure`
  false. Set `CancelId` and call `HttpCancel(id)` to cancel.

`Requests({ method?, url, headers?, body?, autoTransformBody?, onStream?, options? })` is the generic
form and supports SSE: `onStream` receives `{ type: 'response' | 'message' | 'done' | 'error', ... }`.
`Download(url, path, headers?, onProgress?, options?)` and `Upload(...)` stream to/from disk (progress is
`(progress, total)`); `options.Sha256` verifies a download and removes it on mismatch.
`GetRequestProxy(mode?, customProxy?)` resolves the proxy string. `TcpPing(address, options?)` returns
latency in ms; `TcpRequest` / `UdpRequest` cover raw sockets.

`RequestOptions`: `{ Proxy?, Insecure?, Redirect?, Timeout?, CancelId?, FileField?, Sha256?, Stream?,
Method? }`.

## Processes and servers

`Exec(cmd, args?, options?)` → `Promise<string>` (trimmed combined output; rejects on a non-zero exit).
A relative `cmd` is resolved against the app directory first, then falls back to a `PATH` lookup, so
system tools (`pkill`, `tar`, ...) work by name. `options` is `{ WorkingDirectory?, Env? }`.

`ExecBackground(cmd, args?, onOut?, onExit?, options?)` → `Promise<number>` (pid). `onOut(line)` receives
each output line; `onExit(err?)` fires when the process ends, with the error text when it failed.
`options` is `{ WorkingDirectory?, Env?, LogFile?, PidFile?, StopOutputKeyword? }`. `ProcessInfo(pid)` ·
`ProcessMemory(pid)` · `KillProcess(pid, timeout = 10)`.

`StartServer(address, id, handler, options?)` → `Promise<{ close }>` serves HTTP from inside the plugin.
`handler(req, res)` gets `req = { id, method, url, headers, body }` and replies with
`res.end(status, headers, body, { mode: 'Text' | 'Binary' })`. `options` exposes a folder
(`StaticPath` + `StaticRoute`, default `/static/`), accepts uploads (`UploadPath` + `UploadRoute`,
default `/upload`, `MaxUploadSize` in bytes, default 50 MB), sets headers (`StaticHeaders` /
`UploadHeaders`), and adds TLS (`Cert` / `Key`). `StopServer(id)` · `ListServer()`.

## System, window, tray, events

- Environment: `GetEnv()` / `GetEnv(key)`, `GetInterfaces()`, `IsStartup()`.
- Proxy / DNS: `GetSystemProxy()`, `GetSystemProxyBypass()`, `SetSystemProxy(enable, server,
  proxyType?, bypass?, services?)`, `SetSystemDNS(servers, services?)`.
- Clipboard: `ClipboardSetText(text)`, `ClipboardGetText()`.
- App / window: `RestartApp()`, `ExitApp()`, `ShowMainWindow()`, `OpenURI(uri)`, `BrowserOpenURL(url)`,
  `WindowReloadApp()`, `WindowHide()`, `WindowShow()`, `WindowSetAlwaysOnTop(v)`.
- Tray: `UpdateTray({ tooltip?, icon?, title?, menus? })`, `UpdateTrayMenus(menus)`,
  `UpdateTrayAndMenus(tray, menus)`.
- Events: `EventsOn(name, cb)` → unsubscribe, `EventsOnce`, `EventsOff`, `EventsEmit`, `EventsOffAll`.
- Privileges: `CheckPermissions()`, `SwitchPermissions(enable)`, `GrantTUNPermission(path)`,
  `RunWithOsaScript(cmd, args?, options?)`, `RunWithPowerShell(cmd, args?, options?)`.
- Autostart: `IsAutoStartEnabled()`, `EnableAutoStart(delay?)`, `DisableAutoStart()`.

## MMDB

`OpenMMDB(path, id)` → `{ close, query(ip, type?) }`, `CloseMMDB(path, id)`,
`QueryMMDB(path, ip, type?)`. `type` is one of `ASN | AnonymousIP | City | ConnectionType | Country |
Domain | Enterprise`.

## Stores (host state)

Each returns the live Pinia store. The most useful entry points:

- `useAppStore()` — app flags plus `addCustomActions` / `removeCustomActions`.
- `useKernelApiStore()` — `startCore()`, `stopCore()`, `restartCore()`, `running`, `pid`, `config`,
  `proxies`, `getProxyEndpoint()`, and the `onLogs` / `onMemory` / `onTraffic` / `onConnections`
  subscriptions.
- `useProfilesStore()`, `useSubscribesStore()`, `useRulesetsStore()`, `useScheduledTasksStore()` —
  `add*` / `edit*` / `delete*` / `update*` / `get*ById`; the first two also hold the node data a plugin
  usually reads (see [host-notes.md](host-notes.md)).
- `usePluginsStore()` — plugin management and the trigger entry points (`reloadPlugin`, `manualTrigger`,
  `onSubscribeTrigger`, ...).
- `useAppSettingsStore()` — `app` (theme, lang, `pluginSettings`) and `themeMode`.
- `useEnvStore()` — `env` (`basePath`, `appPath`, `os`, `arch`, `isPrivileged`) and
  `setSystemProxy` / `clearSystemProxy` / `switchSystemProxy` / `setSystemDNS`.
- `useLogsStore()` — `kernelLogs`, `scheduledtasksLogs`.

## Utilities

- Encoding: `base64Encode`, `base64Decode`, `base64UrlEncode`, `normalizeBase64`, `isValidBase64`.
- Structure: `deepClone`, `deepAssign`, `omit`, `omitArray`, `getValue`.
- Concurrency: `asyncPool(limit, array, fn)`, `createAsyncPool`.
- Timing: `sleep(ms)`, `debounce`, `throttle`, `setIntervalImmediately`.
- Formatting: `formatBytes`, `formatDate`, `formatRelativeTime`, `formatProxyHost`.
- Validation: `isValidIPv4`, `isValidIPv6`, `isValidIPCIDR`, `isValidJson`, `isValidSubYAML`,
  `isValidSubJson`, `isValidPaylodYAML`, `isValidRulesJson`, `isValidCron`, `isNumber`.
- Matching: `createTextMatcher`, `buildSmartRegExp`.
- Core / config: `generateConfig(profile, options?)`, `handleUseProxy`, `handleChangeMode`,
  `addToRuleSet(id, payloads)`, `getKernelFileName`, `getKernelRuntimeArgs`, `getUserAgent`,
  `getAppDts()`.
- Misc: `sampleID()`, `generateSecureKey(bits?)`, `ignoredError(fn, ...args)`, `reloadApp()`,
  `exitApp()`.
- Constants: `Plugins.APP_TITLE`, `APP_VERSION`, `PROJECT_URL`, `TG_GROUP`, `TG_CHANNEL`, `isDev`.
