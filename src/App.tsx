import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { AppNav } from '@/components/AppNav'
import { Background } from '@/components/Background'
import { GoalFormDialog } from '@/features/goals/GoalForm'
import { GoalsView } from '@/features/goals/GoalsView'
import { SettingsView } from '@/features/settings/SettingsView'
import { StatsView } from '@/features/stats/StatsView'
import { TodayView } from '@/features/today/TodayView'
import { todayKey } from '@/lib/date'
import { useStore } from '@/store/useStore'
import { useUi } from '@/store/useUi'

export default function App() {
  const tab = useUi((s) => s.tab)
  const theme = useStore((s) => s.settings.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4f3fa' : '#0a0912')
  }, [theme])

  // Roll "Heute" over at midnight / when the app returns from background.
  useEffect(() => {
    let last = todayKey()
    const check = () => {
      const now = todayKey()
      if (now !== last) {
        const ui = useUi.getState()
        if (ui.date === last) ui.setDate(now)
        last = now
      }
    }
    const id = setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  return (
    <>
      <Background />
      <main className="safe-top mx-auto w-full max-w-xl px-4 pt-4 pb-32">
        {tab === 'today' && <TodayView />}
        {tab === 'stats' && <StatsView />}
        {tab === 'goals' && <GoalsView />}
        {tab === 'settings' && <SettingsView />}
      </main>
      <AppNav />
      <GoalFormDialog />
      <Toaster
        position="top-center"
        theme={theme}
        offset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
        toastOptions={{
          classNames: {
            toast: '!glass !rounded-2xl !border-line-strong !bg-bg-2/90 !text-fg !font-sans',
            description: '!text-fg-2',
          },
        }}
      />
    </>
  )
}
