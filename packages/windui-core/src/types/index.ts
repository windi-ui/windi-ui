import type { CSS } from './css';

export interface ThemeProvider {
	colors(name: string): string | Record<string, string>;
	spacing(name: string): string;
	fontSize(name: string): string;
	applyTextColor(value: string, target: CSS.Properties): void;
	applyBackgroundColor(value: string, target: CSS.Properties): void;
	applyBorderColor(value: string, target: CSS.Properties): void;
	colorValue(value: string, alpha?: number | string): string;
}

export { CSS };
