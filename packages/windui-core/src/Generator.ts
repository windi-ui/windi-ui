import type { IThemeProvider, ComponentBuilder, IComponent, CSS } from "@/types";
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

	static componentToCss(component: IComponent, nesting = true) {
		let cClass = `.${component.name}`;
		let css: CSS.Rules = { [cClass]: { ...component.style } };

		if (component.pseudos) {
			for (let pseudo in component.pseudos) {
				if (nesting) {
					css[cClass][`&${pseudo}`] = component.pseudos[pseudo];
				} else {
					css[`${cClass}${pseudo}`] = component.pseudos[pseudo];
				}
			}
		}

		return css;
	}
}
