import type { ComponentBuilder } from "@/types";

export default <ComponentBuilder>((theme) => {
	return {
		name: "btn",
		style: {
			padding: `${theme.spacing('2')} ${theme.spacing('3')}`,
			borderRadius: '.25rem',
			borderWidth: '1px',
			fontWeight: '600',

			color: theme.colors('gray.700'),
			backgroundColor: theme.colors('red.500'),
			borderColor: theme.colors('gray.300'),
		},
		pseudos: {
			':hover': {
				backgroundColor: theme.colors('gray.100'),
				borderColor: theme.colors('gray.400'),
			},
			':disabled': {
			}
		}
	};
})