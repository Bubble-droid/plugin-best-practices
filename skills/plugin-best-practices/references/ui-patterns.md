# UI patterns

A plugin's UI should look like it was built by the same team that built the app. The host's own
screens are the style guide: **match their components, layout, spacing, typography, and colours, and
keep decoration to a minimum.** Reach for a host component before hand-writing an element, reuse the
host's spacing/type scale and CSS variables, and when a layout is unclear, copy the closest built-in
page instead of inventing one. Consistency reads as polish; novelty reads as a bug.

This file is about *composition* — how the host assembles its screens. The component APIs are in
[components.md](components.md) and the class/colour vocabulary is in [styling.md](styling.md).

## The look, in one screen

- **Everything interactive is a host component** — `Button`, `Input`, `Switch`, `Select`, `Table`, ...
  Never a bare `<button>` / `<input>`, and never custom CSS for a control the host already ships.
- **Group with `Card`** — cards are the unit of a settings page; give each a `title`.
- **Follow the host's rhythm** — section header `px-8 py-12 text-18 font-bold`; a settings row
  `px-8 py-12 flex items-center justify-between`; the label `text-16 font-bold`; a hint as
  `<span class="font-normal text-12">`; related controls in `flex items-center gap-4`; stack cards with
  `gap-16` or `class="mt-8"`.
- **Take colour from the theme** — `var(--primary-color)`, `var(--card-bg)`, `var(--divider-color)`, not
  literals, so both themes work.
- **No non-essential flourish** — no gradients, custom shadows, decorative animations, or custom fonts.
  (The utility set has no `animate-*` / `opacity-*` / `hover:` variants anyway.)

## Page / section shell

A built-in settings tab is a bold section title followed by one or more cards:

```html
<div class="px-8 py-12 text-18 font-bold">插件设置</div>

<Card>
  <div class="px-8 py-12 flex items-center justify-between">
    <div class="text-16 font-bold">
      启用 <span class="font-normal text-12">(修改后需重启)</span>
    </div>
    <Switch v-model="enabled" />
  </div>
</Card>
```

A full-page view is a `Tabs` with `class="h-full"`, `tab-width="15%"` and `content-width="85%"`, and an
`#extra` slot for a top-right action.

## Settings / form rows

The most common plugin UI. The host's own plugin-configuration screen sets the template: one `Card` per
option, a numbered `title`, a short description, then the control:

```html
<div class="flex flex-col gap-8">
  <Card
    v-for="(conf, i) in plugin.configuration"
    :key="conf.id"
    :title="`${i + 1}. ${conf.title}`"
  >
    <div class="mb-8 text-12">{{ conf.description }}</div>
    <Component
      :is="conf.component === 'CodeViewer' ? 'CodeEditor' : conf.component"
      :model-value="model[conf.key] ?? conf.value"
      @change="(v) => (model[conf.key] = v)"
    />
  </Card>
</div>
```

A single-option card, or a row inside one card, uses the label/value row pattern above. Put a
secondary action — reset, copy, open — in the card's `#extra` slot (it is right-aligned via `ml-auto`).
`form-item` (label/value row) and `form-action` (right-aligned action row) are ready-made shared classes.

## List / grid page

The subscriptions screen is the model: an empty state *or* a header row plus a grid/list body.

```html
<!-- empty state -->
<div v-if="items.length === 0" class="grid-list-empty">
  <Empty>
    <template #description>
      <div class="flex items-center mt-12">
        还没有条目，<Button type="link" @click="add">添加</Button>
      </div>
    </template>
  </Empty>
</div>

<!-- header row (only when there are items) -->
<div v-else class="grid-list-header">
  <Button class="mr-auto" type="text" @click="refresh">刷新</Button>
  <Button type="primary" icon="add" class="ml-16" @click="add">添加</Button>
</div>

<!-- body -->
<div class="grid-list-list">
  <Card v-for="item in items" :key="item.id" :title="item.name">
    <template #title-prefix>
      <Tag v-if="item.updating" color="cyan" size="small">更新中</Tag>
    </template>
    <template #extra>
      <Button type="text" size="small" @click="edit(item)">编辑</Button>
      <Button type="text" size="small" @click="remove(item)">删除</Button>
    </template>
    <div>节点数：{{ item.proxies.length }}</div>
  </Card>
</div>
```

`grid-list-header` is the action bar (secondary actions left, the primary `add` last with `ml-16`);
`grid-list-grid` / `grid-list-list` are the two body layouts the host toggles between. In the grid
variant, collapse item actions into a `Dropdown` with a `more` icon rather than showing all buttons.
For a tabular set, use `Table` inside the card instead of cards-per-row.

## Modal flow

Add/edit flows live in a modal, with a small form component and the host rendering the frame:

```js
const openForm = (item) => {
  const { defineComponent, ref, h, resolveComponent } = Vue

  const Form = defineComponent({
    template: /* html */ `
      <div class="flex flex-col gap-8">
        <div class="form-item">名称 <Input v-model="name" /></div>
        <div class="form-item">地址 <Input v-model="url" /></div>
      </div>`,
    setup(_, { expose }) {
      const name = ref(item?.name ?? '')
      const url = ref(item?.url ?? '')

      const save = async () => {
        // persist here (e.g. Plugins.WriteFile under data/third/<id>/)
        Plugins.message.success(`已保存 ${name.value}`)
        modal.close()
      }

      // setContent() picks exposed modalSlots up automatically
      expose({
        modalSlots: {
          submit: () =>
            h(resolveComponent('Button'), { type: 'primary', onClick: save }, () => '保存'),
        },
      })

      return { name, url }
    },
  })

  const modal = Plugins.modal({ title: item ? '编辑' : '新增', width: '60' })
  modal.setContent(Form).open()
}
```

- Modal `options` take percentage `width` / `height`; `px: 0, py: 0` makes the body full-bleed (good for
  tables and editors). `submit: false` hides the built-in submit when you supply your own.
- `slots` are `title`, `toolbar` (header actions), `action` (bottom-left), `cancel`, `submit`, and
  `default` (body). Prefer the host defaults for cancel/submit (`common.cancel` / `common.save`).
- The returned API is local and self-destroying (`destroyOnClose`); build the component, call `.open()`,
  and do not keep the API at module scope — see the modal pattern in the SKILL.

## Status & feedback

- **Status** — a `Tag` (`color="cyan|green|red|orange|primary|purple|..."`); the plugin's numeric status
  already shows on its card in the plugins list.
- **Usage / progress** — `Progress` with `status: 'primary'` below 80%, `'warning'` above 80%,
  `'danger'` above 90% (the host's own traffic thresholds).
- **Loading** — a `Button`'s `loading` prop; a standalone spinner is
  `<Icon icon="loading" class="rotation" />`.
- **Empty** — `Empty` (default icon `empty`), with the call to action inside its `#description` slot.
- **Confirm before destroying** — `Plugins.confirm(...)`, then `Plugins.message.success(...)`.

## Before you submit

- [ ] Every control is a host component; no bare `<button>` / `<input>`, no custom control CSS.
- [ ] Only documented component props; `Icon` names come from the fixed set; every `Table` row has `id`.
- [ ] Spacing and type match the host (`px-8 py-12` rows, `text-16 font-bold` labels, `text-12` hints).
- [ ] Colours come from CSS variables, not literals.
- [ ] Loading and empty states are handled; destructive actions confirm first.
- [ ] The modal is destroyed on close; timers, servers, and processes are freed in `onDispose`.
- [ ] No decorative flourishes (gradients, custom shadows, animations, custom fonts).
- [ ] Placed beside a built-in page, the plugin does not stand out as different.
