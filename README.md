# Plugin Best Practices

An **agent skill** that teaches AI coding agents how to author, refactor, review, and build UIs for
plugins of the **GUI.for.Cores** clients — [GUI.for.Clash](https://github.com/GUI-for-Cores/Plugin-Hub)
and GUI.for.SingBox.

Plugins for these clients are single-file ESM scripts that run inside the host application's
WebView. They have their own entry and lifecycle, a value-resolving metadata proxy, a large `Plugins.*`
API, and a Vue-based UI layer built from the host's own components and utility classes. This skill packs
all of that — verified against the real host source — into a form an agent can follow without guessing.

- Repository: <https://github.com/Bubble-droid/plugin-best-practices>
- Host repository: <https://github.com/GUI-for-Cores/Plugin-Hub>
- Plugin-system tutorial: <https://gui-for-cores.github.io/zh/guide/04-plugins>

## 中文简介

这是一个给 AI 编程助手使用的**技能包（agent skill）**，用于为 GUI.for.Cores 客户端
（GUI.for.Clash / GUI.for.SingBox）编写插件。内容对照宿主真实源码整理：入口与生命周期、全部触发器
与处理器、插件元数据与用户配置、`Plugins` API、Vue 原生组件与工具类、以及真实宿主界面范示。附带
两个脚本：拉取宿主前端源码，以及把正在运行的客户端 `data` 目录链接到本地便于实时调试。

## What it covers

| Area | Reference |
| --- | --- |
| Triggers, handlers, signatures, pipeline rules, status codes | [`references/triggers.md`](skills/plugin-best-practices/references/triggers.md) |
| Lifecycle, menus and context actions, live-API probing | [`references/plugin-system.md`](skills/plugin-best-practices/references/plugin-system.md) |
| The full `Plugins` surface (dialogs, files, network, processes, stores) | [`references/plugin-api.md`](skills/plugin-best-practices/references/plugin-api.md) |
| Host Vue components, props, and the icon set | [`references/components.md`](skills/plugin-best-practices/references/components.md) |
| Static utility classes and CSS variables | [`references/styling.md`](skills/plugin-best-practices/references/styling.md) |
| Layouts the host itself uses, to copy when composing a UI | [`references/ui-patterns.md`](skills/plugin-best-practices/references/ui-patterns.md) |
| How the client loads plugins, resolves configuration, and where it keeps files | [`references/host-notes.md`](skills/plugin-best-practices/references/host-notes.md) |

The entry point is [`skills/plugin-best-practices/SKILL.md`](skills/plugin-best-practices/SKILL.md).

## Repository layout

```
.
├─ skills/
│  └─ plugin-best-practices/
│     ├─ SKILL.md            # the skill itself (frontmatter + guidance)
│     ├─ references/         # detailed specs loaded on demand
│     └─ scripts/            # companion Node tooling (not plugin code)
├─ evals/                    # test cases and reference solutions
│  ├─ evals.json
│  └─ solutions/
├─ LICENSE
├─ CHANGELOG.md
└─ README.md
```

## Install

The skill is plain Markdown plus two dependency-free scripts. Install it with the
[`skills`](https://github.com/vercel-labs/skills) CLI, which detects your coding agents:

```bash
# Install into the detected agents (project scope)
npx skills add Bubble-droid/plugin-best-practices

# Target specific agents, or install for every project
npx skills add Bubble-droid/plugin-best-practices -a opencode -a claude-code
npx skills add Bubble-droid/plugin-best-practices -g

# Or use it once without installing anything
npx skills use Bubble-droid/plugin-best-practices --skill plugin-best-practices --agent claude-code
```

Prefer to do it by hand? Copy `skills/plugin-best-practices/` into your agent's skills directory
(for example `.agents/skills/` or `.claude/skills/`), or register it in a `skills-lock.json`:

```json
"plugin-best-practices": {
  "source": "Bubble-droid/plugin-best-practices",
  "sourceType": "github",
  "skillPath": "skills/plugin-best-practices/SKILL.md",
  "computedHash": "3f5fcf3795bd40042e7a338cf2fc6e4a900761d7cdbf6b0200cc6d254a8ed2d7"
}
```

`computedHash` is the SHA-256 of `SKILL.md`; regenerate it whenever that file changes.

## Prompting

Once the skill is available, name it in your request so the agent picks it up:

```
use plugin-best-practices skill, 帮我写一个跨客户端插件：订阅更新时去掉节点名开头的 Emoji 并加前缀
use plugin-best-practices skill, build a modal that lists all profiles and subscriptions
use plugin-best-practices skill, review plugins/Generic/plugin-foo.js and fix its lifecycle handlers
use plugin-best-practices skill, add a right-click menu that starts and stops a local program
```

## Companion scripts

Both are repository tooling run with Node — they are **not** plugin code (the plugin runtime has no
Node.js APIs). Node.js 18+ is required.

```bash
# Read the real host source locally (sparse-clones the front-ends into .host-refs/)
node skills/plugin-best-practices/scripts/fetch-host-refs.mjs

# Link a running client's data directory (and optionally a plugin) into the repo
node skills/plugin-best-practices/scripts/link-host-data.mjs \
  --client clash --data /path/to/GUI.for.Clash/data --plugin my-plugin
```

- `.host-refs/` and `.client-data/` are local-only; both are gitignored by default.
- Run either script with `--help` for the full option list.

## Evaluation

[`evals/`](evals/) holds the skill's test cases and the reference solutions produced while running them:
three realistic plugin tasks (a subscription pipeline, a modal UI, and a process manager) with their
assertions. Every reference solution passed all of its assertions. See
[`evals/README.md`](evals/README.md).

## Requirements

- An agent that supports skills (any that reads a `SKILL.md`).
- Node.js 18+ — only for the companion scripts.
- A local install of GUI.for.Clash or GUI.for.SingBox — optional, for live testing.

## Contributing

Issues and pull requests are welcome. Keep the guidance aligned with the real host source, and update
`CHANGELOG.md` and the lock-file `computedHash` when `SKILL.md` changes.

## License

Released under the [GNU General Public License v3.0](LICENSE) — the same license as the GUI.for.Cores
host repository.
