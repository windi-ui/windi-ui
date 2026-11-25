import type { Builder } from './builder';

export interface PresetOptions {
	/** Replaces an item of the same name that exists. Left out, the preset keeps that item and says so once. */
	override?: boolean;
	/** Namespaces the names of the items the preset adds: `nui` gives `nui-soft`. */
	prefix?: string;
	/** The names, without the prefix, of the items the preset adds or changes; the others are left out. */
	only?: string[];
}

/** A named `build` function, which runs before the `build` of the config. */
export interface Preset {
	readonly name: string;
	build(builder: Builder): void;
}

const CALL = /^(add|set|update|remove)(Color|Variant|Size|Component)$/;

type Methods = Record<string, (...args: unknown[]) => unknown>;

/** Makes a preset from a `build` function. The preset takes the options every preset takes: `override`, `prefix` and `only`. */
export function definePreset(name: string, build: (builder: Builder) => void) {
	return ({ override = false, prefix, only }: PresetOptions = {}): Preset => ({
		name,
		build(builder) {
			const b = builder as unknown as Methods;
			// By kind and name: the items the preset added, and the names it leaves out
			const own = new Set<string>();
			const skipped = new Set<string>();
			const kept: string[] = [];

			const named = (n: string) => prefix ? `${prefix}-${n}` : n;
			// An item of the preset carries the prefix; another item, such as `solid`, keeps its name
			const target = (kind: string, n: string) => own.has(`${kind}:${named(n)}`) ? named(n) : n;
			const left = (kind: string, n: string) => only?.includes(n) === false || skipped.has(`${kind}:${n}`);

			const scoped: Builder = new Proxy(builder, {
				get(_, key: string) {
					if (key === 'overrideVariant') {
						return (variant: string, colors: string | string[], value: unknown) => {
							if (!left('Variant', variant)) {
								b.overrideVariant(target('Variant', variant), [colors].flat().flatMap(c => c.split(',')).map(c => target('Color', c.trim())), value);
							}
							return scoped;
						};
					}

					const [, action, kind] = CALL.exec(key) ?? [];
					if (!kind) return b[key];

					return (n: string, ...rest: unknown[]) => {
						if (left(kind, n)) return scoped;

						if (action === 'add' || action === 'set') {
							const id = `${kind}:${named(n)}`;
							const ours = own.has(id);
							// `true`: a palette that `colors.only` leaves without a class exists too
							if (!override && !ours && (b[`${kind.toLowerCase()}sNames`](true) as string[]).includes(named(n))) {
								kept.push(named(n));
								skipped.add(`${kind}:${n}`);
								return scoped;
							}

							// `add` where nothing is replaced, as the run that only notes colors tells a color of the theme by it
							b[`${override || ours ? 'set' : 'add'}${kind}`](named(n), ...rest);
							own.add(id);
						} else {
							b[key](target(kind, n), ...rest);
						}

						return scoped;
					};
				}
			});

			build(scoped);

			if (kept.length) {
				console.warn(`WindiUI: the "${name}" preset keeps ${kept.map(k => `"${k}"`).join(', ')}, which already ${kept.length > 1 ? 'exist' : 'exists'}. Pass \`override: true\` to replace ${kept.length > 1 ? 'them' : 'it'}.`);
			}
		}
	});
}
