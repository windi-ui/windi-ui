import { defineComponent } from "../common";

export default defineComponent((vars) => {
	return {
		name: "btn",
		applyVariant: true,
		applyVariantPseudos: true,

		style: {
			display: 'inline-block',
			padding: `${vars.size('spacing-1.5')} ${vars.size('spacing-3')}`,
			borderRadius: '0.375rem',
			borderWidth: '1px',
			fontSize: vars.size('text'),
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
