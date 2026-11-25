export function cssEsc<T extends string = string>(name: T): T {
	// TODO: follow the standard https://drafts.csswg.org/cssom/#serialize-an-identifier
	return name.replace(/([.:@])/g, '\\$1') as T;
}
