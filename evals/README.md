# Evaluation samples

Test cases and reference solutions for the `plugin-best-practices` skill. They serve two purposes:

- **Demonstrate expected output** — each `solutions/<case>/` is a complete plugin produced *with* the
  skill, so you can see the shape the guidance is meant to produce.
- **Smoke-test the skill** — run the prompts (with the skill available) and compare the result against
  the reference solution and its assertions.

## `evals.json`

Three realistic tasks, each with an 8-item assertion list:

| # | Case | Exercises |
| --- | --- | --- |
| 0 | `subscribe-rewrite` | `onSubscribe` pipeline, `configuration`, catalog entry and versioning |
| 1 | `modal-ui` | `Plugins.modal`, host components, stores, allowed utility classes |
| 2 | `process-manager` | `onInstall` / `onUninstall` / `onDispose`, `menus`, status codes, `data/third` |

## `solutions/<case>/`

```
0-subscribe-rewrite/   plugin-node-name-prefix.js         + catalog-entry.json + grading.json
1-modal-ui/            plugin-profiles-and-subscriptions.js + catalog-entry.json + grading.json
2-process-manager/     plugin-local-app-manager.js        + catalog-entry.json + grading.json
```

- `plugin-*.js` — the plugin the agent wrote with the skill loaded.
- `catalog-entry.json` — the matching catalog entry (configuration, triggers, menus, …).
- `grading.json` — the assertion results for that run.

All three solutions passed **8/8** assertions (`grading.json` → `summary`).

> These are reference outputs captured in a test sandbox. The `url` / `path` fields in the catalog
> entries are illustrative — the plugins were not published to the host Plugin-Hub.

## Running the cases

1. Make the skill available to your agent (see the top-level [README](../README.md#install)).
2. Give the agent the `prompt` text from `evals.json`, worded as
   `use plugin-best-practices skill, <prompt>`.
3. Check the produced plugin and catalog entry against the `solutions/<case>/` reference and the
   `expectations` list.
