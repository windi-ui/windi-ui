declare module 'csstype' {
	interface Properties {
		[key: string]: string | number | Properties;
	}

	type Rules = Record<string, Properties>;
}

export * as CSS from 'csstype';
