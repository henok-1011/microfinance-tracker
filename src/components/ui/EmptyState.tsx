import type { ReactNode } from 'react'

interface EmptyStateProps {
  message: string
  /** Optional call to action, rendered under the message. */
  action?: ReactNode
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center">
      <p className="text-sm text-slate-500">{message}</p>
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  )
}
