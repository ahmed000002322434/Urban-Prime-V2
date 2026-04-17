import type { PersistedState } from '../types/glaze'

const STORAGE_KEY = 'glaze.v1.state'

export function loadPersistedState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return null
    }

    return JSON.parse(raw) as PersistedState
  } catch (error) {
    console.warn('Failed to load persisted Glaze state', error)
    return null
  }
}

export function savePersistedState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to persist Glaze state', error)
  }
}
