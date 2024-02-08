declare module 'tailwindcss/lib/util/toColorValue' {
	export default function toColorValue(maybeFunction: string | Function): string;
}

declare module 'tailwindcss/lib/util/withAlphaVariable' {
	export default function withAlphaVariable({ color, property, variable }: {
		color: string | ((a: { opacityVariable: string, opacityValue: string }) => string),
		property: string,
		variable: string
	}): Record<string, string>;
}

declare module 'tailwindcss/lib/util/pluginUtils' {
	export function parseColorFormat(value: string | Function): string | ((a: { opacityValue?: string }) => string);
}
