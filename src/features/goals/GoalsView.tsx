import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight, GripVertical, Plus, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { GoalIcon } from '@/components/GoalIcon'
import { Reveal } from '@/components/Reveal'
import { Button } from '@/components/ui/button'
import { currentTarget, formatNumber } from '@/lib/logic'
import type { Goal } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { useUi } from '@/store/useUi'

export function GoalsView() {
  const goals = useStore((s) => s.goals)
  const reorder = useStore((s) => s.reorderGoals)
  const editGoal = useUi((s) => s.editGoal)
  const [showArchived, setShowArchived] = useState(false)
  const active = goals.filter((g) => !g.archived)
  const archived = goals.filter((g) => g.archived)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    if (!over || a.id === over.id) return
    const ids = active.map((g) => g.id)
    reorder(arrayMove(ids, ids.indexOf(String(a.id)), ids.indexOf(String(over.id))))
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-end justify-between gap-4 px-1 pt-2">
        <div>
          <h1 className="text-3xl font-semibold">
            Deine <span className="font-serif font-normal italic tracking-normal text-accent-gradient">Ziele</span>
          </h1>
          <p className="mt-1 text-sm text-fg-3">Ziehen zum Sortieren. Reihenfolge gilt auch für „Heute“.</p>
        </div>
        <Button variant="primary" onClick={() => editGoal('new')}>
          <Plus /> Neu
        </Button>
      </header>

      {active.length === 0 ? (
        <div className="glass rounded-card p-6 text-center text-fg-2">Noch keine aktiven Ziele.</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={active.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {active.map((g) => (
                <SortableRow key={g.id} goal={g} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {archived.length > 0 && (
        <Reveal>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-between px-1 py-2 text-[13px] font-semibold tracking-[0.12em] text-fg-3 uppercase"
            onClick={() => setShowArchived((v) => !v)}
            aria-expanded={showArchived}
          >
            Archiviert ({archived.length})
            <ChevronRight className={cn('size-4 transition-transform', showArchived && 'rotate-90')} />
          </button>
          {showArchived && (
            <ul className="flex flex-col gap-2 opacity-70">
              {archived.map((g) => (
                <li key={g.id}>
                  <GoalRow goal={g} />
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      )}
    </div>
  )
}

function SortableRow({ goal }: { goal: Goal }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: goal.id })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-10 scale-[1.02] shadow-2xl')}
    >
      <GoalRow
        goal={goal}
        handle={
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="grid size-10 shrink-0 cursor-grab touch-none place-items-center rounded-xl text-fg-3 hover:bg-glass-strong hover:text-fg active:cursor-grabbing"
            aria-label={`${goal.name} verschieben`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-5" />
          </button>
        }
      />
    </li>
  )
}

function GoalRow({ goal, handle }: { goal: Goal; handle?: React.ReactNode }) {
  const editGoal = useUi((s) => s.editGoal)
  const t = currentTarget(goal)
  return (
    <div className="glass flex items-center gap-2 rounded-card p-2 pr-3">
      {handle ?? <span className="w-2" />}
      <GoalIcon name={goal.icon} />
      <button type="button" onClick={() => editGoal(goal.id)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-1 pl-1 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{goal.name}</span>
          <span className="block text-[13px] text-fg-3">
            {goal.kind === 'min' ? '≥' : '≤'} {formatNumber(t)} {goal.unit} {goal.period === 'daily' ? 'pro Tag' : 'pro Woche'}
          </span>
        </span>
        {goal.overload.enabled && (
          <span className="inline-flex items-center gap-1 text-[12px] text-fg-3" title="Progressive Overload aktiv">
            <TrendingUp className="size-4 text-accent" aria-hidden />
            <span className="sr-only">Overload aktiv</span>
          </span>
        )}
        <ChevronRight className="size-4 text-fg-3" aria-hidden />
      </button>
    </div>
  )
}
