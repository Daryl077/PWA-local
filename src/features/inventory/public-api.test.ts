import { describe, expect, expectTypeOf, it } from 'vitest'

import type {
  ExpiringLot as ContractExpiringLot,
  InventoryService as ContractInventoryService,
  LotAllocation as ContractLotAllocation,
} from '../../contracts/services'
import * as publicApi from './index'
import type { ExpiringLot, InventoryService, LotAllocation } from './index'
import publicApiSource from './index.ts?raw'

describe('API pública del módulo de inventario (INV-003)', () => {
  it('expone solo el servicio, el fake y sus tipos esenciales', () => {
    expect(Object.keys(publicApi).sort()).toEqual(['createInventoryFake', 'fakeInventoryService'])
    expect(publicApi).not.toHaveProperty('default')
  })

  it('publica los tipos del contrato sin crear copias distintas', () => {
    expectTypeOf<InventoryService>().toEqualTypeOf<ContractInventoryService>()
    expectTypeOf<ExpiringLot>().toEqualTypeOf<ContractExpiringLot>()
    expectTypeOf<LotAllocation>().toEqualTypeOf<ContractLotAllocation>()
  })

  it('entrega un fake que implementa InventoryService', async () => {
    const fromFactory: InventoryService = publicApi.createInventoryFake()
    const shared: InventoryService = publicApi.fakeInventoryService

    await expect(fromFactory.getStock('producto-1', '2026-11-08')).resolves.toBe(0)
    await expect(shared.listCategories()).resolves.toEqual([])
  })

  it('no filtra archivos internos ni usa exportaciones comodín', () => {
    // Solo se permite la puerta interna del fake y los contratos compartidos.
    const exportSources = Array.from(
      publicApiSource.matchAll(/from\s+['"]([^'"]+)['"]/g),
      (match) => match[1],
    ).sort()

    expect(exportSources).toEqual(['../../contracts/services', './fake'])
    expect(publicApiSource).not.toMatch(/export\s+\*/)
    expect(publicApiSource).not.toMatch(/featureNotReady/)
  })
})
