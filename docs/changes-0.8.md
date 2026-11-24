# Changes in 0.8

What you can observe when upgrading from 0.7. Class names, options and the builder API are unchanged; every
entry is a bug fix with the same syntax, or something new.

## Arbitrary values are no longer hijacked

`bg-v`, `text-v` and `border-v` used to answer every arbitrary `bg-[...]`, `text-[...]` and `border-[...]`
class as well ([#30](https://github.com/windi-ui/windi-ui/issues/30)):

- On Tailwind 4, `bg-[#123456]` got a second, broken declaration: `background-color: var(--wui-v-bg-#123456)`.
- On Tailwind 3, `bg-[#123456]` and `text-[red]` were reported as ambiguous and dropped.

Both now produce exactly Tailwind's own output. `bg-v`, `bg-v-soft/60`, `bg-v/[0.3]` and the other variant
utilities are unchanged.

`c-[foo]`, `v-[foo]` and `s-[foo]` with an unknown value used to log `Color "foo" not found` (or the variant
or size equivalent) during the build. They now emit nothing and log nothing.

**Migration:** none. If you audited your built CSS or avoided arbitrary values because of this, you can stop.

## The default variant no longer needs a `*` rule

0.7 set the `default` variant's variables, about 54 declarations with the dark block, on every element of the
page with a `*` rule ([#31](https://github.com/windi-ui/windi-ui/issues/31)). The new
[`variantScope`](/reference/options#variantscope) option chooses how this is done:

- `'element'`, the new default, drops the `*` rule. Variant utilities and components carry the `default`
  variant as a `var()` fallback, and one base rule keeps a variant from reaching the children of its element.
  In dark mode a two-declaration `*` rule is left, which sets the switches the fallbacks pick their dark value with.
  `btn`, `badge`, `bg-v`, `text-v` and `border-v` paint what they painted in 0.7, in light and dark mode.
- `'inherit'` is new behaviour: a `v-*` class sets the variant for everything inside its element.
- `'universal'` is the 0.7 output, byte for byte.

Also new: the `v-scope` utility, `varsProvider` exported from `@windi-ui/core`, and
`vars.variant(name, { fallback: true })`.

**Migration:** two cases behave differently with the new default.

1. **Your own CSS reads a variant variable on an element without a variant**, for example
   `input { background: var(--wui-v-bg) }`. Without the `*` rule that variable is not set there, so the
   declaration is invalid (a transparent background). Pick one:
   - set `variantScope: 'universal'`, and nothing changes;
   - give the element a variant: a `v-*` class, or `@apply v-default v-scope` in the rule;
   - in CSS built in JavaScript, use `vars.variant('bg', { fallback: true })`.

   Components added with the builder need no change: bare reads in their `style` get the fallback.
2. **A rule gets its variant from `@apply v-*`.** Its children now inherit that variant, because the element
   has no `v-` in its `class` attribute. Add `v-scope`: `@apply v-solid v-scope`.
