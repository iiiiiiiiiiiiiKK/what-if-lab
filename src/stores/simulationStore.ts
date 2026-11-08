import { create } from 'zustand'
import type { Simulation } from '../types/simulation'
import type { AiProgress } from '../engines/aiEngine'

interface SimulationState {
  /** The simulation currently open in the explorer. */
  current: Simulation | null
  setCurrent: (simulation: Simulation | null) => void
  patchCurrent: (patch: Partial<Simulation>) => void

  /** Generation state shared between the builder page and the progress panel. */
  status: 'idle' | 'running' | 'error' | 'done'
  progress: AiProgress | null
  error: string | null
  setStatus: (status: SimulationState['status']) => void
  setProgress: (progress: AiProgress | null) => void
  setError: (error: string | null) => void
}

export const useSimulationStore = create<SimulationState>()((set) => ({
  current: null,
  setCurrent: (simulation) => set({ current: simulation }),
  patchCurrent: (patch) =>
    set((state) => (state.current ? { current: { ...state.current, ...patch } } : state)),
  status: 'idle',
  progress: null,
  error: null,
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
}))
