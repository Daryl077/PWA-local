#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

function findProjectRoot(startDirectory) {
  let current = resolve(startDirectory)

  while (true) {
    if (
      existsSync(resolve(current, 'AGENTS.md')) &&
      existsSync(resolve(current, 'docs', 'TAREAS.md'))
    ) {
      return current
    }

    const parent = resolve(current, '..')
    if (parent === current) {
      throw new Error(
        'No se encontró la raíz del proyecto. Ejecuta el comando desde la carpeta que tiene AGENTS.md y docs/TAREAS.md.',
      )
    }
    current = parent
  }
}

const PROJECT_ROOT = findProjectRoot(process.cwd())
const MAX_RECOMMENDED_CHARS = 150_000

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'dist-ssr',
  'coverage',
  '.git',
  '.agents',
  '.vite',
  'test-results',
  'playwright-report',
])

const IGNORED_FILES = new Set(['package-lock.json', '.DS_Store', 'AGENTS.md.lock'])

const IGNORED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.mp4',
  '.webm',
  '.pdf',
  '.zip',
  '.tsbuildinfo',
  '.log',
])

const LANGUAGE_BY_EXTENSION = {
  '.ts': 'ts',
  '.tsx': 'tsx',
  '.js': 'js',
  '.mjs': 'js',
  '.json': 'json',
  '.css': 'css',
  '.html': 'html',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.md': 'md',
}

const TASK_ID_PATTERN = /^T-\d{3}[a-z]?$/

function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/')
}

function readTextFile(rootDir, filePath) {
  const root = resolve(rootDir)
  const absolute = resolve(root, filePath)

  if (absolute !== root && !absolute.startsWith(`${root}${sep}`)) {
    throw new Error(
      `El archivo "${filePath}" está fuera del proyecto. Usa una ruta relativa a la raíz, por ejemplo src/features/auth/index.ts.`,
    )
  }

  let content
  try {
    content = readFileSync(absolute)
  } catch {
    throw new Error(
      `No se pudo leer "${filePath}". Revisa que exista y que la ruta esté bien escrita.`,
    )
  }

  if (content.includes(0)) {
    throw new Error(`"${filePath}" no es un archivo de texto. Omítelo del paquete de contexto.`)
  }

  return content.toString('utf8')
}

function findTaskBlock(tareas, taskId) {
  const lines = tareas.split('\n')
  const start = lines.findIndex((line) => line.match(new RegExp(`^- \\[[ x]\\] \\*\\*${taskId} `)))

  if (start === -1) {
    throw new Error(`La tarea ${taskId} no existe en docs/TAREAS.md. Revisa el ID en ese archivo.`)
  }

  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^- \[[ x]\] \*\*T-/.test(lines[index]) || lines[index].startsWith('## ')) {
      end = index
      break
    }
  }

  return lines.slice(start, end).join('\n').trimEnd()
}

function listTaskStatuses(tareas) {
  const statuses = []

  for (const line of tareas.split('\n')) {
    const match = line.match(/^- \[([ x])\] \*\*(T-\d{3}[a-z]?) ([^*]+)\*\*/)
    if (match) {
      statuses.push(`- [${match[1]}] ${match[2]} — ${match[3].trim()}`)
    }
  }

  return statuses.join('\n')
}

function shouldIgnoreFile(name, filePath) {
  if (IGNORED_FILES.has(name) || name === '.env' || name.startsWith('.env.')) {
    return true
  }

  return IGNORED_EXTENSIONS.has(extname(filePath))
}

function collectFiles(rootDir, relativeDir = '') {
  const entries = readdirSync(resolve(rootDir, relativeDir), { withFileTypes: true }).sort(
    (left, right) => left.name.localeCompare(right.name, 'es'),
  )
  const files = []

  for (const entry of entries) {
    const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue
      }
      files.push(`${relativePath}/`)
      files.push(...collectFiles(rootDir, relativePath))
      continue
    }

    if (!shouldIgnoreFile(entry.name, relativePath)) {
      files.push(relativePath)
    }
  }

  return files
}

function formatRequestedFile(filePath, content) {
  const normalized = normalizePath(filePath)
  const trimmed = content.trimEnd()
  const language = LANGUAGE_BY_EXTENSION[extname(normalized)]

  if (!language || language === 'md') {
    return `=== ARCHIVO: ${normalized} ===\n\n${trimmed}`
  }

  return `=== ARCHIVO: ${normalized} ===\n\n\`\`\`${language}\n${trimmed}\n\`\`\``
}

function formatNumber(value) {
  return value.toLocaleString('es-BO')
}

export function buildContextPack({ taskId, files = [], rootDir = PROJECT_ROOT }) {
  if (!TASK_ID_PATTERN.test(taskId)) {
    throw new Error(
      `El ID de tarea "${taskId}" no es válido. Usa el formato T-009 o T-015a, igual que en docs/TAREAS.md.`,
    )
  }

  const tareas = readTextFile(rootDir, 'docs/TAREAS.md')
  const taskBlock = findTaskBlock(tareas, taskId)
  const uniqueFiles = [...new Set(files.map(normalizePath))]
  const requestedFiles = uniqueFiles
    .map((filePath) => formatRequestedFile(filePath, readTextFile(rootDir, filePath)))
    .join('\n\n')
  const tree = collectFiles(rootDir)
    .map((entry) => `- ${entry}`)
    .join('\n')

  const body = [
    `## Directrices (AGENTS.md)\n\n${readTextFile(rootDir, 'AGENTS.md').trimEnd()}`,
    `## Estado del proyecto (MEMORY.md)\n\n${readTextFile(rootDir, 'MEMORY.md').trimEnd()}`,
    `## Estado de tareas (docs/TAREAS.md)\n\n${listTaskStatuses(tareas)}`,
    `## Tarea ${taskId} (docs/TAREAS.md)\n\n${taskBlock}`,
    `## Contratos (docs/CONTRATOS.md)\n\n${readTextFile(rootDir, 'docs/CONTRATOS.md').trimEnd()}`,
    `## Árbol de archivos clave\n\n${tree}`,
    `## Archivos solicitados\n\n${requestedFiles || 'No se pidió ningún archivo adicional.'}`,
  ].join('\n\n')

  const sizeWarning =
    body.length > MAX_RECOMMENDED_CHARS
      ? `\n\n⚠️ Paquete grande: supera ${formatNumber(MAX_RECOMMENDED_CHARS)} caracteres. Quita archivos o divide la tarea antes de pegarlo en un chat web.`
      : ''
  const sizeLine = `Tamaño aproximado: ${formatNumber(body.length)} caracteres (~${formatNumber(
    Math.ceil(body.length / 4),
  )} tokens). Recomendado: menos de ${formatNumber(MAX_RECOMMENDED_CHARS)} caracteres.`

  return `# Paquete de contexto — Licorería PWA\n\nTarea: ${taskId}\n${sizeLine}${sizeWarning}\n\n${body}\n`
}

function main(argumentsList) {
  const [taskId, ...files] = argumentsList

  if (!taskId) {
    console.error(
      'Falta el ID de la tarea. Uso: npm run context -- T-009 src/features/auth/index.ts',
    )
    process.exitCode = 1
    return
  }

  try {
    process.stdout.write(buildContextPack({ taskId, files }))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`No se pudo armar el paquete de contexto. ${message}`)
    process.exitCode = 1
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (import.meta.url === invokedPath) {
  main(process.argv.slice(2))
}
