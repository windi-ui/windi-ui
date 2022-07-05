export type Expand<T, TKey extends string | number | symbol = string, TValue = any> = T & {
	[key in TKey]: TValue;
};