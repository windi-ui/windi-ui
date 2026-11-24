import { createWindUIPlugin, type TailwindV4Plugin } from './plugin';

/** Builds for Tailwind 4 without looking at the Tailwind that runs the plugin. */
export default createWindUIPlugin<TailwindV4Plugin>(4);
