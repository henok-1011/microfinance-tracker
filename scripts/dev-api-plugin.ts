import { access } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'

import { loadEnv, type Plugin } from 'vite'

/**
 * Serves the `api/**` Vercel functions from the Vite dev server.
 *
 * `npm run dev` alone answers `/api/*` with 404 — Vite is a static dev server and
 * never SPA-falls-back non-GET requests — so `/api/admin/*` (user create/edit/
 * delete) is unreachable without `vercel dev` and its Vercel login. This plugin
 * mounts every handler at the same path Vercel uses, so plain `npm run dev`
 * exercises the real handler code.
 *
 * It recreates only what the handlers touch of Vercel's Node runtime: a parsed
 * `req.body`, `req.query`, and chainable `res.status().json()`. It is dev-only
 * (`apply: 'serve'`) and never part of the production bundle; Vercel keeps
 * serving the same files its own way.
 */

/** Vercel hands handlers a parsed body plus the usual Node request. */
type ApiRequest = IncomingMessage & {
  body?: unknown
  query?: Record<string, string>
}

type ApiResponse = ServerResponse & {
  status(code: number): ApiResponse
  json(payload: unknown): ApiResponse
  send(payload: unknown): ApiResponse
}

type ApiHandler = (req: ApiRequest, res: ApiResponse) => unknown

const API_PREFIX = '/api/'

/**
 * Maps a request path to its handler file, or null when there is none.
 * `_`-prefixed folders (`api/_lib`) hold shared helpers and are never routed.
 */
async function resolveHandlerFile(root: string, pathname: string): Promise<string | null> {
  const relative = pathname.slice(API_PREFIX.length).replace(/\/+$/, '')
  if (!relative) return null

  const segments = relative.split('/')
  const isInternal = segments.some((segment) => segment.startsWith('_') || segment.startsWith('.'))
  if (isInternal) return null

  for (const candidate of [`${relative}.ts`, `${relative}/index.ts`]) {
    const file = path.join(root, 'api', candidate)
    try {
      await access(file)
      return file
    } catch {
      // Try the next shape: /api/health -> api/health.ts, api/health/index.ts.
    }
  }

  return null
}

/** Mirrors Vercel: JSON bodies arrive parsed, anything else as a raw string. */
async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string))
  }
  if (chunks.length === 0) return undefined

  const raw = Buffer.concat(chunks).toString('utf8')
  const contentType = String(req.headers['content-type'] ?? '')
  if (!contentType.includes('application/json')) return raw

  try {
    return JSON.parse(raw) as unknown
  } catch {
    return raw
  }
}

function decorateResponse(res: ServerResponse): ApiResponse {
  const api = res as ApiResponse

  api.status = (code: number) => {
    api.statusCode = code
    return api
  }

  api.json = (payload: unknown) => {
    api.setHeader('Content-Type', 'application/json; charset=utf-8')
    api.end(JSON.stringify(payload))
    return api
  }

  api.send = (payload: unknown) => {
    if (typeof payload === 'string' || Buffer.isBuffer(payload)) {
      api.end(payload)
      return api
    }
    return api.json(payload)
  }

  return api
}

/**
 * `.env` files are loaded into `import.meta.env` for the client, but never into
 * `process.env`. `firebase-admin` reads `FIREBASE_AUTH_EMULATOR_HOST`,
 * `FIRESTORE_EMULATOR_HOST` and `GCLOUD_PROJECT` the moment it is imported, so
 * they have to be there before the first `/api` request. Existing shell env wins.
 */
function primeProcessEnv(root: string, envDir: string | false, mode: string): void {
  for (const [key, value] of Object.entries(loadEnv(mode, envDir || root, ''))) {
    if (process.env[key] === undefined) process.env[key] = value
  }
}

export function devApiPlugin(): Plugin {
  return {
    name: 'microfinance:dev-api',
    apply: 'serve',
    configureServer(server) {
      primeProcessEnv(server.config.root, server.config.envDir, server.config.mode)

      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0]
        if (!pathname.startsWith(API_PREFIX)) {
          next()
          return
        }

        void (async () => {
          const file = await resolveHandlerFile(server.config.root, pathname)
          if (!file) {
            next()
            return
          }

          const api = decorateResponse(res)
          try {
            const url = `/${path.relative(server.config.root, file).split(path.sep).join('/')}`
            const module = await server.ssrLoadModule(url)
            const handler = module.default as ApiHandler | undefined

            if (typeof handler !== 'function') {
              api.status(500).json({ error: `No default export in api${pathname}` })
              return
            }

            const apiReq = req as ApiRequest
            apiReq.body = await readBody(req)
            apiReq.query = Object.fromEntries(
              new URL(req.url ?? '', 'http://localhost').searchParams,
            )

            await handler(apiReq, api)
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            server.config.logger.error(`[dev-api] ${pathname} failed: ${message}`)
            if (api.headersSent) {
              api.end()
              return
            }
            api.status(500).json({ error: message })
          }
        })()
      })
    },
  }
}
