import { defineComponent } from "../common";

export default defineComponent(({ vars, colors }) => {
	return {
		name: "badge",
		applyVariant: ['text', 'bg'],

		style: {
			display: 'inline-flex',
			alignItems: 'center',
			padding: 'calc(1em / 3) calc(2em / 3)',
			borderRadius: '0.375rem',
			outlineStyle: 'solid',
			outlineWidth: '1px',
			outlineOffset: '-1px',
			outlineColor: colors.toValue(vars.variant('border'), 0.65),
			fontSize: '0.75em',
			fontWeight: '500',
			lineHeight: 'calc(1 / .75)',
			whiteSpace: 'nowrap',
			verticalAlign: 'baseline',
		}
	};
});
