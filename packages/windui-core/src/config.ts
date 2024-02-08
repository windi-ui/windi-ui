export interface Config {
	prefix?: string;
}

export type ResolvedConfig = Required<Config>;

export function resolveConfig(config: Config): ResolvedConfig {
	const {
		prefix = 'wui'
	} = config;

	return {
		prefix
	};
}
