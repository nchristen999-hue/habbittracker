import { create } from 'zustand'
import { todayKey, type DateKey } from '@/lib/date'

export type Tab = 'today' | 'stats' | 'goals' | 'settings'

interface UiState {
  tab: Tab
  /** Day shown on the Heute screen (lets you fix past entries). */
  date: DateKey
  statsGoalId: string | null
  editGoalId: string | 'new' | null
  setTab: (tab: Tab) => void
  setDate: (date: DateKey) => void
  openStats: (goalId: string) => void
  editGoal: (id: string | 'new' | null) => void
}

export const useUi = create<UiState>()((set) => ({
  tab: 'today',
  date: todayKey(),
  statsGoalId: null,
  editGoalId: null,
  setTab: (tab) => set({ tab }),
  setDate: (date) => set({ date }),
  openStats: (statsGoalId) => set({ tab: 'stats', statsGoalId }),
  editGoal: (editGoalId) => set({ editGoalId }),
}))
