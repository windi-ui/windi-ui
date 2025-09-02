import { ThemeProvider } from "./types";
import { VarsProvider } from "./vars";

export abstract class VarsGeneratorBase<T, TVars> {
	protected readonly abstract data: Map<string, T>;

	constructor(
		protected readonly vars: VarsProvider,
		protected readonly theme: ThemeProvider
	) {}

	names(): string[] {
		return [...this.data.keys()];
	}

	abstract cssVars(name: string): TVars;

	rootVars(): TVars {
		return this.cssVars('default');
	}
}
