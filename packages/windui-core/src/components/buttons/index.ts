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

			color: utils.variant('text'),
			backgroundColor: utils.variant('background'),
			borderColor: utils.variant('border'),
		},
		pseudos: {
			':hover': {
				color: utils.variant('text-hover'),
				backgroundColor: utils.variant('background-hover'),
				borderColor: utils.variant('border-hover'),
			},
			':disabled': {
			}
		}
	};
})