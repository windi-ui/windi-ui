import type { ComponentBuilder } from "@/types";

export default <ComponentBuilder>((utils) => {
	return {
		name: "btn",
		style: {
			padding: `${utils.themeProvider.spacing('2')} ${utils.themeProvider.spacing('3')}`,
			borderRadius: '.25rem',
			borderWidth: '1px',
			fontWeight: '600',

			color: utils.color('700'),
			backgroundColor: utils.color('white'),
			borderColor: utils.color('300'),
		},
		pseudos: {
			':hover': {
				backgroundColor: utils.color('100'),
				borderColor: utils.color('400'),
			},
			':disabled': {
			}
		}
	};
})