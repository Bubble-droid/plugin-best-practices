# Host components

The client registers these Vue components globally, so any plugin UI (template strings and
`Vue.h(...)` render code alike) can use them by name. `plugins/Generic/plugin-ui-example.js` is a
runnable catalogue of most of them, and the docs page lists a full markup example — read it before
hand-writing markup.

Reference them as tags in templates:

```js
Vue.defineComponent({
  template: /* html */ `
    <Card title="示例" class="mt-8">
      <div class="flex items-center gap-4">
        <Input v-model="value" placeholder="输入" />
        <Button type="primary" @click="go">确定</Button>
      </div>
    </Card>`,
  setup() { /* ... */ },
})
```

In render code resolve them through Vue instead: `Vue.h(Vue.resolveComponent('Button'), { type:
'primary' }, { default: () => '确定' })`. `MultipleSelect` is registered as an alias of `Select` (use
`multiple`); `CodeViewer` is the read-only form of `CodeEditor`.

## Component props

| Component | Key props | Notes |
| --- | --- | --- |
| `Button` | `type: 'primary' \| 'normal' \| 'link' \| 'text'`, `size: 'default' \| 'small' \| 'large'`, `icon`, `iconSize`, `iconColor`, `loading`, `disabled` | `icon` is an icon name (see below). |
| `Card` | `title`, `subtitle`, `selected`, `disabled` | Default slot is the body; a `#title` extra slot exists. |
| `Input` | `v-model`, `type: 'text' \| 'number' \| 'code'`, `placeholder`, `size`, `clearable`, `autoSize`, `allowPaste`, `autofocus`, `min`, `max`, `disabled`, `border` | Emits `change`, `update:modelValue`, `submit`; `#prefix` / `#suffix` slots. |
| `InputList` | `v-model` (`string[]`), `placeholder`, `autofocus` | A list of single-line inputs. |
| `Select` | `v-model` (`string \| string[]`), `options: { label, value }[]`, `multiple`, `border`, `size`, `placeholder`, `clearable`, `autoSize` | Use `multiple` for multi-select. |
| `CheckBox` | `v-model` (`string[]`), `options: { label, value }[]`, `size` | Multi-select. |
| `Radio` | `v-model`, `options: { label, value }[]`, `size` | Emits `change`. |
| `Switch` | `v-model`, `size`, `border: 'default' \| 'square'`, `label`, `disabled` | Default slot is an inline label. |
| `Tag` | `color: 'cyan' \| 'green' \| 'red' \| 'default' \| 'primary' \| 'orange' \| 'gold' \| 'blue' \| 'purple'`, `size`, `closeable`, `bordered` | Emits `close`. |
| `Icon` | `icon` (required), `size`, `color` | Names are fixed — see the list below. |
| `Table` | `columns: Column[]` (`{ title, key, align?, hidden?, minWidth?, sort?, customRender? }`), `dataSource: Record<string, any>[]`, `sort`, `menu` | No `width` on a column — use `minWidth`. Rows are keyed by `id`, so give each record one. `customRender` formats a cell. |
| `Tabs` | `activeKey` (required), `items: { key, tab, component? }[]`, `tabPosition: 'left' \| 'top'`, `tabWidth`, `contentWidth` | Emits `update:activeKey`. A tab body is either `component` (kept alive / cached) or a slot named after the tab's `key` (re-rendered each switch). |
| `CodeEditor` | `v-model`, `editable`, `lang: 'json' \| 'javascript' \| 'yaml' \| 'css'`, `mode: 'editor' \| 'diff'`, `placeholder`, `plugin` | |
| `CodeViewer` | `v-model`, `lang`, `copyable` | Read-only viewer. |
| `KeyValueEditor` | `v-model` (`object`), `placeholder: [string, string]` | |
| `Dropdown` | `trigger: ('click' \| 'hover')[]`, `placement: 'bottom' \| 'top'`, `delay` | Overlay items go in the `#overlay` slot. |
| `ResourceSelect` | `type: 'profile' \| 'subscription' \| 'ruleset' \| 'plugin' \| 'scheduledtask'`, `title`, `cols`, `min`, `max`, `renderSlot`, `openImmediate` | `v-model` is `string[]`; emits `change` / `submit`. Picks from host resources. |
| `Empty` | `icon`, `iconSize`, `description` | |
| `Pagination` | `total` (required), `size`, `pageSize` | |
| `Progress` | `percent`, `status: 'primary' \| 'warning' \| 'danger'`, `type: 'circle' \| 'line'`, `radius` | |
| `Divider` | — | |
| `ScrollView` | — | |
| `ColorPicker` | `disabled` | Emits `change`; `#prefix` / `#suffix` slots. |
| `InterfaceSelect` | `border` | Network interface picker. |
| `MarkdownViewer` | `content` (required) | |
| `TrafficChart` | `series: number[][]`, `height`, `padding`, `legend` | |
| `Modal`, `ModalContainer`, `CustomAction`, `Confirm`, `Prompt`, `Picker`, `Menu`, `Message`, `Tips` | — | Usually driven through `Plugins.modal` / `Plugins.confirm` / `Plugins.prompt` / `Plugins.picker` rather than used directly. |

## Easy to get wrong

- `Table` columns have no `width`; use `minWidth`, and give every `dataSource` row an `id` (rows are keyed by it).
- `Tabs.items` uses `tab` (not `label`) for the caption, and requires `activeKey`; feed a tab body through `component` or a slot named after its `key`.
- `Select` / `CheckBox` options are `{ label, value }[]`; `CheckBox` binds a `string[]` (`Select` with `multiple` does too).
- Only use props that appear in the table above — do not invent extras such as a `width` column, a `theme`, or an unknown `mode`.
- Strings you pass as titles/labels in `Table` and `Tabs` go through the host i18n `t()`; a literal string still renders because an unknown key falls back to itself.

## Icon names

`Icon` accepts only names defined by the host. The current set:

```
messageSuccess messageError messageInfo messageWarn clear overview profiles subscriptions
rulesets plugins scheduledTasks settings arrowDown arrowLeft arrowRight clear3 disabled empty reset
telegram search copy paste link loading log minimize maximize maximize2 minimize2 adjust more pinFill
pin preview refresh restartApp restart rollback selected settings2 settings3 sparkle speedTest stop
add clear2 close code collapse delete drag edit error expand file filter folder forbidden backward
pause play forward github grant
```

There is no `user`, `star`, `check`, or `warning` icon — pick from the list (or read the host's
`components/Icon/icons.ts` after fetching the host sources) instead of inventing a name.

## Style scope

Native components bring their own styling. Prefer composing them over hand-written markup, and prefer
their slots over duplicating structure. When you must write raw elements, style them with the host
utility classes — see [styling.md](styling.md) for the vocabulary and [ui-patterns.md](ui-patterns.md)
for how the pieces combine into the host's own screens.
