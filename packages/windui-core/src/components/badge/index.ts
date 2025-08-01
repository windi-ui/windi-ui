import { defineComponent } from "../common";

export default defineComponent((vars, theme) => {
	return {
		name: "badge",
		applyVariant: ['text', 'background'],

		style: {
			display: 'inline-block',
			padding: '0.35em 0.65em',
			borderRadius: '0.375rem',
			outlineStyle: 'solid',
			outlineWidth: '1px',
			outlineOffset: '-1px',
			outlineColor: theme.colorValue(vars.variant('border')),
			fontSize: '0.75em',
			fontWeight: '500',
			lineHeight: '1',
			textAlign: 'center',
			whiteSpace: 'nowrap',
			verticalAlign: 'baseline',
		}
	};
});
