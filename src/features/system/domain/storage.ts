export interface StorageStatus {
  isPersisted: boolean
  usedBytes: number
  quotaBytes: number
}

export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator) {
    try {
      return await navigator.storage.persist()
    } catch {
      return false
    }
  }
  return false
}

export async function getStorageEstimate(): Promise<StorageStatus> {
  if ('storage' in navigator && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate()
    return {
      isPersisted: (await navigator.storage.persist()) || false,
      usedBytes: estimate.usage || 0,
      quotaBytes: estimate.quota || 0,
    }
  }
  return {
    isPersisted: false,
    usedBytes: 0,
    quotaBytes: 0,
  }
}
