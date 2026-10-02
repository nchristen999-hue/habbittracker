import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap font-display font-medium tracking-tight transition-[background-color,border-color,color,transform,box-shadow] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-accent-gradient text-white shadow-[0_8px_24px_-8px_rgb(91_60_235/0.7),inset_0_1px_0_rgb(255_255_255/0.25)] hover:brightness-110',
        glass: 'border border-line bg-glass-strong text-fg hover:border-line-strong hover:bg-glass-hover',
        ghost: 'text-fg-2 hover:bg-glass-strong hover:text-fg',
        outline: 'border border-line-strong bg-transparent text-fg hover:bg-glass-strong',
        danger: 'border border-danger/40 bg-danger-soft text-danger hover:bg-danger/20',
      },
      size: {
        sm: 'h-8 rounded-lg px-3 text-[13px] [&_svg]:size-4',
        md: 'h-10 rounded-xl px-4 text-sm [&_svg]:size-4',
        lg: 'h-12 rounded-2xl px-6 text-base [&_svg]:size-5',
        icon: 'size-10 rounded-xl [&_svg]:size-5',
        'icon-sm': 'size-8 rounded-lg [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'glass', size: 'md' },
  },
)

export interface ButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild, type = 'button', ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp data-slot="button" type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { buttonVariants }
