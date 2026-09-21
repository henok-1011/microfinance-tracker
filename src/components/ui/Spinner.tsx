export function Spinner({ label }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500"
      role="status"
    >
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
        aria-hidden="true"
      />
      {label ? <span>{label}</span> : null}
    </div>
  )
}

export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner label={label} />
    </div>
  )
}
