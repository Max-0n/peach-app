import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { BootScreen } from '../../app/layout/BootScreen'
import { createDataLayer, type SyncState } from '../storage'
import { getOrCreateSourceId } from '../telegram/sourceId'
import { useTelegram } from '../telegram/telegram-context'
import {
  DataContext,
  type DataContextValue,
  type DayRecordEntity,
} from './data-context'
import { emptyRecords, loadSnapshot, upsertById } from './snapshot'
import type { AppRecords, DataSnapshot } from './types'

function withoutRecord(
  records: AppRecords,
  entity: DayRecordEntity,
  id: string,
): AppRecords {
  switch (entity) {
    case 'cycle':
      return {
        ...records,
        cycles: records.cycles.filter((item) => item.id !== id),
      }
    case 'flow':
      return { ...records, flow: records.flow.filter((item) => item.id !== id) }
    case 'symptom':
      return {
        ...records,
        symptoms: records.symptoms.filter((item) => item.id !== id),
      }
    case 'mood':
      return { ...records, mood: records.mood.filter((item) => item.id !== id) }
    case 'weight':
      return {
        ...records,
        weight: records.weight.filter((item) => item.id !== id),
      }
    case 'note':
      return {
        ...records,
        notes: records.notes.filter((item) => item.id !== id),
      }
    case 'sexualActivity':
      return {
        ...records,
        sexualActivity: records.sexualActivity.filter((item) => item.id !== id),
      }
  }
}

export function DataProvider({ children }: PropsWithChildren) {
  const telegram = useTelegram()
  const layerRef = useRef<ReturnType<typeof createDataLayer> | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [snapshot, setSnapshot] = useState<DataSnapshot>({
    profile: undefined,
    settings: undefined,
    records: emptyRecords,
  })
  const [syncState, setSyncState] = useState<SyncState>('local-only')

  const applySnapshot = useCallback((next: DataSnapshot) => {
    setSnapshot(next)
  }, [])

  const refresh = useCallback(async () => {
    const layer = layerRef.current
    if (layer === null) {
      return
    }
    try {
      applySnapshot(await loadSnapshot(layer.repository))
    } catch {
      return
    }
  }, [applySnapshot])

  const runSync = useCallback(async () => {
    const layer = layerRef.current
    if (layer === null) {
      return
    }
    try {
      const result = await layer.engine.syncNow()
      if (layerRef.current !== layer) {
        return
      }
      setSyncState(result.state)
      await refresh()
    } catch {
      return
    }
  }, [refresh])

  useEffect(() => {
    const sourceId = getOrCreateSourceId()
    const layer = createDataLayer({
      sourceId,
      ...(telegram.cloud === null ? {} : { cloud: telegram.cloud }),
      ...(telegram.device === null ? {} : { device: telegram.device }),
    })
    layerRef.current = layer
    let cancelled = false

    void loadSnapshot(layer.repository)
      .then((loaded) => {
        if (cancelled) {
          return
        }
        applySnapshot(loaded)
        setHydrated(true)
        void runSync()
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        applySnapshot({
          profile: undefined,
          settings: undefined,
          records: emptyRecords,
        })
        setHydrated(true)
      })

    function onOnline(): void {
      void runSync()
    }

    function onVisibility(): void {
      if (document.visibilityState === 'visible') {
        void runSync()
      }
    }

    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisibility)
      layer.db.close()
      layerRef.current = null
    }
  }, [applySnapshot, runSync, telegram])

  const requireLayer = useCallback(() => {
    const layer = layerRef.current
    if (layer === null) {
      throw new Error('Data layer is not ready')
    }
    return layer
  }, [])

  const value = useMemo<DataContextValue>(() => {
    return {
      hydrated,
      profile: snapshot.profile,
      settings: snapshot.settings,
      records: snapshot.records,
      syncState,
      saveProfile: async (input = {}) => {
        const saved = await requireLayer().repository.saveProfile(input)
        setSnapshot((current) => ({ ...current, profile: saved }))
        void runSync()
        return saved
      },
      saveSettings: async (input = {}) => {
        const saved = await requireLayer().repository.saveSettings(input)
        setSnapshot((current) => ({ ...current, settings: saved }))
        void runSync()
        return saved
      },
      saveCycle: async (input) => {
        const saved = await requireLayer().repository.saveCycle(input)
        setSnapshot((current) => ({
          ...current,
          records: {
            ...current.records,
            cycles: upsertById(current.records.cycles, saved),
          },
        }))
        void runSync()
        return saved
      },
      saveFlow: async (input) => {
        const saved = await requireLayer().repository.saveFlow(input)
        setSnapshot((current) => ({
          ...current,
          records: {
            ...current.records,
            flow: upsertById(current.records.flow, saved),
          },
        }))
        void runSync()
        return saved
      },
      saveSymptom: async (input) => {
        const saved = await requireLayer().repository.saveSymptom(input)
        setSnapshot((current) => ({
          ...current,
          records: {
            ...current.records,
            symptoms: upsertById(current.records.symptoms, saved),
          },
        }))
        void runSync()
        return saved
      },
      saveMood: async (input) => {
        const saved = await requireLayer().repository.saveMood(input)
        setSnapshot((current) => ({
          ...current,
          records: {
            ...current.records,
            mood: upsertById(current.records.mood, saved),
          },
        }))
        void runSync()
        return saved
      },
      saveWeight: async (input) => {
        const saved = await requireLayer().repository.saveWeight(input)
        setSnapshot((current) => ({
          ...current,
          records: {
            ...current.records,
            weight: upsertById(current.records.weight, saved),
          },
        }))
        void runSync()
        return saved
      },
      saveNote: async (input) => {
        const saved = await requireLayer().repository.saveNote(input)
        setSnapshot((current) => ({
          ...current,
          records: {
            ...current.records,
            notes: upsertById(current.records.notes, saved),
          },
        }))
        void runSync()
        return saved
      },
      saveSexualActivity: async (input) => {
        const saved = await requireLayer().repository.saveSexualActivity(input)
        setSnapshot((current) => ({
          ...current,
          records: {
            ...current.records,
            sexualActivity: upsertById(current.records.sexualActivity, saved),
          },
        }))
        void runSync()
        return saved
      },
      deleteRecord: async (entity, id) => {
        await requireLayer().repository.deleteRecord(entity, id)
        setSnapshot((current) => ({
          ...current,
          records: withoutRecord(current.records, entity, id),
        }))
        void runSync()
      },
      deleteAllLocalData: async () => {
        const layer = requireLayer()
        await layer.repository.clearAll()
        try {
          await telegram.cloud?.clear()
        } catch {
          setSyncState('pending')
        }
        try {
          await telegram.device?.clear()
        } catch {
          setSyncState('pending')
        }
        setSnapshot({
          profile: undefined,
          settings: undefined,
          records: emptyRecords,
        })
      },
    }
  }, [hydrated, requireLayer, runSync, snapshot, syncState, telegram])

  if (!hydrated) {
    return <BootScreen />
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export type { AppRecords } from './types'
