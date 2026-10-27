import { useState, useEffect } from 'react'
import { getStorageEstimate, requestPersistentStorage, type StorageStatus } from '../domain/storage'

export default function SystemStatus() {
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        await requestPersistentStorage()
        const estimate = await getStorageEstimate()
        setStatus(estimate)
      } catch {
        setError('No se pudo obtener el estado del almacenamiento')
      }
    }
    init()
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (error) return <div className="p,text-red-600">{error}</div>
  if (!status) return <div className="p-4">Cargando estado del sistema...</div>

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold">Estado del Sistema</h2>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-stone-600">Almacenamiento persistente:</span>
          <span className="font-medium">{status.isPersisted ? 'Sí' : 'No'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-600">Espacio usado:</span>
          <span className="font-medium">{formatBytes(status.usedBytes)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-600">Cuota total:</span>
          <span className="font-medium">{formatBytes(status.quotaBytes)}</span>
        </div>
      </div>
    </div>
  )
}
