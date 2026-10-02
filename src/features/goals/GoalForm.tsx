import { Archive, ArchiveRestore, ArrowDownToLine, ArrowUpToLine, CalendarDays, CalendarRange, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Switch } from '@/components/ui/switch'
import { ICONS } from '@/lib/icons'
import { currentTarget, defaultStep, formatNumber, periodLabel } from '@/lib/logic'
import type { Goal, GoalKind, GoalPeriod } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useStore, type GoalInput } from '@/store/useStore'
import { useUi } from '@/store/useUi'

const PRESETS: (Omit<GoalInput, 'overload'> & { after: number })[] = [
  { name: 'Liegestütze', icon: 'Dumbbell', unit: 'Wdh.', kind: 'min', period: 'daily', target: 50, quickAdds: [10, 25], after: 7 },
  { name: 'Schritte', icon: 'Footprints', unit: 'Schritte', kind: 'min', period: 'daily', target: 8000, quickAdds: [1000, 2500], after: 7 },
  { name: 'Kalorien', icon: 'Flame', unit: 'kcal', kind: 'max', period: 'daily', target: 2300, quickAdds: [100, 500], after: 7 },
  { name: 'Wasser', icon: 'GlassWater', unit: 'L', kind: 'min', period: 'daily', target: 2, quickAdds: [0.25, 0.5], after: 7 },
  { name: 'Lesen', icon: 'BookOpen', unit: 'Min.', kind: 'min', period: 'daily', target: 15, quickAdds: [5, 10], after: 7 },
  { name: 'Bildschirmzeit', icon: 'Smartphone', unit: 'Min.', kind: 'max', period: 'daily', target: 180, quickAdds: [15, 30], after: 7 },
  { name: 'Sport', icon: 'Bike', unit: 'Einheiten', kind: 'min', period: 'weekly', target: 3, quickAdds: [1], after: 4 },
]

interface FormState {
  name: string
  icon: string
  unit: string
  kind: GoalKind
  period: GoalPeriod
  target: string
  quickAdds: string
  overloadOn: boolean
  after: string
  step: string
  stepTouched: boolean
}

const blank: FormState = {
  name: '',
  icon: 'Target',
  unit: '',
  kind: 'min',
  period: 'daily',
  target: '',
  quickAdds: '1, 10',
  overloadOn: true,
  after: '7',
  step: '',
  stepTouched: false,
}

function fromGoal(g: Goal): FormState {
  return {
    name: g.name,
    icon: g.icon,
    unit: g.unit,
    kind: g.kind,
    period: g.period,
    target: String(currentTarget(g)),
    quickAdds: g.quickAdds.join(', '),
    overloadOn: g.overload.enabled,
    after: String(g.overload.after),
    step: String(g.overload.step),
    stepTouched: true,
  }
}

const num = (s: string) => parseFloat(s.replace(',', '.'))

export function GoalFormDialog() {
  const editId = useUi((s) => s.editGoalId)
  const close = () => useUi.getState().editGoal(null)
  const goal = useStore((s) => s.goals.find((g) => g.id === editId))
  const open = editId !== null
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      {open && (
        <DialogContent
          title={goal ? 'Ziel bearbeiten' : 'Neues Ziel'}
          description={goal ? undefined : 'Klein anfangen. Overload erhöht später für dich.'}
        >
          <GoalForm key={editId} goal={goal} onDone={close} />
        </DialogContent>
      )}
    </Dialog>
  )
}

function GoalForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const addGoal = useStore((s) => s.addGoal)
  const updateGoal = useStore((s) => s.updateGoal)
  const archiveGoal = useStore((s) => s.archiveGoal)
  const deleteGoal = useStore((s) => s.deleteGoal)
  const [f, setF] = useState<FormState>(goal ? fromGoal(goal) : blank)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = (patch: Partial<FormState>) => setF((p) => ({ ...p, ...patch }))

  const target = num(f.target)
  const after = Math.max(1, Math.round(num(f.after)) || 0)
  // Suggest a sensible step until the user types their own.
  const stepText = f.stepTouched || !(target > 0) ? f.step : String(defaultStep(f.kind, target))
  const step = num(stepText)
  const quickAdds = f.quickAdds
    .split(/[\s;]+/)
    .map((s) => num(s.replace(/,$/, '')))
    .filter((n) => n > 0)
    .slice(0, 4)
  const valid = f.name.trim() && target > 0 && (!f.overloadOn || (step > 0 && after >= 1))
  const preview =
    valid && f.overloadOn
      ? `Nach ${after} ${periodLabel(f.period, after)} in Folge schlägt Overload ${formatNumber(
          f.kind === 'min' ? target + step : Math.max(0, target - step),
        )} statt ${formatNumber(target)} ${f.unit} vor.`
      : null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const input: GoalInput = {
      name: f.name,
      icon: f.icon,
      unit: f.unit,
      kind: f.kind,
      period: f.period,
      target,
      quickAdds: quickAdds.length ? quickAdds : [1],
      overload: { enabled: f.overloadOn, after, step: step > 0 ? step : defaultStep(f.kind, target) },
    }
    if (goal) {
      updateGoal(goal.id, input)
      toast('Gespeichert', { description: input.name })
    } else {
      addGoal(input)
      toast('Ziel angelegt', { description: `${input.name}: ${formatNumber(target)} ${input.unit}` })
    }
    onDone()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {!goal && (
        <div>
          <p className="mb-2 text-[13px] font-medium text-fg-2">Vorlagen</p>
          <div className="-mx-6 flex gap-2 overflow-x-auto px-6 no-scrollbar">
            {PRESETS.map((p) => {
              const Icon = ICONS[p.icon]
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() =>
                    setF({
                      ...blank,
                      name: p.name,
                      icon: p.icon,
                      unit: p.unit,
                      kind: p.kind,
                      period: p.period,
                      target: String(p.target),
                      quickAdds: p.quickAdds.join(', '),
                      after: String(p.after),
                    })
                  }
                  className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line bg-glass px-3 text-[13px] text-fg-2 transition-colors hover:border-line-strong hover:text-fg"
                >
                  <Icon className="size-4" aria-hidden /> {p.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="g-name">Name</Label>
        <Input id="g-name" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="z. B. Liegestütze" maxLength={40} required />
      </div>

      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-fg-2">Icon</legend>
        <div className="grid grid-cols-8 gap-1">
          {Object.entries(ICONS).map(([name, Icon]) => (
            <button
              key={name}
              type="button"
              aria-label={name}
              aria-pressed={f.icon === name}
              onClick={() => set({ icon: name })}
              className={cn(
                'grid aspect-square cursor-pointer place-items-center rounded-lg text-fg-3 transition-colors hover:bg-glass-strong hover:text-fg',
                f.icon === name && 'bg-accent-gradient text-white hover:bg-accent-gradient hover:text-white',
              )}
            >
              <Icon className="size-5" aria-hidden />
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Typ</Label>
          <Segmented
            ariaLabel="Zieltyp"
            value={f.kind}
            onChange={(kind) => set({ kind })}
            options={[
              { value: 'min', label: (<><ArrowUpToLine /> Mindestens</>) },
              { value: 'max', label: (<><ArrowDownToLine /> Höchstens</>) },
            ]}
          />
        </div>
        <div>
          <Label>Rhythmus</Label>
          <Segmented
            ariaLabel="Rhythmus"
            value={f.period}
            onChange={(period) => set({ period, after: period === 'weekly' && f.after === '7' ? '4' : f.after })}
            options={[
              { value: 'daily', label: (<><CalendarDays /> Täglich</>) },
              { value: 'weekly', label: (<><CalendarRange /> Wöchentlich</>) },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="g-target">{f.kind === 'min' ? 'Ziel' : 'Limit'}</Label>
          <Input id="g-target" inputMode="decimal" value={f.target} onChange={(e) => set({ target: e.target.value })} placeholder="100" required />
        </div>
        <div>
          <Label htmlFor="g-unit">Einheit</Label>
          <Input id="g-unit" value={f.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="Wdh., kcal, Min." maxLength={14} />
        </div>
      </div>
      {goal && num(f.target) !== currentTarget(goal) && target > 0 && (
        <p className="-mt-4 text-[13px] text-fg-3">
          Neuer Wert gilt ab {f.period === 'weekly' ? 'dieser Woche' : 'heute'}; vergangene Tage behalten ihr altes Ziel.
        </p>
      )}

      <div>
        <Label htmlFor="g-quick">Schnell-Buttons</Label>
        <Input id="g-quick" value={f.quickAdds} onChange={(e) => set({ quickAdds: e.target.value })} placeholder="1, 10" />
        <p className="mt-2 text-[13px] text-fg-3">Bis zu 4 Werte, mit Komma und Leerzeichen getrennt. Der erste gilt auch für „−“.</p>
      </div>

      <div className="rounded-2xl border border-line bg-glass p-4">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span>
            <span className="block text-sm font-semibold">Progressive Overload</span>
            <span className="block text-[13px] text-fg-3">Schlägt vor, das Ziel {f.kind === 'min' ? 'zu erhöhen' : 'zu senken'}. Nie automatisch.</span>
          </span>
          <Switch checked={f.overloadOn} onCheckedChange={(overloadOn) => set({ overloadOn })} aria-label="Progressive Overload" />
        </label>
        {f.overloadOn && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="g-after">Nach … {f.period === 'weekly' ? 'Wochen' : 'Tagen'}</Label>
              <Input id="g-after" inputMode="numeric" value={f.after} onChange={(e) => set({ after: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="g-step">Schritt {f.kind === 'min' ? '+' : '−'}</Label>
              <Input id="g-step" inputMode="decimal" value={stepText} onChange={(e) => set({ step: e.target.value, stepTouched: true })} />
            </div>
          </div>
        )}
        {preview && <p className="mt-4 text-[13px] text-fg-2">{preview}</p>}
      </div>

      <Button type="submit" variant="primary" size="lg" disabled={!valid}>
        {goal ? 'Speichern' : 'Ziel anlegen'}
      </Button>

      {goal && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <Button
            variant="ghost"
            onClick={() => {
              archiveGoal(goal.id, !goal.archived)
              toast(goal.archived ? 'Wiederhergestellt' : 'Archiviert', { description: goal.name })
              onDone()
            }}
          >
            {goal.archived ? <ArchiveRestore /> : <Archive />}
            {goal.archived ? 'Wiederherstellen' : 'Archivieren (Verlauf bleibt)'}
          </Button>
          {confirmDelete ? (
            <Button
              variant="danger"
              onClick={() => {
                deleteGoal(goal.id)
                toast('Gelöscht', { description: goal.name })
                onDone()
              }}
            >
              <Trash2 /> Endgültig löschen, inkl. aller Einträge
            </Button>
          ) : (
            <Button variant="ghost" className="text-danger hover:text-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Löschen
            </Button>
          )}
        </div>
      )}
    </form>
  )
}
