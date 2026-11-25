import { ThemeProvider } from "./types";
import { VarsProvider } from "./vars";

export interface BuilderContext {
	readonly vars: VarsProvider;
	readonly theme: ThemeProvider;
}

export abstract class BuilderBase<T, TContext extends BuilderContext> {
	protected readonly abstract items: Map<string, T>;

	constructor(
		protected readonly ctx: TContext
	) { }

	protected get vars() {
		return this.ctx.vars;
	}

	protected get theme() {
		return this.ctx.theme;
	}

	names(): string[] {
		return [...this.items.keys()];
	}

	add(name: string, builder: (ctx: TContext) => T) {
		if (this.items.has(name)) {
			console.error(`"${name}" already exists.`);
			return;
		}

		const elem = builder(this.ctx);
		this.items.set(name, elem);
	}

	update(name: string, builder: (element: T, ctx: TContext) => T | void) {
		const elem = this.items.get(name);
		if (!elem) {
			console.error(`"${name}" not found.`);
			return;
		}

		const res = builder(elem, this.ctx);
		if (res && res !== elem) {
			this.items.set(name, res);
		}
	}

	remove(name: string) {
		if (!this.items.has(name)) {
			console.error(`"${name}" not found.`);
			return;
		}

		this.items.delete(name);
	}
}

export abstract class VarsGeneratorBase<T, TVars, TContext extends BuilderContext = BuilderContext> extends BuilderBase<T, TContext> {
	constructor(ctx: TContext) {
		super(ctx);
	}

	add(name: string, builder: (ctx: TContext) => T) {
		if (name === 'default') {
			console.error('"default" can only be updated.');
			return;
		}

		super.add(name, builder);
	}

	remove(name: string) {
		if (name === 'default') {
			console.error('"default" can only be updated.');
			return;
		}

		super.remove(name);
	}

	abstract cssVars(name: string): TVars;

	rootVars(): TVars {
		return this.cssVars('default');
	}
}
