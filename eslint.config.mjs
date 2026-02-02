import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import js from '@eslint/js';
import globals from 'globals';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  {
    ignores: ['node_modules/', 'out/', 'dist/', '*.vsix', 'coverage/', '.vscode-test/']
  },
  // Apply ESLint recommended rules for JavaScript
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname
      },
      globals: {
        ...globals.node,
        // VSCode API globals
        Thenable: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      // Apply TypeScript ESLint recommended rules
      ...tsPlugin.configs['recommended'].rules,
      
      // Disable no-undef for TypeScript files (TypeScript handles this better)
      'no-undef': 'off',
      
      // Override specific rules to match previous tslint configuration
      'indent': ['error', 4, { SwitchCase: 1 }],
      'quotes': 'off',
      'eol-last': 'off',
      'comma-dangle': 'off',
      'curly': 'off',
      'sort-keys': 'off',
      'object-shorthand': 'off',
      'no-console': 'off',

      'max-classes-per-file': ['error', 5],
      
      // TypeScript-specific rule overrides to match previous tslint behavior
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'off'
    }
  }
];
