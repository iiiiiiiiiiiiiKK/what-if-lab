import Dexie, { type Table } from 'dexie'
import type { Simulation } from '../types/simulation'

export interface StoredSimulation extends Simulation {
  /** System field kept last in the row for readability. */
  sortKey: number
}

export class WhatIfDatabase extends Dexie {
  simulations!: Table<StoredSimulation, string>

  constructor(name = 'what-if-lab') {
    super(name)
    this.version(1).stores({
      simulations: 'id, updatedAt, createdAt, createdSort, engine, isExample, parentId',
    })
  }
}

let db: WhatIfDatabase | null = null
let memoryFallback = false

export function isMemoryFallback() {
  return memoryFallback
}

export function getDb(): WhatIfDatabase | null {
  if (memoryFallback) return null
  if (typeof indexedDB === 'undefined') {
    memoryFallback = true
    return null
  }
  if (!db) {
    db = new WhatIfDatabase()
  }
  return db
}

/** In-memory fallback used when IndexedDB is blocked (private mode, quota, permissions). */
const memory = new Map<string, StoredSimulation>()

export function toStored(sim: Simulation): StoredSimulation {
  return { ...sim, sortKey: Date.parse(sim.updatedAt) || Date.now() }
}

export async function putSimulation(sim: Simulation): Promise<void> {
  const row = toStored(sim)
  const database = getDb()
  if (!database) {
    memory.set(row.id, row)
    memoryFallback = true
    return
  }
  try {
    await database.simulations.put(row)
  } catch {
    memory.set(row.id, row)
    memoryFallback = true
  }
}

export async function getSimulation(id: string): Promise<StoredSimulation | undefined> {
  const database = getDb()
  if (!database) return memory.get(id)
  try {
    return await database.simulations.get(id)
  } catch {
    return memory.get(id)
  }
}

export async function listSimulations(): Promise<StoredSimulation[]> {
  const database = getDb()
  if (!database) return [...memory.values()].sort((a, b) => b.sortKey - a.sortKey)
  try {
    const rows = await database.simulations.toArray()
    return rows.sort((a, b) => b.sortKey - a.sortKey)
  } catch {
    return [...memory.values()].sort((a, b) => b.sortKey - a.sortKey)
  }
}

export async function deleteSimulation(id: string): Promise<void> {
  const database = getDb()
  memory.delete(id)
  if (!database) return
  try {
    await database.simulations.delete(id)
  } catch {
    /* memory already updated */
  }
}

export async function clearAllSimulations(): Promise<void> {
  memory.clear()
  const database = getDb()
  if (!database) return
  try {
    await database.simulations.clear()
  } catch {
    /* ignore */
  }
}

/** Test hook: reset handles so each test starts from a clean database. */
export async function __resetDatabaseForTests() {
  if (db) {
    db.close()
    await db.delete().catch(() => undefined)
  }
  db = null
  memory.clear()
  memoryFallback = false
}
