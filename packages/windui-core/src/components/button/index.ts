import { defineComponent } from "../common";

// todo: adaptive styles based on context (the parent element, button type, etc)

export default defineComponent((vars) => {
	return {
		name: "btn",
		applyVariant: true,
		applyVariantPseudos: [':hover'],

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
