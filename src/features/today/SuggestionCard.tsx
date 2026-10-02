import { TrendingDown, TrendingUp } from 'lucide-react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { addDays, formatLong, todayKey } from '@/lib/date'
import { formatNumber, periodLabel, type Suggestion } from '@/lib/logic'
import { useStore } from '@/store/useStore'

export function SuggestionCard({ s }: { s: Suggestion }) {
  const accept = useStore((st) => st.acceptSuggestion)
  const snooze = useStore((st) => st.snoozeSuggestion)
  const up = s.goal.kind === 'min'
  const Icon = up ? TrendingUp : TrendingDown
  const unit = s.goal.unit
  const today = todayKey()
  const when =
    s.applyFrom <= today ? 'ab heute' : s.applyFrom === addDays(today, 1) ? 'ab morgen' : `ab ${formatLong(s.applyFrom)}`

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
      className="relative rounded-card bg-accent-gradient p-px shadow-[0_16px_40px_-16px_rgb(91_60_235/0.7)]"
    >
      <div className="relative overflow-hidden rounded-[calc(var(--radius-card)-1px)] bg-bg-2/90 p-4 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-gradient text-white">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-accent uppercase">Progressive Overload</p>
            <h3 className="mt-1 text-lg font-semibold">
              {s.goal.name}: {formatNumber(s.from)} <span className="text-fg-3">→</span>{' '}
              <span className="text-accent-gradient">{formatNumber(s.to)}</span> {unit}
            </h3>
            <p className="mt-1 text-sm text-fg-2">
              {s.streak} {periodLabel(s.goal.period, s.streak)} in Folge {up ? 'geschafft' : 'unter dem Limit'}.{' '}
              {up ? `Bereit für ${formatNumber(s.to - s.from)} mehr?` : `Bereit für ${formatNumber(s.from - s.to)} weniger?`}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => {
              accept(s.goal.id)
              toast(`Neues Ziel ${when}: ${formatNumber(s.to)} ${unit}`, { description: s.goal.name })
            }}
          >
            Annehmen
          </Button>
          <Button variant="ghost" className="flex-1" onClick={() => snooze(s.goal.id)}>
            Später
          </Button>
        </div>
        <p className="mt-2 text-center text-[12px] text-fg-3">Gilt {when}. „Später“ fragt in 3 Tagen erneut.</p>
      </div>
    </motion.div>
  )
}
