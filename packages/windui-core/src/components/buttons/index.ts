import type { ComponentBuilder } from "@/types";

export default <ComponentBuilder>((utils) => {
	return {
		name: "btn",
		style: {
			display: 'inline-block',
			padding: `${utils.themeProvider.spacing('1.5')} ${utils.themeProvider.spacing('3')}`,
			borderRadius: '.375rem',
			borderWidth: '1px',
			fontWeight: '600',
			textAlign: 'center',
			textDecoration: 'none',
			verticalAlign: 'middle',
			userSelect: 'none',

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