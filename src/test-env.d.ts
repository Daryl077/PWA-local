// jsdom no implementa crypto.subtle. Las pruebas de interfaz usan el Web Crypto
// de Node para poder calcular PBKDF2; esta declaración evita agregar @types/node
// solo por una prueba.
declare module 'node:crypto' {
  export const webcrypto: Crypto
}
