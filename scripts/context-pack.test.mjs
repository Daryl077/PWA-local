import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { buildContextPack } from './context-pack.mjs'

const rootDir = process.cwd()
const pack = buildContextPack({ taskId: 'T-009', files: ['src/features/auth/index.ts'] })

function between(startHeading, endHeading) {
  const start = pack.indexOf(startHeading)
  const end = endHeading ? pack.indexOf(endHeading, start + startHeading.length) : undefined

  return pack.slice(start, end)
}

describe('paquete de contexto', () => {
  it('incluye todas las secciones requeridas', () => {
    const headings = [
      'Directrices (AGENTS.md)',
      'Estado del proyecto (MEMORY.md)',
      'Estado de tareas (docs/TAREAS.md)',
      'Tarea T-009 (docs/TAREAS.md)',
      'Contratos (docs/CONTRATOS.md)',
      'Árbol de archivos clave',
      'Archivos solicitados',
    ]

    for (const heading of headings) {
      expect(pack).toContain(`## ${heading}`)
    }
  })

  it('copia las directrices y el estado del proyecto', () => {
    expect(pack).toContain('## Stack y estructura')
    expect(pack).toContain('## Estado actual')
  })

  it('incluye el bloque de la tarea pedida y el estado de las demás', () => {
    const task = between('## Tarea T-009 (docs/TAREAS.md)', '## Contratos')

    expect(task).toContain('**T-009 Paquete de contexto para chat web**')
    expect(task).toContain('`scripts/context-pack.mjs`')
    expect(task).not.toContain('**T-010 Roles y permisos')
    expect(between('## Estado de tareas', '## Tarea T-009')).toContain('- [x] T-001')
  })

  it('incluye los contratos y los archivos solicitados', () => {
    expect(pack).toContain('## Tipos base')
    expect(pack).toContain('=== ARCHIVO: src/features/auth/index.ts ===')
    expect(between('## Archivos solicitados')).toContain('export {')
  })

  it('el árbol ignora dependencias, compilados y archivos pesados', () => {
    const tree = between('## Árbol de archivos clave', '## Archivos solicitados')

    expect(tree).toContain('src/features/auth/index.ts')
    expect(tree).toContain('docs/CONTRATOS.md')
    expect(tree).not.toContain('node_modules')
    expect(tree).not.toContain('dist/')
    expect(tree).not.toContain('package-lock.json')
    expect(tree).not.toContain('pwa-192x192.png')
  })

  it('avisa el tamaño aproximado del paquete', () => {
    expect(pack).toMatch(/Tamaño aproximado: [\d.]+ caracteres \(~[\d.]+ tokens\)/)
    expect(pack.length).toBeGreaterThan(1_000)
  })

  it('rechaza archivos fuera del proyecto', () => {
    expect(() => buildContextPack({ taskId: 'T-009', files: ['../AGENTS.md'] })).toThrow(
      /fuera del proyecto/,
    )
    expect(() =>
      buildContextPack({ taskId: 'T-009', files: [join(rootDir, '..', 'AGENTS.md')] }),
    ).toThrow(/fuera del proyecto/)
  })

  it('rechaza una tarea que no existe', () => {
    expect(() => buildContextPack({ taskId: 'T-999', files: [] })).toThrow(/no existe/)
  })

  it('expone el comando npm y falla con un mensaje claro sin tarea', () => {
    const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'))
    expect(packageJson.scripts.context).toBe('node scripts/context-pack.mjs')

    const result = spawnSync(process.execPath, ['scripts/context-pack.mjs'], {
      cwd: rootDir,
      encoding: 'utf8',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Falta el ID de la tarea')
  })

  it('funciona desde la línea de comandos con una tarea y un archivo', () => {
    const result = spawnSync(
      process.execPath,
      ['scripts/context-pack.mjs', 'T-009', 'src/features/auth/index.ts'],
      { cwd: rootDir, encoding: 'utf8' },
    )

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('## Tarea T-009 (docs/TAREAS.md)')
    expect(result.stdout).toContain('=== ARCHIVO: src/features/auth/index.ts ===')
  })
})
