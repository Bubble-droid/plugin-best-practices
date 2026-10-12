# Styling

Plugin UIs are styled with the **static utility classes the host ships**, not a runtime CSS engine.
Only the classes the host's `assets/styles/utilities/*.less` files can produce exist, so treat the
lists below as the vocabulary. When nothing fits, a small inline `style` attribute or a host CSS
variable is the escape hatch — do not add global stylesheets.

## Utility classes

**Display** — `block`, `inline-block`, `inline`, `flex`, `inline-flex`, `grid`, `hidden`, `!hidden`,
`invisible`.

**Flex** — `flex-row`, `flex-row-reverse`, `flex-col`, `flex-col-reverse`, `flex-wrap`,
`items-start|center|end|stretch`, `self-stretch`, `justify-start|center|end|between|around|evenly`,
`shrink-0`, `flex-1`, `flex-none`, `flex-auto`.

**Gap** — `gap-{0,2,4,8,10,12,16,24,32}` and `gap-x-*` / `gap-y-*` with the same scale.

**Grid** — `grid-cols-{1..12,24,32,64}`, `col-span-{1..12,24,32,64}`.

**Spacing** — `m` or `p`, optional direction `t|r|b|l|x|y`, value `{0,2,4,6,8,12,16,20,24,32,36}`:
`mt-8`, `px-12`, `p-16`, `mb-auto`, `mx-auto`, `ml-auto`, `pb-4`. Margins also support `-auto`.

**Sizes** — `w-*` / `h-*` / `min-w-*` / `min-h-*` for `{0,8,10,12,16,18,24,26,30,32,38,40,42,64,128,256}`,
percentage sizes `w-[25%]` / `h-[25%]` / `min-w-[25%]` / `min-h-[25%]` / `max-w-[25%]` / `max-h-[25%]`
(25/36/50/60/75/90/100), and `w-full` / `h-full`.

**Text** — sizes `text-{10,12,14,16,18,20,22,24,32}`; alignment `text-left|center|right`,
`align-middle`; `line-clamp-1`, `line-clamp-2`; `underline`, `italic`, `font-bold`, `font-normal`;
`text-nowrap`, `text-ellipsis`, `break-all`, `break-keep`, `whitespace-nowrap`, `whitespace-pre-wrap`,
`leading-relaxed`, `select-text`.

**Radius** — `rounded-{0,2,4,6,8,16,32,9999}` and `rounded-full`.

**Position / layering** — `fixed`, `sticky`, `relative`, `absolute`, `inset-0`, `top-0`, `right-8`,
`right-32`, `bottom-4`, `bottom-12`, `bottom-32`, `left-8`, `left-1/2`; `z-{2,3,9,99,999,9999}`.

**Transform / transition** — `origin-center`, `rotate-0|90|180`, `-rotate-90`, `-translate-x-1/2`,
`translate-y-0`, `translate-y-full`; `transition-all`, `duration-{100,200,400}`.

**Misc** — `shadow`, `outline-none`, `border-0`, `border-collapse`, `bg-transparent`,
`backdrop-blur-sm`, `blur-3xl`, `overflow-auto|overflow-y-auto|overflow-x-auto|overflow-hidden`,
`pointer-events-none`, `cursor-move`, `cursor-not-allowed`.

There are **no** arbitrary pixel/color values (`w-[137px]`, `text-[#abc]` do not exist — the only bracket
classes are the percentage sizes above), **no** variant prefixes (`hover:`, `focus:`, `dark:`), and
**no** `opacity-*`, `animate-*`, or `size-*` classes. Use `w-* h-*` instead of `size-*`.

> Gotcha: `.cursor-pointer` is defined as `cursor: default` and only becomes a real pointer when the
> app's "use pointer" debug feature is on. Don't rely on it for a hand cursor — use a host component
> (a `Button`, a clickable `Card`) that already handles the pointer.

## Shared classes

Defined in `assets/styles/custom.less` and safe to reuse:

- `form-item` — a label/value row (`display:flex; justify-content:space-between; gap:8px`).
- `form-action` — a right-aligned action row.
- `rotation` — infinite spin animation (used by loading icons).
- `grid-list-*`, `slide-down-*` — list and transition helpers.

## CSS variables

These follow the active theme (they are aliases resolved from the `-light` / `-dark` pairs per
`assets/styles/theme.less`), so use the un-suffixed names and both themes work:

- Text / background: `--color`, `--bg-color`.
- Brand: `--primary-color`, `--secondary-color`.
- Surfaces: `--card-bg`, `--card-color`, `--modal-bg`, `--modal-mask-bg`, `--dropdown-bg`,
  `--menu-bg`, `--toast-bg`, `--select-bg`, `--input-bg`, `--input-color`, `--color-picker-bg`.
- Lines: `--divider-color`.
- Buttons: `--btn-primary-bg`, `--btn-primary-color`, `--btn-normal-bg`, `--btn-normal-color`,
  `--btn-link-color`, `--btn-text-color`.
- Misc: `--progress-inner-bg`, `--scrollbar-thumb-bg`, `--level-0-color` … `--level-4-color`.

For example a divider line without a utility class:

```html
<div style="border-top: 1px solid var(--divider-color)">…</div>
```
