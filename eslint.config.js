import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/', '**/dist/', 'examples/out/', '.cache/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // The "before" example is legacy Angular on purpose.
    files: ['examples/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
  },
);
