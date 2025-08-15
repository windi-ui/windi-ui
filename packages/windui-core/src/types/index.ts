import type { CSS } from './css';

export interface ThemeProvider {
	colors(): Record<string, string>;
	colors(name: string): string | Record<string, string>;
	spacing(name: string): string;
	fontSize(name: string): string;
	applyTextColor(value: string, target: CSS.Properties, alpha?: string): void;
	applyBackgroundColor(value: string, target: CSS.Properties, alpha?: string): void;
	applyBorderColor(value: string, target: CSS.Properties, alpha?: string): void;
	colorValue(value: string, alpha?: number | string): string;
}

export { CSS };
