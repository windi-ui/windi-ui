import plugin from 'tailwindcss/plugin';


export default plugin(({ addComponents, theme }) => {
	addComponents({
		'.btn': {
			padding: `${theme('spacing.2')} ${theme('spacing.3')}`,
			borderRadius: '.25rem',
			fontWeight: '600',
			//
			color: theme('colors.gray.700'),
			backgroundColor: theme('colors.white'),
			borderWidth: '1px',
			borderColor: theme('colors.gray.300'),
			'&:hover': {
				backgroundColor: theme('colors.gray.100'),
				borderColor: theme('colors.gray.400'),
			}
		}
	})
})