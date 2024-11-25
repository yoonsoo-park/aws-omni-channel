module.exports = {
	env: {
		commonjs: true,
		es6: true,
		node: true,
	},
	extends: ['plugin:prettier/recommended'],
	globals: {
		Atomics: 'readonly',
		SharedArrayBuffer: 'readonly',
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2018,
		sourcetype: 'module',
	},
	plugins: ['@typescript-eslint', 'prettier', 'unused-imports'],
	rules: {
		'prettier/prettier': ['error', { useTabs: true }],
		'object-shorthand': ['error', 'properties'],
		'unused-imports/no-unused-imports-ts': 2,
		indent: ['error', 'tab'],
		'@typescript-eslint/indent': ['error', 'tab'],
	},
};
