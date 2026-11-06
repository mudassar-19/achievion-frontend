import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // "Load data when the page opens" is a normal pattern here (fetch function sets loading state).
      // React 19's rule flags every one of them, so it stays visible as a warning instead of an error.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // Build / tool config files run in Node, not in the browser.
    files: ['*.config.js'],
    languageOptions: { globals: globals.node, sourceType: 'module' },
  },
  {
    files: ['tailwind.config.js'], // the only CommonJS config (uses require / module.exports)
    languageOptions: { sourceType: 'commonjs' },
    rules: { 'no-unused-vars': ['error', { args: 'none' }] },
  },
])
