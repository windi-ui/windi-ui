export function cssEsc(name: string) {
	return name.replace(/([\.\:])/g, '\\$1');
}
