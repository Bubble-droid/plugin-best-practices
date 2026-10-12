# Plugin metadata and the catalog

A plugin's metadata and user options live in its **catalog entry**, not in the source. This reference
documents the complete record the client stores — every field, its enumerable values, and how the client
uses it — plus the catalog (index) files that distribute entries.

Authoritative source, in the host front-end:

- `src/types/app.d.ts` → `interface Plugin` (the full record).
- `src/enums/app.ts` → `PluginTrigger` (catalog values) and `PluginTriggerEvent` (handler names).
- `src/views/PluginsView/components/PluginConfigItem.vue` → how `configuration` renders.
- `src/stores/plugins.ts` → loading, installing, updating, and the hub.
- `src/constant/app.ts` → default catalog sources and file paths.

The copy in the repository's root `plugins.d.ts` (`type PluginMetadata`) is a quick reference; it omits a
few fields (`group`, `disabled`) and lists `component` as a plain `string`.

## The plugin record

```ts
interface Plugin {
  id: string
  version: string            // "vx.y.z"
  name: string
  description: string
  type: 'Http' | 'File'
  url: string
  path: string
  triggers: ('on::enabled' | 'on::disabled' | 'on::manual' | 'on::subscribe' | 'on::generate'
    | 'on::startup' | 'on::shutdown' | 'on::ready' | 'on::reload' | 'on::core::started'
    | 'on::core::stopped' | 'on::before::core::start' | 'on::before::core::stop'
    | 'on::tray::update')[]
  tags: string[]
  hasUI: boolean
  group: string
  menus: Record<string, string>
  context: {
    profiles: Record<string, string>
    subscriptions: Record<string, string>
    rulesets: Record<string, string>
    plugins: Record<string, string>
    scheduledtasks: Record<string, string>
  }
  configuration: {
    id: string
    title: string
    description: string
    key: string
    component: 'CheckBox' | 'CodeEditor' | 'Input' | 'InputList' | 'KeyValueEditor' | 'Radio'
      | 'Select' | 'MultipleSelect' | 'Switch' | 'ColorPicker' | ''
    value: any
    options: any[]
  }[]
  disabled: boolean
  status: number             // 0: Normal  1: Running  2: Stopped
  // runtime only, not persisted:
  updating?: boolean
  loading?: boolean
  running?: boolean
}
```

### Field notes

- **`id`** — kebab-case, matches the plugin filename. An id starting with **`plugin-`** is treated as
  managed by the Plugin-Hub: updates look it up in the hub by id, and the client reserves the prefix
  convention. Use `plugin-<name>` for anything distributed through a catalog.
- **`type`** — how the client obtains the code:
  - `Http`: `GET url`, then write the body to `path`. This is the normal type for catalog plugins.
  - `File`: read the code from `path` directly, no download. Use it for a plugin that already ships with
    the app or is edited in place.
- **`path`** — the app-side install location, by convention `data/plugins/<id>.js`. The form placeholder
  for local plugins is `data/local/plugin-{filename}.js`. A plugin's stored script is deleted on removal
  when `path` is under `data/`.
- **`url`** — the exact raw GitHub URL of the plugin file (required when `type` is `Http`).
- **`group`** — the section heading under which the hub lists the plugin. The hub orders known groups as
  `Recommended`, `Extensions`, `Tools`, `Fun`, `Examples`, `Development`, then any others; a blank group
  becomes `Others`.
- **`tags`** — free-form labels; the hub search matches `id`, `name`, and `description`.
- **`hasUI`** — marks the plugin as having a UI (the installed card shows a sparkle icon). Purely
  informational; it does not change loading.
- **`status`** — `0` Normal, `1` Running, `2` Stopped. Handlers return a number to set it (see
  [triggers.md](triggers.md)); it is the one writable property on the metadata proxy and is shown as a
  status dot on the card (`1` green, `2` red).
- **`disabled`** — set by the user; a disabled plugin's trigger handlers are skipped.
- **`menus` / `context`** — map a right-click label to the name of an extra function the entry returns.
  `menus` is the plugin-list/context menu; `context.<kind>` places the same for a resource kind and
  passes the clicked resource to the handler. See [plugin-system.md](plugin-system.md).

### Triggers

`triggers` is the set of events the plugin opts into; the client maps each to a handler name via
`PluginTrigger` → `PluginTriggerEvent`. The catalog UI offers these **12**:

`on::manual` · `on::startup` · `on::ready` · `on::reload` · `on::shutdown` · `on::generate` ·
`on::subscribe` · `on::tray::update` · `on::before::core::start` · `on::core::started` ·
`on::before::core::stop` · `on::core::stopped`

The enum also defines **`on::enabled`** and **`on::disabled`**, but they are deliberately absent from the
selectable list — enable/disable are wired automatically, together with `onInstall`, `onUninstall`,
`onDispose`, `onConfigure`, and `onTask`, none of which are ever listed in `triggers`. The full
trigger-to-handler table and signatures are in [triggers.md](triggers.md).

### Version and updates

`version` is `vx.y.z`, incremented by the policy in the SKILL (metadata change → major, feature → minor,
fix → patch). When the user updates an installed hub plugin the client compares the two versions:

- **major** differs → the whole entry is replaced and the user's saved configuration is merged back in
  per `key`, keeping their value only when its type still matches the new default;
- **minor** or **patch** differs → only `version` is bumped on the installed record.

The code is then re-fetched (`Http`) or re-read (`File`), the module cache is reset, and observers are
re-synced.

## Configuration items

Each `configuration[]` entry renders one settings row and becomes a readable property on the plugin's
metadata proxy under its `key` (`plugin.<key>`). The user's saved values override `value`; a value the
user has changed is highlighted and can be reset per item.

| Field | Meaning |
| --- | --- |
| `id` | Arbitrary unique id for the item (examples use `ID_xxxx`); not exposed to the plugin. |
| `title` | Row label. |
| `description` | Helper text under the label. |
| `key` | The property name the handler reads via `plugin.<key>`. Must be unique per plugin. |
| `component` | Which editor to render (see below). |
| `value` | Default value, and the type the plugin receives. |
| `options` | Choices for the option-based components. |

`component` values and the JavaScript type each yields:

| `component` | Value type | Notes |
| --- | --- | --- |
| `Switch` | `boolean` | On/off. |
| `CheckBox` | `string[]` | Multi-select from `options`. |
| `MultipleSelect` | `string[]` | Dropdown multi-select; use when `options` is long. |
| `Radio` | `string` | Single choice from `options`. |
| `Select` | `string` | Dropdown single choice; use when `options` is long. |
| `Input` | `string` | Single-line text. |
| `CodeEditor` | `string` | Multi-line editor (also accepts the legacy alias **`CodeViewer`**). |
| `InputList` | `string[]` | Editable list of strings. |
| `KeyValueEditor` | `object` | Key/value map. |
| `ColorPicker` | `string` | Color value. |
| `''` | — | Accepted by the type but renders no editor. |

`options` is a `string[]`. Each item is either a bare value or `"label,value"` (split on the first comma;
without a comma the value doubles as the label). This is how a `Select`/`Radio` can show a friendly label
while returning a different value:

```json
{ "component": "Select", "key": "Endpoint", "value": "https://a.example",
  "options": ["Primary,https://a.example", "Backup,https://b.example"] }
```

Use `plugins/Generic/plugin-configuration-example.js` and its catalog entry as the runnable reference for
every component.

## Where records are stored

Paths are relative to the client's install directory (where `data/` lives):

| Path | Contents |
| --- | --- |
| `data/plugins.yaml` | The **installed-plugin registry** — an array of the `Plugin` records above. |
| `data/plugins/<id>.js` | The installed script for `type` `Http` / default plugins. |
| `data/.cache/plugin-list.json` | The **plugin-hub index** — an array of catalog entries merged from the sources. |

Both `plugins.yaml` and `plugin-list.json` are arrays of the same record shape; `plugin-list.json` is a
cache the client rewrites whenever the hub is refreshed.

## The catalog (index)

A catalog file is simply **a JSON array of entries**. In this repository the files are
`plugins/generic.json`, `plugins/gfc.json`, `plugins/gfs.json`, and `plugins/nsfw.json` (the last lists the
plugins under `plugins/Extra/`). Search the plugin `id` across all of them before editing.

### Sources

The client does not read one fixed catalog. `app.plugins.sources` is a list of
`{ enable, name, url }`, and the defaults are:

| name | url |
| --- | --- |
| `General` | `.../plugins/generic.json` |
| the app title (`GUI.for.Clash` / `GUI.for.SingBox`) | `.../plugins/gfc.json` / `.../plugins/gfs.json` |

So `generic.json` is shared and each client adds its own file. `nsfw.json` is **not** a default source —
a user opts in by adding it. Refreshing the hub fetches every enabled source, `JSON.parse`s each as an
array, **concatenates** them, and writes the result to `data/.cache/plugin-list.json` (a source that
fails to parse is skipped). The hub UI groups the merged entries by `group` and installs one by `id`.

### Versioning in the catalog

Keep the entry's `version` in step with the change (see the SKILL). Because the installed copy and the
hub entry are separate records, forgetting to bump `version` means users are never offered the update.
