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
