import { test, expect } from 'vitest';
// Esta prueba auxiliar valida el entorno de Vitest sin importar módulos de la aplicación.
test('baseline instrumentation runs in the test environment', () => {
  expect(process.env.NODE_ENV).toBe('test');
});
