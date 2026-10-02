import { ToggleGroup } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Option<T extends string> {
  value: T
  label: ReactNode
}

/** Segmented control built on Radix ToggleGroup (single, never empty). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: Option<T>[]
  className?: string
  ariaLabel: string
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      aria-label={ariaLabel}
      onValueChange={(v) => v && onChange(v as T)}
      className={cn('grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-line bg-glass p-1', className)}
    >
      {options.map((o) => (
        <ToggleGroup.Item
          key={o.value}
          value={o.value}
          className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-medium text-fg-2 transition-colors hover:text-fg data-[state=on]:bg-glass-hover data-[state=on]:text-fg data-[state=on]:shadow-[inset_0_0_0_1px_var(--border-strong)] [&_svg]:size-4"
        >
          {o.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
