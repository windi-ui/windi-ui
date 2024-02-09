import { IComponent, ComponentBuilder } from "./types";

export function defineComponent(component: IComponent | ComponentBuilder): ComponentBuilder {
	return typeof component === "function" ? component : () => component;
}
