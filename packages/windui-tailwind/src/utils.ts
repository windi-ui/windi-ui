const COLOR_HEX_REGEX = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i;
const COLOR_HEX3_REGEX = /^#?([\da-f])([\da-f])([\da-f])$/i;

export function colorToRgb(color: string): string {
	const cr = COLOR_HEX_REGEX.exec(color.replace(COLOR_HEX3_REGEX, (_, r: string, g: string, b: string) => r + r + g + g + b + b));
	return cr ? `${parseInt(cr[1], 16)} ${parseInt(cr[2], 16)} ${parseInt(cr[3], 16)}` : color;
}

export function colorsToRgb(colors: Record<string, string>) {
	for (const c in colors) {
		colors[c] = colorToRgb(colors[c]);
	}

	return colors;
}
