import * as React from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-11 w-full min-w-0 rounded-xl border border-line bg-glass px-3 text-[15px] text-fg outline-none transition-colors placeholder:text-fg-3 focus:border-accent focus:bg-glass-strong focus-visible:outline-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-20 w-full resize-none rounded-xl border border-line bg-glass px-3 py-2 text-[15px] text-fg outline-none transition-colors placeholder:text-fg-3 focus:border-accent focus:bg-glass-strong focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  )
}

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label className={cn('mb-2 block text-[13px] font-medium text-fg-2', className)} {...props} />
}
