// @vitest-environment node
import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, expect, it } from 'vitest'

import regla from './eslint-feature-boundaries.mjs'

const linter = new Linter()

const config = [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: {
      arquitectura: { rules: { 'importaciones-entre-modulos': regla } },
    },
    rules: { 'arquitectura/importaciones-entre-modulos': 'error' },
  },
]

function revisar(codigo, archivo) {
  return linter.verify(codigo, config, { filename: archivo })
}

const RAIZ = process.cwd()
const PANTALLA_AUTH = `${RAIZ}/src/features/auth/ui/pantalla.ts`

describe('regla de importaciones entre módulos', () => {
  it('falla al importar un archivo interno de otro módulo', () => {
    const mensajes = revisar(
      "import { descontarStock } from '../../inventory/domain/stock'\n",
      PANTALLA_AUTH,
    )

    expect(mensajes).toHaveLength(1)
    expect(mensajes[0]?.message).toContain('inventory')
    expect(mensajes[0]?.message).toContain('index.ts')
  })

  it('falla con una ruta relativa larga hacia otro módulo', () => {
    const mensajes = revisar(
      "import { calcularVuelto } from '../../sales/domain/change'\n",
      PANTALLA_AUTH,
    )

    expect(mensajes).toHaveLength(1)
  })

  it('falla al reexportar un archivo interno de otro módulo', () => {
    const mensajes = revisar(
      "export { descontarStock } from '../../inventory/domain/stock'\n",
      PANTALLA_AUTH,
    )

    expect(mensajes).toHaveLength(1)
  })

  it('falla con importación dinámica hacia otro módulo', () => {
    const mensajes = revisar(
      "export async function cargar() {\n  return import('../../inventory/domain/stock')\n}\n",
      PANTALLA_AUTH,
    )

    expect(mensajes).toHaveLength(1)
  })

  it('permite importar desde el index del otro módulo', () => {
    expect(
      revisar("import { descontarStock } from '../../inventory'\n", PANTALLA_AUTH),
    ).toHaveLength(0)
    expect(
      revisar("import { descontarStock } from '../../inventory/index'\n", PANTALLA_AUTH),
    ).toHaveLength(0)
  })

  it('permite los contratos y los archivos internos del mismo módulo', () => {
    const codigo =
      "import type { Result } from '../../../contracts/common'\n" +
      "import { can } from '../domain/permissions'\n"

    expect(revisar(codigo, PANTALLA_AUTH)).toHaveLength(0)
  })

  it('falla desde fuera de features al entrar a un archivo interno', () => {
    const mensajes = revisar(
      "import { LoginScreen } from './features/auth/ui/LoginScreen'\n",
      `${RAIZ}/src/app.tsx`,
    )

    expect(mensajes).toHaveLength(1)
  })

  it('permite desde fuera de features entrar por el index', () => {
    const mensajes = revisar(
      "import { LoginScreen } from './features/auth'\n",
      `${RAIZ}/src/app.tsx`,
    )

    expect(mensajes).toHaveLength(0)
  })
})
