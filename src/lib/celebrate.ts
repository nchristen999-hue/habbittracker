import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import type { Celebration } from '@/store/useStore'

const COLORS = ['#a78bfa', '#7c3aed', '#60a5fa', '#2563eb', '#ffffff']

function burst(origin?: { x: number; y: number }, big = false) {
  void confetti({
    particleCount: big ? 90 : 36,
    spread: big ? 80 : 55,
    startVelocity: big ? 38 : 26,
    gravity: 1.1,
    ticks: big ? 160 : 110,
    scalar: 0.8,
    colors: COLORS,
    origin: origin ?? { x: 0.5, y: 0.35 },
    disableForReducedMotion: true,
  })
}

/** Turn store celebrations into a small confetti burst and/or a toast. Deliberately sparse. */
export function celebrate(events: Celebration[], opts: { confetti: boolean; from?: HTMLElement | null }) {
  if (!events.length) return
  let origin: { x: number; y: number } | undefined
  if (opts.from) {
    const r = opts.from.getBoundingClientRect()
    origin = { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
  }
  const perfect = events.find((e) => e.type === 'perfect')
  const milestone = events.find((e) => e.type === 'milestone')
  if (opts.confetti) burst(perfect ? undefined : origin, !!perfect || !!milestone)

  if (milestone && milestone.type === 'milestone') {
    toast.success(`${milestone.days} Tage am Stück: ${milestone.goal.name}`, {
      description: milestone.days >= 100 ? 'Dreistellig. Das ist jetzt Teil von dir.' : milestone.days >= 30 ? 'Ein Monat ohne Lücke.' : 'Eine Woche durchgezogen.',
    })
  }
  if (perfect && perfect.type === 'perfect') {
    toast.success(perfect.milestone ? `${perfect.milestone} perfekte Tage in Folge` : 'Perfekter Tag', {
      description: perfect.milestone
        ? 'Alle Ziele, jeden Tag. Weiter so.'
        : perfect.streak > 1
          ? `Alle Tagesziele erfüllt. Serie: ${perfect.streak} Tage.`
          : 'Alle Tagesziele erfüllt.',
    })
  }
}
