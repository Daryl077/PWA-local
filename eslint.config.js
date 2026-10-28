import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

import reglaImportacionesEntreModulos from './scripts/eslint-feature-boundaries.mjs'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      arquitectura: {
        rules: { 'importaciones-entre-modulos': reglaImportacionesEntreModulos },
      },
    },
    rules: {
      // Un `any` desactiva la revisión de tipos justo donde más se necesita.
      '@typescript-eslint/no-explicit-any': 'error',
      // Una función con demasiadas ramas es difícil de probar y de leer.
      complexity: ['error', 10],
      // Un módulo solo se usa por su index.ts o por src/contracts/ (T-007).
      'arquitectura/importaciones-entre-modulos': 'error',
    },
  },
  prettier,
])
