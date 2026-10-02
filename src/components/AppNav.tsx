import { BarChart3, ListChecks, Settings, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUi, type Tab } from '@/store/useUi'

const TABS: { id: Tab; label: string; Icon: typeof Sun }[] = [
  { id: 'today', label: 'Heute', Icon: Sun },
  { id: 'stats', label: 'Statistik', Icon: BarChart3 },
  { id: 'goals', label: 'Ziele', Icon: ListChecks },
  { id: 'settings', label: 'Mehr', Icon: Settings },
]

/** Floating glass tab bar, sits above the iOS home indicator. */
export function AppNav() {
  const tab = useUi((s) => s.tab)
  const setTab = useUi((s) => s.setTab)
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 px-4 pb-2" aria-label="Hauptnavigation">
      <div className="glass mx-auto mb-2 grid max-w-md grid-cols-4 gap-1 rounded-2xl bg-bg-2/95! p-1 shadow-[0_-8px_32px_-8px_rgb(0_0_0/0.5)]">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                setTab(id)
                window.scrollTo({ top: 0 })
              }}
              className={cn(
                'flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition-colors',
                active ? 'bg-glass-hover text-fg' : 'text-fg-3 hover:text-fg-2',
              )}
            >
              <Icon className={cn('size-5', active && 'text-accent')} strokeWidth={active ? 2.25 : 2} aria-hidden />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
