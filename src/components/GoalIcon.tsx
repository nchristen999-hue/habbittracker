import { createElement } from 'react'
import { iconFor } from '@/lib/icons'
import { cn } from '@/lib/utils'

export function GoalIcon({ name, className, size = 'md' }: { name: string; className?: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-xl border border-line bg-accent-soft text-accent',
        size === 'md' ? 'size-10 [&_svg]:size-5' : 'size-8 rounded-lg [&_svg]:size-4',
        className,
      )}
    >
      {createElement(iconFor(name), { strokeWidth: 2, 'aria-hidden': true })}
    </span>
  )
}
