import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import path from 'path';

export default [
  {
    ignores: ['node_modules/', 'out/', 'dist/', '*.vsix', 'coverage/', '.vscode-test/']
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: path.resolve(new URL('.', import.meta.url).pathname)
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      'indent': ['error', 4, { SwitchCase: 1 }],
      'quotes': 'off',
      'eol-last': 'off',
      'comma-dangle': 'off',
      'curly': 'off',
      'sort-keys': 'off',
      'object-shorthand': 'off',
      'no-console': 'off',

      'max-classes-per-file': ['error', 5]
    }
  }
];
