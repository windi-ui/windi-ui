---
layout: home

hero:
  name: WindUI
  text: Color, variant and size axes for Tailwind CSS
  tagline: Pick a color, pick a variant, pick a size. WindUI picks the shades, in light and dark.
  image:
    src: /logo.svg
    alt: WindUI
  actions:
    - theme: brand
      text: Get started
      link: /guide/introduction
    - theme: alt
      text: Installation
      link: /guide/installation
    - theme: alt
      text: GitHub
      link: https://github.com/windi-ui/windi-ui

features:
  - title: Three independent axes
    details: "<code>c-*</code> sets the color, <code>v-*</code> the variant and <code>s-*</code> the size. Each is a class that sets CSS variables, so they combine freely and inherit down the tree."
    link: /guide/introduction
  - title: Calibrated shades
    details: Variants pick shades from your 11-shade palettes for background, border and text, with soft, muted and accent levels and a hover state. You never choose a shade number.
    link: /guide/variants
  - title: Dark mode built in
    details: Variants carry their own dark shades and follow the dark mode strategy of your Tailwind config.
    link: /guide/dark-mode
  - title: Your palette
    details: Every color in your Tailwind theme that has all 11 shades becomes a <code>c-*</code> class automatically.
    link: /guide/colors
  - title: Builder API
    details: Add, update or remove variants, sizes and components from the plugin options.
    link: /guide/customizing
  - title: Tailwind v3 and v4
    details: One plugin for both major versions, with the same class names.
    link: /guide/installation
---

<div class="vp-doc home-example">

## One button, three axes

<Demo>
<button class="btn">Default</button>
<button class="btn c-blue">Blue</button>
<button class="btn v-solid c-blue">Solid</button>
<button class="btn v-outline c-violet">Outline</button>
<button class="btn v-light c-emerald">Light</button>
<button class="btn v-solid c-rose s-sm">Small</button>
<button class="btn v-light c-amber s-lg">Large <span class="badge v-solid c-red ms-2">3</span></button>
</Demo>

```html
<button class="btn">Default</button>
<button class="btn c-blue">Blue</button>
<button class="btn v-solid c-blue">Solid</button>
<button class="btn v-outline c-violet">Outline</button>
<button class="btn v-light c-emerald">Light</button>
<button class="btn v-solid c-rose s-sm">Small</button>
<button class="btn v-light c-amber s-lg">Large <span class="badge v-solid c-red ms-2">3</span></button>
```

</div>
