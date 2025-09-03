import { defineComponent } from "../common";

// todo: adaptive styles based on context (the parent element, button type, etc)

export default defineComponent(({ vars }) => {
	return {
		name: "btn",
		applyVariant: true,
		applyVariantPseudos: [':hover'],

		style: {
			position: 'relative',
			display: 'inline-flex',
			alignItems: 'baseline',
			justifyContent: 'center',
			padding: `calc(${vars.size('spacing-1.5')} - 1px) calc(${vars.size('spacing-3')} - 1px)`,
			borderRadius: '0.375rem',
			borderWidth: '1px',
			fontSize: vars.size('text'),
			lineHeight: vars.size('line-height'),
			fontWeight: '600',
			textDecoration: 'none',
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
