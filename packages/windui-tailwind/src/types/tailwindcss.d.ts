declare module 'tailwindcss/lib/util/withAlphaVariable' {
	export default function withAlphaVariable({ color, property, variable }: {
		color: string | ((a: { opacityVariable?: string, opacityValue?: string }) => string),
		property: string,
		variable: string
	}): Record<string, string>;
}

declare module 'tailwindcss/lib/util/pluginUtils' {
	export function parseColorFormat(value: string): string | ((a: { opacityValue?: string }) => string);
}

declare module 'tailwindcss/lib/util/flattenColorPalette' {
	export default function flattenColorPalette(colors: Record<string, any>): Record<string, string>;
}

declare module 'tailwindcss/lib/util/color' {
	type Color = {
		mode: 'rgb' | 'rgba' | 'hsl' | 'hsla',
		color: string[],
		alpha?: string
	};

	export function parseColor(value: string, { loose = false } = {}): Color | null;
	export function formatColor({ mode, color, alpha }: Color): string;
}

declare module 'node:module' {
	global {
		namespace NodeJS {
			interface Require {
				(id: 'tailwindcss/lib/util/withAlphaVariable'): typeof import('tailwindcss/lib/util/withAlphaVariable');
				(id: 'tailwindcss/lib/util/pluginUtils'): typeof import('tailwindcss/lib/util/pluginUtils');
				(id: 'tailwindcss/lib/util/flattenColorPalette'): typeof import('tailwindcss/lib/util/flattenColorPalette');
				(id: 'tailwindcss/lib/util/color'): typeof import('tailwindcss/lib/util/color');
			}
		}
	}
}
