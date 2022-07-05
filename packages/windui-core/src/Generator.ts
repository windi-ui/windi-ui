import type { IThemeProvider, ComponentBuilder } from "@/types";
import * as components from './components';

export default class Generator {
	private cmps = new Set<ComponentBuilder>();

	constructor(private themeProvider: IThemeProvider) { }

	add(cmp: ComponentBuilder) {
		this.cmps.add(cmp);
		return this;
	}

	addAll() {
		return this.add(components.buttons);
	}

	build() {
		return [...this.cmps].map(c => c(this.themeProvider));
	}
}
