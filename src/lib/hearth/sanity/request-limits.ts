import {HearthServiceError} from './client'

export const PLACEMENT_BODY_LIMIT = 65_536
const BODY_TIMEOUT_MS = 10_000
const MAX_JSON_DEPTH = 12
const MAX_JSON_NODES = 4_096

/** Bound recursive domain work as well as the wire payload. JSON.parse itself is non-recursive. */
export function assertBoundedJson(value: unknown) {
  const pending = [{value, depth: 0}]
  let nodes = 0
  while (pending.length) {
    const entry = pending.pop()!
    if (++nodes > MAX_JSON_NODES || entry.depth > MAX_JSON_DEPTH) {
      throw new HearthServiceError('REQUEST_TOO_COMPLEX', 400, 'The placement request contains too many nested values.')
    }
    if (entry.value && typeof entry.value === 'object') {
      for (const child of Object.values(entry.value)) pending.push({value: child, depth: entry.depth + 1})
    }
  }
}

/** Do not buffer a request before enforcing its size. Content-Length is only an early rejection hint. */
export async function readPlacementJson(request: Request, timeoutMs = BODY_TIMEOUT_MS): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    throw new HearthServiceError('INVALID_CONTENT_TYPE', 415, 'Send the command as JSON.')
  }
  const length = request.headers.get('content-length')
  if (length && (!/^\d+$/.test(length) || Number(length) > PLACEMENT_BODY_LIMIT)) {
    throw new HearthServiceError('REQUEST_TOO_LARGE', 413, 'The placement request is too large.')
  }
  if (!request.body) throw new SyntaxError('Missing JSON body')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new HearthServiceError('REQUEST_TIMEOUT', 408, 'The placement request took too long to arrive.')), timeoutMs)
  })
  try {
    while (true) {
      const chunk = await Promise.race([reader.read(), deadline])
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > PLACEMENT_BODY_LIMIT) throw new HearthServiceError('REQUEST_TOO_LARGE', 413, 'The placement request is too large.')
      chunks.push(chunk.value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    let text: string
    try { text = new TextDecoder('utf-8', {fatal: true}).decode(bytes) }
    catch { throw new SyntaxError('Invalid UTF-8 JSON') }
    const value: unknown = JSON.parse(text)
    assertBoundedJson(value)
    return value
  } finally {
    clearTimeout(timer)
    // A hostile or disconnected producer must not keep this request waiting on cancellation.
    void reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
