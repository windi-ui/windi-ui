export default interface IThemeProvider {
	colors(name: string): string | Record<string, string>;
	spacing(name: string): string;
	fontSize(name: string): string;
}
