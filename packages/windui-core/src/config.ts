import { Builder } from "./builder";

export interface ResolvedConfig {
	prefix: string;
	build?: (builder: Builder) => void;
}

export type Config = Partial<ResolvedConfig>;

export function resolveConfig(config: Config): ResolvedConfig {
	const {
		prefix = 'wui',
		build
	} = config;

	return {
		prefix,
		build
	};
}
