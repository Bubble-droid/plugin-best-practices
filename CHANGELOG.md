# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
