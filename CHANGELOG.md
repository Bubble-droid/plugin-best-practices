# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `references/catalog.md`: the complete plugin metadata record (`App.Plugin`), its enumerable values
  (`triggers`, `status`, `group`, `type`), configuration items (including the `"label,value"` `options`
  format and the `CodeViewer` alias), and the catalog/index files and sources.
- `references/plugin-api.md`: the remaining Wails runtime surface (window control, notifications,
  logging, `Environment`), the generator/restorer helpers, and `eventBus` / `getCompletions`.
- `references/host-notes.md`: the in-app trigger test tool (`Mode: 'Dev'`) and the Dev / deprecated
  list markers.
- `references/plugin-system.md`: how menu actions reach the tray menu (the `addPluginToMenu` setting).
- `references/triggers.md`: a "run plugin" scheduled task calls `onTask`, not `onRun`.

### Changed

- `SKILL.md`: point at `references/catalog.md` and de-duplicate the material that now has a dedicated
  reference — the per-field catalog-entry bullets, the configuration `component` / `options` enumeration,
  and the host-component / `Icon` name list are replaced by concise pointers, leaving the JSON skeleton,
  the `plugin-` id convention, the version policy, and the code patterns in place.

### Fixed

- `references/components.md`: correct the `Card` header slots (`#title-prefix` / `#title-suffix` /
  `#extra`, not `#title`), and add the `Input` (`lang`, `editable`, `maxWidth`, `delay`, `#editable`
  slot), `Select` (`#empty` slot), `Tabs` (`#extra` slot), `Button` (`role`), and `Pagination`
  (`v-model:current`) details.
- `references/styling.md`: add the percentage `min-w-*` / `min-h-*` / `max-w-*` / `max-h-*` classes and
  clarify that the only bracket utilities are percentage sizes.

## [1.0.0] - 2026-10-12

### Added

- Initial release of the `plugin-best-practices` skill for authoring GUI.for.Clash and GUI.for.SingBox
  plugins.
- Skill entry (`SKILL.md`) covering the ESM entry, lifecycle, metadata and configuration, modules,
  versioning, and UI composition.
- References: triggers and handlers, the plugin system and lifecycle, the `Plugins` API, host
  components, static utility classes, host UI patterns, and host runtime notes.
- Companion scripts: `fetch-host-refs.mjs` (read the real host front-end source) and
  `link-host-data.mjs` (link a running client's data directory for live plugin development).
- `evals/`: three evaluation tasks with their assertions and the passing reference solutions
  (subscription pipeline, modal UI, and process manager).

[Unreleased]: https://github.com/Bubble-droid/plugin-best-practices/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Bubble-droid/plugin-best-practices/releases/tag/v1.0.0
