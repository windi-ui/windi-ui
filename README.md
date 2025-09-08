# WindiUI

🚧 under development 🚧

WindiUI is a modern, modular, and customizable UI component library designed to work seamlessly with Tailwind CSS. It provides developers with a set of reusable components and utilities to build beautiful and consistent user interfaces efficiently.

## Features

- **Core Components**: A collection of essential UI components such as buttons, badges, and cards.
- **Tailwind Integration**: Utilities and themes tailored for Tailwind CSS.
- **Customizable**: Easily extend and modify components to fit your design system.
- **Extensible**: Build your own components and variants with advanced utilities.
- **Dark mode**: Automatically detect your dark mode config and apply appropriate style.

## Getting Started

### Prerequisites

- Node.js (v22 or higher)
- Tailwind v3/v4

### Installation

```bash
npm install -D @windi-ui/tailwind
```

Then, add the plugin to your `tailwind.config.ts` / `tailwind.config.js` file:

```ts
import type { Config } from 'tailwindcss';
import windui from '@windi-ui/tailwind';

export default {
	// ...
	plugins: [
		windui()
	],
} satisfies Config;
```

### Usage

#### Colors

WindiUI automatically detect all the colors in your theme and make them available to be used with components and utility classes.

First you choose the color you want with `c-*` (e.g. `c-blue`, ...), then apply it with Tailwind class (e.g. `bg-c-800`, ...)

```html
<div class="c-blue bg-c-800/50 text-c-300 border border-c-500 p-5">Hello World</div>
```

#### Variants

Make your component more flexible by styling it with variant utilities classes, use (`bg-v`, `text-v`, `border-v`, ...) to apply the colors, then use `v-*` to change the style, WindiUI has the following built-in variants styles: `v-default`,  `v-solid`,  `v-outline`,  `v-light`.

```html
<span class="inline-block c-red v-solid bg-v-soft/60 text-v border border-v py-1 px-2 rounded">Test</span>
```

#### Components

WindiUI comes with a few built-in components (e.g. `btn`, `badge`, ... more to come) that can be styled with `c-*`, `v-*` utilities, some components also support `s-*` utility to control its size.

```html
<button class="btn v-light c-blue s-lg">
	Primary
	<span class="badge v-solid c-red leading-none rounded-full absolute top-0 start-full -translate-1/2">32</span>
</button>
```

You can find more code examples in the [playground](/playground/vue-tailwindv4/src/App.vue).

## Contributing

Contributions are welcome! Please submit issues or pull requests.

1. Clone the repository:

   ```bash
   git clone https://github.com/Waleed-KH/WindUI.git
   cd WindUI
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server for the playground:

   ```bash
   pnpm dev
   # or for Tailwind v4
   pnpm devv4
   ```

### Project Structure

The repository is organized as a monorepo with the following packages:

#### Packages

- **`windui-core`**: Contains the core components and utilities.
- **`windui-tailwind`**: Tailwind CSS-specific utilities and themes.

#### Playgrounds

- **`vue-tailwind`**: A Vue 3 project showcasing WindUI with Tailwind CSS v3.
- **`vue-tailwindv4`**: Another Vue 3 project demonstrating WindUI with Tailwind CSS v4.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
