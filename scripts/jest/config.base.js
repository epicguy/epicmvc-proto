module.exports = {
	// TODO: Come back to setupEnvironment
	// setupFiles: [require.resolve('./setupEnvironment.js')],
	// TODO come back to setupTests
	// setupTestFrameworkScriptFile: require.resolve('./setupTests.js'),
	// Only include files directly in __tests__, not in nested folders.
	testRegex: '/__tests__/[^/]*(\\.js|\\.coffee|[^d]\\.ts)$',
	moduleFileExtensions: ['js', 'json', 'node', 'coffee', 'ts'],
	rootDir: process.cwd(),
	roots: ['<rootDir>', '<rootDir>/scripts'],
	collectCoverageFrom: ['html/**/*.js'],
	timers: 'fakee',
};
