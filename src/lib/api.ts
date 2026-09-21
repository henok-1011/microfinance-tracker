import { auth } from '@/lib/firebase'

export type ApiMethod = 'POST' | 'PUT' | 'DELETE'

export async function postJson<TResponse>(
  path: string,
  body: unknown,
  method: ApiMethod = 'POST',
): Promise<TResponse> {
  const user = auth.currentUser
  const token = user ? await user.getIdToken() : null

  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  const data = (await response.json().catch(() => null)) as (TResponse & { error?: string }) | null

  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed with status ${response.status}`)
  }

  return data as TResponse
}
