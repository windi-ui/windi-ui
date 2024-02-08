import { ThemeProvider } from "./types";

export type Size = {
	spacing: {
		'1': string;
		'1.5': string;
		'2': string;
		'3': string;
		'4': string;
	};
	text: string;
};

export function sizes(themeProvider: ThemeProvider) {
	return {
		default: {
			spacing: {
				'1': themeProvider.spacing('1'),
				'1.5': themeProvider.spacing('1.5'),
				'2': themeProvider.spacing('2'),
				'3': themeProvider.spacing('3'),
				'4': themeProvider.spacing('4'),
			},
			text: themeProvider.fontSize('base')
		},
		xs: {
			spacing: {
				'1': themeProvider.spacing('px'),
				'1.5': themeProvider.spacing('0.5'),
				'2': themeProvider.spacing('1'),
				'3': themeProvider.spacing('1.5'),
				'4': themeProvider.spacing('2'),
			},
			text: themeProvider.fontSize('xs')
		},
		sm: {
			spacing: {
				'1': themeProvider.spacing('0.5'),
				'1.5': themeProvider.spacing('1'),
				'2': themeProvider.spacing('1.5'),
				'3': themeProvider.spacing('2'),
				'4': themeProvider.spacing('3'),
			},
			text: themeProvider.fontSize('sm')
		},
		lg: {
			spacing: {
				'1': themeProvider.spacing('1.5'),
				'1.5': themeProvider.spacing('2'),
				'2': themeProvider.spacing('3'),
				'3': themeProvider.spacing('4'),
				'4': themeProvider.spacing('5'),
			},
			text: themeProvider.fontSize('lg')
		},
		xl: {
			spacing: {
				'1': themeProvider.spacing('2'),
				'1.5': themeProvider.spacing('3'),
				'2': themeProvider.spacing('4'),
				'3': themeProvider.spacing('5'),
				'4': themeProvider.spacing('6'),
			},
			text: themeProvider.fontSize('xl')
		},
	}
}
