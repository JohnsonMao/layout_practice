import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    '**/dist/**',
    '**/node_modules/**',
    '**/fixtures/**',
    '**/examples/**',
    '.cursor/**',
    '.agents/**',
    '.gemini/**',
    '**/*.timestamp-*',
    '**/*.md',
    '**/tsup.config.bundled_*.mjs',
    '**/src-tauri/target/**',
    '**/src-tauri/src/**',
    '**/src/types/bindings.ts',
  ],
  rules: {
    'node/prefer-global/process': 'off',
    'no-nested-ternary': 'warn',
    'ts/no-explicit-any': 'error',
    'no-console': 'off',
  },
  typescript: {
    parserOptions: {
      projectService: true,
    },
  },
})
