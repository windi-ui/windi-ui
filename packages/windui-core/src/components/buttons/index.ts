import { defineComponent } from "../common";

export default defineComponent((utils) => {
	return {
		name: "btn",
		applyVariant: true,
		applyVariantPseudos: true,

		style: {
			display: 'inline-block',
			padding: `${utils.size('spacing-1.5')} ${utils.size('spacing-3')}`,
			borderRadius: '.375rem',
			borderWidth: '1px',
			fontSize: utils.size('text'),
			fontWeight: '500',
			textAlign: 'center',
			textDecoration: 'none',
			verticalAlign: 'middle',
			userSelect: 'none',
		},
		pseudos: {
			':hover': {
			},
			':disabled': {
			}
		}
	};
});
