export type RecursiveRecord<K extends keyof any = string, T = string> = {
	[P in K]: T | RecursiveRecord<K, T>;
};
