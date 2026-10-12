---
name: plugin-best-practices
description: >
  Authoring plugins for the GUI.for.Cores clients (GUI.for.Clash, GUI.for.SingBox): single-file
  ESM plugins under plugins/, the entry and lifecycle handlers, metadata and user configuration,
  catalog entries, and UIs composed from the host's Vue components and utility classes. Use when
  writing, refactoring, or reviewing a plugin; wiring its triggers, menus, or configuration;
  building or fixing a plugin UI (Plugins.modal, host components, styling, hot-reload preview);
  or adding a plugin to a catalog.
---

# Plugin Best Practices

How to author plugins for the GUI.for.Cores clients. Repository-wide conventions — layout,
formatting, commands, commit rules — live in the repository's root `AGENTS.md`; this skill covers the
plugin code itself: the entry and lifecycle, metadata and configuration, catalog entries, and UI.

## Start here

Read the bundled references as the task needs them — they hold the exhaustive material this SKILL only
summarizes:

- `references/triggers.md` — every trigger and handler, the exact signatures, pipelines, and status codes.
- `references/plugin-system.md` — lifecycle, menus and context actions, a full hook example, and how to
  probe the live API.
- `references/plugin-api.md` — the full `Plugins` surface (dialogs, files, network, processes, stores).
- `references/components.md` — host components, their props, and the icon set.
- `references/styling.md` — the exact utility classes and CSS variables.
- `references/ui-patterns.md` — the layouts the host itself uses (settings rows, list/grid pages, modal
  forms, status feedback) to copy when composing a plugin UI.
- `references/catalog.md` — the plugin record and the catalog/index model: every metadata field, its
  enumerable values, configuration items, and the catalog sources.
- `references/host-notes.md` — how the client loads plugins, resolves configuration, and where files live.

Helper scripts (run with Node; they are repository tooling, not plugin code):

- `scripts/fetch-host-refs.mjs` — sparse-clone the GUI.for.Clash / GUI.for.SingBox front-ends into
  `.host-refs/` (gitignored) so the real components, styles, stores, and bridges can be read locally.
  Useful when the workspace does not already carry the host sources.
- `scripts/link-host-data.mjs` — link a running client's `data` directory (and optionally a plugin file)
  to the repository so edits in the repo are what the client runs.

The official plugin-system tutorial (Chinese) is at <https://gui-for-cores.github.io/zh/guide/04-plugins>.

If this workspace also provides skills for Vue, JavaScript/TypeScript, UI/UX or web design, or testing,
load and follow them alongside this skill — they cover general technique this skill deliberately does not
repeat.

## Runtime constraints

- Plugins run in the host app's **browser/WebView, not Node.js**. `require`, `process`, `fs`, `path`,
  `child_process`, `Buffer`, `__dirname`, `module` and other Node built-ins do not exist.
- Injected globals: **`Plugins`** (the host API), **`Vue`** (Vue 3: `ref`, `h`, `defineComponent`,
  `resolveComponent`, ...), plus `AsyncFunction`, `wails` / `WailsInvoke`. The loader also injects a
  global `const Plugin` for legacy top-level handlers; an ESM plugin receives the same object as its
  argument instead and should name it `plugin`. The usual browser globals (`window`, `document`,
  `fetch`, `WebSocket`, timers) are available too.
- **All I/O goes through `Plugins.*`** — files, network, processes, servers, dialogs, and host stores.
  Prefer these helpers over reimplementing them. The grouped surface is in `references/plugin-api.md`;
  `plugins.d.ts` is the quick type reference, while the host frontend (fetch it with
  `scripts/fetch-host-refs.mjs`) is authoritative for exact signatures and runtime behaviour.
- **Keep the source readable.** A plugin is a plain script the host reads and a user can inspect —
  never obfuscate or encrypt it.

## Plugin shape: one file, ESM entry

New and refactored plugins are a single `.js` file whose default export is the entry; the legacy
top-level `const onRun = ...` + global `Plugin` style is tolerated for existing files but deprecated.
The canonical entry and every handler template (each introduced by its standard trigger comment) are
in `references/triggers.md` — build from them instead of writing handler signatures from memory.

```js
/** @type {EsmPlugin} */
export default (plugin) => {
  const onRun = async () => {
    Plugins.message.info(`插件 ${plugin.name} 已运行`)
    return 0
  }
  const onInstall = async () => {
    /* create data dirs, download resources, start servers */
    return 0
  }
  const onUninstall = async () => {
    /* remove everything onInstall created */
    return 0
  }
  const onDispose = () => {
    /* cancel timers, close modals, stop servers */
    return 0
  }
  return { onRun, onInstall, onUninstall, onDispose }
}
```

- The entry argument carries metadata and configuration: `plugin.id`, `plugin.name`,
  `plugin.version`, and one property per catalog `configuration` key.
- Handlers are arrow-function properties of the returned object. Extra exported functions become
  context-menu actions when the catalog `menus` / `context` fields map a label to them.
- Keep state and helpers **inside the entry closure**; expose to module scope only constants (URLs,
  defaults, lookup tables). Handlers may return a numeric status or nothing.
- **Prefer arrow functions** for handlers, helpers, and callbacks (`const onRun = async () => {}`),
  matching the host codebase. Reserve `function` / method syntax for the rare member that needs its own
  `this` or `super`.

## Triggers and lifecycle

`triggers` in the catalog entry names the events the plugin opts into; the client maps each to a handler
name. `onInstall`, `onUninstall`, `onEnabled`, `onDisabled`, `onDispose`, `onConfigure`, and `onTask` are
wired automatically and must not be listed in `triggers`. The full table — signatures, what each handler
receives and returns, pipeline rules, and status codes — is in `references/triggers.md`.

- Adding a plugin calls `onInstall`; removing it calls `onUninstall`; disabling / enabling calls
  `onDisabled` / `onEnabled`. Release runtime resources (timers, servers, modals) in `onDispose` so a
  disable or remove leaves nothing running.
- The four pipeline triggers (`onSubscribe`, `onGenerate`, `onBeforeCoreStart`, `onTrayUpdate`) must
  return their value; the client passes it to the next plugin and errors out on the wrong shape.

## Modules

There is no module resolution: `import './sibling.js'` fails at runtime (the loader explains why in
`references/host-notes.md`). Dynamic import works for **absolute-URL remote modules**, and for a **local
file read through the plugin API and turned into a Blob URL**:

```js
const source = await Plugins.ReadFile(path)
const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
try { return await import(url) } finally { URL.revokeObjectURL(url) }
```

## Configuration

Catalog configuration items surface on `plugin.<key>`; coerce and default them instead of trusting the
raw value. The proxy that backs `plugin` is read-only except for `status` — see
`references/host-notes.md` for how values resolve.

```js
const configValue = (key, fallback = '') => {
  const raw = plugin[key]
  if (typeof raw === 'string') return raw.trim() || fallback
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw).trim() || fallback
  return fallback
}
const apiUrl = configValue('ApiUrl', 'https://example.com')
```

The available `component` values, the `options` `"label,value"` format, and the JavaScript type each
component yields are in `references/catalog.md`; `plugins/Generic/plugin-configuration-example.js` and
its catalog entry are a runnable reference for all of them.

## Catalog entry

A plugin's metadata, options, triggers, and menus live in its catalog entry, not in the source. Plugins
under `plugins/Extra/` are listed in `plugins/nsfw.json`; search the plugin `id` across the catalogs
before editing.

Entry fields: `id` (kebab-case, matches the filename), `name`, `version` (`vx.y.z`), `group`,
`description`, `tags`, `type` (`Http` | `File`), `url`, `path`, `triggers`, `hasUI`, `menus`,
`context`, `status`, `configuration`. Every field, its enumerable values, and the catalog/index files and
sources are documented in `references/catalog.md`.

```json
{
  "id": "plugin-example-name",
  "name": "插件示例",
  "version": "v1.0.0",
  "group": "Extensions",
  "description": "做了什么",
  "tags": ["标签"],
  "type": "Http",
  "url": "https://raw.githubusercontent.com/GUI-for-Cores/Plugin-Hub/main/plugins/Generic/plugin-example-name.js",
  "path": "data/plugins/plugin-example-name.js",
  "triggers": ["on::manual"],
  "hasUI": true,
  "menus": { "打开面板": "openPanel" },
  "context": { "profiles": {}, "subscriptions": {}, "rulesets": {}, "plugins": {}, "scheduledtasks": {} },
  "status": 0,
  "configuration": []
}
```

- `id` should start with `plugin-` for a plugin distributed through a catalog — that prefix is what marks
  it as hub-managed when the client looks up updates.
- Version policy: metadata change → major (`v1.4.2` → `v2.0.0`), new feature → minor
  (`v1.4.2` → `v1.5.0`), bug fix → patch (`v1.4.2` → `v1.4.3`); keep the catalog version in sync.

Every other field — `type`, `url` / `path`, `group`, `status`, `triggers`, `hasUI`, `menus` / `context`,
and `configuration` — is documented with its values in `references/catalog.md` (triggers also in
`references/triggers.md`, menus in `references/plugin-system.md`).

## Building plugin UI

UI is Vue 3 rendered from **string templates** (there is no SFC build pipeline). Compose with the
host's globally registered native components and static utility classes — not hand-written markup
and custom CSS.

**Match the host.** A plugin UI should read as part of the app: use the host's components, spacing,
type scale, and theme colours, and keep decoration to a minimum — no gradients, custom shadows,
decorative animations, or custom fonts. Prefer a plain, functional look over a novel one; when a layout
is unclear, copy the nearest built-in page rather than inventing one. `references/ui-patterns.md`
distills the layouts the host itself uses (settings rows, list/grid pages, modal forms, status
feedback) — start there.

### Three construction avenues

1. **Lightweight dialogs.** `Plugins.alert`, `Plugins.prompt`, `Plugins.confirm`, `Plugins.picker`,
   `Plugins.message` for simple inputs, choices, and feedback — no component needed.
2. **Modal UI — the standard path.** One or more `Vue.defineComponent({ template, setup })` string
   components hosted in a `Plugins.modal(...)` instance. Covers forms, tables, lists, dashboards.
   `plugins/Generic/plugin-ui-example.js` is a runnable catalogue of the components and the modal slot
   model.
3. **Embedded page/server.** `Plugins.StartServer` (with `options.StaticPath` for static assets)
   serves HTML/APIs from inside the plugin; open a browser page with `Plugins.OpenURI` when a real web
   page is needed (dashboards, file servers, APIs).

### Host components

Prefer the host's globally registered components over hand-written markup. Reference them by tag name in
templates (`<Card>`, `<Button>`); in render calls use the Vue helpers
(`Vue.h(Vue.resolveComponent('Button'), ...)`). Keep templates simple — avoid extra nesting and wrapper
elements.

The full component set, their props and slots, the easy-to-get-wrong fields, and the fixed `Icon` name
list are in `references/components.md`. Do not invent a prop or an icon name: `Icon` in particular only
accepts the host's names (there is no `user` or `star` icon).

### Styling

Use the host's **static utility classes** only. There is no runtime CSS engine: no arbitrary values, no
`hover:` variants, and no `opacity-*` / `animate-*` / `size-*`. The exact families and value scales are
in `references/styling.md`. When a utility does not fit, use a small inline `style` attribute or a host
CSS variable (`var(--primary-color)`, `var(--divider-color)`, `var(--card-bg)`,
`var(--btn-primary-color)`) rather than adding global CSS. Shared layout classes such as `form-item`
and `form-action` are safe to reuse; `references/ui-patterns.md` shows how they and the components
combine into the host's own screens.

### The modal pattern

`Plugins.modal(options, slots)` renders a modal and returns an API with `open()`, `close()`,
`destroy()`, `setProps(...)`, `patchSlots(...)`, and `setContent(comp, props, slots, replace)`. A modal
**destroys itself on close** by default, so nothing needs to outlive the call that opens it: build the
component, call `.open()`, and let the host tear it down. Bind the returned API to a **local `const`
inside the entry closure** (or a local inside the opener) — never a module-level variable, whose stale
reference would point at a destroyed modal. Keep the component and its helpers inside the entry closure
too; module scope is for constants only.

Modal text (`title`, `cancelText`, `submitText`) is passed through the host's i18n `$t`, whose defaults
are the keys `common.save` / `common.cancel`. Passing a literal string works (an unknown key resolves to
itself), but a `common.*` key or a literal Chinese label is the idiomatic choice.

```js
const QUERY_URL = 'https://example.com/data.json' // module scope: constants

export default (plugin) => {
  const openPanel = () => {
    const { defineComponent, ref } = Vue

    const component = defineComponent({
      template: `
      <Card title="示例" class="mt-8">
        <div class="flex items-center gap-4">
          <Input v-model="keyword" placeholder="搜索" />
          <Button type="primary" @click="search">搜索</Button>
        </div>
      </Card>`,

      setup() {
        const keyword = ref('')
        const search = () => Plugins.message.info(`搜索: ${keyword.value}`)
        return { keyword, search }
      }
    })

    // per-open local: auto-destroyed with the modal
    const modal = Plugins.modal(
      { title: '我的插件', width: '60', height: '60', submit: false },
    )
    modal.setContent(component).open()
  }

  const onRun = () => {
    openPanel()
    return 0
  }

  return { onRun }
}
```

`options` supports `title`, `submit` / `cancel` booleans (with `submitText` / `cancelText`), percentage
`width` / `height` (clamped by the host), `maskClosable`, `px` / `py`, `toolbar: { maximize, minimize }`,
and `afterClose` / `afterDestroy` callbacks. `slots` supplies `title`, `toolbar` (header actions),
`action` (bottom), `cancel`, `submit`, and `default` (body). `setContent(comp, props, slots, replace)`
swaps the body; a component can `expose({ modalSlots })` so the modal picks its slots up automatically.
To close from inside, call `modal.close()` through the same closure — do not stash the API at module scope.

### Hot-reload development loop

`plugins/Generic/plugin-ui-dev-helper.js` (with its template
`plugins/Resources/plugin-ui-dev-helper/plugin-ui-template.html`) iterates on UI without reinstalling:

1. Configure a `Token` on the plugin, set the same `Token` inside the downloaded app-side template,
   then run the helper's `onRun`. It downloads `hotreload.js` + `plugin-ui-template.html` into
   `data/third/plugin-ui-dev-helper/` and starts a server on `127.0.0.1:28888`.
2. Open the **downloaded app-side** template in VS Code with the Live Server extension. `hotreload.js`
   watches the `#template` and `#script` blocks and POSTs them to the plugin's server; every save
   re-renders the preview modal.
3. Edit only the downloaded app-side file — the copy under `plugins/Resources/` is just the seed.
   When the UI is final, move its `template` and `setup` into the plugin as
   `Vue.defineComponent({ template, setup })`.
