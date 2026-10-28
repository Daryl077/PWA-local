import path from 'node:path'

const MARCA_FEATURES = '/src/features/'

/** Convierte una ruta a una forma comparable en cualquier sistema operativo. */
function normalizar(ruta) {
  return ruta.replaceAll('\\', '/')
}

/** Devuelve el módulo de src/features al que pertenece una ruta, o null. */
function moduloDe(ruta) {
  const normal = normalizar(path.resolve(ruta))
  const posicion = normal.indexOf(MARCA_FEATURES)
  if (posicion === -1) return null

  const resto = normal.slice(posicion + MARCA_FEATURES.length)
  return resto.split('/')[0] || null
}

/** Indica si la ruta apunta a la puerta pública del módulo (index.ts). */
function esIndexPublico(ruta) {
  const normal = normalizar(path.resolve(ruta))
  const posicion = normal.indexOf(MARCA_FEATURES)
  if (posicion === -1) return false

  const resto = normal.slice(posicion + MARCA_FEATURES.length)
  const partes = resto.split('/')
  const archivo = partes.slice(1).join('/')

  return archivo === '' || archivo === 'index' || archivo === 'index.ts' || archivo === 'index.tsx'
}

/**
 * Regla T-007: un módulo solo puede usar a otro por su index.ts público.
 * Los contratos de src/contracts/ y los archivos internos del propio módulo
 * quedan permitidos.
 */
const reglaImportacionesEntreModulos = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohíbe importar archivos internos de otro módulo; solo permite su index.ts público o src/contracts/.',
    },
    schema: [],
    messages: {
      importacionInterna:
        'No importes "{{destino}}" desde "{{origen}}": es un archivo interno del módulo "{{modulo}}". Usa src/features/{{modulo}}/index.ts o src/contracts/.',
    },
  },

  create(context) {
    const archivoOrigen = context.filename
    if (!archivoOrigen || archivoOrigen === '<input>') return {}

    const moduloOrigen = moduloDe(archivoOrigen)

    function revisar(node, destino) {
      if (typeof destino !== 'string' || !destino.startsWith('.')) return

      const rutaDestino = path.resolve(path.dirname(archivoOrigen), destino)
      const moduloDestino = moduloDe(rutaDestino)

      if (!moduloDestino || moduloDestino === moduloOrigen) return
      if (esIndexPublico(rutaDestino)) return

      context.report({
        node,
        messageId: 'importacionInterna',
        data: {
          destino,
          origen: archivoOrigen,
          modulo: moduloDestino,
        },
      })
    }

    return {
      ImportDeclaration(node) {
        revisar(node, node.source.value)
      },
      ExportNamedDeclaration(node) {
        if (node.source) revisar(node, node.source.value)
      },
      ExportAllDeclaration(node) {
        revisar(node, node.source.value)
      },
      ImportExpression(node) {
        if (node.source.type === 'Literal') revisar(node, node.source.value)
      },
    }
  },
}

export default reglaImportacionesEntreModulos
