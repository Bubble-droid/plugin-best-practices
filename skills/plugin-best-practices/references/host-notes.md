# Host runtime notes

How the client turns a plugin file into running handlers, and how to test against a real client. This
explains *why* some conventions exist; the authoritative code is `frontend/src/stores/plugins.ts` in
the host source (fetch it with `scripts/fetch-host-refs.mjs`). Both clients share the same plugin
runtime, so one plugin and one spec apply to GUI.for.Clash and GUI.for.SingBox alike.

## Loading a plugin

1. The client reads the plugin source with `ReadFile(path)`, or downloads it from `url` when
   `type` is `Http` (the downloaded code is then written to `path`).
2. It rewrites top-level `const <event> = ...`, `function <event>`, and `async function <event>`
   declarations for known event names into `export` declarations. This is what keeps the legacy
   `const onRun = () => {}` style working.
3. It prepends `const Plugin = <metadata proxy>` and evaluates the module from a **Blob URL** via
   `import()`. Because there is no module resolver behind a Blob URL, relative imports
   (`import './x.js'`) fail — load local helpers by reading them through `Plugins.ReadFile` and
   importing a Blob URL, or use an absolute URL. See the *Modules* section in the SKILL.
4. It reads `module.default`. If the default export is a function it is called once with the metadata
   proxy and must return the handlers object (this caches the instance until the source is reloaded);
   a plain object default export is used as-is. Named exports are a fallback — when an event exists
   both as a named export and on the returned object, the object wins (with a console warning).

Because the default export is invoked lazily (on the first event) and cached, put setup that must run
regardless of triggers in `onInstall`, not at module top level.

## The metadata / configuration proxy

Inside every handler, `plugin` (the entry argument, or the legacy global `Plugin`) is the metadata
proxy. Reading a property:

1. If the name is a field of the plugin record (`id`, `name`, `version`, `triggers`, ...), that value.
2. Otherwise the name is looked up in the configuration map, which is `catalog.configuration[].value`
   overridden by the user's saved settings for that plugin.

So `plugin.ApiUrl` returns the configured value, and adding a `configuration` item named `ApiUrl` is
all that is needed to expose a setting. The map is rebuilt at most once per second.

All reads are wrapped in `readonly`. Writing any property except `status` logs a warning and does
nothing; `plugin.status = 1` is the supported way to persist a status change from inside a handler.

## Reading the client's data

Prefer the live stores over re-reading files:

- **Subscriptions** — `useSubscribesStore().subscribes`. Each record's `subscription.proxies` is the
  in-memory node list (`{ id, name, type }[]`) the UI shows, so `subscription.proxies.length` is the
  node count. When the host has written the subscription to disk, `subscription.path` mirrors the full
  node list; fall back to reading that file only when `proxies` is empty (a subscription that has not
  been refreshed this session).
- **Profiles** — `useProfilesStore().profiles`, each carrying `advancedConfig`, `tunConfig`, and the rest.
- **The running core** — `useKernelApiStore()` for `getProxyEndpoint()`, `startCore` / `stopCore`, and
  the connection / traffic subscriptions.

Write plugin-generated data under `data/third/<id>/` and remove it in `onUninstall`.

## Paths

| Path | Purpose |
| --- | --- |
| `data/plugins.yaml` | The installed-plugin registry (id, url, path, triggers, menus, configuration, ...). |
| `data/plugins/<id>.js` | The installed plugin script for `type: 'Http'` / default plugins. |
| `data/.cache/plugin-list.json` | Cached plugin-hub catalog from the configured sources. |
| `data/profiles.yaml`, `data/subscribes.yaml`, `data/rulesets.yaml`, `data/scheduledtasks.yaml` | The user's profiles, subscriptions, rulesets, and scheduled tasks. |
| `data/subscribes/<id>.yaml` | A subscription's persisted node list, when one has been written. |
| `data/user.yaml` | User preferences. |
| `data/third/<id>/` | Where a plugin bundles third-party tools and shared modules. |

These are relative to the client's install directory (where the executable lives); use
`Plugins.AbsolutePath('data/...')` to turn one into an absolute path before passing it to `Exec` /
`ExecBackground`.

## Installing against a client

Adding a plugin through the client UI writes the registry entry, stores the script under
`data/plugins/`, and calls `onInstall`. From then on, editing the *stored* script and reloading the
plugin is the fast loop. `scripts/link-host-data.mjs` connects a repository file to that stored script
so edits in the repo are what the client runs.

## Hot-reload UI development

The dev-helper workflow (iterate on a UI without reinstalling) is described under *Hot-reload
development loop* in the SKILL.

## Reference examples in this repository

These are legacy-style (`const onRun = ...`) but remain the best runnable references for their areas:

- `plugins/Generic/plugin-ui-example.js` — a catalogue of host components, slots, and the modal model.
- `plugins/Generic/plugin-configuration-example.js` — every configuration `component` type.
- `plugins/Generic/plugin-node-convert.js` — loading a local module through a Blob URL.

Read them with fresh eyes: mirror their structure, but write new plugins with the ESM entry described
in the SKILL.
