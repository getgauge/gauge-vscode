import eslint from '@eslint/js';
import {defineConfig} from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: ['node_modules/', 'out/', 'dist/', '*.vsix', 'coverage/', '.vscode-test/']
  },
  {
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
    ],
    files: ['**/*.ts'],
    rules: {
      'indent': ['error', 4, {SwitchCase: 1}],
      'quotes': 'off',
      'eol-last': 'off',
      'comma-dangle': 'off',
      'curly': 'off',
      'sort-keys': 'off',
      'object-shorthand': 'off',
      'no-console': 'off',
      'prefer-const': 'off',

      'max-classes-per-file': ['error', 5],

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    }
  }
]);
