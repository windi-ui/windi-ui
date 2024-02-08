declare module 'csstype' {
	interface Properties {
		[key: string]: string | number | Properties;
	}

	interface Rules {
		[selector: string]: Properties;
	}
}

export * as CSS from 'csstype';
