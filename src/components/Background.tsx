/** Fixed atmosphere: two soft gradient blobs plus a grain layer. Purely decorative. */
export function Background() {
  return (
    <div aria-hidden className="grain pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-40 -left-32 size-[560px] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent 70%)', opacity: 'var(--blob-opacity)' }}
      />
      <div
        className="absolute top-24 -right-40 size-[520px] rounded-full blur-[120px]"
        style={{ background: 'radial-gradient(circle, #2563eb, transparent 70%)', opacity: 'var(--blob-opacity)' }}
      />
      <div
        className="absolute bottom-[-240px] left-1/4 size-[480px] rounded-full blur-[140px]"
        style={{ background: 'radial-gradient(circle, #4f46e5, transparent 70%)', opacity: 'calc(var(--blob-opacity) * 0.5)' }}
      />
    </div>
  )
}
