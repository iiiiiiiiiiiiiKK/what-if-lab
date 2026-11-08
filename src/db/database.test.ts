import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetDatabaseForTests,
  clearAllSimulations,
  deleteSimulation,
  getSimulation,
  isMemoryFallback,
  listSimulations,
  putSimulation,
} from './database'
import { getExamples } from '../data/examples'

beforeEach(async () => {
  await __resetDatabaseForTests()
})

describe('library persistence', () => {
  it('stores and reads a simulation', async () => {
    const [example] = getExamples('zh')
    const row = { ...example, id: 'sim_test_1' }
    await putSimulation(row)
    const found = await getSimulation('sim_test_1')
    expect(found?.title).toBe(row.title)
    expect(found?.hypothesis).toBe(row.hypothesis)
  })

  it('lists newest first', async () => {
    const examples = getExamples('zh').slice(0, 3)
    for (const [index, example] of examples.entries()) {
      await putSimulation({
        ...example,
        id: `sim_${index}`,
        updatedAt: new Date(2026, 0, index + 1).toISOString(),
      })
    }
    const rows = await listSimulations()
    expect(rows.map((row) => row.id)).toEqual(['sim_2', 'sim_1', 'sim_0'])
  })

  it('deletes a single simulation', async () => {
    const [example] = getExamples('zh')
    await putSimulation({ ...example, id: 'sim_del' })
    await deleteSimulation('sim_del')
    expect(await getSimulation('sim_del')).toBeUndefined()
  })

  it('clears everything', async () => {
    const [example] = getExamples('zh')
    await putSimulation({ ...example, id: 'sim_a' })
    await putSimulation({ ...example, id: 'sim_b' })
    await clearAllSimulations()
    expect(await listSimulations()).toEqual([])
  })

  it('does not fall back to memory when IndexedDB works', async () => {
    const [example] = getExamples('zh')
    await putSimulation({ ...example, id: 'sim_mem' })
    expect(isMemoryFallback()).toBe(false)
  })
})
